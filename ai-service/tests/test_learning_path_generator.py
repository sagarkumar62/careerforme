import pytest

from app.services.learning_path_generator import (
    build_course_lookup,
    get_course_prerequisite_skills,
    build_course_dependency_graph,
    get_course_skill_levels,
    get_missing_course_prerequisites,
    find_prerequisite_courses,
    select_minimum_prerequisite_course,
    topological_sort_courses,
    calculate_course_dependency_depths,
    build_learning_milestones,
    calculate_milestone_progress,
    calculate_overall_path_progress,
    generate_milestone_title,
    find_courses_for_target_skills,
    collect_prerequisite_closure,
    select_personalized_course_sequence,
    generate_personalized_learning_path,
    group_courses_by_target_skill,
    select_best_course_for_skill,
    select_best_target_courses,
    attach_projects_to_learning_path,
    attach_assessments_to_learning_path,
)
from app.services.learning_recommendation_engine import (
    load_courses_catalog,
)



def test_build_course_lookup():
    courses = [
        {
            "id": "python-basics",
            "title": "Python Fundamentals",
        },
        {
            "id": "python-advanced",
            "title": "Advanced Python",
        },
    ]

    result = build_course_lookup(courses)

    assert set(result.keys()) == {
        "python-basics",
        "python-advanced",
    }

    assert result["python-basics"]["title"] == (
        "Python Fundamentals"
    )


def test_get_course_prerequisite_skills():
    course = {
        "id": "python-advanced",
        "prerequisites": [
            {
                "skill_id": "python",
                "minimum_level": 5,
            },
            {
                "skill_id": "git",
                "minimum_level": 2,
            },
        ],
    }

    result = get_course_prerequisite_skills(course)

    assert result == {
        "python",
        "git",
    }


def test_dependency_graph_links_prerequisite_course():
    courses = [
        {
            "id": "python-basics",
            "title": "Python Fundamentals",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "python-advanced",
            "title": "Advanced Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 8,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    graph = build_course_dependency_graph(courses)

    assert graph["python-advanced"] == {
        "python-basics"
    }

    assert graph["python-basics"] == set()


def test_dependency_graph_supports_multiple_prerequisites():
    courses = [
        {
            "id": "python-basics",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "statistics-basics",
            "skills": [
                {
                    "skill_id": "statistics",
                    "target_level": 4,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml-fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 6,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                },
                {
                    "skill_id": "statistics",
                    "minimum_level": 4,
                },
            ],
        },
    ]

    graph = build_course_dependency_graph(courses)

    assert graph["ml-fundamentals"] == {
        "python-basics",
        "statistics-basics",
    }


def test_get_course_skill_levels():
    course = {
        "id": "python-basics",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5,
            },
            {
                "skill_id": "git",
                "target_level": 3,
            },
        ],
    }

    result = get_course_skill_levels(course)

    assert result == {
        "python": 5.0,
        "git": 3.0,
    }


def test_missing_course_prerequisites():
    course = {
        "id": "ml-fundamentals",
        "prerequisites": [
            {
                "skill_id": "python",
                "minimum_level": 5,
            },
            {
                "skill_id": "statistics",
                "minimum_level": 4,
            },
        ],
    }

    effective_levels = {
        "python": 5.0,
        "statistics": 2.0,
    }

    result = get_missing_course_prerequisites(
        course,
        effective_levels,
    )

    assert result == [
        {
            "skill_id": "statistics",
            "required_level": 4.0,
            "current_level": 2.0,
            "gap": 2.0,
        }
    ]


def test_find_prerequisite_courses():
    courses = [
        {
            "id": "python-basics",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
        },
        {
            "id": "python-advanced",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 9,
                }
            ],
        },
    ]

    result = find_prerequisite_courses(
        {
            "skill_id": "python",
            "required_level": 5,
        },
        courses,
        set(),
    )

    assert {
        course["id"]
        for course in result
    } == {
        "python-basics",
        "python-advanced",
    }


def test_select_minimum_sufficient_prerequisite_course():
    candidates = [
        {
            "id": "python-advanced",
            "duration_hours": 20,
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 9,
                }
            ],
        },
        {
            "id": "python-basics",
            "duration_hours": 10,
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
        },
        {
            "id": "python-intermediate",
            "duration_hours": 15,
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 7,
                }
            ],
        },
    ]

    result = select_minimum_prerequisite_course(
        candidates,
        "python",
        5,
    )

    assert result["id"] == "python-basics"


def test_satisfied_prerequisite_needs_no_course():
    course = {
        "id": "ml-fundamentals",
        "prerequisites": [
            {
                "skill_id": "python",
                "minimum_level": 5,
            }
        ],
    }

    effective_levels = {
        "python": 7.0,
    }

    result = get_missing_course_prerequisites(
        course,
        effective_levels,
    )

    assert result == []


def test_topological_sort_simple_chain():
    graph = {
        "python-basics": set(),
        "python-advanced": {"python-basics"},
        "ml-fundamentals": {"python-advanced"},
    }

    result = topological_sort_courses(graph)

    assert result == [
        "python-basics",
        "python-advanced",
        "ml-fundamentals",
    ]


def test_topological_sort_multiple_prerequisites():
    graph = {
        "python-basics": set(),
        "statistics-basics": set(),
        "ml-fundamentals": {
            "python-basics",
            "statistics-basics",
        },
    }

    result = topological_sort_courses(graph)

    assert result[-1] == "ml-fundamentals"

    assert result.index("python-basics") < result.index(
        "ml-fundamentals"
    )

    assert result.index("statistics-basics") < result.index(
        "ml-fundamentals"
    )


