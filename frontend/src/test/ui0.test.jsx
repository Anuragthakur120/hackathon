import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';
import { useUiStore } from '../state/uiStore.js';
import {
  DESIGN_TOKENS,
  Button,
  IconButton,
  Card,
  Chip,
  StatusBadge,
  Input,
  OtpInput,
  Modal,
  Toast,
  Stepper,
  ProgressBar,
  Skeleton,
  EmptyState,
  BigChoiceButton,
} from '../components/ui/index.js';

describe('Module UI-0: GovTech Design System, Tokens, Zustand Store, Components Library & /dev/style-guide', () => {
  beforeEach(() => {
    useUiStore.setState({
      activePhase: 'samajhna',
      toasts: [],
      activeModal: null,
      reducedMotion: false,
    });
  });

  it('defines strict design tokens for Brand gradient, 3 Phase color families, Gate 1/2 colors, Typography, and >=56px touch target', () => {
    expect(DESIGN_TOKENS.brandGradient).toContain(
      'from-indigo-600 via-blue-600 to-teal-500'
    );
    expect(DESIGN_TOKENS.pageBackground).toBe('bg-slate-50');
    expect(DESIGN_TOKENS.touchTargetMinPx).toBe(56);
    expect(DESIGN_TOKENS.baseFontSizePx).toBe(18);

    expect(DESIGN_TOKENS.phases.samajhna.family).toBe('indigo/blue');
    expect(DESIGN_TOKENS.phases.karna.family).toBe('emerald/teal');
    expect(DESIGN_TOKENS.phases.peecha.family).toBe('amber/orange');

    expect(DESIGN_TOKENS.gates.consent.family).toBe('violet');
    expect(DESIGN_TOKENS.gates.approvalChange.family).toBe('rose');
    expect(DESIGN_TOKENS.gates.approvalSubmit.family).toBe('emerald');

    expect(DESIGN_TOKENS.fonts).toEqual(
      expect.arrayContaining([
        'Inter',
        'Noto Sans Devanagari',
        'Noto Sans Gujarati',
        'Noto Sans Bengali',
        'Noto Sans Tamil',
        'Noto Sans Telugu',
      ])
    );
  });

  it('renders every component in /frontend/src/components/ui with hover, focus, loading, error, and disabled states', () => {
    let clicked = 0;
    let otp = '123456';

    render(
      <div>
        <Button variant="primary" onClick={() => { clicked += 1; }}>
          Primary Action
        </Button>
        <Button variant="danger" loading>
          Saving...
        </Button>
        <Button variant="secondary" disabled onClick={() => { clicked += 10; }}>
          Disabled Action
        </Button>
        <IconButton
          icon="🔊"
          ariaLabel="Speak Marathi"
          variant="speaker"
        />
        <Card title="Card Heading" subtitle="Card Subtitle" accent="samajhna">
          <Chip variant="samajhna">Samajhna Chip</Chip>
          <StatusBadge status="FORM_FILLED" />
        </Card>
        <Input
          label="Mobile Number"
          error="Please enter 10 digits"
          defaultValue="987"
        />
        <OtpInput
          label="Verify OTP"
          value={otp}
          onChange={(next) => { otp = next; }}
        />
        <BigChoiceButton
          title="Old Age Pension"
          subtitle="Senior Citizen Scheme"
          selected
          tone="samajhna"
        />
        <Stepper activePhase="karna" />
        <ProgressBar label="Karna Progress" value={75} phase="karna" />
        <Skeleton lines={3} label="Loading form..." />
        <EmptyState
          title="No pending queries"
          description="All office queries resolved"
          actionLabel="Refresh"
          onAction={() => { clicked += 1; }}
        />
        <Toast
          variant="warning"
          title="Query Raised"
          message="Life certificate needed"
        />
        <Modal open title="Confirm Submission" tone="approval">
          Please confirm before submitting.
        </Modal>
      </div>
    );

    const primaryBtn = screen.getByRole('button', { name: 'Primary Action' });
    expect(primaryBtn.className).toContain('min-h-[56px]');
    fireEvent.click(primaryBtn);
    expect(clicked).toBe(1);

    const disabledBtn = screen.getByRole('button', { name: 'Disabled Action' });
    expect(disabledBtn).toBeDisabled();
    fireEvent.click(disabledBtn);
    expect(clicked).toBe(1);

    expect(screen.getByTestId('button-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speak Marathi' })).toBeInTheDocument();
    expect(screen.getByText('Please enter 10 digits')).toHaveAttribute('role', 'alert');

    const otpDigit1 = screen.getByLabelText('OTP digit 1 of 6');
    fireEvent.change(otpDigit1, { target: { value: '9' } });
    expect(otp.startsWith('9')).toBe(true);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Karna Progress' })).toHaveAttribute(
      'aria-valuenow',
      '75'
    );
  });

  it('renders /dev/style-guide route showing every component, color family, Indic script, and interactive Zustand modal/toast states', () => {
    render(
      <MemoryRouter initialEntries={['/dev/style-guide']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('style-guide-page')).toBeInTheDocument();
    expect(
      screen.getByText(/NagarSathi GovTech Design System/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phase 1: Samajhna \(Understand\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phase 2: Karna \(Execute\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phase 3: Peecha karna \(Follow-up\)/i)
    ).toBeInTheDocument();

    // Verify modal trigger & Zustand toast trigger on /dev/style-guide
    const openModalBtn = screen.getByRole('button', {
      name: /Open Gate 1 Consent Modal/i,
    });
    fireEvent.click(openModalBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const triggerToastBtn = screen.getByRole('button', {
      name: /Trigger Zustand Toast/i,
    });
    fireEvent.click(triggerToastBtn);
    expect(screen.getByText(/Zustand store मधून सूचना दाखवली/i)).toBeInTheDocument();
  });
});
