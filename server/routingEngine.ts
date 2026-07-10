import { getDb } from "./db.js";
import { agents, routingLogs } from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

// Skill keyword maps — task prompt keywords → agent capability tags
const SKILL_KEYWORDS: Record<string, string[]> = {
  finance: ["finance", "accounting", "vat", "invoice", "budget", "tax", "revenue", "cost"],
  research: ["research", "analysis", "report", "market", "data", "statistics", "study"],
  legal: ["legal", "contract", "gdpr", "compliance", "law", "regulation", "terms"],
  marketing: ["marketing", "seo", "content", "social", "campaign", "brand", "copy"],
  technical: ["code", "api", "database", "deploy", "build", "server", "debug", "script"],
  strategy: ["strategy", "plan", "roadmap", "vision", "goal", "objective", "growth"],
  writing: ["write", "draft", "document", "article", "blog", "email", "proposal"],
  data: ["data", "analytics", "chart", "visualize", "dashboard", "metrics", "kpi"],
};

function detectTaskCategories(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const matched: string[] = [];
  for (const [category, keywords] of Object.entries(SKILL_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matched.push(category);
    }
  }
  return matched.length > 0 ? matched : ["general"];
}

function scoreAgent(
  agent: { agentId: string; name: string; grpoScore: number; routingPriority: number; capabilities: string[] | null; status: string },
  taskCategories: string[]
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Base: GRPO score (0–1 → 0–40 points)
  const grpoPoints = agent.grpoScore * 40;
  score += grpoPoints;
  reasons.push(`GRPO ${agent.grpoScore.toFixed(3)} (+${grpoPoints.toFixed(1)}pts)`);

  // Routing priority (1–5 → 0–20 points)
  const priorityPoints = (agent.routingPriority / 5) * 20;
  score += priorityPoints;
  reasons.push(`priority ${agent.routingPriority} (+${priorityPoints.toFixed(1)}pts)`);

  // Capability match (each matched category = 10 points, max 30)
  const caps = agent.capabilities ?? [];
  const matched = taskCategories.filter(cat =>
    caps.some(cap => cap.toLowerCase().includes(cat) || cat.includes(cap.toLowerCase()))
  );
  const capPoints = Math.min(matched.length * 10, 30);
  score += capPoints;
  if (matched.length > 0) {
    reasons.push(`skills match [${matched.join(", ")}] (+${capPoints}pts)`);
  }

  // Status penalty
  if (agent.status === "error") { score -= 30; reasons.push("error state (-30pts)"); }
  if (agent.status === "offline") { score -= 50; reasons.push("offline (-50pts)"); }

  return { score: Math.max(0, score), reason: reasons.join(", ") };
}

export interface RoutingResult {
  selectedAgentId: string;
  selectedAgentName: string;
  score: number;
  reason: string;
  taskCategories: string[];
  candidates: Array<{ agentId: string; name: string; score: number; reason: string }>;
}

export async function routeTask(prompt: string): Promise<RoutingResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const allAgents = await db.select().from(agents)
    .where(and(eq(agents.status, "active")));

  // Fall back to all non-offline agents if no active ones
  const pool = allAgents.length > 0
    ? allAgents
    : await db.select().from(agents);

  const taskCategories = detectTaskCategories(prompt);

  const scored = pool.map(agent => {
    const { score, reason } = scoreAgent({
      agentId: agent.agentId,
      name: agent.name,
      grpoScore: agent.grpoScore,
      routingPriority: agent.routingPriority,
      capabilities: agent.capabilities as string[] | null,
      status: agent.status,
    }, taskCategories);
    return { agentId: agent.agentId, name: agent.name, score, reason };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) throw new Error("No agents available for routing");

  return {
    selectedAgentId: best.agentId,
    selectedAgentName: best.name,
    score: best.score,
    reason: best.reason,
    taskCategories,
    candidates: scored.slice(0, 5),
  };
}

export async function logRoutingDecision(
  prompt: string,
  result: RoutingResult,
  taskId?: number,
  overridden = false
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(routingLogs).values({
    taskId: taskId ?? null,
    prompt: prompt.slice(0, 500),
    selectedAgentId: result.selectedAgentId,
    selectedAgentName: result.selectedAgentName,
    score: result.score,
    reason: result.reason,
    candidates: result.candidates,
    overridden,
  });
}
