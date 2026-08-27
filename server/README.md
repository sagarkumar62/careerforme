# CAREER PATHFINDER - Backend API

> AI-Powered Personalized Career and Learning Path Recommendation SaaS (Hackathon Prototype)

---

## 📌 Project Overview

**CAREER PATHFINDER** backend is a modular, scalable Node.js + Express + TypeScript RESTful API server. It manages user authentication, learner profiles, career catalog data, milestone progress tracking, qualitative feedback loops, conversational AI interactions, and unified dashboard data aggregation.

It communicates with an independent Python FastAPI AI microservice for machine learning calculations, vector embeddings, skill gap analysis, and LLM orchestration.

---

## 🏗 High-Level Architecture

```
                    USER
                      │
                      ▼
              Next.js Frontend
                      │
                      │ REST API
                      ▼
             Node.js + Express Backend
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
       MongoDB              Python AI Service
                                  │
                                  ▼
                         ML / Recommendation / LLM
```

---

## 🛠 Tech Stack

- **Runtime**: Node.js, TypeScript
- **Framework**: Express.js
- **Database**: MongoDB, Mongoose ORM
- **Authentication**: JWT (Access & Refresh tokens), HTTP-only Cookies, bcryptjs
- **Validation**: Zod schema validation
- **HTTP Client**: Axios (for Python FastAPI microservice bridge)
- **Security & Utilities**: Helmet, CORS, Morgan, Cookie-Parser

---

## 📂 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts               # MongoDB Mongoose connection
│   │   ├── env.ts              # Environment variable loader
│   │   └── ai.ts               # AI service configuration
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── conversation.controller.ts
│   │   ├── recommendation.controller.ts
│   │   ├── roadmap.controller.ts
│   │   ├── progress.controller.ts
│   │   ├── feedback.controller.ts
│   │   ├── assistant.controller.ts
│   │   └── dashboard.controller.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT token extraction & verification
│   │   ├── error.middleware.ts       # Centralized error handler
│   │   ├── notFound.middleware.ts    # 404 handler
│   │   └── validation.middleware.ts  # Zod schema request validator
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── LearnerProfile.ts
│   │   ├── Career.ts
│   │   ├── Skill.ts
│   │   ├── LearningResource.ts
│   │   ├── Recommendation.ts
│   │   ├── Roadmap.ts
│   │   ├── Progress.ts
│   │   ├── Feedback.ts
│   │   └── Conversation.ts
│   │
│   ├── routes/
│   │   ├── health.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── conversation.routes.ts
│   │   ├── recommendation.routes.ts
│   │   ├── roadmap.routes.ts
│   │   ├── progress.routes.ts
│   │   ├── feedback.routes.ts
│   │   ├── assistant.routes.ts
│   │   └── dashboard.routes.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── profile.service.ts
│   │   ├── recommendation.service.ts
│   │   ├── roadmap.service.ts
│   │   ├── progress.service.ts
│   │   ├── feedback.service.ts
│   │   ├── conversation.service.ts
│   │   └── ai.service.ts              # FastAPI REST client + Mock AI engine
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── profile.validator.ts
│   │   ├── recommendation.validator.ts
│   │   └── feedback.validator.ts
│   │
│   ├── utils/
│   │   ├── ApiError.ts
│   │   ├── ApiResponse.ts
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   └── seed.ts                  # Database seed script
│   │
│   ├── app.ts                        # Express application configuration
│   └── server.ts                     # HTTP server entry point
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Complete Server Setup Guide

Follow these step-by-step instructions to set up, configure, seed, and run the Express Node.js Backend API server locally.

---

### 📋 Prerequisites

* **Node.js**: `v18.x` or `v20.x` (LTS recommended)
* **npm**: `v9.x+`
* **MongoDB**: A running MongoDB instance (Local `mongodb://localhost:27017` or MongoDB Atlas URI)

---

### 1️⃣ Installation

Navigate to the `server/` directory and install dependencies:

```bash
cd server
npm install
```

---

### 2️⃣ Environment Variables Configuration

Create a `.env` file in the `server/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your `.env` variables:

```ini
PORT=5000
NODE_ENV=development

# MongoDB Connection String (Local MongoDB or Atlas)
MONGODB_URI=mongodb://localhost:27017/career_pathfinder

