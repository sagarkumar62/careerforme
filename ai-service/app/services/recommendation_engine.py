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
from app.utils.normalization import normalize_profile_skills, _clean_skill_key, normalize_skill_id, _parse_level
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
    # Build a normalized map of user skills (raw name, clean key, skill_id) -> integer level (0 to 5)
    user_map = {}
    for s in profile_skills:
        raw_name = s.get("name") or s.get("skillId") or ""
        sid = s.get("skill_id") or normalize_skill_id(raw_name)
        lvl = _parse_level(s.get("level"))

        if raw_name:
            user_map[raw_name.lower().strip()] = lvl
            user_map[_clean_skill_key(raw_name)] = lvl
        if sid:
            user_map[sid.lower().strip()] = lvl

    total_weight = 0.0
    score = 0.0
    strengths = []
    gaps = []

    for r in required:
        imp = float(r.importance)
        req_level = int(r.required_level)
        total_weight += imp

        req_key = _clean_skill_key(r.name)
        req_sid = normalize_skill_id(r.name)

        user_level = user_map.get(
            r.name.lower().strip(),
            user_map.get(req_key, user_map.get(req_sid, 0))
        )

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
    from app.services.embedding_service import get_embedding_service
    from app.services.embedding_cache import load_precomputed_career_embeddings

    if embedding_service is None:
        svc = get_embedding_service()
        if svc.available():
            embedding_service = svc

    if career_embeddings is None:
        career_embeddings = load_precomputed_career_embeddings()

    try:
        if career_embeddings and career_id in career_embeddings and embedding_service and embedding_service.available():
            p_emb = embedding_service.encode([profile_text])
            p_vec = np.array(p_emb[0], dtype=float).reshape(1, -1)
            c_vec = np.array(career_embeddings[career_id], dtype=float).reshape(1, -1)
            sim = float(cosine_similarity(p_vec, c_vec)[0][0])
            return max(0.0, min(1.0, sim))

        if embedding_service and embedding_service.available():
            p_emb = embedding_service.encode([profile_text])
            c_emb = embedding_service.encode([career_id])
            sim = float(cosine_similarity(p_emb, c_emb)[0][0])
            return max(0.0, min(1.0, sim))
    except Exception as e:
        print(f"[RecommendationEngine] Semantic similarity warning: {e}")
        return 0.0
    return 0.0



def build_canonical_profile_text(profile: Dict) -> str:
    """
    Creates a rich, canonical text representation of the learner profile
    for semantic embedding and similarity search.
    """
    parts = []
    
    # 1. Education & Background
    edu = profile.get("education") or profile.get("degree") or ""
    exp = profile.get("experience_level") or profile.get("experience") or "entry-level"
    if edu or exp:
        parts.append(f"{exp} background with education in {edu}." if edu else f"{exp} experience level.")
        
    # 2. Skills & Proficiencies
    skills = profile.get("skills") or []
    if isinstance(skills, list):
        skill_strs = []
        for s in skills:
            if isinstance(s, dict):
                name = s.get("name") or s.get("skill") or ""
                lvl = s.get("level") or s.get("proficiency") or "intermediate"
                skill_strs.append(f"{lvl} {name}".strip())
            elif isinstance(s, str):
                skill_strs.append(s)
        if skill_strs:
            parts.append("Skills: " + ", ".join(skill_strs) + ".")
            
    # 3. Interests & Preferred Domains
    interests = profile.get("interests") or profile.get("preferred_domains") or []
    if isinstance(interests, list) and len(interests) > 0:
        parts.append("Interests: " + ", ".join([str(i) for i in interests]) + ".")
        
    # 4. Target Career & Goals
    target = profile.get("target_career") or profile.get("targetCareerGoal") or ""
    goals = profile.get("career_goals") or []
    if target or goals:
        g_str = ", ".join(goals) if isinstance(goals, list) else str(goals)
        parts.append(f"Target career: {target}. Goals: {g_str}." if target else f"Goals: {g_str}.")
        
    # 5. Projects & Completed Progress
    projects = profile.get("current_projects") or profile.get("projects") or []
    if isinstance(projects, list) and len(projects) > 0:
        p_titles = [p.get("title", str(p)) if isinstance(p, dict) else str(p) for p in projects]
        parts.append("Current projects: " + ", ".join(p_titles) + ".")

    return " ".join(parts).strip()


