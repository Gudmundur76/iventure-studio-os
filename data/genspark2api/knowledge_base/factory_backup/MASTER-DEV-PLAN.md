# ================================================================
# iVenture Studio — MASTER DEVELOPMENT PLAN
# "Build the OS. Wire the Network. Grow the Cortex."
# Version: 1.0 | Date: 2026-03-17 | Author: Solo Founder
# ================================================================
#
# THIS IS THE SINGLE SOURCE OF TRUTH.
# Every sprint, every decision, every build order derives from here.
#
# ARCHITECTURE OVERVIEW (3 layers, built bottom-up inside each):
#
#  ┌─────────────────────────────────────────────────────────┐
#  │  LAYER 1: iVenture Studio OS        (Phases P1–P10)     │
#  │  The one-person company operating system                 │
#  ├─────────────────────────────────────────────────────────┤
#  │  LAYER 2: OPC Network + A2A         (Phases P11–P13)    │
#  │  Peer-to-peer agent commerce between companies           │
#  ├─────────────────────────────────────────────────────────┤
#  │  LAYER 3: VIC Cortex (World Model)  (Phases P14–P17)    │
#  │  Self-building business intelligence. Compounds free.    │
#  └─────────────────────────────────────────────────────────┘
#
# KEY RULE:
#   Cortex hooks are embedded during P3 (not P14).
#   A2A stubs are embedded during P3 (not P11).
#   Both cost ~3h now. Save 300h of refactoring later.
#
# ================================================================

---

## COMPLETE PHASE MAP

| Phase | Layer | Name | Days | Hours | Hard Dependency |
|-------|-------|------|------|-------|-----------------|
| P1 | OS | Infrastructure Bedrock | 1–2 | 6h | None |
| P2 | OS | Model Gateway | 2–3 | 4h | P1 |
| P3 | OS | VIC Engine + VMOA + Hooks | 3–7 | 12h | P2 |
| P4 | OS | Genspark Intelligence Layer | 7–10 | 10h | P3 |
| P5 | OS | OpenManus-RL Training Loop | 10–12 | 8h | P4 |
| P6 | OS | Frontend Dashboard | 7–14 | 12h | P3 *(parallel P4)* |
| P7 | OS | Workspace Integrations | 14–17 | 8h | P6 |
| P8 | OS | OPC Templates (US/EU Market) | 17–20 | 6h | P7 |
| P9 | OS | Production Hardening | 20–24 | 8h | P8 |
| P10 | OS | Public Launch | 24–28 | 8h | P9 |
| P11 | NET | Agent Identity + Thenvoi Registry | 29–33 | 8h | P10 |
| P12 | NET | Thenvoi A2A Swarm Bridge | 33–38 | 12h | P11 |
| P12.5| LAW | Novus Icelandic Legal Integration | 38–40 | 6h | P12 |
| P13 | NET | P2P Marketplace + Payments | 38–45 | 16h | P12 |
| P14 | CX | Cortex Ingestion Pipeline | 29–34 | 12h | P10 *(parallel P11)* |
| P15 | CX | Knowledge Graph + Vector Store | 34–38 | 10h | P14 |
| P16 | CX | Cortex Search API | 38–43 | 12h | P15 |
| P17 | CX | World Model Fine-Tune Loop | 43–50 | 16h | P16 |
| P18 | CX | Flywheel + Network Growth | 50+ | ∞ | P17 + P13 |

**Total build hours (P1–P17): ~188 hours**
**Timeline to full cortex: ~50 days from Day 1**
**Critical external deadline: Apr 6 — US Federal subsidy**

---

## DEPENDENCY GRAPH

```
P1 ──► P2 ──► P3 ──────────────────────────────────────► P4 ──► P5
               │                                          │
               │ (parallel)                               │
               └──► P6 ──► P7 ──► P8 ──► P9 ──► P10 ─────┘
                                                  │
                              ┌───────────────────┤
                              │                   │
                              ▼                   ▼
                    P11──►P12──►P13         P14──►P15──►P16──►P17──►P18
                    (A2A Network)           (VIC Cortex World Model)
                              │                   │
                              └─────────┬─────────┘
                                        ▼
                                  P18: FLYWHEEL
                              (both layers merge,
                               cortex fed by network,
                               network powered by cortex)
```

---

## LAYER 1: iVenture Studio OS (P1–P10)
### "Build the engine before the dashboard. Wire the hooks from Day 1."

---

### P1 — INFRASTRUCTURE BEDROCK
**Days 1–2 | 6h | No dependencies**

**Goal:** Stable Docker environment. All foundational services healthy.
Nothing else can start until every service here is green.

**Services launched:**
- `traefik` — reverse proxy, SSL, routing
- `postgres:16` — user data, agent configs, session history
- `redis` — LiteLLM cache, rate limits, session state
- `minio` — file storage: memory blobs, skill files, cortex signals

