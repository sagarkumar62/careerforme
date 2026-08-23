import numpy as np

from app.services.semantic_course_retriever import (
    SemanticCourseRetriever,
)


class FakeEmbeddingService:
    def available(self):
        return True

    def encode(self, texts):
        return [
            np.array([1.0, 0.0, 0.0])
            for _ in texts
        ]


class FakeCourseIndex:
    def search(self, vector, top_k=10):
        return [
            ("machine-learning", 0.95),
            ("python-course", 0.82),
        ][:top_k]


def test_semantic_retriever_returns_course_ids():
    retriever = SemanticCourseRetriever(
        FakeEmbeddingService()
    )

    retriever.index = FakeCourseIndex()

    learner = {
        "experience_level": "beginner",
        "skills": [
            {
                "name": "Python",
                "level": 2,
            }
        ],
        "interests": [
            "artificial intelligence",
        ],
    }

    result = retriever.retrieve(
        learner=learner,
        goal="Become a machine learning engineer",
        skill_gaps=[
            {
                "name": "machine-learning",
            }
        ],
        top_k=2,
    )

    assert len(result) == 2

    assert result[0]["course_id"] == "machine-learning"
    assert result[0]["semantic_similarity"] == 0.95

    assert result[1]["course_id"] == "python-course"
    assert result[1]["semantic_similarity"] == 0.82


class UnavailableEmbeddingService:
    def available(self):
        return False


def test_semantic_retriever_handles_unavailable_embeddings():
    retriever = SemanticCourseRetriever(
        UnavailableEmbeddingService()
    )

    result = retriever.retrieve(
        learner={
            "experience_level": "beginner",
        },
        goal="Become a machine learning engineer",
    )

    assert result == []
