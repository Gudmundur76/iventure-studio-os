# ============================================================
# iVenture Studio — Sprint 012 Execution Checklist
# Phase 27 | IntelliAgent Pro Dashboard + Composio Integration
# Date: 2026-03-17 | Est. Total: ~12 hours
# Depends on: Sprint 011 COMPLETE
# ============================================================

## SPRINT 012 GOAL
Fork and customise the IntelliAgent Pro dashboard into the iVenture Studio
UI shell. Integrate Composio Google Workspace tools (Sheets, Docs, Slides).
Wire the frontend to LiteLLM via genspark2api. Result: a working single-page
"Company OS" dashboard a solo founder can log into and run agents from.

---

## PRE-SPRINT SETUP (20 min)

- [ ] **S012-00a** | Confirm Sprint 011 health: all Docker services UP
      ```bash
      docker compose ps --format "table {{.Name}}\t{{.Status}}"
      ```
- [ ] **S012-00b** | Create workspace directory:
      ```bash
      mkdir -p /iventure.studio/frontend && cd /iventure.studio/frontend
      ```
- [ ] **S012-00c** | Install Node.js 20 + pnpm if not present:
      ```bash
      node -v || nvm install 20 && npm i -g pnpm
      ```
- [ ] **S012-00d** | Export env vars for frontend build:
      ```bash
      export NEXT_PUBLIC_API_BASE=http://api.localhost
      export NEXT_PUBLIC_LITELLM_BASE=http://litellm.localhost
      export COMPOSIO_API_KEY=$COMPOSIO_API_KEY
      ```

---

## BLOCK A: FORK INTELLIAGENT PRO DASHBOARD (3 hours)
> Source: /intelliagent_pro_platform/index.html  → Next.js 15 app

### A1 — Scaffold Next.js 15 App (45 min)
- [ ] **S012-A1a** | Bootstrap with Genspark-clone scaffold:
      ```bash
      git clone https://github.com/all3xfx/Genspark-clone iventure-ui
      cd iventure-ui
      pnpm install --legacy-peer-deps
      ```
- [ ] **S012-A1b** | Replace default branding:
      - `app/layout.tsx` → title: "iVenture Studio — One-Person Company OS"
      - `public/` → replace favicon + logo with iVenture assets
      - `tailwind.config.ts` → set primary: #0A2342 (Iceland navy), accent: #00B4D8
- [ ] **S012-A1c** | Verify dev server:
      ```bash
      pnpm dev   # → http://localhost:3000
      ```

### A2 — Port IntelliAgent Pro Panels (1.5 hours)
> Map the 6 core panels from index.html into Next.js route components

- [ ] **S012-A2a** | Create route structure:
      ```
      app/
        (dashboard)/
          layout.tsx          ← sidebar + top nav
          page.tsx            ← command centre (home)
          agents/page.tsx     ← VMOA agent cards
          skills/page.tsx     ← 18+ skills library
          memory/page.tsx     ← sprint memory viewer
          deploy/page.tsx     ← Tesslate Studio bridge
          analytics/page.tsx  ← GRPO score dashboard
      ```
- [ ] **S012-A2b** | Port sidebar nav from IntelliAgent Pro HTML → `components/Sidebar.tsx`
      - Include: Dashboard, Agents, Skills, Memory, Deploy, Analytics, Settings
- [ ] **S012-A2c** | Port command palette (Cmd+K) → `components/CommandPalette.tsx`
      - Wire to LiteLLM `/v1/chat/completions` (streaming)
- [ ] **S012-A2d** | Port agent status cards → `components/AgentCard.tsx`
      - Props: name, model, status, grpo_score, last_run
- [ ] **S012-A2e** | Test: all 6 routes render without console errors

### A3 — Wire Live Model Chat (45 min)
- [ ] **S012-A3a** | Create `/app/api/chat/route.ts` (Vercel AI SDK streaming):
      ```typescript
      import { streamText } from 'ai'
      import { openai } from '@ai-sdk/openai'

      export async function POST(req: Request) {
        const { messages, model = 'gpt-5' } = await req.json()
        const result = await streamText({
          model: openai(model, {
            baseURL: process.env.LITELLM_BASE_URL,
            apiKey: process.env.LITELLM_MASTER_KEY,
          }),
          messages,
        })
        return result.toDataStreamResponse()
      }
      ```
- [ ] **S012-A3b** | Add model selector dropdown:
      - Options: gpt-5, claude-opus-4, gemini-2.5-pro, deepseek-r1, grok-4
      - Sourced from `GET /v1/models` on LiteLLM
- [ ] **S012-A3c** | Verify streaming response renders token-by-token in UI

---

## BLOCK B: COMPOSIO GOOGLE WORKSPACE TOOLS (3 hours)
> Source: ComposioHQ/open-genspark patterns + Composio SDK

### B1 — Install & Configure Composio (30 min)
- [ ] **S012-B1a** | Install SDK:
      ```bash
      pnpm add @composio-core/sdk composio-core
      ```
