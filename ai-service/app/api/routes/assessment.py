from fastapi import APIRouter, HTTPException

from app.schemas.assessment_result import (
    AssessmentSubmissionRequest,
    AssessmentSubmissionResponse,
)
from app.services.assessment_catalog import load_assessments_catalog
from app.services.learner_progress_engine import (
    apply_assessment_result_to_learner,
)

router = APIRouter()


@router.post(
    "/assessments/{assessment_id}/submit",
    response_model=AssessmentSubmissionResponse,
)
async def submit_assessment(
    assessment_id: str,
    req: AssessmentSubmissionRequest,
):
    assessments = load_assessments_catalog()

    norm_aid = assessment_id.strip().lower()
    target_assessment = next(
        (a for a in assessments if str(a.get("id", "")).strip().lower() == norm_aid),
        None,
    )

    if not target_assessment:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": f"Assessment '{assessment_id}' not found.",
                "learner": req.learner,
                "assessment_result": {},
            },
        )

    res = apply_assessment_result_to_learner(
        learner=req.learner,
        assessment=target_assessment,
        score=req.score,
        user_answers=req.user_answers,
    )

    return res
