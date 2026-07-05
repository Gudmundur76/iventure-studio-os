"""
mem9_connector.py — Memory connector backed by Evolva MRAgent.

Originally pointed at api.mem9.ai (external, mocked).
Now backed by the self-hosted MRAgent at MRAGENT_URL.

MRAgent endpoints used:
  POST /ingest   — store a memory episode
  POST /query    — retrieve semantically similar episodes

Evolva Meta-OS v4.0.0 — replaced mem9 stub with live MRAgent.
"""
import os
import httpx
import json
from typing import Dict, Any, Optional


MRAGENT_URL = os.getenv(
    "MRAGENT_URL",
    "https://pippinlitli-evolva-mragent.hf.space"
)


class Mem9Connector:
    """
    Memory connector backed by Evolva MRAgent.

    Provides cross-node working memory and session-level persistence
    via semantic embedding and vector search.
    """

    def __init__(self, api_base: Optional[str] = None, api_key: Optional[str] = None):
        self.api_base = api_base or MRAGENT_URL
        # api_key retained for interface compatibility but not used by MRAgent
        self.api_key = api_key or os.getenv("MRAGENT_API_KEY", "")
        self.space_token = os.getenv("MEM9_SPACE_TOKEN", "ivs-default-space")

    async def store_memory(self, content: str, metadata: Dict[str, Any]):
        """Saves a new interaction/artifact to MRAgent."""
        payload = {
            "claim": content,
            "verdict": metadata.get("verdict", "stored"),
            "origin": metadata.get("origin", f"iventure:{self.space_token}"),
            "tags": metadata.get("tags", []),
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.api_base}/ingest",
                    json=payload,
                )
                if resp.status_code == 200:
                    result = resp.json()
                    print(f"[MEM9→MRAgent] Stored: {content[:60]}... (id={result.get('id')})")
                else:
                    print(f"[MEM9→MRAgent] Store failed: {resp.status_code}")
        except Exception as e:
            print(f"[MEM9→MRAgent] Storage error: {e}")

    async def recall_memory(self, query: str, limit: int = 3) -> str:
        """Retrieves relevant memories from MRAgent via semantic search."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.api_base}/query",
                    json={"query": query, "top_k": limit},
                )
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if not results:
                        return "No relevant memories found."
                    lines = []
                    for r in results:
                        score = r.get("similarity", 0)
                        claim = r.get("claim", "")
                        verdict = r.get("verdict", "")
                        lines.append(f"[{score:.3f}] ({verdict}) {claim}")
                    return "\n".join(lines)
                else:
                    return f"MRAgent query failed: {resp.status_code}"
        except Exception as e:
            return f"MRAgent recall error: {e}"

    async def forget_memory(self, memory_id: str):
        """Delete a specific memory episode (not yet implemented in MRAgent)."""
        print(f"[MEM9→MRAgent] forget_memory({memory_id}) — not yet implemented")


# Module-level singleton (matches original mem9 usage pattern)
mem9 = Mem9Connector()
