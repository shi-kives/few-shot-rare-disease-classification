import numpy as np
import torch
from src.data.episodic_sampler import sample_episode
from src.models.proto_net import compute_prototypes

class ConformalPredictor:
    
    def __init__(self, alpha: float = 0.10):
        self.alpha     = alpha
        self.threshold = None
    
    def calibrate(self, model, dataset, class_index, available_classes, n_episodes = 300, n_way= 5, k_shot = 5, q_query = 15, device = None):
        
        if device is None:
            device = next(model.parameters()).device
        
        model.eval()
        nonconformity_scores = []
        
        with torch.no_grad():
            for _ in range(n_episodes):
                support, query, labels = sample_episode(
                    dataset, class_index, available_classes,
                    n_way, k_shot, q_query, device
                )
                
                C, H, W = support.shape[2:]
                sup_emb    = model(support.view(n_way * k_shot, C, H, W))
                prototypes = compute_prototypes(sup_emb, n_way, k_shot)
                qry_emb    = model(query)
                
                dists = torch.cdist(qry_emb, prototypes, p=2)
                probs = torch.softmax(-dists, dim=1).cpu().numpy()
                
                for i, true_label in enumerate(labels.cpu().numpy()):
                    score = 1.0 - float(probs[i, true_label])
                    nonconformity_scores.append(score)
        
        n         = len(nonconformity_scores)
        level     = np.ceil((n + 1) * (1 - self.alpha)) / n
        level     = min(level, 1.0)   # cap at 1.0
        self.threshold = float(np.quantile(nonconformity_scores, level))
        
        print(f"conformal threshold (alpha={self.alpha}): {self.threshold:.4f}")
        print(f"calibrated on {n} query images from {n_episodes} episodes")
        
        model.train()
        return self.threshold
    
    def predict_set(self, probs_array, class_names) -> list:
       
        if self.threshold is None:
            raise RuntimeError("Calibrate before predicting. Call predictor.calibrate() first.")
        
        prediction_set = []
        for i, class_name in enumerate(class_names):
            score = 1.0 - float(probs_array[i])
            if score <= self.threshold:
                prediction_set.append(class_name)
        
        if not prediction_set:
            prediction_set = [class_names[int(np.argmax(probs_array))]]
        
        return prediction_set
    
    def evaluate_coverage(self, model, dataset, class_index, available_classes, n_episodes = 600,n_way = 5, k_shot = 5, q_query = 15, device = None) -> dict:

        if self.threshold is None:
            raise RuntimeError("Calibrate first.")
        
        if device is None:
            device = next(model.parameters()).device
        
        model.eval()
        covered   = []
        set_sizes = []
        
        with torch.no_grad():
            for _ in range(n_episodes):
                support, query, labels = sample_episode(
                    dataset, class_index, available_classes,
                    n_way, k_shot, q_query, device
                )
                
                C, H, W = support.shape[2:]
                sup_emb    = model(support.view(n_way * k_shot, C, H, W))
                prototypes = compute_prototypes(sup_emb, n_way, k_shot)
                qry_emb    = model(query)
                
                dists      = torch.cdist(qry_emb, prototypes, p=2)
                probs      = torch.softmax(-dists, dim=1).cpu().numpy()
                
                ep_class_names = [str(i) for i in range(n_way)]
                
                for i, true_label in enumerate(labels.cpu().numpy()):
                    pred_set  = self.predict_set(probs[i], ep_class_names)
                    is_covered = str(true_label) in pred_set
                    covered.append(float(is_covered))
                    set_sizes.append(len(pred_set))
        
        empirical_coverage = float(np.mean(covered))
        mean_set_size      = float(np.mean(set_sizes))
        
        print(f"empirical coverage: {empirical_coverage:.4f} "
              f"(target: {1-self.alpha:.4f})")
        print(f"mean prediction set size: {mean_set_size:.2f} "
              f"(out of {n_way} classes)")
        
        model.train()
        return {
            'empirical_coverage': empirical_coverage,
            'nominal_coverage':   1.0 - self.alpha,
            'mean_set_size':      mean_set_size,
            'calibration_gap':    abs(empirical_coverage - (1.0 - self.alpha))
        }
    
    def save(self, path: str):
        import json
        with open(path, 'w') as f:
            json.dump({'alpha': self.alpha, 'threshold': self.threshold}, f)
        print(f"conformal predictor saved to {path}")
    
    @classmethod
    def load(cls, path: str):
        import json
        with open(path) as f:
            data = json.load(f)
        predictor           = cls(alpha=data['alpha'])
        predictor.threshold = data['threshold']
        print(f"loaded conformal predictor: alpha={predictor.alpha}, threshold={predictor.threshold:.4f}")
        return predictor