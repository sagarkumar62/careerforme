import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
ALIASES_PATH = DATA_DIR / "aliases.json"
DOMAINS_PATH = DATA_DIR / "domains.json"


def normalize_career_input(target_career: str) -> str:
    if not target_career or not isinstance(target_career, str):
        return ""
    clean = target_career.strip().lower()
    clean = clean.replace('-', ' ')
    clean = re.sub(r'[^a-z0-9\s]+', '', clean)
    clean = re.sub(r'^(become\s+an?\s+|become\s+|master\s+|learn\s+|study\s+|path\s+to\s+|how\s+to\s+become\s+an?\s+|how\s+to\s+become\s+)', '', clean).strip()
    return re.sub(r'\s+', ' ', clean).strip()


def get_alias_map() -> Dict[str, str]:
    alias_lookup = {}
    if ALIASES_PATH.exists():
        try:
            raw_aliases = json.loads(ALIASES_PATH.read_text(encoding="utf-8"))
            for alias, canonical_id in raw_aliases.items():
                alias_lookup[normalize_career_input(alias)] = canonical_id
        except Exception as e:
            print(f"[CareerResolver] Error reading aliases.json: {e}")
    return alias_lookup


def resolve_target_career(target_career_input: str) -> Dict[str, Any]:
    raw_input = (target_career_input or "").strip()
    clean_input = normalize_career_input(raw_input)

    if not clean_input:
        return {
            "success": False,
            "error": "CAREER_NOT_SUPPORTED",
            "message": "Career input is empty.",
            "requested_career": raw_input,
            "resolved_career": None,
            "career_id": None,
            "domain": None,
            "resolution_method": "not_found",
            "confidence": 0.0,
            "graph_data": None
        }

    alias_map = get_alias_map()
    canonical_id = None
    res_method = "not_found"
    confidence = 0.0

    # 1. Alias & Exact Match
    if clean_input in alias_map:
        canonical_id = alias_map[clean_input]
        res_method = "exact" if clean_input == canonical_id else "alias"
        confidence = 1.0 if res_method == "exact" else 0.95

    # 2. Substring Match
    if not canonical_id:
        for alias, c_id in alias_map.items():
            if clean_input in alias or alias in clean_input:
                canonical_id = c_id
                res_method = "alias"
                confidence = 0.85
                break

    if not canonical_id:
        return {
            "success": False,
            "error": "CAREER_NOT_SUPPORTED",
            "message": f"This career '{raw_input}' is not currently supported.",
            "requested_career": raw_input,
            "resolved_career": None,
            "career_id": None,
            "domain": None,
            "resolution_method": "not_found",
            "confidence": 0.0,
            "graph_data": None
        }

    # Locate Graph Dataset dynamically across all domain subdirectories under careers/
    matched_file = None
    domain = "technology"

    careers_base = DATA_DIR / "careers"
    if careers_base.exists():
        for d_path in careers_base.rglob(f"{canonical_id}.json"):
            matched_file = d_path
            domain = d_path.parent.name
            break

    # Fallback to old graph files if present
    if not matched_file:
        old_roadmaps = DATA_DIR / "roadmaps" / f"{canonical_id}.json"
        old_domain = DATA_DIR / "domain_roadmaps" / "aviation" / "pilot.json" if "pilot" in canonical_id else None
        if old_roadmaps and old_roadmaps.exists():
            matched_file = old_roadmaps
            domain = "technology"
        elif old_domain and old_domain.exists():
            matched_file = old_domain
            domain = "aviation"

    if not matched_file or not matched_file.exists():
        return {
            "success": False,
            "error": "CAREER_NOT_SUPPORTED",
            "message": f"Career '{raw_input}' mapped to '{canonical_id}', but graph dataset is missing.",
            "requested_career": raw_input,
            "resolved_career": canonical_id.replace("-", " ").title(),
            "career_id": canonical_id,
            "domain": domain,
            "resolution_method": res_method,
            "confidence": confidence,
            "graph_data": None
        }

    try:
        graph_data = json.loads(matched_file.read_text(encoding="utf-8"))
        title = graph_data.get("title") or canonical_id.replace("-", " ").title()
        d_val = graph_data.get("domain") or domain
        return {
            "success": True,
            "requested_career": raw_input,
            "resolved_career": title,
            "career_id": canonical_id,
            "domain": d_val,
            "source_provider": "domain-dataset" if d_val != "technology" else "roadmap.sh",
            "resolution_method": res_method,
            "confidence": confidence,
            "graph_data": graph_data
        }
    except Exception as err:
        return {
            "success": False,
            "error": "CAREER_NOT_SUPPORTED",
            "message": f"Error parsing graph dataset for '{canonical_id}': {err}",
            "requested_career": raw_input,
            "resolved_career": None,
            "career_id": canonical_id,
            "domain": domain,
            "resolution_method": res_method,
            "confidence": confidence,
            "graph_data": None
        }
