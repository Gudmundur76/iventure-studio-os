# MiroFish-Offline × iVenture Studio
## Integration Analysis & Architecture
**Repo**: https://github.com/nikmcfly/MiroFish-Offline
**Date**: 2026-03-17 | **Priority**: HIGH — 5 critical connection points

---

## What MiroFish-Offline Does

Upload ANY document → generates hundreds of AI agent personas →
simulates public reaction, market sentiment, opinion shifts hour-by-hour →
ReportAgent delivers structured analysis.

```
Input:  press release / financial report / product brief / policy draft
Output: simulated social media storm, sentiment curve, influence map, focus group interviews
```

Use cases already built in:
- PR crisis testing (before you publish)
- Trading signal generation (feed news → simulated market sentiment)
- Policy impact analysis
- Product launch reaction simulation
- Chinese market reaction (originally built for China by Shanda Group)

---

## Five Direct Integration Points With Your Stack

### 1. NEO4J — ALREADY IN YOUR STACK ✅

MiroFish uses Neo4j Community 5.15 for its knowledge graph + memory.
**Your VIC Cortex already runs Neo4j.**

```yaml
# MiroFish needs:
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}

# You already have this exact service running.
# Use a SEPARATE Neo4j database (mirofish_db) within the same instance.
# Zero additional infrastructure cost.
```

**What this unlocks**: MiroFish simulation results flow directly into the
VIC Cortex knowledge graph. Every simulated sentiment pattern becomes a
Cortex training signal. World model learns what reactions look like before
they happen in the real market.

---

### 2. OPENCLAW POOL — REPLACES OLLAMA AS LLM BACKEND ✅

MiroFish's LLM config is OpenAI-compatible:
```env
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL_NAME=qwen2.5:32b
```

**Replace with your OpenClaw orchestrator:**
```env
LLM_API_KEY=${INTERNAL_API_KEY}
LLM_BASE_URL=http://openclaw-orchestrator:8090/v1
LLM_MODEL_NAME=gpt-5        # or deepseek-r1, claude-opus-4
```

**What this unlocks**:
- MiroFish's 100s of agent personas run on GPT-5/Claude/DeepSeek
  instead of local qwen2.5 — dramatically better simulation quality
- No GPU required for MiroFish (offloads to OpenClaw pool)
- Pool scales with your OPC network — more nodes = smarter simulations
- Each simulation request load-balanced across your pool instances

Cost: ~0 extra (already paying for pool capacity)

---

### 3. VMOA SKILL #19 — market-simulation ✅

MiroFish becomes the 19th skill in your skills library:

```python
# Skill: market-simulation
# Trigger: any VMOA task with category="market_sentiment" or "pr_test"

async def market_simulation_skill(document: str, config: dict) -> dict:
    """
    Calls MiroFish API to simulate public reaction to a document.
    Returns: sentiment curve, top agents, influence map, focus group report.
    """
    payload = {
        "document": document,
        "num_agents": config.get("num_agents", 200),
        "simulation_hours": config.get("hours", 24),
        "platform": config.get("platform", "twitter"),   # twitter/weibo/linkedin
        "language": config.get("language", "en"),        # en/zh
    }
    response = await mirofish_client.post("/api/simulation/run", json=payload)
    result = response.json()

    # Push sentiment curve to VIC Cortex
    await cortex.ingest({
        "skill": "market-simulation",
        "sentiment_shift": result["sentiment_delta"],
        "controversy_score": result["controversy_score"],
        "virality_score": result["virality_score"],
        "grpo_reward": 1.0 if result["simulation_complete"] else 0.5
    })

    return result
```

**Trigger examples from VMOA**:
- "Test this product launch announcement" → market-simulation skill
- "How will the market react to our pricing change?" → market-simulation
- "Simulate Chinese OPC response to this policy" → market-simulation (zh)

---

### 4. CHINESE OPC MARKET SIMULATION — KILLER USE CASE ✅

MiroFish was originally built for China (Shanda Group backed, Chinese UI).
The offline fork made it English. You REVERSE this for maximum value:

```
iVenture Studio Chinese Market Simulator:

Input: Your business plan / product brief in EN or ZH
Configuration:
  - language: zh
  - agent_personas: Chinese OPC entrepreneurs (2026 market)
  - platform: WeChat / Weibo / Xiaohongshu / Zhihu
  - region: Shenzhen / Shanghai / Beijing / Tier-2 cities

Output:
  - How 200 simulated Chinese OPCs react to your offer
  - Sentiment on each platform
  - Top objections raised by agents
  - Virality score on WeChat
  - Recommended positioning based on agent feedback
```

This is a **standalone product** for the 16M OPC market:
"Test your China launch before you spend a yuan."

Pricing: €99/simulation or included in Growth/Enterprise plans.

---

### 5. VIC CORTEX TRAINING SIGNAL — MARKET INTELLIGENCE FLYWHEEL ✅

Every simulation feeds the Cortex:

