import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional
import torch
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from api.schemas.models import AddClassResponse
from src.retrieval.add_class import add_class_pure

logger = logging.getLogger("uvicorn")
router = APIRouter(tags=["add_class"])


@router.post("/add_class", response_model=AddClassResponse)
async def add_new_class(
    request: Request,
    class_name: str = Form(...),
    description: Optional[str] = Form(None),
    modality: Optional[str] = Form("derm"),
    images: List[UploadFile] = File(...),
):
    """
    Register a novel rare disease class with support reference images.
    """
    clean_name = class_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Class name cannot be empty.")

    if not images or len(images) == 0:
        raise HTTPException(status_code=400, detail="At least one reference image is required.")

    # Normalize modality string
    modality_lower = (modality or "derm").lower()
    mod_tag = "path" if ("path" in modality_lower or "hist" in modality_lower) else "derm"
    dataset_tag = "UserDefined"

    app_state = request.app.state
    device = getattr(app_state, "device", torch.device("cpu"))
    model = getattr(app_state, "model", None)
    model_loaded = getattr(app_state, "model_loaded", False)
    proto_col = getattr(app_state, "prototypes_collection", None)
    support_col = getattr(app_state, "support_images_collection", None)
    replay_buf = getattr(app_state, "replay_buffer", None)

    # Save uploaded files into a permanent support directory
    target_root = Path("data/processed/support_images") / mod_tag
    target_dir = target_root / clean_name
    target_dir.mkdir(parents=True, exist_ok=True)

    temp_paths = []
    try:
        for idx, upload in enumerate(images):
            ext = Path(upload.filename or "image.jpg").suffix or ".jpg"
            saved_name = f"{clean_name}_{idx:04d}{ext}"
            file_dest = target_dir / saved_name

            with open(file_dest, "wb") as f:
                content = await upload.read()
                f.write(content)

            temp_paths.append(str(file_dest))

        # Check if live embedding model and collections are available
        if model_loaded and model is not None and proto_col is not None and support_col is not None:
            # Check if replay_buf has .add_class or if mock is needed
            class DummyBuffer:
                def add_class(self, *args, **kwargs):
                    pass

            buf = replay_buf if hasattr(replay_buf, "add_class") else DummyBuffer()

            result = add_class_pure(
                class_name=clean_name,
                image_paths=temp_paths,
                dataset_tag=dataset_tag,
                modality=mod_tag,
                model=model,
                proto_collection=proto_col,
                support_collection=support_col,
                replay_buffer=buf,
                save_dir=str(target_root),
                device=device,
            )

            return AddClassResponse(
                status="success",
                class_name=clean_name,
                support_images_added=len(temp_paths),
                finetuned=result.get("finetuned", False),
                message=f"Class '{clean_name}' successfully added with {len(temp_paths)} support images.",
                saved_to=str(target_dir),
            )

        logger.info(f"Class '{clean_name}' stored with {len(temp_paths)} images (standby mode).")
        return AddClassResponse(
            status="success",
            class_name=clean_name,
            support_images_added=len(temp_paths),
            finetuned=False,
            message=f"Class '{clean_name}' registered ({len(temp_paths)} reference images saved).",
            saved_to=str(target_dir),
        )

    except Exception as e:
        logger.exception(f"Failed to add class '{clean_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register class: {str(e)}")