# JWT Authentication Secrets (Use strong random strings in production)
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS & Connected Service URLs
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=30000

# Mock Mode (Set false when Python AI Service or Gemini is active)
AI_MOCK_MODE=false

# Optional Direct Google Gemini Integration
GEMINI_API_KEY=your_google_gemini_api_key_here
```

---

### 3️⃣ Seed Database

Populate MongoDB with canonical career definitions, skill dependency graphs, and resource datasets:

```bash
npm run seed
```

*Expected output: `Database seeded successfully with career catalog, skills, and resources.`*

---

### 4️⃣ Start Development Server

Run the development server with live watch reloads:

```bash
npm run dev
```

The Express API gateway will listen at `http://localhost:5000`. Verify health status at:
`http://localhost:5000/api/v1/health`

---

### 5️⃣ Production Build & Deployment

To compile TypeScript and start the production distribution:

```bash
# Build TypeScript to dist/
npm run build

# Start production server
npm start
```

---

### 🧪 Automated Tests & AI Benchmark Suite

Run integration tests and the 6-factor recommendation precision benchmark:

```bash
# Run unit & API integration tests
npm run test

# Run AI recommendation precision evaluation benchmark
npx tsx src/utils/ai-evaluation.ts
```

## 🤖 Mock AI Mode (`AI_MOCK_MODE=true`)

When `AI_MOCK_MODE=true` is set in `.env`, the backend generates deterministic, realistic recommendations, skill gaps, roadmaps, and assistant replies without needing the Python FastAPI service running locally.

When Python FastAPI is running, set `AI_MOCK_MODE=false`. If FastAPI fails or times out, `AIService` automatically falls back gracefully without crashing Express.

---

## 📡 API Endpoint Summary

### Base URL: `/api/v1`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server, Database & AI Health Check |
| `POST` | `/auth/register` | Register new user account |
| `POST` | `/auth/login` | Login user & set HTTP-only cookies |
| `POST` | `/auth/logout` | Clear authentication cookies |
| `POST` | `/auth/refresh` | Refresh JWT tokens |
| `GET` | `/auth/me` | Get current user info |
| `GET` | `/profile` | Get user learner profile |
| `POST` | `/profile` | Create initial profile |
| `PUT` | `/profile` | Full update profile |
| `PATCH` | `/profile` | Partial update profile |
| `POST` | `/recommendations` | Generate career recommendations |
| `GET` | `/recommendations` | List user recommendations |
| `POST` | `/recommendations/skill-gap` | Skill gap analysis |
| `POST` | `/recommendations/adapt` | Adaptive recommendation update |
| `POST` | `/roadmaps/generate` | Generate learning roadmap |
| `GET` | `/roadmaps` | List user roadmaps |
| `GET` | `/roadmaps/:id` | Get specific roadmap |
| `PATCH` | `/roadmaps/:id` | Update roadmap status |
| `GET` | `/progress` | List milestone progress |
| `POST` | `/progress` | Track milestone progress |
| `PATCH` | `/progress/:id` | Update milestone status/completion |
| `GET` | `/progress/summary` | Progress summary metrics |
| `POST` | `/feedback` | Submit feedback |
| `GET` | `/feedback` | Get user feedback history |
| `POST` | `/conversation/message` | Send chat message to AI assistant |
| `GET` | `/conversation` | Get conversation history |
| `GET` | `/dashboard` | Aggregated dashboard data payload |

---

## 📚 Documentation Directory (`docs/`)

Comprehensive feature documentation files are available in `docs/`:

- `docs/00-project-overview.md`
- `docs/01-architecture.md`
- `docs/02-database-design.md`
- `docs/03-authentication.md`
- `docs/04-learner-profile.md`
- `docs/05-career-recommendation.md`
- `docs/06-ai-integration.md`
- `docs/07-skill-gap-analysis.md`
- `docs/08-roadmap-generation.md`
- `docs/09-progress-tracking.md`
- `docs/10-feedback-adaptation.md`
- `docs/11-conversational-assistant.md`
- `docs/12-dashboard.md`
- `docs/13-api-documentation.md`
- `docs/14-security.md`
- `docs/15-testing.md`
- `docs/16-deployment.md`
- `docs/17-challenges-learnings.md`
