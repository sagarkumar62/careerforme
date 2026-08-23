from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_submit_assessment_pass():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_assessments": []},
        "score": 82,
        "user_answers": {"python-foundations-q1": "A"},
    }

    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["assessment_result"]["passed"] is True
    assert data["assessment_result"]["score"] == 82
    assert "python-foundations-assessment" in data["learner"]["completed_assessments"]


def test_submit_assessment_fail():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_assessments": []},
        "score": 50,
        "user_answers": {"python-foundations-q1": "B"},
    }

    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["assessment_result"]["passed"] is False
    assert data["learner"]["skills"]["python"] == 1.0
    assert "python-foundations-assessment" in data["learner"]["completed_assessments"]


def test_submit_assessment_updates_skill():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_assessments": []},
        "score": 85,
    }

    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["skills"]["python"] == 5.0


def test_submit_assessment_preserves_higher_skill():
    payload = {
        "learner": {"skills": {"python": 8.0}, "completed_assessments": []},
        "score": 90,
    }

    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["skills"]["python"] == 8.0


def test_submit_unknown_assessment():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_assessments": []},
        "score": 80,
    }

    response = client.post(
        "/assessments/non-existent-assessment-id/submit",
        json=payload,
    )

    assert response.status_code == 404


def test_submit_invalid_score():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_assessments": []},
        "score": 150,  # Invalid: score > 100
    }

    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json=payload,
    )

    assert response.status_code == 422


def test_submit_assessment_does_not_mutate_request():
    learner = {"skills": {"python": 1.0}, "completed_assessments": []}
    payload = {
        "learner": learner,
        "score": 80,
    }

    response = client.post(
        "/assessments/python-foundations-assessment/submit",
        json=payload,
    )

    assert response.status_code == 200
    assert learner["skills"]["python"] == 1.0
    assert learner["completed_assessments"] == []
