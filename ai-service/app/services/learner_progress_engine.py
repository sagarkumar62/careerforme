import copy
from typing import Any, Dict, List, Optional

from app.services.assessment_result_engine import (
    apply_assessment_evidence,
    evaluate_assessment_result,
)


def apply_assessment_result_to_learner(
    learner: Dict[str, Any],
    assessment: Optional[Dict[str, Any]],
    score: Any,
    user_answers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Apply assessment result to learner state adaptively.

    Does NOT mutate the input learner dict. Returns updated learner state
    along with assessment result details.
    """
    updated_learner = copy.deepcopy(learner or {})

    result = evaluate_assessment_result(assessment, score, user_answers)

    if not result.get("success"):
        return {
            "success": False,
            "error": result.get("error", "Assessment evaluation failed."),
            "learner": updated_learner,
            "assessment_result": result,
        }

    aid = assessment.get("id") if isinstance(assessment, dict) else None

    # Record assessment attempt in completed_assessments
    completed_assessments = updated_learner.get("completed_assessments") or []
    if not isinstance(completed_assessments, list):
        completed_assessments = []

    if aid and aid not in completed_assessments:
        completed_assessments.append(aid)

    updated_learner["completed_assessments"] = completed_assessments

    # If passed, apply skill evidence without downgrading existing skills
    if result.get("passed"):
        skill_evidence = result.get("skill_evidence", {})
        existing_skills = updated_learner.get("skills") or updated_learner.get(
            "acquired_skills"
        )
        updated_skills = apply_assessment_evidence(existing_skills, skill_evidence)
        updated_learner["skills"] = updated_skills

    return {
        "success": True,
        "learner": updated_learner,
        "assessment_result": result,
    }
