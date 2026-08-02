import numpy as np
import scipy.stats as stats
import torch
from tqdm import tqdm
from src.data.episodic_sampler import sample_episode
from src.models.proto_net import prototypical_loss, compute_prototypes

def evaluate(model, dataset, class_index, available_classes, n_way, k_shot, q_query, n_episodes, device):
    model.eval()
    accuracies = []

    if len(available_classes) < n_way:
        raise Exception(f"number of classes available ({available_classes}) is less than n_way ({n_way})!")
    try:
        with torch.no_grad():
            for _ in tqdm(range(n_episodes), desc=f"{n_way}-way {k_shot}-shot"):
                support, query, labels = sample_episode(dataset, class_index, available_classes, n_way, k_shot, q_query, device)
                _, accuracy, _ = prototypical_loss(model, support, query, labels, n_way, k_shot)

                accuracies.append(accuracy)

    finally:
        model.train()
    
    mean_accuracy = np.mean(accuracies)
    conf_interval = stats.t.interval(0.95, df = len(accuracies) - 1, loc = mean_accuracy, scale = stats.sem(accuracies))
    half_width = (conf_interval[1] - conf_interval[0]) / 2

    return float(mean_accuracy), float(half_width)


def k_retrieval_precision(model, test_images, test_labels, support_collection, k, device):
    device = torch.device('cpu')

    model.eval()
    precisions = []

    with torch.no_grad():
        for image_tensor, true_label in zip(test_images, test_labels):
            if image_tensor.dim() == 3:
                image_tensor = image_tensor.unsqueeze(0)
            image_tensor = image_tensor.to(device)
            embedding = model(image_tensor)
            np_embedding = embedding.squeeze().cpu().np().tolist()

            results = support_collection.query(query_embeddings = [np_embedding], n_results = k, include = ['metadatas'])
            retrieved_classes = [m['class'] for m in results['metadatas'][0]]

            correct = sum(1 for c in retrieved_classes if c == true_label)
            precisions.append(correct / k)

    model.train()
    return float(np.mean(precisions))
    
def distance_threshold(model, dataset, class_index, available_classes, proto_collection, n_episodes = 200, percentile = 95, device = None):
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    model.eval()
    min_distances = []

    with torch.no_grad():
        for _ in range(n_episodes):
            support, query, labels = sample_episode(dataset, class_index, available_classes, n_way = 5, k_shot = 5, q_query = 15, device = device)
            n_way, k_shot = 5, 5
            C, H, W = support.shape[2:]

            support_embeddings = model(support.view(n_way * k_shot, C, H, W))
            prototypes = compute_prototypes(support_embeddings, n_way, k_shot)
            query_embeddings = model(query)

            dists = torch.cdist(query_embeddings, prototypes, p = 2)
            min_d = dists.min(dim = 1).values

            predictions = dists.argmin(dim = 1)
            correct = predictions == labels
            min_distances.extend(min_d[correct].cpu().numpy().tolist())
    
    threshold = float(np.percentile(min_distances, percentile))
    print(f"distance threshold ({percentile}%): {threshold:.4f}")
    model.train()
    return threshold