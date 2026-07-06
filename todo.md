# iVenture Studio OS Dashboard — TODO

## Phase 3: Foundation
- [x] Set up dark Iceland navy/Atlantic blue global theme in index.css
- [x] Add Space Grotesk + Syne + JetBrains Mono fonts in index.html
- [x] Build main IVLayout with iVenture sidebar navigation (8 sections)
- [x] Set up database schema: agents, skills, memory_entries, cortex_signals, projects, chat_messages, grpo_history
- [x] Wire tRPC routers: agents, skills, memory, cortex, projects, chat, seed

## Phase 4: Command Centre + VMOA Agent Board
- [x] Command Centre page: streaming chat interface with model selector
- [x] Wire LLM streaming via SSE endpoint + tRPC
- [x] Model selector dropdown (LiteLLM-compatible, lists available models)
- [x] VMOA Agent Board page: 13 agent status cards
- [x] Each agent card: name, role, model, status, GRPO score, last run, routing info
- [x] Seed Demo Data button on Command Centre

## Phase 5: Skills Library + Memory Viewer + Network Panel
- [x] Skills Library page: 20+ skills in categorized grid
- [x] Each skill card: name, category, description, usage count, last used
- [x] Skills search and filter by category
- [x] Memory Viewer page: sprint memory entries list + cortex signal feed
- [x] Memory entry detail view with content rendering
- [x] Network Panel (A2A) page: agent.json card + peer nodes
- [x] Node reputation score, GRPO score, peer connection count

## Phase 6: Cortex Panel + Analytics + Client Portal
- [x] Cortex Panel page: contribution counter, credits earned, intelligence brief feed
- [x] Cortex signal live feed with category tags
- [x] Analytics page: GRPO score history line chart (Recharts)
- [x] Agent performance bar chart (Recharts)
- [x] Cortex signal volume over time chart
- [x] Client Portal page: project intake form
- [x] Project delivery tracking board (kanban-style: Intake/Scoping/Active/Review)
- [x] New Project modal with full intake form

## Phase 7: Polish + Tests + Delivery
- [x] Vitest tests: 9/9 passing (auth.logout + 8 iVenture OS procedures)
- [x] TypeScript: 0 errors
- [x] Seed realistic demo data for all panels
- [ ] Checkpoint and delivery

## Backlog / Future Enhancements
- [ ] Real-time agent status via WebSocket / polling
- [ ] Streaming chat fully wired to live LiteLLM gateway
- [ ] A2A peer discovery via real Thenvoi registry
- [ ] Client Portal: file attachment upload (S3)
- [ ] Client Portal: email notification on project status change
- [ ] PayPal billing integration for client invoicing
- [ ] Mobile-responsive layout improvements
