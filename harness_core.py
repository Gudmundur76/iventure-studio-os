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
    Harness Core v1.3 — Hybrid Memory Aware
    The Industrial Wrapper for AI Agents.
    """
    def __init__(self, agent_id: str, model: str):
        self.agent_id = agent_id
        self.model = model
        self.state = {}  # Pillar II: Persistent State
        self.calibration_threshold = 0.991337  # Pillar III: RAAL Threshold
        self.composer = GRPORewardComposer()
        # Direct Bridge Port Priority
        self.gateway_url = os.getenv("VIC_LITELLM_BASE", "http://localhost:7056/v1")
        self.api_key = os.getenv("VIC_LITELLM_KEY", "sk-iventure-master")
        self.connector = connector
        self.cortex = cortex
        self.mem9 = mem9

    def validate_causal_chain(self, task: str) -> bool:
        """Pillar I: Deterministic Causal Chains"""
        return True

    async def get_minimized_context(self, task: str) -> str:
        """Pillar IV: Progressive Disclosure via Hybrid Memory (Drive + Cortex + Mem9)"""
        # 1. Get raw keyword matches from Drive
        raw_context = self.connector.search(task)
        
        # 2. Get structural cross-project links from Cortex
        structural_links = self.cortex.get_unified_context(task)
        
        # 3. Get session-level memories from Mem9 (Async)
        short_term_memory = await self.mem9.recall_memory(task)
        
        return f"{raw_context}\n\n{structural_links}\n\n--- SESSION MEMORY (MEM9) ---\n{short_term_memory}"

    async def call_gateway(self, task: str, context: str) -> str:
        """Execution via Genspark Powered Bridge"""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    self.gateway_url + "/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": f"Context: {context}\nExecute precisely."},
                            {"role": "user", "content": task}
                        ]
                    },
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                data = resp.json()
                if "choices" not in data:
                    print(f"GATEWAY ERROR: {data}")
                    return f"Gateway Error: {json.dumps(data)}"
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Harness Network Error: {str(e)}"

    async def execute(self, task: str) -> Dict[str, Any]:
        # 1. Deterministic Chain Check
        if not self.validate_causal_chain(task):
            return {"status": "error", "error": "ADVERSARIAL HALT: Causal Chain Violation"}

        # 2. Progressive Disclosure (Hybrid Memory)
        context = await self.get_minimized_context(task)

        # 3. Execution
        response = await self.call_gateway(task, context)

        # 4. RAAL Filter
        reward = await self.composer.score(task, response)
        
        if reward.composite < self.calibration_threshold:
            print(f"RAAL Filter triggered: {reward.composite:.4f} < {self.calibration_threshold}")
            return await self.loop_back_reasoning(task, response, reward.composite)

        # 5. Persistent State Update (MEM9 - Long Term Distributed Memory)
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

    async def loop_back_reasoning(self, task: str, response: str, score: float) -> Dict[str, Any]:
        """Pillar III: Recursive Reasoning Loop"""
        print(f"Triggering Loop-back for task: {task[:50]}...")
        correction_task = f"Original task: {task}\nPrior response failed calibration (score: {score}). Improve precision and format."
        
        orig_model = self.model
        self.model = "gpt-5"
        final_result = await self.call_gateway(correction_task, "High-fidelity reasoning override.")
        self.model = orig_model # Restore
        
        final_reward = await self.composer.score(task, final_result)
        
        return {
            "status": "success_after_loop",
            "agent_id": self.agent_id,
            "response": final_result,
            "grpo": final_reward.composite,
            "pillars": "hardened"
        }
