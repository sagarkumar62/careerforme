from pathlib import Path
from typing import Dict, List
import numpy as np

from app.models.career import Career

EMBEDDINGS_FILE = Path(__file__).resolve().parents[1] / "data" / "career_embeddings.npz"


def load_precomputed_career_embeddings() -> Dict[str, np.ndarray]:
    """Load precomputed career embeddings from data/career_embeddings.npz if present."""
    if EMBEDDINGS_FILE.exists():
        try:
            with np.load(EMBEDDINGS_FILE) as data:
                return {key: data[key].astype(np.float32) for key in data.files}
        except Exception as e:
            print(f"[EmbeddingCache] Failed to load precomputed embeddings: {e}")
    return {}


def save_precomputed_career_embeddings(mapping: Dict[str, np.ndarray]):
    """Save mapping of career_id -> vector to data/career_embeddings.npz."""
    if not mapping:
        return
    try:
        EMBEDDINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(EMBEDDINGS_FILE, **mapping)
        print(f"[EmbeddingCache] Saved {len(mapping)} career embeddings to {EMBEDDINGS_FILE}")
    except Exception as e:
        print(f"[EmbeddingCache] Failed to save precomputed embeddings: {e}")


def build_career_embeddings(embedding_service, careers: List[Career]) -> Dict[str, np.ndarray]:
    """
    Create and return a mapping of career_id -> embedding vector.
    Uses precomputed career_embeddings.npz if available; otherwise computes and caches them.
    """
    # 1. Try loading precomputed embeddings
    cached = load_precomputed_career_embeddings()
    if cached and all(c.id in cached for c in careers):
        return cached

    # 2. Compute using embedding_service if missing or incomplete
    texts = []
    ids = []
    for c in careers:
        ids.append(c.id)
        text = " ".join([c.title or "", c.description or "", " ".join([s.name for s in c.required_skills])])
        texts.append(text)

    if not embedding_service or not embedding_service.available():
        return cached if cached else {}

    try:
        embs = embedding_service.encode(texts)
        mapping = {cid: np.array(embs[i], dtype=np.float32) for i, cid in enumerate(ids)}

        # Combine with existing cached embeddings and save
        merged = {**cached, **mapping}
        save_precomputed_career_embeddings(merged)
        return merged
    except Exception as e:
        print(f"[EmbeddingCache] Error generating career embeddings: {e}")
        return cached if cached else {}
