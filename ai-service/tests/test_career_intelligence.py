import pytest
from app.services.recommendation_engine import recommend, compare_careers, build_canonical_profile_text
from app.services.skill_gap_engine import calculate_single_skill_gap, analyze_skill_gaps
from app.services.roadmap_engine import generate_roadmap_structure, adapt_roadmap_structure

def test_deterministic_scoring():
    profile = {
        "userId": "test_user_1",
        "skills": [{"name": "Python", "level": 4}, {"name": "React", "level": 3}],
        "interests": ["Machine Learning", "AI"],
        "education": "Computer Science",
        "experience_level": "Mid",
        "target_career": "AI Engineer"
    }
    res1 = recommend(profile)
    res2 = recommend(profile)
    assert res1["top_match"]["final_score"] == res2["top_match"]["final_score"]
    assert res1["top_match"]["career"] == res2["top_match"]["career"]

def test_aviation_profile_does_not_default_to_ai_engineer():
    profile = {
        "userId": "pilot_user",
        "skills": [{"name": "Aeronautics", "level": 4}, {"name": "Flight Navigation", "level": 4}],
        "interests": ["Aviation", "Flight Systems"],
        "education": "Aeronautical Engineering",
        "experience_level": "Mid",
        "target_career": "Commercial Pilot"
    }
    res = recommend(profile)
    assert res["top_match"]["career"] != "AI Engineer"
    assert "Pilot" in res["top_match"]["career"] or "Aviation" in res["top_match"]["career"]

def test_skill_gap_classification():
    gap_item = calculate_single_skill_gap(
        {"skillName": "Python", "targetLevel": 4, "importance": 0.9},
        {"python": 4}
    )
    assert gap_item["classification"] == "STRONG"
    assert gap_item["gap"] == 0

    gap_item_missing = calculate_single_skill_gap(
        {"skillName": "PyTorch", "targetLevel": 4, "importance": 0.8},
        {}
    )
    assert gap_item_missing["classification"] == "MISSING"
    assert gap_item_missing["priorityLabel"] == "HIGH"

def test_career_comparison():
    profile = {
        "skills": [{"name": "Python", "level": 3}],
        "target_career": "AI Engineer"
    }
    res = compare_careers(["car_ai_eng", "car_fs_dev"], profile)
    assert res["success"] is True
    assert len(res["comparisons"]) == 2
    assert "missingSkills" in res["comparisons"][0]

def test_adaptive_roadmap():
    profile = {
        "skills": [{"name": "Python", "level": 4}],
        "target_career": "AI Engineer"
    }
    adapt_res = adapt_roadmap_structure(profile, {
        "target_career": "AI Engineer",
        "progress_percentage": 75,
        "completed_milestones": ["m1", "m2", "m3", "m4", "m5"]
    })
    assert adapt_res["success"] is True
    assert adapt_res["adaptationMode"] == "ACCELERATED"


@pytest.mark.parametrize("career_input,expected_canonical", [
    ("Full Stack Developer", "full-stack-developer"),
    ("frontend developer", "frontend-developer"),
    ("backend-developer", "backend-developer"),
    ("AI Engineer", "ai-engineer"),
    ("Data Scientist", "data-scientist"),
    ("DevOps Engineer", "devops-engineer"),
    ("Cloud Architect", "cloud-architect"),
    ("Security Analyst", "security-analyst"),
    ("Commercial Pilot", "pilot"),
    ("Mobile App Developer", "mobile-app-developer"),
    ("UX Designer", "ux-designer")
])
def test_all_canonical_career_roadmaps(career_input, expected_canonical):
    profile = {
        "userId": "test_user_multi",
        "skills": [{"name": "JavaScript", "level": 4}, {"name": "Python", "level": 3}],
        "experienceLevel": "Mid",
        "weeklyHours": 10
    }
    roadmap = generate_roadmap_structure(profile, career_input)
    assert roadmap["success"] is True
    assert roadmap["careerId"] == expected_canonical
    assert len(roadmap["nodes"]) > 0
    assert len(roadmap["phases"]) > 0


def test_unsupported_career_returns_structured_error():
    profile = {"skills": []}
    res = generate_roadmap_structure(profile, "InvalidUnknownCareer123")
    assert res["success"] is False
    assert res["code"] == "CAREER_NOT_SUPPORTED"
    assert "No roadmap dataset exists" in res["message"]

