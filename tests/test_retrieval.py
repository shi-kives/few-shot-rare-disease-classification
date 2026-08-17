import os
import sys
import gc
import random
import time
import tempfile
import shutil

import torch
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from src.models.embedding_generator import EmbeddingGenerator
from src.data.augmentations import get_transform
from src.retrieval.retriever import prototype_classification, retrieve_similar, hybrid_decision, run_inference

SEED = 42
CKPT_PATH = os.path.join(PROJECT_ROOT, 'models', 'best_model_efficientnet_b3.pth')
CHROMA_PATH = os.path.join(PROJECT_ROOT, 'chroma_store')


def set_seed(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_model(backbone='efficientnet_b3', device=None):
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    model = EmbeddingGenerator(backbone, embed_dim=128)
    ckpt_path = os.path.join(PROJECT_ROOT, 'models', f'best_model_{backbone}.pth')

    if os.path.exists(ckpt_path):
        model.load_state_dict(torch.load(ckpt_path, map_location=device))
        print(f"Loaded checkpoint: {ckpt_path}")
    else:
        print(f"WARNING: no checkpoint at {ckpt_path} — using random weights")

    model = model.to(device)
    model.eval()
    return model, device


def get_random_embedding(dim=128, seed=SEED):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(dim).astype(np.float32)


def build_test_chroma(tmp_dir, n_classes=5, n_support=10, dim=128, seed=SEED):
    import chromadb

    rng = np.random.default_rng(seed)
    client = chromadb.PersistentClient(path=tmp_dir)
    proto_col = client.get_or_create_collection('prototypes', metadata={'hnsw:space': 'l2'})
    support_col = client.get_or_create_collection('support_images', metadata={'hnsw:space': 'l2'})
    class_names = [f'class_{i}' for i in range(n_classes)]

    for cls in class_names:
        embeddings = rng.standard_normal((n_support, dim)).astype(np.float32)
        prototype = embeddings.mean(axis=0)

        proto_col.add(embeddings=[prototype.tolist()], documents=[cls], ids=[f'proto_test_{cls}'], metadatas=[{'class': cls, 'dataset': 'test', 'n_support': n_support}])

        for i, emb in enumerate(embeddings):
            support_col.add(embeddings=[emb.tolist()], documents=[cls], ids=[f'support_test_{cls}_{i}'], metadatas=[{'class': cls, 'image_path': f'/fake/path/{cls}_{i}.png', 'dataset': 'test', 'index': i}])

    return client, proto_col, support_col, class_names


def cleanup_chroma(client=None, proto_col=None, support_col=None, tmp_dir=None):
    del proto_col
    del support_col
    del client
    gc.collect()

    if tmp_dir is None:
        return

    for _ in range(10):
        try:
            shutil.rmtree(tmp_dir)
            return
        except PermissionError:
            gc.collect()
            time.sleep(0.2)

    shutil.rmtree(tmp_dir)


def test_chroma_index_integrity():
    print("\n1 === ChromaDB index integrity")
    tmp_dir = tempfile.mkdtemp()
    client = proto_coll = support_coll = None

    try:
        client, proto_coll, support_coll, class_names = build_test_chroma(tmp_dir, n_classes=5, n_support=10, seed=SEED)

        assert proto_coll.count() == 5, f"expected 5 prototypes, got {proto_coll.count()}"
        assert support_coll.count() == 50, f"expected 50 support images, got {support_coll.count()}"

        result = proto_coll.get(ids=['proto_test_class_0'], include=['embeddings', 'metadatas'])

        assert len(result['embeddings']) == 1
        assert len(result['embeddings'][0]) == 128
        assert result['metadatas'][0]['class'] == 'class_0'

        print("prototype count correct!")
        print("support image count correct!")
        print("prototype retrieval by ID works!")
        print("all tests passed")
    finally:
        cleanup_chroma(client, proto_coll, support_coll, tmp_dir)


def test_classify_by_prototype():
    print("\n2 === classify_by_prototype")
    tmp_dir = tempfile.mkdtemp()
    client = proto_col = support_col = None

    try:
        client, proto_col, support_col, class_names = build_test_chroma(tmp_dir, seed=SEED)

        result = proto_col.get(ids=['proto_test_class_2'], include=['embeddings'])
        known_emb = np.array(result['embeddings'][0], dtype=np.float32)
        rng = np.random.default_rng(SEED)
        query_emb = known_emb + rng.standard_normal(128).astype(np.float32) * 0.001
        output = prototype_classification(query_emb, proto_col)

        assert 'predicted_class' in output
        assert 'confidence' in output
        assert 'all_class_scores' in output
        assert 'min_distance' in output
        assert 'margin' in output
        assert 0.0 <= output['confidence'] <= 1.0

        score_sum = sum(output['all_class_scores'].values())
        assert abs(score_sum - 1.0) < 1e-4, f"class scores sum to {score_sum}, expected ~1.0"
        assert output['predicted_class'] == 'class_2', f"expected class_2, got {output['predicted_class']}"

        print(f"predicted_class: {output['predicted_class']}")
        print(f"confidence: {output['confidence']:.4f}")
        print(f"margin: {output['margin']:.4f}")
        print(f"score sum: {score_sum:.6f}")
        print("all tests passed!")
    finally:
        cleanup_chroma(client, proto_col, support_col, tmp_dir)


def test_retrieve_similar():
    print("\n3 === retrieve_similar")
    tmp_dir = tempfile.mkdtemp()
    client = proto_coll = support_coll = None

    try:
        client, proto_coll, support_coll, class_names = build_test_chroma(tmp_dir, n_classes=5, n_support=10, seed=SEED)

        result = proto_coll.get(ids=['proto_test_class_3'], include=['embeddings'])
        query_emb = np.array(result['embeddings'][0], dtype=np.float32)
        similar = retrieve_similar(query_emb, support_coll, n_results=5)

        assert len(similar) == 5, f"expected 5 results, got {len(similar)}"

        for case in similar:
            assert 'class' in case
            assert 'similarity' in case
            assert 'distance' in case
            assert 'image_path' in case
            assert 0.0 <= case['similarity'] <= 1.0, f"similarity {case['similarity']} not in [0,1]"

        sims = [c['similarity'] for c in similar]
        assert sims == sorted(sims, reverse=True), "results not sorted by similarity descending"

        classes = [c['class'] for c in similar]
        majority = max(set(classes), key=classes.count)
        assert majority == 'class_3', f"expected majority class_3, got {majority}"

        print(f"returned {len(similar)} results")
        print("similarities sorted descending")
        print(f"majority class: {majority}")
        print(f"top result: class={similar[0]['class']}, sim={similar[0]['similarity']:.4f}")
        print("all tests passed!")
    finally:
        cleanup_chroma(client, proto_coll, support_coll, tmp_dir)


def test_hybrid_decision():
    print("\n4 === hybrid_decision")

    proto_result_agree = {
        'predicted_class': 'class_0',
        'confidence': 0.85,
        'all_class_scores': {'class_0': 0.85, 'class_1': 0.10, 'class_2': 0.05},
        'min_distance': 0.5,
        'margin': 0.75
    }

    retrieval_agree = [
        {'class': 'class_0', 'similarity': 0.9},
        {'class': 'class_0', 'similarity': 0.85},
        {'class': 'class_0', 'similarity': 0.8},
        {'class': 'class_1', 'similarity': 0.4},
        {'class': 'class_0', 'similarity': 0.3}
    ]

    decision_agree = hybrid_decision(proto_result_agree, retrieval_agree)
    assert decision_agree['agrees'] is True
    assert decision_agree['agreement_count'] == 4
    assert decision_agree['retrieval_majority'] == 'class_0'
    print("agreement case: agrees=True, majority=class_0")

    proto_result_disagree = {
        'predicted_class': 'class_0',
        'confidence': 0.45,
        'all_class_scores': {'class_0': 0.45, 'class_1': 0.40, 'class_2': 0.15},
        'min_distance': 3.5,
        'margin': 0.05
    }

    retrieval_disagree = [
        {'class': 'class_1', 'similarity': 0.7},
        {'class': 'class_1', 'similarity': 0.65},
        {'class': 'class_1', 'similarity': 0.6},
        {'class': 'class_0', 'similarity': 0.5},
        {'class': 'class_2', 'similarity': 0.3}
    ]

    decision_disagree = hybrid_decision(proto_result_disagree, retrieval_disagree)
    assert decision_disagree['agrees'] is False
    assert decision_disagree['retrieval_majority'] == 'class_1'
    assert decision_disagree['agreement_count'] == 1
    print("disagreement case: agrees=False, majority=class_1")

    decision_empty = hybrid_decision(proto_result_agree, [])
    assert decision_empty['agrees'] is True
    print("empty retrieval case handled")
    print("all tests passed!")


def test_run_inference_end_to_end():
    print("\n5 === run_inference end-to-end")
    tmp_dir = tempfile.mkdtemp()
    client = proto_coll = support_coll = None

    try:
        client, proto_coll, support_coll, class_names = build_test_chroma(tmp_dir, seed=SEED)
        query_emb = get_random_embedding(128, seed=SEED + 1)
        result = run_inference(query_emb, proto_coll, support_coll, n_similar=5)

        required_keys = ['prediction', 'confidence', 'all_class_scores', 'similar_cases', 'agrees', 'retrieval_majority', 'agreement_count', 'margin', 'min_distance']

        for key in required_keys:
            assert key in result, f"Missing key in result: {key}"

        assert result['prediction'] in class_names
        assert 0.0 <= result['confidence'] <= 1.0
        assert len(result['similar_cases']) == 5

        print("all required keys present")
        print(f"prediction: {result['prediction']}")
        print(f"confidence: {result['confidence']:.4f}")
        print(f"agrees: {result['agrees']}")
        print("all tests passed!")
    finally:
        cleanup_chroma(client, proto_coll, support_coll, tmp_dir)


def test_retrieval_precision_real_model():
    print("\n6 === Retrieval precision@K (real model)")

    ckpt = CKPT_PATH

    if not os.path.exists(ckpt):
        print(f"SKIPPED — checkpoint not found: {ckpt}")
        return

    if not os.path.exists(CHROMA_PATH):
        print(f"SKIPPED — chroma_store not found: {CHROMA_PATH}. Run index_builder.py first.")
        return

    import chromadb
    from src.data.datasets import PathMNISTDataset
    from src.training.evaluate import k_retrieval_precision
    from src.data.datasets import build_class_index

    model, device = load_model('efficientnet_b3')
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    collections = client.list_collections()
    collection_names = [collection.name for collection in collections]
    print(f"Chroma collections: {collection_names}")

    if 'support_images' not in collection_names:
        print("SKIPPED — support_images collection not found. Run index_builder.py first.")
        return

    support_coll = client.get_collection('support_images')
    support_count = support_coll.count()
    print(f"support_images count: {support_count}")

    assert support_count > 0, "support_images collection is empty"

    test_ds = PathMNISTDataset('test', transform=get_transform('path', 'test'))
    novel_cls = [0, 4, 6]
    test_idx = build_class_index(test_ds)

    test_images = []
    test_labels = []
    class_names_map = {0: 'class_0', 4: 'class_4', 6: 'class_6'}

    for cls in novel_cls:
        indices = sorted(test_idx[cls])[:10]

        for i in indices:
            tensor, _ = test_ds[i]
            test_images.append(tensor.unsqueeze(0))
            test_labels.append(class_names_map[cls])

    for k in [1, 3, 5]:
        p = k_retrieval_precision(model, test_images, test_labels, support_coll, k=k, device=device)
        print(f"retrieval precision@{k}: {p:.4f}")
        assert 0.0 <= p <= 1.0

    del support_coll
    del client
    del model
    gc.collect()

    print("all tests passed!")


if __name__ == '__main__':
    set_seed()

    print("=" * 60)
    print("retrieval module tests")
    print("=" * 60)

    tests = [
        test_chroma_index_integrity,
        test_classify_by_prototype,
        test_retrieve_similar,
        test_hybrid_decision,
        test_run_inference_end_to_end,
        test_retrieval_precision_real_model
    ]

    for test in tests:
        set_seed()

        try:
            test()
        except AssertionError as e:
            print(f"  FAILED: {e}")
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
