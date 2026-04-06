# iVenture Studio — Brick Catalogue v1.0
**Document Type:** Product Architecture  
**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** iVenture Studio  
**Status:** LIVE — authoritative source of all product modules

---

## Philosophy

Every asset in iVenture Studio is a **Brick** — an independently deployable, independently priceable, independently valuable product module. Bricks can be used alone or snapped together into composite products. No customer is forced to buy more than they need. Every upgrade is a natural pull.

> "The same way Stripe is a payment brick, Twilio is an SMS brick, and Vercel is a deployment brick — each iVenture brick solves one problem completely, and becomes exponentially more powerful when combined."

---

## Brick Taxonomy

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1 — INFRASTRUCTURE BRICKS  (B-01 → B-06)                │
│  Always-on, subscription, foundational compute layer           │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2 — INTELLIGENCE BRICKS    (B-07 → B-11)                │
│  Value-add, subscription, knowledge and skill layer            │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3 — PREDICTION BRICKS      (B-12 → B-15)                │
│  Compute-heavy, pay-per-use or premium tier, optional          │
├─────────────────────────────────────────────────────────────────┤
│  TIER 4 — SCALE BRICKS           (B-16 → B-19)                │
│  Unlock at volume, enterprise, network-effect layer            │
└─────────────────────────────────────────────────────────────────┘
```

---

## TIER 1 — Infrastructure Bricks

---

### B-01 · VIC Engine
**Tagline:** *The AI agent runtime that runs your business*

| Field | Value |
|---|---|
| Brick ID | B-01 |
| Container | `iventure-vic-engine` |
| Port | 8080 |
| Standalone Price | €49/month |
| Billing Model | Flat subscription |
| Dependencies | B-02 (Model Gateway), B-05 (Data Store) |
| Optional | No — core brick |
| Compute Class | Medium |
| AI Drive Source | `mesh/` |

**What it does standalone:**
- Routes user tasks to appropriate VMOA skills via GRPO scoring
- Maintains agent context and memory across sessions
- Manages 9 VMOA agent orchestration
- Provides VIC Engine API at `http://vic-engine:8080/v1`
- Handles task queuing, retry logic, fault tolerance

**API Surface:**
```
POST /v1/task          — Submit a task to VIC Engine
GET  /v1/task/{id}     — Poll task status
GET  /v1/agents        — List active VMOA agents
GET  /v1/skills        — List available skills
GET  /health           — Health check
GET  /capabilities     — Brick capability manifest
```

**Standalone value:** A fully autonomous AI operations layer. Give it a goal; it figures out which skills to use, in what order, and executes end-to-end without human intervention.

---

### B-02 · Model Gateway
**Tagline:** *One API key. 30+ frontier models. Zero lock-in.*

| Field | Value |
|---|---|
| Brick ID | B-02 |
| Container | `iventure-litellm` |
| Port | 4000 |
| Standalone Price | €29/month |
| Billing Model | Flat subscription + token overage |
| Dependencies | B-06 (Cache Layer) |
| Optional | No — required by B-01, B-12 |
| Compute Class | Light |
| AI Drive Source | `phase2/litellm_config_p2.yaml` |

**What it does standalone:**
- Unified OpenAI-compatible API routing to 30+ models
- Automatic fallback chains (primary → secondary → tertiary)
- Cost routing: cheapest model that meets quality threshold
- Redis-backed response caching (TTL 3600s)
- Model pool: GPT-5, Claude Opus 4, DeepSeek-R1, Grok-4, Gemini 2.5 Pro, Qwen3-Max, Kimi K2.5, Nemotron 3 Super, GLM-5, MiniMax M2.5, Qwen-turbo + more

**Routing Strategy:** `least-busy` with GRPO-weighted quality scoring  
**Included tokens:** 1M tokens/month (mix of input+output)  
**Overage:** €0.001 per 1K tokens above included limit

---

### B-03 · OpenClaw Node
**Tagline:** *A browser-capable AI agent that works like a human employee*

| Field | Value |
|---|---|
| Brick ID | B-03 |
| Container | `iventure-openclaw` |
| Port | 3001 |
| Standalone Price | €19/month |
| Billing Model | Flat subscription |
| Dependencies | B-02 (Model Gateway) |
| Optional | Yes |
| Compute Class | Light-Medium |
| AI Drive Source | `openclaw/` |
| Underlying Cost | Alibaba Cloud SAS $8/month |

