# Agent-as-a-Service — Capability Assessment
## What the agents can do for clients today, and where to improve

---

## The Agent Stack (What Is Actually Running)

There are five live agent services on the VPS, each with a distinct role:

| Agent | Port | What it does |
|---|---|---|
| **Browser Worker** | 8767 | Autonomous web browser — navigates URLs, fills forms, scrapes pages, takes screenshots, executes multi-step web tasks using GPT-4o-mini |
| **MRAgent VPS** | 8765 | Persistent memory store — saves and retrieves episodic memories across sessions using keyword similarity search |
| **OpenManus API** | 8088 | General-purpose autonomous task execution — runs complex multi-step reasoning and action chains |
| **Sandbox Coordinator** | 8901 | Isolated code execution environment — creates sandboxes, runs code, uploads files, manages compute nodes |
| **Sandbox Agent** | 8900 | Individual sandbox node — executes commands, runs scripts, manages files inside an isolated container |

The iVenture Studio OS sits above all of these as the orchestration and monitoring layer — dispatching tasks, tracking sessions, scheduling recurring jobs, and healing failures.

---

## What Clients Can Get From This Today

### 1. Web Research & Data Collection
The Browser Worker can navigate any website, extract structured data, fill in forms, and return results. It runs headlessly and reports back with screenshots and step logs.

**Client use cases:**
- Monitor competitor pricing pages daily and report changes
- Scrape job listings, tender boards, or news feeds on a schedule
- Fill out and submit web forms on behalf of the client
- Extract contact information from directories or LinkedIn
- Monitor a client's own site for broken links or content changes

**Current state:** Working. Uses GPT-4o-mini. Tasks are dispatched, run, and results stored. Schedulable via Agent Schedules.

---

### 2. Persistent Memory Across Sessions
MRAgent stores episodic memories — facts, decisions, outcomes — and retrieves the most relevant ones when a new task arrives. This means an agent working for a client does not start from zero each session.

**Client use cases:**
- An agent that remembers a client's brand voice, past decisions, and preferences
- A research agent that builds a growing knowledge base about a market or competitor
- A support agent that remembers previous customer interactions
- A content agent that tracks what has already been written and avoids repetition

**Current state:** Working. Keyword-based similarity search. Memory persists in SQLite on the VPS.

---

### 3. Autonomous Code Execution
The Sandbox Coordinator creates isolated Docker environments, runs code, and returns results. This is the equivalent of a private code interpreter.

**Client use cases:**
- Run data analysis scripts on client-provided CSV/Excel files
- Execute Python scripts to process, transform, or visualise data
- Test and validate code before deploying it
- Run automated report generation from raw data
- Build and test small scripts on demand without a development environment

**Current state:** Working. Coordinator + agent node both healthy. Not yet wired to a client-facing UI.

---

### 4. Scheduled Autonomous Tasks
Any task can be scheduled with a cron expression — daily, weekly, hourly, or on a custom cadence. The agent fires automatically, executes the task, and logs the result.

**Client use cases:**
- Daily competitive intelligence briefing delivered to inbox
- Weekly content draft ready for review every Monday morning
- Hourly price monitoring with alerts on threshold breach
- Monthly report generated and emailed automatically
- Daily lead list enriched and ready in CRM

**Current state:** Working. Agent Schedules page is live. Schedules fire via the agent schedule runner every 5 minutes.

---

### 5. Multi-Step Task Orchestration (Mr. Agent)
Mr. Agent takes a high-level goal, breaks it into subtasks, routes each to the right agent, collects results, and synthesises a final response. It reads memory before acting and writes a summary after.

**Client use cases:**
- "Research our top 5 competitors and write a comparison report" — Mr. Agent delegates research to Browser Worker, writing to LLM, formats and returns
- "Find 20 leads matching this profile and draft personalised outreach for each" — delegates scraping, enrichment, and writing as parallel subtasks
- "Analyse this dataset and produce a summary with recommendations" — delegates to Sandbox for computation, LLM for narrative

