# iVenture Studio — Master Architecture Snapshot v0.5
**Date:** 2026-03-18  
**Previous Version:** v0.4  
**Author:** iVenture Studio  
**Status:** CURRENT — authoritative snapshot

---

## Changelog v0.5

| Change | Description |
|---|---|
| **BRICK ARCHITECTURE** | Every asset is now a standalone product brick (B-01→B-19). See BRICK-CATALOGUE-v1.0.md |
| **PREDICTION ENGINE** | B-12 (MiroFish/OASIS) is now an explicit opt-in, pay-per-use module. Full PRD in PREDICTION-ENGINE-PRD-v1.0.md |
| **PRODUCT BUNDLES** | Six bundles (SPARK → EMPIRE + CORTEX PARTNER) defined. See PRODUCT-BUNDLES-v1.0.md |
| **DATABASE SCHEMA** | PostgreSQL upgraded to v1.1 with bricks, user_entitlements, simulation_runs, product_bundles tables |
| **BRICK REGISTRY** | DynamoDB brick_registry schema defined. See BRICK-REGISTRY-SCHEMA.json |
| **FOUR-CLOUD STACK** | atNorth Iceland + Alibaba Cloud + NVIDIA NIM + AWS Free Tier |
| **TRI-STACK LLM** | Kimi K2.5 (default sim LLM) + Nemotron 3 Super (OpenClaw brain) + Qwen3-72B (China node) |
| **SMB CREDITS** | Alibaba Cloud $200 instant + $5,000 potential credits. AWS $200 + always-free services |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  iVenture Studio — Four-Cloud Brick Architecture v0.5                          │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 0 — COMPUTE (Two-Node Hybrid)                                     │  │
│  │                                                                          │  │
│  │  NODE A — atNorth Iceland              NODE B — Alibaba Cloud China      │  │
│  │  ┌──────────────────────────┐          ┌──────────────────────────┐     │  │
│  │  │  GDPR-sovereign          │          │  PIPL-sovereign          │     │  │
│  │  │  Green energy (100% RE)  │◄────────►│  cn-hangzhou             │     │  │
│  │  │  VIC Engine master       │  VIC Mesh│  Qwen3-72B (DashScope)   │     │  │
│  │  │  LiteLLM pool            │  (enc.)  │  PolarDB PostgreSQL      │     │  │
│  │  │  Neo4j Knowledge Graph   │          │  ApsaraDB Redis          │     │  │
│  │  │  MiroFish/OASIS (B-12)   │          │  B-18 China Node         │     │  │
│  │  └──────────────────────────┘          └──────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 1 — SERVERLESS GLUE (AWS Always-Free)                             │  │
│  │                                                                          │  │
│  │  Lambda (1M req/mo)    DynamoDB (25GB)    CloudFront (1TB/mo)            │  │
│  │  SQS (1M req/mo)       SNS (1M pub/mo)   ElastiCache (staging)          │  │
│  │                                                                          │  │
│  │  Lambda dispatches brick calls → checks DynamoDB entitlements            │  │
│  │  → routes to atNorth or Alibaba → reports billing to Stripe             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 2 — AI MODEL LAYER (Tri-Stack LLM)                                │  │
│  │                                                                          │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │  │
│  │  │  Kimi K2.5     │  │  Nemotron 3    │  │  Qwen3-72B     │            │  │
│  │  │  (DashScope)   │  │  Super (NIM)   │  │  (cn-hangzhou) │            │  │
│  │  │  Default LLM   │  │  OpenClaw brain│  │  PIPL-safe LLM │            │  │
│  │  │  $0.60/M in    │  │  Free (dev)    │  │  $0.14/M in    │            │  │
│  │  │  262K context  │  │  1M context    │  │  Chinese OPCs  │            │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘            │  │
│  │  All routed through B-02 LiteLLM Gateway                                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 3 — PRODUCT BRICKS (19 modules, 4 tiers)                          │  │
│  │                                                                          │  │
│  │  TIER 1 (Infrastructure): B-01 B-02 B-03 B-04 B-05 B-06                 │  │
│  │  TIER 2 (Intelligence):   B-07 B-08 B-09 B-10 B-11                      │  │
│  │  TIER 3 (Prediction ⚡):  B-12 B-13 B-14 B-15   ← OPT-IN ONLY          │  │
│  │  TIER 4 (Scale):          B-16 B-17 B-18 B-19                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 4 — PRODUCT BUNDLES (6 tiers)                                     │  │
│  │                                                                          │  │
│  │  SPARK €49 → BUILDER €149 → INTELLIGENCE €299                           │  │
│  │       → PREDICTOR €499 → EMPIRE €999 → CORTEX PARTNER (FREE)            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Four-Cloud Stack