def test_topological_sort_long_chain():
    graph = {
        "python": set(),
        "statistics": set(),
        "ml": {"python", "statistics"},
        "deep-learning": {"ml"},
        "transformers": {"deep-learning"},
    }

    result = topological_sort_courses(graph)

    assert result.index("python") < result.index("ml")
    assert result.index("statistics") < result.index("ml")
    assert result.index("ml") < result.index("deep-learning")
    assert result.index("deep-learning") < result.index("transformers")


def test_topological_sort_detects_cycle():
    graph = {
        "course-a": {"course-b"},
        "course-b": {"course-a"},
    }

    with pytest.raises(ValueError, match="cycle"):
        topological_sort_courses(graph)


def test_calculate_course_dependency_depths():
    graph = {
        "python-basics": set(),
        "python-advanced": {"python-basics"},
        "ml-fundamentals": {"python-advanced"},
    }

    depths = calculate_course_dependency_depths(graph)

    assert depths == {
        "python-basics": 0,
        "python-advanced": 1,
        "ml-fundamentals": 2,
    }


def test_calculate_course_dependency_depths_multiple_prerequisites():
    graph = {
        "python-basics": set(),
        "statistics-basics": set(),
        "ml-fundamentals": {
            "python-basics",
            "statistics-basics",
        },
        "deep-learning": {"ml-fundamentals"},
    }

    depths = calculate_course_dependency_depths(graph)

    assert depths["python-basics"] == 0
    assert depths["statistics-basics"] == 0
    assert depths["ml-fundamentals"] == 1
    assert depths["deep-learning"] == 2


def test_calculate_course_dependency_depths_detects_cycle():
    graph = {
        "course-a": {"course-b"},
        "course-b": {"course-a"},
    }

    with pytest.raises(ValueError, match="cycle"):
        calculate_course_dependency_depths(graph)


def test_build_learning_milestones_groups_by_dependency_depth():
    courses = [
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "duration_hours": 10,
            "dependency_depth": 0,
        },
        {
            "id": "statistics",
            "skills": [
                {
                    "skill_id": "statistics",
                    "target_level": 4,
                }
            ],
            "duration_hours": 8,
            "dependency_depth": 0,
        },
        {
            "id": "ml",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "duration_hours": 12,
            "dependency_depth": 1,
        },
    ]

    result = build_learning_milestones(courses)

    assert len(result) == 2

    assert result[0]["milestone_id"] == "milestone-1"
    assert result[0]["title"] == "Foundations"
    assert result[0]["dependency_depth"] == 0

    assert result[0]["course_ids"] == [
        "python",
        "statistics",
    ]

    assert result[0]["estimated_hours"] == 18

    assert result[1]["milestone_id"] == "milestone-2"
    assert result[1]["title"] == "Machine Learning Core"
    assert result[1]["dependency_depth"] == 1
    assert result[1]["course_ids"] == ["ml"]


def test_generate_milestone_title_foundations():
    result = generate_milestone_title(
        skills=[
            "python",
            "statistics",
        ],
        dependency_depth=0,
    )

    assert result == "Foundations"


def test_generate_milestone_title_machine_learning():
    result = generate_milestone_title(
        skills=[
            "machine-learning",
        ],
        dependency_depth=1,
    )

    assert result == "Machine Learning Core"


def test_generate_milestone_title_deep_learning():
    result = generate_milestone_title(
        skills=[
            "deep-learning",
        ],
        dependency_depth=2,
    )

    assert result == "Advanced Deep Learning"


def test_generate_milestone_title_unknown_skill():
    result = generate_milestone_title(
        skills=[
            "quantum-computing",
        ],
        dependency_depth=1,
    )

    assert result == "Quantum Computing"


def test_generate_milestone_title_empty_skills():
    result = generate_milestone_title(
        skills=[],
        dependency_depth=2,
    )

    assert result == "Learning Milestone 3"


def test_generate_milestone_title_advanced_machine_learning():
    assert generate_milestone_title(
        ["machine-learning"],
        2,
    ) == "Advanced Machine Learning"


def test_generate_milestone_title_advanced_javascript():
    assert generate_milestone_title(
        ["javascript"],
        1,
    ) == "Advanced JavaScript"


def test_generate_milestone_title_advanced_containerization():
    assert generate_milestone_title(
        ["docker"],
        2,
    ) == "Advanced Containerization"


def test_generate_milestone_title_combined_foundations():
    assert generate_milestone_title(
        ["python", "statistics"],
        0,
    ) == "Foundations"




def test_build_learning_milestones_empty_path():
    result = build_learning_milestones([])

    assert result == []


def test_build_learning_milestones_three_levels():
    courses = [
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "dependency_depth": 0,
        },
        {
            "id": "ml",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "dependency_depth": 1,
        },
        {
            "id": "deep-learning",
            "skills": [
                {
                    "skill_id": "deep-learning",
                    "target_level": 8,
                }
            ],
            "dependency_depth": 2,
        },
    ]

    result = build_learning_milestones(courses)

    assert len(result) == 3

    assert result[0]["course_ids"] == ["python"]
    assert result[1]["course_ids"] == ["ml"]
    assert result[2]["course_ids"] == ["deep-learning"]


def test_build_learning_milestones_keeps_same_depth_together():
    courses = [
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "dependency_depth": 0,
        },
        {
            "id": "statistics",
            "skills": [
                {
                    "skill_id": "statistics",
                    "target_level": 4,
                }
            ],
            "dependency_depth": 0,
        },
        {
            "id": "linux",
            "skills": [
                {
                    "skill_id": "linux",
                    "target_level": 5,
                }
            ],
            "dependency_depth": 0,
        },
    ]

    result = build_learning_milestones(courses)

    assert len(result) == 1

    assert result[0]["course_ids"] == [
        "python",
        "statistics",
        "linux",
    ]




