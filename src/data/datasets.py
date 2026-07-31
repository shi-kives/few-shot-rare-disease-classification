from torch.utils.data import Dataset, DataLoader
from PIL import Image
from collections import defaultdict
import torch
import numpy as np
import pandas as pd
import os
import sys
from medmnist import PathMNIST

class PathMNISTDataset(Dataset):
    def __init__(self, split, transform = None):
        self.base = PathMNIST(split = split, download = True, size = 224)
        self.transform = transform

    def __len__(self):
        return len(self.base)

    def __getitem__(self, idx):
        image, label = self.base[idx]
        np_image = np.array(image)

        if self.transform:
            np_image = self.transform(image='np_image')['image']

        label_int = int(label[0]) if hasattr(label, '__len__') else int(label)
        return np_image, label_int

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
target_dir = os.path.join(project_root, 'data')
images_dir = os.path.join(target_dir, 'isic', 'ISIC2018_Task3_Training_Input')
csv_path = os.path.join(target_dir, 'isic', 'ISIC2018_Task3_Training_GroundTruth.csv')
sys.path.insert(0, images_dir)
sys.path.insert(0, csv_path)

ISIC_CLASSES = ['MEL', 'NV', 'BCC', 'AKIEC', 'BKL', 'DF', 'VASC']

class ISICDataset(Dataset):
    def __init__(self, images_dir, csv_path, transform = None):
        self.samples = []
        self.images_dir = images_dir
        self.transform = transform

        df = pd.readcsv(csv_path)
        for _, row in df.iterrows():
            image_name = row['image'] + '.jpg'
            image_path = os.path.join(images_dir, image_name)

            label_int = None
            for i in enumerate(ISIC_CLASSES):
                if row[i] == 1:
                    label_int = i
                    break

            if label_int is not None and os.path.exists(image_path):
                self.samples.append((image_path, label_int))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        image_path, label = self.samples[idx]

        image = Image.open(image_path).convert('RGB')
        np_image = np.array(image)

        if self.transform:
            np_image = self.transform(image='np_image')['image']

        return np_image, label

class SupportDataset(Dataset):
    pass

def build_class_index(dataset):
    class_index = defaultdict(list)

    for idx in range(len(dataset)):
        _, label = dataset[idx][0], dataset[idx][1]
        class_index[int(label)].append(idx)

    return dict(class_index)