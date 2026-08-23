import pytest
from app.services.learning_recommendation_engine import (
    LearningRecommendationEngine,
    recommend_next_learning,
    retrieve_candidates,
    filter_prerequisites,
    rank_candidates,
    parse_learner_skills,
    parse_skill_gaps,
    parse_completed_courses,
    build_effective_skill_levels,
    compute_gap_coverage_score
)


@pytest.fixture
def sample_courses():
    return [
        {
            "id": "course-python-101",
            "title": "Python Basics",
            "description": "Learn basic Python syntax and programming.",
            "provider": "Test Provider",
            "skills_covered": ["python", "coding"],
            "prerequisites": [],
            "level": "beginner",
            "duration_hours": 10,
            "rating": 4.8
        },
        {
            "id": "course-docker-101",
            "title": "Docker Fundamentals",
            "description": "Learn containerization with Docker.",
            "provider": "Test Provider",
            "skills_covered": ["docker", "devops"],
            "prerequisites": ["linux"],
            "level": "intermediate",
            "duration_hours": 15,
            "rating": 4.7
        },
        {
            "id": "course-k8s-101",
            "title": "Kubernetes Mastery",
            "description": "Master container orchestration.",
            "provider": "Test Provider",
            "skills_covered": ["kubernetes", "devops"],
            "prerequisites": ["docker"],
            "level": "advanced",
            "duration_hours": 25,
            "rating": 4.9
        },
        {
            "id": "course-react-101",
            "title": "React Development",
            "description": "Build modern web UIs with React.",
            "provider": "Test Provider",
            "skills_covered": ["react", "frontend"],
            "prerequisites": ["javascript"],
            "level": "intermediate",
            "duration_hours": 20,
            "rating": 4.8
        }
    ]


@pytest.fixture
def proficiency_courses():
    return [
        {
            "id": "python-basics",
            "title": "Python Fundamentals",
            "description": "Learn Python fundamentals.",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 5.0,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "duration_hours": 15,
        },
        {
            "id": "advanced-python",
            "title": "Advanced Python",
            "description": "Advanced Python programming.",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 8.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                }
            ],
            "difficulty": "advanced",
            "duration_hours": 25,
        },
        {
            "id": "ml-fundamentals",
            "title": "Machine Learning Fundamentals",
            "description": "Learn machine learning fundamentals.",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                },
                {
                    "skill_id": "statistics",
                    "minimum_level": 5.0,
                },
            ],
            "difficulty": "intermediate",
            "duration_hours": 25,
        },
    ]


def test_parsing_utilities():
    skills = parse_learner_skills([{"name": "Python", "level": 3}, "Linux"])
    assert skills["python"] == 3
    assert skills["linux"] == 1

    completed = parse_completed_courses(["course-python-101", "Git"])
    assert "course-python-101" in completed
    assert "git" in completed

    gaps = parse_skill_gaps(["Docker", {"name": "React", "gap": 4}])
    assert len(gaps) == 2
    assert gaps[0]["skillId"] == "docker"
    assert gaps[1]["skillId"] == "react"


def test_candidate_retrieval(sample_courses):
    completed = {"course-python-101"}
    gaps = [{"skillId": "docker", "skillName": "Docker", "gap": 3, "required_level": 3, "importance": 0.8}]
    goal = "DevOps Engineer"

    candidates = retrieve_candidates(sample_courses, gaps, completed, goal)

    candidate_ids = [c["id"] for c in candidates]
    assert "course-python-101" not in candidate_ids
    assert "course-docker-101" in candidate_ids
    assert "course-k8s-101" in candidate_ids


def test_prerequisite_filtering(sample_courses):
    learner_skills = {"linux": 2}
    completed = set()

    eligible, locked = filter_prerequisites(sample_courses, learner_skills, completed)

    eligible_ids = [c["id"] for c in eligible]
    locked_ids = [c["id"] for c in locked]

    assert "course-docker-101" in eligible_ids
    assert "course-k8s-101" in locked_ids