def test_real_course_catalog_dependency_graph_is_acyclic():
    courses = load_courses_catalog()

    graph = build_course_dependency_graph(courses)

    ordered = topological_sort_courses(graph)

    assert len(ordered) == len(graph)


def test_find_courses_for_target_skills():
    courses = [
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
        },
        {
            "id": "ml",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
        },
    ]

    result = find_courses_for_target_skills(
        courses,
        {"machine-learning"},
    )

    assert result == {"ml"}


def test_collect_prerequisite_closure():
    graph = {
        "python": set(),
        "ml": {"python"},
        "deep-learning": {"ml"},
    }

    result = collect_prerequisite_closure(
        graph,
        {"deep-learning"},
    )

    assert result == {
        "python",
        "ml",
        "deep-learning",
    }


def test_collect_prerequisite_closure_multiple_branches():
    graph = {
        "python": set(),
        "statistics": set(),
        "ml": {
            "python",
            "statistics",
        },
    }

    result = collect_prerequisite_closure(
        graph,
        {"ml"},
    )

    assert result == {
        "python",
        "statistics",
        "ml",
    }


def test_personalized_sequence_includes_required_prerequisites():
    courses = [
        {
            "id": "python-basics",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml-fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {
                "python": 2,
            },
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids == [
        "python-basics",
        "ml-fundamentals",
    ]


def test_personalized_sequence_skips_satisfied_prerequisite():
    courses = [
        {
            "id": "python-basics",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml-fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {
                "python": 8,
            },
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids == [
        "ml-fundamentals",
    ]


def test_personalized_sequence_skips_completed_courses():
    courses = [
        {
            "id": "python-basics",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml-fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {
                "python": 2,
            },
            "completed_courses": [
                "python-basics",
            ],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids == [
        "ml-fundamentals",
    ]


def test_personalized_sequence_excludes_unrelated_courses():
    courses = [
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "machine-learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
        {
            "id": "react",
            "skills": [
                {
                    "skill_id": "react",
                    "target_level": 6,
                }
            ],
            "prerequisites": [],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {},
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert "react" not in ids
    assert "machine-learning" in ids
    assert "python" in ids


def test_personalized_sequence_handles_multiple_prerequisites():
    courses = [
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "statistics",
            "skills": [
                {
                    "skill_id": "statistics",
                    "target_level": 4,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                },
                {
                    "skill_id": "statistics",
                    "minimum_level": 4,
                },
            ],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {},
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids.index("python") < ids.index("ml")
    assert ids.index("statistics") < ids.index("ml")


def test_personalized_sequence_uses_best_target_course():
    courses = [
        {
            "id": "ml-generic",
            "title": "Generic Machine Learning",
            "description": "General machine learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.30,
        },
        {
            "id": "ml-python",
            "title": "Machine Learning with Python",
            "description": "Machine learning using Python",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.90,
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": [],
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids == ["ml-python"]


def test_optimized_target_course_keeps_its_prerequisites():
    courses = [
        {
            "id": "python",
            "title": "Python Fundamentals",
            "description": "Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
        },
        {
            "id": "ml-generic",
            "title": "Generic ML",
            "description": "Machine learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.30,
        },
        {
            "id": "ml-python",
            "title": "Machine Learning with Python",
            "description": "Machine learning using Python",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
            "difficulty": "beginner",
            "semantic_similarity": 0.90,
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {
                "python": 0,
            },
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids == [
        "python",
        "ml-python",
    ]

    assert "ml-generic" not in ids


def test_optimized_sequence_does_not_repeat_completed_prerequisite():
    courses = [
        {
            "id": "python",
            "title": "Python Fundamentals",
            "description": "Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml",
            "title": "Machine Learning",
            "description": "Machine learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {
                "python": 5,
            },
            "completed_courses": [
                "python",
            ],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    ids = [course["id"] for course in result]

    assert ids == ["ml"]



def test_group_courses_by_target_skill():
    courses = [
        {
            "id": "ml-fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 6,
                }
            ],
        },
        {
            "id": "advanced-ml",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 9,
                }
            ],
        },
        {
            "id": "python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
        },
    ]

    result = group_courses_by_target_skill(
        courses,
        {"machine-learning"},
    )

    assert {
        course["id"]
        for course in result["machine-learning"]
    } == {
        "ml-fundamentals",
        "advanced-ml",
    }


def test_select_best_course_for_skill_uses_recommendation_ranking():
    candidates = [
        {
            "id": "generic-ml",
            "title": "Generic Machine Learning",
            "description": "General machine learning concepts",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.30,
        },
        {
            "id": "ml-for-python",
            "title": "Machine Learning with Python",
            "description": "Machine learning using Python",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.90,
        },
    ]

    learner = {
        "skills": [
            {
                "name": "python",
                "level": 5,
            }
        ],
        "experience_level": "beginner",
    }

    skill_gaps = [
        {
            "name": "machine-learning",
            "target_level": 7,
            "current_level": 0,
            "gap": 7,
        }
    ]

    result = select_best_course_for_skill(
        candidates=candidates,
        learner=learner,
        skill_gaps=skill_gaps,
        goal="Machine Learning Engineer",
    )

    assert result is not None
    assert result["id"] == "ml-for-python"


def test_select_best_course_for_skill_returns_none_for_empty_candidates():
    result = select_best_course_for_skill(
        candidates=[],
        learner={},
        skill_gaps=[],
        goal="Machine Learning Engineer",
    )

    assert result is None


def test_select_best_course_for_skill_preserves_score_breakdown():
    candidates = [
        {
            "id": "ml-course",
            "title": "Machine Learning",
            "description": "Machine learning fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.90,
        }
    ]

    result = select_best_course_for_skill(
        candidates=candidates,
        learner={
            "skills": [],
            "experience_level": "beginner",
        },
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
                "current_level": 0,
                "gap": 7,
            }
        ],
        goal="Machine Learning Engineer",
    )

    assert "match_score" in result
    assert "score_breakdown" in result
    assert "semantic_similarity" in result["score_breakdown"]


def test_select_best_course_for_skill_only_considers_sufficient_courses():
    candidates = [
        {
            "id": "insufficient",
            "title": "Intro Python",
            "description": "Basic Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 3,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.99,
        },
        {
            "id": "sufficient",
            "title": "Python Fundamentals",
            "description": "Python fundamentals",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.50,
        },
    ]

    # Filter candidates to those that satisfy Python >= 5
    valid_candidates = [
        course
        for course in candidates
        if get_course_skill_levels(course).get(
            "python",
            0.0,
        ) >= 5
    ]

    result = select_best_course_for_skill(
        candidates=valid_candidates,
        learner={
            "skills": [],
            "experience_level": "beginner",
        },
        skill_gaps=[
            {
                "name": "python",
                "target_level": 5,
                "current_level": 0,
                "gap": 5,
            }
        ],
        goal="Python Developer",
    )

    assert result["id"] == "sufficient"


def test_select_best_target_courses_selects_one_course_per_skill():
    courses = [
        {
            "id": "ml-generic",
            "title": "Generic ML",
            "description": "Machine learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.30,
        },
        {
            "id": "ml-python",
            "title": "Machine Learning with Python",
            "description": "Machine learning using Python",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.90,
        },
    ]

    learner = {
        "skills": [],
        "experience_level": "beginner",
    }

    skill_gaps = [
        {
            "name": "machine-learning",
            "target_level": 7,
        }
    ]

    result = select_best_target_courses(
        courses=courses,
        target_skills={"machine-learning"},
        learner=learner,
        skill_gaps=skill_gaps,
        goal="Machine Learning Engineer",
    )

    assert result == {"ml-python"}


def test_select_best_target_courses_handles_multiple_skills():
    courses = [
        {
            "id": "python-course",
            "title": "Python",
            "description": "Python programming",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.8,
        },
        {
            "id": "ml-course",
            "title": "Machine Learning",
            "description": "Machine learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "semantic_similarity": 0.8,
        },
    ]

    learner = {
        "skills": [],
        "experience_level": "beginner",
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 5,
        },
        {
            "name": "machine-learning",
            "target_level": 7,
        },
    ]

    result = select_best_target_courses(
        courses=courses,
        target_skills={
            "python",
            "machine-learning",
        },
        learner=learner,
        skill_gaps=skill_gaps,
        goal="Machine Learning Engineer",
    )

    assert result == {
        "python-course",
        "ml-course",
    }


def test_real_catalog_can_generate_personalized_path():
    courses = load_courses_catalog()

    learner = {
        "skills": [],
        "completed_courses": [],
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 5,
            "current_level": 0,
            "gap": 5,
        }
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner=learner,
        goal="Machine Learning Engineer",
        skill_gaps=skill_gaps,
    )

    assert isinstance(result, list)

    ids = [
        course.get("id")
        for course in result
    ]

    assert len(ids) == len(set(ids))


def test_real_catalog_personalized_path_has_no_duplicate_courses():
    courses = load_courses_catalog()

    learner = {
        "skills": [],
        "completed_courses": [],
    }

    skill_gaps = [
        {
            "name": "machine-learning",
            "target_level": 7,
            "current_level": 0,
            "gap": 7,
        }
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner=learner,
        goal="Machine Learning Engineer",
        skill_gaps=skill_gaps,
    )

    ids = [
        course.get("id")
        for course in result
    ]

    assert len(ids) == len(set(ids))


def test_real_catalog_personalized_path_respects_prerequisite_order():
    courses = load_courses_catalog()

    learner = {
        "skills": [],
        "completed_courses": [],
    }

    skill_gaps = [
        {
            "name": "machine-learning",
            "target_level": 7,
            "current_level": 0,
            "gap": 7,
        }
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner=learner,
        goal="Machine Learning Engineer",
        skill_gaps=skill_gaps,
    )

    positions = {
        course.get("id"): index
        for index, course in enumerate(result)
    }

    graph = build_course_dependency_graph(courses)

    for course_id, index in positions.items():
        for prerequisite_id in graph.get(course_id, set()):
            if prerequisite_id in positions:
                assert positions[prerequisite_id] < index


def test_real_catalog_path_excludes_completed_courses():
    courses = load_courses_catalog()

    learner = {
        "skills": [],
        "completed_courses": [
            "python-basics",
        ],
    }

    skill_gaps = [
        {
            "name": "machine-learning",
            "target_level": 7,
            "current_level": 0,
            "gap": 7,
        }
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner=learner,
        goal="Machine Learning Engineer",
        skill_gaps=skill_gaps,
    )

    ids = {
        course.get("id")
        for course in result
    }

    assert "python-basics" not in ids


@pytest.mark.parametrize(
    "goal,skill",
    [
        ("AI Engineer", "machine-learning"),
        ("Data Scientist", "python"),
        ("Full Stack Developer", "javascript"),
        ("DevOps Engineer", "docker"),
    ],
)
def test_real_catalog_generates_paths_for_multiple_goals(
    goal,
    skill,
):
    courses = load_courses_catalog()

    learner = {
        "skills": [],
        "completed_courses": [],
    }

    skill_gaps = [
        {
            "name": skill,
            "target_level": 5,
            "current_level": 0,
            "gap": 5,
        }
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner=learner,
        goal=goal,
        skill_gaps=skill_gaps,
    )

    assert isinstance(result, list)

    ids = [
        course.get("id")
        for course in result
    ]

    assert len(ids) == len(set(ids))


def test_generate_personalized_learning_path_includes_milestones():
    courses = [
        {
            "id": "python",
            "title": "Python Fundamentals",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "duration_hours": 10,
            "prerequisites": [],
        },
        {
            "id": "ml",
            "title": "Machine Learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "duration_hours": 12,
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = generate_personalized_learning_path(
        courses=courses,
        learner={
            "skills": {},
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    assert result["success"] is True
    assert result["goal"] == "Machine Learning Engineer"

    assert result["total_courses"] == 2
    assert result["total_milestones"] == 2

    assert [
        course["id"]
        for course in result["courses"]
    ] == [
        "python",
        "ml",
    ]

    assert result["milestones"][0]["course_ids"] == [
        "python"
    ]

    assert result["milestones"][1]["course_ids"] == [
        "ml"
    ]


def test_generate_personalized_learning_path_handles_no_matching_courses():
    courses = [
        {
            "id": "python",
            "title": "Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        }
    ]

    result = generate_personalized_learning_path(
        courses=courses,
        learner={
            "skills": {},
            "completed_courses": [],
        },
        goal="Cybersecurity Analyst",
        skill_gaps=[
            {
                "name": "cybersecurity",
                "target_level": 5,
            }
        ],
    )

    assert result["success"] is True
    assert result["total_courses"] == 0
    assert result["total_milestones"] == 0
    assert result["courses"] == []
    assert result["milestones"] == []


def test_personalized_sequence_attaches_dependency_depth():
    courses = [
        {
            "id": "python",
            "title": "Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "prerequisites": [],
        },
        {
            "id": "ml",
            "title": "Machine Learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = select_personalized_course_sequence(
        courses=courses,
        learner={
            "skills": {},
            "completed_courses": [],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    assert result[0]["id"] == "python"
    assert result[0]["dependency_depth"] == 0

    assert result[1]["id"] == "ml"
    assert result[1]["dependency_depth"] == 1


def test_calculate_milestone_progress_not_started():
    result = calculate_milestone_progress(
        course_ids=["python", "statistics"],
        completed_course_ids=set(),
    )

    assert result["progress"] == 0.0
    assert result["status"] == "not_started"
    assert result["completed_course_ids"] == []
    assert result["remaining_course_ids"] == [
        "python",
        "statistics",
    ]
    assert result["next_course_id"] == "python"


def test_calculate_milestone_progress_in_progress():
    result = calculate_milestone_progress(
        course_ids=["python", "statistics"],
        completed_course_ids={"python"},
    )

    assert result["progress"] == 0.5
    assert result["status"] == "in_progress"
    assert result["completed_course_ids"] == ["python"]
    assert result["remaining_course_ids"] == ["statistics"]
    assert result["next_course_id"] == "statistics"


def test_calculate_milestone_progress_completed():
    result = calculate_milestone_progress(
        course_ids=["python", "statistics"],
        completed_course_ids={
            "python",
            "statistics",
        },
    )

    assert result["progress"] == 1.0
    assert result["status"] == "completed"
    assert result["completed_course_ids"] == [
        "python",
        "statistics",
    ]
    assert result["remaining_course_ids"] == []
    assert result["next_course_id"] is None


def test_calculate_milestone_progress_empty():
    result = calculate_milestone_progress(
        course_ids=[],
        completed_course_ids=set(),
    )

    assert result["progress"] == 0.0
    assert result["status"] == "not_started"
    assert result["next_course_id"] is None


def test_personalized_learning_path_reflects_completed_courses():
    courses = [
        {
            "id": "python",
            "title": "Python Fundamentals",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "duration_hours": 10,
            "prerequisites": [],
        },
        {
            "id": "ml",
            "title": "Machine Learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "duration_hours": 12,
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = generate_personalized_learning_path(
        courses=courses,
        learner={
            "skills": {
                "python": 5,
            },
            "completed_courses": [
                "python",
            ],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    assert result["milestones"][0]["status"] == "not_started"
    assert result["milestones"][0]["progress"] == 0.0
    assert result["milestones"][0]["next_course_id"] == "ml"


def test_calculate_overall_path_progress_empty():
    result = calculate_overall_path_progress([])

    assert result["total_courses"] == 0
    assert result["completed_courses"] == 0
    assert result["overall_progress"] == 0.0
    assert result["total_milestones"] == 0
    assert result["completed_milestones"] == 0
    assert result["current_milestone"] is None
    assert result["next_course_id"] is None


def test_calculate_overall_path_progress_not_started():
    milestones = [
        {
            "title": "Foundations",
            "status": "not_started",
            "course_ids": [
                "python",
                "statistics",
            ],
            "completed_course_ids": [],
            "next_course_id": "python",
        },
        {
            "title": "Machine Learning Core",
            "status": "not_started",
            "course_ids": [
                "ml",
            ],
            "completed_course_ids": [],
            "next_course_id": "ml",
        },
    ]

    result = calculate_overall_path_progress(milestones)

    assert result["total_courses"] == 3
    assert result["completed_courses"] == 0
    assert result["overall_progress"] == 0.0
    assert result["total_milestones"] == 2
    assert result["completed_milestones"] == 0
    assert result["current_milestone"] == "Foundations"
    assert result["next_course_id"] == "python"


def test_calculate_overall_path_progress_partial():
    milestones = [
        {
            "title": "Foundations",
            "status": "completed",
            "course_ids": [
                "python",
                "statistics",
            ],
            "completed_course_ids": [
                "python",
                "statistics",
            ],
            "next_course_id": None,
        },
        {
            "title": "Machine Learning Core",
            "status": "in_progress",
            "course_ids": [
                "ml",
                "ml-project",
            ],
            "completed_course_ids": [
                "ml",
            ],
            "next_course_id": "ml-project",
        },
        {
            "title": "Advanced Machine Learning",
            "status": "not_started",
            "course_ids": [
                "ml-advanced",
            ],
            "completed_course_ids": [],
            "next_course_id": "ml-advanced",
        },
    ]

    result = calculate_overall_path_progress(milestones)

    assert result["total_courses"] == 5
    assert result["completed_courses"] == 3
    assert result["overall_progress"] == 0.6

    assert result["total_milestones"] == 3
    assert result["completed_milestones"] == 1

    assert result["current_milestone"] == "Machine Learning Core"
    assert result["next_course_id"] == "ml-project"


def test_calculate_overall_path_progress_completed():
    milestones = [
        {
            "title": "Foundations",
            "status": "completed",
            "course_ids": ["python"],
            "completed_course_ids": ["python"],
            "next_course_id": None,
        },
        {
            "title": "Machine Learning Core",
            "status": "completed",
            "course_ids": ["ml"],
            "completed_course_ids": ["ml"],
            "next_course_id": None,
        },
    ]

    result = calculate_overall_path_progress(milestones)

    assert result["total_courses"] == 2
    assert result["completed_courses"] == 2
    assert result["overall_progress"] == 1.0

    assert result["total_milestones"] == 2
    assert result["completed_milestones"] == 2

    assert result["current_milestone"] is None
    assert result["next_course_id"] is None


def test_personalized_learning_path_includes_overall_progress():
    courses = [
        {
            "id": "python",
            "title": "Python Fundamentals",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5,
                }
            ],
            "duration_hours": 10,
            "prerequisites": [],
        },
        {
            "id": "ml",
            "title": "Machine Learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7,
                }
            ],
            "duration_hours": 12,
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5,
                }
            ],
        },
    ]

    result = generate_personalized_learning_path(
        courses=courses,
        learner={
            "skills": {
                "python": 5,
            },
            "completed_courses": [
                "python",
            ],
        },
        goal="Machine Learning Engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
                "target_level": 7,
            }
        ],
    )

    progress = result["progress"]

    assert progress["total_courses"] == 1
    assert progress["completed_courses"] == 0
    assert progress["overall_progress"] == 0.0
    assert progress["total_milestones"] == 1
    assert progress["total_milestones"] == 1
    assert progress["completed_milestones"] == 0
    assert progress["current_milestone"] == "Machine Learning Core"
    assert progress["next_course_id"] == "ml"


def test_attach_project_to_matching_milestone():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
            "status": "not_started",
            "progress": 0.0,
            "completed_course_ids": [],
            "remaining_course_ids": ["python-basics"],
            "next_course_id": "python-basics",
        }
    ]
    projects = [
        {
            "id": "python-cli-project",
            "title": "Build a Python CLI",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_hours": 8.0,
            "prerequisites": [],
        }
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 1.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        projects=projects,
    )

    assert len(res[0]["project_ids"]) == 1
    assert res[0]["project_ids"][0] == "python-cli-project"
    assert len(res[0]["projects"]) == 1
    assert res[0]["projects"][0]["project_id"] == "python-cli-project"


def test_unrelated_project_not_attached():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    projects = [
        {
            "id": "react-app",
            "title": "React Task Manager",
            "skills": [{"skill_id": "react", "target_level": 5.0}],
            "difficulty": "intermediate",
            "duration_hours": 10.0,
            "prerequisites": [],
        }
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 1.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        projects=projects,
    )

    assert res[0]["project_ids"] == []
    assert res[0]["projects"] == []


def test_project_with_unmet_prerequisite_not_attached():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "ML Core",
            "skills": ["machine learning"],
            "course_ids": ["ml-101"],
        }
    ]
    projects = [
        {
            "id": "ml-advanced-project",
            "title": "Advanced ML Pipeline",
            "skills": [{"skill_id": "machine learning", "target_level": 8.0}],
            "difficulty": "advanced",
            "duration_hours": 15.0,
            "prerequisites": [{"skill_id": "python", "minimum_level": 5.0}],
        }
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 2.0}},
        skill_gaps=[{"skill_id": "machine learning", "target_level": 8.0}],
        goal="ML Engineer",
        projects=projects,
    )

    assert res[0]["project_ids"] == []
    assert res[0]["projects"] == []


def test_completed_project_not_recommended():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    projects = [
        {
            "id": "python-cli-project",
            "title": "Build a Python CLI",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_hours": 8.0,
            "prerequisites": [],
        }
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={
            "skills": {"python": 1.0},
            "completed_projects": ["python-cli-project"],
        },
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        projects=projects,
    )

    assert res[0]["project_ids"] == []
    assert res[0]["projects"] == []


def test_project_not_duplicated_across_milestones():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Basics",
            "skills": ["python"],
            "course_ids": ["py1"],
        },
        {
            "milestone_id": "milestone-2",
            "title": "Python Core",
            "skills": ["python"],
            "course_ids": ["py2"],
        },
    ]
    projects = [
        {
            "id": "python-cli-project",
            "title": "Build a Python CLI",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_hours": 8.0,
            "prerequisites": [],
        }
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 1.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        projects=projects,
    )

    assert res[0]["project_ids"] == ["python-cli-project"]
    assert res[1]["project_ids"] == []


def test_multiple_milestones_receive_relevant_projects():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Basics",
            "skills": ["python"],
            "course_ids": ["py1"],
        },
        {
            "milestone_id": "milestone-2",
            "title": "DevOps Core",
            "skills": ["docker"],
            "course_ids": ["doc1"],
        },
    ]
    projects = [
        {
            "id": "python-cli-project",
            "title": "Build a Python CLI",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_hours": 8.0,
            "prerequisites": [],
        },
        {
            "id": "dockerized-web-application",
            "title": "Containerize Web App",
            "skills": [{"skill_id": "docker", "target_level": 5.0}],
            "difficulty": "intermediate",
            "duration_hours": 10.0,
            "prerequisites": [],
        },
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 1.0, "docker": 1.0}},
        skill_gaps=[
            {"skill_id": "python", "target_level": 5.0},
            {"skill_id": "docker", "target_level": 5.0},
        ],
        goal="DevOps Engineer",
        projects=projects,
    )

    assert res[0]["project_ids"] == ["python-cli-project"]
    assert res[1]["project_ids"] == ["dockerized-web-application"]


