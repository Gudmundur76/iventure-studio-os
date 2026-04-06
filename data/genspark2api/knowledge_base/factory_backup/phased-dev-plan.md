# ============================================================
# iVenture Studio — Phased Development Master Plan
# "Build in the right order. Nothing breaks. Nothing is wasted."
# Phase 27 | 2026-03-17 → 2026-04-28
# ============================================================

## THE CORE PRINCIPLE
# Every layer depends on the one below it.
# Build bottom-up. Test each gate. Only proceed when green.
#
# DEPENDENCY CHAIN (bottom → top):
#
#   [10] Public Launch
#    ↑
#   [9]  Production Hardening
#    ↑
#   [8]  OPC Templates
#    ↑
#   [7]  Workspace Integrations
#    ↑
#   [6]  Frontend Dashboard  ←──────────────────┐
#    ↑                                           │
#   [5]  OpenManus-RL Training Loop              │ (parallel
#    ↑                                           │  after P3)
#   [4]  Skywork Intelligence Layer  ────────────┘
#    ↑
#   [3]  VIC Engine + VMOA Core
#    ↑
#   [2]  Model Gateway (genspark2api + LiteLLM)
#    ↑
#   [1]  Infrastructure Bedrock (Docker + DB + Cache)
#
# ============================================================

---

## 📋 PHASE SUMMARY TABLE

| Phase | Name | Days | Hours | Gate Criteria | Status |
|-------|------|------|-------|---------------|--------|
| P1 | Infrastructure Bedrock | Day 1–2 | 6h | All 4 core services healthy | 🔲 |
| P2 | Model Gateway | Day 2–3 | 4h | 30+ models reachable via API | 🔲 |
| P3 | VIC Engine + VMOA Core | Day 3–6 | 10h | 8 agents respond to prompts | 🔲 |
| P4 | Skywork Intelligence Layer | Day 6–9 | 10h | GRPO composite > 0.95 live | 🔲 |
| P5 | OpenManus-RL Training Loop | Day 9–11 | 8h | Auto fine-tune runs nightly | 🔲 |
| P6 | Frontend Dashboard | Day 8–14 | 12h | Dashboard live, chat works | 🔲 |
| P7 | Workspace Integrations | Day 14–17 | 8h | Sheets + PPT + Wizard live | 🔲 |
| P8 | OPC Templates | Day 17–20 | 6h | 5 templates deploy in <2min | 🔲 |
| P9 | Production Hardening | Day 20–24 | 8h | Load test passes, SSL live | 🔲 |
| P10 | Public Launch | Day 24–28 | 8h | Stripe live, 10 paid signups | 🔲 |
| **TOTAL** | | **28 days** | **80h** | | |

> NOTE: P4 and P6 can run in PARALLEL after P3 completes (see below).
> The critical path is: P1 → P2 → P3 → P4 → P7 → P8 → P9 → P10

---

## PHASE 1: INFRASTRUCTURE BEDROCK
**Days 1–2 | ~6 hours | Zero dependencies**

> Goal: A stable, networked Docker environment with all foundational
> services running. Nothing else can start until this is green.

### Why First
You cannot route models without LiteLLM. LiteLLM needs Redis for caching.
Redis and Postgres need Docker networking. Traefik needs the Docker socket.
Everything depends on this layer. Build it once, build it right.

### Services to Launch
```
traefik     → reverse proxy, SSL termination, routing
postgres    → user data, agent configs, session history
redis       → LiteLLM cache, VMOA session state, rate limits
minio       → file storage for memory blobs, skill files, uploads
```

### Step-by-Step

**P1.1 — Prepare environment (1h)**
```bash
# Install Docker Desktop (if not present)
docker -v   # verify ≥ 24.0

# Create project directory
mkdir -p /iventure.studio/deployment
cd /iventure.studio/deployment

# Copy config files
cp ~/deliverables/docker-compose.yml .
cp ~/deliverables/litellm_config.yaml .
cp ~/deliverables/env.template .env

# Fill in REQUIRED values in .env
nano .env   # or code .env
# Minimum required for P1:
# POSTGRES_PASSWORD, REDIS_PASSWORD, LITELLM_MASTER_KEY, JWT_SECRET
# MINIO_ROOT_PASSWORD
```

**P1.2 — Launch core infrastructure (30 min)**
```bash
docker compose up -d traefik postgres redis minio
docker compose ps   # all should show "running"
```

**P1.3 — Health checks (30 min)**
```bash
# Traefik dashboard
open http://localhost:8080      # → Traefik UI

# PostgreSQL
docker exec iventure-postgres pg_isready
# → /var/run/postgresql:5432 - accepting connections

# Redis
docker exec iventure-redis redis-cli -a $REDIS_PASSWORD ping
# → PONG

# MinIO
curl http://localhost:9001      # → MinIO console login
```

**P1.4 — Network verification (1h)**
```bash
# Verify Docker internal DNS works
docker run --rm --network iventure-net alpine \
  nslookup postgres
# → Address: 172.x.x.x

# Verify Traefik routing (add test service)
docker compose up -d traefik
curl -H "Host: traefik.localhost" http://localhost/dashboard/
```

