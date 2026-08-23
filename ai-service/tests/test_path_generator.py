import pytest
from app.services.path_generator import (
    PathGenerator,
    generate_ordered_learning_path,
    topological_sort_courses_and_nodes,
    organize_items_into_4_phases
)


@pytest.fixture
def sample_recommended_courses():
    return [
        {
            "id": "course-ml-101",
            "title": "Machine Learning Algorithms",
            "prerequisites": ["python", "statistics"],
            "level": "intermediate",
            "duration_hours": 30,
            "rating": 4.8
        },
        {
            "id": "course-python-101",
            "title": "Python Basics",
            "prerequisites": [],
            "level": "beginner",
            "duration_hours": 15,
            "rating": 4.9
        },
        {
            "id": "course-dl-101",
            "title": "Deep Learning & Neural Nets",
            "prerequisites": ["course-ml-101"],
            "level": "advanced",
            "duration_hours": 40,
            "rating": 4.7
        }
    ]


def test_topological_sort(sample_recommended_courses):
    ordered = topological_sort_courses_and_nodes(sample_recommended_courses)
    
    # Python must come before Machine Learning, ML must come before Deep Learning
    ordered_ids = [c["id"] for c in ordered]
    py_idx = ordered_ids.index("course-python-101")
    ml_idx = ordered_ids.index("course-ml-101")
    dl_idx = ordered_ids.index("course-dl-101")

    assert py_idx < ml_idx
    assert ml_idx < dl_idx


def test_4_phase_structuring(sample_recommended_courses):
    result = generate_ordered_learning_path(sample_recommended_courses, weekly_hours=10)

    assert result["success"] is True
    assert "phases" in result
    assert len(result["phases"]) == 4

    phase_ids = [p["phaseId"] for p in result["phases"]]
    assert phase_ids == ["phase-1", "phase-2", "phase-3", "phase-4"]

    for phase in result["phases"]:
        assert "title" in phase
        assert "milestones" in phase
        assert "courses" in phase
        assert "estimatedHours" in phase


def test_path_generator_with_prerequisite_graph():
    courses = [
        {"id": "c-react", "title": "React JS", "prerequisites": ["javascript"], "level": "intermediate"},
        {"id": "c-js", "title": "JavaScript", "prerequisites": [], "level": "beginner"}
    ]

    graph = {
        "nodes": [
            {"id": "node-capstone", "title": "Full Stack Capstone Project", "type": "capstone", "estimatedHours": 30}
        ],
        "edges": [
            {"from": "c-react", "to": "node-capstone"}
        ]
    }

    result = generate_ordered_learning_path(courses, prerequisite_graph=graph)
    assert result["success"] is True
    assert result["totalItems"] >= 3

    ordered_ids = [item["id"] for item in result["orderedItems"]]
    assert ordered_ids.index("c-js") < ordered_ids.index("c-react")


def test_path_generator_class():
    generator = PathGenerator()
    courses = [{"id": "c1", "title": "Intro Course", "prerequisites": []}]
    result = generator.generate(courses)
    
    assert result["success"] is True
    assert result["totalItems"] == 1
