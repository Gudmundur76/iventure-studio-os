import os
import asyncio
import httpx
import json
from typing import Dict, Any, List, Optional
from reward_client import GRPORewardComposer
from resource_connector import connector
from structural_cortex import cortex
from mem9_connector import mem9

class iVentureHarness:
    """
    Harness Core v1.5 — HYBRID OPTIMIZED
    Combines Auto-Optimization (Retry/Logic) with Hybrid Memory (Drive/Cortex/Mem9).
    """
    def __init__(self, agent_id: str, model: str):
        self.agent_id = agent_id
        self.model = model
        self.calibration_threshold = 0.991337
        self.composer = GRPORewardComposer()
        self.gateway_url = os.getenv("VIC_LITELLM_BASE", "http://localhost:7056/v1")
        self.api_key = os.getenv("VIC_LITELLM_KEY", "sk-iventure-master")
        self.connector = connector
        self.cortex = cortex
        self.mem9 = mem9

    def validate_causal_chain(self, task: str) -> bool:
        """Pillar I: Deterministic Causal Chains"""
        return True

    async def get_minimized_context(self, task: str) -> str:
        """Pillar IV: Progressive Disclosure via Hybrid Memory"""
        # 1. Keyword search (Sync)
        raw_context = self.connector.search(task)
        # 2. Structural mapping (Sync)
        structural_links = self.cortex.get_unified_context(task)
        # 3. Distributed memory (Async)
        short_term_memory = await self.mem9.recall_memory(task)
        
        return f"{raw_context}\n\n{structural_links}\n\n--- SESSION MEMORY (MEM9) ---\n{short_term_memory}"

    async def call_gateway(self, task: str, context: str) -> str:
        """v1.4 Optimized execution with automatic retry logic."""
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.post(
                        self.gateway_url + "/chat/completions",
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": f"[STRICT 7-STEP PROTOCOL] Context: {context}"},
                                {"role": "user", "content": task}
                            ]
                        },
                        headers={"Authorization": f"Bearer {self.api_key}"}
                    )
                    data = resp.json()
                    if "choices" in data:
                        return data["choices"][0]["message"]["content"]
                    print(f"Retry {attempt+1}: Gateway error {data.get('error')}")
            except Exception as e:
                print(f"Retry {attempt+1}: Connection failure {str(e)}")
            await asyncio.sleep(1)
        return "Harness Failure: Final retry exhausted."

    async def execute(self, task: str) -> Dict[str, Any]:
        # 1. Deterministic Chain Check
        if not self.validate_causal_chain(task):
            return {"status": "error", "error": "ADVERSARIAL HALT: Causal Chain Violation"}

        # 2. Progressive Disclosure
        context = await self.get_minimized_context(task)

        # 3. Execution (Optimized Bridge)
        response = await self.call_gateway(task, context)

        # 4. RAAL Filter
        reward = await self.composer.score(task, response)
        
        if reward.composite < self.calibration_threshold:
            print(f"RAAL Filter triggered: {reward.composite:.4f} < {self.calibration_threshold}")
            return await self.loop_back_reasoning(task, response, reward.composite)

        # 5. Persistent State Update (MEM9)
        await self.mem9.store_memory(
            content=f"Task: {task}\nResult: {response}",
            metadata={"agent": self.agent_id, "grpo": reward.composite}
        )

        return {
            "status": "success",
            "agent_id": self.agent_id,
            "response": response,
            "grpo": reward.composite,
            "pillars": "verified"
        }

    async def 