def test_ranking_and_recommendation(sample_courses):
    learner = {
        "skills": [{"name": "Linux", "level": 2}],
        "experience_level": "intermediate",
        "completed_courses": []
    }
    goal = "DevOps Engineer"
    skill_gaps = ["Docker", "Kubernetes"]

    result = recommend_next_learning(learner, goal, skill_gaps, courses=sample_courses, top_k=2)

    assert result["success"] is True
    assert len(result["recommendations"]) <= 2

    top_rec = result["recommendations"][0]
    assert "course_id" in top_rec
    assert "match_score" in top_rec
    assert 0.0 <= top_rec["match_score"] <= 1.0
    assert top_rec["prerequisites_status"] == "MET"
    assert top_rec["course_id"] == "course-docker-101"


def test_engine_class_interface(sample_courses):
    engine = LearningRecommendationEngine(courses=sample_courses)
    learner = {"skills": [{"name": "JavaScript", "level": 3}]}
    result = engine.recommend(learner, goal="Frontend Developer", skill_gaps=["React"], top_k=1)

    assert result["success"] is True
    assert len(result["recommendations"]) == 1
    assert result["recommendations"][0]["course_id"] == "course-react-101"


def test_prerequisite_minimum_level_blocks_course():
    courses = [
        {
            "id": "advanced-python",
            "title": "Advanced Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 8.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                }
            ],
        }
    ]

    eligible, locked = filter_prerequisites(
        courses,
        {"python": 4.0},
        set(),
    )

    assert not eligible
    assert len(locked) == 1
    assert locked[0]["id"] == "advanced-python"


def test_prerequisite_exact_minimum_level_is_eligible():
    courses = [
        {
            "id": "advanced-python",
            "title": "Advanced Python",
            "skills": [
                {
                    "skill_id": "python",
                    "target_level": 8.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                }
            ],
        }
    ]

    eligible, locked = filter_prerequisites(
        courses,
        {"python": 5.0},
        set(),
    )

    assert len(eligible) == 1
    assert eligible[0]["id"] == "advanced-python"
    assert not locked


def test_multiple_prerequisites_require_all_skills():
    courses = [
        {
            "id": "ml-fundamentals",
            "title": "Machine Learning Fundamentals",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 7.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                },
                {
                    "skill_id": "statistics",
                    "minimum_level": 5.0,
                },
            ],
        }
    ]

    eligible, locked = filter_prerequisites(
        courses,
        {
            "python": 5.0,
            "statistics": 4.0,
        },
        set(),
    )

    assert not eligible
    assert len(locked) == 1
    assert locked[0]["id"] == "ml-fundamentals"
    assert locked[0]["prerequisites_met"] is False


def test_prerequisite_exact_level_is_satisfied(proficiency_courses):
    learner_skills = {
        "python": 5.0
    }

    eligible, locked = filter_prerequisites(
        proficiency_courses,
        learner_skills,
        set(),
    )

    eligible_ids = [course["id"] for course in eligible]
    locked_ids = [course["id"] for course in locked]

    assert "advanced-python" in eligible_ids
    assert "advanced-python" not in locked_ids


def test_prerequisite_insufficient_level_locks_course(proficiency_courses):
    learner_skills = {
        "python": 4.0
    }

    eligible, locked = filter_prerequisites(
        proficiency_courses,
        learner_skills,
        set(),
    )

    eligible_ids = [course["id"] for course in eligible]
    locked_ids = [course["id"] for course in locked]

    assert "advanced-python" not in eligible_ids
    assert "advanced-python" in locked_ids

    locked_course = next(
        course
        for course in locked
        if course["id"] == "advanced-python"
    )

    assert locked_course["prerequisites_met"] is False
    assert locked_course["missing_prerequisites"]


def test_multiple_prerequisites(proficiency_courses):
    learner_skills = {
        "python": 5.0,
        "statistics": 4.0,
    }

    eligible, locked = filter_prerequisites(
        proficiency_courses,
        learner_skills,
        set(),
    )

    eligible_ids = [course["id"] for course in eligible]
    locked_ids = [course["id"] for course in locked]

    assert "ml-fundamentals" not in eligible_ids
    assert "ml-fundamentals" in locked_ids

    locked_course = next(
        course
        for course in locked
        if course["id"] == "ml-fundamentals"
    )

    assert any("statistics" in (p.get("skill_name", "") if isinstance(p, dict) else str(p)).lower() for p in locked_course["missing_prerequisites"])



