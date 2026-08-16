import os
import torch
import numpy as np

from src.models.embedding_generator import EmbeddingGenerator
from src.continual.ewc import ewc_penalty
from src.continual.replay_buffer import ReplayBuffer

CHECKPOINT = 'models/best_model_efficientnet_b3.pth'
FISHER_PATH = 'models/fisher_diagonal.pt'
ANCHOR_PATH = 'models/anchor_weights.pt'
REPLAY_PATH = 'models/replay_buffer.pt'


def load_real_model():
    assert os.path.exists(CHECKPOINT), f"checkpoint not found: {CHECKPOINT}"
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = EmbeddingGenerator('efficientnet_b3', 128)
    model.load_state_dict(torch.load(CHECKPOINT, map_location=device))
    model = model.to(device)
    model.eval()
    return model, device


def load_ewc_artifacts(device):
    assert os.path.exists(FISHER_PATH), f"Fisher not found: {FISHER_PATH}"
    assert os.path.exists(ANCHOR_PATH), f"anchor weights not found: {ANCHOR_PATH}"
    fisher = torch.load(FISHER_PATH, map_location=device)
    anchor_weights = torch.load(ANCHOR_PATH, map_location=device)
    return fisher, anchor_weights


def test_fisher_artifacts():
    print("\n1 === Fisher artifacts")

    model, device = load_real_model()
    fisher, anchor_weights = load_ewc_artifacts(device)
    model_params = {name: param for name, param in model.named_parameters() if param.requires_grad}

    assert len(fisher) > 0
    assert set(fisher.keys()) == set(model_params.keys())
    assert set(anchor_weights.keys()) == set(model_params.keys())

    all_values = []

    for name, param in model_params.items():
        assert fisher[name].shape == param.shape, f"Fisher shape mismatch: {name}"
        assert anchor_weights[name].shape == param.shape, f"Anchor shape mismatch: {name}"
        assert torch.isfinite(fisher[name]).all(), f"Non-finite Fisher values: {name}"
        assert (fisher[name] >= 0).all(), f"Negative Fisher values: {name}"
        all_values.append(fisher[name].detach().flatten())

    values = torch.cat(all_values)

    assert torch.isfinite(values).all()
    assert (values > 0).any(), "Fisher contains no non-zero values"

    print(f"Fisher parameters: {len(fisher)}")
    print(f"Fisher mean: {values.mean().item():.8f}")
    print(f"Fisher max: {values.max().item():.8f}")
    print(f"Fisher non-zero fraction: {(values > 0).float().mean().item():.6f}")
    print("all tests passed!")


def test_ewc_penalty_at_anchor():
    print("\n2 === EWC penalty at anchor")

    model, device = load_real_model()
    fisher, anchor_weights = load_ewc_artifacts(device)

    penalty = ewc_penalty(model, anchor_weights, fisher, lambda_ewc=5000)

    assert torch.isfinite(penalty)
    assert penalty.item() < 1e-6, f"Expected penalty near zero, got {penalty.item():.8f}"

    print(f"EWC penalty at anchor: {penalty.item():.8f}")
    print("all tests passed!")


def test_ewc_penalty_response():
    print("\n3 === EWC penalty response")

    model, device = load_real_model()
    fisher, anchor_weights = load_ewc_artifacts(device)

    penalty_before = ewc_penalty(model, anchor_weights, fisher, lambda_ewc=5000)

    with torch.no_grad():
        for param in model.parameters():
            if param.requires_grad:
                param.add_(torch.randn_like(param) * 0.001)

    penalty_after = ewc_penalty(model, anchor_weights, fisher, lambda_ewc=5000)

    assert torch.isfinite(penalty_after)
    assert penalty_after.item() > penalty_before.item(), "EWC penalty did not increase after parameter perturbation"

    penalty_large_lambda = ewc_penalty(model, anchor_weights, fisher, lambda_ewc=50000)

    assert penalty_large_lambda.item() > penalty_after.item(), "Larger lambda did not increase EWC penalty"

    print(f"penalty at anchor: {penalty_before.item():.8f}")
    print(f"penalty after perturbation: {penalty_after.item():.8f}")
    print(f"penalty with lambda=50000: {penalty_large_lambda.item():.8f}")
    print("all tests passed!")


def test_replay_buffer():
    print("\n4 === Replay Buffer")

    model, device = load_real_model()
    buffer = ReplayBuffer(k_per_class=5)

    images_a = torch.randn(10, 3, 224, 224)
    images_b = torch.randn(8, 3, 224, 224)

    buffer.add_class('class_a', images_a, model, device, label=0)
    buffer.add_class('class_b', images_b, model, device, label=1)

    assert len(buffer) == 2
    assert 'class_a' in buffer
    assert 'class_b' in buffer
    assert buffer.buffer['class_a']['images'].shape[0] == 5
    assert buffer.buffer['class_b']['images'].shape[0] == 5

    images, labels = buffer.sample_batch(n_per_class=2)

    assert images is not None
    assert labels is not None
    assert images.shape[0] == 4
    assert len(labels) == 4
    assert labels.count(0) == 2
    assert labels.count(1) == 2

    print(f"classes: {buffer.get_all_classes()}")
    print(f"sampled batch: {images.shape}")
    print(f"labels: {labels}")
    print("all tests passed!")


def test_replay_buffer_save_load():
    print("\n5 === Replay Buffer save/load")

    import tempfile

    model, device = load_real_model()
    buffer = ReplayBuffer(k_per_class=3)

    images = torch.randn(8, 3, 224, 224)
    buffer.add_class('class_a', images, model, device, label=0)

    with tempfile.NamedTemporaryFile(suffix='.pt', delete=False) as tmp:
        path = tmp.name

    try:
        buffer.save(path)
        loaded = ReplayBuffer.load(path)

        assert loaded.k_per_class == buffer.k_per_class
        assert loaded.get_all_classes() == buffer.get_all_classes()
        assert loaded.buffer['class_a']['label'] == 0
        assert torch.equal(loaded.buffer['class_a']['images'], buffer.buffer['class_a']['images'])

        print("save/load roundtrip works")
        print("all tests passed!")
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_replay_buffer_empty():
    print("\n6 === Empty Replay Buffer")

    buffer = ReplayBuffer(k_per_class=5)

    assert len(buffer) == 0
    assert buffer.get_all_classes() == []

    images, labels = buffer.sample_batch(n_per_class=2)

    assert images is None
    assert labels is None

    print("empty buffer handled correctly")
    print("all tests passed!")


if __name__ == '__main__':
    print("=" * 60)
    print("CONTINUAL LEARNING MODULE TESTS")
    print("=" * 60)

    tests = [
        test_fisher_artifacts,
        test_ewc_penalty_at_anchor,
        test_ewc_penalty_response,
        test_replay_buffer,
        test_replay_buffer_save_load,
        test_replay_buffer_empty
    ]

    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"  FAILED: {e}")
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
