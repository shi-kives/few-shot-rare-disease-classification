import torch
import torch.nn as nn
import numpy as np

def enable_dropout(model: nn.Module):
    for module in model.modules():
        if isinstance(module, nn.Dropout):
            module.train()

def mc_predict(model, image_tensor: torch.Tensor, n_runs: int = 30, device: torch.device = None):
    if device is None:
        device = next(model.parameters()).device

    image_tensor = image_tensor.to(device)

    model.eval() # to freeze BatchNorm
    enable_dropout(model)

    run_embeddings = []
    with torch.no_grad():
        for _ in range(n_runs):
            emb = model(image_tensor)
            run_embeddings.append(emb.squeeze().cpu().numpy())

    model.eval()

    embeddings_array = np.stack(run_embeddings)
    mean_emb = embeddings_array.mean(axis = 0)
    variance_per_dim = embeddings_array.var(axis = 0)
    std_per_dim = embeddings_array.std(axis = 0)

    scalar_variance = float(variance_per_dim.mean())

    return {
        'mean_embedding': mean_emb,
        'variance': scalar_variance,
        'std_per_dim': std_per_dim,
        'epistemic_uncertain': scalar_variance > 0.05 # placeholder
    }

def calibrate_mc_threshold(model, val_images, val_labels, n_runs: int = 30, percentile: float = 95.0, device: torch.device = None):
    variances = []

    for image_tensor in val_images:
        result = mc_predict(model, image_tensor, n_runs = n_runs, device = device)
        variances.append(result['variace'])

    threshold = float(np.percentile(variances, percentile))
    print(f"monte carlo dropout threshold {percentile}%ile: {threshold:.6f}")
    print(f"update MC_VARIANCE_THRESHOLD to = {threshold:.6f}")
    return threshold
