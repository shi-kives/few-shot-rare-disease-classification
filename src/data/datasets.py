from torch.utils.data import Dataset # for custom datasets to inherit
from PIL import Image # for loading ISIC images
from collections import defaultdict
import numpy as np
import pandas as pd
import os
from medmnist import PathMNIST

class PathMNISTDataset(Dataset): # custom PathMNIST dataset wrapper

    def __init__(self, split, transform = None):
        self.base = PathMNIST(split = split, download = True, size = 224) # split can be = ['train', 'val', 'test']. size is 224 x 224 for EfficientNet-B3

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

# -- Navigate to ISIC dataset in the repository -- 
current_dir = os.path.dirname(os.path.abspath(__file__)) # absolute directory of this file
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
target_dir = os.path.join(project_root, 'data')
images_dir = os.path.join(target_dir, 'isic', 'ISIC2018_Task3_Training_Input')
csv_path = os.path.join(target_dir, 'isic', 'ISIC2018_Task3_Training_GroundTruth.csv')

ISIC_CLASSES = ['MEL', 'NV', 'BCC', 'AKIEC', 'BKL', 'DF', 'VASC'] # define mapping of ISIC classes

class ISICDataset(Dataset): # custom ISIC dataset wrapper

    def __init__(self, images_dir, csv_path, transform = None):
        self.samples = [] # for tuples of image paths & label - (img_path, label)
        self.images_dir = images_dir
        self.transform = transform

        df = pd.read_csv(csv_path) # loads csv file into pandas DataFrame object
        for _, row in df.iterrows(): # iterate through each row
            image_name = row['image'] + '.jpg' # find image name
            image_path = os.path.join(images_dir, image_name)

            label_int = None
            for i, class_name in enumerate(ISIC_CLASSES):
                if row[class_name] == 1: # iterate until the class with value 1 is obtained (data is present in one hot encoded form).
                    label_int = i
                    break # move to next row

            if label_int is not None and os.path.exists(image_path): # add to samples list only if the valid class and path to that image exists.
                self.samples.append((image_path, label_int))

    def __len__(self):
        return len(self.samples) # number of valid images found

    def __getitem__(self, idx):
        image_path, label = self.samples[idx] # retrieves image path and label of index 'idx'

        image = Image.open(image_path).convert('RGB') # use PIL to import the image, because unlike PathMNIST, ISIC provides images directly.
        np_image = np.array(image)

        if self.transform: # apply image preprocessing
            np_image = self.transform(image=np_image)['image']

        return np_image, label

def build_class_index(dataset): # creates a mapping of class -> sample indices for episodic training

    class_index = defaultdict(list) 

    for idx in range(len(dataset)): # iterate over all samples
        _, label = dataset[idx][0], dataset[idx][1] # retrieve image + label
        class_index[int(label)].append(idx) # for class 'label', append 'idx' to the list. ex: {1: [0], 2: [4, 5]}

    return dict(class_index)

class SupConDataset(Dataset): # custom dataset wrapper for Supervised Contrastive Learning
    
    def __init__(self, base_dataset, two_view_transform):
        self.dataset = base_dataset
        self.transform = two_view_transform # seperate transformation pipeline

    def __len__(self):
        return len(self.dataset)

    def __getitem__(self, idx):
        raw_image = self.dataset.base[idx][0] # retrieve raw image instead of transformed one
        np_image = np.array(raw_image)

        if np_image.ndim == 2:  # check if image is greyscale, i.e, 2 channels (b/w)
            np_image = np.stack([np_image] * 3, axis = -1) # duplicate greyscale 3x to make it compatible with models expecting RGB input.

        view1, view2 = self.transform(np_image) # apply two view augmentation & retrieve the two views
        label = self.dataset[idx][1]

        return view1, view2, label # return two differently augmented images & label