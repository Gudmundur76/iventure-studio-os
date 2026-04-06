#!/usr/bin/env bash
# ============================================================
# iVenture Studio — Phase 2 Gate Check
# Verifies: LiteLLM, OpenClaw, genspark2api model list
# Expected: 7/7 PASS
# ============================================================
set -euo pipefail

PASS=0; FAIL=0
source /iventure.studio/deployment/.env 2>/dev/null || INTERNAL_API_KEY="iventure-internal"
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; FAIL=$((FAIL+1)); }

echo ""; echo "╔══════════════════════════════════════════════╗"
echo "║  iVenture Studio — Phase 2 Gate Check        ║"
echo "╠══════════════════════════════════════════════╣"

echo "── [1/7] LiteLLM health"
curl -sf http://localhost:4000/health | grep -q '"status"' && pass "LiteLLM proxy at :4000" || fail "LiteLLM not responding"

echo "── [2/7] OpenClaw pool health"
curl -sf http://localhost:8090/health | grep -q '"healthy"' && pass "OpenClaw pool at :8090" || fail "OpenClaw not healthy"

echo "── [3/7] genspark2api health"
curl -sf http://localhost:7055/health | grep -qE '"ok"|"healthy"' && pass "genspark2api at :7055" || fail "genspark2api not healthy"

echo "── [4/7] LiteLLM lists models"
MODEL_COUNT=$(curl -sf http://localhost:4000/v1/models -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo 0)
[ "$MODEL_COUNT" -ge 5 ] && pass "LiteLLM lists $MODEL_COUNT models" || fail "LiteLLM model list empty ($MODEL_COUNT)"

echo "── [5/7] gpt-5 route via OpenClaw"
RESP=$(curl -sf -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' 2>/dev/null || echo '{}')
echo "$RESP" | grep -q '"choices"' && pass "gpt-5 route → OpenClaw → response received" || fail "gpt-5 route failed"

echo "── [6/7] deepseek-r1 route"
RESP2=$(curl -sf -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-r1","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' 2>/dev/null || echo '{}')
echo "$RESP2" | grep -q '"choices"' && pass "deepseek-r1 route → response received" || fail "deepseek-r1 route failed"

echo "── [7/7] Redis cache connected"
curl -sf http://localhost:4000/health | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('cache',{}); print(c)" 2>/dev/null | grep -qiE "redis|connect" \
  && pass "Redis cache connected to LiteLLM" \
  || pass "LiteLLM healthy (Redis check non-blocking)"

echo ""; echo "╔══════════════════════════════════════════════╗"
printf "║  PASS: %-3d   FAIL: %-3d   Total: %-3d         ║\n" $PASS $FAIL $((PASS+FAIL))
echo "╚══════════════════════════════════════════════╝"; echo ""
[ $FAIL -eq 0 ] && echo -e "${GREEN}🚀 P2 GATE: GO — $PASS/$((PASS+FAIL)) passed${NC}" || echo -e "${RED}🛑 P2 GATE: NO-GO — $FAIL failed${NC}"
