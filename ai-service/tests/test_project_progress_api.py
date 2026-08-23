from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_complete_project_updates_skill():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_projects": []},
    }

    response = client.post(
        "/projects/python-cli-project/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["learner"]["skills"]["python"] == 5.0


def test_complete_project_records_project():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_projects": []},
    }

    response = client.post(
        "/projects/python-cli-project/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert "python-cli-project" in data["learner"]["completed_projects"]
    assert data["project_completion"]["project_id"] == "python-cli-project"


def test_complete_project_preserves_higher_skill():
    payload = {
        "learner": {"skills": {"python": 8.0}, "completed_projects": []},
    }

    response = client.post(
        "/projects/python-cli-project/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["skills"]["python"] == 8.0


def test_complete_project_updates_multiple_skills():
    payload = {
        "learner": {"skills": {"machine learning": 1.0, "python": 1.0}, "completed_projects": []},
    }

    response = client.post(
        "/projects/ml-model-engineering-project/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["skills"]["machine learning"] >= 8.0
    assert data["learner"]["skills"]["python"] >= 8.0


def test_complete_unknown_project():
    payload = {
        "learner": {"skills": {"python": 1.0}, "completed_projects": []},
    }

    response = client.post(
        "/projects/non-existent-project-id/complete",
        json=payload,
    )

    assert response.status_code == 404


def test_complete_project_does_not_mutate_request():
    learner = {"skills": {"python": 1.0}, "completed_projects": []}
    payload = {"learner": learner}

    response = client.post(
        "/projects/python-cli-project/complete",
        json=payload,
    )

    assert response.status_code == 200
    assert learner["skills"]["python"] == 1.0
    assert learner["completed_projects"] == []


def test_repeated_project_completion_is_idempotent():
    payload = {
        "learner": {
            "skills": {"python": 5.0},
            "completed_projects": ["python-cli-project"],
        },
    }

    response = client.post(
        "/projects/python-cli-project/complete",
        json=payload,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["learner"]["completed_projects"].count("python-cli-project") == 1
