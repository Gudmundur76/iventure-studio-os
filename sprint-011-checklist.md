# ============================================================
# iVenture Studio — Sprint 011 Execution Checklist
# Phase 27 | Skywork + OpenManus Integration
# Date: 2026-03-17 | Est. Total: ~14 hours
# ============================================================

## SPRINT 011 GOAL
Integrate Skywork-Reward-V2, OpenManus-RL, Skywork-O1-PRM, and
genspark2api into the iVenture Studio stack. Close the GRPO
training loop and unlock 30+ frontier models.

---

## PRE-SPRINT SETUP (30 min)

- [ ] **S011-00a** | Copy new `docker-compose.yml` to `/iventure.studio/deployment/`
- [ ] **S011-00b** | Copy new `litellm_config.yaml` to `/iventure.studio/deployment/`
- [ ] **S011-00c** | Create `.env` file with all required keys (see template below)
- [ ] **S011-00d** | Confirm atNorth Iceland compute node is provisioned (≥4 GPU)
- [ ] **S011-00e** | Run `docker compose up -d traefik postgres redis litellm genspark2api`
      — Verify: `curl http://litellm.localhost/health` → 200 OK
      — Verify: `curl http://models.localhost/v1/models` → model list

---

## BLOCK A: GENSPARK2API GATEWAY (1 hour)
> Unlocks: GPT-5, Claude-opus-4, DeepSeek-R1, Grok-4, Sora-2, VEO3 + 25 more

### A1 — Deploy genspark2api (20 min)
- [ ] **S011-A1a** | Get Genspark session cookie from browser DevTools
      → Open genspark.ai → F12 → Application → Cookies → copy `session` value
- [ ] **S011-A1b** | Add `GS_COOKIE=<cookie>` to `.env` file
- [ ] **S011-A1c** | Run: `docker compose up -d genspark2api`
- [ ] **S011-A1d** | Verify: `curl http://localhost:7055/v1/models` → lists all models

### A2 — Test Model Routing (20 min)
- [ ] **S011-A2a** | Test GPT-5 via LiteLLM:
      ```bash
      curl http://litellm.localhost/v1/chat/completions \
        -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
        -d '{"model":"gpt-5","messages":[{"role":"user","content":"Hello"}]}'
      ```
- [ ] **S011-A2b** | Test DeepSeek-V3 (China market routing):
      ```bash
      curl http://litellm.localhost/v1/chat/completions \
        -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
        -d '{"model":"deepseek-v3","messages":[{"role":"user","content":"你好"}]}'
      ```
- [ ] **S011-A2c** | Test Claude-opus-4, Gemini-2.5-pro, Grok-4 (same pattern)
- [ ] **S011-A2d** | Log: Record latency and verify all 3 routing tiers work

### A3 — Wire VIC Engine to genspark2api (20 min)
- [ ] **S011-A3a** | Update VIC Engine env: `LITELLM_API_BASE=http://litellm:4000`
- [ ] **S011-A3b** | Update VMOA config: point all agent model_ids to LiteLLM aliases
- [ ] **S011-A3c** | Run VIC health check: `curl http://api.localhost/health`
- [ ] **S011-A3d** | Log result to `/memory/MEMORY.md` as Sprint 011 milestone

---

## BLOCK B: SKYWORK-REWARD-V2 GRPO UPGRADE (2.5 hours)
> Upgrades: VIC GRPO reward signal from custom → 97.8 RewardBench v1 (SOTA)

### B1 — Deploy Reward Server (1 hour)
- [ ] **S011-B1a** | Ensure GPU access: `nvidia-smi` → confirm ≥1 GPU available
- [ ] **S011-B1b** | Set `HF_TOKEN=<your_huggingface_token>` in `.env`
- [ ] **S011-B1c** | Pull model weights (large download ~16GB):
      ```bash
      docker compose up -d reward-server
      # Monitor download:
      docker logs -f iventure-reward-server
      ```
