# `@nagarsathi/database` — Three-Layer Encrypted Citizen Data & Service Catalog Engine

MongoDB + Mongoose data layer, AES-256-GCM field encryption, JSON-Schema service catalog validator, trust-ordered auto-fill engine, and cascading `"delete all my data"` privacy helper for **NagarSathi (CITY-02)**.

---

## 1. Three Data Layers Architecture

| Data Layer | Mongoose Model (`collection`) | Retention Policy | Security & Consent Policy |
| :--- | :--- | :--- | :--- |
| **Layer 1: Citizen Profile** | `Profile` (`profiles`) | Kept until citizen deletes it (only if `saveProfileConsent === true`) | Enforces `consentGiven === true` at schema validation. Encrypts Aadhaar, mobile, and bank account at rest (`AES-256-GCM`) and stores last-4 masked strings (`XXXX-XXXX-4821`, `XXXXXX3210`, `XXXXXXXX9012`). |
| **Layer 2: Document Vault** | `VaultDoc` (`vaultdocs`) | Linked to citizen vault; deleted on `"delete all my data"` | Stores encrypted document OCR/certificate metadata (`encryptedMetadata`), verification status (`VERIFIED`, `REJECTED_BLURRY`, `REJECTED_EXPIRED`), and enforces `max_age_days` (e.g., 365 days for life/income certificates). |
| **Layer 3: Application / Case** | `Case` (`cases`) | **Auto-deletes after 30 days** via MongoDB TTL index (`expireAfterSeconds: 2592000`) | Tracks the 16-step citizen journey (`LANGUAGE_SELECTED` -> `CLOSED`), enforces **Gate 1 (`consent.caseConsent === true`)** and **Gate 2 (`approval.given === true`)** before `SUBMITTED`, and stores `appId` (`PEN-2026-88213`) and `refNo` (`REF-5521`). |

Supporting collections:
- **`User` (`users`)**: Citizen phone (unique index), masked phone, chosen language (`mr-IN` default, `hi-IN`, `en-IN`), and role (`citizen`).
- **`AuditLog` (`auditlogs`)**: Immutable audit trail (`actor`, `action`, `caseId`, `timestamp`, `maskedPayload`). Automatically scrubs Aadhaar, mobile, bank account, OTP, and password fields before persistence.
- **`ServiceCatalog` (`servicecatalogs`)**: Synced from validated `/database/catalog/*.json` definitions.

---

## 2. Auto-Fill Priority Rule

Implemented in `src/autofill.js` (`autoFillDraftFields`):

Fields are populated strictly from higher-trust sources first so the citizen is only asked (`ASK_CITIZEN`) for what is genuinely missing:

1. **`PROFILE`** — Verified citizen profile attributes (e.g., `full_name`, `dob`, `gender`, `mobile`, `address`, `district`, `caste_category`).
2. **`DOCUMENT`** — Verified `VaultDoc` metadata from the Document Vault (e.g., `aadhaar_masked`, `bank_account_masked`, `ifsc`, `life_certificate_id`, `annual_family_income`, `previous_year_marks_pct`).
3. **`DERIVED`** — Computed automatically from higher-trust fields (e.g., `age_years` derived from `dob`; `card_category` derived from `annual_family_income`).
4. **`DEFAULT`** — Service catalog default values (e.g., `disbursement_mode = "DBT_BANK_TRANSFER"`).
5. **`ASK_CITIZEN`** — Prompted in the citizen's language only when not resolved by layers 1–4 (e.g., `pension_subtype`, `course_name`, `institute_name`, `family_members_count`).
6. **`PORTAL_GENERATED`** — Populated after portal submission (e.g., `application_id = "PEN-2026-88213"`).

---

## 3. Service Catalog JSONs (`/database/catalog/`)

Validated by `src/validator.js` against `/database/catalog/schema.json`:
- **`pension.json`**: Indira Gandhi National Old Age / Widow Pension Scheme (`IGNOAPS-MH-01`). Includes `life_certificate` (`max_age_days: 365`) and conditional `death_certificate_husband` (`required_if: { field: "pension_subtype", operator: "equals", value: "widow_pension" }`).
- **`scholarship.json`**: Post-Matric Scholarship Scheme (`MAHADBT-SCH-02`) with 14 fields (`full_name`, `dob`, `gender`, `aadhaar_masked`, `mobile`, `address`, `district`, `caste_category`, `annual_family_income`, `course_name`, `institute_name`, `previous_year_marks_pct`, `bank_account_masked`, `ifsc`), `income_certificate` (`max_age_days: 365`), and conditional `caste_certificate` (`required_if: { field: "caste_category", operator: "not_equals", value: "General" }`).
- **`ration_card.json`**: New / Modification Ration Card (`FCS-RC-MH-03`) with `address_proof` (`max_age_days: 90`) and conditional `income_certificate` (`max_age_days: 365`).

Each catalog also defines:
- `portal`: `{ start_path, pages[].fields[{ key, selector, source }], uploads, submit_selector, result_selector }`
- `tracking`: `{ stall_after_days: 7, check_every_hours }`
- `office_call`: `{ department, may_say: ["application_id", "name"], never_say: ["aadhaar", "otp", "password", "account_number"] }`

---

## 4. Commands

From the repository root (`NagarSathi/`):

```bash
# Run ESLint on /database
npm run lint --workspace=@nagarsathi/database

# Run Vitest unit tests (catalogs, seed, TTL index, encryption, auto-fill, cascading delete)
npm run test --workspace=@nagarsathi/database

# Validate catalogs and Mongoose models
npm run build --workspace=@nagarsathi/database

# Run the seed CLI (connects to MONGODB_URI if set, or Mongoose memory store)
npm run seed --workspace=@nagarsathi/database
```
