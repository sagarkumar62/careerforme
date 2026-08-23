# Comprehensive Guide: Dataset Expansion, Knowledge Graph & Model Training for Career PathFinder

This document outlines how to ingest large-scale datasets (such as **O*NET**, **ESCO**, and **roadmap.sh** data), construct a unified **Career Knowledge Graph**, generate vector embeddings for **FAISS**, and train/fine-tune machine learning models for **Career PathFinder**.

---

## 1. Overview: The Complete Data & Training Pipeline

```text
+-----------------------------------------------------------------------------------+
| 1. Download & Data Ingestion                                                      |
|    - Raw Datasets: O*NET (abilities.csv, skills.csv, occupations.csv), ESCO, etc. |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. Data Cleaning & Entity Normalization                                           |
|    - Standardize skills: "Python (programming language)" -> "Python"              |
|    - Normalize proficiency levels (1 to 5) and importance weights (0.0 to 1.0)     |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 3. Unified Knowledge Base & Skill Prerequisite Graph                              |
|    - Build DAG: Python -> NumPy -> Statistics -> Machine Learning -> PyTorch      |
|    - Store Career-Skill-Prerequisite-Resource mappings in MongoDB/Neo4j           |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 4. Vector Embedding & FAISS Indexing                                              |
|    - Model: sentence-transformers/all-MiniLM-L6-v2 (384-dimensional vectors)     |
|    - Indexing: FAISS Vector Index for O(1) Fast Cosine Similarity Retrieval            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 5. Programmatic Synthetic Dataset Generation                                      |
|    - Generate thousands of (User Skills, Target Career) -> (Missing Skills) pairs  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 6. Model Training & Hybrid Execution                                              |
|    - Step A: FAISS + Deterministic 4-Phase Roadmap Engine (Current System)        |
|    - Step B: Optional PyTorch / Contrastive Learning Fine-Tuning (Future)         |
|    - Step C: Google Gemini (gemini-3.6-flash) for Enrichment & Mentoring           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Detailed Step-by-Step Training & Integration Strategy

### Step 1: Download & Ingest Raw Datasets
Raw datasets to place in `ai-service/app/data/`:
- **O*NET Data**: `abilities.csv`, `skills.csv`, `knowledge.csv`, `occupations.csv`, `tools_and_technology.csv`.
- **ESCO Data**: Occupations, Skills, and Occupation-Skill relations.
- **Curated Dataset**: `careers.json` (Custom tech benchmarks and project/resource mappings).

---

### Step 2: Data Cleaning & Normalization Script (`clean_dataset.py`)
Convert raw CSV columns into a unified benchmark format:

```python
import pandas as pd
import json

def clean_onet_skills(skills_csv_path, occupations_csv_path):
    skills_df = pd.read_csv(skills_csv_path)
    occ_df = pd.read_csv(occupations_csv_path)
    
    # Filter for Importance (IM) and Level (LV)
    importance_df = skills_df[skills_df['Scale ID'] == 'IM']
    level_df = skills_df[skills_df['Scale ID'] == 'LV']
    
    # Merge and normalize scale (0-5 -> 1-5, importance -> 0.0-1.0)
    merged = pd.merge(importance_df, level_df, on=['O*NET-SOC Code', 'Element Name'])
    
    unified_careers = {}
    for _, row in merged.iterrows():
        soc_code = row['O*NET-SOC Code']
        title = row['Title_x']
        skill_name = row['Element Name']
        importance = round(row['Data Value_x'] / 5.0, 2)
        required_level = max(1, min(5, round(row['Data Value_y'] * (5.0 / 7.0))))
        
        if title not in unified_careers:
            unified_careers[title] = {
                "id": soc_code.replace(".", "-").lower(),
                "title": title,
                "required_skills": []
            }
        
        unified_careers[title]["required_skills"].append({
            "name": skill_name,
            "importance": importance,
            "required_level": required_level
        })
        
    return list(unified_careers.values())
```

---

### Step 3: Build Skill Prerequisite Dependency Graphs
Define learning order for deterministic phase progression:

```text
Visualizing Skill Progression:
JavaScript -> Node.js -> Express.js -> MongoDB -> System Architecture
Python     -> NumPy   -> Statistics -> Machine Learning -> PyTorch -> LLMs
```

Store this structure in your JSON/MongoDB model to dictate **Phase 1 (Foundations)** $\rightarrow$ **Phase 2 (Core Frameworks)** $\rightarrow$ **Phase 3 (Specialization)** $\rightarrow$ **Phase 4 (Capstone)**.

---

### Step 4: Generate Embeddings & Index in FAISS
Use `sentence-transformers/all-MiniLM-L6-v2` to convert career titles and descriptions into 384-dimensional vectors:

```python
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

# Create embeddings for all occupations
career_descriptions = [f"{c['title']}: {c.get('description', '')}" for c in unified_careers]
embeddings = model.encode(career_descriptions, convert_to_numpy=True)

# Build FAISS Index
dimension = 384
index = faiss.IndexFlatIP(dimension)  # Inner Product / Cosine Similarity
faiss.normalize_L2(embeddings)
index.add(embeddings)

# Save index to disk
faiss.write_index(index, "ai-service/app/data/careers.index")
```

---

### Step 5: Programmatic Training Data Generation
Generate thousands of user profiles programmatically from your knowledge base to train or benchmark recommendations:

```json
{
  "user_profile": {
    "skills": [
      { "name": "JavaScript", "level": 4 },
      { "name": "HTML/CSS", "level": 4 }
    ],
    "experience": "Junior",
    "target_career": "Full Stack Developer"
  },
  "ground_truth": {
    "missing_skills": ["Node.js", "Express.js", "MongoDB", "System Architecture"],
    "recommended_phase_1": ["Node.js", "Express.js"]
  }
}
```

---

### Step 6: Clear Role Separation in Production

| Component | Responsible Engine | Primary Task |
|---|---|---|
| **Semantic Matching** | SentenceTransformers + FAISS | Match user profile text with target career ($O(1)$ similarity lookup) |
| **Career Goal Matching & Ranking** | Python Hybrid Engine (`recommendation_engine.py`) | Execute 6-factor hybrid match scoring (Learner $\rightarrow$ Career/Goal Matching $\rightarrow$ Rank career goals) |
| **Phase & Order Sequencing** | Python Roadmap Engine (`roadmap_engine.py`) | Order prerequisites into 4 progressive learning phases |
| **Content & Resource Enrichment** | Google Gemini API (`gemini-3.6-flash`) | Enrich each phase with Video 🎥, Docs 📄, Project 🚀 resources & flowcharts |
| **Interactive UI & Persistence** | MongoDB & Next.js 16 | Render interactive checkable milestones, live progress tracking, and multi-roadmap tabs |
