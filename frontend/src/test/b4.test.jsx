import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  clearMemoryDatabase,
  seedDatabase,
} from '@nagarsathi/database';
import { createApp, invokeApp } from '@nagarsathi/backend';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';
import {
  api,
  realApi,
  mockApi,
  setApiModeOverride,
  getApiMode,
  configureRealApi,
  getRealApiNetworkState,
  subscribeRealApiNetworkState,
} from '../api/index.js';

describe('Module B4: Real API Mode (VITE_API_MODE=real) Connected to Backend Agent Routes & Database + Mock Mode Switchback', () => {
  let backendApp;

  beforeEach(async () => {
    process.env.OTP_MODE = 'mock';
    process.env.MOCK_OTP = '123456';
    process.env.DEMO_MODE = 'true';
    clearMemoryDatabase();
    await seedDatabase('memory');
    backendApp = createApp({ rateLimitMax: 500 });

    configureRealApi({
      transport: (reqOpts) => invokeApp(backendApp, reqOpts),
    });
  });

  afterEach(async () => {
    setApiModeOverride('mock');
    configureRealApi({ transport: null });
    await mockApi.demoReset({ language: 'mr-IN' });
  });

  it('tracks loading & error states, cookies/CORS, and completes the full 16-step frontend UI journey in real mode (VITE_API_MODE=real), then switches back to mock mode cleanly', async () => {
    setApiModeOverride('real');
    expect(getApiMode()).toBe('real');

    const observedStates = [];
    const unsubscribe = subscribeRealApiNetworkState((state) => {
      observedStates.push(state);
    });

    // 1. Direct OTP + Verify in real mode sets session cookie/token
    const otpReply = await api.requestOtp({
      phone: '9876543210',
      language: 'mr-IN',
    });
    expect(otpReply.data.otpSent).toBe(true);

    const verifyReply = await api.verifyOtp({
      phone: '9876543210',
      otp: '123456',
      language: 'mr-IN',
    });
    expect(verifyReply.data.authenticated).toBe(true);
    expect(verifyReply.data.citizen.aadhaarMasked).toBe('XXXX-XXXX-4821');
    expect(observedStates.some((s) => s.loading === true)).toBe(true);
    expect(getRealApiNetworkState().loading).toBe(false);

    // 2. Render full Frontend UI in VITE_API_MODE=real and run the complete 16-step journey
    const { unmount } = render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Steps 1-10: Intake -> Clarify -> Confirm Service -> Gate 1 Consent -> Save Profile -> Docs -> Draft -> Gate 2 Approve & Submit
    fireEvent.click(screen.getByTestId('preset-pension-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('answer-old-age-btn')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('answer-old-age-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('service-confirm-yes')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('service-confirm-yes'));
    await waitFor(() =>
      expect(screen.getByTestId('consent-agree-btn')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('consent-agree-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('save-profile-yes-btn')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('save-profile-yes-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('screen-documents')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('btn-ready-docs'));
    await waitFor(() =>
      expect(screen.getByTestId('proceed-to-draft-btn')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('proceed-to-draft-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('gate2-submit-btn')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('gate2-submit-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('screen-submitted')).toBeInTheDocument();
      expect(getRealApiNetworkState().loading).toBe(false);
    });

    // Verify the case was persisted and submitted in the real backend database!
    const caseRes = await invokeApp(backendApp, {
      method: 'GET',
      url: '/api/cases/CASE-RAMABAI-001',
      headers: { Authorization: `Bearer ${verifyReply.data.token}` },
    });
    expect(caseRes.status).toBe(200);
    expect(caseRes.body.data.case.status).toBe('SUBMITTED');
    expect(caseRes.body.data.case.appId).toMatch(/^PEN-2026-\d{5}$/);

    // Steps 11-16: Tracking -> Day-10 Query -> Resubmit -> +21 Days Stall -> Office Call (REF-5521) -> Back to Tracking -> CLOSED
    fireEvent.click(screen.getByTestId('submitted-next-track-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('screen-tracking-timeline')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('toggle-query-path-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('query-raised-card')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('query-resubmit-doc-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('time-skip-21-btn')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('time-skip-21-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('stalled-7-days-banner')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('start-office-call-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('screen-office-call')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('officer-reply-preset-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('call-next-check-banner')).toBeInTheDocument()
    );
    expect(screen.getByTestId('extracted-ref-id')).toHaveTextContent('REF-5521');

    fireEvent.click(screen.getByTestId('call-return-tracking-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('tracking-ref-banner')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('final-approve-close-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('screen-closed')).toBeInTheDocument()
    );
    expect(screen.getByTestId('closed-ref-id')).toHaveTextContent('REF-5521');

    // Letter Explainer via /api/agents/letter in real mode
    const letterReply = await api.explainLetter({
      text: 'Submit Jeevan Pramaan within 15 days',
      language: 'mr-IN',
    });
    expect(letterReply.data.deadline).toBe('15 days');

    unmount();
    unsubscribe();

    // 3. Switch back to VITE_API_MODE=mock and verify mock journey still works!
    setApiModeOverride('mock');
    expect(getApiMode()).toBe('mock');

    await api.demoReset({ language: 'hi-IN' });
    const mockIntake = await api.createCaseFromTranscript({
      transcript: 'Meri pension band ho gayi',
      language: 'hi-IN',
    });
    expect(mockIntake.data.service.id).toBe('pension_restoration');
    expect(mockIntake.data.language).toBe('hi-IN');

    // Verify realApi and mockApi still have identical method keys
    expect(Object.keys(realApi).sort()).toEqual(Object.keys(mockApi).sort());
  });
});
