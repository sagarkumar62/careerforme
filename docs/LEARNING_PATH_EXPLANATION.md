# Comprehensive Technical Specification: Learning Path Engine

This document provides an end-to-end technical explanation of the **Learning Path & Career Roadmap System** within the Path Finder architecture. It covers internal working algorithms, data flow, directory folder structure, and concrete output breakdowns for four primary career tracks: **AI Engineer**, **Full Stack Developer**, **Commercial Pilot**, and **Civil Engineer**.

---

## 1. Internal Working & Core Algorithms

The Learning Path System is a deterministic, dependency-aware curriculum generation engine. It processes learner profiles and target career requirements to produce a 4-phase structured learning path with topological node order, locked/unlocked state progression, course recommendations, project assignments, and skill gap evaluations.

```
                  +-----------------------------------+
                  |      User / Learner Profile       |
                  |  (Skills, Levels, Weekly Hours)   |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      Career Resolver & Registry   |
                  | (Canonical Mapping & Quality Scoring)|
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Schema Normalization & Graph Prep |
                  |   (Schema A / B -> Uniform Graph) |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   Kahn's Topological Sorting DAG  |
                  |  (Cycle Detection & Order Check)  |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   Topological Depth Calculation   |
                  |  Depth(N) = max(Depth(P)) + 1    |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |  4-Phase Semantic Allocation     |
                  | (Foundation, Core, Inter., Capstone) |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Phase Elevation & Safety Check    |
                  |  phase(Target) >= phase(Prereq)   |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Learner Personalization Engine    |
                  | (MASTERED, NEEDS_WORK, MISSING...) |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Output Payload & Catalog Mapping  |
                  | (Courses, Projects, Assessments)  |
                  +-----------------------------------+
```

### Step 1: Career Resolution (`career_resolver.py`)
- Input normalization removes noise (e.g., "become an AI Engineer" -> `ai-engineer`).
- The engine searches alias lookup files (`aliases.json`, `domains.json`) and scans `app/data/careers/*.json`.
- A **Dataset Quality Score** evaluates available files if duplicates exist:
  - Technical directory preference (+60 points).
  - Explicit named IDs vs. generic `node_1` (+100 points).
  - Schema A nodes vs. Schema B skill pairs.
  - Deducts points for linear unbranching chains.

### Step 2: Schema Normalization & Dependency Graph
- Normalizes Schema A (`nodes` array with explicit `prerequisites`) and Schema B (`skills` array with `prerequisites` pairs `[src, tgt]`).
- Maps titles and aliases to canonical node IDs (`title_to_id_map`).

### Step 3: Kahn’s Algorithm for Topological Sort & Cycle Detection
- Constructs in-degree counts and adjacency lists for all nodes.
- Enqueues all nodes with `in_degree == 0`.
- Processes queue topologically. If `len(topological_order) < total_nodes`, a cycle is detected and an `INVALID_DAG_CYCLE` error is returned.

### Step 4: Topological Depth & 4-Phase Curriculum Allocation
- Computes depth:
  $$\text{Depth}(N) = \begin{cases} 0 & \text{if } \text{prerequisites}(N) = \emptyset \\ \max_{P \in \text{prerequisites}(N)} (\text{Depth}(P)) + 1 & \text{otherwise} \end{cases}$$
- Classifies into 4 Phases:
  1. **Phase 1 (Foundation)**: Fundamentals (depth = 0 or `type: foundation`).
  2. **Phase 2 (Core)**: Essential domain competencies (depth = 1 or `type: core`).
  3. **Phase 3 (Intermediate / Advanced)**: Specialization & advanced tools (depth = 2/3 or `type: intermediate`).
  4. **Phase 4 (Capstone)**: Real-world synthesis, portfolio, & readiness (`type: capstone`).
- **Prerequisite Phase Elevation Safety**: Ensures $\text{phase}(\text{Target}) \ge \text{phase}(\text{Prerequisite})$. If a target node is assigned Phase 1 but depends on a Phase 2 node, its phase is automatically elevated to Phase 2.

