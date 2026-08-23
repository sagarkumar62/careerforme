import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set


DEFAULT_PROJECTS_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "projects.json"
)


def load_projects_catalog(
    custom_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """
    Load project definitions from projects.json.

    If the file cannot be loaded or does not contain a valid
    non-empty list, return an empty catalog.
    """
    target_path = custom_path or DEFAULT_PROJECTS_PATH

    if not target_path.exists():
        return []

    try:
        content = target_path.read_text(encoding="utf-8").strip()

        if not content:
            return []

        loaded = json.loads(content)

        if isinstance(loaded, list):
            return loaded

    except (OSError, json.JSONDecodeError):
        return []

    return []


def get_project_skill_ids(
    project: Dict[str, Any],
) -> Set[str]:
    """
    Return normalized/raw skill IDs directly taught by a project.
    """
    skill_ids: Set[str] = set()

    skills = project.get("skills", [])

    if not isinstance(skills, list):
        return skill_ids

    for skill in skills:
        if not isinstance(skill, dict):
            continue

        skill_id = skill.get("skill_id")

        if isinstance(skill_id, str) and skill_id.strip():
            skill_ids.add(skill_id.strip().lower())

    return skill_ids


def validate_project_catalog(
    projects: List[Dict[str, Any]],
) -> List[str]:
    """
    Validate the structural integrity of a project catalog.

    Returns a list of validation errors.
    An empty list means the catalog is valid.
    """
    errors: List[str] = []

    if not isinstance(projects, list):
        return ["Project catalog must be a list."]

    project_ids: Set[str] = set()

    for index, project in enumerate(projects):
        prefix = f"projects[{index}]"

        if not isinstance(project, dict):
            errors.append(f"{prefix} must be an object.")
            continue

        project_id = project.get("id")

        if not isinstance(project_id, str) or not project_id.strip():
            errors.append(f"{prefix}.id must be a non-empty string.")
        else:
            normalized_id = project_id.strip().lower()

            if normalized_id in project_ids:
                errors.append(
                    f"{prefix}.id duplicates project '{project_id}'."
                )

            project_ids.add(normalized_id)

        title = project.get("title")

        if not isinstance(title, str) or not title.strip():
            errors.append(
                f"{prefix}.title must be a non-empty string."
            )

        skills = project.get("skills")

        if not isinstance(skills, list) or not skills:
            errors.append(
                f"{prefix}.skills must be a non-empty list."
            )
        else:
            skill_ids: Set[str] = set()

            for skill_index, skill in enumerate(skills):
                skill_prefix = (
                    f"{prefix}.skills[{skill_index}]"
                )

                if not isinstance(skill, dict):
                    errors.append(
                        f"{skill_prefix} must be an object."
                    )
                    continue

                skill_id = skill.get("skill_id")

                if (
                    not isinstance(skill_id, str)
                    or not skill_id.strip()
                ):
                    errors.append(
                        f"{skill_prefix}.skill_id must be "
                        "a non-empty string."
                    )
                else:
                    normalized_skill = skill_id.strip().lower()

                    if normalized_skill in skill_ids:
                        errors.append(
                            f"{skill_prefix}.skill_id duplicates "
                            f"'{skill_id}'."
                        )

                    skill_ids.add(normalized_skill)

                target_level = skill.get("target_level")

                if not isinstance(
                    target_level,
                    (int, float),
                ):
                    errors.append(
                        f"{skill_prefix}.target_level must be numeric."
                    )
                elif not 0 <= float(target_level) <= 10:
                    errors.append(
                        f"{skill_prefix}.target_level must be "
                        "between 0 and 10."
                    )

        difficulty = project.get("difficulty")

        if difficulty not in {
            "beginner",
            "intermediate",
            "advanced",
        }:
            errors.append(
                f"{prefix}.difficulty must be beginner, "
                "intermediate, or advanced."
            )

        duration = project.get("duration_hours")

        if not isinstance(duration, (int, float)):
            errors.append(
                f"{prefix}.duration_hours must be numeric."
            )
        elif duration <= 0:
            errors.append(
                f"{prefix}.duration_hours must be greater than 0."
            )

        prerequisites = project.get(
            "prerequisites",
            [],
        )

        if not isinstance(prerequisites, list):
            errors.append(
                f"{prefix}.prerequisites must be a list."
            )
        else:
            for prereq_index, prerequisite in enumerate(
                prerequisites
            ):
                prereq_prefix = (
                    f"{prefix}.prerequisites[{prereq_index}]"
                )

                if not isinstance(prerequisite, dict):
                    errors.append(
                        f"{prereq_prefix} must be an object."
                    )
                    continue

                skill_id = prerequisite.get("skill_id")

                if (
                    not isinstance(skill_id, str)
                    or not skill_id.strip()
                ):
                    errors.append(
                        f"{prereq_prefix}.skill_id must be "
                        "a non-empty string."
                    )

                minimum_level = prerequisite.get(
                    "minimum_level"
                )

                if not isinstance(
                    minimum_level,
                    (int, float),
                ):
                    errors.append(
                        f"{prereq_prefix}.minimum_level "
                        "must be numeric."
                    )
                elif not 0 <= float(minimum_level) <= 10:
                    errors.append(
                        f"{prereq_prefix}.minimum_level must be "
                        "between 0 and 10."
                    )

        deliverables = project.get("deliverables", [])

        if not isinstance(deliverables, list):
            errors.append(
                f"{prefix}.deliverables must be a list."
            )
        else:
            for deliverable_index, deliverable in enumerate(
                deliverables
            ):
                if (
                    not isinstance(deliverable, str)
                    or not deliverable.strip()
                ):
                    errors.append(
                        f"{prefix}.deliverables"
                        f"[{deliverable_index}] must be "
                        "a non-empty string."
                    )

    return errors
