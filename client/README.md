# CAREER PATHFINDER — Next.js 16 Frontend Client

> **AI-Powered Personalized Career and Learning Path Recommendation SaaS**  
> *Modern Responsive User Interface built with Next.js 16 (App Router), React, TailwindCSS, TanStack Query & Socket.IO*

---

## 📌 Overview

The **Career Pathfinder** frontend is an interactive web application that provides:
* 📊 **Interactive Onboarding & Assessment**: Form interfaces for learner skills, experience, and interests.
* 🎯 **Career Compatibility Dashboard**: Displays match percentages, 6-factor score breakdowns, and skill gap matrices.
* 🗺️ **Adaptive Roadmap Visualizer**: Milestone progress cards with integrated project prompts, video terms, docs, and dynamic DAG flowcharts.
* 💬 **Streaming AI Career Mentor**: Real-time conversational mentor powered by Server-Sent Events (SSE).
* ⚡ **Live Real-Time Socket Updates**: Instant UI recalculation when milestones or courses are marked complete.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19, TailwindCSS, Lucide Icons
- **State & Data Fetching**: TanStack Query (React Query v5)
- **HTTP & Real-Time**: Axios Client & Socket.IO-client
- **Type Safety**: TypeScript 5+

---

## 🛠️ Complete Client Setup Guide

Follow these step-by-step instructions to configure and run the Next.js frontend client locally.

---

### 📋 Prerequisites

* **Node.js**: `v18.x` or `v20.x` (LTS recommended)
* **npm**: `v9.x+`

---

### 1️⃣ Installation

Navigate to the `client/` directory and install dependencies:

```bash
cd client
npm install
```

---

### 2️⃣ Environment Variables Configuration

Create a `.env.local` file in the `client/` directory based on `.env.example`:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```ini
# Backend API Base URL (Local Express Server or Production URL)
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

---

### 3️⃣ Start Development Server

Launch the Next.js development server:

```bash
npm run dev
```

* Open [http://localhost:3000](http://localhost:3000) in your browser.
* Hot-reloading is enabled automatically for all components and pages.

---

### 4️⃣ Production Build & Deployment

To compile and launch the production distribution:

```bash
# Build optimized Next.js app
npm run build

# Start production server
npm start
```

---

### 🧪 Verification & Type Checking

To verify code quality and type safety:

```bash
# Run TypeScript compilation check
npx tsc --noEmit

# Run ESLint linter
npm run lint
```
