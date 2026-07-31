import torch
import torch.nn.functional as F

def compute_prototypes(support_emb, n_way, k_shot):
    D = support_emb.shape[-1]
    return support_emb.view(n_way, k_shot, D).mean(dim=1)

def prototypical_loss(model, support, query, labels, n_way, k_shot):
    C, H, W = support.shape[2], support.shape[3], support.shape[4]
    support_flattened = support.view(n_way * k_shot, C, H, W)
    support_embeddings = model(support_flattened)

    prototypes = compute_prototypes(support_embeddings, n_way, k_shot)

    query_embeddings = model(query)

    dists = torch.cdist(query_embeddings, prototypes, p = 2)

    log_probs = F.log_softmax(-dists, dim = 1)
    loss = F.nll_loss(log_probs, labels)

    predictions = log_probs.argmax(dim = 1)
    accuracy = (predictions == labels).float().mean().item()

    return loss, accuracy, prototypes.detach()