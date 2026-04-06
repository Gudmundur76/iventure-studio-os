"""
iVenture Studio – OpenClaw Master Orchestrator
================================================
Manages a pool of N OpenClaw / genspark2api instances.
Each OPC node on the network contributes one session cookie.
The orchestrator routes model requests across the pool,
load-balances, monitors health, rotates on rate-limit hits,
and feeds token-usage data back to the VIC Cortex.

Architecture:
  LiteLLM → OpenClaw Orchestrator → [instance-1 ... instance-N]
                                           ↓
                                    genspark2api pool
                                           ↓
                                    Genspark AI models
                                    (GPT-5, Claude-opus-4,
                                     DeepSeek-R1, Grok-4 ...)

Pool capacity = N × per-instance limit
With 1,000 OPC nodes → ~1,000 concurrent session slots
"""

import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import aiohttp
import redis.asyncio as aioredis
import json
import os
from collections import deque

logger = logging.getLogger("openclaw.orchestrator")

# ─── Configuration ──────────────────────────────────────────

REDIS_URL        = os.getenv("REDIS_URL", "redis://:password@redis:6379/0")
CORTEX_INGEST    = os.getenv("CORTEX_INGEST_URL", "https://cortex.iventure.studio/ingest")
CORTEX_API_KEY   = os.getenv("CORTEX_API_KEY", "")
POOL_HEALTH_TTL  = int(os.getenv("POOL_HEALTH_TTL", "30"))       # seconds
RATE_LIMIT_BACKOFF = int(os.getenv("RATE_LIMIT_BACKOFF", "60"))  # seconds
MAX_RETRIES      = int(os.getenv("MAX_RETRIES", "3"))
REQUEST_TIMEOUT  = int(os.getenv("REQUEST_TIMEOUT", "120"))

# ─── Data Models ────────────────────────────────────────────

class InstanceStatus(str, Enum):
    HEALTHY  = "healthy"
    DEGRADED = "degraded"
    COOLING  = "cooling"    # rate-limited, in backoff
    DEAD     = "dead"

@dataclass
class OpenClawInstance:
    """One genspark2api node backed by one session cookie."""
    instance_id:   str
    company_slug:  str          # which OPC contributed this session
    endpoint:      str          # http://genspark2api-<slug>:7055
    cookie_hash:   str          # SHA-256(cookie) – never store raw
    status:        InstanceStatus = InstanceStatus.HEALTHY
    healthy:       bool = True
    total_requests: int = 0
    total_tokens:   int = 0
    error_count:    int = 0
    rate_limit_until: float = 0.0
    last_health_check: float = field(default_factory=time.time)
    models_available: list = field(default_factory=list)
    avg_latency_ms:   float = 0.0
    _latency_window:  deque = field(default_factory=lambda: deque(maxlen=20))

    def record_latency(self, ms: float):
        self._latency_window.append(ms)
        self.avg_latency_ms = sum(self._latency_window) / len(self._latency_window)

    def is_available(self) -> bool:
        if self.status == InstanceStatus.DEAD:
            return False
        if self.status == InstanceStatus.COOLING:
            if time.time() > self.rate_limit_until:
                self.status = InstanceStatus.HEALTHY
                return True
            return False
        return self.status in (InstanceStatus.HEALTHY, InstanceStatus.DEGRADED)

    def to_dict(self) -> dict:
        return {
            "instance_id":      self.instance_id,
            "company_slug":     self.company_slug,
            "endpoint":         self.endpoint,
            "status":           self.status.value,
            "total_requests":   self.total_requests,
            "total_tokens":     self.total_tokens,
            "error_count":      self.error_count,
            "avg_latency_ms":   round(self.avg_latency_ms, 2),
            "models_available": len(self.models_available),
        }

# ─── Routing Strategies ─────────────────────────────────────

class RoutingStrategy(str, Enum):
    ROUND_ROBIN     = "round_robin"
    LEAST_LATENCY   = "least_latency"
    LEAST_LOADED    = "least_loaded"
    RANDOM          = "random"
    STICKY_COMPANY  = "sticky_company"   # route company X always to its own instance

# ─── OpenClaw Pool Manager ──────────────────────────────────

