import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

DEFAULT_ASSESSMENTS_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "assessments.json"
)


def load_assessments_catalog(
    custom_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """
    Load assessment definitions from assessments.json.

    If the file cannot be loaded or does not contain a valid
    non-empty list, return an empty catalog.
    """
    target_path = custom_path or DEFAULT_ASSESSMENTS_PATH

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


def get_assessment_skill_ids(
    assessment: Dict[str, Any],
) -> Set[str]:
    """
    Return normalized/raw skill IDs directly evaluated by an assessment.
    """
    skill_ids: Set[str] = set()

    skills = assessment.get("skills", [])

    if not isinstance(skills, list):
        return skill_ids

    for skill in skills:
        if not isinstance(skill, dict):
            continue

        skill_id = skill.get("skill_id") or skill.get("skill") or skill.get("name")

        if isinstance(skill_id, str) and skill_id.strip():
            skill_ids.add(skill_id.strip().lower())

    return skill_ids


def validate_assessment_catalog(
    assessments: List[Dict[str, Any]],
) -> List[str]:
    """
    Validate the structural integrity of an assessment catalog.

    Returns a list of validation errors.
    An empty list means the catalog is valid.
    """
    errors: List[str] = []

    if not isinstance(assessments, list):
        return ["Assessment catalog must be a list."]

    assessment_ids: Set[str] = set()

    for index, assessment in enumerate(assessments):
        prefix = f"assessments[{index}]"

        if not isinstance(assessment, dict):
            errors.append(f"{prefix} must be an object.")
            continue

        assessment_id = assessment.get("id")

        if not isinstance(assessment_id, str) or not assessment_id.strip():
            errors.append(f"{prefix}.id must be a non-empty string.")
        else:
            normalized_id = assessment_id.strip().lower()

            if normalized_id in assessment_ids:
                errors.append(
                    f"{prefix}.id duplicates assessment '{assessment_id}'."
                )

            assessment_ids.add(normalized_id)

        title = assessment.get("title")

        if not isinstance(title, str) or not title.strip():
            errors.append(f"{prefix}.title must be a non-empty string.")

        skills = assessment.get("skills")
        assessment_skill_ids: Set[str] = set()

        if not isinstance(skills, list) or not skills:
            errors.append(f"{prefix}.skills must be a non-empty list.")
        else:
            for skill_index, skill in enumerate(skills):
                skill_prefix = f"{prefix}.skills[{skill_index}]"

                if not isinstance(skill, dict):
                    errors.append(f"{skill_prefix} must be an object.")
                    continue

                skill_id = skill.get("skill_id") or skill.get("skill") or skill.get("name")

                if not isinstance(skill_id, str) or not skill_id.strip():
                    errors.append(
                        f"{skill_prefix}.skill_id must be a non-empty string."
                    )
                else:
                    normalized_skill = skill_id.strip().lower()

                    if normalized_skill in assessment_skill_ids:
                        errors.append(
                            f"{skill_prefix}.skill_id duplicates '{skill_id}'."
                        )

                    assessment_skill_ids.add(normalized_skill)

                target_level = skill.get("target_level") or skill.get("level")

                if not isinstance(target_level, (int, float)):
                    errors.append(f"{skill_prefix}.target_level must be numeric.")
                elif not 0 <= float(target_level) <= 10:
                    errors.append(
                        f"{skill_prefix}.target_level must be between 0 and 10."
                    )

        difficulty = assessment.get("difficulty")

        if difficulty not in {"beginner", "intermediate", "advanced"}:
            errors.append(
                f"{prefix}.difficulty must be beginner, intermediate, or advanced."
            )

        duration = assessment.get("duration_minutes")

        if not isinstance(duration, (int, float)):
            errors.append(f"{prefix}.duration_minutes must be numeric.")
        elif duration <= 0:
            errors.append(
                f"{prefix}.duration_minutes must be greater than 0."
            )

        passing_score = assessment.get("passing_score")

        if not isinstance(passing_score, (int, float)):
            errors.append(f"{prefix}.passing_score must be numeric.")
        elif not 0 <= float(passing_score) <= 100:
            errors.append(
                f"{prefix}.passing_score must be between 0 and 100."
            )

        questions = assessment.get("questions")

        if not isinstance(questions, list):
            errors.append(f"{prefix}.questions must be a list.")
        else:
            for q_index, question in enumerate(questions):
                q_prefix = f"{prefix}.questions[{q_index}]"

                if not isinstance(question, dict):
                    errors.append(f"{q_prefix} must be an object.")
                    continue

                q_id = question.get("id")
                if not isinstance(q_id, str) or not q_id.strip():
                    errors.append(f"{q_prefix}.id must be a non-empty string.")

                q_type = question.get("type")
                if not isinstance(q_type, str) or not q_type.strip():
                    errors.append(
                        f"{q_prefix}.type must be a non-empty string."
                    )

                q_skill_id = question.get("skill_id")
                if not isinstance(q_skill_id, str) or not q_skill_id.strip():
                    errors.append(
                        f"{q_prefix}.skill_id must be a non-empty string."
                    )
                else:
                    norm_q_skill = q_skill_id.strip().lower()
                    if norm_q_skill not in assessment_skill_ids:
                        errors.append(
                            f"{q_prefix}.skill_id '{q_skill_id}' does not belong "
                            f"to assessment skills."
                        )

    return errors
