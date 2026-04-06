# iVenture Studio — Prediction Engine PRD v1.0
**Document Type:** Product Requirements Document  
**Brick ID:** B-12  
**Version:** 1.0  
**Date:** 2026-03-18  
**Author:** iVenture Studio  
**Status:** APPROVED — Development Ready

---

## 1. Problem Statement

**Every founder, CEO, and product manager makes decisions blind.**

They launch products without knowing if the market wants them. They set prices without knowing the sensitivity. They enter new markets without knowing if the culture will accept them. Post-mortems come too late and cost too much.

Market research firms charge €50,000–€500,000 for studies that take months and are already outdated when delivered. Focus groups are biased, slow, and expensive.

**The Prediction Engine solves this in minutes for €4.**

---

## 2. Solution Overview

The Prediction Engine (Brick B-12) is an **optional, pay-per-use AI simulation module** built on MiroFish-Offline + OASIS (camel-ai framework). It spawns between 50 and 2,847 AI agents, each representing a persona from the target market, and runs a multi-round social simulation to predict how that market will react to any question, decision, or announcement.

> **Key design principle:** The Prediction Engine is explicitly NOT a core brick. It is an opt-in, compute-heavy feature that requires explicit user confirmation and cost acknowledgement before running. This is by design — to protect users from unexpected costs and to communicate the value of the computation.

---

## 3. User Stories

### Primary Users

**P1 — Solo founder (iVenture Studio personal enterprise)**
> *"Before I set my pricing at €299/month, I want to know how the EU SME market will react. I have 10 minutes and €4 to spend."*
- Runs a 200-agent, 20-round simulation
- Receives: sentiment score, top objections, recommended framing
- Acts: adjusts pricing or messaging based on output

**P2 — Multi-venture operator (EMPIRE bundle)**
> *"I'm about to launch a new company targeting Chinese OPC manufacturers. Will they pay for this? What are their objections in Mandarin?"*
- Runs a 500-agent simulation with `market_segment: chinese_opc_manufacturing`
- Model: Qwen3-72B (China Node, PIPL-safe)
- Receives: Chinese-language coalition map, WeChat virality score, PIPL objections

**P3 — PREDICTOR bundle subscriber**
> *"I want to run a simulation every Monday morning before my strategy meeting. 60 simulations per month, always 500 agents."*
- Subscribed to Predictor Pro (€149/mo, 60 sims)
- Automates simulation via the `/v1/task` API (S-19 skill)
- Reports delivered to `reports.iventure.studio/{sim_id}`

**P4 — Enterprise API consumer**
> *"We're a hedge fund. We want to programmatically query market sentiment using the 2,847-agent model. We'll pay per signal."*
- Access via B-13 (Market Signal) at €8/signal
- API key, webhook delivery, JSON schema output
- SLA 99.9% on PREDICTOR bundle

---

## 4. Functional Requirements

### 4.1 Simulation Parameters

| Parameter | Type | Default | Min | Max | Notes |
|---|---|---|---|---|---|
| `question` | string | — | 10 chars | 2,000 chars | The decision/question to simulate |
| `agents` | integer | 200 | 50 | 2,847 | More agents = higher cost + accuracy |
| `rounds` | integer | 20 | 5 | 100 | Interaction rounds per agent |
| `market_segment` | enum | `general` | — | — | See §4.3 |
| `language` | enum | `en` | — | — | en, zh, de, fr, ja |
| `llm_model` | enum | `kimi-k2.5` | — | — | See §4.4 |
| `include_trading_signal` | boolean | false | — | — | Adds BUY/HOLD/SELL output |
| `cortex_contribute` | boolean | true | — | — | Opt-out to withhold from Cortex |
| `fast_mode` | boolean | false | — | — | 50 agents regardless of agents param |

### 4.2 Cost Preview (Mandatory — Cannot Be Skipped)

Before any simulation executes, the UI/API **must** display the following and require explicit confirmation:

