import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import en from '../i18n/en.json';
import mr from '../i18n/mr.json';
import { useAuthStore } from '../state/authStore.js';
import { mockApi } from '../api/mockApi.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

describe('Module UI-2: Authentication Pages (Login, Signup, OTP, Route Guards, Session & Lockout)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await useAuthStore.getState().logout();
  });

  it('redirects unauthenticated users from protected routes (/app) to /login, and returns after login', async () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Redirected to /login
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.getByText(en.auth.loginTitle)).toBeInTheDocument();
    expect(screen.getByTestId('auth-trust-strip')).toHaveTextContent(
      en.auth.trustStrip
    );

    // Enter valid 10-digit phone
    const phoneInput = screen.getByTestId('login-phone-input');
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    // Send OTP
    const sendOtpBtn = screen.getByTestId('login-send-otp-btn');
    expect(sendOtpBtn).not.toBeDisabled();
    fireEvent.click(sendOtpBtn);

    // OTP step appears
    await waitFor(() => {
      expect(screen.getByTestId('login-otp-step')).toBeInTheDocument();
    });
    expect(screen.getByText(en.auth.otpStepTitle)).toBeInTheDocument();

    // Enter valid Mock OTP: 123456
    const otpInputs = document.querySelectorAll('input[type="text"]');
    expect(otpInputs.length).toBe(6);
    fireEvent.change(otpInputs[0], { target: { value: '123456' } });

    // Verify OTP
    const verifyBtn = screen.getByTestId('login-verify-otp-btn');
    fireEvent.click(verifyBtn);

    // Returns to the originally requested protected route (/app)
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
      expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument();
    });
  });

  it('rejects invalid phone numbers and displays localized validation errors (English & Marathi)', async () => {
    // 1. English
    const { unmount } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    const phoneInput = screen.getByTestId('login-phone-input');
    fireEvent.change(phoneInput, { target: { value: '987' } }); // < 10 digits
    const sendOtpBtn = screen.getByTestId('login-send-otp-btn');
    expect(sendOtpBtn).toBeDisabled();

    unmount();

    // 2. Marathi
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(mr.auth.loginTitle)).toBeInTheDocument();
    expect(screen.getByTestId('login-send-otp-btn')).toBeDisabled();
  });

  it('rejects incorrect OTP with shake animation, and locks for 30s after 5 wrong attempts', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-phone-input'), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByTestId('login-send-otp-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('login-otp-step')).toBeInTheDocument();
    });

    const otpInputs = document.querySelectorAll('input[type="text"]');

    // Attempt 1 to 4: Wrong OTP rejected with error
    for (let i = 1; i <= 4; i++) {
      fireEvent.change(otpInputs[0], { target: { value: '999999' } });
      fireEvent.click(screen.getByTestId('login-verify-otp-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('login-error-msg')).toBeInTheDocument();
      });
      expect(screen.getByTestId('login-error-msg')).toHaveTextContent(
        en.auth.errors.otpWrong
      );
    }

    // Attempt 5: Triggers 30s lockout
    fireEvent.change(otpInputs[0], { target: { value: '999999' } });
    fireEvent.click(screen.getByTestId('login-verify-otp-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('login-error-msg')).toHaveTextContent(
        /30 seconds/i
      );
    });
    expect(screen.getByTestId('login-verify-otp-btn')).toBeDisabled();
  });

  it('completes the full Signup -> OTP -> Onboarding -> /app flow with Terms validation', async () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('signup-screen')).toBeInTheDocument();
    expect(screen.getByText(en.auth.signupTitle)).toBeInTheDocument();

    const nameInput = screen.getByTestId('signup-name-input');
    const phoneInput = screen.getByTestId('signup-phone-input');
    const termsCheckbox = screen.getByTestId('signup-terms-checkbox');
    const signupBtn = screen.getByTestId('signup-send-otp-btn');

    // Button is disabled until name, phone, and terms are valid
    expect(signupBtn).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'Savita Patil' } });
    fireEvent.change(phoneInput, { target: { value: '9811223344' } });
    expect(signupBtn).toBeDisabled(); // Terms still unchecked

    fireEvent.click(termsCheckbox);
    expect(signupBtn).not.toBeDisabled();

    // Submit signup -> sends OTP
    fireEvent.click(signupBtn);

    await waitFor(() => {
      expect(screen.getByTestId('signup-otp-step')).toBeInTheDocument();
    });

    // Enter valid OTP
    const otpInputs = document.querySelectorAll('input[type="text"]');
    fireEvent.change(otpInputs[0], { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('signup-verify-otp-btn'));

    // Onboarding modal/screen appears with account summary
    await waitFor(() => {
      expect(screen.getByTestId('signup-onboarding-modal')).toBeInTheDocument();
    });
    const modal = screen.getByTestId('signup-onboarding-modal');
    expect(within(modal).getByText(en.auth.onboardingTitle)).toBeInTheDocument();
    expect(within(modal).getByText('Savita Patil')).toBeInTheDocument();
    expect(within(modal).getByText('+91 9811223344')).toBeInTheDocument();

    // Continue to app
    fireEvent.click(screen.getByTestId('onboarding-continue-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-greeting')).toHaveTextContent(
        'Savita Patil'
      );
    });
  });

  it('detects duplicate phone numbers on signup and suggests logging in', async () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // 9876543210 is already registered (Ramabai)
    fireEvent.change(screen.getByTestId('signup-name-input'), {
      target: { value: 'Another User' },
    });
    fireEvent.change(screen.getByTestId('signup-phone-input'), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByTestId('signup-terms-checkbox'));
    fireEvent.click(screen.getByTestId('signup-send-otp-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('signup-error-msg')).toBeInTheDocument();
    });
    expect(screen.getByTestId('signup-error-msg')).toHaveTextContent(
      en.auth.errors.duplicatePhone
    );
  });

  it('persists session in localStorage across refreshes, and logout clears token and user', async () => {
    // 1. Seed active session
    await mockApi.demoReset({ language: 'mr-IN' });
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider initialLanguage="mr-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('dashboard-overview')).toBeInTheDocument();
    expect(screen.getByTestId('header-user-menu')).toBeInTheDocument();

    // 2. Open user menu and click Logout
    fireEvent.click(screen.getByTestId('header-user-menu'));
    const logoutBtn = screen.getByTestId('logout-btn');
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);

    // 3. Token & user cleared, redirected to /login
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
  });
});
