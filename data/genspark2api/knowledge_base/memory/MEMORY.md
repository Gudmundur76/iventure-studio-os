# ================================================================
# iVenture Studio — MEMORY UPDATE
# Append this entire block to /memory/MEMORY.md
# Date: 2026-03-17 | Session: Architecture Design
# ================================================================

## SPRINT MEMORY ENTRY — 2026-03-17 — ARCHITECTURE DECISION SESSION

### Session Type: Strategic Architecture
### Outcome: MASTER DEVELOPMENT PLAN v1.0 LOCKED

---

### DECISION LOG

**DECISION 1: Central Cortex (not federated, not protocol-owned)**
- Owner: iVenture Studio ehf., Vestmannaeyjabær, Iceland
- Jurisdiction: Icelandic law → EU regulated (GDPR compliant)
- Rationale: Maximum control, VC-fundable, trusted by both EU and China
- Revisit at: 10,000 nodes → consider federated shards

**DECISION 2: Option C for A2A and Cortex hooks**
- Embed A2A stubs AND Cortex contributor in P3 (not P11/P14)
- Cost: ~3h extra during P3
- Saves: ~300h refactoring later
- Every interaction from Day 1 of launch feeds the cortex
- Every node from Day 1 is network-discoverable

**DECISION 3: Three-layer architecture**
- Layer 1: iVenture Studio OS (P1-P10) — the company operating system
- Layer 2: OPC Network + A2A (P11-P13) — peer-to-peer agent commerce
- Layer 3: VIC Cortex World Model (P14-P18) — self-building intelligence

**DECISION 4: The Cortex is the real moat**
- SaaS alone → 5-15× ARR multiple
- Cortex + network → 50-200× multiple (data asset + network effects)
- Comparable to Google's search index, Waze's traffic model
- Data builds itself as a byproduct of normal usage
- Cannot be replicated by competitors — compounding from Day 1

**DECISION 5: The "self-building cortex" insight**
- Founder insight (original): all node interactions route down → world model
- Multiple VIC engines → single shared intelligence substrate
- This substrate is searchable → "Google for the OPC economy"
- Compounds for free — each interaction improves the whole network

---

### ARCHITECTURE CONSTANTS (locked, do not change without full review)

```
GRPO_CURRENT:          0.991337
GRPO_TARGET_SOLO:      0.997
GRPO_TARGET_CORTEX:    0.9995+ (collective, long-term)
GRPO_WEIGHTS:          outcome=0.50, process=0.30, format=0.20
K_ANONYMITY_MIN:       10 nodes per signal category
DP_EPSILON:            0.5 (strong privacy)
CORTEX_CREDITS_RATE:   1 signal = 1 credit
A2A_COMMISSION:        2% of peer-to-peer task payments
STRIPE_PLANS:          Solo €29, Studio €79, Enterprise €299
CNY_PLANS:             个人版 ¥199, 工作室版 ¥599, 企业版 ¥2,199
```

---

### PHASE REGISTRY (P1-P18)

| Phase | Name | Days | Hours | Layer | Status |
|-------|------|------|-------|-------|--------|
| P1 | Infrastructure Bedrock | 1-2 | 6h | OS | PENDING |
| P2 | Model Gateway | 2-3 | 4h | OS | PENDING |
| P3 | VIC Engine + VMOA + Hooks ⭐ | 3-7 | 12h | OS | PENDING |
| P4 | Skywork Intelligence | 7-10 | 10h | OS | PENDING |
| P5 | OpenManus-RL Training Loop | 10-12 | 8h | OS | PENDING |
| P6 | Frontend Dashboard | 7-14 | 12h | OS | PENDING |
| P7 | Workspace Integrations | 14-17 | 8h | OS | PENDING |
| P8 | OPC Templates CN | 17-20 | 6h | OS | PENDING |
| P9 | Production Hardening | 20-24 | 8h | OS | PENDING |
| P10 | Public Launch | 24-28 | 8h | OS | PENDING |
| P11 | Agent Identity + Cards | 29-33 | 8h | NET | PENDING |
| P12 | A2A Communication Bridge | 33-38 | 12h | NET | PENDING |
| P13 | P2P Marketplace + Payments | 38-45 | 16h | NET | PENDING |
| P14 | Cortex Ingestion + Privacy | 29-34 | 12h | CX | PENDING |
| P15 | Knowledge Graph + Vectors | 34-38 | 10h | CX | PENDING |
| P16 | Cortex Search API | 38-43 | 12h | CX | PENDING |
| P17 | World Model Fine-Tune | 43-50 | 16h | CX | PENDING |
| P18 | Flywheel (∞) | 50+ | ∞ | CX | PENDING |

Total estimated hours: 188h
Critical external deadline: APR 6 — Shenzhen Longgang subsidy

---

### FILE REGISTRY (AI Drive /iventure-studio/)

