# iVenture Studio OS — Description & Purpose

## What It Is

**iVenture Studio OS** (accessible at [os.gummi.lt](https://os.gummi.lt)) is a private, self-hosted operating system dashboard for running and managing an AI-native service agency. It is the central command centre from which all autonomous agents, infrastructure, clients, and workflows are monitored, dispatched, and healed — without relying on any third-party SaaS platform.

It is built on a React 19 + Tailwind 4 + Express + tRPC stack, deployed on a self-managed VPS behind Traefik, with a MySQL database and a GitHub-webhook-driven CI/CD pipeline.

---

## Core Purpose

The system exists to answer one question: **"What is happening across all my agents, repos, clients, and infrastructure right now — and what needs to be fixed?"**

It does this through five interlocking pillars:

| Pillar | What it does |
|---|---|
| **Awareness** | Continuously scans all VPS codebases via SSH, detects anomalies (large files, high complexity, TODO density), and surfaces them as healing proposals |
| **Healing** | Presents detected anomalies as actionable proposals that can be approved, dismissed, or dispatched to an AI agent for autonomous repair |
| **Dispatch** | Routes tasks to the right agent (NanoClaw, OpenManus, Mr. Agent) with a single click, with full session history |
| **Orchestration** | Manages agent schedules, system heartbeats, and recurring jobs across the entire VPS stack |
| **Visibility** | Provides a single pane of glass over clients, tenants, infrastructure (Coolify, Hostinger), memory, analytics, and the code graph |

---

## Modules & Pages

### Agent Operations

| Page | Path | Purpose |
|---|---|---|
| **NanoClaw Worker** | `/os/worker` | Live interface to the NanoClaw AI agent — send messages, view sessions, trigger autonomous tasks |
| **VMOA Agents** | `/os/agents` | View and manage all registered agent personas and their current status |
| **Mr. Agent** | `/os/meta-agent` | Dispatch high-level tasks to the meta-agent; view past sessions and outcomes |
| **Agent Profile** | `/os/mr-agent-profile` | Edit Mr. Agent's persona, doctrine, and operating thresholds |
| **Agent Inbox** | `/os/email` | Unified inbox for agent-generated emails and inbound messages |
| **Agent Schedules** | `/os/agent-schedules` | Create and manage recurring agent tasks with cron expressions |
| **Browser Worker** | `/os/browser` | Control and monitor the browser automation worker |

### Codebase Intelligence

| Page | Path | Purpose |
|---|---|---|
| **Code Graph** | `/os/code-graph` | Visual graph of all 7 VPS repos — files, functions, complexity, anomaly flags, scanned via SSH |
| **Healing Proposals** | `/os/healing` | Anomalies detected by the awareness loop, presented as Yes/No proposals with one-click agent dispatch |

### Client & Business

| Page | Path | Purpose |
|---|---|---|
| **Clients** | `/os/clients` | Full CRM — client profiles, assigned tenants, contact details |
| **Tenants** | `/os/tenants` | Multi-tenant management — create tenants, assign clients, manage access |
| **Client Portal** | `/os/portal` | Public-facing portal view for clients |
| **Projects** | `/os/projects` | Project tracking across all active engagements |
| **Task Queue** | `/os/tasks` | Unified task queue across all agents and projects |

### Infrastructure

| Page | Path | Purpose |
|---|---|---|
| **Coolify MCP** | `/os/coolify` | Manage Coolify deployments, services, and containers via MCP |
| **Hostinger Infra** | `/os/hostinger` | DNS, domain, and hosting management via Hostinger MCP |
| **Sandbox Nodes** | `/os/sandbox` | Monitor and interact with sandbox compute nodes |
| **System Schedules** | `/os/schedules` | View all heartbeat jobs and their execution history |

### Intelligence & Memory

| Page | Path | Purpose |
|---|---|---|
| **Memory Viewer** | `/os/memory` | Browse and search the agent's persistent memory store |
| **Skills Library** | `/os/skills` | View all available agent skills and their descriptions |
| **Cortex Panel** | `/os/cortex` | Deep reasoning and analysis interface |
| **Network (A2A)** | `/os/network` | Agent-to-agent communication network topology |
| **Analytics** | `/os/analytics` | Usage metrics, task completion rates, agent performance |

---

## Autonomous Loops

The system runs two autonomous background loops without any human trigger:

**Awareness Loop** (every 6 hours)
SSH-connects to the VPS, scans all 7 registered repos for anomalies (files over 200 lines, complexity over 8, high TODO density), writes code nodes to the database, and generates healing proposals for any new anomalies found.

**Agent Schedule Runner** (every 5 minutes)
Polls the `agent_schedules` table and fires any due agent tasks — dispatching them to NanoClaw or the meta-agent automatically.

---

## Infrastructure Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Tailwind CSS 4, shadcn/ui, Wouter routing |
| **Backend** | Node.js, Express 4, tRPC 11, Drizzle ORM |
| **Database** | MySQL (TiDB-compatible) |
| **Auth** | Local bcrypt/JWT session auth (username: `admin`) |
| **Hosting** | Self-managed VPS (187.124.213.194), Docker, Traefik reverse proxy |
| **Domain** | `os.gummi.lt` (HTTPS via Let's Encrypt) |
| **CI/CD** | GitHub webhook → Python receiver on port 8768 → Docker rebuild → container swap |
| **Repos scanned** | iventure-studio-os, nanoclaw, openmanus, mragent-vps, iventure-sandbox, browser-worker, coolify-mcp |

---

## Who It Is For

This is a **single-operator internal tool** — built for Gudmundur Kristjansson (iVenture Studio) to run an AI-native agency where agents do the work and the human steers. It is not a multi-user SaaS product. It is a personal mission control for autonomous AI operations.
