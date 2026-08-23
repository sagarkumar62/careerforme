from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_generate_learning_path():
    payload = {
        "learner": {"skills": {"python": 1.0}},
        "goal": "Machine Learning Engineer",
        "skill_gaps": [{"skill_id": "python", "target_level": 5.0}],
    }

    response = client.post("/learning-path/generate", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data.get("success") is True
    assert data.get("goal") == "Machine Learning Engineer"
    assert "courses" in data
    assert "milestones" in data
    assert "progress" in data
    assert isinstance(data["courses"], list)
    assert isinstance(data["milestones"], list)


def test_learning_path_requires_goal():
    payload = {
        "learner": {"skills": {"python": 1.0}},
        "goal": "",
        "skill_gaps": [],
    }

    response = client.post("/learning-path/generate", json=payload)

    assert response.status_code == 422


def test_learning_path_accepts_empty_skill_gaps():
    payload = {
        "learner": {"skills": {"python": 1.0}},
        "goal": "Python Developer",
        "skill_gaps": [],
    }

    response = client.post("/learning-path/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True


def test_learning_path_handles_completed_courses():
    payload = {
        "learner": {
            "skills": {"python": 5.0},
            "completed_courses": ["course-python-101"],
        },
        "goal": "Machine Learning Engineer",
        "skill_gaps": [{"skill_id": "machine-learning", "target_level": 5.0}],
    }

    response = client.post("/learning-path/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True


def test_learning_path_includes_projects_and_assessments():
    payload = {
        "learner": {"skills": {"python": 1.0}},
        "goal": "Python Developer",
        "skill_gaps": [{"skill_id": "python", "target_level": 5.0}],
    }

    response = client.post("/learning-path/generate", json=payload)

    assert response.status_code == 200
    data = response.json()

    milestones = data.get("milestones", [])
    assert len(milestones) > 0

    first_milestone = milestones[0]
    assert "project_ids" in first_milestone
    assert "projects" in first_milestone
    assert "assessment_ids" in first_milestone
    assert "assessments" in first_milestone


def test_learning_path_response_contract():
    payload = {
        "learner": {
            "skills": {},
            "completed_courses": [],
            "completed_projects": [],
            "completed_assessments": [],
        },
        "goal": "AI Engineer",
        "skill_gaps": [
            {
                "skill_id": "machine learning",
                "target_level": 7,
            }
        ],
    }

    response = client.post("/learning-path/generate", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data["success"], bool)
    assert data["success"] is True
    assert data["goal"] == "AI Engineer"
    assert isinstance(data["total_courses"], int)
    assert isinstance(data["total_milestones"], int)
    assert isinstance(data["courses"], list)
    assert isinstance(data["milestones"], list)
    assert isinstance(data["progress"], dict)

    progress = data["progress"]

    assert "total_courses" in progress
    assert "completed_courses" in progress
    assert "overall_progress" in progress
    assert "total_milestones" in progress
    assert "completed_milestones" in progress
    assert isinstance(progress["total_courses"], int)
    assert isinstance(progress["completed_courses"], int)
    assert isinstance(progress["overall_progress"], float)
    assert isinstance(progress["total_milestones"], int)
    assert isinstance(progress["completed_milestones"], int)
