import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllAgents, getAllSkills, getMemoryEntries,
  getCortexSignals, getCortexStats, getAllProjects,
  createProject, updateProjectStatus, getChatHistory,
  saveChatMessage,
} from "./db";
import { seedDatabase } from "./seed";
import { createEnquiry, listEnquiries } from "./db";
import { listUpdates, getUpdateBySlug, createUpdate, updatePost, deleteUpdate } from "./db";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { createWorkerTask, updateWorkerTask, listWorkerTasks, getWorkerTask, getProjectById, updateProject, getProjectTasks } from "./db";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { listScheduledJobs, listJobRunLogs, upsertScheduledJob } from "./db";
import {
  listAgentEmails, saveAgentEmail, markEmailRead, saveEmailReply,
  createBrowserTask, updateBrowserTask, listBrowserTasks, getBrowserTask,
  listAgentSchedules, createAgentSchedule, updateAgentSchedule, deleteAgentSchedule,
} from "./db";
import {
  listClients, getClientByRef, getClientByToken,
  createClient, updateClient, deleteClient,
  listClientTasks, createClientTask, updateClientTask,
} from "./db";
import {
  listTenants, getTenantByRef, createTenant, updateTenant, deleteTenant,
  listClientsByTenant,
} from "./db";
import { routeTask, logRoutingDecision } from "./routingEngine";
import { routingLogs } from "../drizzle/schema";
import { desc } from "drizzle-orm";
import { getDb } from "./db";
import { sandboxNodes } from "../drizzle/schema";
import { agents as agentsTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ── Tenants Router ─────────────────────────────────────────────────────────
const tenantsRouter = router({
  list: protectedProcedure.query(() => listTenants()),

  get: protectedProcedure
    .input(z.object({ tenantRef: z.string() }))
    .query(({ input }) => getTenantByRef(input.tenantRef)),

  clients: protectedProcedure
    .input(z.object({ tenantRef: z.string() }))
    .query(({ input }) => listClientsByTenant(input.tenantRef)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      plan: z.string().optional(),
      defaultAgentId: z.string().optional(),
      workerQuota: z.number().int().min(1).max(100).optional(),
    }))
    .mutation(({ input }) => createTenant({
      name: input.name,
      plan: input.plan ?? "starter",
      defaultAgentId: input.defaultAgentId ?? "nanoclaw",
      workerQuota: input.workerQuota ?? 10,
      status: "trial",
    })),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().min(1).max(128).optional(),
      plan: z.string().optional(),
      status: z.enum(["active", "suspended", "trial"]).optional(),
      defaultAgentId: z.string().optional(),
      workerQuota: z.number().int().min(1).max(100).optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...rest } = input;
      return updateTenant(id, rest);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => deleteTenant(input.id)),

  assignClient: protectedProcedure
    .input(z.object({ clientId: z.number().int(), tenantRef: z.string() }))
    .mutation(({ input }) => updateClient(input.clientId, { tenantRef: input.tenantRef })),
});

// Owner/admin guard — only the site owner (admin role) can manage updates
// ── Clients Router ─────────────────────────────────────────────────────────
const clientsRouter = router({
  list: protectedProcedure.query(async () => listClients()),

  get: protectedProcedure
    .input(z.object({ clientRef: z.string() }))
    .query(async ({ input }) => getClientByRef(input.clientRef)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      company: z.string().optional(),
      phone: z.string().optional(),
      assignedAgentId: z.string().optional(),
      gmailLabel: z.string().optional(),
      emailAddress: z.string().optional(),
      subdomain: z.string().optional(),
      plan: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => createClient({
      name: input.name,
      email: input.email,
      company: input.company,
      phone: input.phone,
      assignedAgentId: input.assignedAgentId ?? "nanoclaw",
      gmailLabel: input.gmailLabel,
      emailAddress: input.emailAddress,
      subdomain: input.subdomain,
      plan: input.plan ?? "starter",
      notes: input.notes,
      status: "onboarding",
    })),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      assignedAgentId: z.string().optional(),
      gmailLabel: z.string().optional(),
      emailAddress: z.string().optional(),
      subdomain: z.string().optional(),
      status: z.enum(["active", "onboarding", "paused", "churned"]).optional(),
      plan: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data);
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await deleteClient(input.id); return { ok: true }; }),

  tasks: protectedProcedure
    .input(z.object({ clientRef: z.string().optional() }))
    .query(async ({ input }) => listClientTasks(input.clientRef)),

  updateTask: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["submitted", "in_progress", "done", "cancelled"]).optional(),
      agentReply: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClientTask(id, {
        ...data,
        ...(data.status === "done" ? { completedAt: new Date() } : {}),
      });
      return { ok: true };
    }),
});

