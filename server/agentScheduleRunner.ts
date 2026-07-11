/**
 * Agent Schedule Runner
 * In-process cron runner using node-cron. Reads enabled schedules from DB,
 * registers cron jobs, and dispatches tasks to the browser-worker on VPS.
 * Re-syncs with DB every 5 minutes to pick up new/updated/deleted schedules.
 */
import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { listAgentSchedules, updateAgentSchedule, createBrowserTask } from "./db";

const WORKER_URL = process.env.BROWSER_WORKER_URL ?? "http://187.124.213.194:8767";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // re-sync every 5 minutes

// Map of schedule id → active cron task
const activeTasks = new Map<number, ScheduledTask>();

async function dispatchSchedule(scheduleId: number, agentId: string, taskPrompt: string) {
  console.log(`[AgentScheduler] Firing schedule #${scheduleId} for agent ${agentId}`);
  try {
    // Create a browser task record
    const task = await createBrowserTask({
      agentId,
      prompt: taskPrompt,
      startUrl: null,
      status: "queued",
      result: null,
      screenshotUrl: null,
      steps: null,
      elapsedMs: null,
      errorMessage: null,
      completedAt: null,
    });

    // Update schedule run stats
    const schedules = await listAgentSchedules();
    const schedule = schedules.find(s => s.id === scheduleId);
    await updateAgentSchedule(scheduleId, {
      lastRunAt: new Date(),
      lastRunStatus: "running",
      lastRunMessage: `Dispatched as browser task #${task.id}`,
      runCount: (schedule?.runCount ?? 0) + 1,
    });

    // Try to send to browser-worker
    try {
      const res = await fetch(`${WORKER_URL}/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, prompt: taskPrompt, start_url: null }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        await updateAgentSchedule(scheduleId, { lastRunStatus: "running", lastRunMessage: `Browser task #${task.id} dispatched` });
      }
    } catch {
      // Worker offline — task stays queued
      await updateAgentSchedule(scheduleId, { lastRunStatus: "error", lastRunMessage: "Browser worker offline, task queued" });
    }
  } catch (err) {
    console.error(`[AgentScheduler] Error dispatching schedule #${scheduleId}:`, err);
    await updateAgentSchedule(scheduleId, {
      lastRunAt: new Date(),
      lastRunStatus: "error",
      lastRunMessage: String(err),
    }).catch(() => {});
  }
}

function normalizeCron(expr: string): string {
  // node-cron uses 5-field cron (min hour dom mon dow) or 6-field with seconds
  // Our DB stores 6-field (sec min hour dom mon dow) — node-cron supports both
  return expr.trim();
}

async function syncSchedules() {
  try {
    const schedules = await listAgentSchedules();
    const enabledIds = new Set(schedules.filter(s => s.isEnabled).map(s => s.id));

    // Remove crons for deleted/disabled schedules
    for (const [id, task] of Array.from(activeTasks.entries())) {
      if (!enabledIds.has(id)) {
        task.stop();
        activeTasks.delete(id);
        console.log(`[AgentScheduler] Removed schedule #${id}`);
      }
    }

    // Add crons for new enabled schedules
    for (const schedule of schedules) {
      if (!schedule.isEnabled) continue;
      if (activeTasks.has(schedule.id)) continue; // already running

      const expr = normalizeCron(schedule.cronExpression);
      if (!cron.validate(expr)) {
        console.warn(`[AgentScheduler] Invalid cron expression for schedule #${schedule.id}: "${expr}"`);
        continue;
      }

      const task = cron.schedule(expr, async () => {
        await dispatchSchedule(schedule.id, schedule.agentId, schedule.taskPrompt);
      }, { timezone: "UTC" });

      activeTasks.set(schedule.id, task);
      console.log(`[AgentScheduler] Registered schedule #${schedule.id} "${schedule.name}" @ ${expr}`);
    }
  } catch (err) {
    console.error("[AgentScheduler] Sync error:", err);
  }
}

export function startAgentScheduleRunner() {
  console.log("[AgentScheduler] Starting agent schedule runner...");
  // Initial sync
  syncSchedules();
  // Re-sync every 5 minutes to pick up DB changes
  setInterval(syncSchedules, SYNC_INTERVAL_MS);
  console.log("[AgentScheduler] Running — re-syncs every 5 minutes");
}
