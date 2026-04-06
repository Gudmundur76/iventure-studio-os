# ================================================================
# iVenture Studio — VIC CORTEX TECHNICAL SPECIFICATION
# "The self-building business world model"
# Version: 1.0 | 2026-03-17
# ================================================================

## WHAT THE CORTEX IS

The VIC Cortex is a continuously self-building business intelligence
layer that lives beneath all iVenture Studio nodes. Every interaction
on every node distills an anonymised signal downward. The cortex
learns from all of them. The intelligence flows back up to all nodes.
Nobody pays extra. Nobody does extra work. It compounds forever.

It is not a database of company data.
It is not a chatbot trained on the internet.
It is a living world model trained exclusively on real, verified,
outcome-grounded OPC business interactions.

---

## ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────┐
│                      VIC CORTEX                              │
│                                                              │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  INGESTION     │  │  KNOWLEDGE   │  │  WORLD MODEL    │ │
│  │  PIPELINE      │  │  LAYER       │  │  TRAINING       │ │
│  │                │  │              │  │                 │ │
│  │ cortex-api     │  │ Neo4j graph  │  │ Qwen2.5-7B     │ │
│  │ privacy filter │  │ Qdrant vecs  │  │ GRPO fine-tune  │ │
│  │ k-anonymity    │  │ trend detect │  │ monthly retrain │ │
│  │ diff. privacy  │  │ snapshots    │  │ A/B promotion   │ │
│  └───────┬────────┘  └──────┬───────┘  └────────┬────────┘ │
│          │                  │                    │          │
│          └──────────────────┼────────────────────┘          │
│                             │                               │
│                    ┌────────┴────────┐                      │
│                    │  CORTEX SEARCH  │                      │
│                    │  API            │                      │
│                    │  NL queries     │                      │
│                    │  credit-gated   │                      │
│                    │  grounded answers│                     │
│                    └─────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

---

## SERVICE DEFINITIONS

### cortex-api (FastAPI, Python 3.12)
```
Port:        8020
Endpoints:
  POST /ingest          — receive signal from node
  GET  /status          — cortex health + signal count
  POST /search          — natural language search
  GET  /snapshot/latest — daily intelligence brief
  GET  /credits/{node}  — credit balance for node
```

### qdrant (Vector Database)
```
Port:        6333 (HTTP) / 6334 (gRPC)
Collections:
  cortex_signals    — all ingested signal embeddings
  cortex_outcomes   — outcome pattern embeddings
  cortex_skills     — skill usage embeddings
  cortex_markets    — market signal embeddings
Embedding model:  text-embedding-3-large (via LiteLLM)
Dimensions:       3072
```

### neo4j (Knowledge Graph)
```
Port:        7474 (HTTP) / 7687 (Bolt)
Node labels:  Skill, Domain, Outcome, AgentType, Market,
              Signal, Vertical, Language, TimeWindow
Edge types:   SOLVES, LEADS_TO, CO_OCCURS_WITH,
              TRIGGERS, REWARDS, PART_OF, TRENDING_IN
```

### vllm-world-model (World Model Inference)
```
Port:        8003
Model:       vic-world-model-v{N} (monthly version)
Base:        Qwen2.5-7B-Instruct (fine-tuned on cortex data)
Access:      via LiteLLM alias "vic-world-model"
```

---

## DATA FLOW — COMPLETE PIPELINE

```
Step 1: INTERACTION (on node)
  User asks VIC: "Help me do VAT for my Shopify store"
  VIC Financial Agent responds, GRPO scores 0.991

Step 2: DISTILLATION (on node, never leaves raw)
  cortex_contributor.py extracts:
  {
    category: "finance/vat",
    skills: ["tax-calc", "sheets-export"],
    reward: 0.991,
    outcome: "task_completed_positive",
    agent: "vmoa-financial",
    node: sha256("company_id")[:16],
    ts: "2026-03-17T14:23:00Z"
  }
  ← NO: raw prompt, company name, revenue figures, user PII

Step 3: PRIVACY FILTER (on cortex-api)
  Layer 1: PII scan → reject if any personal data detected
  Layer 2: k-anonymity → if <10 signals in same category today,
           buffer until threshold met, then release as batch
  Layer 3: Differential privacy → add Laplace noise(λ=0.02) to reward

Step 4: EMBEDDING (cortex-api → Qdrant)
  signal → text: "finance/vat tax-calc sheets-export 0.991 completed"
  → embed via text-embedding-3-large
  → store in qdrant:cortex_signals with metadata

Step 5: GRAPH INGESTION (cortex-api → Neo4j)
  Extract triples from signal:
  (Skill:tax-calc) -[SOLVES]-> (Domain:vat-compliance) {conf: 0.991}
  (Domain:vat-compliance) -[LEADS_TO]-> (Outcome:task_completed_positive)
  (Agent:vmoa-financial) -[HANDLES]-> (Domain:vat-compliance)
  → MERGE into Neo4j (upsert, increment confidence weights)

Step 6: TREND UPDATE
  time-series counter for (category, outcome) incremented
  trend detector checks: 7-day moving average vs 30-day baseline
  if spike > 2σ: trigger alert to relevant nodes

Step 7: CREDIT AWARD
  node receives +1 cortex credit for valid signal
  stored in postgres: cortex_credits table

Step 8: SNAPSHOT (nightly)
  aggregate all signals from past 24h
  → top 10 skills by domain
  → top rising + declining trends
  → avg GRPO by vertical
  → store as cortex_snapshot_{date}.json in MinIO
  → push to all active nodes
```

