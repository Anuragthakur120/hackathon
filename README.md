# NagarSathi (Project CITY-02)

> **"Jo padh nahi sakta, wo bhi sab kuch kar sakta hai."**

NagarSathi is a voice-first, multilingual AI agent that helps Indian citizens (elderly, low-literacy, and migrant workers) complete and track government services end to end.

## Demo Persona
- **Citizen**: Ramabai (elderly citizen whose pension stopped)
- **Experience**: Sees a voice-first mic interface and speaks Marathi (`mr-IN`). NagarSathi understands her intent, captures informed consent, verifies documents, fills the government portal form strictly as a **DRAFT** (`FORM_FILLED`), asks for explicit approval (`approval.given === true`), submits (`SUBMITTED`), tracks application status, detects stalls, places a simulated follow-up call to the office, and closes the case.

## Supported Languages & Services
- **Languages**: Marathi (`mr-IN`, default), Hindi (`hi-IN`), English (`en-IN`)
- **Catalog-Driven Services**:
  1. **Pension Restoration** (Primary end-to-end demo)
  2. **Scholarship Application** (~14 fields simplified mock)
  3. **Ration Card Update**

## Monorepo Architecture (npm workspaces)

Only 4 top-level workspace packages exist in this repository:

| Folder | Package Name | Purpose |
| :--- | :--- | :--- |
| [`/frontend`](./frontend) | `@nagarsathi/frontend` | React voice-first multilingual UI, citizen views, draft review, approval gate, tracker, and admin/operator views |
| [`/backend`](./backend) | `@nagarsathi/backend` | Express API server, encrypted PII vault, session/case orchestration, mock government portal, and Playwright portal robot |
| [`/models`](./models) | `@nagarsathi/models` | AI agents, multilingual prompts, structured schemas, tool definitions, deterministic `MOCK_AI` fixtures, and evals |
| [`/database`](./database) | `@nagarsathi/database` | Database schemas, AES-256-GCM encryption helpers, seed scripts, and service catalog JSON definitions |

Cross-folder imports strictly use workspace package names (`@nagarsathi/*`), never relative paths across top-level folders.

## Module Execution Order
1. **M0**: Repository & Workspace Setup
2. **F1–F5**: Frontend (React UI with deterministic mock data)
3. **D1**: Database (Schemas, encryption, catalog JSON, seeds)
4. **B1–B4**: Backend (API, auth/vault, portal automation, voice/call orchestration)
5. **A1**: Models / AI (Claude agents, schemas, prompts, `MOCK_AI` fixtures, evals)
6. **I1**: End-to-End Integration
7. **Z1**: Final Polish & Verification

## Safety & Privacy Guarantees
- **Draft-First Submission Gate**: Portal automation only fills a draft (`FORM_FILLED`). Final submission (`SUBMITTED`) is blocked in code unless `approval.given === true`.
- **Zero-PII to LLM**: Aadhaar numbers, bank account numbers, OTPs, and passwords are never sent to the LLM. Secrets are stored encrypted at rest (`AES-256-GCM`), displayed masked (last 4 digits only), and typed directly into the portal by the backend robot.
- **Deterministic Mock Mode**: Runs completely offline/cost-free with `MOCK_AI=true` using synthetic demo fixtures.

---
*Prototype. Mock portal. Demo data only.*