### Step 5: Personalization & Status Assignment
Matches learner's current skills against required node skill levels:
- **`MASTERED`**: User level $\ge$ Required level. (Preserved in graph to avoid breaking node connections).
- **`NEEDS_WORK`**: $0 <$ User level $<$ Required level. Priority: `MEDIUM`. Estimated hours: $\max(5, \text{gap} \times 15)$.
- **`MISSING`**: User level $= 0$. Priority: `HIGH`. Estimated hours: $\max(10, \text{RequiredLevel} \times 10)$.
- **`RECOMMENDED`**: Unlocked next node whose prerequisites are all `MASTERED`.
- **`LOCKED`**: Node has one or more unfulfilled prerequisites.

### Step 6: Match Score Calculation & Gap Analysis
$$\text{Match Score} = \left( \frac{\text{Total Required Points} - \text{Missing Skill Points}}{\text{Total Required Points}} \right) \times 100$$

### Step 7: Dual Engine Architecture & Synthetic Course Fallback
There are two primary engines in the application:
1. **Roadmap Engine (`/roadmap` -> `roadmap_engine.py`)**: Generates the structural 4-phase DAG node roadmap directly from the career dataset JSON files (`pilot.json`, `civil-engineer.json`, `ai-engineer.json`, `full-stack-developer.json`) without depending on external course resource catalogs.
2. **Learning Path Generator (`/learning-path` -> `learning_path_generator.py`)**: Maps learner skill gaps against items in `courses_catalog.json` to assign specific course modules, practice projects, and assessments.

> [!IMPORTANT]
> **Resolution Note**: If a target career (such as **Commercial Pilot** or **Civil Engineer**) has valid nodes in its career dataset file (`pilot.json`, `civil-engineer.json`) but the external `courses_catalog.json` does not contain explicit course catalog entries mapped to those specialized occupational skills, `learning_path_generator.py` executes an **automatic synthetic course synthesis fallback**. It dynamically converts the career dataset graph nodes into course modules so that **both** `/learning-path` and `/roadmap` resolve successfully for all technical and occupational careers.

---

## 2. End-to-End Data Flow

```
+------------------+         +------------------+         +--------------------+         +-----------------------+
|  Client (NextJS) |  HTTP   |  Express Gateway | Axios   | Python AI Service  |  JSON   |  MongoDB Database     |
|   (React / UI)   | ------> |   (Node / TS)    | ------> |  (FastAPI Server)  |  Read   | (Profile / Progress)  |
|                  | <------ |                  | <------ |                    | <-----> |                       |
+------------------+         +------------------+         +--------------------+         +-----------------------+
```

1. **User Request**: Learner selects a target career (e.g., "Full Stack Developer") or requests a roadmap on the client interface (`/learning-path` or `/roadmap`).
2. **Express API Gateway**:
   - Receives request at `POST /api/v1/learning-path/generate` or `POST /api/v1/roadmap/generate`.
   - Executes auth middleware (`auth.middleware.ts`) to extract authenticated user token.
   - Calls `learnerStateAdapterService.buildFastAPILearnerContext(userId)` to fetch profile, completed courses, and assessment results from MongoDB.
3. **Python AI Service**:
   - Express forwards request via `pythonAIService.generateLearningPath()` to FastAPI (`http://127.0.0.1:8000/learning-path/generate` or `/roadmap/generate`).
   - FastAPI parses `LearningPathRequest`, triggers `resolve_target_career()`, runs `generate_roadmap_structure()`, and merges course, project, and assessment catalogs (`load_courses_catalog()`, `load_projects_catalog()`, `load_assessments_catalog()`).
4. **Data Sync & DB Storage**:
   - Express saves generated path into MongoDB collections (`Roadmap` model, `LearnerProgress` model).
   - Response returned as standard `ApiResponse` JSON contract (`{ success: true, statusCode: 200, data: { ... } }`).
5. **UI Component Rendering**:
   - Client receives response, updates React Context / State, and renders the visual node graph (React Flow), 4-phase tab system, progress progress bars, and resource drawer.

---

## 3. Repository Folder Structure

Below is the directory breakdown highlighting every key file involved in the Learning Path pipeline across `ai-service`, `server`, and `client`.