- [ ] **S011-B1d** | Verify SGLang server running:
      ```bash
      curl http://localhost:8000/classify -X POST \
        -H "Content-Type: application/json" \
        -d '{"model":"Skywork-Reward-V2","input":"test"}'
      ```

### B2 — Integrate with VIC Engine GRPO (1 hour)
- [ ] **S011-B2a** | Create `/vic_engine_v5/reward_client.py`:
      ```python
      import torch
      from transformers import AutoModelForSequenceClassification, AutoTokenizer

      class SkyworkRewardV2Client:
          """
          Skywork-Reward-V2 client for VIC Engine GRPO calibration
          Model: Skywork/Skywork-Reward-V2-Llama-3.1-8B-40M
          RewardBench v1: 97.8 (SOTA)
          """
          def __init__(self, endpoint: str = "http://reward-server:8000/classify"):
              self.endpoint = endpoint

          async def score(self, prompt: str, response: str) -> float:
              """Return scalar reward score for a prompt-response pair"""
              import aiohttp
              payload = {
                  "conversation": [
                      {"role": "user", "content": prompt},
                      {"role": "assistant", "content": response}
                  ]
              }
              async with aiohttp.ClientSession() as session:
                  async with session.post(self.endpoint, json=payload) as resp:
                      result = await resp.json()
                      return result["score"]

          async def batch_score(self, pairs: list) -> list[float]:
              """Score multiple prompt-response pairs in parallel"""
              import asyncio
              tasks = [self.score(p["prompt"], p["response"]) for p in pairs]
              return await asyncio.gather(*tasks)
      ```
- [ ] **S011-B2b** | Update VIC Engine GRPO module to use `SkyworkRewardV2Client`
      — Replace existing custom GRPO scorer with Skywork endpoint call
      — Keep VIC's own GRPO score as secondary signal (ensemble the two)
- [ ] **S011-B2c** | Run GRPO calibration test:
      ```bash
      curl http://api.localhost/grpo \
        -H "Authorization: Bearer $VIC_API_KEY"
      # Expected: {"grpo": 0.991337, "reward_model": "skywork-reward-v2", ...}
      ```
- [ ] **S011-B2d** | Update `/memory/VIC_ENGINE_V5_MEMORY.md`:
      — Add entry: "Sprint 011: Skywork-Reward-V2 integrated as primary GRPO critic"
      — Record baseline comparison: old score vs new score

### B3 — Validate & Benchmark (30 min)
- [ ] **S011-B3a** | Run 10 sample predictions through new reward pipeline
- [ ] **S011-B3b** | Compare old GRPO vs Skywork-Reward-V2 scores on same inputs
- [ ] **S011-B3c** | Log Brier score and accuracy delta
- [ ] **S011-B3d** | Open adversary round 20 (target: 10 challenges)

---

## BLOCK C: SKYWORK-O1-PRM STEP VERIFIER (2 hours)
> Upgrades: VIC Pillar 3 (7-Step Reasoning) — adds per-step reward scoring

### C1 — Deploy PRM Server (1 hour)
- [ ] **S011-C1a** | Run: `docker compose up -d prm-server`
- [ ] **S011-C1b** | Monitor download (model ~7B, ~14GB):
      `docker logs -f iventure-prm-server`
- [ ] **S011-C1c** | Verify vLLM PRM server:
      ```bash
      curl http://localhost:8081/v1/models
      # Should return Skywork-o1-Open-PRM model
      ```

