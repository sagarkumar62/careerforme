import pytest
from app.services.prerequisite_engine import (
    PrerequisiteEngine,
    check_course_prerequisites,
    filter_courses_by_prerequisites,
    parse_prerequisites_spec,
    parse_learner_skills_map
)


def test_exact_prompt_example():
    """
    Tests the exact example from the prompt:
    Course requires: Python >= 5, Statistics >= 5
    Learner has: Python = 7, Statistics = 3
    Result: eligible = False, missingPrerequisites = [{"skill": "statistics", "required": 5, "current": 3}]
    """
    course = {
        "title": "Machine Learning",
        "prerequisites": [
            {"skill": "python", "required": 5},
            {"skill": "statistics", "required": 5}
        ]
    }

    learner = {
        "python": 7,
        "statistics": 3
    }

    res = check_course_prerequisites(course, learner)

    assert res["eligible"] is False
    assert len(res["missingPrerequisites"]) == 1

    missing = res["missingPrerequisites"][0]
    assert missing["skill"] == "statistics"
    assert missing["required"] == 5
    assert missing["current"] == 3


def test_eligible_learner():
    course = {
        "title": "Machine Learning",
        "prerequisites": [
            {"skill": "python", "required": 5},
            {"skill": "statistics", "required": 5}
        ]
    }

    learner = {
        "python": 7,
        "statistics": 5
    }

    res = check_course_prerequisites(course, learner)

    assert res["eligible"] is True
    assert res["missingPrerequisites"] == []


def test_batch_course_filtering():
    courses = [
        {
            "id": "ml-101",
            "title": "Machine Learning",
            "prerequisites": {"python": 5, "statistics": 5}
        },
        {
            "id": "py-101",
            "title": "Python Basics",
            "prerequisites": {"python": 1}
        }
    ]

    learner = {"python": 3, "statistics": 2}

    batch_res = filter_courses_by_prerequisites(courses, learner)

    assert batch_res["totalEvaluated"] == 2
    assert batch_res["eligibleCount"] == 1
    assert batch_res["ineligibleCount"] == 1

    eligible_ids = [c["id"] for c in batch_res["eligibleCourses"]]
    ineligible_ids = [c["id"] for c in batch_res["ineligibleCourses"]]

    assert "py-101" in eligible_ids
    assert "ml-101" in ineligible_ids


def test_engine_class_interface():
    engine = PrerequisiteEngine()
    res = engine.check(
        {"prerequisites": {"docker": 3}},
        {"docker": 1}
    )
    assert res["eligible"] is False
    assert res["missingPrerequisites"][0]["skill"] == "docker"
    assert res["missingPrerequisites"][0]["required"] == 3
    assert res["missingPrerequisites"][0]["current"] == 1
