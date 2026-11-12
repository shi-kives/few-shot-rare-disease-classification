from torch.utils.data import Dataset # for custom datasets to inherit
from PIL import Image # for loading ISIC images
from collections import defaultdict
import numpy as np
import pandas as pd
import os
from medmnist import PathMNIST

def get_data_root():
    if os.path.exists('/content/local_data/pathmnist_224.npz'):
        return '/content/local_data'
    if os.path.exists('/content/drive/MyDrive/medmnist_data'):
        return '/content/drive/MyDrive/medmnist_data'
    return './data/raw'

class PathMNISTDataset(Dataset): # custom PathMNIST dataset wrapper

    def __init__(self, split, transform = None):
        DATA_ROOT = get_data_root()
        os.makedirs(DATA_ROOT, exist_ok=True)
        file_exists = os.path.exists(os.path.join(DATA_ROOT, 'pathmnist_224.npz'))

        self.base = PathMNIST(split = split, download = not file_exists, size = 224, root = DATA_ROOT, mmap_mode='r') # split can be = ['train', 'val', 'test']. size is 224 x 224 for EfficientNet-B3

        self.transform = transform # image preprocessing function. defined in augmentations.py

    def __len__(self):
        return len(self.base) # number of training samples in PathMNIST

    def __getitem__(self, idx): # retrieves image with index 'idx'
        image, label = self.base[idx] # dtype of image = Numpy/PIL, of label = Numpy array with number instead of plain int
        np_image = np.array(image) # convert image to numpy array. shape = (224, 224, 3). 3 channels

        if self.transform: # if transform == None, skip
            np_image = self.transform(image = np_image)['image'] # extract 'image' feature from output dictionary. results in torch tensor of shape (3, 224, 224)

        label_int = int(label[0]) if hasattr(label, '__len__') else int(label) # convert [3] (array obj) -> 3 (plain int)

        return np_image, label_int # returns torch tensor + plain int label

def build_class_index(dataset): # creates a mapping of class -> sample indices for episodic training
    class_index = defaultdict(list)

    if hasattr(dataset, 'base') and hasattr(dataset.base, 'labels'):
        labels = dataset.base.labels.flatten()
        for idx, label in enumerate(labels):
            class_index[int(label)].append(idx)
        return dict(class_index)

    # Fast path for ISICDataset: read pre-parsed (image_path, label) tuples
    if hasattr(dataset, 'samples'):
        for idx, (_, label) in enumerate(dataset.samples):
            class_index[int(label)].append(idx)
        return dict(class_index)

    # Fallback for any other dataset wrapper
    for idx in range(len(dataset)):
        _, label = dataset[idx]
        class_index[int(label)].append(idx)

    return dict(class_index)