### C2 — Integrate with VIC 7-Step Reasoning Protocol (1 hour)
- [ ] **S011-C2a** | Create `/vic_engine_v5/prm_client.py`:
      ```python
      from openai import OpenAI
      from transformers import AutoTokenizer
      # Import from skywork-o1-prm-inference
      from model_utils.io_utils import prepare_input, derive_step_rewards_vllm

      class SkyworkPRMClient:
          """
          Process Reward Model for step-level scoring
          Used in VIC Pillar 3: 7-Step Reasoning Protocol
          Scores each reasoning step individually
          """
          def __init__(self, server_url: str = "http://prm-server:8081/v1"):
              self.client = OpenAI(api_key="EMPTY", base_url=server_url)
              self.tokenizer = AutoTokenizer.from_pretrained(
                  "Skywork/Skywork-o1-Open-PRM-Qwen-2.5-7B",
                  trust_remote_code=True
              )

          def score_steps(self, problem: str, response: str) -> list[float]:
              """Return per-step reward scores for a reasoning chain"""
              processed = prepare_input(
                  problem, response,
                  tokenizer=self.tokenizer,
                  step_token="\n"
              )
              input_ids, steps, reward_flags = processed
              # Call vLLM embeddings endpoint for step scoring
              rewards = self.client.embeddings.create(
                  input=[input_ids],
                  model=self.client.models.list().data[0].id
              )
              return derive_step_rewards_vllm(rewards, [reward_flags])[0]

          def get_weakest_step(self, problem: str, response: str) -> int:
              """Returns index of lowest-scored reasoning step"""
              scores = self.score_steps(problem, response)
              return scores.index(min(scores))
      ```
- [ ] **S011-C2b** | Hook PRM into VIC Pillar 3: after each reasoning step,
      score it with PRM and flag steps below 0.6 for revision
- [ ] **S011-C2c** | Add PRM scores to VIC output format (Pillar 7)
- [ ] **S011-C2d** | Test on 5 multi-step reasoning queries

---

## BLOCK D: OPENMANUS-RL GRPO TRAINING (3 hours)
> Upgrades: VIC agents go from GRPO-evaluated to GRPO-trained (closes the loop)

### D1 — Clone OpenManus-RL (30 min)
- [ ] **S011-D1a** | Clone the repo:
      ```bash
      git clone https://github.com/OpenManus/OpenManus-RL.git /opt/openmanus-rl
      cd /opt/openmanus-rl
      ```
- [ ] **S011-D1b** | Read README and identify GRPO training entry point
      → Expected: `python train_grpo.py --config configs/vic_agent.yaml`
- [ ] **S011-D1c** | Install dependencies:
      ```bash
      uv venv --python 3.12
      uv pip install -r requirements.txt
      ```
- [ ] **S011-D1d** | Verify verl framework installation (used for GRPO training)

### D2 — Create VIC Agent Training Config (1 hour)
- [ ] **S011-D2a** | Create `/opt/openmanus-rl/configs/vic_agent_grpo.yaml`:
      ```yaml
      # VIC Agent GRPO Training Config
      # Based on OpenManus-RL (UIUC + MetaGPT)
      model:
        name: "gpt-5-minimal"          # Base model via genspark2api
        api_base: "http://litellm:4000/v1"
        api_key: "${LITELLM_MASTER_KEY}"

      reward:
        model: "skywork-reward-v2"
        endpoint: "http://reward-server:8000/classify"
        hf_model: "Skywork/Skywork-Reward-V2-Llama-3.1-8B-40M"
        # 97.8 RewardBench v1 — SOTA reward signal

      prm:
        enabled: true
        endpoint: "http://prm-server:8081/v1"
        step_token: "\n"

      grpo:
        group_size: 8               # Number of responses per prompt
        learning_rate: 1e-6
        kl_coeff: 0.1
        target_kl: 0.05
        max_new_tokens: 4096
        temperature: 0.8
        top_p: 0.95

      training:
        episodes: 100
        batch_size: 4
        eval_every: 10
        save_every: 25
        checkpoint_dir: "/memory/grpo_checkpoints"

      vic_specific:
        eight_pillars: true           # Use VIC Eight-Pillar framework
        adversary_testing: true       # Run adversary challenges post-training
        grpo_target: 0.9913           # VIC's current GRPO baseline
        brier_target: 0.001
      ```
