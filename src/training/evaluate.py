import numpy as np
import scipy.stats as stats
import torch
from src.data.episodic_sampler import sample_episode
from src.models.proto_net import prototypical_loss

def evaluate(model, dataset, class_index, available_classes, n_way, k_shot, q_query, n_episodes, device):
    model.eval()
    accuracies = []

    with torch.no_grad():
        for _ in range(n_episodes):
            support, query, labels = sample_episode(dataset, class_index, available_classes, n_way, k_shot, q_query, device)
            _, accuracy, _ = prototypical_loss(model, support, query, labels, n_way, k_shot)

            accuracies.append(accuracy)

    mean_accuracy = np.mean(accuracies)
    conf_interval = stats.t.interval(0.95, df = len(accuracies) - 1, loc = mean_accuracy, scale = stats.sem(accuracies))
    half_width = (conf_interval[1] - conf_interval[0]) / 2

    model.train()
    return float(mean_accuracy), float(half_width)