import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from tqdm import tqdm

def ewc_penalty(model, anchor_weights, fisher, lambda_ewc):

    penalty = torch.tensor(0.0, device = next(model.parameters()).device)

    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue

        if name not in fisher or name not in anchor_weights:
            continue

        anchor = anchor_weights[name].to(param.device)
        f = fisher[name].to(param.device)

        penalty = penalty + (f * (param - anchor) ** 2).sum()

    return (lambda_ewc / 2.0) * penalty

def needs_finetuning(new_prototype, existing_prototypes, class_names, threshold = 2.0):
    if existing_prototypes.shape[0] == 0:
        return False, None

    new_proto_2d = new_prototype.unsqueeze(0)
    dists = torch.cdist(new_proto_2d, existing_prototypes.float(), p = 2)
    dists = dists.squeeze(0)
    min_dist = dists.min().item()
    closest_idx = dists.argmin().item()
    closest_name = class_names[closest_idx]

    needs_ft = min_dist < threshold
    if needs_ft:
        print(f"new class is close to {closest_name}")
        print(f"distance: {min_dist:.4f} < threshold: {threshold}")
        print("EWC fine tuning required")
    else:
        print("new class is distinct from all existing classes")
        print(f"distance = {min_dist:.4f}. pure prototype addition")

    return needs_ft, closest_name if needs_ft else None

def incremental_finetune(model, new_class_images, class_name, anchor_weights, fisher, replay_buffer, lambda_ewc = 5000.0, n_epochs = 30, lr = 1e-4, device = None):
    if device is None:
        device = next(model.parameters()).device

    new_class_images = new_class_images.to(device)

    model.unfreeze_last_block()
    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr = lr)
    model.train()

    print(f"EWC fine-tuning for {class_name}: {n_epochs} epochs, lambda = {lambda_ewc}, lr = {lr}")
    loss_history = []

    for epoch in range(n_epochs):
        optimizer.zero_grad()

        new_embeddings = model(new_class_images)
        prototype = new_embeddings.mean(dim = 0, keepdim = True)
        task_loss = ((new_embeddings - prototype) ** 2).sum(dim = 1).mean()

        penalty = ewc_penalty(model, anchor_weights, fisher, lambda_ewc)

        replay_loss = torch.tensor(0.0, device = device)
        replay_images, replay_labels = replay_buffer.sample_batch(n_per_class = 2)

        if replay_images is not None:
            replay_images = replay_images.to(device)
            replay_embs = model(replay_images)

            unique_labels = list(set(replay_labels))
            for label in unique_labels:
                indices = [i for i, l in enumerate(replay_labels) if l == label]
                cls_embs = replay_embs[indices]
                cls_prototype = cls_embs.mean(dim = 0, keepdim = True)
                replay_loss = replay_loss + ((cls_embs - cls_prototype) ** 2).sum(dim = 1).mean()

            if unique_labels:
                replay_loss = replay_loss / len(unique_labels)

        total_loss = task_loss + penalty + 0.5 * replay_loss
        total_loss.backward()

        nn.utils.clip_grad_norm_(model.parameters(), max_norm = 1.0)
        optimizer.step()

        loss_history.append({
            'total': total_loss.item(),
            'task': task_loss.item(),
            'ewc': penalty.item(),
            'replay': replay_loss.item() if isinstance(replay_loss. torch.Tensor) else replay_loss
        })

        if (epoch + 1) % 10 == 0:
            print(f"epoch {epoch + 1}/{n_epochs}:")
            print(f"total:{total_loss.item():.4f}")
            print(f"task: {task_loss.item():.4f}")
            print(f"ewc: {penalty.item():.4f}")
            print(f"replay: {replay_loss.item() if isinstance(replay_loss, torch.Tensor) else 0:.4f}")

    model.freeze_backbone()
    model.eval()

    print(f"EWC fine-tuning complete for {class_name}")
    return loss_history
def evaluate_backward_transfer(model, dataset, class_index, base_classes, n_way, k_shot, q_query, n_episodes, device, label):
    from src.data.episodic_sampler import sample_episode
    from src.models.proto_net import prototypical_loss

    model.eval()
    accuracies = []

    with torch.no_grad():
        for _ in range(n_episodes):
            support, query, labels = sample_episode(dataset, class_index, base_classes, n_way, k_shot, q_query, device)

            _, acc, _ = prototypical_loss(model, support, query, labels, n_way, k_shot)
            accuracies.append(acc)

    mean_acc = float(np.mean(accuracies))
    print(f"backward transfer eval {label}: {mean_acc * 100:.2f}%")
    model.train()
    return mean_acc

