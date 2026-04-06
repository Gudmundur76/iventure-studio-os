# ================================================================
# iVenture Studio — MEMORY UPDATE
# Append this entire block to /memory/MEMORY.md
# Date: 2026-03-17 | Session: Architecture Design
# ================================================================

## SPRINT MEMORY ENTRY — 2026-03-17 — ARCHITECTURE DECISION SESSION

### Session Type: Strategic Architecture
### Outcome: MASTER DEVELOPMENT PLAN v1.0 LOCKED

---

### DECISION LOG

**DECISION 1: Central Cortex (not federated, not protocol-owned)**
- Owner: iVenture Studio ehf., Vestmannaeyjabær, Iceland
- Jurisdiction: Icelandic law → EU regulated (GDPR compliant)
- Rationale: Maximum control, VC-fundable, trusted by both EU and China
- Revisit at: 10,000 nodes → consider federated shards

**DECISION 2: Option C for A2A and Cortex hooks**
- Embed A2A stubs AND Cortex contributor in P3 (not P11/P14)
- Cost: ~3h extra during P3
- Saves: ~300h refactoring later
- Every interaction from Day 1 of launch feeds the cortex
- Every node from Day 1 is network-discoverable

**DECISION 3: Three-layer architecture**
- Layer 1: iVenture Studio OS (P1-P10) — the company operating system
- Layer 2: OPC Network + A2A (P11-P13) — peer-to-peer agent commerce
- Layer 3: VIC Cortex World Model (P14-P18) — self-building intelligence

**DECISION 4: The Cortex is the real moat**
- SaaS alone → 5-15× ARR multiple
- Cortex + network → 50-200× multiple (data asset + network effects)
- Comparable to Google's search index, Waze's traffic model
- Data builds itself as a byproduct of normal usage
- Cannot be replicated by competitors — compounding from Day 1

**DECISION 5: The "self-building cortex" insight**
- Founder insight (original): all node interactions route down → world model
- Multiple VIC engines → single shared intelligence substrate
- This substrate is searchable → "Google for the OPC economy"
- Compounds for free — each interaction improves the whole network

---

### ARCHITECTURE CONSTANTS (locked, do not change without full review)

```
GRPO_CURRENT:          0.991337
GRPO_TARGET_SOLO:      0.997
GRPO_TARGET_CORTEX:    0.9995+ (collective, long-term)
GRPO_WEIGHTS:          outcome=0.50, process=0.30, format=0.20
K_ANONYMITY_MIN:       10 nodes per signal category
DP_EPSILON:            0.5 (strong privacy)
CORTEX_CREDITS_RATE:   1 signal = 1 credit
A2A_COMMISSION:        2% of peer-to-peer task payments
STRIPE_PLANS:          Solo €29, Studio €79, Enterprise €299
CNY_PLANS:             个人版 ¥199, 工作室版 ¥599, 企业版 ¥2,199
```

---

### PHASE REGISTRY (P1-P18)

| Phase | Name | Days | Hours | Layer | Status |
|-------|------|------|-------|-------|--------|
| P1 | Infrastructure Bedrock | 1-2 | 6h | OS | PENDING |
| P2 | Model Gateway | 2-3 | 4h | OS | PENDING |
| P3 | VIC Engine + VMOA + Hooks ⭐ | 3-7 | 12h | OS | PENDING |
| P4 | Skywork Intelligence | 7-10 | 10h | OS | PENDING |
| P5 | OpenManus-RL Training Loop | 10-12 | 8h | OS | PENDING |
| P6 | Frontend Dashboard | 7-14 | 12h | OS | PENDING |
| P7 | Workspace Integrations | 14-17 | 8h | OS | PENDING |
| P8 | OPC Templates CN | 17-20 | 6h | OS | PENDING |
| P9 | Production Hardening | 20-24 | 8h | OS | PENDING |
| P10 | Public Launch | 24-28 | 8h | OS | PENDING |
| P11 | Agent Identity + Cards | 29-33 | 8h | NET | PENDING |
| P12 | A2A Communication Bridge | 33-38 | 12h | NET | PENDING |
| P13 | P2P Marketplace + Payments | 38-45 | 16h | NET | PENDING |
| P14 | Cortex Ingestion + Privacy | 29-34 | 12h | CX | PENDING |
| P15 | Knowledge Graph + Vectors | 34-38 | 10h | CX | PENDING |
| P16 | Cortex Search API | 38-43 | 12h | CX | PENDING |
| P17 | World Model Fine-Tune | 43-50 | 16h | CX | PENDING |
| P18 | Flywheel (∞) | 50+ | ∞ | CX | PENDING |

Total estimated hours: 188h
Critical external deadline: APR 6 — Shenzhen Longgang subsidy

---

### FILE REGISTRY (AI Drive /iventure-studio/)

