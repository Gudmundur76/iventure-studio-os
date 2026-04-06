# VIC Engine API v5.3 — Specification
**Phase:** 27 APEX (Autonomous Prediction EXecution)
**Sprint:** 015 (draft) → 017-019 (staging → production)
**Base URL:** `https://api.iventure.studio/v5`
**Prev Version:** v5.0.0 (Sprint 009, production)
**Author:** VIC Architect v4.2 | iVenture Studio
**Last Updated:** 2026-03-18

---

## Overview

API v5.3 introduces four new Phase 27 APEX endpoints exposing the intelligence
layer of the VIC Engine: cross-wave insights, CWPR pattern library, PHE hypothesis
generation, and real-time RAAL streaming. These endpoints sit alongside the existing
v5.0 endpoints and are guarded by the same JWT + API key auth stack.

---

## Authentication

All non-health endpoints require:
```
Authorization: Bearer <jwt_token>
```
**JWT spec:** HS256, 60-minute expiry, `sub` + `agent_id` claims
**Trusted Agent short-circuit:** `agent_id = 46ef82eb-9f3a-4b38-9bef-900ab5d43326`
  → bypasses rate-limits for VIC Architect v4.2

**Scopes (v5.3 new):**
| Scope | Description |
|---|---|
| `read:insights` | GET /insights |
| `read:patterns` | GET /patterns |
| `write:hypotheses` | POST /hypotheses |
| `stream:raal` | WS /raal-stream |

---

## Existing Endpoints (v5.0 — unchanged)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | Public | System status + GRPO score |
| POST | /predict | Bearer | FWRD_XXX venture prediction |
| GET | /grpo | Bearer | GRPO score + training state |
| POST | /ventures | Bearer | Full multi-dimension evaluation |
| POST | /mcp | Bearer | MCP agent-to-agent protocol |
| GET | /mcp/health | Public | MCP health probe |
| POST | /auth/token | Dev only | Issue dev JWT |

---

## New Endpoints (v5.3 — Phase 27 APEX)

---

### 1. GET /insights
**Scope:** `read:insights`
**Description:** Returns aggregated intelligence insights derived from cross-wave analysis.
Powered by MWIA (Multi-Wave Intelligence Aggregator). Read-only, cached 5 minutes.

**Request:**
```
GET /insights?waves=21,22,23,24&domain=oncology&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `waves` | string (CSV) | No | latest 3 | Comma-separated wave numbers |
| `domain` | string | No | all | Filter by domain (oncology, rare_disease, etc.) |
| `subdomain` | string | No | all | Filter by subdomain |
| `limit` | int | No | 20 | Max insights to return (1–100) |
| `min_confidence` | float | No | 0.60 | Minimum confidence floor |
| `include_resolved` | bool | No | false | Include resolved predictions in context |

**Response 200:**
```json
{
  "status": "ok",
  "generated_at": "2026-03-18T12:00:00Z",
  "wave_range": [21, 22, 23, 24],
  "grpo_score": 0.991337,
  "insight_count": 15,
  "insights": [
    {
      "insight_id": "INS_A1B2C3D4",
      "type": "TREND",
      "domain": "oncology",
      "subdomain": "nsclc",
      "title": "TIGIT pathway clinical attrition above prior wave baseline",
      "body": "Wave 23 TIGIT predictions (FWRD_112) showed LIKELY_UNFAVORABLE signal (p=0.38). Cross-wave correlation with Wave 21-22 TIGIT entries suggests systematic overestimation of TIGIT monotherapy efficacy. Pattern corroborated by ADV_491 adversarial training signal (delta_p=-0.07).",
      "confidence": 0.71,
      "supporting_fwrds": ["FWRD_112"],
      "supporting_waves": [21, 22, 23],
      "pattern_ids": ["PAT_TIGIT_MONO_001"],
      "created_date": "2026-03-18",
      "tags": ["tigit", "nsclc", "phase3_readout", "adverse_signal"]
    }
  ],
  "summary": {
    "by_type": {"TREND": 8, "ANOMALY": 3, "OPPORTUNITY": 4},
    "by_domain": {"oncology": 7, "rare_disease": 4, "ophthalmology": 4},
    "avg_confidence": 0.683
  }
}
```

**Error Responses:**
| Code | Reason |
|---|---|
| 401 | Missing or invalid Bearer token |
| 403 | Missing `read:insights` scope |
| 422 | Invalid wave numbers or domain filter |
| 429 | Rate limit exceeded (100 req/min) |

---

### 2. GET /patterns
**Scope:** `read:patterns`
**Description:** Queries the CWPR (Cross-Wave Pattern Recognizer) pattern library.
Returns patterns that have been identified and validated across multiple waves.

**Request:**
```
GET /patterns?type=FAILURE&domain=oncology&min_waves=2&limit=50
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | No | all | Pattern type: SUCCESS, FAILURE, PARTIAL, ANOMALY |
| `domain` | string | No | all | Domain filter |
| `subdomain` | string | No | all | Subdomain filter |
| `min_waves` | int | No | 2 | Min waves the pattern must appear in |
| `min_frequency` | float | No | 0.0 | Min occurrence frequency (0.0–1.0) |
| `limit` | int | No | 50 | Max patterns (1–200) |
| `offset` | int | No | 0 | Pagination offset |
| `sort_by` | string | No | confidence | Sort: confidence, frequency, recency |

