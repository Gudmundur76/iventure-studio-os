import asyncio
import json
import time
from typing import List, Dict, Any
from harness_factory import get_harness
import cortex_contributor

class HarnessSwarm:
    """
    Harness Swarm Orchestrator v1.0 [SWARM ARCHITECT]
    Coordinates multiple Industrial Harnesses to execute complex US/EU business logic.
    """
    def __init__(self, node_id: str = "ivs_default_node"):
        self.node_id = node_id
        self.active_tasks = {}

    async def execute_swarm_mission(self, mission_goal: str, sequence: List[str]) -> Dict[str, Any]:
        """
        Executes a sequence of harnesses (The Factory Line).
        
        Args:
            mission_goal: The high-level objective.
            sequence: List of Agent IDs to trigger in order.
        """
        print(f"🚀 SWARM MISSION STARTED: {mission_goal}")
        swarm_artifacts = {}
        start_time = time.time()
        
        current_context = f"MISSION GOAL: {mission_goal}\n"

        for agent_id in sequence:
            print(f"─── 🐝 Swarm Node: {agent_id} triggering...")
            
            # 1. Spawn the specialized harness
            harness = get_harness(agent_id)
            
            # 2. Inject previous artifacts into the next harness (The Synapse)
            task_with_context = current_context + f"\nPREVIOUS ARTIFACTS: {json.dumps(swarm_artifacts)}\n"
            
            # 3. Execute with RAAL protection
            result = await harness.execute(task_with_context)
            
            if result.get("status") == "error":
                print(f"❌ SWARM FAILURE at node {agent_id}: {result.get('error')}")
                return result

            # 4. Store Artifact
            swarm_artifacts[agent_id] = {
                "response": result.get("response"),
                "grpo": result.get("grpo")
            }
            
            # 5. Push to Cortex Pulse
            await cortex_contributor.contribute_to_cortex(
                node_id=self.node_id,
                domain_hint=agent_id,
                skills_used=["swarm-synapse-v1"],
                grpo_score=result.get("grpo", 0.0),
                agent_type=agent_id
            )

            # Update rolling context for the next agent
            current_context += f"\nOUTPUT FROM {agent_id}: {result.get('response')[:500]}...\n"

        latency = int((time.time() - start_time) * 1000)
        print(f"🏁 SWARM MISSION COMPLETE in {latency}ms")

        return {
            "status": "swarm_success",
            "mission": mission_goal,
            "artifacts": swarm_artifacts,
            "total_latency": latency
        }

# ── Singleton Instance ──────────────────────────────────────
swarm_engine = HarnessSwarm()
