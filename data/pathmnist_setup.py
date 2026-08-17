from medmnist import PathMNIST
import numpy as np
import os
from PIL import Image

def create_datasets():
    train_dataset = PathMNIST(split='train', download=True, size=224)
    print("train dataset loaded")
    val_dataset = PathMNIST(split='val', download=True, size=224)
    print("val dataset loaded")
    test_dataset = PathMNIST(split='test', download=True, size=224)
    print("test dataset loaded")

    novel_classes = [0, 4, 6]
    base_classes  = [1, 2, 3, 5, 7, 8]

    base_output_dir = os.path.join("data", "processed", "support_images", "PathMNIST")

    for cls in range(9):
        dataset = test_dataset if cls in novel_classes else train_dataset

        labels = np.array(dataset.labels).flatten()
        class_indices = np.where(labels == cls)[0]
        
        chosen_indices = np.random.choice(class_indices, size=10, replace=False)

        class_dir = os.path.join(base_output_dir, f"class_{cls}")
        os.makedirs(class_dir, exist_ok=True)

        for idx in chosen_indices:
            pil_img, _ = dataset[idx]
            
            file_name = f"img_{idx}.png"
            save_path = os.path.join(class_dir, file_name)
            
            pil_img.save(save_path)
            
        print(f"saved 10 images for class {cls} to {class_dir}")

    return train_dataset, val_dataset, test_dataset

if __name__ == '__main__':
    train_ds, val_ds, test_ds = create_datasets()