**Response 200:**
```json
{
  "status": "ok",
  "generated_at": "2026-03-18T12:00:00Z",
  "total_patterns": 47,
  "returned": 20,
  "offset": 0,
  "patterns": [
    {
      "pattern_id": "PAT_TIGIT_MONO_001",
      "type": "FAILURE",
      "domain": "oncology",
      "subdomain": "nsclc",
      "name": "TIGIT monotherapy Phase 3 miss",
      "description": "TIGIT checkpoint inhibitors as monotherapy have failed to demonstrate OS benefit vs SOC in NSCLC Phase 3 trials. Pattern observed across Waves 21, 22, 23.",
      "frequency": 0.82,
      "confidence": 0.78,
      "wave_occurrences": [21, 22, 23],
      "supporting_fwrds": ["FWRD_112"],
      "evidence_tags": ["phase3_readout", "tigit", "nsclc"],
      "created_wave": 21,
      "last_confirmed_wave": 23,
      "grpo_weight": 0.991337
    }
  ],
  "library_stats": {
    "total_patterns": 47,
    "by_type": {"SUCCESS": 18, "FAILURE": 14, "PARTIAL": 9, "ANOMALY": 6},
    "by_domain": {"oncology": 22, "rare_disease": 11, "ophthalmology": 8, "immunology": 6},
    "waves_covered": [21, 22, 23, 24]
  }
}
```

**Error Responses:**
| Code | Reason |
|---|---|
| 401 | Invalid token |
| 403 | Missing `read:patterns` scope |
| 422 | Invalid filter parameters |

---

### 3. POST /hypotheses
**Scope:** `write:hypotheses`
**Description:** Triggers PHE (Prediction Hypothesis Engine) to generate hypotheses
from a specified wave dataset. Asynchronous — returns a job ID for polling.

**Request:**
```
POST /hypotheses
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "wave": 24,
  "config": {
    "confidence_threshold": 0.65,
    "max_hypotheses": 50,
    "domain_filters": ["oncology", "rare_disease"],
    "grpo_weight": 0.4,
    "platt_calibrate": true,
    "stake_usd_base": 250000
  },
  "export_to_fwrd": true,
  "notify_mwia": true
}
```

**Request Schema:**
| Field | Type | Required | Description |
|---|---|---|---|
| `wave` | int | Yes | Wave number to generate hypotheses from |
| `config.confidence_threshold` | float | No | Default 0.65 |
| `config.max_hypotheses` | int | No | Default 50 |
| `config.domain_filters` | array[string] | No | null = all domains |
| `config.grpo_weight` | float | No | Default 0.4 |
| `config.platt_calibrate` | bool | No | Default true |
| `config.stake_usd_base` | float | No | Default 250000 |
| `export_to_fwrd` | bool | No | Auto-create FWRD_XXX from accepted hypotheses |
| `notify_mwia` | bool | No | Push results to MWIA aggregator |

**Response 202 (Accepted — async job):**
```json
{
  "status": "accepted",
  "job_id": "PHE_JOB_A1B2C3D4",
  "wave": 24,
  "estimated_duration_seconds": 45,
  "poll_url": "/hypotheses/jobs/PHE_JOB_A1B2C3D4",
  "created_at": "2026-03-18T12:00:00Z"
}
```

**Response 200 (Synchronous — small waves < 100 entries):**
```json
{
  "status": "complete",
  "job_id": "PHE_JOB_A1B2C3D4",
  "wave": 24,
  "hypotheses_generated": 23,
  "hypotheses_accepted": 18,
  "hypotheses_rejected": 5,
  "fwrd_created": 18,
  "fwrd_range": "FWRD_114 – FWRD_131",
  "registry_stats": {
    "avg_score": 0.7234,
    "by_subdomain": {"oncology": 8, "rare_disease": 5, "ophthalmology": 5},
    "next_fwrd": "FWRD_132"
  },
  "duration_ms": 1840,
  "created_at": "2026-03-18T12:00:00Z"
}
```

**GET /hypotheses/jobs/{job_id} — Poll status:**
```json
{
  "job_id": "PHE_JOB_A1B2C3D4",
  "status": "running | complete | failed",
  "progress_pct": 75,
  "result": null  // populated when complete
}
```

