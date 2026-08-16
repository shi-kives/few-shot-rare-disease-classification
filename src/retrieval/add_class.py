import os
import shutil
import torch
import numpy as np
from PIL import Image
from src.data.augmentations import get_transform
from src.retrieval.index_refresher import refresh_all

def _embed_images(model, image_paths, modality, device):
    transform   = get_transform(modality, 'test')
    embeddings  = []
    
    model.eval()
    with torch.no_grad():
        for path in image_paths:
            image    = Image.open(path).convert('RGB')
            image_np = np.array(image)
            tensor   = transform(image=image_np)['image'].unsqueeze(0).to(device)
            emb      = model(tensor).squeeze().cpu().numpy()
            embeddings.append(emb)
    
    return np.array(embeddings)


def add_class_pure(class_name, image_paths, dataset_tag, modality, model, proto_collection, support_collection, replay_buffer, save_dir, device):

    class_save_dir = os.path.join(save_dir, class_name)
    os.makedirs(class_save_dir, exist_ok=True)
    
    saved_paths = []
    for i, src_path in enumerate(image_paths):
        ext      = os.path.splitext(src_path)[1]
        dst_path = os.path.join(class_save_dir, f"{class_name}_{i:04d}{ext}")
        shutil.copy2(src_path, dst_path)
        saved_paths.append(dst_path)
    
    embeddings = _embed_images(model, saved_paths, modality, device)
    prototype  = embeddings.mean(axis=0)
    
    proto_id = f"proto_{dataset_tag}_{class_name}"
    proto_collection.add(
        embeddings=[prototype.tolist()],
        documents=[class_name],
        ids=[proto_id],
        metadatas=[{
            'class':     class_name,
            'dataset':   dataset_tag,
            'n_support': len(embeddings)
        }]
    )
    
    for i, (emb, path) in enumerate(zip(embeddings, saved_paths)):
        support_collection.add(
            embeddings=[emb.tolist()],
            documents=[class_name],
            ids=[f"support_{dataset_tag}_{class_name}_{i}"],
            metadatas=[{
                'class':      class_name,
                'image_path': path,
                'dataset':    dataset_tag,
                'index':      i
            }]
        )
    
    images_tensor = torch.stack([
        get_transform(modality, 'test')(image=np.array(Image.open(p).convert('RGB')))['image'] for p in saved_paths
    ])
    replay_buffer.add_class(class_name, images_tensor, model, device)
    
    print(f"added {class_name} ({len(embeddings)} images) - pure prototype addition")
    return {
        'class':        class_name,
        'finetuned':    False,
        'n_support':    len(embeddings),
        'saved_to':     class_save_dir
    }


def add_class_with_ewc(class_name, image_paths, dataset_tag, modality, model, anchor_weights, fisher, proto_collection, support_collection, support_root_map, replay_buffer, save_dir, device, lambda_ewc = 5000.0):
    from src.continual.ewc import incremental_finetune
    
    result = add_class_pure(class_name, image_paths, dataset_tag, modality, model, proto_collection, support_collection, replay_buffer, save_dir, device)
    
    class_save_dir = os.path.join(save_dir, class_name)
    saved_paths    = sorted([
        os.path.join(class_save_dir, f)
        for f in os.listdir(class_save_dir)
        if f.lower().endswith(('.jpg','.jpeg','.png'))
    ])
    transform = get_transform(modality, 'test')
    images_tensor = torch.stack([
        transform(image=np.array(Image.open(p).convert('RGB')))['image']
        for p in saved_paths
    ]).to(device)
    
    bt_before = _measure_backward_transfer(model, proto_collection, support_collection, device)
    
    incremental_finetune(model=model, new_class_images=images_tensor, class_name=class_name, anchor_weights=anchor_weights, fisher=fisher, replay_buffer=replay_buffer,lambda_ewc=lambda_ewc, n_epochs=30, lr=1e-4, device=device)
    
    refresh_all(model, support_root_map, proto_collection, support_collection, device)
    
    bt_after = _measure_backward_transfer(model, proto_collection, support_collection, device)
    
    print(f"backward transfer: {bt_before:.4f} → {bt_after:.4f}")
    
    result['finetuned']          = True
    result['bt_before']          = bt_before
    result['bt_after']           = bt_after
    result['backward_transfer']  = bt_after - bt_before
    return result


def add_class_auto(class_name, image_paths, dataset_tag, modality, model, anchor_weights, fisher, proto_collection, support_collection, support_root_map, replay_buffer, save_dir, device, similarity_threshold, lambda_ewc = 5000.0):

    from src.continual.ewc import needs_finetuning
    
    embeddings = _embed_images(model, image_paths, modality, device)
    new_proto  = torch.tensor(embeddings.mean(axis=0))
    
    all_protos_data = proto_collection.get(include=['embeddings', 'documents'])
    if all_protos_data['embeddings']:
        existing_protos = torch.tensor(np.array(all_protos_data['embeddings']))
        existing_names  = all_protos_data['documents']
        
        needs_ft, similar_class = needs_finetuning(
            new_proto, existing_protos, existing_names, similarity_threshold
        )
    else:
        needs_ft      = False
        similar_class = None
    
    if needs_ft:
        print(f"'{class_name}' is similar to '{similar_class}' — running EWC fine-tuning")
        return add_class_with_ewc(
            class_name, image_paths, dataset_tag, modality,
            model, anchor_weights, fisher,
            proto_collection, support_collection, support_root_map,
            replay_buffer, save_dir, device, lambda_ewc
        )
    else:
        print(f"'{class_name}' is visually distinct — pure prototype addition")
        return add_class_pure(
            class_name, image_paths, dataset_tag, modality,
            model, proto_collection, support_collection,
            replay_buffer, save_dir, device
        )


def _measure_backward_transfer(model, proto_collection, support_collection, device, n_samples=20):
    from src.retrieval.retriever import retrieve_similar
    
    model.eval()
    precisions = []
    
    all_supports = support_collection.get(include=['embeddings', 'metadatas'])
    if not all_supports['embeddings']:
        return 0.0
    
    n_total  = len(all_supports['embeddings'])
    indices  = np.random.choice(n_total, size=min(n_samples, n_total), replace=False)
    
    with torch.no_grad():
        for idx in indices:
            emb_np     = np.array(all_supports['embeddings'][idx])
            true_class = all_supports['metadatas'][idx]['class']
            
            results  = retrieve_similar(emb_np, support_collection, n_results=5)
            n_correct = sum(1 for r in results if r['class'] == true_class)
            precisions.append(n_correct / 5)
    
    return float(np.mean(precisions))