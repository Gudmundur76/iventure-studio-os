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
- [x] Multi-tenant: tenant table, isolated worker contexts
- [x] Multi-tenant: clients table with agentId, gmailLabel, subdomain, status; ClientManagement page (/os/clients)
- [x] Per-client email routing: each client gets a gmailLabel, agent auto-syncs and replies; wire to AgentInbox
- [x] Client-facing task portal: public page at /portal/:clientToken — submit tasks, view status (no login required)
- [x] Auto-deploy webhook: GitHub webhook endpoint on VPS → triggers Coolify redeploy on push to main
- [x] Email identity per agent — agent_emails table, Gmail sync/reply via tRPC, AgentInbox page (/os/email)
- [x] Browser automation worker — browser-use Docker on VPS port 8767, tRPC proxy, BrowserWorker page (/os/browser)
- [x] Scheduled tasks per agent — agent_schedules table, cron UI with presets, run-now/toggle/delete, AgentSchedules page (/os/agent-schedules)

## Coolify MCP Server (COMPLETED)
- [x] Audit Coolify API — token works at http://187.124.213.194:8000/api/v1
- [x] Build FastMCP Python server with 15 tools (coolify_list_applications, coolify_get_application, coolify_deploy_application, coolify_restart_application, coolify_stop_application, coolify_start_application, coolify_list_deployments, coolify_get_deployment_logs, coolify_list_servers, coolify_get_server_resources, coolify_list_projects, coolify_list_env_vars, coolify_set_env_var, coolify_delete_env_var, coolify_list_services)
- [x] Deploy on VPS as Docker container (port 8766, SSE at /sse)
- [x] Verify all 15 tools against live Coolify API
- [x] Add coolify tRPC router to iVenture OS (coolify.health, coolify.callTool)
- [x] Add Coolify MCP page to iVenture OS dashboard (/os/coolify)
- [x] Add Coolify MCP nav item to IVLayout sidebar with MCP badge
- [x] Push to GitHub (ef7ed99) — Coolify will auto-redeploy from GitHub

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

- [x] Auto-deploy webhook: GitHub push → webhook receiver (port 8768) → git pull + docker rebuild
- [x] Multi-tenant clients table and ClientManagement page (/os/clients)
- [x] Public portal page (/portal/:token) — token-gated task submission
- [x] Per-client email routing via gmailLabel on agents table
- [x] Tenant isolation: tenants table, CRUD helpers, tenantsRouter (list/get/create/update/delete/assignClient/clients)
- [x] ClientManagement → AgentInbox direct link: View Inbox button navigates to /os/email?agent=<assignedAgentId>; AgentInbox reads ?agent= param on mount
- [x] TenantManagement page (/os/tenants) — Astryx components (Table, Card, Dialog, Badge, Button, Grid, HStack, VStack, Selector, NumberInput); KPI cards; create/edit/delete dialogs with optimistic updates; nav item added to IVLayout