def test_multiple_prerequisites_all_satisfied(proficiency_courses):
    learner_skills = {
        "python": 5.0,
        "statistics": 5.0,
    }

    eligible, locked = filter_prerequisites(
        proficiency_courses,
        learner_skills,
        set(),
    )

    eligible_ids = [course["id"] for course in eligible]

    assert "ml-fundamentals" in eligible_ids


def test_locked_courses_are_not_main_recommendations(proficiency_courses):
    learner = {
        "skills": [
            {
                "name": "Python",
                "level": 4,
            }
        ],
        "experience_level": "intermediate",
        "completed_courses": [],
    }

    result = recommend_next_learning(
        learner,
        goal="Advanced Python",
        skill_gaps=["Python"],
        courses=proficiency_courses,
        top_k=5,
    )

    assert result["success"] is True

    recommendation_ids = [
        item["course_id"]
        for item in result["recommendations"]
    ]

    locked_ids = [
        item["course_id"]
        for item in result.get("locked_recommendations", [])
    ]

    assert "advanced-python" not in recommendation_ids
    assert "advanced-python" in locked_ids


def test_build_effective_skill_levels(proficiency_courses):
    learner_skills = {"python": 2.0}
    completed_ids = {"python-basics"}

    effective = build_effective_skill_levels(learner_skills, completed_ids, proficiency_courses)
    # python-basics target_level is 5.0, so effective python level rises to 5.0
    assert effective["python"] == 5.0


def test_never_downgrade_explicit_skills(proficiency_courses):
    # Learner says Python = 7.0, completed python-basics (target = 5.0)
    learner_skills = {"python": 7.0}
    completed_ids = {"python-basics"}

    effective = build_effective_skill_levels(learner_skills, completed_ids, proficiency_courses)
    # Must keep 7.0, NOT downgrade to 5.0!
    assert effective["python"] == 7.0


def test_uncompleted_courses_do_not_give_evidence(proficiency_courses):
    # Learner has no explicit skills, completed_courses is empty
    learner_skills = {}
    completed_ids = set()

    effective = build_effective_skill_levels(learner_skills, completed_ids, proficiency_courses)
    assert "python" not in effective or effective.get("python", 0.0) == 0.0


def test_check_course_prerequisites_returns_structured_objects():
    from app.services.learning_recommendation_engine import check_course_prerequisites

    course = {
        "id": "advanced-python",
        "title": "Advanced Python",
        "prerequisites": [
            {"skill_id": "python", "minimum_level": 5.0}
        ]
    }

    learner_levels = {"python": 3.0}

    missing = check_course_prerequisites(course, learner_levels)
    assert len(missing) == 1
    m = missing[0]
    assert m["skill_id"] == "python"
    assert m["skill_name"] == "Python"
    assert m["required_level"] == 5.0
    assert m["current_level"] == 3.0
    assert m["gap"] == 2.0


def test_gap_coverage_partial_progress():
    course = {
        "id": "python-basics",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5.0,
            }
        ],
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 8.0,
            "current_level": 2.0,
            "gap": 6.0,
            "priority": 1.0,
        }
    ]

    score = compute_gap_coverage_score(
        course,
        skill_gaps,
        {"python": 2.0},
    )

    assert score == pytest.approx(0.5)


def test_gap_coverage_full_progress():
    course = {
        "id": "python-advanced",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 8.0,
            }
        ],
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 8.0,
            "current_level": 2.0,
            "gap": 6.0,
            "priority": 1.0,
        }
    ]

    score = compute_gap_coverage_score(
        course,
        skill_gaps,
        {"python": 2.0},
    )

    assert score == pytest.approx(1.0)


def test_gap_coverage_does_not_reward_overshooting():
    course = {
        "id": "python-expert",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 12.0,
            }
        ],
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 8.0,
            "current_level": 6.0,
            "gap": 2.0,
            "priority": 1.0,
        }
    ]

    score = compute_gap_coverage_score(
        course,
        skill_gaps,
        {"python": 6.0},
    )

    assert score == pytest.approx(1.0)


def test_no_gap_means_no_coverage():
    course = {
        "id": "python-basics",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5.0,
            }
        ],
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 5.0,
            "current_level": 5.0,
            "gap": 0.0,
            "priority": 1.0,
        }
    ]

    score = compute_gap_coverage_score(
        course,
        skill_gaps,
        {"python": 5.0},
    )

    assert score == pytest.approx(0.0)