def test_learning_path_without_projects_still_works():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Basics",
            "skills": ["python"],
            "course_ids": ["py1"],
        }
    ]

    res = attach_projects_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 1.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        projects=[],
    )

    assert res[0]["project_ids"] == []
    assert res[0]["projects"] == []


def test_attach_assessment_to_matching_milestone():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    assessments = [
        {
            "id": "python-foundations-assessment",
            "title": "Python Foundations Assessment",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 5.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=assessments,
    )

    assert len(res[0]["assessment_ids"]) == 1
    assert res[0]["assessment_ids"][0] == "python-foundations-assessment"
    assert len(res[0]["assessments"]) == 1
    assert res[0]["assessments"][0]["assessment_id"] == "python-foundations-assessment"


def test_unrelated_assessment_not_attached():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    assessments = [
        {
            "id": "react-assessment",
            "title": "React Assessment",
            "skills": [{"skill_id": "react", "target_level": 5.0}],
            "difficulty": "intermediate",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 5.0, "react": 5.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=assessments,
    )

    assert res[0]["assessment_ids"] == []
    assert res[0]["assessments"] == []


def test_assessment_with_insufficient_skills_not_attached():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    assessments = [
        {
            "id": "python-foundations-assessment",
            "title": "Python Foundations Assessment",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 2.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=assessments,
    )

    assert res[0]["assessment_ids"] == []
    assert res[0]["assessments"] == []


def test_completed_assessment_not_attached():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    assessments = [
        {
            "id": "python-foundations-assessment",
            "title": "Python Foundations Assessment",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={
            "skills": {"python": 5.0},
            "completed_assessments": ["python-foundations-assessment"],
        },
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=assessments,
    )

    assert res[0]["assessment_ids"] == []
    assert res[0]["assessments"] == []


def test_assessment_not_duplicated_across_milestones():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Basics",
            "skills": ["python"],
            "course_ids": ["py1"],
        },
        {
            "milestone_id": "milestone-2",
            "title": "Python Core",
            "skills": ["python"],
            "course_ids": ["py2"],
        },
    ]
    assessments = [
        {
            "id": "python-foundations-assessment",
            "title": "Python Foundations Assessment",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 5.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=assessments,
    )

    assert res[0]["assessment_ids"] == ["python-foundations-assessment"]
    assert res[1]["assessment_ids"] == []


def test_multiple_milestones_receive_relevant_assessments():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Basics",
            "skills": ["python"],
            "course_ids": ["py1"],
        },
        {
            "milestone_id": "milestone-2",
            "title": "DevOps Core",
            "skills": ["docker"],
            "course_ids": ["doc1"],
        },
    ]
    assessments = [
        {
            "id": "python-foundations-assessment",
            "title": "Python Foundations Assessment",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        },
        {
            "id": "docker-assessment",
            "title": "Docker Assessment",
            "skills": [{"skill_id": "docker", "target_level": 5.0}],
            "difficulty": "intermediate",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        },
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 5.0, "docker": 5.0}},
        skill_gaps=[
            {"skill_id": "python", "target_level": 5.0},
            {"skill_id": "docker", "target_level": 5.0},
        ],
        goal="DevOps Engineer",
        assessments=assessments,
    )

    assert res[0]["assessment_ids"] == ["python-foundations-assessment"]
    assert res[1]["assessment_ids"] == ["docker-assessment"]


