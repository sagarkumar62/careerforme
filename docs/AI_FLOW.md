# Complete AI Flow & User Journey

## User Journey Overview
```
[User Profile]
      │
      ▼
[Python AI Microservice: 6-Factor Hybrid Match & Prerequisite Math]
      │
      ├──► Top Career Match + 3-5 Alternatives
      ├──► Side-by-Side Comparison Matrix
      ├──► Real Skill Gap Priority Report (STRONG, NEEDS_WORK, MISSING)
      └──► Prerequisite Graph DAG & Personalized 4-Phase Roadmap
      │
      ▼
[Gemini LLM Service: Natural Language Enrichment]
      ├──► Human Match Reasoning & Score Breakdown Explanation
      ├──► Practical Projects (Beginner, Intermediate, Advanced)
      ├──► Skill-Mapped Verified Learning Resources
      └──► Interactive Flowchart JSON Data
      │
      ▼
[MongoDB Persistence] (Scoped strictly to req.user._id)
      │
      ▼
[Next.js Frontend UI]
      ├──► Explore Careers Dashboard (/recommendations)
      │    ├── Top Match Hero Card (6-Factor Score Bars & Confidence)
      │    ├── Alternative Career Cards Grid
      │    └── Side-by-Side Career Comparison Drawer
      └──► Career Detail Page (/careers/[id])
           ├── Skill Gap Priority Visualizer
           ├── Prerequisite Graph Flowchart
           ├── Recommended Practical Projects
           ├── Skill-Mapped Learning Resources
           └── One-Click Personalized Roadmap Builder
```

## Security & Resilience
- **API Keys**: `GEMINI_API_KEY` is strictly held on the server.
- **Tenant Isolation**: Every request filters database operations by `req.user._id`.
- **Degraded Modes**:
  - Python AI offline $\rightarrow$ Deterministic Express local scoring.
  - Gemini LLM offline $\rightarrow$ Python AI output rendered with static fallback descriptions.
