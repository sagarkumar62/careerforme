# Path Finder — AI Subsystem & Hybrid Architecture Guide

This document provides a comprehensive technical reference for the entire **AI Subsystem** of **Path Finder**. It details system topology, mathematical scoring formulas, sentence embedding vector search, skill-gap categorization, 4-phase adaptive roadmap generation, LLM enrichment, conversational RAG assistant, multi-tiered fallback mechanisms, file/folder organization, and automated benchmarking.

---

## 1. Architectural Philosophy & System Topology

Path Finder implements a **Hybrid AI Architecture** combining deterministic, explainable microservice calculations with generative cloud LLMs.

* **Deterministic & Explainable Core (Python AI Microservice)**: Calculates objective, reproducible 6-factor match scores, skill gap classifications, prerequisite DAG ordering, and 4-phase roadmap structural milestones.
* **Generative Content Engine (Google Gemini Cloud LLM)**: Enriches structural milestones with personalized project ideas, documentation references, video search terms, flowchart visual metadata (`nodes` and `edges`), and interactive career mentoring.
* **Orchestrator Gateway (Node.js Express Backend)**: Manages authentication, profile caching, fallback triggers, MongoDB persistence, and real-time Socket.io updates.

```
                               ┌─────────────────────────────────────────┐
                               │           NEXT.JS 16 FRONTEND           │
                               └────────────────────┬────────────────────┘
                                                    │ REST API / SSE / WebSockets
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │       EXPRESS NODE.JS API GATEWAY       │
                               └──────────┬───────────────────┬──────────┘
                                          │                   │
                     HTTP REST (Port 8000)│                   │ Google GenAI SDK
                                          ▼                   ▼
           ┌───────────────────────────────────────┐  ┌───────────────────────────────┐
           │        PYTHON AI MICROSERVICE         │  │       GOOGLE GEMINI AI        │
           │           (FastAPI Engine)            │  │     (Cloud LLM Engine)        │
           ├───────────────────────────────────────┤  ├───────────────────────────────┤
           │ • 6-Factor Hybrid Match Scoring       │  │ • Project Idea Generation     │
           │ • Sentence-Transformers (384-d dense) │  │ • Docs & Video Resource Search│
           │ • FAISS Vector Cosine Index           │  │ • Visual Flowchart Nodes/Edges│
           │ • Skill-Gap Prioritization            │  │ • RAG Assistant & Chat Stream │
           │ • 4-Phase Sequential Roadmap Engine   │  └───────────────────────────────┘
           └──────────────────┬────────────────────┘
                              │
                              ▼
           ┌───────────────────────────────────────┐
           │          MONGODB ATLAS DATA           │
           └───────────────────────────────────────┘
```

---

## 2. The 6-Factor Hybrid Match Scoring Engine

The Python AI service evaluates profile alignment against candidate careers using a deterministic, 6-factor mathematical scoring equation.

### **Scoring Equation**

$$\text{MatchScore} = 0.40 \cdot \text{SkillMatch} + 0.20 \cdot \text{InterestMatch} + 0.15 \cdot \text{GoalMatch} + 0.10 \cdot \text{ExpMatch} + 0.05 \cdot \text{EduMatch} + 0.10 \cdot \text{SemanticMatch}$$

### **Detailed Factor Breakdown**

| Factor | Weight | Formula / Logic | Description |
| :--- | :---: | :--- | :--- |
| **Skill Match** | **40%** | $\frac{|\text{UserSkills} \cap \text{RequiredSkills}|}{|\text{RequiredSkills}|} \times 100$ | Evaluates overlap with canonical required skills normalized by skill taxonomy alias map. |
| **Interest Match** | **20%** | $\frac{|\text{UserInterests} \cap \text{CareerTags}|}{|\text{CareerTags}|} \times 100$ | Measures overlap between user stated interests and target domain tags. |
| **Goal Alignment** | **15%** | Direct match: `100%`<br>Category match: `75%`<br>General: `40%` | Rewards explicitly stated career goal alignment. |
| **Experience Match** | **10%** | Entry: `Beginner`<br>Mid: `Intermediate`<br>Senior: `Advanced` | Compares learner's current experience level against role entry difficulty. |
| **Education Match** | **5%** | CS/STEM Degree: `100%`<br>Bootcamp/Self-Taught: `85%`<br>Other: `70%` | Evaluates foundational academic background. |
| **Semantic Match** | **10%** | $\cos(\mathbf{e}_{\text{profile}}, \mathbf{e}_{\text{career}}) \times 100$ | Vector cosine similarity computed via `sentence-transformers` embeddings. |