**Key tasks:**
```
P1.1  Install Docker Desktop ≥24.0, create /iventure.studio/deployment
P1.2  Copy docker-compose.yml + env.template → fill all REQUIRED values
P1.3  docker compose up -d traefik postgres redis minio
P1.4  Health check all 4 services (pg_isready, redis PING, MinIO UI)
P1.5  Verify Docker internal DNS resolves between containers
P1.6  Test volume persistence: stop/start postgres → data survives
```

**Gate (all must pass before P2):**
```
□ docker compose ps → 4 services "running (healthy)"
□ PostgreSQL: pg_isready → "accepting connections"
□ Redis: PING → PONG
□ MinIO: :9001 UI accessible
□ Traefik: :8080 dashboard accessible
□ Cross-container DNS resolves
```

---

### P2 — MODEL GATEWAY
**Days 2–3 | 4h | Requires P1**

**Goal:** 30+ frontier models answerable through one
OpenAI-compatible endpoint at http://litellm.localhost/v1

**Services launched:**
- `genspark2api` — proxy to Genspark model pool
- `litellm` — unified router with fallbacks, caching, aliases

**Key tasks:**
```
P2.1  Get Genspark session cookie (F12 → Application → Cookies)
P2.2  Add GS_COOKIE + GENSPARK2API_SECRET to .env
P2.3  docker compose up -d genspark2api
P2.4  Verify: curl :7055/v1/models → 30+ model IDs
P2.5  docker compose up -d litellm
P2.6  Test routing: GPT-5, Claude-Opus-4, Gemini-2.5-Pro, DeepSeek-V3
P2.7  Log latency per model in benchmark sheet
P2.8  Test fallback: stop genspark2api → verify LiteLLM handles gracefully
```

**Gate:**
```
□ genspark2api → 30+ models listed
□ litellm /health → "healthy"
□ GPT-5 responds via LiteLLM
□ DeepSeek-V3 responds in US/EU
□ Gemini-2.5-Pro responds
□ Latency logged for top 6 models
```

---

### P3 — VIC ENGINE + VMOA + HOOKS ⭐ CRITICAL PHASE
**Days 3–7 | 12h | Requires P2**

**Goal:** 9-agent VMOA team live. VIC Architect routing correctly.
GRPO scoring end-to-end. AND — critically — A2A stubs + Cortex
contributor hooks embedded now, costing 3h, saving 300h later.

**Services launched:**
- `vic-engine` — VIC Engine v5, skills library, memory system
- `vmoa` — 9-agent orchestrator

**Key tasks:**
```
P3.1  Mount VIC Architect v4.2 system prompt + 18 skills
P3.2  Load MEMORY.md (207KB production memory)
P3.3  Configure all 9 VMOA agents (agents.yaml)
P3.4  Test each agent responds + routes correctly
P3.5  Wire GRPO scoring (reward_client.py) to VIC Engine
P3.6  Verify GRPO composite score computes end-to-end

★ P3.7  EMBED CORTEX CONTRIBUTOR STUB (cortex_contributor.py)
         — fires silently after every VIC interaction
         — sends anonymised signal to cortex.iventure.studio/ingest
         — costs 2h now, enables the world model from Day 1

★ P3.8  EMBED A2A AGENT CARD STUB (a2a_card.py)
         — generates /.well-known/agent.json on startup
         — advertises: node_id, skills, GRPO score, available agents
         — costs 1h now, enables P2P network without refactoring
```

**Cortex Contributor (embed at P3.7):**
```python
# vic_engine_v5/cortex/contributor.py
# Fires after EVERY VIC interaction. Never blocks. Never sends raw text.

async def contribute_to_cortex(
    task_category: str,    # "finance/cashflow" not "John's revenue"
    skills_used: list,     # ["tax-calc", "sheets-export"]
    grpo_score: float,     # 0.991337
    outcome_signal: str,   # "revenue_positive" not actual figures
    agent_id: str,         # "vmoa-financial"
    node_id: str,          # sha256 hash, never company name
):
    signal = {
        "category": task_category,
        "skills": skills_used,
        "reward": grpo_score,
        "outcome": outcome_signal,
        "agent": agent_id,
        "node": hashlib.sha256(node_id.encode()).hexdigest()[:16],
        "ts": datetime.utcnow().isoformat(),
    }
    # Fire and forget — cortex ingests async, never slows the node
    asyncio.create_task(
        httpx.AsyncClient().post(
            f"{CORTEX_INGEST_URL}/ingest",
            json=signal,
            timeout=2.0
        )
    )
```