def _calculate_confidence(final_score: float) -> str:
    if final_score >= 0.78:
        return "HIGH"
    elif final_score >= 0.55:
        return "MEDIUM"
    return "LOW"


def _generate_transition_estimate(gaps_count: int, diff: str) -> str:
    if diff.lower() == "entry" or gaps_count <= 2:
        return "2-3 Months"
    elif diff.lower() == "intermediate" or gaps_count <= 4:
        return "3-6 Months"
    return "6-9 Months"


def _generate_next_best_action(gaps: List[str], career_title: str) -> str:
    if gaps:
        return f"Bridge your top skill gap in '{gaps[0]}' to accelerate transition into {career_title}."
    return f"Build a practical capstone project to demonstrate readiness for {career_title}."


def _get_career_difficulty(career: Career) -> str:
    if hasattr(career, "difficulty") and getattr(career, "difficulty"):
        return getattr(career, "difficulty")
    if career.experience_levels and len(career.experience_levels) > 0:
        return career.experience_levels[0]
    return "Intermediate"


def recommend(profile: Dict, top_k: int = 5, embedding_service=None, career_embeddings: dict = None) -> Dict:
    """
    Evaluates a learner profile against all available career goals using 
    the 6-factor hybrid match scoring system and returns top_k ranked career recommendations.
    """
    profile = normalize_profile_skills(profile)
    profile_text = build_canonical_profile_text(profile)
    
    recommendations = []
    for career in CAREERS:
        skill_match, strengths, gaps = _skill_match(profile.get("skills", []), career.required_skills)
        interest_match = _interest_match(profile.get("interests", []), career.interests)
        goal_match = _goal_match(profile.get("career_goals", []), career, profile.get("target_career") or "")
        experience_match = _experience_match(profile.get("experience_level"), career)
        
        # Education match check
        user_edu = (profile.get("education") or profile.get("degree") or "").lower()
        career_edus = [e.lower() for e in (career.education or [])]
        education_match = 1.0 if user_edu and any(e in user_edu or user_edu in e for e in career_edus) else (0.5 if user_edu else 0.0)

        # Semantic similarity
        semantic_sim = _semantic_similarity(profile_text, career.id, embedding_service=embedding_service, career_embeddings=career_embeddings)

        # 6-Factor Weights: 40% Skill, 20% Interest, 15% Goal, 10% Experience, 5% Education, 10% Semantic
        w = {
            "skill": 0.40,
            "interest": 0.20,
            "goal": 0.15,
            "experience": 0.10,
            "education": 0.05,
            "semantic": 0.10,
        }

        final = (
            w["skill"] * skill_match
            + w["interest"] * interest_match
            + w["goal"] * goal_match
            + w["experience"] * experience_match
            + w["education"] * education_match
            + w["semantic"] * semantic_sim
        )

        final = max(0.0, min(1.0, final))
        confidence_label = _calculate_confidence(final)
        diff_str = _get_career_difficulty(career)
        transition_est = _generate_transition_estimate(len(gaps), diff_str)
        next_action = _generate_next_best_action(gaps, career.title)

        reasoning = f"Matched {len(strengths)} core skills with {round(skill_match * 100)}% skill alignment and {round(semantic_sim * 100)}% profile domain relevance."

        recommendations.append(
            {
                "career_id": career.id,
                "career": career.title,
                "title": career.title,
                "final_score": round(final * 100),
                "match_score": round(final, 4),
                "confidence": confidence_label,
                "score_breakdown": {
                    "skill_match": round(skill_match, 4),
                    "interest_match": round(interest_match, 4),
                    "goal_match": round(goal_match, 4),
                    "experience_match": round(experience_match, 4),
                    "education_match": round(education_match, 4),
                    "semantic_similarity": round(semantic_sim, 4),
                    "skill": round(skill_match * 100),
                    "interest": round(interest_match * 100),
                    "goal": round(goal_match * 100),
                    "experience": round(experience_match * 100),
                    "education": round(education_match * 100),
                    "semantic": round(semantic_sim * 100),
                },
                "strengths": strengths,
                "skill_gaps": gaps,
                "transition_estimate": transition_est,
                "reasoning": reasoning,
                "next_best_action": next_action,
                "difficulty": diff_str,
                "description": career.description,
            }
        )

    recommendations = sorted(recommendations, key=lambda x: x["match_score"], reverse=True)
    top_match = recommendations[0] if recommendations else None
    alternatives = recommendations[1:min(len(recommendations), 5)] if len(recommendations) > 1 else []

    return {
        "success": True,
        "canonical_profile_text": profile_text,
        "top_match": top_match,
        "alternatives": alternatives,
        "recommendations": recommendations[:top_k]
    }


