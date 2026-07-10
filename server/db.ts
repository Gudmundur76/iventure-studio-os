import { eq, desc, like, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  agents, InsertAgent,
  skills, InsertSkill,
  memoryEntries, InsertMemoryEntry,
  cortexSignals, InsertCortexSignal,
  projects, InsertProject,
  chatMessages, InsertChatMessage,
  workerTasks, type InsertWorkerTask,
} from "../drizzle/schema";
import { enquiries, InsertEnquiry, updates, InsertUpdate, Update } from "../drizzle/schema";
import { invoices, InsertInvoice, Invoice } from "../drizzle/schema";
import { scheduledJobs, jobRunLogs, type InsertScheduledJob, type InsertJobRunLog, type ScheduledJob, type JobRunLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Agents
export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).orderBy(agents.routingPriority);
}

export async function upsertAgent(agent: InsertAgent) {
  const db = await getDb();
  if (!db) return;
  await db.insert(agents).values(agent).onDuplicateKeyUpdate({ set: { status: agent.status, grpoScore: agent.grpoScore, tasksCompleted: agent.tasksCompleted, lastRun: agent.lastRun } });
}

// Skills
export async function getAllSkills(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category && category !== 'all') {
    return db.select().from(skills).where(eq(skills.category, category)).orderBy(desc(skills.usageCount));
  }
  return db.select().from(skills).orderBy(desc(skills.usageCount));
}

// Memory
export async function getMemoryEntries(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memoryEntries).orderBy(desc(memoryEntries.createdAt)).limit(limit);
}

// Cortex Signals
export async function getCortexSignals(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cortexSignals).orderBy(desc(cortexSignals.createdAt)).limit(limit);
}

export async function getCortexStats() {
  const db = await getDb();
  if (!db) return { totalSignals: 0, totalCredits: 0 };
  const result = await db.select().from(cortexSignals);
  return { totalSignals: result.length, totalCredits: result.length };
}

// Projects
export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) return;
  await db.insert(projects).values(project);
}

export async function updateProjectStatus(id: number, status: "intake" | "scoping" | "active" | "review" | "delivered" | "archived") {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set({ status }).where(eq(projects.id, id));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateProject(id: number, data: Partial<{
  title: string;
  description: string;
  status: "intake" | "scoping" | "active" | "review" | "delivered" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  assignedAgent: string;
  budget: string;
  deadline: Date;
  deliverables: unknown;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function getProjectTasks(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerTasks)
    .where(eq(workerTasks.projectId, projectId))
    .orderBy(desc(workerTasks.createdAt))
    .limit(50);
}

// Chat Messages
export async function getChatHistory(sessionId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(chatMessages.createdAt).limit(limit);
}

export async function saveChatMessage(msg: InsertChatMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(msg);
}

export async function createEnquiry(data: InsertEnquiry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(enquiries).values(data);
}

export async function listEnquiries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enquiries).orderBy(enquiries.createdAt);
}

// ── Updates ──────────────────────────────────────────────────────────────────
export async function listUpdates(publishedOnly = true): Promise<Update[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(updates).orderBy(updates.publishedAt);
  return publishedOnly ? rows.filter(r => r.published) : rows;
}

export async function getUpdateBySlug(slug: string): Promise<Update | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(updates).where(eq(updates.slug, slug)).limit(1);
  return rows[0];
}

export async function createUpdate(data: InsertUpdate): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(updates).values(data);
}

export async function updatePost(id: number, data: Partial<InsertUpdate>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(updates).set(data).where(eq(updates.id, id));
}

export async function deleteUpdate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(updates).where(eq(updates.id, id));
}

// ── Invoice helpers ──────────────────────────────────────────────────────────

export async function getNextInvoiceNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return `GG-${new Date().getFullYear()}-001`;
  const year = new Date().getFullYear();
  const all = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .orderBy(desc(invoices.createdAt));
  const thisYear = all.filter(r => r.invoiceNumber.startsWith(`GG-${year}-`));
  const next = thisYear.length + 1;
  return `GG-${year}-${String(next).padStart(3, '0')}`;
}

export async function createInvoice(data: Omit<InsertInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(invoices).values(data);
}

export async function listInvoices(): Promise<Invoice[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateInvoiceStatus(id: number, status: Invoice['status']): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(invoices).set({ status }).where(eq(invoices.id, id));
}

export type { Invoice };

// Worker Tasks

export async function createWorkerTask(data: Omit<InsertWorkerTask, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(workerTasks).values(data);
  const id = (result as { insertId: number }).insertId;
  const rows = await db.select().from(workerTasks).where(eq(workerTasks.id, id));
  return rows[0];
}

export async function updateWorkerTask(id: number, data: Partial<Pick<InsertWorkerTask, "status" | "reply" | "elapsedMs" | "completedAt" | "projectRef">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workerTasks).set(data).where(eq(workerTasks.id, id));
  const rows = await db.select().from(workerTasks).where(eq(workerTasks.id, id));
  return rows[0];
}

export async function listWorkerTasks(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerTasks).orderBy(desc(workerTasks.createdAt)).limit(limit);
}

export async function getWorkerTask(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(workerTasks).where(eq(workerTasks.id, id));
  return rows[0] ?? null;
}

// ── Scheduled Jobs ───────────────────────────────────────────────────────────

export async function upsertScheduledJob(data: InsertScheduledJob): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scheduledJobs).values(data).onDuplicateKeyUpdate({
    set: {
      taskUid: data.taskUid,
      cronExpression: data.cronExpression,
      description: data.description,
      isEnabled: data.isEnabled,
    },
  });
}

export async function listScheduledJobs(): Promise<ScheduledJob[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledJobs).orderBy(scheduledJobs.jobName);
}

export async function updateScheduledJobStatus(
  jobName: string,
  status: "success" | "error" | "running",
  message?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scheduledJobs)
    .set({
      lastRunAt: new Date(),
      lastRunStatus: status,
      lastRunMessage: message ?? null,
    })
    .where(eq(scheduledJobs.jobName, jobName));
  // Increment run count via raw SQL
  await db.update(scheduledJobs)
    .set({ runCount: sql`runCount + 1` })
    .where(eq(scheduledJobs.jobName, jobName));
}

export async function addJobRunLog(data: Omit<InsertJobRunLog, "id" | "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(jobRunLogs).values(data);
}

export async function listJobRunLogs(jobName?: string, limit = 50): Promise<JobRunLog[]> {
  const db = await getDb();
  if (!db) return [];
  if (jobName) {
    return db.select().from(jobRunLogs)
      .where(eq(jobRunLogs.jobName, jobName))
      .orderBy(desc(jobRunLogs.createdAt))
      .limit(limit);
  }
  return db.select().from(jobRunLogs).orderBy(desc(jobRunLogs.createdAt)).limit(limit);
}

export type { ScheduledJob, JobRunLog };
