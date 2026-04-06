# iVenture Studio – OpenClaw Master Orchestrator Architecture
## The Model Capacity Multiplier

**Date**: 2026-03-17
**Status**: Architecture defined, code built, ready for P2 integration

---

## The Core Insight

Previously: 1 GS_COOKIE → 1 genspark2api → 30 models
**Now**: N OPC nodes × 1 GS_COOKIE each → Orchestrator → N×30 capacity

Every OPC company that joins iVenture Studio contributes one session to the pool.
The pool grows automatically. Capacity scales with the network for free.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    iVenture Studio OS                        │
│                                                             │
│   VIC Engine v5  →  VMOA (9 agents)  →  LiteLLM Proxy      │
│                                              │              │
│                         ┌────────────────────┘              │
│                         ▼                                   │
│         ┌───────────────────────────────┐                  │
│         │  OpenClaw Master Orchestrator  │  :8090           │
│         │  ┌─────────────────────────┐  │                  │
│         │  │  Pool Manager           │  │                  │
│         │  │  ┌──────────────────┐   │  │                  │
│         │  │  │ Round Robin /    │   │  │                  │
│         │  │  │ Least Latency /  │   │  │                  │
│         │  │  │ Least Loaded /   │   │  │                  │
│         │  │  │ Sticky Company   │   │  │                  │
│         │  │  └──────────────────┘   │  │                  │
│         │  │  Health Monitor (30s)   │  │                  │
│         │  │  Rate Limit Backoff     │  │                  │
│         │  │  Redis State Sync       │  │                  │
│         │  └─────────────────────────┘  │                  │
│         └───────────────────────────────┘                  │
│                         │                                   │
│          ┌──────────────┼──────────────┐                   │
│          ▼              ▼              ▼                   │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│   │ genspark2api│ │genspark2api│ │genspark2api│  ... N     │
│   │ instance-1  │ │ instance-2 │ │ instance-N │            │
│   │ (OPC: acme) │ │(OPC: nova) │ │(OPC: xyz)  │            │
│   │ GS_COOKIE_1 │ │GS_COOKIE_2 │ │GS_COOKIE_N │            │
│   └─────┬──────┘ └─────┬──────┘ └─────┬──────┘            │
│         │              │              │                    │
│         └──────────────┼──────────────┘                   │
│                         ▼                                   │
│                   Genspark AI                              │
│              GPT-5 │ Claude-Opus-4 │ DeepSeek-R1           │
│              Grok-4 │ Gemini-2.5-Pro │ Sora-2 │ VEO-3      │
│                    (30+ models)                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼ (anonymized pool stats)
              ┌──────────────────────┐
              │     VIC Cortex       │
              │  (world model feed)  │
              └──────────────────────┘
```

---

## Routing Strategies

| Strategy | Use Case | Default |
|----------|----------|---------|
| `least_latency` | Production – fastest response | ✅ |
| `round_robin` | Balanced load distribution | |
| `least_loaded` | Fair token usage across instances | |
| `sticky_company` | OPC always uses its own instance (privacy) | |

---

## Scaling Table

| OPC Nodes | Pool Instances | Effective Model Slots | Monthly Token Capacity (est.) |
|-----------|---------------|----------------------|-------------------------------|
| 1 | 1 | 30 | ~10M tokens |
| 10 | 10 | 300 | ~100M tokens |
| 100 | 100 | 3,000 | ~1B tokens |
| 1,000 | 1,000 | 30,000 | ~10B tokens |
| 10,000 | 10,000 | 300,000 | ~100B tokens |

**At 10,000 OPC nodes (16M OPC market = 0.06% penetration) → 100B token capacity at effectively zero infrastructure cost per token.**

---

## Instance Lifecycle

```
OPC node joins network (P11/P12)
         │
         ▼
POST /pool/register-secure
  Headers: X-Admin-Key, X-Company-Slug, X-Endpoint, X-Cookie
         │
         ▼
Orchestrator:
  1. SHA-256 hash cookie (raw never stored)
  2. Probe endpoint → fetch models list
  3. Register in Redis (shared across orchestrator replicas)
  4. Status: HEALTHY
         │
         ▼
Instance is live – receives routed requests
         │
         ├── Rate limit hit → COOLING (60s backoff) → HEALTHY
         ├── Auth failure  → DEAD (admin must re-register)
         └── Timeout ×5    → DEGRADED → DEAD
```

---

## Security Design

1. **Raw cookies never persisted** – only SHA-256(cookie)[:16] stored in Redis
2. **Cookies live in memory only** during runtime (loaded from env or POST header)
3. **Admin key required** for all pool management operations
4. **Per-instance isolation** – one instance's failure doesn't affect others
5. **X-Company-Slug header** enables sticky routing for privacy-sensitive workloads
6. **Cortex reporting is aggregate only** – no individual request data leaves the pool

---

## Integration Points

### P2 – Model Gateway
- Deploy `openclaw-orchestrator` service
- Wire LiteLLM to route `genspark-pool` alias → orchestrator `:8090`
- Register starter instance (founder's own GS_COOKIE)

### P3 – VIC Engine
- VIC sets `X-Company-Slug` header on every LiteLLM call
- Enables sticky routing: company's own OpenClaw serves company's requests preferentially

### P11 – A2A Network
- When a new OPC node registers its Agent Card, it also registers its OpenClaw instance
- Auto-registration hook: `POST /pool/register-secure` on node join

### P12 – A2A Bridge
- Pool status endpoint (`/pool/status`) exposed via A2A discovery
- Other agents can query pool health before routing requests

### P14 – VIC Cortex
- Pool stats pushed every 5 min: total requests, tokens, latency, healthy/cooling/dead counts
- Cortex learns optimal routing patterns across network

---

## Pool Status API Response

```json
GET http://openclaw-orchestrator:8090/pool/status

{
  "total": 42,
  "healthy": 38,
  "cooling": 3,
  "dead": 1,
  "capacity": "38/42",
  "strategy": "least_latency",
  "instances": [
    {
      "instance_id": "claw-acme-a1b2c3d4",
      "company_slug": "acme",
      "endpoint": "http://genspark2api-acme:7055",
      "status": "healthy",
      "total_requests": 1247,
      "total_tokens": 4820000,
      "error_count": 2,
      "avg_latency_ms": 312.4,
      "models_available": 32
    },
    ...
  ]
}
```

---

## Business Value

**Before**: Solo founder pays $20-200/mo for model API access
**After**: Pool of 1,000 OPCs → each contributes 1 session → each gets 1,000× the capacity

**Monetization options**:
1. Token credits earned by contributing sessions (token economy)
2. Premium routing tiers (guaranteed latency SLA)
3. Pool size visible in dashboard → network effect FOMO driver for new OPC signups

---

## Files

| File | Purpose |
|------|---------|
| `openclaw_orchestrator.py` | Core pool manager + FastAPI service (559 lines) |
| `openclaw-docker-service.yml` | Docker Compose service definition |
| `openclaw-litellm-patch.yaml` | LiteLLM routing config patch |
| `OPENCLAW-ARCHITECTURE.md` | This document |