**P1.5 — Backup & persistence test (30 min)**
```bash
# Test volume persistence: stop and restart postgres
docker compose stop postgres
docker compose start postgres
docker exec iventure-postgres psql -U iventure -c "\l"
# → Should show iventure_studio database
```

### ✅ PHASE 1 GATE CRITERIA
```
□ docker compose ps → all 4 services "running (healthy)"
□ PostgreSQL accepts connections
□ Redis responds to PING
□ MinIO UI accessible at :9001
□ Traefik dashboard accessible at :8080
□ Docker internal DNS resolves between services
→ PROCEED TO PHASE 2
```

---

## PHASE 2: MODEL GATEWAY
**Days 2–3 | ~4 hours | Requires: P1 complete**

> Goal: All 30+ frontier models reachable through a single
> OpenAI-compatible API endpoint at http://litellm.localhost/v1

### Why Second
The entire platform runs on AI. Every agent, every feature, every test
needs a model. Without model access, you can't test anything meaningful.
genspark2api + LiteLLM is the fastest path to 30+ models in one Docker service.

### Services to Launch
```
genspark2api   → proxy to Genspark's model pool (GPT-5, Claude, etc.)
litellm        → unified OpenAI-compatible router with fallbacks
```

### Step-by-Step

**P2.1 — Get Genspark session cookie (15 min)**
```
1. Open genspark.ai in Chrome/Firefox
2. Log into your account
3. Press F12 → Application tab → Cookies → genspark.ai
4. Copy the full value of the "session" cookie
5. Add to .env: GS_COOKIE=<paste_value>
6. Add to .env: GENSPARK2API_SECRET=any_secret_key_you_choose
```

**P2.2 — Launch genspark2api (20 min)**
```bash
docker compose up -d genspark2api

# Verify it's running
curl http://localhost:7055/v1/models | jq '.data | length'
# → Should return 30+ (number of available models)

# Quick model test
curl http://localhost:7055/v1/chat/completions \
  -H "Authorization: Bearer $GENSPARK2API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5-minimal","messages":[{"role":"user","content":"Hello"}]}'
```

**P2.3 — Launch LiteLLM proxy (30 min)**
```bash
docker compose up -d litellm

# Health check
curl http://litellm.localhost/health
# → {"status":"healthy","litellm_version":"..."}

# List all routed models
curl http://litellm.localhost/v1/models \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
# → Should show gpt-5, claude-opus-4, gemini-2.5-pro, deepseek-v3...
```

**P2.4 — Test all routing tiers (1.5h)**
```bash
# TIER 1: Frontier (via genspark2api)
curl_test() {
  curl -s http://litellm.localhost/v1/chat/completions \
    -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$1\",\"messages\":[{\"role\":\"user\",\"content\":\"Say OK\"}]}" \
    | jq -r '.choices[0].message.content'
}

curl_test "gpt-5"           # → OK
curl_test "claude-opus-4"   # → OK
curl_test "gemini-2.5-pro"  # → OK
curl_test "deepseek-v3"     # → OK  (Chinese market)
curl_test "deepseek-r1"     # → OK  (reasoning)
curl_test "grok-4"          # → OK

# TIER 2: Skywork (direct API)
curl_test "skywork-r1v4"    # → OK (requires SKYWORK_API_KEY)

# Record latency per model in a spreadsheet
```

**P2.5 — Verify fallback chains (30 min)**
```bash
# Simulate genspark2api being down → LiteLLM should fallback to direct API
docker compose stop genspark2api

curl_test "gpt-5"   
# → Should still work via OPENAI_API_KEY fallback (if set)
# → Or return clear error if no fallback configured (acceptable)

docker compose start genspark2api
```

### ✅ PHASE 2 GATE CRITERIA
```
□ genspark2api returns 30+ models at /v1/models
□ LiteLLM health endpoint → "healthy"
□ GPT-5 returns valid response via LiteLLM
□ DeepSeek-V3 returns valid Chinese response
□ Gemini-2.5-Pro returns valid response
□ Latency logged for top 6 models
→ PROCEED TO PHASE 3
```

---

## PHASE 3: VIC ENGINE + VMOA CORE
**Days 3–6 | ~10 hours | Requires: P2 complete**

> Goal: The 9-agent VMOA team is live. VIC Architect can receive a task,
> route it to the correct specialist agent, and return a structured response
> with a GRPO score above 0.90.

### Why Third
The frontend (P6) is just a shell without the backend. Before building UI,
you need to know the APIs work. Build the engine before the dashboard.

### Services to Launch
```
vic-engine     → VIC Engine v5, skills library, memory system
vmoa           → 9-agent orchestrator
```

### Step-by-Step

**P3.1 — Load VIC Architect system prompt (1h)**
```bash
# Mount the existing VIC Architect v4.2 prompt
cp /VIC\ Architect/system-prompt-v4.2.md \
   /iventure.studio/deployment/volumes/vic-engine/system_prompt.md

# Verify it loaded
docker compose up -d vic-engine
curl http://api.localhost/health
# → {"status":"healthy","grpo_calibration":0.991337,"skills":18}
```