- [ ] **S011-D2b** | Create training dataset from VIC memory:
      — Source: `/memory/MEMORY.md` prediction history (112K+ resolved)
      — Format: {prompt, chosen_response, rejected_response} pairs
      — Target: 1000 high-quality training examples
- [ ] **S011-D2c** | Verify dataset format matches OpenManus-RL expectations

### D3 — Run First GRPO Training Cycle (1.5 hours)
- [ ] **S011-D3a** | Start training (first short run to validate):
      ```bash
      cd /opt/openmanus-rl
      python train_grpo.py \
        --config configs/vic_agent_grpo.yaml \
        --episodes 10 \
        --dry-run  # Validate without full training
      ```
- [ ] **S011-D3b** | Verify GRPO scores improving over episodes
- [ ] **S011-D3c** | Full first training run (100 episodes):
      ```bash
      python train_grpo.py --config configs/vic_agent_grpo.yaml
      ```
- [ ] **S011-D3d** | Save checkpoint to `/memory/grpo_checkpoints/sprint011/`
- [ ] **S011-D3e** | Log GRPO before/after delta to `/memory/MEMORY.md`

---

## BLOCK E: SKYWORK-SUPER-AGENTS MCP (30 min)
> Unlocks: PPT, docs, spreadsheets, webpages, broadcasts for all OPC agents

### E1 — Deploy MCP Server (15 min)
- [ ] **S011-E1a** | Request SKYWORK_API_KEY: email peter@skywork.ai
      Subject: "iVenture Studio — OPC Platform API Access Request"
- [ ] **S011-E1b** | Add `SKYWORK_API_KEY=<key>` to `.env` once received
- [ ] **S011-E1c** | Run: `docker compose up -d skywork-super-agents`

### E2 — Add to VIC Engine MCP Config (15 min)
- [ ] **S011-E2a** | Add Skywork office tools to VIC MCP server config:
      ```json
      {
        "mcpServers": {
          "skywork-office": {
            "command": "uvx",
            "args": [
              "--from",
              "git+https://github.com/Skywork-ai/Skywork-Super-Agents.git",
              "office-tool"
            ],
            "env": {
              "SKYWORK_API_KEY": "${SKYWORK_API_KEY}"
            }
          }
        }
      }
      ```
- [ ] **S011-E2b** | Test PPT generation via VIC agent:
      `POST /mcp {"tool":"skywork-office","action":"create_ppt","topic":"iVenture Studio OPC Platform"}`
- [ ] **S011-E2c** | Verify output URL returned and file downloadable
- [ ] **S011-E2d** | Add "office_tools" to VMOA's available_tools list

---

## BLOCK F: SKYWORK-R1V4 VISION AGENT (1 hour)
> Adds: Vision + web search capabilities to VMOA as Agent #11

### F1 — Register Vision Agent in VMOA (30 min)
- [ ] **S011-F1a** | Add to `litellm_config.yaml` (already done — confirm active):
      `skywork-r1v4-lite` → `https://api.skyworkmodel.ai/v1`
- [ ] **S011-F1b** | Test API connection:
      ```python
      import requests
      response = requests.post(
          "https://api.skyworkmodel.ai/v1/chat/completions",
          headers={"Authorization": f"Bearer {SKYWORK_API_KEY}"},
          json={
              "model": "skywork/r1v4-lite",
              "messages": [{"role":"user","content":"Analyze this: [test]"}],
              "enable_search": True
          }
      )
      print(response.json())
      ```
- [ ] **S011-F1c** | Register as VMOA Agent #11 in `vmoa_system_prompt_v1.0.md`
      — Add entry: `{name: "VisionResearcher", model: "skywork-r1v4-lite", grpo: TBD}`
- [ ] **S011-F1d** | Test vision capability:
      Send an image URL + analysis request through VMOA

