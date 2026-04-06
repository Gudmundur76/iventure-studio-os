"""
iVenture Studio — A2A Agent Card Generator + Stub Server
vic_engine_v5/a2a/card.py

Embed during P3. Full A2A server built in P11-P12.
This stub:
  1. Generates the Agent Card at /.well-known/agent.json
  2. Serves a minimal A2A endpoint that returns "node live"
  3. Registers with the iVenture Network Registry on startup
  4. Provides the discovery surface for P2P network (P11-P13)
"""

import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional
import httpx

# Config
NODE_ID = os.getenv("NODE_ID", "")                         # set on registration
NODE_NAME = os.getenv("NODE_NAME", "iVenture Studio Node")
NODE_DOMAIN = os.getenv("NODE_DOMAIN", "")                 # e.g. myagent.iventure.studio
GRPO_SCORE = float(os.getenv("VIC_GRPO_CALIBRATION", "0.991337"))
REGISTRY_URL = os.getenv("REGISTRY_URL", "https://iventure.studio/network/registry")
A2A_ENABLED = os.getenv("A2A_ENABLED", "true").lower() == "true"
STRIPE_CONNECT_ID = os.getenv("STRIPE_CONNECT_ID", "")    # filled in P13
NODE_PRIVATE_KEY = os.getenv("NODE_PRIVATE_KEY", "")      # ed25519, generated P11


@dataclass
class AgentCardCapabilities:
    skills: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=lambda: ["en"])
    agents: list[str] = field(default_factory=list)
    specialisations: list[str] = field(default_factory=list)
    modalities: list[str] = field(default_factory=lambda: ["text"])


@dataclass
class AgentCardPricing:
    per_task: float = 0.10
    currency: str = "USD"
    payment_methods: list[str] = field(default_factory=lambda: ["stripe_connect"])
    free_tasks_per_day: int = 0


@dataclass
class AgentCardReputation:
    grpo_score: float = 0.991337
    tasks_completed: int = 0
    avg_rating: Optional[float] = None
    cortex_credits: int = 0
    member_since: Optional[str] = None


@dataclass
class AgentCard:
    """
    Google A2A protocol compliant Agent Card.
    Published at /.well-known/agent.json
    Discoverable by any A2A-compatible agent.
    """
    schema: str = "iventure-a2a/v1"
    node_id: str = ""
    name: str = ""
    description: str = "iVenture Studio — AI-powered one-person company"
    jurisdiction: str = "IS"           # Iceland — EU regulated
    registered: str = ""
    capabilities: AgentCardCapabilities = field(default_factory=AgentCardCapabilities)
    reputation: AgentCardReputation = field(default_factory=AgentCardReputation)
    pricing: AgentCardPricing = field(default_factory=AgentCardPricing)
    a2a_endpoint: str = ""
    public_key: str = ""               # ed25519 — filled in P11
    signature: str = ""                # card self-signature — filled in P11
    network_status: str = "STUB"       # STUB → ACTIVE (P11), TRADING (P13)


def get_installed_skills() -> list[str]:
    """Read skill names from the mounted skills library"""
    skills_path = os.getenv("VIC_SKILLS_PATH", "/skills")
    try:
        import pathlib
        skill_dirs = [d.name for d in pathlib.Path(skills_path).iterdir()
                      if d.is_dir()]
        return skill_dirs[:18]   # cap at 18 for card clarity
    except Exception:
        # Return defaults if skills path not mounted yet
        return [
            "tax-calc", "invoice-gen", "cashflow-model",
            "seo-audit", "ad-copy", "social-schedule",
            "contract-review", "compliance-check",
            "web-search", "summarise", "report-gen",
            "code-review", "api-test",
            "translate-zh-en", "translate-en-zh",
            "sheets-analysis", "ppt-gen", "email-triage"
        ]


def get_active_agents() -> list[str]:
    """Return list of VMOA agent IDs"""
    return [
        "vmoa-strategist",
        "vmoa-financial",
        "vmoa-marketing",
        "vmoa-legal",
        "vmoa-technical",
        "vmoa-operations",
        "vmoa-research",
        "vmoa-communication",
        "vmoa-vision",
    ]


def generate_node_id(domain: str) -> str:
    """Generate deterministic node ID from domain"""
    return "ivs_" + hashlib.sha256(domain.encode()).hexdigest()[:12]


