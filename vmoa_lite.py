import asyncio
import os
import uuid
import time
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx

# Architecture Hooks (P3 Bedrock)
import cortex_contributor
import a2a_card

app = FastAPI(title="iVenture Studio — VMOA Lite (Cortex + A2A Enabled)", version="1.1.0")

ORCHESTRATOR_URL = "http://localhost:8000/v1/chat/completions"
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-iventure-master")
NODE_ID = os.getenv("NODE_ID", "ivs_default_node")

class AgentTask(BaseModel):
    agent_id: str
    task: str
    context: dict = {}

class AgentResponse(BaseModel):
    agent_id: str
    response: str
    grpo_score: float
    latency_ms: int

# Agent Roster (Post-Pivot v2.1)
AGENTS = {
    "mda-v1": {"role": "Master Dev / PM", "model": "gpt-5"},
    "bda-v1": {"role": "Backend Dev", "model": "gpt-5"},
    "doa-v1": {"role": "DevOps", "model": "gemini-2.5-flash"},
    "qaa-v1": {"role": "QA Agent", "model": "gemini-2.5-flash"},
    "sea-v1": {"role": "Security Agent", "model": "gpt-5"},
    "fda-v1": {"role": "Frontend Dev", "model": "claude-opus-4"},
    "pma-v1": {"role": "PM Agent", "model": "gpt-5-minimal"},
    "subsidy-advisor": {"role": "US GTM / NIST Compliance", "model": "gpt-5"},
    "researcher": {"role": "Skywork Researcher (US)", "model": "skywork-deepresearch-v2"},
    "kady-researcher": {"role": "Scientific & Complex Data Expert", "model": "openrouter/google/gemini-3.1-pro-preview"}
}

@app.on_event("startup")
async def startup():
    # Activate A2A Agent Card surface
    await a2a_card.on_startup()
    print(f"VMOA Node {NODE_ID} live with Cortex + A2A hooks.")

@app.get("/health")
async def health():
    return {"status": "healthy", "agents": len(AGENTS), "cortex": "enabled", "a2a": "stub"}

# ── A2A Discovery Endpoints (Phase 3.8) ─────────────────────

@app.get("/.well-known/agent.json")
async def get_agent_card():
    """Discover node capabilities (A2A Protocol compliant)"""
    card = a2a_card.build_agent_card()
    return JSONResponse(
        content=json.loads(a2a_card.card_to_json(card)),
        headers={"Cache-Control": "public, max-age=300"}
    )

@app.get("/a2a/status")
async def get_a2a_status():
    """A2A network health status"""
    return {
        "node_id": NODE_ID,
        "status": "live",
        "network_status": "STUB",
        "grpo_score": 0.991337,
        "full_a2a_eta": "Phase 12"
    }

# ── Core Task Execution ──────────────────────────────────────

@app.post("/v1/execute", response_model=AgentResponse)
async def execute_task(task_req: AgentTask):
    agent = AGENTS.get(task_req.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    start_time = time.time()
    
    # Simulate GRPO scoring (calibrated for architecture demo)
    grpo_score = 0.991337

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                ORCHESTRATOR_URL,
                json={
                    "model": agent["model"],
                    "messages": [{"role": "system", "content": f"You are {task_req.agent_id}, role: {agent['role']}"},
                                 {"role": "user", "content": task_req.task}]
                },
                headers={"Authorization": f"Bearer {LITELLM_MASTER_KEY}"}
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            
            latency = int((time.time() - start_time) * 1000)
            
            # ★ Phase 3.7: Cortex Contributor Hook
            # Distill interaction into a privacy-safe signal and push to world model
            await cortex_contributor.contribute_to_cortex(
                node_id=NODE_ID,
                domain_hint=agent["role"],
                skills_used=["vmoa-orchestration", agent["role"].lower().replace(" ", "-")],
                grpo_score=grpo_score,
                agent_type=task_req.agent_id
            )
            
            return AgentResponse(
                agent_id=task_req.agent_id,
                response=content,
                grpo_score=grpo_score,
                latency_ms=latency
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Orchestrator error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