**What it does standalone:**
- Full OpenClaw agent with 565+ built-in skills
- Browser automation (web research, form filling, data extraction)
- Integration with 50+ external platforms
- Persistent memory across sessions
- Natural language task execution
- Connects to Alibaba Model Studio (Qwen3, Kimi K2.5, GLM-5)

**Deployment options:**
- Alibaba Simple Application Server (€19/month — non-guaranteed performance)
- Alibaba Compute Nest ECS (€39/month — guaranteed performance)
- Self-hosted (bring your own server)

---

### B-04 · Knowledge Graph
**Tagline:** *Your business intelligence in a queryable graph*

| Field | Value |
|---|---|
| Brick ID | B-04 |
| Container | `iventure-neo4j` |
| Port | 7474 (HTTP), 7687 (Bolt) |
| Standalone Price | €29/month |
| Billing Model | Flat subscription |
| Dependencies | None |
| Optional | Yes (required by B-12 Prediction Engine) |
| Compute Class | Medium |
| AI Drive Source | `docker-compose.yml` |

**What it does standalone:**
- Neo4j Community Edition 5.15
- Graph storage for entity relationships (companies, people, markets, products)
- OPC network mapping (who knows whom, supply chains, partnerships)
- Market graph for MiroFish agent seeding
- GraphRAG integration for knowledge-grounded LLM queries
- Cypher query API

---

### B-05 · Data Store
**Tagline:** *Structured memory for your entire operation*

| Field | Value |
|---|---|
| Brick ID | B-05 |
| Container | `iventure-postgres` |
| Port | 5432 |
| Standalone Price | €19/month |
| Billing Model | Flat subscription |
| Dependencies | None |
| Optional | No — required by B-01, B-07, B-16 |
| Compute Class | Light |
| AI Drive Source | `phase1/postgres-init.sql` |

**Schema (8 tables, 18+ skill seeds):**
- `companies` — portfolio company records
- `users` — operator accounts and entitlements
- `agents` — VMOA agent state and GRPO scores
- `interactions` — all agent task logs
- `skills` — 18 seeded skills + brick registry
- `memory_entries` — long-term agent memory
- `cortex_signals` — anonymised Cortex contributions
- `bricks` — brick catalogue (NEW in v1.0)
- `user_entitlements` — which bricks each user has access to (NEW in v1.0)

---

### B-06 · Cache Layer
**Tagline:** *Speed and cost reduction for everything*

| Field | Value |
|---|---|
| Brick ID | B-06 |
| Container | `iventure-redis` |
| Port | 6379 |
| Standalone Price | Included in B-01 or B-02 |
| Billing Model | Bundled |
| Dependencies | None |
| Optional | No — required by B-01, B-02 |
| Compute Class | Light |
| AI Drive Source | `docker-compose.yml` |

**What it does:** LiteLLM response caching, session state, rate limiting, job queues for B-12.  
**AWS Free Tier alternative:** ElastiCache t2.micro (750 hrs/month free) — recommended for staging.

---

## TIER 2 — Intelligence Bricks

---

### B-07 · VIC Cortex
**Tagline:** *The world model that gets smarter with every operator*

| Field | Value |
|---|---|
| Brick ID | B-07 |
| Container | `iventure-cortex` |
| Port | 8070 |
| Standalone Price | €39/month (read-only access) |
| Billing Model | Flat subscription |
| Dependencies | B-05 (Data Store) |
| Optional | Yes |
| Compute Class | Medium |
| AI Drive Source | `VIC-CORTEX-SPEC.md`, `cortex_contributor.py` |

**What it does standalone:**
- Aggregates anonymised signals from all connected VIC Engine nodes
- Surfaces market patterns, sentiment trends, opportunity signals
- EU-compliant storage (Iceland data residency)
- Differential privacy on all aggregated data
- REST API for signal queries
- Sector-isolated shards (manufacturing signals never mix with retail)

**Access tiers:**
- Read-only (€39/month) — consume Cortex signals
- Contributor (Free) — contribute data, receive signals in exchange
- Premium signals (€99/month) — early access to trading signals

**Data residency:** Iceland (EU) primary, Alibaba cn-hangzhou shard for PIPL compliance

---

### B-08 · VMOA Skill Pack
**Tagline:** *19 autonomous business skills, deployable individually or as a suite*