---

## 3. Vector Embeddings & FAISS Search Index

### **Model Specs**
* **Model**: `all-MiniLM-L6-v2` (PyTorch / Hugging Face Transformers)
* **Embedding Dimensionality**: 384-dimensional dense vectors
* **Index**: FAISS (`IndexFlatIP` / Inner Product Cosine Normalization)

### **Vector Ingestion & Search Pipeline**
1. **Startup Indexing**: At startup, `app.main:app` loads canonical careers from [`ai-service/app/data/careers.json`](../ai-service/app/data/careers.json).
2. **Text Synthesis**: A rich text representation is synthesized for each career:
   ```text
   "Role: {title}. Category: {category}. Skills: {required_skills}. Description: {description}"
   ```
3. **Encoding & FAISS Indexing**: Embeddings are calculated and added to the FAISS vector index (`app.services.faiss_index`).
4. **Query Encoding**: User profile bio, interest text, and skills are encoded into a 384-d vector query $\mathbf{e}_{\text{profile}}$ to compute real-time dense similarity scores against all target careers.

---

## 4. Skill-Gap Identification Engine

The Skill-Gap Engine categorizes candidate skills into three operational tiers:

```
                          ┌───────────────────────────┐
                          │   Learner Profile Skills  │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │    Target Career Skill Requirements      │
                  └─────────────────────┬─────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
  │   ACQUIRED / STRONG │    │  NEEDS WORK / IN    │    │  MISSING / CRITICAL │
  │                     │    │     PROGRESS        │    │        GAPS         │
  │ User proficiency >=4│    │ User proficiency 1-3│    │ User does not possess│
  │ or matched directly │    │ skill listed in     │    │ required skill       │
  └─────────────────────┘    │ requirements        │    └─────────────────────┘
                             └─────────────────────┘
```

* **Prioritization Score**: Each missing skill receives a priority score based on:
  - Skill status (Required vs. Optional)
  - Prerequisite depth (Foundation skills prioritized over Capstones)
  - Industry demand frequency across career domain dataset.

---

## 5. 4-Phase Adaptive Roadmap & Flowchart Engine

### **Phase Sequencing Logic**
The roadmap generator constructs a structured 4-phase sequential learning path:

1. **Phase 1: Foundations**: Core prerequisites, basic concepts, tool setup.
2. **Phase 2: Core Competencies**: High-priority missing required skills.
3. **Phase 3: Advanced Topics & Specialization**: Complex frameworks, system design, performance.
4. **Phase 4: Capstone Projects & Job Readiness**: End-to-end portfolio build, resume/interview prep.

