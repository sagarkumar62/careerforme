from typing import Any, Dict, List


def build_learning_context(
    learner: Dict[str, Any],
    goal: str,
    skill_gaps: List[Dict[str, Any]] | None = None,
) -> str:
    """
    Build a semantic representation of the learner's current
    learning objective and profile.
    """

    parts = []

    if goal:
        parts.append(f"Goal: {goal}")

    experience = learner.get("experience_level")
    if experience:
        parts.append(f"Experience level: {experience}")

    interests = learner.get("interests") or []
    if interests:
        parts.append(
            "Interests: " + ", ".join(str(item) for item in interests)
        )

    skills = learner.get("skills") or []

    skill_parts = []

    for skill in skills:
        if isinstance(skill, dict):
            name = (
                skill.get("skill_id")
                or skill.get("skillId")
                or skill.get("name")
                or skill.get("skill")
            )
            level = skill.get("level")

            if name:
                if level is not None:
                    skill_parts.append(f"{name} (level {level})")
                else:
                    skill_parts.append(str(name))

        elif isinstance(skill, str):
            skill_parts.append(skill)

    if skill_parts:
        parts.append(
            "Current skills: " + ", ".join(skill_parts)
        )

    if skill_gaps:
        gap_parts = []

        for gap in skill_gaps:
            name = (
                gap.get("skillId")
                or gap.get("skill_id")
                or gap.get("name")
            )

            if name:
                gap_parts.append(str(name))

        if gap_parts:
            parts.append(
                "Skills to develop: " + ", ".join(gap_parts)
            )

    return "\n".join(parts)
