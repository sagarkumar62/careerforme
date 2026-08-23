import pytest
from app.utils.normalization import normalize_skill_id
from app.services.skill_gap_engine import compute_skill_gaps, analyze_skill_gaps
from app.services.learning_recommendation_engine import (
    recommend_next_learning,
    parse_skill_gaps,
    compute_gap_coverage_score,
    rank_candidates
)


def test_step_1_and_2_normalize_skill_id_and_contract():
    # Step 2: Canonical normalize_skill_id
    assert normalize_skill_id("Machine Learning") == "machine-learning"
    assert normalize_skill_id("machine_learning") == "machine-learning"
    assert normalize_skill_id("machine-learning") == "machine-learning"
    # "Python 3" is mapped via taxonomy alias to canonical "python"
    assert normalize_skill_id("Python 3") == "python"

    # Step 1: Data Contract consistency in skill_gap_engine
    gaps = compute_skill_gaps(
        goal_requirements=[{"skillId": "machine-learning", "skillName": "Machine Learning", "targetLevel": 8, "importance": 0.85}],
        learner_skills=[{"name": "machine-learning", "level": 2}]
    )

    assert len(gaps) == 1
    g = gaps[0]
    assert g["skillId"] == "machine-learning"
    assert g["skillName"] == "Machine Learning"
    assert g["currentLevel"] == 2
    assert g["targetLevel"] == 8
    assert g["gap"] == 6
    assert "priority" in g
    assert g["status"] == "needs_work"



def test_step_1_learning_recommendation_engine_parse_gaps():
    raw_gaps = [
        {
            "skillId": "machine-learning",
            "skillName": "Machine Learning",
            "currentLevel": 2,
            "targetLevel": 8,
            "gap": 6,
            "priority": 0.85,
            "status": "needs_work"
        }
    ]
    parsed = parse_skill_gaps(raw_gaps)
    assert len(parsed) == 1
    p = parsed[0]
    assert p["skillId"] == "machine-learning"
    assert p["skillName"] == "Machine Learning"
    assert p["currentLevel"] == 2
    assert p["targetLevel"] == 8
    assert p["gap"] == 6


def test_step_4_course_target_level_gap_coverage():
    # Learner level = 2, Goal target = 8, Gap = 6
    gap_item = {
        "skillId": "python",
        "skillName": "Python",
        "currentLevel": 2,
        "targetLevel": 8,
        "gap": 6,
        "priority": 0.85
    }
    learner_skills = {"python": 2}

    # Course target level = 5 -> gained = min(5-2, 6) = 3 -> coverage = 3/6 = 0.50
    course_5 = {
        "id": "py-basics",
        "title": "Python Basics",
        "skills": [{"skill_id": "python", "target_level": 5.0}]
    }

    cov_5 = compute_gap_coverage_score(course_5, [gap_item], learner_skills)
    assert round(cov_5, 2) == 0.50

    # Course target level = 8 -> gained = min(8-2, 6) = 6 -> coverage = 6/6 = 1.00
    course_8 = {
        "id": "py-advanced",
        "title": "Python Advanced",
        "skills": [{"skill_id": "python", "target_level": 8.0}]
    }
    cov_8 = compute_gap_coverage_score(course_8, [gap_item], learner_skills)
    assert round(cov_8, 2) == 1.00


def test_step_3_and_5_prerequisite_separation_and_ranking_weights():
    courses = [
        {
            "id": "c-py-1",
            "title": "Python Basics",
            "skills": [{"skill_id": "python", "target_level": 5}],
            "prerequisites": [],
            "difficulty": "beginner"
        },
        {
            "id": "c-ml-1",
            "title": "Machine Learning Fundamentals",
            "skills": [{"skill_id": "machine-learning", "target_level": 7}],
            "prerequisites": [{"skill_id": "python", "minimum_level": 5}],
            "difficulty": "intermediate"
        }
    ]

    # Learner has Python level 2 (Python min level 5 required for ML course -> locked!)
    learner = {"skills": [{"name": "python", "level": 2}], "experience_level": "beginner"}
    gaps = [
        {"skillId": "python", "skillName": "Python", "currentLevel": 2, "targetLevel": 5, "gap": 3},
        {"skillId": "machine-learning", "skillName": "Machine Learning", "currentLevel": 0, "targetLevel": 7, "gap": 7}
    ]

    res = recommend_next_learning(learner, goal="Machine Learning Developer", skill_gaps=gaps, courses=courses, top_k=5)

    assert res["success"] is True
    assert "recommendations" in res
    assert "locked_recommendations" in res

    # Python Basics should be eligible in `recommendations`
    assert len(res["recommendations"]) == 1
    assert res["recommendations"][0]["course_id"] == "c-py-1"

    # ML Fundamentals should be locked in `locked_recommendations`
    assert len(res["locked_recommendations"]) == 1
    assert res["locked_recommendations"][0]["course_id"] == "c-ml-1"

    # Verify breakdown (Step 5 weights: 40% gap coverage, 25% goal align, 20% level fit, 15% prereq readiness)
    breakdown = res["recommendations"][0]["score_breakdown"]
    assert "skill_gap_coverage" in breakdown
    assert "goal_alignment" in breakdown
    assert "level_fit" in breakdown
    assert "prerequisite_readiness" in breakdown
    assert "quality_rating" not in breakdown  # Fake rating score removed for V1