### **Gemini LLM Generative Enrichment**
Once Python constructs the structural phases and milestone IDs, the Express backend sends the payload to Gemini LLM (`@google/genai` model `gemini-3.6-flash`) via [`server/src/services/ai.service.ts`](../server/src/services/ai.service.ts#L170):

* **Practical Projects**: Generates real-world portfolio project prompts linked directly to phase milestones.
* **Documentation & Resources**: Pulls verified developer documentation links (e.g. MDN, React Docs, PyTorch Docs).
* **Video Search Queries**: Prepares clean YouTube search query strings (avoiding broken static links).
* **Flowchart DAG Layout**: Formats node metadata (`nodeId`, `difficulty`, `status`) and prerequisite edges (`source` -> `target`) for dynamic React Flow visualization.

---

## 6. Conversational RAG Assistant Agent

Path Finder features a contextual career mentor powered by RAG (Retrieval-Augmented Generation) and streaming Server-Sent Events (SSE).

### **Context Construction (`career-context.service.ts`)**
When a user chats with the AI assistant, the backend constructs a dynamic context payload:
* Current career goal & match score %
* Acquired vs. missing skill breakdown
* Active roadmap title, current phase, and next pending milestone
* Recent learning streak and completion rate

### **Streaming Response Flow**
```
User Message -> Express -> RAG Context Injector -> Gemini Stream API -> SSE (`data: {chunk}`) -> React UI
```

---

## 7. Multi-Tiered Resilience & Fallback Architecture

Path Finder guarantees 100% uptime through a 3-tier fallback strategy:

```
                       ┌───────────────────────────────┐
                       │  Tier 1: Python AI Service    │
                       │    (FastAPI @ port 8000)      │
                       └───────────────┬───────────────┘
                                       │ (Fails / Timeouts)
                                       ▼
                       ┌───────────────────────────────┐
                       │  Tier 2: Gemini Direct Cloud  │
                       │   (Server-Side API Call)      │
                       └───────────────┬───────────────┘
                                       │ (Fails / No API Key)
                                       ▼
                       ┌───────────────────────────────┐
                       │ Tier 3: Deterministic Local TS│
                       │ (Rule-Based Dataset Fallback) │
                       └───────────────────────────────┘
```

1. **Tier 1 (Python AI Microservice)**: primary engine for 6-factor calculation, FAISS similarity, and initial phase ordering.
2. **Tier 2 (Gemini Direct Fallback)**: If Python AI service is unreachable, Node.js backend invokes Gemini directly to score and structure recommendations.
3. **Tier 3 (Deterministic Local TypeScript Engine)**: If both AI microservice and Gemini API are unavailable, Node.js uses local dataset rules ([`server/src/data/careers.dataset.ts`](../server/src/data/careers.dataset.ts)) to calculate match scores and generate static roadmaps without crashing.

---

## 8. Automated Evaluation & Benchmarking Suite

Path Finder includes an automated evaluation suite ([`server/src/utils/ai-evaluation.ts`](../server/src/utils/ai-evaluation.ts)) to continuously test precision and recall across representative test personas.

### **Benchmark Metrics**
* **Top-1 Precision Accuracy**: `100.0%` (5/5 target careers ranked #1 for matching test profiles)
* **Top-3 Recall Precision**: `100.0%` (5/5 target careers present in Top 3 recommendation list)

### **Execution Command**
```powershell
cd server
npx tsx src/utils/ai-evaluation.ts
```

---

## 9. End-to-End Data Flow Pipelines

### **1. Recommendation Data Flow**
```
Next.js UI (`/recommendations`) 
  ──> Express Backend (`GET /api/v1/recommendations`)
    ──> Python AI Service (`POST http://localhost:8000/recommend`)
      ──> 6-Factor Hybrid Formula + FAISS Vector Search
    ──< Returns Ranked Career Recommendations JSON
  ──< Caches and serves response to UI
```

### **2. Roadmap Data Flow**
```
Next.js UI (`/roadmap`)
  ──> Express Backend (`POST /api/v1/roadmaps/generate`)
    ──> Python AI Service (`POST http://localhost:8000/roadmap/generate`)
      ──> Builds 4 Phases + Prerequisite Milestone DAG
    ──> Express calls Gemini LLM (`aiService.enrichRoadmap`)
      ──> Adds Projects, Docs, Video Search, Flowchart Nodes/Edges
    ──> Saves Roadmap to MongoDB
  ──< Returns Normalized Roadmap object to Next.js UI
```

---

## 10. File & Folder System of the AI Subsystem

Below is the exhaustive directory tree and functional responsibility of every file in the **Python AI Microservice** (`ai-service/`) and **Express Backend AI Layer** (`server/src/services/ai/`).

### **A. Python AI Service Directory Tree (`ai-service/app/`)**

```text
ai-service/
├── app/
│   ├── api/                     # FastAPI Route Handlers & Controllers
│   │   └── routes/
│   │       ├── health.py        # GET /health - Microservice readiness monitor
│   │       ├── recommendation.py# POST /recommend - 6-Factor match calculation
│   │       ├── roadmap.py       # POST /roadmap/generate - 4-Phase DAG builder
│   │       ├── search.py        # POST /search - Semantic vector similarity search
│   │       └── embeddings.py    # GET /embeddings/career/{id} - Vector extraction
│   │
│   ├── config/                  # Environment & App Settings
│   │   └── settings.py          # Pydantic BaseSettings (Ports, Models, Mock Mode)
│   │
│   ├── data/                    # Master Taxonomies & Datasets
│   │   ├── careers.json         # Authoritative career catalog dataset
│   │   ├── aliases.json         # Canonical skill synonym map
│   │   ├── career_aliases.json  # Alternate career title mapping
│   │   ├── career_registry.json # Registered career index
│   │   ├── domains.json         # Domain category catalog
│   │   └── skill_synonyms.json  # Skill synonym lookup dictionaries
│   │
│   ├── embeddings/              # Vector Storage & Indexing
│   │   └── index_builder.py     # Dense FAISS vector index builder & serializer
│   │
│   ├── ingestion/               # Data Pipeline & Multi-Source Loaders
│   │   ├── build_dataset.py     # Master taxonomy consolidation pipeline
│   │   ├── csv_loader.py        # Raw CSV career dataset parser
│   │   ├── esco_loader.py       # ESCO European Taxonomy integration loader
│   │   ├── onet_loader.py       # O*NET US Occupational Taxonomy parser
│   │   └── unified_loader.py    # Unifies disparate taxonomy formats into careers.json
│   │
│   ├── models/                  # Core Pydantic Domain Models
│   │   ├── career.py            # Career domain schema (skills, salary, difficulty)
│   │   └── skill.py             # Skill schema (category, proficiency level)
│   │
│   ├── preprocessing/           # Text Sanitization & Normalization
│   │   ├── dataset_cleaner.py   # Removes formatting artifacts & missing attributes
│   │   └── skill_normalizer.py  # Maps user skills to canonical taxonomy names
│   │
│   ├── schemas/                 # Request & Response Pydantic Schemas
│   │   ├── profile.py           # Validates incoming learner profile payload
│   │   └── recommendation.py    # Standardizes outgoing match response format
│   │
│   ├── services/                # Core AI Engine Implementations
│   │   ├── recommendation_engine.py  # Learner -> Career/Goal Matching & Ranking (6-Factor Hybrid Match)
│   │   ├── roadmap_engine.py         # Constructs 4-phase sequential milestones
│   │   ├── faiss_index.py            # Sentence-Transformers + FAISS vector engine
│   │   ├── embedding_service.py      # PyTorch all-MiniLM-L6-v2 model loader
│   │   ├── embedding_cache.py        # Vector embedding in-memory lookup cache
│   │   ├── graph_generator.py        # Generates DAG node & edge connection metadata
│   │   ├── career_resolver.py        # Resolves ambiguous queries to canonical careers
│   │   └── source_router.py          # Data source routing engine
│   │
│   ├── training/                # Synthetic Data & Model Testing
│   │   └── synthetic_generator.py# Generates synthetic learner profile test vectors
│   │
│   ├── utils/                   # Shared Helper Utilities
│   │   └── normalization.py     # Score scaling & text cleaning helper functions
│   │
│   └── main.py                  # FastAPI application entry point & startup lifecycle
```

### **B. Node.js Express Server AI Orchestration (`server/src/services/`)**

```text
server/src/services/
├── python-ai.service.ts         # Axios HTTP client connecting Node.js to FastAPI (:8000)
├── ai.service.ts                # Primary Gemini LLM gateway & multi-tier fallback router
├── ai/
│   ├── gemini.service.ts        # Direct `@google/genai` SDK wrapper for Gemini calls
│   └── career-context.service.ts# Assembles learner profile & roadmap context for RAG
├── recommendation.service.ts    # Business logic for career recommendations
├── roadmap.service.ts           # Business logic for roadmap generation & dynamic DAGs
└── conversation.service.ts      # Chat history persistence & SSE streaming controller
```

---

## 11. API Endpoints Reference

### **Python AI Service (`http://localhost:8000`)**
* `POST /recommend` — Generates 6-factor hybrid match recommendations.
* `POST /roadmap/generate` — Builds sequential 4-phase roadmap structure.
* `POST /skill-gap` — Performs detailed skill gap analysis.
* `GET /embeddings/career/{id}` — Fetches vector embedding for a career.
* `GET /health` — Service status check.

### **Express Gateway API (`http://localhost:5000/api/v1`)**
* `GET /api/v1/recommendations` — Fetch career recommendations.
* `POST /api/v1/roadmaps/generate` — Generate adaptive learning roadmap.
* `POST /api/v1/recommendations/skill-gap` — Compute skill gap analysis.
* `POST /api/v1/conversation/message` — Send message to RAG Assistant (supports SSE streaming).