| Field | Value |
|---|---|
| Brick ID | B-08 |
| Container | `iventure-vmoa` (suite) or per-skill containers |
| Port | 8085–8103 (one per skill) |
| Standalone Price | €9/skill/month OR €79/month all 19 |
| Billing Model | À la carte or bundle |
| Dependencies | B-01 (VIC Engine), B-02 (Model Gateway) |
| Optional | Yes (B-01 works with 0 skills) |
| Compute Class | Light–Heavy (varies by skill) |
| AI Drive Source | `phase1/postgres-init.sql` (skills seeded) |

**Skill Catalogue (19 skills):**

| Skill ID | Name | Description | Compute |
|---|---|---|---|
| S-01 | market-research | Deep market analysis, competitor mapping | Medium |
| S-02 | content-creation | Blog posts, social copy, newsletters | Light |
| S-03 | financial-modeling | Revenue projections, P&L, unit economics | Medium |
| S-04 | product-strategy | Roadmap planning, feature prioritisation | Medium |
| S-05 | lead-generation | Prospect outreach, list building | Medium |
| S-06 | seo-optimization | Keyword research, on-page SEO | Light |
| S-07 | customer-support | Helpdesk automation, ticket triage | Light |
| S-08 | data-analysis | CSV/JSON insights, statistical summaries | Medium |
| S-09 | code-generation | Python/JS/SQL boilerplate, refactoring | Medium |
| S-10 | legal-compliance | Contract templates, compliance checks | Medium |
| S-11 | social-media | Campaign planning, post scheduling | Light |
| S-12 | email-marketing | Newsletter creation, sequence design | Light |
| S-13 | presentation-gen | Slide deck creation, pitch decks | Medium |
| S-14 | brand-identity | Logo briefs, brand guidelines | Light |
| S-15 | opc-onboarding | Chinese OPC operator onboarding guide | Medium |
| S-16 | subsidy-advisor | EU/national grant identification, auto-apply | Heavy |
| S-17 | cross-border-trade | Iceland–EU–China routing and compliance | Heavy |
| S-18 | cortex-distiller | Anonymise and contribute interactions to Cortex | Light |
| S-19 | market-simulation | **Prediction Engine bridge** → routes to B-12 | Heavy |

---

### B-09 · Subsidy Advisor
**Tagline:** *Find and apply for grants automatically*

| Field | Value |
|---|---|
| Brick ID | B-09 |
| Standalone Price | €29/month |
| Dependencies | B-02, B-05 |
| AI Drive Source | `phase1/postgres-init.sql` (S-16 seed) |

**What it does:** Scans EU structural funds, national innovation grants, R&D tax credits, and SME support programmes. Matches operator profile to eligible grants. Auto-drafts applications. Tracks submission deadlines. Average grant found per operator: €15,000–€150,000.

---

### B-10 · Cross-Border Trade
**Tagline:** *Iceland–EU–China in one workflow*

| Field | Value |
|---|---|
| Brick ID | B-10 |
| Standalone Price | €49/month |
| Dependencies | B-02, B-04, B-18 (China Node) |
| AI Drive Source | `phase1/postgres-init.sql` (S-17 seed) |

**What it does:** End-to-end cross-border trade intelligence for the Iceland–EU–China triangle. Covers customs classification, PIPL/GDPR compliance routing, logistics optimisation, FTA utilisation, and currency hedging signals.

---

### B-11 · OPC Onboarding
**Tagline:** *Zero-friction onboarding for Chinese OPC operators*

| Field | Value |
|---|---|
| Brick ID | B-11 |
| Standalone Price | €19/month |
| Dependencies | B-02, B-18 |
| AI Drive Source | `phase1/postgres-init.sql` (S-15 seed) |

**What it does:** Complete onboarding journey for Chinese OPC (Original Product Creator) operators. Covers ICP registration guidance, WeChat/Alibaba ecosystem integration, PIPL compliance checklist, and first 90-day action plan. Delivered in Simplified Chinese via Qwen3.

---

## TIER 3 — Prediction Bricks ⚡ COMPUTE-HEAVY — OPT-IN ONLY

> **Cost transparency is mandatory for all Tier 3 bricks.** Every request shows an estimated cost and requires explicit user confirmation before execution. Users on free/Spark/Builder plans see an upsell prompt instead of a confirmation dialog.

---

### B-12 · Prediction Engine ⭐ Flagship Prediction Brick
**Tagline:** *Run 2,847 AI agents to predict any decision before you make it*