def run_incremental_addition(class_name, image_paths, modality, dataset_tag, model, anchor_weights, fisher, proto_collection, support_collection, replay_buffer, dataset, class_index, base_classes, save_dir, device, lambda_ewc = 5000.0, similarity_threshold = 2.0, log_to_mlflow = True):

    import os
    import shutil
    import numpy as np
    from PIL import Image
    from src.data.augmentations import get_transform
    from src.retrieval.index_refresher import refresh_all

    transform = get_transform(modality, 'test')
    class_save_dir = os.path.join(f'data/processed/support_images/{dataset_tag}')
    os.makedirs(class_save_dir, exist_ok = True)

    saved_paths = []
    images_list = []

    for i, src_path in enumerate(image_paths):
        ext = os.path.splitext(src_path)[1] or '.jpg'
        dest_path = os.path.join(class_save_dir, f"{class_name}_{i:04d}{ext}")
        shutil.copy2(src_path, dest_path)
        saved_paths.append(dest_path)

        image = Image.open(dest_path).convert('RGB')
        image_np = np.array(image)
        tensor = transform(image = image_np)['image']
        images_list.append(tensor)

    images_tensor = torch.stack(images_list)

    model.eval()
    with torch.no_grad():
        embeddings = model(images_tensor.to(device))
        new_prototype = embeddings.mean(dim = 0)

    all_proto_data = proto_collection.get(include = ['embeddings', 'documents'])
    result = {
        'class_name': class_name,
        'n_support': len(images_tensor),
        'finetuned': False,
        'bt_before': None,
        'bt_after': None,
        'bt_delta': None
    }

    if all_proto_data['embeddings']:
        existing_protos = torch.tensor(np.array(all_proto_data['emneddings']), dtype = torch.float32)
        existing_names = all_proto_data['documents']

        needs_ft, similar_class = needs_finetuning(new_prototype, existing_protos, existing_names)

    else:
        needs_ft = False
        similar_class = None

    if needs_ft:
        bt_before = evaluate_backward_transfer(model, dataset, class_index, base_classes, n_way = min(3, len(base_classes)), k_shot = 5, q_query = 15, n_episodes = 100, device = device, label = 'before')

        loss_history = incremental_finetune(model = model, new_class_images = images_tensor, class_name = class_name, anchor_weights = anchor_weights, fisher = fisher, replay_buffer = replay_buffer, lambda_ewc = lambda_ewc, n_epochs = 30, lr = 1e-4, device = device)

        support_root_map = {
            dataset_tag: {
                'root': f'data/processed/support_images/{dataset_tag}',
                'classes': [c for c in os.listdir(f'data/processed/support_images/{dataset_tag}') if os.path.isdir(f'data/processed/support_images/{dataset_tag}/{c}')],
                'modality': modality
            }
        }
        refresh_all(model, proto_collection, support_collection, device)

        bt_after = evaluate_backward_transfer(model, dataset, class_index, base_classes, n_way = min(3, len(base_classes)), k_shot = 5, q_query = 15, n_episodes = 100, device = device, label = 'after')

        result['finetuned'] = True
        result['similar_class'] = similar_class
        result['bt_before'] = bt_before
        result['bt_after'] = bt_after
        result['bt_delta'] = bt_after - bt_before
        result['loss_final_epoch'] = loss_history[-1] if loss_history else None

        print(f"backward transfer: {bt_before * 100:.2f}% -> {bt_after * 100:.2f}%.\ndifference = {result['bt_delta'] * 100:+.2f}%")

        if result['bt_delta'] < -0.05:
            print("consider increasing lambda!!")

    else:
        pass

    new_embeddings_np = model(images_tensor.to(device))
    new_prototype_np = new_embeddings_np.mean(axis = 0)
    role = 'novel'

    proto_id = f"proto_{dataset_tag}_{class_name}"
    try:
        proto_collection.add(embeddings = [new_prototype_np.tolist()], documents = [class_name], ids = [proto_id], metadatas = [{
            'class': class_name,
            'dataset': dataset_tag,
            'n_support': len(new_embeddings_np),
            'role': role
        }])
    except Exception:
        proto_collection.update(ids = [proto_id], embeddings = [new_prototype_np.tolist()])

    for i, (emb, path) in enumerate(zip(new_embeddings_np, saved_paths)):
        entry_id = f"support_{dataset_tag}_{class_name}_{i}"
        try:
            support_collection.add(embeddings = [emb.tolist()], documents = [class_name], ids = [entry_id], metadatas = [{
                'class': class_name,
                'image_path': path,
                'dataset': dataset_tag,
                'index': i,
                'role': role
            }])
        except Exception:
            support_collection.update(ids = [entry_id], embeddings = [emb.tolist()])

        replay_buffer.add_class(class_name, images_tensor, model, device)

    if log_to_mlflow:
        try:
            import mlflow
            mlflow.log_metric(f'new_class_{class_name}_finetuned', int(result['finetuned']))
            if result['bt_delta'] is not None:
                mlflow.log_metric(f'bt_delta_{class_name}', result['bt_delta'])
        except Exception:
            pass

    print(f"class {class_name} added successfully to system.\ntotal prototypes in index: {proto_collection.count()}")

    return result