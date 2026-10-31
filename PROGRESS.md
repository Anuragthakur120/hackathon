# NagarSathi (CITY-02) — Progress Log

This file tracks module-by-module progress, verification checklists, architectural decisions, and known limitations.

---

## Module M0: Repo Setup

### Verification Checklist (M0)
- [x] **All M0 checks & push**: PASS (`6b0de58`, tag `M0-passed`)

---

## Module F1: Frontend Shell + Language + Mock Layer

### Verification Checklist (F1)
- [x] **All F1 checks, UI screenshot & push**: PASS (`87b445b`, tag `F1-passed`)

---

## Module F2: Core Journey Screens (Steps 1–10, No Voice)

### Verification Checklist (F2)
- [x] **All F2 checks, UI screenshot & push**: PASS (`a058aba`, tag `F2-passed`)

---

## Module F3: Voice Assistant Layer

### Verification Checklist (F3)
- [x] **All F3 checks, UI screenshot & push**: PASS (`7164993`, tag `F3-passed`)

---

## Module F4: Tracking, Query, Time-Skip, Call, Help Centre & Letter Explainer UI (Steps 11–16)

### Verification Checklist (F4)
- [x] **All F4 checks, UI screenshot & push**: PASS (`1db4f8f`, tag `F4-passed`)

---

## Module F5: Frontend Final Check & Hardening

### Verification Checklist (F5)
- [x] **All F5 checks, UI screenshots & push**: PASS (`619ea57`, tag `F5-passed`)

---

## Module D1: Database (MongoDB + Mongoose, 3 Data Layers, Catalog JSONs, Auto-Fill & Seed)

### What Was Built
- **Mongoose Models & Schemas (`database/src/models/index.js`)**:
  - `User` (`phone` unique, `phoneMasked`, `language` default `mr-IN`, `role` default `citizen`).
  - **Layer 1 — `Profile`**: Saved only when `consentGiven === true`; sensitive fields (`aadhaarEncrypted`, `mobileEncrypted`, `bankAccountEncrypted`) encrypted at rest with `AES-256-GCM` (`database/src/crypto.js`) and paired with last-4 masked strings (`XXXX-XXXX-4821`, `XXXXXX3210`, `XXXXXXXX9012`).
  - **Layer 2 — `VaultDoc`**: Encrypted document metadata (`encryptedMetadata`), `type`, `status`, `issuedAt`, `maxAgeDays`, `uploadedAt`.
  - **Layer 3 — `Case`**: 16-step statuses (`CASE_16_STEP_STATUSES`), `history[]`, `consent{caseConsent, saveProfileConsent}`, `approval{given, at, byPhysicalButton}` (enforcing Gate 1 & Gate 2 before `SUBMITTED`), `draftFields[]`, `appId`, `refNo`, `queryDetails`, `stallDetails`, `nextCheckAt`, and **30-day TTL index** (`expireAfterSeconds: 2592000` on `createdAt`).
  - `AuditLog`: `actor`, `action`, `caseId`, `timestamp`, and automatically scrubbed `maskedPayload`.
  - `ServiceCatalog`: Persisted service catalog definitions.
- **Service Catalog JSONs & Validator (`database/catalog/*.json`, `database/src/validator.js`)**:
  - `pension.json`, `scholarship.json` (14 fields), and `ration_card.json` with multilingual labels (`mr`/`hi`/`en`), `source` tags (`PROFILE`, `DOCUMENT`, `ASK_CITIZEN`, `DERIVED`, `DEFAULT`, `PORTAL_GENERATED`), `sensitive` flags, `required_if` conditional documents, `max_age_days` expiry rules, `portal` selectors, `tracking` (`stall_after_days: 7`), and `office_call` (`may_say` / `never_say`).
- **Auto-Fill Engine (`database/src/autofill.js`)**:
  - Populates fields from higher-trust sources first (`PROFILE` -> `DOCUMENT` -> `DERIVED` -> `DEFAULT` -> `ASK_CITIZEN`) and evaluates `required_if` and `max_age_days`.
- **Seed Script & Cascading Delete (`database/src/seed.js`, `database/src/deleteAllData.js`)**:
  - Seeds demo citizen Ramabai Kulkarni, her encrypted Profile and VaultDocs, the 3 service catalogs, and `CASE-DEMO-001` (`PEN-2026-88213`, `REF-5521`) with Day-10 query and +21-day stall triggers.
  - `deleteAllCitizenData(userId)` removes records across all 3 data layers (`Profile`, `VaultDoc`, `Case`, `User`) and logs an anonymized `AuditLog` entry.

### Verification Checklist (D1)
- [x] **Install dependencies (`npm install`)**: PASS
- [x] **Lint all workspaces (`npm run lint`)**: PASS (`eslint src --max-warnings=0`)
- [x] **Regression (F1–F5) + D1 unit tests (`npm run test`)**: PASS (22 frontend tests + 5 database tests = 27/27 passed)
- [x] **Build & catalog validation (`npm run build`)**: PASS
- [x] **Secret scan (`npm run scan:secrets`)**: PASS
