from typing import Any, Dict, List, Optional, Set

from app.services.assessment_catalog import load_assessments_catalog


def parse_learner_skills(learner: Any) -> Dict[str, float]:
    """
    Parse learner skills into a normalized dictionary of skill_id -> level.
    """
    result: Dict[str, float] = {}
    if not learner:
        return result

    skills_data = None
    if isinstance(learner, dict):
        if "skills" in learner:
            skills_data = learner["skills"]
        elif "acquired_skills" in learner:
            skills_data = learner["acquired_skills"]
        elif "skill_levels" in learner:
            skills_data = learner["skill_levels"]
        else:
            skills_data = learner
    elif isinstance(learner, list):
        skills_data = learner

    if isinstance(skills_data, dict):
        for k, v in skills_data.items():
            sid = str(k).strip().lower()
            if sid:
                try:
                    result[sid] = float(v)
                except (TypeError, ValueError):
                    pass
    elif isinstance(skills_data, list):
        for item in skills_data:
            if isinstance(item, dict):
                sid = (
                    item.get("skill_id")
                    or item.get("skillId")
                    or item.get("name")
                    or item.get("skill")
                )
                lvl = (
                    item.get("level")
                    or item.get("current_level")
                    or item.get("currentLevel")
                    or item.get("proficiency")
                    or 0.0
                )
                if sid and isinstance(sid, str):
                    try:
                        result[sid.strip().lower()] = float(lvl)
                    except (TypeError, ValueError):
                        pass
            elif isinstance(item, str):
                result[item.strip().lower()] = 1.0

    return result


def parse_assessment_skills(skills: Any) -> Dict[str, float]:
    """
    Normalize assessment skill definitions into:
    {
        "python": 5.0,
        "machine learning": 5.0
    }
    """
    result: Dict[str, float] = {}
    if not isinstance(skills, list):
        return result

    for item in skills:
        if not isinstance(item, dict):
            continue

        skill_id = item.get("skill_id") or item.get("skill") or item.get("name")
        if not isinstance(skill_id, str):
            continue

        skill_id = skill_id.strip().lower()
        if not skill_id:
            continue

        try:
            level = float(item.get("target_level") or item.get("level") or 0)
        except (TypeError, ValueError):
            continue

        result[skill_id] = level

    return result


def _normalize_gap_item(
    item: Any, learner_skills: Optional[Dict[str, float]] = None
) -> Optional[Dict[str, Any]]:
    if isinstance(item, str):
        sid = item.strip().lower()
        if not sid:
            return None
        curr = learner_skills.get(sid, 0.0) if learner_skills else 0.0
        return {
            "skill_id": sid,
            "current_level": curr,
            "target_level": max(curr + 3.0, 4.0),
            "priority": 1.0,
        }
    elif isinstance(item, dict):
        sid = (
            item.get("skill_id")
            or item.get("skillId")
            or item.get("name")
            or item.get("skill")
        )
        if not sid or not isinstance(sid, str):
            return None
        sid = sid.strip().lower()

        curr = (
            item.get("current_level")
            if item.get("current_level") is not None
            else item.get("currentLevel")
        )
        if curr is None:
            curr = learner_skills.get(sid, 0.0) if learner_skills else 0.0
        else:
            curr = float(curr)

        tgt = (
            item.get("target_level")
            if item.get("target_level") is not None
            else item.get("targetLevel")
        )
        if tgt is None:
            tgt = (
                item.get("required_level")
                if item.get("required_level") is not None
                else item.get("requiredLevel")
            )
        if tgt is None and item.get("gap") is not None:
            tgt = curr + float(item["gap"])
        if tgt is None:
            tgt = max(curr + 3.0, 4.0)
        else:
            tgt = float(tgt)

        prio = float(item.get("priority") or item.get("importance") or 1.0)
        return {
            "skill_id": sid,
            "current_level": curr,
            "target_level": tgt,
            "priority": prio,
        }
    return None


