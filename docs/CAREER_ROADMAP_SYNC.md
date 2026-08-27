# Career PathFinder - Career & Roadmap Synchronization Architecture

## Overview
This document details the synchronized, profile-driven architecture connecting **Learner Profile $\rightarrow$ Recommendations $\rightarrow$ Career Details $\rightarrow$ Skill Gap $\rightarrow$ Build Roadmap $\rightarrow$ My Roadmap $\rightarrow$ Progress & Assistant Context**.

---

## 1. Core End-to-End Pipeline & Single Source of Truth

```
Learner Profile (targetCareerId, profileVersion)
      ↓
Python AI Recommendation Engine (6-Factor Hybrid Scoring)
      ↓
Personalized Recommendations & Top Match (HIGH / MEDIUM / LOW Confidence)
      ↓
Personalized Career Details (GET /api/v1/recommendations/:careerId)
      ↓
Personalized Skill Gap Analysis (STRONG / NEEDS_WORK / MISSING)
      ↓
Topological Prerequisite Graph DAG
      ↓
Python AI Roadmap Engine (Omits Mastered Skills, Preserves DAG)
      ↓
Gemini LLM Enrichment (Projects, Resources, Videos, Descriptions)
      ↓
MongoDB Roadmap Persistence (status: 'active', profileVersion)
      ↓
My Roadmap UI (/roadmap) & Adaptive Progress Tracking
```

---

## 2. API Endpoints

| Endpoint | Method | Input Parameters | Output / Ownership |
| :--- | :--- | :--- | :--- |
| `/api/v1/profile` | `PUT` | `{ skills, experienceLevel, education, targetCareerGoal, ... }` | Updates `LearnerProfile` and increments `profileVersion`. |
| `/api/v1/ai/careers/recommend` | `GET` | Authenticated `req.user._id` | Returns top recommendation + 3–5 alternatives scored by Python AI. |
| `/api/v1/recommendations/:careerId` | `GET` | `careerId` slug parameter | Returns unified static career metadata + personalized Python AI analysis & Gemini enrichment. |
| `/api/v1/ai/careers/compare` | `POST` | `{ careerIds: [...] }` | Returns side-by-side metrics comparing up to 3 careers. |
| `/api/v1/ai/skill-gap` | `POST` | `{ targetCareer: "..." }` | Returns skill gap classification (`STRONG`, `NEEDS_WORK`, `MISSING`) & priorities. |
| `/api/v1/roadmaps/generate` | `POST` | `{ careerId }` | Generates personalized roadmap skipping mastered skills & persisting to MongoDB. |
| `/api/v1/roadmaps/:id/milestones` | `PATCH` | `{ phaseId, milestoneId }` | Toggles milestone completion and emits real-time progress events. |

---

## 3. Database Ownership & Models

* **`LearnerProfile`**: Owns user skills, proficiencies, interests, experience, education, `targetCareerId`, `targetCareer`, and `profileVersion`.
* **`Recommendation`**: Owns historical match snapshots, scores, confidence ratings, and score breakdowns.
* **`Roadmap`**: Owns active 4-phase learning path, milestone completion statuses, `careerId`, `profileVersion`, and `isStale` flag.
* **`Progress`**: Owns granular milestone completion percentage, time spent, and socket events.

---

## 4. React Query Synchronization & Cache Invalidation

All components consume standardized React Query keys:
- `['profile']`
- `['dashboard']`
- `['recommendations']`
- `['career', careerId]`
- `['skill-gap', careerId]`
- `['roadmap']`, `['roadmap', careerId]`
- `['progress']`

### Cache Invalidation Triggers:
1. **Profile Save**: Invalidates `['profile']`, `['dashboard']`, `['recommendations']`, `['career']`, `['skill-gap']`, `['roadmap']`, `['progress']`.
2. **Career Selection / Goal Update**: Invalidates `['dashboard']`, `['career']`, `['skill-gap']`, `['roadmap']`, `['progress']`.
3. **Milestone Completion**: Invalidates `['roadmap']`, `['progress']`, `['dashboard']`.

---

## 5. Profile Versioning & Outdated Roadmap Strategy

* `LearnerProfile` increments `profileVersion` whenever skills, proficiencies, or goals are saved.
* `Roadmap` documents store `profileVersion` at creation time.
* When `roadmap.profileVersion < profile.profileVersion`, the backend sets `isStale = true`.
* The UI displays a notification banner: *"Your profile has been updated! Click 'Update Roadmap to Match New Profile' to align your milestones with your new skills."*

---

## 6. AI Responsibilities & Non-Overriding Rule

* **Python AI Microservice**: Owns mathematical match scoring (6 factors), skill gap priorities, prerequisite DAG ordering, and roadmap phase structure.
* **Gemini LLM**: Owns natural language explanations, project ideation, resource curation, video search queries, and mentor guidance. **Gemini NEVER overrides Python match scores or prerequisite ordering.**

---

## 7. Failure Handling & Degraded Modes

* **Python AI Offline**: Express Gateway falls back to local dataset match scoring and skill gap analysis (`degraded: true`).
* **Gemini LLM Offline**: Structured Python results are delivered cleanly with static fallback descriptions.
