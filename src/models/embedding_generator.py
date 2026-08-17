import timm # PyTorch Image Models library. Provides ResNet, EfficientNet, ViT
import torch.nn as nn # PyTorch's neural network module. 

class EmbeddingGenerator(nn.Module): # inherits from nn.Module so funtions like parameters(), train(), and eval() can be directly applied onto EmbeddingGenerator object 'model'.

    def __init__(self, backbone = 'resnet18', embed_dim = 128): # default backbone = resnet18. all backbone outputs always have a final embedding size of 128. 
        super().__init__() # for self.backbone & self.projection

        self.backbone = timm.create_model(model_name=backbone, pretrained=True, num_classes=0) # hold pretrained weights instead of random, removes classification head.

        backbone_dim = self.backbone.num_features # different for resnet18 and efficientnet-b3. 

        self.projection = nn.Sequential( # create projection head to convert backbone features -> 128 dim embedding
            nn.Linear(backbone_dim, 256),
            nn.ReLU(),
            nn.Dropout(p=0.1), # randomly set 10% of activations to 0. regularization technique, and for MC dropout.
            nn.Linear(256, embed_dim)
        )
        self.embed_dim = embed_dim
        print(f"embedding generator: {backbone}: {backbone_dim} -> {embed_dim}")

    def forward(self, x): # produces embeddings when model(x) is called. x.shape = (no_images, 3, 224, 224)
        features = self.backbone(x) # shape = (32, 1536) for efficientnet-b3
        embeddings = self.projection(features) # shape = (32, 128)
        return embeddings

    def freeze_backbone(self): # for transfer learning
        for param in self.backbone.parameters(): # loops through trainable parameters in the backbone
            param.requires_grad = False
        print("backbone frozen")

    def unfreeze_last_block(self):
        for attr_name in ['layer4', 'blocks']: #layer4 for resnet and blocks for efficientnet
            if hasattr(self.backbone, attr_name):
                block = getattr(self.backbone, attr_name)
                if hasattr(block, '__iter__'): # check if it's iterable
                    last = list(block)[-1] # obtain last block
                    for param in last.parameters():
                        param.requires_grad = True

                else: # non-iterable
                    for param in block.parameters():
                        param.requires_grad = True
                print("unfroze last block: ", attr_name)
                return # return since final block is unfrozen
        print("couldn't identify last block. unfreezing the entire backbone")
        for param in self.backbone.parameters():
            param.requires_grad = True

    def get_trainable_params(self): # utility
        return sum(p.numel() for p in self.parameters() if p.requires_grad) # get every parameter in backbone & projection head using self.parameters(), consider only parameters that are trainable using requires_grad, and return number of scalar values in that parameter tensor using numel(). sum() adds all trainable parameters