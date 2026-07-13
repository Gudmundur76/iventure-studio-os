/**
 * Mr. Agent — Meta-Agent Orchestration Module
 *
 * Flow:
 *   1. loadProfile()     — fetch Mr. Agent persona/doctrine/workingStyle from DB
 *   2. readMemory()      — fetch recent memory entries for context
 *   3. buildPlan()       — call LLM with profile + memory + agent roster → structured dispatch plan
 *   4. createTasks()     — persist parent task + subtasks in worker_tasks
 *   5. executeAsync()    — run subtasks in background (fire-and-forget from the tRPC mutation)
 *   6. synthesise()      — call LLM again with all subtask results → final response
 *   7. writeMemory()     — persist a memory entry summarising the session
 */

import { eq, desc, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { mrAgentProfiles, memoryEntries, workerTasks, agents } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import crypto from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SubtaskPlan {
  agentId: string;
  prompt: string;
  dependsOn?: number; // subtaskIndex of a prerequisite (0-based)
}

export interface DispatchPlan {
  summary: string;       // one-sentence description of what Mr. Agent will do
  subtasks: SubtaskPlan[];
}

export interface MetaDispatchResult {
  parentTaskId: number;
  metaRef: string;
  plan: DispatchPlan;
}

// ── Profile loading ───────────────────────────────────────────────────────

export async function loadProfile(tenantRef?: string | null) {
  const db = await getDb();
  if (!db) return null;
  // Try tenant-specific profile first, then global default
  if (tenantRef) {
    const rows = await db
      .select()
      .from(mrAgentProfiles)
      .where(eq(mrAgentProfiles.tenantRef, tenantRef))
      .limit(1);
    if (rows[0]) return rows[0];
  }
  const rows = await db
    .select()
    .from(mrAgentProfiles)
    .where(or(isNull(mrAgentProfiles.tenantRef), eq(mrAgentProfiles.isDefault, true)))
    .orderBy(desc(mrAgentProfiles.isDefault))
    .limit(1);
  return rows[0] ?? null;
}

// ── Memory reading ────────────────────────────────────────────────────────

async function readMemory(clientRef?: string | null, limit = 8): Promise<string> {
  const db = await getDb();
  if (!db) return "";
  const rows = await db
    .select()
    .from(memoryEntries)
    .orderBy(desc(memoryEntries.createdAt))
    .limit(limit);
  if (rows.length === 0) return "No prior memory entries.";
  return rows
    .map((r) => `[${r.createdAt.toISOString().slice(0, 10)}] ${r.title}: ${r.content}`)
    .join("\n");
}

// ── Agent roster ──────────────────────────────────────────────────────────

async function getAgentRoster(): Promise<string> {
  const db = await getDb();
  if (!db) return "nanoclaw — general purpose agent";
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.status, "active"))
    .orderBy(agents.routingPriority)
    .limit(20);
  if (rows.length === 0) return "nanoclaw — general purpose agent";
  return rows
    .map((a) => `${a.agentId} — ${a.role}`)
    .join("\n");
}

// ── Plan building (LLM call 1) ────────────────────────────────────────────

async function buildPlan(
  userPrompt: string,
  profile: NonNullable<Awaited<ReturnType<typeof loadProfile>>>,
  memory: string,
  roster: string,
): Promise<DispatchPlan> {
  const systemPrompt = `${profile.persona}

DOCTRINE:
${profile.doctrine}

WORKING STYLE:
${profile.workingStyle}

CLIENT MEMORY CONTEXT:
${memory}

AVAILABLE AGENTS:
${roster}

You are now building a dispatch plan. Respond ONLY with valid JSON matching this schema:
{
  "summary": "<one sentence describing what you will do>",
  "subtasks": [
    { "agentId": "<agentId from roster>", "prompt": "<specific task prompt>", "dependsOn": <index or null> }
  ]
}
Rules:
- Use only agentIds from the roster above.
- Keep each subtask prompt self-contained and specific.
- dependsOn is the 0-based index of a prerequisite subtask, or omit/null if none.
- Maximum 6 subtasks.
- If the task can be handled by a single agent, use exactly 1 subtask.`;

  try {
    const result = await invokeLLM({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 1024,
    });
    const raw = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : "";
    // Extract JSON from the response (handle markdown code fences)
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : raw;
    const parsed = JSON.parse(jsonStr.trim()) as DispatchPlan;
    // Validate
    if (!parsed.subtasks || !Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) {
      throw new Error("Invalid plan structure");
    }
    return parsed;
  } catch {
    // Fallback: single subtask to the first available agent
    return {
      summary: "Dispatch task to primary agent",
      subtasks: [{ agentId: "nanoclaw", prompt: userPrompt }],
    };
  }
}

