# iVenture Studio – Phase 1 Runbook
## Infrastructure Bedrock | Est. 6 hours | Mar 17–18, 2026

---

## Prerequisites Checklist
Before starting, confirm you have:
- [ ] SSH access to atNorth Iceland compute node
- [ ] Docker Engine v24+ installed (`docker --version`)
- [ ] Docker Compose v2+ installed (`docker compose version`)
- [ ] Minimum 4 GB RAM, 40 GB disk available
- [ ] Ports 80, 443, 8080, 9000, 9001 open in firewall
- [ ] This runbook + all P1 files downloaded

---

## Step 1 – Transfer Files to Server (~10 min)

```bash
# From your local machine, copy all P1 files to server
scp p1-setup.sh \
    p1-docker-compose-core.yml \
    postgres-init.sql \
    p1-gate-check.sh \
    user@YOUR_SERVER_IP:/tmp/iventure-p1/

# SSH into server
ssh user@YOUR_SERVER_IP
cd /tmp/iventure-p1/
```

---

## Step 2 – Run Setup Script (~5 min)

```bash
chmod +x p1-setup.sh
sudo ./p1-setup.sh
```

**Expected output:**
```
🚀 iVenture Studio P1 – Infrastructure Bedrock
📦 [P1.1] Checking Docker installation...
✅ Docker OK
📁 [P1.2] Creating deployment directory structure...
✅ Directories created: /iventure.studio/deployment/...
🔐 [P1.3] Generating secure secrets...
✅ Secrets generated (save these!)
   POSTGRES_PASSWORD=<generated>
   REDIS_PASSWORD=<generated>
   ...
📝 [P1.4] Writing .env file...
✅ .env written
```

> ⚠️  SAVE THE GENERATED SECRETS immediately to a password manager (1Password / Bitwarden). They will NOT be shown again.

---

## Step 3 – Copy Config Files (~2 min)

```bash
DEPLOY_DIR="/iventure.studio/deployment"

# Copy docker-compose and init SQL
cp p1-docker-compose-core.yml $DEPLOY_DIR/docker-compose.yml
mkdir -p $DEPLOY_DIR/config
cp postgres-init.sql $DEPLOY_DIR/config/postgres-init.sql
cp p1-gate-check.sh $DEPLOY_DIR/

# Verify
ls -la $DEPLOY_DIR/
```

**Expected files:**
```
docker-compose.yml
.env
config/postgres-init.sql
p1-gate-check.sh
volumes/  (8 subdirectories)
certs/
logs/
traefik/
```

---

## Step 4 – Launch Core Services (~10 min)

```bash
cd /iventure.studio/deployment

# Pull all images first (avoids timeout issues)
docker compose pull traefik postgres redis minio

# Start services
docker compose up -d traefik postgres redis minio

# Watch startup logs
docker compose logs -f --tail=50
```

**Wait for these messages in logs:**
- Postgres: `database system is ready to accept connections`
- Redis: `Ready to accept connections`
- MinIO: `Status: 1 Online, 0 Offline`
- Traefik: `Configuration loaded from flags`

---

## Step 5 – Verify Health (~5 min)

```bash
# Check all containers are running
docker compose ps

# Expected output:
# NAME                  STATUS              PORTS
# iventure-traefik      running (healthy)   0.0.0.0:80->80, 0.0.0.0:443->443, 0.0.0.0:8080->8080
# iventure-postgres     running (healthy)   5432/tcp
# iventure-redis        running (healthy)   6379/tcp
# iventure-minio        running (healthy)   0.0.0.0:9000->9000, 0.0.0.0:9001->9001

# Quick connectivity tests
curl -s http://localhost:8080/ping             # → OK
curl -s http://localhost:9000/minio/health/live # → (200 response)
docker exec iventure-postgres pg_isready -U iventure -d iventure_studio
docker exec iventure-redis redis-cli -a $REDIS_PASSWORD ping
```

---

## Step 6 – Verify Schema (~2 min)

```bash
# List tables
docker exec iventure-postgres psql -U iventure -d iventure_studio -c '\dt'

# Expected tables: companies, users, agents, interactions, skills, memory_entries, cortex_signals

# Verify skills seeded
docker exec iventure-postgres psql -U iventure -d iventure_studio -c \
  'SELECT name, category FROM skills ORDER BY category;'

# Expected: 18 rows (market-research through cortex-distiller)
```

---

## Step 7 – Run Gate Check (~2 min)

```bash
chmod +x p1-gate-check.sh
./p1-gate-check.sh
```

**Passing output:**
```
╔══════════════════════════════════════════════════╗
║   iVenture Studio – P1 Go/No-Go Gate Check      ║
╚══════════════════════════════════════════════════╝

✅ PASS – Docker daemon running
✅ PASS – Docker Compose v2 available
✅ PASS – Traefik container healthy
✅ PASS – PostgreSQL container healthy
✅ PASS – Redis container healthy
✅ PASS – MinIO container healthy
✅ PASS – Traefik dashboard reachable
✅ PASS – PostgreSQL accepting connections
✅ PASS – Redis responding to PING
✅ PASS – MinIO health endpoint OK
✅ PASS – PostgreSQL schema exists
✅ PASS – Skills table seeded (18 rows)
✅ PASS – iventure-net network exists

────────────────────────────────────────────────────
  Results: 13 PASS  |  0 FAIL
────────────────────────────────────────────────────

🎉 PHASE 1 GATE: GO ✅
   All services healthy. Proceed to Phase 2 (Model Gateway).
   Next command: docker compose up -d litellm genspark2api
```

---

## Troubleshooting

### Postgres fails to start
```bash
docker compose logs postgres
# Common fix: check POSTGRES_PASSWORD is set in .env
grep POSTGRES_PASSWORD .env
```

### Redis AUTH error
```bash
# Ensure REDIS_PASSWORD in .env matches container startup
docker compose down redis && docker compose up -d redis
```

### MinIO port conflict
```bash
# If port 9000 is busy:
sudo lsof -i :9000
# Update docker-compose.yml to use alternate port e.g. 9010:9000
```

### Traefik shows no routes
```bash
# Check Docker socket permission
ls -la /var/run/docker.sock
sudo chmod 666 /var/run/docker.sock
docker compose restart traefik
```

---

## Phase 1 Complete ✅ → Next: Phase 2

Once gate check passes (13/13), proceed to P2:

```bash
# Phase 2 starts here – Model Gateway
# Add to .env first:
#   GS_COOKIE=<your_genspark_session_cookie>
#   LITELLM_MASTER_KEY=sk-iventure-master-xxxxx  (already generated)

docker compose up -d litellm genspark2api
curl http://localhost:4000/v1/models | jq '.data[].id' | head -20
```

**P2 unlocks 30+ models: GPT-5, Claude-Opus-4, DeepSeek-R1, Grok-4, Gemini-2.5-Pro, Sora-2, VEO-3...**

---

*Generated by iVenture Studio AI – Phase 1 Runbook v1.0*
*Date: 2026-03-17*