```
Path Finder/
├── ai-service/                             # Python FastAPI AI Engine
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── learning_path.py        # POST /learning-path/generate
│   │   │       └── roadmap.py              # POST /roadmap/generate, /roadmap/skill-gap, /roadmap/adapt
│   │   ├── data/
│   │   │   ├── aliases.json                # Career alias dictionary
│   │   │   ├── domains.json                # Domain category definitions
│   │   │   ├── courses_catalog.json        # Unified course resource catalog
│   │   │   ├── projects_catalog.json       # Project resource catalog
│   │   │   ├── assessments_catalog.json    # Skill assessment catalog
│   │   │   └── careers/                    # Canonical Career Datasets
│   │   │       ├── cloud-and-devops/       # Cloud & DevOps career JSONs
│   │   │       ├── cybersecurity/          # Cybersecurity career JSONs
│   │   │       ├── data-and-ai/            # Data & AI career JSONs
│   │   │       │   └── ai-engineer.json    # Schema A AI Engineer dataset
│   │   │       ├── design/                 # UI/UX & Design career JSONs
│   │   │       ├── finance/                # Financial career JSONs
│   │   │       ├── management-and-product/ # Product & Project Management JSONs
│   │   │       ├── occupational/           # Physical & Occupational career JSONs
│   │   │       │   ├── civil-engineer.json # Civil Engineer dataset
│   │   │       │   └── pilot.json          # Commercial Pilot dataset
│   │   │       ├── software-development/   # Software engineering career JSONs
│   │   │       │   └── full-stack-developer.json # Full Stack Developer dataset
│   │   │       └── technical/              # Authoritative technical graphs
│   │   ├── schemas/
│   │   │   └── learning_path.py            # Pydantic request/response schemas
│   │   └── services/
│   │       ├── career_resolver.py          # Career dataset discovery & quality ranking
│   │       ├── learning_path_generator.py  # Full personalized path generation logic
│   │       ├── roadmap_engine.py           # Core Kahn's DAG & 4-phase allocation engine
│   │       ├── skill_gap_engine.py         # Skill gap & match score calculations
│   │       ├── assessment_catalog.py       # Assessment catalog loader
│   │       ├── project_catalog.py          # Project catalog loader
│   │       └── learning_recommendation_engine.py # Course recommendation engine
│   └── main.py                             # FastAPI main server entrypoint
│
├── server/                                 # Node.js Express API Gateway
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── learning-path.controller.ts # Express handlers for learning paths
│   │   │   └── roadmap.controller.ts       # Express handlers for roadmaps
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts          # JWT authentication middleware
│   │   ├── models/
│   │   │   ├── Roadmap.ts                  # MongoDB Roadmap schema
│   │   │   └── LearnerProgress.ts          # MongoDB Progress schema
│   │   ├── routes/
│   │   │   ├── learning-path.routes.ts     # Express routes for learning paths
│   │   │   └── roadmap.routes.ts           # Express routes for roadmaps
│   │   ├── services/
│   │   │   ├── python-ai.service.ts        # Axios bridge to FastAPI service
│   │   │   └── learner-state-adapter.service.ts # Aggregates user profile state
│   │   └── server.ts                       # Express server entrypoint
│
└── client/                                 # Next.js Frontend Application
    ├── src/
    │   ├── app/
    │   │   ├── learning-path/              # Learning path main page route
    │   │   │   └── page.tsx
    │   │   └── roadmap/                    # Interactive roadmap view route
    │   │       └── page.tsx
    │   ├── components/
    │   │   ├── learning-path/              # Roadmap canvas, nodes, drawer components
    │   │   └── dashboard/                  # Progress widgets & statistics
    │   └── lib/
    │       └── api.ts                      # Client HTTP API client methods
```

---

## 4. Career Output Specifications

Below are the exact details and output structures generated by the Learning Path Engine for **AI Engineer**, **Full Stack Developer**, **Commercial Pilot**, and **Civil Engineer**.

---

### A. AI Engineer

- **Career ID**: `ai-engineer`
- **Domain**: `technology` / `data-and-ai`
- **Estimated Duration**: 6 Months (200 Total Hours)
- **Total Nodes**: 20 Nodes across 4 Curriculum Phases

