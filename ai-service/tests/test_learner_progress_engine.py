from app.services.learner_progress_engine import (
    apply_assessment_result_to_learner,
)


def test_passed_assessment_updates_learner_skills():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=80)

    assert res["success"] is True
    assert res["learner"]["skills"]["python"] == 5.0


def test_failed_assessment_does_not_increase_skills():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=50)

    assert res["success"] is True
    assert res["learner"]["skills"]["python"] == 1.0


def test_existing_higher_skill_is_preserved():
    learner = {"skills": {"python": 8.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=90)

    assert res["success"] is True
    assert res["learner"]["skills"]["python"] == 8.0


def test_completed_assessment_is_recorded():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=85)

    assert "python-assessment" in res["learner"]["completed_assessments"]


def test_failed_assessment_is_still_recorded_as_attempted():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=40)

    assert res["success"] is True
    assert "python-assessment" in res["learner"]["completed_assessments"]


def test_multiple_skills_are_updated():
    learner = {
        "skills": {"python": 1.0, "statistics": 1.0},
        "completed_assessments": [],
    }
    assessment = {
        "id": "ml-assessment",
        "passing_score": 70,
        "skills": [
            {"skill_id": "python", "target_level": 5.0},
            {"skill_id": "statistics", "target_level": 4.0},
        ],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=80)

    assert res["success"] is True
    assert res["learner"]["skills"]["python"] == 5.0
    assert res["learner"]["skills"]["statistics"] == 4.0


def test_assessment_result_is_returned():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res = apply_assessment_result_to_learner(learner, assessment, score=88)

    assert "assessment_result" in res
    assert res["assessment_result"]["score"] == 88
    assert res["assessment_result"]["passed"] is True


def test_original_learner_is_not_mutated():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    apply_assessment_result_to_learner(learner, assessment, score=85)

    assert learner["skills"]["python"] == 1.0
    assert learner["completed_assessments"] == []
