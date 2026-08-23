from typing import Dict, List
import numpy as np

from app.models.course import Course


def build_course_embeddings(
    embedding_service,
    courses: List[Course],
) -> Dict[str, np.ndarray]:
    """
    Build embeddings for learning courses.

    Returns:
        {
            course_id: embedding_vector
        }
    """

    texts = []
    ids = []

    for course in courses:
        ids.append(course.id)

        skill_text = " ".join(
            skill.skill_id
            for skill in course.skills
        )

        prerequisite_text = " ".join(
            prerequisite.skill_id
            for prerequisite in course.prerequisites
        )

        tag_text = " ".join(course.tags or [])

        text = " ".join(
            [
                course.title or "",
                course.description or "",
                skill_text,
                prerequisite_text,
                course.difficulty or "",
                course.category or "",
                tag_text,
            ]
        )

        texts.append(text)

    if not embedding_service or not embedding_service.available():
        return {}

    try:
        embeddings = embedding_service.encode(texts)

        return {
            course_id: np.array(
                embeddings[i],
                dtype=float,
            )
            for i, course_id in enumerate(ids)
        }

    except Exception:
        return {}
