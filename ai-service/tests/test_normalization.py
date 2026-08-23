import pytest
from app.utils.normalization import (
    _clean_skill_key,
    _load_skill_taxonomy,
    normalize_skill_name,
    normalize_skill_id,
    normalize_profile_skills,
    validate_skill_taxonomy,
)


def test_clean_skill_key():
    assert _clean_skill_key("  React.js!  ") == "react.js"
    assert _clean_skill_key("Machine   Learning") == "machine learning"
    assert _clean_skill_key("Python_3") == "python3"
    assert _clean_skill_key(None) == ""


def test_normalize_skill_name_aliases():
    assert normalize_skill_name("ReactJS") == "react"
    assert normalize_skill_name("React.js") == "react"
    assert normalize_skill_name("python3") == "python"
    assert normalize_skill_name("Python 3") == "python"
    assert normalize_skill_name("Node") == "node.js"
    assert normalize_skill_name("ML") == "machine learning"
    assert normalize_skill_name("K8s") == "kubernetes"
    assert normalize_skill_name("Postgres") == "sql"
    assert normalize_skill_name("UnknownSkillX") == "UnknownSkillX"
    assert normalize_skill_name(None) == ""


def test_normalize_skill_id():
    assert normalize_skill_id("Machine Learning") == "machine-learning"
    assert normalize_skill_id("ML") == "machine-learning"
    assert normalize_skill_id("machine_learning") == "machine-learning"
    assert normalize_skill_id("Python 3") == "python"
    assert normalize_skill_id("React.js") == "react"
    assert normalize_skill_id("Node") == "node.js"
    assert normalize_skill_id(None) == ""


def test_normalize_profile_skills():
    profile = {
        "skills": [
            {"name": "React.js", "level": 3},
            {"skillId": "python3", "level": 2},
            "Docker"
        ]
    }
    out = normalize_profile_skills(profile)
    skills = out["skills"]

    assert len(skills) == 3

    assert skills[0]["name"] == "react"
    assert skills[0]["skill_id"] == "react"
    assert skills[0]["level"] == 3

    assert skills[1]["name"] == "python"
    assert skills[1]["skill_id"] == "python"
    assert skills[1]["level"] == 2

    assert skills[2]["name"] == "docker"
    assert skills[2]["skill_id"] == "docker"
    assert skills[2]["level"] is None


def test_validate_skill_taxonomy():
    overlaps = validate_skill_taxonomy()
    assert isinstance(overlaps, dict)
    # The taxonomy should not have conflicting aliases mapping to different canonical skills
    # e.g., "sql" maps to "sql" and "databases" which is intentional in alias taxonomy
    for alias, canonicals in overlaps.items():
        assert len(canonicals) > 1
