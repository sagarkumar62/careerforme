"""
Learning Recommendation Engine Service

Single Responsibility:
    Determines what a learner should learn next given:
    Learner Profile + Goal + Skill Gaps + Course Catalog.

Pipeline Architecture:
    Learner Profile + Goal + Skill Gaps + Courses
                       ↓
              Candidate Retrieval
                       ↓
             Prerequisite Filtering (with Effective Skill Evidence)
                       ↓
                   Ranking
                       ↓
         Top & Locked Recommendations

Non-Goals / Scope Boundaries:
    - Does NOT generate multi-phase learning roadmaps (delegated to roadmap_engine.py)
    - Does NOT invoke LLMs (pure deterministic heuristic scoring)
    - Does NOT perform career matching (delegated to recommendation_engine.py)

Just: What should this learner learn next?
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from app.utils.normalization import normalize_skill_id, normalize_skill_name
from app.services.course_candidate_merger import merge_course_candidates


# Default path to course dataset
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DEFAULT_COURSES_PATH = DATA_DIR / "courses.json"

# In-memory fallback seed dataset if courses.json is missing or unreadable
FALLBACK_COURSES: List[Dict[str, Any]] = [
    {
        "id": "course-git-101",
        "title": "Git & GitHub Version Control Essentials",
        "description": "Master git commands, branching strategies, code reviews, and collaborative workflows.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "git", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
        "duration_hours": 8
    },
    {
        "id": "course-python-101",
        "title": "Python Basics & Core Programming",
        "description": "Master foundational Python concepts, variables, control flow, functions, and OOP.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "python", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
        "duration_hours": 20
    },
    {
        "id": "course-python-201",
        "title": "Advanced Python & Software Engineering Principles",
        "description": "Deep dive into decorators, generators, asynchronous programming, testing, and clean code in Python.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "python", "target_level": 8.0}],
        "prerequisites": [{"skill_id": "python", "minimum_level": 5.0}],
        "difficulty": "intermediate",
        "duration_hours": 25
    },
    {
        "id": "course-html-css-101",
        "title": "HTML5 & Modern CSS3 Fundamentals",
        "description": "Build responsive, structured, accessible modern web layouts from scratch.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "html-css", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
        "duration_hours": 12
    },
    {
        "id": "course-js-101",
        "title": "Modern JavaScript (ES6+)",
        "description": "Understand core JS, asynchronous promises, async/await, DOM manipulation, and closure patterns.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "javascript", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "html-css", "minimum_level": 4.0}],
        "difficulty": "beginner",
        "duration_hours": 18
    },
    {
        "id": "course-ts-101",
        "title": "TypeScript Mastery for Developers",
        "description": "Strongly typed JavaScript, generics, interfaces, type inference, and modern project setup.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "typescript", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "javascript", "minimum_level": 4.0}],
        "difficulty": "intermediate",
        "duration_hours": 15
    },
    {
        "id": "course-react-101",
        "title": "React.js Component Architecture",
        "description": "Build interactive single page applications using React hooks, state, context, and custom components.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "react", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "javascript", "minimum_level": 4.0}],
        "difficulty": "intermediate",
        "duration_hours": 30
    },
    {
        "id": "course-node-101",
        "title": "Node.js & Express RESTful API Development",
        "description": "Build robust server-side applications, REST APIs, authentication, and middleware architecture.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "node.js", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "javascript", "minimum_level": 5.0}],
        "difficulty": "intermediate",
        "duration_hours": 24
    },
    {
        "id": "course-sql-101",
        "title": "Relational Databases & SQL Mastery",
        "description": "Master SQL queries, joins, indexes, schema design, and database optimization with PostgreSQL.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "sql", "target_level": 5.0}, {"skill_id": "databases", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
        "duration_hours": 16
    },
    {
        "id": "course-dsa-101",
        "title": "Data Structures & Algorithms in Depth",
        "description": "Master arrays, linked lists, trees, graphs, sorting, dynamic programming, and algorithm complexity.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "dsa", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "python", "minimum_level": 3.0}],
        "difficulty": "intermediate",
        "duration_hours": 35
    },
    {
        "id": "course-docker-101",
        "title": "Docker Containers & Containerization",
        "description": "Learn containerizing applications, Dockerfiles, docker-compose, networking, and volumes.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "docker", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "linux", "minimum_level": 3.0}],
        "difficulty": "intermediate",
        "duration_hours": 14
    },
    {
        "id": "course-k8s-101",
        "title": "Kubernetes Orchestration in Production",
        "description": "Deploy, scale, and manage containerized applications with Kubernetes pods, services, and ingress.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "kubernetes", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "docker", "minimum_level": 5.0}],
        "difficulty": "advanced",
        "duration_hours": 28
    },
    {
        "id": "course-aws-101",
        "title": "AWS Cloud Foundations",
        "description": "Core AWS services including EC2, S3, RDS, Lambda, IAM, and VPC networking.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "cloud", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "linux", "minimum_level": 4.0}],
        "difficulty": "beginner",
        "duration_hours": 22
    },
    {
        "id": "course-linux-101",
        "title": "Linux System Administration & Shell Scripting",
        "description": "Master the Linux command line, bash scripting, file permissions, and process management.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "linux", "target_level": 5.0}],
        "prerequisites": [],
        "difficulty": "beginner",
        "duration_hours": 15
    },
    {
        "id": "course-data-analysis-101",
        "title": "Data Analysis with Python & Pandas",
        "description": "Data wrangling, cleaning, exploratory data analysis, and visualization using Pandas and NumPy.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "data-analysis", "target_level": 5.0}, {"skill_id": "python", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "python", "minimum_level": 3.0}],
        "difficulty": "beginner",
        "duration_hours": 20
    },
    {
        "id": "course-ml-101",
        "title": "Applied Machine Learning Algorithms",
        "description": "Supervised and unsupervised learning, regression, classification, evaluation metrics with Scikit-Learn.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "machine-learning", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "python", "minimum_level": 5.0}, {"skill_id": "statistics", "minimum_level": 4.0}],
        "difficulty": "intermediate",
        "duration_hours": 32
    },
    {
        "id": "course-dl-101",
        "title": "Deep Learning & Neural Networks",
        "description": "Build artificial neural networks, CNNs, and RNNs using PyTorch and TensorFlow.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "machine-learning", "target_level": 7.0}],
        "prerequisites": [{"skill_id": "machine-learning", "minimum_level": 5.0}],
        "difficulty": "advanced",
        "duration_hours": 40
    },
    {
        "id": "course-sysdesign-101",
        "title": "System Design & Distributed Architecture",
        "description": "Design scalable system architectures, load balancers, caching, microservices, and database sharding.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "system-design", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "node.js", "minimum_level": 4.0}, {"skill_id": "databases", "minimum_level": 4.0}],
        "difficulty": "advanced",
        "duration_hours": 26
    },
    {
        "id": "course-cybersec-101",
        "title": "Cybersecurity Fundamentals & Network Security",
        "description": "Understand threat models, network protocols, cryptography, and vulnerability assessment.",
        "provider": "Career For Me Academy",
        "skills": [{"skill_id": "security-fundamentals", "target_level": 5.0}],
        "prerequisites": [{"skill_id": "linux", "minimum_level": 3.0}],
        "difficulty": "beginner",
        "duration_hours": 18
    }
]


# -------------------------------------------------------------------------
# Helper Normalization Utilities
# -------------------------------------------------------------------------

def normalize_text(text: Optional[str]) -> str:
    """Normalizes string tokens for uniform comparison."""
    if not text or not isinstance(text, str):
        return ""
    clean = text.strip().lower()
    clean = re.sub(r'[^a-z0-9\s\-]+', '', clean)
    return re.sub(r'\s+', ' ', clean).strip()


def parse_learner_skills(skills: Any) -> Dict[str, float]:
    """
    Parses various representations of learner skills into a normalized map:
    { "python": 3.0, "react": 2.0 }
    """
    skill_map: Dict[str, float] = {}
    if isinstance(skills, dict):
        for k, v in skills.items():
            norm_k = normalize_skill_id(str(k)) or normalize_text(str(k))
            if norm_k:
                try:
                    skill_map[norm_k] = float(v)
                except (ValueError, TypeError):
                    skill_map[norm_k] = 1.0
    elif isinstance(skills, list):
        for item in skills:
            if isinstance(item, dict):
                raw_n = item.get("skillId") or item.get("name") or item.get("skill") or ""
                norm_k = normalize_skill_id(str(raw_n)) or normalize_text(str(raw_n))
                lvl = item.get("level") or item.get("currentLevel") or item.get("proficiency") or 1.0
                if norm_k:
                    try:
                        skill_map[norm_k] = float(lvl)
                    except (ValueError, TypeError):
                        skill_map[norm_k] = 1.0
            elif isinstance(item, str):
                norm_k = normalize_skill_id(item) or normalize_text(item)
                if norm_k:
                    skill_map[norm_k] = 1.0
    return skill_map


def parse_completed_courses(completed: Any) -> Set[str]:
    """Parses completed course IDs or topic names into a set of normalized strings."""
    completed_set: Set[str] = set()
    if isinstance(completed, list):
        for item in completed:
            if isinstance(item, str):
                norm = normalize_text(item)
                if norm:
                    completed_set.add(norm)
                    completed_set.add(item.strip())
            elif isinstance(item, dict):
                c_id = item.get("id") or item.get("course_id") or item.get("title")
                if c_id and isinstance(c_id, str):
                    completed_set.add(normalize_text(c_id))
                    completed_set.add(c_id.strip())
    return completed_set


def parse_skill_gaps(skill_gaps: Any) -> List[Dict[str, Any]]:
    """
    Parses skill gaps into a standardized list of gap dictionaries:
    [
        {
            "skillId": "machine-learning",
            "skillName": "Machine Learning",
            "currentLevel": 2,
            "targetLevel": 8,
            "gap": 6,
            "priority": 0.85,
            "status": "needs_work"
        }
    ]
    """
    parsed_gaps: List[Dict[str, Any]] = []

    if isinstance(skill_gaps, list):
        for item in skill_gaps:
            if isinstance(item, str):
                s_id = normalize_skill_id(item)
                if s_id:
                    parsed_gaps.append({
                        "skillId": s_id,
                        "skillName": item.strip(),
                        "currentLevel": 0,
                        "targetLevel": 4,
                        "gap": 4,
                        "priority": 0.5,
                        "status": "needs_work",
                        "name": s_id,
                        "display_name": item.strip(),
                        "required_level": 4,
                        "importance": 0.5
                    })
            elif isinstance(item, dict):
                raw_id = item.get("skillId") or item.get("skill_id") or item.get("name") or item.get("skill") or item.get("title") or ""
                raw_name = item.get("skillName") or item.get("display_name") or item.get("name") or item.get("title") or item.get("skill") or ""
                
                s_id = normalize_skill_id(str(raw_id or raw_name))
                s_name = str(raw_name or raw_id or s_id.replace("-", " ").title())

                if s_id:
                    curr_lvl = int(item.get("currentLevel") or item.get("current_level") or item.get("level") or 0)
                    tgt_lvl = int(item.get("targetLevel") or item.get("target_level") or item.get("required_level") or item.get("requiredLevel") or 4)
                    gap_val = int(item.get("gap") or item.get("skillGap") or max(0, tgt_lvl - curr_lvl))
                    prio_val = float(item.get("priority") or item.get("importance") or 0.5)
                    status_val = str(item.get("status") or ("mastered" if gap_val == 0 else "needs_work"))

                    parsed_gaps.append({
                        "skillId": s_id,
                        "skillName": s_name,
                        "currentLevel": curr_lvl,
                        "targetLevel": tgt_lvl,
                        "gap": gap_val,
                        "priority": prio_val,
                        "status": status_val,
                        "name": s_id,
                        "display_name": s_name,
                        "required_level": tgt_lvl,
                        "importance": prio_val
                    })

    elif isinstance(skill_gaps, dict):
        if "skillGaps" in skill_gaps and isinstance(skill_gaps["skillGaps"], list):
            return parse_skill_gaps(skill_gaps["skillGaps"])
        
        for name_raw, gap_data in skill_gaps.items():
            s_id = normalize_skill_id(str(name_raw))
            if s_id:
                if isinstance(gap_data, (int, float)):
                    gap_val = int(gap_data)
                    parsed_gaps.append({
                        "skillId": s_id,
                        "skillName": str(name_raw),
                        "currentLevel": 0,
                        "targetLevel": gap_val,
                        "gap": gap_val,
                        "priority": 0.5,
                        "status": "needs_work",
                        "name": s_id,
                        "display_name": str(name_raw),
                        "required_level": gap_val,
                        "importance": 0.5
                    })
                elif isinstance(gap_data, dict):
                    curr = int(gap_data.get("currentLevel") or gap_data.get("current_level") or 0)
                    tgt = int(gap_data.get("targetLevel") or gap_data.get("target_level") or gap_data.get("required_level") or 4)
                    g_val = int(gap_data.get("gap") or max(0, tgt - curr))
                    prio = float(gap_data.get("priority") or gap_data.get("importance") or 0.5)
                    parsed_gaps.append({
                        "skillId": s_id,
                        "skillName": gap_data.get("skillName", gap_data.get("display_name", str(name_raw))),
                        "currentLevel": curr,
                        "targetLevel": tgt,
                        "gap": g_val,
                        "priority": prio,
                        "status": str(gap_data.get("status") or "needs_work"),
                        "name": s_id,
                        "display_name": gap_data.get("display_name", str(name_raw)),
                        "required_level": tgt,
                        "importance": prio
                    })

    return parsed_gaps


def extract_course_skill_names(course: Dict[str, Any]) -> List[str]:
    """
    Extracts normalized skill identifiers from either:
    - New Course model format: skills: [{"skill_id": "python", "target_level": 5.0}]
    - Legacy format: skills_covered: ["python", "coding"]
    """
    covered: List[str] = []
    raw_skills = course.get("skills")
    if isinstance(raw_skills, list):
        for item in raw_skills:
            if isinstance(item, dict):
                sid = item.get("skill_id") or item.get("name") or item.get("skill")
                if sid:
                    covered.append(normalize_skill_id(str(sid)))
            elif isinstance(item, str):
                covered.append(normalize_skill_id(item))
    raw_covered = course.get("skills_covered")
    if isinstance(raw_covered, list):
        for item in raw_covered:
            if isinstance(item, str):
                covered.append(normalize_skill_id(item))
    return list(set(covered))


def load_courses_catalog(custom_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Loads courses from courses.json file or falls back to built-in seed catalog."""
    target_path = custom_path or DEFAULT_COURSES_PATH
    if target_path.exists():
        try:
            content = target_path.read_text(encoding="utf-8").strip()
            if content:
                loaded = json.loads(content)
                if isinstance(loaded, list) and len(loaded) > 0:
                    return loaded
        except Exception as e:
            print(f"[LearningRecommendationEngine] Warning: Could not read {target_path}: {e}")
    return FALLBACK_COURSES


