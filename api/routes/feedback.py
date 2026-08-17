import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request

from api.schemas.models import FeedbackRequest, FeedbackResponse

logger = logging.getLogger("uvicorn")
router = APIRouter(tags=["feedback"])

FEEDBACK_LOG_FILE = Path("data/feedback_log.jsonl")


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback_data: FeedbackRequest, request: Request):
    """
    Record clinician verification or correction for a diagnosis.
    """
    try:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "predicted_class": feedback_data.predicted_class,
            "correct_class": feedback_data.correct_class or feedback_data.predicted_class,
            "is_correct": feedback_data.is_correct,
            "notes": feedback_data.notes,
            "has_embedding": bool(feedback_data.query_embedding),
        }

        # Ensure directory exists and append record
        FEEDBACK_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(FEEDBACK_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        logger.info(
            f"Clinician feedback recorded for predicted class '{feedback_data.predicted_class}' "
            f"(Verified correct: {feedback_data.is_correct})"
        )

        return FeedbackResponse(
            status="success",
            message="Feedback successfully recorded for model evaluation.",
        )
    except Exception as e:
        logger.exception(f"Failed to record feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback.")
