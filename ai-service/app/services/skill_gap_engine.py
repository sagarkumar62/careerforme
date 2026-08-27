"""
Skill Gap Engine Service

Single Responsibility:
    Calculates granular skill gaps by comparing Goal Requirements against Learner Skills.

Input:
    Goal Requirements + Learner Skills

Output Structure:
    [
        {
            "skillId": "statistics",
            "skillName": "Statistics",
            "currentLevel": 3,
            "targetLevel": 7,
            "gap": 4,
            "priority": 0.91,
            "status": "needs_work"
        }
    ]

Non-Goals / Scope Boundaries:
    - Does NOT recommend learning courses (delegated to learning_recommendation_engine.py)
    - Does NOT generate multi-phase learning roadmaps (delegated to roadmap_engine.py)
    - Does NOT invoke LLMs
"""

import re
from typing import Dict, List, Any, Optional, Union
from app.utils.normalization import normalize_skill_name, normalize_skill_id, _parse_level
from app.services.career_resolver import resolve_target_career, normalize_career_input
from app.ingestion.unified_loader import load_unified_careers



def parse_learner_skill_levels(learner_skills: Any) -> Dict[str, int]:
    """
    Parses various representations of learner skills into a normalized map:
    { "statistics": 3, "python": 4 }
    """
    level_map: Dict[str, int] = {}

    if isinstance(learner_skills, dict):
        # Check if wrapped in profile dict e.g. {"skills": [...]} or {"skills": {...}}
        if "skills" in learner_skills and (isinstance(learner_skills["skills"], list) or isinstance(learner_skills["skills"], dict)):
            return parse_learner_skill_levels(learner_skills["skills"])

        for k, v in learner_skills.items():
            canon = normalize_skill_name(str(k))
            slug = normalize_skill_id(canon)
            level_map[slug] = _parse_level(v)
            level_map[canon.lower()] = _parse_level(v)

    elif isinstance(learner_skills, list):
        for item in learner_skills:
            if isinstance(item, dict):
                raw_name = item.get("name") or item.get("skill") or item.get("skillId") or item.get("title") or ""
                canon = normalize_skill_name(str(raw_name))
                slug = normalize_skill_id(canon)
                lvl = _parse_level(item.get("level") or item.get("currentLevel") or item.get("proficiency") or 0)
                if slug != "unknown":
                    level_map[slug] = lvl
                    level_map[canon.lower()] = lvl
            elif isinstance(item, str):
                canon = normalize_skill_name(item)
                slug = normalize_skill_id(canon)
                if slug != "unknown":
                    level_map[slug] = 1
                    level_map[canon.lower()] = 1

    return level_map


