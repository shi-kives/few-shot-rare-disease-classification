import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from tqdm import tqdm

def compute_fisher(model, data_loader, device, n_samples = 200):
    model.eval()

    fisher = {name: torch.zeros_like(param) for name, param in model.named_parameters() if param.requires_grad}

    count = 0
    for images, labels in tqdm(data_loader, desc = 'Computing Fisher Score'):
        if count >= n_samples:
            break

        images = images.to(device)
        batch_size = images.size(0)

        for i in range(batch_size):
            if count >= n_samples:
                break

            model.zero_grad()
            one_img = images[i].unsqueeze(0)
            embedding = model(one_img)

            log_prob = F.log_softmax(embedding, dim = 1)

            with torch.no_grad():
                sampled_idx = torch.multinomial(torch.exp(log_prob), num_samples = 1).squeeze()

                loss = F.nll_loss(log_prob, sampled_idx.unsqueeze(0))
                loss.backward()

                for name, param in model.named_parameters():
                    if param.requires_grad and param.grad is not None:
                        fisher[name] += param.grad.detach() ** 2

                count += 1
    for name in fisher:
        fisher[name] /= count

    print(f"fisher computed over {count} samples")
    print(f"parameters tracked: {len(fisher)}")

    all_values = torch.cat([f.flatten() for f in fisher.values()])
    print(f"mean: {all_values.mean():.6f}, max: {all_values.max():.6f}, non-zeroes: {(all_values > 0).sum().item()}")

    return fisher

def save_ewc_state(model, fisher, save_dir = 'models'):
    import os
    os.makedirs(save_dir, exist_ok = True)

    fisher_path = os.path.join(save_dir, 'fisher_diagonal.pt')
    torch.save(fisher, fisher_path)
    print(f"fisher diagonal saved at: {fisher_path}")

    anchor_weights = {name: param.detach().clone() for name, param in model.named_parameters()}
    anchor_path = os.path.join(save_dir, 'anchor_weights.pt')
    torch.save(anchor_weights, anchor_path)
    print(f"anchor weights saved at: {anchor_path}")

    return fisher_path, anchor_path

def load_ewc_state(device, save_dir = 'models'):
    import os

    fisher_path = os.path.join(save_dir, 'fisher_diagonal.pt')
    anchor_path = os.path.join(save_dir, 'anchor_weights.pt')

    if not os.path.exists(fisher_path):
        raise FileNotFoundError("fisher path not found!")

    if not os.path.exists(anchor_path):
        raise FileNotFoundError("anchor weights not found!")

    fisher = torch.load(fisher_path, map_location = device)
    anchor = torch.load(anchor_path, map_location = device)
    print("ewc state loaded")

    return fisher, anchor