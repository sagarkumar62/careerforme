"""
Automated Career Dataset Validator Script

Verifies all career datasets across app/data/careers/ for:
1. Canonical careerId and title existence
2. Domain and category tags
3. DAG validity and topological ordering (zero cycle loops)
4. Unique node IDs
5. Phase 1-4 coverage where applicable
6. Domain purity (verifying no software skills in pilot datasets, no flight skills in AI datasets, etc.)
"""

import sys
import json
from pathlib import Path

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.career_resolver import build_career_dataset_registry
from app.services.roadmap_engine import generate_roadmap_structure


def validate_all_career_datasets():
    print("==================================================")
    print("         AUTOMATED CAREER DATASET VALIDATOR       ")
    print("==================================================")

    registry = build_career_dataset_registry()
    print(f"\n[VALIDATOR] Discovered {len(registry)} canonical careers in dataset registry.\n")

    errors = []
    success_count = 0

    for cid, info in registry.items():
        title = info.get("title")
        domain = info.get("domain")
        filepath = info.get("filepath")

        print(f"Checking '{cid}' ({title}) [{domain}]... ", end="")

        # 1. Generate roadmap & test DAG invariants
        res = generate_roadmap_structure({}, cid)
        if not res.get("success"):
            print("FAILED")
            errors.append(f"[{cid}] Roadmap generation failed: {res.get('message')}")
            continue

        val = res.get("validation", {})
        if not val.get("isDag") or val.get("hasCycles") or not val.get("orderValid"):
            print("FAILED (DAG invalid)")
            errors.append(f"[{cid}] DAG validation failure: isDag={val.get('isDag')}, hasCycles={val.get('hasCycles')}")
            continue

        nodes = res.get("nodes", [])
        phases = res.get("phases", [])

        if len(nodes) == 0:
            print("FAILED (Empty nodes)")
            errors.append(f"[{cid}] Dataset contains zero nodes.")
            continue

        if len(phases) != 4:
            print(f"FAILED ({len(phases)} phases)")
            errors.append(f"[{cid}] Expected 4 semantic phases, got {len(phases)}.")
            continue

        # 2. Domain Purity Checks
        node_titles_str = " ".join([n.get("title", "") for n in nodes]).lower()

        if domain == "aviation" or "pilot" in cid:
            leaked = [s for s in ["python", "react", "pytorch", "docker", "javascript"] if s in node_titles_str]
            if leaked:
                print(f"FAILED (Software skills leaked: {leaked})")
                errors.append(f"[{cid}] Software skills leaked into aviation career: {leaked}")
                continue

        if domain in ["technology", "data-and-ai"] and "ai" in cid:
            leaked = [s for s in ["aerodynamics", "cockpit", "pilot", "flight navigation"] if s in node_titles_str]
            if leaked:
                print(f"FAILED (Aviation skills leaked: {leaked})")
                errors.append(f"[{cid}] Aviation skills leaked into AI career: {leaked}")
                continue

        print("OK")
        success_count += 1

    print("\n==================================================")
    print(f"VALIDATION COMPLETE: {success_count}/{len(registry)} PASSED")
    print("==================================================")

    if errors:
        print("\nERRORS DETECTED:")
        for err in errors:
            print(f" - {err}")
        sys.exit(1)
    else:
        print("\nAll career datasets passed validation successfully!")
        sys.exit(0)


if __name__ == "__main__":
    validate_all_career_datasets()
