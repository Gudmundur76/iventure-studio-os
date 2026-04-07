# iVenture Studio — AUTONOMOUS HARNESS ENGINEERING (Phase 17.5)
Version: 1.0 | Date: 2026-04-07

Inspired by `kevinrgu/autoagent`, this protocol defines how the iVenture Factory will autonomously improve its own logic overnight.

## ⚙️ The Optimization Loop
1.  **Baseline Extraction:** Collect the 100 most recent interactions for a specific harness (e.g., `FinancialHarness`).
2.  **Failure Analysis:** Identify interactions with GRPO scores < 0.95.
3.  **Meta-Agent Intervention:** A "Meta-Agent" (Master Architect) proposes 3 changes to the harness:
    - Change A: Improved System Prompt instructions.
    - Change B: New specialized tool (e.g., `calculate_icelandic_vat`).
    - Change C: Adjusted RAAL Threshold.
4.  **Simulation:** Run the improved harness against the same 100 interactions.
5.  **Selection:** If the new GRPO average is higher and the logic is simpler, commit the change to GitHub automatically.

## 🏗️ Integration with AutoAgent
We will mount the `autoagent` core into our `/factory/` and bridge it with our `AGENTS.yaml` manifest.

---
*Verified by Claw-VIC v4.2.*
