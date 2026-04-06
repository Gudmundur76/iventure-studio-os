# iVenture Studio — Harness Core Specification
Version: 1.0 | Date: 2026-04-06

The "Harness" is the standardized Python wrapper that transforms a raw LLM/SLM into an industrial-grade tool.

## 🧱 Class Structure (`harness_core.py`)

```python
class iVentureHarness:
    def __init__(self, agent_id: str, model: str):
        self.agent_id = agent_id
        self.model = model
        self.state = {} # Pillar II: Persistent State
        self.calibration = 0.991337 # Pillar III: RAAL Threshold

    async def execute(self, task: str):
        # 1. Deterministic Chain Check (Pillar I)
        if not self.validate_causal_chain(task):
            return "ADVERSARIAL HALT: Causal Chain Violation"

        # 2. Progressive Disclosure (Pillar IV)
        context = self.get_minimized_context(task)

        # 3. Execution (Genspark Engine)
        response = await self.call_gateway(task, context)

        # 4. RAAL Filter (Pillar III)
        score = await self.score_response(task, response)
        if score < self.calibration:
            return await self.loop_back_reasoning(task, response)

        return response
```

## 🍓 Integration: The Strawberry Kernel
We will use the Strawberry architecture (RoPE + QK Norm) to build **Mini-Harnesses**. These are hyper-specialized, offline-capable models trained on single-domain datasets (e.g., Icelandic Tax Code, Shenzhen Subsidy Rules).

### Strategic Value:
- **Zero Latency:** SLMs running locally on the node.
- **Data Privacy:** Sensitive data never leaves the "Harness" for external inference.
- **Recursive Improvement:** Harnesses generate data → Strawberry trains on it → Harnesses get smarter.

---
*Verified by Claw-VIC v4.2.*