**P3.2 — Mount skills library (30 min)**
```bash
# Mount 18+ skills to the vic-engine container
cp -r /VIC\ Architect/skills/ \
      /iventure.studio/deployment/volumes/skills/

# Verify skills count
curl http://api.localhost/skills | jq '.count'
# → 18 (or more)
```

**P3.3 — Initialize memory system (30 min)**
```bash
# Copy existing MEMORY.md (207KB production memory)
cp /memory/MEMORY.md \
   /iventure.studio/deployment/volumes/memory/MEMORY.md

# Verify memory loaded
curl http://api.localhost/memory/status
# → {"size_kb":207,"sprint":"S011","entries":N}
```

**P3.4 — Configure VMOA agents (2h)**

Edit `/iventure.studio/deployment/volumes/vmoa/agents.yaml`:
```yaml
agents:
  - id: strategist
    name: "VIC Strategist"
    role: "Business strategy and planning"
    model: gpt-5
    trigger_keywords: ["strategy","plan","roadmap","growth","pivot"]
    
  - id: financial
    name: "Financial Analyst"  
    role: "Revenue, expenses, OPC accounting"
    model: deepseek-r1
    trigger_keywords: ["revenue","cost","invoice","tax","profit","cashflow"]
    
  - id: marketing
    name: "Marketing Director"
    role: "Brand, content, campaigns, SEO"
    model: claude-opus-4
    trigger_keywords: ["brand","marketing","campaign","seo","content","social"]
    
  - id: legal
    name: "Legal Advisor"
    role: "Contracts, compliance, IP"
    model: claude-opus-4
    trigger_keywords: ["contract","legal","compliance","ip","gdpr","terms"]
    
  - id: technical
    name: "CTO Agent"
    role: "Architecture, code review, APIs"
    model: gemini-2.5-pro
    trigger_keywords: ["code","api","architecture","bug","deploy","database"]
    
  - id: operations
    name: "COO Agent"
    role: "Processes, tools, hiring, systems"
    model: gpt-5
    trigger_keywords: ["process","workflow","hire","system","automate","ops"]
    
  - id: research
    name: "Deep Research Analyst"
    role: "Market research, competitive intelligence"
    model: skywork-deepresearch-v2
    trigger_keywords: ["research","analyse","market","competitor","investigate"]
    
  - id: communication
    name: "Communications Director"
    role: "Emails, PR, pitches, negotiations"
    model: gpt-5
    trigger_keywords: ["email","pitch","pr","negotiate","write","communicate"]
    
  - id: vision
    name: "Vision Agent"
    role: "Image analysis, design, multimodal tasks"
    model: skywork-r1v4-lite
    trigger_keywords: ["image","screenshot","design","visual","chart","pdf"]
```

**P3.5 — Test each agent (3h)**
```bash
# Test each agent responds correctly
test_agent() {
  curl -s http://api.localhost/vmoa/chat \
    -H "Authorization: Bearer $VIC_ENGINE_SECRET" \
    -d "{\"message\":\"$1\",\"session_id\":\"test-001\"}" \
    | jq '{agent:.agent_used, score:.grpo_score, preview:.response[:100]}'
}

test_agent "Create a growth strategy for my SaaS startup"
# → {"agent":"strategist","score":0.91,...}

test_agent "Help me prepare Q1 financial report"
# → {"agent":"financial","score":0.93,...}

test_agent "Review this contract clause: [LIMITATION OF LIABILITY...]"
# → {"agent":"legal","score":0.89,...}

test_agent "Research the Chinese OPC market size in 2026"
# → {"agent":"research","score":0.95,...}
```

**P3.6 — Verify GRPO scoring live (1h)**
```bash
# The reward_client.py should compute scores automatically
# Check a full GRPO evaluation
curl http://api.localhost/vic/evaluate \
  -d '{"prompt":"test","response":"test response","compute_grpo":true}'
# → {"outcome":0.XX,"process":0.XX,"format":0.XX,"composite":0.XXXXXX}
```

### ✅ PHASE 3 GATE CRITERIA
```
□ vic-engine starts, /health → GRPO calibration 0.991337
□ All 18+ skills loaded at /skills
□ MEMORY.md loaded, 207KB accessible
□ All 9 VMOA agents respond to appropriate triggers
□ GRPO composite score computed end-to-end
□ Agent routing selects correct specialist >80% of test cases
→ PROCEED TO P4 AND P6 IN PARALLEL
```

---

## PHASE 4: SKYWORK INTELLIGENCE LAYER
**Days 6–9 | ~10 hours | Requires: P3 complete**
**⚡ CAN RUN IN PARALLEL WITH P6**

> Goal: Replace VIC's custom reward with Skywork SOTA models.
> GRPO composite score should now exceed 0.995 on benchmark tasks.