// ── Client Portal Router (public — token-gated) ────────────────────────────
const clientPortalRouter = router({
  verify: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const client = await getClientByToken(input.token);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      return { clientRef: client.clientRef, name: client.name, company: client.company, status: client.status, plan: client.plan };
    }),

  submitTask: publicProcedure
    .input(z.object({
      token: z.string(),
      title: z.string().min(1).max(256),
      description: z.string().min(1),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const client = await getClientByToken(input.token);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      if (client.status === "churned" || client.status === "paused")
        throw new TRPCError({ code: "FORBIDDEN", message: "Account is not active" });
      const task = await createClientTask({
        clientRef: client.clientRef,
        title: input.title,
        description: input.description,
        priority: input.priority ?? "normal",
        status: "submitted",
      });
      return { taskId: task.id, status: task.status };
    }),

  tasks: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const client = await getClientByToken(input.token);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Portal not found" });
      const tasks = await listClientTasks(client.clientRef);
      return tasks.map(t => ({
        id: t.id, title: t.title, description: t.description,
        priority: t.priority, status: t.status, agentReply: t.agentReply,
        submittedAt: t.submittedAt, completedAt: t.completedAt,
      }));
    }),
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Aðeins stjórnendur hafa aðgang" });
  }
  return next({ ctx });
});

// ── Email Identity router ─────────────────────────────────────────────────
const emailRouter = router({
  // List emails for an agent (from DB cache)
  list: protectedProcedure
    .input(z.object({ agentId: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return listAgentEmails(input.agentId, input.limit ?? 50);
    }),

  // Sync Gmail inbox for an agent — searches Gmail and saves to DB
  sync: protectedProcedure
    .input(z.object({ agentId: z.string(), gmailLabel: z.string().optional(), query: z.string().optional() }))
    .mutation(async ({ input }) => {
      // Call Gmail MCP via server-side manus-mcp-cli
      const { execSync } = await import("child_process");
      // Look up agent's configured Gmail label and email address from DB
      const db = await getDb();
      const agentRow = db ? (await db.select().from(agentsTable).where(eq(agentsTable.agentId, input.agentId)).limit(1))[0] : null;
      const resolvedLabel = input.gmailLabel ?? agentRow?.gmailLabel ?? null;
      const resolvedEmail = agentRow?.emailAddress ?? null;
      const searchQuery = input.query ?? (resolvedLabel ? `label:${resolvedLabel}` : "in:inbox");
      const mcpInput = JSON.stringify({ query: searchQuery, max_results: 20 });
      let messages: Array<{ id: string; threadId: string; snippet?: string; subject?: string; from?: string; date?: string }> = [];
      try {
        const raw = execSync(
          `manus-mcp-cli tool call gmail_search_messages --server gmail --input '${mcpInput.replace(/'/g, "'\\''")}' 2>/dev/null`,
          { timeout: 30000, encoding: "utf8" }
        );
        const parsed = JSON.parse(raw);
        messages = parsed?.content?.[0]?.text ? JSON.parse(parsed.content[0].text)?.messages ?? [] : [];
      } catch {
        messages = [];
      }
      let saved = 0;
      for (const msg of messages) {
        try {
          await saveAgentEmail({
            agentId: input.agentId,
            emailAddress: resolvedEmail ?? `${input.agentId}@agent.local`,
            gmailLabel: resolvedLabel,
            direction: "inbound",
            subject: msg.subject ?? "(no subject)",
            snippet: msg.snippet ?? null,
            fromAddress: msg.from ?? null,
            toAddress: null,
            threadId: msg.threadId ?? null,
            messageId: msg.id,
            isRead: false,
            isReplied: false,
            sentAt: msg.date ? new Date(msg.date) : null,
          });
          saved++;
        } catch { /* duplicate — skip */ }
      }
      return { synced: messages.length, saved };
    }),

  // Mark email as read
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markEmailRead(input.id);
      return { ok: true };
    }),

  // Send a reply via Gmail MCP and save to DB
  reply: protectedProcedure
    .input(z.object({ id: z.number(), to: z.string(), subject: z.string(), body: z.string() }))
    .mutation(async ({ input }) => {
      const { execSync } = await import("child_process");
      const mcpInput = JSON.stringify({
        messages: [{ to: input.to, subject: input.subject, body: input.body }],
      });
      try {
        execSync(
          `manus-mcp-cli tool call gmail_send_messages --server gmail --input '${mcpInput.replace(/'/g, "'\\''")}' 2>/dev/null`,
          { timeout: 30000, encoding: "utf8" }
        );
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(err) });
      }
      await saveEmailReply(input.id, input.body);
      return { ok: true };
    }),
});

