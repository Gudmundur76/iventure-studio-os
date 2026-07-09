# iVenture Studio OS — Todo

## Vision
One-man company powered by AI agents. NanoClaw is the primary worker.
Designed to scale toward a multi-tenant client platform.

## Phase 1 — Core Dashboard ✓ (existing)
- [x] IVLayout sidebar with navigation
- [x] Design system (--iv-* CSS variables, Syne/JetBrains Mono fonts)
- [x] Auth (Manus OAuth)
- [x] Database schema (agents, projects, memory, cortex, chat, enquiries, invoices)
- [x] Command Centre (AI chat with model selector)
- [x] Agent Board (VMOA agents list)
- [x] Skills Library
- [x] Memory Viewer
- [x] Cortex Panel
- [x] Client Portal
- [x] Analytics

## Phase 2 — NanoClaw Worker Integration (NOW BUILDING)
- [x] Add "Workers" nav section to IVLayout with NanoClaw as live worker
- [x] Build WorkerDetail page — NanoClaw status, send task, live reply stream
- [x] Add /api/worker/task server route — proxies to NanoClaw ingest on VPS (gummi.lt/api/voice-ingest)
- [x] Add /api/worker/status route — checks NanoClaw health
- [x] Worker task history stored in DB (new worker_tasks table)
- [x] Real-time task status: QUEUED → THINKING → DONE with elapsed timer
- [x] Task inbox — all tasks sent to NanoClaw with replies

## Phase 3 — Task Queue & Projects
- [ ] Task Queue page — create tasks, assign to worker, track status
- [ ] Projects page — organize tasks into projects
- [ ] Project detail with task list and agent assignment
- [ ] Deliverables tracking per project

## Phase 4 — Future (Path B prep)
- [ ] Multi-tenant: tenant table, isolated worker contexts
- [ ] Email identity per agent (Nylas Agent Accounts)
- [ ] Browser automation worker (browser-use)
- [ ] Scheduled tasks (cron jobs per agent)