def calculate_assessment_skill_coverage(
    assessment: Dict[str, Any],
    skill_gaps: Any,
    learner_skills: Optional[Dict[str, float]] = None,
) -> float:
    """
    Calculate how much of the learner's skill gap(s) the assessment validates.
    Does NOT reward overshooting.
    """
    assessment_skills = parse_assessment_skills(assessment.get("skills", []))
    if not assessment_skills or not skill_gaps:
        return 0.0

    parsed_gaps: List[Dict[str, Any]] = []
    if isinstance(skill_gaps, list):
        for item in skill_gaps:
            g = _normalize_gap_item(item, learner_skills)
            if g:
                parsed_gaps.append(g)
    elif isinstance(skill_gaps, dict):
        for k, v in skill_gaps.items():
            if isinstance(v, dict):
                g_dict = dict(v)
                g_dict["skill_id"] = k
                g = _normalize_gap_item(g_dict, learner_skills)
            else:
                g = _normalize_gap_item({"skill_id": k, "gap": v}, learner_skills)
            if g:
                parsed_gaps.append(g)

    if not parsed_gaps:
        return 0.0

    total_weight = 0.0
    weighted_coverage = 0.0

    for gap in parsed_gaps:
        sid = gap["skill_id"]
        curr_lvl = gap["current_level"]
        target_lvl = gap["target_level"]
        remaining_gap = target_lvl - curr_lvl
        prio = gap["priority"]

        if remaining_gap <= 0:
            continue

        total_weight += prio

        if sid in assessment_skills:
            a_target = assessment_skills[sid]
            effective_target = min(a_target, target_lvl)
            gain = max(0.0, effective_target - curr_lvl)
            coverage = min(1.0, gain / remaining_gap)
            weighted_coverage += prio * coverage

    if total_weight == 0.0:
        return 0.0

    return min(1.0, weighted_coverage / total_weight)


def check_assessment_readiness(
    assessment: Dict[str, Any],
    learner_skill_levels: Dict[str, float],
) -> Dict[str, Any]:
    """
    Check if the learner has reached the required target level for ALL skills
    evaluated by the assessment.
    Returns:
    {
        "eligible": bool,
        "missing_skills": [
            {
                "skill": "machine learning",
                "skill_id": "machine learning",
                "required": 5.0,
                "current": 3.0,
                "gap": 2.0
            }
        ]
    }
    """
    assessment_skills = parse_assessment_skills(assessment.get("skills", []))
    missing: List[Dict[str, Any]] = []

    for sid, req_lvl in assessment_skills.items():
        alt_sid_hyphen = sid.replace(" ", "-")
        alt_sid_space = sid.replace("-", " ")

        learner_lvl = 0.0
        if sid in learner_skill_levels:
            learner_lvl = float(learner_skill_levels[sid])
        elif alt_sid_hyphen in learner_skill_levels:
            learner_lvl = float(learner_skill_levels[alt_sid_hyphen])
        elif alt_sid_space in learner_skill_levels:
            learner_lvl = float(learner_skill_levels[alt_sid_space])

        if learner_lvl < req_lvl:
            gap = round(req_lvl - learner_lvl, 2)
            missing.append(
                {
                    "skill": sid,
                    "skill_id": sid,
                    "required": req_lvl,
                    "current": learner_lvl,
                    "gap": gap,
                }
            )

    return {
        "eligible": len(missing) == 0,
        "missing_skills": missing,
    }


def calculate_assessment_path_alignment(
    assessment: Dict[str, Any],
    current_milestone_skills: Optional[Set[str]] = None,
    goal: Optional[str] = None,
) -> float:
    """
    Calculate learning path alignment score for an assessment based on
    current milestone skills or goal keywords.
    """
    a_skills = set(parse_assessment_skills(assessment.get("skills", [])).keys())

    if current_milestone_skills:
        norm_milestone = {
            s.strip().lower() for s in current_milestone_skills if isinstance(s, str)
        }
        if norm_milestone and a_skills:
            overlap = len(a_skills.intersection(norm_milestone))
            if overlap > 0:
                return min(1.0, round(overlap / len(a_skills), 2))
            else:
                return 0.1

    if goal and isinstance(goal, str):
        norm_goal = goal.strip().lower()
        a_text = f"{assessment.get('title', '')} {assessment.get('description', '')} {assessment.get('category', '')}".lower()
        if any(w in a_text for w in norm_goal.split() if len(w) > 3):
            return 0.8

    return 0.5


def calculate_assessment_level_fit(
    assessment: Dict[str, Any],
    learner_skills: Dict[str, float],
) -> float:
    """
    Calculate level fit score between assessment difficulty and learner's current skill levels.
    """
    difficulty = assessment.get("difficulty", "intermediate").lower()
    a_skills = parse_assessment_skills(assessment.get("skills", []))

    if a_skills:
        relevant_levels = [learner_skills.get(s, 0.0) for s in a_skills]
        avg_learner_lvl = sum(relevant_levels) / len(relevant_levels)
    elif learner_skills:
        avg_learner_lvl = sum(learner_skills.values()) / len(learner_skills)
    else:
        avg_learner_lvl = 0.0

    diff_ideal = {"beginner": 2.0, "intermediate": 5.0, "advanced": 8.0}
    ideal_lvl = diff_ideal.get(difficulty, 5.0)

    diff = abs(avg_learner_lvl - ideal_lvl)
    level_fit = max(0.0, 1.0 - (diff / 8.0))

    return round(min(1.0, level_fit), 2)


