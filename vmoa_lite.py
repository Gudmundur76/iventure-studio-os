import os
import yaml
import time
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict

# Standardized Imports
from reward_client import GRPORewardComposer
import cortex_contributor
import a2a_card

# ── FACTORY CONFIG ──────────────────────────────────────────
MANIFEST_PATH = "AGENTS.yaml"
ORCHESTRATOR_URL = "http://localhost:8000/v1/chat/completions"
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-iventure-master")

app = FastAPI(title="iVenture OS — VMOA Core", version="2.0.0")
reward_composer = GRPORewardComposer()

def load_manifest():
    with open(MANIFEST_PATH, "r") as f:
        return yaml.safe_load(f)

# ── DATA MODELS ──────────────────────────────────────────────
class TaskRequest(BaseModel):
    agent_id: str
    task: str

# ── FACTORY ENDPOINTS ────────────────────────────────────────
@app.get("/factory/team")
async def get_team():
    """Hot-reload team from AGENTS.yaml"""
    return load_manifest()

@app.post("/v1/execute")
async def execute_task(req: TaskRequest):
    manifest = load_manifest()
    agent_data = next((a for a in manifest["agents"] if a["id"] == req.agent_id), None)
    
    if not agent_data:
        raise HTTPException(status_code=404, detail="Agent not found in Manifest")

    start_time = time.time()
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        # 1. Gateway Call (Genspark Powered)
        resp = await client.post(
            ORCHESTRATOR_URL,
            json={
                "model": agent_data["model"],
                "messages": [
                    {"role": "system", "content": f"Role: {agent_data['role']}\nInstructions: {agent_data['description']}"},
                    {"role": "user", "content": req.task}
                ]
            },
            headers={"Authorization": f"Bearer {LITELLM_MASTER_KEY}"}
        )
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        
        # 2. Industrial Scorer (GRPO Bridge)
        reward = await reward_composer.score(req.task, content)
        
        # 3. Cortex Feedback Loop
        await cortex_contributor.contribute_to_cortex(
            node_id=manifest["meta"]["node_id"],
            domain_hint=agent_data["role"],
            skills_used=["factory-standard-v2"],
            grpo_score=reward.composite,
            agent_type=req.agent_id
        )
        
        return {
            "agent": agent_data["name"],
            "response": content,
            "grpo": round(reward.composite, 6),
            "latency_ms": int((time.time() - start_time) * 1000)
        }

if __name__ == "__main__":
    import uvicorn
    print(f"🏭 iVenture Factory starting on Port 8002 (Genspark Engine)...")
    uvicorn.run(app, host="0.0.0.0", port=8002)
