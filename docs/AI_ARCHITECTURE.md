# AI Architecture & Technical Overview

## Purpose
The Hybrid AI System in Career PathFinder provides personalized career decision intelligence and adaptive learning paths by cleanly separating deterministic machine-learning algorithms (Python FastAPI Service) from natural language synthesis and content enrichment (Gemini API), orchestrated via the Express Backend API Gateway.

## High-Level Architecture Diagram
```
Next.js Frontend (/recommendations, /careers/[id])
       │
       ▼
Express API Gateway (/api/v1/ai/*) ── Authenticated with req.user._id
       │
       ├──► Python AI Microservice (FastAPI :8000)
       │    ├── SentenceTransformers / ONNX Embeddings
       │    ├── 6-Factor Hybrid Match Scoring Engine
       │    ├── Prerequisite Graph Traversal (DAG)
       │    └── Deterministic Skill Gap & Roadmap Generator
       │
       └──► Gemini LLM Service (Google Generative AI)
            ├── Match Explanation & Human Reasoning
            ├── Practical Project Ideation (Beginner, Intermediate, Advanced)
            ├── Verified Skill-Mapped Learning Resources
            └── Structured Flowchart Data Generation
```

## System Boundaries & Responsibilities
- **Python AI Microservice**: Authoritative scoring, skill gap math, priority calculation, topological graph ordering, roadmap phase structuring.
- **Gemini LLM**: Human-readable synthesis, project ideas, resource curation, flowchart JSON. **Never overrides Python match scores**.
- **Express API Gateway**: Enforces tenant security (`req.user._id`), handles dual-tier fallback resilience, persists results to MongoDB.

## Files Involved
- `ai-service/app/services/recommendation_engine.py`
- `ai-service/app/services/skill_gap_engine.py`
- `ai-service/app/services/roadmap_engine.py`
- `server/src/services/ai-orchestrator.service.ts`
- `server/src/services/ai.service.ts`
- `server/src/routes/ai.routes.ts`
- `server/src/controllers/ai.controller.ts`

## Failure Handling
- **Python AI Service Offline**: Express falls back to deterministic local dataset scoring without breaking API responses.
- **Gemini LLM Offline**: Express returns structured Python ML results with static fallback explanations.
