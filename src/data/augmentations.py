import albumentations as A
from albumentations.pytorch import ToTensorV2

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

def get_test_transform():
    return A.Compose([
        A.Resize(224,224),
        A.Normalize(mean = IMAGENET_MEAN, std = IMAGENET_STD),
        ToTensorV2()
    ])

def get_path_train_transform():
    return A.Compose([
        A.RandomResizedCrop(size = (224, 224), scale = (0.7, 1.0)),
        A.HorizontalFlip(p = 0.5),
        A.VerticalFlip(p = 0.5),
        A.RandomRotate90(p = 0.5),
        A.HueSaturationValue(hue_shift_limit = 10, sat_shift_limit = 20, val_shift_limit = 15),
        A.ElasticTransform(alpha = 90, sigma = 6, p = 0.2),
        A.GaussNoise(std_range=(0.2, 0.4), p = 0.2),
        A.Normalize(mean = IMAGENET_MEAN, std = IMAGENET_STD),
        ToTensorV2()
    ])

def get_derm_train_transform():
    return A.Compose([
            A.RandomResizedCrop(height = 224, width = 224, scale = (0.7, 1.0)),
            A.HorizontalFlip(p = 0.5),
            A.VerticalFlip(p = 0.5),
            A.RandomRotate90(p = 0.5),
            A.ColorJitter(brightness = 0.2, contrast = 0.2, saturation = 0.2, hue = 0.1, p = 0.7),
            A.GaussNoise(var_limit = (5.0, 25.0), p = 0.2),
            A.Normalize(mean = IMAGENET_MEAN, std = IMAGENET_STD),
            ToTensorV2()
        ])

def get_transform(modality, mode):
    if mode in ['val', 'test']:
        return get_test_transform()

    available_modalities = {
        'path': get_path_train_transform,
        'derm': get_derm_train_transform
    }

    if modality not in available_modalities:
        raise Exception(f"unknown modality {modality}. currently available: {available_modalities}")

    return available_modalities[modality]()

class TwoViewTransform:
    def __init__(self, base_transform):
        self.transform = base_transform

    def __call__(self, np_image):
        view1 = self.transform(image = np_image)['image']
        view2 = self.transform(image = np_image)['image']

        return view1, view2