// ── Browser Automation router ─────────────────────────────────────────────
const browserRouter = router({
  // List browser tasks
  list: protectedProcedure
    .input(z.object({ agentId: z.string().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return listBrowserTasks(input.agentId, input.limit ?? 20);
    }),

  // Get a single browser task
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getBrowserTask(input.id);
    }),

  // Dispatch a browser task to the browser-use worker on VPS
  dispatch: protectedProcedure
    .input(z.object({
      agentId: z.string().optional(),
      prompt: z.string(),
      startUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const task = await createBrowserTask({
        agentId: input.agentId ?? "nanoclaw",
        prompt: input.prompt,
        startUrl: input.startUrl ?? null,
        status: "queued",
        result: null,
        screenshotUrl: null,
        steps: null,
        elapsedMs: null,
        errorMessage: null,
        completedAt: null,
      });
      // Try to dispatch to browser-use worker on VPS
      const workerUrl = process.env.BROWSER_WORKER_URL ?? "http://187.124.213.194:8767";
      try {
        const res = await fetch(`${workerUrl}/task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: task.id, prompt: input.prompt, start_url: input.startUrl }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          await updateBrowserTask(task.id, { status: "running" });
          return { ...task, status: "running" as const };
        }
      } catch {
        // Worker not available — keep as queued for manual processing
      }
      return task;
    }),

  // Poll task status (called by UI polling loop)
  sync: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const task = await getBrowserTask(input.id);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.status === "done" || task.status === "error") return task;
      // Poll VPS worker for result
      const workerUrl = process.env.BROWSER_WORKER_URL ?? "http://187.124.213.194:8767";
      try {
        const res = await fetch(`${workerUrl}/task/${input.id}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json() as { status?: string; result?: string; screenshot_url?: string; steps?: unknown[]; elapsed_ms?: number; error?: string };
          if (data.status && data.status !== task.status) {
            const update: Partial<typeof task> = { status: data.status as typeof task.status };
            if (data.result) update.result = data.result;
            if (data.screenshot_url) update.screenshotUrl = data.screenshot_url;
            if (data.steps) update.steps = data.steps as typeof task.steps;
            if (data.elapsed_ms) update.elapsedMs = data.elapsed_ms;
            if (data.error) update.errorMessage = data.error;
            if (data.status === "done" || data.status === "error") update.completedAt = new Date();
            await updateBrowserTask(input.id, update);
            return { ...task, ...update };
          }
        }
      } catch { /* worker offline */ }
      return task;
    }),
});

