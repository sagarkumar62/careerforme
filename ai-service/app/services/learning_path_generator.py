from typing import Any, Dict, List, Optional, Set
from app.utils.normalization import normalize_skill_id
from app.services.learning_recommendation_engine import (
    rank_candidates,
    parse_learner_skills,
    parse_completed_courses,
    normalize_text,
)


def build_course_lookup(courses: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Build a lookup mapping course ID -> course dict.
    """
    return {
        course["id"]: course
        for course in courses
        if course.get("id")
    }


def get_course_prerequisite_skills(course: Dict[str, Any]) -> Set[str]:
    """
    Extract the set of prerequisite skill IDs for a given course.
    """
    prerequisites = course.get("prerequisites") or []
    skills: Set[str] = set()
    for prereq in prerequisites:
        if isinstance(prereq, dict):
            skill_id = prereq.get("skill_id") or prereq.get("skillId")
            if skill_id:
                norm = normalize_skill_id(str(skill_id))
                if norm:
                    skills.add(norm)
    return skills


def build_course_dependency_graph(
    courses: List[Dict[str, Any]]
) -> Dict[str, Set[str]]:
    """
    Build a course dependency graph where graph[course_id] contains
    the set of prerequisite course IDs that must precede the course.

    Example:
        {
            "python-advanced": {"python-basics"}
        }
    """
    graph: Dict[str, Set[str]] = {
        course["id"]: set()
        for course in courses
        if course.get("id")
    }

    for course in courses:
        course_id = course.get("id")

        if not course_id:
            continue

        missing = get_missing_course_prerequisites(course, {})

        for prereq in missing:
            candidates = find_prerequisite_courses(
                prereq,
                courses,
                completed_course_ids=set(),
            )

            valid_candidates = [
                c for c in candidates if c.get("id") != course_id
            ]

            selected = select_minimum_prerequisite_course(
                valid_candidates,
                prereq["skill_id"],
                prereq["required_level"],
            )

            if selected and selected.get("id"):
                graph[course_id].add(selected["id"])

    return graph



def get_course_skill_levels(
    course: Dict[str, Any],
) -> Dict[str, float]:
    """
    Return the skill levels explicitly taught by a course.

    Example:
        {
            "python": 5.0,
            "statistics": 4.0,
        }
    """
    result: Dict[str, float] = {}

    for skill in course.get("skills") or []:
        if not isinstance(skill, dict):
            continue

        skill_id = (
            skill.get("skill_id")
            or skill.get("skillId")
            or skill.get("name")
            or skill.get("skill")
        )

        if not skill_id:
            continue

        normalized = normalize_skill_id(str(skill_id))
        if not normalized:
            continue

        target_level = skill.get("target_level")

        if target_level is None:
            target_level = skill.get("level")

        if target_level is None:
            continue

        try:
            target_level = float(target_level)
        except (TypeError, ValueError):
            continue

        result[normalized] = max(
            result.get(normalized, 0.0),
            target_level,
        )

    return result


def get_missing_course_prerequisites(
    course: Dict[str, Any],
    effective_skill_levels: Dict[str, float],
) -> List[Dict[str, Any]]:
    """
    Determine which prerequisites of a course are not yet
    satisfied by the learner.

    Uses the same prerequisite representation as the
    recommendation engine.
    """
    missing: List[Dict[str, Any]] = []

    for prerequisite in course.get("prerequisites") or []:
        if not isinstance(prerequisite, dict):
            continue

        skill_id = (
            prerequisite.get("skill_id")
            or prerequisite.get("skillId")
        )

        if not skill_id:
            continue

        skill_id = normalize_skill_id(str(skill_id))
        if not skill_id:
            continue

        required_level = prerequisite.get("minimum_level")

        if required_level is None:
            required_level = prerequisite.get("required")

        if required_level is None:
            required_level = prerequisite.get("level")

        try:
            required_level = float(required_level)
        except (TypeError, ValueError):
            continue

        current_level = float(
            effective_skill_levels.get(skill_id, 0.0)
        )

        if current_level < required_level:
            missing.append(
                {
                    "skill_id": skill_id,
                    "required_level": required_level,
                    "current_level": current_level,
                    "gap": required_level - current_level,
                }
            )

    return missing


def find_prerequisite_courses(
    missing_prerequisite: Dict[str, Any],
    courses: List[Dict[str, Any]],
    completed_course_ids: Set[str],
) -> List[Dict[str, Any]]:
    """
    Find courses capable of satisfying a missing prerequisite.

    Courses are filtered to those that teach the required skill
    to at least the required level.
    """
    skill_id = normalize_skill_id(missing_prerequisite["skill_id"])
    required_level = missing_prerequisite["required_level"]

    candidates = []

    for course in courses:
        course_id = course.get("id")

        if not course_id:
            continue

        if course_id in completed_course_ids:
            continue

        skill_levels = get_course_skill_levels(course)

        if skill_levels.get(skill_id, 0.0) >= required_level:
            candidates.append(course)

    return candidates


def select_minimum_prerequisite_course(
    candidates: List[Dict[str, Any]],
    skill_id: str,
    required_level: float,
) -> Dict[str, Any] | None:
    """
    Select the least advanced course that satisfies a prerequisite.

    Preference:
      1. Smallest skill overshoot
      2. Shortest duration
      3. Stable course ID ordering
    """
    norm_skill_id = normalize_skill_id(skill_id)
    valid_candidates = []

    for course in candidates:
        skill_levels = get_course_skill_levels(course)

        target_level = skill_levels.get(norm_skill_id, 0.0)

        if target_level < required_level:
            continue

        duration = course.get("duration_hours", 999999)

        try:
            duration = float(duration)
        except (TypeError, ValueError):
            duration = 999999

        valid_candidates.append(
            (
                target_level - required_level,
                duration,
                str(course.get("id", "")),
                course,
            )
        )

    if not valid_candidates:
        return None

    valid_candidates.sort(
        key=lambda item: (
            item[0],
            item[1],
            item[2],
        )
    )

    return valid_candidates[0][3]


def topological_sort_courses(
    graph: Dict[str, Set[str]],
) -> List[str]:
    """
    Return a valid course ordering based on prerequisite dependencies.

    graph[course_id] contains the course IDs that must come before
    that course.

    Raises:
        ValueError: if the graph contains a dependency cycle.
    """

    # Number of unresolved prerequisites for each course.
    remaining_dependencies = {
        course_id: len(prerequisites)
        for course_id, prerequisites in graph.items()
    }

    # Reverse mapping:
    # prerequisite -> courses that depend on it.
    dependents: Dict[str, Set[str]] = {
        course_id: set()
        for course_id in graph
    }

    for course_id, prerequisites in graph.items():
        for prerequisite_id in prerequisites:
            # Ignore references to unknown nodes defensively.
            if prerequisite_id not in dependents:
                dependents[prerequisite_id] = set()

            dependents[prerequisite_id].add(course_id)

    # Courses with no remaining dependencies can be taken first.
    ready = sorted(
        course_id
        for course_id, count in remaining_dependencies.items()
        if count == 0
    )

    ordered: List[str] = []

    while ready:
        current = ready.pop(0)
        ordered.append(current)

        for dependent in sorted(
            dependents.get(current, set())
        ):
            remaining_dependencies[dependent] -= 1

            if remaining_dependencies[dependent] == 0:
                ready.append(dependent)

        ready.sort()

    if len(ordered) != len(remaining_dependencies):
        unresolved = [
            course_id
            for course_id, count in remaining_dependencies.items()
            if count > 0
        ]

        raise ValueError(
            "Course dependency graph contains a cycle: "
            + ", ".join(sorted(unresolved))
        )

    return ordered


def calculate_course_dependency_depths(
    graph: Dict[str, Set[str]],
) -> Dict[str, int]:
    """
    Calculate the dependency depth for each course in the graph.

    Depth 0: Courses with no prerequisites in the graph.
    Depth N: max(depth of prerequisites) + 1.

    Raises:
        ValueError: if the graph contains a dependency cycle.
    """
    remaining_dependencies = {
        course_id: len([p for p in prerequisites if p in graph])
        for course_id, prerequisites in graph.items()
    }

    dependents: Dict[str, Set[str]] = {
        course_id: set() for course_id in graph
    }

    for course_id, prerequisites in graph.items():
        for prerequisite_id in prerequisites:
            if prerequisite_id in graph:
                dependents[prerequisite_id].add(course_id)

    ready = sorted(
        course_id
        for course_id, count in remaining_dependencies.items()
        if count == 0
    )

    depths: Dict[str, int] = {course_id: 0 for course_id in ready}

    processed_count = 0
    while ready:
        current = ready.pop(0)
        processed_count += 1
        current_depth = depths[current]

        for dependent in sorted(dependents.get(current, set())):
            remaining_dependencies[dependent] -= 1
            new_depth = current_depth + 1
            if dependent not in depths or new_depth > depths[dependent]:
                depths[dependent] = new_depth

            if remaining_dependencies[dependent] == 0:
                ready.append(dependent)

        ready.sort()

    if processed_count != len(graph):
        unresolved = [
            course_id
            for course_id, count in remaining_dependencies.items()
            if count > 0
        ]
        raise ValueError(
            "Course dependency graph contains a cycle: "
            + ", ".join(sorted(unresolved))
        )

    return depths


def calculate_milestone_progress(
    course_ids: List[str],
    completed_course_ids: Set[str],
    courses: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Calculate milestone progress and status from completed courses.
    """

    normalized_completed: Set[str] = set()
    for item in (completed_course_ids or []):
        if not item or not isinstance(item, str):
            continue
        normalized_completed.add(normalize_text(item))
        normalized_completed.add(normalize_skill_id(item))
        normalized_completed.add(item.strip().lower())

    course_title_map: Dict[str, str] = {}
    if courses:
        for c in courses:
            if isinstance(c, dict) and c.get("id"):
                course_title_map[c["id"]] = c.get("title", "")

    def is_course_completed(cid: str) -> bool:
        if not cid:
            return False
        if (
            normalize_text(cid) in normalized_completed
            or normalize_skill_id(cid) in normalized_completed
            or cid.strip().lower() in normalized_completed
        ):
            return True
        title = course_title_map.get(cid, "")
        if title and (
            normalize_text(title) in normalized_completed
            or normalize_skill_id(title) in normalized_completed
            or title.strip().lower() in normalized_completed
        ):
            return True
        return False

    total_courses = len(course_ids)

    if total_courses == 0:
        return {
            "progress": 0.0,
            "status": "not_started",
            "completed_course_ids": [],
            "remaining_course_ids": [],
            "next_course_id": None,
        }

    completed = [cid for cid in course_ids if is_course_completed(cid)]
    remaining = [cid for cid in course_ids if not is_course_completed(cid)]

    progress = len(completed) / total_courses if total_courses > 0 else 0.0

    if progress == 0.0:
        status = "not_started"
    elif progress >= 1.0:
        status = "completed"
    else:
        status = "in_progress"

    return {
        "progress": round(progress, 4),
        "status": status,
        "completed_course_ids": completed,
        "remaining_course_ids": remaining,
        "next_course_id": remaining[0] if remaining else None,
    }


def build_learning_milestones(
    ordered_courses: List[Dict[str, Any]],
    completed_course_ids: Set[str] = None,
) -> List[Dict[str, Any]]:
    """
    Group an ordered personalized course sequence into milestones.

    Courses with the same dependency depth are grouped into the
    same milestone.

    The input is expected to already be in valid prerequisite order.
    """

    if completed_course_ids is None:
        completed_course_ids = set()

    if not ordered_courses:
        return []

    grouped: Dict[int, List[Dict[str, Any]]] = {}

    for course in ordered_courses:
        depth = course.get("dependency_depth", 0)

        try:
            depth = int(depth)
        except (TypeError, ValueError):
            depth = 0

        grouped.setdefault(depth, []).append(course)

    milestones: List[Dict[str, Any]] = []

    for milestone_number, depth in enumerate(
        sorted(grouped.keys()),
        start=1,
    ):
        milestone_courses = grouped[depth]

        milestones.append(
            _create_milestone(
                milestone_number=milestone_number,
                courses=milestone_courses,
                dependency_depth=depth,
                completed_course_ids=completed_course_ids,
            )
        )

    return milestones


def generate_milestone_title(
    skills: List[str],
    dependency_depth: int,
) -> str:
    """
    Generate a deterministic learner-facing milestone title
    from the skills covered by the milestone and its dependency depth.
    """

    normalized_skills = {
        normalize_skill_id(skill)
        for skill in skills
        if skill
    }

    normalized_skills.discard("")

    if not normalized_skills:
        return f"Learning Milestone {dependency_depth + 1}"

    # Special case: foundational combinations.
    foundation_skills = {
        "python",
        "statistics",
        "mathematics",
        "html",
        "css",
        "javascript",
        "linux",
    }

    if len(normalized_skills) > 1 and normalized_skills.issubset(foundation_skills) and dependency_depth == 0:
        return "Foundations"

    skill_titles: Dict[str, Dict[int, str]] = {
        "python": {
            0: "Python Foundations",
            1: "Advanced Python",
            2: "Advanced Python Architecture",
        },
        "statistics": {
            0: "Statistics Foundations",
            1: "Advanced Statistics",
        },
        "mathematics": {
            0: "Mathematical Foundations",
            1: "Advanced Mathematics",
        },
        "javascript": {
            0: "JavaScript Foundations",
            1: "Advanced JavaScript",
        },
        "html": {
            0: "Web Foundations",
            1: "Advanced Web Development",
        },
        "css": {
            0: "Web Foundations",
            1: "Advanced Web Development",
        },
        "html-css": {
            0: "Web Foundations",
            1: "Advanced Web Development",
        },
        "react": {
            0: "React Foundations",
            1: "React Development",
            2: "Advanced React",
        },
        "machine-learning": {
            0: "Machine Learning Foundations",
            1: "Machine Learning Core",
            2: "Advanced Machine Learning",
        },
        "deep-learning": {
            0: "Deep Learning Foundations",
            1: "Deep Learning Core",
            2: "Advanced Deep Learning",
        },
        "docker": {
            0: "Containerization Foundations",
            1: "Containerization",
            2: "Advanced Containerization",
        },
        "kubernetes": {
            0: "Kubernetes Foundations",
            1: "Kubernetes & Orchestration",
            2: "Advanced Kubernetes",
        },
        "linux": {
            0: "Linux Foundations",
            1: "Advanced Linux",
        },
        "data-science": {
            0: "Data Science Foundations",
            1: "Data Science Core",
            2: "Advanced Data Science",
        },
        "data-analysis": {
            0: "Data Analysis Foundations",
            1: "Data Analysis Core",
            2: "Advanced Data Analysis",
        },
        "sql": {
            0: "SQL Foundations",
            1: "Advanced SQL",
        },
        "cybersecurity": {
            0: "Cybersecurity Foundations",
            1: "Cybersecurity Core",
            2: "Advanced Cybersecurity",
        },
        "devops": {
            0: "DevOps Foundations",
            1: "DevOps Engineering",
            2: "Advanced DevOps",
        },
        "cloud": {
            0: "Cloud Foundations",
            1: "Cloud Engineering",
            2: "Advanced Cloud Architecture",
        },
        "aws": {
            0: "Cloud Foundations",
            1: "Cloud Engineering",
            2: "Advanced Cloud Architecture",
        },
    }

    raw_skill_ids = [
        str(s).strip().lower().replace("_", "-").replace(" ", "-")
        for s in skills
        if s
    ]
    check_skills = raw_skill_ids + sorted(list(normalized_skills))

    for skill in check_skills:
        if skill in skill_titles:
            levels = skill_titles[skill]

            if dependency_depth in levels:
                return levels[dependency_depth]

            if dependency_depth > max(levels.keys()):
                return f"Advanced {levels[max(levels.keys())]}"

            return levels[min(levels.keys())]

    readable = sorted(
        skill.replace("-", " ").title()
        for skill in normalized_skills
    )

    if dependency_depth > 1:
        return f"Advanced {' & '.join(readable[:2])}"

    return " & ".join(readable[:2])


def _create_milestone(
    milestone_number: int,
    courses: List[Dict[str, Any]],
    dependency_depth: int,
    completed_course_ids: Set[str] = None,
) -> Dict[str, Any]:
    """
    Build the public milestone representation.
    """

    if completed_course_ids is None:
        completed_course_ids = set()

    course_ids = [
        course.get("id")
        for course in courses
        if course.get("id")
    ]

    skills: Set[str] = set()
    total_hours = 0.0

    for course in courses:
        skill_levels = get_course_skill_levels(course)

        skills.update(skill_levels.keys())

        try:
            total_hours += float(
                course.get("duration_hours", 0) or 0
            )
        except (TypeError, ValueError):
            pass

    progress_info = calculate_milestone_progress(
        course_ids=course_ids,
        completed_course_ids=completed_course_ids,
        courses=courses,
    )

    return {
        "milestone_id": f"milestone-{milestone_number}",
        "title": generate_milestone_title(
            skills=sorted(skills),
            dependency_depth=dependency_depth,
        ),
        "description": (
            f"Complete {len(course_ids)} course(s) "
            "to progress toward your learning goal."
        ),
        "dependency_depth": dependency_depth,
        "course_ids": course_ids,
        "skills": sorted(skills),
        "estimated_hours": round(total_hours, 2),
        "status": progress_info["status"],
        "progress": progress_info["progress"],
        "completed_course_ids": progress_info["completed_course_ids"],
        "remaining_course_ids": progress_info["remaining_course_ids"],
        "next_course_id": progress_info["next_course_id"],
        "project_ids": [],
        "projects": [],
    }


def find_courses_for_target_skills(
    courses: List[Dict[str, Any]],
    target_skills: Set[str],
) -> Set[str]:
    """
    Find course IDs that directly teach at least one target skill.
    """
    result = set()
    norm_targets = {normalize_skill_id(s) for s in target_skills if s}

    for course in courses:
        course_id = course.get("id")

        if not course_id:
            continue

        taught_skills = set(
            get_course_skill_levels(course).keys()
        )

        if taught_skills & norm_targets:
            result.add(course_id)

    return result


def collect_prerequisite_closure(
    dependency_graph: Dict[str, Set[str]],
    target_course_ids: Set[str],
) -> Set[str]:
    """
    Return target courses plus every transitive prerequisite
    course required to reach them.
    """

    required = set()

    def visit(course_id: str):
        if course_id in required:
            return

        required.add(course_id)

        for prerequisite_id in dependency_graph.get(
            course_id,
            set(),
        ):
            visit(prerequisite_id)

    for course_id in target_course_ids:
        visit(course_id)

    return required


def select_personalized_course_sequence(
    courses: List[Dict[str, Any]],
    learner: Dict[str, Any],
    goal: str,
    skill_gaps: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Select a personalized, topologically ordered sequence of courses
    required to fill a learner's skill gaps.
    """
    course_lookup = build_course_lookup(courses)

    learner_skills = parse_learner_skills(
        learner.get("skills")
        or learner.get("acquired_skills")
    )

    completed_course_ids = parse_completed_courses(
        learner.get("completed_courses")
        or learner.get("completed_topics")
    )

    target_skills: Set[str] = set()
    for gap in skill_gaps:
        if isinstance(gap, dict):
            gap_val = gap.get("gap")
            status = gap.get("status")
            if gap_val is not None:
                try:
                    if float(gap_val) <= 0:
                        continue
                except (TypeError, ValueError):
                    pass
            if status == "mastered":
                continue

            sid = (
                gap.get("skillId")
                or gap.get("skill_id")
                or gap.get("name")
                or gap.get("skillName")
                or gap.get("skill")
                or gap.get("display_name")
                or gap.get("id")
            )
            if sid:
                norm_sid = normalize_skill_id(str(sid))
                if norm_sid:
                    target_skills.add(norm_sid)
        elif isinstance(gap, str):
            norm_sid = normalize_skill_id(gap)
            if norm_sid:
                target_skills.add(norm_sid)

    target_course_ids = select_best_target_courses(
        courses=courses,
        target_skills=target_skills,
        learner=learner,
        skill_gaps=skill_gaps,
        goal=goal,
    )

    dependency_graph = build_course_dependency_graph(courses)

    dependency_depths = calculate_course_dependency_depths(
        dependency_graph
    )

    required_course_ids = collect_prerequisite_closure(
        dependency_graph, target_course_ids
    )

    completed_ids = {
        str(course_id).strip().lower()
        for course_id in (completed_course_ids or set())
    }

    # Exclude completed courses and prerequisite courses already satisfied by learner skills
    filtered_required = set()
    for cid in required_course_ids:
        c = course_lookup.get(cid)
        title = normalize_text(str(c.get("title", ""))) if c else ""
        norm_cid = normalize_text(cid)
        skill_cid = normalize_skill_id(cid)
        is_completed = (
            cid.lower() in completed_ids
            or norm_cid in completed_ids
            or skill_cid in completed_ids
            or title in completed_ids
            or any(normalize_text(item) == title or item.lower() == cid.lower() for item in completed_ids)
        )
        if is_completed:
            continue

        # If it's a prerequisite course (not directly in target_course_ids), skip if learner's existing skills satisfy it
        if cid not in target_course_ids and c:
            taught = get_course_skill_levels(c)
            if taught and all(learner_skills.get(sk, 0.0) >= lvl for sk, lvl in taught.items()):
                continue

        filtered_required.add(cid)

    subgraph = {
        course_id: dependencies & filtered_required
        for course_id, dependencies in dependency_graph.items()
        if course_id in filtered_required
    }

    ordered_ids = topological_sort_courses(subgraph)

    current_skills: Dict[str, float] = {
        normalize_skill_id(str(k)): float(v)
        for k, v in learner_skills.items()
        if k
    }

    selected: List[Dict[str, Any]] = []

    completed_ids = {
        str(course_id).strip().lower()
        for course_id in completed_course_ids
    }

    for course_id in ordered_ids:
        course = course_lookup.get(course_id)

        if course is None:
            continue

        selected_course = dict(course)

        selected_course["dependency_depth"] = dependency_depths.get(
            course_id,
            0,
        )

        selected.append(selected_course)

        # Simulate successful completion of this course.
        course_skill_levels = get_course_skill_levels(course)
        for skill_id, target_level in course_skill_levels.items():
            current_skills[skill_id] = max(
                current_skills.get(skill_id, 0.0),
                target_level,
            )

    return selected


def calculate_overall_path_progress(
    milestones: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Calculate overall learner progress across the personalized path.

    Progress is based on completed courses rather than averaging
    milestone percentages, so milestones with different numbers of
    courses are weighted correctly.
    """

    if not milestones:
        return {
            "total_courses": 0,
            "completed_courses": 0,
            "overall_progress": 0.0,
            "total_milestones": 0,
            "completed_milestones": 0,
            "current_milestone": None,
            "next_course_id": None,
        }

    total_courses = 0
    completed_courses = 0
    total_milestones = len(milestones)
    completed_milestones = 0

    current_milestone = None
    next_course_id = None

    for milestone in milestones:
        course_ids = milestone.get("course_ids", [])
        completed_ids = milestone.get("completed_course_ids", [])

        total_courses += len(course_ids)
        completed_courses += len(completed_ids)

        if milestone.get("status") == "completed":
            completed_milestones += 1

        if (
            current_milestone is None
            and milestone.get("status") != "completed"
        ):
            current_milestone = milestone.get("title")

            next_course_id = milestone.get(
                "next_course_id"
            )

    overall_progress = (
        completed_courses / total_courses
        if total_courses
        else 0.0
    )

    return {
        "total_courses": total_courses,
        "completed_courses": completed_courses,
        "overall_progress": round(overall_progress, 4),
        "total_milestones": total_milestones,
        "completed_milestones": completed_milestones,
        "current_milestone": current_milestone,
        "next_course_id": next_course_id,
    }


def attach_projects_to_learning_path(
    milestones: List[Dict[str, Any]],
    learner: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
    goal: str,
    projects: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Attach relevant practice projects to learning path milestones.

    For each milestone, identifies top recommended projects whose
    skills match the milestone, whose prerequisites are met, and
    which have not been completed or previously assigned.
    """
    if not milestones:
        return []

    if projects is None:
        try:
            from app.services.project_catalog import load_projects_catalog
            projects = load_projects_catalog()
        except Exception:
            projects = []

    if not projects:
        for m in milestones:
            m.setdefault("project_ids", [])
            m.setdefault("projects", [])
        return milestones

    from app.services.project_recommendation_engine import recommend_projects

    completed_projects = {
        str(pid).strip().lower()
        for pid in learner.get("completed_projects", [])
        if isinstance(pid, str)
    }

    assigned_project_ids: Set[str] = set()

    for milestone in milestones:
        milestone_skills = {
            str(s).strip().lower()
            for s in milestone.get("skills", [])
            if isinstance(s, str)
        }

        milestone_projects: List[Dict[str, Any]] = []
        milestone_project_ids: List[str] = []

        if milestone_skills:
            try:
                rec_result = recommend_projects(
                    learner=learner,
                    skill_gaps=skill_gaps,
                    goal=goal,
                    current_milestone_skills=milestone_skills,
                    projects=projects,
                    top_k=len(projects),
                )
                eligible_recs = rec_result.get("recommendations", [])
            except Exception:
                eligible_recs = []

            for rec in eligible_recs:
                pid = str(rec.get("project_id", "")).strip().lower()
                if not pid:
                    continue

                if pid in assigned_project_ids:
                    continue

                proj_dict = rec.get("project")
                if not proj_dict:
                    proj_dict = next((p for p in projects if p.get("id") == pid), {})

                proj_skills = set()
                for sk in proj_dict.get("skills", []):
                    if isinstance(sk, dict) and sk.get("skill_id"):
                        proj_skills.add(str(sk["skill_id"]).strip().lower())

                if pid in completed_projects:
                    continue

                if proj_skills & milestone_skills:
                    milestone_project_ids.append(rec["project_id"])
                    milestone_projects.append(rec)
                    assigned_project_ids.add(pid)
                    break

        milestone["project_ids"] = milestone_project_ids
        milestone["projects"] = milestone_projects

    return milestones


def attach_assessments_to_learning_path(
    milestones: List[Dict[str, Any]],
    learner: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
    goal: str,
    assessments: Optional[List[Dict[str, Any]]] = None,
    courses: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Attach relevant mastery validation assessments to learning path milestones.

    For each milestone, identifies top recommended assessments whose
    skills match the milestone, whose readiness requirements are met
    (including evidence from completed courses), and which have not been
    completed or previously assigned.
    """
    if not milestones:
        return []

    if assessments is None:
        try:
            from app.services.assessment_catalog import load_assessments_catalog
            assessments = load_assessments_catalog()
        except Exception:
            assessments = []

    if not assessments:
        for m in milestones:
            m.setdefault("assessment_ids", [])
            m.setdefault("assessments", [])
        return milestones

    from app.services.assessment_recommendation_engine import recommend_assessments

    effective_learner = dict(learner)
    if courses:
        try:
            from app.services.learning_recommendation_engine import (
                build_effective_skill_levels,
                parse_completed_courses,
            )
            parsed_learner_skills = parse_learner_skills(
                learner.get("skills") or learner.get("acquired_skills")
            )
            completed_cids = parse_completed_courses(
                learner.get("completed_courses") or learner.get("completed_topics")
            )
            eff_levels = build_effective_skill_levels(
                learner_skills=parsed_learner_skills,
                completed_course_ids=completed_cids,
                courses=courses,
            )
            for k, v in parsed_learner_skills.items():
                eff_levels[k] = max(eff_levels.get(k, 0.0), v)
            effective_learner["skills"] = eff_levels
        except Exception:
            pass

    completed_assessments = {
        str(aid).strip().lower()
        for aid in learner.get("completed_assessments", [])
        if isinstance(aid, str)
    }

    assigned_assessment_ids: Set[str] = set()

    for milestone in milestones:
        milestone_skills = {
            str(s).strip().lower()
            for s in milestone.get("skills", [])
            if isinstance(s, str)
        }

        milestone_assessments: List[Dict[str, Any]] = []
        milestone_assessment_ids: List[str] = []

        if milestone_skills:
            try:
                rec_result = recommend_assessments(
                    learner=effective_learner,
                    skill_gaps=skill_gaps,
                    goal=goal,
                    current_milestone_skills=milestone_skills,
                    assessments=assessments,
                    top_k=len(assessments),
                )
                eligible_recs = rec_result.get("recommendations", [])
            except Exception:
                eligible_recs = []

            for rec in eligible_recs:
                aid = str(rec.get("assessment_id", "")).strip().lower()
                if not aid:
                    continue

                if aid in assigned_assessment_ids:
                    continue

                ass_dict = rec.get("assessment")
                if not ass_dict:
                    ass_dict = next(
                        (a for a in assessments if a.get("id") == aid), {}
                    )

                ass_skills = set()
                for sk in ass_dict.get("skills", []):
                    if isinstance(sk, dict) and (sk.get("skill_id") or sk.get("skill")):
                        sid = sk.get("skill_id") or sk.get("skill")
                        ass_skills.add(str(sid).strip().lower())

                if ass_skills & milestone_skills:
                    if aid in completed_assessments:
                        rec["is_completed"] = True
                        rec["status"] = "completed"
                        rec["readiness_state"] = "completed"
                    milestone_assessment_ids.append(rec["assessment_id"])
                    milestone_assessments.append(rec)
                    assigned_assessment_ids.add(aid)
                    break

        milestone["assessment_ids"] = milestone_assessment_ids
        milestone["assessments"] = milestone_assessments

    return milestones


def generate_personalized_learning_path(
    courses: List[Dict[str, Any]],
    learner: Dict[str, Any],
    goal: str,
    skill_gaps: Optional[List[Dict[str, Any]]] = None,
    projects: Optional[List[Dict[str, Any]]] = None,
    assessments: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Generate a complete structured personalized learning path.

    Returns the ordered courses together with milestone groupings, attached projects, and assessments.
    """
    if learner is None:
        learner = {}

    effective_skill_gaps: List[Dict[str, Any]] = []
    goal_requirements_found = False

    if skill_gaps:
        effective_skill_gaps = list(skill_gaps)
        goal_requirements_found = True
    elif goal:
        try:
            from app.services.skill_gap_engine import compute_skill_gaps, parse_goal_requirements
            goal_reqs = parse_goal_requirements(goal)
            if goal_reqs:
                goal_requirements_found = True
            learner_skills = (
                learner.get("skills")
                if learner.get("skills") is not None
                else learner.get("acquired_skills")
            )
            computed_gaps = compute_skill_gaps(
                goal,
                learner_skills,
            )
            if computed_gaps:
                effective_skill_gaps = computed_gaps
        except Exception as err:
            print(f"[LearningPathDiagnostic] Warning resolving skill gaps for goal '{goal}': {err}")

    ordered_courses = select_personalized_course_sequence(
        courses=courses,
        learner=learner,
        goal=goal,
        skill_gaps=effective_skill_gaps,
    )

    completed_course_ids = parse_completed_courses(
        learner.get("completed_courses")
        or learner.get("completed_topics")
    )

    milestones = build_learning_milestones(
        ordered_courses=ordered_courses,
        completed_course_ids=completed_course_ids,
    )

    milestones = attach_projects_to_learning_path(
        milestones=milestones,
        learner=learner,
        skill_gaps=effective_skill_gaps,
        goal=goal,
        projects=projects,
    )

    milestones = attach_assessments_to_learning_path(
        milestones=milestones,
        learner=learner,
        skill_gaps=effective_skill_gaps,
        goal=goal,
        assessments=assessments,
        courses=courses,
    )

    overall_progress = calculate_overall_path_progress(
        milestones
    )

    has_remaining_gaps = any(
        (isinstance(g, dict) and g.get("gap", 0) > 0) or (isinstance(g, str))
        for g in effective_skill_gaps
    )

    if len(ordered_courses) > 0:
        if overall_progress.get("completed_courses", 0) == len(ordered_courses) and len(ordered_courses) > 0:
            path_status = "completed"
            path_reason = f"Learner has satisfied all target skill requirements for '{goal}'."
        else:
            path_status = "active"
            path_reason = None
    elif goal_requirements_found and not has_remaining_gaps:
        path_status = "completed"
        path_reason = f"Learner has satisfied all target skill requirements for '{goal}'."
    else:
        path_status = "no_recommendations"
        path_reason = f"No skill gaps or matching courses could be resolved for '{goal}'."

    print("=== LEARNING PATH DIAGNOSTIC ===")
    print(f"goal: {goal}")
    print(f"input skill_gaps count: {len(skill_gaps) if skill_gaps else 0}")
    print(f"effective skill_gaps count: {len(effective_skill_gaps)}")
    print(f"learner skills: {learner.get('skills') if learner else None}")
    print(f"completed_courses: {learner.get('completed_courses') if learner else None}")
    print(f"selected courses count: {len(ordered_courses)}")
    print(f"milestone count: {len(milestones)}")
    print(f"status: {path_status}")
    print(f"reason: {path_reason}")
    print("================================")

    return {
        "success": True,
        "goal": goal,
        "status": path_status,
        "reason": path_reason,
        "total_courses": len(ordered_courses),
        "total_milestones": len(milestones),
        "courses": ordered_courses,
        "milestones": milestones,
        "progress": overall_progress,
    }




def group_courses_by_target_skill(
    courses: List[Dict[str, Any]],
    target_skills: Set[str],
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group courses by the target skills they directly teach.

    A course may belong to multiple skill groups.
    """
    norm_targets = {normalize_skill_id(s) for s in target_skills if s}

    groups: Dict[str, List[Dict[str, Any]]] = {
        skill: []
        for skill in norm_targets
    }

    for course in courses:
        skill_levels = get_course_skill_levels(course)

        for skill_id in norm_targets:
            if skill_id in skill_levels:
                groups[skill_id].append(course)

    return groups


def select_best_course_for_skill(
    candidates: List[Dict[str, Any]],
    learner: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
    goal: str,
) -> Dict[str, Any] | None:
    """
    Select the highest-ranked course from alternative courses
    that teach the same target skill.

    Uses the existing hybrid recommendation ranking engine.
    """

    if not candidates:
        return None

    ranked = rank_candidates(
        candidates=candidates,
        skill_gaps=skill_gaps,
        learner=learner,
        goal=goal,
    )

    if not ranked:
        return None

    return ranked[0]


def select_best_target_courses(
    courses: List[Dict[str, Any]],
    target_skills: Set[str],
    learner: Dict[str, Any],
    skill_gaps: List[Dict[str, Any]],
    goal: str,
) -> Set[str]:
    """
    Select the best course for each target skill using the
    existing hybrid recommendation ranking.

    Returns the IDs of selected target courses.
    """
    norm_target_skills = {normalize_skill_id(s) for s in target_skills if s}

    grouped_courses = group_courses_by_target_skill(
        courses,
        norm_target_skills,
    )

    selected_ids: Set[str] = set()

    for skill_id, candidates in grouped_courses.items():
        if not candidates:
            continue

        # Only consider courses that actually teach enough
        # of the target skill to satisfy the learner's target.
        relevant_gap = next(
            (
                gap
                for gap in skill_gaps
                if (
                    gap.get("skillId")
                    or gap.get("skill_id")
                    or gap.get("name")
                    or gap.get("skillName")
                    or gap.get("display_name")
                )
                and normalize_skill_id(
                    str(
                        gap.get("skillId")
                        or gap.get("skill_id")
                        or gap.get("name")
                        or gap.get("skillName")
                        or gap.get("display_name")
                    )
                ) == skill_id
            ),
            None,
        )

        if relevant_gap:
            target_level = relevant_gap.get("target_level")

            if target_level is None:
                target_level = relevant_gap.get("targetLevel")

            try:
                target_level = float(target_level)
            except (TypeError, ValueError):
                target_level = None

            if target_level is not None:
                matching = [
                    course
                    for course in candidates
                    if get_course_skill_levels(course).get(
                        skill_id,
                        0.0,
                    ) >= target_level
                ]
                if matching:
                    candidates = matching

        best = select_best_course_for_skill(
            candidates=candidates,
            learner=learner,
            skill_gaps=skill_gaps,
            goal=goal,
        )

        if best and best.get("id"):
            selected_ids.add(best["id"])

    return selected_ids







