from app.services.assessment_recommendation_engine import (
    calculate_assessment_level_fit,
    calculate_assessment_path_alignment,
    calculate_assessment_skill_coverage,
    check_assessment_readiness,
    parse_assessment_skills,
    rank_assessment_candidates,
    recommend_assessments,
)


def test_parse_assessment_skills():
    skills = [
        {"skill_id": "python", "target_level": 5.0},
        {"skill_id": "machine learning", "target_level": 5.0},
    ]
    res = parse_assessment_skills(skills)

    assert res["python"] == 5.0
    assert res["machine learning"] == 5.0


def test_assessment_skill_coverage_partial():
    assessment = {"skills": [{"skill_id": "python", "target_level": 5.0}]}
    skill_gaps = [
        {"skill_id": "python", "current_level": 0.0, "target_level": 10.0}
    ]
    cov = calculate_assessment_skill_coverage(assessment, skill_gaps)

    assert cov == 0.5


def test_assessment_skill_coverage_full():
    assessment = {"skills": [{"skill_id": "python", "target_level": 5.0}]}
    skill_gaps = [
        {"skill_id": "python", "current_level": 0.0, "target_level": 5.0}
    ]
    cov = calculate_assessment_skill_coverage(assessment, skill_gaps)

    assert cov == 1.0


def test_assessment_skill_coverage_does_not_reward_overshooting():
    assessment = {"skills": [{"skill_id": "python", "target_level": 8.0}]}
    skill_gaps = [
        {"skill_id": "python", "current_level": 0.0, "target_level": 5.0}
    ]
    cov = calculate_assessment_skill_coverage(assessment, skill_gaps)

    assert cov == 1.0


def test_assessment_readiness_satisfied():
    assessment = {
        "skills": [{"skill_id": "python", "target_level": 5.0}]
    }
    learner_skills = {"python": 5.0}
    res = check_assessment_readiness(assessment, learner_skills)

    assert res["eligible"] is True
    assert res["missing_skills"] == []


def test_assessment_readiness_missing_skill():
    assessment = {
        "skills": [{"skill_id": "python", "target_level": 5.0}]
    }
    learner_skills = {"python": 3.0}
    res = check_assessment_readiness(assessment, learner_skills)

    assert res["eligible"] is False
    assert len(res["missing_skills"]) == 1
    assert res["missing_skills"][0]["skill"] == "python"


def test_assessment_readiness_requires_all_skills():
    assessment = {
        "skills": [
            {"skill_id": "machine learning", "target_level": 5.0},
            {"skill_id": "statistics", "target_level": 4.0},
        ]
    }
    learner_skills = {"machine learning": 5.0, "statistics": 2.0}
    res = check_assessment_readiness(assessment, learner_skills)

    assert res["eligible"] is False
    assert len(res["missing_skills"]) == 1
    assert res["missing_skills"][0]["skill"] == "statistics"


def test_assessment_level_fit():
    beginner_a = {
        "difficulty": "beginner",
        "skills": [{"skill_id": "python", "target_level": 3.0}],
    }
    advanced_a = {
        "difficulty": "advanced",
        "skills": [{"skill_id": "python", "target_level": 8.0}],
    }
    learner_skills = {"python": 1.0}

    fit_beg = calculate_assessment_level_fit(beginner_a, learner_skills)
    fit_adv = calculate_assessment_level_fit(advanced_a, learner_skills)

    assert fit_beg > fit_adv


def test_assessment_path_alignment():
    aligned_a = {
        "skills": [{"skill_id": "machine learning", "target_level": 5.0}]
    }
    unaligned_a = {
        "skills": [{"skill_id": "react", "target_level": 5.0}]
    }
    milestone_skills = {"machine learning"}

    score_aligned = calculate_assessment_path_alignment(
        aligned_a, current_milestone_skills=milestone_skills
    )
    score_unaligned = calculate_assessment_path_alignment(
        unaligned_a, current_milestone_skills=milestone_skills
    )

    assert score_aligned > score_unaligned


def test_readiness_affects_ranking():
    a_ready = {
        "id": "a1",
        "title": "Ready Assessment",
        "skills": [{"skill_id": "python", "target_level": 5.0}],
        "difficulty": "beginner",
    }
    a_not_ready = {
        "id": "a2",
        "title": "Not Ready Assessment",
        "skills": [{"skill_id": "machine learning", "target_level": 8.0}],
        "difficulty": "advanced",
    }
    skill_gaps = [
        {"skill_id": "python", "current_level": 5, "target_level": 5},
        {"skill_id": "machine learning", "current_level": 0, "target_level": 8},
    ]
    learner_skills = {"python": 5.0, "machine learning": 1.0}

    ranked = rank_assessment_candidates(
        [a_not_ready, a_ready], skill_gaps, learner_skills
    )

    assert ranked[0]["assessment_id"] == "a1"


def test_locked_assessments_are_not_main_recommendations():
    a_locked = {
        "id": "a_locked",
        "title": "Locked Assessment",
        "skills": [{"skill_id": "python", "target_level": 5.0}],
        "difficulty": "intermediate",
    }
    a_eligible = {
        "id": "a_eligible",
        "title": "Eligible Assessment",
        "skills": [{"skill_id": "python", "target_level": 2.0}],
        "difficulty": "beginner",
    }

    res = recommend_assessments(
        learner={"skills": {"python": 3.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        assessments=[a_locked, a_eligible],
    )

    assert len(res["recommendations"]) == 1
    assert res["recommendations"][0]["assessment_id"] == "a_eligible"
    assert len(res["locked_recommendations"]) == 1
    assert res["locked_recommendations"][0]["assessment_id"] == "a_locked"


def test_recommend_assessments_output_structure():
    res = recommend_assessments(
        learner={"skills": {"python": 5.0, "statistics": 4.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
    )

    assert res["success"] is True
    assert isinstance(res["recommendations"], list)
    assert len(res["recommendations"]) > 0

    top_rec = res["recommendations"][0]
    assert "assessment_id" in top_rec
    assert "title" in top_rec
    assert "match_score" in top_rec
    assert "score_breakdown" in top_rec
    assert "reason" in top_rec
    assert "skill_gap_coverage" in top_rec["score_breakdown"]
    assert "assessment_readiness" in top_rec["score_breakdown"]
    assert "learning_path_alignment" in top_rec["score_breakdown"]
    assert "level_fit" in top_rec["score_breakdown"]


def test_completed_assessment_is_not_recommended():
    a1 = {
        "id": "python-foundations-assessment",
        "title": "Python Foundations Assessment",
        "skills": [{"skill_id": "python", "target_level": 5.0}],
        "difficulty": "beginner",
    }
    a2 = {
        "id": "statistics-assessment",
        "title": "Statistics Assessment",
        "skills": [{"skill_id": "statistics", "target_level": 5.0}],
        "difficulty": "intermediate",
    }

    res = recommend_assessments(
        learner={
            "skills": {"python": 5.0, "statistics": 5.0},
            "completed_assessments": ["python-foundations-assessment"],
        },
        skill_gaps=[
            {"skill_id": "python", "target_level": 5.0},
            {"skill_id": "statistics", "target_level": 5.0},
        ],
        assessments=[a1, a2],
    )

    rec_ids = [r["assessment_id"] for r in res["recommendations"]]
    assert "python-foundations-assessment" not in rec_ids
    assert "statistics-assessment" in rec_ids
