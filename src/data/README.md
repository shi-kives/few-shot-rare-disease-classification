# components of src/data

## 1. datasets.py
1. Creates seperate dataset wrappers for: PathMNIST, ISIC datasets, and SupCon Training. Implements the functions: `__init__`, `__len__`, and `__getitem__`, by inheriting `Dataset` class. 
2. PathMNIST and ISIC wrappers return image-label pairs, while SupCon wrapper returns two augmented views, and its label.
3. Creates a helper function `build_class_index()`, to map class integer values to sample indices. Returns a dictionary.

## 2. augmentations.py
1. Creates seperate pipelines for transforming train images based on modality - path & derm, and a universal pipeline for transforming test/val images.
2. Creates class `TwoViewTransform` to apply train image transformations (again depending on modality) to an image, in two different ways, i.e, 'views'. Augmentations are NOT applied sequentially on the same instance of image. Returns these two views.
3. Creates a universal function `get_transform()` to call the appropriate transform function based on mode (train, test, val) and modality (as of now, path and derm).

## 3. episodic_sampler.py
1. Contains the `sample_episode()` function, which:
- Selects 'n' random classes from the list of base classes
- Retrieves images of that class
- Randomly selects indices from this pool
- Allocates those indices to support and query indices
- Stacks the images into a torch tensor for both support and query sets
- Repeats this process for remaining selected classes
- Returns the support and query sets, with their labels
2. Contains a custom `EpisodeLoader` class, analogous to PyTorch's `DataLoader`, but for episodes. For example, one epoch in DataLoader may be: Number of Images in that Batch/Batch Size, but one epoch in EpisodeLoader contains X episodes. Python's `yield` generator is used to sample each episode independently.  