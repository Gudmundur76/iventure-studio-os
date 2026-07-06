import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createEnquiry: vi.fn().mockResolvedValue(undefined),
    listEnquiries: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Jón Sigurðsson",
        email: "jon@example.is",
        service: "Website & App Development",
        message: "Need a landing page for my startup",
        status: "new",
        createdAt: new Date("2026-01-01"),
      },
    ]),
    getAllAgents: vi.fn().mockResolvedValue([]),
    getAllSkills: vi.fn().mockResolvedValue([]),
    getMemoryEntries: vi.fn().mockResolvedValue([]),
    getCortexSignals: vi.fn().mockResolvedValue([]),
    getCortexStats: vi.fn().mockResolvedValue({ totalSignals: 0, avgGrpo: 0, topCategory: "", contributionCount: 0 }),
    getAllProjects: vi.fn().mockResolvedValue([]),
    createProject: vi.fn().mockResolvedValue(undefined),
    updateProjectStatus: vi.fn().mockResolvedValue(undefined),
    getChatHistory: vi.fn().mockResolvedValue([]),
    saveChatMessage: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./seed", () => ({
  seedDatabase: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Hello from Amplify!" } }],
  }),
  listLLMModels: vi.fn().mockResolvedValue({ data: [] }),
}));

function makeCtx(user?: TrpcContext["user"]): TrpcContext {
  return {
    user: user ?? null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Amplify — enquiries.submit", () => {
  it("accepts a valid enquiry and returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.enquiries.submit({
      name: "Sigríður Björnsdóttir",
      email: "sigridur@example.is",
      service: "Research Reports & Market Intelligence",
      message: "I need a competitor analysis for the Icelandic fintech market.",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects an enquiry with an invalid email", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.enquiries.submit({
        name: "Test",
        email: "not-an-email",
        message: "Some message",
      })
    ).rejects.toThrow();
  });

  it("rejects an enquiry with an empty message", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.enquiries.submit({
        name: "Test",
        email: "test@example.is",
        message: "",
      })
    ).rejects.toThrow();
  });
});

describe("Amplify — enquiries.list (protected)", () => {
  it("returns enquiries for authenticated users", async () => {
    const user: TrpcContext["user"] = {
      id: 1,
      openId: "owner-id",
      email: "owner@amplify.is",
      name: "Amplify Owner",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.enquiries.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.name).toBe("Jón Sigurðsson");
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.enquiries.list()).rejects.toThrow();
  });
});

describe("Amplify — agents.list", () => {
  it("returns an array of agents", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.agents.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Amplify — skills.list", () => {
  it("returns an array of skills", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.skills.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