| Field | Value |
|---|---|
| Brick ID | B-12 |
| Container | `iventure-mirofish` + `iventure-skill-market-sim` |
| Port | 3000 (UI), 8085 (API) |
| Standalone Price | €4/simulation (pay-per-use) |
| Subscription Tiers | €49/mo (15 sims) · €149/mo (60 sims) · Enterprise (unlimited) |
| Billing Model | Metered (Stripe) |
| Dependencies | B-02, B-04, B-05 |
| Optional | **YES — explicit opt-in required** |
| Compute Class | **HEAVY** |
| AI Drive Source | `phase25/`, `integrations/OASIS-MIROFISH-DEFINITIVE.md` |
| Underlying Tech | MiroFish-Offline + OASIS (camel-ai) |
| LLM Backend | Kimi K2.5 (default) / Nemotron 3 Super / Qwen3-Max |

**What it does standalone:**
- Spawns 50–2,847 AI agents representing your target market
- Each agent has a unique persona, cultural background, role, and decision framework
- Agents interact across 23 action types (post, comment, share, buy, reject, etc.)
- Returns: sentiment score, controversy index, virality score, coalition map, top objections, recommended framing, Go/No-Go signal
- Supports: English, Chinese (zh), German, French, Japanese
- Market segments: chinese_opc_manufacturing, western_b2b_saas, eu_enterprise, crypto_trading, general

**Cost Preview UX (mandatory):**
```
┌──────────────────────────────────────────────────┐
│  🔮 Prediction Engine — Cost Estimate            │
│                                                  │
│  Question:  "How will EU SMEs react to €299?"    │
│  Agents:    200 (recommended)                    │
│  Rounds:    20                                   │
│  Model:     Kimi K2.5                            │
│  ─────────────────────────────────────────────   │
│  Estimated LLM cost:    €1.80                    │
│  Estimated time:        ~3 minutes               │
│  Charged to:            Pay-per-use (€4.00)      │
│                                                  │
│  [▶ Run Simulation]  [Adjust]  [Cancel]          │
└──────────────────────────────────────────────────┘
```

**Simulation pricing breakdown:**

| Agents | Rounds | LLM Cost (Kimi K2.5) | Charge to User |
|---|---|---|---|
| 50 | 10 | ~€0.20 | €2.00 |
| 200 | 20 | ~€1.80 | €4.00 |
| 500 | 40 | ~€16.80 | €4.00 (subscription) |
| 2,847 | 20 | ~€28.00 | €4.00 (subscription) |

*At 2,847 agents (Polymarket-grade): the simulation costs €28 in LLM calls but is priced at €4 per run on subscription — the margin is in volume. At 1,000 subscribers doing 15 sims/month: 15M agent decisions/month at near-zero marginal cost.*

**Report output schema:**
```json
{
  "simulation_id": "sim_xxxxxxxx",
  "question": "...",
  "agents": 500,
  "sentiment_score": 0.6841,
  "controversy_index": 0.5512,
  "virality_score": 0.7230,
  "trading_signal": "GO",
  "top_objections": ["...", "...", "..."],
  "coalition_map": {
    "enthusiastic": 0.19,
    "cautious_supporters": 0.28,
    "fence_sitters": 0.21,
    "sceptics": 0.18,
    "opponents": 0.09,
    "undecided": 0.05
  },
  "platform_breakdown": {
    "twitter": 0.781,
    "linkedin": 0.512,
    "wechat": 0.389
  },
  "recommended_framing": "...",
  "cortex_signal_sent": true,
  "report_url": "https://reports.iventure.studio/sim_xxxxxxxx",
  "cost_eur": 4.00,
  "llm_calls": 40000,
  "duration_seconds": 187
}
```

---

### B-13 · Market Signal
**Tagline:** *2,847 agents. One trading signal.*

| Field | Value |
|---|---|
| Brick ID | B-13 |
| Standalone Price | €8/signal (pay-per-use) or included in Predictor bundle |
| Dependencies | B-12 (Prediction Engine) |
| Optional | YES |
| Compute Class | HEAVY |
| AI Drive Source | `phase25/vmoa_skill_market_simulation.py` |

**What it does:** Runs a 2,847-agent simulation focused specifically on asset/market sentiment. Returns a BUY/HOLD/SELL signal with confidence score, controversy index, and reasoning chain. Proven: $4,266 profit / 338 trades in MiroFish demo (source: Chen Tianqiao investment case). LLM calls per signal: ~113,880.

---

