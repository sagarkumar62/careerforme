from typing import Dict, List, Any, Set, Tuple, Optional
from app.services.career_resolver import resolve_target_career, normalize_career_input
from app.utils.normalization import normalize_profile_skills, _parse_level, normalize_skill_id, normalize_skill_name


def _slugify_id(text: str) -> str:
    if not text:
        return ""
    clean = str(text).strip().lower()
    clean = clean.replace(" ", "-").replace("_", "-")
    return clean.strip("-")


def generate_roadmap_structure(profile: Dict[str, Any], target_career_input: str) -> Dict[str, Any]:
    """
    Authoritative Dependency-Aware Career Roadmap Engine.
    
    Architecture:
    1. Resolves canonical career dataset deterministically.
    2. Normalizes Schema A (nodes/edges) and Schema B (skills/prerequisites) into uniform contract.
    3. Resolves prerequisite references (IDs or titles) to canonical node IDs.
    4. Validates DAG and runs Kahn's Topological Sort.
    5. Calculates exact Topological Depth for every node.
    6. Assigns Semantic 4 Curriculum Phases (Foundation, Core, Intermediate/Advanced, Capstone).
    7. Enforces Prerequisite Phase Safety (phase(target) >= phase(prerequisite)).
    8. Orders nodes inside each phase topologically.
    9. Validates final global roadmap order (source index < target index and phase(source) <= phase(target)).
    10. Personalizes status (MASTERED, NEEDS_WORK, MISSING, RECOMMENDED, LOCKED) while PRESERVING MASTERED nodes in the graph.
    """
    clean_req = normalize_career_input(target_career_input)
    profile = normalize_profile_skills(profile if isinstance(profile, dict) else {})
    user_skills = profile.get("skills", [])
    
    user_skill_map = {}
    for s in user_skills:
        if isinstance(s, dict) and "name" in s:
            name_key = s["name"].lower()
            sid_key = s.get("skill_id", "").lower()
            lvl = _parse_level(s.get("level"))
            user_skill_map[name_key] = max(user_skill_map.get(name_key, 0), lvl)
            if sid_key:
                user_skill_map[sid_key] = max(user_skill_map.get(sid_key, 0), lvl)

    weekly_hours = int(profile.get("weekly_hours") or profile.get("weeklyHours") or 10)

    # 1. Authoritative Career Resolution
    res = resolve_target_career(target_career_input)

    print(f"[ROADMAP_ENGINE] Input: '{target_career_input}' -> Resolved: '{res.get('resolved_career')}' (id: '{res.get('career_id')}')")

    if not res.get("success") or not res.get("graph_data"):
        return {
            "success": False,
            "code": res.get("code") or "CAREER_NOT_SUPPORTED",
            "error": res.get("error") or "CAREER_NOT_SUPPORTED",
            "message": res.get("message") or f"No roadmap dataset exists for career '{target_career_input}'.",
            "careerId": None,
            "careerTitle": None
        }

    graph_data = res["graph_data"]

    # 2. Dataset Schema Normalization (Schema A vs Schema B)
    raw_nodes_list = graph_data.get("nodes") or []
    raw_skills_list = graph_data.get("skills") or []
    raw_edges_list = graph_data.get("edges") or []
    raw_prereqs_list = graph_data.get("prerequisites") or []

    normalized_nodes_map: Dict[str, Dict[str, Any]] = {}
    title_to_id_map: Dict[str, str] = {}

    if raw_nodes_list:
        for idx, n in enumerate(raw_nodes_list):
            nid = str(n.get("id") or n.get("nodeId") or f"node_{idx+1}").strip()
            title = str(n.get("title") or n.get("name") or nid).strip()
            explicit_type = str(n.get("type") or "").strip().lower()
            req_lvl = int(n.get("requiredLevel") or n.get("recommended_level") or 4)
            est_hrs = int(n.get("estimatedHours") or n.get("duration_hours") or 20)
            desc = str(n.get("description") or f"Master {title} for {res.get('resolved_career')}.").strip()
            prereqs = list(n.get("prerequisites") or [])

            normalized_nodes_map[nid] = {
                "id": nid,
                "nodeId": nid,
                "title": title,
                "type": explicit_type,
                "description": desc,
                "requiredLevel": req_lvl,
                "estimatedHours": est_hrs,
                "prerequisites": prereqs
            }
            title_to_id_map[title.lower()] = nid
            title_to_id_map[_slugify_id(title)] = nid
            title_to_id_map[nid.lower()] = nid
    elif raw_skills_list:
        for idx, s in enumerate(raw_skills_list):
            sid = str(s.get("id") or s.get("skillId") or f"skill_{idx+1}").strip()
            title = str(s.get("name") or s.get("title") or sid).strip()
            phase_num = int(s.get("phase", 1))
            node_type = "foundation" if phase_num == 1 else ("core" if phase_num == 2 else ("intermediate" if phase_num == 3 else "capstone"))
            req_lvl = int(s.get("required_level") or s.get("requiredLevel") or 4)
            est_hrs = int(s.get("estimatedHours") or 20)
            desc = str(s.get("description") or f"Master {title} for {res.get('resolved_career')}.").strip()

            normalized_nodes_map[sid] = {
                "id": sid,
                "nodeId": sid,
                "title": title,
                "type": node_type,
                "description": desc,
                "requiredLevel": req_lvl,
                "estimatedHours": est_hrs,
                "prerequisites": []
            }
            title_to_id_map[title.lower()] = sid
            title_to_id_map[_slugify_id(title)] = sid
            title_to_id_map[sid.lower()] = sid

        # Process Schema B prerequisites array [ [src, tgt], ... ]
        for p_pair in raw_prereqs_list:
            if isinstance(p_pair, list) and len(p_pair) == 2:
                src_str, tgt_str = str(p_pair[0]).strip(), str(p_pair[1]).strip()
                src_id = title_to_id_map.get(src_str.lower(), title_to_id_map.get(_slugify_id(src_str), src_str))
                tgt_id = title_to_id_map.get(tgt_str.lower(), title_to_id_map.get(_slugify_id(tgt_str), tgt_str))
                if tgt_id in normalized_nodes_map and src_id in normalized_nodes_map:
                    if src_id not in normalized_nodes_map[tgt_id]["prerequisites"]:
                        normalized_nodes_map[tgt_id]["prerequisites"].append(src_id)

    if not normalized_nodes_map:
        return {
            "success": False,
            "code": "ROADMAP_DATASET_EMPTY",
            "error": "ROADMAP_DATASET_EMPTY",
            "message": f"Career dataset for '{target_career_input}' contains no nodes or skills.",
            "careerId": res.get("career_id"),
            "careerTitle": res.get("resolved_career")
        }

    # 3. Resolve Prerequisite References to Canonical Node IDs
    dataset_validation_errors = []
    for nid, node in normalized_nodes_map.items():
        resolved_prereqs: List[str] = []
        for p in node["prerequisites"]:
            p_str = str(p).strip()
            p_id = (
                title_to_id_map.get(p_str.lower())
                or title_to_id_map.get(_slugify_id(p_str))
                or (p_str if p_str in normalized_nodes_map else None)
            )
            if p_id and p_id in normalized_nodes_map:
                if p_id != nid and p_id not in resolved_prereqs:
                    resolved_prereqs.append(p_id)
            else:
                dataset_validation_errors.append({
                    "code": "INVALID_PREREQUISITE",
                    "nodeId": nid,
                    "prerequisite": p_str
                })
                print(f"[DATASET_WARNING] Node '{nid}' has unresolvable prerequisite '{p_str}' in '{res.get('career_id')}'")
        node["prerequisites"] = resolved_prereqs

    # 4. Construct Real DAG Edges & Kahn's Topological Sort
    all_node_ids = list(normalized_nodes_map.keys())
    in_degree: Dict[str, int] = {nid: 0 for nid in all_node_ids}
    adj: Dict[str, List[str]] = {nid: [] for nid in all_node_ids}
    all_edges: List[Dict[str, Any]] = []
    seen_edge_keys: Set[Tuple[str, str]] = set()

    # Build adjacency from normalized prerequisites
    for nid, node in normalized_nodes_map.items():
        for p_id in node["prerequisites"]:
            adj[p_id].append(nid)
            in_degree[nid] += 1
            edge_key = (p_id, nid)
            if edge_key not in seen_edge_keys:
                seen_edge_keys.add(edge_key)
                all_edges.append({
                    "id": f"edge_{p_id}_{nid}",
                    "source": p_id,
                    "target": nid,
                    "from": p_id,
                    "to": nid,
                    "type": "prerequisite"
                })

    # Additional explicit raw edges if provided
    for e in raw_edges_list:
        src = str(e.get("source") or e.get("from") or "").strip()
        tgt = str(e.get("target") or e.get("to") or "").strip()
        src_id = title_to_id_map.get(src.lower(), src)
        tgt_id = title_to_id_map.get(tgt.lower(), tgt)

        if src_id in normalized_nodes_map and tgt_id in normalized_nodes_map and src_id != tgt_id:
            edge_key = (src_id, tgt_id)
            if edge_key not in seen_edge_keys:
                seen_edge_keys.add(edge_key)
                adj[src_id].append(tgt_id)
                in_degree[tgt_id] += 1
                if src_id not in normalized_nodes_map[tgt_id]["prerequisites"]:
                    normalized_nodes_map[tgt_id]["prerequisites"].append(src_id)
                all_edges.append({
                    "id": f"edge_{src_id}_{tgt_id}",
                    "source": src_id,
                    "target": tgt_id,
                    "from": src_id,
                    "to": tgt_id,
                    "type": "prerequisite"
                })

    # Kahn's Algorithm
    queue = [nid for nid in all_node_ids if in_degree[nid] == 0]
    topological_order: List[str] = []

    while queue:
        curr = queue.pop(0)
        topological_order.append(curr)
        for neighbor in adj[curr]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(topological_order) < len(all_node_ids):
        print(f"[ROADMAP_ERROR] Cycle detected in career '{res.get('career_id')}'. Visited {len(topological_order)}/{len(all_node_ids)} nodes.")
        return {
            "success": False,
            "code": "INVALID_DAG_CYCLE",
            "error": "INVALID_DAG_CYCLE",
            "message": f"Cycle detected in prerequisite graph for career '{target_career_input}'.",
            "careerId": res.get("career_id"),
            "careerTitle": res.get("resolved_career")
        }

    # 5. Topological Depth Calculation
    depth_map: Dict[str, int] = {}
    for nid in topological_order:
        node = normalized_nodes_map[nid]
        prereqs = node["prerequisites"]
        if not prereqs:
            depth_map[nid] = 0
        else:
            max_p_depth = max([depth_map.get(p, 0) for p in prereqs], default=0)
            depth_map[nid] = max_p_depth + 1

    # 6. Semantic Phase Classification
    def initial_phase_assignment(node: Dict[str, Any], depth: int) -> int:
        explicit_type = str(node.get("type") or "").strip().lower()
        if explicit_type == "foundation":
            return 1
        if explicit_type == "core":
            return 2
        if explicit_type in ("intermediate", "advanced"):
            return 3
        if explicit_type == "capstone":
            return 4

        # Keyword heuristics fallback if type not explicitly specified
        t_lower = node["title"].lower()
        if any(w in t_lower for w in ["capstone", "portfolio", "production project", "full stack application", "career readiness"]):
            return 4
        if depth == 0 or any(w in t_lower for w in ["html", "css", "basic", "fundamental", "introduction", "git", "cli", "math", "linux"]):
            return 1
        if depth == 1 or any(w in t_lower for w in ["react", "node", "express", "sql", "database", "pandas", "sklearn", "rest api"]):
            return 2
        
        return 1 if depth == 0 else (2 if depth == 1 else (3 if depth == 2 else 4))

    phase_map: Dict[str, int] = {}
    for nid in topological_order:
        phase_map[nid] = initial_phase_assignment(normalized_nodes_map[nid], depth_map[nid])

    # 7. Prerequisite Phase Safety Elevation (phase(target) >= phase(prerequisite))
    for nid in topological_order:
        node = normalized_nodes_map[nid]
        for p_id in node["prerequisites"]:
            if phase_map[nid] < phase_map[p_id]:
                print(f"[PHASE_ELEVATION] Node '{nid}' phase elevated from {phase_map[nid]} to {phase_map[p_id]} to satisfy prerequisite '{p_id}'.")
                phase_map[nid] = phase_map[p_id]

    # 8. Order Nodes Inside Each Phase Topologically
    phase_buckets: Dict[int, List[Dict[str, Any]]] = {1: [], 2: [], 3: [], 4: []}
    for nid in topological_order:
        p_num = phase_map[nid]
        phase_buckets[p_num].append(normalized_nodes_map[nid])

    # 9. Global Order Assembly & Final Validation
    global_ordered_nodes: List[Dict[str, Any]] = (
        phase_buckets[1] + phase_buckets[2] + phase_buckets[3] + phase_buckets[4]
    )

    global_index_lookup = {n["id"]: idx for idx, n in enumerate(global_ordered_nodes)}

    order_valid = True
    order_violations = []

    for edge in all_edges:
        src = edge["source"]
        tgt = edge["target"]
        src_idx = global_index_lookup.get(src)
        tgt_idx = global_index_lookup.get(tgt)

        if src_idx is None or tgt_idx is None:
            order_valid = False
            order_violations.append(f"Missing edge node: {src} -> {tgt}")
            continue

        if src_idx >= tgt_idx:
            order_valid = False
            order_violations.append(f"Topological order violated: '{src}' (idx {src_idx}) occurs after dependent '{tgt}' (idx {tgt_idx})")

        if phase_map[src] > phase_map[tgt]:
            order_valid = False
            order_violations.append(f"Phase ordering violated: '{src}' (Phase {phase_map[src]}) occurs after dependent '{tgt}' (Phase {phase_map[tgt]})")

    if not order_valid:
        print(f"[ROADMAP_ERROR] Order validation failed: {order_violations}")
        return {
            "success": False,
            "code": "ROADMAP_ORDER_INVALID",
            "error": "ROADMAP_ORDER_INVALID",
            "message": f"Global topological order validation failed for career '{target_career_input}': {', '.join(order_violations[:3])}",
            "careerId": res.get("career_id"),
            "careerTitle": res.get("resolved_career")
        }

    # 10. Learner Skill Personalization & Preserve MASTERED Nodes
    mastered_ids: Set[str] = set()

    for n in global_ordered_nodes:
        nid = n["id"]
        n_title = n["title"]
        req_lvl = n["requiredLevel"]
        
        user_lvl = user_skill_map.get(n_title.lower(), user_skill_map.get(nid.lower(), 0))
        if user_lvl >= req_lvl:
            mastered_ids.add(nid)

    personalized_nodes: List[Dict[str, Any]] = []

    for idx, n in enumerate(global_ordered_nodes):
        nid = n["id"]
        n_title = n["title"]
        req_lvl = n["requiredLevel"]
        user_lvl = user_skill_map.get(n_title.lower(), user_skill_map.get(nid.lower(), 0))
        gap = max(0, req_lvl - user_lvl)

        if user_lvl >= req_lvl:
            status = "MASTERED"
            learning_required = False
            priority = "LOW"
            est_hours = 0
        elif user_lvl > 0:
            status = "NEEDS_WORK"
            learning_required = True
            priority = "MEDIUM"
            est_hours = max(5, gap * 15)
        else:
            status = "MISSING"
            learning_required = True
            priority = "HIGH"
            est_hours = max(10, req_lvl * 10)

        prereqs = n["prerequisites"]
        prereqs_met = all(p in mastered_ids for p in prereqs)
        access_state = "RECOMMENDED" if (prereqs_met or status == "MASTERED") else "LOCKED"

        p_num = phase_map[nid]
        phase_names = {
            1: "Foundation",
            2: "Core",
            3: "Intermediate / Advanced",
            4: "Capstone / Production"
        }
        eff_type = "foundation" if p_num == 1 else ("core" if p_num == 2 else ("intermediate" if p_num == 3 else "capstone"))

        p_node = dict(n)
        p_node.update({
            "nodeId": nid,
            "id": nid,
            "title": n_title,
            "phase": p_num,
            "phaseName": phase_names[p_num],
            "type": eff_type,
            "effectiveType": eff_type,
            "topologicalOrder": idx + 1,
            "topologicalDepth": depth_map.get(nid, 0),
            "userLevel": user_lvl,
            "requiredLevel": req_lvl,
            "skillGap": gap,
            "priority": priority,
            "status": status,
            "accessState": access_state,
            "learningRequired": learning_required,
            "stateLabel": status,
            "estimatedHours": est_hours
        })
        personalized_nodes.append(p_node)

    missing_titles = [n["title"] for n in personalized_nodes if n["status"] == "MISSING"]
    needs_work_titles = [n["title"] for n in personalized_nodes if n["status"] == "NEEDS_WORK"]

    # 11. Build Structured 4-Phase Response Contract
    def build_phase_payload(p_num: int, phase_id: str, title: str, desc: str, p_nodes: List[Dict[str, Any]], prereqs: List[str]) -> Dict[str, Any]:
        node_titles = [n["title"] for n in p_nodes]
        milestones = []
        for m_idx, n in enumerate(p_nodes, start=1):
            milestones.append({
                "milestoneId": f"m_{phase_id}_{m_idx}",
                "title": n["title"],
                "description": n.get("description", f"Master {n['title']} competencies."),
                "estimatedHours": n.get("estimatedHours", 20),
                "completed": n["status"] == "MASTERED",
                "status": n["status"],
                "accessState": n.get("accessState", "RECOMMENDED"),
                "targetSkill": n["title"],
                "order": m_idx
            })

        raw_phases = graph_data.get("phases", [])
        matched_raw_phase = next((p for p in raw_phases if p.get("phaseId") == phase_id or str(p.get("title")).startswith(f"Phase {p_num}")), None)
        phase_resources = matched_raw_phase.get("resources", []) if matched_raw_phase else []

        if not phase_resources:
            primary_topic = node_titles[0] if node_titles else title
            query_topic = primary_topic.replace(" ", "+")
            phase_resources = [
                {
                    "title": f"Complete {primary_topic} Video Guide & Masterclass",
                    "type": "Video",
                    "provider": "YouTube / freeCodeCamp",
                    "url": f"https://www.youtube.com/results?search_query={query_topic}+tutorial+full+course",
                    "videoUrl": f"https://www.youtube.com/results?search_query={query_topic}+tutorial+full+course",
                    "duration": "45 mins",
                    "rating": 4.8,
                    "access": "Free"
                },
                {
                    "title": f"{primary_topic} Official Documentation & Reference",
                    "type": "Documentation",
                    "provider": "MDN / Official Docs",
                    "url": f"https://www.google.com/search?q={query_topic}+official+documentation",
                    "duration": "30 mins",
                    "rating": 4.9,
                    "access": "Free"
                },
                {
                    "title": f"Hands-on {primary_topic} Project & Exercises",
                    "type": "Project",
                    "provider": "GitHub / LeetCode",
                    "url": f"https://github.com/topics/{primary_topic.lower().replace(' ', '-')}",
                    "duration": "2 hours",
                    "rating": 4.7,
                    "access": "Free"
                }
            ]

        for r in phase_resources:
            if r.get("type") in ("Video", "Course") and not r.get("videoUrl"):
                r["videoUrl"] = r.get("url")

        return {
            "phaseId": phase_id,
            "id": phase_id,
            "order": p_num,
            "title": title,
            "description": desc,
            "skills": node_titles,
            "prerequisites": prereqs,
            "progressPercent": 0,
            "milestones": milestones,
            "resources": phase_resources,
            "nodes": p_nodes
        }

    p1_nodes = [n for n in personalized_nodes if n["phase"] == 1]
    p2_nodes = [n for n in personalized_nodes if n["phase"] == 2]
    p3_nodes = [n for n in personalized_nodes if n["phase"] == 3]
    p4_nodes = [n for n in personalized_nodes if n["phase"] == 4]

    phases_payload = [
        build_phase_payload(1, "phase-1", f"Phase 1: Foundations for {res['resolved_career']}", "Build foundational domain topics and baseline prerequisites.", p1_nodes, []),
        build_phase_payload(2, "phase-2", f"Phase 2: Core Technical & Professional Mastery", "Develop core technical capabilities and practical workflows.", p2_nodes, ["phase-1"]),
        build_phase_payload(3, "phase-3", f"Phase 3: Advanced Specialization", "Master specialized domain protocols and advanced techniques.", p3_nodes, ["phase-2"]),
        build_phase_payload(4, "phase-4", f"Phase 4: Capstone & Career Readiness", "Complete practical projects and prepare for career placement.", p4_nodes, ["phase-3"])
    ]

    total_hours = sum(n["estimatedHours"] for n in personalized_nodes if n["learningRequired"])
    if total_hours == 0:
        total_hours = 40

    duration_months = max(1, round(total_hours / (weekly_hours * 4)))

    print(f"[ROADMAP_SUCCESS] careerId='{res['career_id']}' nodes={len(personalized_nodes)} edges={len(all_edges)} p1={len(p1_nodes)} p2={len(p2_nodes)} p3={len(p3_nodes)} p4={len(p4_nodes)} dagValid=True orderValid=True")

    return {
        "success": True,
        "requested_career": target_career_input,
        "resolved_career": res["resolved_career"],
        "career_id": res["career_id"],
        "domain": res["domain"],
        "source_provider": res["source_provider"],
        "resolution_method": res["resolution_method"],
        "confidence": res["confidence"],
        "careerId": res["career_id"],
        "careerTitle": res["resolved_career"],
        "matchScore": 90,
        "duration": duration_months,
        "durationUnit": "Months",
        "weeklyHours": weekly_hours,
        "estimatedHours": total_hours,
        "nodes": personalized_nodes,
        "edges": all_edges,
        "missingSkills": missing_titles,
        "needsWorkSkills": needs_work_titles,
        "phases": phases_payload,
        "validation": {
            "isDag": True,
            "hasMissingPrerequisites": len(dataset_validation_errors) > 0,
            "hasCycles": False,
            "orderValid": True,
            "datasetValidationErrors": dataset_validation_errors
        }
    }


