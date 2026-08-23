from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LearningPathRequest(BaseModel):
    learner: Dict[str, Any]
    goal: str = Field(..., min_length=1)
    skill_gaps: List[Dict[str, Any]] = Field(default_factory=list)


class LearningPathProgress(BaseModel):
    total_courses: int
    completed_courses: int
    overall_progress: float
    total_milestones: int
    completed_milestones: int
    current_milestone: Optional[str] = None
    next_course_id: Optional[str] = None


class LearningPathResponse(BaseModel):
    success: bool
    goal: str
    status: Optional[str] = "active"
    reason: Optional[str] = None
    total_courses: int
    total_milestones: int
    courses: List[Dict[str, Any]]
    milestones: List[Dict[str, Any]]
    progress: LearningPathProgress

