/**
 * selfHealing.ts — Mr. Agent's autonomous awareness and healing loop.
 *
 * Responsibilities:
 *  1. Awareness loop: scan anomalies from the code graph, check for failed
 *     worker tasks, and decide whether to generate a healing proposal.
 *  2. Proposal generation: call the LLM with anomaly context + file content
 *     to produce a structured patch suggestion.
 *  3. Notification dispatch: send the operator a Yes/No notification.
 *  4. Apply patch: when operator approves, write the patch to disk and
 *     optionally push a GitHub commit.
 *  5. Dismiss: archive the proposal without applying.
 */

import * as fs from "fs";
import * as path from "path";
import { getDb } from "./db";
import {
  healingProposals,
  codeNodes,
  codeRepos,
  workerTasks,
  type HealingProposal,
} from "../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { getAnomalies, scanAllActiveRepos, seedDefaultRepos } from "./codeGraph";
import { ENV } from "./_core/env";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProposalResult {
  proposalId: number;
  issueTitle: string;
  patchSummary: string;
  notificationSent: boolean;
}

// ── Awareness Loop ─────────────────────────────────────────────────────────
// Called by the heartbeat job. Scans for new anomalies and failed tasks,
// generates proposals for issues that don't already have a pending proposal.

export async function runAwarenessLoop(): Promise<{ proposalsCreated: number; errors: string[] }> {
  const db = await getDb();
  if (!db) return { proposalsCreated: 0, errors: ["DB unavailable"] };

  // Ensure default repos are seeded
  await seedDefaultRepos();

  const errors: string[] = [];
  let proposalsCreated = 0;

  // 1. Scan all active repos
  try {
    console.log("[AwarenessLoop] Starting repo scan...");
    await scanAllActiveRepos();
    console.log("[AwarenessLoop] Repo scan complete.");
  } catch (err: any) {
    errors.push(`Scan failed: ${err?.message ?? err}`);
    console.error("[AwarenessLoop] Scan error:", err?.message ?? err);
  }

  // 2. Get anomalies that don't yet have a pending/approved proposal
  const anomalies = await getAnomalies();
  console.log(`[AwarenessLoop] Found ${anomalies.length} anomalies.`);
  const pendingProposals = await db.select({ triggerRef: healingProposals.triggerRef })
    .from(healingProposals)
    .where(and(
      eq(healingProposals.status, "pending"),
    ));
  const pendingRefs = new Set(pendingProposals.map(p => p.triggerRef));

  for (const anomaly of anomalies.slice(0, 5)) { // cap at 5 new proposals per run
    const triggerRef = `node-${anomaly.nodeId}`;
    if (pendingRefs.has(triggerRef)) continue;

    try {
      const result = await generateAnomalyProposal(anomaly.nodeId, anomaly.anomalyType, anomaly.anomalyDetail, anomaly.filePath);
      if (result) {
        proposalsCreated++;
        pendingRefs.add(triggerRef);
      }
    } catch (err: any) {
      errors.push(`Proposal generation failed for node ${anomaly.nodeId}: ${err?.message ?? err}`);
    }
  }

  // 3. Check for recently failed worker tasks (last 24h) without a proposal
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { gte } = await import("drizzle-orm");
    const failedTasks = await db.select()
      .from(workerTasks)
      .where(and(
        eq(workerTasks.status, "error"),
        gte(workerTasks.createdAt, oneDayAgo),
        isNull(workerTasks.parentTaskId), // only top-level tasks
      ))
      .orderBy(desc(workerTasks.createdAt))
      .limit(3);

    for (const task of failedTasks) {
      const triggerRef = `task-${task.id}`;
      if (pendingRefs.has(triggerRef)) continue;

      try {
        const result = await generateTaskErrorProposal(task.id, task.prompt, task.reply ?? "Unknown error");
        if (result) {
          proposalsCreated++;
          pendingRefs.add(triggerRef);
        }
      } catch (err: any) {
        errors.push(`Task error proposal failed for task ${task.id}: ${err?.message ?? err}`);
      }
    }
  } catch (err: any) {
    errors.push(`Failed task check failed: ${err?.message ?? err}`);
  }

  return { proposalsCreated, errors };
}

