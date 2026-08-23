import numpy as np

from app.models.course import Course
from app.services.course_embeddings import build_course_embeddings


class FakeEmbeddingService:
    def __init__(self):
        self.received_texts = []

    def available(self):
        return True

    def encode(self, texts):
        self.received_texts.extend(texts)
        return [np.array([1.0, 0.0, 0.0]) for _ in texts]


def test_build_course_embeddings():
    courses = [
        Course(
            id="python-course",
            title="Python Fundamentals",
            description="Learn Python programming",
            skills=[
                {
                    "skill_id": "python",
                    "target_level": 5.0,
                }
            ],
            prerequisites=[],
            difficulty="beginner",
            category="programming",
            tags=["python", "coding"],
        ),
        Course(
            id="ml-course",
            title="Machine Learning",
            description="ML basics",
            skills=[
                {
                    "skill_id": "ml",
                    "target_level": 5.0,
                }
            ],
            prerequisites=[
                {
                    "skill_id": "python",
                    "minimum_level": 5.0,
                }
            ],
            difficulty="intermediate",
            category="ai",
            tags=["ml", "ai"],
        ),
    ]

    service = FakeEmbeddingService()

    result = build_course_embeddings(service, courses)

    assert set(result.keys()) == {
        "python-course",
        "ml-course",
    }

    assert isinstance(result["python-course"], np.ndarray)
    assert result["python-course"].shape == (3,)

    assert len(service.received_texts) == 2


def test_course_embedding_text_contains_course_context():
    courses = [
        Course(
            id="python-course",
            title="Python Fundamentals",
            description="Learn Python programming",
            skills=[
                {
                    "skill_id": "python",
                    "target_level": 5.0,
                }
            ],
            prerequisites=[],
            difficulty="beginner",
            category="programming",
            tags=["python", "coding"],
        )
    ]

    service = FakeEmbeddingService()

    build_course_embeddings(service, courses)

    text = service.received_texts[0]

    assert "Python Fundamentals" in text
    assert "Learn Python programming" in text
    assert "python" in text
    assert "beginner" in text
    assert "programming" in text
    assert "coding" in text
