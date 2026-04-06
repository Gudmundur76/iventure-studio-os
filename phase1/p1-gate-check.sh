#!/bin/bash
# ============================================================
# iVenture Studio – Phase 1 Gate Check
# Verifies all 4 services healthy before advancing to P2
# ============================================================
set -euo pipefail

PASS=0
FAIL=0
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC} – $label"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC} – $label"
    ((FAIL++))
  fi
}

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   iVenture Studio – P1 Go/No-Go Gate Check      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Docker availability
check "Docker daemon running"       "docker info"
check "Docker Compose v2 available" "docker compose version"

# Container health
check "Traefik container healthy"   "docker inspect --format='{{.State.Health.Status}}' iventure-traefik | grep -q healthy"
check "PostgreSQL container healthy" "docker inspect --format='{{.State.Health.Status}}' iventure-postgres | grep -q healthy"
check "Redis container healthy"      "docker inspect --format='{{.State.Health.Status}}' iventure-redis | grep -q healthy"
check "MinIO container healthy"      "docker inspect --format='{{.State.Health.Status}}' iventure-minio | grep -q healthy"

# Connectivity
check "Traefik dashboard reachable"  "curl -sf http://localhost:8080/ping"
check "PostgreSQL accepting connections" "docker exec iventure-postgres pg_isready -U iventure -d iventure_studio"
check "Redis responding to PING"     "docker exec iventure-redis redis-cli -a \${REDIS_PASSWORD:-} ping | grep -q PONG"
check "MinIO health endpoint OK"     "curl -sf http://localhost:9000/minio/health/live"

# Schema verification
check "PostgreSQL schema exists"     "docker exec iventure-postgres psql -U iventure -d iventure_studio -c '\dt' | grep -q companies"
check "Skills table seeded (18 rows)" "docker exec iventure-postgres psql -U iventure -d iventure_studio -t -c 'SELECT COUNT(*) FROM skills;' | grep -qE '1[0-9]|[2-9][0-9]'"

# Network
check "iventure-net network exists"  "docker network inspect iventure-studio_iventure-net"

echo ""
echo "────────────────────────────────────────────────────"
echo -e "  Results: ${GREEN}${PASS} PASS${NC}  |  ${RED}${FAIL} FAIL${NC}"
echo "────────────────────────────────────────────────────"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 PHASE 1 GATE: GO ✅${NC}"
  echo "   All services healthy. Proceed to Phase 2 (Model Gateway)."
  echo ""
  echo "   Next command:"
  echo "   docker compose up -d litellm genspark2api"
else
  echo ""
  echo -e "${RED}⛔ PHASE 1 GATE: NO-GO ❌${NC}"
  echo "   Fix $FAIL failing checks before advancing to P2."
  echo ""
  echo "   Debug commands:"
  echo "   docker compose logs postgres"
  echo "   docker compose logs redis"
  echo "   docker compose ps"
fi