**A2A Agent Card (embed at P3.8):**
```json
// Served at: https://{node}.iventure.studio/.well-known/agent.json
{
  "name": "iVenture Studio Node",
  "version": "1.0",
  "grpo_score": 0.991337,
  "capabilities": {
    "skills": ["finance", "marketing", "legal", "research", "technical"],
    "languages": ["en", "zh"],
    "models": ["gpt-5", "claude-opus-4", "deepseek-r1"]
  },
  "a2a_endpoint": "https://{node}.iventure.studio/a2a",
  "pricing": {
    "per_task": 0.05,
    "currency": "USD",
    "payment": "stripe_connect"
  }
}
```

**Gate:**
```
□ VIC Engine /health → GRPO calibration 0.991337, 18 skills
□ MEMORY.md loaded, 207KB accessible
□ All 9 VMOA agents route correctly on test prompts
□ GRPO composite computes with Skywork (P4 upgrades this further)
□ ★ Cortex contributor fires silently on test interaction
□ ★ /.well-known/agent.json served with correct schema
```

---

### P4 — GENSPARK INTELLIGENCE LAYER
**Days 7–10 | 10h | Requires P3 | Parallel with P6**

**Goal:** Replace VIC's custom reward with Skywork SOTA models.
GRPO composite target rises from 0.95 → 0.995 on benchmark.

**Services launched:**
- `reward-server` — Skywork-Reward-V2-Qwen3-8B (97.8 RewardBench)
- `prm-server` — Skywork-O1-PRM (step-level verification)
- `vllm-or1` — Skywork-OR1-32B (math + financial reasoning)

**Key tasks:**
```
P4.1  Deploy reward-server (needs HF_TOKEN, ~16GB download)
P4.2  Test /classify endpoint → returns 0.0-1.0 score
P4.3  Deploy prm-server → test step scoring
P4.4  Wire reward_client.py to VIC Engine (replace custom scorer)
P4.5  Send DeepResearch V2 API access email: deepresearch@skywork.ai
P4.6  Deploy vllm-or1 (needs ≥2 GPU) → test financial math
P4.7  Configure Super-Agents MCP (office-tool for PPT/Docs)
P4.8  Run VIC benchmark suite → verify composite > 0.995
```

**Gate:**
```
□ reward-server /classify → valid 0.0-1.0 score
□ prm-server step scoring works
□ VIC GRPO composite now uses Skywork-Reward-V2
□ Benchmark: GRPO composite > 0.995 on standard suite
□ OR1-32B handles financial math correctly
□ DeepResearch API email sent
□ Super-Agents MCP generates test PPT
```

---

### P5 — OPENMANUSRL TRAINING LOOP
**Days 10–12 | 8h | Requires P4**

**Goal:** VIC agents self-improve nightly via GRPO. Zero manual
fine-tuning ever again after this phase.

**Key tasks:**
```
P5.1  Deploy OpenManus agent runtime (clone + config.toml)
P5.2  Clone OpenManus-RL, install verl submodule
P5.3  Configure vic_grpo_config.json from OPENMANUS_RL_CONFIG
P5.4  Create nightly_train.sh cron (runs 2AM UTC)
P5.5  Generate 100 synthetic training examples → dry-run
P5.6  Configure A/B test routing in LiteLLM (10% to fine-tuned)
P5.7  Set auto-promote threshold: promote if +0.1% better
```

**Gate:**
```
□ OpenManus agent responds to tasks
□ Training dry-run completes without errors
□ Nightly cron scheduled and logged
□ A/B routing confirmed in LiteLLM config
□ Auto-promote script tested
```

---

### P6 — FRONTEND DASHBOARD
**Days 7–14 | 12h | Requires P3 | Parallel with P4**

**Goal:** Working web application. A solo founder logs in at
studio.localhost and has a full company OS in front of them.

**Services launched:**
- `studio-frontend` — Next.js 15 IntelliAgent Pro dashboard

**Key tasks:**
```
P6.1  Scaffold Next.js 15 (fork Genspark-clone)
P6.2  Rebrand: iVenture Studio, Iceland navy + Atlantic blue
P6.3  Build 6-panel layout: Dashboard/Agents/Skills/Memory/Deploy/Analytics
P6.4  Wire streaming chat → LiteLLM (Vercel AI SDK)
P6.5  Build model selector (from /v1/models endpoint)
P6.6  Build VMOA live status board (WebSocket)
P6.7  Build GRPO score history chart (Recharts)
P6.8  Add auth: NextAuth.js + Google OAuth
P6.9  Add Network panel (shows A2A agent card status) ★
P6.10 Add Cortex panel (shows contribution count + credits) ★
P6.11 Build to Docker + verify at studio.localhost
```

