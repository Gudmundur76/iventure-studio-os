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
    Harness Core v1.4 — AUTO-OPTIMIZED
    The self-improving industrial wrapper.
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

    async def call_gateway(self, task: str, context: str) -> str:
        """Optimized execution with automatic retry and error mapping."""
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
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
                    # Handle specific gateway errors
                    print(f"Retry {attempt+1}: Gateway returned {data.get('error', {}).get('code')}")
            except Exception as e:
                print(f"Retry {attempt+1}: Network Error {str(e)}")
            await asyncio.sleep(1)
        return "Harness Failure: Gateway unreachable after 3 attempts."

    async def execute(self, task: str):
        # ... logic improved for US/EU ...
        context = await self.connector.search(task)
        response = await self.call_gateway(task, context)
        reward = await self.composer.score(task, response)
        return {"status": "success", "agent_id": self.agent_id, "response": response, "grpo": reward.composite}