def parse_goal_requirements(goal_requirements: Any) -> List[Dict[str, Any]]:
    """
    Resolves goal requirements into a standard list of required skill dicts:
    [
        {"skillId": "statistics", "skillName": "Statistics", "targetLevel": 7, "importance": 0.9}
    ]
    """
    requirements: List[Dict[str, Any]] = []

    # Case A: String input representing target career title/ID (e.g. "python-developer" or "Data Scientist")
    if isinstance(goal_requirements, str) and goal_requirements.strip():
        career_res = resolve_target_career(goal_requirements)
        if career_res.get("success") and career_res.get("graph_data"):
            g_data = career_res["graph_data"]
            nodes = g_data.get("nodes") or g_data.get("skills") or g_data.get("required_skills") or g_data.get("requiredSkills") or []
            for node in nodes:
                if isinstance(node, dict):
                    title = node.get("title") or node.get("label") or node.get("name") or "Skill"
                    canon = normalize_skill_name(title)
                    slug = str(node.get("id") or node.get("nodeId") or normalize_skill_id(canon)).strip()
                    target_lvl = node.get("requiredLevel") or node.get("recommended_level") or node.get("required_level") or 4
                    requirements.append({
                        "skillId": slug,
                        "skillName": title,
                        "targetLevel": int(target_lvl),
                        "importance": float(node.get("importance") or (0.8 if node.get("type") == "core" else 0.6))
                    })
                elif isinstance(node, str):
                    canon = normalize_skill_name(node)
                    requirements.append({
                        "skillId": normalize_skill_id(canon),
                        "skillName": node,
                        "targetLevel": 4,
                        "importance": 0.7
                    })
        else:
            # Fallback to searching unified careers catalog
            unified = load_unified_careers()
            matched_career = None
            clean_input = normalize_career_input(goal_requirements)
            if not clean_input:
                clean_input = goal_requirements.strip().lower()

            for c in unified:
                c_title = (c.get("title") or "").lower()
                c_id = (c.get("id") or "").lower()
                c_title_norm = normalize_career_input(c_title)
                if (
                    clean_input == c_title or clean_input == c_id or
                    clean_input == c_title_norm or
                    clean_input in c_title or clean_input in c_id or c_id in clean_input or
                    c_title in clean_input or (c_title_norm and c_title_norm in clean_input)
                ):
                    matched_career = c
                    break

            if not matched_career:
                keywords = [w for w in clean_input.split() if len(w) > 2]
                for c in unified:
                    c_title = (c.get("title") or "").lower()
                    c_id = (c.get("id") or "").lower()
                    if any(kw in c_title or kw in c_id for kw in keywords):
                        matched_career = c
                        break

            if matched_career:
                for req in matched_career.get("required_skills", []):
                    if isinstance(req, dict):
                        title = req.get("name") or "Skill"
                        canon = normalize_skill_name(title)
                        slug = normalize_skill_id(canon)
                        target_lvl = req.get("required_level") or req.get("targetLevel") or 4
                        imp = float(req.get("importance") or 0.7)
                        requirements.append({
                            "skillId": slug,
                            "skillName": title,
                            "targetLevel": int(target_lvl),
                            "importance": imp
                        })
                    elif isinstance(req, str):
                        canon = normalize_skill_name(req)
                        requirements.append({
                            "skillId": normalize_skill_id(canon),
                            "skillName": req,
                            "targetLevel": 4,
                            "importance": 0.7
                        })

    # Case B: List input of required skills or node dicts
    elif isinstance(goal_requirements, list):
        for item in goal_requirements:
            if isinstance(item, dict):
                raw_name = item.get("skillName") or item.get("name") or item.get("title") or item.get("skill") or item.get("skillId") or ""
                canon = normalize_skill_name(str(raw_name))
                slug = item.get("skillId") or normalize_skill_id(canon)
                target_lvl = int(item.get("targetLevel") or item.get("requiredLevel") or item.get("required_level") or 5)
                imp = float(item.get("importance") or 0.8)
                requirements.append({
                    "skillId": str(slug),
                    "skillName": str(raw_name) if raw_name else canon,
                    "targetLevel": target_lvl,
                    "importance": imp
                })

            elif isinstance(item, str):
                canon = normalize_skill_name(item)
                requirements.append({
                    "skillId": normalize_skill_id(canon),
                    "skillName": item,
                    "targetLevel": 4,
                    "importance": 0.7
                })

    # Case C: Dict input of skillId -> target_level or {"required_skills": [...]}
    elif isinstance(goal_requirements, dict):
        if "required_skills" in goal_requirements:
            return parse_goal_requirements(goal_requirements["required_skills"])
        elif "nodes" in goal_requirements:
            return parse_goal_requirements(goal_requirements["nodes"])
        else:
            for k, v in goal_requirements.items():
                canon = normalize_skill_name(str(k))
                slug = normalize_skill_id(canon)
                if isinstance(v, dict):
                    target_lvl = int(v.get("targetLevel") or v.get("requiredLevel") or v.get("level") or 5)
                    imp = float(v.get("importance") or 0.8)
                else:
                    target_lvl = int(v) if v else 4
                    imp = 0.8
                requirements.append({
                    "skillId": slug,
                    "skillName": str(k),
                    "targetLevel": target_lvl,
                    "importance": imp
                })

    return requirements


