# iVenture Studio — Product Bundles v1.0
**Document Type:** Pricing & Packaging  
**Version:** 1.0  
**Date:** 2026-03-17  
**Status:** LIVE

---

## Bundle Philosophy

Bundles are pre-assembled LEGO sets — curated combinations of bricks that solve a complete job-to-be-done at a discount vs. individual brick pricing. Every bundle has:

1. A **clear customer persona** (who is this for?)
2. A **single headline promise** (what does it give you?)
3. A **natural upgrade trigger** (what makes you want the next tier?)
4. A **Stripe product ID** for billing

---

## The Six Bundles

```
€49/mo          €149/mo         €299/mo
SPARK ──────► BUILDER ──────► INTELLIGENCE
  │                                │
  │                                ▼
  │                          €499/mo
  │                          PREDICTOR
  │                                │
  └──────────────────────────────► ▼
                              €999/mo
                              EMPIRE
                                   │
                (special)          ▼
                              FREE (data swap)
                              CORTEX PARTNER
```

---

## Bundle 1 — SPARK
**Price:** €49/month  
**Stripe Product:** `prod_spark`  
**Tagline:** *Your first AI employee. No team required.*

### Included Bricks
| Brick | Role in Bundle |
|---|---|
| B-01 VIC Engine | Core runtime — routes tasks autonomously |
| B-02 Model Gateway | 1M tokens/month across 5 models |
| B-08 Skills (5 of choice) | Pick any 5 from the 19-skill catalogue |
| B-05 Data Store (shared) | Shared PostgreSQL instance |
| B-06 Cache Layer (shared) | Shared Redis instance |

### What You Get
- One autonomous AI agent handling 5 categories of work
- 1M tokens/month (≈ 2,500 typical tasks)
- VIC Engine API access
- Basic GRPO task routing
- Email support

### What You Don't Get
- OpenClaw browser agent (B-03)
- Knowledge Graph (B-04)
- Cortex access (B-07)
- Prediction Engine (B-12)
- Portfolio Manager (B-16)
- China Node (B-18)

### Natural Upgrade Trigger
*"I need more skills / I want browser automation / I want to see market intelligence"* → Builder

### Pricing Comparison
| Line Item | Standalone Price | Bundle Saving |
|---|---|---|
| B-01 VIC Engine | €49/mo | — |
| B-02 Model Gateway | €29/mo | — |
| B-08 5 Skills | €45/mo (5 × €9) | — |
| **Total standalone** | **€123/mo** | |
| **SPARK bundle** | **€49/mo** | **€74 saved (60%)** |

---

## Bundle 2 — BUILDER
**Price:** €149/month  
**Stripe Product:** `prod_builder`  
**Tagline:** *A full AI operations stack. All 19 skills. Browser included.*

### Included Bricks
| Brick | Role in Bundle |
|---|---|
| B-01 VIC Engine | Full VMOA orchestration |
| B-02 Model Gateway | 5M tokens/month, 10+ models |
| B-03 OpenClaw Node | Browser agent, 565+ platform integrations |
| B-08 VMOA Skills (all 19) | Complete skill suite |
| B-05 Data Store (dedicated) | Dedicated PostgreSQL instance |
| B-06 Cache Layer (dedicated) | Dedicated Redis instance |

### What You Get
- Full VIC Engine with all 19 VMOA skills
- OpenClaw browser automation (emails, web research, form filling)
- 5M tokens/month (≈ 12,500 typical tasks)
- Dedicated database and cache
- Alibaba Coding Plan access (Kimi K2.5, Qwen3.5, GLM-5, MiniMax — flat rate)
- Priority support

### What You Don't Get
- Knowledge Graph (B-04)
- Cortex intelligence (B-07)
- Prediction Engine (B-12)
- Portfolio Manager (B-16)
- China Node (B-18)

### Natural Upgrade Trigger
*"I want market intelligence / I want to understand my data as a graph"* → Intelligence

