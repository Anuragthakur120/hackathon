import express from 'express';

const DEFAULT_APP_ID_BY_SERVICE = Object.freeze({
  pension: 'PEN-2026-88213',
  scholarship: 'SCH-2026-88213',
  ration_card: 'RAT-2026-88213',
});

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Creates the standalone Mock Government Portal Express app (PORTAL_PORT=4000).
 * Server-rendered simple HTML (no React) with realistic messiness:
 *   - Dropdowns (<select>), confirm checkbox (#chk-confirm-declaration), optional ?slow=1 delay
 *   - Selectors matching D1 catalog `portal` blocks for pension (3 pages),
 *     scholarship (1 sectioned page), and ration_card (1 page)
 *   - Admin endpoints (only when DEMO_MODE=true): advance clock by N days,
 *     transition status (Pending -> Under review -> Query raised -> Approved),
 *     raise query, approve, set FAIL / broken selector, and reset.
 */
export function createMockPortalApp({ slowDelayMs = 20 } = {}) {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const state = {
    clockOffsetDays: 0,
    failRemaining: 0,
    alwaysFail: false,
    brokenSelectors: {}, // e.g. { '#input-full-name': '#broken-selector-xyz' }
    sessions: new Set(),
    drafts: new Map(), // key: caseId or service -> draft object
    applications: new Map(), // key: appId -> application object
  };

  app.locals.portalState = state;

  function resolveId(normalId) {
    const selector = `#${normalId}`;
    if (state.brokenSelectors && state.brokenSelectors[selector]) {
      return state.brokenSelectors[selector].replace(/^#/, '');
    }
    return normalId;
  }

  function computeDaysSinceLastAction(appRecord) {
    if (!appRecord) return 0;
    return Math.max(0, state.clockOffsetDays - (appRecord.lastActionDay || 0));
  }

  // Optional ?slow=1 artificial latency + simulated portal failure middleware
  app.use(async (req, res, next) => {
    if (req.query?.slow === '1') {
      await new Promise((r) => setTimeout(r, slowDelayMs));
    }

    if (req.path.startsWith('/portal/admin')) {
      return next();
    }

    if (state.alwaysFail) {
      return res
        .status(503)
        .send('<html><body><h1 id="portal-error">503 Portal Temporarily Unavailable</h1></body></html>');
    }
    if (state.failRemaining > 0) {
      state.failRemaining -= 1;
      return res
        .status(503)
        .send('<html><body><h1 id="portal-error">503 Portal Gateway Timeout</h1></body></html>');
    }
    return next();
  });

  // ==========================================================================
  // 1. Portal Login & Dashboard
  // ==========================================================================
  app.get('/portal/login', (_req, res) => {
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>MahaGov Citizen Portal - Login</title></head>
<body>
  <h1>MahaGov e-Seva Portal Login</h1>
  <form id="form-portal-login" method="POST" action="/portal/login">
    <label>Operator / Citizen ID:
      <input id="input-portal-user" name="username" type="text" value="citizen_ramabai" />
    </label>
    <label>Password / PIN:
      <input id="input-portal-pass" name="password" type="password" value="portal123" />
    </label>
    <button id="btn-portal-login" type="submit">Login to Portal</button>
  </form>
</body>
</html>`);
  });

  app.post('/portal/login', (req, res) => {
    const user = req.body?.username || 'citizen_ramabai';
    state.sessions.add(user);
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>MahaGov Portal Dashboard</title></head>
<body>
  <h1 id="portal-dashboard-heading">Welcome, ${escapeHtml(user)}</h1>
  <nav id="portal-new-applications">
    <a id="link-new-pension" href="/portal/pension/apply">New Application: Old Age / Widow Pension</a>
    <a id="link-new-scholarship" href="/portal/scholarship/apply">New Application: Post-Matric Scholarship</a>
    <a id="link-new-ration" href="/portal/ration-card/apply">New Application: Ration Card</a>
  </nav>
</body>
</html>`);
  });

  app.get('/portal', (_req, res) => {
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>MahaGov e-Seva Portal</title></head>
<body>
  <h1>MahaGov e-Seva Portal — New Application</h1>
  <ul>
    <li><a id="link-new-pension" href="/portal/pension/apply">Indira Gandhi Old Age / Widow Pension</a></li>
    <li><a id="link-new-scholarship" href="/portal/scholarship/apply">Post-Matric Scholarship</a></li>
    <li><a id="link-new-ration" href="/portal/ration-card/apply">Ration Card Service</a></li>
  </ul>
</body>
</html>`);
  });

  // ==========================================================================
  // 2. Service 1: Pension Application (3 Pages: page=1, page=2, page=3)
  // ==========================================================================
  app.get('/portal/pension/apply', (req, res) => {
    const pageNum = Number(req.query?.page || 1);
    const caseId = req.query?.caseId || 'default-pension';
    const draft = state.drafts.get(caseId) || { fields: {}, uploads: {} };
    const f = draft.fields || {};

    if (pageNum === 1) {
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Pension Application - Page 1 (Applicant Details)</title></head>
<body>
  <h1>Indira Gandhi National Old Age / Widow Pension — Page 1 of 3</h1>
  <form id="form-pension-page-1" method="POST" action="/portal/pension/apply?page=1&caseId=${escapeHtml(caseId)}">
    <label>Full Name:
      <input id="${resolveId('input-full-name')}" data-field-key="full_name" name="full_name" type="text" value="${escapeHtml(f.full_name)}" />
    </label>
    <label>Date of Birth:
      <input id="${resolveId('input-dob')}" data-field-key="dob" name="dob" type="date" value="${escapeHtml(f.dob)}" />
    </label>
    <label>Age (Years):
      <input id="${resolveId('input-age-years')}" data-field-key="age_years" name="age_years" type="number" value="${escapeHtml(f.age_years)}" />
    </label>
    <label>Gender:
      <select id="${resolveId('select-gender')}" data-field-key="gender" name="gender">
        <option value="Female" ${f.gender === 'Female' ? 'selected' : ''}>Female</option>
        <option value="Male" ${f.gender === 'Male' ? 'selected' : ''}>Male</option>
        <option value="Other" ${f.gender === 'Other' ? 'selected' : ''}>Other</option>
      </select>
    </label>
    <label>Pension Subtype:
      <select id="${resolveId('select-pension-subtype')}" data-field-key="pension_subtype" name="pension_subtype">
        <option value="old_age_pension" ${f.pension_subtype === 'old_age_pension' ? 'selected' : ''}>old_age_pension</option>
        <option value="widow_pension" ${f.pension_subtype === 'widow_pension' ? 'selected' : ''}>widow_pension</option>
      </select>
    </label>
    <label>Aadhaar (Masked):
      <input id="${resolveId('input-aadhaar')}" data-field-key="aadhaar_masked" name="aadhaar_masked" type="text" value="${escapeHtml(f.aadhaar_masked)}" />
    </label>
    <label>Mobile Number:
      <input id="${resolveId('input-mobile')}" data-field-key="mobile" name="mobile" type="text" value="${escapeHtml(f.mobile)}" />
    </label>
    <label>Residential Address:
      <textarea id="${resolveId('textarea-address')}" data-field-key="address" name="address">${escapeHtml(f.address)}</textarea>
    </label>
    <label>District:
      <select id="${resolveId('select-district')}" data-field-key="district" name="district">
        <option value="Pune" ${f.district === 'Pune' ? 'selected' : ''}>Pune</option>
        <option value="Mumbai" ${f.district === 'Mumbai' ? 'selected' : ''}>Mumbai</option>
        <option value="Nagpur" ${f.district === 'Nagpur' ? 'selected' : ''}>Nagpur</option>
      </select>
    </label>
    <button id="${resolveId('btn-next-bank')}" type="submit" name="nav" value="page2">Next: Bank Details</button>
  </form>
</body>
</html>`);
    }

    if (pageNum === 2) {
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Pension Application - Page 2 (Bank & Life Certificate)</title></head>
<body>
  <h1>Indira Gandhi National Old Age / Widow Pension — Page 2 of 3</h1>
  <form id="form-pension-page-2" method="POST" action="/portal/pension/apply?page=2&caseId=${escapeHtml(caseId)}">
    <label>Bank Account Number (Masked):
      <input id="${resolveId('input-bank-account')}" data-field-key="bank_account_masked" name="bank_account_masked" type="text" value="${escapeHtml(f.bank_account_masked)}" />
    </label>
    <label>IFSC Code:
      <input id="${resolveId('input-ifsc')}" data-field-key="ifsc" name="ifsc" type="text" value="${escapeHtml(f.ifsc)}" />
    </label>
    <label>Life Certificate ID:
      <input id="${resolveId('input-life-cert-id')}" data-field-key="life_certificate_id" name="life_certificate_id" type="text" value="${escapeHtml(f.life_certificate_id)}" />
    </label>
    <label>Disbursement Mode:
      <select id="${resolveId('select-disbursement-mode')}" data-field-key="disbursement_mode" name="disbursement_mode">
        <option value="DBT_BANK_TRANSFER" ${f.disbursement_mode === 'DBT_BANK_TRANSFER' ? 'selected' : ''}>DBT_BANK_TRANSFER</option>
        <option value="POST_OFFICE" ${f.disbursement_mode === 'POST_OFFICE' ? 'selected' : ''}>POST_OFFICE</option>
      </select>
    </label>
    <button id="btn-next-uploads" type="submit" name="nav" value="page3">Next: Uploads & Review</button>
  </form>
</body>
</html>`);
    }

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Pension Application - Page 3 (Uploads, Review & Submit)</title></head>
<body>
  <h1>Indira Gandhi National Old Age / Widow Pension — Page 3 of 3 (Review & Submit)</h1>
  <form id="form-pension-page-3" method="POST" action="/portal/pension/apply?page=3&caseId=${escapeHtml(caseId)}">
    <fieldset>
      <legend>Document Uploads</legend>
      <input id="${resolveId('upload-aadhaar')}" name="aadhaar_card" type="file" />
      <input id="${resolveId('upload-age-proof')}" name="age_proof" type="file" />
      <input id="${resolveId('upload-bank-passbook')}" name="bank_passbook" type="file" />
      <input id="${resolveId('upload-life-certificate')}" name="life_certificate" type="file" />
      <input id="${resolveId('upload-death-certificate')}" name="death_certificate_husband" type="file" />
    </fieldset>
    <div id="review-summary">
      <p>Applicant: <strong id="review-full-name">${escapeHtml(f.full_name)}</strong></p>
      <p>Aadhaar: <strong id="review-aadhaar">${escapeHtml(f.aadhaar_masked)}</strong></p>
      <p>Bank Account: <strong id="review-bank">${escapeHtml(f.bank_account_masked)}</strong></p>
    </div>
    <label>
      <input id="chk-confirm-declaration" name="confirm_declaration" type="checkbox" value="yes" />
      I hereby declare that the above particulars are true and verified.
    </label>
    <button id="btn-save-draft" type="submit" name="action" value="draft">Save as Draft</button>
    <button id="${resolveId('btn-submit-pension-application')}" type="submit" name="action" value="submit">Submit Pension Application</button>
  </form>
</body>
</html>`);
  });

  // ==========================================================================
  // 3. Service 2: Scholarship Application (One Sectioned Page)
  // ==========================================================================
  app.get('/portal/scholarship/apply', (req, res) => {
    const caseId = req.query?.caseId || 'default-scholarship';
    const draft = state.drafts.get(caseId) || { fields: {}, uploads: {} };
    const f = draft.fields || {};

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Post-Matric Scholarship Application (Sectioned Page)</title></head>
<body>
  <h1>MahaDBT Post-Matric Scholarship Scheme</h1>
  <form id="form-scholarship" method="POST" action="/portal/scholarship/apply?caseId=${escapeHtml(caseId)}">
    <section id="section-student-personal">
      <h2>Section 1: Student Personal & Category Details</h2>
      <input id="${resolveId('input-full-name')}" data-field-key="full_name" name="full_name" type="text" value="${escapeHtml(f.full_name)}" />
      <input id="${resolveId('input-dob')}" data-field-key="dob" name="dob" type="date" value="${escapeHtml(f.dob)}" />
      <select id="${resolveId('select-gender')}" data-field-key="gender" name="gender">
        <option value="Female" ${f.gender === 'Female' ? 'selected' : ''}>Female</option>
        <option value="Male" ${f.gender === 'Male' ? 'selected' : ''}>Male</option>
        <option value="Other" ${f.gender === 'Other' ? 'selected' : ''}>Other</option>
      </select>
      <input id="${resolveId('input-aadhaar')}" data-field-key="aadhaar_masked" name="aadhaar_masked" type="text" value="${escapeHtml(f.aadhaar_masked)}" />
      <input id="${resolveId('input-mobile')}" data-field-key="mobile" name="mobile" type="text" value="${escapeHtml(f.mobile)}" />
      <textarea id="${resolveId('textarea-address')}" data-field-key="address" name="address">${escapeHtml(f.address)}</textarea>
      <select id="${resolveId('select-district')}" data-field-key="district" name="district">
        <option value="Pune" ${f.district === 'Pune' ? 'selected' : ''}>Pune</option>
        <option value="Mumbai" ${f.district === 'Mumbai' ? 'selected' : ''}>Mumbai</option>
      </select>
      <select id="${resolveId('select-caste-category')}" data-field-key="caste_category" name="caste_category">
        <option value="General" ${f.caste_category === 'General' ? 'selected' : ''}>General</option>
        <option value="OBC" ${f.caste_category === 'OBC' ? 'selected' : ''}>OBC</option>
        <option value="SC" ${f.caste_category === 'SC' ? 'selected' : ''}>SC</option>
        <option value="ST" ${f.caste_category === 'ST' ? 'selected' : ''}>ST</option>
      </select>
      <input id="${resolveId('input-annual-income')}" data-field-key="annual_family_income" name="annual_family_income" type="number" value="${escapeHtml(f.annual_family_income)}" />
      <button id="${resolveId('btn-next-academic')}" type="button">Continue to Section 2: Academic Details</button>
    </section>

    <section id="section-academic-and-bank">
      <h2>Section 2: Academic & Bank Details</h2>
      <input id="${resolveId('input-course-name')}" data-field-key="course_name" name="course_name" type="text" value="${escapeHtml(f.course_name)}" />
      <input id="${resolveId('input-institute-name')}" data-field-key="institute_name" name="institute_name" type="text" value="${escapeHtml(f.institute_name)}" />
      <input id="${resolveId('input-marks-pct')}" data-field-key="previous_year_marks_pct" name="previous_year_marks_pct" type="number" value="${escapeHtml(f.previous_year_marks_pct)}" />
      <input id="${resolveId('input-bank-account')}" data-field-key="bank_account_masked" name="bank_account_masked" type="text" value="${escapeHtml(f.bank_account_masked)}" />
      <input id="${resolveId('input-ifsc')}" data-field-key="ifsc" name="ifsc" type="text" value="${escapeHtml(f.ifsc)}" />
    </section>

    <section id="section-uploads-and-submit">
      <h2>Section 3: Document Uploads & Declaration</h2>
      <input id="${resolveId('upload-aadhaar')}" name="aadhaar_card" type="file" />
      <input id="${resolveId('upload-income-certificate')}" name="income_certificate" type="file" />
      <input id="${resolveId('upload-caste-certificate')}" name="caste_certificate" type="file" />
      <input id="${resolveId('upload-marksheet')}" name="marksheet" type="file" />
      <input id="${resolveId('upload-bank-passbook')}" name="bank_passbook" type="file" />
      <label>
        <input id="chk-confirm-declaration" name="confirm_declaration" type="checkbox" value="yes" />
        I confirm that all 14 scholarship fields and documents are accurate.
      </label>
      <button id="btn-save-draft" type="submit" name="action" value="draft">Save as Draft</button>
      <button id="${resolveId('btn-submit-scholarship-application')}" type="submit" name="action" value="submit">Submit Scholarship Application</button>
    </section>
  </form>
</body>
</html>`);
  });

  // ==========================================================================
  // 4. Service 3: Ration Card Application (Single Page)
  // ==========================================================================
  app.get('/portal/ration-card/apply', (req, res) => {
    const caseId = req.query?.caseId || 'default-ration';
    const draft = state.drafts.get(caseId) || { fields: {}, uploads: {} };
    const f = draft.fields || {};

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Ration Card Application (Single Page)</title></head>
<body>
  <h1>Food & Civil Supplies — Ration Card Application</h1>
  <form id="form-ration-card" method="POST" action="/portal/ration-card/apply?caseId=${escapeHtml(caseId)}">
    <input id="${resolveId('input-hof-name')}" data-field-key="head_of_family_name" name="head_of_family_name" type="text" value="${escapeHtml(f.head_of_family_name)}" />
    <input id="${resolveId('input-dob')}" data-field-key="dob" name="dob" type="date" value="${escapeHtml(f.dob)}" />
    <select id="${resolveId('select-gender')}" data-field-key="gender" name="gender">
      <option value="Female" ${f.gender === 'Female' ? 'selected' : ''}>Female</option>
      <option value="Male" ${f.gender === 'Male' ? 'selected' : ''}>Male</option>
    </select>
    <input id="${resolveId('input-aadhaar')}" data-field-key="aadhaar_masked" name="aadhaar_masked" type="text" value="${escapeHtml(f.aadhaar_masked)}" />
    <input id="${resolveId('input-mobile')}" data-field-key="mobile" name="mobile" type="text" value="${escapeHtml(f.mobile)}" />
    <textarea id="${resolveId('textarea-address')}" data-field-key="address" name="address">${escapeHtml(f.address)}</textarea>
    <select id="${resolveId('select-district')}" data-field-key="district" name="district">
      <option value="Pune" ${f.district === 'Pune' ? 'selected' : ''}>Pune</option>
      <option value="Mumbai" ${f.district === 'Mumbai' ? 'selected' : ''}>Mumbai</option>
    </select>
    <input id="${resolveId('input-members-count')}" data-field-key="family_members_count" name="family_members_count" type="number" value="${escapeHtml(f.family_members_count)}" />
    <input id="${resolveId('input-annual-income')}" data-field-key="annual_family_income" name="annual_family_income" type="number" value="${escapeHtml(f.annual_family_income)}" />
    <select id="${resolveId('select-card-category')}" data-field-key="card_category" name="card_category">
      <option value="PHH" ${f.card_category === 'PHH' ? 'selected' : ''}>PHH</option>
      <option value="AAY" ${f.card_category === 'AAY' ? 'selected' : ''}>AAY</option>
      <option value="NPHH" ${f.card_category === 'NPHH' ? 'selected' : ''}>NPHH</option>
    </select>
    <select id="${resolveId('select-delivery-mode')}" data-field-key="delivery_mode" name="delivery_mode">
      <option value="E_RATION_CARD_AND_POST" ${f.delivery_mode === 'E_RATION_CARD_AND_POST' ? 'selected' : ''}>E_RATION_CARD_AND_POST</option>
    </select>
    <input id="${resolveId('upload-aadhaar')}" name="aadhaar_card" type="file" />
    <input id="${resolveId('upload-address-proof')}" name="address_proof" type="file" />
    <input id="${resolveId('upload-income-certificate')}" name="income_certificate" type="file" />
    <label>
      <input id="chk-confirm-declaration" name="confirm_declaration" type="checkbox" value="yes" />
      I confirm the household details above.
    </label>
    <button id="btn-save-draft" type="submit" name="action" value="draft">Save as Draft</button>
    <button id="${resolveId('btn-submit-ration-application')}" type="submit" name="action" value="submit">Submit Ration Card Application</button>
  </form>
</body>
</html>`);
  });

  // ==========================================================================
  // 5. Shared Form Handler for Draft Save & Final Submit across all 3 services
  // ==========================================================================
  function handlePortalFormPost(serviceId) {
    return (req, res) => {
      const caseId =
        req.query?.caseId || req.body?.caseId || `default-${serviceId}`;
      const existing = state.drafts.get(caseId) || {
        caseId,
        service: serviceId,
        fields: {},
        uploads: {},
      };

      const incomingFields = { ...(req.body?.fields || req.body || {}) };
      delete incomingFields.action;
      delete incomingFields.nav;

      existing.fields = { ...existing.fields, ...incomingFields };
      if (req.body?.uploads && typeof req.body.uploads === 'object') {
        existing.uploads = { ...existing.uploads, ...req.body.uploads };
      }
      existing.updatedAt = new Date().toISOString();
      state.drafts.set(caseId, existing);

      const action = req.body?.action || 'draft';
      if (action !== 'submit') {
        return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Draft Saved</title></head>
<body>
  <div id="draft-saved-banner" data-case-id="${escapeHtml(caseId)}" data-status="FORM_FILLED">
    DRAFT SAVED FOR ${escapeHtml(serviceId.toUpperCase())} (${escapeHtml(caseId)})
  </div>
</body>
</html>`);
      }

      if (
        req.body?.confirm_declaration !== 'yes' &&
        req.body?.confirm_declaration !== true
      ) {
        return res
          .status(400)
          .send('<html><body><div id="declaration-error">Please check #chk-confirm-declaration before submitting.</div></body></html>');
      }

      const appId =
        req.body?.appId ||
        DEFAULT_APP_ID_BY_SERVICE[serviceId] ||
        'PEN-2026-88213';

      const appRecord = {
        appId,
        caseId,
        service: serviceId,
        stage: 'Pending',
        internalStatus: 'SUBMITTED',
        submittedDay: state.clockOffsetDays,
        lastActionDay: state.clockOffsetDays,
        fields: existing.fields,
        uploads: existing.uploads,
        query: null,
        approvedByOffice: false,
        submittedAt: new Date().toISOString(),
      };
      state.applications.set(appId, appRecord);

      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Application Submitted</title></head>
<body>
  <h1>Application Submitted Successfully</h1>
  <div id="application-id-result" data-app-id="${escapeHtml(appId)}">${escapeHtml(appId)}</div>
  <a id="link-view-status" href="/portal/status/${escapeHtml(appId)}">Track Status</a>
</body>
</html>`);
    };
  }

  app.post('/portal/pension/apply', handlePortalFormPost('pension'));
  app.post('/portal/scholarship/apply', handlePortalFormPost('scholarship'));
  app.post('/portal/ration-card/apply', handlePortalFormPost('ration_card'));

  // ==========================================================================
  // 6. Status Page (/portal/status/:appId)
  // ==========================================================================
  app.get('/portal/status/:appId', (req, res) => {
    const appId = req.params.appId;
    const appRecord = state.applications.get(appId) || {
      appId,
      service: 'pension',
      stage: 'Pending',
      internalStatus: 'TRACKING',
      submittedDay: 0,
      lastActionDay: 0,
      query: null,
      approvedByOffice: false,
    };

    const daysSinceLastAction = computeDaysSinceLastAction(appRecord);
    const stalled =
      appRecord.stage !== 'Approved' &&
      appRecord.stage !== 'Query raised' &&
      daysSinceLastAction >= 7;

    let internalStatus = appRecord.internalStatus;
    if (appRecord.stage === 'Approved' || appRecord.approvedByOffice) {
      internalStatus = 'CLOSED';
    } else if (appRecord.stage === 'Query raised') {
      internalStatus = 'QUERY_RAISED';
    } else if (stalled) {
      internalStatus = 'STALLED';
    } else if (
      appRecord.stage === 'Under review' ||
      appRecord.stage === 'Pending'
    ) {
      internalStatus = 'TRACKING';
    }

    const statusPayload = {
      appId,
      stage: appRecord.stage,
      status: internalStatus,
      daysElapsed: state.clockOffsetDays,
      daysSinceLastAction,
      stalled,
      stalledDays: stalled ? daysSinceLastAction : 0,
      reason: stalled ? '7 din se ruka hai' : null,
      query: appRecord.query,
      approvedByOffice: appRecord.approvedByOffice,
    };

    if (
      req.query?.format === 'json' ||
      req.headers?.accept?.includes('application/json')
    ) {
      return res.status(200).json(statusPayload);
    }

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Status: ${escapeHtml(appId)}</title></head>
<body>
  <h1>Application Status: <span id="status-app-id">${escapeHtml(appId)}</span></h1>
  <div id="status-stage" data-stage="${escapeHtml(statusPayload.stage)}">${escapeHtml(statusPayload.stage)}</div>
  <div id="status-internal" data-status="${escapeHtml(statusPayload.status)}">${escapeHtml(statusPayload.status)}</div>
  <div id="status-days-since-action" data-days="${statusPayload.daysSinceLastAction}">${statusPayload.daysSinceLastAction}</div>
  ${
    statusPayload.query
      ? `<div id="status-query-message">${escapeHtml(statusPayload.query.message)}</div>`
      : ''
  }
  ${
    statusPayload.stalled
      ? `<div id="status-stalled-banner">7 din se ruka hai (${statusPayload.daysSinceLastAction} days)</div>`
      : ''
  }
</body>
</html>`);
  });

  // ==========================================================================
  // 7. Admin Endpoints (ONLY when DEMO_MODE=true)
  // ==========================================================================
  function requirePortalDemoMode(_req, res, next) {
    if (process.env.DEMO_MODE === 'false') {
      return res.status(403).json({
        error: 'DEMO_MODE_DISABLED',
        message: 'Portal admin endpoints are only available when DEMO_MODE=true',
      });
    }
    return next();
  }

  app.post('/portal/admin/advance-clock', requirePortalDemoMode, (req, res) => {
    const days = Number(req.body?.days || 0);
    state.clockOffsetDays += days;

    const appId = req.body?.appId;
    const targetApp = appId ? state.applications.get(appId) : null;
    const daysSinceLastAction = targetApp
      ? computeDaysSinceLastAction(targetApp)
      : state.clockOffsetDays;

    return res.status(200).json({
      ok: true,
      clockOffsetDays: state.clockOffsetDays,
      daysSinceLastAction,
    });
  });

  app.post('/portal/admin/status', requirePortalDemoMode, (req, res) => {
    const appId = req.body?.appId || 'PEN-2026-88213';
    const stage = req.body?.stage || 'Under review'; // 'Pending' | 'Under review' | 'Query raised' | 'Approved'
    const existing = state.applications.get(appId) || {
      appId,
      service: 'pension',
      submittedDay: 0,
    };

    existing.stage = stage;
    existing.lastActionDay = state.clockOffsetDays;
    if (stage === 'Approved') {
      existing.approvedByOffice = true;
      existing.internalStatus = 'CLOSED';
      existing.query = null;
    } else if (stage === 'Query raised') {
      existing.internalStatus = 'QUERY_RAISED';
      existing.query = {
        active: true,
        raisedOnDay: state.clockOffsetDays || 10,
        documentKey: 'life_certificate',
        message:
          req.body?.queryMessage ||
          'Office ne ek sawal poocha: life certificate purana hai',
      };
    } else {
      existing.internalStatus = 'TRACKING';
      existing.query = null;
    }

    state.applications.set(appId, existing);
    return res.status(200).json({
      ok: true,
      appId,
      stage: existing.stage,
      internalStatus: existing.internalStatus,
      daysSinceLastAction: computeDaysSinceLastAction(existing),
      query: existing.query,
    });
  });

  app.post('/portal/admin/raise-query', requirePortalDemoMode, (req, res) => {
    const appId = req.body?.appId || 'PEN-2026-88213';
    const existing = state.applications.get(appId) || {
      appId,
      service: 'pension',
      submittedDay: 0,
    };
    existing.stage = 'Query raised';
    existing.internalStatus = 'QUERY_RAISED';
    existing.lastActionDay = state.clockOffsetDays;
    existing.query = {
      active: true,
      raisedOnDay: state.clockOffsetDays || 10,
      documentKey: req.body?.documentKey || 'life_certificate',
      message:
        req.body?.message ||
        'Office ne ek sawal poocha: life certificate purana hai',
    };
    state.applications.set(appId, existing);

    return res.status(200).json({
      ok: true,
      appId,
      stage: existing.stage,
      status: existing.internalStatus,
      query: existing.query,
    });
  });

  app.post('/portal/admin/approve', requirePortalDemoMode, (req, res) => {
    const appId = req.body?.appId || 'PEN-2026-88213';
    const existing = state.applications.get(appId) || {
      appId,
      service: 'pension',
      submittedDay: 0,
    };
    existing.stage = 'Approved';
    existing.internalStatus = 'CLOSED';
    existing.approvedByOffice = true;
    existing.query = null;
    existing.lastActionDay = state.clockOffsetDays;
    state.applications.set(appId, existing);

    return res.status(200).json({
      ok: true,
      appId,
      stage: existing.stage,
      status: existing.internalStatus,
    });
  });

  app.post('/portal/admin/set-fail', requirePortalDemoMode, (req, res) => {
    state.failRemaining = Number(req.body?.failTimes || 0);
    state.alwaysFail = Boolean(req.body?.alwaysFail);
    state.brokenSelectors = req.body?.brokenSelectors || {};

    return res.status(200).json({
      ok: true,
      failRemaining: state.failRemaining,
      alwaysFail: state.alwaysFail,
      brokenSelectors: state.brokenSelectors,
    });
  });

  app.post('/portal/admin/reset', requirePortalDemoMode, (_req, res) => {
    state.clockOffsetDays = 0;
    state.failRemaining = 0;
    state.alwaysFail = false;
    state.brokenSelectors = {};
    state.sessions.clear();
    state.drafts.clear();
    state.applications.clear();
    return res.status(200).json({ ok: true, reset: true });
  });

  return app;
}
