# iVenture Studio OS — Todo

## Vision
One-man company powered by AI agents. NanoClaw is the primary worker.
Designed to scale toward a multi-tenant client platform.

## Phase 1 — Core Dashboard ✓ (existing)
- [x] IVLayout sidebar with navigation
- [x] Design system (--iv-* CSS variables, Syne/JetBrains Mono fonts)
- [x] Auth (local JWT — bcryptjs + jose, no Manus OAuth dependency)
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
- [x] Task Queue page — create tasks, assign to worker, track status
- [x] Projects page — organize tasks into projects
- [x] Project detail with task list and agent assignment
- [x] Deliverables tracking per project

## Phase 4 — Future (Path B prep)
- [ ] Multi-tenant: tenant table, isolated worker contexts
- [ ] Email identity per agent (Nylas Agent Accounts)
- [ ] Browser automation worker (browser-use)
- [ ] Scheduled tasks (cron jobs per agent)

## OpenManus Integration
- [x] Clone OpenManus on VPS, create config.toml with API keys
- [x] Deploy OpenManus as Docker container on VPS (openmanus-api on port 8088, direct Docker not Coolify-managed)
- [x] Add OPENMANUS_URL env var to Node app
- [x] Add worker.dispatch tRPC mutation (POST task to OpenManus, save to worker_tasks)
- [x] Add worker.syncTask tRPC mutation (polls OpenManus and updates DB — used by UI polling loop)
- [x] Build Worker page UI: dispatch form, live polling, result display
- [x] Test end-to-end: submit task → OpenManus executes → result in UI
- [x] Push to GitHub and verify on os.gummi.lt
- [x] Verify Worker page UI end-to-end in browser: submit task, auto-poll, render result

## Phase 5 — VPS Migration (IN PROGRESS)
- [x] Replace Manus OAuth with local JWT auth (bcryptjs + jose)
- [x] Add passwordHash column to users table
- [x] Create localAuth.ts with login/logout/setup endpoints
- [x] Update context.ts to use authenticateRequest from localAuth
- [x] Update index.ts to call registerLocalAuthRoutes
- [x] Update scheduledHandlers.ts to use local auth
- [x] Build Login page (/login route)
- [x] Update useAuth hook (redirect to /login instead of Manus OAuth)
- [x] Update IVLayout logout to redirect to /login
- [x] Update const.ts getLoginUrl() to return /login
- [x] Push to GitHub (Gudmundur76/iventure-studio-os)
- [x] Push to GitHub (Gudmundur76/iventure-studio-os)
- [x] Deploy to VPS via Coolify (os.gummi.lt) — Dockerfile added, build succeeded, container healthy
- [x] Run DB migration on production (passwordHash column added)
- [x] Create admin user in production DB (openId=admin, password=iventure2024)
- [x] Seed production DB (13 agents, 20 skills, 5 projects, 5 memory entries)
- [x] Verify login and auth.me work on os.gummi.lt
- [x] Verify agents.list returns data on os.gummi.lt
- [x] Verify all 11 dashboard pages work on os.gummi.lt — all 10 tRPC endpoints return 200
- [x] Retire old Coolify-managed iVenture OS container (optional cleanup — new container is healthy)