def build_agent_card() -> AgentCard:
    """Build the full Agent Card for this node"""
    node_id = NODE_ID or generate_node_id(NODE_DOMAIN or "localhost")

    card = AgentCard(
        node_id=node_id,
        name=NODE_NAME,
        description=(
            "iVenture Studio — AI-powered one-person company OS. "
            "9 VMOA agents covering strategy, finance, marketing, legal, "
            "technical, operations, research, communication, and vision. "
            f"GRPO Score: {GRPO_SCORE}. Jurisdiction: Iceland (EU)."
        ),
        registered=datetime.utcnow().isoformat() + "Z",
        capabilities=AgentCardCapabilities(
            skills=get_installed_skills(),
            languages=["en", "zh"],
            agents=get_active_agents(),
            specialisations=[
                "opc-business-ops",
                "iceland-china-trade",
                "eu-cross-border-ecom",
                "financial-analysis",
            ],
            modalities=["text", "document", "spreadsheet", "presentation"]
        ),
        reputation=AgentCardReputation(
            grpo_score=GRPO_SCORE,
            tasks_completed=0,
            avg_rating=None,
            cortex_credits=0,
            member_since=datetime.utcnow().strftime("%Y-%m"),
        ),
        pricing=AgentCardPricing(
            per_task=0.10,
            currency="USD",
            payment_methods=["stripe_connect", "usdc"],
            free_tasks_per_day=3,
        ),
        a2a_endpoint=f"https://{NODE_DOMAIN}/a2a" if NODE_DOMAIN else "",
        public_key="",     # populated in P11
        signature="",      # populated in P11
        network_status="STUB",
    )
    return card


def card_to_json(card: AgentCard) -> str:
    """Serialise Agent Card to JSON"""
    d = asdict(card)
    return json.dumps(d, indent=2)


async def register_with_network(card: AgentCard) -> bool:
    """
    Register this node with the iVenture Network Registry.
    Stub in P3 — full implementation in P11.
    """
    if not A2A_ENABLED or not NODE_DOMAIN:
        return False

    payload = {
        "node_id": card.node_id,
        "a2a_endpoint": card.a2a_endpoint,
        "skills": card.capabilities.skills,
        "languages": card.capabilities.languages,
        "grpo_score": card.reputation.grpo_score,
        "jurisdiction": card.jurisdiction,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{REGISTRY_URL}/register",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if response.status_code in [200, 201]:
                print(f"[A2A] Registered with network registry: {card.node_id}")
                return True
            else:
                print(f"[A2A] Registry returned {response.status_code} — running in standalone mode")
                return False
    except Exception as e:
        print(f"[A2A] Registry unreachable ({e}) — running in standalone mode")
        return False


# ──────────────────────────────────────────────────────────────
# FASTAPI ROUTES — Add to vic_engine_v5/main.py
# ──────────────────────────────────────────────────────────────

# from fastapi import FastAPI
# from fastapi.responses import JSONResponse
# from a2a.card import build_agent_card, card_to_json

"""
Add these routes to your FastAPI app in vic_engine_v5/main.py:

@app.get("/.well-known/agent.json")
async def get_agent_card():
    \"\"\"
    Serves the A2A Agent Card at the standard discovery endpoint.
    Any A2A-compatible agent can discover this node's capabilities here.
    \"\"\"
    card = build_agent_card()
    return JSONResponse(
        content=json.loads(card_to_json(card)),
        headers={"Cache-Control": "public, max-age=300"}
    )


@app.post("/a2a/tasks")
async def a2a_receive_task(task: dict):
    \"\"\"
    A2A task receiver stub.
    Full implementation in P12.
    Currently: acknowledges receipt, returns STUB status.
    \"\"\"
    return {
        "task_id": task.get("task_id", "unknown"),
        "status": "SUBMITTED",
        "message": "Node is live. Full A2A support active in Phase 12.",
        "node_id": NODE_ID,
        "grpo_score": GRPO_SCORE,
        "network_status": "STUB",
    }


@app.get("/a2a/status")
async def a2a_status():
    \"\"\"Node health check for A2A network\"\"\"
    return {
        "node_id": NODE_ID,
        "status": "live",
        "network_status": "STUB",
        "grpo_score": GRPO_SCORE,
        "skills_count": len(get_installed_skills()),
        "agents_count": len(get_active_agents()),
        "a2a_version": "v1-stub",
        "full_a2a_eta": "Phase 12",
    }
"""


# ──────────────────────────────────────────────────────────────
# STARTUP HOOK — Call from VIC Engine startup
# ──────────────────────────────────────────────────────────────

async def on_startup():
    """
    Call this from vic_engine_v5/main.py lifespan startup.
    Registers node with network, logs card details.
    """
    card = build_agent_card()
    print(f"\n[A2A] Agent Card generated for node: {card.node_id}")
    print(f"[A2A] Skills: {len(card.capabilities.skills)}")
    print(f"[A2A] GRPO Score: {card.reputation.grpo_score}")
    print(f"[A2A] Network Status: {card.network_status}")
    print(f"[A2A] Endpoint: {card.a2a_endpoint or 'not configured (set NODE_DOMAIN)'}")

    # Attempt registry registration (fails gracefully if network not live)
    registered = await register_with_network(card)
    if registered:
        print(f"[A2A] ✓ Registered with iVenture Network Registry")
    else:
        print(f"[A2A] ○ Running standalone — network registry not reachable")
    print()


# ──────────────────────────────────────────────────────────────
# CLI TEST
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    card = build_agent_card()
    print("=== iVenture Studio A2A Agent Card ===")
    print(card_to_json(card))
    print()
    print(f"Serve at: /.well-known/agent.json")
    print(f"Discoverable by: any Google A2A compatible agent")
    print(f"Full A2A: Phase 11-12")
    print(f"P2P Commerce: Phase 13")
    print(f"Cortex contribution: already active via cortex_contributor.py")
