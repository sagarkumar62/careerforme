from pathlib import Path

from app.services.assessment_catalog import (
    get_assessment_skill_ids,
    load_assessments_catalog,
    validate_assessment_catalog,
)


def test_load_assessments_catalog():
    assessments = load_assessments_catalog()

    assert isinstance(assessments, list)
    assert len(assessments) == 8


def test_assessment_ids_are_unique():
    assessments = load_assessments_catalog()

    ids = [assessment["id"] for assessment in assessments]

    assert len(ids) == len(set(ids))


def test_get_assessment_skill_ids():
    assessments = load_assessments_catalog()

    assessment = next(
        a for a in assessments if a["id"] == "machine-learning-assessment"
    )

    skills = get_assessment_skill_ids(assessment)

    assert "machine learning" in skills
    assert "statistics" in skills


def test_assessment_catalog_is_valid():
    assessments = load_assessments_catalog()

    errors = validate_assessment_catalog(assessments)

    assert errors == []


def test_invalid_assessment_id():
    assessments = [
        {
            "id": "",
            "title": "Invalid Assessment",
            "type": "quiz",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [
                {"id": "q1", "skill_id": "python", "type": "multiple_choice"}
            ],
        }
    ]

    errors = validate_assessment_catalog(assessments)

    assert any(".id" in error for error in errors)


def test_invalid_skill_target_level():
    assessments = [
        {
            "id": "test-assessment",
            "title": "Test Assessment",
            "type": "quiz",
            "skills": [{"skill_id": "python", "target_level": 15.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [
                {"id": "q1", "skill_id": "python", "type": "multiple_choice"}
            ],
        }
    ]

    errors = validate_assessment_catalog(assessments)

    assert any("target_level" in error for error in errors)


def test_invalid_duration():
    assessments = [
        {
            "id": "test-assessment",
            "title": "Test Assessment",
            "type": "quiz",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 0,
            "passing_score": 70,
            "questions": [
                {"id": "q1", "skill_id": "python", "type": "multiple_choice"}
            ],
        }
    ]

    errors = validate_assessment_catalog(assessments)

    assert any("duration_minutes" in error for error in errors)


def test_invalid_passing_score():
    assessments = [
        {
            "id": "test-assessment",
            "title": "Test Assessment",
            "type": "quiz",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 120,
            "questions": [
                {"id": "q1", "skill_id": "python", "type": "multiple_choice"}
            ],
        }
    ]

    errors = validate_assessment_catalog(assessments)

    assert any("passing_score" in error for error in errors)


def test_invalid_question_structure():
    assessments = [
        {
            "id": "test-assessment",
            "title": "Test Assessment",
            "type": "quiz",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [
                {"id": "", "skill_id": "python", "type": "multiple_choice"}
            ],
        }
    ]

    errors = validate_assessment_catalog(assessments)

    assert any("questions[0].id" in error for error in errors)


def test_question_skill_must_belong_to_assessment():
    assessments = [
        {
            "id": "ml-assessment",
            "title": "ML Assessment",
            "type": "quiz",
            "skills": [{"skill_id": "machine learning", "target_level": 5.0}],
            "difficulty": "intermediate",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [
                {"id": "q1", "skill_id": "docker", "type": "multiple_choice"}
            ],
        }
    ]

    errors = validate_assessment_catalog(assessments)

    assert any(
        "docker" in error and "does not belong" in error for error in errors
    )
