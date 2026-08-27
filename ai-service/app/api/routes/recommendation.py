from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app.schemas.profile import UserProfile
from app.services.recommendation_engine import recommend, compare_careers
from app.services.skill_gap_engine import analyze_skill_gaps

router = APIRouter()


class RecommendRequest(BaseModel):
    user_id: str
    profile: Dict[str, Any]


class CompareCareersRequest(BaseModel):
    user_id: Optional[str] = "user"
    career_ids: List[str]
    profile: Dict[str, Any]


class SkillGapRequest(BaseModel):
    user_id: Optional[str] = "user"
    target_career: Optional[str] = None
    goal_requirements: Optional[Any] = None
    learner_skills: Optional[Any] = None
    profile: Optional[Dict[str, Any]] = None


@router.post("/recommend")
async def recommend_route(req: RecommendRequest, request: Request):
    if not req.profile:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "invalid_profile", "message": "Profile is required"}})
    embed_svc = getattr(request.app.state, "embedding_service", None)
    career_embeddings = getattr(request.app.state, "career_embeddings", None)
    model = embed_svc if (embed_svc and embed_svc.available()) else None
    res = recommend(req.profile, embedding_service=model, career_embeddings=career_embeddings)
    return res


@router.post("/careers/compare")
async def compare_careers_route(req: CompareCareersRequest, request: Request):
    if not req.career_ids:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "invalid_request", "message": "career_ids list is required"}})
    embed_svc = getattr(request.app.state, "embedding_service", None)
    career_embeddings = getattr(request.app.state, "career_embeddings", None)
    model = embed_svc if (embed_svc and embed_svc.available()) else None
    res = compare_careers(req.career_ids, req.profile, embedding_service=model, career_embeddings=career_embeddings)
    return res


@router.post("/skill-gap")
async def skill_gap_route(req: SkillGapRequest):
    profile = req.profile or {}
    goal_reqs = req.target_career or req.goal_requirements or profile.get("target_career") or "AI Engineer"
    learner_skills = req.learner_skills or profile.get("skills") or []
    res = analyze_skill_gaps(goal_reqs, learner_skills)
    return res