### Services to Launch
```
reward-server    → Skywork-Reward-V2 (97.8 RewardBench v1)
prm-server       → Skywork-O1-PRM (step-level verification)
vllm-or1         → Skywork-OR1-32B (math + code reasoning)
```

### Step-by-Step

**P4.1 — Deploy Skywork-Reward-V2 (2h)**
```bash
# Requires: HF_TOKEN in .env, ≥1 GPU available
docker compose up -d reward-server

# Monitor model download (~16GB)
docker logs -f iventure-reward-server
# Wait for: "SGLang server started on port 8000"

# Test reward scoring
curl http://localhost:8000/classify -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Skywork-Reward-V2",
    "conversations": [
      {"role":"user","content":"Help me plan my business"},
      {"role":"assistant","content":"Step 1: Define your target market..."}
    ]
  }'
# → {"score": 0.87, "model": "Skywork-Reward-V2-Qwen3-8B"}
```

**P4.2 — Deploy Skywork-O1-PRM (2h)**
```bash
docker compose up -d prm-server

# Test step scoring
curl http://localhost:8001/v1/embeddings -X POST \
  -d '{"model":"skywork-o1-prm","input":"Problem: X\nStep: First I will..."}'
# → {"data":[{"embedding":[0.82,...]}]}
```

**P4.3 — Wire reward_client.py to VIC Engine (2h)**
```bash
# Deploy the reward_client.py we created
cp ~/deliverables/reward_client.py \
   /iventure.studio/vic_engine_v5/grpo_training/reward_client.py

# Update VIC Engine env vars
# VIC_REWARD_ENDPOINT=http://reward-server:8000
# VIC_PRM_ENDPOINT=http://prm-server:8001

docker compose restart vic-engine

# Verify composite GRPO now uses Skywork
curl http://api.localhost/vic/evaluate \
  -d '{"prompt":"...","response":"...","compute_grpo":true}'
# → {"outcome":0.89,"process":0.87,"format":0.90,"composite":0.886}
# (outcome now from Skywork-Reward-V2, not custom scorer)
```

**P4.4 — Register DeepResearch V2 (30 min)**
```bash
# Email for API access
# Send to: deepresearch@skywork.ai
# Subject: "API Access Request — iVenture Studio OPC Platform"
# Include: affiliated institution, use case, expected requests
# Reply time: 1-3 business days

# In the meantime, configure fallback route in litellm_config.yaml:
# model: skywork-deepresearch-v2
# fallback: gemini-2.5-pro (for web search tasks)
```

**P4.5 — Deploy OR1-32B for math/finance (2h)**
```bash
# Requires: ≥2 GPUs, ~64GB VRAM
docker compose up -d vllm-or1

# Test mathematical reasoning
curl http://localhost:8002/v1/chat/completions \
  -d '{"model":"skywork-or1-32b",
       "messages":[{"role":"user","content":
         "Calculate net profit margin if revenue is ¥450,000 and costs are ¥310,000"}]}'
# → Detailed step-by-step financial calculation
```

**P4.6 — Configure Super-Agents MCP (30 min)**
```bash
# Add to mcp_config.json
cat > /iventure.studio/deployment/mcp_config.json << 'EOF'
{
  "mcpServers": {
    "office-tool": {
      "command": "uvx",
      "args": ["--from",
        "git+https://github.com/Skywork-ai/Skywork-Super-Agents.git",
        "office-tool"],
      "env": {
        "SKYWORK_API_KEY": "${SKYWORK_API_KEY}"
      }
    }
  }
}
EOF

# Test PPT generation
echo '{"task":"create_presentation","topic":"OPC Business Plan","slides":5}' \
  | uvx --from git+https://github.com/Skywork-ai/Skywork-Super-Agents.git office-tool
# → Returns output_oss_url to .pptx file
```

**P4.7 — Benchmark GRPO improvement (1h)**
```bash
# Run VIC benchmark suite (10 test prompts, compare before/after)
python3 /iventure.studio/vic_engine_v5/benchmark/run_suite.py \
  --test-file benchmark_tasks.json \
  --output benchmark_results.json

# Expected improvement:
# Before Skywork: composite ~0.85-0.90
# After Skywork:  composite ~0.96-0.99
```

### ✅ PHASE 4 GATE CRITERIA
```
□ reward-server healthy, /classify returns 0.0-1.0 score
□ prm-server healthy, /v1/embeddings returns step scores
□ VIC Engine GRPO composite now uses Skywork-Reward-V2
□ GRPO composite > 0.95 on benchmark suite
□ DeepResearch API access email sent
□ OR1-32B responds to financial math questions
□ Super-Agents MCP generates a test PPT
→ PROCEED TO P5
```

---

## PHASE 5: OPENMANUSRL AUTO FINE-TUNE LOOP
**Days 9–11 | ~8 hours | Requires: P4 complete**

> Goal: VIC agents improve automatically. Every low-scoring interaction
> feeds a nightly GRPO training run. Models self-improve without
> manual intervention.

### Why Here (not earlier, not later)
You need Skywork reward signals (P4) to train meaningfully.
You need working agents (P3) to generate training data.
But you don't need the UI (P6) — training runs in the background.