class OpenClawPool:
    """
    Central pool managing N OpenClaw instances.
    Thread-safe via asyncio locks.
    """

    def __init__(
        self,
        strategy: RoutingStrategy = RoutingStrategy.LEAST_LATENCY,
        redis_url: str = REDIS_URL,
    ):
        self.strategy   = strategy
        self.instances: dict[str, OpenClawInstance] = {}
        self._rr_index  = 0
        self._lock      = asyncio.Lock()
        self._redis: Optional[aioredis.Redis] = None
        self._redis_url = redis_url
        self._session: Optional[aiohttp.ClientSession] = None

    # ── Lifecycle ───────────────────────────────────────────

    async def start(self):
        # self._redis  = await aioredis.from_url(self._redis_url, decode_responses=True)
        self._redis = None
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
        )
        await self._load_instances_from_redis()
        # asyncio.create_task(self._health_loop())
        # asyncio.create_task(self._cortex_report_loop())
        logger.info(f"OpenClaw pool started — {len(self.instances)} instances loaded (Redis Bypassed)")

    async def stop(self):
        if self._session:
            await self._session.close()
        if self._redis:
            await self._redis.close()

    # ── Instance Registration ────────────────────────────────

    async def register_instance(
        self,
        company_slug: str,
        endpoint: str,
        cookie: str,
    ) -> OpenClawInstance:
        """
        Called when an OPC node joins the network (P11/P12).
        Cookie is hashed immediately; raw value never stored here.
        """
        cookie_hash  = hashlib.sha256(cookie.encode()).hexdigest()[:16]
        instance_id  = f"claw-{company_slug}-{cookie_hash}"

        instance = OpenClawInstance(
            instance_id  = instance_id,
            company_slug = company_slug,
            endpoint     = endpoint,
            cookie_hash  = cookie_hash,
        )

        # Verify endpoint is reachable
        try:
            models = await self._fetch_models(instance, cookie)
            instance.models_available = models
            instance.status = InstanceStatus.HEALTHY
        except Exception as e:
            logger.warning(f"Instance {instance_id} failed initial check: {e}")
            instance.status = InstanceStatus.DEAD

        async with self._lock:
            self.instances[instance_id] = instance

        # Persist to Redis so other orchestrator replicas share the pool
        await self._persist_instance(instance)
        logger.info(
            f"Registered instance {instance_id} "
            f"({len(instance.models_available)} models, status={instance.status.value})"
        )
        return instance

    async def deregister_instance(self, instance_id: str):
        async with self._lock:
            self.instances.pop(instance_id, None)
        if self._redis:
            await self._redis.hdel("openclaw:instances", instance_id)
        logger.info(f"Deregistered instance {instance_id}")

    # ── Core Routing ─────────────────────────────────────────

    async def route_request(
        self,
        payload: dict,
        preferred_company: Optional[str] = None,
        cookie_map: Optional[dict[str, str]] = None,  # instance_id → raw cookie
    ) -> dict:
        """
        Route a chat/completion request to the best available instance.
        cookie_map is provided by the API layer (never persisted here).
        """
        for attempt in range(MAX_RETRIES):
            instance = await self._pick_instance(preferred_company)
            if not instance:
                raise RuntimeError("No healthy OpenClaw instances available")

            cookie = (cookie_map or {}).get(instance.instance_id, "")
            start  = time.time()

            try:
                result = await self._forward_request(instance, payload, cookie)
                elapsed = (time.time() - start) * 1000

                # Record success metrics
                async with self._lock:
                    instance.total_requests += 1
                    instance.record_latency(elapsed)
                    instance.total_tokens += (
                        result.get("usage", {}).get("total_tokens", 0)
                    )

                return result

            except aiohttp.ClientResponseError as e:
                if e.status == 429:
                    logger.warning(
                        f"Rate limit on {instance.instance_id}, "
                        f"cooling for {RATE_LIMIT_BACKOFF}s"
                    )
                    async with self._lock:
                        instance.status = InstanceStatus.COOLING
                        instance.rate_limit_until = time.time() + RATE_LIMIT_BACKOFF
                    continue  # retry with next instance

                elif e.status in (401, 403):
                    logger.error(f"Auth failure on {instance.instance_id}: {e}")
                    async with self._lock:
                        instance.status = InstanceStatus.DEAD
                    continue

                else:
                    async with self._lock:
                        instance.error_count += 1
                    if attempt == MAX_RETRIES - 1:
                        raise

            except asyncio.TimeoutError:
                logger.warning(f"Timeout on {instance.instance_id}")
                async with self._lock:
                    instance.error_count += 1
                    if instance.error_count > 5:
                        instance.status = InstanceStatus.DEGRADED
                if attempt == MAX_RETRIES - 1:
                    raise

        raise RuntimeError(f"All {MAX_RETRIES} routing attempts failed")

    # ── Instance Picker ──────────────────────────────────────

    async def _pick_instance(
        self,
        preferred_company: Optional[str] = None,
    ) -> Optional[OpenClawInstance]:
        async with self._lock:
            available = [
                i for i in self.instances.values()
                if i.is_available()
            ]

        if not available:
            return None

        # Sticky: prefer the company's own instance
        if preferred_company and self.strategy == RoutingStrategy.STICKY_COMPANY:
            own = [i for i in available if i.company_slug == preferred_company]
            if own:
                return own[0]

        if self.strategy == RoutingStrategy.ROUND_ROBIN:
            idx = self._rr_index % len(available)
            self._rr_index += 1
            return available[idx]

        if self.strategy == RoutingStrategy.LEAST_LATENCY:
            return min(available, key=lambda i: i.avg_latency_ms or 9999)

        if self.strategy == RoutingStrategy.LEAST_LOADED:
            return min(available, key=lambda i: i.total_requests)

        # Default: least latency
        return min(available, key=lambda i: i.avg_latency_ms or 9999)

    # ── HTTP Forwarding ──────────────────────────────────────

    async def _forward_request(
        self,
        instance: OpenClawInstance,
        payload: dict,
        cookie: str,
    ) -> dict:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cookie}",
        }
        url = f"{instance.endpoint}/v1/chat/completions"
        async with self._session.post(url, json=payload, headers=headers) as resp:
            resp.raise_for_status()
            return await resp.json()

    async def _fetch_models(self, instance: OpenClawInstance, cookie: str) -> list:
        headers = {"Authorization": f"Bearer {cookie}"}
        url = f"{instance.endpoint}/v1/models"
        async with self._session.get(url, headers=headers) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return [m["id"] for m in data.get("data", [])]

    # ── Health Monitor ───────────────────────────────────────

    async def _health_loop(self):
        while True:
            await asyncio.sleep(POOL_HEALTH_TTL)
            async with self._lock:
                instances = list(self.instances.values())

            for instance in instances:
                if instance.status == InstanceStatus.COOLING:
                    continue
                try:
                    url = f"{instance.endpoint}/health"
                    async with self._session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
                        if r.status == 200:
                            if instance.status == InstanceStatus.DEAD:
                                logger.info(f"Instance {instance.instance_id} recovered")
                            async with self._lock:
                                instance.status  = InstanceStatus.HEALTHY
                                instance.healthy = True
                                instance.last_health_check = time.time()
                        else:
                            async with self._lock:
                                instance.status  = InstanceStatus.DEGRADED
                                instance.healthy = False
                except Exception:
                    async with self._lock:
                        instance.error_count += 1
                        if instance.error_count > 10:
                            instance.status  = InstanceStatus.DEAD
                            instance.healthy = False
                    logger.warning(f"Health check failed for {instance.instance_id}")

    # ── Cortex Reporting ─────────────────────────────────────

    async def _cortex_report_loop(self):
        """Every 5 min, push aggregate pool stats to VIC Cortex."""
        while True:
            await asyncio.sleep(300)
            await self._push_cortex_stats()

    async def _push_cortex_stats(self):
        if not CORTEX_API_KEY:
            return
        stats = {
            "event":              "openclaw_pool_stats",
            "total_instances":    len(self.instances),
            "healthy_instances":  sum(1 for i in self.instances.values() if i.is_available()),
            "total_requests":     sum(i.total_requests for i in self.instances.values()),
            "total_tokens":       sum(i.total_tokens   for i in self.instances.values()),
            "avg_latency_ms":     (
                sum(i.avg_latency_ms for i in self.instances.values()) /
                max(len(self.instances), 1)
            ),
            "timestamp":          time.time(),
        }
        try:
            headers = {
                "X-Cortex-Key": CORTEX_API_KEY,
                "Content-Type": "application/json",
            }
            async with self._session.post(
                CORTEX_INGEST, json=stats, headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as r:
                if r.status not in (200, 202):
                    logger.warning(f"Cortex report returned {r.status}")
        except Exception as e:
            logger.debug(f"Cortex push failed (non-critical): {e}")

    # ── Redis Persistence ─────────────────────────────────────

    async def _persist_instance(self, instance: OpenClawInstance):
        if not self._redis:
            return
        data = {k: v for k, v in instance.to_dict().items()
                if isinstance(v, (str, int, float, bool))}
        data["status"] = instance.status.value
        await self._redis.hset(
            "openclaw:instances",
            instance.instance_id,
            json.dumps(data),
        )

    async def _load_instances_from_redis(self):
        # Redis bypassed - using local memory
        logger.info("Bypassing Redis: Using local memory for instances")
        return

    # ── Status Report ─────────────────────────────────────────

    def get_pool_status(self) -> dict:
        healthy  = [i for i in self.instances.values() if i.is_available()]
        cooling  = [i for i in self.instances.values() if i.status == InstanceStatus.COOLING]
        dead     = [i for i in self.instances.values() if i.status == InstanceStatus.DEAD]

        return {
            "total":    len(self.instances),
            "healthy":  len(healthy),
            "cooling":  len(cooling),
            "dead":     len(dead),
            "capacity": f"{len(healthy)}/{len(self.instances)}",
            "strategy": self.strategy.value,
            "instances": [i.to_dict() for i in self.instances.values()],
        }

# ─── FastAPI Service ─────────────────────────────────────────
# Exposes the orchestrator as an HTTP API that LiteLLM routes to.

try:
    from fastapi import FastAPI, HTTPException, Header, Request
    from fastapi.responses import JSONResponse
    import uvicorn

    app = FastAPI(
        title="iVenture Studio – OpenClaw Master Orchestrator",
        version="1.0.0",
        description="Pool manager for N OpenClaw / genspark2api instances",
    )
    pool = OpenClawPool(strategy=RoutingStrategy.LEAST_LATENCY)

    # Cookie map: loaded from environment at startup
    # Format: CLAW_COOKIE_<INSTANCE_ID>=<raw_cookie>
    _cookie_map: dict[str, str] = {}

    @app.on_event("startup")
    async def startup():
        await pool.start()
        # Load cookies from env
        for key, val in os.environ.items():
            if key.startswith("CLAW_COOKIE_"):
                iid = key[len("CLAW_COOKIE_"):].lower().replace("_", "-")
                _cookie_map[iid] = val
        logger.info(f"Cookie map loaded for {len(_cookie_map)} instances")

    @app.on_event("shutdown")
    async def shutdown():
        await pool.stop()

    # ── OpenAI-compatible completions endpoint ────────────────
    @app.post("/v1/chat/completions")
    async def chat_completions(
        request: Request,
        x_company_slug: Optional[str] = Header(None, alias="X-Company-Slug"),
    ):
        payload = await request.json()
        try:
            result = await pool.route_request(
                payload           = payload,
                preferred_company = x_company_slug,
                cookie_map        = _cookie_map,
            )
            return JSONResponse(result)
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

    # ── Models list (aggregated from all instances) ───────────
    @app.get("/v1/models")
    async def list_models():
        all_models: set[str] = set()
        for inst in pool.instances.values():
            all_models.update(inst.models_available)
        return {
            "object": "list",
            "data": [{"id": m, "object": "model"} for m in sorted(all_models)],
        }

    # ── Pool health dashboard ─────────────────────────────────
    @app.get("/pool/status")
    async def pool_status():
        return pool.get_pool_status()

    @app.get("/health")
    async def health():
        status = pool.get_pool_status()
        code   = 200 if status["healthy"] > 0 else 503
        return JSONResponse({"status": "ok" if code == 200 else "degraded", **status}, status_code=code)

    # ── Instance management ───────────────────────────────────
    @app.post("/pool/register")
    async def register(
        company_slug: str,
        endpoint: str,
        x_admin_key: str = Header(..., alias="X-Admin-Key"),
    ):
        if x_admin_key != os.getenv("INTERNAL_API_KEY", ""):
            raise HTTPException(status_code=403, detail="Invalid admin key")
        # Cookie passed as header for security
        raise HTTPException(status_code=400, detail="Use /pool/register-secure with cookie header")

    @app.post("/pool/register-secure")
    async def register_secure(
        request: Request,
        x_admin_key: str = Header(..., alias="X-Admin-Key"),
        x_company_slug: str = Header(..., alias="X-Company-Slug"),
        x_endpoint: str = Header(..., alias="X-Endpoint"),
        x_cookie: str = Header(..., alias="X-Cookie"),
    ):
        if x_admin_key != os.getenv("INTERNAL_API_KEY", ""):
            raise HTTPException(status_code=403, detail="Invalid admin key")
        instance = await pool.register_instance(x_company_slug, x_endpoint, x_cookie)
        # Store in cookie map (runtime only, never persisted)
        _cookie_map[instance.instance_id] = x_cookie
        return {"instance_id": instance.instance_id, "status": instance.status.value}

    @app.delete("/pool/instances/{instance_id}")
    async def deregister(
        instance_id: str,
        x_admin_key: str = Header(..., alias="X-Admin-Key"),
    ):
        if x_admin_key != os.getenv("INTERNAL_API_KEY", ""):
            raise HTTPException(status_code=403, detail="Invalid admin key")
        await pool.deregister_instance(instance_id)
        _cookie_map.pop(instance_id, None)
        return {"deregistered": instance_id}

    if __name__ == "__main__":
        logging.basicConfig(level=logging.INFO)
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

except ImportError:
    # FastAPI not installed – pool still works as library
    logger.warning("FastAPI not found – running in library mode only")
