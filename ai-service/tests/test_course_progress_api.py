from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_complete_course_updates_skill():
    payload = {
        "learner": {"skills": {"python": 2.0}, "completed_courses": []},
    }

    response = client.post(
        "/courses/python-basics/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["learner"]["skills"]["python"] == 5.0


def test_complete_course_records_course():
    payload = {
        "learner": {"skills": {"python": 2.0}, "completed_courses": []},
    }

    response = client.post(
        "/courses/python-basics/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert "python-basics" in data["learner"]["completed_courses"]
    assert data["course_completion"]["course_id"] == "python-basics"


def test_complete_course_preserves_higher_skill():
    payload = {
        "learner": {"skills": {"python": 8.0}, "completed_courses": []},
    }

    response = client.post(
        "/courses/python-basics/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["skills"]["python"] == 8.0


def test_complete_course_updates_multiple_skills():
    payload = {
        "learner": {"skills": {"data analysis": 1.0, "python": 1.0}, "completed_courses": []},
    }

    response = client.post(
        "/courses/data-analysis-basics/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["skills"]["python"] >= 5.0
    assert data["learner"]["skills"]["data analysis"] >= 5.0


def test_complete_unknown_course():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_courses": []},
    }

    response = client.post(
        "/courses/non-existent-course-id/complete",
        json=payload,
    )

    assert response.status_code == 404


def test_complete_course_does_not_mutate_request():
    learner = {"skills": {"python": 2.0}, "completed_courses": []}
    payload = {"learner": learner}

    response = client.post(
        "/courses/python-basics/complete",
        json=payload,
    )

    assert response.status_code == 200
    assert learner["skills"]["python"] == 2.0
    assert learner["completed_courses"] == []


def test_repeated_course_completion_is_idempotent():
    payload = {
        "learner": {
            "skills": {"python": 5.0},
            "completed_courses": ["python-basics"],
        },
    }

    response = client.post(
        "/courses/python-basics/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["completed_courses"].count("python-basics") == 1
