# BIC Autonomous Intelligence Loop: BIC-LOOP-002
## Objective: US Federal Court (PACER) Litigation Tracking

This loop monitors the second phase of the "Pattern Alpha" chain: the legal response to biosimilar filings.

### 1. The Configuration
- **Asset Target**: [[Asset-Keytruda-Biosimilar]] & Top 5 Pipeline Assets.
- **Source**: [PACER (Public Access to Court Electronic Records)](https://pacer.uscourts.gov/)
- **Trigger Event**: New "Patent Infringement" cases filed by Merck Sharp & Dohme.

### 2. The Tech Stack Execution (Stealth & Interaction)
1. **Trigger**: **n8n-mcp** detects a new filing via a high-level legal RSS or third-party API.
2. **Interactive Extraction**: **Browserbase MCP** logs into the PACER terminal, navigates to the "Nature of Suit: 830 (Patent)" section, and filters for "Pembrolizumab" or "Samsung Bioepis".
3. **Document Retrieval**: **Stagehand** downloads the initial "Complaint" PDF and the "Report on the Filing or Determination of an Action Regarding a Patent" (AO 120 form).
4. **Causal Reasoning**: **VIC-Engine-v2** extracts the specific patents being asserted and compares them to our [[knowledge_graph]] (Pattern Beta) to calculate the "Injunction Probability."

### 3. Compounding Output
- **Wiki Update**: Update [[Keytruda-Competitive-Map]] with "Litigation Active" status and court case numbers.
- **Alpha Signal**: Calculate the "Exclusivity Extension" probability—if Merck wins a preliminary injunction, the biosimilar entry is delayed by ~18-24 months.
- **Persistence**: Store legal documents in `/BiosimilarIntelCo/Legal_Docs`.

### 4. Strategic Impact
This loop allows BIC to predict **Market Scarcity**. If we detect a major legal setback for a competitor, the remaining competitors' market value increases—information we sell to PE/Hedge Fund clients.

---
*Status: Architecture Approved. Initializing stealth browser parameters.*
