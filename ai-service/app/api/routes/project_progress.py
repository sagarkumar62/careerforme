from fastapi import APIRouter, HTTPException

from app.schemas.project_progress import (
    ProjectCompletionRequest,
    ProjectCompletionResponse,
)
from app.services.project_catalog import load_projects_catalog
from app.services.learner_project_progress_engine import (
    apply_project_completion_to_learner,
)

router = APIRouter()


@router.post(
    "/projects/{project_id}/complete",
    response_model=ProjectCompletionResponse,
)
async def complete_project(
    project_id: str,
    req: ProjectCompletionRequest,
):
    projects = load_projects_catalog()

    norm_pid = project_id.strip().lower()
    target_project = next(
        (p for p in projects if str(p.get("id", "")).strip().lower() == norm_pid),
        None,
    )

    if not target_project:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "error": f"Project '{project_id}' not found.",
                "learner": req.learner,
                "project_completion": {},
            },
        )

    res = apply_project_completion_to_learner(
        learner=req.learner,
        project=target_project,
    )

    return res
