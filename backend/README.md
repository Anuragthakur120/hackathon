# `@nagarsathi/backend` — Express API Server, Citizen Auth, Privacy & Audit Engine

Node.js + Express backend for **NagarSathi (CITY-02)** integrated with `@nagarsathi/database`.

---

## 1. Module B1 Features

1. **Phone + OTP Auth & `httpOnly` JWT Cookie (`src/auth.js`, `src/routes/coreRoutes.js`)**:
   - `POST /auth/otp` (and `/api/auth/otp`): Issues OTP (`MOCK_OTP=123456` when `OTP_MODE=mock`).
   - `POST /auth/verify` (and `/api/auth/verify`): Verifies OTP, creates/loads the `User` (`role: 'citizen'`), signs an `HS256` JWT with `JWT_SECRET`, and sets it in an `httpOnly` cookie (`ns_token`).
   - **Strict Citizen Ownership Isolation (`requireCitizenAuth`, `assertSameCitizen`)**: Citizens can only access their own `/profile`, `/vault`, and `/cases` records; cross-user requests are rejected with HTTP `403 CROSS_USER_ACCESS_DENIED`.

2. **Privacy & Encryption Helpers (`src/privacy.js`)**:
   - Masks Aadhaar (`XXXX-XXXX-4821`), mobile (`XXXXXX3210`), and bank account (`XXXXXXXX9012`) numbers to the last 4 digits across logs and API responses.
   - `encryptWithEnvKey` / `decryptWithEnvKey`: `AES-256-GCM` encryption using `ENCRYPTION_KEY`.
   - `maskForLlm`: Scrubs raw Aadhaar, phone, and bank account numbers from free text and structured objects before any LLM call so full Aadhaar is never sent to the LLM.
   - `createRequestLogger`: Request logging middleware that masks body and query parameters.

3. **Background Audit Log Middleware (`src/auditMiddleware.js`)**:
   - Asynchronously writes `AuditLog` entries (`actor`, `action`, `caseId`, `userId`, `timestamp`, `maskedPayload`) in the background via `setImmediate` so audit logging never blocks or appears as a visible citizen step.

4. **Core Routes (`src/routes/coreRoutes.js`)**:
   - `GET /health`
   - `POST /auth/otp`, `POST /auth/verify`, `POST /auth/logout`
   - `GET /profile/:userId?`, `POST /profile`, `PATCH /profile/:userId?`, `DELETE /profile`, `POST /profile/delete-all-my-data` (enforces `consentGiven === true`)
   - `GET /vault/:userId?`, `POST /vault` (encrypts uploaded document metadata at rest)
   - `GET /services`, `GET /services/:serviceId`
   - `GET /cases/:caseId`
   - Mounted at both `/` and `/api`.
