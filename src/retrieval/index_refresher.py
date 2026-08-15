import os
import torch
import numpy as np
from PIL import Image
from tqdm import tqdm
from src.data.augmentations import get_transform

def refresh_class(class_name, dataset_tag, image_dir, modality, model, proto_collection, support_collection, device):
    transform = get_transform(modality, 'test')
    image_files = sorted([f for f in os.listdir(image_dir) if f.lower().endswith('.jpg', '.jpeg', '.png')])

    model.eval()
    new_embeddings = []

    for i, fname in enumerate(image_files):
        path = os.path.join(image_dir, fname)
        image = Image.open(path).convert('RGB')
        np_image = np.array(image)
        tensor = transform(image = np_image)['image'].unsqueeze(0).to(device)

        with torch.no_grad():
            emb = model(tensor).squeeze().cpu().numpy()

        new_embeddings.append(emb)

        entry_id = f"support_{dataset_tag}_{class_name}_{i}"
        support_collection.update(ids = [entry_id], embeddings = [emb.tolist()])

    new_prototype = np.mean(new_embeddings, axis = 0)
    proto_id = f"proto_{dataset_tag}_{class_name}"
    proto_collection.update(ids = [proto_id], embeddings = [new_prototype.tolist()])

def refresh_all(model, support_root_map, proto_collection, support_collection, device):
    for dataset_tag, config in support_root_map.items():
        print("refreshing ", dataset_tag)
        for class_name in tqdm(config['classes']):
            image_dir = os.path.join(config['root'], class_name)
            if not os.path.isdir(image_dir):
                continue
            refresh_class(class_name= class_name, dataset_tag = dataset_tag, image_dir = image_dir, modality = config['modality'], model = model, proto_collection = proto_collection, support_collection = support_collection, device = device)

    print("refresh complete.")
    print(f"prototypes: {proto_collection.count()}")
    print(f"support images: {support_collection.count()}")


