from typing import Any, Dict, Optional

from pydantic import BaseModel


class CourseCompletionRequest(BaseModel):
    learner: Dict[str, Any]


class CourseCompletionResponse(BaseModel):
    success: bool
    learner: Dict[str, Any]
    course_completion: Dict[str, Any]
    error: Optional[str] = None
