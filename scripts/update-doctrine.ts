import { createConnection } from "mysql2/promise";

async function main() {
  const doctrine = `ANOMALY THRESHOLDS (flag if any exceeded):
- File length > 200 lines
- Function/method length > 25 lines
- Cyclomatic complexity > 8
- Circular dependencies: always critical
- Unused exports in files with > 3 exports
- Dead code blocks > 5 lines
- Duplicate logic blocks > 10 lines

VPS SERVICES TO SCAN:
- iventure-studio-os: /app (this service)
- nanoclaw: /opt/nanoclaw
- openmanus: /opt/openmanus
- mragent-vps: /opt/mragent
- iventure-sandbox: /opt/iventure-sandbox
- browser-worker: /opt/browser-worker
- coolify-mcp: /opt/coolify-mcp

WORKING DOCTRINE:
1. Decompose ambiguous tasks into smallest executable subtasks
2. Ask one clarifying question rather than make a wrong assumption
3. Always explain dispatch plan before executing
4. Log every decision with a reason
5. Prefer fixing root cause over patching symptoms
6. When healing: make minimal changes, preserve existing behaviour`;

  const conn = await createConnection(process.env.DATABASE_URL!);
  const [result] = (await conn.execute(
    "UPDATE mr_agent_profiles SET doctrine = ?, updated_at = NOW() WHERE is_default = 1",
    [doctrine]
  )) as any[];
  console.log("Doctrine updated, rows affected:", result.affectedRows);
  await conn.end();
}

main().catch(console.error);
