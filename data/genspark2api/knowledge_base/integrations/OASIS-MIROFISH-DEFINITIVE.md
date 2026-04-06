# iVenture Studio — OASIS + MiroFish Integration (Definitive Guide)
**Date:** 2026-03-17 | **Priority:** CRITICAL | **Phase:** P7 (or P2.5 fast-track)

---

## 1. What Is What

```
OASIS  ←  Engine  (camel-ai/oasis)   pip install camel-oasis
MiroFish  ←  UI Layer  (666ghj/MiroFish  &  nikmcfly/MiroFish-Offline)
iVenture Studio  ←  Orchestrator + LLM Pool (OpenClaw)
```

| Layer | Repo | Role |
|-------|------|------|
| OASIS | github.com/camel-ai/oasis | Runs up to 1M LLM agents, 23 actions, SQLite storage |
| MiroFish (orig) | github.com/666ghj/MiroFish | Chinese UI, Zep Cloud memory, DashScope LLM |
| MiroFish-Offline | github.com/nikmcfly/MiroFish-Offline | English UI, Neo4j memory, Ollama LLM → **swap to OpenClaw** |
| iVenture OpenClaw | services/openclaw-orchestrator | 30+ models, N OPC nodes, LLM pool |

**Key fact:** MiroFish-Offline is OpenAI-SDK-compatible — one `.env` change replaces Ollama with OpenClaw.

---

## 2. The 5-Step MiroFish Pipeline

```
Document / News / Report
        │
        ▼
  ┌─────────────────┐
  │ 1. GraphRAG     │  Extracts entities, relationships → Neo4j knowledge graph
  │    Build        │  (people, companies, events, pressures)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 2. Env Setup &  │  Generates N agent personas (personality, bias,
  │    Agent Gen    │  memory, influence level, behavioral logic)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 3. Dual-Platform│  Agents interact: post, comment, argue, shift opinions
  │    Simulation   │  Twitter-like + Reddit-like environments in parallel
  │    (OASIS)      │  Up to 1M agents, 23 action types
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 4. ReportAgent  │  Analyzes sentiment evolution, coalition formation,
  │    Synthesis    │  emergent patterns → structured prediction report
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 5. Deep         │  Chat with any agent, ask ReportAgent follow-ups,
  │    Interaction  │  inject new variables, re-run scenarios
  └─────────────────┘
```

---

## 3. Integration: Two Paths

### Path A — MiroFish-Offline UI (Fast, 3 hours)
> Best for: immediate dashboard, quick simulations, Chinese market testing

```bash
# In services/ directory
git clone https://github.com/nikmcfly/MiroFish-Offline.git mirofish

# Edit ONE file: services/mirofish/.env
LLM_API_KEY=your_internal_api_key          # from iVenture .env INTERNAL_API_KEY
LLM_BASE_URL=http://openclaw-orchestrator:8090/v1   # OpenClaw pool
LLM_MODEL_NAME=gpt-5                       # or deepseek-r1, claude-opus-4
NEO4J_URI=bolt://neo4j:7687               # shared iVenture Neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}           # from iVenture .env
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_BASE_URL=http://openclaw-orchestrator:8090  # or local ollama
```

Done. `docker compose up -d mirofish` → http://mirofish.localhost:3000

### Path B — Direct OASIS VMOA Skill (Deep, 8 hours)
> Best for: programmatic simulation, VIC Cortex integration, automated market intelligence

```python
# pip install camel-oasis
from camel.models import ModelFactory
from camel.types import ModelPlatformType
import oasis

model = ModelFactory.create(
    model_platform=ModelPlatformType.OPENAI,
    model_type="gpt-5",
    api_key=INTERNAL_API_KEY,
    url="http://openclaw-orchestrator:8090/v1",  # OpenClaw pool
)
```

OASIS natively supports OpenAI-compatible endpoints via `ModelPlatformType.OPENAI`. This means:
- Every OASIS agent call routes through OpenClaw
- OpenClaw load-balances across N OPC nodes
- N × 1M agents becomes theoretically possible

---

## 4. VMOA Skill #19: market-simulation

```python
# Registered as VMOA skill: market-simulation
# Calls MiroFish API or OASIS directly
# Returns: sentiment score, controversy, virality, trading signal

SKILL_19 = {
    "id": 19,
    "name": "market-simulation",
    "description": "Run OASIS/MiroFish swarm simulation to predict public reaction",
    "endpoint": "http://mirofish:3000/api/simulation/run",
    "output_fields": [
        "sentiment_score",     # -1.0 to +1.0
        "controversy_index",   # 0.0 to 1.0 (polarisation)
        "virality_score",      # 0.0 to 1.0 (spread potential)
        "top_objections",      # list[str]
        "coalition_map",       # dict of opinion groups
        "trading_signal",      # BUY / SELL / HOLD / NEUTRAL
        "simulation_id",       # for replay / Cortex storage
    ]
}
```

---

## 5. OpenClaw × OASIS: The Capacity Equation

```
Standard OASIS run (500 agents, 40 rounds):
  = 500 agents × 40 rounds × ~3 LLM calls/step
  = ~60,000 LLM calls per simulation

OpenClaw pool capacity:
  1 node   = ~100 calls/min  →  600 sims/day
  10 nodes = ~1,000 calls/min →  6,000 sims/day
  100 nodes = ~10,000 calls/min →  60,000 sims/day

Polymarket bot benchmark:
  2,847 agents per trade × 338 trades = $4,266 profit
  Revenue per simulation ≈ $12.62

iVenture @ 100 nodes running Chinese OPC simulations:
  60,000 sims/day × €10 avg value = €600,000/day potential
  (Even at 0.01% utilisation = €60/day = €21,900/year from idle capacity)
```

