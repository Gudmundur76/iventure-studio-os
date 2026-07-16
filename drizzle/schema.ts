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
  passwordHash: varchar("passwordHash", { length: 255 }),
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
  gmailLabel: varchar("gmailLabel", { length: 128 }), // Gmail label used as this agent's inbox
  emailAddress: varchar("emailAddress", { length: 320 }), // Display email address for this agent
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

export const updates = mysqlTable("updates", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  title: varchar("title", { length: 256 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }).notNull().default("fréttir"),
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Update = typeof updates.$inferSelect;
export type InsertUpdate = typeof updates.$inferInsert;

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 32 }).notNull().unique(),
  clientName: varchar("clientName", { length: 256 }).notNull(),
  clientAddress: text("clientAddress"),
  clientKennitala: varchar("clientKennitala", { length: 32 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  lineItems: json("lineItems").$type<{ description: string; amount: number }[]>().notNull(),
  totalAmount: int("totalAmount").notNull(),
  currency: varchar("currency", { length: 8 }).default("ISK").notNull(),
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  dueDate: timestamp("dueDate").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue"]).default("draft").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const workerTasks = mysqlTable("worker_tasks", {
  id: int("id").autoincrement().primaryKey(),
  workerId: varchar("workerId", { length: 64 }).notNull().default("nanoclaw"),
  prompt: text("prompt").notNull(),
  projectId: int("projectId"),
  projectRef: varchar("projectRef", { length: 32 }),
  language: varchar("language", { length: 8 }).default("is").notNull(),
  status: mysqlEnum("status", ["queued", "thinking", "done", "error"]).default("queued").notNull(),
  reply: text("reply"),
  elapsedMs: int("elapsedMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  parentTaskId: int("parentTaskId"),   // set on subtasks — points to the meta-agent parent task
  metaRef: varchar("metaRef", { length: 64 }), // e.g. "meta-abc123" groups parent + subtasks
  subtaskIndex: int("subtaskIndex"),   // order within the dispatch plan (0-based)
});
export type WorkerTask = typeof workerTasks.$inferSelect;
export type InsertWorkerTask = typeof workerTasks.$inferInsert;

export const routingLogs = mysqlTable("routing_logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId"),
  prompt: text("prompt").notNull(),
  selectedAgentId: varchar("selectedAgentId", { length: 64 }).notNull(),
  selectedAgentName: varchar("selectedAgentName", { length: 128 }).notNull(),
  score: float("score").notNull(),
  reason: text("reason"),
  candidates: json("candidates").$type<Array<{ agentId: string; name: string; score: number; reason: string }>>(),
  overridden: boolean("overridden").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoutingLog = typeof routingLogs.$inferSelect;
export type InsertRoutingLog = typeof routingLogs.$inferInsert;

export const scheduledJobs = mysqlTable("scheduled_jobs", {
  id: int("id").autoincrement().primaryKey(),
  jobName: varchar("jobName", { length: 64 }).notNull(),
  taskUid: varchar("taskUid", { length: 128 }),
  cronExpression: varchar("cronExpression", { length: 64 }),
  description: text("description"),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  lastRunStatus: mysqlEnum("lastRunStatus", ["success", "error", "running"]),
  lastRunMessage: text("lastRunMessage"),
  runCount: int("runCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;

export const jobRunLogs = mysqlTable("job_run_logs", {
  id: int("id").autoincrement().primaryKey(),
  jobName: varchar("jobName", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["success", "error"]).notNull(),
  message: text("message"),
  durationMs: int("durationMs"),
  triggeredBy: varchar("triggeredBy", { length: 32 }).default("cron").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobRunLog = typeof jobRunLogs.$inferSelect;
export type InsertJobRunLog = typeof jobRunLogs.$inferInsert;

// ── Sandbox Nodes ─────────────────────────────────────────────────────────────
export const sandboxNodes = mysqlTable("sandbox_nodes", {
  id: int("id").autoincrement().primaryKey(),
  nodeId: varchar("nodeId", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  url: varchar("url", { length: 256 }).notNull(),
  region: varchar("region", { length: 64 }).notNull(),
  secret: varchar("secret", { length: 256 }),
  status: varchar("status", { length: 32 }).notNull().default("unknown"),
  lastHealthAt: int("lastHealthAt"),
  healthData: text("healthData"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SandboxNode = typeof sandboxNodes.$inferSelect;
export type InsertSandboxNode = typeof sandboxNodes.$inferInsert;

// ── Agent Email Identities ─────────────────────────────────────────────────
// Each agent can have a Gmail label acting as its "inbox" — emails tagged
// with that label are surfaced in the Agent Inbox page.
export const agentEmails = mysqlTable("agent_emails", {
  id: int("id").autoincrement().primaryKey(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  emailAddress: varchar("emailAddress", { length: 320 }).notNull(),
  gmailLabel: varchar("gmailLabel", { length: 128 }), // Gmail label name to filter by
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  subject: varchar("subject", { length: 512 }),
  snippet: text("snippet"),
  body: text("body"),
  fromAddress: varchar("fromAddress", { length: 320 }),
  toAddress: varchar("toAddress", { length: 320 }),
  threadId: varchar("threadId", { length: 128 }),
  messageId: varchar("messageId", { length: 128 }).unique(),
  isRead: boolean("isRead").default(false).notNull(),
  isReplied: boolean("isReplied").default(false).notNull(),
  agentReply: text("agentReply"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgentEmail = typeof agentEmails.$inferSelect;
export type InsertAgentEmail = typeof agentEmails.$inferInsert;

// ── Browser Automation Tasks ───────────────────────────────────────────────
export const browserTasks = mysqlTable("browser_tasks", {
  id: int("id").autoincrement().primaryKey(),
  agentId: varchar("agentId", { length: 64 }).notNull().default("nanoclaw"),
  prompt: text("prompt").notNull(),
  startUrl: varchar("startUrl", { length: 2048 }),
  status: mysqlEnum("status", ["queued", "running", "done", "error"]).default("queued").notNull(),
  result: text("result"),
  screenshotUrl: varchar("screenshotUrl", { length: 2048 }),
  steps: json("steps").$type<Array<{ action: string; url?: string; timestamp: number }>>(),
  elapsedMs: int("elapsedMs"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type BrowserTask = typeof browserTasks.$inferSelect;
export type InsertBrowserTask = typeof browserTasks.$inferInsert;

// ── Agent Schedules (cron per agent) ──────────────────────────────────────
export const agentSchedules = mysqlTable("agent_schedules", {
  id: int("id").autoincrement().primaryKey(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  cronExpression: varchar("cronExpression", { length: 64 }).notNull(),
  taskPrompt: text("taskPrompt").notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  heartbeatTaskUid: varchar("heartbeatTaskUid", { length: 128 }),
  lastRunAt: timestamp("lastRunAt"),
  lastRunStatus: mysqlEnum("lastRunStatus", ["success", "error", "running"]),
  lastRunMessage: text("lastRunMessage"),
  runCount: int("runCount").default(0).notNull(),
  nextRunAt: timestamp("nextRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentSchedule = typeof agentSchedules.$inferSelect;
export type InsertAgentSchedule = typeof agentSchedules.$inferInsert;

// ── Multi-Tenant Clients ───────────────────────────────────────────────────
// Tenants — top-level isolation boundary (one per paying account / company)
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  tenantRef: varchar("tenantRef", { length: 32 }).notNull().unique(), // e.g. "tenant-abc123"
  name: varchar("name", { length: 128 }).notNull(),
  plan: varchar("plan", { length: 32 }).default("starter").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "trial"]).default("trial").notNull(),
  workerQuota: int("workerQuota").default(10).notNull(), // max concurrent worker tasks
  defaultAgentId: varchar("defaultAgentId", { length: 64 }).default("nanoclaw").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// Each client belongs to a tenant and gets an isolated context: dedicated agent, Gmail label, portal token
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  clientRef: varchar("clientRef", { length: 32 }).notNull().unique(), // e.g. "client-abc123"
  tenantRef: varchar("tenantRef", { length: 32 }), // which tenant this client belongs to
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 128 }),
  phone: varchar("phone", { length: 32 }),
  assignedAgentId: varchar("assignedAgentId", { length: 64 }).notNull().default("nanoclaw"),
  gmailLabel: varchar("gmailLabel", { length: 128 }), // Gmail label for this client's inbox
  emailAddress: varchar("emailAddress", { length: 320 }), // Display email for this client
  portalToken: varchar("portalToken", { length: 64 }).notNull().unique(), // public portal access token
  subdomain: varchar("subdomain", { length: 64 }), // e.g. "acme" → acme.gummi.lt
  status: mysqlEnum("status", ["active", "onboarding", "paused", "churned"]).default("onboarding").notNull(),
  plan: varchar("plan", { length: 32 }).default("starter").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// Client task submissions (from public portal — no login required)
export const clientTasks = mysqlTable("client_tasks", {
  id: int("id").autoincrement().primaryKey(),
  clientRef: varchar("clientRef", { length: 32 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  status: mysqlEnum("status", ["submitted", "in_progress", "done", "cancelled"]).default("submitted").notNull(),
  agentReply: text("agentReply"),
  agentTaskId: int("agentTaskId"), // links to browser_tasks or worker_tasks
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type ClientTask = typeof clientTasks.$inferSelect;
export type InsertClientTask = typeof clientTasks.$inferInsert;

// ── Mr. Agent Profiles ────────────────────────────────────────────────────
// Each profile defines the persona, doctrine, and working style that the
// meta agent loads before orchestrating any task. One profile can be
// marked as the default for a tenant (or globally if tenantRef is null).
export const mrAgentProfiles = mysqlTable("mr_agent_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  tenantRef: varchar("tenantRef", { length: 32 }), // null = global default
  persona: text("persona").notNull(),              // tone, style, how it introduces itself
  doctrine: text("doctrine").notNull(),            // task decomposition rules, escalation rules
  workingStyle: text("workingStyle").notNull(),    // formatting preferences, verbosity, language
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MrAgentProfile = typeof mrAgentProfiles.$inferSelect;
export type InsertMrAgentProfile = typeof mrAgentProfiles.$inferInsert;

// ── Code Graph ────────────────────────────────────────────────────────────
// codeRepos: each repository / service that Mr. Agent scans.
export const codeRepos = mysqlTable("code_repos", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  source: mysqlEnum("source", ["local", "ssh", "github"]).default("local").notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  language: varchar("language", { length: 32 }).default("typescript").notNull(),
  lastScannedAt: timestamp("lastScannedAt"),
  nodeCount: int("nodeCount").default(0).notNull(),
  edgeCount: int("edgeCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CodeRepo = typeof codeRepos.$inferSelect;
export type InsertCodeRepo = typeof codeRepos.$inferInsert;

// codeNodes: a file, function, class, or module in the graph.
export const codeNodes = mysqlTable("code_nodes", {
  id: int("id").autoincrement().primaryKey(),
  repoId: int("repoId").notNull(),
  nodeType: mysqlEnum("nodeType", ["file", "function", "class", "module", "variable", "type"]).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  filePath: varchar("filePath", { length: 512 }).notNull(),
  startLine: int("startLine"),
  endLine: int("endLine"),
  complexity: int("complexity").default(0).notNull(),
  linesOfCode: int("linesOfCode").default(0).notNull(),
  churnScore: int("churnScore").default(0).notNull(),
  isDeadCode: boolean("isDeadCode").default(false).notNull(),
  hasErrors: boolean("hasErrors").default(false).notNull(),
  anomalyType: varchar("anomalyType", { length: 64 }),
  anomalyDetail: text("anomalyDetail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CodeNode = typeof codeNodes.$inferSelect;
export type InsertCodeNode = typeof codeNodes.$inferInsert;

// codeEdges: a directed relationship between two nodes.
export const codeEdges = mysqlTable("code_edges", {
  id: int("id").autoincrement().primaryKey(),
  repoId: int("repoId").notNull(),
  fromNodeId: int("fromNodeId").notNull(),
  toNodeId: int("toNodeId").notNull(),
  edgeType: mysqlEnum("edgeType", ["imports", "calls", "extends", "implements", "uses", "exports"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CodeEdge = typeof codeEdges.$inferSelect;
export type InsertCodeEdge = typeof codeEdges.$inferInsert;

// ── Self-Healing Proposals ────────────────────────────────────────────────
export const healingProposals = mysqlTable("healing_proposals", {
  id: int("id").autoincrement().primaryKey(),
  triggerType: mysqlEnum("triggerType", ["task_error", "anomaly", "self_directed"]).notNull(),
  triggerRef: varchar("triggerRef", { length: 128 }),
  repoId: int("repoId"),
  nodeId: int("nodeId"),
  issueTitle: varchar("issueTitle", { length: 256 }).notNull(),
  issueDetail: text("issueDetail").notNull(),
  patchDiff: text("patchDiff"),
  patchSummary: text("patchSummary"),
  affectedFiles: json("affectedFiles").$type<string[]>(),
  status: mysqlEnum("status", ["pending", "approved", "dismissed", "applied", "failed"]).default("pending").notNull(),
  notificationSent: boolean("notificationSent").default(false).notNull(),
  notificationId: varchar("notificationId", { length: 128 }),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 64 }),
  appliedPrUrl: varchar("appliedPrUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type HealingProposal = typeof healingProposals.$inferSelect;
export type InsertHealingProposal = typeof healingProposals.$inferInsert;

// ── Public Leads (from iventure.studio public chat) ───────────────────────
export const publicLeads = mysqlTable("public_leads", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull().unique(),
  visitorName: varchar("visitorName", { length: 128 }),
  visitorEmail: varchar("visitorEmail", { length: 256 }),
  source: varchar("source", { length: 64 }).default("iventure.studio").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "closed"]).default("new").notNull(),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PublicLead = typeof publicLeads.$inferSelect;
export type InsertPublicLead = typeof publicLeads.$inferInsert;

// ── Public Chat Messages (from iventure.studio) ───────────────────────────
export const publicChatMessages = mysqlTable("public_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PublicChatMessage = typeof publicChatMessages.$inferSelect;
export type InsertPublicChatMessage = typeof publicChatMessages.$inferInsert;

// ── Giggo Service Orders ─────────────────────────────────────────────────
export const serviceOrders = mysqlTable("service_orders", {
  id: int("id").autoincrement().primaryKey(),
  portalToken: varchar("portalToken", { length: 64 }).notNull().unique(),
  clientName: varchar("clientName", { length: 128 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 256 }).notNull(),
  service: varchar("service", { length: 128 }).notNull(),
  description: text("description").notNull(),
  plan: mysqlEnum("plan", ["grunnur", "voxtur", "studio"]).default("grunnur").notNull(),
  status: mysqlEnum("status", ["new", "in_progress", "revision", "delivered", "closed"]).default("new").notNull(),
  slaDeadline: timestamp("slaDeadline"),
  deliveryUrl: text("deliveryUrl"),
  deliveryNote: text("deliveryNote"),
  internalNotes: text("internalNotes"),
  agentTaskId: int("agentTaskId"),
  source: varchar("source", { length: 64 }).default("giggo.io").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;