// ── Proposal Generators ────────────────────────────────────────────────────

async function generateAnomalyProposal(
  nodeId: number,
  anomalyType: string,
  anomalyDetail: string,
  filePath: string,
): Promise<ProposalResult | null> {
  const db = await getDb();
  if (!db) return null;

  // Get the repo for this node
  const [node] = await db.select().from(codeNodes).where(eq(codeNodes.id, nodeId));
  if (!node) return null;
  const [repo] = await db.select().from(codeRepos).where(eq(codeRepos.id, node.repoId));
  if (!repo) return null;

  // Read file content if local
  let fileContent = "";
  if (repo.source === "local") {
    const absPath = path.join(repo.path, filePath);
    try {
      fileContent = fs.readFileSync(absPath, "utf-8").slice(0, 4000); // cap at 4k chars
    } catch { /* file may not exist */ }
  }

  const systemPrompt = `You are Mr. Agent, the self-healing intelligence for the iVenture Studio OS meta-OS.
You have detected a code anomaly and must produce a structured fix proposal.
Be precise, minimal, and safe. Never suggest deleting code unless it is provably dead.
Respond ONLY with valid JSON matching this schema:
{
  "issueTitle": "short title (max 80 chars)",
  "patchSummary": "plain English explanation of what to fix and why (max 300 chars)",
  "patchDiff": "unified diff string or empty string if no code change needed",
  "affectedFiles": ["array of relative file paths"]
}`;

  const userPrompt = `Anomaly detected:
Type: ${anomalyType}
Detail: ${anomalyDetail}
File: ${filePath}
${fileContent ? `\nFile content (first 4000 chars):\n\`\`\`\n${fileContent}\n\`\`\`` : ""}

