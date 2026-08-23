from app.services.project_recommendation_engine import (
    calculate_project_level_fit,
    calculate_project_path_alignment,
    calculate_project_skill_coverage,
    check_project_prerequisites,
    parse_project_skills,
    rank_project_candidates,
    recommend_projects,
)


def test_parse_project_skills():
    skills = [
        {"skill_id": "python", "target_level": 5.0},
        {"skill_id": "machine learning", "target_level": 5.0},
    ]
    res = parse_project_skills(skills)

    assert res["python"] == 5.0
    assert res["machine learning"] == 5.0


def test_project_skill_coverage_partial():
    project = {"skills": [{"skill_id": "python", "target_level": 5.0}]}
    skill_gaps = [
        {"skill_id": "python", "current_level": 0.0, "target_level": 10.0}
    ]
    cov = calculate_project_skill_coverage(project, skill_gaps)

    assert cov == 0.5


def test_project_skill_coverage_full():
    project = {"skills": [{"skill_id": "python", "target_level": 5.0}]}
    skill_gaps = [
        {"skill_id": "python", "current_level": 0.0, "target_level": 5.0}
    ]
    cov = calculate_project_skill_coverage(project, skill_gaps)

    assert cov == 1.0


def test_project_skill_coverage_does_not_reward_overshooting():
    project = {"skills": [{"skill_id": "python", "target_level": 8.0}]}
    skill_gaps = [
        {"skill_id": "python", "current_level": 0.0, "target_level": 5.0}
    ]
    cov = calculate_project_skill_coverage(project, skill_gaps)

    assert cov == 1.0


def test_project_prerequisites_satisfied():
    project = {
        "prerequisites": [{"skill_id": "python", "minimum_level": 4.0}]
    }
    learner_skills = {"python": 5.0}
    res = check_project_prerequisites(project, learner_skills)

    assert res["eligible"] is True
    assert res["missing_prerequisites"] == []


def test_project_prerequisites_missing():
    project = {
        "prerequisites": [{"skill_id": "python", "minimum_level": 4.0}]
    }
    learner_skills = {"python": 2.0}
    res = check_project_prerequisites(project, learner_skills)

    assert res["eligible"] is False
    assert len(res["missing_prerequisites"]) == 1
    assert res["missing_prerequisites"][0]["skill"] == "python"


def test_multiple_project_prerequisites():
    project = {
        "prerequisites": [
            {"skill_id": "python", "minimum_level": 5.0},
            {"skill_id": "statistics", "minimum_level": 4.0},
        ]
    }
    learner_skills = {"python": 5.0, "statistics": 2.0}
    res = check_project_prerequisites(project, learner_skills)

    assert res["eligible"] is False
    assert len(res["missing_prerequisites"]) == 1
    assert res["missing_prerequisites"][0]["skill"] == "statistics"


def test_project_level_fit():
    beginner_proj = {
        "difficulty": "beginner",
        "skills": [{"skill_id": "python", "target_level": 3.0}],
    }
    advanced_proj = {
        "difficulty": "advanced",
        "skills": [{"skill_id": "python", "target_level": 8.0}],
    }
    learner_skills = {"python": 1.0}

    fit_beg = calculate_project_level_fit(beginner_proj, learner_skills)
    fit_adv = calculate_project_level_fit(advanced_proj, learner_skills)

    assert fit_beg > fit_adv


def test_project_ranking_prefers_skill_gap_coverage():
    proj_high_cov = {
        "id": "p1",
        "title": "High Cov",
        "skills": [{"skill_id": "python", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
    }
    proj_low_cov = {
        "id": "p2",
        "title": "Low Cov",
        "skills": [{"skill_id": "html-css", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
    }
    skill_gaps = [{"skill_id": "python", "current_level": 0, "target_level": 5}]

    ranked = rank_project_candidates(
        [proj_low_cov, proj_high_cov], skill_gaps, {}
    )

    assert ranked[0]["project_id"] == "p1"


def test_project_ranking_prefers_path_alignment():
    proj_aligned = {
        "id": "p1",
        "title": "Aligned",
        "skills": [{"skill_id": "machine learning", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "intermediate",
    }
    proj_unaligned = {
        "id": "p2",
        "title": "Unaligned",
        "skills": [{"skill_id": "react", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "intermediate",
    }
    current_milestone_skills = {"machine learning"}

    ranked = rank_project_candidates(
        [proj_unaligned, proj_aligned],
        [],
        {},
        current_milestone_skills=current_milestone_skills,
    )

    assert ranked[0]["project_id"] == "p1"


def test_locked_projects_are_not_main_recommendations():
    proj_locked = {
        "id": "p_locked",
        "title": "Locked Proj",
        "skills": [{"skill_id": "python", "target_level": 8.0}],
        "prerequisites": [{"skill_id": "python", "minimum_level": 5.0}],
        "difficulty": "advanced",
    }
    proj_eligible = {
        "id": "p_eligible",
        "title": "Eligible Proj",
        "skills": [{"skill_id": "python", "target_level": 4.0}],
        "prerequisites": [],
        "difficulty": "beginner",
    }

    res = recommend_projects(
        learner={"skills": {"python": 1.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        projects=[proj_locked, proj_eligible],
    )

    assert len(res["recommendations"]) == 1
    assert res["recommendations"][0]["project_id"] == "p_eligible"
    assert len(res["locked_recommendations"]) == 1
    assert res["locked_recommendations"][0]["project_id"] == "p_locked"


def test_recommend_projects_output_structure():
    res = recommend_projects(
        learner={"skills": {"python": 5.0, "statistics": 4.0}},
        skill_gaps=[{"skill_id": "machine learning", "target_level": 5.0}],
    )

    assert res["success"] is True
    assert isinstance(res["recommendations"], list)
    assert len(res["recommendations"]) > 0

    top_rec = res["recommendations"][0]
    assert "project_id" in top_rec
    assert "title" in top_rec
    assert "match_score" in top_rec
    assert "score_breakdown" in top_rec
    assert "reason" in top_rec
    assert "skill_gap_coverage" in top_rec["score_breakdown"]
    assert "learning_path_alignment" in top_rec["score_breakdown"]
    assert "level_fit" in top_rec["score_breakdown"]
    assert "prerequisite_readiness" in top_rec["score_breakdown"]
