"""
Path Generator Service

Single Responsibility:
    Generates a topologically ordered learning path (structured phases & milestones) given:
    Recommended Courses + Prerequisite Graph + Skill Gaps.

Pipeline Architecture:
    Recommended Courses
            +
    Prerequisite Graph
            +
        Skill Gaps
            ↓
    Topological DAG Ordering
            ↓
    4-Phase Roadmap Structuring
            ↓
    Ordered Learning Path Output

Non-Goals / Scope Boundaries:
    - Does NOT compute match recommendations (delegated to learning_recommendation_engine.py)
    - Does NOT calculate raw skill gaps (delegated to skill_gap_engine.py)
"""

from collections import deque, defaultdict
from typing import Dict, List, Any, Optional, Set, Tuple
from app.utils.normalization import normalize_skill_name


def _slugify(text: str) -> str:
    if not text:
        return ""
    return text.strip().lower().replace(" ", "-")


def topological_sort_courses_and_nodes(
    items: List[Dict[str, Any]],
    graph_edges: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Performs topological sorting on a list of courses/skills using prerequisite relationships
    and graph edges (Kahn's Algorithm).
    """
    if not items:
        return []

    # Map item identifiers (ID, title, skillId, or name)
    item_by_id: Dict[str, Dict[str, Any]] = {}
    id_alias_map: Dict[str, str] = {}

    for item in items:
        item_id = str(item.get("id") or item.get("course_id") or item.get("nodeId") or item.get("skillId") or item.get("title") or "")
        slug_id = _slugify(item_id)
        
        item_by_id[slug_id] = item
        id_alias_map[slug_id] = slug_id

        title = item.get("title") or item.get("skillName") or item.get("name") or ""
        if title:
            slug_title = _slugify(title)
            id_alias_map[slug_title] = slug_id
            for word in title.lower().split():
                clean_word = _slugify(word)
                if clean_word and clean_word not in id_alias_map:
                    id_alias_map[clean_word] = slug_id
        
        skills_covered = item.get("skills_covered") or []
        for s in skills_covered:
            slug_s = _slugify(str(s))
            if slug_s and slug_s not in id_alias_map:
                id_alias_map[slug_s] = slug_id

    def resolve_prereq_slug(prereq_str: str) -> Optional[str]:
        p_slug = _slugify(prereq_str)
        if p_slug in id_alias_map:
            return id_alias_map[p_slug]
        for alias, s_id in id_alias_map.items():
            if p_slug in alias or alias in p_slug:
                return s_id
        return None

    # Build adjacency graph and in-degree tracking
    adj: Dict[str, List[str]] = defaultdict(list)
    in_degree: Dict[str, int] = {slug: 0 for slug in item_by_id.keys()}

    # Add edges from item prerequisites
    for slug, item in item_by_id.items():
        prereqs = item.get("prerequisites") or item.get("prereqs") or []
        for p in prereqs:
            p_slug = resolve_prereq_slug(str(p))
            if p_slug and p_slug in item_by_id and p_slug != slug:
                adj[p_slug].append(slug)
                in_degree[slug] += 1

    # Add explicit graph edges if provided
    if graph_edges:
        for edge in graph_edges:
            src = id_alias_map.get(_slugify(str(edge.get("from") or edge.get("source"))), _slugify(str(edge.get("from") or edge.get("source"))))
            target = id_alias_map.get(_slugify(str(edge.get("to") or edge.get("target"))), _slugify(str(edge.get("to") or edge.get("target"))))
            if src in item_by_id and target in item_by_id and src != target:
                adj[src].append(target)
                in_degree[target] += 1

    # Kahn's algorithm queue
    queue = deque([slug for slug, degree in in_degree.items() if degree == 0])
    ordered_slugs: List[str] = []

    while queue:
        curr = queue.popleft()
        ordered_slugs.append(curr)
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # Append any remaining items if cycle or disconnected
    for slug in item_by_id.keys():
        if slug not in ordered_slugs:
            ordered_slugs.append(slug)

    return [item_by_id[s] for s in ordered_slugs if s in item_by_id]


def organize_items_into_4_phases(
    ordered_items: List[Dict[str, Any]],
    skill_gaps: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Groups topologically ordered courses/topics into a structured 4-Phase Roadmap:
      - Phase 1: Foundations & Prerequisites
      - Phase 2: Core Technical Mastery
      - Phase 3: Advanced Specialization
      - Phase 4: Capstone & Career Readiness
    """
    if not ordered_items:
        ordered_items = []

    # Map level types if present
    phase_1_items = [i for i in ordered_items if i.get("level") == "beginner" or i.get("type") == "foundation"]
    phase_2_items = [i for i in ordered_items if i.get("level") == "intermediate" or i.get("type") == "core"]
    phase_3_items = [i for i in ordered_items if i.get("level") == "advanced" or i.get("type") in ("intermediate", "advanced")]
    phase_4_items = [i for i in ordered_items if i.get("type") == "capstone"]

    # Fallback partition if type/level metadata is not explicitly set
    remaining = [i for i in ordered_items if i not in phase_1_items and i not in phase_2_items and i not in phase_3_items and i not in phase_4_items]
    
    if remaining:
        chunk_size = max(1, len(remaining) // 4)
        if not phase_1_items:
            phase_1_items = remaining[:chunk_size]
            remaining = remaining[chunk_size:]
        if not phase_2_items:
            phase_2_items = remaining[:chunk_size]
            remaining = remaining[chunk_size:]
        if not phase_3_items:
            phase_3_items = remaining[:chunk_size]
            remaining = remaining[chunk_size:]
        if not phase_4_items:
            phase_4_items = remaining

    def create_phase_payload(
        phase_id: str,
        title: str,
        description: str,
        phase_items: List[Dict[str, Any]],
        phase_prereqs: List[str]
    ) -> Dict[str, Any]:
        skills_covered = set()
        milestones = []
        courses_payload = []
        total_hours = 0

        for idx, item in enumerate(phase_items, start=1):
            item_title = item.get("title") or item.get("name") or f"Module {idx}"
            item_desc = item.get("description") or f"Master competencies for {item_title}."
            hrs = int(item.get("duration_hours") or item.get("estimatedHours") or 15)
            total_hours += hrs

            # Extract covered skills
            c_skills = item.get("skills_covered") or item.get("gaps_addressed") or [item_title]
            for s in c_skills:
                skills_covered.add(str(s))

            milestones.append({
                "milestoneId": f"m_{phase_id}_{idx}",
                "title": item_title,
                "description": item_desc,
                "estimatedHours": hrs,
                "completed": item.get("completed", False) or item.get("status") == "MASTERED",
                "targetSkill": item_title
            })

            courses_payload.append({
                "courseId": item.get("id") or item.get("course_id") or f"c_{phase_id}_{idx}",
                "title": item_title,
                "provider": item.get("provider", "PathFinder Academy"),
                "durationHours": hrs,
                "rating": item.get("rating", 4.8),
                "matchScore": item.get("match_score", 0.9),
                "gapsAddressed": item.get("gaps_addressed", []),
                "prerequisitesStatus": item.get("prerequisites_status", "MET")
            })

        return {
            "phaseId": phase_id,
            "title": title,
            "description": description,
            "skills": sorted(list(skills_covered)),
            "prerequisites": phase_prereqs,
            "estimatedHours": total_hours,
            "milestones": milestones,
            "courses": courses_payload
        }

    phases = [
        create_phase_payload(
            "phase-1",
            "Phase 1: Foundations & Prerequisites",
            "Build foundational prerequisite concepts and core baseline skills.",
            phase_1_items,
            []
        ),
        create_phase_payload(
            "phase-2",
            "Phase 2: Core Technical Mastery",
            "Develop essential core technical capabilities and practical workflows.",
            phase_2_items,
            ["phase-1"]
        ),
        create_phase_payload(
            "phase-3",
            "Phase 3: Advanced Specialization",
            "Deepen expertise with advanced protocols, architecture, and specialization.",
            phase_3_items,
            ["phase-2"]
        ),
        create_phase_payload(
            "phase-4",
            "Phase 4: Capstone & Career Readiness",
            "Synthesize learning with comprehensive practical projects and career entry preparation.",
            phase_4_items,
            ["phase-3"]
        )
    ]

    return phases


def generate_ordered_learning_path(
    recommended_courses: List[Dict[str, Any]],
    prerequisite_graph: Optional[Dict[str, Any]] = None,
    skill_gaps: Optional[List[Dict[str, Any]]] = None,
    weekly_hours: int = 10
) -> Dict[str, Any]:
    """
    Main entry point function for Path Generator.

    Accepts:
      - recommended_courses: List of recommended course objects
      - prerequisite_graph: Optional graph dict containing nodes and edges
      - skill_gaps: Optional list of skill gap objects
      - weekly_hours: Weekly available hours for duration calculation

    Returns:
      - Ordered learning path payload structured into 4 phases with topological ordering.
    """
    # Extract nodes/edges from prerequisite_graph if provided
    graph_edges = []
    graph_nodes = []
    if isinstance(prerequisite_graph, dict):
        graph_edges = prerequisite_graph.get("edges") or []
        graph_nodes = prerequisite_graph.get("nodes") or []

    # Combine recommended courses and graph nodes for comprehensive path generation
    combined_items: List[Dict[str, Any]] = []
    seen_ids: Set[str] = set()

    for course in recommended_courses or []:
        c_id = _slugify(str(course.get("id") or course.get("course_id") or course.get("title") or ""))
        if c_id and c_id not in seen_ids:
            seen_ids.add(c_id)
            combined_items.append(dict(course))

    for node in graph_nodes:
        n_id = _slugify(str(node.get("id") or node.get("nodeId") or node.get("title") or ""))
        if n_id and n_id not in seen_ids:
            seen_ids.add(n_id)
            node_item = {
                "id": node.get("id"),
                "title": node.get("title"),
                "description": node.get("description", ""),
                "type": node.get("type", "core"),
                "prerequisites": node.get("prerequisites", []),
                "duration_hours": node.get("estimatedHours", 15)
            }
            combined_items.append(node_item)

    # 1. Topological Sorting
    topologically_ordered = topological_sort_courses_and_nodes(combined_items, graph_edges)

    # 2. 4-Phase Structuring
    phases = organize_items_into_4_phases(topologically_ordered, skill_gaps)

    # Calculate overall timeline metrics
    total_hours = sum(p["estimatedHours"] for p in phases)
    if total_hours == 0:
        total_hours = 60

    effective_weekly = max(int(weekly_hours or 10), 1)
    duration_months = max(1, round(total_hours / (effective_weekly * 4)))

    return {
        "success": True,
        "totalItems": len(topologically_ordered),
        "totalEstimatedHours": total_hours,
        "estimatedDurationMonths": duration_months,
        "weeklyHours": effective_weekly,
        "orderedItems": topologically_ordered,
        "phases": phases
    }


# -------------------------------------------------------------------------
# Object-Oriented Class Interface
# -------------------------------------------------------------------------

class PathGenerator:
    """
    Engine class providing stateful or object-oriented access to path generation.
    """

    def generate(
        self,
        recommended_courses: List[Dict[str, Any]],
        prerequisite_graph: Optional[Dict[str, Any]] = None,
        skill_gaps: Optional[List[Dict[str, Any]]] = None,
        weekly_hours: int = 10
    ) -> Dict[str, Any]:
        """Executes ordered learning path generation."""
        return generate_ordered_learning_path(
            recommended_courses=recommended_courses,
            prerequisite_graph=prerequisite_graph,
            skill_gaps=skill_gaps,
            weekly_hours=weekly_hours
        )