# -------------------------------------------------------------------------
# Effective Skill Evidence & Prerequisite Helpers
# -------------------------------------------------------------------------

def build_effective_skill_levels(
    learner_skills: Dict[str, float],
    completed_course_ids: Set[str],
    courses: List[Dict[str, Any]],
) -> Dict[str, float]:
    """
    Combine explicit learner skill levels with evidence from completed courses.

    Rule: A completed course can raise a skill only up to the target level
    that the course explicitly teaches. Never downgrade explicit skills.

    effective_level = max(explicit_level, completed_course_target)
    """
    effective: Dict[str, float] = {}

    for k, v in learner_skills.items():
        sid = normalize_skill_id(str(k))
        if sid:
            effective[sid] = max(effective.get(sid, 0.0), float(v))

    course_map: Dict[str, Dict[str, Any]] = {}
    for c in courses:
        cid = normalize_text(c.get("id", ""))
        ctitle = normalize_text(c.get("title", ""))
        if cid:
            course_map[cid] = c
        if ctitle:
            course_map[ctitle] = c

    for comp_id in completed_course_ids:
        norm_comp = normalize_text(comp_id)
        c = course_map.get(norm_comp)
        if not c:
            continue

        raw_skills = c.get("skills", [])
        if isinstance(raw_skills, list):
            for s in raw_skills:
                if isinstance(s, dict):
                    sid = normalize_skill_id(s.get("skill_id") or s.get("name") or s.get("skill") or "")
                    target = float(s.get("target_level") or s.get("level") or 5.0)
                    if sid:
                        effective[sid] = max(effective.get(sid, 0.0), target)
                elif isinstance(s, str):
                    sid = normalize_skill_id(s)
                    if sid:
                        effective[sid] = max(effective.get(sid, 0.0), 5.0)

        raw_covered = c.get("skills_covered", [])
        if isinstance(raw_covered, list):
            for s in raw_covered:
                if isinstance(s, str):
                    sid = normalize_skill_id(s)
                    if sid:
                        effective[sid] = max(effective.get(sid, 0.0), 5.0)

    return effective