```
Founder runs 100 simulations over 6 months
  → 100 × sentiment curves
  → 100 × controversy scores
  → 100 × agent reaction patterns
  → All anonymised and pushed to VIC Cortex

Cortex learns:
  - What product messaging triggers positive reactions
  - What pricing signals controversy
  - What content formats spread virally
  - Regional sentiment differences (Iceland vs Shenzhen vs Singapore)

Cortex pushes back to ALL nodes:
  - "Content framed as 'cost saving' gets 23% higher positive sentiment
     among Chinese OPCs in manufacturing sector (847 simulations)"

This is market research at scale, for free, compounding with every simulation.
```

---

## Docker Integration (Add to Stack)

```yaml
# Add to docker-compose.yml

  mirofish:
    image: python:3.11-slim
    container_name: iventure-mirofish
    restart: unless-stopped
    build:
      context: ./services/mirofish
    environment:
      # Wire to OpenClaw orchestrator instead of Ollama
      LLM_API_KEY: "${INTERNAL_API_KEY}"
      LLM_BASE_URL: "http://openclaw-orchestrator:8090/v1"
      LLM_MODEL_NAME: "deepseek-r1"       # best for agent reasoning
      # Wire to existing Neo4j instance
      NEO4J_URI: "bolt://neo4j:7687"
      NEO4J_USER: "neo4j"
      NEO4J_PASSWORD: "${NEO4J_PASSWORD}"
      NEO4J_DATABASE: "mirofish"           # separate DB, shared instance
      # Cortex integration
      CORTEX_INGEST_URL: "${CORTEX_INGEST_URL}"
      CORTEX_API_KEY: "${CORTEX_API_KEY}"
    ports:
      - "3001:3000"    # MiroFish UI (internal)
    networks:
      - iventure-net
    depends_on:
      - neo4j
      - openclaw-orchestrator
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mirofish.rule=Host(`simulate.localhost`)"
      - "traefik.http.routers.mirofish.service=mirofish"
      - "traefik.http.services.mirofish.loadbalancer.server.port=3000"
```

---

## Setup Steps (1-2 hours, Phase 3.5 or 7)

```bash
# 1. Clone MiroFish into services folder
git clone https://github.com/nikmcfly/MiroFish-Offline \
  /iventure.studio/deployment/services/mirofish

# 2. Configure to use OpenClaw pool (not Ollama)
cd /iventure.studio/deployment/services/mirofish
cat > .env << MENV
LLM_API_KEY=${INTERNAL_API_KEY}
LLM_BASE_URL=http://openclaw-orchestrator:8090/v1
LLM_MODEL_NAME=deepseek-r1
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}
NEO4J_DATABASE=mirofish
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_BASE_URL=http://openclaw-orchestrator:8090
MENV

# 3. Add mirofish service to docker-compose.yml

# 4. Launch
docker compose up -d mirofish
curl http://localhost:3001/api/health   # → {"status": "ok"}

# 5. Register as VIC skill
curl -X POST http://vic-engine:8080/skills/register \
  -H "Content-Type: application/json" \
  -d '{"name":"market-simulation","endpoint":"http://mirofish:3000","skill_type":"simulation"}'
```

---

## New VIC Skill Registration (postgres)

```sql
INSERT INTO skills (name, description, category, version) VALUES
  ('market-simulation',
   'Simulate public opinion & market sentiment using MiroFish swarm AI. Input any doc, get 200-agent social simulation.',
   'research',
   '1.0.0')
ON CONFLICT (name) DO NOTHING;
```

---

## Portfolio Use Per Company

| Company Spec | MiroFish Use Case | Sample Input |
|--------------|------------------|--------------|
| content | Test content before publishing | Blog post draft |
| finance | Market reaction to financial news | Earnings report |
| chinese-market | China OPC sentiment simulation | Product brief in ZH |
| research | Validate research findings | Research report |
| engineering | Dev community reaction to OSS release | README / changelog |
| general | PR crisis prevention | Press release draft |

---

## Integration Summary

| Component | Status | Action |
|-----------|--------|--------|
| Neo4j | ✅ Already in stack | Add `mirofish` database to existing Neo4j |
| OpenClaw LLM | ✅ Drop-in replace | Set `LLM_BASE_URL` to orchestrator |
| Docker deploy | ✅ Ready | Add service block to compose |
| VMOA Skill #19 | ✅ Designed | Register `market-simulation` skill |
| VIC Cortex feed | ✅ Designed | Simulation results → cortex signals |
| Chinese OPC market | ✅ Native origin | Configure ZH agents + Weibo/WeChat platforms |
| GPU requirement | ✅ ELIMINATED | OpenClaw pool handles all LLM inference |

**Priority**: Add in Phase 7 (Workspace Integrations) or as standalone P3.5 add-on.
**Effort**: ~3 hours (clone + configure + register skill + test)
**License**: AGPL-3.0 — must keep source open if you distribute.
  → Offer as internal tool only (no distribution) to avoid AGPL obligations,
    OR fork + keep private for internal use.

---

## One-Line Summary

MiroFish gives every VIC Engine node the ability to simulate how the world
reacts to any business decision BEFORE executing it — powered by your
OpenClaw pool, stored in your existing Neo4j, feeding your VIC Cortex.

It is a pre-decision market intelligence engine baked into every company
in the founder's portfolio. No founder has ever had this before.

