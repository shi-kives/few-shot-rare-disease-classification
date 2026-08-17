import os
import sys
import torch
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.uncertainity.confidence import (compute_margin, distance_flag, compute_retrieval_agreement, overall_uncertainity)


def test_compute_margin():
    print("\n1 === compute_margin")

    scores_confident = {'class_0': 0.90, 'class_1': 0.07, 'class_2': 0.03}
    margin = compute_margin(scores_confident)
    assert abs(margin - 0.83) < 1e-4, f"expected 0.83, got {margin}"
    assert margin > 0.5
    print(f"high confidence margin: {margin:.4f}")

    scores_uncertain = {'class_0': 0.36, 'class_1': 0.34, 'class_2': 0.30}
    margin = compute_margin(scores_uncertain)
    assert margin < 0.10, f"expected < 0.10, got {margin}"
    print(f"low confidence margin: {margin:.4f}")

    scores_single = {'class_0': 1.0}
    margin = compute_margin(scores_single)
    assert margin == 1.0
    print(f"single class margin: {margin:.4f}")

    print("all tests passed!")



def test_compute_distance_flag():
    print("\n2 === compute_distance_flag")

    threshold = 3.0

    flag = distance_flag(min_distance=1.5, threshold=threshold)
    assert flag == False, f"expected False for distance < threshold"
    print(f"distance 1.5 < threshold 3.0: flag={flag}")

    flag = distance_flag(min_distance=3.0, threshold=threshold)
    assert flag == False
    print(f"distance == threshold: flag={flag}")

    flag = distance_flag(min_distance=5.2, threshold=threshold)
    assert flag == True, f"expected True for distance > threshold"
    print(f"distance 5.2 > threshold 3.0: flag={flag}")

    print("all tests passed!")


def test_compute_retrieval_agreement():
    print("\n3 === compute_retrieval_agreement")

    cases_full = [
        {'class': 'class_0', 'similarity': 0.9},
        {'class': 'class_0', 'similarity': 0.8},
        {'class': 'class_0', 'similarity': 0.7},
        {'class': 'class_0', 'similarity': 0.6},
        {'class': 'class_0', 'similarity': 0.5},
    ]
    agreement = compute_retrieval_agreement('class_0', cases_full)
    assert agreement == 1.0, f"expected 1.0, got {agreement}"
    print(f"full agreement: {agreement:.2f}")

    cases_partial = [
        {'class': 'class_0', 'similarity': 0.9},
        {'class': 'class_0', 'similarity': 0.8},
        {'class': 'class_1', 'similarity': 0.7},
        {'class': 'class_1', 'similarity': 0.6},
        {'class': 'class_2', 'similarity': 0.5},
    ]
    agreement = compute_retrieval_agreement('class_0', cases_partial)
    assert abs(agreement - 0.4) < 1e-6, f"expected 0.4, got {agreement}"
    print(f"partial agreement (2/5): {agreement:.2f}")

    cases_none = [
        {'class': 'class_1', 'similarity': 0.9},
        {'class': 'class_2', 'similarity': 0.8},
    ]
    agreement = compute_retrieval_agreement('class_0', cases_none)
    assert agreement == 0.0
    print(f"no agreement: {agreement:.2f}")

    agreement = compute_retrieval_agreement('class_0', [])
    assert agreement == 0.0
    print(f"empty retrieval: {agreement:.2f}")

    print("all tests passed!")


def test_aggregate_uncertainty():
    print("\n4 === aggregate_uncertainty")

    result = overall_uncertainity(
        confidence=0.92,
        margin=0.85,
        distance_flag=False,
        retrieval_agreement=0.8,
        agrees=True
    )
    assert result['level'] == 'HIGH', f"Expected HIGH, got {result['level']}"
    assert result['score'] == 0
    print(f"all strong signals → HIGH (score={result['score']})")

    result = overall_uncertainity(
        confidence=0.92,
        margin=0.85,
        distance_flag=False,
        retrieval_agreement=0.8,
        agrees=False
    )
    assert result['level'] == 'MEDIUM', f"expected MEDIUM, got {result['level']}"
    assert result['score'] == 1
    assert len(result['reasons']) == 1
    print(f"one weak signal → MEDIUM (reason: {result['reasons'][0]})")

    result = overall_uncertainity(
        confidence=0.35,
        margin=0.08,   
        distance_flag=True, 
        retrieval_agreement=0.2,
        agrees=False
    )
    assert result['level'] == 'LOW', f"expected LOW, got {result['level']}"
    assert result['score'] >= 2
    print(f"multiple weak signals → LOW (score={result['score']}, {len(result['reasons'])} reasons)")

    assert len(result['reasons']) > 0, "should have reasons for LOW confidence"
    for reason in result['reasons']:
        assert isinstance(reason, str), "each reason should be a string"

    print("all tests passed!")