def check_course_prerequisites(
    course: Dict[str, Any],
    learner_skill_levels: Dict[str, float],
) -> List[Dict[str, Any]]:
    """
    Evaluates course prerequisites against effective learner skill levels.
    Returns a list of structured missing prerequisite objects:
    [
      {
        "skill_id": "python",
        "skill_name": "Python",
        "required_level": 5.0,
        "current_level": 3.0,
        "gap": 2.0
      }
    ]
    """
    raw_prereqs = course.get("prerequisites", [])
    missing: List[Dict[str, Any]] = []

    for prereq in raw_prereqs:
        if isinstance(prereq, dict):
            p_skill = normalize_skill_id(prereq.get("skill_id") or prereq.get("name") or prereq.get("skill") or "")
            min_lvl = float(prereq.get("minimum_level") or prereq.get("level") or 1.0)
            raw_disp = prereq.get("skill_id") or prereq.get("name") or prereq.get("skill") or p_skill
            display_name = str(raw_disp).replace("-", " ").title() if str(raw_disp).islower() else str(raw_disp)
        elif isinstance(prereq, str):
            p_skill = normalize_skill_id(prereq)
            min_lvl = 1.0
            display_name = prereq
        else:
            continue

        if not p_skill:
            continue

        learner_lvl = learner_skill_levels.get(p_skill, 0.0)
        if learner_lvl < 1.0:
            for user_skill, lvl in learner_skill_levels.items():
                if p_skill in user_skill or user_skill in p_skill:
                    learner_lvl = max(learner_lvl, lvl)

        if learner_lvl < min_lvl:
            gap_val = round(max(0.0, min_lvl - learner_lvl), 2)
            missing.append({
                "skill_id": p_skill,
                "skill_name": display_name,
                "required_level": min_lvl,
                "current_level": learner_lvl,
                "gap": gap_val
            })

    return missing


