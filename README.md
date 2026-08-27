# CAREER PATHFINDER

> **AI-Powered Personalized Career and Learning Path Recommendation SaaS**  
> *Deterministic ML + Generative Cloud LLM Hybrid Platform*

---

## 🎯 Executive Overview

**Career Pathfinder** is an enterprise-grade prototype SaaS application designed to help learners and professionals navigate career transitions through hyper-personalized, AI-driven learning paths. It combines a **deterministic 6-factor ML recommendation engine** with **Google Gemini generative LLMs** to offer:

* 📊 **Deterministic Match Scoring**: Explainable percentage compatibility based on 6 core profile factors.
* 🎯 **Skill-Gap Categorization**: Identifies acquired, in-progress, and missing critical skill dependencies.
* 🗺️ **4-Phase Adaptive Roadmaps**: Dynamically sequences learning milestones with practical project prompts, docs, video terms, and interactive DAG flowchart diagrams.
* 💬 **Contextual RAG Career Mentor**: Real-time conversational AI mentor streamed via Server-Sent Events (SSE).
* 🛡️ **3-Tier Fault-Tolerant Resilience**: Guarantees zero downtime via automatic fallback layers.

---

## 🏛️ System Architecture & Design Topology

Path Finder uses a **Hybrid Microservice Architecture** that decouples heavy deterministic calculations from generative cloud services.

```mermaid
flowchart TD
    subgraph Client ["Client (Next.js 16 Frontend - Port 3000)"]
        UI["React Pages & Dashboard"]
        ClientAPI["lib/api.ts (Axios)"]
        SocketClient["SocketContext (Socket.IO)"]
        UI --> ClientAPI
        UI --> SocketClient
    end

    subgraph Server ["Server (Node.js / Express API Gateway - Port 5000)"]
        ExpressApp["app.ts / server.ts"]
        Routes["Express Routes (/api/v1/...)"]
        Controllers["Controllers"]
        NodeServices["Services (roadmap, recommendation, progress)"]
        PythonBridge["Python AI Bridge (python-ai.service.ts)"]
        GeminiService["Gemini LLM Integration (ai.service.ts)"]
        DB[(MongoDB Atlas)]

        ExpressApp --> Routes
        Routes --> Controllers
        Controllers --> NodeServices
        NodeServices --> DB
        NodeServices --> PythonBridge
        NodeServices --> GeminiService
    end

    subgraph AIService ["AI Microservice (Python / FastAPI - Port 8000)"]
        FastAPIApp["main.py"]
        APIRoutes["api/routes (recommendation, roadmap, embeddings)"]
        RecEngine["learning_recommendation_engine.py"]
        RoadmapEngine["roadmap_engine.py"]
        ONNXEngine["ONNX Runtime (all-MiniLM-L6-v2)"]

        FastAPIApp --> APIRoutes
        APIRoutes --> RecEngine
        APIRoutes --> RoadmapEngine
        RecEngine --> ONNXEngine
    end

    ClientAPI -- "HTTP REST Requests" --> ExpressApp
    SocketClient -- "WebSocket Events" --> ExpressApp
    PythonBridge -- "HTTP Service Bridge" --> FastAPIApp
    GeminiService -- "Cloud LLM SDK (@google/genai)" --> GeminiCloud["Google Gemini Cloud LLM"]
```

