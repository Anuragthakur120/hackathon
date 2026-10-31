import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from '../api/mockApi.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

describe('Module F2: Conversation, Consent (Gate 1), Documents Loop, Draft Summary & Approval (Gate 2)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await mockApi.demoReset({ language: 'mr-IN' });
  });

  it('completes the full steps 1-10 citizen journey across Marathi, Hindi, and English with source tags & masked PII', async () => {
    for (const langCode of ['mr-IN', 'hi-IN', 'en-IN']) {
      await mockApi.demoReset({ language: langCode });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/app']}>
          <AppProvider initialLanguage={langCode}>
            <AppRoutes />
          </AppProvider>
        </MemoryRouter>
      );

      // Step 2: Conversation & Intake ("Meri pension band ho gayi")
      expect(screen.getByTestId('screen-conversation')).toBeInTheDocument();
      expect(screen.getByTestId('human-control-label')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('preset-pension-btn'));

      // Clarifying question ("kaunsi pension?") with TWO BIG answer buttons
      await waitFor(() =>
        expect(screen.getByTestId('clarifying-question-box')).toBeInTheDocument()
      );
      expect(screen.getByTestId('msg-speaker-btn-0')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('answer-old-age-btn'));

      // Citizen Service Confirm ("Aapko pension chalu karwani hai, sahi?")
      await waitFor(() =>
        expect(screen.getByTestId('service-confirm-box')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('service-confirm-yes'));

      // Step 3: Consent Screen = GATE 1
      await waitFor(() =>
        expect(screen.getByTestId('screen-consent-gate1')).toBeInTheDocument()
      );
      expect(screen.getByTestId('gate-1-badge')).toBeInTheDocument();
      expect(screen.getByTestId('consent-can-do-list')).toBeInTheDocument();
      expect(screen.getByTestId('consent-cannot-do-list')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('consent-agree-btn'));

      // Separate question right after consent: "Agli baar ke liye data save karun?"
      await waitFor(() =>
        expect(screen.getByTestId('save-profile-card')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('save-profile-yes-btn'));

      // Step 4: Documents Checklist & Bad Document Loop
      await waitFor(() =>
        expect(screen.getByTestId('screen-documents')).toBeInTheDocument()
      );
      expect(screen.getByTestId('camera-file-input')).toBeInTheDocument();

      // 1st photo capture -> Blurry warning ("Photo dhundhli hai, dobara")
      fireEvent.click(screen.getByTestId('photo-capture-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('doc-warning-blurry')).toBeInTheDocument()
      );

      // 2nd photo capture -> Expired Life Certificate warning ("Life certificate purana hai")
      fireEvent.click(screen.getByTestId('photo-capture-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('doc-warning-expired')).toBeInTheDocument()
      );

      // 3rd photo capture -> All documents verified (DOCS_READY)
      fireEvent.click(screen.getByTestId('photo-capture-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('docs-ready-banner')).toBeInTheDocument()
      );

      fireEvent.click(screen.getByTestId('proceed-to-draft-btn'));

      // Step 5: Draft Form Summary (DRAFT ONLY + all 6 source tags + masked PII)
      await waitFor(() =>
        expect(screen.getByTestId('screen-draft-summary')).toBeInTheDocument()
      );
      expect(screen.getByTestId('draft-only-badge')).toBeInTheDocument();
      expect(screen.getByTestId('draft-field-aadhaarMasked')).toHaveTextContent(
        'XXXX-XXXX-4821'
      );
      expect(screen.getByTestId('draft-field-phoneMasked')).toHaveTextContent(
        'XXXXXX3210'
      );
      expect(screen.getByTestId('draft-field-bankAccountMasked')).toHaveTextContent(
        'XXXXXXXX9012'
      );

      expect(screen.getAllByTestId('source-tag-PROFILE').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('source-tag-DOCUMENT').length).toBeGreaterThan(0);
      expect(screen.getByTestId('source-tag-ASK_CITIZEN')).toBeInTheDocument();
      expect(screen.getByTestId('source-tag-DERIVED')).toBeInTheDocument();
      expect(screen.getByTestId('source-tag-DEFAULT')).toBeInTheDocument();
      expect(screen.getByTestId('source-tag-PORTAL_GENERATED')).toBeInTheDocument();

      // Gate 2 Approval -> Submit
      expect(screen.getByTestId('gate-2-badge')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('gate2-submit-btn'));

      // Step 10: Submitted Screen with big PEN-2026-88213
      await waitFor(() =>
        expect(screen.getByTestId('screen-submitted')).toBeInTheDocument()
      );
      expect(screen.getByTestId('submitted-app-id')).toHaveTextContent(
        'PEN-2026-88213'
      );

      unmount();
    }
  });

  it('halts at Gate 1 when citizen clicks Consent NO with nothing saved or submitted', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="hi-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

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
      expect(screen.getByTestId('consent-decline-btn')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('consent-decline-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('consent-halted-screen')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('screen-submitted')).not.toBeInTheDocument();
  });

  it('halts at Gate 2 when citizen clicks Approval NO (Badlo) with nothing submitted', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Jump to draft filled via workflow buttons
    fireEvent.click(screen.getByTestId('btn-confirm-service'));
    await waitFor(() =>
      expect(screen.getByTestId('consent-agree-btn')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('consent-agree-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('save-profile-no-btn')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('save-profile-no-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('screen-documents')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('btn-fill-draft'));

    await waitFor(() =>
      expect(screen.getByTestId('screen-draft-summary')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId('gate2-no-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('gate2-halted-screen')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('screen-submitted')).not.toBeInTheDocument();
  });

  it('routes unknown/low-confidence requests to Madad Kendra after asking once', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // 1st unknown utterance: asks citizen to try again once
    fireEvent.click(screen.getByTestId('preset-unknown-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('message-bubble-1')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('madad-kendra-card')).not.toBeInTheDocument();

    // 2nd unknown utterance: displays Madad Kendra fallback
    fireEvent.click(screen.getByTestId('preset-unknown-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('madad-kendra-card')).toBeInTheDocument()
    );
  });
});
