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
from harness_factory import get_harness

# ── FACTORY CONFIG ──────────────────────────────────────────
MANIFEST_PATH = "AGENTS.yaml"

app = FastAPI(title="iVenture OS — VMOA Core (Harness Enabled)", version="2.1.0")

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
    try:
        # 1. Spawn the specialized Industrial Harness
        harness = get_harness(req.agent_id)
        
        start_time = time.time()
        
        # 2. Execute via the Harness Build System
        # This handles: Causal Chains, Progressive Disclosure, Gateway Call, and RAAL Filter
        result = await harness.execute(req.task)
        
        latency = int((time.time() - start_time) * 1000)
        
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("error"))

        # 3. Cortex Feedback Loop (Integrated in Harness or handled here)
        # Note: harness_core already pushes signals via GRPORewardComposer if needed, 
        # but we maintain the explicit pulse here for v2 parity.
        await cortex_contributor.contribute_to_cortex(
            node_id=load_manifest()["meta"]["node_id"],
            domain_hint=req.agent_id,
            skills_used=["industrial-harness-v1"],
            grpo_score=result.get("grpo", 0.0),
            agent_type=req.agent_id
        )
        
        return {
            "agent": result.get("agent_id", req.agent_id),
            "response": result.get("response"),
            "grpo": round(result.get("grpo", 0.0), 6),
            "status": result.get("status"),
            "latency_ms": latency
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Factory Execution Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print(f"🏭 iVenture Factory (Harness Edition) starting on Port 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002)
