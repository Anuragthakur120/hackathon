# @nagarsathi/models

AI agents, multilingual prompts (`mr-IN`, `hi-IN`, `en-IN`), structured schemas, deterministic `MOCK_AI` fixtures, and evaluations for NagarSathi (CITY-02).

## Purpose
- Houses all Claude agent orchestration (`CLAUDE_MODEL` default `claude-sonnet-5-5`, live call turns via `CLAUDE_MODEL_FAST` default `claude-haiku-5-5`).
- Provides deterministic offline fixtures when `MOCK_AI=true` so tests and demos run with zero API cost.
- Strictly sanitizes inputs/outputs so full Aadhaar numbers, bank accounts, OTPs, and passwords never enter LLM prompts.

