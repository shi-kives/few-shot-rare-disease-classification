import torch
import numpy as np
import matplotlib.pyplot as plt
from sklearn.manifold import TSNE
from src.models.embedding_generator import EmbeddingGenerator
from src.data.datasets import PathMNISTDataset
from src.data.augmentations import get_transform

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = EmbeddingGenerator('efficientnet_b3', 128).to(device)
model.load_state_dict(torch.load('models/best_model_efficientnet_b3.pth', map_location=device))
model.eval()

dataset = PathMNISTDataset('test', transform=get_transform('path', 'test'))

embeddings, labels = [], []

with torch.no_grad():
    for i in range(len(dataset)):
        image, label = dataset[i]
        image = image.unsqueeze(0).to(device)
        embedding = model(image)
        embeddings.append(embedding.squeeze(0).cpu().numpy())
        labels.append(label)

embeddings = np.stack(embeddings)
labels = np.array(labels)

print("embeddings:", embeddings.shape)
print("labels:", labels.shape)

tsne = TSNE(n_components=2, perplexity=30, random_state=42, init='pca')
points = tsne.fit_transform(embeddings)

plt.figure(figsize=(10, 8))

for cls in np.unique(labels):
    mask = labels == cls
    plt.scatter(points[mask, 0], points[mask, 1], label=f'class {cls}', alpha=0.7)

plt.title("t-SNE of Learned Embeddings")
plt.xlabel("t-SNE 1")
plt.ylabel("t-SNE 2")
plt.legend()
plt.tight_layout()
plt.savefig("models/tsne_embeddings.png", dpi=300, bbox_inches="tight")
plt.show()