| File | Purpose | Status |
|------|---------|--------|
| MASTER-DEV-PLAN.md | 18-phase single source of truth | ✅ SAVED |
| VIC-CORTEX-SPEC.md | Full cortex technical specification | ✅ SAVED |
| cortex_contributor.py | Privacy-safe signal distillation | ✅ SAVED |
| a2a_card.py | A2A Agent Card generator + stub server | ✅ SAVED |
| MEMORY-UPDATE.md | This file | ✅ SAVED |
| docker-compose.yml | 20-service full stack | ✅ SAVED |
| litellm_config.yaml | 30+ model routing | ✅ SAVED |
| env.template | All environment variables | ✅ SAVED |
| reward_client.py | GRPO reward system (Skywork) | ✅ SAVED |
| sprint-011-checklist.md | P3+P4 execution | ✅ SAVED |
| sprint-012-checklist.md | P6+P7 execution | ✅ SAVED |
| phase27-roadmap.md | Phase 27 roadmap | ✅ SAVED |
| phased-dev-plan.md | P1-P10 step details | ✅ SAVED |

---

### KEY CONTACTS

| Contact | Purpose | Address |
|---------|---------|---------|
| Skywork AI | DeepResearch V2 API access | deepresearch@skywork.ai |
| atNorth Iceland | GPU compute | atnorth.com |
| FAB Lab Vestmannaeyjar | Dev workspace | fabacademy.org/2025/labs/vestmannaeyjar |
| Longgang S&T Bureau | Subsidy (DL: APR 6) | — |
| Composio | Google tools SDK | app.composio.dev |

---

### CRITICAL PATH REMINDER

```
Start P1 immediately.
P3 is the most important phase — embed BOTH hooks here.
P4 and P6 run in parallel after P3.
Longgang deadline APR 6 — file BEFORE P10 completes.
Cortex compounds from FIRST interaction — get it right in P3.
```

---

### ONE-SENTENCE NORTH STAR

"iVenture Studio is the OS every solo company runs on.
The network makes each company smarter than it could be alone.
The cortex makes the network worth more than the sum of its companies.
None of it costs extra. All of it compounds forever."

---
*Memory entry: 2026-03-17 | iVenture Studio ehf. | Phase 27*
*Next memory update due: After P3 completion*
# ================================================================
# iVenture Studio — MEMORY UPDATE
# Append this entire block to /memory/MEMORY.md
# Date: 2026-03-25 | Session: US Market Pivot Execution
# ================================================================

## SPRINT MEMORY ENTRY — 2026-03-25 — US MARKET PIVOT COMPLETE

### Session Type: Market Pivot & Compliance
### Outcome: US INFRASTRUCTURE & STRATEGY LIVE

---

### DECISION LOG

**DECISION 6: A2A Backbone Pivot (Thenvoi Integration)**
- Rationale: Avoid building a custom P2P protocol from scratch. Use Thenvoi as the "Universal Agent Communication Layer."
- Integration: Phase 12 updated to "Thenvoi A2A Bridge."
- Rationale: Accelerates A2A timeline by 4 weeks and provides instant framework-agnostic connectivity.

**DECISION 7: US-East Priority Routing**
- Update LiteLLM configuration to enforce US-East-1 (AWS) / EastUS (Azure) region inference for US Genesis Node users.
- Rationale: Minimize decision latency—our core 2026 competitive moat.

**DECISION 8: NIST AI RMF 1.0 Compliance Commitment**
- Map VIC Cortex privacy layers (DP, k-Anonymity) to NIST GOVERN/MAP/MEASURE/MANAGE functions.
- Rationale: Building enterprise-grade trust for the "one-person unicorn" market.

---

### NEW CONSTANTS (US PIVOT)

```
UI_LOCALE:             en-US
CURRENCY:              USD ($)
INFERENCE_REGION:      us-east-1
A2A_BACKBONE:          Thenvoi Protocol
NIST_COMPLIANCE:       Mapped (v1.0)
TRUST_BRIDGE:          Leif Erikson Narrative (Active)
```

---

### US PARTNER OUTREACH TARGETS (S3.5-PMA-03)

1. **NoGood (NYC):** Target for AI growth engineering partnership.
2. **Sem Nexus (NYC):** Target for AI-driven user acquisition testing.
3. **Cognitiv (NYC):** Target for deep learning audience modeling integration.
4. **Code Brew Labs (Global/NYC):** Target for no-code automation scaling.
5. **ELIYA.io (Global):** Target for marketing data science/ROI consulting.

---

### COMPLETED US BACKLOG TASKS

- [x] **S3.5-MDA-03:** NIST AI RMF Compliance Mapping Documented.
- [x] **S3.5-BDA-03:** Stripe US Onboarding Requirements Verified (EIN + Foreign Passport OK).
- [x] **S3.5-FDA-03:** Dashboard UI config updated to en-US / USD.
- [x] **S3.5-MDA-04:** LiteLLM config updated for US-East priority.
- [x] **S3.5-PMA-04:** Leif Erikson Trust Bridge narrative refined.
- [x] **S3.5-PMA-03:** 5 US Partner Agencies identified.

---

### PHASE REGISTRY UPDATES (P11-P12)

| Phase | Name | Hours | Status |
|-------|------|-------|--------|
| P11 | Agent Identity + Thenvoi Registry | 8h | PENDING |
| P12 | Thenvoi A2A Bridge Integration | 12h | PENDING |

---
*Memory entry: 2026-03-25 | iVenture Studio ehf. | Genesis Node 01 (US)*
*Next memory update due: After Sprint 012 Dashboard Deploy*
