from pydantic import BaseModel, Field, AliasChoices
from typing import List, Optional


class CourseSkill(BaseModel):
    skill_id: str = Field(..., validation_alias=AliasChoices("skillId", "skill_id", "name", "skill"))
    target_level: float = Field(..., validation_alias=AliasChoices("targetLevel", "target_level", "level"))


class CoursePrerequisite(BaseModel):
    skill_id: str = Field(..., validation_alias=AliasChoices("skillId", "skill_id", "name", "skill"))
    minimum_level: float = Field(..., validation_alias=AliasChoices("minimumLevel", "minimum_level", "level"))


class Course(BaseModel):
    id: str
    title: str
    description: Optional[str] = None

    skills: List[CourseSkill] = []
    prerequisites: List[CoursePrerequisite] = []

    difficulty: Optional[str] = None
    duration_hours: Optional[float] = Field(None, validation_alias=AliasChoices("durationHours", "duration_hours"))

    category: Optional[str] = None
    tags: List[str] = []