```json
{
  "success": true,
  "careerId": "ai-engineer",
  "careerTitle": "AI Engineer",
  "domain": "technology",
  "estimatedMonths": 6,
  "totalHours": 200,
  "matchScore": 25.0,
  "phases": [
    {
      "phase": 1,
      "title": "Foundation",
      "nodes": [
        { "id": "python", "title": "Python", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "git-github", "title": "Git & GitHub", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "linux-cli", "title": "Linux / CLI", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "numpy", "title": "NumPy", "type": "foundation", "requiredLevel": 4, "prerequisites": ["python"] },
        { "id": "pandas", "title": "Pandas", "type": "foundation", "requiredLevel": 4, "prerequisites": ["numpy"] },
        { "id": "sql", "title": "SQL", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "linear-algebra", "title": "Linear Algebra", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "probability-statistics", "title": "Probability & Statistics", "type": "foundation", "requiredLevel": 4, "prerequisites": ["linear-algebra"] }
      ]
    },
    {
      "phase": 2,
      "title": "Core",
      "nodes": [
        { "id": "data-analysis", "title": "Data Analysis", "type": "core", "requiredLevel": 4, "prerequisites": ["pandas", "sql"] },
        { "id": "data-preprocessing", "title": "Data Preprocessing", "type": "core", "requiredLevel": 4, "prerequisites": ["data-analysis"] },
        { "id": "machine-learning", "title": "Machine Learning", "type": "core", "requiredLevel": 4, "prerequisites": ["probability-statistics", "data-preprocessing"] },
        { "id": "supervised-learning", "title": "Supervised Learning", "type": "core", "requiredLevel": 4, "prerequisites": ["machine-learning"] },
        { "id": "unsupervised-learning", "title": "Unsupervised Learning", "type": "core", "requiredLevel": 4, "prerequisites": ["machine-learning"] },
        { "id": "feature-engineering", "title": "Feature Engineering", "type": "core", "requiredLevel": 4, "prerequisites": ["supervised-learning"] }
      ]
    },
    {
      "phase": 3,
      "title": "Intermediate / Advanced",
      "nodes": [
        { "id": "deep-learning", "title": "Deep Learning & Neural Networks", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["machine-learning"] },
        { "id": "pytorch", "title": "PyTorch Framework", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["deep-learning"] },
        { "id": "vector-databases", "title": "Vector Databases & Embeddings", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["pytorch"] },
        { "id": "rag-architectures", "title": "RAG Architectures & Retrieval", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["vector-databases"] },
        { "id": "nlp-transformers", "title": "NLP & Transformer Models", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["pytorch"] }
      ]
    },
    {
      "phase": 4,
      "title": "Capstone",
      "nodes": [
        { "id": "ai-engineer-capstone", "title": "Production MLOps & LLM Application", "type": "capstone", "requiredLevel": 5, "prerequisites": ["rag-architectures", "nlp-transformers"] }
      ]
    }
  ]
}
```

---

### B. Full Stack Developer

- **Career ID**: `full-stack-developer`
- **Domain**: `software-development`
- **Estimated Duration**: 6 Months (220 Total Hours)
- **Total Nodes**: 17 Nodes across 4 Curriculum Phases

```json
{
  "success": true,
  "careerId": "full-stack-developer",
  "careerTitle": "Full Stack Developer",
  "domain": "software-development",
  "estimatedMonths": 6,
  "totalHours": 220,
  "matchScore": 30.0,
  "phases": [
    {
      "phase": 1,
      "title": "Foundation",
      "nodes": [
        { "id": "internet-web", "title": "Internet & Web Architecture", "type": "foundation", "requiredLevel": 3, "prerequisites": [] },
        { "id": "html5", "title": "HTML5 & Semantic Web", "type": "foundation", "requiredLevel": 4, "prerequisites": ["internet-web"] },
        { "id": "css3", "title": "CSS3 & Responsive Layouts", "type": "foundation", "requiredLevel": 4, "prerequisites": ["html5"] },
        { "id": "git-github", "title": "Git & GitHub Version Control", "type": "foundation", "requiredLevel": 4, "prerequisites": [] }
      ]
    },
    {
      "phase": 2,
      "title": "Core",
      "nodes": [
        { "id": "javascript-es6", "title": "Modern JavaScript (ES6+)", "type": "core", "requiredLevel": 4, "prerequisites": ["html5", "css3"] },
        { "id": "tailwind-css", "title": "Tailwind CSS & UI Styling", "type": "core", "requiredLevel": 4, "prerequisites": ["css3"] },
        { "id": "reactjs", "title": "React.js Frontend Development", "type": "core", "requiredLevel": 4, "prerequisites": ["javascript-es6"] },
        { "id": "nodejs", "title": "Node.js Runtime", "type": "core", "requiredLevel": 4, "prerequisites": ["javascript-es6"] },
        { "id": "expressjs", "title": "Express.js Backend Framework", "type": "core", "requiredLevel": 4, "prerequisites": ["nodejs"] },
        { "id": "mongodb", "title": "MongoDB Database", "type": "core", "requiredLevel": 4, "prerequisites": ["expressjs"] }
      ]
    },
    {
      "phase": 3,
      "title": "Intermediate / Advanced",
      "nodes": [
        { "id": "typescript", "title": "TypeScript Programming", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["javascript-es6"] },
        { "id": "nextjs", "title": "Next.js Full Stack Framework", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["reactjs", "typescript"] },
        { "id": "redux-state", "title": "State Management (Redux / Zustand)", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["reactjs"] },
        { "id": "rest-apis", "title": "REST API Architecture & Auth", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["expressjs"] },
        { "id": "graphql", "title": "GraphQL API Development", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["rest-apis"] },
        { "id": "docker-containers", "title": "Docker Containerization", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["nodejs"] }
      ]
    },
    {
      "phase": 4,
      "title": "Capstone",
      "nodes": [
        { "id": "fullstack-capstone", "title": "Full Stack SaaS Application Deployment & CI/CD", "type": "capstone", "requiredLevel": 5, "prerequisites": ["nextjs", "mongodb", "docker-containers"] }
      ]
    }
  ]
}
```