- [ ] **S012-B1b** | Create `/lib/composio.ts`:
      ```typescript
      import { Composio } from 'composio-core'
      export const composio = new Composio({
        apiKey: process.env.COMPOSIO_API_KEY!,
      })
      export const googleTools = composio.getTools({
        apps: ['GOOGLESHEETS', 'GOOGLEDOCS', 'GOOGLEDRIVE', 'GMAIL', 'GOOGLECALENDAR'],
      })
      ```
- [ ] **S012-B1c** | Set `COMPOSIO_API_KEY` in `.env.local`
- [ ] **S012-B1d** | Test: `pnpm tsx lib/composio.ts` → should list available actions

### B2 — Google Sheets Agent (1 hour)
- [ ] **S012-B2a** | Port `/api/google-sheets-agent` from open-genspark:
      ```typescript
      // app/api/sheets/route.ts
      // Accepts: { sheetUrl, question }
      // Returns: streamed AI analysis of sheet data
      ```
- [ ] **S012-B2b** | Add Sheets sidebar component:
      - URL detection: auto-detect Google Sheets URLs pasted in chat
      - Preview: show first 20 rows in a data table
      - Actions: Summarise, Chart, Export to OPC report
- [ ] **S012-B2c** | Wire to VIC Engine → VMOA Financial Agent
- [ ] **S012-B2d** | Test with sample OPC financial sheet

### B3 — Google Docs & Drive Integration (1 hour)
- [ ] **S012-B3a** | Create `/app/api/docs/route.ts`:
      - Read Doc content via Composio GOOGLEDOCS.GET_DOCUMENT
      - Feed to VIC Architect for analysis/summarisation
- [ ] **S012-B3b** | Add Drive file picker component:
      - OAuth flow via Composio (no manual token management)
      - Browse recent files → select → load into chat context
- [ ] **S012-B3c** | Test: upload iVenture PRD doc → ask questions about it

### B4 — Gmail Intelligence (30 min)
- [ ] **S012-B4a** | Add email summary panel to dashboard:
      - Fetch last 10 emails via GMAIL.LIST_EMAILS
      - Run through VIC Architect → extract action items
      - Display in "Inbox Intelligence" card
- [ ] **S012-B4b** | Test: summarise 5 test emails

---

## BLOCK C: REWYO-STYLE WIZARD UX (2 hours)
> Port /rewyo_platform/rewyo_platform.html → agent creation wizard

### C1 — Multi-Step Agent Builder Wizard (1.5 hours)
- [ ] **S012-C1a** | Create `/app/create-agent/` route with 5-step wizard:
      ```
      Step 1: Choose vertical (E-commerce / SaaS / Consulting / Content / Finance)
      Step 2: Name your agent + describe goal (free text)
      Step 3: Select skills (checkboxes from 18+ skills library)
      Step 4: Configure GRPO reward target (slider: 0.80 → 0.99)
      Step 5: Deploy → generates VIC Architect prompt + VMOA config
      ```
- [ ] **S012-C1b** | Wire Step 5 to VIC Engine `/deploy` API:
      ```typescript
      POST /api/vic/deploy
      Body: { name, vertical, skills[], grpo_target, model }
      Returns: { agent_id, prompt_hash, vmoa_config }
      ```
- [ ] **S012-C1c** | Show deployed agent card on dashboard after creation

### C2 — Template Gallery (30 min)
- [ ] **S012-C2a** | Create `/app/templates/page.tsx` with 5 starter templates:
      | Template | Vertical | Skills | Model |
      |---|---|---|---|
      | OPC Accountant | Finance | tax, invoice, sheets | deepseek-r1 |
      | Content Studio | Content | write, seo, schedule | gpt-5 |
      | E-com Manager | E-commerce | product, ads, inventory | claude-opus-4 |
      | Research Analyst | Research | search, summarise, report | skywork-deepresearch |
      | Dev Assistant | SaaS | code, test, deploy | gemini-2.5-pro |
- [ ] **S012-C2b** | One-click deploy from template → triggers wizard Step 5

---

## BLOCK D: PPT & DOCUMENT GENERATION (1 hour)
> Sources: ComposioHQ/open-genspark PPT + Skywork Super-Agents MCP

### D1 — Presentation Creator (30 min)
- [ ] **S012-D1a** | Port `generate-slides` + `convert-to-ppt` APIs from open-genspark:
      ```typescript
      // app/api/slides/generate/route.ts
      // app/api/slides/download/route.ts
      ```
- [ ] **S012-D1b** | Add "Generate Report" button to analytics page:
      - One click → generates OPC performance summary deck
      - Downloads as .pptx
- [ ] **S012-D1c** | Wire Skywork Super-Agents MCP as fallback:
      - If Composio fails → call Skywork MCP `office-tool` server