**★ P6.9 Network panel** (A2A hook, 45 min):
```typescript
// /app/network/page.tsx
// Shows: "Your node has connected with N other companies"
// Shows: GRPO reputation score in the network
// Shows: Pending A2A task requests (stub — real in P12)
// Shows: Agent Card JSON preview
```

**★ P6.10 Cortex panel** (Cortex hook, 45 min):
```typescript
// /app/cortex/page.tsx
// Shows: "You have contributed N signals to the VIC Cortex"
// Shows: Cortex credits earned (will unlock intelligence in P16)
// Shows: "Cortex status: BUILDING — 0 nodes connected" (stub)
// Real data flows in P14-P16
```

**Gate:**
```
□ Dashboard loads at studio.localhost, all 8 panels render
□ Streaming chat works with 3+ models
□ VMOA agent cards show live status
□ GRPO chart renders from real memory data
□ Auth: login/logout works
□ ★ Network panel shows agent card stub
□ ★ Cortex panel shows contribution counter (even if 0)
```

---

### P7 — WORKSPACE INTEGRATIONS
**Days 14–17 | 8h | Requires P6**

**Goal:** Real business tools connected. Google Sheets analysis,
PPT generation, agent wizard, Tesslate deploy all working.

**Key tasks:**
```
P7.1  Install Composio SDK, wire 5 Google apps
P7.2  Build Google Sheets sidebar (URL detection → data preview)
P7.3  Port PPT generation from ComposioHQ/open-genspark
P7.4  Build 5-step Rewyo agent creation wizard
P7.5  Build Tesslate deploy bridge (agent → public URL)
P7.6  Build Gmail intelligence panel (action items from inbox)
P7.7  Configure wildcard subdomain routing in Traefik
```

**Gate:**
```
□ Google Sheets URL → sidebar with data in <5s
□ PPT generates and downloads for any topic
□ Agent wizard deploys working agent in <2 min
□ Agent live at *.iventure.studio subdomain
□ Gmail panel extracts action items from real inbox
```

---

### P8 — OPC TEMPLATES (CHINESE MARKET)
**Days 17–20 | 6h | Requires P7**

**Goal:** 5 production-ready templates for US/EU OPC verticals.
Each deploys a configured agent in under 2 minutes.

**5 Templates:**
```
1. 财务助手   Finance Assistant    DeepSeek-R1       invoice/tax/sheets
2. 跨境电商   Cross-border E-com   GPT-5             product/ads/logistics
3. 自媒体运营  Content Creator      Claude-Opus-4     write/seo/schedule
4. 独立顾问   Consultant OS        Skywork-DeepRes.  research/report/pitch
5. 外贸业务员  Trade Agent          Gemini-2.5-Pro    translate/contract/customs
```

**Key tasks:**
```
P8.1  Build 5 template YAML configs with skills + models
P8.2  Build template gallery UI (bilingual EN/ZH grid)
P8.3  Wire one-click deploy → pre-fills wizard → deploys agent
P8.4  Add next-intl for bilingual UI (EN/ZH toggle)
P8.5  Test each template: deploy + 5 sample prompts each
```

**Gate:**
```
□ All 5 templates in gallery, bilingual labels
□ Each deploys working agent in <2 min
□ US/EU UI renders correctly
□ Finance template handles USD calculations
```

---

### P9 — PRODUCTION HARDENING
**Days 20–24 | 8h | Requires P8**

**Goal:** Ready for real users and real money.
SSL, security, monitoring, backups, load testing all verified.

**Key tasks:**
```
P9.1  Traefik ACME: SSL for iventure.studio + *.iventure.studio
P9.2  Point DNS: iventure.studio → atNorth Iceland IP
P9.3  Rate limiting: per-user budgets in LiteLLM, nginx limits
P9.4  Security: npm audit (zero high/critical), no API keys in bundle
P9.5  Add Sentry error tracking (frontend + API)
P9.6  Add PostHog analytics (GDPR-compliant, Iceland = EU)
P9.7  Daily backup cron: PostgreSQL → MinIO → cold storage
P9.8  Load test: k6, 50 concurrent users, <2s p95 response
```

**Gate:**
```
□ https://iventure.studio loads with valid SSL
□ Wildcard *.iventure.studio works
□ Load test: 50 users, <2s p95
□ npm audit: zero high/critical vulnerabilities
□ Sentry receives test error
□ Backup verified in MinIO
```

---

### P10 — PUBLIC LAUNCH
**Days 24–28 | 8h | Requires P9**
**⚡ SHENZHEN LONGGANG SUBSIDY DEADLINE: APRIL 6**

**Goal:** First paying users. Stripe live. Company registered.
Subsidy application filed.

