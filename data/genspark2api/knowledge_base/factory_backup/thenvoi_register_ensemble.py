import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv("/home/skywork/workspace/iventure-studio/.env")

USER_API_KEY = os.getenv("THENVOI_USER_API_KEY") # Should be provided by user
API_BASE = "https://app.thenvoi.com/api/v1"

AGENTS_TO_REGISTER = [
    {"name": "VMOA Strategist", "description": "Phase 27 CEO Agent - Market entry and GTM strategy."},
    {"name": "VMOA Financial", "description": "CFO Agent - Financial modeling, tax, and Stripe integration."},
    {"name": "VMOA Marketing", "description": "CMO Agent - Content creation and US distribution."},
    {"name": "VMOA Legal", "description": "CLO Agent - Compliance, NIST RMF, and contract review."},
    {"name": "VMOA Technical", "description": "CTO Agent - Infrastructure bedrock and LiteLLM management."},
    {"name": "VMOA Operations", "description": "COO Agent - Workspace integrations and agentic workflows."},
    {"name": "VMOA Research", "description": "Deep Research Agent powered by Skywork V2."},
    {"name": "VMOA Communication", "description": "Inbox intelligence and partner outreach."},
    {"name": "VMOA Vision", "description": "Multimodal analysis and design auditor."},
]

async def register_agent(client, agent_info):
    payload = {
        "name": agent_info["name"],
        "description": agent_info["description"],
        "type": "external"
    }
    try:
        resp = await client.post(f"{API_BASE}/agents", json=payload)
        if resp.status_code == 201:
            data = resp.json()
            print(f"✅ Registered: {agent_info['name']}")
            print(f"   ID: {data['id']}")
            print(f"   Key: {data['api_key']} (SAVE THIS!)")
            return data
        else:
            print(f"❌ Failed {agent_info['name']}: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"💥 Error registering {agent_info['name']}: {e}")

async def main():
    if not USER_API_KEY:
        print("❌ ERROR: THENVOI_USER_API_KEY not found in .env")
        return

    async with httpx.AsyncClient(headers={"Authorization": f"Bearer {USER_API_KEY}"}) as client:
        tasks = [register_agent(client, a) for a in AGENTS_TO_REGISTER]
        results = await asyncio.gather(*tasks)
        
        # Save results to a config file
        with open("thenvoi_agents_registered.json", "w") as f:
            import json
            json.dump([r for r in results if r], f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
