from harness_core import iVentureHarness
import asyncio
import json

class FinancialHarness(iVentureHarness):
    """
    Harness for Financial Analysis — US/EU Edition.
    Specializes in tax compliance, cashflow modeling, and revenue optimization.
    Uses DeepSeek-R1 (via Genspark Bridge) for complex reasoning.
    """
    def __init__(self):
        super().__init__(agent_id="financial-v1", model="deepseek-r1")

    def validate_causal_chain(self, task: str) -> bool:
        """Pillar I: Ensure financial tasks are within US/EU jurisdictions."""
        disallowed = ["China", "CNY", "RMB", "VAT-CN"]
        if any(word in task for word in disallowed):
            print(f"Financial Harness Error: Task contains out-of-scope currency/jurisdiction.")
            return False
        return True

    def get_minimized_context(self, task: str) -> str:
        """Pillar IV: Load US/EU Tax Thresholds & GAAP standards."""
        # In production, this would query the TimescaleDB knowledge base.
        return "Standard: US GAAP / IFRS (EU). Focus: Federal Tax Compliance 2026."

    async def execute(self, task: str):
        # Specific Financial Pre-processing
        if "$" not in task and "€" not in task and "EUR" not in task and "USD" not in task:
            task += " (Please provide all results in USD or EUR as per iVenture US/EU standard)."
        
        return await super().execute(task)

async def test_financial_harness():
    harness = FinancialHarness()
    task = "Estimate the quarterly tax liability for an Icelandic OPC with $50,000 in US-sourced SaaS revenue."
    print(f"Executing Financial Task: {task}")
    result = await harness.execute(task)
    print("--- FINANCIAL HARNESS RESULT ---")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test_financial_harness())
