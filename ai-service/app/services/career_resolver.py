import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
ALIASES_PATH = DATA_DIR / "aliases.json"
DOMAINS_PATH = DATA_DIR / "domains.json"

# Central Career Dataset Registry
CAREER_DATASET_REGISTRY: Dict[str, Dict[str, Any]] = {}


def normalize_career_input(target_career: str) -> str:
    """Normalize input career string for alias and canonical matching."""
    if not target_career or not isinstance(target_career, str):
        return ""
    clean = target_career.strip().lower()
    clean = clean.replace('-', ' ')
    clean = re.sub(r'[^a-z0-9\s]+', '', clean)
    clean = re.sub(
        r'^(become\s+an?\s+|become\s+|master\s+|learn\s+|study\s+|path\s+to\s+|how\s+to\s+become\s+an?\s+|how\s+to\s+become\s+)',
        '',
        clean
    ).strip()
    return re.sub(r'\s+', ' ', clean).strip()


def calculate_dataset_quality_score(graph_data: Dict[str, Any], json_path: Path) -> int:
    """
    Evaluate authoritativeness and graph quality of a career dataset JSON file.
    Higher score indicates a richer, canonical prerequisite graph.
    """
    score = 0
    parent_dir = json_path.parent.name.lower()
    
    nodes = graph_data.get("nodes", [])
    skills = graph_data.get("skills", [])
    edges = graph_data.get("edges", [])
    prereqs = graph_data.get("prerequisites", [])

    # Prefer technical directory explicit graphs
    if parent_dir == "technical":
        score += 60

    # Prefer Schema A with real named node IDs (not node_1, node_2)
    if nodes and isinstance(nodes, list):
        score += len(nodes) * 2
        real_ids = [n.get("id") or n.get("nodeId") for n in nodes if (n.get("id") or n.get("nodeId"))]
        non_generic_ids = [nid for nid in real_ids if nid and not re.match(r'^node_\d+$', str(nid))]
        if non_generic_ids:
            score += 100

    # Score Schema B with valid skill prerequisites
    if skills and isinstance(skills, list):
        score += len(skills) * 3
    if prereqs and isinstance(prereqs, list):
        score += len(prereqs) * 5

    if edges and isinstance(edges, list):
        score += len(edges) * 3

    # Deduct score for sequential generic node_1 -> node_2 linear structures
    if nodes and len(nodes) == 10:
        first_id = nodes[0].get("id", "")
        if first_id == "node_1":
            score -= 80

    return score


def build_career_dataset_registry() -> Dict[str, Dict[str, Any]]:
    """
    Discover all career dataset JSON files under app/data/careers and register canonical careerIds.
    Deterministically resolves duplicate datasets by selecting the highest-quality authoritative graph.
    Logs all successfully registered careers.
    """
    registry: Dict[str, Dict[str, Any]] = {}
    candidates: Dict[str, List[Tuple[Path, Dict[str, Any], int]]] = {}
    careers_base = DATA_DIR / "careers"

    if careers_base.exists():
        for json_path in careers_base.rglob("*.json"):
            try:
                content = json_path.read_text(encoding="utf-8")
                graph_data = json.loads(content)
                cid = (
                    graph_data.get("careerId")
                    or graph_data.get("career_id")
                    or graph_data.get("id")
                    or json_path.stem
                )
                cid_norm = str(cid).strip().lower().replace('_', '-')
                
                # Standardize common alias slug mismatches
                if cid_norm == "fullstack-developer":
                    cid_norm = "full-stack-developer"
                elif cid_norm == "mobile-developer":
                    cid_norm = "mobile-app-developer"
                elif cid_norm == "cybersecurity-analyst":
                    cid_norm = "security-analyst"

                score = calculate_dataset_quality_score(graph_data, json_path)
                candidates.setdefault(cid_norm, []).append((json_path, graph_data, score))
            except Exception as err:
                print(f"[CAREER_DATASET_ERROR] Failed loading {json_path}: {err}")

    for cid_norm, cand_list in candidates.items():
        # Sort candidates descending by quality score
        cand_list.sort(key=lambda x: x[2], reverse=True)
        best_path, best_data, best_score = cand_list[0]

        title = best_data.get("title") or cid_norm.replace("-", " ").title()
        domain = best_data.get("domain") or best_path.parent.name
        node_count = len(best_data.get("nodes", [])) or len(best_data.get("skills", []))

        registry[cid_norm] = {
            "careerId": cid_norm,
            "title": title,
            "domain": domain,
            "filepath": best_path,
            "available": True,
            "nodeCount": node_count,
            "score": best_score,
            "graph_data": best_data
        }

        if len(cand_list) > 1:
            other_paths = [str(p[0].relative_to(careers_base)) for p in cand_list[1:]]
            print(f"[CAREER_REGISTRY] Canonical '{cid_norm}' resolved to {best_path.relative_to(careers_base)} (score={best_score}), ignoring duplicate candidates: {', '.join(other_paths)}")

    loaded = sorted(list(registry.keys()))
    print(f"[CAREER_DATASET] Loaded {len(loaded)} canonical careers: {', '.join(loaded)}")
    return registry


