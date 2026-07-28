from medmnist import PathMNIST

train_dataset = PathMNIST(split='train', download=True, size=224)
val_dataset = PathMNIST(split='val', download=True, size=224)
test_dataset = PathMNIST(split='test', download=True, size=224)