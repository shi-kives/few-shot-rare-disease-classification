import torch
import torch.nn as nn
import torch.nn.functional as F
import mlflow
from tqdm import tqdm
import numpy as np
import json
from torch.utils.data import DataLoader, Subset

from src.data.datasets import PathMNISTDataset, ISICDataset, build_class_index, SupConDataset
from src.data.augmentations import get_transform, TwoViewTransform
from src.models.embedding_generator import EmbeddingGenerator

class SupConLoss(nn.Module):
    def __init__(self, temperature = 0.07):
        super().__init__()
        self.temperature = temperature

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor):
        B = embeddings.shape[0]
        device = embeddings.device

        emb_norm = F.normalize(embeddings, p = 2, dim = 1)
        sim_mat = torch.matmul(emb_norm, emb_norm.T) / self.temperature

        labels_col = labels.unsqueeze(0)
        labels_row = labels.unsqueeze(1)
        same_class = (labels_row == labels_col)
        identity_mat = torch.eye(B, dtype = torch.bool, device = device)
        positive = same_class & ~identity_mat

        sim_mat_max, _ = sim_mat.max(dim = 1, keepdim = True)
        sim_mat = sim_mat - sim_mat_max.detach()

        exp_sim = torch.exp(sim_mat)
        exp_sim_except_self = exp_sim * (~identity_mat).float()

        denominator = exp_sim_except_self.sum(dim=1, keepdim = True)

        log_probs = sim_mat - torch.log(denominator + 1e-8)

        n_positives = positive.float().sum(dim = 1)
        has_positives = n_positives > 0

        pos_log_prob = (log_probs * positive.float()).sum(dim = 1)
        mean_log_prob = pos_log_prob / (n_positives + 1e-8)

        loss = - mean_log_prob[has_positives].mean()
        return loss

def supcon_collate(batch):
    views1 = torch.stack([item[0] for item in batch])
    views2 = torch.stack([item[1] for item in batch])
    labels = torch.tensor([item[2] for item in batch], dtype = torch.long)

    views = torch.cat([views1, views2], dim = 0)
    labels = torch.cat([labels, labels], dim = 0)

    return views, labels


with open('data/processed/splits/medmnist_split.json', 'r', encoding = 'utf-8') as file:
    data = json.load(file)
    print("data loaded: ", data)

CONFIG = {
    'backbone': 'efficientnet_b3',
    'embed_dim': 128,
    'temperature': 0.07,
    'lr': 1e-3,
    'weight_decay': 1e-4,
    'n_epochs': 25,
    'batch_size': 64,
    'save_path': 'models/backbone_supcon.pth',
    'base_classes': data['base_classes']
}

def pretrain():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"supcon pretraining on: {device}")

    base = PathMNISTDataset('train', transform = None)
    two_view_trans = TwoViewTransform(get_transform('path', 'train'))
    supcon_dataset = SupConDataset(base_dataset = base, two_view_transform = two_view_trans)

    base_indices = [i for i in range(len(base)) if base[i][1] in CONFIG['base_classes']]
    subset = Subset(supcon_dataset, base_indices)

    loader = DataLoader(subset, batch_size = CONFIG['batch_size'], shuffle = True, collate_fn = supcon_collate, num_workers = 0, pin_memory = (device.type == 'cuda'))

    model = EmbeddingGenerator(CONFIG['backbone'], CONFIG['embed_dim']).to(device)
    supcon_head = nn.Sequential(
        nn.Linear(CONFIG['embed_dim'], 128),
        nn.ReLU(),
        nn.Linear(128, 64)
    ).to(device)

    criterion = SupConLoss(temperature = CONFIG['temperature'])
    optimizer = torch.optim.Adam(list(model.parameters()) + list(supcon_head.parameters()), lr = CONFIG['lr'], weight_decay = CONFIG['weight_decay'])

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max = CONFIG['n_epochs'])

    with mlflow.start_run(run_name = 'supcon_pretrain'):
        mlflow.log_params(CONFIG)
        best_loss = float('inf')

        for epoch in range(CONFIG['n_epochs']):
            model.train()
            supcon_head.train()
            epoch_losses = []

            for views, labels in tqdm(loader, desc = f"supcon epoch {epoch + 1}"):
                views = views.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                embeddings = model(views)
                projections = supcon_head(embeddings)

                loss = criterion(projections, labels)
                loss.backward()

                nn.utils.clip_grad_norm_(list(model.parameters()) + list(supcon_head.parameters()), max_norm = 1.0)

                optimizer.step()
                epoch_losses.append(loss.item())

            scheduler.step()
            mean_loss = np.mean(epoch_losses)
            current_lr = optimizer.param_groups[0]['lr']
            print(f"epoch {epoch + 1}/{CONFIG['n_epochs']} ---- loss = {mean_loss:.4f}, lr = {current_lr:.6f}")

            mlflow.log_metric('supcon_loss', mean_loss, step = epoch)
            mlflow.log_metric('lr', current_lr, step = epoch)

            if mean_loss < best_loss:
                best_loss = mean_loss
                torch.save(model.backbone.state_dict(), CONFIG['save_path'])
                print(f"saved backbone weights: loss = {mean_loss:.4f}")

        mlflow.log_artifact(CONFIG['save_path'])


if __name__ == '__main__':
    pretrain()
