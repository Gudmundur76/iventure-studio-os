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
import { routeTask, logRoutingDecision } from "./routingEngine";
import { routingLogs } from "../drizzle/schema";
import { desc } from "drizzle-orm";
import { getDb } from "./db";
import { sandboxNodes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Owner/admin guard — only the site owner (admin role) can manage updates
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Aðeins stjórnendur hafa aðgang" });
  }
  return next({ ctx });
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

          await db.insert(sandboxNodes).values({
            nodeId: input.nodeId,
            label: input.label,
            url: input.url,
            region: input.region,
            secret: input.secret,
            status: "online",
            lastHealthAt: Math.floor(Date.now() / 1000),
            healthData: health,
            isActive: true,
            createdAt: new Date(),
          }).onDuplicateKeyUpdate({
            set: {
              label: input.label,
              url: input.url,
              region: input.region,
              secret: input.secret,
              status: "online",
              lastHealthAt: Math.floor(Date.now() / 1000),
              healthData: health,
              isActive: true,
            },
          });
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
});

// Routing engine procedures are added inline to appRouter above

export type AppRouter = typeof appRouter;
