# xAI Grok Voice Agent — Integration Plan for iVenture Studio OS
## Technical architecture, build roadmap, and client service design

---

## What We Have to Work With

The `XAI_API_KEY` is already injected into the iVenture OS environment. No new credentials are needed. The Grok Voice Agent API is a WebSocket connection to `wss://api.x.ai/v1/realtime?model=grok-voice-latest`. The entire integration is:

1. A server-side tRPC procedure that issues ephemeral tokens (keeps the API key off the browser)
2. A React component that opens a WebSocket to xAI using that token
3. A custom MCP server that exposes iVenture OS tools to the voice agent

That is the complete architecture. Everything else is configuration.

---

## The Architecture

```
Browser (client)
  └─ WebSocket (ephemeral token) ──► xAI Grok Voice API
                                          │
                                          ├─ voice: grok-voice-think-fast-1.0
                                          ├─ tools: web_search, x_search
                                          └─ mcp: iventure-os-mcp (custom)
                                                    │
                                                    ├─ dispatch_task(prompt, agentId)
                                                    ├─ get_healing_proposals()
                                                    ├─ get_agent_status()
                                                    ├─ create_tenant(name, email)
                                                    ├─ get_code_graph_summary()
                                                    └─ run_awareness_scan()

iVenture OS Server (Express/tRPC)
  └─ /api/voice/token    ── issues ephemeral xAI tokens
  └─ /api/mcp            ── MCP server (SSE transport) exposing OS tools
```

**Key technical facts from the API docs:**
- WebSocket: `wss://api.x.ai/v1/realtime?model=grok-voice-latest`
- Auth: Ephemeral tokens for browser clients (server generates via `POST /v1/realtime/ephemeral_tokens`)
- MCP transport: **Streaming HTTP or SSE only** (not stdio) — the MCP server must be an HTTP endpoint
- MCP auth: Bearer token in `authorization` field on the tool config
- Multiple MCP servers supported simultaneously
- Custom functions also supported (JSON schema, client-side execution)
- Pronunciation replacements: map brand names to phonetic spellings (e.g. `"iVenture" → "eye-Venture"`)
- Language hint: set `audio.input.transcription.language_hint` to `"is"` for Icelandic bias
- Session resumption: `resumption.enabled: true` caches conversation turns across reconnects
- Pricing: $0.05/min realtime + $0.01/min telephony + $5/1k web search calls + MCP is token-based only

---

## The iVenture OS MCP Server

This is the critical piece. A small HTTP/SSE server that exposes iVenture OS capabilities as MCP tools. The voice agent calls these tools during a conversation — "what agents are running?", "dispatch a task to NanoClaw", "show me the healing proposals".

### Tools to expose (Phase 1)

| Tool name | What it does | Maps to |
|---|---|---|
| `get_agent_status` | Returns all agents and their current status | `agents.list` tRPC |
| `dispatch_task` | Sends a task to a specific agent | `metaAgent.dispatch` tRPC |
| `get_healing_proposals` | Returns pending healing proposals | `healing.list` tRPC |
| `run_awareness_scan` | Triggers the awareness loop | `/api/awareness-loop` |
| `get_code_graph_summary` | Returns repo anomaly counts | `codeGraph.listRepos` tRPC |
| `get_tenant_list` | Returns all tenants | `tenants.list` tRPC |

### MCP server implementation

The MCP server is a FastAPI app (Python) or Express endpoint (Node) that:
1. Exposes `GET /mcp` as an SSE stream (MCP protocol)
2. Handles tool calls by calling the iVenture OS tRPC API internally
3. Returns results in MCP tool response format
4. Authenticates via a shared secret (Bearer token)

This runs as a new Docker container on the VPS: `iventure-mcp-server` on port `8769`.

---

## Build Roadmap

### Phase 1 — Voice Widget on gummi.lt (3–5 days)

**Goal:** A floating voice button on gummi.lt that opens a real-time voice conversation with a Gummi persona, powered by Grok Voice.

**What to build:**
1. `POST /api/voice/token` tRPC procedure — generates ephemeral xAI token, returns it to the browser
2. `VoiceWidget.tsx` React component — floating mic button, WebSocket to xAI, audio streaming
3. System prompt for the Gummi persona — Icelandic/English bilingual, knows gummi.lt services, can answer questions about iVenture
4. Pronunciation map — `"iVenture" → "eye-Venture"`, `"Gummi" → "Goomee"`, `"Vestmannaeyjar" → "Vest-manna-ay-ar"`
5. Language hint: `"is"` for Icelandic, auto-detect otherwise