# -------------------------------------------------------------------------
# Core Pipeline Stages
# -------------------------------------------------------------------------

def retrieve_candidates(
    courses: List[Dict[str, Any]],
    skill_gaps: List[Dict[str, Any]],
    learner_completed: Set[str],
    goal: str
) -> List[Dict[str, Any]]:
    """
    Stage 1: Candidate Retrieval
    Filters available courses to identify candidates that address the learner's skill gaps
    or align with their learning goal, excluding already completed courses.
    """
    candidates = []
    norm_goal = normalize_text(goal)

    for course in courses:
        c_id = course.get("id") or ""
        c_title = course.get("title") or ""
        norm_c_id = normalize_text(c_id)
        norm_c_title = normalize_text(c_title)

        # Exclude completed courses
        if norm_c_id in learner_completed or norm_c_title in learner_completed or c_id in learner_completed:
            continue

        covered_skills = extract_course_skill_names(course)
        
        # Check matching skill gaps
        addressed_gaps = []
        for g in skill_gaps:
            g_id = normalize_skill_id(g.get("skillId") or g.get("name") or "")
            if g_id in covered_skills or any(g_id in s or s in g_id for s in covered_skills):
                addressed_gaps.append(g)

        # Check goal relevance
        tags_text = " ".join(course.get("tags", [])) if isinstance(course.get("tags"), list) else ""
        course_text = f"{norm_c_title} {' '.join(covered_skills)} {normalize_text(course.get('description', ''))} {tags_text}"
        goal_matched = bool(norm_goal and any(token in course_text for token in norm_goal.split()))

        # Candidate selection rule: must address at least one skill gap OR match the learning goal
        if addressed_gaps or goal_matched:
            course_copy = dict(course)
            course_copy["addressed_gaps"] = addressed_gaps
            course_copy["goal_matched"] = goal_matched
            course_copy["_covered_skills"] = covered_skills
            candidates.append(course_copy)

    return candidates