def compare_careers(career_ids: List[str], profile: Dict, embedding_service=None, career_embeddings: dict = None) -> Dict:
    """
    Compares up to 3 careers against the learner profile.
    Returns side-by-side metrics: score, transition effort, missing skills,
    overlap with current skills, estimated learning hours, career risks, and best-fit explanation.
    """
    profile = normalize_profile_skills(profile)
    profile_text = build_canonical_profile_text(profile)
    user_skills = set(s.get("name", "").lower() for s in profile.get("skills", []) if isinstance(s, dict))
    
    comparisons = []
    selected_ids = career_ids[:3]

    for cid in selected_ids:
        cid_clean = cid.lower().replace("_", "-").replace("car-", "")
        career = next((
            c for c in CAREERS
            if c.id.lower() == cid_clean or
            cid_clean in c.id.lower() or
            c.title.lower() in cid.lower() or
            cid.lower() in c.title.lower() or
            any(w in c.id.lower() for w in cid_clean.split("-") if len(w) > 2)
        ), CAREERS[0] if CAREERS else None)

        if not career:
            continue

        skill_match, strengths, gaps = _skill_match(profile.get("skills", []), career.required_skills)
        interest_match = _interest_match(profile.get("interests", []), career.interests)
        goal_match = _goal_match(profile.get("career_goals", []), career, profile.get("target_career") or "")
        experience_match = _experience_match(profile.get("experience_level"), career)
        user_edu = (profile.get("education") or profile.get("degree") or "").lower()
        career_edus = [e.lower() for e in (career.education or [])]
        education_match = 1.0 if user_edu and any(e in user_edu or user_edu in e for e in career_edus) else (0.5 if user_edu else 0.0)
        semantic_sim = _semantic_similarity(profile_text, career.id, embedding_service=embedding_service, career_embeddings=career_embeddings)

        final = (
            0.40 * skill_match +
            0.20 * interest_match +
            0.15 * goal_match +
            0.10 * experience_match +
            0.05 * education_match +
            0.10 * semantic_sim
        )
        final = max(0.0, min(1.0, final))

        # Skill overlap calculation
        overlap_skills = [r.name for r in career.required_skills if r.name.lower() in user_skills]
        missing_skills = [r.name for r in career.required_skills if r.name.lower() not in user_skills]

        diff_str = _get_career_difficulty(career)
        estimated_hours = len(missing_skills) * 35 + 40
        transition_effort = _generate_transition_estimate(len(missing_skills), diff_str)

        # Career risk assessment
        risks = []
        if len(missing_skills) > 4:
            risks.append("Steep learning curve due to multiple missing foundational skills.")
        if diff_str == "Advanced" and profile.get("experience_level", "").lower() in ("entry", "junior"):
            risks.append("Seniority mismatch: role typically requires mid-to-senior industry experience.")
        if not risks:
            risks.append("Low risk: smooth progression based on your current skillset.")

        best_fit = f"{career.title} is a {round(final * 100)}% fit matching {len(overlap_skills)} of your current skills."

        comparisons.append({
            "careerId": career.id,
            "careerTitle": career.title,
            "score": round(final * 100),
            "matchScore": round(final, 4),
            "confidence": _calculate_confidence(final),
            "transitionEffort": transition_effort,
            "missingSkills": missing_skills,
            "overlapSkills": overlap_skills,
            "overlapCount": len(overlap_skills),
            "estimatedLearningHours": estimated_hours,
            "careerRisks": risks,
            "bestFitExplanation": best_fit,
            "difficulty": diff_str,
            "scoreBreakdown": {
                "skill": round(skill_match * 100),
                "interest": round(interest_match * 100),
                "goal": round(goal_match * 100),
                "experience": round(experience_match * 100),
                "education": round(education_match * 100),
                "semantic": round(semantic_sim * 100),
            }
        })

    return {
        "success": True,
        "comparedCount": len(comparisons),
        "comparisons": comparisons
    }


