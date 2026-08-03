import numpy as np
import torch
from collections import Counter

def prototype_classification(query_emb_np, proto_collection):
    n_classes = proto_collection.count()
    results = proto_collection.query(query_embeddings = [query_emb_np.tolist()], n_results = n_classes, include = ['documents', 'distances', 'metadatas'])

    class_names = results['documents'][0]
    distances = np.array(results['distances'][0])

    neg_distances = -distances
    neg_distances -= neg_distances.max()
    exp_vals = np.exp(neg_distances)
    scores = exp_vals / exp_vals.sum()

    best_idx = int(np.argmax(scores))
    predicted_class = class_names[best_idx]
    confidence = float(scores[best_idx])

    all_class_scores = { class_names[i]: float(scores[i]) for i in range(len(class_names)) }

    all_class_scores = dict(sorted(all_class_scores.items(), key = lambda x: x[1], reverse = True))

    sorted_scores = np.sort(scores)[::-1]
    margin = float(sorted_scores[0] - sorted_scores[1])

    return {
        'predicted_class': predicted_class,
        'confidence': confidence,
        'all_class_scores': all_class_scores,
        'min_distance': float(distances.min()),
        'margin': margin,
        'raw_distances': {class_names[i]: float(distances[i]) for i in range(len(class_names))}
    }

def retrieve_similar(query_emb_np, support_collection, n_results = 5):
    results = support_collection.query(query_embeddings = [query_emb_np.tolist()], n_results = min(n_results, support_collection.count()), include = ['documents', 'distances', 'metadatas'])

    class_names = results['documents'][0]
    distances = results['distances'][0]
    metadatas = results['metadatas'][0]

    similar_cases = []
    for i in range(len(class_names)):
        similarity = 1.0 / (1.0 + distances[i])
        similar_cases.append({
            'class': class_names[i],
            'similarity': float(similarity),
            'distance': float(distances[i]),
            'image_path': metadatas[i].get('image_path', ''),
            'dataset': metadatas[i].get('dataset', ''),
            'filename': metadatas[i].get('filename', '')
        })

    return similar_cases

def hybrid_decision(proto_result, retrieval_results):
    if not retrieval_results:
        return {
            'final_prediction': proto_result['predicted_class'],
            'agrees': True,
            'retrieval_majority': proto_result['predicted_class'],
            'agreement_count': 0,
            'n_retrieved': 0
        }

    retrieved_classes = [r['class'] for r in retrieval_results]
    class_counts = Counter(retrieved_classes)
    retrieval_majority = class_counts.most_common(1)[0][0]

    predicted = proto_result['predicted_class']
    agrees = predicted == retrieval_majority

    agreement_count = sum(1 for c in retrieved_classes if c == predicted)

    return {
        'final_prediction': predicted,
        'agrees': agrees,
        'retrieval_majority': retrieval_majority,
        'agreement_count': agreement_count,
        'n_retrieved': len(retrieval_results)
    }


def run_inference(query_emb_np, proto_collection, support_collection, n_similar = 5):
    proto_result = prototype_classification(query_emb_np, proto_collection)
    retrieval_results = retrieve_similar(query_emb_np, support_collection, n_similar)
    decision = hybrid_decision(proto_result, retrieval_results)

    return {
        'prediction': decision['final_prediction'],
        'confidence': proto_result['confidence'],
        'all_class_scores': proto_result['all_class_scores'],
        'similar_cases': retrieval_results,
        'agrees': decision['agrees'],
        'retrieval_majority': decision['retrieval_majority'],
        'agreement_count': decision['agreement_count'],
        'margin': proto_result['margin'],
        'min_distance': proto_result['min_distance']
    }