### F2 — Wire to Skills Creator (30 min)
- [ ] **S011-F2a** | Add "vision" as new skill category in Skills Creator UI
- [ ] **S011-F2b** | Create `vision-analyzer.skill.md` template
- [ ] **S011-F2c** | Test: OPC agent using vision to analyze competitor product images

---

## BLOCK G: MEMORY & DOCUMENTATION (30 min)

- [ ] **S011-G1** | Update `/memory/MEMORY.md`:
      — Sprint 011 summary
      — New services deployed
      — GRPO delta (before/after Skywork-Reward-V2)
      — Model count: was 8 → now 30+

- [ ] **S011-G2** | Update `/memory/NEXT-ACTIONS.md`:
      — Sprint 012: Frontend Dashboard Fork (IntelliAgent Pro)
      — Sprint 013: Tesslate Studio bridge
      — Sprint 014: Template Library

- [ ] **S011-G3** | Update `/memory/VIC_ENGINE_V5_MEMORY.md`:
      — Phase 27, Sprint 011 entry
      — New agent count: 11
      — Reward model: Skywork-Reward-V2 (97.8 RewardBench)
      — PRM: Skywork-O1-PRM (step-level scoring)

- [ ] **S011-G4** | Log to `/memory/sprint_logs/sprint_011.md`:
      — Completed tasks
      — Metrics: GRPO, Brier, adversary count
      — Blockers and decisions

---

## .ENV TEMPLATE

```bash
# /iventure.studio/deployment/.env
# iVenture Studio Phase 27 Environment Variables

# Core
POSTGRES_PASSWORD=<generate_strong_password>
REDIS_PASSWORD=<generate_strong_password>
JWT_SECRET=<generate_256bit_secret>
LITELLM_MASTER_KEY=sk-iventure-<generate_key>

# Model Providers
GENSPARK_COOKIE=<genspark_session_cookie>        # From browser DevTools
GENSPARK2API_SECRET=<your_api_secret>            # Choose your own
SKYWORK_API_KEY=<request_from_peter@skywork.ai>  # Email to request
OPENAI_API_KEY=sk-...                            # Fallback
ANTHROPIC_API_KEY=sk-ant-...                     # Fallback
GOOGLE_API_KEY=AIza...                           # Fallback

# HuggingFace (for model downloads)
HF_TOKEN=hf_...                                  # For Skywork model weights

# Optional: atNorth Iceland deploy
ATNORTH_API_KEY=<atnorth_key>
COMPUTE_REGION=Iceland-IS1
```

---

## SPRINT 011 SUCCESS CRITERIA

| Criteria | Target | How to Verify |
|----------|--------|---------------|
| genspark2api routing | All 30+ models callable | `curl /v1/models` |
| Skywork-Reward-V2 live | Reward scores returned | `/reward_client.py` test |
| PRM step scoring | Steps scored 0-1 | 5-step reasoning test |
| OpenManus-RL training | GRPO training cycle completes | `sprint011_checkpoint/` exists |
| Skywork-Super-Agents | PPT generated | Test file downloadable |
| Vision agent registered | Agent #11 in VMOA roster | `GET /vmoa/agents` |
| Memory updated | All files timestamped 2026-03-17+ | `ls -la /memory/` |

---

## ESTIMATED TIME BREAKDOWN

| Block | Est. Time | Dependencies |
|-------|-----------|-------------|
| Pre-Sprint Setup | 30 min | `.env` file, atNorth node |
| A: genspark2api | 1 hour | Genspark cookie |
| B: Reward-V2 | 2.5 hours | GPU, HF_TOKEN |
| C: PRM Server | 2 hours | GPU, HF_TOKEN |
| D: OpenManus-RL | 3 hours | GPU, training data |
| E: Super-Agents | 30 min | Skywork API key |
| F: Vision Agent | 1 hour | Skywork API key |
| G: Memory/Docs | 30 min | All above |
| **TOTAL** | **~11 hours** | |

---
*iVenture Studio | Sprint 011 | Phase 27 | From Vestmannaeyjar, Iceland*