| Cloud | Role | Cost | Compliance |
|---|---|---|---|
| **atNorth Iceland** | Primary compute, VIC Engine, MiroFish/OASIS | Direct contract | GDPR, green energy |
| **Alibaba Cloud** | China node (B-18), Qwen3/Kimi LLMs, OPC operators | $200 credit + up to $5k total | PIPL, CSL, ICP |
| **NVIDIA NIM** | Nemotron 3 Super (OpenClaw brain, B-12) | Free (dev tier) | N/A |
| **AWS** | Serverless glue (Lambda, DynamoDB, CloudFront, SQS, SNS) | Always-free tier (~$0/mo) | SOC2, ISO27001 |

---

## Tri-Stack LLM Configuration

```yaml
# litellm_config_p2.yaml — Production

router_settings:
  routing_strategy: least-busy
  fallbacks:
    - primary: kimi-k2.5
      secondary: qwen3-max
      tertiary: qwen-turbo

model_list:
  # === DEFAULT SIM LLM ===
  - model_name: kimi-k2.5
    litellm_params:
      model: openai/kimi-k2.5
      api_base: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
      api_key: ${DASHSCOPE_API_KEY}
      caching: true
      cache_ttl: 3600

  # === OPENCLAW BRAIN ===
  - model_name: nemotron-3-super
    litellm_params:
      model: openrouter/nvidia/nemotron-3-super-120b-a12b:free
      api_key: ${OPENROUTER_API_KEY}
      context_window: 1000000

  # === CHINA NODE (PIPL-SAFE) ===
  - model_name: qwen3-72b
    litellm_params:
      model: openai/qwen3-72b
      api_base: https://dashscope.aliyuncs.com/compatible-mode/v1
      api_key: ${DASHSCOPE_API_KEY_CN}
      tags: [pipl-safe, cn-hangzhou]

  # === COST SAVER ===
  - model_name: qwen-turbo
    litellm_params:
      model: openai/qwen-turbo
      api_base: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
      api_key: ${DASHSCOPE_API_KEY}
```

---

## Complete Environment Variables (v0.5)

```env
# ============================================================
# iVenture Studio — .env v0.5
# ============================================================

# --- CORE ---
NODE_ENV=production
INTERNAL_API_KEY=iventure_internal_xxxxx

# --- COMPUTE NODES ---
PRIMARY_NODE=atNorth Iceland
CHINA_NODE_ENABLED=false
CHINA_NODE_ENDPOINT=http://cn-hangzhou.iventure-node:8090/v1
PIPL_NODE_ENABLED=false
CHINA_OPC_DATA_RESIDENCY=cn-hangzhou
ALIBABA_REGION=cn-hangzhou

# --- LLM (TRI-STACK) ---
DASHSCOPE_API_KEY=sk-...          # Kimi K2.5, Qwen3-turbo (International)
DASHSCOPE_API_KEY_CN=sk-...       # Qwen3-72B (China Node, PIPL-safe)
OPENROUTER_API_KEY=sk-or-...      # Nemotron 3 Super (free tier)
ALIBABA_CODING_PLAN_KEY=sk-sp-... # Alibaba Coding Plan (interactive only)
ALIBABA_CODING_BASE_URL=https://coding-intl.dashscope.aliyuncs.com/v1

# --- LITELLM GATEWAY (B-02) ---
LITELLM_PORT=4000
LITELLM_MASTER_KEY=sk-litellm-xxxxx

# --- VIC ENGINE (B-01) ---
VIC_ENGINE_PORT=8080
VIC_ENGINE_GRPO_THRESHOLD=0.6

# --- OPENCLAW (B-03) ---
OPENCLAW_PORT=3001
OPENCLAW_LLM_MODEL=nemotron-3-super

# --- NEO4J (B-04) ---
NEO4J_URI=bolt://iventure-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxx

# --- POSTGRESQL (B-05) ---
DATABASE_URL=postgresql://iventure:xxx@iventure-postgres:5432/iventure
# Staging (AWS free tier):
STAGING_DB_URL=postgresql://admin:xxx@free-tier-db.xxxx.rds.amazonaws.com/staging

# --- REDIS (B-06) ---
REDIS_URL=redis://iventure-redis:6379
# Staging (AWS free tier):
# REDIS_URL=redis://iventure-cache.xxxxx.cache.amazonaws.com:6379

# --- VIC CORTEX (B-07) ---
CORTEX_ENDPOINT=http://iventure-cortex:8070/v1/signal
CORTEX_CONTRIBUTE_DEFAULT=true
CORTEX_DIFFERENTIAL_PRIVACY_EPSILON=0.1

# --- PREDICTION ENGINE (B-12) ---
MIROFISH_ENABLED=true
MIROFISH_API_PORT=8085
MIROFISH_UI_PORT=3000
MIROFISH_MAX_AGENTS=2847
MIROFISH_DEFAULT_MODEL=kimi-k2.5
MIROFISH_COST_CONFIRMATION_REQUIRED=true
MIROFISH_MONTHLY_SPEND_CAP_EUR=50
MIROFISH_REPORT_S3_BUCKET=iventure-simulation-reports
MIROFISH_REPORT_CLOUDFRONT_DOMAIN=reports.iventure.studio

# --- AWS (SERVERLESS GLUE) ---
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=<IAM key>
AWS_SECRET_ACCESS_KEY=<IAM secret>
SQS_MIROFISH_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/{acct}/mirofish-jobs
SQS_VMOA_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/{acct}/vmoa-dispatch
DYNAMODB_AGENT_STATE_TABLE=vmoa_agent_state
DYNAMODB_BRICK_REGISTRY_TABLE=brick_registry
DYNAMODB_SKILL_REGISTRY_TABLE=skill_registry
DYNAMODB_USER_ENTITLEMENTS_TABLE=user_entitlements
CLOUDFRONT_API_DOMAIN=api.iventure.studio

# --- STRIPE (BILLING) ---
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_METER_EVENT_SIM=prediction_engine.simulation_run
STRIPE_METER_EVENT_SIGNAL=market_signal.signal_generated
```

