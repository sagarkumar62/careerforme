import pytest
from typing import Dict, Any
from app.services.career_resolver import build_career_dataset_registry, resolve_target_career
from app.services.roadmap_engine import generate_roadmap_structure


def test_career_registry_discovers_all_careers():
    """Verify that career dataset registry discovers canonical careers without duplication errors."""
    registry = build_career_dataset_registry()
    assert len(registry) >= 13
    
    expected_careers = [
        "ai-engineer",
        "full-stack-developer",
        "frontend-developer",
        "backend-developer",
        "data-scientist",
        "devops-engineer",
        "cloud-architect",
        "security-analyst",
        "pilot",
        "ux-designer",
        "mobile-app-developer",
        "ml-engineer",
        "data-analyst"
    ]
    for cid in expected_careers:
        assert cid in registry, f"Expected canonical career '{cid}' to be registered in CAREER_DATASET_REGISTRY."


@pytest.mark.parametrize("career_id", [
    "ai-engineer",
    "full-stack-developer",
    "frontend-developer",
    "backend-developer",
    "data-scientist",
    "devops-engineer",
    "cloud-architect",
    "security-analyst",
    "pilot",
    "ux-designer",
    "mobile-app-developer",
    "ml-engineer",
    "data-analyst"
])
def test_all_supported_careers_generate_valid_topological_dags(career_id: str):
    """
    Test DAG invariants, topological ordering, phase safety, and ordering validation for all supported careers.
    """
    res = generate_roadmap_structure({}, career_id)
    assert res["success"] is True, f"Roadmap generation failed for career '{career_id}': {res.get('message')}"
    assert res["careerId"] == career_id
    assert res["validation"]["isDag"] is True
    assert res["validation"]["hasCycles"] is False
    assert res["validation"]["orderValid"] is True

    nodes = res["nodes"]
    edges = res["edges"]
    phases = res["phases"]

    assert len(nodes) > 0, f"Roadmap for '{career_id}' has no nodes."
    assert len(phases) == 4, f"Roadmap for '{career_id}' must have exactly 4 semantic phases."

    # 1. Unique Node IDs
    node_ids = [n["id"] for n in nodes]
    assert len(node_ids) == len(set(node_ids)), f"Duplicate node IDs found in career '{career_id}'"

    node_index_lookup = {n["id"]: idx for idx, n in enumerate(nodes)}
    node_phase_lookup = {n["id"]: n["phase"] for n in nodes}

    # 2. Every prerequisite appears BEFORE its dependent topic in global order
    for n in nodes:
        prereqs = n.get("prerequisites") or []
        for p in prereqs:
            assert p in node_index_lookup, f"Missing prerequisite node '{p}' for node '{n['id']}' in career '{career_id}'"
            assert node_index_lookup[p] < node_index_lookup[n["id"]], (
                f"Topological ordering error in '{career_id}': Prerequisite '{p}' (idx {node_index_lookup[p]}) "
                f"occurs after dependent topic '{n['id']}' (idx {node_index_lookup[n['id']]})"
            )

    # 3. Phase Safety: phase(source) <= phase(target)
    for e in edges:
        src = e["source"]
        tgt = e["target"]
        assert node_phase_lookup[src] <= node_phase_lookup[tgt], (
            f"Phase safety violation in '{career_id}': Prerequisite '{src}' (Phase {node_phase_lookup[src]}) "
            f"is placed in a later phase than dependent '{tgt}' (Phase {node_phase_lookup[tgt]})"
        )


def test_ai_engineer_specific_topological_order():
    """Verify specific prerequisite ordering constraints for AI Engineer."""
    res = generate_roadmap_structure({}, "ai-engineer")
    assert res["success"] is True
    
    nodes = res["nodes"]
    node_index_lookup = {n["id"]: idx for idx, n in enumerate(nodes)}

    # Verify prerequisite order
    if "python" in node_index_lookup and "machine-learning" in node_index_lookup:
        assert node_index_lookup["python"] < node_index_lookup["machine-learning"]

    if "machine-learning" in node_index_lookup and "deep-learning" in node_index_lookup:
        assert node_index_lookup["machine-learning"] < node_index_lookup["deep-learning"]

    if "deep-learning" in node_index_lookup and "transformers" in node_index_lookup:
        assert node_index_lookup["deep-learning"] < node_index_lookup["transformers"]

    if "transformers" in node_index_lookup and "rag" in node_index_lookup:
        assert node_index_lookup["transformers"] < node_index_lookup["rag"]


def test_full_stack_developer_specific_topological_order():
    """Verify specific prerequisite ordering constraints for Full Stack Developer."""
    res = generate_roadmap_structure({}, "full-stack-developer")
    assert res["success"] is True
    assert res["careerId"] == "full-stack-developer"

    nodes = res["nodes"]
    node_index_lookup = {n["id"]: idx for idx, n in enumerate(nodes)}

    if "html_css" in node_index_lookup and "javascript" in node_index_lookup:
        assert node_index_lookup["html_css"] < node_index_lookup["javascript"]

    if "javascript" in node_index_lookup and "react" in node_index_lookup:
        assert node_index_lookup["javascript"] < node_index_lookup["react"]

    if "react" in node_index_lookup and "nextjs" in node_index_lookup:
        assert node_index_lookup["react"] < node_index_lookup["nextjs"]


def test_unsupported_career_returns_structured_error():
    """Verify that requesting an unknown/unsupported career returns CAREER_NOT_SUPPORTED without fallbacks."""
    res = generate_roadmap_structure({}, "quantum-teleportation-architect-xyz")
    assert res["success"] is False
    assert res["code"] == "CAREER_NOT_SUPPORTED"
    assert "No roadmap dataset exists" in res["message"]
    assert res["careerId"] is None


def test_mastered_skills_are_preserved_in_graph():
    """Verify that user profile with mastered skills retains mastered nodes in the graph."""
    profile = {
        "skills": [
            {"name": "Python", "level": 4},
            {"name": "Git & GitHub", "level": 4}
        ]
    }
    res = generate_roadmap_structure(profile, "ai-engineer")
    assert res["success"] is True

    nodes = res["nodes"]
    python_node = next((n for n in nodes if n["id"] == "python"), None)
    assert python_node is not None, "Mastered node 'python' must remain in the graph."
    assert python_node["status"] == "MASTERED"
    assert python_node["learningRequired"] is False
    assert python_node["estimatedHours"] == 0

    # Ensure python's dependent nodes are now RECOMMENDED instead of LOCKED
    numpy_node = next((n for n in nodes if n["id"] == "numpy"), None)
    if numpy_node:
        assert numpy_node["accessState"] == "RECOMMENDED"


def test_learner_skill_updates_do_not_alter_dag_edges():
    """Changing learner skill profile should update state labels without mutating the graph DAG structure."""
    res_novice = generate_roadmap_structure({}, "ai-engineer")
    profile_expert = {
        "skills": [
            {"name": "Python", "level": 5},
            {"name": "NumPy", "level": 5},
            {"name": "Pandas", "level": 5}
        ]
    }
    res_expert = generate_roadmap_structure(profile_expert, "ai-engineer")

    assert len(res_novice["nodes"]) == len(res_expert["nodes"])
    assert len(res_novice["edges"]) == len(res_expert["edges"])

    novice_ids = [n["id"] for n in res_novice["nodes"]]
    expert_ids = [n["id"] for n in res_expert["nodes"]]
    assert novice_ids == expert_ids