### Step-by-Step

**P5.1 — Deploy OpenManus agent runtime (1h)**
```bash
# Clone and configure
git clone https://github.com/FoundationAgents/OpenManus.git \
  /iventure.studio/openmanus
cd /iventure.studio/openmanus

cp config/config.example.toml config/config.toml
# Edit config.toml:
# [llm]
# model = "gpt-5"
# base_url = "http://litellm:4000/v1"
# api_key = "${LITELLM_MASTER_KEY}"

docker compose up -d openmanus
curl http://localhost:9000/health   # → OK
```

**P5.2 — Set up OpenManus-RL training pipeline (3h)**
```bash
git clone https://github.com/OpenManus/OpenManus-RL.git \
  /iventure.studio/openmanus-rl
cd /iventure.studio/openmanus-rl

# Install dependencies (in training container)
pip install -e .
git submodule update --init   # pulls verl framework

# Configure training with VIC GRPO settings
cp ~/deliverables/reward_client.py app/reward/vic_reward.py

# Create training config from our OPENMANUS_RL_CONFIG dict
python3 - << 'EOF'
import json
config = {
    "base_model": "Qwen/Qwen2.5-7B-Instruct",
    "algorithm": "grpo",
    "reward_endpoint": "http://reward-server:8000/classify",
    "prm_endpoint": "http://prm-server:8001/score",
    "dataset": "CharlieDreemur/OpenManus-RL",
    "target_reward": 0.997,
    "output_dir": "/models/vic-agent-tuned",
    "learning_rate": 1e-6,
    "batch_size": 16,
    "epochs": 3
}
with open("configs/vic_grpo_config.json","w") as f:
    json.dump(config, f, indent=2)
print("Config written")
EOF
```

**P5.3 — Create nightly training cron (1h)**
```bash
# Add training scheduler to docker-compose.yml
# (or use a simple cron container)
cat > /iventure.studio/deployment/cron/nightly_train.sh << 'EOF'
#!/bin/bash
# Runs at 2:00 AM UTC every night
# Trains on interactions scored below 0.997 from previous day

cd /iventure.studio/openmanus-rl

# Fetch low-score examples from VIC Engine database
python3 scripts/fetch_training_data.py \
  --min-score 0.80 --max-score 0.996 \
  --date yesterday \
  --output /tmp/tonight_training.jsonl

COUNT=$(wc -l < /tmp/tonight_training.jsonl)
echo "Training on $COUNT examples"

if [ "$COUNT" -gt 50 ]; then
    # Run GRPO training
    python3 train.py \
      --config configs/vic_grpo_config.json \
      --data /tmp/tonight_training.jsonl
    
    # Evaluate new checkpoint
    python3 scripts/evaluate_checkpoint.py \
      --checkpoint /models/vic-agent-tuned/latest \
      --benchmark benchmark_tasks.json
    
    # Auto-promote if better
    python3 scripts/promote_if_better.py \
      --threshold 0.001   # promote if 0.1% better
fi
EOF

chmod +x /iventure.studio/deployment/cron/nightly_train.sh
```

**P5.4 — Test one manual training run (2h)**
```bash
# Generate 100 synthetic training examples
python3 scripts/generate_synthetic_data.py \
  --verticals "finance,marketing,legal,research" \
  --count 100 \
  --output /tmp/test_training.jsonl

# Run one GRPO batch manually
python3 train.py \
  --config configs/vic_grpo_config.json \
  --data /tmp/test_training.jsonl \
  --dry-run   # verify without full training

# → Should complete without errors, show loss decreasing
```

**P5.5 — Set up A/B testing framework (1h)**
```bash
# LiteLLM shadow mode: 10% traffic to new model
# In litellm_config.yaml, add after S015:
# - model_name: vic-agent-ab-test
#   litellm_params:
#     model: openai/vic-tuned-v1
#     api_base: http://vllm-or1:8080/v1
#   weight: 0.10   # 10% of vic-agent traffic
```

### ✅ PHASE 5 GATE CRITERIA
```
□ OpenManus agent starts and responds to tasks
□ OpenManus-RL training runs to completion (dry-run)
□ Nightly cron scheduled and tested
□ A/B test routing configured in LiteLLM
→ P5 COMPLETE — training now runs automatically each night
```

---

## PHASE 6: FRONTEND DASHBOARD
**Days 8–14 | ~12 hours | Requires: P3 complete (parallel with P4)**
**⚡ START THIS IN PARALLEL WITH P4 — no blocking dependency**

> Goal: A working web application a solo founder can log into
> at studio.localhost with a full company OS dashboard.

### Services to Launch
```
studio-frontend   → Next.js 15 IntelliAgent Pro dashboard
```

### Step-by-Step

**P6.1 — Scaffold Next.js 15 project (1h)**
```bash
git clone https://github.com/all3xfx/Genspark-clone \
  /iventure.studio/frontend
cd /iventure.studio/frontend
pnpm install --legacy-peer-deps

# Rebrand
sed -i 's/Genspark/iVenture Studio/g' app/layout.tsx
# Replace favicon, logo

# Verify dev server
pnpm dev   # → http://localhost:3000
```