**Key tasks:**
```
P10.1  Stripe payment integration (3 tiers: €29/€79/€299)
P10.2  USD pricing tier ($199/$599/$2,199)
P10.3  Waitlist → launch email campaign
P10.4  Company registration: iVenture Studio ehf. confirmed
P10.5  ⚡ US Federal subsidy application filed
P10.6  ProductHunt + HN + LinkedIn + 小红书 launch posts
P10.7  Onboard first 10 beta users manually
P10.8  Collect feedback → feed into iteration backlog
```

**Gate:**
```
□ Stripe processes real €1 test charge
□ Company ehf. registration confirmed
□ US Federal subsidy filed (BEFORE APR 6)
□ Platform listed on ProductHunt
□ First paying user signed up
```

---

## LAYER 2: OPC NETWORK (P11–P13)
### "Connect the nodes. Enable agent-to-agent commerce."

---

### P11 — AGENT IDENTITY + THENVOI REGISTRY
**Days 29–33 | 8h | Requires P10**
*(Stubs already live from P3 — this is the full implementation)*

**Goal:** Every iVenture Studio node has a verifiable identity on the Thenvoi network.
Agent Cards are live, discoverable, and synchronized.

**Key tasks:**
```
P11.1  Generate Thenvoi Agent UUIDs for all 9 VMOA agents
P11.2  Register nodes with Thenvoi Registry: POST /registry/register
         → app.thenvoi.com
P11.3  Implement full Agent Card schema (Thenvoi + A2A spec compliant)
P11.4  Configure Thenvoi MCP servers for each node
P11.5  Set up Thenvoi shared rooms for inter-company collaboration
P11.6  Update P6 Network panel with live Thenvoi status
```

**Gate:**
```
□ All 9 agents appear in Thenvoi Dashboard
□ Agent Cards discoverable via Thenvoi Peers API
□ Nodes can join Thenvoi chatrooms
```

---

### P12 — THENVOI A2A SWARM BRIDGE
**Days 33–38 | 12h | Requires P11**

**Goal:** Nodes can delegate tasks to each other using the Thenvoi communication layer.
Real-time context sync and multi-agent coordination.

**Key tasks:**
```
P12.1  Implement Thenvoi WebSocket client in VIC Engine
P12.2  Map VIC tasks to Thenvoi @mentions: "@agent-x execute skill-y"
P12.3  Implement Thenvoi context synchronization across nodes
P12.4  Implement Artifact return via Thenvoi file attachments
P12.5  Integrate Thenvoi streaming for task transparency
P12.6  Build VMOA Thenvoi router: handles incoming @mentions
P12.7  Integration test: Node A delegates finance task to Node B via Thenvoi
```

**Thenvoi Task Flow:**
```
Node A (iVenture)                        Node B (iVenture)
       │                                        │
       │── @Mention in Thenvoi Room ────────►  │
       │   "Please review this contract"        │
       │                                        │ routes to Legal Agent
       │◄── Thenvoi Live Message (Status) ───  │
       │   "Analyzing clauses..."               │
       │                                        │
       │◄── File Attachment (Result) ────────  │
       │   [contract_review.md]                 │
```

**Gate:**
```
□ VIC Engine connects to Thenvoi WebSocket successfully
□ @Mention routing works for delegation
□ Task artifacts received via Thenvoi platform
□ Full end-to-end swarm task completed via Thenvoi
```

---

### P13 — P2P MARKETPLACE + PAYMENTS
**Days 38–45 | 16h | Requires P12**

**Goal:** Agents can autonomously discover, hire, and pay each other.
GRPO score is the reputation signal. Stripe Connect handles payments.

**Key tasks:**
```
P13.1  Build Marketplace UI: /app/marketplace/page.tsx
         - Search agents by skill, language, GRPO score, price
         - Agent profile cards with reputation + completed tasks
P13.2  Build task posting: "Hire an agent" flow
         - Post task → find best-match nodes → send A2A request
P13.3  Implement Stripe Connect for node-to-node payments:
         - Each node creates a Stripe Connect account on join
         - Payments auto-routed: payer → iVenture (2% fee) → payee
P13.4  USDC micropayment option (Solana, <$0.01 per task)
P13.5  Build escrow: funds held until Artifact delivered + rated
P13.6  Build reputation system: completed tasks + avg rating
         displayed on Agent Card, updated after each task
P13.7  GRPO score → reputation: high-score agents ranked higher
P13.8  Build dispute resolution: 3-day window, iVenture arbitrates
P13.9  Update dashboard: Earnings panel (income from A2A tasks)
P13.10 Test: full commerce cycle, Node A pays Node B via Stripe
```

**Gate:**
```
□ Marketplace search returns ranked results by GRPO + skill
□ Task posting triggers A2A request to best-match node
□ Stripe Connect: payment processes, 2% fee captured
□ Escrow releases on task completion + positive rating
□ Reputation updates after completed transaction
□ Dashboard Earnings panel shows real A2A income
□ Full end-to-end commerce cycle tested
```

