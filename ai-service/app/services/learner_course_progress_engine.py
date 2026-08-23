import copy
from typing import Any, Dict, List, Optional


def parse_course_skills(course: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract skills taught by a course into a normalized map:
    {"python": 5.0}
    """
    result: Dict[str, float] = {}
    skills_data = course.get("skills", [])
    if not isinstance(skills_data, list):
        return result

    for item in skills_data:
        if not isinstance(item, dict):
            continue

        sid = (
            item.get("skill_id")
            or item.get("skillId")
            or item.get("name")
            or item.get("skill")
        )
        if not sid or not isinstance(sid, str):
            continue

        sid = sid.strip().lower()
        if not sid:
            continue

        try:
            level = float(item.get("target_level") or item.get("level") or 0.0)
        except (TypeError, ValueError):
            continue

        result[sid] = level

    return result


def apply_course_completion_to_learner(
    learner: Dict[str, Any],
    course: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Apply course completion to learner state adaptively.

    Does NOT mutate the input learner dict. Returns updated learner state.
    """
    updated_learner = copy.deepcopy(learner or {})

    if not course or not isinstance(course, dict):
        return {
            "success": False,
            "error": "Course not found.",
            "learner": updated_learner,
            "course_completion": {},
        }

    cid = course.get("id")
    if not cid or not isinstance(cid, str):
        return {
            "success": False,
            "error": "Invalid course data.",
            "learner": updated_learner,
            "course_completion": {},
        }

    cid_clean = cid.strip()

    # Record completed course ID idempotently
    completed_courses = updated_learner.get("completed_courses")
    if not isinstance(completed_courses, list):
        completed_courses = []

    if cid_clean not in completed_courses:
        completed_courses.append(cid_clean)

    updated_learner["completed_courses"] = completed_courses

    # Extract skills taught by the course
    course_skills = parse_course_skills(course)

    # Parse existing learner skills
    existing_skills: Dict[str, float] = {}
    raw_skills = updated_learner.get("skills") or updated_learner.get(
        "acquired_skills"
    )
    if isinstance(raw_skills, dict):
        for k, v in raw_skills.items():
            s = str(k).strip().lower()
            if s:
                try:
                    existing_skills[s] = float(v)
                except (TypeError, ValueError):
                    pass
    elif isinstance(raw_skills, list):
        for item in raw_skills:
            if isinstance(item, dict):
                s = (
                    item.get("skill_id")
                    or item.get("skillId")
                    or item.get("name")
                    or item.get("skill")
                )
                lvl = (
                    item.get("level")
                    or item.get("current_level")
                    or item.get("currentLevel")
                    or 0.0
                )
                if s and isinstance(s, str):
                    try:
                        existing_skills[s.strip().lower()] = float(lvl)
                    except (TypeError, ValueError):
                        pass

    # Merge skills using max() to prevent downgrading explicit skills
    updated_skills = dict(existing_skills)
    for sid, target_lvl in course_skills.items():
        updated_skills[sid] = max(updated_skills.get(sid, 0.0), target_lvl)

    updated_learner["skills"] = updated_skills

    return {
        "success": True,
        "learner": updated_learner,
        "course_completion": {
            "course_id": cid_clean,
            "title": course.get("title", ""),
            "skills_acquired": course_skills,
        },
    }
