# 6-Factor Career Matching Engine

## Purpose
Calculates deterministic compatibility between a learner profile and candidate career roles using a 6-factor hybrid match scoring model in Python AI Service.

## 6-Factor Weights & Formula
$$\text{Final Score} = 0.40 \cdot \text{Skill} + 0.20 \cdot \text{Interest} + 0.15 \cdot \text{Goal} + 0.10 \cdot \text{Exp} + 0.05 \cdot \text{Edu} + 0.10 \cdot \text{Semantic}$$

1. **Skill Match (40%)**: Evaluates user proficiency levels ($0\text{--}4$) against career-required skill levels, weighted by importance.
2. **Interest Match (20%)**: Set intersection between user interests and candidate career categories.
3. **Goal Alignment (15%)**: Substring and fuzzy matching between user target goal and candidate role title/category.
4. **Experience Alignment (10%)**: Validates user experience tier (`Entry`, `Mid`, `Senior`) against role difficulty.
5. **Education Alignment (5%)**: Degree and academic field relevance check.
6. **Semantic Similarity (10%)**: Cosine similarity between SentenceTransformers profile embedding and career embeddings.

## Confidence Tiers
- `HIGH`: Final Score $\ge 78\%$
- `MEDIUM`: Final Score $55\text{--}77\%$
- `LOW`: Final Score $< 55\%$

## Files Involved
- `ai-service/app/services/recommendation_engine.py`
- `server/src/services/recommendation.service.ts`
