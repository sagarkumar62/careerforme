import pytest
from app.services.graph_generator import generate_career_graph


def test_generate_career_graph_schema_data_scientist():
    graph = generate_career_graph("Data Scientist")
    assert "role" in graph
    assert "nodes" in graph
    assert "edges" in graph
    assert isinstance(graph["nodes"], list)
    assert isinstance(graph["edges"], list)
    assert len(graph["nodes"]) > 0

    node = graph["nodes"][0]
    assert "id" in node
    assert "label" in node
    assert "category" in node
    assert "description" in node

    if len(graph["edges"]) > 0:
        edge = graph["edges"][0]
        assert "source" in edge
        assert "target" in edge


def test_generate_career_graph_schema_pilot():
    graph = generate_career_graph("Pilot")
    assert graph["role"] in ["Commercial Pilot", "Pilot"]
    assert len(graph["nodes"]) > 0
    node_labels = [n["label"] for n in graph["nodes"]]
    assert not any(k in " ".join(node_labels).lower() for k in ["python", "react", "pytorch"])
