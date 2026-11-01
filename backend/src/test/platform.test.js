import { describe, it, expect, beforeEach } from 'vitest';
import { createApp, invokeApp } from '../app.js';
import { clearMemoryDatabase } from '@nagarsathi/database';

describe('Citizen Platform REST APIs (/schemes, /eligibility, /applications, /documents, /notifications, /support, /dashboard/stats)', () => {
  let app;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    clearMemoryDatabase();
    app = createApp();

    // Signup User A (clean new citizen)
    const otpResA = await invokeApp(app, {
      method: 'POST',
      url: '/auth/otp',
      body: { phone: '9876543210', mode: 'signup', fullName: 'Aarav Sharma' },
    });
    expect(otpResA.status).toBe(200);

    const verifyResA = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543210', otp: '123456', mode: 'signup', fullName: 'Aarav Sharma' },
    });
    expect(verifyResA.status).toBe(200);
    tokenA = verifyResA.body.data?.token || verifyResA.body.token;

    // Signup User B (second clean new citizen for isolation test)
    const otpResB = await invokeApp(app, {
      method: 'POST',
      url: '/auth/otp',
      body: { phone: '9876543211', mode: 'signup', fullName: 'Priya Patel' },
    });
    expect(otpResB.status).toBe(200);

    const verifyResB = await invokeApp(app, {
      method: 'POST',
      url: '/auth/verify',
      body: { phone: '9876543211', otp: '123456', mode: 'signup', fullName: 'Priya Patel' },
    });
    expect(verifyResB.status).toBe(200);
    tokenB = verifyResB.body.data?.token || verifyResB.body.token;
  });

  it('GET /api/schemes returns all schemes and supports category & search filtering (publicly accessible)', async () => {
    // 1. All schemes
    const resAll = await invokeApp(app, { method: 'GET', url: '/api/schemes' });
    expect(resAll.status).toBe(200);
    expect(resAll.body.data.total).toBeGreaterThanOrEqual(10);
    expect(resAll.body.data.schemes.length).toBeGreaterThan(0);

    // 2. Filter by category: Education
    const resEdu = await invokeApp(app, { method: 'GET', url: '/api/schemes?category=Education' });
    expect(resEdu.status).toBe(200);
    for (const s of resEdu.body.data.schemes) {
      expect(s.category).toBe('Education');
    }

    // 3. Search query: "pension"
    const resSearch = await invokeApp(app, { method: 'GET', url: '/api/schemes?search=pension' });
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.schemes.length).toBeGreaterThan(0);

    // 4. Single scheme by ID
    const resSingle = await invokeApp(app, { method: 'GET', url: '/api/schemes/pension' });
    expect(resSingle.status).toBe(200);
    expect(resSingle.body.data.scheme.schemeId).toBe('pension');
  });

  it('POST /api/eligibility/check evaluates user demographics and returns categorized scheme recommendations with disclaimer', async () => {
    const res = await invokeApp(app, {
      method: 'POST',
      url: '/api/eligibility/check',
      body: {
        age: 68,
        gender: 'Female',
        state: 'Maharashtra',
        income: 24000,
        occupation: 'Retired',
        category: 'General',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('eligible');
    expect(res.body.data).toHaveProperty('potentiallyEligible');
    expect(res.body.data).toHaveProperty('notEligible');
    expect(res.body.data.disclaimer).toContain('NagarSathi AI Eligibility');

    // Pension should be eligible for 68-year-old widow in Maharashtra with low income
    const eligibleIds = res.body.data.eligible.map((s) => s.schemeId);
    expect(eligibleIds).toContain('pension');
  });

  it('protects citizen data: unauthenticated requests to protected endpoints return 401', async () => {
    const unauthStats = await invokeApp(app, { method: 'GET', url: '/api/dashboard/stats' });
    expect(unauthStats.status).toBe(401);

    const unauthApps = await invokeApp(app, { method: 'GET', url: '/api/applications' });
    expect(unauthApps.status).toBe(401);

    const unauthDocs = await invokeApp(app, { method: 'GET', url: '/api/documents' });
    expect(unauthDocs.status).toBe(401);

    const unauthNotifs = await invokeApp(app, { method: 'GET', url: '/api/notifications' });
    expect(unauthNotifs.status).toBe(401);

    const unauthTickets = await invokeApp(app, { method: 'GET', url: '/api/support/tickets' });
    expect(unauthTickets.status).toBe(401);
  });

  it('provides complete data isolation between User A and User B with initial 0 counts', async () => {
    // Brand new User A has 0 total applications, 0 documents, 0 notifications, 0 tickets
    const statsA = await invokeApp(app, {
      method: 'GET',
      url: '/api/dashboard/stats',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(statsA.status).toBe(200);
    expect(statsA.body.data.stats.totalApplications).toBe(0);
    expect(statsA.body.data.stats.approved).toBe(0);
    expect(statsA.body.data.stats.pending).toBe(0);
    expect(statsA.body.data.stats.documentsUploaded).toBe(0);

    // Create an application draft for User A
    const appResA = await invokeApp(app, {
      method: 'POST',
      url: '/api/applications',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        schemeId: 'pension',
        schemeName: 'Indira Gandhi National Old Age Pension Scheme',
        formData: {
          fullName: 'Aarav Sharma',
          age: 68,
          annualIncome: 24000,
          state: 'Maharashtra',
          district: 'Pune',
        },
      },
    });
    expect(appResA.status).toBe(201);
    const caseIdA = appResA.body.data.application.id;
    expect(caseIdA).toBeTruthy();

    // User A can list their application
    const listAppsA = await invokeApp(app, {
      method: 'GET',
      url: '/api/applications',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(listAppsA.status).toBe(200);
    expect(listAppsA.body.data.applications.length).toBe(1);
    expect(listAppsA.body.data.applications[0].id).toBe(caseIdA);

    // User B CANNOT see User A's application - User B still has 0 applications
    const listAppsB = await invokeApp(app, {
      method: 'GET',
      url: '/api/applications',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(listAppsB.status).toBe(200);
    expect(listAppsB.body.data.applications.length).toBe(0);

    // User B CANNOT get User A's tracking details directly
    const trackingB = await invokeApp(app, {
      method: 'GET',
      url: `/api/applications/${caseIdA}/tracking`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(trackingB.status).toBe(404);

    // User A can track it
    const trackingA = await invokeApp(app, {
      method: 'GET',
      url: `/api/applications/${caseIdA}/tracking`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(trackingA.status).toBe(200);
    expect(trackingA.body.data).toHaveProperty('timeline');
  });

  it('handles documents upload, verification workflow, and data isolation', async () => {
    // 1. Initial documents list is empty
    const resListEmpty = await invokeApp(app, {
      method: 'GET',
      url: '/api/documents',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(resListEmpty.status).toBe(200);
    expect(resListEmpty.body.data.documents.length).toBe(0);

    // 2. Upload document - must start in PENDING_VERIFICATION (never auto-verified)
    const resUpload = await invokeApp(app, {
      method: 'POST',
      url: '/api/documents/upload',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        type: 'caste_certificate',
        category: 'Social Category',
        fileName: 'caste_cert.pdf',
        fileContentBase64: Buffer.concat([
          Buffer.from('%PDF-1.4\n'),
          Buffer.alloc(2048, 'x'),
        ]).toString('base64'),
        fileSize: 2057,
      },
    });
    expect(resUpload.status).toBe(201);
    expect(resUpload.body.data.document.type).toBe('caste_certificate');
    expect(resUpload.body.data.document.status).toBe('PENDING_VERIFICATION');
    const docId = resUpload.body.data.document.id;

    // 3. User B cannot access User A's document
    const resUserBGet = await invokeApp(app, {
      method: 'GET',
      url: `/api/documents/${docId}/content`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(resUserBGet.status).toBe(404);

    // 4. Verify document via verification pipeline
    const resVerify = await invokeApp(app, {
      method: 'POST',
      url: `/api/documents/${docId}/verify`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(resVerify.status).toBe(200);
    expect(resVerify.body.data.verification.status).toBe('VERIFIED');
    expect(resVerify.body.data.verification.checks.length).toBeGreaterThan(0);

    // 5. Delete document
    const resDel = await invokeApp(app, {
      method: 'DELETE',
      url: `/api/documents/${docId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(resDel.status).toBe(200);
    expect(resDel.body.data.deleted).toBe(true);
  });

  it('handles notifications, support tickets, and assistant message endpoints', async () => {
    // Notifications list is initially empty for new user
    const resNotifs = await invokeApp(app, {
      method: 'GET',
      url: '/api/notifications',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(resNotifs.status).toBe(200);
    expect(resNotifs.body.data.notifications.length).toBe(0);

    // Support ticket create
    const resTicket = await invokeApp(app, {
      method: 'POST',
      url: '/api/support/tickets',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        category: 'APPLICATION_DELAY',
        subject: 'Application stalled at verification desk',
        description: 'Need assistance expediting pension file',
        priority: 'HIGH',
      },
    });
    expect(resTicket.status).toBe(201);
    expect(resTicket.body.data.ticket.ticketId).toMatch(/^TKT-/);

    // AI Assistant message
    const resAssistant = await invokeApp(app, {
      method: 'POST',
      url: '/api/assistant/message',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        message: 'How can I apply for the pension scheme?',
        language: 'en-IN',
      },
    });
    expect(resAssistant.status).toBe(200);
    expect(resAssistant.body.data).toHaveProperty('reply');
    expect(resAssistant.body.data).toHaveProperty('suggestedActions');

    // Field extraction endpoint
    const resExtract = await invokeApp(app, {
      method: 'POST',
      url: '/api/assistant/extract-field',
      headers: { authorization: `Bearer ${tokenA}` },
      body: {
        fieldName: 'annualIncome',
        text: 'माझे वार्षिक उत्पन्न ४५००० रुपये आहे',
        language: 'mr-IN',
      },
    });
    expect(resExtract.status).toBe(200);
    expect(resExtract.body.data.extractedValue).toBe(45000);
    expect(resExtract.body.data.requiresExplicitConfirmation).toBe(true);
  });
});

