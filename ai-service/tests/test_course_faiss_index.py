import numpy as np

from app.services.course_faiss_index import get_course_faiss_index


def test_course_faiss_index_build_and_search():
    index = get_course_faiss_index()

    embeddings = {
        "python-course": np.array([1.0, 0.0, 0.0]),
        "ml-course": np.array([0.9, 0.1, 0.0]),
        "react-course": np.array([0.0, 0.0, 1.0]),
    }

    index.build(embeddings)

    results = index.search(
        np.array([1.0, 0.0, 0.0]),
        top_k=2,
    )

    assert len(results) == 2

    assert results[0][0] == "python-course"
    assert results[1][0] == "ml-course"

    assert results[0][1] >= results[1][1]
