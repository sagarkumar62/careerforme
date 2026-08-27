import json
import re
import os
from typing import Dict, List, Any, Optional
from app.services.career_resolver import resolve_target_career
from app.config.settings import settings

try:
    import google.generativeai as genai
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception:
    genai = None


def generate_career_graph(role_name: str) -> Dict[str, Any]:
    """
    Acts as a career graph generation engine. Converts a requested job role
    into a Directed Acyclic Graph (DAG) for interactive rendering.
    """
    clean_role = (role_name or "").strip()
    if not clean_role:
        return {
            "role": "Unknown Role",
            "nodes": [],
            "edges": []
        }

    # 1. First try resolving via Canonical Career Datasets
    res = resolve_target_career(clean_role)
    if res.get("success") and res.get("graph_data"):
        g_data = res["graph_data"]
        raw_nodes = g_data.get("nodes", [])
        raw_edges = g_data.get("edges", [])

        if not raw_nodes and g_data.get("skills"):
            raw_nodes = []
            for index, s in enumerate(g_data["skills"]):
                s_id = s.get("id") or f"node_{index + 1}"
                s_title = s.get("name") or s.get("title") or s_id
                raw_nodes.append({
                    "id": s_id,
                    "title": s_title,
                    "type": "foundation" if index == 0 else "core",
                    "description": f"Master {s_title}."
                })
        
        formatted_nodes = []
        for n in raw_nodes:
            n_id = n.get("id") or n.get("nodeId", "")
            cat = "Fundamentals"
            n_type = n.get("type", "").lower()
            if "foundation" in n_type:
                cat = "Fundamentals"
            elif "core" in n_type or "intermediate" in n_type:
                cat = "Intermediate"
            elif "advanced" in n_type:
                cat = "Advanced"
            elif "capstone" in n_type or "tool" in n_type:
                cat = "Tools"

            formatted_nodes.append({
                "id": str(n_id),
                "label": n.get("title", str(n_id).title())[:30],
                "category": cat,
                "description": n.get("description", f"Learn {n.get('title', n_id)} core competencies."),
                "resources": [
                    f"Official {n.get('title', n_id)} Documentation",
                    f"{res.get('resolved_career')} Guide"
                ]
            })

        formatted_edges = []
        for idx, e in enumerate(raw_edges):
            formatted_edges.append({
                "id": f"e-{idx+1}",
                "source": str(e.get("source") or e.get("from", "")),
                "target": str(e.get("target") or e.get("to", ""))
            })

        return {
            "role": res.get("resolved_career", clean_role),
            "nodes": formatted_nodes,
            "edges": formatted_edges
        }

    # 2. LLM-Based Dynamic DAG Synthesis (Gemini API) if configured
    if settings.GEMINI_API_KEY and genai:
        try:
            model_name = settings.GEMINI_MODEL or "gemini-3.6-flash"
            model = genai.GenerativeModel(model_name)
            
            prompt = f"""Act as an expert curriculum builder and career advisor. Generate a structured career learning roadmap graph for the role: "{clean_role}".

Return the output strictly in valid JSON format without any markdown code wrappers or conversational text. The JSON must follow this exact schema:

{{
  "role": "{clean_role}",
  "nodes": [
    {{
      "id": "unique-id-slug",
      "label": "Topic or Skill Name",
      "category": "Fundamentals",
      "description": "Short description of what to learn.",
      "resources": ["Resource 1", "Resource 2"]
    }}
  ],
  "edges": [
    {{
      "id": "edge-1",
      "source": "prerequisite-node-id",
      "target": "dependent-node-id"
    }}
  ]
}}

Guidelines:
1. Form a clear Directed Acyclic Graph (DAG) starting from foundational topics leading up to specialized advanced topics.
2. Category MUST be one of: Fundamentals, Intermediate, Advanced, Tools.
3. Every non-root node MUST have at least one valid prerequisite target in "edges".
4. Keep labels concise (2-4 words max per node).
5. Include 12 to 20 key nodes covering core concepts, essential tools, frameworks, and practical project domains.
6. Return ONLY raw JSON without ```json wrappers or introductory text."""

            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            # Clean markdown wrappers if any
            cleaned_json = re.sub(r'^```(json)?\s*', '', raw_text, flags=re.MULTILINE)
            cleaned_json = re.sub(r'\s*```$', '', cleaned_json, flags=re.MULTILINE).strip()
            
            parsed = json.loads(cleaned_json)
            if "role" in parsed and "nodes" in parsed and "edges" in parsed:
                return parsed
        except Exception as err:
            print(f"[GraphGenerator] Gemini generation fallback error: {err}")

    # 3. Deterministic Generic Fallback Graph if LLM is unavailable
    return {
        "role": clean_role,
        "nodes": [
            {
                "id": f"{clean_role.lower().replace(' ', '-')}-foundations",
                "label": f"{clean_role} Foundations",
                "category": "Fundamentals",
                "description": f"Master core foundational principles of {clean_role}.",
                "resources": [f"Introduction to {clean_role}"]
            },
            {
                "id": f"{clean_role.lower().replace(' ', '-')}-core",
                "label": "Core Methodologies",
                "category": "Intermediate",
                "description": "Develop essential technical and practical skills.",
                "resources": [f"Core {clean_role} Practices"]
            },
            {
                "id": f"{clean_role.lower().replace(' ', '-')}-advanced",
                "label": "Advanced Practice",
                "category": "Advanced",
                "description": "Specialized domain workflows and capstone execution.",
                "resources": [f"Advanced {clean_role} Portfolio"]
            }
        ],
        "edges": [
            {
                "id": "e-1",
                "source": f"{clean_role.lower().replace(' ', '-')}-foundations",
                "target": f"{clean_role.lower().replace(' ', '-')}-core"
            },
            {
                "id": "e-2",
                "source": f"{clean_role.lower().replace(' ', '-')}-core",
                "target": f"{clean_role.lower().replace(' ', '-')}-advanced"
            }
        ]
    }