---

### C. Commercial Pilot

- **Career ID**: `pilot`
- **Domain**: `aviation` / `occupational`
- **Estimated Duration**: 12 Months (350 Total Hours)
- **Total Nodes**: 14 Nodes across 4 Curriculum Phases

```json
{
  "success": true,
  "careerId": "pilot",
  "careerTitle": "Commercial Pilot",
  "domain": "aviation",
  "estimatedMonths": 12,
  "totalHours": 350,
  "matchScore": 15.0,
  "phases": [
    {
      "phase": 1,
      "title": "Foundation",
      "nodes": [
        { "id": "aerodynamics-flight-principles", "title": "Aerodynamics & Principles of Flight", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "aviation-regulations-faa", "title": "Aviation Regulations & Air Law (FAA / ICAO)", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "aeronautical-meteorology", "title": "Aeronautical Meteorology & Weather Theory", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "vfr-flight-navigation", "title": "VFR Flight Navigation & Plotting", "type": "foundation", "requiredLevel": 4, "prerequisites": ["aerodynamics-flight-principles", "aeronautical-meteorology"] }
      ]
    },
    {
      "phase": 2,
      "title": "Core",
      "nodes": [
        { "id": "aircraft-systems-avionics", "title": "Aircraft Systems & Glass Cockpit Avionics", "type": "core", "requiredLevel": 4, "prerequisites": ["aerodynamics-flight-principles"] },
        { "id": "atc-radio-communications", "title": "ATC Radio Communications & Phraseology", "type": "core", "requiredLevel": 4, "prerequisites": ["aviation-regulations-faa"] },
        { "id": "performance-weight-balance", "title": "Aircraft Performance, Weight & Balance", "type": "core", "requiredLevel": 4, "prerequisites": ["aerodynamics-flight-principles"] },
        { "id": "flight-maneuvers-solo", "title": "Primary Flight Maneuvers & Solo Endorsement", "type": "core", "requiredLevel": 4, "prerequisites": ["vfr-flight-navigation", "atc-radio-communications"] }
      ]
    },
    {
      "phase": 3,
      "title": "Intermediate / Advanced",
      "nodes": [
        { "id": "ifr-instrument-rating", "title": "Instrument Flight Rules (IFR) Rating", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["flight-maneuvers-solo", "aeronautical-meteorology"] },
        { "id": "commercial-pilot-knowledge", "title": "Commercial Pilot License (CPL) Flight Operations", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["ifr-instrument-rating"] },
        { "id": "multi-engine-rating", "title": "Multi-Engine Aircraft Operations", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["commercial-pilot-knowledge"] },
        { "id": "crew-resource-management", "title": "Crew Resource Management (CRM) & Human Factors", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["commercial-pilot-knowledge"] }
      ]
    },
    {
      "phase": 4,
      "title": "Capstone",
      "nodes": [
        { "id": "airline-transport-simulator-capstone", "title": "Airline Transport Pilot (ATP) Simulator & Type Rating Capstone", "type": "capstone", "requiredLevel": 5, "prerequisites": ["multi-engine-rating", "crew-resource-management"] }
      ]
    }
  ]
}
```