### B-14 · Policy Simulator
**Tagline:** *Test any business or regulatory decision before it's irreversible*

| Field | Value |
|---|---|
| Brick ID | B-14 |
| Standalone Price | €6/simulation or included in Predictor bundle |
| Dependencies | B-12 |
| Optional | YES |
| Compute Class | HEAVY |

**What it does:** Simulates the impact of pricing changes, product launches, policy updates, or market entries on a defined stakeholder group. Specifically tuned for: regulatory change impact, pricing sensitivity analysis, new market entry readiness.

---

### B-15 · Crisis Tester
**Tagline:** *What happens to your business if everything goes wrong?*

| Field | Value |
|---|---|
| Brick ID | B-15 |
| Standalone Price | €6/simulation or included in Predictor bundle |
| Dependencies | B-12 |
| Optional | YES |
| Compute Class | HEAVY |

**What it does:** PR crisis simulation. Inject a scenario (data breach, pricing controversy, product failure, regulatory action) and simulate the public reaction across platforms. Returns: crisis severity score, viral spread prediction, optimal response strategy, hour-by-hour narrative prediction.

---

## TIER 4 — Scale Bricks

---

### B-16 · Portfolio Manager
**Tagline:** *One founder. N autonomous companies.*

| Field | Value |
|---|---|
| Brick ID | B-16 |
| Container | `iventure-portfolio` |
| Port | 8060 |
| Standalone Price | €99/month (up to 5 companies) |
| Billing Model | Tiered (5/10/unlimited companies) |
| Dependencies | B-01, B-05, B-17 |
| Optional | Yes |
| Compute Class | Medium |
| AI Drive Source | `MASTER-DEV-PLAN.md` (Portfolio Layer) |

**What it does standalone:**
- Spawns new autonomous companies in ~3 minutes
- Assigns VIC Engine instance per company
- Allocates skills and models per company context
- Cross-company resource sharing (A2A task delegation)
- Unified P&L dashboard across all companies
- Solo founder management interface

---

### B-17 · A2A Network
**Tagline:** *Let your companies trade tasks and revenue with each other*

| Field | Value |
|---|---|
| Brick ID | B-17 |
| Container | `iventure-a2a` |
| Port | 8050 |
| Standalone Price | 2% of task value (marketplace fee) |
| Billing Model | Transaction fee |
| Dependencies | B-01, B-05 |
| Optional | Yes |
| Compute Class | Light |
| AI Drive Source | `a2a_card.py` |

**What it does standalone:**
- Agent-to-Agent task marketplace
- Companies post tasks they need done; other companies bid
- Automated settlement via internal credits
- External A2A: connect to other iVenture Studio operators' companies
- Revenue sharing: task completions generate real revenue flows

---

### B-18 · China Node
**Tagline:** *PIPL-compliant. Qwen3-native. Sub-20ms for Chinese OPCs.*

| Field | Value |
|---|---|
| Brick ID | B-18 |
| Container | `iventure-cn-node` (on Alibaba Cloud cn-hangzhou) |
| Port | 8090 (mirrors main API) |
| Standalone Price | €59/month |
| Billing Model | Flat subscription |
| Dependencies | B-01, B-02 (China-region versions) |
| Optional | Yes |
| Compute Class | Medium |
| AI Drive Source | `integrations/OASIS-MIROFISH-DEFINITIVE.md` |
| Underlying | Alibaba Cloud ECS + PolarDB + ApsaraDB Redis + Qwen3 DashScope |

**What it does standalone:**
- Full VIC Engine stack deployed on Alibaba Cloud cn-hangzhou
- Chinese citizen data never leaves mainland China (PIPL compliant)
- Qwen3-72B as primary model (natively Chinese-trained)
- ICP registration assistance
- WeChat/Alibaba ecosystem integration
- <20ms latency for Chinese OPC operators
- Cortex shard on cn-hangzhou (PIPL-safe signal aggregation)

---

### B-19 · Cortex Contributor
**Tagline:** *Feed data. Receive intelligence. The cooperative model.*

| Field | Value |
|---|---|
| Brick ID | B-19 |
| Container | `iventure-cortex-feed` |
| Port | 8055 |
| Standalone Price | **FREE** |
| Billing Model | Data-for-intelligence swap |
| Dependencies | B-01, B-07 |
| Optional | Yes |
| Compute Class | Light |
| AI Drive Source | `cortex_contributor.py` |