# Build registry at module load
CAREER_DATASET_REGISTRY = build_career_dataset_registry()


def get_alias_map() -> Dict[str, str]:
    alias_lookup = {}
    if ALIASES_PATH.exists():
        try:
            raw_aliases = json.loads(ALIASES_PATH.read_text(encoding="utf-8"))
            for alias, canonical_id in raw_aliases.items():
                alias_lookup[normalize_career_input(alias)] = canonical_id.strip().lower()
        except Exception as e:
            print(f"[CareerResolver] Error reading aliases.json: {e}")
    return alias_lookup


def get_registered_careers() -> List[Dict[str, Any]]:
    """Returns metadata for all registered careers in the dataset registry."""
    return [
        {
            "careerId": info["careerId"],
            "title": info["title"],
            "domain": info["domain"],
            "roadmapAvailable": info["available"]
        }
        for info in CAREER_DATASET_REGISTRY.values()
    ]


def resolve_target_career(target_career_input: str) -> Dict[str, Any]:
    """
    Authoritatively resolve requested target career to canonical career ID and JSON graph dataset.
    Returns structured CAREER_NOT_SUPPORTED error if dataset does not exist.
    """
    raw_input = (target_career_input or "").strip()
    clean_input = normalize_career_input(raw_input)

    if not clean_input:
        return {
            "success": False,
            "code": "CAREER_NOT_SUPPORTED",
            "error": "CAREER_NOT_SUPPORTED",
            "message": "Target career input is empty.",
            "requested_career": raw_input,
            "resolved_career": None,
            "career_id": None,
            "domain": None,
            "resolution_method": "not_found",
            "confidence": 0.0,
            "graph_data": None
        }

    alias_map = get_alias_map()
    canonical_id: Optional[str] = None
    res_method = "not_found"
    confidence = 0.0

    # 1. Check exact canonical ID match in registry
    slug_input = clean_input.replace(' ', '-')
    if slug_input in CAREER_DATASET_REGISTRY:
        canonical_id = slug_input
        res_method = "exact_canonical"
        confidence = 1.0

    # 2. Check alias map
    if not canonical_id and clean_input in alias_map:
        alias_target = alias_map[clean_input]
        if alias_target in CAREER_DATASET_REGISTRY:
            canonical_id = alias_target
            res_method = "alias"
            confidence = 0.95

    # 3. Substring match against aliases or registered titles
    if not canonical_id:
        for alias, c_id in alias_map.items():
            if (clean_input in alias or alias in clean_input) and c_id in CAREER_DATASET_REGISTRY:
                canonical_id = c_id
                res_method = "alias_substring"
                confidence = 0.85
                break

    if not canonical_id:
        for cid, info in CAREER_DATASET_REGISTRY.items():
            norm_title = normalize_career_input(info["title"])
            if clean_input in norm_title or norm_title in clean_input:
                canonical_id = cid
                res_method = "title_substring"
                confidence = 0.85
                break

    # 4. Fallback slug lookup in registry
    if not canonical_id:
        if slug_input in CAREER_DATASET_REGISTRY:
            canonical_id = slug_input
            res_method = "slug"
            confidence = 0.80

    registry_info = CAREER_DATASET_REGISTRY.get(canonical_id) if canonical_id else None
    if not registry_info or not registry_info.get("filepath"):
        print(f"[CAREER_NOT_SUPPORTED] requested='{raw_input}' clean='{clean_input}' resolved_canonical='{canonical_id}'")
        return {
            "success": False,
            "code": "CAREER_NOT_SUPPORTED",
            "error": "CAREER_NOT_SUPPORTED",
            "message": f"No roadmap dataset exists for career '{raw_input}'.",
            "requested_career": raw_input,
            "resolved_career": None,
            "career_id": canonical_id,
            "domain": None,
            "resolution_method": res_method,
            "confidence": 0.0,
            "graph_data": None
        }

    try:
        matched_file: Path = registry_info["filepath"]
        graph_data = registry_info.get("graph_data") or json.loads(matched_file.read_text(encoding="utf-8"))
        title = graph_data.get("title") or registry_info["title"]
        domain = graph_data.get("domain") or registry_info["domain"]

        print(f"[CAREER_RESOLVED] input='{raw_input}' canonicalCareerId='{canonical_id}' title='{title}' path='{matched_file}'")

        return {
            "success": True,
            "requested_career": raw_input,
            "resolved_career": title,
            "careerTitle": title,
            "careerId": canonical_id,
            "career_id": canonical_id,
            "domain": domain,
            "source_provider": "domain-dataset",
            "resolution_method": res_method,
            "confidence": confidence,
            "graph_data": graph_data
        }
    except Exception as err:
        return {
            "success": False,
            "code": "ROADMAP_DATASET_INCOMPLETE",
            "error": "ROADMAP_DATASET_INCOMPLETE",
            "message": f"Error parsing graph dataset for '{canonical_id}': {err}",
            "requested_career": raw_input,
            "resolved_career": None,
            "career_id": canonical_id,
            "domain": None,
            "resolution_method": res_method,
            "confidence": 0.0,
            "graph_data": None
        }

