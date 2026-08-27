# Hybrid AI Architecture — Career PathFinder

This document defines the production hybrid AI architecture combining the **Local Python AI Service** (`ai-service/` @ port 8000) and **Google Gemini AI** (Cloud LLM).

---

## 1. System Topology

```
                         USER / NEXT.JS FRONTEND
                                   │
                                   ▼
                        Express Node.js Backend
                                   │
                  ┌────────────────┴────────────────┐
                  │                                 │
                  ▼                                 ▼
        Python AI Microservice                  Gemini AI
        (FastAPI :8000)                         (Cloud API)
     [Authoritative Intelligence]          [Generative Content]
     • 6-Factor Match Score                • Project Recommendations
     • Sentence Transformers                • Documentation Resources
     • FAISS Vector Similarity              • Video Search Queries
     • Skill Gap Identification             • Flowchart Nodes & Edges
     • Prerequisite Ordering                • Natural Language Guidance
     • 4-Phase Roadmap Structure            • Conversational AI Assistant
                  │                                 │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                            MongoDB Database
```

---

## 2. Responsibility Division

### **A. Python AI Microservice (`ai-service/`)**
* **Source of Truth**: [`ai-service/app/data/careers.json`](../ai-service/app/data/careers.json)
* **6-Factor Formula**:
  $$\text{Score} = 0.40 \times \text{Skill} + 0.20 \times \text{Interest} + 0.15 \times \text{Goal} + 0.10 \times \text{Experience} + 0.05 \times \text{Education} + 0.10 \times \text{Semantic Sim}$$
* **FAISS Vector Search**: `sentence-transformers` (`all-MiniLM-L6-v2`) 384-dimensional dense embeddings.
* **Roadmap Structure Engine**: Generates 4 sequential learning phases based on prerequisites, skill gap priority, and career skill importance.

### **B. Google Gemini AI (Cloud LLM)**
* **Role**: Generative Content & Resource Engine.
* **Enrichments**:
  - Tailored project ideas mapped directly to missing skill gaps.
  - Official documentation resource recommendations.
  - Video search query recommendations (no fabricated YouTube URLs).
  - Flowchart DAG metadata (`nodes` and `edges`).
  - Conversational mentor answers in `/assistant`.
* **Constraint**: Gemini **MUST NOT** override `matchScore`, change skill gap classifications, or decide career rankings.

### **C. Express Node.js Backend (`server/`)**
* **Role**: Central Orchestrator & Public API Gateway.
* **Service Client**: [`server/src/services/python-ai.service.ts`](../server/src/services/python-ai.service.ts) calls Python FastAPI (`http://localhost:8000`).
* **Gemini Gateway**: [`server/src/services/ai.service.ts`](../server/src/services/ai.service.ts) enriches Python's roadmap structure.

---

## 3. Data Flow Pipelines

### **Career Recommendation Flow**
```
User Profile -> Express -> Python AI (/recommend) -> careers.json & FAISS -> 6-Factor Score -> Express -> Next.js UI
```

### **Roadmap Generation Flow**
```
Profile -> Express -> Python AI (/roadmap/generate) -> Prerequisite & Phase Engine -> Python Roadmap Structure -> Gemini (/enrichRoadmap) -> Projects, Docs, Videos, Flowchart -> MongoDB -> Next.js UI
```

---

## 4. Local Development Setup

```bash
# Terminal 1: Python AI Service
cd ai-service
uvicorn app.main:app --reload --port 8000

# Terminal 2: Express Backend
cd server
npm run dev

# Terminal 3: Next.js Frontend
cd client
npm run dev
```
