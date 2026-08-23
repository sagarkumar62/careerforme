from pathlib import Path

from app.services.project_catalog import (
    get_project_skill_ids,
    load_projects_catalog,
    validate_project_catalog,
)


def test_load_projects_catalog():
    projects = load_projects_catalog()

    assert isinstance(projects, list)
    assert len(projects) == 8


def test_project_ids_are_unique():
    projects = load_projects_catalog()

    ids = [project["id"] for project in projects]

    assert len(ids) == len(set(ids))


def test_project_skill_ids():
    projects = load_projects_catalog()

    project = next(
        project
        for project in projects
        if project["id"] == "ml-regression-project"
    )

    skills = get_project_skill_ids(project)

    assert "machine learning" in skills
    assert "python" in skills
    assert "statistics" in skills


def test_project_catalog_is_valid():
    projects = load_projects_catalog()

    errors = validate_project_catalog(projects)

    assert errors == []


def test_invalid_project_id():
    projects = [
        {
            "id": "",
            "title": "Invalid",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "difficulty": "beginner",
            "duration_hours": 5,
            "prerequisites": [],
            "deliverables": ["Something"],
        }
    ]

    errors = validate_project_catalog(projects)

    assert any(".id" in error for error in errors)


def test_invalid_skill_level():
    projects = [
        {
            "id": "test-project",
            "title": "Test",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 15,
                }
            ],
            "difficulty": "beginner",
            "duration_hours": 5,
            "prerequisites": [],
            "deliverables": ["Something"],
        }
    ]

    errors = validate_project_catalog(projects)

    assert any("target_level" in error for error in errors)


def test_invalid_duration():
    projects = [
        {
            "id": "test-project",
            "title": "Test",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "difficulty": "beginner",
            "duration_hours": 0,
            "prerequisites": [],
            "deliverables": ["Something"],
        }
    ]

    errors = validate_project_catalog(projects)

    assert any("duration_hours" in error for error in errors)


def test_invalid_difficulty():
    projects = [
        {
            "id": "test-project",
            "title": "Test",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "difficulty": "expert",
            "duration_hours": 5,
            "prerequisites": [],
            "deliverables": ["Something"],
        }
    ]

    errors = validate_project_catalog(projects)

    assert any("difficulty" in error for error in errors)
