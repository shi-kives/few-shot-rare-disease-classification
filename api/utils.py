import io
import logging
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision import transforms

# Ensure project root is in sys.path so src.* modules can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.embedding_generator import EmbeddingGenerator

logger = logging.getLogger("uvicorn")
 
# ImageNet normalization stats — standard for a pretrained backbone
# (resnet / efficientnet / vit etc. all typically expect these)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
 
_preprocess_pipeline = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ]
)
 
 
def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """
    Convert raw uploaded image bytes into a model-ready tensor.
 
    Returns a (1, 3, 224, 224) float tensor, batch dimension included.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = _preprocess_pipeline(image)
    return tensor.unsqueeze(0)  # add batch dimension -> (1, 3, 224, 224)
 
 
def embed_image(image_tensor: torch.Tensor, model: torch.nn.Module, device: torch.device) -> np.ndarray:
    """
    Run a preprocessed image tensor through the model and return a
    128d embedding as a numpy array (detached from the graph, off-GPU).
    """
    model.eval()
    with torch.no_grad():
        image_tensor = image_tensor.to(device)
        embedding = model(image_tensor)
        # Some models return (embedding, logits) or a dict — unwrap if so.
        if isinstance(embedding, (tuple, list)):
            embedding = embedding[0]
    emb_np = embedding.squeeze(0).cpu().numpy()
    norm = np.linalg.norm(emb_np)
    if norm > 1e-8:
        emb_np = emb_np / norm
    return emb_np
 
 
def load_model(path: str, config: dict, device: torch.device) -> torch.nn.Module:
    """
    Instantiate the embedding model from config and load trained weights
    from `path`. Returns the model in eval mode, moved to `device`.
    """
    model = EmbeddingGenerator(
        backbone=config.get("backbone", "resnet18"),
        embed_dim=config.get("embed_dim", config.get("embedding_dim", 128)),
    )

    state_dict = torch.load(path, map_location=device)
    # Some checkpoints save {"model_state_dict": ...} rather than the raw state dict
    if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
        state_dict = state_dict["model_state_dict"]

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    logger.info(f"Loaded model weights from {path} onto {device}")
    return model