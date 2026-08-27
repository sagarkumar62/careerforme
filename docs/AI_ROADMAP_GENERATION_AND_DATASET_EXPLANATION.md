# AI Roadmap Generation Engine & Training Dataset Specification

This document provides a comprehensive explanation of how **Career PathFinder** generates personalized learning roadmaps using a **Hybrid AI Architecture** and details the benchmark dataset and models used.

---

## 1. Architecture Overview

Career PathFinder uses a **Hybrid AI Approach** combining three complementary AI layers:

```text
               +-------------------------------------------------------+
               |                    User Profile                       |
               |  (Skills, Levels, Interests, Goal, Weekly Hours, etc) |
               +-------------------------------------------------------+
                                           |
                                           v
+-------------------------------------------------------------------------------------+
| 1. Machine Learning Embedding Engine                                                |
|    - Model: sentence-transformers/all-MiniLM-L6-v2 (384-dim dense vectors)          |
|    - Indexing: FAISS Vector Index with Cosine Similarity                                |
|    - Computes semantic similarity between profile and dataset career vectors            |
+-------------------------------------------------------------------------------------+
                                           |
                                           v
+-------------------------------------------------------------------------------------+
| 2. Deterministic AI Rule & Progression Engine (Python FastAPI)                      |
|    - Dataset: careers.json (Industry Benchmark Career Dataset)                      |
|    - Algorithm: Weighted Skill Match Ratio & Prerequisites Dependency Graph         |
|    - Outputs: 4-Phase Roadmap Structure, milestone order, and hour estimations       |
+-------------------------------------------------------------------------------------+
                                           |
                                           v
+-------------------------------------------------------------------------------------+
| 3. Generative LLM Enrichment Engine (Google Gemini API)                             |
|    - Model: gemini-3.6-flash (via @google/genai SDK)                                |
|    - Enriches each phase with 3-tier resources (Videos 🎥, Docs 📄, Projects 🚀)     |
|    - Generates Mermaid architectural flowcharts & capstone project specifications   |
+-------------------------------------------------------------------------------------+
                                           |
                                           v
+-------------------------------------------------------------------------------------+
| 4. MongoDB Multi-Roadmap Storage & Next.js 16 Interactive UI                        |
|    - Persists roadmaps in MongoDB                                                   |
|    - Interactive checkable milestones, live completion tracking & multi-roadmap tabs |
+-------------------------------------------------------------------------------------+
```

---

## 2. Benchmark Dataset (`careers.json`) & Models

### A. The Benchmark Dataset Structure
The core career benchmark dataset is stored in:
- [`ai-service/app/data/careers.json`](../ai-service/app/data/careers.json) (Python AI microservice)
- [`server/src/data/careers.dataset.ts`](../server/src/data/careers.dataset.ts) (Node.js fallback service)

It covers 12+ major technology career tracks, including:
1. **AI Engineer**
2. **Full Stack Developer**
3. **Data Scientist**
4. **Backend Developer**
5. **Frontend Developer**
6. **DevOps Engineer**
7. **Mobile Developer**
8. **Cloud Solutions Architect**
9. **Cybersecurity Analyst**
10. **Data Analyst**
11. **MLOps Engineer**
12. **System Administrator**

#### Sample Dataset Record (`careers.json`):
```json
{
  "id": "ai-engineer",
  "title": "AI Engineer",
  "description": "Designs, builds, and deploys artificial intelligence and machine learning models into production systems.",
  "required_skills": [
    { "name": "Python", "importance": 0.95, "required_level": 4 },
    { "name": "Machine Learning", "importance": 0.90, "required_level": 4 },
    { "name": "Deep Learning", "importance": 0.85, "required_level": 3 },
    { "name": "PyTorch", "importance": 0.80, "required_level": 3 },
    { "name": "Data Analysis", "importance": 0.75, "required_level": 3 }
  ],
  "recommended_skills": ["TensorFlow", "FastAPI", "Docker", "MLOps", "Transformers"],
  "interests": ["Artificial Intelligence", "Data Science", "Machine Learning"],
  "education": ["Computer Science", "Data Science", "Artificial Intelligence"],
  "experience_levels": ["Junior", "Mid", "Senior"],
  "typical_duration_months": 8
}
```

