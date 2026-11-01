import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';
import { mockApi } from '../api/mockApi.js';
import { useAuthStore, DEMO_CITIZEN } from '../state/authStore.js';

describe('Production Citizen Platform: 12 Functional Screens & Navigation Integration', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    useAuthStore.getState().setDemoSession(DEMO_CITIZEN);
    await mockApi.demoReset({ language: 'en-IN' });
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));
  });

  it('renders Page 1: Citizen Dashboard (/dashboard) with statistics and schemes', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('citizen-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('stat-total-applications')).toBeInTheDocument();
    expect(screen.getByTestId('stat-approved-applications')).toBeInTheDocument();
    expect(screen.getByText(/Browse Schemes/i)).toBeInTheDocument();
  });

  it('renders Page 2: All Government Schemes (/schemes) with categories and search', async () => {
    render(
      <MemoryRouter initialEntries={['/schemes']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('schemes-list-screen')).toBeInTheDocument();
    expect(screen.getByText('All Government Schemes')).toBeInTheDocument();
  });

  it('renders Page 3: Scheme Details (/schemes/pension) with benefits and apply action', async () => {
    render(
      <MemoryRouter initialEntries={['/schemes/pension']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('scheme-detail-screen')).toBeInTheDocument();
    });
    expect(screen.getByText(/Benefits & Financial Assistance/i)).toBeInTheDocument();
  });

  it('renders Page 4: AI Eligibility Checker (/eligibility) with demographic questionnaire', async () => {
    render(
      <MemoryRouter initialEntries={['/eligibility']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('eligibility-screen')).toBeInTheDocument();
    expect(screen.getByText('AI Welfare Scheme Eligibility Checker')).toBeInTheDocument();
  });

  it('renders Page 5: Apply Scheme Wizard (/apply/pension) with 9 steps and Gate 1 & Gate 2', async () => {
    render(
      <MemoryRouter initialEntries={['/apply/pension']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('apply-scheme-wizard')).toBeInTheDocument();
    expect(screen.getByText(/Step 1: Personal Information/i)).toBeInTheDocument();
  });

  it('renders Page 6: Document Center (/documents) with AES-256-GCM Vault and uploader', async () => {
    render(
      <MemoryRouter initialEntries={['/documents']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('document-center-screen')).toBeInTheDocument();
    expect(screen.getByText('Citizen Document Vault')).toBeInTheDocument();
  });

  it('renders Page 7: My Applications (/applications) with status filtering and tracking links', async () => {
    render(
      <MemoryRouter initialEntries={['/applications']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('my-applications-screen')).toBeInTheDocument();
    expect(screen.getByText('My Government Applications')).toBeInTheDocument();
  });

  it('renders Page 8: Application Tracking (/applications/CASE-DEMO-001/tracking) with live timeline', async () => {
    render(
      <MemoryRouter initialEntries={['/applications/CASE-DEMO-001/tracking']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('application-tracking-screen')).toBeInTheDocument();
    });
    expect(screen.getByText(/Application Tracking/i)).toBeInTheDocument();
  });

  it('renders Page 9: AI Voice Assistant (/assistant) with multilingual intake and presets', async () => {
    render(
      <MemoryRouter initialEntries={['/assistant']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('ai-assistant-screen')).toBeInTheDocument();
    expect(screen.getByText('NagarSathi Multilingual AI Assistant')).toBeInTheDocument();
  });

  it('renders Page 10: Notifications (/notifications) with mark read and clear all features', async () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('notifications-screen')).toBeInTheDocument();
    expect(screen.getByText('Citizen Notification Center')).toBeInTheDocument();
  });

  it('renders Page 11: Citizen Profile (/profile) with masked PII and completion meter', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('profile-screen')).toBeInTheDocument();
    expect(screen.getByText('My Citizen Profile')).toBeInTheDocument();
  });

  it('renders Page 12: Help & Support (/support) with FAQs and ticket creation', async () => {
    render(
      <MemoryRouter initialEntries={['/support']}>
        <AppProvider initialLanguage="en-IN">
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('support-screen')).toBeInTheDocument();
    expect(screen.getByText(/Help & Citizen Support/i)).toBeInTheDocument();
  });
});
