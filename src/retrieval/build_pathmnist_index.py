import os
import sys
from pathlib import Path
import numpy as np
import torch
from PIL import Image
from tqdm import tqdm
import chromadb

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.embedding_generator import EmbeddingGenerator
from api.utils import _preprocess_pipeline

# Human-readable histological class names mapped from PathMNIST numeric labels
PATHMNIST_CLASS_NAMES = {
    0: "Adipose Tissue",
    1: "Background",
    2: "Debris",
    3: "Lymphocytes",
    4: "Mucus",
    5: "Smooth Muscle",
    6: "Normal Colon Mucosa",
    7: "Cancer-Associated Stroma",
    8: "Colorectal Adenocarcinoma Epithelium",
}

# Directory-friendly keys
PATHMNIST_CLASS_KEYS = {
    0: "adipose_tissue",
    1: "background",
    2: "debris",
    3: "lymphocytes",
    4: "mucus",
    5: "smooth_muscle",
    6: "normal_colon_mucosa",
    7: "cancer_associated_stroma",
    8: "colorectal_adenocarcinoma_epithelium",
}


def build_and_index_pathmnist(
    model_path: str = "models/best_model_resnet18.pth",
    chroma_dir: str = "data/chroma_db",
    support_root: str = "data/processed/support_images/pathmnist",
    samples_per_class: int = 15,
    device_str: str = "cuda" if torch.cuda.is_available() else "cpu",
):
    """
    Extracts PathMNIST reference images, saves them to static support directory,
    generates 128d embeddings using the trained ResNet-18 model,
    and populates ChromaDB prototypes and support_images collections.
    """
    from medmnist import PathMNIST

    device = torch.device(device_str)
    print(f"Using device: {device}")

    # 1. Load trained embedding model
    print(f"Loading model from {model_path}...")
    model = EmbeddingGenerator(backbone="resnet18", embed_dim=128, pretrained=False)
    state = torch.load(model_path, map_location=device)
    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]
    model.load_state_dict(state)
    model.to(device)
    model.eval()

    # 2. Connect to ChromaDB
    print(f"Connecting to ChromaDB at {chroma_dir}...")
    client = chromadb.PersistentClient(path=chroma_dir)
    proto_col = client.get_or_create_collection("prototypes", metadata={"hnsw:space": "l2"})
    support_col = client.get_or_create_collection("support_images", metadata={"hnsw:space": "l2"})

    # 3. Load PathMNIST validation and test splits
    print("Loading PathMNIST dataset...")
    val_dataset = PathMNIST(split="val", download=True)
    test_dataset = PathMNIST(split="test", download=True)

    support_dir = Path(support_root)
    support_dir.mkdir(parents=True, exist_ok=True)

    demo_dir = Path("data/demo_specimens")
    demo_dir.mkdir(parents=True, exist_ok=True)

    # Collect images grouped by class
    class_images = {k: [] for k in PATHMNIST_CLASS_NAMES.keys()}
    demo_samples = {k: [] for k in PATHMNIST_CLASS_NAMES.keys()}

    for dataset in [val_dataset, test_dataset]:
        for idx in range(len(dataset)):
            img, label = dataset[idx]
            lbl = int(label[0]) if hasattr(label, "__len__") else int(label)
            if len(class_images[lbl]) < samples_per_class:
                class_images[lbl].append(img)
            elif len(demo_samples[lbl]) < 3:
                demo_samples[lbl].append(img)

    print(f"Saving support images and generating embeddings ({samples_per_class} per class)...")

    for lbl, img_list in class_images.items():
        class_name = PATHMNIST_CLASS_NAMES[lbl]
        class_key = PATHMNIST_CLASS_KEYS[lbl]
        target_dir = support_dir / class_key
        target_dir.mkdir(parents=True, exist_ok=True)

        class_embeddings = []

        for i, img in enumerate(img_list):
            filename = f"sample_{i:04d}.png"
            file_path = target_dir / filename

            # Resize to 224x224 and save PNG
            img_224 = img.resize((224, 224), Image.Resampling.BICUBIC)
            img_224.save(file_path, "PNG")

            # Preprocess tensor and embed
            tensor = _preprocess_pipeline(img_224).unsqueeze(0).to(device)
            with torch.no_grad():
                emb = model(tensor)
            emb_np = emb.squeeze(0).cpu().numpy()
            emb_norm = emb_np / (np.linalg.norm(emb_np) + 1e-8)
            class_embeddings.append(emb_norm)

            # Store in support_images collection
            entry_id = f"support_PathMNIST_{class_key}_{i}"
            support_metadata = {
                "class": class_name,
                "image_path": str(file_path).replace("\\", "/"),
                "dataset": "PathMNIST (Histopathology)",
                "modality": "Histopathology",
                "filename": filename,
                "index": i,
            }

            try:
                support_col.add(
                    ids=[entry_id],
                    embeddings=[emb_norm.tolist()],
                    documents=[class_name],
                    metadatas=[support_metadata],
                )
            except Exception:
                support_col.update(
                    ids=[entry_id],
                    embeddings=[emb_norm.tolist()],
                    documents=[class_name],
                    metadatas=[support_metadata],
                )

        # Compute and index Prototype embedding
        if class_embeddings:
            proto_emb = np.mean(class_embeddings, axis=0)
            proto_norm = proto_emb / (np.linalg.norm(proto_emb) + 1e-8)
            proto_id = f"proto_PathMNIST_{class_key}"
            proto_metadata = {
                "class": class_name,
                "dataset": "PathMNIST (Histopathology)",
                "modality": "Histopathology",
                "n_support": len(class_embeddings),
            }

            try:
                proto_col.add(
                    ids=[proto_id],
                    embeddings=[proto_norm.tolist()],
                    documents=[class_name],
                    metadatas=[proto_metadata],
                )
            except Exception:
                proto_col.update(
                    ids=[proto_id],
                    embeddings=[proto_norm.tolist()],
                    documents=[class_name],
                    metadatas=[proto_metadata],
                )

        print(f"Indexed class: '{class_name}' ({len(class_embeddings)} support images)")

    # Also save representative demo test specimens for user upload
    for lbl, test_imgs in demo_samples.items():
        class_key = PATHMNIST_CLASS_KEYS[lbl]
        for j, t_img in enumerate(test_imgs):
            demo_path = demo_dir / f"demo_specimen_{class_key}_{j+1}.png"
            t_img.resize((224, 224), Image.Resampling.BICUBIC).save(demo_path, "PNG")

    print("\n==========================================")
    print("[OK] PathMNIST Support Index successfully built!")
    print(f"Total Prototypes in ChromaDB: {proto_col.count()}")
    print(f"Total Support Images in ChromaDB: {support_col.count()}")
    print(f"Support images directory: {support_dir.resolve()}")
    print(f"Demo specimens directory: {demo_dir.resolve()}")
    print("==========================================")


if __name__ == "__main__":
    build_and_index_pathmnist()