def generate_assessment_reason(
    assessment: Dict[str, Any],
    coverage: float,
    alignment: float,
    eligible: bool,
) -> str:
    """
    Generate human-readable recommendation rationale.
    """
    title = assessment.get("title", "This assessment")
    if not eligible:
        return f"Validates skills for {title}, but you have unmet readiness requirements."
    if coverage >= 0.7 and alignment >= 0.7:
        return f"You have the required skill level and this assessment validates the skills in your current learning milestone."
    elif coverage >= 0.5:
        return f"Evaluates target skills for your learning goals."
    elif alignment >= 0.5:
        return f"Aligns well with your current learning milestone."
    else:
        return f"Validates core competencies for your profile."


def rank_assessment_candidates(
    assessments: List[Dict[str, Any]],
    skill_gaps: Any,
    learner_skills: Dict[str, float],
    goal: Optional[str] = None,
    current_milestone_skills: Optional[Set[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Rank assessment candidates using weighted V1 scoring:
      - Skill-gap coverage:       30%
      - Assessment readiness:     30%
      - Learning-path alignment:  20%
      - Level fit:                20%
    """
    scored: List[Dict[str, Any]] = []

    for assessment in assessments:
        readiness_res = check_assessment_readiness(assessment, learner_skills)
        eligible = readiness_res["eligible"]
        missing_skills = readiness_res["missing_skills"]

        a_skills = parse_assessment_skills(assessment.get("skills", []))
        total_a_skills = len(a_skills) if a_skills else 1

        if eligible:
            readiness_score = 1.0
        else:
            readiness_score = (total_a_skills - len(missing_skills)) / total_a_skills

        coverage = calculate_assessment_skill_coverage(
            assessment, skill_gaps, learner_skills
        )
        alignment = calculate_assessment_path_alignment(
            assessment, current_milestone_skills, goal
        )
        level_fit = calculate_assessment_level_fit(assessment, learner_skills)

        match_score = round(
            0.30 * coverage
            + 0.30 * readiness_score
            + 0.20 * alignment
            + 0.20 * level_fit,
            2,
        )

        item = {
            "assessment_id": assessment.get("id", ""),
            "title": assessment.get("title", ""),
            "description": assessment.get("description", ""),
            "type": assessment.get("type", "quiz"),
            "category": assessment.get("category", ""),
            "difficulty": assessment.get("difficulty", "intermediate"),
            "duration_minutes": assessment.get("duration_minutes", 30),
            "passing_score": assessment.get("passing_score", 70),
            "match_score": match_score,
            "score_breakdown": {
                "skill_gap_coverage": round(coverage, 2),
                "assessment_readiness": round(readiness_score, 2),
                "learning_path_alignment": round(alignment, 2),
                "level_fit": round(level_fit, 2),
            },
            "reason": generate_assessment_reason(
                assessment, coverage, alignment, eligible
            ),
            "eligible": eligible,
            "missing_skills": missing_skills,
            "assessment": assessment,
        }
        scored.append(item)

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored


def recommend_assessments(
    learner: Any,
    skill_gaps: Any,
    goal: Optional[str] = None,
    current_milestone_skills: Optional[Set[str]] = None,
    assessments: Optional[List[Dict[str, Any]]] = None,
    top_k: int = 3,
) -> Dict[str, Any]:
    """
    Public API: Recommend top assessments for a learner based on skill gaps,
    readiness, milestone skills, and goal. Excludes already completed assessments.
    """
    learner_skills = parse_learner_skills(learner)
    if assessments is None:
        assessments = load_assessments_catalog()

    completed_assessments = set()
    if isinstance(learner, dict):
        raw_completed = learner.get("completed_assessments", [])
        if isinstance(raw_completed, list):
            completed_assessments = {
                str(a).strip().lower() for a in raw_completed if isinstance(a, str)
            }

    available_assessments = [
        a
        for a in assessments
        if str(a.get("id", "")).strip().lower() not in completed_assessments
    ]

    ranked = rank_assessment_candidates(
        assessments=available_assessments,
        skill_gaps=skill_gaps,
        learner_skills=learner_skills,
        goal=goal,
        current_milestone_skills=current_milestone_skills,
    )

    eligible_recommendations = [item for item in ranked if item["eligible"]]
    locked_recommendations = [item for item in ranked if not item["eligible"]]

    return {
        "success": True,
        "recommendations": eligible_recommendations[:top_k],
        "locked_recommendations": locked_recommendations,
    }
