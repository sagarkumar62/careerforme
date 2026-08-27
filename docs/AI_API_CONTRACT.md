# AI API Contract Documentation

## Overview
All AI-powered endpoints are hosted under Express at `/api/v1/ai/*` (with `/ai/*` alias) and require Bearer Token Authentication. Every query strictly uses `req.user._id`.

---

## 1. Analyze Profile
- **Endpoint**: `POST /api/v1/ai/profile/analyze`
- **Description**: Evaluates user profile and returns top match with Gemini explanation.
- **Example Response**:
```json
{
  "statusCode": 200,
  "data": {
    "topRecommendation": {
      "career": "AI Engineer",
      "matchScore": 88,
      "confidence": "HIGH",
      "scoreBreakdown": { "skill": 91, "interest": 85, "goal": 100, "experience": 80, "education": 95, "semantic": 83 }
    }
  },
  "message": "Profile analyzed successfully"
}
```

---

## 2. Get Career Recommendations
- **Endpoint**: `GET /api/v1/ai/careers/recommend`
- **Description**: Returns top match, 3-5 alternative career options, confidence, strengths, skill gaps, and next best action.

---

## 3. Compare Careers
- **Endpoint**: `POST /api/v1/ai/careers/compare`
- **Input**: `{ "careerIds": ["car_ai_eng", "car_fs_dev"] }`
- **Output**: Side-by-side metrics: score, transition effort, missing skills, skill overlap, estimated learning hours, career risks, best fit explanation.

---

## 4. Skill Gap Analysis
- **Endpoint**: `POST /api/v1/ai/skill-gap`
- **Input**: `{ "targetCareer": "AI Engineer" }`
- **Output**: Skill gap details categorized into `STRONG`, `NEEDS_WORK`, `MISSING` with priorities (`HIGH`, `MEDIUM`, `LOW`).

---

## 5. Generate Roadmap & Adapt Roadmap
- **Endpoints**: `POST /api/v1/ai/roadmap/generate` & `POST /api/v1/ai/roadmap/adapt`
- **Output**: Structured 4-phase learning path customized to learner gaps.

---

## 6. Project & Resource Recommendations
- **Endpoints**: `POST /api/v1/ai/projects/recommend` & `POST /api/v1/ai/resources/recommend`
- **Output**: Beginner, Intermediate, Advanced project ideas and skill-mapped documentation/video resources with verified URLs.

---

## 7. Flowchart Generation
- **Endpoint**: `POST /api/v1/ai/flowchart/generate`
- **Output**: Structured DAG `{ "nodes": [...], "edges": [...] }`.
