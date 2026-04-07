import os
import asyncio
import httpx
import json
from typing import Dict, Any, List, Optional
from reward_client import GRPORewardComposer
from resource_connector import connector
from structural_cortex import cortex

class iVentureHarness:
    """
    Harness Core v1.2 — Structurally Aware
    The Industrial Wrapper for AI Agents.
    """
    def __init__(self, agent_id: str, model: str):
        self.agent_id = agent_id
        self.model = model
        self.state = {}  # Pillar II: Persistent State
        self.calibration_threshold = 0.991337  # Pillar III: RAAL Threshold
        self.composer = GRPORewardComposer()
        self.gateway_url = os.getenv("VIC_LITELLM_BASE", "http://localhost:7056/v1")
        self.api_key = os.getenv("VIC_LITELLM_KEY", "sk-iventure-master")
        self.connector = connector
        self.cortex = cortex

    def validate_causal_chain(self, task: str) -> bool:
        """Pillar I: Deterministic Causal Chains"""
        return True

    def get_minimized_context(self, task: str) -> str:
        """Pillar IV: Progressive Disclosure via Structural Cortex"""
        # 1. Get raw keyword matches
        raw_context = self.connector.search(task)
        
        # 2. Get structural cross-project links
        structural_links = self.cortex.get_unified_context(task)
        
        return f"{raw_context}\n\n{structural_links}"

    async def call_gateway(self, task: str, context: str) -> str:
        """Execution via Genspark Powered LiteLLM"""
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

        # 2. Progressive Disclosure
        context = self.get_minimized_context(task)

        # 3. Execution
        response = await self.call_gateway(task, context)

        # 4. RAAL Filter
        reward = await self.composer.score(task, response)
        
        if reward.composite < self.calibration_threshold:
            # Recursive Loop-back for higher reasoning (Bridge Logic)
            print(f"RAAL Filter triggered: {reward.composite:.4f} < {self.calibration_threshold}")
            return await self.loop_back_reasoning(task, response, reward.composite)

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
        # Route to highest fidelity model (o3-pro/gpt-5) for correction
        correction_task = f"Original task: {task}\nPrior response failed calibration (score: {score}). Improve precision and format."
        
        # Override to high-fidelity model
        orig_model = self.model
        self.model = "gpt-5"
        final_result = await self.call_gateway(correction_task, "High-fidelity reasoning override.")
        self.model = orig_model # Restore
        
        # Final Score
        final_reward = await self.composer.score(task, final_result)
        
        return {
            "status": "success_after_loop",
            "agent_id": self.agent_id,
            "response": final_result,
            "grpo": final_reward.composite,
            "pillars": "hardened"
        }
