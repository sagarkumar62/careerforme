# Career PathFinder — System & AI Architecture Specification

This document details the high-level architecture, service boundaries, memory optimization strategy, and communication flow between the Next.js Frontend, Express API Gateway, Python FastAPI AI Service, Google Gemini API, and MongoDB database.

---

## High-Level System Architecture Diagram

```
                             ┌───────────────────────────────────┐
                             │          Next.js Frontend         │
                             │       (User Interface / UI)       │
                             └─────────────────┬─────────────────┘
                                               │
                                               ▼
                             ┌───────────────────────────────────┐
                             │        Express Node.js Gateway    │
                             │   (Auth, Routing, Gemini, DB)     │
                             └────────┬─────────────────┬────────┘
                                      │                 │
            ┌─────────────────────────┘                 └─────────────────────────┐
            │ (HTTP POST via AI_SERVICE_URL)                                      │
            ▼                                                                     ▼
┌───────────────────────────────────────┐                             ┌────────────────────────┐
│       Python FastAPI AI Service       │                             │    Google Gemini API   │
│     (0.0.0.0:$PORT, Python 3.11)      │                             │ (Natural Language &    │
└───────────────────┬───────────────────┘                             │  Guidance Generation)  │
                    │                                                 └────────────────────────┘
                    ▼
┌───────────────────────────────────────┐
│       ONNX Runtime Embedding Engine   │
│    (MiniLM-L6-v2 ONNX CPU ~30MB RAM)  │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│     NumPy Semantic Similarity         │
│   (384-dim Cosine Matrix Vector Search)│
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│    6-Factor Weighted Recommendation   │
│      Engine (Deterministic ML)        │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│        Structured JSON Response       │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│        Express Gateway Enrichment     │
│       (Gemini Roadmap Explanations)   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│         Next.js Frontend Render       │
└───────────────────────────────────────┘
```

---

## Core System Boundaries & Responsibilities

### 1. Python FastAPI AI Microservice (`ai-service`)
- **Deterministic 6-Factor Matching Engine:**
  - Skill Match (0.40)
  - Interest Match (0.20)
  - Goal Match (0.15)
  - Experience Match (0.10)
  - Education Match (0.05)
  - Semantic Similarity (0.10)
- **Lightweight CPU Semantic Search:** Powered by ONNX Runtime and MiniLM-L6-v2 ONNX quantized vectors.
- **Skill-Gap Analysis:** Calculates missing skills and proficiency requirements.
- **Career & Domain Resolution:** Taxonomy normalization, alias resolution, prerequisite dependency graph generation.
- **No LLM Score Alteration:** Math scores are computed deterministically and never altered by LLMs.

### 2. Express Node.js Backend Gateway (`server`)
- **API Gateway & Routing:** Public API endpoints consumed by Next.js frontend.
- **Authentication & Persistence:** User profiles, progress tracking, MongoDB integration.
- **Python AI Communication:** Calls Python service via HTTP (`AI_SERVICE_URL`).
- **Google Gemini Integration:** Passes deterministic Python recommendations and skill gap structures to Gemini to generate natural-language explanations, project ideas, documentation links, and video recommendations.

---

## Render Free Memory Optimization Summary

| Component | Legacy Stack | Optimized Stack | Memory Impact |
| :--- | :--- | :--- | :--- |
| **Framework** | PyTorch (`torch`) | ONNX Runtime (`onnxruntime` CPU) | -1,100 MB |
| **Model** | `sentence-transformers` | `xenova/all-MiniLM-L6-v2` ONNX | -250 MB |
| **Index** | FAISS C++ Index | NumPy Matrix Cosine Similarity | -80 MB |
| **GPU Runtimes** | NVIDIA CUDA / Triton | None (Pure CPU execution) | -300 MB |
| **Total Memory** | **> 1,200 MB (OOM Crash)** | **~45 MB RAM (Stable)** | **Passed Render Free** |

---

## Health & Readiness Monitoring

- `GET /health`: Fast probe for Render Web Service health checks (`status: ok`).
- `GET /ready`: Detailed readiness status returning `ready: true`, model load state, and career dataset counts.
