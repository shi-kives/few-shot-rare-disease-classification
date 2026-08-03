import numpy as np

def compute_margin(all_class_scores):
    scores = sorted(all_class_scores.values(), reverse = True)
    if len(scores) < 2:
        return 1.0
    return float(scores[0] - scores[1])

def distance_flag(min_distance, threshold):
    return min_distance > threshold

def compute_retrieval_agreement(predicted_class, similar_cases):
    if not similar_cases:
        return 0.0

    matches = sum(1 for case in similar_cases if case['class'] == predicted_class)
    return float(matches / len(similar_cases))

def overall_uncertainity(confidence, margin, distance_flag, retrieval_agreement, agrees):
    weak_signals = []

    if confidence < 0.5:
        weak_signals.append(f"low confidence: {confidence:.1%}")

    if margin < 0.2:
        weak_signals.append(f"low margin: {margin:.3f}. model is uncertain between top 2 classes.")

    if distance_flag:
        weak_signals.append("query too far from all prototypes. possibly a new class.")

    if retrieval_agreement < 0.4:
        weak_signals.append(f"mixed retrieval: {retrieval_agreement:.0%}")

    if not agrees:
        weak_signals.append("prototype and retrieval engine disagree on class prediction.")

    n_weak = len(weak_signals)

    if n_weak == 0:
        level = 'HIGH'

    elif n_weak == 1:
        level = 'MEDIUM'

    else:
        level = 'LOW'

    return {
        'level': level,
        'reasons': weak_signals,
        'score': n_weak
    }