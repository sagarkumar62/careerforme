import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any


_BASE = Path(__file__).resolve().parents[1] / "data"


def _clean_skill_key(value: Any) -> str:
    """Create a stable lookup key for skill names and aliases."""
    if not value:
        return ""

    val_str = str(value).strip().lower()
    val_str = re.sub(r"[^0-9a-zA-Z\s\-\.]+", "", val_str)
    val_str = re.sub(r"\s+", " ", val_str)

    return val_str.strip()


def _load_skill_taxonomy() -> Dict[str, str]:
    """Return a map of normalized alias -> canonical skill name."""
    path = _BASE / "skills.json"

    if not path.exists():
        return {}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    mapping: Dict[str, str] = {}

    for item in data:
        canon = item.get("name")
        if not canon:
            continue

        canonical_name = str(canon).strip()

        # Canonical name itself
        canonical_key = _clean_skill_key(canonical_name)
        if canonical_key:
            mapping[canonical_key] = canonical_name

        # Aliases
        for alias in item.get("aliases", []):
            alias_key = _clean_skill_key(alias)
            if alias_key:
                mapping[alias_key] = canonical_name

    return mapping


_SKILL_MAP = _load_skill_taxonomy()


def normalize_skill_name(name: Optional[str]) -> str:
    """Convert a skill name/alias into its canonical skill name."""
    if not name:
        return ""

    key = _clean_skill_key(name)
    if not key:
        return ""

    return _SKILL_MAP.get(key, str(name).strip())


def normalize_skill_id(name: Optional[str]) -> str:
    """
    Convert a skill name/alias into its canonical hyphenated skill ID.

    Examples:
        "Machine Learning" -> "machine-learning"
        "ML"               -> "machine-learning"
        "machine_learning" -> "machine-learning"
        "Python 3"         -> "python"
    """
    if not name or not isinstance(name, str):
        return ""

    canonical_name = normalize_skill_name(name)
    if not canonical_name:
        return ""

    skill_id = canonical_name.strip().lower()
    skill_id = re.sub(r"[\s_/\\]+", "-", skill_id)
    skill_id = re.sub(r"[^a-z0-9\-\.]+", "", skill_id)
    skill_id = re.sub(r"-+", "-", skill_id)

    return skill_id.strip("-")


def normalize_profile_skills(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize profile skills in-place and return the profile."""
    skills = profile.get("skills") or []
    normalized = []

    for skill in skills:
        if isinstance(skill, dict):
            name = (
                skill.get("skillId")
                or skill.get("skill_id")
                or skill.get("name")
                or skill.get("skill")
            )
            level = skill.get("level") or skill.get("proficiency")
        else:
            name = str(skill)
            level = None

        canonical_name = normalize_skill_name(name)
        sid = normalize_skill_id(name)

        normalized.append({
            "name": canonical_name,
            "skill_id": sid,
            "level": level,
        })

    profile["skills"] = normalized
    return profile


def _parse_level(level: Any) -> int:
    """Parses numeric or textual level ('beginner', 'advanced') into an integer (0-5)."""
    if level is None:
        return 0
    if isinstance(level, (int, float)):
        return int(level)
    lvl_str = str(level).strip().lower()
    mapping = {
        "beginner": 1,
        "elementary": 2,
        "intermediate": 3,
        "advanced": 4,
        "expert": 5
    }
    return mapping.get(lvl_str, 0)


def validate_skill_taxonomy() -> Dict[str, List[str]]:
    """
    Detect aliases that map to multiple canonical skills.
    """
    path = _BASE / "skills.json"

    if not path.exists():
        return {}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    owners: Dict[str, set] = {}

    for item in data:
        canonical = item.get("name")
        if not canonical:
            continue

        values = [canonical] + item.get("aliases", [])

        for value in values:
            key = _clean_skill_key(value)
            if key:
                owners.setdefault(key, set()).add(canonical)

    return {
        alias: sorted(list(canonicals))
        for alias, canonicals in owners.items()
        if len(canonicals) > 1
    }

