from fastapi import APIRouter, HTTPException

from app.schemas.learning_path import (
    LearningPathRequest,
    LearningPathResponse,
)
from app.services.learning_path_generator import (
    generate_personalized_learning_path,
)
from app.services.learning_recommendation_engine import load_courses_catalog
from app.services.project_catalog import load_projects_catalog
from app.services.assessment_catalog import load_assessments_catalog


router = APIRouter()


@router.post(
    "/learning-path/generate",
    response_model=LearningPathResponse,
)
async def generate_learning_path(req: LearningPathRequest):
    try:
        courses = load_courses_catalog()
        projects = load_projects_catalog()
        assessments = load_assessments_catalog()

        result = generate_personalized_learning_path(
            courses=courses,
            learner=req.learner,
            goal=req.goal,
            skill_gaps=req.skill_gaps,
            projects=projects,
            assessments=assessments,
        )

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": str(e),
            },
        )