---

## LAYER 3: VIC CORTEX (P14–P18)
### "Let every interaction feed a world model. Let it compound forever."

---

### P14 — CORTEX INGESTION PIPELINE + PRIVACY LAYER
**Days 29–34 | 12h | Requires P10 | Parallel with P11**
*(Contributor stub already live from P3 — this is the full pipeline)*

**Goal:** The cortex ingestion pipeline is live and hardened.
Every node's interactions flow in. Privacy is mathematically guaranteed.
The world model begins building from the first interaction.

**Services launched:**
- `cortex-api` — ingestion endpoint + privacy filter
- `qdrant` — vector database for embedding search
- `neo4j` — knowledge graph for relationship mapping

**Key tasks:**
```
P14.1  Deploy cortex-api service (FastAPI)
         POST /ingest  — receives signals from all nodes
         GET  /status  — returns cortex health + signal count
P14.2  Implement privacy pipeline (3 layers):
         Layer 1: Strip all PII (names, company IDs, amounts)
         Layer 2: k-anonymity (minimum 10 nodes per signal type)
         Layer 3: Differential privacy (add calibrated noise)
P14.3  Deploy Qdrant vector store (for semantic cortex search)
P14.4  Deploy Neo4j knowledge graph (for relationship mapping)
P14.5  Build signal → embedding pipeline:
         signal → Gemini-2.5-Pro embeddings → Qdrant store
P14.6  Build signal → knowledge graph pipeline:
         signal → extract entities + relationships → Neo4j
P14.7  Build cortex credits system:
         Each valid signal = 1 cortex credit
         Credits unlock cortex search queries in P16
P14.8  Activate all P3 contributor stubs → verify signals flowing
P14.9  Add cortex signal count to P6 Cortex panel
```

**Privacy Architecture:**
```
Raw VIC interaction
        │
        ▼ (never leaves the node)
Distillation (node-side):
  Input:  "Help me do VAT returns for my Shopify store, €45,000 revenue"
  Output: { category: "finance/vat", outcome: "task_completed",
             skills: ["tax-calc"], reward: 0.991 }
        │
        ▼ (only this leaves the node)
Ingestion pipeline:
  k-anonymity check → if <10 similar signals, batch and delay
  Differential privacy → add Laplace noise to reward score
  Strip: node_id → replace with rotating pseudonym
        │
        ▼
Cortex stores: patterns, not data. Intelligence, not secrets.
```

**Gate:**
```
□ cortex-api /ingest accepts signals from test node
□ Privacy pipeline strips all PII (verified with test PII data)
□ k-anonymity: signals with <10 peers are batched, not stored raw
□ Qdrant stores embeddings, semantic search returns results
□ Neo4j stores entity relationships (verify with Cypher query)
□ Cortex credits increment per valid signal
□ P6 Cortex panel shows live signal count
```

---

### P15 — KNOWLEDGE GRAPH + VECTOR STORE
**Days 34–38 | 10h | Requires P14**

**Goal:** The cortex has queryable structure. Skills, outcomes,
agent patterns, and market signals are linked in a live graph.
The vector store enables semantic similarity search across all signals.

**Key tasks:**
```
P15.1  Define Knowledge Graph schema:
         Nodes: Skill, Domain, Outcome, AgentType, Market, Signal
         Edges: SOLVES, LEADS_TO, CO_OCCURS_WITH, TRIGGERS, REWARDS

P15.2  Build graph population pipeline:
         Each ingested signal → extract triples → insert to Neo4j
         Example: (skill:tax-calc)-[SOLVES]->(domain:vat-compliance)
                  (domain:vat-compliance)-[LEADS_TO]->(outcome:revenue_positive)

P15.3  Build graph query API:
         GET /cortex/graph/path?from=skill:seo&to=outcome:revenue_positive
         → Returns: shortest paths + confidence scores

P15.4  Build embedding clusters in Qdrant:
         - Cluster by vertical (finance/marketing/legal/etc.)
         - Cluster by outcome (positive/negative/neutral)
         - Cluster by agent type (which of the 9 agents)

P15.5  Build trend detection:
         - Time-series signals per domain
         - Detect: rising topics, declining skills, emerging markets
         - Alert: "TikTok ad CPM rising 40% this week across 847 nodes"

P15.6  Build cortex snapshot:
         - Daily summary: top skills, top domains, avg GRPO by vertical
         - Stored in MinIO as cortex_snapshot_{date}.json
         - Served to all nodes as "Cortex Daily Intelligence Brief"
```