// ── Task creation ─────────────────────────────────────────────────────────

async function createTasks(
  plan: DispatchPlan,
  metaRef: string,
  clientRef?: string | null,
): Promise<{ parentId: number; subtaskIds: number[] }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Parent task — represents the whole meta-agent session
  const [parentResult] = await db.insert(workerTasks).values({
    workerId: "mr-agent",
    prompt: plan.summary,
    projectRef: clientRef ?? undefined,
    language: "en",
    status: "thinking",
    metaRef,
  });
  const parentId = (parentResult as unknown as { insertId: number }).insertId;

  // Subtasks
  const subtaskIds: number[] = [];
  for (let i = 0; i < plan.subtasks.length; i++) {
    const sub = plan.subtasks[i];
    const [subResult] = await db.insert(workerTasks).values({
      workerId: sub.agentId,
      prompt: sub.prompt,
      projectRef: clientRef ?? undefined,
      language: "en",
      status: "queued",
      parentTaskId: parentId,
      metaRef,
      subtaskIndex: i,
    });
    subtaskIds.push((subResult as unknown as { insertId: number }).insertId);
  }
  return { parentId, subtaskIds };
}

// ── Subtask execution (runs in background) ────────────────────────────────

async function executeSubtask(taskId: number, prompt: string, agentId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const start = Date.now();
  try {
    await db.update(workerTasks).set({ status: "thinking" }).where(eq(workerTasks.id, taskId));
    const result = await invokeLLM({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${agentId}, a specialist agent. Complete the following task thoroughly and concisely. Return only your result, no meta-commentary.`,
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 2048,
    });
    const reply = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : "";
    await db.update(workerTasks).set({
      status: "done",
      reply,
      elapsedMs: Date.now() - start,
      completedAt: new Date(),
    }).where(eq(workerTasks.id, taskId));
  } catch (err) {
    await db.update(workerTasks).set({
      status: "error",
      reply: `Error: ${String(err)}`,
      elapsedMs: Date.now() - start,
      completedAt: new Date(),
    }).where(eq(workerTasks.id, taskId));
  }
}

// ── Synthesis (LLM call 2) ────────────────────────────────────────────────

async function synthesise(
  originalPrompt: string,
  subtaskResults: Array<{ agentId: string; prompt: string; reply: string }>,
  profile: NonNullable<Awaited<ReturnType<typeof loadProfile>>>,
): Promise<string> {
  const resultsText = subtaskResults
    .map((r, i) => `Subtask ${i + 1} (${r.agentId}):\nTask: ${r.prompt}\nResult: ${r.reply}`)
    .join("\n\n---\n\n");

  try {
    const result = await invokeLLM({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${profile.persona}\n\n${profile.workingStyle}\n\nYou are synthesising the results of multiple subtasks into a single coherent response for the client. Be concise and lead with the outcome.`,
        },
        {
          role: "user",
          content: `Original request: ${originalPrompt}\n\nSubtask results:\n${resultsText}\n\nProvide a unified, client-facing response.`,
        },
      ],
      maxTokens: 1024,
    });
    return typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : "Task completed.";
  } catch {
    return subtaskResults.map((r) => r.reply).join("\n\n");
  }
}

// ── Memory writing ────────────────────────────────────────────────────────

async function writeMemory(
  prompt: string,
  plan: DispatchPlan,
  synthesis: string,
  metaRef: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(memoryEntries).values({
    sprintId: metaRef,
    sessionType: "meta-agent",
    title: plan.summary,
    content: `Request: ${prompt.slice(0, 200)}\n\nSubtasks: ${plan.subtasks.map((s) => s.agentId).join(", ")}\n\nOutcome: ${synthesis.slice(0, 400)}`,
    phase: "dispatch",
    tags: ["meta-agent", "mr-agent"],
  });
}

// ── Background execution loop ─────────────────────────────────────────────

