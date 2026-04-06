# iVenture Studio — Ghost.build Integration Plan
**"The First Database Designed for Agents"**

Integrating Ghost turns our static PostgreSQL bedrock into a dynamic, agent-orchestrated infrastructure. This enables Pillar 3 "Living Infrastructure" where VMOA agents can spin up, manage, and tear down their own persistence layers.

---

## [1] Architecture Update: Dynamic Bedrock
We move from a single `iventure_studio` DB to a **Ghost-managed swarm of databases**.

- **Primary Node DB:** Still used for core OS configs and VMOA metadata.
- **Agent Task DBs:** Created via Ghost MCP for specific, long-running agent tasks (e.g., "Deep Research Batch 001").
- **Cortex Buffer DBs:** Temporary, high-speed storage for k-anonymity checks before final signal ingestion.

---

## [2] Docker Compose Update (Overlay)
Add the Ghost MCP bridge to the iVenture network.

```yaml
# docker-compose.ghost.yml
services:
  ghost-mcp:
    image: ghostbuild/mcp-server:latest
    container_name: iventure-ghost-mcp
    environment:
      - GHOST_API_KEY=${GHOST_API_KEY}
    networks:
      - iventure-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ghost.rule=Host(`ghost.localhost`)"
```

---

## [3] VMOA Integration (Phase 3.9)
Update the VMOA agent logic to allow autonomous database creation.

**New Skill: `database_provisioning`**
1. **Agent identifies** a complex, data-heavy task.
2. **Agent calls** `ghost.database_create(name="task-uuid")`.
3. **Ghost returns** a connection string: `postgresql://ghost:pw@task-uuid.ghost.build/postgres`.
4. **Agent uses** this ephemeral DB for the task lifetime.
5. **Agent archives/deletes** the DB via `ghost.database_delete()` once finished.

---

## [4] Testing the Connection (Mock Script)
This script demonstrates how `vmoa_lite.py` will interact with Ghost.

```python
# ghost_mcp_client_stub.py
import httpx
import os

GHOST_API_KEY = os.getenv("GHOST_API_KEY", "mock_key")

async def provision_task_database(task_name: str):
    print(f"[GHOST] Provisioning database for task: {task_name}")
    # In production, this calls the Ghost MCP server via the VMOA Bridge
    # Here we mock the expected success response from ghost.build
    
    mock_db_id = f"db_{task_name[:8]}"
    mock_conn_str = f"postgresql://ghost:password@{mock_db_id}.ghost.build/postgres"
    
    print(f"[GHOST] ✓ Created database '{task_name}' (ID: {mock_db_id})")
    print(f"[GHOST] Connection string provided to agent.")
    return mock_conn_str

if __name__ == "__main__":
    import asyncio
    asyncio.run(provision_task_database("shenzhen-subsidy-audit-v1"))
```

---
[SWARM CONSENSUS] This integration removes the final bottleneck for **Phase 12 (A2A Swarm Bridge)**: the ability for two agents from different companies to "collaborate on data" without sharing a single centralized database. They simply create a shared Ghost instance.
