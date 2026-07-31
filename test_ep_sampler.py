from src.data.datasets import PathMNISTDataset, build_class_index
from src.data.augmentations import get_transform
from src.data.episodic_sampler import sample_episode
import json

with open('data/processed/splits/medmnist_split.json', 'r', encoding = 'utf-8') as file:
    data = json.load(file)
    print("data loaded: ", data)

dataset = PathMNISTDataset(split = 'train', transform = get_transform('path', 'train'))
base_classes = data['base_classes']
device = 'cpu'
classes_index = build_class_index(dataset)

for i in range(3):
    print("starting episode: ", i+1)
    support, query, label = sample_episode(dataset = dataset, class_index= classes_index, base_classes=base_classes, n_way = 5, k_shot = 5, q_query = 5, device = device)

    print(f"support shape: {support.shape} query shape: {query.shape} labels shape: {label.shape}")
    print(f"label range: {label.min()} -> {label.max()}")
    print(f"episode {i + 1} done")

print("all episodes passed")