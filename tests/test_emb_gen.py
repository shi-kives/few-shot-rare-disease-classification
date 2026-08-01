from src.models.embedding_generator import EmbeddingGenerator
import torch

model = EmbeddingGenerator(backbone = 'resnet18', embed_dim = 128)
dummy_data = torch.randn(4, 3, 224, 224)

model.freeze_backbone()
out = model(dummy_data)
print("parameters post freezing backbone: ",model.get_trainable_params())

model.unfreeze_last_block()
print("parameters after unfreezing last block: ",model.get_trainable_params())
print("all embedding generator tests passed")