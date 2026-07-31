import torch
from torch.utils.data import Dataset
import numpy as np

def sample_episode(dataset, class_index, base_classes, n_way, k_shot, q_query, device):
    episode_classes = np.random.choice(base_classes, size = n_way, replace = False)
    support_images, query_images, query_labels = [], [], []

    for local_label, global_class in enumerate(episode_classes):
        pool = class_index[global_class]

        total = k_shot + q_query
        if len(pool) < total:
            raise Exception(f"enough images not available! reduce k or q")

        chosen = np.random.choice(pool, size = total, replace = False)
        support_indices = chosen[:k_shot]
        query_indices = chosen[k_shot:]

        sup_imgs = torch.stack([dataset[i][0] for i in support_indices])
        que_imgs = torch.stack([dataset[i][0] for i in query_indices])

        support_images.append(sup_imgs)
        query_images.append(que_imgs)
        query_labels.extend([local_label] * q_query)

    support = torch.stack(support_images).to(device)
    query = torch.cat(query_images).to(device)
    labels = torch.tensor(query_labels, dtype = torch.long).to(device)

    if labels.min() <= 0:
        raise Exception("negative labels found!")
    if labels.max() > n_way:
        raise Exception("out of range labels")
    if labels.shape != (n_way * q_query, ):
        raise Exception("incorrect labels shape. please recheck")

    return support, query, labels

class EpisodeLoader:
    def __init__(self, dataset, class_index, base_classes, n_way, k_shot, q_query, episodes_per_epoch, device):
        self.dataset = dataset
        self.class_index = class_index
        self.base_classes = list(base_classes)
        self.n_way = n_way
        self.k_shot = k_shot
        self.q_query = q_query
        self.episodes_per_epoch = episodes_per_epoch
        self.device = device

    def __len__(self):
        return self.episodes_per_epoch

    def __iter__(self):
        for _ in range(self.episodes_per_epoch):
            yield sample_episode(self.dataset, self.class_index, self.base_classes, self.n_way, self.k_shot, self.q_query, self.device)