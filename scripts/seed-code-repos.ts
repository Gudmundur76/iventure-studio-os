import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { codeRepos } from "../drizzle/schema";
import { sql } from "drizzle-orm";

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const repos = [
  { id: 1, name: "iventure-studio-os", description: "iVenture Studio OS Dashboard — the meta-OS control plane", path: "/root/iventure-studio-os", host: "187.124.213.194", isRemote: true, language: "typescript", isActive: true },
  { id: 2, name: "nanoclaw", description: "Nanoclaw AI agent — core autonomous agent runtime", path: "/root/nanoclaw", host: "187.124.213.194", isRemote: true, language: "python", isActive: true },
  { id: 3, name: "openmanus", description: "OpenManus API — open-source Manus agent server", path: "/root/openmanus", host: "187.124.213.194", isRemote: true, language: "python", isActive: true },
  { id: 4, name: "mragent-vps", description: "Mr. Agent VPS — persistent meta-agent runtime on the VPS", path: "/root/mragent-vps", host: "187.124.213.194", isRemote: true, language: "typescript", isActive: true },
  { id: 5, name: "iventure-sandbox", description: "iVenture Sandbox — agent/coordinator sandbox environment", path: "/root/iventure-sandbox", host: "187.124.213.194", isRemote: true, language: "python", isActive: true },
  { id: 6, name: "browser-worker", description: "Browser Worker — headless browser automation service", path: "/root/browser-worker", host: "187.124.213.194", isRemote: true, language: "python", isActive: true },
  { id: 7, name: "coolify-mcp", description: "Coolify MCP — Coolify Model Context Protocol server", path: "/root/coolify-mcp", host: "187.124.213.194", isRemote: true, language: "typescript", isActive: true },
];

for (const repo of repos) {
  await db.insert(codeRepos).values(repo).onDuplicateKeyUpdate({
    set: {
      description: sql`VALUES(description)`,
      path: sql`VALUES(path)`,
      host: sql`VALUES(host)`,
      isRemote: sql`VALUES(is_remote)`,
      language: sql`VALUES(language)`,
      updatedAt: new Date(),
    },
  });
  console.log("Seeded:", repo.name);
}

await conn.end();
console.log("All repos seeded.");