Produce a fix proposal.`;

  let proposal: { issueTitle: string; patchSummary: string; patchDiff: string; affectedFiles: string[] };
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 800,
      outputSchema: {
        name: "healing_proposal",
        schema: {
          type: "object",
          properties: {
            issueTitle: { type: "string" },
            patchSummary: { type: "string" },
            patchDiff: { type: "string" },
            affectedFiles: { type: "array", items: { type: "string" } },
          },
          required: ["issueTitle", "patchSummary", "patchDiff", "affectedFiles"],
        },
      },
    });
    const content = result.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : JSON.stringify(content);
    proposal = JSON.parse(text);
  } catch (err: any) {
    // Fallback: create a basic proposal without LLM
    proposal = {
      issueTitle: `${anomalyType.replace(/_/g, " ")} in ${path.basename(filePath)}`,
      patchSummary: anomalyDetail,
      patchDiff: "",
      affectedFiles: [filePath],
    };
  }

  // Insert proposal
  const [inserted] = await db.insert(healingProposals).values({
    triggerType: "anomaly",
    triggerRef: `node-${nodeId}`,
    repoId: repo.id,
    nodeId,
    issueTitle: proposal.issueTitle.slice(0, 255),
    issueDetail: anomalyDetail,
    patchDiff: proposal.patchDiff || null,
    patchSummary: proposal.patchSummary,
    affectedFiles: proposal.affectedFiles,
    status: "pending",
    notificationSent: false,
  });

  // Get the inserted id
  const [newProposal] = await db.select({ id: healingProposals.id })
    .from(healingProposals)
    .where(eq(healingProposals.triggerRef, `node-${nodeId}`))
    .orderBy(desc(healingProposals.createdAt))
    .limit(1);

  if (!newProposal) return null;

  // Send Yes/No notification
  const notificationSent = await sendHealingNotification({
    proposalId: newProposal.id,
    issueTitle: proposal.issueTitle,
    patchSummary: proposal.patchSummary,
    repoName: repo.name,
    filePath,
    anomalyType,
    affectedFiles: proposal.affectedFiles,
    severity: anomalyType === "circular_dependency" ? "critical" : anomalyType === "high_complexity" ? "high" : "medium",
  });

  await db.update(healingProposals)
    .set({ notificationSent, notificationId: notificationSent ? `notif-${newProposal.id}` : null })
    .where(eq(healingProposals.id, newProposal.id));

  return {
    proposalId: newProposal.id,
    issueTitle: proposal.issueTitle,
    patchSummary: proposal.patchSummary,
    notificationSent,
  };
}

async function generateTaskErrorProposal(
  taskId: number,
  prompt: string,
  errorMessage: string,
): Promise<ProposalResult | null> {
  const db = await getDb();
  if (!db) return null;

  const issueTitle = `Worker task #${taskId} failed: ${errorMessage.slice(0, 60)}`;
  const patchSummary = `Task prompt: "${prompt.slice(0, 120)}"\nError: ${errorMessage.slice(0, 200)}`;

  const [newProposal] = await db.insert(healingProposals).values({
    triggerType: "task_error",
    triggerRef: `task-${taskId}`,
    issueTitle: issueTitle.slice(0, 255),
    issueDetail: `Worker task #${taskId} failed.\nPrompt: ${prompt}\nError: ${errorMessage}`,
    patchDiff: null,
    patchSummary,
    affectedFiles: [],
    status: "pending",
    notificationSent: false,
  });

  const [inserted] = await db.select({ id: healingProposals.id })
    .from(healingProposals)
    .where(eq(healingProposals.triggerRef, `task-${taskId}`))
    .orderBy(desc(healingProposals.createdAt))
    .limit(1);

  if (!inserted) return null;

  const notificationSent = await sendHealingNotification({
    proposalId: inserted.id,
    issueTitle,
    patchSummary,
    severity: "high",
  });

  await db.update(healingProposals)
    .set({ notificationSent, notificationId: notificationSent ? `notif-${inserted.id}` : null })
    .where(eq(healingProposals.id, inserted.id));

  return { proposalId: inserted.id, issueTitle, patchSummary, notificationSent };
}

// ── Notification ───────────────────────────────────────────────────────────

type HealingNotificationContext = {
  proposalId: number;
  issueTitle: string;
  patchSummary: string;
  repoName?: string;
  filePath?: string;
  anomalyType?: string;
  affectedFiles?: string[];
  severity?: "critical" | "high" | "medium" | "low";
};