**Cost estimate:** A 5-minute conversation costs $0.25. A busy day with 20 conversations = $5. Monthly ceiling for a public-facing widget: ~$50–150.

**Deliverable:** Live voice assistant on gummi.lt. Visitors can speak to Gummi in Icelandic or English.

---

### Phase 2 — OS Voice Control (3–4 days)

**Goal:** A voice interface inside the iVenture OS dashboard. Say "what agents are running?" or "dispatch a research task to NanoClaw" and it happens.

**What to build:**
1. `iventure-mcp-server` Docker container — exposes OS tools via SSE/MCP
2. Voice control panel in the OS dashboard (`/os/voice`)
3. Session resumption enabled — the OS voice agent remembers context across sessions
4. Multi-agent transfer config — voice agent can hand off to Mr. Agent for complex tasks

**This is the internal productivity tool.** No client-facing component yet.

---

### Phase 3 — Client Voice Agent Service (1–2 weeks)

**Goal:** Deploy a managed voice agent for a paying client. They get a phone number, a custom voice, and an agent trained on their business.

**What to build:**
1. Voice agent configuration UI in the OS dashboard — set persona, voice, knowledge base, tools
2. Knowledge base upload — client uploads their docs (product specs, FAQs, policies), stored in xAI Collections
3. Voice clone workflow — record 1 minute of the client's brand voice, clone it via xAI Custom Voices API
4. Phone number provisioning — use xAI's free provisioned number or SIP connect client's existing number
5. Call log viewer in the OS — every call recorded, transcribed, tool use logged
6. Client portal page — client can see their agent's call history and performance

**Pricing model for this service:**
- Setup fee: $500–$1,500 (persona design, knowledge base, voice clone, testing)
- Monthly: $299–$799 (management fee) + pass-through of xAI usage at cost + 20% margin
- A client with 500 minutes/month of calls: $25 xAI cost + $299 management = $324/month total

---

### Phase 4 — Multi-Agent Voice Workflows (2–3 weeks)

**Goal:** Voice agents that hand off to other agents mid-call. A support agent transfers to a booking agent. A sales agent transfers to a research agent.

**What to build:**
1. Agent-to-agent transfer config in the voice agent builder
2. Transfer triggers — define conditions under which the voice agent hands off
3. Context preservation — the receiving agent gets the full conversation history
4. Webhook notifications — iVenture OS is notified of every transfer event

---

## Icelandic Language Notes

The Grok Voice API does not list Icelandic (`is`) in its official supported languages table, but the docs note: *"The model is also capable of conversing in additional languages beyond those listed above, with varying degrees of accuracy."*

**Practical approach:**
- Set `language_hint: "is"` to bias transcription toward Icelandic
- Add Icelandic-specific keyterms: `["Vestmannaeyjar", "iVenture", "Gummi", "Ísland"]`
- Test with native Icelandic speech — if accuracy is insufficient, fall back to English-primary with Icelandic greeting
- The pronunciation replacement map handles Icelandic proper nouns in the TTS output

This is a genuine first-mover advantage in Iceland. No other service is offering Grok Voice in Icelandic.

---

## Competitive Positioning with Voice

Adding Grok Voice to the iVenture stack changes the competitive picture significantly:

| Competitor | Voice capability | Our advantage |
|---|---|---|
| Fountain City Tech | No voice offering | We have live voice agents |
| Relevance AI | No real-time voice | We have $0.05/min voice |
| Vapi / Bland AI / Retell AI | Voice-only platforms, no OS layer | We have voice + OS + self-healing |
| 11x / Artisan | Text-based AI SDR only | We can do voice outreach |
| Any Icelandic agency | None have voice agents | First mover in Iceland |

The combination of **voice + OS + self-healing infrastructure** is not available from any single vendor. This is the moat.

---

## Immediate Next Steps (This Week)

1. **Build `POST /api/voice/token`** — 30 minutes. One tRPC procedure that calls `POST https://api.x.ai/v1/realtime/ephemeral_tokens` and returns the token.
2. **Build `VoiceWidget.tsx`** — 1 day. Floating mic button, WebSocket audio streaming, voice activity detection.
3. **Deploy to gummi.lt** — 1 day. Add the widget to the gummi.lt site with the Gummi persona.
4. **Build the iVenture MCP server** — 2 days. FastAPI SSE server exposing 6 OS tools.
5. **Wire MCP to the OS voice panel** — 1 day. Add the MCP server URL to the voice agent session config.

Total: **5–6 days** to a fully functional voice assistant on gummi.lt with OS control capability.
