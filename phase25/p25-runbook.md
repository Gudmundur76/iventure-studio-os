# Phase 2.5 Runbook — OpenClaw Pool + MiroFish Fast-Track
**Date:** 2026-03-17 | **Estimated Time:** 2.5 hours | **Depends on:** P1 gate 13/13 PASS

---

## Overview

P2.5 runs in parallel with P2 (Model Gateway). It adds:
1. **OpenClaw Pool Orchestrator** (port 8090) — manages N genspark2api instances
2. **genspark2api** (port 7055) — first OpenClaw node, exposes 30+ Genspark models
3. **MiroFish-Offline** (port 3000) — OASIS simulation UI, wired to OpenClaw
4. **VMOA Skill #19** (port 8085) — market-simulation FastAPI microservice
5. **Skill #19 seeded** in Postgres `skills` table

Total new containers: 4
Total new ports: 8090, 7055, 3000, 8085

---

## Prerequisites

- [ ] P1 gate check: 13/13 PASS
- [ ] `.env` file at `/iventure.studio/deployment/.env` populated
- [ ] `GS_COOKIE` obtained from genspark.ai (browser DevTools → Application → Cookies)
- [ ] Minimum 8 GB free RAM (MiroFish + OASIS needs ~3 GB peak)
- [ ] Neo4j running and healthy (from P1 or standalone)

### Get GS_COOKIE
```bash
# 1. Open https://genspark.ai in Chrome/Firefox
# 2. DevTools → Application → Cookies → https://genspark.ai
# 3. Copy value of cookie named: genspark_session (or similar session cookie)
# 4. Add to .env:
echo 'GS_COOKIE=your_cookie_value_here' >> /iventure.studio/deployment/.env
```

---

## Step 1 — Clone MiroFish-Offline (5 min)

```bash
cd /iventure.studio/deployment/services
git clone https://github.com/nikmcfly/MiroFish-Offline.git mirofish
cd mirofish

# Verify structure
ls -la
# Should see: backend/ frontend/ docker-compose.yml .env.example
```

---

## Step 2 — Configure MiroFish .env (2 min)

```bash
cp .env.example .env

# Load iVenture secrets
source /iventure.studio/deployment/.env

cat > /iventure.studio/deployment/services/mirofish/.env << MIROENV
# LLM — point to OpenClaw Pool instead of Ollama
LLM_API_KEY=${INTERNAL_API_KEY}
LLM_BASE_URL=http://iventure-openclaw-orchestrator:8090/v1
LLM_MODEL_NAME=deepseek-r1

# Neo4j — shared iVenture instance, separate database
NEO4J_URI=bolt://iventure-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=${NEO4J_PASSWORD}

# Embeddings — use OpenClaw or add a local embed model
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_BASE_URL=http://iventure-openclaw-orchestrator:8090

# iVenture integration
CORTEX_INGEST_URL=http://iventure-vic-engine:8080/api/cortex/ingest
MIROENV

echo "✅ MiroFish .env configured"
```

---

## Step 3 — Deploy P2.5 Services (10 min)

```bash
cd /iventure.studio/deployment

# Copy P2.5 docker compose file
cp /tmp/iventure-p1/openclaw-docker-service.yml ./

# Pull images
docker compose -f openclaw-docker-service.yml pull

# Start OpenClaw orchestrator + genspark2api
docker compose -f openclaw-docker-service.yml up -d \
  openclaw-orchestrator \
  genspark2api

# Wait for health
sleep 15
docker compose -f openclaw-docker-service.yml ps

# Start MiroFish
docker compose -f p25-docker-compose-mirofish.yml up -d mirofish

# Start Skill #19 microservice
docker compose -f p25-docker-compose-mirofish.yml up -d skill-market-sim

echo "✅ All P2.5 containers started"
```

---

## Step 4 — Register First OpenClaw Instance (2 min)

```bash
source /iventure.studio/deployment/.env

# Register genspark2api as first pool instance
curl -s -X POST http://localhost:8090/pool/register-secure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INTERNAL_API_KEY}" \
  -d '{
    "instance_url": "http://iventure-genspark2api:7055",
    "cookie_hash": "first_instance",
    "max_rpm": 60,
    "node_id": "opc-node-001",
    "company_slug": "iventure-studio"
  }' | jq '.'

# Verify pool status
curl -s http://localhost:8090/pool/status | jq '.'
# Expected: {"total_instances": 1, "healthy": 1, "available_models": 30+}
```

---

## Step 5 — Seed Skill #19 in Postgres (1 min)