```
┌──────────────────────────────────────────────────────────────────┐
│  🔮  Prediction Engine — Cost Estimate                           │
│                                                                  │
│  Question:    "Will EU SMEs pay €299/month for..."               │
│  Agents:      200   Rounds: 20   Model: Kimi K2.5               │
│  Segment:     western_b2b_saas   Language: English              │
│  ─────────────────────────────────────────────────────────────   │
│  Est. LLM cost:      €1.80    (covered by subscription)         │
│  Est. time:          ~3 minutes                                  │
│  Charged to:         Predictor Pro plan (42 sims remaining)     │
│  Cortex contribution: ✅ ON (your data helps the world model)   │
│                                                                  │
│  [▶ Run Simulation]      [⚙ Adjust]      [✕ Cancel]             │
└──────────────────────────────────────────────────────────────────┘
```

**Cost preview for pay-per-use users (no subscription):**
```
  Charged to:   Pay-per-use  →  €4.00 will be billed on completion
  [Add card / Use saved card ending in 4242]
```

**FR-COST-01:** The `X-Confirm-Cost: true` header is mandatory in all API calls to B-12. Requests without this header return HTTP 402 with a cost estimate payload.

**FR-COST-02:** On SPARK and BUILDER bundles, the cost preview shows an upsell screen instead of a "Run" button.

### 4.3 Market Segments

| Segment ID | Description | Agent Personas | Preferred LLM |
|---|---|---|---|
| `general` | Mixed global market | 23 diverse archetypes | Kimi K2.5 |
| `chinese_opc_manufacturing` | Chinese OPC operators | Factory owners, supply chain managers, export brokers | Qwen3-72B (China Node) |
| `western_b2b_saas` | EU/US B2B software buyers | CTOs, CFOs, procurement managers, end users | Kimi K2.5 / Nemotron 3 Super |
| `eu_enterprise` | Large EU corporates | C-suite, legal, IT, finance, ESG officers | Claude Opus 4 / GPT-5 |
| `crypto_trading` | Crypto/DeFi market | Traders, VCs, retail investors, regulators | DeepSeek-R1 / Kimi K2.5 |
| `nordic_sme` | Iceland/Nordic SMEs | Local founders, government advisors, export officers | Gemini 2.5 Pro |

### 4.4 LLM Model Selection

| Model | Context | Cost/M in | Cost/M out | Best For |
|---|---|---|---|---|
| `kimi-k2.5` (default) | 262K | $0.60 | $3.00 | General simulations, agent swarms |
| `qwen3-72b` | 128K | $0.14 | $0.40 | Chinese OPC segment, PIPL node |
| `qwen-turbo` | 32K | $0.05 | $0.20 | Fast/cheap low-stakes sims |
| `nemotron-3-super` | 1M | free (NIM dev) | free | High-complexity reasoning, OpenClaw |
| `deepseek-r1` | 128K | $0.55 | $2.19 | Financial/crypto simulations |
| `gpt-5` | 128K | variable | variable | EU enterprise, highest accuracy |

**Cost optimisation rule:** Cached Kimi K2.5 input ($0.10/M) reduces 500-agent simulation cost from ~€16.80 to ~€2.80.

### 4.5 Output Schema (Full)

