from harness_core import iVentureHarness
import asyncio

class DeepResearchHarness(iVentureHarness):
    """
    Harness for Deep Research — US/EU Focus.
    Uses Genspark Bridge for web-scale intelligence.
    """
    def __init__(self):
        super().__init__(agent_id="researcher", model="genspark-research-v1")

    def validate_causal_chain(self, task: str) -> bool:
        # Check: Must be US/EU focused.
        disallowed = ["China", "Shenzhen", "Beijing", "CNY"]
        if any(word in task for word in disallowed):
            print(f"Harness Validation Failed: Task contains out-of-scope regions {disallowed}")
            return False
        return True

async def test_harness():
    harness = DeepResearchHarness()
    task = "Research the latest US Federal AI safety guidelines for 2026."
    print(f"Executing Task: {task}")
    result = await harness.execute(task)
    print("--- HARNESS RESULT ---")
    import json
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test_harness())
