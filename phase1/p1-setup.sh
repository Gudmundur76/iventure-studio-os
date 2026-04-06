#!/bin/bash
# ============================================================
# iVenture Studio – Phase 1: Infrastructure Bedrock Setup
# Run this on your deployment server (atNorth Iceland node)
# ============================================================
set -euo pipefail

DEPLOY_DIR="/iventure.studio/deployment"
echo "🚀 iVenture Studio P1 – Infrastructure Bedrock"
echo "================================================"

# ─── Step 1: Verify Docker ─────────────────────────────────
echo ""
echo "📦 [P1.1] Checking Docker installation..."
docker --version || { echo "❌ Docker not found. Install: https://docs.docker.com/engine/install/"; exit 1; }
docker compose version || { echo "❌ Docker Compose v2 not found."; exit 1; }
echo "✅ Docker OK"

# ─── Step 2: Create directory structure ────────────────────
echo ""
echo "📁 [P1.2] Creating deployment directory structure..."
mkdir -p "$DEPLOY_DIR"/{config,certs,logs}
mkdir -p "$DEPLOY_DIR"/volumes/{postgres,redis,minio,memory,skills,vic-engine,qdrant,neo4j}
mkdir -p "$DEPLOY_DIR"/volumes/{reward-model,prm-model,vllm-or1,world-model}
mkdir -p "$DEPLOY_DIR"/traefik
echo "✅ Directories created:"
find "$DEPLOY_DIR" -type d | sort

# ─── Step 3: Generate secure secrets ───────────────────────
echo ""
echo "🔐 [P1.3] Generating secure secrets..."
POSTGRES_PASSWORD=$(openssl rand -hex 20)
REDIS_PASSWORD=$(openssl rand -hex 20)
LITELLM_MASTER_KEY="sk-iventure-master-$(openssl rand -hex 8)"
JWT_SECRET=$(openssl rand -hex 32)
MINIO_ROOT_PASSWORD=$(openssl rand -hex 20)
INTERNAL_API_KEY="iventure-internal-$(openssl rand -hex 12)"

echo "✅ Secrets generated (save these securely!)"
echo ""
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "LITELLM_MASTER_KEY=$LITELLM_MASTER_KEY"
echo "JWT_SECRET=$JWT_SECRET"
echo "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD"
echo "INTERNAL_API_KEY=$INTERNAL_API_KEY"

# ─── Step 4: Write .env file ───────────────────────────────
echo ""
echo "📝 [P1.4] Writing .env file..."
cat > "$DEPLOY_DIR/.env" << ENVEOF
# ============================================================
# iVenture Studio – Environment Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Phase: P1 – Infrastructure Bedrock
# ============================================================

# ── INFRASTRUCTURE ──────────────────────────────────────────
COMPOSE_PROJECT_NAME=iventure-studio
ENVIRONMENT=development
LOG_LEVEL=info
TZ=UTC

# ── POSTGRESQL ──────────────────────────────────────────────
POSTGRES_DB=iventure_studio
POSTGRES_USER=iventure
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://iventure:${POSTGRES_PASSWORD}@postgres:5432/iventure_studio

# ── REDIS ───────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# ── MINIO (Object Storage) ──────────────────────────────────
MINIO_ROOT_USER=iventure-admin
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET=iventure-assets

# ── INTERNAL SECURITY ───────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
INTERNAL_API_KEY=${INTERNAL_API_KEY}

# ── PHASE 2 – MODEL GATEWAY (fill before P2) ─────────────────
GS_COOKIE=                          # Your genspark.ai session cookie
OPENAI_API_KEY=                     # sk-...
ANTHROPIC_API_KEY=                  # sk-ant-...
GOOGLE_AI_API_KEY=                  # AIza...
DEEPSEEK_API_KEY=                   # sk-...
GROQ_API_KEY=                       # gsk_...
HF_TOKEN=                           # hf_...

# ── PHASE 3 – VIC ENGINE (fill before P3) ───────────────────
VIC_ENGINE_SECRET=vic-engine-$(openssl rand -hex 8)
VMOA_ORCHESTRATOR_KEY=vmoa-$(openssl rand -hex 8)

# ── PHASE 4 – SKYWORK (fill before P4) ──────────────────────
SKYWORK_API_KEY=                    # Request at deepresearch@skywork.ai
SKYWORK_REWARD_URL=http://reward-server:8000
SKYWORK_PRM_URL=http://prm-server:8001

# ── PHASE 11 – A2A NETWORK (fill before P11) ────────────────
A2A_NETWORK_URL=https://network.iventure.studio
A2A_REGISTRY_URL=https://registry.iventure.studio
AGENT_CARD_DOMAIN=                  # Your domain e.g. mycompany.iventure.studio

# ── PHASE 14 – VIC CORTEX (fill before P14) ─────────────────
CORTEX_API_KEY=cortex-$(openssl rand -hex 12)
CORTEX_INGEST_URL=https://cortex.iventure.studio/ingest
NEO4J_PASSWORD=$(openssl rand -hex 16)
QDRANT_API_KEY=$(openssl rand -hex 16)

# ── COMPOSIO (fill before P7) ───────────────────────────────
COMPOSIO_API_KEY=                   # From composio.dev

# ── STRIPE (fill before P10) ─────────────────────────────────
STRIPE_SECRET_KEY=                  # sk_live_...
STRIPE_WEBHOOK_SECRET=              # whsec_...

# ── ICELAND BUSINESS ──────────────────────────────────────────
COMPANY_NAME=iVenture Studio ehf
REGISTRATION_NUMBER=                # Filled after Mar 24 registration
VAT_NUMBER=                         # Filled after Skatturinn registration
ENVEOF

echo "✅ .env written to $DEPLOY_DIR/.env"

echo ""
echo "================================================"
echo "✅ P1 SETUP COMPLETE – Next: copy docker files"
echo "================================================"