def test_learning_path_without_assessments_still_works():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Basics",
            "skills": ["python"],
            "course_ids": ["py1"],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={"skills": {"python": 5.0}},
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=[],
    )

    assert res[0]["assessment_ids"] == []
    assert res[0]["assessments"] == []


def test_completed_course_can_make_assessment_ready():
    milestones = [
        {
            "milestone_id": "milestone-1",
            "title": "Python Foundations",
            "skills": ["python"],
            "course_ids": ["python-basics"],
        }
    ]
    assessments = [
        {
            "id": "python-foundations-assessment",
            "title": "Python Foundations Assessment",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "difficulty": "beginner",
            "duration_minutes": 30,
            "passing_score": 70,
            "questions": [],
        }
    ]
    courses = [
        {
            "id": "python-basics",
            "title": "Python Fundamentals",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "prerequisites": [],
        }
    ]

    res = attach_assessments_to_learning_path(
        milestones=milestones,
        learner={
            "skills": {"python": 2.0},
            "completed_courses": ["python-basics"],
        },
        skill_gaps=[{"skill_id": "python", "target_level": 5.0}],
        goal="Python Developer",
        assessments=assessments,
        courses=courses,
    )

    assert res[0]["assessment_ids"] == ["python-foundations-assessment"]
    assert len(res[0]["assessments"]) == 1


