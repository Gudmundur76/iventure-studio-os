import { eq, desc, like, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  agents, InsertAgent,
  skills, InsertSkill,
  memoryEntries, InsertMemoryEntry,
  cortexSignals, InsertCortexSignal,
  projects, InsertProject,
  chatMessages, InsertChatMessage,
} from "../drizzle/schema";
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
