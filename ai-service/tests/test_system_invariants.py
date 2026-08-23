from fastapi.testclient import TestClient

from app.main import app
from app.schemas.learning_path import LearningPathResponse
from app.services.assessment_catalog import (
    load_assessments_catalog,
    validate_assessment_catalog,
)
from app.services.learning_recommendation_engine import load_courses_catalog
from app.services.project_catalog import (
    load_projects_catalog,
    validate_project_catalog,
)

client = TestClient(app)


def test_invariant_no_completed_course_appears_in_generated_path():
    learner = {
        "skills": {"python": 5.0},
        "completed_courses": ["python-basics"],
        "completed_projects": [],
        "completed_assessments": [],
    }

    res = client.post(
        "/learning-path/generate",
        json={
            "learner": learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert res.status_code == 200
    data = res.json()

    course_ids = [c["id"] for c in data["courses"]]
    assert "python-basics" not in course_ids


def test_invariant_no_completed_project_is_recommended_again():
    learner = {
        "skills": {"python": 5.0},
        "completed_courses": [],
        "completed_projects": ["python-cli-project"],
        "completed_assessments": [],
    }

    res = client.post(
        "/learning-path/generate",
        json={
            "learner": learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert res.status_code == 200
    data = res.json()

    for milestone in data["milestones"]:
        assert "python-cli-project" not in milestone.get("project_ids", [])


def test_invariant_no_completed_assessment_is_attached_again():
    learner = {
        "skills": {"python": 5.0, "statistics": 5.0},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": ["python-foundations-assessment"],
    }

    res = client.post(
        "/learning-path/generate",
        json={
            "learner": learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert res.status_code == 200
    data = res.json()

    for milestone in data["milestones"]:
        assert "python-foundations-assessment" not in milestone.get(
            "assessment_ids", []
        )


def test_invariant_prerequisites_always_precede_dependent_courses():
    learner = {
        "skills": {},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }

    res = client.post(
        "/learning-path/generate",
        json={
            "learner": learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert res.status_code == 200
    data = res.json()

    courses = data["courses"]
    course_positions = {c["id"]: i for i, c in enumerate(courses)}

    for course in courses:
        cid = course["id"]
        for prereq in course.get("prerequisites", []):
            pskill = prereq.get("skill_id")
            # If a prerequisite course is in the generated path, its position must be less
            for other_c in courses:
                if other_c["id"] != cid:
                    other_skills = {
                        s.get("skill_id") for s in other_c.get("skills", [])
                    }
                    if pskill in other_skills:
                        if other_c["id"] in course_positions:
                            assert (
                                course_positions[other_c["id"]]
                                < course_positions[cid]
                            )


def test_invariant_skill_levels_never_decrease():
    learner = {"skills": {"python": 8.0}, "completed_courses": []}

    # 1. Complete course with target 5.0
    res_c = client.post(
        "/courses/python-basics/complete",
        json={"learner": learner},
    )
    assert res_c.status_code == 200
    learner_v1 = res_c.json()["learner"]
    assert learner_v1["skills"]["python"] == 8.0

    # 2. Complete project with target 5.0
    res_p = client.post(
        "/projects/python-cli-project/complete",
        json={"learner": learner_v1},
    )
    assert res_p.status_code == 200
    learner_v2 = res_p.json()["learner"]
    assert learner_v2["skills"]["python"] == 8.0

    # 3. Submit assessment with target 5.0
    res_a = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"learner": learner_v2, "score": 95},
    )
    assert res_a.status_code == 200
    learner_v3 = res_a.json()["learner"]
    assert learner_v3["skills"]["python"] == 8.0


def test_invariant_failed_assessments_do_not_create_positive_evidence():
    learner = {"skills": {"python": 2.0}, "completed_assessments": []}

    res = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"learner": learner, "score": 30},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["assessment_result"]["passed"] is False
    assert data["assessment_result"]["skill_evidence"] == {}
    assert data["learner"]["skills"]["python"] == 2.0


def test_invariant_passing_assessments_can_increase_skill_evidence():
    learner = {"skills": {"python": 2.0}, "completed_assessments": []}

    res = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"learner": learner, "score": 85},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["assessment_result"]["passed"] is True
    assert data["learner"]["skills"]["python"] == 5.0


def test_invariant_project_and_course_completion_is_idempotent():
    learner = {"skills": {"python": 2.0}, "completed_courses": [], "completed_projects": []}

    # Complete course twice
    c1 = client.post("/courses/python-basics/complete", json={"learner": learner}).json()["learner"]
    c2 = client.post("/courses/python-basics/complete", json={"learner": c1}).json()["learner"]
    assert c2["completed_courses"].count("python-basics") == 1

    # Complete project twice
    p1 = client.post("/projects/python-cli-project/complete", json={"learner": c2}).json()["learner"]
    p2 = client.post("/projects/python-cli-project/complete", json={"learner": p1}).json()["learner"]
    assert p2["completed_projects"].count("python-cli-project") == 1


def test_invariant_milestone_progress_agrees_with_completed_courses():
    learner = {
        "skills": {"python": 5.0},
        "completed_courses": ["python-basics"],
    }

    res = client.post(
        "/learning-path/generate",
        json={
            "learner": learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert res.status_code == 200
    data = res.json()

    progress = data["progress"]
    assert progress["completed_courses"] == 0
    assert progress["total_courses"] == len(data["courses"])


def test_invariant_api_output_validates_against_learning_path_response():
    learner = {"skills": {"python": 1.0}}

    res = client.post(
        "/learning-path/generate",
        json={
            "learner": learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert res.status_code == 200

    validated = LearningPathResponse.model_validate(res.json())
    assert validated.success is True
    assert validated.goal == "AI Engineer"
    assert isinstance(validated.progress.total_courses, int)


def test_invariant_real_catalogs_are_structurally_valid():
    courses = load_courses_catalog()
    projects = load_projects_catalog()
    assessments = load_assessments_catalog()

    assert len(courses) > 0
    assert len(projects) > 0
    assert len(assessments) > 0

    assert len(validate_project_catalog(projects)) == 0
    assert len(validate_assessment_catalog(assessments)) == 0


def test_invariant_full_learner_lifecycle_preserves_schema_and_ordering():
    learner = {
        "skills": {},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }

    # Step 1: Initial path
    r1 = client.post(
        "/learning-path/generate",
        json={"learner": learner, "goal": "AI Engineer"},
    )
    assert r1.status_code == 200
    m1 = LearningPathResponse.model_validate(r1.json())
    assert m1.success is True

    # Step 2: Course completion
    r2 = client.post(
        "/courses/python-basics/complete",
        json={"learner": learner},
    )
    assert r2.status_code == 200
    learner = r2.json()["learner"]

    # Step 3: Path update
    r3 = client.post(
        "/learning-path/generate",
        json={"learner": learner, "goal": "AI Engineer"},
    )
    assert r3.status_code == 200
    m3 = LearningPathResponse.model_validate(r3.json())
    assert m3.success is True
    assert "python-basics" not in [c["id"] for c in m3.courses]
