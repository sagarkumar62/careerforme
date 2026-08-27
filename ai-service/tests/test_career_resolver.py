import pytest
from app.services.career_resolver import resolve_target_career
from app.services.roadmap_engine import generate_roadmap_structure


def test_resolve_pilot_graph():
    res = resolve_target_career("Pilot")
    assert res["success"] is True
    assert res["resolved_career"] == "Commercial Pilot"
    assert res["career_id"] in ["pilot", "commercial-pilot"]
    assert res["domain"] == "aviation"
    assert res["confidence"] >= 0.85


def test_resolve_frontend_developer_graph():
    res = resolve_target_career("Frontend Developer")
    assert res["success"] is True
    assert res["resolved_career"] == "Frontend Developer"
    assert res["career_id"] == "frontend-developer"
    assert res["domain"] in ["technology", "software-development"]


def test_resolve_devops_engineer_graph():
    res = resolve_target_career("DevOps Engineer")
    assert res["success"] is True
    assert res["resolved_career"] == "DevOps Engineer"
    assert res["career_id"] == "devops-engineer"
    assert res["domain"] in ["technology", "cloud-and-devops"]


def test_resolve_ai_engineer_graph():
    res = resolve_target_career("AI Engineer")
    assert res["success"] is True
    assert res["resolved_career"] == "AI Engineer"
    assert res["career_id"] == "ai-engineer"
    assert res["domain"] in ["technology", "data-and-ai"]



def test_resolve_ux_designer_graph():
    res = resolve_target_career("UX Designer")
    assert res["success"] is True
    assert "UX" in res["resolved_career"] and "Product Designer" in res["resolved_career"]
    assert res["career_id"] == "ux-designer"
    assert res["domain"] == "design"


def test_resolve_financial_analyst_graph():
    res = resolve_target_career("Financial Analyst")
    assert res["success"] is True
    assert res["resolved_career"] == "Financial Analyst"
    assert res["career_id"] == "financial-analyst"
    assert res["domain"] == "finance"


def test_resolve_unknown_career_rejection():
    res = resolve_target_career("XYZ RANDOM CAREER 123")
    assert res["success"] is False
    assert res["error"] == "CAREER_NOT_SUPPORTED"
    assert res["resolved_career"] is None
    assert res["confidence"] == 0.0
    # MUST NOT be AI Engineer!
    assert res["career_id"] != "ai-engineer"


def test_pilot_graph_roadmap_skills_validity():
    profile = {"skills": [], "weekly_hours": 15}
    roadmap = generate_roadmap_structure(profile, "Pilot")
    
    assert roadmap["success"] is True
    assert roadmap["careerTitle"] == "Commercial Pilot"
    assert roadmap["domain"] == "aviation"
    assert len(roadmap["nodes"]) > 0
    assert len(roadmap["edges"]) > 0
    
    node_titles = [n["title"] for n in roadmap["nodes"]]
    assert any("Aviation" in t or "Flight" in t or "Air Law" in t or "Meteorology" in t for t in node_titles)
    
    # MUST NOT contain software engineering skills
    assert "Python" not in node_titles
    assert "React" not in node_titles
    assert "JavaScript" not in node_titles
    assert "Docker" not in node_titles


def test_unknown_career_roadmap_rejection():
    profile = {"skills": [], "weekly_hours": 15}
    roadmap = generate_roadmap_structure(profile, "XYZ RANDOM CAREER 123")
    assert roadmap["success"] is False
    assert roadmap["error"] == "CAREER_NOT_SUPPORTED"
    # MUST NOT fallback to AI Engineer
    assert roadmap.get("careerId") != "ai-engineer"
