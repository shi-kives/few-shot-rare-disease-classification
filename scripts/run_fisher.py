import torch
from src.models.embedding_generator import EmbeddingGenerator
from src.data.datasets import PathMNISTDataset, build_class_index
from src.data.augmentations import get_transform
from src.continual.fisher import compute_episodic_fisher, save_episodic_fisher_state

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = EmbeddingGenerator('efficientnet_b3', 128)
model.load_state_dict(torch.load('models/best_model_efficientnet_b3.pth', map_location=device))
model = model.to(device)
model.eval()

dataset = PathMNISTDataset('train', transform=get_transform('path', 'test'))
class_to_indices = build_class_index(dataset)
available_classes = [1, 2, 3, 5, 7, 8]

fisher = compute_episodic_fisher(model, dataset, class_to_indices, available_classes, device, n_episodes=100, n_way=4, n_support=5, n_query=5)
save_episodic_fisher_state(model, fisher, save_dir='models')