import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from '../api/mockApi.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

describe('Module F4: Steps 11-16 (Tracking, Day-10 Query, +21 din Stall, Office Call, CLOSED, Letter Explainer & Portal Retry x3)', () => {
  let spokenUtterances = [];

  beforeEach(async () => {
    window.localStorage.clear();
    await mockApi.demoReset({ language: 'mr-IN' });

    spokenUtterances = [];
    globalThis.SpeechSynthesisUtterance = function MockUtterance(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.voice = null;
      this.onend = null;
    };
    globalThis.speechSynthesis = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => [
        { name: 'Marathi', lang: 'mr-IN' },
        { name: 'Hindi', lang: 'hi-IN' },
        { name: 'English', lang: 'en-IN' },
      ]),
      speak: vi.fn((u) => {
        spokenUtterances.push(u);
      }),
    };
  });

  it('runs the full 16-step journey end-to-end across Marathi, Hindi, and English including Query loop, +21 din Stall, Office Call (REF-5521), back to TRACKING, and CLOSED', async () => {
    for (const langCode of ['mr-IN', 'hi-IN', 'en-IN']) {
      await mockApi.demoReset({ language: langCode });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/app']}>
          <AppProvider initialLanguage={langCode}>
            <AppRoutes />
          </AppProvider>
        </MemoryRouter>
      );

      // Steps 1-10: Intake -> Confirm -> Consent -> Docs -> Draft -> Approve -> Submit
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
      await waitFor(() =>
        expect(screen.getByTestId('screen-submitted')).toBeInTheDocument()
      );

      // Step 11: Proceed to Tracking Timeline
      fireEvent.click(screen.getByTestId('submitted-next-track-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('screen-tracking-timeline')).toBeInTheDocument()
      );
      expect(screen.getByTestId('timeline-node-TRACKING')).toBeInTheDocument();

      // Step 12: Day-10 Query Raised ("Office ne ek sawal poocha") -> Camera resubmit -> loops back to TRACKING
      fireEvent.click(screen.getByTestId('toggle-query-path-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('query-raised-card')).toBeInTheDocument()
      );
      expect(screen.getByTestId('query-raised-card')).toHaveTextContent(
        /life certificate purana hai/i
      );

      fireEvent.click(screen.getByTestId('query-resubmit-doc-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('time-skip-21-btn')).toBeInTheDocument()
      );

      // Step 13: Time-Skip "+21 din" -> STALLED ("7 din se ruka hai")
      fireEvent.click(screen.getByTestId('time-skip-21-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('stalled-7-days-banner')).toBeInTheDocument()
      );
      expect(screen.getByTestId('stalled-7-days-banner')).toHaveTextContent(
        /7 din se ruka hai/i
      );

      // Step 14: Start Simulated Office Call (Judge plays Office Officer)
      fireEvent.click(screen.getByTestId('start-office-call-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('screen-office-call')).toBeInTheDocument()
      );
      expect(screen.getByTestId('call-live-transcript')).toBeInTheDocument();

      // Officer replies -> Agent extracts REF-5521 and schedules next check ("3 din mein dekhenge, REF-5521")
      fireEvent.click(screen.getByTestId('officer-reply-preset-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('call-next-check-banner')).toBeInTheDocument()
      );
      expect(screen.getByTestId('extracted-ref-id')).toHaveTextContent('REF-5521');
      expect(screen.getByTestId('call-next-check-banner')).toHaveTextContent(
        /3 din mein dekhenge, REF-5521/i
      );

      // Step 15: Return to TRACKING with REF-5521 banner
      fireEvent.click(screen.getByTestId('call-return-tracking-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('tracking-ref-banner')).toBeInTheDocument()
      );

      // Step 16: Final Approval -> CLOSED ("Pension phir chalu ho gayi")
      fireEvent.click(screen.getByTestId('final-approve-close-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('screen-closed')).toBeInTheDocument()
      );
      expect(screen.getByTestId('screen-closed')).toHaveTextContent(
        /Pension phir chalu ho gayi/i
      );
      expect(screen.getByTestId('closed-app-id')).toHaveTextContent(
        'PEN-2026-88213'
      );
      expect(screen.getByTestId('closed-ref-id')).toHaveTextContent('REF-5521');

      unmount();
    }
  });

  it('retries portal failure 3 times (dobara koshish 1/3 -> 3/3) and displays & speaks the clear citizen message', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="hi-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('simulate-portal-failure-btn'));

    expect(screen.getByTestId('portal-retry-item-1')).toHaveTextContent(
      /dobara koshish 1\/3/i
    );
    expect(screen.getByTestId('portal-retry-item-2')).toHaveTextContent(
      /dobara koshish 2\/3/i
    );
    expect(screen.getByTestId('portal-retry-item-3')).toHaveTextContent(
      /dobara koshish 3\/3/i
    );
    expect(screen.getByTestId('portal-failure-final-msg')).toHaveTextContent(
      /dobara koshish 3\/3/i
    );
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('explains an official letter ("Ye chitthi samjhao"), speaks the explanation aloud, and opens Madad Kendra with call button', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    spokenUtterances = [];
    fireEvent.click(screen.getByTestId('explain-letter-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('letter-explanation-output')).toBeInTheDocument()
    );
    expect(spokenUtterances.length).toBeGreaterThan(0);

    // Open Madad Kendra fallback screen and verify big call button
    fireEvent.click(screen.getByTestId('open-madad-kendra-btn'));
    expect(screen.getByTestId('madad-kendra-card')).toBeInTheDocument();
    expect(screen.getByTestId('madad-kendra-call-btn')).toHaveAttribute(
      'href',
      'tel:1800111555'
    );
  });
});
