# NagarSathi AI Citizen Assistant — Model & Architecture Summary

## 1. Architectural Overview & System Level

**Classification**: Level 3 Semi-Autonomous GovTech Agent with Deterministic Human-Guarded Safety Gates.

NagarSathi bridges marginalized and digitally illiterate citizens to state and central government services using a voice-first, multilingual multimodal architecture. Rather than giving the AI model unconstrained autonomous agency to submit official legal applications, NagarSathi operates under a dual-tier state machine:
- **Generative AI Layer**: Conversational inquiry, speech understanding, multilingual transcription, document classification, field auto-fill suggestions, and plain-language explanation of complex official letters.
- **Deterministic State Machine Layer**: Strictly governed state transitions (`INTAKE -> SERVICE_CONFIRMED -> CONSENTED -> DOCS_READY -> FORM_FILLED -> APPROVED -> SUBMITTED -> TRACKING -> CLOSED`) with physical guard requirements.

---

## 2. Capabilities & Supported Domains

NagarSathi supports end-to-end guidance across core citizen welfare domains:

| Domain | Key Supported Services | Verification Desk / Authority | SLA Timeline |
|---|---|---|---|
| **Education & Scholarships** | MahaDBT / MPTASS Post-Matric Scholarship, Tuition & Examination Fee Waiver, Hosteller Maintenance Allowance | College / Institute Verification Desk (Principal & Nodal Officer Committee) | 7 to 14 working days |
| **Revenue & Domicile** | Tahsildar Income Certificate (उत्पन्नाचा दाखला), Domicile & Nationality Certificate, Caste Certificate | District Revenue & Tahsildar Portal (Talathi & Circle Revenue Officer) | 7 to 14 working days |
| **Food & Civil Supplies** | National Food Security Card (NFSA Ration Card), Member Addition, Fair Price Shop Portability | Zonal Supply Officer & Fair Price Shop Inspector | 7 to 14 working days |
| **Social Welfare & Pension** | Indira Gandhi / Sanjay Gandhi Niradhar Old Age Pension, Disability Pension, Digital Life Certificate (Jeevan Pramaan) | Taluka Social Welfare Office Pension Cell | 7 to 14 working days |
| **Health & Housing** | Ayushman Bharat PM-JAY (Golden Card), Pradhan Mantri Awas Yojana (PMAY Housing Subsidy) | National Health Authority / Municipal Housing Cell | 3 to 30 working days |
| **Employment** | MGNREGA 100-Day Guaranteed Rural Employment Job Card | Gram Panchayat / Block Development Officer | 7 to 15 working days |

### Comprehensive AI Voice Capabilities
1. **Multilingual Speech-to-Text & Text-to-Speech**: Native BCP-47 speech recognition and synthesized voice playback in Marathi (`mr-IN`), Hindi (`hi-IN`), and Indian English (`en-IN`) at citizen-friendly pacing (rate: `0.85x`).
2. **Context-Aware Recommendations**: Follow-up suggestion chips match strictly the active conversation topic (e.g. asking about Income Certificate displays only Income Certificate application, documents, and Talathi verification chips, never unrelated pension prompts).
3. **Spoken Voice Commands**: Real-time voice control supporting:
   - `Haan` / `Ho` / `Yes`: Advance or confirm
   - `Nahi` / `No`: Cancel or decline
   - `Dobara bolo` / `Repeat`: Replay last answer at standard speed (0.85x)
   - `Dheere bolo` / `Slower`: Replay audio at reduced speed (0.65x)
   - `Ruko` / `Stop`: Immediate audio halt and silence
   - `Madad` / `Help`: Immediate navigation to Madad Kendra Help Center
4. **Automated Document Vault Integration**: Checks citizen vault documents in real-time, telling the citizen which documents are already verified and which are required.

---

## 3. Safety Guards & Regulatory Compliance

### 3.1. Safety Gate 1: Informed Citizen Consent (DPDP Act Compliance)
- In accordance with the Digital Personal Data Protection (DPDP) Act, no citizen data is stored or processed without an explicit checkbox confirmation (`caseConsent: true`).
- Profile saving for 80% auto-fill across future services requires separate informed consent (`saveProfileConsent: true`).

### 3.2. Safety Gate 2: Physical Approval Guard
- **Strict Rule**: Voice alone is **never** permitted to submit an official government application.
- State machine transition `FORM_FILLED -> APPROVED -> SUBMITTED` strictly blocks and raises `APPROVAL_REQUIRED` unless the citizen confirms by physical button press (`approval.given === true` and `byPhysicalButton === true`).

### 3.3. Document Format & Checksum Verification
- **Aadhaar Card**: 12-digit numeric validation combined with the **Verhoeff $D_5$ dihedral group mathematical checksum algorithm** (`validateVerhoeff`).
- **PAN Card**: Validated against Income Tax format `^[A-Z]{5}[0-9]{4}[A-Z]$`.
- **Other Certificates**: Automatically maintained as neutral `Unverified` until official authority review (no fake automated certifications).

### 3.4. Privacy & Masking
- All sensitive identifiers are encrypted using AES-256-GCM.
- Identifiers are masked across all UI surfaces and LLM payloads (`XXXX-XXXX-4821`, `ABCDE****F`, `XXXXXXXX9012`).
- Critical identity fields (Aadhaar, PAN, Verified Citizen Name, DOB) are locked in profile to prevent unauthorized alterations; residential address, district, and phone remain editable.

---

## 4. Limitations & Real-World Risks

1. **Client-Side Validation vs Official Provider Verification**:
   - The current Verhoeff checksum algorithm and regex validation verify mathematical accuracy, structure, and typos.
   - *Limitation*: They do not establish whether an Aadhaar or PAN is actively registered with UIDAI or NSDL.
   - *Remediation*: In production, official UIDAI eKYC / NSDL provider APIs must be hooked into `verifyDocumentWithOfficialProvider()` in `frontend/src/utils/verifyDocument.js`.
2. **Browser Speech Recognition (Web Speech API)**:
   - STT relies on the browser's `SpeechRecognition` implementation (Google Speech Engine in Chrome/Edge).
   - On offline or network-constrained desktop environments, Chrome may fire transient `network` errors.
   - *Mitigation*: The app provides seamless text fallbacks, prominent keyboard inputs, and preset quick prompts.
3. **Dynamic Portal Form Variations**:
   - State portals frequently alter input fields, captcha schemes, and session cookies.
   - *Mitigation*: NagarSathi acts as an intelligent assistive pre-fill layer; final review is always confirmed by the citizen at Gate 2.

---

## 5. Production Roadmap

1. **UIDAI eKYC & NSDL API Provider Hook**:
   - Plug Aadhaar OTP / Biometric authentication into `verifyDocumentWithOfficialProvider()`.
2. **DigiLocker OAuth2 / API Gateway**:
   - Direct citizen-authorized pull of verified certificates (Income, Domicile, Marksheets) from DigiLocker repository.
3. **Telephony & IVR Integration**:
   - Deploy Twilio / Exotel Asterisk telephony connector for citizens dialing toll-free numbers from feature phones.
4. **State Portal Webhook Automation**:
   - Real-time webhook bidirectional sync with Aaple Sarkar, MahaDBT, MPTASS, and UMANG APIs.

