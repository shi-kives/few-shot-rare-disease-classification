import torch
import torch.nn.functional as F
from tqdm import tqdm


def compute_episodic_fisher(model, dataset, class_to_indices, available_classes, device, n_episodes=100, n_way=4, n_support=5, n_query=5):
    model.eval()
    fisher = {name: torch.zeros_like(param) for name, param in model.named_parameters() if param.requires_grad}
    valid_episodes = 0

    for _ in tqdm(range(n_episodes), desc='computing episodic fisher'):
        if len(available_classes) < n_way:
            raise ValueError(f'Need at least {n_way} classes, got {len(available_classes)}')

        selected_indices = torch.randperm(len(available_classes))[:n_way].tolist()
        selected_classes = [available_classes[i] for i in selected_indices]
        support_images, support_labels, query_images, query_labels = [], [], [], []

        for episode_label, class_id in enumerate(selected_classes):
            indices = class_to_indices[class_id]
            required = n_support + n_query
            if len(indices) < required:
                continue

            selected = torch.randperm(len(indices))[:required].tolist()
            support_indices, query_indices = selected[:n_support], selected[n_support:]

            for idx in support_indices:
                image, _ = dataset[indices[idx]]
                support_images.append(image)
                support_labels.append(episode_label)

            for idx in query_indices:
                image, _ = dataset[indices[idx]]
                query_images.append(image)
                query_labels.append(episode_label)

        if len(support_images) != n_way * n_support or len(query_images) != n_way * n_query:
            continue

        support_images = torch.stack(support_images).to(device)
        query_images = torch.stack(query_images).to(device)
        support_labels = torch.tensor(support_labels, dtype=torch.long, device=device)
        query_labels = torch.tensor(query_labels, dtype=torch.long, device=device)

        model.zero_grad(set_to_none=True)
        support_embeddings = model(support_images)
        query_embeddings = model(query_images)

        prototypes = torch.stack([support_embeddings[support_labels == class_idx].mean(dim=0) for class_idx in range(n_way)])
        distances = torch.cdist(query_embeddings, prototypes, p=2)
        loss = F.cross_entropy(-distances.pow(2), query_labels)
        loss.backward()

        for name, param in model.named_parameters():
            if param.requires_grad and param.grad is not None:
                fisher[name] += param.grad.detach().pow(2)

        valid_episodes += 1

    if valid_episodes == 0:
        raise RuntimeError('no valid episodes were generated. check class_to_indices, available_classes, n_way, n_support and n_query.')

    for name in fisher:
        fisher[name] /= valid_episodes

    values = torch.cat([value.flatten() for value in fisher.values()])
    print(f'Fisher computed over {valid_episodes} episodes')
    print(f'Parameters tracked: {len(fisher)}')
    print(f'Mean: {values.mean().item():.6f}, Max: {values.max().item():.6f}, Min: {values.min().item():.6f}')
    print(f'Non-zeroes: {(values > 0).sum().item()}, Zero fraction: {(values == 0).float().mean().item():.6f}')

    return fisher


def save_episodic_fisher_state(model, fisher, save_dir='models'):
    import os
    os.makedirs(save_dir, exist_ok=True)

    fisher_path = os.path.join(save_dir, 'fisher_diagonal.pt')
    anchor_path = os.path.join(save_dir, 'anchor_weights.pt')

    torch.save(fisher, fisher_path)
    torch.save({name: param.detach().clone() for name, param in model.named_parameters()}, anchor_path)

    print(f'Fisher saved to: {fisher_path}')
    print(f'Anchor weights saved to: {anchor_path}')

    return fisher_path, anchor_path