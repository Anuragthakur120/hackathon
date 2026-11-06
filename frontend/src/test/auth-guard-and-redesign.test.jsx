import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore, DEMO_CITIZEN } from '../state/authStore.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

describe('Auth Guard & Redesigned Login Screen', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await useAuthStore.getState().logout();
  });

  it('TASK 1: strictly guards /dashboard and redirects unauthenticated users to /login', async () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Immediately redirected to /login - dashboard content is NOT rendered
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('citizen-dashboard')).not.toBeInTheDocument();
  });

  it('TASK 1: strictly guards sub-routes like /schemes, /documents, /profile and redirects to /login', async () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/schemes']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('schemes-list-screen')).not.toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-screen')).not.toBeInTheDocument();
  });

  it('TASK 1: redirects already logged-in users away from /login to /dashboard', async () => {
    useAuthStore.getState().setDemoSession(DEMO_CITIZEN);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Immediately redirected to /dashboard
    await waitFor(() => {
      expect(screen.getByTestId('citizen-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
    });
  });

  it('TASK 2: renders redesigned Login UI with mobile/password tabs, password toggle, remember me and validation', async () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    // Logo & branding
    expect(screen.getAllByText('NagarSathi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GovTech India AI').length).toBeGreaterThan(0);
    expect(screen.getByText('Login to continue to NagarSathi')).toBeInTheDocument();

    // Tabs exist
    const mobileTab = screen.getByRole('tab', { name: /Mobile OTP/i });
    const passwordTab = screen.getByRole('tab', { name: /Email & Password/i });
    expect(mobileTab).toBeInTheDocument();
    expect(passwordTab).toBeInTheDocument();

    // Switch to Email & Password Tab
    fireEvent.click(passwordTab);
    expect(passwordTab).toHaveAttribute('aria-selected', 'true');

    // Email, Password, Remember Me, Forgot Password elements
    const emailInput = screen.getByTestId('login-email-input');
    const passwordInput = screen.getByTestId('login-password-input');
    const togglePasswordBtn = screen.getByTestId('login-toggle-password');
    const rememberMeCheckbox = screen.getByTestId('login-remember-me');
    const forgotPasswordBtn = screen.getByTestId('login-forgot-password');
    const submitBtn = screen.getByTestId('login-password-submit-btn');

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(rememberMeCheckbox).toBeChecked();
    expect(forgotPasswordBtn).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();

    // Toggle password visibility
    fireEvent.click(togglePasswordBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(togglePasswordBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Validation: submitting empty fields shows inline errors
    fireEvent.click(submitBtn);
    expect(screen.getByText('Please enter your email or username')).toBeInTheDocument();

    // Enter valid credentials and login
    fireEvent.change(emailInput, { target: { value: 'citizen@nagarsathi.in' } });
    fireEvent.change(passwordInput, { target: { value: 'securepass123' } });
    fireEvent.click(submitBtn);

    // Successfully authenticated and navigated to /dashboard
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
      expect(screen.getByTestId('citizen-dashboard')).toBeInTheDocument();
    });
  });

  it('TASK 1: logout clears user session and redirects back to /login', async () => {
    useAuthStore.getState().setDemoSession(DEMO_CITIZEN);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('citizen-dashboard')).toBeInTheDocument();

    // Open user menu
    const userMenuBtn = screen.getByTestId('header-user-menu');
    fireEvent.click(userMenuBtn);

    const logoutBtn = screen.getByTestId('logout-btn');
    expect(logoutBtn).toBeInTheDocument();

    // Click logout
    fireEvent.click(logoutBtn);

    // Redirected to /login with session cleared
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('citizen-dashboard')).not.toBeInTheDocument();
    });
  });
});