def filter_prerequisites(
    candidates: List[Dict[str, Any]],
    learner_skills: Dict[str, Any],
    learner_completed: Set[str],
    catalog: Optional[List[Dict[str, Any]]] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Stage 2: Prerequisite Filtering
    Evaluates prerequisites for candidate courses against effective learner skill levels.
    Supports structured missing prerequisite objects and backward-compatible missing list strings.
    """
    parsed_skills = parse_learner_skills(learner_skills) if isinstance(learner_skills, (list, dict)) else learner_skills
    evidence_catalog = catalog if catalog is not None else candidates

    effective_levels = build_effective_skill_levels(
        learner_skills={k: float(v) for k, v in parsed_skills.items()},
        completed_course_ids=learner_completed,
        courses=evidence_catalog
    )

    eligible = []
    locked = []

    for course in candidates:
        missing_objs = check_course_prerequisites(course, effective_levels)

        # Backwards compatible string list formatting for legacy test assertions
        missing_labels = []
        for m in missing_objs:
            min_l = m["required_level"]
            display_l = int(min_l) if min_l.is_integer() else min_l
            missing_labels.append(f"{m['skill_name']} (min level {display_l})")

        course_copy = dict(course)
        course_copy["missing_prerequisites"] = missing_objs
        course_copy["missing_prerequisites_labels"] = missing_labels
        course_copy["prerequisites_met"] = len(missing_objs) == 0

        if len(missing_objs) == 0:
            eligible.append(course_copy)
        else:
            locked.append(course_copy)

    return eligible, locked


def compute_gap_coverage_score(
    course: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
    learner_skills: Dict[str, float]
) -> float:
    """
    Step 4: Proficiency-Aware Skill Gap Coverage
    Calculates how much of the learner's skill gap(s) the course closes:
    
    For each skill gap:
      1. remaining_gap = target_level - current_level
      2. effective_course_target = min(course_target, target_level)
      3. course_gain = max(0, effective_course_target - current_level)
      4. coverage = course_gain / remaining_gap (max 1.0) if remaining_gap > 0 else 0.0
      5. weighted coverage = sum(skill_priority * course_coverage) / sum(skill_priority)
    """
    if not skill_gaps:
        return 0.5

    parsed_learner_skills = parse_learner_skills(learner_skills) if learner_skills else {}

    course_skills_map: Dict[str, float] = {}
    raw_skills = course.get("skills", [])
    if isinstance(raw_skills, list):
        for s in raw_skills:
            if isinstance(s, dict):
                sid = normalize_skill_id(s.get("skill_id") or s.get("name") or s.get("skill") or "")
                lvl = float(s.get("target_level") or s.get("targetLevel") or s.get("level") or 5.0)
                if sid:
                    course_skills_map[sid] = lvl
            elif isinstance(s, str):
                sid = normalize_skill_id(s)
                if sid:
                    course_skills_map[sid] = 5.0

    raw_covered = course.get("skills_covered", [])
    if isinstance(raw_covered, list):
        for s in raw_covered:
            if isinstance(s, str):
                sid = normalize_skill_id(s)
                if sid and sid not in course_skills_map:
                    course_skills_map[sid] = 5.0

    total_prio = 0.0
    weighted_coverage = 0.0

    for gap in skill_gaps:
        if isinstance(gap, str):
            g_id = normalize_skill_id(gap)
            if not g_id:
                continue
            learner_lvl = float(parsed_learner_skills.get(g_id, 0.0))
            target_lvl = 5.0
            prio = 0.5
        elif isinstance(gap, dict):
            raw_sid = gap.get("skillId") or gap.get("skill_id") or gap.get("name") or gap.get("skill") or ""
            g_id = normalize_skill_id(str(raw_sid))
            if not g_id:
                continue

            if gap.get("current_level") is not None:
                learner_lvl = float(gap["current_level"])
            elif gap.get("currentLevel") is not None:
                learner_lvl = float(gap["currentLevel"])
            elif gap.get("level") is not None:
                learner_lvl = float(gap["level"])
            else:
                learner_lvl = float(parsed_learner_skills.get(g_id, 0.0))

            if gap.get("target_level") is not None:
                target_lvl = float(gap["target_level"])
            elif gap.get("targetLevel") is not None:
                target_lvl = float(gap["targetLevel"])
            elif gap.get("required_level") is not None:
                target_lvl = float(gap["required_level"])
            elif gap.get("requiredLevel") is not None:
                target_lvl = float(gap["requiredLevel"])
            elif gap.get("gap") is not None:
                target_lvl = learner_lvl + float(gap["gap"])
            else:
                target_lvl = max(learner_lvl, 4.0)

            prio = float(gap.get("priority") if gap.get("priority") is not None else (gap.get("importance") or 0.5))
        else:
            continue

        remaining_gap = target_lvl - learner_lvl

        if remaining_gap <= 0:
            total_prio += prio
            continue

        course_target = course_skills_map.get(g_id)
        if course_target is None:
            for c_sid, c_lvl in course_skills_map.items():
                if g_id in c_sid or c_sid in g_id:
                    course_target = c_lvl
                    break

        if course_target is None:
            course_target = 0.0

        effective_course_target = min(course_target, target_lvl)
        course_gain = max(0.0, effective_course_target - learner_lvl)
        coverage = min(1.0, course_gain / remaining_gap)

        weighted_coverage += coverage * prio
        total_prio += prio

    if total_prio <= 0:
        return 0.0

    return min(max(weighted_coverage / total_prio, 0.0), 1.0)


def rank_candidates(
    candidates: List[Dict[str, Any]],
    skill_gaps: List[Dict[str, Any]],
    learner: Dict[str, Any],
    goal: str
) -> List[Dict[str, Any]]:
    """
    Stage 3: Ranking
    Applies multi-factor deterministic heuristic scoring to rank candidate courses.

    Scoring Weights (V2 Hybrid):
      - Skill Gap Coverage Score (40%)
      - Goal Alignment Score (20%)
      - Level & Experience Fit Score (15%)
      - Prerequisite Readiness Score (15%)
      - Semantic Similarity Score (10%)
    """
    norm_goal = normalize_text(goal)
    learner_skills = parse_learner_skills(learner.get("skills") or learner.get("acquired_skills"))
    learner_level = (learner.get("experience_level") or learner.get("level") or "beginner").strip().lower()

    ranked_list = []

    for course in candidates:
        # 1. Skill Gap Coverage Score (0.0 to 1.0)
        gap_coverage_score = compute_gap_coverage_score(course, skill_gaps, learner_skills)

        # 2. Goal Alignment Score (0.0 to 1.0)
        title_norm = normalize_text(course.get("title", ""))
        desc_norm = normalize_text(course.get("description", ""))
        skills_covered_norm = " ".join(course.get("_covered_skills") or extract_course_skill_names(course))
        
        goal_tokens = set(norm_goal.split()) if norm_goal else set()
        if goal_tokens:
            combined_text = f"{title_norm} {skills_covered_norm} {desc_norm}"
            matched_tokens = [t for t in goal_tokens if t in combined_text]
            goal_alignment_score = len(matched_tokens) / len(goal_tokens)
        else:
            goal_alignment_score = 0.5

        # 3. Level Fit Score (0.0 to 1.0)
        course_level = (course.get("difficulty") or course.get("level") or "beginner").strip().lower()

        level_matrix = {
            "beginner": {"beginner": 1.0, "intermediate": 0.6, "advanced": 0.2},
            "intermediate": {"beginner": 0.7, "intermediate": 1.0, "advanced": 0.7},
            "advanced": {"beginner": 0.3, "intermediate": 0.8, "advanced": 1.0}
        }
        level_fit_score = level_matrix.get(learner_level, {}).get(course_level, 0.5)

        # 4. Prerequisite Readiness Score (0.0 to 1.0)
        prereq_met = course.get("prerequisites_met", True)
        missing_list = course.get("missing_prerequisites", [])
        if prereq_met:
            prereq_score = 1.0
        else:
            prereq_score = max(0.1, 0.6 - (len(missing_list) * 0.2))

        # 5. Semantic Similarity Score (0.0 to 1.0)
        semantic_similarity_score = float(
            course.get("semantic_similarity", 0.0) or 0.0
        )

        semantic_similarity_score = min(
            max(semantic_similarity_score, 0.0),
            1.0,
        )

        # Composite Score Calculation using V2 Hybrid weights
        match_score = (
            (0.40 * gap_coverage_score) +
            (0.20 * goal_alignment_score) +
            (0.15 * level_fit_score) +
            (0.15 * prereq_score) +
            (0.10 * semantic_similarity_score)
        )

        match_score = round(min(max(match_score, 0.0), 1.0), 4)

        addressed_gaps = course.get("addressed_gaps", [])
        gaps_names = [g.get("skillName") or g.get("display_name") or g.get("name") for g in addressed_gaps]
        if gaps_names:
            gap_phrase = f"Directly addresses skill gap(s): {', '.join(gaps_names[:3])}"
        else:
            gap_phrase = f"Aligns with your learning goal '{goal}'"

        if prereq_met:
            prereq_phrase = "All prerequisites satisfied."
        else:
            missing_names = [m.get("skill_name", str(m)) if isinstance(m, dict) else str(m) for m in missing_list]
            prereq_phrase = f"Requires prerequisite(s): {', '.join(missing_names)}"

        reasoning = f"{gap_phrase}. {prereq_phrase}"

        item = dict(course)
        item.update({
            "match_score": match_score,
            "score_breakdown": {
                "skill_gap_coverage": round(gap_coverage_score, 4),
                "goal_alignment": round(goal_alignment_score, 4),
                "level_fit": round(level_fit_score, 4),
                "prerequisite_readiness": round(prereq_score, 4),
                "semantic_similarity": round(semantic_similarity_score, 4),
            },
            "gaps_addressed": gaps_names,
            "prerequisites_status": "MET" if prereq_met else "UNMET",
            "reason": reasoning
        })
        ranked_list.append(item)

    ranked_list.sort(key=lambda x: x["match_score"], reverse=True)
    return ranked_list


# -------------------------------------------------------------------------
# Top Recommendations Generator Function
# -------------------------------------------------------------------------

def recommend_next_learning(
    learner: Dict[str, Any],
    goal: str,
    skill_gaps: List[Any],
    courses: Optional[List[Dict[str, Any]]] = None,
    top_k: int = 5,
    semantic_retriever: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Main entry point for Learning Recommendation Engine.
    
    Accepts:
      - learner: profile dictionary containing acquired skills, completed courses, experience level
      - goal: target career title or goal string
      - skill_gaps: list/dict of identified skill gaps
      - courses: optional course catalog list (loads default courses.json if None)
      - top_k: number of recommendations to return
      - semantic_retriever: optional SemanticCourseRetriever instance
      
    Returns:
      - Dictionary containing top recommended courses with match scores and reasoning,
        separated into eligible recommendations and locked recommendations.
    """
    catalog = courses if courses is not None else load_courses_catalog()

    learner_skills = parse_learner_skills(learner.get("skills") or learner.get("acquired_skills"))
    learner_completed = parse_completed_courses(learner.get("completed_courses") or learner.get("completed_topics"))
    parsed_gaps = parse_skill_gaps(skill_gaps)

    # Stage 1: Candidate Retrieval
    deterministic_candidates = retrieve_candidates(
        catalog,
        parsed_gaps,
        learner_completed,
        goal,
    )

    semantic_candidates: List[Dict[str, Any]] = []

    if semantic_retriever is not None:
        try:
            semantic_candidates = semantic_retriever.retrieve(
                learner=learner,
                goal=goal,
                skill_gaps=parsed_gaps,
                top_k=10,
            )
        except Exception as e:
            print(
                f"[LearningRecommendationEngine] "
                f"Semantic retrieval warning: {e}"
            )

    # Build catalog lookup once.
    catalog_by_id = {
        course.get("id"): course
        for course in catalog
        if course.get("id")
    }

    # Merge deterministic + semantic candidates.
    merged_candidates = merge_course_candidates(
        deterministic_candidates,
        semantic_candidates,
    )

    # Hydrate candidates so every candidate has complete course metadata.
    candidates = []

    for candidate in merged_candidates:
        course_id = (
            candidate.get("id")
            or candidate.get("course_id")
        )

        if not course_id:
            continue

        base_course = catalog_by_id.get(course_id)

        if base_course is None:
            # Ignore semantic results that do not exist
            # in our actual course catalog.
            continue

        hydrated = dict(base_course)

        # Semantic metadata wins over the default 0.0.
        hydrated.update(candidate)

        candidates.append(hydrated)

    # Existing fallback.
    if not candidates:
        candidates = [
            course
            for course in catalog
            if normalize_text(course.get("id"))
            not in learner_completed
        ]

    # Stage 2: Prerequisite Filtering (Separate eligible vs locked using effective skill evidence)
    eligible_candidates, locked_candidates = filter_prerequisites(
        candidates,
        learner_skills,
        learner_completed,
        catalog=catalog
    )

    # Stage 3: Rank eligible candidates (Ready to learn NOW) and locked candidates (Learn later)
    ranked_eligible = rank_candidates(eligible_candidates, parsed_gaps, learner, goal)
    ranked_locked = rank_candidates(locked_candidates, parsed_gaps, learner, goal)

    def _format_rec_item(idx: int, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "priority_order": idx,
            "course_id": item.get("id"),
            "title": item.get("title"),
            "description": item.get("description"),
            "provider": item.get("provider", "Career For Me Academy"),
            "level": item.get("difficulty") or item.get("level", "beginner"),
            "duration_hours": item.get("duration_hours", 10),
            "match_score": item.get("match_score", 0.0),
            "score_breakdown": item.get("score_breakdown", {}),
            "gaps_addressed": item.get("gaps_addressed", []),
            "prerequisites_status": item.get("prerequisites_status", "MET"),
            "prerequisites": item.get("prerequisites", []),
            "missing_prerequisites": item.get("missing_prerequisites", []),
            "reason": item.get("reason", ""),
            "semantic_similarity": item.get("semantic_similarity", 0.0),
        }

    top_recommendations = [_format_rec_item(idx, item) for idx, item in enumerate(ranked_eligible[:top_k], start=1)]
    locked_recommendations = [_format_rec_item(idx, item) for idx, item in enumerate(ranked_locked[:top_k], start=1)]

    return {
        "success": True,
        "learner_goal": goal,
        "total_candidates_evaluated": len(eligible_candidates) + len(locked_candidates),
        "total_eligible_candidates": len(eligible_candidates),
        "total_locked_candidates": len(locked_candidates),
        "recommendations": top_recommendations,
        "locked_recommendations": locked_recommendations
    }


# -------------------------------------------------------------------------
# Object-Oriented Interface Wrapper
# -------------------------------------------------------------------------

class LearningRecommendationEngine:
    """
    Engine class providing a stateful or configurable wrapper for the 
    Learning Recommendation Engine pipeline.
    """

    def __init__(
        self,
        courses: Optional[List[Dict[str, Any]]] = None,
        data_path: Optional[Path] = None,
        semantic_retriever: Optional[Any] = None,
    ):
        if courses is not None:
            self.courses = courses
        else:
            self.courses = load_courses_catalog(data_path)
        self.semantic_retriever = semantic_retriever

    def recommend(
        self,
        learner: Dict[str, Any],
        goal: str,
        skill_gaps: List[Any],
        top_k: int = 5
    ) -> Dict[str, Any]:
        """Executes recommendation pipeline using the instance's course catalog."""
        return recommend_next_learning(
            learner=learner,
            goal=goal,
            skill_gaps=skill_gaps,
            courses=self.courses,
            top_k=top_k,
            semantic_retriever=self.semantic_retriever,
        )

