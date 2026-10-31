# NagarSathi API Contract (`@nagarsathi/frontend` ↔ `@nagarsathi/backend`)

All agent-backed and case-workflow endpoints return the standard multilingual envelope:

```json
{
  "display": "Human-readable localized string in mr-IN, hi-IN, or en-IN",
  "speech": "TTS-ready conversational spoken string in mr-IN, hi-IN, or en-IN",
  "data": { ... }
}
```

## Privacy & Safety Invariants
1. **Masked PII Only**: Aadhaar numbers (`XXXX-XXXX-4821`) and bank account numbers (`XXXXXXXX9012`) are always masked to the last 4 digits in all API responses.
2. **Draft-Only Form Filling**: `POST /api/cases/:id/fill-draft` transitions the case to `FORM_FILLED` (DRAFT) and never submits the form.
3. **Hard Approval Gate**: `POST /api/cases/:id/submit` fails with HTTP `403` (`APPROVAL_REQUIRED`) unless `approval.given === true` has been recorded via `POST /api/cases/:id/approve`.

---

## 1. Authentication

### `POST /api/auth/otp`
- **Request**: `{ phone: string, language?: "mr-IN" | "hi-IN" | "en-IN" }`
- **Response**: `{ display, speech, data: { phoneMasked: string, otpSent: true, mode: "mock" } }`

### `POST /api/auth/verify`
- **Request**: `{ phone: string, otp: string, language?: "mr-IN" | "hi-IN" | "en-IN" }`
- **Response**: `{ display, speech, data: { authenticated: true, citizen: { id, name, age, language, aadhaarMasked, bankAccountMasked } } }` (Sets `httpOnly` session cookie in backend).

---

## 2. Case Lifecycle & Intake

### `POST /api/cases` (Create case from transcript / intake)
- **Request**: `{ transcript: string, language: "mr-IN" | "hi-IN" | "en-IN" }`
- **Response**:
  ```json
  {
    "display": "...",
    "speech": "...",
    "data": {
      "caseId": "CASE-RAMABAI-001",
      "status": "INTAKE",
      "service": {
        "id": "pension_restoration",
        "name": "Old Age Pension Restoration"
      },
      "confidence": 0.96,
      "language": "mr-IN"
    }
  }
  ```

### `POST /api/cases/:id/answer`
- **Request**: `{ answer: string, fieldId?: string, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status, updatedFields, nextQuestion } }`

### `POST /api/cases/:id/confirm-service`
- **Request**: `{ serviceId: string, confirmed: boolean, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "SERVICE_CONFIRMED", serviceId, confidence } }`

### `POST /api/cases/:id/consent`
- **Request**: `{ given: boolean, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "CONSENTED", consent: { given: true, timestamp: string } } }`

### `POST /api/cases/:id/documents` (Checklist & upload)
- **Request**: `{ documents?: Array<{ docType: string, fileName?: string, verified?: boolean }>, markReady?: boolean, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "DOCS_COLLECTING" | "DOCS_READY", checklist: Array<{ id, name, status, maskedValue }> } }`

### `POST /api/cases/:id/fill-draft`
- **Request**: `{ language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "FORM_FILLED", draft: { isDraft: true, serviceId: "pension_restoration", fields: Array<{ key, label, value }> } } }`

### `POST /api/cases/:id/approve`
- **Request**: `{ given: true, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "APPROVED", approval: { given: true, timestamp: string } } }`

### `POST /api/cases/:id/submit`
- **Precondition**: `approval.given === true` (Refused otherwise).
- **Request**: `{ language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "SUBMITTED", applicationId: "PEN-2026-88213", submittedAt: string } }`

### `GET /api/cases/:id` (Case status & tracking)
- **Query**: `?language=mr-IN`
- **Response**: `{ display, speech, data: { caseId, status, applicationId: "PEN-2026-88213", approval, draft, tracking: { stage, daysElapsed, stalled, query, lastUpdated } } }`

---

## 3. Simulated Office Call (`STALLED` -> `CALLED`)

### `POST /api/cases/:id/call/start`
- **Request**: `{ language?: string }`
- **Response**: `{ display, speech, data: { caseId, callId, status: "IN_PROGRESS", turns: Array<{ speaker, text }> } }`

### `POST /api/cases/:id/call/turn`
- **Request**: `{ callId?: string, officerUtterance?: string, language?: string }`
- **Response**: `{ display, speech, data: { caseId, callId, turn: { speaker, text }, completed: boolean } }`

### `POST /api/cases/:id/call/end`
- **Request**: `{ callId?: string, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "CALLED", referenceId: "REF-5521", summary: string } }`

---

## 4. Citizen Profile & Right to Erasure

### `GET /api/profile`
- **Response**: `{ display, speech, data: { citizen: { id, name, age, language, aadhaarMasked: "XXXX-XXXX-4821", bankAccountMasked: "XXXXXXXX9012" } } }`

### `PATCH /api/profile`
- **Request**: `{ name?: string, language?: string }`
- **Response**: `{ display, speech, data: { citizen: { ... } } }`

### `DELETE /api/profile`
- **Response**: `{ display, speech, data: { deleted: true } }`

### `POST /api/profile/delete-all-my-data`
- **Response**: `{ display, speech, data: { purged: true, deletedCases: number, timestamp: string } }`

---

## 5. Official Letter Explanation

### `POST /api/letters/explain`
- **Request**: `{ text?: string, imageName?: string, language?: string }`
- **Response**: `{ display, speech, data: { sender, reason, actionRequired, deadline } }`

---

## 6. Demo Controls (Time-Skip, Query, Approve, Reset)

### `POST /api/demo/skip-days`
- **Request**: `{ caseId: string, days: number, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "STALLED", daysSkipped: number, stalled: true } }`

### `POST /api/demo/raise-query`
- **Request**: `{ caseId: string, queryText?: string, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "QUERY_RAISED", query: { code: "LIFE_CERT_PENDING", message: string } } }`

### `POST /api/demo/approve`
- **Request**: `{ caseId: string, language?: string }`
- **Response**: `{ display, speech, data: { caseId, status: "CLOSED", applicationId: "PEN-2026-88213", referenceId: "REF-5521", resolution: "PENSION_RESTORED" } }`

### `POST /api/demo/reset`
- **Request**: `{ language?: string }`
- **Response**: `{ display, speech, data: { caseId: "CASE-RAMABAI-001", status: "INTAKE", reset: true } }`

