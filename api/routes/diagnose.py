import logging
from typing import Optional
import torch
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from api.schemas.models import DiagnoseResponse, GatesStatus, SimilarCase
from api.utils import embed_image, preprocess_image
from src.retrieval.retriever import run_inference

logger = logging.getLogger("uvicorn")
router = APIRouter(tags=["diagnose"])


def to_static_url(file_path: str) -> str:
    if not file_path:
        return ""
    p = file_path.replace("\\", "/")
    if p.startswith("http://") or p.startswith("https://") or p.startswith("data:"):
        return p
    if "support_images/" in p:
        rel = p.split("support_images/", 1)[1]
        return f"/static/{rel}"
    if p.startswith("/static/"):
        return p
    if p.startswith("/"):
        return f"/static{p}"
    return f"/static/{p}"


@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(
    request: Request,
    file: UploadFile = File(...),
    modality: Optional[str] = Form("Auto-detect"),
):
    """
    Diagnose an uploaded medical image using few-shot prototype retrieval.
    """
    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image uploaded.")

        app_state = request.app.state
        device = getattr(app_state, "device", torch.device("cpu"))
        model = getattr(app_state, "model", None)
        model_loaded = getattr(app_state, "model_loaded", False)

        proto_col = getattr(app_state, "prototypes_collection", None)
        support_col = getattr(app_state, "support_images_collection", None)

        # 1. Compute Embedding
        if model_loaded and model is not None:
            tensor = preprocess_image(image_bytes)
            emb_np = embed_image(tensor, model, device)
        else:
            logger.warning("Embedding model not loaded.")
            raise HTTPException(status_code = 503, detail="Model unavailable.")
            

        effective_modality = (
            "Histopathology" if (not modality or modality == "Auto-detect") else modality
        )

        # 2. Run Retrieval & Inference against ChromaDB
        if proto_col is not None and support_col is not None and proto_col.count() > 0:
            inf = run_inference(
                query_emb_np=emb_np,
                proto_collection=proto_col,
                support_collection=support_col,
                n_similar=5,
            )

            prediction = inf["prediction"]
            confidence = float(inf["confidence"])
            all_scores = {k: float(v) for k, v in inf["all_class_scores"].items()}
            agrees = bool(inf.get("agrees"))
            margin = float(inf.get("margin"))
            min_dist = float(inf.get("min_distance"))

            similar_cases = []
            for item in inf.get("similar_cases", []):
                raw_path = item.get("image_path", "")
                url_path = to_static_url(raw_path)

                similar_cases.append(
                    SimilarCase(
                        id=item.get("filename", item.get("class")),
                        image_path=url_path,
                        similarity_score=float(item.get("similarity")),
                        class_name=item.get("class", prediction),
                        dataset=item.get("dataset", "PathMNIST (Histopathology)"),
                        modality=effective_modality,
                        confirmed=True,
                    )
                )

            conf_level = "HIGH" if confidence >= 0.80 else ("MEDIUM" if confidence >= 0.55 else "LOW")

            gates = GatesStatus(
                similarity_threshold_passed=confidence >= 0.50,
                prototype_dispersion_passed=margin >= 0.03,
                ood_status_passed=min_dist <= 3.0,
            )

            return DiagnoseResponse(
                prediction=prediction,
                confidence_level=conf_level,
                confidence=confidence,
                agrees=agrees,
                modality=effective_modality,
                embedding=emb_np.tolist(),
                gates=gates,
                similar_cases=similar_cases,
                all_class_scores=all_scores,
            )

        # 3. Default fallback if ChromaDB is not yet populated
        logger.info("ChromaDB index is currently empty.")
        raise HTTPException(status_code=503, detail="ChromaDB index is unavailable.")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error during diagnose inference: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")