// ── Agent Schedules router ────────────────────────────────────────────────
const schedulesRouter = router({
  // List schedules (optionally filtered by agent)
  list: protectedProcedure
    .input(z.object({ agentId: z.string().optional() }))
    .query(async ({ input }) => {
      return listAgentSchedules(input.agentId);
    }),

  // Create a new schedule
  create: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      cronExpression: z.string(),
      taskPrompt: z.string(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const schedule = await createAgentSchedule({
        agentId: input.agentId,
        name: input.name,
        description: input.description ?? null,
        cronExpression: input.cronExpression,
        taskPrompt: input.taskPrompt,
        isEnabled: input.isEnabled ?? true,
        heartbeatTaskUid: null,
        lastRunAt: null,
        lastRunStatus: null,
        lastRunMessage: null,
        runCount: 0,
        nextRunAt: null,
      });
      return schedule;
    }),

  // Toggle enable/disable
  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isEnabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await updateAgentSchedule(input.id, { isEnabled: input.isEnabled });
      return { ok: true };
    }),

  // Update schedule
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      cronExpression: z.string().optional(),
      taskPrompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateAgentSchedule(id, data);
      return { ok: true };
    }),

  // Delete a schedule
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAgentSchedule(input.id);
      return { ok: true };
    }),

  // Run a schedule now (dispatches the prompt to the worker)
  runNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const schedules = await listAgentSchedules();
      const schedule = schedules.find(s => s.id === input.id);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      // Dispatch as a worker task
      const task = await createBrowserTask({
        agentId: schedule.agentId,
        prompt: schedule.taskPrompt,
        startUrl: null,
        status: "queued",
        result: null,
        screenshotUrl: null,
        steps: null,
        elapsedMs: null,
        errorMessage: null,
        completedAt: null,
      });
      await updateAgentSchedule(input.id, {
        lastRunAt: new Date(),
        lastRunStatus: "running",
        lastRunMessage: `Dispatched as browser task #${task.id}`,
        runCount: (schedule.runCount ?? 0) + 1,
      });
      return { ok: true, taskId: task.id };
    }),
});

// ── Coolify MCP proxy router ────────────────────────────────────────────────
// Exposes Coolify infrastructure management via tRPC so the UI can call it
// without exposing the Coolify API token to the browser.
const coolifyRouter = router({
  // Proxy a call to the Coolify MCP server tool
  callTool: protectedProcedure
    .input(z.object({
      tool: z.string(),
      args: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const mcpBase = ENV.coolifyMcpUrl;
      const sseRes = await fetch(`${mcpBase}/sse`, {
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(10000),
      });
      let sessionId = "";
      const reader = sseRes.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const match = chunk.match(/session_id=([a-f0-9]+)/);
        if (match) { sessionId = match[1]; break; }
      }
      reader.cancel();
      if (!sessionId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not connect to Coolify MCP" });
      await fetch(`${mcpBase}/messages/?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "iventure-os", version: "1.0" } } }),
        signal: AbortSignal.timeout(10000),
      });
      const toolRes = await fetch(`${mcpBase}/messages/?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: input.tool, arguments: input.args ?? {} } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!toolRes.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `MCP tool call failed: ${toolRes.status}` });
      const data = await toolRes.json();
      return data;
    }),

  health: protectedProcedure.query(async () => {
    try {
      const mcpBase = ENV.coolifyMcpUrl;
      const sseRes = await fetch(`${mcpBase}/sse`, {
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(8000),
      });
      const reader = sseRes.body!.getReader();
      const decoder = new TextDecoder();
      let sessionId = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const match = chunk.match(/session_id=([a-f0-9]+)/);
        if (match) { sessionId = match[1]; break; }
      }
      reader.cancel();
      if (!sessionId) return { ok: false, tools: 0, error: "No session" };
      await fetch(`${mcpBase}/messages/?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "iventure-os", version: "1.0" } } }),
        signal: AbortSignal.timeout(8000),
      });
      const listRes = await fetch(`${mcpBase}/messages/?session_id=${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
        signal: AbortSignal.timeout(8000),
      });
      const listData = await listRes.json() as { result?: { tools?: unknown[] } };
      const toolCount = listData?.result?.tools?.length ?? 0;
      return { ok: true, tools: toolCount, url: mcpBase };
    } catch (e: unknown) {
      return { ok: false, tools: 0, error: String(e) };
    }
  }),
});