**What it does standalone:**
- Anonymises and contributes VIC Engine interaction data to central Cortex
- Applies differential privacy (Google DP library) before transmission
- In exchange: receives Cortex Intelligence bundle access (B-07) free
- Founding node operators (first 100): receive lifetime 50% discount on all bricks
- Sector isolation: data only mixes within same industry vertical
- Chinese operators: data routes to cn-hangzhou Cortex shard (PIPL safe)

**Privacy guarantees:**
- Differential privacy ε ≤ 0.1 on all aggregated signals
- No raw interaction data leaves the operator's node
- Operator retains ownership of contributed data (cooperative model)
- Data cannot be used to train models that compete with the operator's business

---

## Brick Dependency Graph

```
B-19 ──────────────────────────────────────────► B-07 (Cortex)
                                                   ▲
B-18 (China Node) ─────────────────────────────────┤
                                                   │
B-16 (Portfolio) ──► B-17 (A2A) ──► B-01 ──► B-07 ┤
                                     │             │
B-15 (Crisis) ──────────────────────►│             │
B-14 (Policy) ──────────────────────►│             │
B-13 (Market Sig) ──► B-12 ─────────►│             │
                       │             │             │
                       ▼             ▼             │
                      B-04 (Neo4j)  B-05 (Postgres)┤
                                     │             │
B-11 (OPC) ─────────────────────────►│             │
B-10 (Trade) ───────────────────────►│             │
B-09 (Subsidy) ─────────────────────►│             │
B-08 (Skills) ──────────────────────►│             │
                                     │             │
B-03 (OpenClaw) ──► B-02 ───────────►│             │
                     │               │             │
                     ▼               │             │
                    B-06 (Redis) ────┘─────────────┘
```

**Legend:** `──►` = requires | `─────────────►` = optional enhancement

---

## Brick Communication Standard

Every brick must implement the following four endpoints:

```yaml
# MANDATORY BRICK CONTRACT v1.0

GET /health
  response:
    status: "healthy" | "degraded" | "offline"
    brick_id: string
    version: string
    uptime_seconds: integer
    dependencies_ok: boolean

GET /capabilities
  response:
    brick_id: string
    name: string
    version: string
    compute_class: "light" | "medium" | "heavy"
    pricing:
      model: "flat" | "metered" | "free" | "transaction"
      price_eur: number
      unit: string
    skills: string[]
    inputs: object
    outputs: object

POST /execute
  headers:
    Authorization: Bearer ${INTERNAL_API_KEY}
    X-Billing-Ref: string        # Stripe customer ID
    X-User-Plan: string          # User's current bundle
    X-Confirm-Cost: boolean      # Must be true for heavy bricks
  body:
    task: string
    params: object
    callback_url: string         # AWS Lambda callback
  response:
    result: object
    tokens_used: integer
    cost_eur: number
    duration_ms: integer
    brick_id: string

POST /billing/report
  # Called internally by Lambda after /execute
  body:
    user_id: string
    units_consumed: number
    cost_eur: number
    stripe_meter_event: string
```

---

## Brick Registry (DynamoDB Schema)

Table: `brick_registry` (AWS always-free tier)

```json
{
  "brick_id": "B-12",
  "name": "prediction-engine",
  "tier": 3,
  "container": "iventure-mirofish",
  "endpoint": "http://iventure-mirofish:8085",
  "status": "healthy",
  "pricing_model": "metered",
  "price_per_unit_eur": 4.00,
  "unit": "simulation",
  "subscription_tiers": [
    {"price_eur": 49, "units_per_month": 15, "stripe_price_id": "price_lite"},
    {"price_eur": 149, "units_per_month": 60, "stripe_price_id": "price_pro"},
    {"price_eur": 0, "units_per_month": 9999, "stripe_price_id": "price_enterprise"}
  ],
  "optional": true,
  "compute_class": "heavy",
  "requires_cost_confirmation": true,
  "dependencies": ["B-02", "B-04", "B-05"],
  "bundles": ["PREDICTOR", "EMPIRE"],
  "ai_drive_source": "phase25/",
  "llm_default": "kimi-k2.5",
  "created_at": "2026-03-17T00:00:00Z",
  "updated_at": "2026-03-17T00:00:00Z"
}
```

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-03-17 | Initial catalogue — 19 bricks across 4 tiers |

---

*This document is the authoritative source for all iVenture Studio product modules. All PRDs, pricing pages, Stripe configurations, and Docker Compose files must reference brick IDs from this catalogue.*