---

## PRIVACY SPECIFICATION

### Threat Model
The cortex must be safe against:
1. Node operator trying to identify a competitor's data
2. External attacker querying the search API to reconstruct company data
3. iVenture Studio staff accessing individual company interactions
4. Legal process (subpoena) trying to extract company-level data

### Defence Layers

**Layer 1: Distillation (Node-Side)**
- Raw interactions NEVER leave the node
- Only category codes, skill names, reward scores, outcome labels
- No free text. No amounts. No names. No dates beyond day-of-week.
- Enforced by: cortex_contributor.py design (no text fields in CortexSignal)

**Layer 2: k-Anonymity (Cortex-Side)**
- Minimum group size: k=10
- Any signal category must have ≥10 contributing nodes before stored
- Signals below threshold buffered in Redis, released when k met
- Prevents: "only 1 node does Iceland-China customs, so I know it's them"

**Layer 3: Differential Privacy (Cortex-Side)**
- Laplace mechanism on continuous values (reward score, timestamps)
- ε = 0.5 (strong privacy guarantee)
- Sensitivity Δf = 0.1 (bounded by reward score range)
- σ = Δf/ε = 0.2 → noise added to each reward before storage

**Layer 4: Query Anonymisation (Search API)**
- Search results NEVER cite fewer than 10 source nodes
- Results expressed as distributions, not individual data points
- "Based on 847 agents" not "Agent X did Y"
- Temporal aggregation: minimum 1-hour windows

**Layer 5: Access Control**
- Cortex data accessible only via Search API (never raw dump)
- API key required, rate limited
- Internal: iVenture staff cannot query raw signals table
- Even in iVenture's own databases: signals stored by category hash,
  not by node_id (one-way mapping)

### What iVenture Studio Stores vs What It Cannot Reconstruct

| Data Type | Stored | Reconstructable |
|-----------|--------|-----------------|
| Company name | ❌ NO | ❌ NO |
| User PII | ❌ NO | ❌ NO |
| Raw prompt text | ❌ NO | ❌ NO |
| Revenue/financial figures | ❌ NO | ❌ NO |
| Task category | ✅ YES | only aggregate |
| Skill sequence | ✅ YES | only aggregate |
| GRPO score (noisy) | ✅ YES | only distribution |
| Outcome label | ✅ YES | only aggregate |
| Node pseudonym | ✅ YES | not linkable to company |

---

## DATABASE SCHEMA

### PostgreSQL — Cortex Credits Table
```sql
CREATE TABLE cortex_credits (
    node_pseudonym  VARCHAR(16) PRIMARY KEY,  -- sha256[:16], rotates weekly
    credits_earned  INTEGER NOT NULL DEFAULT 0,
    credits_spent   INTEGER NOT NULL DEFAULT 0,
    credits_balance INTEGER GENERATED ALWAYS AS (credits_earned - credits_spent) STORED,
    last_signal_ts  TIMESTAMP WITH TIME ZONE,
    signals_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cortex_signals_meta (
    signal_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(64) NOT NULL,       -- "finance/vat"
    vertical        VARCHAR(32) NOT NULL,       -- "finance"
    agent_type      VARCHAR(32) NOT NULL,       -- "vmoa-financial"
    reward_noisy    FLOAT NOT NULL,             -- dp-noised reward
    outcome         VARCHAR(32) NOT NULL,       -- "task_completed_positive"
    skill_count     INTEGER NOT NULL,           -- number of skills used
    node_cohort     INTEGER NOT NULL,           -- k-anonymity batch id
    ingested_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    day_of_week     SMALLINT,                   -- 0=Mon, no exact date
    week_of_year    SMALLINT                    -- no exact date
    -- NOT STORED: node_pseudonym (unlinked), exact timestamp
);
```

