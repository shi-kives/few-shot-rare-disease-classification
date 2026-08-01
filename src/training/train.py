import json
import torch
import torch.nn as nn
import mlflow
from tqdm import tqdm

from src.data.datasets import PathMNISTDataset, build_class_index
from src.data.augmentations import get_transform
from src.data.episodic_sampler import EpisodeLoader
from src.models.embedding_generator import EmbeddingGenerator
from src.models.proto_net import prototypical_loss
from src.training.evaluate import evaluate

with open('data/processed/splits/medmnist_split.json', 'r', encoding = 'utf-8') as file:
    data = json.load(file)
    print("data loaded: ", data)

CONFIG = {
    'backbone': 'resnet18',
    'embed_dim': 128,
    'n_way': 5,
    'k_shot': 5,
    'q_query': 15,
    'episodes_per_epoch': 100,
    'val_episodes': 50,
    'n_epochs': 30,
    'lr_head': 1e-3,
    'lr_backbone': 1e-5,
    'unfreeze_epoch': 5, # unfreeze backbone after this number of epochs
    'grad_clip': 1.0,
    'base_classes': data['base_classes'],
    'novel_classes': data['novel_classes'],
    'model_save_path': 'models/best_model.pth'
}


def train():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("training on device: ", device)

    train_dataset = PathMNISTDataset('train', transform = get_transform('path', 'train'))
    val_dataset = PathMNISTDataset('val', transform = get_transform('path', 'test'))

    train_class_idx = build_class_index(train_dataset)
    val_class_idx = build_class_index(val_dataset)

    train_loader = EpisodeLoader(train_dataset, train_class_idx, CONFIG['base_classes'], CONFIG['n_way'], CONFIG['k_shot'], CONFIG['q_query'], CONFIG['episodes_per_epoch'], device)

    model = EmbeddingGenerator('resnet18', 128)
    model.freeze_backbone()

    optimizer = torch.optim.Adam(model.projection.parameters(), lr=CONFIG['lr_head'])

    with mlflow.start_run(run_name = f"{CONFIG['backbone']}_baseline"):
        mlflow.log_params(CONFIG)

        best_val_accuracy = 0.0

        for epoch in range(CONFIG['n_epochs']):
            if epoch == CONFIG['unfreeze_epoch']:
                model.unfreeze_last_block()
                optimizer.add_param_group({
                    'params': [p for p in model.backbone.parameters() if p.requires_grad],
                    'lr': CONFIG['lr_backbone']
                    })
                print(f"epoch {epoch}: unfroze last block of backbone {CONFIG['backbone']}")

            model.train()

            epoch_losses, epoch_accuracies = [], []

            for support, query, labels in tqdm(train_loader, desc = f"epoch {epoch + 1}"):
                optimizer.zero_grad()

                loss, accuracy, _ = prototypical_loss(model, support, query, labels, CONFIG['n_way'], CONFIG['k_shot'])

                loss.backward()

                nn.utils.clip_grad_norm_(model.parameters(), CONFIG['grad_clip'])

                optimizer.step()

                epoch_losses.append(loss.item())
                epoch_accuracies.append(accuracy)

            train_loss = sum(epoch_losses) / len(epoch_losses)
            train_accuracy = sum(epoch_accuracies) / len(epoch_accuracies)

            val_accuracy, val_conf_int = evaluate(model, val_dataset, val_class_idx, CONFIG['base_classes'], CONFIG['n_way'], CONFIG['k_shot'], CONFIG['q_query'], CONFIG['val_episodes'], device)

            print(f"-- epoch {epoch + 1}/{CONFIG['n_epochs']} --")
            print(f"training loss: {train_loss}, training accuracy: {train_accuracy}, validation accuracy: {val_accuracy} +- {val_conf_int:.4f}")

            mlflow.log_metric('train_loss', train_loss, step = epoch)
            mlflow.log_metric('train_accuracy', train_accuracy, step = epoch)
            mlflow.log_metric('val_accuracy', val_accuracy, step = epoch)
            mlflow.log_metric('val_confidence_interval', val_conf_int, step = epoch)

            if val_accuracy > best_val_accuracy:
                best_val_accuracy = val_accuracy
                torch.save(model.state_dict(), CONFIG['model_save_path'])
                print(f"saved best model with val accuracy: {val_accuracy:.4f}")


def evaluate_test():
    print("test evaluation started")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("testing on device: ", device)

    model = EmbeddingGenerator('resnet18', 128).to(device)

    with mlflow.start_run(run_name = f"{CONFIG['backbone']}_baseline_test"):
        test_dataset = PathMNISTDataset(split = 'test', transform = get_transform('path', 'test'))
        test_class_idx = build_class_index(dataset = test_dataset)
        model.load_state_dict(torch.load(CONFIG['model_save_path']))

        test_acc_5shot, test_ci_5shot = evaluate(model, test_dataset, test_class_idx, CONFIG['novel_classes'], 3, 5, 15, 600, device)

        test_acc_1shot, test_ci_1shot = evaluate(model, test_dataset, test_class_idx, CONFIG['novel_classes'], 3, 1, 15, 600, device)

        print("\n---- final results ---")
        print(f"3-way 5-shot: accuracy = {test_acc_5shot:.4f} +- {test_ci_5shot:.4f}")
        print(f"3-way 1-shot: accuracy = {test_acc_1shot:.4f} +- {test_ci_1shot:.4f}")

        mlflow.log_metric('test_acc_3way_5shot', test_acc_5shot)
        mlflow.log_metric('test_ci_3way_5shot', test_ci_5shot)
        mlflow.log_metric('test_acc_3way_1shot', test_acc_1shot)
        mlflow.log_metric('test_ci_3way_1shot', test_ci_1shot)


if __name__ == '__main__':
    train()
    evaluate_test()