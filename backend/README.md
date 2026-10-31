# @nagarsathi/backend

API server, encrypted PII vault, mock government portal, and Playwright portal automation for NagarSathi (CITY-02).

## Purpose
- Exposes REST/WebSocket APIs for citizen sessions, cases, documents, consent, draft creation, approval verification, and status tracking.
- Enforces the hard safety rule: portal form filling stops at `FORM_FILLED` (DRAFT) and never transitions to `SUBMITTED` unless `approval.given === true`.
- Reads encrypted Aadhaar/bank secrets directly from `@nagarsathi/database` into the portal robot without ever exposing full secrets to `@nagarsathi/models` (LLM).