def adapt_roadmap_structure(profile: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Adaptive Roadmap Engine.
    Adapts an existing roadmap based on completed milestones, missed milestones,
    progress percentage, learning velocity, and updated user skill levels.
    """
    target_career = (
        payload.get("target_career")
        or payload.get("careerTitle")
        or payload.get("careerId")
        or (profile.get("target_career") if isinstance(profile, dict) else "")
        or (profile.get("targetCareerGoal") if isinstance(profile, dict) else "")
    )
    if not target_career:
        return {
            "success": False,
            "code": "CAREER_NOT_SUPPORTED",
            "message": "Target career parameter is missing."
        }

    completed_milestones = set(payload.get("completed_milestones") or [])
    missed_milestones = set(payload.get("missed_milestones") or [])
    progress_percent = float(payload.get("progress_percentage") or payload.get("progressPercent") or 0)
    
    base_roadmap = generate_roadmap_structure(profile, target_career)
    if not base_roadmap.get("success"):
        return base_roadmap

    phases = base_roadmap.get("phases", [])
    removed_topics = []
    inserted_milestones = []
    adaptation_mode = "NORMAL"

    if len(missed_milestones) > 2 or progress_percent < 20:
        adaptation_mode = "REVISED_REINFORCEMENT"
        for p in phases:
            if p.get("progressPercent", 0) < 100:
                p["milestones"].insert(0, {
                    "milestoneId": f"m_revision_{p['phaseId']}",
                    "title": "Prerequisite Review & Practice Milestone",
                    "description": "Reinforce foundational concepts through targeted hands-on coding exercises.",
                    "estimatedHours": 10,
                    "completed": False,
                    "targetSkill": "Foundational Practice",
                    "order": 1
                })
                inserted_milestones.append("Prerequisite Review & Practice Milestone")
                break
    elif progress_percent > 60 or len(completed_milestones) >= 5:
        adaptation_mode = "ACCELERATED"
        for p in phases:
            filtered_milestones = []
            for m in p["milestones"]:
                if m.get("completed") or m.get("milestoneId") in completed_milestones:
                    removed_topics.append(m["title"])
                else:
                    filtered_milestones.append(m)
            p["milestones"] = filtered_milestones if filtered_milestones else p["milestones"]

    newly_recommended = "Advanced Capstone Specialization" if adaptation_mode == "ACCELERATED" else "Core Fundamentals Revision"

    return {
        "success": True,
        "adaptationMode": adaptation_mode,
        "targetCareer": target_career,
        "progressPercentage": progress_percent,
        "newlyRecommendedSkill": newly_recommended,
        "removedTopics": removed_topics,
        "insertedMilestones": inserted_milestones,
        "adaptedRoadmap": base_roadmap
    }