```json
{
  "simulation_id": "sim_xxxxxxxx",
  "version": "1.0",
  "created_at": "2026-03-18T08:00:00Z",
  "question": "string",
  "market_segment": "string",
  "language": "string",
  "llm_model": "string",
  "agents": 500,
  "rounds": 40,

  "scores": {
    "sentiment_score": 0.6841,
    "controversy_index": 0.5512,
    "virality_score": 0.7230,
    "confidence_score": 0.81
  },

  "trading_signal": {
    "signal": "GO",
    "confidence": 0.81,
    "bull_case": "string",
    "bear_case": "string"
  },

  "coalition_map": {
    "enthusiastic_supporters": 0.19,
    "cautious_supporters": 0.28,
    "fence_sitters": 0.21,
    "sceptics": 0.18,
    "opponents": 0.09,
    "undecided": 0.05
  },

  "platform_breakdown": {
    "twitter_x": 0.781,
    "linkedin": 0.512,
    "wechat": 0.389,
    "reddit": 0.621,
    "weibo": 0.355,
    "instagram": 0.490
  },

  "top_objections": [
    {"rank": 1, "objection": "string", "agent_pct": 0.34, "sentiment": -0.72},
    {"rank": 2, "objection": "string", "agent_pct": 0.28, "sentiment": -0.61},
    {"rank": 3, "objection": "string", "agent_pct": 0.19, "sentiment": -0.55}
  ],

  "recommended_framing": "string",
  "framing_alternatives": ["string", "string", "string"],

  "strategic_fixes": [
    {"fix": "string", "expected_sentiment_lift": 0.12, "objection_addressed": "rank-1"}
  ],

  "persona_highlights": [
    {
      "persona_type": "string",
      "reaction": "string",
      "representative_quote": "string",
      "sentiment": 0.72
    }
  ],

  "cortex_signal_sent": true,
  "cortex_signal_id": "sig_xxxxxxxx",

  "report_url": "https://reports.iventure.studio/sim_xxxxxxxx",
  "report_pdf_url": "https://reports.iventure.studio/sim_xxxxxxxx.pdf",

  "billing": {
    "user_id": "user_xxxxxxxx",
    "billing_model": "subscription",
    "plan": "PREDICTOR",
    "sims_remaining_this_month": 42,
    "cost_eur": 4.00,
    "llm_calls": 40000,
    "tokens_input": 8000000,
    "tokens_output": 4000000,
    "duration_seconds": 187
  }
}
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target | Notes |
|---|---|---|
| 50-agent sim (10 rounds) | < 2 min | Fast mode |
| 200-agent sim (20 rounds) | < 5 min | Standard |
| 500-agent sim (40 rounds) | < 15 min | Standard |
| 2,847-agent sim (20 rounds) | < 60 min | Full Polymarket-grade |
| API response (cost preview) | < 500ms | No sim started |
| Report delivery | < 30s after sim | S3 + CloudFront |

### 5.2 Availability

| Bundle | SLA | Monitoring |
|---|---|---|
| Pay-per-use | 99.5% | CloudWatch |
| PREDICTOR | 99.9% | CloudWatch + PagerDuty |
| EMPIRE | 99.99% | Full APM suite |

### 5.3 Cost Controls

**FR-COST-03:** Each user has a monthly spending cap (default: €50). Cap can be increased in account settings.

**FR-COST-04:** If a simulation exceeds estimated LLM cost by >30%, it is paused and the user is notified.

**FR-COST-05:** Simulation queue is rate-limited to 3 concurrent simulations per operator (10 for EMPIRE).

### 5.4 Data Privacy

**FR-PRIV-01:** Simulation inputs (the "question") are stored encrypted at rest (AES-256).

**FR-PRIV-02:** If `market_segment: chinese_opc_manufacturing` is used with B-18 (China Node), all LLM calls route to cn-hangzhou. No data crosses mainland China border.

**FR-PRIV-03:** Cortex contribution applies differential privacy ε ≤ 0.1 before transmission. The question itself is never sent to Cortex — only the aggregate signal vector.

**FR-PRIV-04:** Simulation reports are private by default. Shareable URLs can be enabled per-simulation with expiry (1 hour, 24 hours, 7 days, permanent).

---

## 6. API Reference

### 6.1 Start a Simulation

```http
POST /v1/simulate
Host: api.iventure.studio
Authorization: Bearer {API_KEY}
X-Billing-Ref: {STRIPE_CUSTOMER_ID}
X-User-Plan: PREDICTOR
X-Confirm-Cost: true
Content-Type: application/json

