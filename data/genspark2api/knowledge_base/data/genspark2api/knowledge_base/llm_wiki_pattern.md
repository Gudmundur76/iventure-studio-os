# Pattern for building personal knowledge bases using LLMs (by Andrej Karpathy)

The idea is to have an LLM incrementally build and maintain a persistent wiki — a structured, interlinked collection of markdown files that sits between you and the raw sources.

## Three Layers:
1. Raw sources — Immutable source of truth.
2. The wiki — LLM-generated interlinked markdown files.
3. The schema — Rules and workflows for the LLM.

## Key Files:
- index.md: Content catalog.
- log.md: Chronological record.