**P6.2 — Build dashboard layout (2h)**
```
app/
  (dashboard)/
    layout.tsx          ← sidebar + top nav + auth check
    page.tsx            ← command centre (home)
    agents/page.tsx     ← VMOA 9-agent cards
    skills/page.tsx     ← 18+ skills browser
    memory/page.tsx     ← sprint memory viewer
    deploy/page.tsx     ← Tesslate deploy bridge
    analytics/page.tsx  ← GRPO score history chart
  api/
    chat/route.ts       ← streaming chat → LiteLLM
    agents/route.ts     ← VMOA status → VIC Engine
    memory/route.ts     ← memory read → MEMORY.md
```

**P6.3 — Wire streaming chat (1h)**
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { messages, model = 'gpt-5' } = await req.json()
  const result = await streamText({
    model: openai(model, {
      baseURL: process.env.LITELLM_BASE_URL,   // http://litellm:4000/v1
      apiKey: process.env.LITELLM_MASTER_KEY,
    }),
    messages,
  })
  return result.toDataStreamResponse()
}
```

**P6.4 — VMOA live status board (2h)**
```typescript
// WebSocket connection to VMOA orchestrator
// Shows: agent name, model, status (IDLE/RUNNING/DONE), GRPO score, cost
// Controls: Interrupt button, Retry button per agent
```

**P6.5 — GRPO score history chart (1h)**
```typescript
// Recharts LineChart pulling from /api/memory
// X: sprint number, Y: GRPO score 0.00-1.00
// Markers: 0.95 "good", 0.99 "excellent"
// Current: 0.991337 → target: 0.997
```

**P6.6 — Auth system (2h)**
```bash
pnpm add next-auth @auth/prisma-adapter
# Google OAuth + email/password
# Protected routes: all /(dashboard)/* routes
# Public: / (landing) and /login
```

**P6.7 — Deploy to Docker (1h)**
```bash
# Build production image
docker compose up -d studio-frontend

# Verify at http://studio.localhost
# Login → should see dashboard
```

**P6.8 — Model selector + multi-model chat (2h)**
```typescript
// Dropdown populated from GET /v1/models
// Options: GPT-5, Claude-Opus-4, Gemini-2.5-Pro, DeepSeek-R1, Grok-4
// Streaming responses with typing indicator
// GRPO score badge per response
```

### ✅ PHASE 6 GATE CRITERIA
```
□ Dashboard loads at http://studio.localhost
□ All 6 nav panels render without console errors
□ Streaming chat works with 3+ models
□ VMOA agent cards show live status
□ GRPO score chart renders from real memory data
□ Auth: login/logout works
→ PROCEED TO P7
```

---

## PHASE 7: WORKSPACE INTEGRATIONS
**Days 14–17 | ~8 hours | Requires: P6 complete**

> Goal: Connect real business tools. A founder can paste a Google Sheet,
> ask questions about it, generate a PPT report, and deploy a custom agent —
> all from the iVenture Studio dashboard.

### Step-by-Step

**P7.1 — Composio setup (1h)**
```bash
pnpm add @composio-core/sdk composio-core
# Create lib/composio.ts
# Connect: GOOGLESHEETS, GOOGLEDOCS, GOOGLEDRIVE, GMAIL, GOOGLECALENDAR
# OAuth flow: user connects their Google account on first use
```

**P7.2 — Google Sheets agent (2h)**
```
- Paste Google Sheets URL in chat → sidebar auto-opens
- Shows: first 20 rows in data table
- AI actions: Summarise | Find trends | Generate chart | Export to report
- Wired to: VIC Financial Agent (deepseek-r1)
```

**P7.3 — PPT & document generation (1h)**
```
- Port generate-slides + convert-to-ppt from ComposioHQ/open-genspark
- Primary: Skywork Super-Agents MCP office-tool
- Fallback: Composio GOOGLEDOCS generation
- Output: .pptx download + Google Slides link
```

**P7.4 — Rewyo agent creation wizard (2h)**
```
5-step wizard:
Step 1: Choose vertical → 6 options (Finance/Marketing/Legal/Research/Tech/Operations)
Step 2: Name + goal description (free text)
Step 3: Select skills (checkboxes, 18+ options)
Step 4: GRPO target slider (0.80 → 0.99)
Step 5: Deploy → generates VIC Architect prompt + VMOA config + live URL
```

**P7.5 — Tesslate deploy bridge (1h)**
```
- "Publish to Web" button per agent
- Calls Tesslate Studio API → returns https://agent-name.iventure.studio
- Shows QR code for mobile access
- Wildcard subdomain routing via Traefik
```

**P7.6 — Gmail intelligence panel (1h)**
```
- Dashboard card: "Inbox Intelligence"
- Fetches last 10 emails via Composio GMAIL
- Runs through VIC Communication Agent
- Extracts: action items, reply drafts, calendar invites
```

### ✅ PHASE 7 GATE CRITERIA
```
□ Google Sheets URL → sidebar with data in <5 seconds
□ PPT generates and downloads for any topic
□ Agent wizard creates a deployable agent end-to-end
□ Deployed agent accessible at *.iventure.studio subdomain
□ Gmail panel shows action items from real inbox
→ PROCEED TO P8
```

---

## PHASE 8: OPC TEMPLATES
**Days 17–20 | ~6 hours | Requires: P7 complete**

> Goal: 5 production-ready agent templates targeting Chinese OPC verticals.
> A user should be able to select a template and have a running business
> agent in under 2 minutes.

### 5 Templates to Build

| Template | Chinese Name | Model | Key Skills |
|----------|-------------|-------|------------|
| Finance Assistant | 财务助手 | DeepSeek-R1 | invoice, tax-calc, cashflow, sheets |
| E-com Manager | 跨境电商 | GPT-5 | product-listing, ads, logistics-track |
| Content Creator | 自媒体运营 | Claude-Opus-4 | copywrite, seo, social-schedule |
| Consultant OS | 独立顾问 | Skywork-DeepResearch | research, report-gen, pitch-deck |
| Trade Agent | 外贸业务员 | Gemini-2.5-Pro | translate-cn-en, contract-review, customs |

### Step-by-Step

**P8.1 — Build template configs (2h)**
```yaml
# For each template: name, description (EN+ZH), skills[], 
# default model, sample prompts, starter memory context
# Store in: /iventure.studio/deployment/volumes/templates/
```

**P8.2 — Template gallery UI (2h)**
```typescript
// /app/templates/page.tsx
// Grid: 5 template cards with icon, name (bilingual), description
// "Launch" button → pre-fills wizard with template config
// Preview: shows sample interaction for each template
```

**P8.3 — One-click deploy test (1h)**
```bash
# Test each template deploys in <2 minutes
# Verify: correct model assigned, skills loaded, GRPO baseline set
```

**P8.4 — Bilingual UI (EN/ZH) (1h)**
```bash
pnpm add next-intl
# Translations for: nav items, template names, wizard steps
# Language toggle in top-right corner
# Default: detect browser language
```

### ✅ PHASE 8 GATE CRITERIA
```
□ All 5 templates appear in gallery
□ Each template deploys a working agent in <2 minutes
□ Chinese UI renders correctly (ZH translations)
□ Finance template correctly handles CNY calculations
□ Each template has >5 sample prompts that work
→ PROCEED TO P9
```

---

## PHASE 9: PRODUCTION HARDENING
**Days 20–24 | ~8 hours | Requires: P8 complete**

> Goal: The platform is ready for real users and real money.
> No data loss, no downtime, no security holes.

### Step-by-Step

**P9.1 — SSL + production domain (1h)**
```bash
# Configure Traefik ACME for iventure.studio
# Add to traefik/traefik.yml:
# certificatesResolvers:
#   letsencrypt:
#     acme:
#       email: hello@iventure.studio
#       storage: /letsencrypt/acme.json
#       httpChallenge:
#         entryPoint: web