| File | Purpose | Status |
|------|---------|--------|
| MASTER-DEV-PLAN.md | 18-phase single source of truth | ✅ SAVED |
| VIC-CORTEX-SPEC.md | Full cortex technical specification | ✅ SAVED |
| cortex_contributor.py | Privacy-safe signal distillation | ✅ SAVED |
| a2a_card.py | A2A Agent Card generator + stub server | ✅ SAVED |
| MEMORY-UPDATE.md | This file | ✅ SAVED |
| docker-compose.yml | 20-service full stack | ✅ SAVED |
| litellm_config.yaml | 30+ model routing | ✅ SAVED |
| env.template | All environment variables | ✅ SAVED |
| reward_client.py | GRPO reward system (Skywork) | ✅ SAVED |
| sprint-011-checklist.md | P3+P4 execution | ✅ SAVED |
| sprint-012-checklist.md | P6+P7 execution | ✅ SAVED |
| phase27-roadmap.md | Phase 27 roadmap | ✅ SAVED |
| phased-dev-plan.md | P1-P10 step details | ✅ SAVED |

---

### KEY CONTACTS

| Contact | Purpose | Address |
|---------|---------|---------|
| Skywork AI | DeepResearch V2 API access | deepresearch@skywork.ai |
| atNorth Iceland | GPU compute | atnorth.com |
| FAB Lab Vestmannaeyjar | Dev workspace | fabacademy.org/2025/labs/vestmannaeyjar |
| Longgang S&T Bureau | Subsidy (DL: APR 6) | — |
| Composio | Google tools SDK | app.composio.dev |

---

### CRITICAL PATH REMINDER

```
Start P1 immediately.
P3 is the most important phase — embed BOTH hooks here.
P4 and P6 run in parallel after P3.
Longgang deadline APR 6 — file BEFORE P10 completes.
Cortex compounds from FIRST interaction — get it right in P3.
```

---

### ONE-SENTENCE NORTH STAR

"iVenture Studio is the OS every solo company runs on.
The network makes each company smarter than it could be alone.
The cortex makes the network worth more than the sum of its companies.
None of it costs extra. All of it compounds forever."

---
*Memory entry: 2026-03-17 | iVenture Studio ehf. | Phase 27*
*Next memory update due: After P3 completion*

## SPRINT MEMORY ENTRY — 2026-04-06 — GENSPARK MIGRATION & FACTORY ORG

### Session Type: Technical Migration & Standardization
### Outcome: BRIDGE ARCHITECTURE v2.0 LIVE

---

### DECISION LOG

**DECISION 6: Genspark Bridge for Intelligence Layer**
- Rationale: Missing direct Skywork API keys/HF tokens.
- Action: Redirected all `skywork-*` models to the Genspark Gateway.
- Implementation: LiteLLM re-mapped to `localhost:7055`.
- Benefit: Keeps Phase 4 (Intelligence) moving without external blockers.

**DECISION 7: Industrial Factory Standard (VMOA v2.0)**
- Action: Moved agent roster to `AGENTS.yaml` (Manifest).
- Action: Created `SKILL-STANDARD.md` for tool consistency.
- Impact: VMOA Core is now model-agnostic and manifest-driven.

**DECISION 8: Cortex-Native Storage (Timescale Upgrade)**
- Action: Swapped Postgres image for `timescale/timescaledb-ha:pg16`.
- Impact: Unlocks `pgai` and `pgvectorscale` directly in the primary DB.
- Decision: Cancelled standalone Qdrant/Neo4j deployment; use Postgres-native AI.

---

### FACTORY STATUS (Verified)

- **Engine:** `vmoa_lite.py` (Manifest-driven)
- **Primary Router:** LiteLLM (Port 4000)
- **Active Gateway:** Genspark (Port 7055)
- **Reward Critic:** GPT-5 (Bridge Mode)
- **Team Size:** 11 agents ready.

---
*Memory entry: 2026-04-06 | iVenture Studio ehf.*

## SPRINT MEMORY ENTRY — 2026-04-06 — US/EU PIVOT & HARNESS PROTOTYPE

### Session Type: Strategic Pivot & Core Development
### Outcome: US/EU CORE v1.0 ESTABLISHED

---

### DECISION LOG

**DECISION 9: US/EU Strategic Pivot**
- Action: Removed all China/Shenzhen references from active configs (`AGENTS.yaml`, `MASTER-DEV-PLAN.md`).
- Focus: Icelandic, US, and EU regulatory/tech markets.
- Currency: Defaulted to USD/EUR ($/€).

**DECISION 10: First "Harness" Prototype Live**
- File: `harness_core.py` (The Base Build System).
- File: `deep_research_harness.py` (Specific Implementation).
- Logic: Implemented "Four Pillars" (Deterministic Chains, Persistent State, RAAL Filter, Progressive Disclosure).
- DeepSeek-style Build: Optimized for high-efficiency, localized SLM kernels (Mini-Harnesses).

---

### SYSTEM STATUS (Synchronized)

- **Pivot Target:** US/EU Markets (verified).
- **Harness Standard:** Active (verified).
- **GitHub Sync:** Scheduled for next commit.

---
*Memory entry: 2026-04-06 | iVenture Studio ehf.*
