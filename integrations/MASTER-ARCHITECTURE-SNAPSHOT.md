# iVenture Studio — Master Architecture Snapshot
**Date:** 2026-03-17 | **Version:** 0.4 (OASIS + Portfolio Layer added)

---

## The Core Thesis

> **One founder. Multiple autonomous companies. Each pre-validating every decision
> against 1M simulated humans before executing. All sharing intelligence through
> a central Cortex. Compounding forever.**

---

## Architecture Layers (Bottom → Top)

```
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 0 — PER-OPC NODE STACK                                        ║
║  ┌─────────────────────────────────────────────────────────────────┐ ║
║  │  VIC Engine v5 (9 VMOA agents)                                  │ ║
║  │  + OpenClaw / genspark2api (30+ models)                         │ ║
║  │  + MiroFish-Offline → OASIS (1M agents, 23 actions)             │ ║
║  │  + Postgres + Redis + Neo4j (local memory)                      │ ║
║  │  + A2A Server (publishes Agent Cards)                           │ ║
║  └─────────────────────────────────────────────────────────────────┘ ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 1 — OPENCLAW POOL ORCHESTRATOR                                ║
║  N OPC cookies → N × 30 models → LiteLLM routing                    ║
║  Strategies: Least Latency / Round Robin / Sticky Company            ║
║  Redis state sync | Health monitoring | Rate-limit backoff           ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 2 — VIC ENGINE MESH COORDINATOR                               ║
║  Distributed task routing across N VIC Engine nodes                  ║
║  GRPO-weighted routing | Ensemble execution | Fault tolerance        ║
║  Geographic distribution | Per-node specialisation                   ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 2.5 — OASIS SIMULATION LAYER                                  ║
║  Skill #19: market-simulation (per VIC Engine node)                  ║
║  Each simulation: up to 1M agents × 23 actions                       ║
║  LLM calls route through OpenClaw Pool (Layer 1)                     ║
║  Results: sentiment, controversy, virality, trading signal           ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 3 — VIC CORTEX (World Model)                                  ║
║  Aggregates: GRPO scores, sim results, interaction data              ║
║  Flywheel: 10,000 sims → market-intelligence data moat               ║
║  EU-compliant | Iceland hosting | CORTEX_OWNER: iVenture Studio ehf  ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 3.5 — PORTFOLIO MANAGER                                       ║
║  One Founder → N autonomous companies                                ║
║  Company Spawner (~3 min per company)                                ║
║  Internal A2A Market (companies trade tasks to each other)           ║
║  Portfolio Dashboard (live GRPO, revenue, tasks per company)         ║
╠══════════════════════════════════════════════════════════════════════╣
║  LAYER 4 — A2A NETWORK (Inter-Company Commerce)                      ║
║  Agent Cards published per node                                      ║
║  Cross-company task routing | Revenue sharing                        ║
║  P2P mesh | Google A2A protocol                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## The 9 VMOA Agents (per company)

| # | Agent | Role |
|---|-------|------|
| 1 | Orchestrator | Task routing, GRPO scoring |
| 2 | Researcher | Deep research, information synthesis |
| 3 | Content Generator | Copy, posts, articles |
| 4 | Market Analyst | Data analysis, signals |
| 5 | Code Engineer | Automation, integrations |
| 6 | Finance Manager | Revenue tracking, projections |
| 7 | Compliance Officer | Legal, EU/Iceland regs |
| 8 | Customer Advocate | Support, onboarding |
| 9 | Simulation Operator | Runs OASIS via Skill #19 |

---

## 18+1 VMOA Skills (Postgres-seeded)

Skills 1–18 seeded in `postgres-init.sql`.
**Skill #19 (new): market-simulation** → OASIS/MiroFish swarm intelligence.

---

## Key Constants

```
GRPO_BASELINE       = 0.991337
OPC_MARKET          = 16,000,000  (Chinese OPCs)
CORTEX_OWNER        = iVenture Studio ehf
SUBNET              = 172.20.0.0/16
SKILLS_COUNT        = 19  (was 18, +1 for OASIS)
MAX_AGENTS_PER_SIM  = 1,000,000
POLYMARKET_BENCH    = $4,266 / 338 trades / 2,847 agents
MIROFISH_INVEST     = $4.1M (Chen Tianqiao, Shanda Group)
```

---

## Phase Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| P1 | Core infra (Traefik, Postgres, Redis, MinIO) | ✅ Ready |
| P2 | Model Gateway (genspark2api + LiteLLM) | 🔜 Next |
| P2.5 | OpenClaw Pool + MiroFish fast-track | 🔜 Parallel |
| P3 | VIC Engine v5 + VMOA agents | ⏳ Pending |
| P3.5 | Portfolio Manager + Company Spawner | ⏳ Pending |
| P4 | Reward Model + PRM | ⏳ Pending |
| P5 | World Model + GRPO calibration | ⏳ Pending |
| P6 | A2A Network | ⏳ Pending |
| P7 | Workspace Integrations (Composio, MiroFish UI, ChinaSignal) | ⏳ Pending |
| P8 | Mobile App + OPC Onboarding | ⏳ Pending |
| P9 | Payments (Stripe + Icelandic ehf) | ⏳ Pending |
| P10 | Public Launch | ⏳ Pending |
| P11 | OPC Network Expansion (target: 1,000 nodes) | ⏳ Pending |
| P14 | Cortex Intelligence Flywheel | ⏳ Ongoing |

---

## Revenue Model

```
Per-company SaaS:     €29–299/mo × N companies
OASIS sims (ChinaSignal): €99/sim on-demand | €499/mo unlimited
A2A task revenue:     % of inter-company task volume
Cortex data licensing: enterprise tier (TBD)

Example: 1 founder × 5 companies × €149/mo = €745/mo per founder
10,000 founders = €7.45M MRR = €89.4M ARR

Chinese OPC market (1% of 16M):
160,000 nodes × €49/mo = €7.84M MRR
```

---

## Files in AI Drive

```
/iventure-studio/
├── phase1/
│   ├── p1-setup.sh                  # Setup script (secrets, dirs, .env)
│   ├── p1-docker-compose-core.yml   # Traefik, Postgres, Redis, MinIO
│   ├── postgres-init.sql            # Schema + 18 seeded skills
│   ├── p1-runbook.md               # Step-by-step execution guide
│   ├── p1-gate-check.sh            # 13-point Go/No-Go validator
│   └── p1-memory-update.md         # Memory log
├── openclaw/
│   ├── openclaw_orchestrator.py    # 559-line async pool manager
│   ├── openclaw-docker-service.yml
│   ├── openclaw-litellm-patch.yaml
│   └── OPENCLAW-ARCHITECTURE.md
├── mesh/
│   ├── VIC-MESH-ARCHITECTURE.md
│   └── vic_mesh_coordinator.py
└── integrations/
    ├── MIROFISH-INTEGRATION.md
    ├── OASIS-MIROFISH-DEFINITIVE.md  # ← NEW (this session)
    ├── vmoa_skill_market_simulation.py  # ← NEW (this session)
    └── PORTFOLIO-ARCHITECTURE.md
```

---

## Immediate Next Actions

1. `./p1-setup.sh` → start Phase 1 infra (atNorth Iceland)
2. Run `p1-gate-check.sh` → verify 13/13 PASS
3. `INSERT skill #19` into Postgres skills table
4. `git clone MiroFish-Offline` → swap `.env` → `docker compose up -d mirofish`
5. Run first simulation: feed your Phase 1 announcement doc
6. Register `vmoa_skill_market_simulation.py` as microservice on port 8085