export const appRouter = router({
  system: systemRouter,
  sandbox: router({
    // List all registered nodes
    nodes: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(sandboxNodes).orderBy(sandboxNodes.createdAt);
    }),

    // Register a new node
    registerNode: protectedProcedure
      .input(z.object({
        nodeId: z.string().min(1),
        label: z.string().min(1),
        url: z.string().url(),
        region: z.string().min(1),
        secret: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verify the node is reachable
          const agentSecret = input.secret || "iventure-sandbox-secret-2026";
        try {
          const resp = await fetch(`${input.url}/health`, {
            headers: { "x-agent-secret": agentSecret },
            signal: AbortSignal.timeout(8000),
          });
          if (!resp.ok) throw new Error(`Health check returned ${resp.status}`);
          const health = await resp.json();
          const healthJson = JSON.stringify(health);
          const nowSec = Math.floor(Date.now() / 1000);
          await db.execute(sql`
            INSERT INTO sandbox_nodes (nodeId, label, url, region, secret, status, lastHealthAt, healthData, isActive, createdAt)
            VALUES (${input.nodeId}, ${input.label}, ${input.url}, ${input.region}, ${input.secret ?? null}, 'online', ${nowSec}, ${healthJson}, 1, NOW())
            ON DUPLICATE KEY UPDATE
              label = ${input.label},
              url = ${input.url},
              region = ${input.region},
              secret = ${input.secret ?? null},
              status = 'online',
              lastHealthAt = ${nowSec},
              healthData = ${healthJson},
              isActive = 1
          `);
          return { success: true, health };
        } catch (e: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot reach node: ${e.message}` });
        }
      }),

    // Remove a node
    removeNode: protectedProcedure
      .input(z.object({ nodeId: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(sandboxNodes).where(eq(sandboxNodes.nodeId, input.nodeId));
        return { success: true };
      }),

    // Poll health of all nodes
    pollHealth: protectedProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) return { updated: 0 };
      const nodes = await db.select().from(sandboxNodes).where(eq(sandboxNodes.isActive, true));
      let updated = 0;
      for (const node of nodes) {
        const secret = node.secret || "iventure-sandbox-secret-2026";
        try {
          const resp = await fetch(`${node.url}/health`, {
            headers: { "x-agent-secret": secret },
            signal: AbortSignal.timeout(5000),
          });
          const health = await resp.json();
          await db.update(sandboxNodes)
            .set({ status: "online", lastHealthAt: Math.floor(Date.now() / 1000), healthData: health })
            .where(eq(sandboxNodes.nodeId, node.nodeId));
          updated++;
        } catch {
          await db.update(sandboxNodes)
            .set({ status: "offline" })
            .where(eq(sandboxNodes.nodeId, node.nodeId));
        }
      }
      return { updated };
    }),

    // Coordinator health (if coordinator is configured)
    coordinatorHealth: protectedProcedure.query(async () => {
      const coordinatorUrl = (ENV.openManusUrl || "http://187.124.213.194:8088").replace(":8088", ":8901");
      try {
        const resp = await fetch(`${coordinatorUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        return await resp.json();
      } catch {
        return { status: "unreachable" };
      }
    }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Agents
  agents: router({
    list: publicProcedure.query(async () => {
      return getAllAgents();
    }),
  }),

  // Skills
  skills: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getAllSkills(input?.category);
      }),
  }),

  // Memory
  memory: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getMemoryEntries(input?.limit ?? 20);
      }),
  }),

  // Cortex
  cortex: router({
    signals: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return getCortexSignals(input?.limit ?? 50);
      }),
    stats: publicProcedure.query(async () => {
      return getCortexStats();
    }),
  }),

  // Projects
  projects: router({
    list: publicProcedure.query(async () => {
      return getAllProjects();
    }),
    create: publicProcedure
      .input(z.object({
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        serviceType: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        budget: z.string().optional(),
        assignedAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const projectRef = `IVS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
        await createProject({ ...input, projectRef, status: "intake", priority: input.priority ?? "medium" });
        return { success: true, projectRef };
      }),
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["intake", "scoping", "active", "review", "delivered", "archived"]),
      }))
      .mutation(async ({ input }) => {
        await updateProjectStatus(input.id, input.status);
        return { success: true };
      }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getProjectById(input.id);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["intake", "scoping", "active", "review", "delivered", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedAgent: z.string().optional(),
        budget: z.string().optional(),
        deadline: z.string().optional(),
        deliverables: z.array(z.object({
          id: z.string(),
          title: z.string(),
          done: z.boolean(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, deadline, ...rest } = input;
        await updateProject(id, {
          ...rest,
          ...(deadline ? { deadline: new Date(deadline) } : {}),
        });
        return { success: true };
      }),
    tasks: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getProjectTasks(input.projectId);
      }),
  }),

  // Chat
  chat: router({
    history: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return getChatHistory(input.sessionId);
      }),
    models: publicProcedure.query(async () => {
      try {
        const { data } = await listLLMModels();
        return data ?? [];
      } catch {
        return [];
      }
    }),
    send: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string().min(1),
        model: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        await saveChatMessage({ sessionId: input.sessionId, role: "user", content: input.message, model: input.model });
        const messages = [
          { role: "system" as const, content: "Þú ert Gummi Gúrú — íslenskt gervigreindarstofa. Þú hjálpar viðskiptavinum að lýsa verkefnum sínum og útskýrir hvernig við getum afhent fullklárað verk. Þú ert vingjarnlegur, faglegur og hnitmiðaður. Svaraðu alltaf á íslensku nema viðskiptavinurinn skrifi á ensku. Notaðu markdown snið þar sem við á." },
          ...(input.history ?? []).map(h => ({ role: h.role as "user" | "assistant" | "system", content: h.content })),
          { role: "user" as const, content: input.message },
        ];
        const response = await invokeLLM({ messages, model: input.model });
        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : (Array.isArray(rawContent) ? rawContent.map((c: {type: string; text?: string}) => c.type === 'text' ? c.text : '').join('') : "No response generated.");
        await saveChatMessage({ sessionId: input.sessionId, role: "assistant", content, model: input.model });
        return { content, model: input.model };
      }),
  }),

  // Seed
  seed: router({
    run: publicProcedure.mutation(async () => {
      return seedDatabase();
    }),
  }),

  // Updates (Nýjustu fréttir)
  updates: router({
    list: publicProcedure
      .input(z.object({ all: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return listUpdates(!(input?.all));
      }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await getUpdateBySlug(input.slug);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Grein fannst ekki" });
        return post;
      }),
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
        excerpt: z.string().optional(),
        content: z.string().min(1),
        category: z.string().default("fréttir"),
        published: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        await createUpdate({
          ...input,
          excerpt: input.excerpt ?? null,
          publishedAt: input.published ? new Date() : null,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        excerpt: z.string().optional(),
        content: z.string().min(1).optional(),
        category: z.string().optional(),
        published: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const patch: Record<string, unknown> = { ...data };
        if (data.published) patch.publishedAt = new Date();
        await updatePost(id, patch as Parameters<typeof updatePost>[1]);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteUpdate(input.id);
        return { success: true };
      }),
  }),

  // Enquiries
  enquiries: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        service: z.string().optional(),
        message: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await createEnquiry({
          name: input.name,
          email: input.email,
          service: input.service ?? null,
          message: input.message,
        });
        // Notify owner of new enquiry
        await notifyOwner({
          title: `Ný fyrirspurn frá ${input.name}`,
          content: `**Nafn:** ${input.name}\n**Netfang:** ${input.email}\n**Þjónusta:** ${input.service ?? "Ekki tilgreint"}\n\n**Skilaboð:**\n${input.message}`,
        });
        return { success: true };
      }),
    list: protectedProcedure.query(async () => {
      return listEnquiries();
    }),
  }),

  // ── Manus Task API — create real agent tasks from voice/text briefs ──────────
  manusTask: router({
    create: publicProcedure
      .input(z.object({
        brief: z.string().min(1, "Verkefnislýsing er nauðsynleg"),
        clientName: z.string().optional(),
        serviceType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const apiKey = ENV.manusApiKey;
        if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Manus API lykill vantar" });

        const systemContext = `Þú ert Gummi Gúrú — íslenskt gervigreindarstofa. Viðskiptavinur: ${input.clientName ?? "Nafnlaus"}. Þjónusta: ${input.serviceType ?? "Almenn"}. Kláraðu verkefnið og skilaðu fullunnum niðurstöðum.`;
        const message = `${systemContext}\n\nVerkefni: ${input.brief}`;

        const res = await fetch("https://api.manus.ai/v2/task.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-manus-api-key": apiKey,
          },
          body: JSON.stringify({
            message: { content: message },
            agent_profile: "standard",
          }),
        });

        const data = await res.json() as { ok: boolean; task_id?: string; error?: { message: string } };
        if (!data.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: data.error?.message ?? "Villa við að búa til verkefni" });

        // Notify owner of new task created via voice brief
        await notifyOwner({
          title: `Nýtt Gummi verkefni frá ${input.clientName ?? "Nafnlaus"}`,
          content: `**Þjónusta:** ${input.serviceType ?? "Almenn"}\n**Verkefni:** ${input.brief}\n**Task ID:** ${data.task_id}`,
        });

        return { success: true, taskId: data.task_id };
      }),

    getMessages: publicProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        const apiKey = ENV.manusApiKey;
        if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Manus API lykill vantar" });

        const res = await fetch(`https://api.manus.ai/v2/task.listMessages?task_id=${encodeURIComponent(input.taskId)}`, {
          headers: { "x-manus-api-key": apiKey },
        });

        const data = await res.json() as { ok: boolean; data?: Array<{ role: string; content: string; created_at: string }>; error?: { message: string } };
        if (!data.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: data.error?.message ?? "Villa við að sækja skilaboð" });

        return { messages: data.data ?? [] };
      }),

    getStatus: publicProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        const apiKey = ENV.manusApiKey;
        if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Manus API lykill vantar" });

        const res = await fetch(`https://api.manus.ai/v2/task.get?task_id=${encodeURIComponent(input.taskId)}`, {
          headers: { "x-manus-api-key": apiKey },
        });

        const data = await res.json() as { ok: boolean; status?: string; error?: { message: string } };
        if (!data.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: data.error?.message ?? "Villa við að sækja stöðu" });

        return { status: data.status ?? "unknown" };
      }),
  }),

  // Worker (NanoClaw integration)
  worker: router({
    tasks: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return listWorkerTasks(input?.limit ?? 50);
      }),

    task: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getWorkerTask(input.id);
      }),

    // Dispatch a task to OpenManus (async — returns immediately with task record)
    dispatch: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(4000),
        agentType: z.enum(["manus", "browser", "swe", "data_analysis"]).default("manus"),
      }))
      .mutation(async ({ input }) => {
        const openManusUrl = ENV.openManusUrl;
        if (!openManusUrl) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "OpenManus service not configured (OPENMANUS_URL missing)" });
        }
        // Create a DB record immediately so the UI can track it
        const task = await createWorkerTask({
          workerId: `openmanus-${input.agentType}`,
          prompt: input.prompt,
          language: "en",
          status: "queued",
        });
        // Submit to OpenManus asynchronously (don't await — return immediately)
        void (async () => {
          const startMs = Date.now();
          try {
            await updateWorkerTask(task.id, { status: "thinking" });
            const omRes = await fetch(`${openManusUrl}/tasks`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: input.prompt, agent: input.agentType }),
              signal: AbortSignal.timeout(10000),
            });
            if (!omRes.ok) {
              const errText = await omRes.text();
              await updateWorkerTask(task.id, {
                status: "error",
                reply: `OpenManus HTTP ${omRes.status}: ${errText}`,
                elapsedMs: Date.now() - startMs,
                completedAt: new Date(),
              });
              return;
            }
            const omTask = await omRes.json() as { task_id: string };
            // Store the OpenManus task_id in projectRef for polling
            await updateWorkerTask(task.id, { projectRef: omTask.task_id });
          } catch (err: unknown) {
            await updateWorkerTask(task.id, {
              status: "error",
              reply: err instanceof Error ? err.message : String(err),
              elapsedMs: Date.now() - startMs,
              completedAt: new Date(),
            });
          }
        })();
        return task;
      }),

    // Poll OpenManus for task completion and sync result to DB
    syncTask: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const task = await getWorkerTask(input.id);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        if (task.status === "done" || task.status === "error") return task;
        if (!task.projectRef) return task; // no OpenManus task_id yet

        const openManusUrl = ENV.openManusUrl;
        if (!openManusUrl) return task;

        try {
          const res = await fetch(`${openManusUrl}/tasks/${task.projectRef}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return task;
          const omTask = await res.json() as {
            status: string; reply?: string; error?: string;
            elapsed_ms?: number; completed_at?: string;
          };
          if (omTask.status === "done" || omTask.status === "error") {
            return await updateWorkerTask(task.id, {
              status: omTask.status as "done" | "error",
              reply: omTask.reply ?? omTask.error ?? "(no reply)",
              elapsedMs: omTask.elapsed_ms ?? undefined,
              completedAt: omTask.completed_at ? new Date(omTask.completed_at) : new Date(),
            });
          }
          // Still running — update status to "thinking" if it was "queued"
          if (task.status === "queued" && omTask.status === "running") {
            return await updateWorkerTask(task.id, { status: "thinking" });
          }
        } catch {
          // ignore poll errors
        }
        return task;
      }),
  }),

  // Schedule
  schedule: router({
    jobs: protectedProcedure.query(async () => {
      return listScheduledJobs();
    }),
    logs: protectedProcedure
      .input(z.object({ jobName: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return listJobRunLogs(input?.jobName, input?.limit ?? 50);
      }),
    seed: protectedProcedure.mutation(async () => {
      await upsertScheduledJob({
        jobName: "memory-sync",
        cronExpression: "0 * * * *",
        description: "Sync NanoClaw conversation threads into the memory graph (runs every hour)",
        isEnabled: true,
      });
      await upsertScheduledJob({
        jobName: "cortex-digest",
        cronExpression: "0 6 * * *",
        description: "Generate daily cortex digest from recent agent activity (runs at 06:00 UTC)",
        isEnabled: true,
      });
      return { success: true };
    }),
  }),

  // Routing engine
  routing: router({
    recommend: publicProcedure
      .input(z.object({ prompt: z.string() }))
      .query(async ({ input }) => {
        const result = await routeTask(input.prompt);
        return result;
      }),
    dispatch: publicProcedure
      .input(z.object({
        prompt: z.string(),
        overrideAgentId: z.string().optional(),
        projectId: z.number().optional(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const routing = await routeTask(input.prompt);
        const finalAgentId = input.overrideAgentId ?? routing.selectedAgentId;
        const overridden = !!input.overrideAgentId && input.overrideAgentId !== routing.selectedAgentId;
        // Create the worker task
        const task = await createWorkerTask({
          workerId: finalAgentId,
          prompt: input.prompt,
          projectId: input.projectId,
          language: input.language ?? "en",
        });
        // Log the routing decision
        await logRoutingDecision(input.prompt, routing, task.id, overridden);
        return { task, routing, overridden };
      }),
    logs: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(routingLogs)
          .orderBy(desc(routingLogs.createdAt))
          .limit(input?.limit ?? 20);
      }),
  }),
  coolify: coolifyRouter,
  email: emailRouter,
  browser: browserRouter,
  schedules: schedulesRouter,
  clients: clientsRouter,
  tenants: tenantsRouter,
  portal: clientPortalRouter,
});

export type AppRouter = typeof appRouter;
