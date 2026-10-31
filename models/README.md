# @nagarsathi/models

AI agents, multilingual prompts (`mr-IN`, `hi-IN`, `en-IN`), unified Claude wrapper, privacy redaction, caller security guards, and evaluations for **NagarSathi (CITY-02)**.

## Architecture & Key Modules

1. **Unified Claude Wrapper (`src/claudeWrapper.js`)**:
   - Reads `CLAUDE_MODEL` (default `claude-sonnet-5-5`), `CLAUDE_MODEL_FAST` (default `claude-haiku-5-5` for live caller turns), and `ANTHROPIC_API_KEY`.
   - Enforces JSON-only output (`{ display, speech, data }`), schema validation, single retry on invalid JSON, request timeout, `redactPayload()` before every LLM call, and automatic fallback to localized friendly messages on failure.
   - Supports deterministic offline execution via `MOCK_AI=true` (`src/mockFixtures.js`).
2. **Privacy & Caller Security Guards (`src/redact.js`, `src/guards.js`)**:
   - `redact()` / `redactPayload()` masks Aadhaar numbers, phone numbers, bank accounts, IFSC codes, and OTP-like codes before any text reaches the LLM.
   - `validateSpeechField()` enforces short spoken sentences (<=12 words per sentence), zero symbols/brackets/URLs, and language-matching scripts (`mr-IN` / `hi-IN` Devanagari, `en-IN` Latin).
   - `guardCallOutput()` inspects both incoming officer prompts and outgoing Caller agent speech/display text, blocking and logging any Aadhaar, OTP, password, or bank account leak. Only Application ID, citizen name, and reference numbers are allowed.
   - `verifyCatalogServiceId()` verifies returned service IDs against the service catalog (`pension`, `scholarship`, `ration_card`), converting hallucinated IDs to `"unknown"`.
3. **Agent Prompts (`prompts/*.md`)**:
   - `intake.md`, `documents.md`, `portal.md`, `tracker.md`, `caller.md`, `letter.md`.
4. **Multilingual Evals (`evals/dataset.js`, `evals/run-evals.js`)**:
   - 18 evaluation cases (6 agents x 3 languages: `mr-IN`, `hi-IN`, `en-IN`) verifying JSON schema, `speech` rules, catalog ID verification, and agent output expectations.

## Commands

```bash
npm run lint --workspace=@nagarsathi/models
npm run test --workspace=@nagarsathi/models
npm run evals --workspace=@nagarsathi/models
npm run build --workspace=@nagarsathi/models
```
