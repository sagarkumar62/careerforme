from typing import Any, Dict, Iterable, List


def merge_course_candidates(
    deterministic_candidates: Iterable[Dict[str, Any]],
    semantic_candidates: Iterable[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Merge deterministic and semantic course candidates.

    The course ID is the unique key.

    Semantic similarity is retained as metadata but does not
    affect the deterministic ranking score yet.
    """

    merged: Dict[str, Dict[str, Any]] = {}

    for course in deterministic_candidates:
        course_id = course.get("id") or course.get("course_id")

        if not course_id:
            continue

        merged[course_id] = dict(course)

        if "semantic_similarity" not in merged[course_id]:
            merged[course_id]["semantic_similarity"] = 0.0

    for semantic in semantic_candidates:
        course_id = semantic.get("course_id") or semantic.get("id")

        if not course_id:
            continue

        similarity = float(
            semantic.get("semantic_similarity", 0.0)
        )

        if course_id in merged:
            # Preserve the complete course object.
            merged[course_id]["semantic_similarity"] = max(
                merged[course_id].get("semantic_similarity", 0.0),
                similarity,
            )
        else:
            # Semantic retrieval may return only IDs.
            merged[course_id] = {
                "id": course_id,
                "semantic_similarity": similarity,
            }

    return list(merged.values())
