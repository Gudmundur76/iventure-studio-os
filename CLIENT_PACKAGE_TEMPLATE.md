# iVenture Client Package — Onboarding Template

## The "Digital Business" Package

Every client gets a complete, connected AI-powered business presence. The package has five components, all wired to the iVenture OS through a single MCP connection.

---

## Components

| Component | What the client gets | Powered by |
|---|---|---|
| **Website** | 5-page branded site (Home, Services, About, Portfolio, Contact) | iVenture builds on Hostinger |
| **Business email** | `name@theirdomain.is` — up to 5 addresses | Hostinger Email |
| **AI Freelancer** | Named agent with phone number — call to dispatch tasks | xAI Voice Agent Builder |
| **Voice widget** | Floating mic on their website — visitors speak to the agent | xAI WebRTC + iVenture OS MCP |
| **Client portal** | Login to see task history, deliverables, and invoices | iVenture OS tenant system |

---

## Onboarding Checklist (per client)

### Step 1 — Domain & Hosting (Day 1)
- [ ] Register domain via Hostinger (or transfer existing)
- [ ] Set up Hostinger hosting plan
- [ ] Create business email addresses (e.g., `hello@`, `info@`, `support@`)
- [ ] Point DNS to Hostinger nameservers

### Step 2 — Website Build (Days 1–3)
- [ ] Gather brand assets: logo, colors, fonts, copy
- [ ] Build 5-page site using iVenture template
- [ ] Add voice widget embed code to site footer
- [ ] Deploy to Hostinger
- [ ] Verify SSL certificate is active

### Step 3 — iVenture OS Setup (Day 2)
- [ ] Create tenant record in OS (`/os/tenants` → New Tenant)
- [ ] Set tenant name, domain, contact email, subscription tier
- [ ] Create client record and assign to tenant (`/os/clients` → New Client)
- [ ] Generate client portal token (auto-generated on client creation)
- [ ] Send portal link to client: `https://os.gummi.lt/portal/<token>`

### Step 4 — AI Freelancer Setup (Day 2–3)
- [ ] Go to [console.x.ai](https://console.x.ai) → Voice Agent Builder
- [ ] Create new agent with client's name/persona
- [ ] Set system prompt (see template below)
- [ ] Add iVenture OS MCP server:
  - URL: `https://os.gummi.lt/api/mcp`
  - Auth: Bearer `<JWT_SECRET from container env>`
- [ ] Add web search tool
- [ ] Select voice (or clone client's voice from 1 min of audio)
- [ ] Enable phone number (free US number, or Twilio for local number)
- [ ] Test by calling the number

### Step 5 — Email AI Setup (Day 3)
- [ ] Configure Gmail label for client (e.g., `client-acme`)
- [ ] Set `gmailLabel` on client's agent record in OS
- [ ] Verify Agent Inbox shows client emails at `/os/email?agent=<agentId>`
- [ ] Test: send email to client address, verify it appears in Agent Inbox

### Step 6 — Handover (Day 3–5)
- [ ] Send client their portal link and login instructions
- [ ] Send client their AI freelancer's phone number
- [ ] Schedule 30-min onboarding call to walk through the portal
- [ ] Set up first scheduled task (e.g., weekly competitive report)

---

## AI Freelancer System Prompt Template

```
You are [AGENT_NAME], an AI assistant for [CLIENT_BUSINESS_NAME].

Your role: Help [CLIENT_NAME] and their team get work done. You can:
- Research topics and summarise findings
- Draft content, emails, and reports
- Check on tasks in progress
- Dispatch new work to the iVenture OS
- Answer questions about [CLIENT_BUSINESS_NAME]'s services and offerings

About [CLIENT_BUSINESS_NAME]:
[2-3 sentences about what they do, who they serve, and their tone of voice]

Always be concise. Confirm task dispatch with a brief summary. If you don't know something, say so and offer to research it.

Language: [Icelandic / English / both]
```

---

## Pricing

| Tier | Includes | Setup | Monthly |
|---|---|---|---|
| **Starter** | Website + email + AI freelancer (phone) | $1,500 | $299/mo |
| **Growth** | Starter + voice widget + client portal + weekly reports | $2,500 | $499/mo |
| **Studio** | Growth + email AI + custom agent persona + priority support | $3,500 | $999/mo |
| **Enterprise** | Full OS access + white-label + unlimited agents | Custom | $1,999+/mo |

### Cost structure per client (Growth tier example)
| Item | Monthly cost |
|---|---|
| Hostinger hosting + email | ~$15 |
| xAI voice (est. 100 min/mo) | ~$5 |
| iVenture OS (shared infra) | ~$10 |
| **Total cost** | **~$30** |
| **Revenue** | **$499** |
| **Margin** | **~94%** |

---

## Voice Widget Embed Code

Add to any client website's `</body>` tag:

```html
<script
  src="https://os.gummi.lt/voice-widget.js"
  data-token-url="https://os.gummi.lt/api/xai-voice-token"
  data-agent-name="[AGENT_NAME]"
  data-primary-color="#[HEX]"
></script>
```

---

## MCP Server Configuration (for xAI Console)

| Field | Value |
|---|---|
| **MCP Server URL** | `https://os.gummi.lt/api/mcp` |
| **Transport** | HTTP (JSON-RPC 2.0) |
| **Auth** | Bearer `<JWT_SECRET>` |
| **Available tools** | `get_agent_status`, `dispatch_task`, `get_healing_proposals`, `run_awareness_scan`, `get_code_graph_summary`, `get_tenant_list` |

---

## End-to-End Test Checklist (before client handover)

- [ ] Call the AI freelancer's phone number — agent answers and identifies itself
- [ ] Say "dispatch a test task" — agent calls `dispatch_task` via MCP, confirms queued
- [ ] Say "what agents are running" — agent calls `get_agent_status`, reads back the list
- [ ] Visit client website — voice widget appears and connects
- [ ] Log into client portal — task history is visible
- [ ] Send test email to client address — appears in Agent Inbox within 5 minutes
- [ ] Verify weekly report schedule is active in `/os/agent-schedules`
