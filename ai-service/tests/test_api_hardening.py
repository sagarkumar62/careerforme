from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_generate_learning_path_missing_learner():
    response = client.post(
        "/learning-path/generate",
        json={"goal": "AI Engineer"},
    )
    assert response.status_code == 422


def test_generate_learning_path_empty_goal():
    response = client.post(
        "/learning-path/generate",
        json={"learner": {}, "goal": ""},
    )
    assert response.status_code == 422


def test_generate_learning_path_invalid_skill_gaps_type():
    response = client.post(
        "/learning-path/generate",
        json={"learner": {}, "goal": "AI Engineer", "skill_gaps": "not-a-list"},
    )
    assert response.status_code == 422


def test_generate_learning_path_everything_completed():
    response = client.post(
        "/learning-path/generate",
        json={
            "learner": {
                "skills": {
                    "python": 10.0,
                    "machine learning": 10.0,
                    "statistics": 10.0,
                    "deep learning": 10.0,
                    "nlp": 10.0,
                    "transformers": 10.0,
                    "data science": 10.0,
                    "databases": 10.0,
                    "data analysis": 10.0,
                    "machine learning projects": 10.0,
                },
                "completed_courses": [
                    "python-basics",
                    "stats-basics",
                    "ml-fundamentals",
                    "ml-advanced",
                ],
            },
            "goal": "AI Engineer",
            "skill_gaps": [],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_courses"] == 0
    assert data["total_milestones"] == 0
    assert data["courses"] == []
    assert data["milestones"] == []


def test_submit_assessment_missing_learner():
    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"score": 80},
    )
    assert response.status_code == 422


def test_submit_assessment_negative_score():
    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"learner": {}, "score": -10},
    )
    assert response.status_code == 422


def test_submit_assessment_score_too_high():
    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"learner": {}, "score": 150},
    )
    assert response.status_code == 422


def test_submit_assessment_unknown_id():
    response = client.post(
        "/assessments/unknown-assessment-id-123/submit",
        json={"learner": {}, "score": 80},
    )
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


def test_complete_course_missing_learner():
    response = client.post(
        "/courses/python-basics/complete",
        json={},
    )
    assert response.status_code == 422


def test_complete_course_unknown_id():
    response = client.post(
        "/courses/unknown-course-id-123/complete",
        json={"learner": {}},
    )
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


def test_complete_project_missing_learner():
    response = client.post(
        "/projects/python-cli-project/complete",
        json={},
    )
    assert response.status_code == 422


def test_complete_project_unknown_id():
    response = client.post(
        "/projects/unknown-project-id-123/complete",
        json={"learner": {}},
    )
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
