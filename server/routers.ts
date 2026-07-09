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
import { createWorkerTask, updateWorkerTask, listWorkerTasks, getWorkerTask } from "./db";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

// Owner/admin guard — only the site owner (admin role) can manage updates
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Aðeins stjórnendur hafa aðgang" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
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

    send: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(4000),
        language: z.string().default("is"),
      }))
      .mutation(async ({ input }) => {
        const task = await createWorkerTask({
          workerId: "nanoclaw",
          prompt: input.prompt,
          language: input.language,
          status: "thinking",
        });
        const startMs = Date.now();
        try {
          const ingestUrl = process.env.NANOCLAW_INGEST_URL ?? "https://gummi.lt/api/voice-ingest";
          const response = await fetch(ingestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: input.prompt, language: input.language }),
            signal: AbortSignal.timeout(60000),
          });
          if (!response.ok) {
            const errText = await response.text();
            return await updateWorkerTask(task.id, {
              status: "error",
              reply: `HTTP ${response.status}: ${errText}`,
              elapsedMs: Date.now() - startMs,
              completedAt: new Date(),
            });
          }
          const data = await response.json() as { reply?: string };
          return await updateWorkerTask(task.id, {
            status: "done",
            reply: data.reply ?? "(no reply)",
            elapsedMs: Date.now() - startMs,
            completedAt: new Date(),
          });
        } catch (err: unknown) {
          return await updateWorkerTask(task.id, {
            status: "error",
            reply: err instanceof Error ? err.message : String(err),
            elapsedMs: Date.now() - startMs,
            completedAt: new Date(),
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
