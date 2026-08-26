from typing import Dict, List, Tuple
import numpy as np


class FaissIndex:
    """
    Lightweight NumPy Cosine Similarity Vector Index.
    Preserves the FaissIndex class interface for backwards compatibility across routes
    and tests while completely eliminating the memory-heavy FAISS C++ dependency.
    """

    def __init__(self):
        self.matrix: np.ndarray = None
        self.ids: List[str] = []
        self.dim: int = 0

    def build(self, embeddings: Dict[str, np.ndarray]):
        """Build matrix index from mapping entity_id -> vector."""
        if not embeddings:
            self.matrix = None
            self.ids = []
            self.dim = 0
            return

        keys = list(embeddings.keys())
        mat = np.stack([np.array(embeddings[k], dtype=np.float32).ravel() for k in keys])
        self.ids = keys
        self.dim = mat.shape[1]

        # Normalize matrix rows for cosine similarity (dot product)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.matrix = (mat / norms).astype(np.float32)

    def search(self, query_vec: np.ndarray, top_k: int = 5) -> List[Tuple[str, float]]:
        """Return list of (entity_id, score) sorted by descending similarity."""
        if self.matrix is None or len(self.ids) == 0:
            return []

        q = np.array(query_vec, dtype=np.float32).ravel()
        q_norm = np.linalg.norm(q)
        if q_norm == 0:
            qn = q
        else:
            qn = q / q_norm

        # Vectorized dot product cosine similarity
        sims = np.dot(self.matrix, qn)

        # Handle 1D array result
        if sims.ndim == 0:
            sims = np.array([sims])

        top_k = min(top_k, len(self.ids))
        idxs = np.argsort(-sims)[:top_k]

        return [(self.ids[int(i)], float(sims[i])) for i in idxs]


_idx = FaissIndex()


def get_faiss_index() -> FaissIndex:
    return _idx