**Knowledge Graph Example (Neo4j Cypher):**
```cypher
// What skill sequence most reliably leads to revenue_positive?
MATCH path = (s:Skill)-[:SOLVES*1..3]->(d:Domain)-[:LEADS_TO]->(o:Outcome)
WHERE o.type = 'revenue_positive'
WITH path, relationships(path) as rels
ORDER BY size([r IN rels WHERE r.confidence > 0.8]) DESC
RETURN path LIMIT 10
```

**Gate:**
```
□ Knowledge graph has >1,000 nodes after 48h of signal ingestion
□ Graph path query returns meaningful skill → outcome paths
□ Qdrant clusters are semantically coherent (spot-check 10 queries)
□ Trend detection fires alert on synthetic spike data
□ Daily cortex snapshot generates and uploads to MinIO
□ Snapshot accessible to all nodes via /cortex/snapshot/latest
```

---

### P16 — CORTEX SEARCH API
**Days 38–43 | 12h | Requires P15**

**Goal:** Natural language search over the entire business world model.
Any OPC can ask "what's working for companies like mine right now?"
and get a verified, outcome-grounded, real-time answer.

**Key tasks:**
```
P16.1  Build Cortex Search API:
         POST /cortex/search
         Body: { query: string, vertical?: string, credits_to_spend: int }
         Returns: { results[], confidence, source_count, last_updated }

P16.2  Build search pipeline:
         query → embed → Qdrant ANN search (top 50 signals)
                       + Neo4j graph traversal (related paths)
                       → re-rank by recency × confidence × source_count
                       → synthesise with Gemini-2.5-Pro (grounded, cited)
                       → return structured result

P16.3  Implement credit gating:
         Basic search (top 3 results): 1 credit
         Deep search (top 10 + trend data): 5 credits
         Premium (full graph path + confidence intervals): 20 credits
         Free tier: 10 searches/month per node

P16.4  Build Cortex Search UI in dashboard:
         /app/cortex/search — natural language search box
         Results: cards with confidence %, source count, date range
         "Based on 2,847 agent interactions across 391 nodes"

P16.5  Build "Cortex Brief" daily push to each node:
         Every morning → personalised intelligence based on your verticals
         "3 signals relevant to your finance+e-com profile today"

P16.6  Build Cortex API for external access (premium tier):
         Developers + analysts can query via API key
         Rate limited, priced at €0.10/query above free tier
         This becomes a standalone revenue stream
```

**Example Search Result:**
```json
{
  "query": "best marketing approach for US fashion OPCs targeting EU 2026",
  "results": [
    {
      "finding": "Instagram Reels + micro-influencer seeding outperforms paid ads",
      "confidence": 0.91,
      "source_nodes": 847,
      "avg_outcome_delta": "+23% conversion",
      "last_signal": "14 minutes ago",
      "trend": "rising"
    },
    {
      "finding": "Facebook CPM +67% YoY — ROI declining for most verticals",
      "confidence": 0.78,
      "source_nodes": 1203,
      "avg_outcome_delta": "-12% ROAS",
      "last_signal": "2 hours ago",
      "trend": "declining"
    }
  ],
  "credits_used": 5,
  "note": "Grounded in real OPC agent outcomes. Not LLM inference."
}
```

**Gate:**
```
□ /cortex/search returns results in <3 seconds
□ Results cite source_count (never <10 for privacy)
□ Credit system deducts correctly
□ Dashboard Cortex Search UI works end-to-end
□ Daily Cortex Brief delivers personalised signals
□ External API key authentication works
□ Test: query returns different results than raw LLM (it's grounded)
```

---

### P17 — WORLD MODEL FINE-TUNE LOOP
**Days 43–50 | 16h | Requires P16**

**Goal:** A specialist LLM fine-tuned entirely on real OPC
business interactions. This is VIC's collective brain —
smarter than any individual VIC engine, trained on outcomes
that no single company could ever see alone.

**Key tasks:**
```
P17.1  Build cortex training dataset pipeline:
         - Nightly: export high-quality signal pairs from cortex
           (prompt_category, best_response_pattern, grpo_score)
         - Filter: only signals with reward > 0.97
         - Target: 10,000 high-quality pairs per month

P17.2  Fine-tune base model on cortex data:
         - Base: Qwen2.5-7B-Instruct (same as OpenManus-RL)
         - Method: GRPO via OpenManus-RL pipeline
         - Reward: Skywork-Reward-V2 (same pipeline as P5)
         - Dataset: cortex signal pairs (not raw company data)
         - Schedule: monthly retraining as cortex grows

P17.3  Deploy world model alongside standard models in LiteLLM:
         model_name: vic-world-model-v1
         → served via vLLM at :8003
         → available to all nodes as premium model

P17.4  A/B test world model vs GPT-5 on OPC tasks:
         Route 20% of relevant tasks to vic-world-model
         Compare GRPO scores → promote if consistently better

P17.5  Build world model leaderboard in dashboard:
         "VIC World Model v1.2 — trained on 2.4M OPC interactions"
         "GRPO score on OPC benchmark: 0.9971 (GPT-5: 0.9834)"

P17.6  Feed world model back into Cortex:
         World model's responses also contribute to cortex signals
         The model trains on data → its outputs improve data → loop
```