### Neo4j — Knowledge Graph Schema
```cypher
// Node schemas
(:Skill {name: "tax-calc", category: "finance", use_count: 1847})
(:Domain {name: "vat-compliance", vertical: "finance"})
(:Outcome {type: "task_completed_positive", description: "positive"})
(:AgentType {name: "vmoa-financial", specialisation: "finance"})
(:Vertical {name: "finance", parent: "business"})
(:TimeWindow {week: 12, year: 2026})

// Relationship schemas
(:Skill)-[:SOLVES {confidence: 0.87, sample_size: 234}]->(:Domain)
(:Domain)-[:LEADS_TO {confidence: 0.91, avg_reward: 0.989}]->(:Outcome)
(:AgentType)-[:HANDLES {frequency: 0.73}]->(:Domain)
(:Skill)-[:CO_OCCURS_WITH {correlation: 0.65}]->(:Skill)
(:Domain)-[:TRENDING_IN {z_score: 2.3}]->(:TimeWindow)
```

### Qdrant — Collections
```python
# cortex_signals collection
{
    "name": "cortex_signals",
    "vectors": {"size": 3072, "distance": "Cosine"},
    "payload_schema": {
        "category": "keyword",
        "vertical": "keyword",
        "agent_type": "keyword",
        "outcome": "keyword",
        "reward_bucket": "keyword",    # "high/mid/low" not exact
        "week_of_year": "integer",
        "signal_count": "integer"      # k-anonymity group size
    }
}
```

---

## CORTEX SEARCH PIPELINE (P16)

```python
async def cortex_search(
    query: str,
    vertical: Optional[str] = None,
    credits: int = 5,
    node_pseudonym: str = None,
) -> CortexSearchResult:

    # 1. Check credits
    balance = await get_credit_balance(node_pseudonym)
    if balance < credits:
        raise InsufficientCreditsError()

    # 2. Embed query
    query_embedding = await embed(query)   # text-embedding-3-large

    # 3. Qdrant ANN search (semantic similarity)
    qdrant_results = await qdrant.search(
        collection="cortex_signals",
        query_vector=query_embedding,
        limit=50,
        query_filter={"vertical": vertical} if vertical else None,
        score_threshold=0.72
    )

    # 4. Neo4j graph traversal (relationship paths)
    graph_paths = await neo4j.run("""
        MATCH path = (s:Skill)-[:SOLVES|LEADS_TO*1..3]->(o:Outcome)
        WHERE o.type CONTAINS 'positive'
        AND s.name IN $relevant_skills
        RETURN path, reduce(conf=1.0, r IN relationships(path) | conf * r.confidence) AS path_confidence
        ORDER BY path_confidence DESC LIMIT 10
    """, relevant_skills=extract_skills_from_query(query))

    # 5. Trend enrichment
    trends = await get_trending_topics(vertical=vertical, top_k=5)

    # 6. Synthesise with grounded LLM (Gemini-2.5-Pro)
    synthesis_prompt = build_grounded_prompt(
        query=query,
        qdrant_signals=qdrant_results,
        graph_paths=graph_paths,
        trends=trends
    )
    synthesis = await llm.generate(
        model="gemini-2.5-pro",
        prompt=synthesis_prompt,
        instruction="Synthesise ONLY from provided signals. "
                    "Never add information not in signals. "
                    "Always cite source_count."
    )

    # 7. Privacy guard on output
    assert synthesis.source_count >= 10, "k-anonymity violation"

    # 8. Deduct credits
    await deduct_credits(node_pseudonym, credits)

    return CortexSearchResult(
        query=query,
        results=synthesis.findings,
        confidence=synthesis.avg_confidence,
        source_count=synthesis.source_count,
        credits_used=credits,
        grounded=True   # ← distinguishes from raw LLM
    )
```

---

## WORLD MODEL TRAINING LOOP (P17)

