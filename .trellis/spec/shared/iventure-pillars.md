# iVenture Industrial Standards (The Four Pillars)
Version: 1.0 | Standard for all AI Interactions

All AI agents working on this project MUST adhere to the following Four Pillars of Industrial Intelligence.

## Pillar I: Deterministic Causal Chains
- Agents must never "browse and guess."
- Logic must follow hard-coded patterns (e.g., US Federal -> State -> Local).
- Use `harness_core.py` to enforce these chains.

## Pillar II: Persistent State Management
- Every interaction must be aware of the "Wave" history and previous artifacts.
- State is preserved in `mem9` (Distributed) and the Genspark AI Drive (Long-term).

## Pillar III: RAAL (Relational Adaptation Layer)
- All outputs MUST be scored. 
- If the confidence score is < 0.991337, the agent must trigger a loop-back for higher-fidelity reasoning.
- Never settle for low-quality responses in production code.

## Pillar IV: Progressive Disclosure
- Shield the context from "Drowning."
- Only provided the agent with the specific context required for the immediate task via the `ResourceConnector`.

---
*Enforced by the iVenture Factory.*
