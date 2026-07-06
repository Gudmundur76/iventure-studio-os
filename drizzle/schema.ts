import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  agentId: varchar("agentId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  role: varchar("role", { length: 128 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["active", "idle", "error", "offline"]).default("idle").notNull(),
  grpoScore: float("grpoScore").default(0.0).notNull(),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  lastRun: timestamp("lastRun"),
  routingPriority: int("routingPriority").default(1).notNull(),
  capabilities: json("capabilities").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  skillId: varchar("skillId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: text("description"),
  usageCount: int("usageCount").default(0).notNull(),
  lastUsed: timestamp("lastUsed"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

export const memoryEntries = mysqlTable("memory_entries", {
  id: int("id").autoincrement().primaryKey(),
  sprintId: varchar("sprintId", { length: 32 }),
  sessionType: varchar("sessionType", { length: 64 }),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  phase: varchar("phase", { length: 32 }),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertMemoryEntry = typeof memoryEntries.$inferInsert;

export const cortexSignals = mysqlTable("cortex_signals", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 128 }).notNull(),
  skillsUsed: json("skillsUsed").$type<string[]>(),
  grpoScore: float("grpoScore").notNull(),
  outcomeSignal: varchar("outcomeSignal", { length: 64 }).notNull(),
  agentId: varchar("agentId", { length: 64 }),
  nodeId: varchar("nodeId", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CortexSignal = typeof cortexSignals.$inferSelect;
export type InsertCortexSignal = typeof cortexSignals.$inferInsert;

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectRef: varchar("projectRef", { length: 32 }).notNull().unique(),
  clientName: varchar("clientName", { length: 128 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  serviceType: varchar("serviceType", { length: 64 }),
  status: mysqlEnum("status", ["intake", "scoping", "active", "review", "delivered", "archived"]).default("intake").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  budget: varchar("budget", { length: 32 }),
  deadline: timestamp("deadline"),
  assignedAgent: varchar("assignedAgent", { length: 64 }),
  deliverables: json("deliverables"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export const enquiries = mysqlTable("enquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  service: varchar("service", { length: 255 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "in_progress", "done"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = typeof enquiries.$inferInsert;