---

## 6. Chinese Market Simulator — Product Spec

**Product:** "ChinaSignal" by iVenture Studio
**Price:** €99 per on-demand simulation | €499/mo unlimited

Configuration:
```python
CHINA_OPC_PERSONAS = {
    "platforms": ["WeChat", "Weibo", "Xiaohongshu", "Zhihu", "Douyin"],
    "agent_archetypes": [
        "manufacturing_opc_owner",    # 42% of Chinese OPCs
        "ecommerce_seller",            # 28%
        "service_business_owner",      # 18%
        "tech_startup_founder",        # 8%
        "freelance_consultant",        # 4%
    ],
    "language": "zh",
    "n_agents": 500,
    "simulation_rounds": 40,
    "output": ["sentiment", "objections", "virality", "platform_breakdown"]
}
```

Output example:
```json
{
  "overall_sentiment": 0.67,
  "platform_breakdown": {
    "WeChat": 0.71,
    "Weibo": 0.58,
    "Xiaohongshu": 0.82,
    "Zhihu": 0.61
  },
  "top_objections": [
    "Data stored outside China may violate PIPL",
    "Price point too high for small OPCs",
    "Prefer local service provider"
  ],
  "virality_score": 0.44,
  "go_nogo": "GO with modifications",
  "recommended_framing": "Cost-saving + local data sovereignty emphasis"
}
```

---

## 7. VIC Cortex Training Flywheel

```
Simulation #1:  "Cost-saving framing" → sentiment 0.67
Simulation #47: "Cost-saving framing" → sentiment 0.71
Simulation #200: "Cost-saving framing" → sentiment 0.74
...
Simulation #847: CORTEX LEARNS:
  → "cost_saving_framing" yields +23% sentiment
     among Chinese OPC manufacturing segment
  → stored as Cortex signal: FRAMING_INSIGHT_CN_MANUF_001
  → injected into all future VMOA content_generation calls
```

After ~10,000 simulations the Cortex has a full map of what messaging works for every market segment. This is the data moat no competitor can replicate.

---

## 8. Docker Compose Addition

```yaml
# Add to main docker-compose.yml

  mirofish:
    image: python:3.11-slim
    container_name: iventure-mirofish
    build:
      context: ./services/mirofish
      dockerfile: Dockerfile
    environment:
      LLM_API_KEY: ${INTERNAL_API_KEY}
      LLM_BASE_URL: http://openclaw-orchestrator:8090/v1
      LLM_MODEL_NAME: deepseek-r1
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      EMBEDDING_BASE_URL: http://openclaw-orchestrator:8090
      CORTEX_INGEST_URL: http://vic-engine:8080/api/cortex/ingest
    ports:
      - "3000:3000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mirofish.rule=Host(`simulate.localhost`)"
    depends_on:
      - openclaw-orchestrator
      - neo4j
    networks:
      - iventure-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 9. Phase Integration Timeline

| Phase | Action | Effort |
|-------|--------|--------|
| P2.5 | Clone MiroFish-Offline, swap LLM_BASE_URL → OpenClaw | 1h |
| P2.5 | Register VMOA skill #19 in Postgres | 30min |
| P3 | Add `X-Company-Slug` header for per-company sim isolation | 2h |
| P7 | Build ChinaSignal product UI on top of MiroFish | 8h |
| P7 | Cortex training flywheel (store sim results, extract patterns) | 4h |
| P11 | Each OPC node gets its own OASIS instance | 2h/node |
| P14 | Aggregate sim stats → Cortex world model | 3h |

**Total for full integration: ~20h across phases**

---

## 10. Architecture Position

```
┌─────────────────────────────────────────────────────┐
│                 iVenture Studio OS                   │
├─────────────────────────────────────────────────────┤
│  Layer 4: A2A Network (inter-company commerce)       │
├─────────────────────────────────────────────────────┤
│  Layer 3: VIC Cortex (world model + training data)   │
│           ↑ feeds from OASIS simulation results      │
├─────────────────────────────────────────────────────┤
│  Layer 2: VIC Engine Mesh (N nodes)                  │
│           Each node: 9 VMOA agents + skill #19       │
│           Skill #19 → MiroFish → OASIS               │
├─────────────────────────────────────────────────────┤
│  Layer 1: OpenClaw Pool (N OPC nodes)                │
│           Powers OASIS agent LLM calls               │
├─────────────────────────────────────────────────────┤
│  Layer 0: Per-OPC Stack                              │
│           VIC Engine + OpenClaw + MiroFish + OASIS   │
└─────────────────────────────────────────────────────┘
```

---

## 11. One-Line Summary

> **MiroFish is the UI. OASIS is the 1M-agent engine. OpenClaw is the only infrastructure able to run it at scale. Together they give every VIC Engine node the ability to simulate how the world will react to any business decision — before executing it. The results feed the VIC Cortex, creating a market-intelligence data moat that compounds with every simulation.**

---

## Sources
- OASIS: https://github.com/camel-ai/oasis
- OASIS docs: https://docs.oasis.camel-ai.org/quickstart
- OASIS paper: https://arxiv.org/abs/2411.11581
- MiroFish (original): https://github.com/666ghj/MiroFish
- MiroFish-Offline: https://github.com/nikmcfly/MiroFish-Offline
- MiroFish article: https://agentnativedev.medium.com/mirofish-swarm-intelligence-with-1m-agents-that-can-predict-everything-114296323663
- Polymarket bot result: $4,266 profit / 338 trades / 2,847 agents per trade
- Investment: Chen Tianqiao (Shanda Group) $4.1M within 24h of demo
