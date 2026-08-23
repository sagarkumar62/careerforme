from app.services.course_candidate_merger import (
    merge_course_candidates,
)


def test_merge_unique_candidates():
    deterministic = [
        {
            "id": "python",
            "title": "Python Fundamentals",
        },
    ]

    semantic = [
        {
            "course_id": "machine-learning",
            "semantic_similarity": 0.91,
        },
    ]

    result = merge_course_candidates(
        deterministic,
        semantic,
    )

    ids = {course["id"] for course in result}

    assert ids == {
        "python",
        "machine-learning",
    }


def test_duplicate_course_is_not_added_twice():
    deterministic = [
        {
            "id": "python",
            "title": "Python Fundamentals",
            "semantic_similarity": 0.0,
        },
    ]

    semantic = [
        {
            "course_id": "python",
            "semantic_similarity": 0.92,
        },
    ]

    result = merge_course_candidates(
        deterministic,
        semantic,
    )

    assert len(result) == 1
    assert result[0]["id"] == "python"
    assert result[0]["title"] == "Python Fundamentals"
    assert result[0]["semantic_similarity"] == 0.92


def test_duplicate_keeps_highest_semantic_similarity():
    deterministic = [
        {
            "id": "python",
            "semantic_similarity": 0.60,
        },
    ]

    semantic = [
        {
            "course_id": "python",
            "semantic_similarity": 0.85,
        },
    ]

    result = merge_course_candidates(
        deterministic,
        semantic,
    )

    assert result[0]["semantic_similarity"] == 0.85


def test_semantic_only_candidate_is_preserved():
    result = merge_course_candidates(
        [],
        [
            {
                "course_id": "computer-vision",
                "semantic_similarity": 0.94,
            }
        ],
    )

    assert len(result) == 1
    assert result[0]["id"] == "computer-vision"
    assert result[0]["semantic_similarity"] == 0.94