### 🛡️ 3-Tier Multi-Layer Fallback Strategy
1. **Tier 1 (Python AI Microservice)**: Primary calculation engine for 6-factor scoring, ONNX sentence embeddings, and prerequisite graph ordering.
2. **Tier 2 (Gemini Direct Fallback)**: If Python AI service is unreachable, Node.js invokes Gemini Cloud LLM directly to score and structure recommendations.
3. **Tier 3 (Local Rule Engine)**: If cloud services are unavailable, local static dataset rules ([careers.dataset.ts](file:///c:/Users/hp/OneDrive/Documents/Desktop/Path%20Finder/server/src/data/careers.dataset.ts)) serve recommendations without application crashes.

### ⚡ Memory-Optimized CPU Architecture (Render 512 MiB RAM)
* **ONNX Runtime CPU**: Replaced PyTorch (`torch`) with `xenova/all-MiniLM-L6-v2` in INT8 ONNX format.
* **Low Memory Footprint**: Reduces RAM consumption from **>1.2 GB to ~35-45 MB**.
* **Precomputed Vector Store**: Preloaded `career_embeddings.npz` (384-d normalized dense vectors) enables **<1 sec** startup and instant NumPy cosine searches.

---

## 🔄 End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Learner / Client
    participant Frontend as Next.js (Port 3000)
    participant Gateway as Express Gateway (Port 5000)
    participant AIService as FastAPI AI Service (Port 8000)
    participant Gemini as Google Gemini Cloud API
    participant DB as MongoDB Atlas

    User->>Frontend: Completes Onboarding / Profile Setup
    Frontend->>Gateway: POST /api/v1/recommendations
    Gateway->>AIService: POST /recommend (Profile Payload)
    AIService->>AIService: Run 6-Factor Equation + ONNX Cosine Search
    AIService-->>Gateway: Returns Match Scores % & Ranked Careers
    Gateway->>Gemini: Enrich Career Details (Projects, Video Terms, Docs)
    Gemini-->>Gateway: Enhanced Content Payload
    Gateway->>DB: Persist Profile & Recommendations
    Gateway-->>Frontend: HTTP 200 JSON Response
    Frontend->>User: Renders Interactive Career Recommendations & Roadmap
```

---

## 🧠 AI Subsystem & Mathematical Formulation

### 1. The 6-Factor Hybrid Scoring Equation

$$\text{MatchScore} = 0.40 \cdot \text{SkillMatch} + 0.20 \cdot \text{InterestMatch} + 0.15 \cdot \text{GoalMatch} + 0.10 \cdot \text{ExpMatch} + 0.05 \cdot \text{EduMatch} + 0.10 \cdot \text{SemanticMatch}$$

| Factor | Weight | Formula / Logic |
| :--- | :---: | :--- |
| **Skill Match** | **40%** | $\frac{|\text{UserSkills} \cap \text{RequiredSkills}|}{|\text{RequiredSkills}|} \times 100$ |
| **Interest Match** | **20%** | Overlap between user interests and target domain tags. |
| **Goal Alignment** | **15%** | Direct role match (`100%`), domain match (`75%`), general (`40%`). |
| **Experience Match** | **10%** | Alignment between experience level (Beginner/Mid/Senior) and role difficulty. |
| **Education Match** | **5%** | STEM degree (`100%`), Bootcamp (`85%`), Self-taught (`70%`). |
| **Semantic Match** | **10%** | Cosine similarity $\cos(\mathbf{e}_{\text{profile}}, \mathbf{e}_{\text{career}}) \times 100$ via ONNX `all-MiniLM-L6-v2`. |

### 2. Skill Gap Prioritization
Missing skills are categorized into:
* **Acquired / Strong**: Proficiency $\ge 4/5$.
* **In Progress / Needs Work**: Proficiency $1-3/5$.
* **Missing Critical Gaps**: Not currently possessed by the learner.

### 3. 4-Phase Roadmap Engine
* **Phase 1: Foundations**: Core prerequisites & tooling.
* **Phase 2: Core Competencies**: Required technical skills.
* **Phase 3: Advanced Topics**: Frameworks & architectural patterns.
* **Phase 4: Capstone Projects**: Real-world portfolio projects & career readiness.

---

## 📂 Repository & Folder Structure

```
Path Finder/
├── ai-service/                   # Python FastAPI AI Microservice (Port 8000)
│   ├── app/                      # Application Root
│   │   ├── api/routes/           # Routes (recommendation.py, roadmap.py, health.py)
│   │   ├── config/               # Settings & Configuration
│   │   ├── data/                 # Datasets (courses.json, careers.json, skills.json)
│   │   ├── models/               # Domain Models (course.py, career.py, skill.py)
│   │   ├── services/             # Recommendation, Skill Gap & Roadmap Engines
│   │   └── main.py               # FastAPI Entrypoint
│   ├── scripts/                  # Precompute embeddings script
│   ├── tests/                    # Pytest Suite
│   ├── requirements.txt          # Lightweight CPU Python Dependencies
│   └── README.md                 # AI Service Documentation
│
├── server/                       # Express Node.js & TypeScript Backend (Port 5000)
│   ├── src/
│   │   ├── config/               # DB & Env Config (db.ts, env.ts)
│   │   ├── controllers/          # Controllers (recommendation, roadmap, auth, profile)
│   │   ├── middleware/           # Auth (JWT), Error & Validation Middleware
│   │   ├── models/               # Mongoose Schemas (User.ts, LearnerProfile.ts, Roadmap.ts)
│   │   ├── routes/               # Express API Routes
│   │   ├── services/             # Logic Services, Python Bridge & Gemini Service
│   │   ├── utils/                # Benchmarks, Seeding & Helper Utilities
│   │   ├── app.ts                # Express Setup
│   │   ├── server.ts             # Server Listener Entrypoint
│   │   └── socket.ts             # Socket.IO Real-time WebSocket Handler
│   ├── package.json              # Server NPM Dependencies & Scripts
│   └── tsconfig.json             # TypeScript Configuration
│
├── client/                       # Next.js 16 React Frontend (Port 3000)
│   ├── src/
│   │   ├── app/                  # Next.js App Router Pages
│   │   ├── components/           # UI, Layout, Landing & Profile Components
│   │   ├── context/              # Auth & Socket Context Providers
│   │   ├── lib/                  # Axios Client (api.ts) & Utilities
│   │   └── types/                # TypeScript Interfaces & API Types
│   ├── package.json              # Client NPM Dependencies
│   └── next.config.ts            # Next.js Configuration
│
├── docs/                         # Exhaustive Architecture Documentation (00 to 17)
├── ai.md                         # Detailed AI Subsystem & Hybrid Architecture Guide
└── diagram.md                    # File Index & Architecture Diagrams
```

---

## 💻 Important Commands & Local Setup Guide

### 🟢 1. Express Backend Server (`server/`)
```bash
cd server

# Install dependencies
npm install

# Seed MongoDB with canonical careers & dataset
npm run seed

# Start development server with live watch (Port 5000)
npm run dev

# Run automated integration tests
npm run test

# Run AI evaluation & precision benchmark suite
npx tsx src/utils/ai-evaluation.ts
```

### 🔵 2. Python AI Microservice (`ai-service/`)
```bash
cd ai-service

# Create & activate virtual environment (Python 3.11)
python -m venv .venv
.venv\Scripts\Activate.ps1       # Windows PowerShell
source .venv/bin/activate        # Linux / macOS

# Install lightweight dependencies
pip install -r requirements.txt

# Precompute vector embeddings (optional)
python scripts/precompute_embeddings.py

# Run FastAPI server with auto-reload (Port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 🟣 3. Next.js Client Frontend (`client/`)
```bash
cd client

# Install dependencies
npm install

# Start Next.js development server (Port 3000)
npm run dev

# Build production distribution
npm run build
```

---

## 📊 Evaluation & Precision Benchmarks

Path Finder includes an automated evaluation suite ([`server/src/utils/ai-evaluation.ts`](file:///c:/Users/hp/OneDrive/Documents/Desktop/Path%20Finder/server/src/utils/ai-evaluation.ts)) to verify recommendation precision:

* **Top-1 Precision Accuracy**: `100.0%` (5/5 target careers ranked #1 for matching test personas).
* **Top-3 Recall Precision**: `100.0%` (5/5 target careers present in Top 3 recommendation list).

---

## 📖 Key Documentation Links

* [`docs/`](file:///c:/Users/hp/OneDrive/Documents/Desktop/Path%20Finder/docs) — Complete system documentation series (00 through 17).
* [`ai.md`](file:///c:/Users/hp/OneDrive/Documents/Desktop/Path%20Finder/ai.md) — Deep technical guide for the AI Subsystem.
* [`diagram.md`](file:///c:/Users/hp/OneDrive/Documents/Desktop/Path%20Finder/diagram.md) — Exhaustive path index and architecture flow maps.
* [`ai-service/README.md`](file:///c:/Users/hp/OneDrive/Documents/Desktop/Path%20Finder/ai-service/README.md) — Fast-API microservice configuration.