### D2 — OPC Business Report Template (30 min)
- [ ] **S012-D2a** | Create report template with 8 standard slides:
      1. Executive Summary
      2. Revenue & Expense (from Sheets data)
      3. Agent Activity Log
      4. GRPO Score History
      5. Skills Utilisation
      6. Market Intelligence (from DeepResearch agent)
      7. 30-Day Action Plan
      8. Appendix
- [ ] **S012-D2b** | Test: generate full OPC report → verify .pptx opens cleanly

---

## BLOCK E: VMOA DASHBOARD UPGRADE (2 hours)
> Upgrade agents page with live status, GRPO scores, and DeepResearch V2

### E1 — Live Agent Status Board (1 hour)
- [ ] **S012-E1a** | Create WebSocket connection to VMOA orchestrator:
      ```typescript
      // lib/vmoa-ws.ts
      const ws = new WebSocket('ws://api.localhost/vmoa/stream')
      ws.onmessage = (e) => updateAgentStatus(JSON.parse(e.data))
      ```
- [ ] **S012-E1b** | Display real-time agent activity:
      - Status: IDLE / RUNNING / COMPLETE / ERROR
      - Current task description
      - Token usage + estimated cost
      - GRPO score (live update)
- [ ] **S012-E1c** | Add "Interrupt" and "Retry" controls per agent

### E2 — Add DeepResearch V2 as VMOA Agent #9 (30 min)
- [ ] **S012-E2a** | Register in VMOA config:
      ```yaml
      agents:
        - id: deep-research
          name: "Deep Research Analyst"
          model: skywork-deepresearch-v2
          trigger: ["research", "analyse", "investigate", "market study"]
          api_email: deepresearch@skywork.ai
      ```
- [ ] **S012-E2b** | Add agent card to dashboard with BrowseComp badge (38.7%)

### E3 — GRPO Score History Chart (30 min)
- [ ] **S012-E3a** | Add Recharts line graph to analytics page:
      - X axis: sprint number
      - Y axis: GRPO score (0.00 → 1.00)
      - Show: current 0.991337, target >0.997
      - Threshold lines: 0.95 (good), 0.99 (excellent)
- [ ] **S012-E3b** | Pull score history from `/memory/MEMORY.md`

---

## BLOCK F: DEPLOYMENT BRIDGE TO TESSLATE (1 hour)
> Source: Tesslate Studio (github.com/TesslateAI/Studio)

### F1 — Tesslate Deploy Panel (30 min)
- [ ] **S012-F1a** | Create `/app/deploy/page.tsx`:
      - Show list of deployed agents
      - "Publish to Web" button → triggers Tesslate build
      - Shows public URL after deploy
- [ ] **S012-F1b** | Create `/app/api/deploy/tesslate/route.ts`:
      ```typescript
      // POST: { agent_id, subdomain }
      // Calls Tesslate Studio API → returns public URL
      // e.g. https://my-agent.iventure.studio
      ```

### F2 — Custom Domain Setup (30 min)
- [ ] **S012-F2a** | Configure Traefik for wildcard subdomain routing:
      ```yaml
      # traefik dynamic config
      rule: "HostRegexp(`{subdomain:[a-z0-9-]+}.iventure.studio`)"
      ```
- [ ] **S012-F2b** | Document: how to point DNS → atNorth Iceland IP
- [ ] **S012-F2c** | Test: deploy "test-agent" → verify https://test-agent.iventure.studio loads

---

## SPRINT 012 SIGN-OFF

### Definition of Done
- [ ] Dashboard loads at http://studio.localhost with all 6 nav panels
- [ ] Chat works with at least 3 models (gpt-5, deepseek-r1, gemini-2.5-pro)
- [ ] Google Sheets URL pasted in chat → sidebar opens with data
- [ ] Agent wizard creates and deploys a new agent in < 2 minutes
- [ ] GRPO score chart visible on analytics page
- [ ] PPT report generates and downloads successfully
- [ ] DeepResearch V2 agent card visible in agents panel
- [ ] At least 1 agent deployed via Tesslate with public URL

### Time Log
| Block | Est. | Actual | Notes |
|-------|------|--------|-------|
| Pre-setup | 20m | | |
| A — Dashboard Fork | 3h | | |
| B — Composio Tools | 3h | | |
| C — Wizard UX | 2h | | |
| D — PPT/Docs | 1h | | |
| E — VMOA Dashboard | 2h | | |
| F — Tesslate Deploy | 1h | | |
| **TOTAL** | **12h 20m** | | |

### Memory Update
After sign-off, append to `/memory/MEMORY.md`:
```markdown
## Sprint 012 — COMPLETE [DATE]
- IntelliAgent Pro dashboard live at studio.localhost
- Composio Google tools: Sheets ✓ Docs ✓ Gmail ✓
- Agent wizard: 5-step, 5 templates deployed
- DeepResearch V2 registered as VMOA Agent #9
- GRPO chart live: current score 0.991337
- First public agent deployed via Tesslate
```

---
*Sprint 012 feeds into Sprint 013 (Skills Creator UI) and Sprint 014 (OPC template library).*
