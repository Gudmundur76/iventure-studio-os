import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("iVenture Studio OS — system procedures", () => {
  it("auth.me returns null for unauthenticated request", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("system.health returns ok status", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.system.health({ timestamp: Date.now() });
    expect(result).toMatchObject({ ok: true });
  });

  it("agents.list returns array", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.agents.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("skills.list returns array", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.skills.list({ category: undefined });
    expect(Array.isArray(result)).toBe(true);
  });

  it("cortex.signals returns array", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.cortex.signals({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("cortex.stats returns object", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.cortex.stats();
    expect(result).toBeDefined();
  });

  it("projects.list returns array", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.projects.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("memory.list returns array", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.memory.list({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });
});