def test_mc_dropout():
    print("\n5 === MC Dropout")

    ckpt = 'models/best_model_efficientnet_b3.pth'
    if not os.path.exists(ckpt):
        print(f"SKIPPED — checkpoint not found: {ckpt}")
        return

    from src.uncertainity.mc_dropout import mc_predict, enable_dropout
    from src.models.embedding_generator import EmbeddingGenerator

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model  = EmbeddingGenerator('efficientnet_b3', 128).to(device)
    model.load_state_dict(torch.load(ckpt, map_location=device))

    dummy_image = torch.randn(1, 3, 224, 224).to(device)

    result = mc_predict(model, dummy_image, n_runs=10, device=device)

    assert 'mean_embedding'  in result
    assert 'variance'        in result
    assert 'epistemic_uncertain' in result

    assert result['mean_embedding'].shape == (128,), f"expected (128,), got {result['mean_embedding'].shape}"
    assert result['variance'] >= 0.0, "variance must be non negative"
    assert isinstance(result['epistemic_uncertain'], bool)

    assert result['variance'] > 0.0, "variance is 0 — dropout may not be firing. Check enable_dropout()."

    model.eval()
    embs = []
    with torch.no_grad():
        for _ in range(5):
            emb = model(dummy_image)
            embs.append(emb.squeeze().cpu().numpy())
    deterministic_var = float(np.var(np.stack(embs), axis=0).mean())
    assert deterministic_var < 1e-8, \
        f"deterministic variance should be ~0, got {deterministic_var}"

    print(f"mean_embedding shape: {result['mean_embedding'].shape}")
    print(f"MC variance (10 runs): {result['variance']:.6f}")
    print(f"deterministic variance: {deterministic_var:.10f}")
    print(f"epistemic_uncertain: {result['epistemic_uncertain']}")
    print("all tests passed!")


def test_conformal_predictor():

    print("\n6 === Conformal Predictor")

    from src.uncertainity.conformal import ConformalPredictor
    from src.data.datasets import PathMNISTDataset, build_class_index
    from src.models.embedding_generator import EmbeddingGenerator
    from src.data.augmentations import get_transform

    device   = torch.device('cpu')
    model    = EmbeddingGenerator('efficientnet_b3', 128)
    model.load_state_dict(torch.load('models/best_model_efficientnet_b3.pth'))

    val_ds  = PathMNISTDataset('val', transform=get_transform('path', 'test'))
    val_idx = build_class_index(val_ds)

    predictor = ConformalPredictor(alpha=0.10)
    predictor.calibrate(
        model, val_ds, val_idx,
        available_classes=[1,2,3,5,7,8],
        n_episodes=50,
        device=device
    )

    assert predictor.threshold is not None
    dummy_probs = np.array([0.7, 0.2, 0.1])
    pred_set    = predictor.predict_set(dummy_probs, ['class_0', 'class_1', 'class_2'])
    assert len(pred_set) >= 1
    assert 'class_0' in pred_set

    print(f"threshold: {predictor.threshold:.4f}")
    print(f"prediction set for [0.7, 0.2, 0.1]: {pred_set}")
    print("all tests passed!")


def test_conformal_logic_only():
    print("\n6B === Conformal logic only (fast)")

    from src.uncertainity.conformal import ConformalPredictor

    predictor           = ConformalPredictor(alpha=0.10)
    predictor.threshold = 0.30 

    class_names = ['class_0', 'class_1', 'class_2', 'class_3']

    probs_confident = np.array([0.85, 0.10, 0.03, 0.02])
    pred_set        = predictor.predict_set(probs_confident, class_names)
    assert 'class_0' in pred_set
    print(f"high confidence set: {pred_set}")

    probs_uncertain = np.array([0.30, 0.28, 0.25, 0.17])
    pred_set        = predictor.predict_set(probs_uncertain, class_names)
    assert len(pred_set) >= 2
    assert 'class_0' in pred_set
    print(f"uncertain set (should be large): {pred_set}")

    import tempfile, os
    tmp = tempfile.mktemp(suffix='.json')
    predictor.save(tmp)
    loaded = ConformalPredictor.load(tmp)
    assert loaded.threshold == predictor.threshold
    assert loaded.alpha     == predictor.alpha
    os.remove(tmp)
    print(f"save/load roundtrip works")

    print("all tests passed!")


if __name__ == '__main__':
    print("=" * 60)
    print("UNCERTAINTY MODULE TESTS")
    print("=" * 60)

    tests = [
        test_compute_margin,
        test_compute_distance_flag,
        test_compute_retrieval_agreement,
        test_aggregate_uncertainty,
        test_mc_dropout,
        #test_conformal_logic_only,
        #test_conformal_predictor,
    ]

    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"  FAILED: {e}")
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
