from typing import Any, Dict, List, Optional, Set


def parse_assessment_skill_levels(skills: Any) -> Dict[str, float]:
    """
    Parse assessment skill target levels into a normalized dict:
    {"python": 5.0, "machine learning": 5.0}
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
            level = float(item.get("target_level") or item.get("level") or 0.0)
        except (TypeError, ValueError):
            continue

        result[skill_id] = level

    return result


def calculate_skill_evidence(
    assessment: Dict[str, Any],
    score: float,
    passed: bool,
) -> Dict[str, float]:
    """
    Calculate skill level evidence produced by an assessment attempt.

    Rule:
    - If the assessment is failed, NO skill evidence is generated ({})
    - If passed, generates skill evidence equal to the target level of each evaluated skill.
    """
    if not passed:
        return {}

    skills_data = assessment.get("skills", [])
    return parse_assessment_skill_levels(skills_data)


def evaluate_assessment_result(
    assessment: Optional[Dict[str, Any]],
    score: Any,
    user_answers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Evaluate an assessment submission attempt.

    Determines pass/fail based on passing_score and calculates
    skill level evidence.
    """
    if not assessment or not isinstance(assessment, dict):
        return {
            "success": False,
            "error": "Assessment not found.",
            "passed": False,
            "score": 0.0,
            "skill_evidence": {},
        }

    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        return {
            "success": False,
            "error": "Invalid score value.",
            "passed": False,
            "score": 0.0,
            "skill_evidence": {},
        }

    if not (0.0 <= numeric_score <= 100.0):
        return {
            "success": False,
            "error": "Score must be between 0 and 100.",
            "passed": False,
            "score": numeric_score,
            "skill_evidence": {},
        }

    passing_score = float(assessment.get("passing_score", 70.0))
    passed = numeric_score >= passing_score

    skill_evidence = calculate_skill_evidence(assessment, numeric_score, passed)

    return {
        "success": True,
        "assessment_id": assessment.get("id", ""),
        "title": assessment.get("title", ""),
        "score": numeric_score,
        "passing_score": passing_score,
        "passed": passed,
        "skill_evidence": skill_evidence,
    }


def apply_assessment_evidence(
    learner_skills: Any,
    skill_evidence: Dict[str, float],
) -> Dict[str, float]:
    """
    Update learner's skill levels with new assessment evidence.

    Rule: Never downgrade existing explicit skills.
    effective_level = max(current_level, evidence_level)
    """
    result: Dict[str, float] = {}

    # Parse existing learner skills
    if isinstance(learner_skills, dict):
        for k, v in learner_skills.items():
            sid = str(k).strip().lower()
            if sid:
                try:
                    result[sid] = float(v)
                except (TypeError, ValueError):
                    pass
    elif isinstance(learner_skills, list):
        for item in learner_skills:
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
                    or 0.0
                )
                if sid and isinstance(sid, str):
                    try:
                        result[sid.strip().lower()] = float(lvl)
                    except (TypeError, ValueError):
                        pass

    if not skill_evidence or not isinstance(skill_evidence, dict):
        return result

    for k, v in skill_evidence.items():
        sid = str(k).strip().lower()
        if not sid:
            continue
        try:
            ev_level = float(v)
        except (TypeError, ValueError):
            continue

        result[sid] = max(result.get(sid, 0.0), ev_level)

    return result
