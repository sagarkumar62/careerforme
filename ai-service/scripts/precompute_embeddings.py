import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.recommendation_engine import load_careers
from app.services.embedding_service import get_embedding_service
from app.services.embedding_cache import build_career_embeddings, save_precomputed_career_embeddings


def main():
    print("=== Precomputing Career Embeddings for Render Free Deployment ===")
    careers = load_careers()
    print(f"Loaded {len(careers)} careers from dataset.")

    embed_svc = get_embedding_service()
    embed_svc.load()

    if not embed_svc.available():
        print("ERROR: Embedding service failed to load.")
        sys.exit(1)

    mapping = build_career_embeddings(embed_svc, careers)
    print(f"Successfully generated {len(mapping)} career embeddings (dim={embed_svc.dim}).")

    save_precomputed_career_embeddings(mapping)
    print("Done! Precomputed career_embeddings.npz created successfully.")


if __name__ == "__main__":
    main()
