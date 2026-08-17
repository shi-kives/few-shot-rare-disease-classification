import albumentations as A
from albumentations.pytorch import ToTensorV2 # for converting into tensor compatible shape

# standard ImageNet RGB statistics
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

def get_test_transform(): # transformation pipeline for val and test set images. seperate because test images are sensitive to variations

    return A.Compose([ # for chaining transformations from top ->  bottom
        A.Resize(224,224), # ex (514, 768) -> (224, 224)
        A.Normalize(mean = IMAGENET_MEAN, std = IMAGENET_STD),
        ToTensorV2() # convert numpy (H, W, 3) format -> tensor (3, H, W)
    ])

def get_path_train_transform(): # transformation pipeline for train images

    return A.Compose([
        A.RandomResizedCrop(size = (224, 224), scale = (0.7, 1.0)), # select a random crop size from 70 - 100% and resize to (224, 224)
        A.HorizontalFlip(p = 0.5), # 50% probability of flipping left and right
        A.VerticalFlip(p = 0.5), # 50% probability of flipping top and bottom
        A.RandomRotate90(p = 0.5), # 50% probability of rotating the image by a multiple of 90deg
        A.HueSaturationValue(hue_shift_limit = 10, sat_shift_limit = 20, val_shift_limit = 15), # change color, intensity & brightness
        A.ElasticTransform(alpha = 90, sigma = 6, p = 0.2), # 20% probability of spatial distortion
        A.GaussNoise(std_range=(0.2, 0.4), p = 0.2), # 20% probability of adding gaussian blur
        A.Normalize(mean = IMAGENET_MEAN, std = IMAGENET_STD),
        ToTensorV2()
    ])

def get_derm_train_transform(): # transformation pipeline for ISIC/DermMNIST
    return A.Compose([
            A.RandomResizedCrop(height = 224, width = 224, scale = (0.7, 1.0)),
            A.HorizontalFlip(p = 0.5),
            A.VerticalFlip(p = 0.5),
            A.RandomRotate90(p = 0.5),
            A.ColorJitter(brightness = 0.2, contrast = 0.2, saturation = 0.2, hue = 0.1, p = 0.7), # 70% probability of randomly changing brightness, contrast, saturation & hue
            A.GaussNoise(var_limit = (5.0, 25.0), p = 0.2),
            A.Normalize(mean = IMAGENET_MEAN, std = IMAGENET_STD),
            ToTensorV2()
        ])

def get_transform(modality, mode):
    if mode in ['val', 'test']: # test/val images always go through same pipeline regardless of modality
        return get_test_transform()

    available_modalities = {
        'path': get_path_train_transform, # function for PathMNIST transformations
        'derm': get_derm_train_transform # function for ISIC/DermMNIST transformations
    }

    if modality not in available_modalities:
        raise ValueError(f"unknown modality {modality}. currently available: {available_modalities}") # list supported modalities

    return available_modalities[modality]() # call the selected function

class TwoViewTransform:
    def __init__(self, base_transform):
        self.transform = base_transform # depends on modality. ex: get_path_train_transform()

    def __call__(self, np_image): # makes the object behave like a function
        view1 = self.transform(image = np_image)['image'] # random augmentation
        view2 = self.transform(image = np_image)['image'] # different augmentation on same image

        return view1, view2 # return torch tensors


