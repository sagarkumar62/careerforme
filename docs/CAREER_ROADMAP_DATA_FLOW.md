# Career PathFinder - End-to-End Career & Roadmap Data Flow

## 1. System Architecture & Hierarchy

```
USER PROFILE (LearnerProfile model in MongoDB)
    │
    ▼
Python Career Matching (6-Factor Hybrid Match Scoring Engine)
    │
    ▼
Selected Career (Canonical careerId from dataset)
    │
    ▼
Personalized Skill Gap (STRONG, NEEDS_WORK, MISSING)
    │
    ▼
Personalized Prerequisite Graph (DAG Topological Traversal)
    │
    ▼
Personalized Roadmap Structure (4-Phase Learning Path)
    │
    ▼
Gemini Enrichment (Phase summaries, project ideas, resource curation)
    │
    ▼
MongoDB Persistence (Roadmap model with status: 'active', profileVersion)
    │
    ▼
Frontend Next.js UI (/recommendations, /careers/[id], /roadmap)
```

---

## 2. API Contracts & Scoping

| Endpoint | Method | Request Payload | Response Schema | User Scoping |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/v1/recommendations` | `GET` | Header: `Bearer <token>` | `[{ careerId, matchScore, confidence, scoreBreakdown, strengths, skillGaps }]` | `req.user._id` |
| `GET /api/v1/recommendations/:careerId` | `GET` | `:careerId` slug parameter | `{ id, title, description, matchScore, confidence, scoreBreakdown, whyMatches, strengths, skillGaps, skillGapReport, keyResponsibilities, nextBestAction }` | `req.user._id` |
| `POST /api/v1/recommendations/skill-gap` | `POST` | `{ careerId: "ai-engineer" }` | `{ career, currentSkills, missingSkills, skillsToImprove, priority, details, summary }` | `req.user._id` |
| `POST /api/v1/roadmaps/generate` | `POST` | `{ careerId: "ai-engineer" }` | Persisted `Roadmap` object with 4 phases, graph nodes, and `isStale: false` | `req.user._id` |
| `GET /api/v1/roadmaps` | `GET` | Header: `Bearer <token>` | Array of user roadmaps | `req.user._id` |
| `PATCH /api/v1/roadmaps/:id` | `PATCH` | `{ phaseId, milestoneId }` | Updated `Roadmap` with milestone completion status | `req.user._id` |

---

## 3. Data Flow Steps

1. **Explore Careers**:
   * User navigates to `/recommendations`.
   * Express reads `req.user._id`, loads latest `LearnerProfile` from MongoDB, and sends canonical profile text & skills to Python AI service.
   * Python AI returns recommendations scored mathematically by 6 factors.
2. **Career Details**:
   * User clicks a career card (`/careers/ai-engineer`).
   * Express fetches `LearnerProfile` and dataset career metadata, calculates personalized skill gaps (`STRONG`, `NEEDS_WORK`, `MISSING`), strengths, and transition estimates.
3. **Build Roadmap**:
   * User clicks **"Set as Active Goal & Build Roadmap"**.
   * Express passes `careerId` and profile to Python AI roadmap engine.
   * Python AI evaluates user skill levels: skills with level $\ge$ required level are marked `MASTERED` and omitted from beginner roadmap phases.
   * Python AI performs topological DAG prerequisite traversal to order remaining topics.
   * Gemini enriches phase descriptions, capstone projects, and resource URLs without overriding Python scores or node ordering.
   * Express persists roadmap to MongoDB with `profileVersion` and updates `LearnerProfile.targetCareerId`.
4. **My Roadmap Page**:
   * Frontend fetches active roadmap from `/api/v1/roadmaps`.
   * If `roadmap.profileVersion < profile.profileVersion`, `isStale` is set to `true`, displaying an alert banner: *"Your profile has changed. Update Roadmap to match your new profile."*

---

## 4. Structured Log Telemetry

The backend outputs structured telemetry logs at critical boundaries:
* `[RECOMMENDATION] userId=... profileVersion=... careerCount=...`
* `[CAREER_SELECTED] userId=... careerId=...`
* `[SKILL_GAP] careerId=... strong=... needsWork=... missing=...`
* `[ROADMAP_GENERATION] careerId=... profileVersion=... masteredSkills=... missingSkills=...`
* `[PYTHON_AI] careerId=... nodesGenerated=... phasesGenerated=...`
* `[GEMINI_ENRICHMENT] careerId=... nodesReceived=... nodesReturned=...`
* `[ROADMAP_SAVED] roadmapId=... careerId=... profileVersion=...`
