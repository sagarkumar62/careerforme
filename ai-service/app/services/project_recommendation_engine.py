from typing import Any, Dict, List, Optional, Set, Tuple

from app.services.project_catalog import load_projects_catalog


def parse_learner_skills(learner: Any) -> Dict[str, float]:
    """
    Parse learner skills into a normalized dictionary of skill_id -> level.
    Supports learner dicts with 'skills', 'acquired_skills', or 'skill_levels',
    or direct dictionaries.
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


def parse_project_skills(skills: Any) -> Dict[str, float]:
    """
    Normalize project skill definitions into:
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

        skill_id = item.get("skill_id") or item.get("name") or item.get("skill")
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


def calculate_project_skill_coverage(
    project: Dict[str, Any],
    skill_gaps: Any,
    learner_skills: Optional[Dict[str, float]] = None,
) -> float:
    """
    Calculate how much of the learner's skill gap(s) the project covers.

    Formula:
      effective_course_target = min(project_skill_target, gap_target)
      gain = max(0, effective_course_target - current_level)
      coverage = gain / remaining_gap (capped at 1.0)
    """
    project_skills = parse_project_skills(project.get("skills", []))
    if not project_skills or not skill_gaps:
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

        if sid in project_skills:
            course_target = project_skills[sid]
            effective_target = min(course_target, target_lvl)
            gain = max(0.0, effective_target - curr_lvl)
            coverage = min(1.0, gain / remaining_gap)
            weighted_coverage += prio * coverage

    if total_weight == 0.0:
        return 0.0

    return min(1.0, weighted_coverage / total_weight)


def check_project_prerequisites(
    project: Dict[str, Any],
    learner_skill_levels: Dict[str, float],
) -> Dict[str, Any]:
    """
    Check project prerequisites against effective learner skill levels.
    Returns:
    {
        "eligible": bool,
        "missing_prerequisites": [
            {
                "skill": "python",
                "skill_id": "python",
                "required": 5.0,
                "minimum_level": 5.0,
                "current": 3.0,
                "current_level": 3.0,
                "gap": 2.0
            }
        ]
    }
    """
    prereqs = project.get("prerequisites", [])
    missing: List[Dict[str, Any]] = []

    if isinstance(prereqs, list):
        for item in prereqs:
            if not isinstance(item, dict):
                continue

            sid = item.get("skill_id") or item.get("skill") or item.get("name")
            if not sid or not isinstance(sid, str):
                continue
            sid = sid.strip().lower()

            try:
                min_lvl = float(
                    item.get("minimum_level")
                    or item.get("level")
                    or item.get("required_level")
                    or 1.0
                )
            except (TypeError, ValueError):
                min_lvl = 1.0

            learner_lvl = float(learner_skill_levels.get(sid, 0.0))

            if learner_lvl < min_lvl:
                gap = round(min_lvl - learner_lvl, 2)
                missing.append(
                    {
                        "skill": sid,
                        "skill_id": sid,
                        "required": min_lvl,
                        "minimum_level": min_lvl,
                        "current": learner_lvl,
                        "current_level": learner_lvl,
                        "gap": gap,
                    }
                )

    return {
        "eligible": len(missing) == 0,
        "missing_prerequisites": missing,
    }


def calculate_project_path_alignment(
    project: Dict[str, Any],
    current_milestone_skills: Optional[Set[str]] = None,
    goal: Optional[str] = None,
) -> float:
    """
    Calculate learning path alignment score based on current milestone skills or goal.
    """
    project_skills = set(parse_project_skills(project.get("skills", [])).keys())

    if current_milestone_skills:
        norm_milestone = {
            s.strip().lower() for s in current_milestone_skills if isinstance(s, str)
        }
        if norm_milestone and project_skills:
            overlap = len(project_skills.intersection(norm_milestone))
            if overlap > 0:
                return min(1.0, round(overlap / len(project_skills), 2))
            else:
                return 0.1

    if goal and isinstance(goal, str):
        norm_goal = goal.strip().lower()
        p_text = f"{project.get('title', '')} {project.get('description', '')} {project.get('category', '')}".lower()
        if any(w in p_text for w in norm_goal.split() if len(w) > 3):
            return 0.8

    return 0.5