```python
# Runs monthly — automatically triggered by cron
async def train_world_model_monthly():

    # 1. Export high-quality training pairs from cortex
    training_pairs = await cortex_db.export_training_pairs(
        min_reward=0.97,          # only top interactions
        min_source_count=50,      # k-anonymity on training data too
        date_range="last_30_days",
        limit=50_000
    )

    # 2. Format as GRPO training dataset
    dataset = [
        {
            "prompt": f"Task: {pair.category}\nContext: OPC business operation",
            "response": pair.best_response_pattern,   # anonymised pattern
            "reward": pair.reward_noisy,
            "vertical": pair.vertical
        }
        for pair in training_pairs
    ]

    # 3. Run GRPO fine-tuning via OpenManus-RL
    checkpoint = await openmanus_rl.train(
        base_model="Qwen/Qwen2.5-7B-Instruct",
        dataset=dataset,
        config={
            "algorithm": "grpo",
            "learning_rate": 5e-7,
            "epochs": 2,
            "reward_endpoint": SKYWORK_REWARD_URL,
            "prm_endpoint": SKYWORK_PRM_URL,
        }
    )

    # 4. Evaluate new checkpoint on OPC benchmark
    benchmark_score = await evaluate_checkpoint(
        checkpoint=checkpoint,
        benchmark="opc_tasks_v1",
        sample_size=500
    )

    current_score = await get_current_world_model_score()

    # 5. Auto-promote if better
    if benchmark_score > current_score + 0.001:  # +0.1% threshold
        await promote_world_model(checkpoint)
        await notify_all_nodes(
            f"VIC World Model updated: {current_score:.4f} → {benchmark_score:.4f}"
        )
        await log_to_cortex_history(checkpoint, benchmark_score)
    else:
        await archive_checkpoint(checkpoint, reason="no_improvement")
```

---

## CORTEX CREDITS ECONOMY

```
EARNING CREDITS:
  1 valid signal contributed        = 1 credit
  1 A2A task completed on network   = 5 credits (P13 integration)
  1 cortex search result rated      = 2 credits (feedback reward)

SPENDING CREDITS:
  Basic search (top 3 results)      = 1 credit
  Standard search (top 10 + trends) = 5 credits
  Deep search (graph paths + conf.) = 20 credits
  World model query (premium)       = 10 credits
  External API call                 = 1 credit (+ €0.10 above free tier)

FREE TIER (no credits needed):
  Daily Cortex Brief (personalised) = free, always
  /cortex/snapshot/latest           = free, always
  10 basic searches/month           = free

EARNING > SPENDING:
  A node that runs 10 interactions/day earns ~300 credits/month
  Standard usage spends ~50 credits/month
  Net positive → nodes get MORE from cortex than they put in
  This is intentional — it incentivises participation
```

---

## DOCKER SERVICES (additions to existing compose)

```yaml
# Add to docker-compose.yml after existing services:

  cortex-api:
    image: iventure/cortex-api:latest
    container_name: iventure-cortex-api
    restart: unless-stopped
    environment:
      - POSTGRES_URL=postgresql://iventure:${POSTGRES_PASSWORD}@postgres/iventure_studio
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - QDRANT_URL=http://qdrant:6333
      - NEO4J_URL=bolt://neo4j:7687
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - LITELLM_BASE=http://litellm:4000/v1
      - LITELLM_KEY=${LITELLM_MASTER_KEY}
      - CORTEX_INGEST_SECRET=${CORTEX_INGEST_SECRET}
      - K_ANONYMITY_MIN=10
      - DP_EPSILON=0.5
    networks:
      - iventure-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cortex.rule=Host(`cortex.iventure.studio`)"

  qdrant:
    image: qdrant/qdrant:latest
    container_name: iventure-qdrant
    restart: unless-stopped
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - iventure-net

  neo4j:
    image: neo4j:5-enterprise
    container_name: iventure-neo4j
    restart: unless-stopped
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc","graph-data-science"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*,gds.*
    volumes:
      - neo4j_data:/data
    networks:
      - iventure-net

  vllm-world-model:
    image: vllm/vllm-openai:latest
    container_name: iventure-world-model
    restart: unless-stopped
    command: >
      --model /models/vic-world-model-latest
      --port 8003
      --tensor-parallel-size 2
      --gpu-memory-utilization 0.85
    volumes:
      - world_model_cache:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 2
              capabilities: [gpu]
    networks:
      - iventure-net
```

---

## ENV ADDITIONS (append to env.template)

```bash
# ─── CORTEX ───────────────────────────────────────────
CORTEX_INGEST_URL=http://cortex-api:8020
CORTEX_INGEST_SECRET=<REQUIRED: strong_secret>
CORTEX_K_ANONYMITY_MIN=10
CORTEX_DP_EPSILON=0.5

# Neo4j
NEO4J_PASSWORD=<REQUIRED: strong_neo4j_password>
NEO4J_URL=bolt://neo4j:7687

# Qdrant
QDRANT_URL=http://qdrant:6333

# World Model
WORLD_MODEL_PORT=8003
WORLD_MODEL_VERSION=v1
WORLD_MODEL_PATH=/models/vic-world-model-latest

# Cortex credits free tier
CORTEX_FREE_SEARCHES_PER_MONTH=10
CORTEX_EXTERNAL_API_PRICE_PER_QUERY=0.10
```

---

*VIC-CORTEX-SPEC.md v1.0 | iVenture Studio ehf. | 2026-03-17*
