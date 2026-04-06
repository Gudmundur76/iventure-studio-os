"""
iVenture Studio – VIC Engine Mesh Coordinator
==============================================
Routes TASKS (not just model calls) across N distributed VIC Engine nodes.
Each node = 1 VIC Engine + 1 genspark2api + 1 GS_COOKIE.
Coordinator picks best node per task using GRPO scores + load + specialisation.
Supports: single-best routing, ensemble mode, GRPO leaderboard, A2A delegation.

Layer 2 of 4 in the VIC Engine Mesh Architecture.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from collections import defaultdict

import aiohttp
import redis.asyncio as aioredis

logger = logging.getLogger("vic.mesh")

# ─── Config ──────────────────────────────────────────────────

REDIS_URL          = os.getenv("REDIS_URL", "redis://:pw@redis:6379/2")
CORTEX_INGEST_URL  = os.getenv("CORTEX_INGEST_URL", "https://cortex.iventure.studio/ingest")
CORTEX_API_KEY     = os.getenv("CORTEX_API_KEY", "")
INTERNAL_API_KEY   = os.getenv("INTERNAL_API_KEY", "")
MESH_HEALTH_TTL    = int(os.getenv("MESH_HEALTH_TTL", "30"))
ENSEMBLE_TOP_N     = int(os.getenv("ENSEMBLE_TOP_N", "3"))
NODE_TIMEOUT       = int(os.getenv("NODE_TIMEOUT", "120"))

# Skills map → specialisation categories
SKILL_CATEGORIES = {
    "market-research":    "research",
    "data-analysis":      "research",
    "deep-research":      "research",
    "content-creation":   "content",
    "social-media":       "content",
    "email-marketing":    "content",
    "presentation-gen":   "content",
    "brand-identity":     "content",
    "financial-modeling": "finance",
    "subsidy-advisor":    "finance",
    "legal-compliance":   "finance",
    "lead-generation":    "sales",
    "customer-support":   "operations",
    "seo-optimization":   "marketing",
    "code-generation":    "engineering",
    "opc-onboarding":     "chinese-market",
    "cross-border-trade": "chinese-market",
    "cortex-distiller":   "system",
}

# ─── Node Models ─────────────────────────────────────────────

class NodeStatus(str, Enum):
    ONLINE   = "online"
    BUSY     = "busy"
    DEGRADED = "degraded"
    OFFLINE  = "offline"

@dataclass
class SkillScore:
    skill:        str
    grpo_score:   float = 0.991337
    task_count:   int   = 0
    success_rate: float = 1.0
    avg_latency:  float = 0.0

@dataclass
class VICNode:
    """One fully autonomous VIC Engine + genspark2api node."""
    node_id:          str
    company_slug:     str
    vic_endpoint:     str       # http://vic-engine-<slug>:8080
    claw_endpoint:    str       # http://genspark2api-<slug>:7055
    specialisation:   str = "general"
    status:           NodeStatus = NodeStatus.ONLINE
    grpo_global:      float = 0.991337
    queue_depth:      int   = 0
    total_tasks:      int   = 0
    total_tokens:     int   = 0
    region:           str   = "is"           # Iceland default
    registered_at:    float = field(default_factory=time.time)
    last_heartbeat:   float = field(default_factory=time.time)
    skill_scores:     dict  = field(default_factory=dict)   # skill → SkillScore
    languages:        list  = field(default_factory=lambda: ["en"])

    def grpo_for_skill(self, skill: str) -> float:
        if skill in self.skill_scores:
            return self.skill_scores[skill].grpo_score
        # Fall back to category score, then global
        cat = SKILL_CATEGORIES.get(skill, "general")
        cat_scores = [
            s.grpo_score for sk, s in self.skill_scores.items()
            if SKILL_CATEGORIES.get(sk) == cat
        ]
        return (sum(cat_scores) / len(cat_scores)) if cat_scores else self.grpo_global

    def is_available(self) -> bool:
        return self.status in (NodeStatus.ONLINE, NodeStatus.BUSY)

    def routing_score(self, skill: str, prefer_specialisation: Optional[str] = None) -> float:
        """Composite score for routing decision (higher = better candidate)."""
        grpo_weight    = 0.50
        load_weight    = 0.25
        spec_weight    = 0.15
        latency_weight = 0.10

        grpo_component    = self.grpo_for_skill(skill)
        load_component    = max(0.0, 1.0 - (self.queue_depth / 20.0))  # normalised
        spec_component    = 1.0 if (
            prefer_specialisation and self.specialisation == prefer_specialisation
        ) else 0.5 if self.specialisation == "general" else 0.3
        latency_score = self.skill_scores.get(skill)
        latency_component = max(0.0, 1.0 - (
            (latency_score.avg_latency / 5000.0) if latency_score else 0.5
        ))

        return (
            grpo_component    * grpo_weight    +
            load_component    * load_weight    +
            spec_component    * spec_weight    +
            latency_component * latency_weight
        )

    def to_dict(self) -> dict:
        return {
            "node_id":        self.node_id,
            "company_slug":   self.company_slug,
            "vic_endpoint":   self.vic_endpoint,
            "specialisation": self.specialisation,
            "status":         self.status.value,
            "grpo_global":    self.grpo_global,
            "queue_depth":    self.queue_depth,
            "total_tasks":    self.total_tasks,
            "skill_scores":   {
                sk: {"grpo": s.grpo_score, "tasks": s.task_count}
                for sk, s in self.skill_scores.items()
            },
            "region":         self.region,
            "languages":      self.languages,
            "last_heartbeat": self.last_heartbeat,
        }

# ─── Task Models ─────────────────────────────────────────────

@dataclass
class MeshTask:
    task_id:       str
    skill:         str
    payload:       dict
    requester_slug: str
    priority:      int   = 1       # 1=normal, 2=high, 3=critical
    ensemble:      bool  = False   # run top-N engines, pick best
    ensemble_n:    int   = 3
    language:      str   = "en"
    require_spec:  Optional[str] = None  # force specific specialisation

@dataclass
class MeshResult:
    task_id:     str
    node_id:     str
    company_slug: str
    result:      dict
    grpo_score:  float
    latency_ms:  float
    skill:       str
    ensemble_rank: int = 1   # 1=winner if ensemble

# ─── Mesh Coordinator ────────────────────────────────────────

class VICMeshCoordinator:
    """
    Routes task execution across N distributed VIC Engine nodes.
    - Single-best: route to highest-scoring available node
    - Ensemble: run top-N in parallel, Skywork Reward-V2 adjudicates
    - Feeds all results to VIC Cortex
    - Persists node registry + GRPO leaderboard in Redis
    """

    def __init__(self, redis_url: str = REDIS_URL):
        self.nodes:     dict[str, VICNode] = {}
        self._lock      = asyncio.Lock()
        self._redis_url = redis_url
        self._redis: Optional[aioredis.Redis] = None
        self._session: Optional[aiohttp.ClientSession] = None

    # ── Lifecycle ────────────────────────────────────────────

    async def start(self):
        # self._redis   = await aioredis.from_url(self._redis_url, decode_responses=True)
        self._redis = None
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=NODE_TIMEOUT)
        )
        await self._load_nodes()
        # asyncio.create_task(self._health_loop())
        # asyncio.create_task(self._heartbeat_reap_loop())
        # asyncio.create_task(self._cortex_report_loop())
        logger.info(f"VIC Mesh Coordinator started — {len(self.nodes)} nodes loaded (Redis Bypassed)")

    async def stop(self):
        if self._session: await self._session.close()
        if self._redis:   await self._redis.close()

    # ── Node Registration ────────────────────────────────────

    async def register_node(
        self,
        company_slug:  str,
        vic_endpoint:  str,
        claw_endpoint: str,
        specialisation: str = "general",
        region:        str = "is",
        languages:     list = None,
    ) -> VICNode:
        node_id = f"vic-{company_slug}-{hashlib.md5(vic_endpoint.encode()).hexdigest()[:8]}"

        node = VICNode(
            node_id       = node_id,
            company_slug  = company_slug,
            vic_endpoint  = vic_endpoint,
            claw_endpoint = claw_endpoint,
            specialisation = specialisation,
            region        = region,
            languages     = languages or ["en"],
        )

        # Probe VIC Engine
        try:
            health = await self._probe_vic(node)
            node.grpo_global = health.get("grpo_score", 0.991337)
            node.queue_depth = health.get("queue_depth", 0)
            node.status      = NodeStatus.ONLINE
            logger.info(f"Node {node_id} registered (GRPO={node.grpo_global:.6f}, spec={specialisation})")
        except Exception as e:
            node.status = NodeStatus.DEGRADED
            logger.warning(f"Node {node_id} registered but probe failed: {e}")

        async with self._lock:
            self.nodes[node_id] = node

        await self._persist_node(node)
        return node

    async def update_node_skill_score(
        self, node_id: str, skill: str, grpo: float, latency_ms: float, success: bool
    ):
        async with self._lock:
            node = self.nodes.get(node_id)
            if not node:
                return
            if skill not in node.skill_scores:
                node.skill_scores[skill] = SkillScore(skill=skill)
            ss = node.skill_scores[skill]
            ss.task_count  += 1
            ss.grpo_score   = (ss.grpo_score * 0.9) + (grpo * 0.1)  # EMA
            ss.success_rate = (ss.success_rate * 0.95) + (1.0 if success else 0.0) * 0.05
            ss.avg_latency  = (ss.avg_latency * 0.9) + (latency_ms * 0.1)
            # Update global GRPO as EMA of skill scores
            scores = [s.grpo_score for s in node.skill_scores.values()]
            node.grpo_global = sum(scores) / len(scores)

        await self._persist_node(self.nodes[node_id])

    # ── Task Routing ─────────────────────────────────────────

    async def dispatch(self, task: MeshTask) -> MeshResult:
        if task.ensemble:
            return await self._ensemble_dispatch(task)
        return await self._single_dispatch(task)

    async def _single_dispatch(self, task: MeshTask) -> MeshResult:
        node = await self._pick_node(task)
        if not node:
            raise RuntimeError(f"No available nodes for skill={task.skill}")

        start = time.time()
        async with self._lock:
            node.queue_depth += 1
            node.status = NodeStatus.BUSY if node.queue_depth > 3 else NodeStatus.ONLINE

        try:
            result = await self._call_vic_node(node, task)
            latency = (time.time() - start) * 1000
            grpo    = result.get("grpo_score", node.grpo_global)

            await self.update_node_skill_score(node.node_id, task.skill, grpo, latency, True)

            async with self._lock:
                node.queue_depth = max(0, node.queue_depth - 1)
                node.total_tasks += 1
                if node.queue_depth == 0:
                    node.status = NodeStatus.ONLINE

            await self._push_cortex_signal(task, node, grpo, latency, success=True)

            return MeshResult(
                task_id      = task.task_id,
                node_id      = node.node_id,
                company_slug = node.company_slug,
                result       = result,
                grpo_score   = grpo,
                latency_ms   = latency,
                skill        = task.skill,
            )

        except Exception as e:
            async with self._lock:
                node.queue_depth = max(0, node.queue_depth - 1)
            await self.update_node_skill_score(node.node_id, task.skill, 0.0, 9999, False)
            await self._push_cortex_signal(task, node, 0.0, 9999, success=False)
            raise

    async def _ensemble_dispatch(self, task: MeshTask) -> MeshResult:
        """Run top-N nodes in parallel, Skywork Reward-V2 picks winner."""
        top_nodes = await self._top_n_nodes(task, n=task.ensemble_n)
        if not top_nodes:
            raise RuntimeError("No nodes available for ensemble")

        tasks_coro = [self._call_vic_node(n, task) for n in top_nodes]
        starts     = [time.time()] * len(top_nodes)
        raw        = await asyncio.gather(*tasks_coro, return_exceptions=True)

        scored: list[tuple[VICNode, dict, float, float]] = []
        for i, (node, result) in enumerate(zip(top_nodes, raw)):
            if isinstance(result, Exception):
                logger.warning(f"Ensemble node {node.node_id} failed: {result}")
                continue
            latency = (time.time() - starts[i]) * 1000
            grpo    = result.get("grpo_score", node.grpo_global)
            scored.append((node, result, grpo, latency))

        if not scored:
            raise RuntimeError("All ensemble nodes failed")

        # Sort by GRPO score descending
        scored.sort(key=lambda x: x[2], reverse=True)
        winner_node, winner_result, winner_grpo, winner_latency = scored[0]

        # Update all nodes and push all to Cortex (losers are valuable training signal too)
        for rank, (node, result, grpo, latency) in enumerate(scored, 1):
            await self.update_node_skill_score(node.node_id, task.skill, grpo, latency, True)
            await self._push_cortex_signal(task, node, grpo, latency, success=True, ensemble_rank=rank)

        return MeshResult(
            task_id      = task.task_id,
            node_id      = winner_node.node_id,
            company_slug = winner_node.company_slug,
            result       = winner_result,
            grpo_score   = winner_grpo,
            latency_ms   = winner_latency,
            skill        = task.skill,
            ensemble_rank = 1,
        )

    # ── Node Picker ──────────────────────────────────────────

    async def _pick_node(self, task: MeshTask) -> Optional[VICNode]:
        async with self._lock:
            candidates = [n for n in self.nodes.values() if n.is_available()]

        if not candidates:
            return None

        # Filter by language requirement
        if task.language != "en":
            lang_match = [n for n in candidates if task.language in n.languages]
            if lang_match:
                candidates = lang_match

        # Filter by required specialisation
        if task.require_spec:
            spec_match = [n for n in candidates if n.specialisation == task.require_spec]
            if spec_match:
                candidates = spec_match

        # Score and pick best
        scored = [(n, n.routing_score(task.skill, task.require_spec)) for n in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[0][0]

    async def _top_n_nodes(self, task: MeshTask, n: int) -> list[VICNode]:
        async with self._lock:
            candidates = [node for node in self.nodes.values() if node.is_available()]
        scored = [(nd, nd.routing_score(task.skill)) for nd in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [nd for nd, _ in scored[:n]]

    # ── VIC Node API Call ─────────────────────────────────────

    async def _call_vic_node(self, node: VICNode, task: MeshTask) -> dict:
        url     = f"{node.vic_endpoint}/v1/execute"
        headers = {
            "Content-Type":  "application/json",
            "X-Mesh-Key":    INTERNAL_API_KEY,
            "X-Task-ID":     task.task_id,
            "X-Requester":   task.requester_slug,
        }
        payload = {
            "skill":    task.skill,
            "payload":  task.payload,
            "priority": task.priority,
            "language": task.language,
        }
        async with self._session.post(url, json=payload, headers=headers) as resp:
            resp.raise_for_status()
            return await resp.json()

    async def _probe_vic(self, node: VICNode) -> dict:
        url = f"{node.vic_endpoint}/health"
        async with self._session.get(
            url,
            headers={"X-Mesh-Key": INTERNAL_API_KEY},
            timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            resp.raise_for_status()
            return await resp.json()

    # ── Health Monitor ───────────────────────────────────────

    async def _health_loop(self):
        while True:
            await asyncio.sleep(MESH_HEALTH_TTL)
            async with self._lock:
                nodes = list(self.nodes.values())
            for node in nodes:
                try:
                    health = await self._probe_vic(node)
                    async with self._lock:
                        node.last_heartbeat = time.time()
                        node.queue_depth    = health.get("queue_depth", 0)
                        node.grpo_global    = health.get("grpo_score", node.grpo_global)
                        if node.status == NodeStatus.OFFLINE:
                            logger.info(f"Node {node.node_id} came back online")
                        node.status = (
                            NodeStatus.BUSY if node.queue_depth > 3 else NodeStatus.ONLINE
                        )
                except Exception:
                    async with self._lock:
                        node.status = NodeStatus.DEGRADED
                        logger.warning(f"Health check failed for {node.node_id}")

    async def _heartbeat_reap_loop(self):
        """Mark nodes offline if no heartbeat for 5×TTL."""
        while True:
            await asyncio.sleep(MESH_HEALTH_TTL * 5)
            cutoff = time.time() - (MESH_HEALTH_TTL * 5)
            async with self._lock:
                for node in self.nodes.values():
                    if node.last_heartbeat < cutoff and node.status != NodeStatus.OFFLINE:
                        node.status = NodeStatus.OFFLINE
                        logger.warning(f"Node {node.node_id} reaped (no heartbeat)")

    # ── Cortex Feed ──────────────────────────────────────────

    async def _push_cortex_signal(
        self,
        task: MeshTask,
        node: VICNode,
        grpo: float,
        latency_ms: float,
        success: bool,
        ensemble_rank: int = 1,
    ):
        if not CORTEX_API_KEY:
            return
        signal = {
            "event":          "vic_mesh_task",
            "skill":          task.skill,
            "specialisation": node.specialisation,
            "grpo_reward":    grpo,
            "latency_ms":     round(latency_ms, 2),
            "success":        success,
            "ensemble_rank":  ensemble_rank,
            "region":         node.region,
            "language":       task.language,
            "timestamp":      time.time(),
        }
        try:
            async with self._session.post(
                CORTEX_INGEST_URL,
                json=signal,
                headers={"X-Cortex-Key": CORTEX_API_KEY, "Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                if r.status not in (200, 202):
                    logger.debug(f"Cortex signal returned {r.status}")
        except Exception as e:
            logger.debug(f"Cortex push failed: {e}")

    async def _cortex_report_loop(self):
        while True:
            await asyncio.sleep(300)
            stats = self.get_leaderboard()
            try:
                async with self._session.post(
                    CORTEX_INGEST_URL,
                    json={"event": "vic_mesh_leaderboard", **stats, "timestamp": time.time()},
                    headers={"X-Cortex-Key": CORTEX_API_KEY, "Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as r:
                    pass
            except Exception:
                pass

    # ── Redis Persistence ─────────────────────────────────────

    async def _persist_node(self, node: VICNode):
        if not self._redis:
            return
        await self._redis.hset("vic_mesh:nodes", node.node_id, json.dumps(node.to_dict()))

    async def _load_nodes(self):
        if not self._redis:
            return
        raw = await self._redis.hgetall("vic_mesh:nodes")
        for nid, data_str in raw.items():
            data = json.loads(data_str)
            node = VICNode(
                node_id       = data["node_id"],
                company_slug  = data["company_slug"],
                vic_endpoint  = data["vic_endpoint"],
                claw_endpoint = data.get("claw_endpoint", ""),
                specialisation = data.get("specialisation", "general"),
                status        = NodeStatus(data.get("status", "online")),
                grpo_global   = data.get("grpo_global", 0.991337),
                region        = data.get("region", "is"),
                languages     = data.get("languages", ["en"]),
            )
            self.nodes[nid] = node
        logger.info(f"Loaded {len(self.nodes)} nodes from Redis")

    # ── Public Status ─────────────────────────────────────────

    def get_leaderboard(self) -> dict:
        """GRPO leaderboard — top nodes per skill."""
        skill_leaders: dict[str, list] = defaultdict(list)
        for node in self.nodes.values():
            for skill, ss in node.skill_scores.items():
                skill_leaders[skill].append({
                    "node_id":    node.node_id,
                    "company":    node.company_slug,
                    "grpo":       ss.grpo_score,
                    "tasks":      ss.task_count,
                    "spec":       node.specialisation,
                })
        # Sort each skill by GRPO desc
        return {
            "total_nodes":   len(self.nodes),
            "online_nodes":  sum(1 for n in self.nodes.values() if n.is_available()),
            "total_tasks":   sum(n.total_tasks for n in self.nodes.values()),
            "skill_leaders": {
                sk: sorted(leaders, key=lambda x: x["grpo"], reverse=True)[:5]
                for sk, leaders in skill_leaders.items()
            },
        }

    def get_mesh_status(self) -> dict:
        online   = [n for n in self.nodes.values() if n.status == NodeStatus.ONLINE]
        busy     = [n for n in self.nodes.values() if n.status == NodeStatus.BUSY]
        degraded = [n for n in self.nodes.values() if n.status == NodeStatus.DEGRADED]
        offline  = [n for n in self.nodes.values() if n.status == NodeStatus.OFFLINE]
        specs    = defaultdict(int)
        for n in self.nodes.values():
            specs[n.specialisation] += 1
        return {
            "total":    len(self.nodes),
            "online":   len(online),
            "busy":     len(busy),
            "degraded": len(degraded),
            "offline":  len(offline),
            "vmoa_agents_total": len(self.nodes) * 9,
            "model_slots_total": len(self.nodes) * 30,
            "specialisations":  dict(specs),
            "nodes":    [n.to_dict() for n in self.nodes.values()],
        }


# ─── FastAPI Service ─────────────────────────────────────────

try:
    from fastapi import FastAPI, HTTPException, Header, Request
    from fastapi.responses import JSONResponse
    import uvicorn
    from pydantic import BaseModel
    from typing import Optional as Opt
    import uuid

    app = FastAPI(
        title="iVenture Studio – VIC Engine Mesh Coordinator",
        version="1.0.0",
        description="Distributed task routing across N VIC Engine nodes",
    )
    mesh = VICMeshCoordinator()

    @app.on_event("startup")
    async def startup():
        await mesh.start()

    @app.on_event("shutdown")
    async def shutdown():
        await mesh.stop()

    # ── Task execution endpoint ───────────────────────────────
    class TaskRequest(BaseModel):
        skill:        str
        payload:      dict
        requester_slug: str
        ensemble:     bool = False
        ensemble_n:   int  = 3
        language:     str  = "en"
        require_spec: Opt[str] = None
        priority:     int  = 1

    @app.post("/v1/tasks")
    async def execute_task(req: TaskRequest):
        task = MeshTask(
            task_id        = str(uuid.uuid4()),
            skill          = req.skill,
            payload        = req.payload,
            requester_slug = req.requester_slug,
            ensemble       = req.ensemble,
            ensemble_n     = req.ensemble_n,
            language       = req.language,
            require_spec   = req.require_spec,
            priority       = req.priority,
        )
        try:
            result = await mesh.dispatch(task)
            return {
                "task_id":     result.task_id,
                "node_id":     result.node_id,
                "company":     result.company_slug,
                "grpo_score":  result.grpo_score,
                "latency_ms":  result.latency_ms,
                "result":      result.result,
            }
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))

    # ── Node management ───────────────────────────────────────
    class NodeRegisterRequest(BaseModel):
        company_slug:   str
        vic_endpoint:   str
        claw_endpoint:  str
        specialisation: str = "general"
        region:         str = "is"
        languages:      list = ["en"]

    @app.post("/mesh/nodes")
    async def register_node(
        req: NodeRegisterRequest,
        x_admin_key: str = Header(..., alias="X-Admin-Key"),
    ):
        if x_admin_key != INTERNAL_API_KEY:
            raise HTTPException(403, "Invalid admin key")
        node = await mesh.register_node(
            req.company_slug, req.vic_endpoint, req.claw_endpoint,
            req.specialisation, req.region, req.languages,
        )
        return node.to_dict()

    @app.get("/mesh/status")
    async def mesh_status():
        return mesh.get_mesh_status()

    @app.get("/mesh/leaderboard")
    async def leaderboard():
        return mesh.get_leaderboard()

    @app.get("/health")
    async def health():
        status = mesh.get_mesh_status()
        code   = 200 if status["online"] > 0 else 503
        return JSONResponse(
            {"status": "ok" if code == 200 else "no_nodes", **status},
            status_code=code
        )

    if __name__ == "__main__":
        logging.basicConfig(level=logging.INFO)
        uvicorn.run(app, host="0.0.0.0", port=8091, log_level="info")

except ImportError:
    logger.warning("FastAPI not installed – mesh running in library mode")