**Error Responses:**
| Code | Reason |
|---|---|
| 400 | Wave data file not found or invalid wave number |
| 401 | Invalid token |
| 403 | Missing `write:hypotheses` scope |
| 409 | PHE job already running for this wave |
| 422 | Invalid config parameters |

---

### 4. WS /raal-stream
**Scope:** `stream:raal`
**Description:** WebSocket endpoint for real-time RAAL (Real-Time Adversarial
Adaptation Layer) streaming. Streams adversarial correction events, GRPO drift
alerts, and pattern invalidation signals as they are computed.

**Connection:**
```
WS wss://api.iventure.studio/v5/raal-stream
Authorization: Bearer <token>    (passed as query param or first frame)
```

**Connection Handshake:**
```json
// Client → Server (first message):
{
  "type": "subscribe",
  "topics": ["grpo_drift", "adversary_signal", "pattern_update", "fwrd_revision"],
  "filter": {
    "min_delta_p": 0.05,
    "domains": ["oncology", "rare_disease"]
  }
}

// Server → Client (ack):
{
  "type": "subscribed",
  "topics": ["grpo_drift", "adversary_signal", "pattern_update", "fwrd_revision"],
  "session_id": "RAAL_SESS_X1Y2Z3",
  "grpo_current": 0.991337,
  "connected_at": "2026-03-18T12:00:00Z"
}
```

**Stream Event Types:**

**grpo_drift:**
```json
{
  "type": "grpo_drift",
  "timestamp": "2026-03-18T12:05:00Z",
  "grpo_before": 0.991337,
  "grpo_after": 0.991201,
  "delta": -0.000136,
  "alert_level": "INFO",
  "trigger": "wave_24_ingestion",
  "recommendation": "Monitor. Below drift threshold of -0.005."
}
```

**adversary_signal:**
```json
{
  "type": "adversary_signal",
  "timestamp": "2026-03-18T12:06:00Z",
  "adversary_round": 21,
  "entry_id": "ADV_492",
  "fwrd_ref": "FWRD_112",
  "delta_p": -0.07,
  "signal_strength": "STRONG",
  "domain": "oncology",
  "subdomain": "nsclc",
  "note": "TIGIT monotherapy Phase 3 — persistent LIKELY_UNFAVORABLE signal"
}
```

**pattern_update:**
```json
{
  "type": "pattern_update",
  "timestamp": "2026-03-18T12:07:00Z",
  "pattern_id": "PAT_TIGIT_MONO_001",
  "update_type": "REINFORCED",
  "confidence_before": 0.72,
  "confidence_after": 0.78,
  "wave_trigger": 24
}
```

**fwrd_revision:**
```json
{
  "type": "fwrd_revision",
  "timestamp": "2026-03-18T12:08:00Z",
  "fwrd_id": "FWRD_108",
  "p_before": 0.51,
  "p_after": 0.49,
  "delta_p": -0.02,
  "revision_source": "RAAL_adversary_r21",
  "new_status": "CAUTIOUS_POSITIVE"
}
```

**Heartbeat (server → client, every 30s):**
```json
{
  "type": "ping",
  "timestamp": "2026-03-18T12:10:00Z",
  "grpo_current": 0.991337,
  "events_sent": 14
}
```

**Client ping response:**
```json
{ "type": "pong" }
```

**Close codes:**
| Code | Reason |
|---|---|
| 1000 | Normal closure |
| 4001 | Invalid or expired Bearer token |
| 4003 | Missing `stream:raal` scope |
| 4008 | Server-side rate limit (max 5 concurrent RAAL streams) |
| 4010 | RAAL subsystem offline (maintenance) |

---

## Rate Limits (v5.3)

| Endpoint | Limit | Window |
|---|---|---|
| GET /insights | 100 req | per minute |
| GET /patterns | 200 req | per minute |
| POST /hypotheses | 10 req | per minute |
| WS /raal-stream | 5 concurrent | per API key |
| Trusted Agent (VIC Architect) | Unlimited | — |

---

## Versioning & Backwards Compatibility

v5.3 is **additive only** — all v5.0 endpoints remain unchanged. Clients using v5.0
will see no breaking changes. v5.3 endpoints are available at the same base URL under
the same authentication scheme.

---

## Implementation Timeline

| Sprint | Milestone |
|---|---|
| Sprint 015 | This spec approved + committed |
| Sprint 017 | v5.3 endpoints implemented + staging deploy |
| Sprint 018 | RAAL WebSocket connected to live adversary Round 21 |
| Sprint 019 | v5.3 production release + load testing |
| Sprint 020 | Phase 27 complete — v5.3 fully operational |

---

*VIC Engine API v5.3 Specification | iVenture Studio | Sprint 015 | Phase 27 APEX | 2026-03-18*
