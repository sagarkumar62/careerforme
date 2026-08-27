# Real-Time Learning Path Engine: Technical Architecture, Workflow, Data Flow, Career Examples & Dynamic Generation Blueprint

This document provides a comprehensive technical specification of the **Learning Path & Career Roadmap System** in Path Finder. It details the internal engine workflow, end-to-end data flow, folder structure, concrete curriculum examples (**Commercial Pilot** and **AI Engineer**), an in-depth root cause analysis of why learning paths currently produce **static outputs**, and an actionable engineering blueprint to achieve **real-time dynamic AI generation**.

---

## Table of Contents
1. [Overview & Detailed Description](#1-overview--detailed-description)
2. [Complete System Workflow](#2-complete-system-workflow)
3. [End-to-End Data Flow](#3-end-to-end-data-flow)
4. [Project Folder & File Structure](#4-project-folder--file-structure)
5. [Concrete Career Learning Path Examples](#5-concrete-career-learning-path-examples)
   - [Example A: Commercial Pilot](#example-a-commercial-pilot)
   - [Example B: AI Engineer](#example-b-ai-engineer)
6. [Root Cause Analysis: Why Learning Path Output is Static](#6-root-cause-analysis-why-learning-path-output-is-static)
7. [Solutions & Engineering Blueprint for Real-Time AI Generation](#7-solutions--engineering-blueprint-for-real-time-ai-generation)

---

## 1. Overview & Detailed Description

The **Learning Path System** is a core component of Path Finder designed to transform target career goals into personalized, 4-phase structured learning roadmaps. It calculates topological prerequisite dependencies, evaluates student skill gaps, and formats actionable milestones.

### Key Capabilities & Characteristics
- **Dependency-Aware DAG Engine**: Represents skills and milestones as a **Directed Acyclic Graph (DAG)** to guarantee that prerequisite foundational topics are mastered before advanced topics are unlocked.
- **Topological Sorting & Depth Calculation**: Employs **Kahn’s Algorithm** to compute node in-degrees, detect circular dependencies (cycles), and derive explicit topological depth levels.
- **4-Phase Curriculum Structure**: Automatically bins milestone nodes into 4 semantic phases:
  1. **Phase 1: Foundation** (Core concepts, tools, principles)
  2. **Phase 2: Core** (Essential domain competencies & practical application)
  3. **Phase 3: Intermediate / Advanced** (Specializations, advanced tooling, complex systems)
  4. **Phase 4: Capstone** (Real-world synthesis, portfolio projects, career readiness)
- **Phase Elevation Safety**: Enforces the mathematical invariant that $\text{Phase}(\text{Target}) \ge \text{Phase}(\text{Prerequisite})$, preventing dependent nodes from being scheduled before their prerequisites.
- **Learner Personalization Engine**: Evaluates the user's current skill levels against required milestone competencies, assigning personalized state labels:
  - `MASTERED`: User skill level meets or exceeds node requirement ($\text{Level}_{\text{user}} \ge \text{Level}_{\text{required}}$).
  - `NEEDS_WORK`: User possesses partial skill ($0 < \text{Level}_{\text{user}} < \text{Level}_{\text{required}}$).
  - `MISSING`: User has zero documented experience ($\text{Level}_{\text{user}} = 0$).
  - `RECOMMENDED`: Next unlocked node whose prerequisites are all satisfied.
  - `LOCKED`: Node blocked by one or more incomplete prerequisites.

---

## 2. Complete System Workflow

The generation lifecycle transitions through 10 deterministic steps from user request to rendered roadmap:

```
[1. Learner Request / Profile Input]
              │
              ▼
[2. Canonical Career Resolver (career_resolver.py)]
              │
              ▼
[3. Schema Normalization (Schema A / Schema B -> Uniform Graph)]
              │
              ▼
[4. Kahn's Topological Sorting & Cycle Validation]
              │
              ▼
[5. Topological Depth Calculation Depth(N) = max(Depth(P)) + 1]
              │
              ▼
[6. 4-Phase Semantic Allocation & Phase Elevation Safety]
              │
              ▼
[7. Personalization Engine (Skill Gap & Status Assignment)]
              │
              ▼
[8. LLM Content Enrichment Layer (Gemini API)]
              │
              ▼
[9. Resource & Link Verification / Sanitization]
              │
              ▼
[10. MongoDB Persistence & Client JSON Payload Response]
```

### Detailed Workflow Steps

1. **Input Normalization & Request Intake**:
   - The user selects or types a target career (e.g., `"Commercial Pilot"`, `"AI Engineer"`).
   - The Node.js API (`roadmap.service.ts`) fetches the user's `LearnerProfile` (skills, target goals, weekly study hours).

2. **Canonical Career Resolution (`career_resolver.py`)**:
   - Input strings are sanitized (stripping prefixes like `"become a"`, `"learn"`).
   - Searches alias maps (`aliases.json`, `domains.json`) and scans static career dataset directories (`app/data/careers/*.json`).
   - Evaluates a **Dataset Quality Score** to pick the highest quality canonical dataset if multiple candidates exist (preferring explicit node IDs and non-linear branching graphs).

3. **Schema Normalization**:
   - Converts both **Schema A** (explicit `nodes` list with `prerequisites` arrays) and **Schema B** (`skills` list with `[source, target]` prerequisite pairs) into a uniform internal graph model.
   - Maps titles and alias strings to unique canonical node IDs (`title_to_id_map`).

4. **Kahn's Topological Sorting & Cycle Detection**:
   - Calculates in-degrees for all graph nodes.
   - Initializes a queue with all nodes having `in_degree == 0`.
   - Iteratively dequeues nodes, appends them to `topological_order`, and decrements in-degrees of downstream target nodes.
   - **Validation Check**: If `len(topological_order) < total_nodes`, a cycle loop exists, throwing an `INVALID_DAG_CYCLE` error.

5. **Topological Depth Calculation**:
   - Computes depth recursively:
     $$\text{Depth}(N) = \begin{cases} 0 & \text{if } \text{Prerequisites}(N) = \emptyset \\ \max_{P \in \text{Prerequisites}(N)} (\text{Depth}(P)) + 1 & \text{otherwise} \end{cases}$$

6. **4-Phase Semantic Allocation & Elevation Safety**:
   - Maps nodes into Phase 1, Phase 2, Phase 3, or Phase 4 based on depth level and node type tags.
   - **Phase Elevation Safety**: Automatically elevates any target node's phase if $\text{Phase}(\text{Target}) < \text{Phase}(\text{Prerequisite})$.

7. **Personalization & Skill Gap Assignment**:
   - Compares user's known skills against node required levels.
   - Preserves `MASTERED` nodes in the DAG structure to maintain topological graph connectivity while setting state tags (`MASTERED`, `NEEDS_WORK`, `MISSING`, `RECOMMENDED`, `LOCKED`).

8. **LLM Content Enrichment (Gemini API)**:
   - Enriches each milestone node with descriptive summaries, suggested hands-on project ideas, markdown learning guides, and search queries.

9. **Resource Verification & Sanitization**:
   - Filters out invalid or broken fallback links (e.g., generic `https://youtube.com` root domain URLs).

10. **Persistence & Payload Output**:
    - Stores the complete roadmap in MongoDB (`Roadmap` model) and delivers the JSON payload to the frontend graph visualizer.

---

## 3. End-to-End Data Flow

The following sequence chart illustrates the detailed data flow across client, backend server, Python AI service, and Gemini LLM:

```
┌──────────┐            ┌──────────────┐          ┌──────────────────┐          ┌────────────────┐
│ Client   │            │ Server       │          │ Python AI Service│          │ Gemini LLM API │
│ (React)  │            │ (Node/Express│          │ (FastAPI/Py)     │          │ (Google GenAI) │
└────┬─────┘            └──────┬───────┘          └────────┬─────────┘          └───────┬────────┘
     │                         │                           │                            │
     │ 1. POST /roadmaps       │                           │                            │
     ├────────────────────────>│                           │                            │
     │    { targetCareer }     │                           │                            │
     │                         │ 2. Fetch LearnerProfile   │                            │
     │                         │    (MongoDB)              │                            │
     │                         │                           │                            │
     │                         │ 3. POST /roadmap/generate │                            │
     │                         ├──────────────────────────>│                            │
     │                         │    { profile, career }    │                            │
     │                         │                           │ 4. resolve_target_career() │
     │                         │                           │    (Scans JSON datasets)   │
     │                         │                           │                            │
     │                         │                           │ 5. Topological DAG Sort    │
     │                         │                           │    & 4-Phase Allocation    │
     │                         │                           │                            │
     │                         │ 6. Return Structured DAG  │                            │
     │                         │<──────────────────────────┤                            │
     │                         │                           │                            │
     │                         │ 7. enrichRoadmap()        │                            │
     │                         ├───────────────────────────────────────────────────────>│
     │                         │                           │                            │ 8. Return enriched
     │                         │ 9. Sanitize & Save        │                            │    projects & docs
     │                         │    (Roadmap in DB)        │<───────────────────────────┤
     │ 10. HTTP 200 OK         │                           │                            │
     │<────────────────────────┤                           │                            │
     │    (Full Roadmap JSON)  │                           │                            │
```

---

## 4. Project Folder & File Structure

The learning path generation functionality spans the Node.js backend (`server/`) and the Python AI service (`ai-service/`).

```
Path Finder/
├── docs/
│   ├── LEARNING_PATH_EXPLANATION.md          # Existing roadmap technical documentation
│   ├── REALTIME_LEARNING_PATH_ARCHITECTURE_SPECIFICATION.md # This specification file
│   ├── AI_API_CONTRACT.md                    # Data contract between Node.js and Python AI service
│   └── CAREER_ROADMAP_DATA_FLOW.md           # Sequence diagrams and state machine docs
│
├── server/                                   # Node.js TypeScript Backend
│   ├── src/
│   │   ├── controllers/
│   │   │   └── roadmap.controller.ts         # Handles HTTP endpoints for /api/v1/roadmaps
│   │   ├── routes/
│   │   │   └── roadmap.routes.ts             # Express route declarations and auth middleware
│   │   ├── services/
│   │   │   ├── roadmap.service.ts            # Primary backend orchestrator & cache manager
│   │   │   ├── python-ai.service.ts          # Axios HTTP client communicating with Python AI service
│   │   │   └── ai/
│   │   │       ├── gemini.service.ts         # Google GenAI SDK integration for LLM streaming/enrichment
│   │   │       └── career-context.service.ts # Context builder for LLM prompts
│   │   └── models/
│   │       ├── Roadmap.ts                    # Mongoose schema for persistent roadmaps & nodes
│   │       └── LearnerProfile.ts             # Mongoose schema for learner skills & goal settings
│
└── ai-service/                               # Python FastAPI AI Microservice
    ├── app/
    │   ├── main.py                           # FastAPI application entrypoint & routing setup
    │   ├── api/
    │   │   └── roadmap.py                    # REST route (/api/v1/roadmap/generate)
    │   ├── services/
    │   │   ├── roadmap_engine.py             # Authoritative DAG engine (Kahn's sort, depth, phases)
    │   │   ├── career_resolver.py            # Career dataset resolution & quality scoring
    │   │   ├── learning_path_generator.py    # Path builder & milestone formatter
    │   │   └── skill_gap_engine.py           # Skill discrepancy evaluator
    │   ├── utils/
    │   │   └── normalization.py              # String normalization & level parsing helpers
    │   └── data/                             # STATIC DATASET DIRECTORY
    │       ├── aliases.json                  # Target career string alias lookups
    │       ├── domains.json                  # Domain categorization lookups
    │       └── careers/                      # Pre-written career JSON files
    │           ├── data-and-ai/
    │           │   ├── ai-engineer.json      # Pre-defined AI Engineer roadmap dataset
    │           │   └── data-engineer.json
    │           ├── occupational/
    │           │   └── pilot.json            # Pre-defined Commercial Pilot roadmap dataset
    │           ├── software-development/
    │           │   └── full-stack-developer.json
    │           └── technical/
    │               └── ai-engineer.json      # Quality-scored technical AI Engineer graph
```

---

## 5. Concrete Career Learning Path Examples

Below are concrete, multi-phase curriculum breakdowns for **Commercial Pilot** and **AI Engineer**.

### Example A: Commercial Pilot

A 4-phase structured aviation career path leading from zero experience to Airline Transport Pilot (ATP) simulator readiness.

```
+-----------------------------------------------------------------------------------+
|                        COMMERCIAL PILOT LEARNING PATH                             |
+-----------------------------------------------------------------------------------+
|  PHASE 1: FOUNDATION (Ground School & Aviation Theory)                            |
|  ├── Aerodynamics & Principles of Flight (Lift, Drag, Airfoils, Stall Speed)      |
|  ├── Aviation Regulations & Air Law (FAA / ICAO Airspace Classes A-G, FAR/AIM)     |
|  └── Aeronautical Meteorology & Weather Theory (METARs, TAFs, Icing, Wind Shear)  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  PHASE 2: CORE (Flight Training & Basic Operations)                               |
|  ├── VFR Flight Navigation & Plotting (Sectional Charts, E6B Flight Computer)     |
|  ├── Aircraft Systems & Glass Cockpit Avionics (Piston Engines, Garmin G1000)     |
|  └── ATC Radio Communications & Phraseology (Clearances, Tower Communications)    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  PHASE 3: INTERMEDIATE / ADVANCED (Instrument & Commercial Rating)                |
|  ├── Instrument Flight Rules (IFR) & Hood Operations (ILS, VOR, RNAV Approaches)  |
|  ├── Commercial Pilot Maneuvers & Flight Physiology (Chandelles, Lazy Eights)     |
|  └── Multi-Engine Rating & Asymmetric Thrust (Vmc, Critical Engine Failures)      |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  PHASE 4: CAPSTONE (Turbine Systems & Airline Readiness)                          |
|  ├── Crew Resource Management (CRM) & Threat Error Management (TEM)               |
|  └── Airline Transport Pilot (ATP) & Jet Transition Simulator Capstone            |
+-----------------------------------------------------------------------------------+
```

#### Node Specification Table (Commercial Pilot)
| Node ID | Title | Phase | Prerequisites | Target Hours | Key Topics Covered |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `aerodynamics-flight-principles` | Aerodynamics & Principles of Flight | Phase 1 (Foundation) | None | 35 hrs | Bernoulli's principle, lift, drag, stalls, angle of attack |
| `aviation-regulations-faa` | Aviation Regulations & Air Law | Phase 1 (Foundation) | None | 30 hrs | FAA FAR/AIM, airspace A-G, pilot certification limits |
| `aeronautical-meteorology` | Aeronautical Meteorology | Phase 1 (Foundation) | None | 30 hrs | Weather charts, METARs, TAFs, wind shear, icing hazards |
| `vfr-flight-navigation` | VFR Flight Navigation & Plotting | Phase 2 (Core) | `aerodynamics-flight-principles`, `aeronautical-meteorology` | 40 hrs | Dead reckoning, pilotage, Sectional charts, E6B math |
| `aircraft-systems-avionics` | Aircraft Systems & Avionics | Phase 2 (Core) | `aerodynamics-flight-principles` | 45 hrs | Engine mechanics, hydraulics, Garmin G1000 glass cockpit |
| `atc-radio-communications` | ATC Radio Communications | Phase 2 (Core) | `aviation-regulations-faa` | 25 hrs | Phraseology, squawk codes, tower clearances |
| `instrument-flight-rules-ifr` | Instrument Flight Rules (IFR) | Phase 3 (Advanced) | `vfr-flight-navigation`, `aircraft-systems-avionics` | 50 hrs | Instrument scans, ILS/RNAV approaches, hold patterns |
| `commercial-pilot-maneuvers` | Commercial Pilot Flight Maneuvers | Phase 3 (Advanced) | `instrument-flight-rules-ifr` | 45 hrs | Chandelles, lazy eights, steep spirals, precision landings |
| `multi-engine-rating` | Multi-Engine Rating | Phase 3 (Advanced) | `commercial-pilot-maneuvers` | 30 hrs | Asymmetric thrust, Vmc speed, engine-out procedures |
| `atp-jet-transition-capstone` | ATP & Jet Transition Simulator | Phase 4 (Capstone) | `multi-engine-rating` | 20 hrs | CRM, TEM, turbine engine management, simulator checkride |

---

### Example B: AI Engineer

A 4-phase structured technology learning path leading from programming basics to production LLM deployment and MLOps.

```
+-----------------------------------------------------------------------------------+
|                          AI ENGINEER LEARNING PATH                                |
+-----------------------------------------------------------------------------------+
|  PHASE 1: FOUNDATION (Mathematical & Software Prerequisites)                      |
|  ├── Python Programming & Software Engineering (Data structures, OOP, Virtualenvs)|
|  ├── Mathematics for Machine Learning (Linear algebra, Vector calculus, Matrix)   |
|  └── Data Manipulation & Wrangling (NumPy, Pandas, Vectorized operations)         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  PHASE 2: CORE (Machine Learning & Deep Learning Fundamentals)                    |
|  ├── Classic Machine Learning Algorithms (Scikit-Learn, Regression, Trees, XGBoost)|
|  ├── Neural Networks & PyTorch Fundamentals (Tensors, Autograd, Backpropagation)  |
|  └── Computer Vision & NLP Basics (CNNs, RNNs, Tokenization, Embeddings)          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  PHASE 3: INTERMEDIATE / ADVANCED (LLMs, Generative AI & Vector Systems)          |
|  ├── Transformer Architectures (Self-attention, Multi-head attention, Encoders)   |
|  ├── Retrieval-Augmented Generation (RAG) & Vector DBs (Pinecone, Qdrant, Chroma) |
|  └── LLM Fine-Tuning & Quantization (PEFT, LoRA, QLoRA, vLLM, Ollama)             |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|  PHASE 4: CAPSTONE (Production MLOps & Autonomous AI Agents)                      |
|  ├── Autonomous AI Agent Frameworks (LangChain, LangGraph, AutoGen, CrewAI)       |
|  └── Production AI Systems Capstone (FastAPI, Docker, Kubernetes, MLflow, E2E)    |
+-----------------------------------------------------------------------------------+
```

#### Node Specification Table (AI Engineer)
| Node ID | Title | Phase | Prerequisites | Target Hours | Key Topics Covered |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `python` | Python Programming | Phase 1 (Foundation) | None | 30 hrs | OOP, modules, async, virtual environments |
| `math-for-ml` | Mathematics for ML | Phase 1 (Foundation) | None | 25 hrs | Linear algebra, eigenvalues, gradients, probability |
| `numpy-pandas` | Data Manipulation (NumPy/Pandas) | Phase 1 (Foundation) | `python` | 25 hrs | DataFrames, arrays, cleaning, aggregations |
| `classic-ml` | Classical Machine Learning | Phase 2 (Core) | `math-for-ml`, `numpy-pandas` | 35 hrs | Supervised/unsupervised models, XGBoost, Scikit-Learn |
| `pytorch-deep-learning` | Deep Learning & PyTorch | Phase 2 (Core) | `classic-ml` | 40 hrs | Tensors, autograd, loss functions, optimizers |
| `transformer-architecture` | Transformers & Self-Attention | Phase 3 (Advanced) | `pytorch-deep-learning` | 35 hrs | Attention mechanisms, BERT, GPT models, Tokenization |
| `rag-vector-databases` | Retrieval-Augmented Generation | Phase 3 (Advanced) | `transformer-architecture` | 30 hrs | Vector embeddings, Qdrant/Pinecone, chunking, re-ranking |
| `llm-finetuning-peft` | LLM Fine-Tuning & Quantization | Phase 3 (Advanced) | `transformer-architecture` | 30 hrs | LoRA, QLoRA, Unsloth, vLLM, GGUF/Ollama |
| `ai-agents-langgraph` | Autonomous AI Agents | Phase 4 (Capstone) | `rag-vector-databases` | 25 hrs | LangGraph, CrewAI, multi-agent orchestration, tool calling |
| `production-mlops-capstone` | Production MLOps Capstone | Phase 4 (Capstone) | `llm-finetuning-peft`, `ai-agents-langgraph` | 25 hrs | Docker, Kubernetes, MLflow, API deployment, monitoring |

---

## 6. Root Cause Analysis: Why Learning Path Output is Static

Currently, when a user requests a learning path for any career (whether tech or non-tech), the system returns a **pre-written, static output**. Below is a detailed breakdown of why this occurs:

### Root Cause 1: Hardcoded JSON Dataset Dependency
In `ai-service/app/services/career_resolver.py`, the resolution mechanism scans pre-created `.json` files stored locally in `ai-service/app/data/careers/`.
- If a career JSON file exists (e.g. `pilot.json`, `ai-engineer.json`, `data-engineer.json`), the system reads the hardcoded nodes and edges from that file.
- If a career is requested that **does NOT exist** as a static file (e.g. `"Quantum Engineer"` or `"Robotics Specialist"`), the resolver returns `CAREER_NOT_SUPPORTED` instead of dynamically generating the curriculum via an LLM.

### Root Cause 2: Aggressive MongoDB Roadmap Reuse / Caching
In `server/src/services/roadmap.service.ts`, lines 113-158 perform a database check:
```typescript
const existingMatch = existingRoadmaps.find((r) => { ... });
if (existingMatch && (existingMatch.profileVersion || 1) >= (profile.profileVersion || 1) && !existingMatch.isStale) {
  return existingMatch; // Reuses static stored roadmap
}
```
If a user has previously generated a roadmap for a career, the backend returns the exact cached database document without re-running any generation pipeline or evaluating changes in external industry tools.

### Root Cause 3: Post-Hoc LLM Usage Only
In the current design, Google Gemini (`GeminiService`) is **only invoked at the end** of the pipeline (`aiService.enrichRoadmap()`) to attach text descriptions and project ideas to nodes that **already exist in the static JSON dataset**. The LLM is **never tasked with generating the node graph, prerequisites, or skill hierarchy itself**.

### Root Cause 4: Static Learning Resource URLs
The learning resources (video links, tutorials, documentation) are loaded from static files (`careers.csv` or node JSON definitions). They use generic fallback strings rather than querying live web/video search APIs at runtime.

### Root Cause 5: Static Hierarchy During User Progress Updates
When a user updates their profile or completes a milestone, `progress.service.ts` updates node status fields (`MASTERED`, `COMPLETED`), but the overall graph structure remains completely static. The engine does not dynamically add remedial nodes or adapt to the user's learning speed.

---

## 7. Solutions & Engineering Blueprint for Real-Time AI Generation

To transform Path Finder into a **true real-time, dynamic AI learning path generator**, we must implement a **Hybrid RAG + LLM Graph Synthesis Architecture**.

```
[User Request: Any Career / Custom Goal]
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│           Hybrid Career Resolver Engine                 │
│  Check static dataset registry (app/data/careers/*.json) │
└──────────────────────────┬──────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             │ Found in static files?    │
             └─────────────┬─────────────┘
                YES        │        NO
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
    ┌────────────────────┐   ┌─────────────────────────────────────────┐
    │ Fast Path:         │   │ Dynamic LLM Generation Path (REAL-TIME):│
    │ Load authoritative │   │ Call Gemini 3.6 Flash Structured Output  │
    │ static graph JSON  │   │ with Pydantic Schema (DAG Nodes & Edges)│
    └────────────┬───────┘   └────────────────────┬────────────────────┘
                 │                                │
                 └────────────────┬───────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Kahn's Topological Repair & Safety Engine                │
    │ - Validate DAG (ensure zero cycle loops)                 │
    │ - Calculate exact depth: Depth(N) = max(Depth(P)) + 1    │
    │ - Assign 4 semantic phases with Elevation Safety         │
    └─────────────────────────────┬────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Real-Time Live Resource Resolver                         │
    │ - Query YouTube Data API v3 / Serper Web API             │
    │ - Fetch real-time active tutorial links & docs           │
    └─────────────────────────────┬────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Personalization & Dynamic Stream Output (SSE/WebSocket)  │
    └──────────────────────────────────────────────────────────┘
```

### Actionable Implementation Steps

#### Step 1: Implement Dynamic Gemini LLM DAG Generator in Python AI Service
Add a dynamic generator fallback in `ai-service/app/services/career_resolver.py` and `roadmap_engine.py`. When a requested career is missing from disk, call Gemini with a strict Pydantic output schema to generate custom DAG nodes and prerequisite dependencies in real-time.

```python
# ai-service/app/services/dynamic_llm_generator.py

from pydantic import BaseModel, Field
from typing import List, Optional
import google.generativeai as genai

class DynamicNode(BaseModel):
    id: str = Field(description="Unique slugified node ID, e.g. aerodynamics-basics")
    title: str = Field(description="Title of the milestone")
    description: str = Field(description="Comprehensive technical description")
    type: str = Field(description="Node type: foundation, core, intermediate, or capstone")
    difficulty: str = Field(description="beginner, intermediate, or advanced")
    estimatedHours: int = Field(default=20, description="Estimated study hours")
    prerequisites: List[str] = Field(default_factory=list, description="IDs of prerequisite nodes")

class DynamicRoadmapGraph(BaseModel):
    careerId: str
    title: str
    domain: str
    estimatedMonths: int
    nodes: List[DynamicNode]

def generate_dynamic_career_dag(target_career: str) -> DynamicRoadmapGraph:
    """Generate structured DAG graph for any arbitrary career using Gemini LLM in real-time."""
    prompt = f"""
    You are an expert curriculum design engine. Generate a rigorous, dependency-aware learning roadmap for the career: '{target_career}'.
    Requirements:
    1. Provide 8 to 14 distinct milestone nodes.
    2. Ensure nodes form a valid Directed Acyclic Graph (DAG) with explicit prerequisite node IDs.
    3. Categorize into 4 phases: foundation, core, intermediate, capstone.
    """
    model = genai.GenerativeModel("gemini-3.6-flash")
    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json", "response_schema": DynamicRoadmapGraph}
    )
    return DynamicRoadmapGraph.parse_raw(response.text)
```

#### Step 2: Integrate LLM Output with Kahn's Topological Sort & Phase Elevation
Pipe the dynamic LLM output directly into `roadmap_engine.py`. This ensures that even if the LLM output contains minor ordering flaws, the deterministic engine strips cycles, enforces $\text{Phase}(\text{Target}) \ge \text{Phase}(\text{Prerequisite})$, and computes exact depth deterministically.

#### Step 3: Real-Time Dynamic Link & Resource Retrieval
Replace static links in `gemini.service.ts` with real-time API integrations:
- **YouTube Data API v3**: Query live video search endpoints for each milestone title to fetch top-rated, active video tutorials.
- **Google Custom Search / Serper API**: Fetch fresh documentation links and course pages dynamically.

#### Step 4: Selective Caching & Force Refresh Flag
Modify `server/src/services/roadmap.service.ts` to accept a `forceRefresh?: boolean` parameter:
- When `forceRefresh === true`, bypass MongoDB cache lookup and execute real-time generation.
- Automatically set `isStale = true` when user profile skills change or when new career goals are configured.

#### Step 5: Server-Sent Events (SSE) Real-Time Generation Stream
Implement a streaming response route (`POST /api/v1/roadmaps/generate-stream`) in `roadmap.controller.ts`. Stream progress steps (`"Analyzing target career..."` -> `"Generating DAG nodes via Gemini AI..."` -> `"Running Kahn's Topological Repair..."` -> `"Fetching live YouTube resources..."`) to the frontend in real time for a smooth user experience.
