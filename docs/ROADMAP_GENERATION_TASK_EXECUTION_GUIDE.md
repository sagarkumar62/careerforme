# Roadmap Generation Task: Complete Step-by-Step Execution Guide

This document explains the exact step-by-step workflow of how the **Roadmap Generation Task** is performed in **Career PathFinder**, detailing data flows, algorithms, phase structuring, and LLM enrichment.

---

## 1. System Flow Summary

```text
  User Initiates Roadmap Generation Request (Target Career Goal & Weekly Commitment)
                                          │
                                          ▼
 [Step 1] Profile Skill & Commitment Normalization (skill_normalizer.py)
                                          │
                                          ▼
 [Step 2] Career Goal Matching & Ranking (recommendation_engine.py)
          - Executes 6-Factor Hybrid Match Scoring
          - Ranks candidate career goals based on profile compatibility
                                          │
                                          ▼
 [Step 3] Prerequisite DAG Topological Sorting & Cycle Check (skill_graph.py)
          - Validates graph DAG state (Kahn's Algorithm)
          - Orders prerequisites topologically (Root prerequisites first)
                                          │
                                          ▼
 [Step 4] 4-Phase Deterministic Milestone Sequencing (roadmap_engine.py)
          - Phase 1: Foundations & Prerequisites
          - Phase 2: Core Technical Mastery
          - Phase 3: Advanced Specialization
          - Phase 4: Capstone & Career Readiness
          - Scales calendar duration by weekly hours: Total Hours / (Weekly Hours * 4)
                                          │
                                          ▼
 [Step 5] Google Gemini LLM Content Enrichment (gemini-3.6-flash via @google/genai)
          - Enriches each phase with Video 🎥, Docs 📄, and Project 🚀 resources
          - Generates Mermaid architectural flowcharts & capstone specifications
                                          │
                                          ▼
 [Step 6] MongoDB Storage & Next.js 16 Interactive UI (/roadmap)
          - Saved in MongoDB
          - Multi-roadmap tabs, checkable milestones & live completion progress
```

---

## 2. Step-by-Step Execution Breakdown

### Step 1: Input Profile & Weekly Hours Normalization
When a user requests a roadmap for a target career (e.g. *Full Stack Developer*, *AI Engineer*, *Cybersecurity Analyst*), the engine accepts:
- `skills`: List of current user skills and proficiency levels ($1 - 5$).
- `target_career`: Target role title.
- `weekly_hours`: User's weekly learning commitment (e.g. 10h/wk, 15h/wk, 20h/wk).

Skill names are normalized via `skill_normalizer.py`:
- `"Python programming"` $\rightarrow$ `"Python"`
- `"React.js"` $\rightarrow$ `"React"`
- `"node.js"` $\rightarrow$ `"Node.js"`

---

### Step 2: Career Retrieval & Skill-Gap Analysis
The engine loads unified career benchmarks (`careers.json`, O*NET, ESCO) via `unified_loader.py` and calculates the **Weighted Skill Match Ratio**:

$$\text{Skill Match Ratio} = \frac{\sum_{i=1}^{n} w_i \times \min\left(\frac{L_{\text{user}, i}}{L_{\text{required}, i}}, 1.0\right)}{\sum_{i=1}^{n} w_i}$$

Where:
- $w_i$ = Skill importance weight ($0.0$ to $1.0$).
- $L_{\text{user}, i}$ = User's proficiency level ($0$ to $5$).
- $L_{\text{required}, i}$ = Required proficiency level ($1$ to $5$).

Skills are categorized into:
- **Missing Skills**: $L_{\text{user}} = 0$
- **Needs Work Skills**: $0 < L_{\text{user}} < L_{\text{required}}$
- **Strong Skills**: $L_{\text{user}} \ge L_{\text{required}}$

---

### Step 3: Prerequisite DAG Topological Sorting & Cycle Check
Before phase assignment, the system queries `SkillGraph` (`skill_graph.py`):
1. **Cycle Detection**: Executes Kahn's algorithm to ensure no cyclic dependencies exist.
2. **Topological Ordering**: Orders missing skills so root prerequisites are learned before downstream dependencies:
   - `JavaScript` $\rightarrow$ `React` $\rightarrow$ `Next.js`
   - `Python` $\rightarrow$ `NumPy` $\rightarrow$ `Statistics` $\rightarrow$ `Machine Learning` $\rightarrow$ `Deep Learning` $\rightarrow$ `PyTorch`

---

### Step 4: 4-Phase Deterministic Milestone Sequencing
The Python engine constructs a 4-Phase Roadmap:

1. **Phase 1: Foundations & Prerequisites**:
   - Focuses on root missing prerequisite skills.
   - Milestone: Syntax foundations, environment setup, and version control.
2. **Phase 2: Core Technical Mastery**:
   - Focuses on primary technical frameworks and API development.
   - Milestone: Core competency and data persistence integration.
3. **Phase 3: Advanced Specialization**:
   - Focuses on advanced optimization and recommended specialization skills.
   - Milestone: Complex domain implementation.
4. **Phase 4: Capstone & Career Readiness**:
   - Focuses on portfolio projects, system design, deployment, and technical interview prep.
   - Milestone: End-to-end production capstone application.

#### Calendar Timeline Calculation:
$$\text{Duration (Months)} = \max\left(1, \operatorname{round}\left(\frac{\text{Total Estimated Hours}}{\text{Weekly Commitment Hours} \times 4}\right)\right)$$

---

### Step 5: Google Gemini LLM Content Enrichment (`gemini-3.6-flash`)
The Node.js server calls Google Gemini (`gemini-3.6-flash`) with the structured deterministic roadmap facts to generate:
- 🎥 **Video Resources**: Course tutorial and video walkthrough links.
- 📄 **Official Documentation Resources**: Language/framework reference documentation links.
- 🚀 **Practical Project Resources**: Hands-on lab and project specifications.
- 📊 **Flowchart Graph**: Mermaid diagram nodes and edges visualizing the learning pathway.

---

### Step 6: MongoDB Persistence & Next.js 16 UI Rendering
1. **Database Persistence**: Saved to MongoDB `Roadmap` collection.
2. **Interactive UI ([`/roadmap`](../client/src/app/roadmap/page.tsx))**:
   - **Saved Roadmaps Selector Bar**: Allows users to switch between saved roadmaps (*AI Engineer*, *Full Stack Developer*, etc.).
   - **Checkable Milestones**: Toggling a milestone updates overall completion percentage in real time.
   - **Formated Resources**: Displays resources matching onboarding preferences (`Videos`, `Docs`, `Projects`).
   - **Adaptive Banners**: Displays notifications when pace adjustments occur.
