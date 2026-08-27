# 00 - CAREER FOR ME: Project Overview

## 1. Executive Summary

**CAREER FOR ME** is an AI-powered personalized career and learning path recommendation SaaS platform built during a 10-day hackathon. The platform helps users discover optimal career trajectories, diagnose skill gaps, follow tailored learning roadmaps, track progress, interact with an AI career assistant, and receive adaptive recommendation updates based on ongoing feedback and completed milestones.

## 2. Core Capabilities

1. **User Authentication & Session Management**: Secure JWT-based authentication using HTTP-only cookies and bcrypt password hashing.
2. **Learner Profiling**: Comprehensive user onboarding capturing education, experience level, existing skills, career goals, weekly availability, learning preferences, and current knowledge levels.
3. **AI-Driven Career Recommendations**: Integration with a Python FastAPI AI service (with seamless fallback mock mode) to deliver personalized career matches complete with match scores, confidence ratings, explanations, and key skill gaps.
4. **Skill-Gap Analysis**: Dynamic analysis comparing learner skills against industry career requirements, prioritizing high-impact missing skills.
5. **Personalized Learning Roadmaps**: Structured step-by-step roadmaps featuring multi-phase learning trajectories, milestones, resources, estimated time commitments, and prerequisites.
6. **Progress Tracking**: Granular tracking across roadmaps, phases, and milestones with time investment, percentage completion, and aggregated dashboard metrics.
7. **Adaptive Learning & Feedback**: Feedback loop mechanism that updates recommendations and roadmaps when learners complete milestones or flag difficulty.
8. **Conversational AI Assistant**: Intelligent career advisor interface retaining conversation context and providing actionable next steps.
9. **Unified Dashboard API**: Single aggregation endpoint serving all critical UI components in a single low-latency payload.

## 3. Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB & Mongoose ORM
- **Authentication**: JWT, HTTP-Only Cookies, bcryptjs
- **AI Microservice Bridge**: Axios REST client pointing to FastAPI (Python)
- **Validation**: Zod schema validation
- **Security & Utilities**: Helmet, CORS, Morgan, Cookie-Parser, custom ApiError & ApiResponse handlers

## 4. Key Hackathon Criteria Alignment

- **Problem Understanding & Solution Design (20%)**: Solves career guidance fragmentation with end-to-end user profiling and adaptive roadmap execution.
- **Functionality & Feature Completeness (25%)**: 100% API coverage across Auth, Profile, Recommendations, Roadmaps, Progress, Feedback, Conversation, and Dashboard.
- **AI/ML Implementation (20%)**: Clean decoupled HTTP microservice contract with FastAPI plus intelligent fallback dev mock mode.
- **Innovation & Creativity (15%)**: Real-time adaptive roadmap adjustment based on completion rates and qualitative feedback.
- **Performance & Code Quality (10%)**: Clean 3-tier architecture (Routes → Controllers → Services → Models), strict TypeScript types, centralized error management.