---

### D. Civil Engineer

- **Career ID**: `civil-engineer`
- **Domain**: `engineering` / `occupational`
- **Estimated Duration**: 12 Months (320 Total Hours)
- **Total Nodes**: 13 Nodes across 4 Curriculum Phases

```json
{
  "success": true,
  "careerId": "civil-engineer",
  "careerTitle": "Civil Engineer",
  "domain": "engineering",
  "estimatedMonths": 12,
  "totalHours": 320,
  "matchScore": 20.0,
  "phases": [
    {
      "phase": 1,
      "title": "Foundation",
      "nodes": [
        { "id": "engineering-math-statics", "title": "Engineering Mathematics & Statics", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "structural-analysis-mechanics", "title": "Structural Mechanics & Analysis", "type": "foundation", "requiredLevel": 4, "prerequisites": ["engineering-math-statics"] },
        { "id": "surveying-geomatics", "title": "Surveying & Geomatics Engineering", "type": "foundation", "requiredLevel": 4, "prerequisites": [] },
        { "id": "autocad-civil-drafting", "title": "2D Civil Drafting & AutoCAD", "type": "foundation", "requiredLevel": 4, "prerequisites": [] }
      ]
    },
    {
      "phase": 2,
      "title": "Core",
      "nodes": [
        { "id": "reinforced-concrete-design", "title": "Reinforced Concrete Design (RCC)", "type": "core", "requiredLevel": 4, "prerequisites": ["structural-analysis-mechanics"] },
        { "id": "steel-structure-design", "title": "Design of Steel Structures (STAAD Pro)", "type": "core", "requiredLevel": 4, "prerequisites": ["structural-analysis-mechanics"] },
        { "id": "geotechnical-soil-mechanics", "title": "Geotechnical Engineering & Soil Mechanics", "type": "core", "requiredLevel": 4, "prerequisites": ["structural-analysis-mechanics"] },
        { "id": "fluid-mechanics-hydraulics", "title": "Fluid Mechanics & Open Channel Hydraulics", "type": "core", "requiredLevel": 4, "prerequisites": ["engineering-math-statics"] }
      ]
    },
    {
      "phase": 3,
      "title": "Intermediate / Advanced",
      "nodes": [
        { "id": "transportation-highway-engineering", "title": "Transportation & Highway Engineering", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["surveying-geomatics", "geotechnical-soil-mechanics"] },
        { "id": "environmental-water-resources", "title": "Environmental Engineering & Water Resources", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["fluid-mechanics-hydraulics"] },
        { "id": "civil-3d-roadway-design", "title": "3D Terrain & Roadway Modeling (Civil 3D)", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["autocad-civil-drafting", "surveying-geomatics"] },
        { "id": "construction-management-estimation", "title": "Construction Management & Cost Estimation", "type": "intermediate", "requiredLevel": 4, "prerequisites": ["reinforced-concrete-design"] }
      ]
    },
    {
      "phase": 4,
      "title": "Capstone",
      "nodes": [
        { "id": "bim-revit-civil-capstone", "title": "BIM Revit Integrated Infrastructure & Structural Capstone", "type": "capstone", "requiredLevel": 5, "prerequisites": ["civil-3d-roadway-design", "construction-management-estimation", "steel-structure-design"] }
      ]
    }
  ]
}
```

---

## 5. Summary of Verification & Guarantees

1. **Topological Order Integrity**: Every node in the generated roadmap follows Kahn's DAG sorting. No target node appears before its prerequisite.
2. **Phase Safety Elevation**: The phase assignment strictly satisfies $\text{phase}(\text{Target}) \ge \text{phase}(\text{Prerequisite})$, preventing lower phase nodes from depending on higher phase nodes.
3. **Graph Preservation**: Nodes marked as `MASTERED` are retained in the graph structure so that dependent nodes remain reachable and connected.
4. **Deterministic Resolution**: The career resolver scores datasets automatically and handles alias resolution smoothly across arbitrary career strings.
