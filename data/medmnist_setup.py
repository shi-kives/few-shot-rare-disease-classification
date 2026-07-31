from medmnist import PathMNIST

def create_datasets():
    train_dataset = PathMNIST(split='train', download=True, size=224)
    print("train dataset loaded")
    val_dataset = PathMNIST(split='val', download=True, size=224)
    print("val dataset loaded")
    test_dataset = PathMNIST(split='test', download=True, size=224)
    print("test dataset loaded")
    return train_dataset, val_dataset, test_dataset