---

## Document Registry (AI Drive: /mnt/aidrive/iventure-studio/product-architecture/)

| File | Version | Status | Description |
|---|---|---|---|
| `BRICK-CATALOGUE-v1.0.md` | 1.0 | ✅ LIVE | 19 bricks across 4 tiers |
| `PRODUCT-BUNDLES-v1.0.md` | 1.0 | ✅ LIVE | 6 bundles, Stripe config, revenue projections |
| `BRICK-REGISTRY-SCHEMA.json` | 1.0 | ✅ LIVE | DynamoDB schema with all 19 bricks seeded |
| `PREDICTION-ENGINE-PRD-v1.0.md` | 1.0 | ✅ LIVE | Full PRD for B-12 (MiroFish/OASIS) |
| `postgres-init-v1.1.sql` | 1.1 | ✅ LIVE | Schema with bricks, entitlements, sim_runs tables |
| `MASTER-ARCHITECTURE-SNAPSHOT-v0.5.md` | 0.5 | ✅ LIVE | This document |

---

## Simulation Cost Model (Updated v0.5)

| Scenario | Agents | Model | LLM Cost | User Charge | Margin |
|---|---|---|---|---|---|
| Quick test | 50 | qwen-turbo | ~€0.02 | €2.00 | 99% |
| Standard | 200 | kimi-k2.5 | ~€1.80 | €4.00 | 55% |
| Deep sim | 500 | kimi-k2.5 (cached) | ~€2.80 | €4.00 (sub) | 30% |
| Polymarket-grade | 2,847 | kimi-k2.5 | ~€28.00 | €4.00 (sub) | Cost recovered at volume |
| China OPC | 200 | qwen3-72b | ~€0.20 | €4.00 | 95% |
| OpenClaw brain | Any | nemotron-3-super | €0 (free) | €4.00 | 100% |

---

## Revenue Model (v0.5 Projections)

| Metric | Month 6 | Month 12 | Year 2 | Year 3 |
|---|---|---|---|---|
| Subscribers | 30 | 100 | 500 | 1,500 |
| MRR | €5,800 | €18,500 | €92,000 | €310,000 |
| ARR | €69,600 | €222,000 | €1,104,000 | €3,720,000 |
| Simulation runs/mo | 150 | 800 | 5,000 | 18,000 |
| Cortex nodes | 5 | 30 | 200 | 800 |

*Based on Scenario B (Multi-VIC Engine Data Flywheel) simulation output — sentiment 0.7284, virality 0.8840, GO signal*

---

## Strategic Priorities (v0.5)

1. **Deploy China Node (B-18)** — resolves top PIPL objection from all MiroFish simulations
2. **Launch CORTEX PARTNER programme** — recruit first 100 founding nodes (lifetime 50% discount)
3. **Publish live MRR dashboard** — strongest Scenario A marketing asset (identified by simulation)
4. **Integrate Kimi K2.5 as default** — 79% cost reduction vs. DeepSeek for simulations
5. **Claim Alibaba SMB $200 credit** — apply at https://www.alibabacloud.com/en/campaign/smb-coupon
6. **Join NVIDIA Developer Programme** — unlock free Nemotron 3 Super for OpenClaw
