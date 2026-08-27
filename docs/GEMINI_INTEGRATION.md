# Gemini LLM Integration & Enrichment Layer

## Purpose
Integrates Gemini LLM for natural-language synthesis, human-friendly match explanations, practical project ideation, resource curation, and flowchart JSON generation.

## Strict Rule
Gemini **MUST NOT** recalculate or override Python-generated match scores. Scores remain mathematically authoritative in Python AI microservice.

## Responsibilities
1. Explaining why a career fits the learner (`explainCareerMatch`).
2. Generating 3 difficulty-tiered projects (`recommendProjects`).
3. Curating verified skill-mapped documentation and video learning resources (`recommendResources`). Never fabricates broken URLs.
4. Synthesizing flowchart JSON (`generateFlowchartData`) returning `{ "nodes": [...], "edges": [...] }`.
5. AI Mentor Assistant conversational guidance (`generateAssistantResponse`).

## Files Involved
- `server/src/services/ai.service.ts`
- `server/src/controllers/ai.controller.ts`
