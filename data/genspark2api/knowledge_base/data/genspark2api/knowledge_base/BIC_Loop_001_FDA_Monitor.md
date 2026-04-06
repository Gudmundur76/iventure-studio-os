# BIC Autonomous Intelligence Loop: BIC-LOOP-001
## Objective: Real-Time FDA Orange Book Monitoring (Pembrolizumab)

This specification defines our first "Compounding Intelligence" loop, transforming BIC from reactive research to proactive "Alpha" generation.

### 1. The Configuration
- **Asset Target**: [[Asset-Keytruda-Biosimilar]] (Pembrolizumab)
- **Source**: [FDA Orange Book Database](https://www.accessdata.fda.gov/scripts/cder/ob/)
- **Schedule**: Daily at 02:00 UTC (Post-US SEC/FDA update window).

### 2. The Tech Stack Execution (The "Super-Connector" Play)
1. **Trigger**: **n8n-mcp** initiates the cycle from the [[iventure-studio]] workflow hub.
2. **Extraction**: **Browserbase MCP** performs a "Stealth Login" and interactive search for "Pembrolizumab" to bypass session timeouts and dynamic JS loaders.
3. **Refinement**: **Firecrawl MCP** converts the raw FDA search results into clean, structured Markdown.
4. **Reasoning**: **VIC-Engine-v2 (Wave 28)** compares the new data against our [[knowledge_graph]] (Pattern Alpha) to determine if a new 351(k) BLA filing or a patent update has occurred.

### 3. Compounding Output (Compounding Brain)
- **Wiki Update**: Automatically append new entries to [[Keytruda-Competitive-Map]].
- **Alert**: If a new competitor filing is detected, trigger the [[VMOA-Synthesizer]] to generate a 1-page "Impact Analysis" for BIC clients.
- **Persistence**: Store the raw scrape in `/llm-wiki/raw` and the refined intelligence in `/BiosimilarIntelCo/Alerts`.

### 4. Success Metric
**Zero Data Decay.** The time from a public FDA filing to a BIC Strategic Report must be < 15 minutes.

---
*Status: Architecture Approved. Ready for n8n integration script seeding.*
