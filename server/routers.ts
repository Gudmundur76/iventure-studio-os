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
import { invokeLLM, listLLMModels } from "./_core/llm";

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
          { role: "system" as const, content: "You are iVenture Studio OS — an intelligent AI agent operating system assistant. You help manage multi-agent workflows, analyze business intelligence, and coordinate the VMOA agent team. Be concise, precise, and professional. Use markdown formatting." },
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
        return { success: true };
      }),
    list: protectedProcedure.query(async () => {
      return listEnquiries();
    }),
  }),
});

export type AppRouter = typeof appRouter;
