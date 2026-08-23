from app.services.faiss_index import FaissIndex


_course_index = FaissIndex()


def get_course_faiss_index() -> FaissIndex:
    return _course_index
