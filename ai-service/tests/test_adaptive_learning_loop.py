from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_course_completion_changes_path():
    initial_learner = {
        "skills": {},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }

    # 1. Generate initial path
    path_res_1 = client.post(
        "/learning-path/generate",
        json={
            "learner": initial_learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert path_res_1.status_code == 200
    data_1 = path_res_1.json()

    initial_course_ids = [c["id"] for c in data_1["courses"]]
    assert "python-basics" in initial_course_ids

    # 2. Complete python-basics course
    complete_res = client.post(
        "/courses/python-basics/complete",
        json={"learner": initial_learner},
    )
    assert complete_res.status_code == 200
    comp_data = complete_res.json()
    updated_learner = comp_data["learner"]

    assert "python-basics" in updated_learner["completed_courses"]
    assert updated_learner["skills"]["python"] == 5.0

    # 3. Generate path again with updated learner
    path_res_2 = client.post(
        "/learning-path/generate",
        json={
            "learner": updated_learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert path_res_2.status_code == 200
    data_2 = path_res_2.json()

    new_course_ids = [c["id"] for c in data_2["courses"]]
    assert "python-basics" not in new_course_ids


def test_project_completion_updates_skill_and_path():
    initial_learner = {
        "skills": {"python": 1.0},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }

    # 1. Complete project
    comp_res = client.post(
        "/projects/python-cli-project/complete",
        json={"learner": initial_learner},
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    updated_learner = comp_data["learner"]

    assert "python-cli-project" in updated_learner["completed_projects"]
    assert updated_learner["skills"]["python"] == 5.0

    # 2. Generate path with updated learner
    path_res = client.post(
        "/learning-path/generate",
        json={
            "learner": updated_learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert path_res.status_code == 200
    data = path_res.json()

    assert data["success"] is True


def test_assessment_pass_unlocks_and_adapts_path():
    initial_learner = {
        "skills": {"python": 5.0, "statistics": 5.0},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }

    # 1. Submit passing assessment
    submit_res = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={
            "learner": initial_learner,
            "score": 85,
            "user_answers": {"q1": "A"},
        },
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()

    assert sub_data["assessment_result"]["passed"] is True
    updated_learner = sub_data["learner"]
    assert "python-foundations-assessment" in updated_learner["completed_assessments"]

    # 2. Generate path with updated learner
    path_res = client.post(
        "/learning-path/generate",
        json={
            "learner": updated_learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert path_res.status_code == 200
    data = path_res.json()

    # Ensure completed assessment is not re-attached
    for m in data["milestones"]:
        assert "python-foundations-assessment" not in m.get("assessment_ids", [])


def test_failed_assessment_does_not_create_skill_evidence():
    initial_learner = {
        "skills": {"python": 1.0},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }

    # 1. Submit failing assessment score
    submit_res = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={
            "learner": initial_learner,
            "score": 40,
            "user_answers": {"q1": "wrong"},
        },
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()

    assert sub_data["assessment_result"]["passed"] is False
    assert sub_data["assessment_result"]["skill_evidence"] == {}

    updated_learner = sub_data["learner"]
    assert updated_learner["skills"]["python"] == 1.0
    assert "python-foundations-assessment" in updated_learner["completed_assessments"]

    # 2. Generate path with updated learner
    path_res = client.post(
        "/learning-path/generate",
        json={
            "learner": updated_learner,
            "goal": "AI Engineer",
            "skill_gaps": [{"skill_id": "machine learning", "target_level": 7}],
        },
    )
    assert path_res.status_code == 200
    data = path_res.json()

    # Course list must still include python-basics because python skill remains 1.0
    course_ids = [c["id"] for c in data["courses"]]
    assert "python-basics" in course_ids


def test_full_adaptive_loop():
    learner_v0 = {
        "skills": {},
        "completed_courses": [],
        "completed_projects": [],
        "completed_assessments": [],
    }
    goal = "AI Engineer"
    skill_gaps = [{"skill_id": "machine learning", "target_level": 7}]

    # Step A: Initial Path
    p0_res = client.post(
        "/learning-path/generate",
        json={"learner": learner_v0, "goal": goal, "skill_gaps": skill_gaps},
    )
    assert p0_res.status_code == 200
    p0_data = p0_res.json()
    assert p0_data["total_courses"] == 4
    assert p0_data["progress"]["completed_courses"] == 0

    # Step B: Complete python-basics course
    c_res = client.post(
        "/courses/python-basics/complete",
        json={"learner": learner_v0},
    )
    assert c_res.status_code == 200
    learner_v1 = c_res.json()["learner"]

    # Step C: Path after course completion
    p1_res = client.post(
        "/learning-path/generate",
        json={"learner": learner_v1, "goal": goal, "skill_gaps": skill_gaps},
    )
    assert p1_res.status_code == 200
    p1_data = p1_res.json()
    assert p1_data["total_courses"] == 3
    remaining_ids = [c["id"] for c in p1_data["courses"]]
    assert "python-basics" not in remaining_ids

    # Step D: Complete python-cli-project
    proj_res = client.post(
        "/projects/python-cli-project/complete",
        json={"learner": learner_v1},
    )
    assert proj_res.status_code == 200
    learner_v2 = proj_res.json()["learner"]

    # Step E: Submit assessment
    ass_res = client.post(
        "/assessments/python-foundations-assessment/submit",
        json={"learner": learner_v2, "score": 90},
    )
    assert ass_res.status_code == 200
    learner_v3 = ass_res.json()["learner"]

    # Step F: Final Path
    p3_res = client.post(
        "/learning-path/generate",
        json={"learner": learner_v3, "goal": goal, "skill_gaps": skill_gaps},
    )
    assert p3_res.status_code == 200
    p3_data = p3_res.json()

    assert learner_v3["skills"]["python"] == 5.0
    assert "python-basics" in learner_v3["completed_courses"]
    assert "python-cli-project" in learner_v3["completed_projects"]
    assert "python-foundations-assessment" in learner_v3["completed_assessments"]
    assert p3_data["success"] is True
