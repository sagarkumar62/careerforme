from fastapi import APIRouter, Request
from app.config.settings import settings
from app.services.recommendation_engine import CAREERS

from app.services.career_resolver import get_registered_careers

router = APIRouter()


@router.get("/health")
async def health():
    """Lightweight service health check endpoint reporting loaded dataset careers."""
    registered = get_registered_careers()
    return {
        "status": "ok",
        "service": "career-for-me-ai",
        "gemini": "mock" if settings.AI_MOCK_MODE else ("available" if settings.GEMINI_API_KEY else "unavailable"),
        "embedding_model": "all-MiniLM-L6-v2 (ONNX CPU)",
        "loadedCareersCount": len(registered),
        "loadedCareers": registered
    }


@router.get("/ready")
async def ready(request: Request):
    """Readiness probe reporting model and career dataset status."""
    embed_svc = getattr(request.app.state, "embedding_service", None)
    career_embeddings = getattr(request.app.state, "career_embeddings", {})

    model_loaded = bool(embed_svc and embed_svc.available())
    careers_loaded = len(CAREERS) > 0

    return {
        "ready": model_loaded and careers_loaded,
        "model_loaded": model_loaded,
        "careers_loaded": careers_loaded,
        "career_count": len(CAREERS),
        "cached_embeddings_count": len(career_embeddings),
    }
