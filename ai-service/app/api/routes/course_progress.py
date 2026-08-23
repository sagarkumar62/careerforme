from fastapi import APIRouter, HTTPException

from app.schemas.course_progress import (
    CourseCompletionRequest,
    CourseCompletionResponse,
)
from app.services.learning_recommendation_engine import load_courses_catalog
from app.services.learner_course_progress_engine import (
    apply_course_completion_to_learner,
)

router = APIRouter()


@router.post(
    "/courses/{course_id}/complete",
    response_model=CourseCompletionResponse,
)
async def complete_course(
    course_id: str,
    req: CourseCompletionRequest,
):
    courses = load_courses_catalog()

    norm_cid = course_id.strip().lower()
    target_course = next(
        (c for c in courses if str(c.get("id", "")).strip().lower() == norm_cid),
        None,
    )

    if not target_course:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": f"Course '{course_id}' not found.",
                "learner": req.learner,
                "course_completion": {},
            },
        )

    res = apply_course_completion_to_learner(
        learner=req.learner,
        course=target_course,
    )

    return res