```bash
source /iventure.studio/deployment/.env

docker exec -i iventure-postgres psql \
  -U iventure_user -d iventure_db << 'SQLEOF'

INSERT INTO skills (name, description, category, endpoint, version, is_active)
VALUES (
  'market-simulation',
  'Run OASIS/MiroFish swarm simulation to predict public reaction to any document, plan or announcement. Returns sentiment score, controversy index, virality score, trading signal, top objections, and go/no-go recommendation.',
  'intelligence',
  'http://iventure-skill-market-sim:8085/skills/market-simulation',
  '1.0.0',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  endpoint = EXCLUDED.endpoint,
  updated_at = NOW();

-- Verify
SELECT id, name, category, endpoint FROM skills ORDER BY id;
SQLEOF

echo "✅ Skill #19 seeded in Postgres"
```

---

## Step 6 — Health Verification (5 min)

```bash
echo "=== OpenClaw Orchestrator ==="
curl -s http://localhost:8090/health | jq '.status'
# Expected: "healthy"

echo "=== genspark2api ==="
curl -s http://localhost:7055/health | jq '.status'
# Expected: "ok"

echo "=== MiroFish UI ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

echo "=== Skill #19 ==="
curl -s http://localhost:8085/health | jq '.'
# Expected: {"status":"healthy","skill":"market-simulation","skill_id":19}

echo "=== List available models via OpenClaw ==="
curl -s http://localhost:8090/v1/models \
  -H "Authorization: Bearer ${INTERNAL_API_KEY}" | jq '.data[].id'
# Expected: 30+ model IDs
```

---

## Step 7 — Run First Simulation (validation)

```bash
source /iventure.studio/deployment/.env

# Run a test simulation via Skill #19
curl -s -X POST http://localhost:8085/skills/market-simulation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INTERNAL_API_KEY}" \
  -d '{
    "document": "iVenture Studio is a new platform that gives small business owners a full team of 9 AI agents for €149 per month, hosted in Iceland with full EU data compliance.",
    "question": "How will Chinese OPC business owners react to this product?",
    "n_agents": 50,
    "n_rounds": 10,
    "language": "zh",
    "market_segment": "chinese_opc",
    "mode": "mirofish"
  }' | jq '{
    simulation_id,
    sentiment_score,
    controversy_index,
    virality_score,
    go_nogo,
    recommended_framing,
    cortex_signal_sent
  }'
```

Expected output shape:
```json
{
  "simulation_id": "sim_abc123def456",
  "sentiment_score": 0.64,
  "controversy_index": 0.31,
  "virality_score": 0.41,
  "go_nogo": "GO with modifications",
  "recommended_framing": "Cost-saving + EU data compliance emphasis",
  "cortex_signal_sent": false
}
```
*(cortex_signal_sent = false until P3 VIC Engine is running)*

---

## P2.5 Gate Criteria (8 items)

| # | Check | Command | Expected |
|---|-------|---------|----------|
| 1 | OpenClaw healthy | `curl localhost:8090/health` | `"healthy"` |
| 2 | genspark2api healthy | `curl localhost:7055/health` | `"ok"` |
| 3 | Pool has ≥1 instance | `curl localhost:8090/pool/status` | `instances >= 1` |
| 4 | MiroFish UI reachable | `curl -o /dev/null -w "%{http_code}" localhost:3000` | `200` |
| 5 | Skill #19 healthy | `curl localhost:8085/health` | `"healthy"` |
| 6 | Skill #19 in Postgres | `psql ... SELECT name FROM skills WHERE id=19` | `market-simulation` |
| 7 | OpenClaw lists models | `curl localhost:8090/v1/models` | `≥ 30 models` |
| 8 | Test simulation runs | POST to skill endpoint | returns `simulation_id` |

**P2.5 is GO when: 8/8 PASS**

---

## Troubleshooting

### MiroFish fails to connect to OpenClaw
```bash
# Check network connectivity
docker exec iventure-mirofish curl -s http://iventure-openclaw-orchestrator:8090/health
# If timeout: verify both containers on iventure-net
docker network inspect iventure-net | grep -E "Name|IPv4"
```

### genspark2api returns 401
```bash
# GS_COOKIE may be expired — refresh from browser
# Update .env and restart:
docker compose -f openclaw-docker-service.yml restart genspark2api
```

### MiroFish Neo4j connection error
```bash
# Verify Neo4j is running
docker ps | grep neo4j
# Check bolt port
docker exec iventure-neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD} "RETURN 1"
```

### OASIS out of memory
```bash
# Reduce agent count for first run
# Edit .env: OASIS_MAX_AGENTS=100 (default 500)
# Or use mirofish mode which is more memory-efficient
```

---

## After P2.5 — What's Unlocked

✅ **OpenClaw Pool** — N Genspark sessions → N× model capacity  
✅ **MiroFish** — Simulate public reaction to any decision in ~3 min  
✅ **VMOA Skill #19** — Every future VIC Engine node auto-inherits simulation ability  
✅ **Cortex pipeline** — Sim results will flow to Cortex once P3 VIC Engine is running  

**Next: P2 (Model Gateway) → P3 (VIC Engine v5)**