def test_higher_gap_coverage_improves_course_score():
    skill_gaps = [
        {
            "name": "python",
            "target_level": 8.0,
            "current_level": 2.0,
            "gap": 6.0,
            "priority": 1.0,
        }
    ]

    learner_skills = {"python": 2.0}
    learner = {"skills": learner_skills, "experience_level": "intermediate"}

    basic_course = {
        "id": "python-basic",
        "title": "Python Fundamentals",
        "description": "Learn Python fundamentals",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5.0,
            }
        ],
        "prerequisites": [],
        "difficulty": "intermediate",
    }

    advanced_course = {
        "id": "python-advanced",
        "title": "Advanced Python",
        "description": "Advanced Python programming",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 8.0,
            }
        ],
        "prerequisites": [],
        "difficulty": "intermediate",
    }

    parsed_gaps = parse_skill_gaps(skill_gaps)
    basic_score = rank_candidates([basic_course], parsed_gaps, learner, goal="Python")[0]
    advanced_score = rank_candidates([advanced_course], parsed_gaps, learner, goal="Python")[0]

    assert (
        advanced_score["score_breakdown"]["skill_gap_coverage"]
        > basic_score["score_breakdown"]["skill_gap_coverage"]
    )


def test_no_relevant_gap_course_does_not_rank_highly():
    skill_gaps = [
        {
            "name": "python",
            "target_level": 8.0,
            "current_level": 2.0,
            "gap": 6.0,
            "priority": 1.0,
        }
    ]

    learner = {"skills": {"python": 2.0}, "experience_level": "intermediate"}

    python_course = {
        "id": "python-fundamentals",
        "title": "Python Fundamentals",
        "description": "Learn Python programming fundamentals",
        "skills": [{"skill_id": "python", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "intermediate",
    }

    photoshop_course = {
        "id": "photoshop-basics",
        "title": "Photoshop Fundamentals",
        "description": "Learn graphic design with Photoshop",
        "skills": [{"skill_id": "photoshop", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "intermediate",
    }

    parsed_gaps = parse_skill_gaps(skill_gaps)
    python_ranked = rank_candidates([python_course], parsed_gaps, learner, goal="Python Developer")[0]
    photoshop_ranked = rank_candidates([photoshop_course], parsed_gaps, learner, goal="Python Developer")[0]

    assert (
        python_ranked["score_breakdown"]["skill_gap_coverage"]
        > photoshop_ranked["score_breakdown"]["skill_gap_coverage"]
    )
    assert python_ranked["match_score"] > photoshop_ranked["match_score"]


def test_full_recommendation_pipeline_ordering_and_locked_courses():
    courses = [
        {
            "id": "python-fundamentals",
            "title": "Python Fundamentals",
            "description": "Learn basic Python programming",
            "skills": [{"skill_id": "python", "target_level": 5.0}],
            "prerequisites": [],
            "difficulty": "beginner",
            "duration_hours": 15,
        },
        {
            "id": "data-analysis",
            "title": "Data Analysis & Statistics",
            "description": "Learn statistics and data analysis",
            "skills": [
                {"skill_id": "data-analysis", "target_level": 5.0},
                {"skill_id": "statistics", "target_level": 5.0},
            ],
            "prerequisites": [],
            "difficulty": "beginner",
            "duration_hours": 20,
        },
        {
            "id": "machine-learning",
            "title": "Machine Learning",
            "description": "Learn advanced machine learning",
            "skills": [{"skill_id": "machine-learning", "target_level": 7.0}],
            "prerequisites": [
                {"skill_id": "python", "minimum_level": 5.0},
                {"skill_id": "statistics", "minimum_level": 5.0},
            ],
            "difficulty": "intermediate",
            "duration_hours": 30,
        },
    ]

    engine = LearningRecommendationEngine(courses=courses)

    learner = {
        "skills": [
            {"name": "Python", "level": 2.0},
            {"name": "Statistics", "level": 2.0},
        ],
        "experience_level": "beginner",
        "completed_courses": [],
    }

    result = engine.recommend(
        learner=learner,
        goal="Machine Learning",
        skill_gaps=[
            {"name": "python", "current_level": 2.0, "target_level": 5.0, "gap": 3.0},
            {"name": "statistics", "current_level": 2.0, "target_level": 5.0, "gap": 3.0},
            {"name": "machine-learning", "current_level": 0.0, "target_level": 7.0, "gap": 7.0},
        ],
        top_k=5,
    )

    assert result["success"] is True

    recommendation_ids = [r["course_id"] for r in result["recommendations"]]
    locked_ids = [r["course_id"] for r in result["locked_recommendations"]]

    # Machine Learning must NOT be in eligible recommendations due to unmet prerequisites
    assert "machine-learning" not in recommendation_ids
    # Machine Learning MUST be in locked recommendations
    assert "machine-learning" in locked_ids

    # Prerequisites-satisfied courses must be recommended
    assert "python-fundamentals" in recommendation_ids
    assert "data-analysis" in recommendation_ids


def test_engine_works_without_semantic_retriever(sample_courses):
    engine = LearningRecommendationEngine(
        courses=sample_courses,
        semantic_retriever=None,
    )

    result = engine.recommend(
        learner={
            "skills": ["linux"],
            "experience_level": "beginner",
            "completed_courses": [],
        },
        goal="DevOps",
        skill_gaps=["docker"],
        top_k=5,
    )

    assert result["success"] is True
    assert result["recommendations"]


class FakeSemanticRetriever:
    def __init__(self):
        self.called = False

    def retrieve(
        self,
        learner,
        goal,
        skill_gaps=None,
        top_k=10,
    ):
        self.called = True

        return [
            {
                "course_id": "semantic-course",
                "semantic_similarity": 0.95,
            }
        ]


def test_engine_uses_semantic_retriever(sample_courses):
    courses = sample_courses + [
        {
            "id": "semantic-course",
            "title": "Semantic ML Course",
            "description": "Machine learning course",
            "skills": [
                {
                    "skill_id": "docker",
                    "target_level": 5.0,
                }
            ],
            "prerequisites": [],
            "difficulty": "beginner",
        }
    ]

    retriever = FakeSemanticRetriever()

    engine = LearningRecommendationEngine(
        courses=courses,
        semantic_retriever=retriever,
    )

    result = engine.recommend(
        learner={
            "skills": ["linux"],
            "experience_level": "beginner",
            "completed_courses": [],
        },
        goal="Machine Learning",
        skill_gaps=["docker"],
        top_k=5,
    )

    assert retriever.called is True
    assert result["success"] is True

    recommendation_ids = [
        item["course_id"]
        for item in result["recommendations"]
    ]

    assert "semantic-course" in recommendation_ids


class FailingSemanticRetriever:
    def retrieve(
        self,
        learner,
        goal,
        skill_gaps=None,
        top_k=10,
    ):
        raise RuntimeError("Embedding service unavailable")


def test_semantic_failure_falls_back_to_deterministic(
    sample_courses,
):
    engine = LearningRecommendationEngine(
        courses=sample_courses,
        semantic_retriever=FailingSemanticRetriever(),
    )

    result = engine.recommend(
        learner={
            "skills": ["linux"],
            "experience_level": "beginner",
            "completed_courses": [],
        },
        goal="DevOps",
        skill_gaps=["docker"],
        top_k=5,
    )

    assert result["success"] is True
    assert result["recommendations"]


def test_semantic_course_still_respects_prerequisites():
    courses = [
        {
            "id": "advanced-ml",
            "title": "Advanced Machine Learning",
            "description": "Advanced ML",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 9.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                }
            ],
            "difficulty": "advanced",
        }
    ]

    class SemanticRetriever:
        def retrieve(
            self,
            learner,
            goal,
            skill_gaps=None,
            top_k=10,
        ):
            return [
                {
                    "course_id": "advanced-ml",
                    "semantic_similarity": 0.99,
                }
            ]

    engine = LearningRecommendationEngine(
        courses=courses,
        semantic_retriever=SemanticRetriever(),
    )

    result = engine.recommend(
        learner={
            "skills": [
                {
                    "name": "Python",
                    "level": 2,
                }
            ],
            "experience_level": "beginner",
            "completed_courses": [],
        },
        goal="Become a machine learning engineer",
        skill_gaps=["machine-learning"],
        top_k=5,
    )

    recommendation_ids = [
        item["course_id"]
        for item in result["recommendations"]
    ]

    locked_ids = [
        item["course_id"]
        for item in result["locked_recommendations"]
    ]

    assert "advanced-ml" not in recommendation_ids
    assert "advanced-ml" in locked_ids


def test_semantic_similarity_affects_final_score():
    skill_gaps = [
        {
            "name": "python",
            "target_level": 5.0,
            "current_level": 2.0,
            "gap": 3.0,
            "priority": 1.0,
        }
    ]

    learner = {
        "skills": [
            {
                "name": "python",
                "level": 2,
            }
        ],
        "experience_level": "beginner",
    }

    base_course = {
        "id": "python-course",
        "title": "Python Fundamentals",
        "description": "Learn Python",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5.0,
            }
        ],
        "prerequisites": [],
        "difficulty": "beginner",
    }

    low_semantic = dict(base_course)
    low_semantic["semantic_similarity"] = 0.20

    high_semantic = dict(base_course)
    high_semantic["semantic_similarity"] = 0.90

    low_result = rank_candidates(
        [low_semantic],
        skill_gaps,
        learner,
        "Python developer",
    )[0]

    high_result = rank_candidates(
        [high_semantic],
        skill_gaps,
        learner,
        "Python developer",
    )[0]

    assert (
        high_result["match_score"]
        > low_result["match_score"]
    )

    assert (
        high_result["score_breakdown"]["semantic_similarity"]
        == pytest.approx(0.90)
    )


