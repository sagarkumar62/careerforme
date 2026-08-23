from app.services.assessment_result_engine import (
    apply_assessment_evidence,
    calculate_skill_evidence,
    evaluate_assessment_result,
)


def test_passed_assessment_generates_skill_evidence():
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }
    result = evaluate_assessment_result(assessment, score=82)

    assert result["success"] is True
    assert result["passed"] is True
    assert result["score"] == 82
    assert result["skill_evidence"] == {"python": 5.0}


def test_failed_assessment_generates_no_skill_evidence():
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }
    result = evaluate_assessment_result(assessment, score=52)

    assert result["success"] is True
    assert result["passed"] is False
    assert result["score"] == 52
    assert result["skill_evidence"] == {}


def test_skill_evidence_respects_target_level():
    assessment = {
        "id": "ml-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "machine learning", "target_level": 7.0}],
    }
    result = evaluate_assessment_result(assessment, score=90)

    assert result["passed"] is True
    assert result["skill_evidence"]["machine learning"] == 7.0


def test_existing_higher_skill_is_not_downgraded():
    learner_skills = {"python": 7.0}
    skill_evidence = {"python": 5.0}

    updated = apply_assessment_evidence(learner_skills, skill_evidence)

    assert updated["python"] == 7.0


def test_multiple_assessment_skills_generate_independent_evidence():
    assessment = {
        "id": "ml-assessment",
        "passing_score": 70,
        "skills": [
            {"skill_id": "python", "target_level": 5.0},
            {"skill_id": "statistics", "target_level": 4.0},
            {"skill_id": "machine learning", "target_level": 5.0},
        ],
    }
    result = evaluate_assessment_result(assessment, score=80)

    assert result["passed"] is True
    assert result["skill_evidence"] == {
        "python": 5.0,
        "statistics": 4.0,
        "machine learning": 5.0,
    }


def test_zero_score():
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }
    result = evaluate_assessment_result(assessment, score=0)

    assert result["success"] is True
    assert result["passed"] is False
    assert result["score"] == 0
    assert result["skill_evidence"] == {}


def test_perfect_score():
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }
    result = evaluate_assessment_result(assessment, score=100)

    assert result["success"] is True
    assert result["passed"] is True
    assert result["score"] == 100
    assert result["skill_evidence"] == {"python": 5.0}


def test_invalid_score():
    assessment = {
        "id": "python-assessment",
        "passing_score": 70,
        "skills": [{"skill_id": "python", "target_level": 5.0}],
    }

    res_negative = evaluate_assessment_result(assessment, score=-10)
    assert res_negative["success"] is False
    assert "Score must be between 0 and 100" in res_negative["error"]

    res_overflow = evaluate_assessment_result(assessment, score=150)
    assert res_overflow["success"] is False
    assert "Score must be between 0 and 100" in res_overflow["error"]

    res_non_numeric = evaluate_assessment_result(assessment, score="invalid")
    assert res_non_numeric["success"] is False
    assert "Invalid score value" in res_non_numeric["error"]


def test_assessment_not_found():
    result = evaluate_assessment_result(None, score=80)

    assert result["success"] is False
    assert "Assessment not found" in result["error"]
    assert result["passed"] is False
    assert result["skill_evidence"] == {}
