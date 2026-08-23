"""
Recommendation Engine Service (Career/Goal Matching & Ranking)

Single Responsibility:
    Learner Profile -> Career/Goal Matching -> Rank possible career goals

Role & Scope:
    This engine executes the 6-factor hybrid match scoring model (Skill Match, Interest Match,
    Goal Alignment, Experience Alignment, Education Alignment, and Semantic Similarity) to calculate 
    compatibility between a learner profile and candidate career goals. It ranks possible career goals 
    and returns top matches.

Non-Goals / Scope Boundaries:
    - Does NOT handle detailed skill gap analysis (delegated to dedicated skill gap endpoints/services)
    - Does NOT recommend learning courses (delegated to course recommendation engines)
    - Does NOT generate learning roadmaps (delegated to roadmap_engine.py)
    - Does NOT call LLMs for explanations (delegated to gateway LLM service)
"""

import json
from typing import Dict, List, Tuple
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.models.career import Career, SkillRequirement
from app.utils.normalization import normalize_profile_skills
from app.config.settings import settings

from app.ingestion.unified_loader import load_unified_careers


def load_careers() -> List[Career]:

    unified = load_unified_careers()
    careers = []
    for c in unified:
        req_skills = []
        for s in c.get("required_skills", []):
            if isinstance(s, dict):
                req_skills.append(SkillRequirement(
                    name=s.get("name", ""),
                    importance=s.get("importance", 0.5),
                    required_level=s.get("required_level", 3)
                ))
        c_copy = dict(c)
        c_copy["required_skills"] = req_skills
        try:
            careers.append(Career(**c_copy))
        except Exception:
            pass
    return careers


CAREERS = load_careers()



def _skill_match(profile_skills: List[Dict], required: List[SkillRequirement]) -> Tuple[float, List[str], List[str]]:
    # map user skills
    user_map = {s["name"]: (s.get("level") or 0) for s in profile_skills}
    total_weight = 0.0
    score = 0.0
    strengths = []
    gaps = []
    for r in required:
        imp = float(r.importance)
        req_level = int(r.required_level)
        total_weight += imp
        user_level = user_map.get(r.name, 0)
        contrib = min(user_level / req_level if req_level > 0 else 0.0, 1.0) * imp
        score += contrib
        if user_level >= req_level:
            strengths.append(r.name)
        else:
            gaps.append(r.name)

    skill_match = score / total_weight if total_weight > 0 else 0.0
    return skill_match, strengths, gaps


def _interest_match(user_interests: List[str], career_interests: List[str]) -> float:
    if not career_interests:
        return 0.0
    ui = set([i.strip().lower() for i in user_interests or []])
    ci = set([i.strip().lower() for i in career_interests or []])
    if not ci:
        return 0.0
    inter = ui.intersection(ci)
    return len(inter) / len(ci)


def _goal_match(user_goals: List[str], career: Career, profile_target: str) -> float:
    # simple heuristic: match if target career equals career id/title or appears in goals
    if profile_target and profile_target.strip().lower() in (career.id.lower(), career.title.lower()):
        return 1.0
    goals = " ".join(user_goals or [])
    if career.title.lower() in goals.lower():
        return 1.0
    return 0.0


def _experience_match(profile_experience: str, career: Career) -> float:
    if not profile_experience or not career.experience_levels:
        return 0.0
    if profile_experience in career.experience_levels:
        return 1.0
    # if user's experience not listed, give partial score
    return 0.5


def _semantic_similarity(profile_text: str, career_id: str, embedding_service=None, career_embeddings: dict = None) -> float:
    # Use precomputed career_embeddings when available; otherwise fall back to computing both encodings
    try:
        if career_embeddings and career_id in career_embeddings and embedding_service and embedding_service.available():
            p_emb = embedding_service.encode([profile_text])
            p_vec = np.array(p_emb[0], dtype=float).reshape(1, -1)
            c_vec = career_embeddings[career_id].reshape(1, -1)
            sim = float(cosine_similarity(p_vec, c_vec)[0][0])
            return max(0.0, min(1.0, sim))

        if embedding_service and embedding_service.available():
            p_emb = embedding_service.encode([profile_text])
            c_emb = embedding_service.encode([career_id])
            sim = float(cosine_similarity(p_emb, c_emb)[0][0])
            return max(0.0, min(1.0, sim))
    except Exception:
        return 0.0
    return 0.0


def recommend(profile: Dict, top_k: int = 3, embedding_service=None, career_embeddings: dict = None) -> Dict:
    """
    Evaluates a learner profile against all available career goals using 
    the 6-factor hybrid match scoring system and returns top_k ranked career recommendations.
    
    Pipeline: Learner Profile -> Career/Goal Matching (6-factor score) -> Rank career goals
    """
    profile = normalize_profile_skills(profile)
    recommendations = []
    for career in CAREERS:
        skill_match, strengths, gaps = _skill_match(profile.get("skills", []), career.required_skills)
        interest_match = _interest_match(profile.get("interests", []), career.interests)
        goal_match = _goal_match(profile.get("career_goals", []), career, profile.get("target_career") or "")
        experience_match = _experience_match(profile.get("experience_level"), career)
        education_match = 0.0

        # semantic similarity using career description + skills
        profile_text = " ".join([
            " ".join([s.get("name", "") for s in profile.get("skills", [])]),
            " ".join(profile.get("interests", []) or []),
            " ".join(profile.get("career_goals", []) or []),
        ])
        career_text = " ".join([career.title or "", career.description or "", " ".join([s.name for s in career.required_skills])])
        semantic_sim = _semantic_similarity(profile_text, career.id, embedding_service=embedding_service, career_embeddings=career_embeddings)

        # combine scores with weights
        w = {
            "skill": 0.4,
            "interest": 0.2,
            "goal": 0.15,
            "experience": 0.1,
            "education": 0.05,
            "semantic": 0.1,
        }

        final = (
            w["skill"] * skill_match
            + w["interest"] * interest_match
            + w["goal"] * goal_match
            + w["experience"] * experience_match
            + w["education"] * education_match
            + w["semantic"] * semantic_sim
        )

        # normalize to 0..1
        final = max(0.0, min(1.0, final))

        recommendations.append(
            {
                "career_id": career.id,
                "career": career.title,
                "match_score": round(final, 4),
                "score_breakdown": {
                    "skill_match": round(skill_match, 4),
                    "interest_match": round(interest_match, 4),
                    "goal_match": round(goal_match, 4),
                    "experience_match": round(experience_match, 4),
                    "education_match": round(education_match, 4),
                    "semantic_similarity": round(semantic_sim, 4),
                },
                "strengths": strengths,
                "skill_gaps": gaps,
                "reason": None,
                "confidence": round(final, 4),
            }
        )

    recommendations = sorted(recommendations, key=lambda x: x["match_score"], reverse=True)
    return {"success": True, "recommendations": recommendations[:top_k]}
