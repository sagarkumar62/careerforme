# 15 — API Integration Specification

## Overview
The frontend communicates with the Node.js + Express backend running at `NEXT_PUBLIC_API_URL` (`http://localhost:5000/api/v1`).

---

## Configuration
- Environment variable: `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1` stored in `client/.env.local`.
- Centralized API Client: [lib/api.ts](../../client/src/lib/api.ts) using Axios with `withCredentials: true`.
- Request Interceptor: Automatically attaches `Authorization: Bearer <token>` from `sessionStorage` if available.
- Response Unwrapping: Unwraps backend `ApiResponse` payload `{ statusCode, data, message, success }` into strongly typed frontend structures.
- Offline & Resilience Mode: If the Express backend server is offline or unreachable, the API client seamlessly falls back to realistic mock datasets in [lib/mock-data/index.ts](../../client/src/lib/mock-data/index.ts).

---

## Endpoints Mapped

### Auth
- `POST /auth/register` — Register user & set tokens
- `POST /auth/login` — Login user & set tokens
- `POST /auth/logout` — Clear session cookies/tokens
- `GET /auth/me` — Restore current authenticated user profile

### Learner Profile & Onboarding
- `GET /profile` — Fetch learner profile
- `POST /profile` — Save/update learner profile

### Recommendations & Skill Gap
- `GET /recommendations` — Fetch AI career recommendations
- `GET /recommendations/:id` — Fetch specific career detail
- `POST /recommendations/skill-gap` — Compute precision skill gaps

### Roadmaps
- `POST /roadmaps/generate` — Generate personalized career roadmap
- `GET /roadmaps` — Retrieve current roadmap
- `PATCH /roadmaps/:id` — Toggle milestones & update roadmap progress

### Dashboard & Assistant
- `GET /dashboard` — Fetch unified career command center metrics
- `POST /conversation/message` — Interact with `CareerPath AI` mentor