### B. Machine Learning Embedding Model
- **Model**: `all-MiniLM-L6-v2` (SentenceTransformers / PyTorch)
- **Embedding Dimensions**: 384-dimensional dense vectors.
- **Vector Search Engine**: FAISS (Facebook AI Similarity Search).
- **Purpose**: Converts textual profile data (education, bio, project descriptions, skills) into vector space to perform semantic similarity matching against career requirements even when exact keyword matches differ.

### C. Generative LLM Model
- **Primary Model**: Google Gemini `gemini-3.6-flash`
- **Fallback Model**: Google Gemini `gemini-3.5-flash`
- **SDK Package**: `@google/genai`
- **Purpose**: Dynamically generates curated learning resource links, video walkthrough recommendations, official documentation references, project specifications, and real-time career mentoring.

---

## 3. Step-by-Step AI Roadmap Generation Pipeline

### Step 1: Profile Skill Normalization
The system normalizes incoming user profile data, mapping proficiency text or levels to a standardized scale ($1$ to $5$):
- Beginner = 1
- Elementary = 2
- Intermediate = 3
- Advanced = 4
- Expert = 5

### Step 2: Skill-Gap Analysis & Scoring Algorithm
The engine evaluates the user's current skills against the target career benchmark in `careers.json` using the weighted formula:

$$\text{Skill Match Ratio} = \frac{\sum_{i=1}^{n} w_i \times \min\left(\frac{L_{\text{user}, i}}{L_{\text{required}, i}}, 1.0\right)}{\sum_{i=1}^{n} w_i}$$

Where:
- $w_i$ = Skill importance weight ($0.0$ to $1.0$) defined in dataset.
- $L_{\text{user}, i}$ = User's current proficiency level ($0$ to $5$).
- $L_{\text{required}, i}$ = Required proficiency level ($1$ to $5$).

Skills are categorized into:
- **Missing Skills**: $L_{\text{user}} = 0$
- **Skills Needing Work**: $0 < L_{\text{user}} < L_{\text{required}}$
- **Strong Skills**: $L_{\text{user}} \ge L_{\text{required}}$

### Step 3: Deterministic 4-Phase Roadmap Structuring (`roadmap_engine.py`)
The Python roadmap engine sequences topics logically into 4 progressive phases:
1. **Phase 1: Foundations & High-Priority Prerequisites**: Targets core missing prerequisite skills with highest importance weights.
2. **Phase 2: Core Technical Mastery & Frameworks**: Focuses on core framework competencies and domain engineering.
3. **Phase 3: Advanced Domain Specialization**: Focuses on advanced topics, optimization, and recommended specialized skills.
4. **Phase 4: Capstone Projects & Career Readiness**: Focuses on portfolio development, deployment, system design, and technical interview prep.

### Step 4: Gemini LLM Content Enrichment (`gemini-3.6-flash`)
The Node.js server calls Google Gemini (`gemini-3.6-flash`) to enrich every phase with multi-format learning resources:
- 🎥 **Video Resources**: Direct course walkthrough and video tutorial links.
- 📄 **Documentation Resources**: Official language/framework reference documentation.
- 🚀 **Project Resources**: Practical hands-on project specifications detailing tech stack, features, and resume value.
- 📊 **Flowchart Graph**: Mermaid diagram nodes and edges visualizing the learning pathway.

### Step 5: Persistence & Multi-Roadmap Interactive UI
- Generated roadmaps are saved to MongoDB (`Roadmap` collection).
- Rendered in Next.js 16 (`/roadmap`) with:
  - Multi-roadmap selector bar allowing users to switch between saved roadmaps.
  - Interactive checkable milestones with real-time completion progress tracking.
  - Formated resources matching registered onboarding preferences (`Videos`, `Docs`, `Projects`).
  - Adaptive events notifying users of milestones unlocked and pace adjustments.