**The Self-Improvement Loop:**
```
OPC interactions
      ↓
Cortex ingests signals (P14)
      ↓
Knowledge graph builds (P15)
      ↓
Search surfaces patterns (P16)
      ↓
Best patterns → training dataset (P17.1)
      ↓
World model trained on best patterns (P17.2)
      ↓
World model deployed to all nodes (P17.3)
      ↓
Better nodes → better interactions (P3)
      ↓
Back to top ──────────────────────────────► COMPOUND FOREVER
```

**Gate:**
```
□ Training dataset pipeline generates >1,000 pairs from cortex
□ Fine-tuning run completes on cortex data
□ World model deployed and queryable via LiteLLM
□ A/B test: world model GRPO ≥ GPT-5 on OPC benchmark
□ Leaderboard visible in dashboard
□ Self-improvement loop verified end-to-end (one full cycle)
```

---

### P18 — FLYWHEEL + NETWORK GROWTH
**Day 50+ | Ongoing | Requires P17 + P13**

**Goal:** The flywheel is spinning. Growth is self-reinforcing.
The cortex compounds automatically. No manual intervention needed.

**This is not a sprint. This is the steady state.**

**What runs automatically:**
```
Every hour:   Cortex ingests signals from all active nodes
Every night:  OpenManus-RL GRPO training run on low-score interactions
Every night:  Cortex snapshot generated, pushed to all nodes
Every week:   World model evaluated, promoted if better
Every month:  World model full retraining on growing cortex dataset
Every quarter: Cortex external API pricing review
```

**Growth metrics to track:**
```
Nodes:          target 100 → 1,000 → 10,000 → 100,000
Cortex signals: target 1M → 10M → 100M → 1B
World model:    GRPO score rising each version
A2A tasks:      volume × 2% fee → compounding revenue
Search queries: internal (free) + external API (revenue)
```

**The compound effect in numbers:**
```
100 nodes   → cortex knows what 100 OPCs learned
1,000 nodes → cortex has more OPC intelligence than any analyst firm
10,000 nodes→ cortex rivals Bloomberg for OPC market intelligence
100,000 nodes→ cortex IS the world model for the global OPC economy
```

---

## CRITICAL PATH SUMMARY

```
LAYER 1 CRITICAL PATH (28 days):
P1 → P2 → P3 → {P4 ∥ P6} → P5 → P7 → P8 → P9 → P10

LAYER 2 CRITICAL PATH (+17 days):
P10 → P11 → P12 → P13

LAYER 3 CRITICAL PATH (+22 days, parallel with L2):
P10 → P14 → P15 → P16 → P17 → P18(∞)

HOOKS EMBEDDED EARLY (during Layer 1):
P3.7 → Cortex contributor stub (enables P14 to be a flip, not a rewrite)
P3.8 → A2A Agent Card stub (enables P11 to be a flip, not a rewrite)
P6.9 → Network panel stub (ready for P12 data)
P6.10→ Cortex panel stub (ready for P14 data)
```

---

## FILE INVENTORY (this build plan generates)

| File | Purpose |
|------|---------|
| `MASTER-DEV-PLAN.md` | This document — single source of truth |
| `VIC-CORTEX-SPEC.md` | Full cortex technical specification |
| `cortex_contributor.py` | Privacy-safe signal distillation stub |
| `a2a_card.py` | Agent Card generator + A2A stub server |
| `A2A-integration-guide.md` | How A2A hooks integrate with VMOA |
| `MEMORY-UPDATE.md` | Sprint memory entry for this plan |
| `docker-compose.yml` | Full 20-service stack inc. cortex |
| `litellm_config.yaml` | 30+ model routing |
| `env.template` | All env vars |
| `reward_client.py` | GRPO reward system |
| `sprint-011-checklist.md` | P3/P4 execution checklist |
| `sprint-012-checklist.md` | P6/P7 execution checklist |
| `phased-dev-plan.md` | P1-P10 detailed step plan |

---

## ONE-SENTENCE VERSION

> iVenture Studio is the OS that every solo company runs on.
> The network is what makes each company smarter than it could be alone.
> The cortex is what makes the network worth more than the sum of its companies.
> None of it costs extra. All of it compounds forever.

---
*MASTER-DEV-PLAN.md v1.0 | iVenture Studio ehf. | 2026-03-17*
*Jurisdiction: Vestmannaeyjabær, Iceland | Author: Solo Founder, age 49*