def calculate_single_skill_gap(
    required_skill: Dict[str, Any],
    learner_skills_map: Dict[str, int]
) -> Dict[str, Any]:
    """
    Computes skill gap metrics for a single required skill against learner skills.
    
    Returns:
    {
        "skill": "statistics",
        "skillId": "statistics",
        "skillName": "Statistics",
        "currentLevel": 3,
        "requiredLevel": 4,
        "gap": 1,
        "priority": "HIGH",
        "priorityScore": 0.85,
        "classification": "NEEDS_WORK",
        "status": "needs_work",
        "reason": "Prerequisite for Machine Learning with high career relevance.",
        "prerequisites": ["Python", "Algebra"],
        "estimatedHours": 30
    }
    """
    skill_id = required_skill.get("skillId") or "unknown"
    skill_name = required_skill.get("skillName") or required_skill.get("name") or skill_id.replace("-", " ").title()
    target_level = int(required_skill.get("targetLevel") or required_skill.get("requiredLevel") or required_skill.get("required_level") or 4)
    importance = float(required_skill.get("importance") or 0.8)

    canon_name = normalize_skill_name(skill_name)
    canon_lower = canon_name.lower()
    norm_skill_id = normalize_skill_id(skill_id)
    current_level = 0
    sid_clean = skill_id.lower().replace("-", " ").replace("_", " ")
    canon_clean = canon_lower.replace("-", " ").replace("_", " ")

    for lk, lv in learner_skills_map.items():
        norm_lk = normalize_skill_id(lk)
        lk_clean = lk.lower().replace("-", " ").replace("_", " ")
        if (
            norm_lk == norm_skill_id
            or lk_clean == sid_clean
            or lk_clean == canon_clean
            or (len(lk_clean) >= 3 and (lk_clean in sid_clean or sid_clean in lk_clean or lk_clean in canon_clean))
            or (len(norm_lk) >= 3 and (norm_lk in norm_skill_id or norm_skill_id in norm_lk))
        ):
            try:
                current_level = max(current_level, int(float(lv)))
            except (TypeError, ValueError):
                pass

    # Compute raw gap
    gap = max(0, target_level - current_level)

    # Classifications
    if current_level >= target_level:
        classification = "STRONG"
        status = "mastered"
    elif current_level > 0:
        classification = "NEEDS_WORK"
        status = "needs_work"
    else:
        classification = "MISSING"
        status = "missing"

    # Compute priority score (0.0 to 1.0)
    if classification == "STRONG":
        priority_label = "LOW"
        priority_val = 0.0
        reason = f"Mastered skill ({current_level}/{target_level}). Meets career requirements."
    else:
        raw_ratio = gap / max(target_level, 1)
        priority_val = round(min(max(0.5 * raw_ratio + 0.5 * importance, 0.1), 1.0), 2)
        if priority_val >= 0.7:
            priority_label = "HIGH"
        elif priority_val >= 0.4:
            priority_label = "MEDIUM"
        else:
            priority_label = "LOW"

        if classification == "MISSING":
            reason = f"Essential missing competency for role. High priority to unlock dependent advanced topics."
        else:
            reason = f"Needs level-up from level {current_level} to required level {target_level}."

    prereqs = required_skill.get("prerequisites") or []
    if not prereqs and "python" in skill_id or "pandas" in skill_id:
        prereqs = ["Programming Foundations"]
    elif not prereqs and ("machine-learning" in skill_id or "deep-learning" in skill_id):
        prereqs = ["Python", "Linear Algebra", "Statistics"]

    estimated_hours = gap * 25 if gap > 0 else 0

    return {
        "skill": skill_name,
        "skillId": skill_id,
        "skillName": skill_name,
        "currentLevel": current_level,
        "requiredLevel": target_level,
        "targetLevel": target_level,
        "gap": gap,
        "priority": priority_val,
        "priorityLabel": priority_label,
        "priority_label": priority_label,
        "priorityScore": priority_val,
        "classification": classification,
        "status": status,
        "reason": reason,
        "prerequisites": prereqs,
        "estimatedHours": estimated_hours
    }



def compute_skill_gaps(
    goal_requirements: Any,
    learner_skills: Any
) -> List[Dict[str, Any]]:
    """
    Computes list of skill gap objects for given goal requirements and learner skills.
    """
    parsed_reqs = parse_goal_requirements(goal_requirements)
    learner_map = parse_learner_skill_levels(learner_skills)

    gaps_list = []
    seen_ids = set()

    for req in parsed_reqs:
        s_id = req["skillId"]
        if s_id in seen_ids:
            continue
        seen_ids.add(s_id)
        gap_obj = calculate_single_skill_gap(req, learner_map)
        gaps_list.append(gap_obj)

    # Sort skill gaps by priority descending (highest gap/urgency first)
    gaps_list.sort(key=lambda x: (x["priority"], x["gap"]), reverse=True)
    return gaps_list


def analyze_skill_gaps(
    goal_requirements: Any,
    learner_skills: Any
) -> Dict[str, Any]:
    """
    Main entry point function for Skill Gap Analysis.
    
    Accepts:
      - goal_requirements: string career title, list of requirement dicts, or dict of required skills
      - learner_skills: list/dict of learner's acquired skills or profile dict
      
    Returns:
      - Structured dictionary with success status, goal metadata, counts, and skillGaps list.
        (Does NOT include course recommendations).
    """
    gaps = compute_skill_gaps(goal_requirements, learner_skills)
    
    mastered_count = sum(1 for g in gaps if g["status"] == "mastered")
    needs_work_count = sum(1 for g in gaps if g["status"] in ("needs_work", "missing"))

    goal_title = goal_requirements if isinstance(goal_requirements, str) else "Custom Goal"

    return {
        "success": True,
        "goal": goal_title,
        "totalSkills": len(gaps),
        "masteredCount": mastered_count,
        "gapCount": needs_work_count,
        "skillGaps": gaps
    }


# -------------------------------------------------------------------------
# Object-Oriented Class Interface
# -------------------------------------------------------------------------

class SkillGapEngine:
    """
    Engine class providing object-oriented skill gap evaluation.
    """

    def analyze(self, goal_requirements: Any, learner_skills: Any) -> Dict[str, Any]:
        """Executes skill gap evaluation."""
        return analyze_skill_gaps(goal_requirements, learner_skills)

    def compute(self, goal_requirements: Any, learner_skills: Any) -> List[Dict[str, Any]]:
        """Returns raw list of skill gap objects."""
        return compute_skill_gaps(goal_requirements, learner_skills)
