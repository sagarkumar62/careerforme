# Real Skill Gap Engine

## Purpose
Compares learner proficiency levels against career requirements to classify skills and assign mathematically derived priorities.

## Classification System
- **`STRONG`**: Learner level $\ge$ Required level. (Mastered competency)
- **`NEEDS_WORK`**: $0 <$ Learner level $<$ Required level. (Level-up needed)
- **`MISSING`**: Learner level == 0. (Essential gap to bridge)

## Priority Calculation
Priority is calculated using a weighted model incorporating:
- Skill importance (weight $0.5$)
- Gap size ratio ($\text{gap} / \text{targetLevel}$)
- Prerequisite dependency count and downstream impact

Priorities are grouped into `HIGH`, `MEDIUM`, and `LOW`.

## Output Item Schema
```json
{
  "skill": "Statistics",
  "currentLevel": 1,
  "requiredLevel": 4,
  "gap": 3,
  "priority": "HIGH",
  "priorityScore": 0.85,
  "classification": "NEEDS_WORK",
  "reason": "Prerequisite for Machine Learning with high career relevance.",
  "prerequisites": ["Python", "Linear Algebra"],
  "estimatedHours": 75
}
```

## Files Involved
- `ai-service/app/services/skill_gap_engine.py`
