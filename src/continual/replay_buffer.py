import os
import numpy as np
import torch
from PIL import Image
from collections import defaultdict

class ReplayBuffer:
    def __init__(self, k_per_class = 5):
        self.k_per_class = k_per_class
        self.buffer = {}
        self.class_to_label = {}

    def add_class(self, class_name, images_tensor, model, device, label):
        if label is None:
            label = len(self.buffer)
        self.class_to_label[class_name] = label

        model.eval()
        with torch.no_grad():
            embeddings = model(images_tensor.to(device))

            full_prototype = embeddings.mean(dim = 0)
            selected_indices = []
            remaining = list(range(len(embeddings)))
            running_sum = torch.zeros_like(embeddings[0])

            for step in range(min(self.k_per_class, len(embeddings))):
                best_idx = None
                best_dist = float('inf')

                for i in remaining:
                    candidate_mean = (running_sum + embeddings[i]) / (step + 1)
                    dist = torch.dist(candidate_mean, full_prototype).item()
                    if dist < best_dist:
                        best_dist = dist
                        best_idx = i

                selected_indices.append(best_idx)
                running_sum += embeddings[best_idx]
                remaining.remove(best_idx)

            selected_images = images_tensor[selected_indices].cpu()
            self.buffer[class_name] = {
                'images': selected_images,
                'label': label
            }

            print(f"class ReplayBuffer added {class_name}\n{len(selected_indices)}/{len(images_tensor)} images selected")

    def update_class(self, class_name, new_images_tensor, model, device):
        if class_name not in self.buffer:
            self.add_class(class_name, new_images_tensor, model, device)
            return

        existing_label = self.buffer[class_name]['label']
        existing_images = self.buffer[class_name]['images']
        combined = torch.cat([existing_images, new_images_tensor.cpu()], dim = 0)

        self.add_class(class_name, combined, model, device, label = existing_label)

    def sample_batch(self, n_per_class = 2):
        if not self.buffer:
            return None, None

        all_images, all_labels = [], []

        for class_name, data in self.buffer.items():
            imgs = data['images']
            label = data['label']
            n = min(n_per_class, imgs.size(0))
            idx = torch.randperm(imgs.size(0))[:n]
            all_images.append(imgs[idx])
            all_labels.extend([label] * n)

        if not all_images:
            return None, None

        images_batch = torch.cat(all_images, dim = 0)
        return images_batch, all_labels

    def get_all_classes(self):
        return list(self.buffer.keys())

    def __len__(self):
        return len(self.buffer)

    def __contains__(self, class_name):
        return class_name in self.buffer

    def save(self, path):
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok = True)
        torch.save({
            'buffer': self.buffer,
            'class_to_label': self.class_to_label,
            'k_per_class': self.k_per_class
        }, path)
        print("replay buffer saved to: ", path)

    @classmethod
    def load(cls, path):
        if not os.path.exists(path):
            print(f"no replay buffer found at {path}. restarting...")
            return cls()

        data = torch.load(path, map_location = 'cpu')
        buffer = cls(k_per_class = data['k_per_class'])
        buffer.buffer = data['buffer']
        buffer.class_to_label = data['class_to_label']
        print(f"ReplayBuffer loaded {path}. Loaded {len(buffer.buffer)} classes")
        return buffer