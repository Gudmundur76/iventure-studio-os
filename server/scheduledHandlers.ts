import type { Request, Response } from "express";
import { authenticateRequest } from "./_core/localAuth";
import {
  updateScheduledJobStatus,
  addJobRunLog,
  listScheduledJobs,
} from "./db";

const MCP_URL = process.env.GUMMI_MCP_URL ?? "http://187.124.213.194:8101";
const MCP_TOKEN = process.env.GUMMI_MCP_TOKEN ?? "";

async function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "x-mcp-token": MCP_TOKEN,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const text = await res.text();
  // SSE or plain JSON — extract the last data line
  const lines = text.split("\n").filter(l => l.startsWith("data:"));
  const payload = lines.length > 0 ? lines[lines.length - 1].replace(/^data:\s*/, "") : text;
  return JSON.parse(payload);
}

// ── Handler: hourly memory sync ───────────────────────────────────────────────
export async function memorySyncHandler(req: Request, res: Response) {
  const startMs = Date.now();
  try {
    // Scheduled handlers are called by Manus heartbeat or manually by admin
    // For cron calls, we skip auth; for manual calls, we check admin role
    const user = await authenticateRequest(req);
    // Allow if it's a heartbeat call (no user) or admin user
    if (user && user.role !== "admin") return res.status(403).json({ error: "admin-only" });

    await updateScheduledJobStatus("memory-sync", "running", "Starting NanoClaw thread sync...");

    const result = await callMcpTool("loop_sync_all_threads", { dry_run: false }) as { result?: { content?: Array<{ text?: string }> } };
    const message = result?.result?.content?.[0]?.text ?? "Sync completed";

    const durationMs = Date.now() - startMs;
    await updateScheduledJobStatus("memory-sync", "success", message);
    await addJobRunLog({ jobName: "memory-sync", status: "success", message, durationMs, triggeredBy: "cron" });

    return res.json({ ok: true, message, durationMs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startMs;
    await updateScheduledJobStatus("memory-sync", "error", message).catch(() => {});
    await addJobRunLog({ jobName: "memory-sync", status: "error", message, durationMs, triggeredBy: "cron" }).catch(() => {});
    return res.status(500).json({ error: message, durationMs });
  }
}

// ── Handler: daily cortex digest ─────────────────────────────────────────────
export async function cortexDigestHandler(req: Request, res: Response) {
  const startMs = Date.now();
  try {
    const user = await authenticateRequest(req);
    if (user && user.role !== "admin") return res.status(403).json({ error: "admin-only" });

    await updateScheduledJobStatus("cortex-digest", "running", "Generating daily cortex digest...");

    // Aggregate yesterday's cortex signals into a daily memory entry
    const result = await callMcpTool("loop_extract_memory", {
      session_key: `daily-digest:${new Date().toISOString().slice(0, 10)}`,
      max_messages: 200,
    }) as { result?: { content?: Array<{ text?: string }> } };
    const message = result?.result?.content?.[0]?.text ?? "Digest completed";

    const durationMs = Date.now() - startMs;
    await updateScheduledJobStatus("cortex-digest", "success", message);
    await addJobRunLog({ jobName: "cortex-digest", status: "success", message, durationMs, triggeredBy: "cron" });

    return res.json({ ok: true, message, durationMs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startMs;
    await updateScheduledJobStatus("cortex-digest", "error", message).catch(() => {});
    await addJobRunLog({ jobName: "cortex-digest", status: "error", message, durationMs, triggeredBy: "cron" }).catch(() => {});
    return res.status(500).json({ error: message, durationMs });
  }
}

// ── Handler: manual trigger (from dashboard) ──────────────────────────────────
export async function manualTriggerHandler(req: Request, res: Response) {
  const startMs = Date.now();
  try {
    const user = await authenticateRequest(req);
    // Allow admin users or unauthenticated heartbeat calls to manually trigger
    if (user && user.role !== "admin") {
      return res.status(403).json({ error: "admin-only" });
    }

    const jobName = req.body?.jobName as string;
    if (!jobName) return res.status(400).json({ error: "jobName required" });

    if (jobName === "memory-sync") {
      return memorySyncHandler(
        { ...req, body: {} } as Request,
        res
      );
    }
    if (jobName === "cortex-digest") {
      return cortexDigestHandler(
        { ...req, body: {} } as Request,
        res
      );
    }
    return res.status(400).json({ error: `Unknown job: ${jobName}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message, durationMs: Date.now() - startMs });
  }
}