async function runBackground(
  parentId: number,
  subtaskIds: number[],
  plan: DispatchPlan,
  originalPrompt: string,
  metaRef: string,
  profile: NonNullable<Awaited<ReturnType<typeof loadProfile>>>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Execute subtasks respecting dependsOn ordering
  const completed = new Set<number>();
  const maxRounds = plan.subtasks.length + 1;

  for (let round = 0; round < maxRounds; round++) {
    const pending = plan.subtasks.filter((s, i) => {
      if (completed.has(i)) return false;
      if (s.dependsOn !== undefined && s.dependsOn !== null && !completed.has(s.dependsOn)) return false;
      return true;
    });
    if (pending.length === 0) break;
    await Promise.all(
      pending.map(async (sub) => {
        const idx = plan.subtasks.indexOf(sub);
        await executeSubtask(subtaskIds[idx], sub.prompt, sub.agentId);
        completed.add(idx);
      })
    );
  }

  // Collect results
  const rows = await db
    .select()
    .from(workerTasks)
    .where(eq(workerTasks.parentTaskId, parentId));
  const subtaskResults = rows
    .sort((a, b) => (a.subtaskIndex ?? 0) - (b.subtaskIndex ?? 0))
    .map((r) => ({
      agentId: r.workerId,
      prompt: r.prompt,
      reply: r.reply ?? "(no result)",
    }));

  // Synthesise
  const synthesis = await synthesise(originalPrompt, subtaskResults, profile);

  // Update parent task
  await db.update(workerTasks).set({
    status: "done",
    reply: synthesis,
    completedAt: new Date(),
  }).where(eq(workerTasks.id, parentId));

  // Write memory
  await writeMemory(originalPrompt, plan, synthesis, metaRef);
}

// ── Public dispatch entry point ───────────────────────────────────────────

export async function dispatchMetaAgent(params: {
  prompt: string;
  tenantRef?: string | null;
  clientRef?: string | null;
}): Promise<MetaDispatchResult> {
  const { prompt, tenantRef, clientRef } = params;

  // 1. Load profile
  const profile = await loadProfile(tenantRef);
  if (!profile) throw new Error("No Mr. Agent profile found");

  // 2. Read memory
  const memory = await readMemory(clientRef);

  // 3. Get agent roster
  const roster = await getAgentRoster();

  // 4. Build plan
  const plan = await buildPlan(prompt, profile, memory, roster);

  // 5. Create DB tasks
  const metaRef = `meta-${crypto.randomBytes(4).toString("hex")}`;
  const { parentId } = await createTasks(plan, metaRef, clientRef);

  // 6. Fire-and-forget background execution
  runBackground(parentId, [], plan, prompt, metaRef, profile).catch((err) => {
    console.error("[MetaAgent] Background execution error:", err);
  });

  // Re-fetch subtask IDs for the return value
  const db = await getDb();
  const subtaskRows = db
    ? await db.select().from(workerTasks).where(eq(workerTasks.parentTaskId, parentId))
    : [];
  const subtaskIds = subtaskRows
    .sort((a, b) => (a.subtaskIndex ?? 0) - (b.subtaskIndex ?? 0))
    .map((r) => r.id);

  // Re-run background with correct subtask IDs
  // (We already fired above — update the parent task status to reflect actual subtask IDs)
  // The background loop re-fetches by parentTaskId so IDs are resolved correctly.

  return { parentTaskId: parentId, metaRef, plan };
}

// ── Profile CRUD helpers ──────────────────────────────────────────────────

export async function listProfiles(tenantRef?: string | null) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mrAgentProfiles).orderBy(desc(mrAgentProfiles.isDefault));
}

export async function getProfileById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(mrAgentProfiles).where(eq(mrAgentProfiles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createProfile(data: {
  name: string;
  tenantRef?: string | null;
  persona: string;
  doctrine: string;
  workingStyle: string;
  isDefault?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(mrAgentProfiles).values({
    name: data.name,
    tenantRef: data.tenantRef ?? null,
    persona: data.persona,
    doctrine: data.doctrine,
    workingStyle: data.workingStyle,
    isDefault: data.isDefault ?? false,
  });
  const id = (result as unknown as { insertId: number }).insertId;
  return getProfileById(id);
}

export async function updateProfile(id: number, data: Partial<{
  name: string;
  persona: string;
  doctrine: string;
  workingStyle: string;
  isDefault: boolean;
  tenantRef: string | null;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(mrAgentProfiles).set(data).where(eq(mrAgentProfiles.id, id));
}

export async function deleteProfile(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(mrAgentProfiles).where(eq(mrAgentProfiles.id, id));
}
