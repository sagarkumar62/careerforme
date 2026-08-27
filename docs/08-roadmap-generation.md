# 08 - Personalized Roadmap Generation Specification

## 1. Feature Overview

Generates structured step-by-step learning roadmaps containing phases, milestones, estimated hours, prerequisite skills, and recommended learning resources.

> For a complete deep-dive on the hybrid AI pipeline, sentence-transformers embedding model, FAISS vector index, `careers.json` benchmark dataset, and Gemini `gemini-3.6-flash` integration, see [`docs/AI_ROADMAP_GENERATION_AND_DATASET_EXPLANATION.md`](../docs/AI_ROADMAP_GENERATION_AND_DATASET_EXPLANATION.md).

## 2. API Endpoints

### 1. `POST /api/v1/roadmaps/generate`
- **Auth**: Protected
- **Request Body**:
  ```json
  {
    "targetCareer": "AI Engineer"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "Learning roadmap generated successfully",
    "data": {
      "_id": "66c1f300...",
      "title": "AI Engineer Master Pathway",
      "targetCareer": "AI Engineer",
      "duration": "8 Months",
      "estimatedHours": 320,
      "status": "active",
      "phases": [
        {
          "phaseId": "phase-1",
          "title": "Phase 1: Programming & Math Fundamentals",
          "description": "Build a foundation in Python programming and statistics.",
          "estimatedWeeks": 6,
          "milestones": [
            {
              "milestoneId": "m1-1",
              "title": "Python Core Syntax & Data Structures",
              "estimatedHours": 20,
              "resources": [
                { "title": "Python for Data Science & AI", "type": "Course", "url": "https://coursera.org" }
              ],
              "skills": ["Python"],
              "order": 1
            }
          ]
        }
      ]
    }
  }
  ```

### 2. `GET /api/v1/roadmaps`
- Returns all learning roadmaps created for the user.

### 3. `GET /api/v1/roadmaps/:id`
- Retrieves roadmap details by ID.

### 4. `PATCH /api/v1/roadmaps/:id`
- Updates status of roadmap (`active`, `completed`, `archived`).