# Point DNS: iventure.studio → atNorth Iceland IP
# Wildcard: *.iventure.studio → same IP
```

**P9.2 — Rate limiting (1h)**
```bash
# LiteLLM: set per-user monthly budget limits
# API: nginx rate limiting on /api/* routes
# Auth: max 5 failed logins per hour per IP
```

**P9.3 — Error monitoring (30 min)**
```bash
pnpm add @sentry/nextjs
# SENTRY_DSN= in .env
# Captures: frontend errors, API errors, agent failures
```

**P9.4 — Usage analytics (30 min)**
```bash
pnpm add posthog-js
# Track: page views, agent deployments, model usage, PPT downloads
# Privacy: no PII captured, GDPR compliant (Iceland = EU)
```

**P9.5 — Backup strategy (1h)**
```bash
# Daily PostgreSQL dump to MinIO
# Daily MEMORY.md snapshot to MinIO
# Weekly full volume backup to atNorth cold storage
# Retention: 30 days

cat > /iventure.studio/deployment/cron/daily_backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
docker exec iventure-postgres pg_dump -U iventure iventure_studio \
  | gzip > /tmp/backup-$DATE.sql.gz
mc cp /tmp/backup-$DATE.sql.gz \
  minio/iventure-backups/postgres/
EOF
```

**P9.6 — Load testing (2h)**
```bash
# Use k6 for load testing
k6 run -u 50 -d 60s load_test.js
# Target: 50 concurrent users, <2s response time
# Test: chat API, agent creation, template deployment
```

**P9.7 — Security audit (2h)**
```bash
# Check: no API keys in frontend bundle
# Check: all /api/* routes require auth
# Check: SQL injection via Prisma (parameterised queries only)
# Check: no CORS wildcard (*) in production
# Run: npm audit → fix all high/critical
```

### ✅ PHASE 9 GATE CRITERIA
```
□ https://iventure.studio loads with valid SSL cert
□ https://*.iventure.studio wildcard works
□ Load test: 50 users, <2s p95 response time
□ npm audit: zero high/critical vulnerabilities
□ Sentry receives test error correctly
□ Backup script runs and uploads to MinIO
→ PROCEED TO P10
```

---

## PHASE 10: PUBLIC LAUNCH
**Days 24–28 | ~8 hours | Requires: P9 complete**
**⚡ Shenzhen subsidy deadline: April 6, 2026**

> Goal: First paying users. Platform is live, payment works,
> community knows about it.

### Step-by-Step

**P10.1 — Stripe payment integration (2h)**
```bash
pnpm add @stripe/stripe-js stripe

