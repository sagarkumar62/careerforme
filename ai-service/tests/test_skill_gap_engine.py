import pytest
from app.services.skill_gap_engine import (
    SkillGapEngine,
    analyze_skill_gaps,
    compute_skill_gaps,
    calculate_single_skill_gap,
    parse_learner_skill_levels,
    parse_goal_requirements
)


def test_output_schema_structure():
    goal_requirements = [
        {"skillId": "statistics", "skillName": "Statistics", "targetLevel": 7, "importance": 0.91}
    ]
    learner_skills = [
        {"name": "Statistics", "level": 3}
    ]

    result = analyze_skill_gaps(goal_requirements, learner_skills)

    assert result["success"] is True
    assert "skillGaps" in result
    assert len(result["skillGaps"]) == 1

    item = result["skillGaps"][0]

    # Verify exact schema key names and types requested in prompt
    assert item["skillId"] == "statistics"
    assert item["currentLevel"] == 3
    assert item["targetLevel"] == 7
    assert item["gap"] == 4
    assert isinstance(item["priority"], float)
    assert 0.0 <= item["priority"] <= 1.0
    assert item["status"] in ("needs_work", "mastered", "missing")


def test_no_course_recommendations():
    goal_requirements = ["Python", "Docker"]
    learner_skills = [{"name": "Python", "level": 2}]

    result = analyze_skill_gaps(goal_requirements, learner_skills)

    # Ensure NO course recommendations are present in the output
    assert "courses" not in result
    assert "recommendations" not in result
    for gap in result["skillGaps"]:
        assert "recommended_courses" not in gap
        assert "courses" not in gap


def test_skill_gap_calculation_logic():
    req = {"skillId": "python", "skillName": "Python", "targetLevel": 5, "importance": 0.8}

    # Case 1: Gap exists
    gap_info = calculate_single_skill_gap(req, {"python": 2})
    assert gap_info["currentLevel"] == 2
    assert gap_info["targetLevel"] == 5
    assert gap_info["gap"] == 3
    assert gap_info["status"] == "needs_work"
    assert gap_info["priority"] > 0.0

    # Case 2: Mastered
    mastered_info = calculate_single_skill_gap(req, {"python": 5})
    assert mastered_info["currentLevel"] == 5
    assert mastered_info["gap"] == 0
    assert mastered_info["status"] == "mastered"
    assert mastered_info["priority"] == 0.0

    # Case 3: Missing skill
    missing_info = calculate_single_skill_gap(req, {})
    assert missing_info["currentLevel"] == 0
    assert missing_info["gap"] == 5
    assert missing_info["status"] in ("needs_work", "missing")


def test_goal_requirements_string_resolution():
    learner_skills = [{"name": "Python", "level": 2}]
    result = analyze_skill_gaps("python-developer", learner_skills)

    assert result["success"] is True
    assert len(result["skillGaps"]) > 0
    assert result["goal"] == "python-developer"


def test_skill_gap_engine_class():
    engine = SkillGapEngine()
    gaps = engine.compute(
        [{"skillId": "dsa", "targetLevel": 4}],
        {"dsa": 1}
    )
    assert len(gaps) == 1
    assert gaps[0]["skillId"] == "dsa"
    assert gaps[0]["gap"] == 3