def test_regression_ai_engineer_empty_skill_gaps():
    courses = load_courses_catalog()
    learner = {"skills": {}}
    res = generate_personalized_learning_path(
        courses=courses,
        learner=learner,
        goal="ai-engineer",
        skill_gaps=[],
    )
    assert res["success"] is True
    assert res["status"] == "active"
    assert res["total_courses"] > 0
    assert res["total_milestones"] > 0
    assert len(res["courses"]) > 0
    assert len(res["milestones"]) > 0
    assert learner == {"skills": {}}


def test_regression_ai_engineer_none_skill_gaps():
    courses = load_courses_catalog()
    learner = {"skills": {}}
    res = generate_personalized_learning_path(
        courses=courses,
        learner=learner,
        goal="ai-engineer",
        skill_gaps=None,
    )
    assert res["success"] is True
    assert res["status"] == "active"
    assert res["total_courses"] > 0
    assert res["total_milestones"] > 0


def test_regression_ai_engineer_explicit_skill_gaps():
    courses = load_courses_catalog()
    learner = {"skills": {}}
    explicit_gaps = [{"skillId": "python", "gap": 2, "targetLevel": 5}]
    res = generate_personalized_learning_path(
        courses=courses,
        learner=learner,
        goal="ai-engineer",
        skill_gaps=explicit_gaps,
    )
    assert res["success"] is True
    assert res["status"] == "active"
    assert res["total_courses"] > 0
    taught_skills = {
        s.get("skill_id")
        for c in res["courses"]
        for s in c.get("skills", [])
        if isinstance(s, dict)
    }
    assert "python" in taught_skills


