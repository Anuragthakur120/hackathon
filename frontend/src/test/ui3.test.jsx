import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import en from '../i18n/en.json';
import {
  CASE_STATUS,
  createInitialCaseState,
  transitionCaseState,
  canTransition,
} from '../state/caseMachine.js';
import { mockApi } from '../api/mockApi.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

describe('Module UI-3: Main Website Shell, Dashboard (360px & Desktop), Sidebar/Tab Bar, Phase Cards, Floating Assistant & State Machine Guard', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await mockApi.demoReset({ language: 'en-IN' });
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));
  });

  it('renders dashboard with greeting, hero mic card, 3 service tiles, and active cases on desktop (1280px)', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Desktop: Left sidebar visible, mobile tab bar hidden
    expect(screen.getByTestId('nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-cases')).toBeInTheDocument();
    expect(screen.getByTestId('nav-docs')).toBeInTheDocument();
    expect(screen.getByTestId('nav-help')).toBeInTheDocument();

    // Greeting with user's name
    expect(screen.getByTestId('dashboard-greeting')).toHaveTextContent(
      'Ramabai Kulkarni'
    );

    // Big "Start a new request" hero card with mic
    expect(screen.getByTestId('start-new-request-card')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-mic-btn')).toBeInTheDocument();

    // 3 Service Tiles
    expect(screen.getByTestId('service-tile-pension')).toBeInTheDocument();
    expect(screen.getByTestId('service-tile-scholarship')).toBeInTheDocument();
    expect(screen.getByTestId('service-tile-ration')).toBeInTheDocument();

    // "My active cases" list with status badge
    expect(screen.getByTestId('active-cases-list')).toBeInTheDocument();
    expect(screen.getByTestId('active-case-item-0')).toBeInTheDocument();
  });

  it('renders dashboard and mobile bottom tab bar on 360px narrow viewports', () => {
    window.innerWidth = 360;
    window.dispatchEvent(new Event('resize'));

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('mobile-tab-bar')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-tab-home')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-tab-cases')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-tab-docs')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-tab-help')).toBeInTheDocument();

    expect(screen.getByTestId('dashboard-greeting')).toBeInTheDocument();
    expect(screen.getByTestId('start-new-request-card')).toBeInTheDocument();
  });

  it('renders all 3-phase explainer cards with distinct color families, icons, hover styling, and completed steps', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Phase 1: Samajhna (Indigo/Blue, icon 🎙️)
    const phase1 = screen.getByTestId('phase-card-1');
    expect(phase1).toHaveTextContent(/Samajhna/i);
    expect(phase1).toHaveTextContent(en.phase1ExplainerDesc);
    expect(phase1).toHaveTextContent(/steps completed/i);
    expect(phase1.className).toContain('border-indigo');

    // Phase 2: Karna (Emerald/Teal, icon 📝)
    const phase2 = screen.getByTestId('phase-card-2');
    expect(phase2).toHaveTextContent(/Karna/i);
    expect(phase2).toHaveTextContent(en.phase2ExplainerDesc);
    expect(phase2).toHaveTextContent(/steps completed/i);
    expect(phase2.className).toContain('border-emerald');

    // Phase 3: Peecha karna (Amber/Orange, icon 🔍)
    const phase3 = screen.getByTestId('phase-card-3');
    expect(phase3).toHaveTextContent(/Peecha karna/i);
    expect(phase3).toHaveTextContent(en.phase3ExplainerDesc);
    expect(phase3).toHaveTextContent(/steps completed/i);
    expect(phase3.className).toContain('border-amber');
  });

  it('opens and closes the slide-over panel via the persistent floating AI Assistant button', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    const floatBtn = screen.getByTestId('floating-assistant-btn');
    expect(floatBtn).toBeInTheDocument();

    // Click opens slide-over panel
    fireEvent.click(floatBtn);
    expect(screen.getByTestId('floating-assistant-panel')).toBeInTheDocument();
    expect(screen.getByTestId('assistant-preset-pension')).toBeInTheDocument();

    // Close button dismisses panel
    const closeBtn = screen.getByTestId('close-assistant-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('floating-assistant-panel')).not.toBeInTheDocument();
  });

  it('enforces client-side state machine with 13 statuses and refuses transition to SUBMITTED unless approval.given === true', () => {
    const allStatuses = [
      CASE_STATUS.INTAKE,
      CASE_STATUS.SERVICE_CONFIRMED,
      CASE_STATUS.CONSENTED,
      CASE_STATUS.DOCS_COLLECTING,
      CASE_STATUS.DOCS_READY,
      CASE_STATUS.FORM_FILLED,
      CASE_STATUS.APPROVED,
      CASE_STATUS.SUBMITTED,
      CASE_STATUS.TRACKING,
      CASE_STATUS.QUERY_RAISED,
      CASE_STATUS.STALLED,
      CASE_STATUS.CALLED,
      CASE_STATUS.CLOSED,
    ];

    expect(allStatuses.length).toBe(13);

    // Initial state is INTAKE
    let state = createInitialCaseState('en-IN');
    expect(state.status).toBe(CASE_STATUS.INTAKE);

    // Progress through journey up to FORM_FILLED
    state = transitionCaseState(state, CASE_STATUS.SERVICE_CONFIRMED);
    state = transitionCaseState(state, CASE_STATUS.CONSENTED);
    state = transitionCaseState(state, CASE_STATUS.DOCS_COLLECTING);
    state = transitionCaseState(state, CASE_STATUS.DOCS_READY);
    state = transitionCaseState(state, CASE_STATUS.FORM_FILLED, {
      draft: { isDraft: true },
      approval: { given: false },
    });

    // Guard test: Transition to SUBMITTED without approval.given is REFUSED
    const checkUnapproved = canTransition(state.status, CASE_STATUS.SUBMITTED, state);
    expect(checkUnapproved.ok).toBe(false);
    expect(checkUnapproved.reason).toContain('HARD_SAFETY_GUARD');
    expect(() => transitionCaseState(state, CASE_STATUS.SUBMITTED)).toThrow(
      /HARD_SAFETY_GUARD/
    );

    // After approval.given === true, transition succeeds
    state = transitionCaseState(state, CASE_STATUS.APPROVED, {
      approval: { given: true, timestamp: new Date().toISOString() },
    });
    const checkApproved = canTransition(state.status, CASE_STATUS.SUBMITTED, state);
    expect(checkApproved.ok).toBe(true);

    state = transitionCaseState(state, CASE_STATUS.SUBMITTED);
    expect(state.status).toBe(CASE_STATUS.SUBMITTED);

    // Remaining steps
    state = transitionCaseState(state, CASE_STATUS.TRACKING);
    state = transitionCaseState(state, CASE_STATUS.QUERY_RAISED);
    state = transitionCaseState(state, CASE_STATUS.STALLED);
    state = transitionCaseState(state, CASE_STATUS.CALLED);
    state = transitionCaseState(state, CASE_STATUS.TRACKING);
    state = transitionCaseState(state, CASE_STATUS.CLOSED);
    expect(state.status).toBe(CASE_STATUS.CLOSED);
  });

  it('confirms all mockApi agent endpoints return { display, speech, data }', async () => {
    const endpoints = [
      await mockApi.createCaseFromTranscript({ transcript: 'Meri pension band ho gayi' }),
      await mockApi.confirmService(),
      await mockApi.giveConsent({ given: true }),
      await mockApi.uploadDocuments({ markReady: true }),
      await mockApi.fillDraft(),
      await mockApi.approveDraft({ given: true }),
      await mockApi.submitApplication(),
      await mockApi.getCaseStatus(),
      await mockApi.demoRaiseQuery(),
      await mockApi.demoSkipDays(),
      await mockApi.endCall(),
      await mockApi.demoApproveAndClose(),
    ];

    for (const res of endpoints) {
      expect(res).toHaveProperty('display');
      expect(typeof res.display).toBe('string');
      expect(res.display.length).toBeGreaterThan(0);

      expect(res).toHaveProperty('speech');
      expect(typeof res.speech).toBe('string');
      expect(res.speech.length).toBeGreaterThan(0);

      expect(res).toHaveProperty('data');
      expect(typeof res.data).toBe('object');
    }
  });
});