### Pricing Comparison
| Line Item | Standalone Price | Bundle Saving |
|---|---|---|
| B-01 VIC Engine | €49/mo | — |
| B-02 Model Gateway | €29/mo | — |
| B-03 OpenClaw Node | €19/mo | — |
| B-08 All 19 Skills | €79/mo | — |
| **Total standalone** | **€176/mo** | |
| **BUILDER bundle** | **€149/mo** | **€27 saved (15%)** |

*Note: Lower % saving vs. Spark because each brick has real standalone value. The saving is in convenience and token allocation.*

---

## Bundle 3 — INTELLIGENCE
**Price:** €299/month  
**Stripe Product:** `prod_intelligence`  
**Tagline:** *Your entire market in a graph. Cortex signals in your inbox.*

### Included Bricks
| Brick | Role in Bundle |
|---|---|
| B-01 VIC Engine | Full VMOA orchestration |
| B-02 Model Gateway | 10M tokens/month, all models |
| B-03 OpenClaw Node | Browser agent |
| B-04 Knowledge Graph | Neo4j — entity + market graph |
| B-07 VIC Cortex (read) | Signal feed from all Cortex nodes |
| B-08 VMOA Skills (all 19) | Complete skill suite |
| B-09 Subsidy Advisor | Grant identification and application |
| B-05 Data Store (dedicated) | Dedicated PostgreSQL |
| B-06 Cache Layer (dedicated) | Dedicated Redis |

### What You Get
Everything in Builder, plus:
- Neo4j knowledge graph (OPC network, market relationships)
- Cortex signal feed (anonymised patterns from all connected nodes)
- Subsidy Advisor (find EU/national grants automatically)
- GraphRAG — knowledge-grounded LLM queries
- 10M tokens/month
- SLA: 99.5% uptime

### What You Don't Get
- Prediction Engine (B-12) — opt-in separately
- Portfolio Manager (B-16)
- China Node (B-18)

### Natural Upgrade Trigger
*"I want to run simulations before making decisions"* → Predictor

### Pricing Comparison
| Line Item | Standalone Price | Bundle Saving |
|---|---|---|
| Builder components | €176/mo | — |
| B-04 Knowledge Graph | €29/mo | — |
| B-07 Cortex read | €39/mo | — |
| B-09 Subsidy Advisor | €29/mo | — |
| **Total standalone** | **€273/mo** | |
| **INTELLIGENCE bundle** | **€299/mo** | *+€26 vs standalone* |