def calculate_project_level_fit(
    project: Dict[str, Any],
    learner_skills: Dict[str, float],
) -> float:
    """
    Calculate level fit score between project difficulty/levels and learner's current skill levels.
    """
    difficulty = project.get("difficulty", "intermediate").lower()
    project_skills = parse_project_skills(project.get("skills", []))

    if project_skills:
        relevant_levels = [learner_skills.get(s, 0.0) for s in project_skills]
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


def generate_project_reason(
    project: Dict[str, Any],
    coverage: float,
    alignment: float,
    eligible: bool,
) -> str:
    """
    Generate human-readable recommendation rationale.
    """
    title = project.get("title", "This project")
    if not eligible:
        return f"Builds practical experience for {title}, but has unmet prerequisites."
    if coverage >= 0.7 and alignment >= 0.7:
        return f"Strongly addresses your target skill gaps and matches your current learning stage."
    elif coverage >= 0.5:
        return f"Addresses key skill gaps for your learning goals."
    elif alignment >= 0.5:
        return f"Aligns well with your current learning milestone."
    else:
        return f"Provides practical hands-on project experience."


def rank_project_candidates(
    projects: List[Dict[str, Any]],
    skill_gaps: Any,
    learner_skills: Dict[str, float],
    goal: Optional[str] = None,
    current_milestone_skills: Optional[Set[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Rank project candidates using weighted heuristic scoring:
      - Skill-gap coverage:       40%
      - Learning-path alignment:  25%
      - Level fit:                20%
      - Prerequisite readiness:   15%
    """
    scored: List[Dict[str, Any]] = []

    for project in projects:
        prereq_res = check_project_prerequisites(project, learner_skills)
        eligible = prereq_res["eligible"]
        missing_prereqs = prereq_res["missing_prerequisites"]

        total_prereqs = len(project.get("prerequisites", []))
        if total_prereqs == 0:
            prereq_readiness = 1.0
        else:
            prereq_readiness = (total_prereqs - len(missing_prereqs)) / total_prereqs

        coverage = calculate_project_skill_coverage(project, skill_gaps, learner_skills)
        alignment = calculate_project_path_alignment(
            project, current_milestone_skills, goal
        )
        level_fit = calculate_project_level_fit(project, learner_skills)

        match_score = round(
            0.40 * coverage
            + 0.25 * alignment
            + 0.20 * level_fit
            + 0.15 * prereq_readiness,
            2,
        )

        item = {
            "project_id": project.get("id", ""),
            "title": project.get("title", ""),
            "description": project.get("description", ""),
            "category": project.get("category", ""),
            "difficulty": project.get("difficulty", "intermediate"),
            "duration_hours": project.get("duration_hours", 10.0),
            "match_score": match_score,
            "score_breakdown": {
                "skill_gap_coverage": round(coverage, 2),
                "learning_path_alignment": round(alignment, 2),
                "level_fit": round(level_fit, 2),
                "prerequisite_readiness": round(prereq_readiness, 2),
            },
            "reason": generate_project_reason(
                project, coverage, alignment, eligible
            ),
            "eligible": eligible,
            "missing_prerequisites": missing_prereqs,
            "project": project,
        }
        scored.append(item)

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored


def recommend_projects(
    learner: Any,
    skill_gaps: Any,
    goal: Optional[str] = None,
    current_milestone_skills: Optional[Set[str]] = None,
    projects: Optional[List[Dict[str, Any]]] = None,
    top_k: int = 3,
) -> Dict[str, Any]:
    """
    Public API: Recommend top projects for a learner based on skill gaps,
    current learning milestone skills, and goal.
    """
    learner_skills = parse_learner_skills(learner)
    if projects is None:
        projects = load_projects_catalog()

    ranked = rank_project_candidates(
        projects=projects,
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