{
  "question": "How will EU SMEs react to a €299/month pricing for an AI operations platform?",
  "agents": 200,
  "rounds": 20,
  "market_segment": "western_b2b_saas",
  "language": "en",
  "llm_model": "kimi-k2.5",
  "include_trading_signal": true,
  "cortex_contribute": true,
  "callback_url": "https://your-app.com/webhooks/simulation"
}
```

**Response 202 Accepted:**
```json
{
  "simulation_id": "sim_a1b2c3d4",
  "status": "queued",
  "estimated_duration_seconds": 180,
  "estimated_cost_eur": 4.00,
  "queue_position": 1,
  "status_url": "https://api.iventure.studio/v1/simulate/sim_a1b2c3d4"
}
```

### 6.2 Poll Status

```http
GET /v1/simulate/{simulation_id}
Authorization: Bearer {API_KEY}
```

**Response (running):**
```json
{
  "simulation_id": "sim_a1b2c3d4",
  "status": "running",
  "progress_pct": 47,
  "agents_completed": 94,
  "agents_total": 200,
  "elapsed_seconds": 84
}
```

### 6.3 Get Cost Estimate (No confirmation required)

```http
POST /v1/simulate/estimate
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "agents": 500,
  "rounds": 40,
  "llm_model": "kimi-k2.5"
}
```

**Response 200:**
```json
{
  "estimated_llm_cost_eur": 16.80,
  "estimated_duration_seconds": 720,
  "user_charge_eur": 4.00,
  "billing_note": "Covered by PREDICTOR subscription (42 sims remaining)"
}
```

### 6.4 List Simulations

```http
GET /v1/simulate?limit=10&offset=0
Authorization: Bearer {API_KEY}
```

### 6.5 LiteLLM Integration (Model Gateway B-02)

The Prediction Engine routes all LLM calls through B-02 (LiteLLM). Config:

```yaml
# In litellm_config.yaml — Prediction Engine models
- model_name: kimi-k2.5
  litellm_params:
    model: openai/kimi-k2.5
    api_base: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    api_key: ${DASHSCOPE_API_KEY}
    caching: true
    cache_ttl: 3600

- model_name: qwen3-72b
  litellm_params:
    model: openai/qwen3-72b
    api_base: https://dashscope.aliyuncs.com/compatible-mode/v1  # cn-hangzhou
    api_key: ${DASHSCOPE_API_KEY_CN}
    tags: ["pipl-safe", "cn-hangzhou"]

- model_name: nemotron-3-super
  litellm_params:
    model: openrouter/nvidia/nemotron-3-super-120b-a12b:free
    api_key: ${OPENROUTER_API_KEY}
    context_window: 1000000

- model_name: qwen-turbo
  litellm_params:
    model: openai/qwen-turbo
    api_base: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    api_key: ${DASHSCOPE_API_KEY}
```

---

## 7. Environment Variables

```env
# === PREDICTION ENGINE (B-12) ===
MIROFISH_ENABLED=true
MIROFISH_API_PORT=8085
MIROFISH_UI_PORT=3000
MIROFISH_MAX_AGENTS=2847
MIROFISH_MAX_CONCURRENT_SIMS=3
MIROFISH_DEFAULT_MODEL=kimi-k2.5
MIROFISH_COST_CONFIRMATION_REQUIRED=true
MIROFISH_MONTHLY_SPEND_CAP_EUR=50

# LLM Routing
DASHSCOPE_API_KEY=sk-...        # Kimi K2.5, Qwen3-72B (International)
DASHSCOPE_API_KEY_CN=sk-...     # Qwen3-72B (China Node, PIPL-safe)
OPENROUTER_API_KEY=sk-or-...    # Nemotron 3 Super (free tier)

# Storage
MIROFISH_REPORT_S3_BUCKET=iventure-simulation-reports
MIROFISH_REPORT_CLOUDFRONT_DOMAIN=reports.iventure.studio

