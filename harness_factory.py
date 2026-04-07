import yaml
from harness_core import iVentureHarness
from deep_research_harness import DeepResearchHarness
from financial_harness import FinancialHarness
from specialized_harnesses import (
    TechnicalHarness, 
    OperationsHarness, 
    ComplianceHarness, 
    ExpertHarness, 
    MultimodalHarness
)

def get_harness(agent_id: str) -> iVentureHarness:
    """Factory to spawn the correct Harness type based on Agent ID."""
    
    # Load manifest to get the model assigned to this agent
    with open("AGENTS.yaml", "r") as f:
        manifest = yaml.safe_load(f)
    
    agent_data = next((a for a in manifest["agents"] if a["id"] == agent_id), None)
    if not agent_data:
        raise ValueError(f"Agent {agent_id} not found in manifest.")
    
    model = agent_data["model"]

    # Mapping logic
    if agent_id == "researcher":
        return DeepResearchHarness()
    elif agent_id == "financial-v1":
        return FinancialHarness()
    elif agent_id in ["mda-v1", "bda-v1", "fda-v1", "doa-v1", "qaa-v1", "sea-v1"]:
        return TechnicalHarness(agent_id, model)
    elif agent_id == "pma-v1":
        return OperationsHarness(agent_id, model)
    elif agent_id == "subsidy-advisor":
        return ComplianceHarness(agent_id, model)
    elif agent_id == "kady-researcher":
        return ExpertHarness(agent_id, model)
    elif agent_id == "vision-researcher":
        return MultimodalHarness(agent_id, model)
    elif agent_id == "web-agent-v1":
        return BrowserHarness(agent_id, model)
    else:
        # Fallback to base harness
        return iVentureHarness(agent_id, model)
