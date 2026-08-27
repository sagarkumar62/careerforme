# Personalized & Adaptive Roadmap Engine

## Purpose
Generates structured 4-Phase learning paths strictly customized to a learner's missing skills and prerequisite graph.

## Graph Prerequisite Rule
Topic nodes follow a strict Directed Acyclic Graph (DAG) (e.g. Python $\rightarrow$ NumPy $\rightarrow$ Statistics $\rightarrow$ ML $\rightarrow$ Deep Learning $\rightarrow$ LLM Apps). Advanced topics are locked until prerequisites are satisfied.

## Personalized Omission
Already mastered skills (e.g., strong Python proficiency) are marked as `MASTERED` and omitted from beginner roadmap phases.

## Adaptive Engine (`POST /ai/roadmap/adapt`)
- **Accelerated Path**: Triggered if progress $> 60\%$; skips mastered topics and advances directly to capstones.
- **Revised Reinforcement Path**: Triggered if progress $< 20\%$ or $> 2$ missed milestones; inserts review & practice milestones before advanced topics.

## Files Involved
- `ai-service/app/services/roadmap_engine.py`
- `ai-service/app/services/prerequisite_engine.py`
- `server/src/services/python-ai.service.ts`