def test_regression_unmapped_goal_empty_skill_gaps():
    courses = load_courses_catalog()
    learner = {"skills": {}}
    res = generate_personalized_learning_path(
        courses=courses,
        learner=learner,
        goal="unmapped-unknown-career-xyz",
        skill_gaps=[],
    )
    assert res["success"] is True
    assert res["status"] == "no_recommendations"
    assert res["total_courses"] == 0
    assert res["total_milestones"] == 0
    assert res["courses"] == []
    assert res["milestones"] == []
    assert res["reason"] is not None
    assert "No skill gaps" in res["reason"] or "could be resolved" in res["reason"]


def test_regression_learner_partial_existing_skills():
    courses = load_courses_catalog()
    learner = {"skills": {"python": 5.0}}
    res = generate_personalized_learning_path(
        courses=courses,
        learner=learner,
        goal="ai-engineer",
        skill_gaps=[],
    )
    assert res["success"] is True
    assert res["status"] == "active"
    assert res["total_courses"] > 0
    course_ids = [c["id"] for c in res["courses"]]
    assert "python-basics" not in course_ids


def test_regression_learner_all_target_skills_satisfied():
    courses = load_courses_catalog()
    learner = {
        "skills": {
            "python": 10.0, "git & github": 10.0, "linux / cli": 10.0, "numpy": 10.0, "pandas": 10.0,
            "sql": 10.0, "linear algebra": 10.0, "probability & statistics": 10.0, "data analysis": 10.0,
            "data preprocessing": 10.0, "machine learning": 10.0, "supervised learning": 10.0,
            "unsupervised learning": 10.0, "feature engineering": 10.0, "model evaluation": 10.0,
            "scikit-learn": 10.0, "deep learning": 10.0, "neural networks": 10.0, "pytorch": 10.0,
            "nlp": 10.0, "computer vision": 10.0, "transformers": 10.0, "llm fundamentals": 10.0,
            "embeddings": 10.0, "rag": 10.0, "vector databases": 10.0, "ai agents": 10.0,
            "fine-tuning": 10.0, "fastapi model serving": 10.0, "docker": 10.0, "mlops": 10.0,
            "cloud deployment": 10.0, "production ai project": 10.0, "portfolio": 10.0
        }
    }
    res = generate_personalized_learning_path(
        courses=courses,
        learner=learner,
        goal="ai-engineer",
        skill_gaps=[],
    )
    assert res["success"] is True
    assert res["status"] == "completed"
    assert res["total_courses"] == 0
    assert res["total_milestones"] == 0
    assert res["courses"] == []
    assert res["milestones"] == []
    assert res["reason"] is not None
    assert "satisfied all target skill requirements" in res["reason"]


def test_occupational_careers_generate_learning_path_milestones():
    courses = load_courses_catalog()
    for career_goal in ["Commercial Pilot", "pilot", "Civil Engineer", "civil-engineer"]:
        res = generate_personalized_learning_path(
            courses=courses,
            learner={"skills": {}, "completed_courses": []},
            goal=career_goal,
            skill_gaps=[],
        )
        assert res["success"] is True
        assert res["status"] == "active"
        assert res["total_courses"] > 0
        assert res["total_milestones"] > 0
        assert len(res["milestones"]) > 0














