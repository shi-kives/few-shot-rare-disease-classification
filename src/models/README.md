# components of src/models

## 1. embedding_generator.py
class `EmbeddingGenerator` contains the functions:
1. `__init__`:
- Takes two configurable arguments: `backbone` to determine which pretrained CNN/vision architecture to use (default = resnet18), and `embed_dim`, which tells the number of dimensions for the final embedding (default = 128)
- Uses `timm` to create a model based on parameters - `model_name`, `pretrained`, and `num_classes`. pretrained ensures that ImageNet pretrained weights are used instead of starting with random weights. num_classes removes the ImageNet classification head
- A projection head is created as: `1536 -> 256 -> ReLU -> Dropout -> 128`. ReLU is used to introduce non-linearity, and Dropout for regularization and MC dropout.
2. `forward()`:
- Converts the received tensor of shape `(num_images, 3, 224, 224) -> (num_images, 1536) by efficientnet -> (num_images, 128) by projection head`
3. `freeze_backbone()`:
- Key concept for transfer learning. The idea is to not update pretrained backbone initially and only train the projection head.
4. `unfreeze_last_block()`:
- Instead of unfreezing the entire backbone, it is ideal to unfreeze only the last block, because earlier layers contain generic visual features like edges, textures and simple shapes which remain the same everywhere. Later layers tend to learn more task-specific features.
- So: `freeze -> early layers of backone. train -> later layers, projection head`
- Checks for iterability of the layer/block, and sets `requires_grad` to `True` for all parameters in last block, and returns.
- If architecture is not identified, it unfreezes the whole backbone.

## 2. proto_net.py
1. `compute_prototypes()`:
- Computes prototype for each class. Computes mean across the `k_shot` dimension, and produces `n_way` prototypes,
2. `prototypical_loss()`:
- Flattens data into (n_way * k_shot, ) as per model's expectations.
- Generates support and query embeddings
- Computes prototypes for support embeddings.
- Calculates pairwise Euclidean distances between query embeddings and prototypes. Converts these distances to log probabilities. Our aim is to find the prototype our query embedding is closest to, so we negate the distances, and softmax converts them to probabilities.
- Logarithm is computed instead of typical softmax, because `nll_loss()` expects log probablities
- Prototypical loss is calculated using log probabilities and labels, and predictions are made by calculating maximum probability across the row (i.e, closest prototype to query image).