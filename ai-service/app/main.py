from fastapi import FastAPI
from app.api.routes.health import router as health_router
from app.api.routes.recommendation import router as recommend_router
from app.api.routes.embeddings import router as embeddings_router
from app.api.routes.search import router as search_router
from app.api.routes.roadmap import router as roadmap_router
from app.api.routes.learning_path import router as learning_path_router
from app.api.routes.assessment import router as assessment_router
from app.api.routes.course_progress import router as course_progress_router
from app.api.routes.project_progress import router as project_progress_router
from app.config.settings import settings
from app.services.embedding_service import get_embedding_service
from app.services.embedding_cache import build_career_embeddings
from app.services.recommendation_engine import load_careers
from app.services.faiss_index import get_faiss_index

app = FastAPI(title="Career PathFinder AI Service")

app.include_router(health_router)
app.include_router(recommend_router)
app.include_router(embeddings_router)
app.include_router(search_router)
app.include_router(roadmap_router)
app.include_router(learning_path_router)
app.include_router(assessment_router)
app.include_router(course_progress_router)
app.include_router(project_progress_router)


@app.on_event("startup")
async def startup_event():
    # Load embedding model once at startup if not in mock mode
    embed_svc = get_embedding_service()
    if not settings.AI_MOCK_MODE:
        embed_svc.load()
    # attach to app state for routes to access
    app.state.embedding_service = embed_svc
    # build and cache career embeddings when model is available
    careers = load_careers()
    if embed_svc.available():
        app.state.career_embeddings = build_career_embeddings(embed_svc, careers)
    else:
        app.state.career_embeddings = {}
    # build FAISS (or fallback) index from career embeddings
    faiss_idx = get_faiss_index()
    faiss_idx.build(app.state.career_embeddings)
    app.state.faiss_index = faiss_idx


@app.get("/")
async def root():
    return {"service": "career-pathfinder-ai", "status": "ready"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(settings.AI_SERVICE_PORT))
