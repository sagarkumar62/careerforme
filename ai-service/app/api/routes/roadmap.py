from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from app.services.roadmap_engine import generate_roadmap_structure
from app.ingestion.unified_loader import load_unified_careers
from app.training.synthetic_generator import generate_synthetic_training_dataset
from app.knowledge.skill_graph import get_skill_graph

from app.services.graph_generator import generate_career_graph

router = APIRouter()


class RoadmapGenerateRequest(BaseModel):
    user_id: Optional[str] = None
    target_career: Optional[str] = None
    targetCareer: Optional[str] = None
    career_id: Optional[str] = None
    careerId: Optional[str] = None
    profile: Dict[str, Any]


class GraphGenerateRequest(BaseModel):
    role: Optional[str] = None
    targetCareer: Optional[str] = None
    career: Optional[str] = None


@router.post("/roadmap/generate")
async def generate_roadmap_route(req: RoadmapGenerateRequest):
    if not req.profile:
        raise HTTPException(status_code=400, detail={"success": False, "code": "INVALID_INPUT", "error": "Profile is required"})

    target_career_name = (req.careerId or req.career_id or req.targetCareer or req.target_career or "").strip()
    if not target_career_name:
        raise HTTPException(status_code=400, detail={"success": False, "code": "INVALID_INPUT", "error": "target_career or careerId is required"})

    try:
        roadmap = generate_roadmap_structure(req.profile, target_career_name)
        if not roadmap.get("success"):
            raise HTTPException(status_code=400, detail=roadmap)
        return roadmap
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"success": False, "code": "SERVER_ERROR", "error": str(e)})


@router.post("/roadmap/skill-gap")
async def get_skill_gap_route(req: RoadmapGenerateRequest):
    try:
        roadmap = generate_roadmap_structure(req.profile, req.target_career or "AI Engineer")
        return {
            "success": True,
            "careerTitle": roadmap.get("careerTitle"),
            "matchScore": roadmap.get("matchScore"),
            "missingSkills": roadmap.get("missingSkills", []),
            "needsWorkSkills": roadmap.get("needsWorkSkills", []),
            "strengths": roadmap.get("strengths", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"success": False, "error": str(e)})


@router.get("/careers")
async def get_all_careers_route():
    careers = load_unified_careers()
    return {"success": True, "count": len(careers), "careers": careers}


@router.get("/skills")
async def get_all_skills_route():
    careers = load_unified_careers()
    skills_set = set()
    for c in careers:
        for s in c.get("required_skills", []):
            if isinstance(s, dict) and s.get("name"):
                skills_set.add(s["name"])
    return {"success": True, "count": len(skills_set), "skills": sorted(list(skills_set))}


@router.post("/training/synthetic-data")
async def generate_synthetic_data_route(limit: Optional[int] = 50):
    dataset = generate_synthetic_training_dataset(sample_size=limit or 50)
    return {"success": True, "count": len(dataset), "data": dataset}


class RoadmapAdaptRequest(BaseModel):
    user_id: Optional[str] = None
    target_career: Optional[str] = None
    targetCareer: Optional[str] = None
    completed_milestones: Optional[List[str]] = None
    missed_milestones: Optional[List[str]] = None
    progress_percentage: Optional[float] = 0
    current_roadmap: Optional[Dict[str, Any]] = None
    profile: Dict[str, Any]


@router.post("/roadmap/adapt")
async def adapt_roadmap_route(req: RoadmapAdaptRequest):
    if not req.profile:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Profile is required"})

    try:
        from app.services.roadmap_engine import adapt_roadmap_structure
        adapted = adapt_roadmap_structure(req.profile, req.dict())
        return adapted
    except Exception as e:
        raise HTTPException(status_code=500, detail={"success": False, "error": str(e)})


@router.post("/roadmap/graph")
async def generate_graph_route(req: GraphGenerateRequest):
    role = (req.role or req.targetCareer or req.career or "").strip()
    if not role:
        raise HTTPException(status_code=400, detail={"success": False, "error": "role is required"})
    try:
        graph = generate_career_graph(role)
        return graph
    except Exception as e:
        raise HTTPException(status_code=500, detail={"success": False, "error": str(e)})