*The premium over standalone is justified by: dedicated token allocation, SLA, and Cortex access which provides more value than its €39 standalone price implies (you're buying network-effect intelligence, not just a data feed).*

---

## Bundle 4 — PREDICTOR
**Price:** €499/month  
**Stripe Product:** `prod_predictor`  
**Tagline:** *Simulate any decision with 2,847 AI agents before you make it.*

### Included Bricks
| Brick | Role in Bundle |
|---|---|
| B-01 VIC Engine | Full VMOA orchestration |
| B-02 Model Gateway | 20M tokens/month, all models + Nemotron 3 Super |
| B-03 OpenClaw Node | Browser agent |
| B-04 Knowledge Graph | Neo4j |
| B-07 VIC Cortex (read + contribute) | Bi-directional Cortex access |
| B-08 VMOA Skills (all 19) | Including S-19 (market-simulation) |
| B-09 Subsidy Advisor | Grant identification |
| B-12 Prediction Engine | **60 simulations/month, up to 2,847 agents** |
| B-13 Market Signal | **Trading signals — 15/month** |
| B-14 Policy Simulator | **Unlimited policy tests (capped at 500 agents)** |
| B-05 Data Store (dedicated) | — |
| B-06 Cache Layer (dedicated) | — |

### What You Get
Everything in Intelligence, plus:
- **60 MiroFish simulations/month** (up to 2,847 agents each)
- **15 trading signals/month** (Polymarket-grade, 2,847 agents)
- **Unlimited policy simulations** (500 agents, fast mode)
- Simulation reports hosted at `reports.iventure.studio/{sim_id}`
- Cortex contributor access (your simulations feed the world model)
- Nemotron 3 Super as OpenClaw brain (PinchBench 85.6%)
- SLA: 99.9% uptime

### Natural Upgrade Trigger
*"I need more companies / I need China market access / I need the A2A market"* → Empire

### Cost Transparency Note
At 60 simulations/month using 500 agents each:
- LLM cost (Kimi K2.5): 60 × ~€16.80 = ~€1,008/month
- Your price: €499/month
- The margin is in volume + Cortex data value + platform efficiency
- With cached context (Kimi $0.10/M cached): LLM cost drops to ~€280/month

### Pricing Comparison
| Line Item | Standalone Price | Bundle Saving |
|---|---|---|
| Intelligence components | €299/mo | — |
| B-12 60 sims | €240/mo (60 × €4) | — |
| B-13 15 signals | €120/mo (15 × €8) | — |
| B-14 Policy sim | €30/mo (5 × €6) | — |
| **Total standalone** | **€689/mo** | |
| **PREDICTOR bundle** | **€499/mo** | **€190 saved (28%)** |

---

## Bundle 5 — EMPIRE
**Price:** €999/month  
**Stripe Product:** `prod_empire`  
**Tagline:** *One founder. N companies. A global data network.*

### Included Bricks
| Brick | Role in Bundle |
|---|---|
| B-01 VIC Engine | Up to 5 VIC Engine instances |
| B-02 Model Gateway | Unlimited tokens (fair use) |
| B-03 OpenClaw Node | Up to 5 nodes |
| B-04 Knowledge Graph | Dedicated Neo4j cluster |
| B-05 Data Store | Dedicated PostgreSQL cluster |
| B-06 Cache Layer | Dedicated Redis cluster |
| B-07 VIC Cortex | Full read + write + premium signals |
| B-08 VMOA Skills | All 19, all companies |
| B-09 Subsidy Advisor | All companies |
| B-10 Cross-Border Trade | Iceland–EU–China routing |
| B-11 OPC Onboarding | Chinese OPC onboarding |
| B-12 Prediction Engine | **Unlimited simulations (2,847 agents max)** |
| B-13 Market Signal | **Unlimited trading signals** |
| B-14 Policy Simulator | **Unlimited** |
| B-15 Crisis Tester | **Unlimited** |
| B-16 Portfolio Manager | **Up to 5 companies** |
| B-17 A2A Network | Full A2A market access |
| B-18 China Node | **Full PIPL-compliant China deployment** |
| B-19 Cortex Contributor | Founding node status |

### What You Get
Everything in Predictor, plus:
- **Portfolio Manager** — spawn and manage up to 5 autonomous companies
- **A2A Network** — companies trade tasks and revenue internally
- **China Node** — full PIPL-compliant deployment on Alibaba cn-hangzhou
- **Crisis Tester** — PR crisis simulation
- **Cross-Border Trade** — Iceland–EU–China intelligence
- **OPC Onboarding** — Chinese OPC operator toolkit
- Unlimited MiroFish simulations (2,847 agents)
- Founding node revenue share (early adopters)
- Dedicated account manager (human)
- SLA: 99.99% uptime

### Company Expansion
- 5 companies included
- Additional companies: €99/month each (B-16 extension)
- A2A market fee waived for internal company-to-company tasks

### Pricing Comparison
| Line Item | Standalone Price | Bundle Saving |
|---|---|---|
| Predictor components | €499/mo | — |
| B-15 Crisis Tester | €30/mo | — |
| B-16 Portfolio (5 cos) | €99/mo | — |
| B-17 A2A Network | ~€50/mo (2% on ~€2,500 tasks) | — |
| B-18 China Node | €59/mo | — |
| B-10 Cross-Border | €49/mo | — |
| B-11 OPC Onboarding | €19/mo | — |
| **Total standalone** | **€805/mo** | |
| **EMPIRE bundle** | **€999/mo** | *Premium for unlimited sims + unlimited tokens* |

---

## Bundle 6 — CORTEX PARTNER
**Price:** FREE (data cooperative)  
**Stripe Product:** `prod_cortex_partner`  
**Tagline:** *Feed intelligence. Receive intelligence. Build the world model together.*

### Included Bricks
| Brick | Role in Bundle |
|---|---|
| B-01 VIC Engine | Full runtime |
| B-02 Model Gateway | 3M tokens/month |
| B-08 VMOA Skills (10 of choice) | Pick 10 from catalogue |
| B-07 VIC Cortex | **Intelligence bundle access — FREE** |
| B-19 Cortex Contributor | **Anonymised data contribution** |

### What You Give
- Anonymised VIC Engine interaction signals
- Contributed via B-19 with differential privacy (ε ≤ 0.1)
- Data ownership remains with operator
- Sector isolation guaranteed
- PIPL operators: data routes to cn-hangzhou shard only

### What You Get
- Full Cortex Intelligence access (normally €39/month)
- 3M tokens/month across all models
- 10 VMOA skills
- Founding node status (first 100 operators):
  - Lifetime 50% discount if/when upgrading to paid bundle
  - Revenue share: 0.5% of Cortex API licensing revenue
  - "Founding Node" badge and recognition

### Who This Is For
- Operators who believe in the data cooperative model
- Early adopters willing to build the flywheel from day one
- Chinese OPC operators who want Cortex access without paying in cash (data is their currency)

### Exit Terms
- Operator can leave at any time
- Contributed data retained in anonymised aggregate form (cannot be deleted from aggregate)
- Raw interaction logs deleted within 30 days of exit
- Founding node revenue share continues after exit (perpetual)

---

## Bundle Comparison Matrix

| Feature | SPARK | BUILDER | INTELLIGENCE | PREDICTOR | EMPIRE | CORTEX PARTNER |
|---|---|---|---|---|---|---|
| **Price** | €49 | €149 | €299 | €499 | €999 | FREE |
| VIC Engine | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Model Gateway | ✅ 1M tkn | ✅ 5M tkn | ✅ 10M tkn | ✅ 20M tkn | ✅ Unlimited | ✅ 3M tkn |
| OpenClaw | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Knowledge Graph | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| VMOA Skills | 5 | 19 | 19 | 19 | 19 | 10 |
| Cortex (read) | ❌ | ❌ | ✅ | ✅ + write | ✅ premium | ✅ (via data swap) |
| Subsidy Advisor | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Prediction Engine** | ❌ | ❌ | ❌ | **60/mo** | **Unlimited** | ❌ |
| Market Signal | ❌ | ❌ | ❌ | **15/mo** | **Unlimited** | ❌ |
| Policy Simulator | ❌ | ❌ | ❌ | **Unlimited (500 agents)** | **Unlimited** | ❌ |
| Crisis Tester | ❌ | ❌ | ❌ | ❌ | **Unlimited** | ❌ |
| Portfolio Manager | ❌ | ❌ | ❌ | ❌ | **5 companies** | ❌ |
| A2A Network | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| China Node | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Cortex Contributor | ❌ | ❌ | ❌ | ✅ | ✅ | **✅ core** |

---

## Add-Ons (Available to All Bundles)

Any brick not included in a bundle can be added à la carte:

| Add-On | Price | Available To |
|---|---|---|
| Extra OpenClaw node | +€19/month | Any bundle |
| Prediction Engine (pay-per-use) | €4/simulation | Any bundle |
| Market Signal (pay-per-use) | €8/signal | Any bundle |
| Crisis Tester (pay-per-use) | €6/simulation | Any bundle |
| China Node | +€59/month | Any bundle |
| Extra company (Portfolio) | +€99/month | Empire only |
| Cortex premium signals | +€99/month | Intelligence+ |
| White-label licence | Custom | Enterprise |

---

## Stripe Configuration

```yaml
# Stripe Products and Prices

products:
  - id: prod_spark
    name: "iVenture Studio — SPARK"
    prices:
      - id: price_spark_monthly
        unit_amount: 4900  # €49.00
        currency: eur
        recurring: { interval: month }

  - id: prod_builder
    name: "iVenture Studio — BUILDER"
    prices:
      - id: price_builder_monthly
        unit_amount: 14900  # €149.00
        currency: eur
        recurring: { interval: month }
      - id: price_builder_annual
        unit_amount: 143040  # €1,430.40 (20% off)
        currency: eur
        recurring: { interval: year }

  - id: prod_intelligence
    name: "iVenture Studio — INTELLIGENCE"
    prices:
      - id: price_intelligence_monthly
        unit_amount: 29900  # €299.00
        currency: eur
        recurring: { interval: month }
      - id: price_intelligence_annual
        unit_amount: 287040  # €2,870.40 (20% off)
        currency: eur
        recurring: { interval: year }

  - id: prod_predictor
    name: "iVenture Studio — PREDICTOR"
    prices:
      - id: price_predictor_monthly
        unit_amount: 49900  # €499.00
        currency: eur
        recurring: { interval: month }
      - id: price_predictor_annual
        unit_amount: 479040  # €4,790.40 (20% off)
        currency: eur
        recurring: { interval: year }

  - id: prod_empire
    name: "iVenture Studio — EMPIRE"
    prices:
      - id: price_empire_monthly
        unit_amount: 99900  # €999.00
        currency: eur
        recurring: { interval: month }
      - id: price_empire_annual
        unit_amount: 959040  # €9,590.40 (20% off)
        currency: eur
        recurring: { interval: year }

  - id: prod_cortex_partner
    name: "iVenture Studio — CORTEX PARTNER"
    prices:
      - id: price_cortex_partner_free
        unit_amount: 0
        currency: eur
        recurring: { interval: month }

# Metered prices (pay-per-use)
metered_prices:
  - id: price_prediction_sim_ppu
    product: prod_prediction_engine_ppu
    unit_amount: 400  # €4.00
    currency: eur
    billing_scheme: per_unit
    usage_type: metered
    aggregate_usage: sum
    meter_event_name: "prediction_engine.simulation_run"

  - id: price_market_signal_ppu
    product: prod_market_signal_ppu
    unit_amount: 800  # €8.00
    currency: eur
    billing_scheme: per_unit
    usage_type: metered
    aggregate_usage: sum
    meter_event_name: "market_signal.signal_generated"
```

---

## Annual Discount Policy

All bundles (SPARK → EMPIRE) offer **20% annual discount** when paid yearly:

| Bundle | Monthly | Annual (×12) | Annual Saving |
|---|---|---|---|
| SPARK | €49 | €470 | **€118/year** |
| BUILDER | €149 | €1,430 | **€358/year** |
| INTELLIGENCE | €299 | €2,870 | **€718/year** |
| PREDICTOR | €499 | €4,790 | **€1,198/year** |
| EMPIRE | €999 | €9,590 | **€2,398/year** |

---

## Revenue Projections (from Scenario B Simulation)

| Milestone | Subscribers | MRR | ARR |
|---|---|---|---|
| Month 3 (first paying) | 10 Builder | €1,490 | €17,880 |
| Month 6 | 30 mixed | €5,800 | €69,600 |
| Month 12 | 100 mixed | €18,500 | €222,000 |
| Year 2 (flywheel) | 500 mixed | €92,000 | €1,104,000 |
| Year 3 (network effect) | 1,500 mixed | €310,000 | €3,720,000 |

*Average revenue per user (ARPU) modelled at: SPARK 20%, BUILDER 40%, INTELLIGENCE 25%, PREDICTOR 10%, EMPIRE 5%*

---

*This document defines all commercial packaging for iVenture Studio bricks. All Stripe, billing, and entitlement systems must reference bundle IDs and price IDs from this document.*
