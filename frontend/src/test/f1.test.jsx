import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import mr from '../i18n/mr.json';
import hi from '../i18n/hi.json';
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

function flattenKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      acc.push(...flattenKeys(obj[key], path));
    } else {
      acc.push(path);
    }
    return acc;
  }, []);
}

describe('Module F1: Frontend Foundation, i18n, Mock API & Safety State Machine', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await mockApi.demoReset({ language: 'mr-IN' });
  });

  it('has identical i18n keys across mr.json, hi.json, and en.json', () => {
    const mrKeys = flattenKeys(mr).sort();
    const hiKeys = flattenKeys(hi).sort();
    const enKeys = flattenKeys(en).sort();

    expect(hiKeys).toEqual(mrKeys);
    expect(enKeys).toEqual(mrKeys);
    expect(mrKeys.length).toBeGreaterThan(30);
  });

  it('blocks transition to SUBMITTED when approval.given !== true (Hard Safety Rule)', () => {
    let state = createInitialCaseState('mr-IN');
    state = transitionCaseState(state, CASE_STATUS.SERVICE_CONFIRMED);
    state = transitionCaseState(state, CASE_STATUS.CONSENTED);
    state = transitionCaseState(state, CASE_STATUS.DOCS_COLLECTING);
    state = transitionCaseState(state, CASE_STATUS.DOCS_READY);
    state = transitionCaseState(state, CASE_STATUS.FORM_FILLED, {
      draft: { isDraft: true },
      approval: { given: false, timestamp: null },
    });

    // Attempting to transition directly from FORM_FILLED to SUBMITTED without approval.given === true
    const checkWithoutApproval = canTransition(
      state.status,
      CASE_STATUS.SUBMITTED,
      state
    );
    expect(checkWithoutApproval.ok).toBe(false);
    expect(() =>
      transitionCaseState(state, CASE_STATUS.SUBMITTED)
    ).toThrow(/HARD_SAFETY_GUARD/);

    // Even if status is APPROVED, if approval.given is false, transition to SUBMITTED is blocked
    const forgedState = {
      ...state,
      status: CASE_STATUS.APPROVED,
      approval: { given: false },
    };
    expect(() =>
      transitionCaseState(forgedState, CASE_STATUS.SUBMITTED)
    ).toThrow(/HARD_SAFETY_GUARD/);
  });

  it('completes the full case state machine journey once approval.given === true', () => {
    let state = createInitialCaseState('mr-IN');
    state = transitionCaseState(state, CASE_STATUS.SERVICE_CONFIRMED);
    state = transitionCaseState(state, CASE_STATUS.CONSENTED, {
      consent: { given: true },
    });
    state = transitionCaseState(state, CASE_STATUS.DOCS_COLLECTING);
    state = transitionCaseState(state, CASE_STATUS.DOCS_READY);
    state = transitionCaseState(state, CASE_STATUS.FORM_FILLED, {
      draft: { isDraft: true },
    });
    state = transitionCaseState(state, CASE_STATUS.APPROVED, {
      approval: { given: true, timestamp: '2026-10-31T00:00:00.000Z' },
    });
    state = transitionCaseState(state, CASE_STATUS.SUBMITTED);
    expect(state.status).toBe(CASE_STATUS.SUBMITTED);

    state = transitionCaseState(state, CASE_STATUS.TRACKING);
    state = transitionCaseState(state, CASE_STATUS.QUERY_RAISED);
    state = transitionCaseState(state, CASE_STATUS.STALLED);
    state = transitionCaseState(state, CASE_STATUS.CALLED);
    state = transitionCaseState(state, CASE_STATUS.TRACKING);
    state = transitionCaseState(state, CASE_STATUS.CLOSED);

    expect(state.status).toBe(CASE_STATUS.CLOSED);
  });

  it('returns { display, speech, data } across all mockApi steps and enforces PEN-2026-88213 & REF-5521', async () => {
    const intake = await mockApi.createCaseFromTranscript({
      transcript: 'माझी पेन्शन थांबली आहे',
      language: 'mr-IN',
    });
    expect(intake).toHaveProperty('display');
    expect(intake).toHaveProperty('speech');
    expect(intake.data.service.id).toBe('pension_restoration');
    expect(intake.data.confidence).toBeGreaterThan(0.9);

    const confirmed = await mockApi.confirmService({ language: 'mr-IN' });
    expect(confirmed.data.status).toBe(CASE_STATUS.SERVICE_CONFIRMED);

    const consented = await mockApi.giveConsent({ given: true, language: 'mr-IN' });
    expect(consented.data.status).toBe(CASE_STATUS.CONSENTED);

    const docs = await mockApi.uploadDocuments({ markReady: true, language: 'mr-IN' });
    expect(docs.data.status).toBe(CASE_STATUS.DOCS_READY);

    const draft = await mockApi.fillDraft({ language: 'mr-IN' });
    expect(draft.data.status).toBe(CASE_STATUS.FORM_FILLED);
    expect(draft.data.draft.isDraft).toBe(true);

    // Attempting submit before approveDraft must fail
    await expect(mockApi.submitApplication({ language: 'mr-IN' })).rejects.toThrow(
      /HARD_SAFETY_GUARD/
    );

    const approved = await mockApi.approveDraft({ given: true, language: 'mr-IN' });
    expect(approved.data.status).toBe(CASE_STATUS.APPROVED);
    expect(approved.data.approval.given).toBe(true);

    const submitted = await mockApi.submitApplication({ language: 'mr-IN' });
    expect(submitted.data.status).toBe(CASE_STATUS.SUBMITTED);
    expect(submitted.data.applicationId).toBe('PEN-2026-88213');

    const tracking = await mockApi.getCaseStatus({ language: 'mr-IN' });
    expect(tracking.data.status).toBe(CASE_STATUS.TRACKING);

    const query = await mockApi.demoRaiseQuery({ language: 'mr-IN' });
    expect(query.data.status).toBe(CASE_STATUS.QUERY_RAISED);

    const stalled = await mockApi.demoSkipDays({ days: 15, language: 'mr-IN' });
    expect(stalled.data.status).toBe(CASE_STATUS.STALLED);

    await mockApi.startCall({ language: 'mr-IN' });
    await mockApi.callTurn({ language: 'mr-IN' });
    const called = await mockApi.endCall({ language: 'mr-IN' });
    expect(called.data.status).toBe(CASE_STATUS.CALLED);
    expect(called.data.referenceId).toBe('REF-5521');

    const backToTracking = await mockApi.getCaseStatus({ language: 'mr-IN' });
    expect(backToTracking.data.status).toBe(CASE_STATUS.TRACKING);

    const closed = await mockApi.demoApproveAndClose({ language: 'mr-IN' });
    expect(closed.data.status).toBe(CASE_STATUS.CLOSED);
  });

  it('renders Language Picker in native scripts, switches & persists language, and shows prototype footer', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Default language is Marathi (mr-IN)
    expect(screen.getByRole('heading', { name: mr.languagePickerTitle })).toBeInTheDocument();
    expect(screen.getByTestId('picker-lang-mr')).toHaveTextContent('मराठी');
    expect(screen.getByTestId('picker-lang-hi')).toHaveTextContent('हिंदी');
    expect(screen.getByTestId('picker-lang-en')).toHaveTextContent('English');
    expect(screen.getByTestId('prototype-footer')).toHaveTextContent(
      'Prototype. Mock portal. Demo data only.'
    );

    // Switch to Hindi
    fireEvent.click(screen.getByTestId('picker-lang-hi'));
    expect(screen.getByRole('heading', { name: hi.languagePickerTitle })).toBeInTheDocument();
    expect(window.localStorage.getItem('nagarsathi_lang')).toBe('hi-IN');

    // Switch to English
    fireEvent.click(screen.getByTestId('picker-lang-en'));
    expect(screen.getByRole('heading', { name: en.languagePickerTitle })).toBeInTheDocument();
    expect(window.localStorage.getItem('nagarsathi_lang')).toBe('en-IN');
  });
});