**Current state:** Working. Dispatch, session history, and memory writing all functional.

---

## Where We Can Improve

### Gap 1 — Browser Worker Has No Real Persistence
The Browser Worker stores tasks in memory only. If the container restarts, all task history is lost. For a paying client, this is unacceptable — they need to see what the agent did last week.

**Fix:** Wire the Browser Worker to write task results back to the MySQL database (already done for the OS dashboard tasks table). Add a task history view per client.

---

### Gap 2 — MRAgent Memory Is Keyword-Only, Not Semantic
The memory search uses simple word overlap, not embeddings. This means "client wants concise copy" and "brief, punchy writing style" are not recognised as the same memory. The agent will miss relevant context.

**Fix:** Replace keyword similarity with vector embeddings (OpenAI `text-embedding-3-small` or a local model). This is a one-day upgrade that dramatically improves memory recall quality.

---

### Gap 3 — No Client-Facing Interface
Clients currently have no way to see what their agent is doing, review task history, or submit new tasks. Everything goes through the OS dashboard which is internal-only.

**Fix:** Build a lightweight client portal (the `/os/portal` page exists but is a stub). Each client gets a login, sees their agent's task history, can submit new tasks, and receives notifications when tasks complete. This is the most important gap for productising Agent-as-a-Service.

---

### Gap 4 — No Email or Notification Delivery
Agents complete tasks but have no way to push results to a client's inbox. The Gmail MCP is configured but not wired to agent task completion.

**Fix:** Add a post-task hook that emails the client a summary when a scheduled task completes. One tRPC mutation + Gmail MCP call. This makes the service feel alive even when the client is not logged in.

---

### Gap 5 — Sandbox Is Not Client-Accessible
The Sandbox Coordinator and Agent are healthy and capable, but there is no UI or API surface that lets a client (or even the OS dashboard) submit code execution jobs to them.

**Fix:** Add a `sandbox.exec` tRPC procedure and a simple UI panel. This unlocks data analysis as a service — clients upload a CSV, describe what they want, the agent writes and runs the analysis, and returns a chart or summary.

---

### Gap 6 — Agent Routing Is Score-Based But Agents Are Not Specialised
The routing engine scores agents by capability tags and GRPO score, but all agents currently have the same capabilities registered. The router has no real basis for choosing NanoClaw over Mr. Agent for a specific task type.

**Fix:** Register distinct capability tags per agent (e.g. `browser-automation`, `memory-retrieval`, `code-execution`, `research`, `writing`) and update the routing engine to match task keywords to these tags. This makes multi-agent dispatch genuinely intelligent.

---

### Gap 7 — No Feedback Loop on Task Quality
There is no mechanism for a client to rate a task result or flag it as wrong. Without this, the GRPO score (which is supposed to improve agent selection over time) never updates.

**Fix:** Add a simple thumbs up/down on each task result in the client portal. Wire this to update the agent's GRPO score in the database. Over time, the routing engine will learn which agent performs best for which client.

---

## Priority Order for Improvements

| Priority | Fix | Impact | Effort |
|---|---|---|---|
| 1 | Client portal with task history and task submission | Unlocks the entire AaaS business model | Medium |
| 2 | Email delivery on task completion | Makes the service feel alive | Low |
| 3 | Semantic memory (vector embeddings) | Dramatically improves agent quality | Low–Medium |
| 4 | Browser Worker persistence to DB | Prevents data loss, enables history | Low |
| 5 | Distinct agent capability tags + routing fix | Makes multi-agent dispatch intelligent | Low |
| 6 | Sandbox UI + client data analysis | Unlocks a high-value new service | Medium |
| 7 | Task quality feedback loop | Enables self-improvement over time | Medium |

---

## The One-Line Summary

The agents can already do web research, data collection, scheduled automation, code execution, persistent memory, and multi-step orchestration. The gap is not capability — it is **client-facing delivery**. The agents work; clients just cannot see them working yet.
