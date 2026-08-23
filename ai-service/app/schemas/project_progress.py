from typing import Any, Dict, Optional

from pydantic import BaseModel


class ProjectCompletionRequest(BaseModel):
    learner: Dict[str, Any]


class ProjectCompletionResponse(BaseModel):
    success: bool
    learner: Dict[str, Any]
    project_completion: Dict[str, Any]
    error: Optional[str] = None
