import copy
from typing import Any, Dict, List, Optional


def parse_project_skills(project: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract skills demonstrated by a project into a normalized map:
    {"python": 5.0}
    """
    result: Dict[str, float] = {}
    skills_data = project.get("skills", [])
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


def apply_project_completion_to_learner(
    learner: Dict[str, Any],
    project: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Apply project completion to learner state adaptively.

    Does NOT mutate the input learner dict. Returns updated learner state.
    """
    updated_learner = copy.deepcopy(learner or {})

    if not project or not isinstance(project, dict):
        return {
            "success": False,
            "error": "Project not found.",
            "learner": updated_learner,
            "project_completion": {},
        }

    pid = project.get("id")
    if not pid or not isinstance(pid, str):
        return {
            "success": False,
            "error": "Invalid project data.",
            "learner": updated_learner,
            "project_completion": {},
        }

    pid_clean = pid.strip()

    # Record completed project ID idempotently
    completed_projects = updated_learner.get("completed_projects")
    if not isinstance(completed_projects, list):
        completed_projects = []

    if pid_clean not in completed_projects:
        completed_projects.append(pid_clean)

    updated_learner["completed_projects"] = completed_projects

    # Extract skills demonstrated by the project
    project_skills = parse_project_skills(project)

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
    for sid, target_lvl in project_skills.items():
        updated_skills[sid] = max(updated_skills.get(sid, 0.0), target_lvl)

    updated_learner["skills"] = updated_skills

    return {
        "success": True,
        "learner": updated_learner,
        "project_completion": {
            "project_id": pid_clean,
            "title": project.get("title", ""),
            "skills_demonstrated": project_skills,
        },
    }
