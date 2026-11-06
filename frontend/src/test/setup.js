import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import { useAuthStore, DEMO_CITIZEN } from '../state/authStore.js';

beforeEach(() => {
  // Set default demo citizen session for unit tests that mount protected routes directly.
  // Tests testing login/logout (e.g., ui2.test.jsx) explicitly call useAuthStore.getState().logout() in their suite beforeEach.
  useAuthStore.getState().setDemoSession(DEMO_CITIZEN);
});