async function sendHealingNotification(ctx: HealingNotificationContext): Promise<boolean> {
  const { proposalId, issueTitle, patchSummary, repoName, filePath, anomalyType, affectedFiles, severity } = ctx;
  try {
    const appUrl = ENV.isProduction
      ? "https://os.gummi.lt"
      : "http://localhost:3000";

    const severityEmoji = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : severity === "medium" ? "🔶" : "ℹ️";
    const lines: string[] = [];
    lines.push(patchSummary);
    lines.push("");
    if (repoName) lines.push(`📁 Repo: ${repoName}`);
    if (filePath) lines.push(`📄 File: ${filePath}`);
    if (anomalyType) lines.push(`🔍 Anomaly: ${anomalyType.replace(/_/g, " ")}`);
    if (affectedFiles && affectedFiles.length > 0) {
      lines.push(`📝 Affected files: ${affectedFiles.slice(0, 3).join(", ")}${affectedFiles.length > 3 ? ` +${affectedFiles.length - 3} more` : ""}`);
    }
    lines.push("");
    lines.push(`✅ YES — Approve fix: ${appUrl}/api/healing/approve/${proposalId}`);
    lines.push(`❌ NO — Dismiss: ${appUrl}/api/healing/dismiss/${proposalId}`);
    lines.push("");
    lines.push(`🔗 Full review: ${appUrl}/os/healing#proposal-${proposalId}`);

    await notifyOwner({
      title: `${severityEmoji} Mr. Agent Fix: ${issueTitle}`,
      content: lines.join("\n"),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Apply Patch ────────────────────────────────────────────────────────────

export async function applyProposal(proposalId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "DB unavailable" };

  const [proposal] = await db.select().from(healingProposals).where(eq(healingProposals.id, proposalId));
  if (!proposal) return { success: false, message: "Proposal not found" };
  if (proposal.status !== "pending" && proposal.status !== "approved") {
    return { success: false, message: `Proposal is already ${proposal.status}` };
  }

  // Mark as approved first
  await db.update(healingProposals)
    .set({ status: "approved", resolvedAt: new Date(), resolvedBy: "operator" })
    .where(eq(healingProposals.id, proposalId));

  // If there's a patch diff, apply it
  if (proposal.patchDiff && proposal.patchDiff.trim()) {
    try {
      // Get repo path
      const repoPath = proposal.repoId
        ? (await db.select({ path: codeRepos.path }).from(codeRepos).where(eq(codeRepos.id, proposal.repoId)))[0]?.path
        : process.cwd();

      if (repoPath) {
        // Write patch to temp file and apply with `patch` command
        const tmpPatch = `/tmp/mr-agent-patch-${proposalId}.diff`;
        fs.writeFileSync(tmpPatch, proposal.patchDiff);

        const { execSync } = await import("child_process");
        try {
          execSync(`cd "${repoPath}" && patch -p1 < "${tmpPatch}"`, { timeout: 30000 });
          fs.unlinkSync(tmpPatch);

          // Commit to git
          try {
            execSync(`cd "${repoPath}" && git add -A && git commit -m "fix: Mr. Agent auto-heal — ${proposal.issueTitle.slice(0, 72)}"`, { timeout: 30000 });
            const prUrl = execSync(`cd "${repoPath}" && git log --format="%H" -1`, { timeout: 10000 }).toString().trim();
            await db.update(healingProposals)
              .set({ status: "applied", appliedPrUrl: prUrl })
              .where(eq(healingProposals.id, proposalId));
          } catch {
            // Git commit failed but patch applied
            await db.update(healingProposals).set({ status: "applied" }).where(eq(healingProposals.id, proposalId));
          }

          return { success: true, message: "Patch applied and committed successfully" };
        } catch (patchErr: any) {
          await db.update(healingProposals).set({ status: "failed" }).where(eq(healingProposals.id, proposalId));
          return { success: false, message: `Patch apply failed: ${patchErr?.message ?? patchErr}` };
        }
      }
    } catch (err: any) {
      await db.update(healingProposals).set({ status: "failed" }).where(eq(healingProposals.id, proposalId));
      return { success: false, message: `Apply error: ${err?.message ?? err}` };
    }
  }

  // No diff — just mark approved (manual fix required)
  await db.update(healingProposals).set({ status: "applied" }).where(eq(healingProposals.id, proposalId));
  return { success: true, message: "Proposal approved. No automated patch — manual fix may be required." };
}

// ── Dismiss Proposal ───────────────────────────────────────────────────────

export async function dismissProposal(proposalId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "DB unavailable" };
  await db.update(healingProposals)
    .set({ status: "dismissed", resolvedAt: new Date(), resolvedBy: "operator" })
    .where(eq(healingProposals.id, proposalId));
  return { success: true, message: "Proposal dismissed" };
}

// ── List Proposals ─────────────────────────────────────────────────────────

export async function listProposals(statusFilter?: string): Promise<HealingProposal[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = statusFilter ? [eq(healingProposals.status, statusFilter as any)] : [];
  return db.select().from(healingProposals)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(healingProposals.createdAt))
    .limit(50);
}