def test_semantic_similarity_has_ten_percent_weight():
    skill_gaps = [
        {
            "name": "python",
            "target_level": 5.0,
            "current_level": 2.0,
            "gap": 3.0,
            "priority": 1.0,
        }
    ]

    learner = {
        "skills": [
            {
                "name": "python",
                "level": 2,
            }
        ],
        "experience_level": "beginner",
    }

    course_low = {
        "id": "python-low-semantic",
        "title": "Python Fundamentals",
        "description": "Learn Python",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5.0,
            }
        ],
        "prerequisites": [],
        "difficulty": "beginner",
        "semantic_similarity": 0.2,
    }

    course_high = dict(course_low)
    course_high["id"] = "python-high-semantic"
    course_high["semantic_similarity"] = 0.9

    low_score = rank_candidates(
        [course_low],
        skill_gaps,
        learner,
        "Python developer",
    )[0]["match_score"]

    high_score = rank_candidates(
        [course_high],
        skill_gaps,
        learner,
        "Python developer",
    )[0]["match_score"]

    assert high_score - low_score == pytest.approx(0.07)


def test_missing_semantic_similarity_defaults_to_zero():
    course = {
        "id": "python-course",
        "title": "Python Fundamentals",
        "description": "Learn Python",
        "skills": [
            {
                "skill_id": "python",
                "target_level": 5.0,
            }
        ],
        "prerequisites": [],
        "difficulty": "beginner",
    }

    skill_gaps = [
        {
            "name": "python",
            "target_level": 5.0,
            "current_level": 2.0,
            "gap": 3.0,
            "priority": 1.0,
        }
    ]

    learner = {
        "skills": [
            {
                "name": "python",
                "level": 2,
            }
        ],
        "experience_level": "beginner",
    }

    result = rank_candidates(
        [course],
        skill_gaps,
        learner,
        "Python",
    )[0]

    assert result["score_breakdown"]["semantic_similarity"] == 0.0
    assert 0.0 <= result["match_score"] <= 1.0


def test_semantic_similarity_does_not_make_locked_course_eligible():
    courses = [
        {
            "id": "advanced-ml",
            "title": "Advanced Machine Learning",
            "description": "Advanced machine learning",
            "skills": [
                {
                    "skill_id": "machine-learning",
                    "target_level": 9.0,
                }
            ],
            "prerequisites": [
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                }
            ],
            "difficulty": "advanced",
            "semantic_similarity": 0.99,
        }
    ]

    learner = {
        "skills": [
            {
                "name": "python",
                "level": 2,
            }
        ],
        "experience_level": "beginner",
        "completed_courses": [],
    }

    result = recommend_next_learning(
        learner=learner,
        goal="Become a machine learning engineer",
        skill_gaps=["machine-learning"],
        courses=courses,
        top_k=5,
    )

    recommendation_ids = [
        item["course_id"]
        for item in result["recommendations"]
    ]

    locked_ids = [
        item["course_id"]
        for item in result["locked_recommendations"]
    ]

    assert "advanced-ml" not in recommendation_ids
    assert "advanced-ml" in locked_ids





