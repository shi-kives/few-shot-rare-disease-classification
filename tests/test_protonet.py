from src.models.embedding_generator import EmbeddingGenerator
from src.models.proto_net import prototypical_loss
from src.data.episodic_sampler import sample_episode
from src.data.datasets import PathMNISTDataset, build_class_index
from src.data.augmentations import get_transform
import json

with open('data/processed/splits/medmnist_split.json', 'r', encoding = 'utf-8') as file:
    data = json.load(file)
    print("data loaded: ", data)

dataset = PathMNISTDataset(split = 'train', transform = get_transform('path', 'train'))
base_classes = data['base_classes']
device = 'cpu'
classes_index = build_class_index(dataset)

model = EmbeddingGenerator(backbone = 'resnet18', embed_dim = 128)
model.freeze_backbone()

support, query, label = sample_episode(dataset, classes_index, base_classes, 5, 5, 15, device)
loss, accuracy, prototypes = prototypical_loss(model, support, query, label, 5, 5)

print(f"loss: {loss.item()}, accuracy: {accuracy:.4f}, prototypes shape: {prototypes.shape}")
print("protonet test passed")