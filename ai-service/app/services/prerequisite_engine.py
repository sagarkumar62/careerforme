"""
Prerequisite Engine Service

Single Responsibility:
    Evaluates whether a learner meets all skill prerequisites for a course/topic.

Input:
    Course / Prerequisite Requirements + Learner Skills

Output Structure:
    {
      "eligible": false,
      "missingPrerequisites": [
        {
          "skill": "statistics",
          "required": 5,
          "current": 3
        }
      ]
    }
"""

import re
from typing import Dict, List, Any, Union, Optional
from app.utils.normalization import normalize_skill_name, _parse_level


def _slugify_skill(name: str) -> str:
    """Converts a skill name into a clean, normalized slug."""
    if not name or not isinstance(name, str):
        return "unknown"
    clean = name.strip().lower()
    clean = re.sub(r'[^a-z0-9]+', '-', clean)
    return clean.strip('-') or "unknown"


def parse_learner_skills_map(learner_skills: Any) -> Dict[str, int]:
    """
    Parses various representations of learner skills into a normalized map:
    { "python": 7, "statistics": 3 }
    """
    skill_map: Dict[str, int] = {}

    if isinstance(learner_skills, dict):
        if "skills" in learner_skills and isinstance(learner_skills["skills"], list):
            return parse_learner_skills_map(learner_skills["skills"])

        for k, v in learner_skills.items():
            canon = normalize_skill_name(str(k))
            slug = _slugify_skill(canon)
            level = _parse_level(v)
            skill_map[slug] = level
            skill_map[canon.lower()] = level

    elif isinstance(learner_skills, list):
        for item in learner_skills:
            if isinstance(item, dict):
                raw_name = item.get("name") or item.get("skill") or item.get("skillId") or item.get("title") or ""
                canon = normalize_skill_name(str(raw_name))
                slug = _slugify_skill(canon)
                level = _parse_level(item.get("level") or item.get("currentLevel") or item.get("proficiency") or 0)
                if slug != "unknown":
                    skill_map[slug] = level
                    skill_map[canon.lower()] = level
            elif isinstance(item, str):
                canon = normalize_skill_name(item)
                slug = _slugify_skill(canon)
                if slug != "unknown":
                    skill_map[slug] = 1
                    skill_map[canon.lower()] = 1

    return skill_map


def parse_prerequisites_spec(prerequisites_input: Any) -> List[Dict[str, Any]]:
    """
    Parses course prerequisites into a standardized list of requirement dicts:
    [
        {"skill": "statistics", "required": 5},
        {"skill": "python", "required": 5}
    ]
    """
    prereqs: List[Dict[str, Any]] = []

    # If course object was passed, extract prerequisites attribute
    if isinstance(prerequisites_input, dict) and ("prerequisites" in prerequisites_input or "required_skills" in prerequisites_input):
        raw_prereqs = prerequisites_input.get("prerequisites") or prerequisites_input.get("required_skills")
        return parse_prerequisites_spec(raw_prereqs)

    if isinstance(prerequisites_input, list):
        for item in prerequisites_input:
            if isinstance(item, dict):
                raw_name = item.get("skill") or item.get("name") or item.get("skillId") or item.get("title") or ""
                canon = normalize_skill_name(str(raw_name))
                slug = _slugify_skill(canon)
                req_level = _parse_level(item.get("required") or item.get("requiredLevel") or item.get("level") or 1)
                if req_level == 0:
                    req_level = 1
                prereqs.append({
                    "skill": slug,
                    "displaySkill": canon,
                    "required": req_level
                })
            elif isinstance(item, str):
                canon = normalize_skill_name(item)
                slug = _slugify_skill(canon)
                prereqs.append({
                    "skill": slug,
                    "displaySkill": item,
                    "required": 1
                })

    elif isinstance(prerequisites_input, dict):
        for k, v in prerequisites_input.items():
            canon = normalize_skill_name(str(k))
            slug = _slugify_skill(canon)
            req_level = _parse_level(v)
            if req_level == 0:
                req_level = 1
            prereqs.append({
                "skill": slug,
                "displaySkill": str(k),
                "required": req_level
            })

    return prereqs


def check_course_prerequisites(
    course_or_prereqs: Any,
    learner_skills: Any
) -> Dict[str, Any]:
    """
    Evaluates a single course or prerequisite spec against learner skills.

    Example Output:
    {
      "eligible": false,
      "missingPrerequisites": [
        {
          "skill": "statistics",
          "required": 5,
          "current": 3
        }
      ]
    }
    """
    prereqs = parse_prerequisites_spec(course_or_prereqs)
    learner_map = parse_learner_skills_map(learner_skills)

    missing_prerequisites: List[Dict[str, Any]] = []

    for prereq in prereqs:
        s_id = prereq["skill"]
        display_name = prereq.get("displaySkill") or s_id
        req_level = prereq["required"]

        # Check learner's current level for this skill
        current_level = learner_map.get(
            s_id,
            learner_map.get(display_name.lower(), 0)
        )

        if current_level < req_level:
            missing_prerequisites.append({
                "skill": s_id,
                "required": req_level,
                "current": current_level
            })

    is_eligible = len(missing_prerequisites) == 0

    return {
        "eligible": is_eligible,
        "missingPrerequisites": missing_prerequisites
    }


def filter_courses_by_prerequisites(
    courses: List[Dict[str, Any]],
    learner_skills: Any
) -> Dict[str, Any]:
    """
    Batch evaluates a list of courses against learner skills, separating them
    into eligible and ineligible courses.
    """
    learner_map = parse_learner_skills_map(learner_skills)
    eligible_courses = []
    ineligible_courses = []

    for course in courses:
        eval_res = check_course_prerequisites(course, learner_map)
        course_copy = dict(course)
        course_copy["prerequisite_evaluation"] = eval_res

        if eval_res["eligible"]:
            eligible_courses.append(course_copy)
        else:
            ineligible_courses.append(course_copy)

    return {
        "eligibleCourses": eligible_courses,
        "ineligibleCourses": ineligible_courses,
        "totalEvaluated": len(courses),
        "eligibleCount": len(eligible_courses),
        "ineligibleCount": len(ineligible_courses)
    }


# -------------------------------------------------------------------------
# Object-Oriented Interface Wrapper
# -------------------------------------------------------------------------

class PrerequisiteEngine:
    """
    Engine class providing prerequisite evaluation for courses and learners.
    """

    def check(self, course_or_prereqs: Any, learner_skills: Any) -> Dict[str, Any]:
        """Checks prerequisite eligibility for a single course."""
        return check_course_prerequisites(course_or_prereqs, learner_skills)

    def filter(self, courses: List[Dict[str, Any]], learner_skills: Any) -> Dict[str, Any]:
        """Filters a list of courses into eligible vs ineligible."""
        return filter_courses_by_prerequisites(courses, learner_skills)
