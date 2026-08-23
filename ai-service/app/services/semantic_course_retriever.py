from typing import Any, Dict, List

from app.services.course_faiss_index import get_course_faiss_index
from app.services.learning_context import build_learning_context


class SemanticCourseRetriever:
    def __init__(self, embedding_service):
        self.embedding_service = embedding_service
        self.index = get_course_faiss_index()

    def retrieve(
        self,
        learner: Dict[str, Any],
        goal: str,
        skill_gaps: List[Dict[str, Any]] | None = None,
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve courses that are semantically relevant to
        the learner's goal and profile.
        """

        if not self.embedding_service:
            return []

        if not self.embedding_service.available():
            return []

        context = build_learning_context(
            learner=learner,
            goal=goal,
            skill_gaps=skill_gaps,
        )

        if not context.strip():
            return []

        try:
            query_embedding = self.embedding_service.encode(
                [context]
            )[0]

            results = self.index.search(
                query_embedding,
                top_k=top_k,
            )

            return [
                {
                    "course_id": course_id,
                    "semantic_similarity": float(score),
                }
                for course_id, score in results
            ]

        except Exception:
            return []
