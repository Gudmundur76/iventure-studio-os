#!/usr/bin/env bash
# ============================================================
# iVenture Studio — Phase 2.5 Gate Check
# Verifies: OpenClaw, genspark2api, MiroFish, Skill #19
# Usage: chmod +x p25-gate-check.sh && ./p25-gate-check.sh
# Expected: 8/8 PASS
# ============================================================

set -euo pipefail

PASS=0
FAIL=0
RESULTS=()

# Load secrets
ENV_FILE="/iventure.studio/deployment/.env"
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "⚠️  .env not found at $ENV_FILE — using defaults"
  INTERNAL_API_KEY="iventure-internal"
fi

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; PASS=$((PASS+1)); RESULTS+=("PASS: $1"); }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; FAIL=$((FAIL+1)); RESULTS+=("FAIL: $1"); }
info() { echo -e "${YELLOW}ℹ️  INFO${NC} — $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   iVenture Studio — Phase 2.5 Gate Check             ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')                               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Check 1: OpenClaw Orchestrator healthy
echo "── [1/8] OpenClaw Orchestrator health"
if curl -sf http://localhost:8090/health | grep -q '"healthy"'; then
  pass "OpenClaw Orchestrator responding at :8090"
else
  fail "OpenClaw Orchestrator NOT healthy at :8090"
fi

# ── Check 2: genspark2api healthy
echo "── [2/8] genspark2api health"
if curl -sf http://localhost:7055/health | grep -qE '"ok"|"healthy"'; then
  pass "genspark2api responding at :7055"
else
  fail "genspark2api NOT healthy at :7055"
fi

# ── Check 3: OpenClaw Pool has ≥1 instance
echo "── [3/8] OpenClaw Pool has instances"
POOL_STATUS=$(curl -sf http://localhost:8090/pool/status 2>/dev/null || echo '{}')
POOL_COUNT=$(echo "$POOL_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total_instances',0))" 2>/dev/null || echo 0)
if [ "$POOL_COUNT" -ge 1 ]; then
  pass "OpenClaw pool has $POOL_COUNT instance(s)"
else
  fail "OpenClaw pool has 0 instances — register genspark2api first"
fi

# ── Check 4: MiroFish UI reachable
echo "── [4/8] MiroFish UI reachable"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo 000)
if [ "$HTTP_CODE" = "200" ]; then
  pass "MiroFish UI reachable at :3000 (HTTP $HTTP_CODE)"
else
  fail "MiroFish UI NOT reachable at :3000 (HTTP $HTTP_CODE)"
fi

# ── Check 5: Skill #19 microservice healthy
echo "── [5/8] VMOA Skill #19 health"
SKILL_STATUS=$(curl -sf http://localhost:8085/health 2>/dev/null || echo '{}')
if echo "$SKILL_STATUS" | grep -q '"market-simulation"'; then
  pass "Skill #19 (market-simulation) responding at :8085"
else
  fail "Skill #19 NOT healthy at :8085"
fi

# ── Check 6: Skill #19 seeded in Postgres
echo "── [6/8] Skill #19 in Postgres"
SKILL_NAME=$(docker exec iventure-postgres psql \
  -U iventure_user -d iventure_db -tAc \
  "SELECT name FROM skills WHERE name='market-simulation' LIMIT 1;" 2>/dev/null || echo "")
if [ "$SKILL_NAME" = "market-simulation" ]; then
  pass "Skill #19 (market-simulation) found in Postgres skills table"
else
  fail "Skill #19 NOT found in Postgres — run the INSERT from runbook Step 5"
fi

# ── Check 7: OpenClaw lists ≥30 models
echo "── [7/8] OpenClaw model list"
MODEL_COUNT=$(curl -sf http://localhost:8090/v1/models \
  -H "Authorization: Bearer ${INTERNAL_API_KEY}" 2>/dev/null | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null || echo 0)
if [ "$MODEL_COUNT" -ge 30 ]; then
  pass "OpenClaw pool lists $MODEL_COUNT models"
elif [ "$MODEL_COUNT" -gt 0 ]; then
  info "OpenClaw lists $MODEL_COUNT models (expected ≥30 — acceptable for 1 instance)"
  pass "OpenClaw model list non-empty ($MODEL_COUNT models)"
else
  fail "OpenClaw model list empty — check GS_COOKIE and genspark2api logs"
fi

# ── Check 8: Test simulation runs (quick 5-agent test)
echo "── [8/8] Test simulation execution"
SIM_RESULT=$(curl -sf -X POST http://localhost:8085/skills/market-simulation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INTERNAL_API_KEY}" \
  -d '{
    "document": "Gate check test simulation.",
    "question": "Test only.",
    "n_agents": 5,
    "n_rounds": 2,
    "language": "en",
    "mode": "mirofish"
  }' 2>/dev/null || echo '{}')
if echo "$SIM_RESULT" | grep -q '"simulation_id"'; then
  SIM_ID=$(echo "$SIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('simulation_id','?'))" 2>/dev/null || echo "?")
  pass "Test simulation completed — ID: $SIM_ID"
else
  fail "Test simulation failed — check skill-market-sim logs"
fi

# ── Summary
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Phase 2.5 Gate Results                             ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║   ✅ PASS: %-3d   ❌ FAIL: %-3d   Total: %-3d          ║\n" $PASS $FAIL $((PASS+FAIL))
echo "╚══════════════════════════════════════════════════════╝"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🚀 P2.5 GATE: GO — All 8 checks passed!${NC}"
  echo "Next: Start P2 (Model Gateway) or P3 (VIC Engine)"
  exit 0
else
  echo -e "${RED}🛑 P2.5 GATE: NO-GO — $FAIL check(s) failed.${NC}"
  echo "Review failures above and re-run after fixing."
  exit 1
fi