# Billing (Stripe metered)
STRIPE_METER_EVENT_SIM=prediction_engine.simulation_run
STRIPE_METER_EVENT_SIGNAL=market_signal.signal_generated

# AWS Glue
SQS_MIROFISH_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/{acct}/mirofish-jobs
DYNAMODB_SIM_STATE_TABLE=mirofish_simulation_state
LAMBDA_SIM_CALLBACK_ARN=arn:aws:lambda:eu-west-1:{acct}:function:mirofish-callback

# Cortex Integration
CORTEX_ENDPOINT=http://iventure-cortex:8070/v1/signal
CORTEX_CONTRIBUTE_DEFAULT=true
CORTEX_DIFFERENTIAL_PRIVACY_EPSILON=0.1

# China Node (B-18)
CHINA_NODE_ENABLED=false
CHINA_NODE_ENDPOINT=http://cn-hangzhou.iventure-node:8090/v1
PIPL_DATA_RESIDENCY=cn-hangzhou
```

---

## 8. Billing Architecture

```
User triggers simulation
        │
        ▼
Lambda: check_entitlement()
  ├─ Has PREDICTOR/EMPIRE? → sims_remaining > 0? → PROCEED
  ├─ Has pay-per-use card? → confirm €4.00 → PROCEED
  └─ No entitlement? → UPSELL (show bundle comparison)
        │
        ▼
SQS: enqueue_simulation_job()
        │
        ▼
B-12 Container: run_simulation()
  ├─ Route LLM calls through B-02 (LiteLLM)
  ├─ Stream progress to DynamoDB
  └─ On completion: upload report to S3 + CloudFront
        │
        ▼
Lambda: billing_report()
  ├─ Stripe: record_meter_event(prediction_engine.simulation_run, 1)
  ├─ DynamoDB: decrement sims_remaining
  └─ SNS: publish completion event → webhook callback
        │
        ▼
User receives: report_url + full JSON output
```

---

## 9. Roadmap

| Phase | Feature | Target |
|---|---|---|
| v1.0 | Core simulation (MiroFish-Offline), cost preview, pay-per-use billing | Month 1 |
| v1.1 | PREDICTOR subscription tier, S3/CloudFront report delivery | Month 2 |
| v1.2 | China Node routing (Qwen3-72B, PIPL-safe), zh language support | Month 3 |
| v1.3 | B-13 Market Signal (2,847 agents) | Month 3 |
| v1.4 | B-14 Policy Simulator, B-15 Crisis Tester | Month 4 |
| v2.0 | Real-time simulation streaming UI, comparative simulation (A vs B) | Month 6 |
| v2.1 | Scheduled simulations (weekly market pulse) | Month 7 |
| v3.0 | Cortex-grounded simulations (agents informed by live Cortex signals) | Month 12 |

---

## 10. Acceptance Criteria

| ID | Criterion | Test |
|---|---|---|
| AC-01 | 200-agent sim completes in < 5 min | Load test |
| AC-02 | Cost preview shown before every sim | UI + API test |
| AC-03 | Stripe meter event fires on completion | Billing test |
| AC-04 | PIPL-segment sims route to cn-hangzhou only | Network trace |
| AC-05 | Report accessible at CloudFront URL within 30s | E2E test |
| AC-06 | Cortex contribution applies DP ε ≤ 0.1 | Privacy audit |
| AC-07 | Concurrent sim limit enforced (3 per operator) | Rate limit test |
| AC-08 | SPARK/BUILDER plans see upsell instead of Run | Entitlement test |
| AC-09 | Spend cap triggers at €50 default | Billing test |
| AC-10 | X-Confirm-Cost missing → HTTP 402 with estimate | API test |

---

*This PRD is the authoritative specification for Brick B-12 (Prediction Engine). All development, billing, privacy, and API work must reference this document.*