# Three tiers:
# Solo     → €29/mo → price_solo_monthly
# Studio   → €79/mo → price_studio_monthly
# Enterprise → €299/mo → price_enterprise_monthly

# CNY pricing (for China market):
# 个人版 ¥199/月 | 工作室版 ¥599/月 | 企业版 ¥2199/月
```

**P10.2 — Waitlist → launch email (1h)**
```bash
# Convert waitlist to launch announcement
# Subject: "iVenture Studio is live — your AI executive team awaits"
# Include: demo video, pricing, early-bird discount (20% off first 3 months)
```

**P10.3 — Company registration confirmation (1h)**
```
□ iVenture Studio ehf. registered in Vestmannaeyjabær
□ Kennitala received
□ Icelandic bank account opened (Landsbankinn or Arion)
□ Company email: hello@iventure.studio configured
```

**P10.4 — Shenzhen Longgang subsidy application ⚡ (2h)**
```
DEADLINE: April 6, 2026

Required documents:
□ Company registration certificate (ehf.)
□ Business plan (Chinese) — use VIC Architect to generate
□ Financial projections (3 years)
□ Description of Iceland-China bridge strategy
□ Founder credentials

Submit to: Longgang District S&T Innovation Bureau
Amount: Up to ¥10M per founder
```

**P10.5 — Launch marketing (1h)**
```
□ ProductHunt submission scheduled
□ LinkedIn post: "Built iVenture Studio from a volcanic island in Iceland"
□ Twitter/X thread: "How I built a 9-agent AI executive team as a solo founder"
□ 小红书 post (Chinese): targeting OPC community
□ Hacker News Show HN submission
```

**P10.6 — First 10 users (1h)**
```
□ Onboard first 10 beta users manually
□ Schedule 30-min onboarding call with each
□ Collect feedback → feed into S016 iteration
□ Target: 3 paid users within 7 days of launch
```

### ✅ PHASE 10 GATE CRITERIA
```
□ Stripe payment processes a real €1 test charge
□ Company ehf. registration confirmed
□ Shenzhen subsidy application submitted (before Apr 6)
□ Platform linked from ProductHunt, HN, LinkedIn
□ First paying user signed up
→ 🚀 LAUNCH COMPLETE
```

---

## 📅 MASTER TIMELINE

```
Mar 17  START
  │
  ├── P1: Infrastructure (Day 1-2) ──────────────────────── 6h
  │
  ├── P2: Model Gateway (Day 2-3) ───────────────────────── 4h
  │
  ├── P3: VIC Engine + VMOA (Day 3-6) ──────────────────── 10h
  │         │
  │         ├── P4: Skywork Layer (Day 6-9) ────────── 10h  │
  │         │                                               │ PARALLEL
  │         └── P6: Frontend (Day 8-14) ─────────────  12h  │
  │
  ├── P5: RL Training Loop (Day 9-11) ─────────────────────  8h
  │
  ├── P7: Workspace Integrations (Day 14-17) ──────────────  8h
  │
  ├── P8: OPC Templates (Day 17-20) ───────────────────────  6h
  │
  ├── P9: Production Hardening (Day 20-24) ────────────────  8h
  │
  └── P10: Public Launch (Day 24-28) ──────────────────────  8h
                │
                └── ⚡ Apr 6: SUBSIDY DEADLINE
                └── 🚀 Apr 14-28: LIVE
```

---

## ⚠️ RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Genspark cookie expires | HIGH | HIGH | Refresh weekly; store in .env |
| GPU unavailable at atNorth | MEDIUM | HIGH | Start with cloud GPU (Vast.ai fallback) |
| Skywork DeepResearch API delayed | MEDIUM | MEDIUM | Gemini-2.5-Pro fallback for research |
| Docker compose memory issues | LOW | MEDIUM | Start light: gateway + VIC only first |
| Longgang subsidy rejected | LOW | LOW | Iceland grants as alternative |

---

## 🔑 GO / NO-GO DECISION POINTS

```
After P2: Can you call 5+ models successfully?   NO → fix before P3
After P3: Do 9 agents return valid responses?     NO → fix before P4/P6
After P4: Is GRPO composite > 0.95?              NO → debug reward client
After P6: Does chat work end-to-end in browser?  NO → fix before P7
After P9: Does load test pass?                   NO → scale infra before P10
```

---
*Phase plan generated: 2026-03-17 | iVenture Studio ehf.*
*Critical path: P1 → P2 → P3 → {P4 ∥ P6} → P5 → P7 → P8 → P9 → P10*
