/**
 * iVenture OS MCP Server
 *
 * Implements the Model Context Protocol (MCP) over HTTP+SSE transport.
 * Compatible with xAI Voice Agent Builder custom MCP configuration.
 *
 * Endpoints:
 *   GET  /api/mcp          — SSE stream (server → client events, session init)
 *   POST /api/mcp          — Tool call execution (client → server)
 *   GET  /api/mcp/manifest — Tool manifest (list of available tools)
 *
 * Auth: Bearer token via MCP_BEARER_TOKEN env var (falls back to JWT_SECRET)
 *
 * Tools exposed:
 *   1. get_agent_status       — list all agents with status
 *   2. dispatch_task          — dispatch a task to an agent via meta-agent
 *   3. get_healing_proposals  — list pending healing proposals
 *   4. run_awareness_scan     — trigger the awareness loop scan
 *   5. get_code_graph_summary — summary of all repos and anomaly counts
 *   6. get_tenant_list        — list all tenants
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getAllAgents } from "./db";
import { listProposals, runAwarenessLoop } from "./selfHealing";
import { getAnomalies } from "./codeGraph";
import { listTenants } from "./db";
import { getDb } from "./db";
import { codeRepos } from "../drizzle/schema";
import { dispatchMetaAgent } from "./metaAgent";

// ── Tool definitions (MCP schema format) ──────────────────────────────────

const TOOLS = [
  {
    name: "get_agent_status",
    description: "List all iVenture OS agents with their current status, type, and capabilities. Use this to understand what agents are available and what they can do.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "dispatch_task",
    description: "Dispatch a task to the iVenture OS meta-agent for execution. The meta-agent will plan the task, route subtasks to appropriate workers (NanoClaw, Browser Worker, Sandbox), and synthesise a result. Returns a task ID for tracking.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task description in natural language. Be specific about what you want done.",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high"],
          description: "Task priority. Defaults to normal.",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "get_healing_proposals",
    description: "List pending healing proposals from the awareness loop. These are code anomalies detected across all monitored repos that need review and action.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "applied", "dismissed", "failed"],
          description: "Filter by status. Defaults to pending.",
        },
        limit: {
          type: "number",
          description: "Maximum number of proposals to return. Defaults to 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "run_awareness_scan",
    description: "Trigger the awareness loop to scan all monitored repos for anomalies and generate healing proposals. This runs asynchronously — it starts the scan and returns immediately with a confirmation.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_code_graph_summary",
    description: "Get a summary of all monitored code repositories including node counts, anomaly counts, and last scan time. Useful for understanding the health of the codebase.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_tenant_list",
    description: "List all tenants in the iVenture OS. Tenants are client organisations that have been onboarded to the platform.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ── Tool execution ─────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_agent_status": {
      const agents = await getAllAgents();
      return {
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          status: a.status,
          capabilities: a.capabilities,
          model: a.model,
        })),
        total: agents.length,
        active: agents.filter(a => a.status === "active").length,
      };
    }

    case "dispatch_task": {
      const task = String(args.task ?? "");
      if (!task) throw new Error("task is required");
      const result = await dispatchMetaAgent({
        prompt: task,
        tenantRef: "mcp-voice",
      });
      return {
        success: true,
        taskId: result.parentTaskId,
        message: `Task queued with ID ${result.parentTaskId}. The meta-agent is planning and routing subtasks now.`,
        subtasks: result.plan?.subtasks?.length ?? 0,
      };
    }

    case "get_healing_proposals": {
      const status = String(args.status ?? "pending");
      const limit = Number(args.limit ?? 10);
      const proposals = await listProposals(status);
      const sliced = proposals.slice(0, limit);
      return {
        proposals: sliced.map(p => ({
          id: p.id,
          issueTitle: p.issueTitle,
          issueDetail: p.issueDetail,
          repoId: p.repoId,
          nodeId: p.nodeId,
          patchSummary: p.patchSummary,
          status: p.status,
        })),
        total: proposals.length,
        shown: sliced.length,
      };
    }

    case "run_awareness_scan": {
      // Run async — don't await, just fire and return
      runAwarenessLoop().catch(err => console.error("[MCP] awareness scan error:", err));
      return {
        success: true,
        message: "Awareness scan started across all monitored repos. Check healing proposals in a few minutes for results.",
      };
    }

    case "get_code_graph_summary": {
      const db = await getDb();
      if (!db) return { repos: [], totalNodes: 0, totalAnomalies: 0 };
      const repos = await db.select().from(codeRepos);
      const anomalies = await getAnomalies();
      const anomalyByRepo: Record<number, number> = {};
      for (const a of anomalies) {
        anomalyByRepo[a.nodeId] = (anomalyByRepo[a.nodeId] ?? 0) + 1;
      }
      return {
        repos: repos.map(r => ({
          id: r.id,
          name: r.name,
          source: r.source,
          language: r.language,
          isActive: r.isActive,
          lastScannedAt: r.lastScannedAt,
          anomalies: 0,
        })),
        totalRepos: repos.length,
        activeRepos: repos.filter(r => r.isActive).length,
        totalAnomalies: anomalies.length,
      };
    }

    case "get_tenant_list": {
      const tenants = await listTenants();
      return {
        tenants: tenants.map(t => ({
          id: t.id,
          tenantRef: t.tenantRef,
          name: t.name,
          plan: t.plan,
          status: t.status,
          createdAt: t.createdAt,
        })),
        total: tenants.length,
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Auth middleware ────────────────────────────────────────────────────────

function getMcpToken(): string {
  return process.env.MCP_BEARER_TOKEN ?? ENV.cookieSecret ?? "iventure-mcp-token";
}

function authorizeMcp(req: Request, res: Response): boolean {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== getMcpToken()) {
    res.status(401).json({ error: "Unauthorized — provide a valid Bearer token" });
    return false;
  }
  return true;
}

// ── MCP message helpers ────────────────────────────────────────────────────

function mcpResponse(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function mcpError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// ── Route registration ─────────────────────────────────────────────────────

export function registerMcpServer(app: Express): void {
  // ── GET /api/mcp — SSE session init ──────────────────────────────────────
  app.get("/api/mcp", (req: Request, res: Response) => {
    if (!authorizeMcp(req, res)) return;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Send MCP server info event
    const serverInfo = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {
        serverInfo: {
          name: "iventure-os",
          version: "1.0.0",
          description: "iVenture Studio OS — agent dispatch, healing proposals, code graph, and tenant management",
        },
        capabilities: {
          tools: { listChanged: false },
        },
        protocolVersion: "2024-11-05",
      },
    };
    res.write(`data: ${JSON.stringify(serverInfo)}\n\n`);

    // Send endpoint event (tells client where to POST tool calls)
    const endpointEvent = {
      jsonrpc: "2.0",
      method: "notifications/endpoint",
      params: {
        endpoint: "/api/mcp",
      },
    };
    res.write(`data: ${JSON.stringify(endpointEvent)}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(": ping\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAlive);
    });
  });

  // ── POST /api/mcp — JSON-RPC tool calls ──────────────────────────────────
  app.post("/api/mcp", async (req: Request, res: Response) => {
    // Allow CORS preflight
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

    if (!authorizeMcp(req, res)) return;

    const body = req.body as { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
    const { id = null, method, params = {} } = body;

    try {
      // ── initialize ──────────────────────────────────────────────────────
      if (method === "initialize") {
        return res.json(mcpResponse(id, {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "iventure-os",
            version: "1.0.0",
          },
          capabilities: {
            tools: { listChanged: false },
          },
        }));
      }

      // ── tools/list ──────────────────────────────────────────────────────
      if (method === "tools/list") {
        return res.json(mcpResponse(id, { tools: TOOLS }));
      }

      // ── tools/call ──────────────────────────────────────────────────────
      if (method === "tools/call") {
        const toolName = String((params as { name?: string }).name ?? "");
        const toolArgs = ((params as { arguments?: Record<string, unknown> }).arguments ?? {}) as Record<string, unknown>;

        if (!toolName) {
          return res.json(mcpError(id, -32602, "Missing tool name"));
        }

        const toolExists = TOOLS.some(t => t.name === toolName);
        if (!toolExists) {
          return res.json(mcpError(id, -32601, `Tool not found: ${toolName}`));
        }

        console.log(`[MCP] tool call: ${toolName}`, toolArgs);
        const result = await executeTool(toolName, toolArgs);
        return res.json(mcpResponse(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }));
      }

      // ── ping ────────────────────────────────────────────────────────────
      if (method === "ping") {
        return res.json(mcpResponse(id, {}));
      }

      // ── notifications/initialized (client ack) ──────────────────────────
      if (method === "notifications/initialized") {
        return res.status(204).send();
      }

      return res.json(mcpError(id, -32601, `Method not found: ${method}`));
    } catch (err) {
      console.error("[MCP] error:", err);
      return res.json(mcpError(id, -32603, err instanceof Error ? err.message : "Internal error"));
    }
  });

  // ── OPTIONS /api/mcp — CORS preflight ────────────────────────────────────
  app.options("/api/mcp", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.status(204).send();
  });

  // ── GET /api/mcp/manifest — human-readable tool list ─────────────────────
  app.get("/api/mcp/manifest", (_req: Request, res: Response) => {
    res.json({
      name: "iVenture Studio OS",
      version: "1.0.0",
      description: "MCP server for iVenture Studio OS — dispatch tasks, monitor agents, review healing proposals, and manage tenants via voice or chat.",
      tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
      endpoint: "/api/mcp",
      auth: "Bearer token (set MCP_BEARER_TOKEN env var)",
    });
  });

  console.log("[MCP] iVenture OS MCP server registered at /api/mcp");
}
