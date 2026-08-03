import os
import torch
import numpy as np
import chromadb
from tqdm import tqdm
from PIL import Image
import json
from src.models.embedding_generator import EmbeddingGenerator
from src.data.datasets import SupportDataset
from src.data.augmentations import get_transform


def build_support_index(model, support_root, class_names, modality, chroma_path, dataset_tag, device):

    client = chromadb.PersistentClient(path = chroma_path)

    proto_col = client.get_or_create_collection(name = 'prototypes', metadata = {'hnsw:space': 'l2'})
    support_col = client.get_or_create_collection(name = 'support_images', metadata = {'hnsw:space': 'l2'})

    transform = get_transform(modality, 'test')
    model.eval()

    for class_name in tqdm(class_names, desc = 'building index'):
        class_dir = os.path.join(support_root, class_name)
        if not os.path.isdir(class_dir):
            print(f"class not found!!: {class_dir}. skipping this class")
            continue

        image_files = sorted([f for f in os.listdir(class_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

        class_embeddings = []
        print("working on class: ", class_name)

        for i, fname in enumerate(image_files):
            path = os.path.join(class_dir, fname)
            image = Image.open(path).convert('RGB')
            np_image = np.array(image)
            tensor = transform(image = np_image)['image']
            tensor = tensor.unsqueeze(0).to(device)

            with torch.no_grad():
                emb = model(tensor)

            np_emb = emb.squeeze().cpu().numpy()
            class_embeddings.append(np_emb)

            entry_id = f"support_{dataset_tag}_{class_name}_{i}"
            try:
                support_col.add(
                    embeddings = [np_emb.tolist()],
                    documents = [class_name],
                    ids = [entry_id],
                    metadatas = [{
                        'class': class_name,
                        'image_path': path,
                        'dataset': dataset_tag,
                        'index': i,
                        'filename': fname
                    }]
                )

            except Exception: # entry already exists, so update it instead
                support_col.update(ids = [entry_id], embeddings = [np_emb.tolist()])

        prototype = np.mean(class_embeddings, axis = 0)
        prototype_id = f"proto_{dataset_tag}_{class_name}"
        try:
            proto_col.add(
                embeddings = [prototype.tolist()],
                documents = [class_name],
                id = [prototype_id],
                metadatas = [{
                    'class': class_name,
                    'dataset': dataset_tag,
                    'n_support': len(class_embeddings)
                }]
            )

        except Exception:
            proto_col.update(ids = [prototype_id], embeddings = [prototype.tolist()])

    print("-- index built --")
    print("prototypes: ", proto_col.count())
    print("support images: ", support_col.count())
    return proto_col, support_col

if __name__ == '__main__':
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    with open('data/processed/splits/medmnist_split.json', 'r', encoding = 'utf-8') as file:
        data_pathmnist = json.load(file)
        print("data loaded: ", data_pathmnist)

    with open('data/processed/splits/isic_split.json', 'r', encoding = 'utf-8') as file:
            data_isic = json.load(file)
            print("data loaded: ", data_isic)

    model = EmbeddingGenerator('efficientnet_b3', embed_dim = 128)
    model.load_state_dict(torch.load('models/best_model_efficientnet_b3.pth', map_location = device))
    model = model.to(device)

    build_support_index(model = model, support_root = 'data/processed/support_images/pathmnist', class_names = data_pathmnist['novel_classes'], modality = 'path', chroma_path = 'chroma_store', dataset_tag = 'PathMNIST', device = device)

    build_support_index(model = model, support_root = 'data/processed/support_images/isic', class_names = data_isic['novel_classes'], modality = 'derm', chroma_path = 'chroma_store', dataset_tag = 'ISIC', device = device)