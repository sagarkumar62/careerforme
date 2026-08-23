from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AssessmentSubmissionRequest(BaseModel):
    learner: Dict[str, Any]
    score: float = Field(..., ge=0.0, le=100.0)
    user_answers: Optional[Dict[str, Any]] = None


class AssessmentSubmissionResponse(BaseModel):
    success: bool
    learner: Dict[str, Any]
    assessment_result: Dict[str, Any]
    error: Optional[str] = None
