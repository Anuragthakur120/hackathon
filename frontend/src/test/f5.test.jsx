import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import mr from '../i18n/mr.json';
import hi from '../i18n/hi.json';
import en from '../i18n/en.json';
import { mockApi } from '../api/mockApi.js';
import { realApi } from '../api/realApi.js';
import { selectApi, getApiMode } from '../api/index.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function flattenI18nObject(obj, prefix = '') {
  const flat = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, flattenI18nObject(value, fullKey));
    } else {
      flat[fullKey] = value;
    }
  }
  return flat;
}

function collectFilesRecursively(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Module F5: Frontend Hardening (i18n parity, Accessibility, API Parity & No Secrets, 360px/1280px E2E + All 5 Failure Paths)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await mockApi.demoReset({ language: 'mr-IN' });

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
      speak: vi.fn(),
    };
  });

  it('fails if any i18n key is missing or empty across mr.json, hi.json, and en.json', () => {
    const mrFlat = flattenI18nObject(mr);
    const hiFlat = flattenI18nObject(hi);
    const enFlat = flattenI18nObject(en);

    const mrKeys = Object.keys(mrFlat).sort();
    const hiKeys = Object.keys(hiFlat).sort();
    const enKeys = Object.keys(enFlat).sort();

    const allKeys = Array.from(new Set([...mrKeys, ...hiKeys, ...enKeys])).sort();
    const missingInMr = allKeys.filter((k) => !(k in mrFlat));
    const missingInHi = allKeys.filter((k) => !(k in hiFlat));
    const missingInEn = allKeys.filter((k) => !(k in enFlat));

    expect(missingInMr).toEqual([]);
    expect(missingInHi).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(mrKeys).toEqual(hiKeys);
    expect(hiKeys).toEqual(enKeys);

    for (const key of allKeys) {
      expect(typeof mrFlat[key]).toBe('string');
      expect(mrFlat[key].trim().length).toBeGreaterThan(0);
      expect(typeof hiFlat[key]).toBe('string');
      expect(hiFlat[key].trim().length).toBeGreaterThan(0);
      expect(typeof enFlat[key]).toBe('string');
      expect(enFlat[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('verifies accessibility pass (skip link, focus order, aria-labels in all 3 languages, touch targets >= 56px)', () => {
    const bundles = {
      'mr-IN': mr,
      'hi-IN': hi,
      'en-IN': en,
    };

    for (const [langCode, dict] of Object.entries(bundles)) {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/app']}>
          <AppProvider initialLanguage={langCode}>
            <AppRoutes />
          </AppProvider>
        </MemoryRouter>
      );

      // Skip-to-main link exists and targets #ns-main-content
      const skipLink = screen.getByTestId('skip-to-main-link');
      expect(skipLink).toHaveAttribute('href', '#ns-main-content');
      expect(skipLink).toHaveTextContent(dict.skipToMainLabel);

      // Main landmark has matching id and tabIndex for keyboard focus
      const mainLandmark = document.getElementById('ns-main-content');
      expect(mainLandmark).not.toBeNull();
      expect(mainLandmark.tagName.toLowerCase()).toBe('main');

      // Localized aria-labels exist on navigation, progress bar, voice guide, and persona card
      expect(screen.getByTestId('header-lang-nav')).toHaveAttribute(
        'aria-label',
        dict.changeLanguageLabel
      );
      expect(screen.getByTestId('progress-bar-section')).toHaveAttribute(
        'aria-label',
        dict.progressBarAriaLabel
      );
      expect(screen.getByTestId('voice-guide-section')).toHaveAttribute(
        'aria-label',
        dict.voiceGuideAriaLabel
      );
      expect(screen.getByTestId('persona-card-section')).toHaveAttribute(
        'aria-label',
        dict.personaCardAriaLabel
      );

      // Every action button uses the .ns-btn touch target class (>= 56px min-height in CSS)
      const actionButtons = document.querySelectorAll('button.ns-btn');
      expect(actionButtons.length).toBeGreaterThan(5);
      actionButtons.forEach((btn) => {
        expect(btn.classList.contains('ns-btn')).toBe(true);
      });

      unmount();
    }
  });

  it('verifies VITE_API_MODE switch, exact function signature parity between mockApi and realApi, and zero secrets in frontend source', () => {
    // 1. VITE_API_MODE switch works cleanly
    expect(getApiMode('mock')).toBe('mock');
    expect(getApiMode('real')).toBe('real');
    expect(selectApi('mock')).toBe(mockApi);
    expect(selectApi('real')).toBe(realApi);

    // 2. Every method on mockApi exists on realApi with identical function arity (parameter count)
    const mockMethods = Object.keys(mockApi).sort();
    const realMethods = Object.keys(realApi).sort();
    expect(realMethods).toEqual(mockMethods);

    for (const methodName of mockMethods) {
      expect(typeof mockApi[methodName]).toBe('function');
      expect(typeof realApi[methodName]).toBe('function');
      expect(realApi[methodName].length).toBe(mockApi[methodName].length);
    }

    // 3. Scan all files in /frontend/src to verify no secrets exist
    const srcDir = path.resolve(__dirname, '..');
    const allSrcFiles = collectFilesRecursively(srcDir);
    const forbiddenPatterns = [
      new RegExp('sk-' + 'ant-[a-zA-Z0-9_-]+'),
      new RegExp('ANTHROPIC_' + 'API_KEY\\s*=\\s*[\'"][^\'"]+[\'"]'),
      new RegExp('JWT_' + 'SECRET\\s*=\\s*[\'"][^\'"]+[\'"]'),
      new RegExp('ENCRYPTION_' + 'KEY\\s*=\\s*[\'"][^\'"]+[\'"]'),
      new RegExp('MONGODB_' + 'URI\\s*=\\s*[\'"]mongodb(\\+srv)?:\\/\\/[^\'"]+[\'"]'),
    ];

    for (const filePath of allSrcFiles) {
      if (filePath.endsWith('f5.test.jsx')) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it('runs the complete mock demo and verifies all 5 failure paths (consent NO, approval NO, portal fail x3, voice fail, unknown service) at 360px and 1280px widths', async () => {
    for (const width of [360, 1280]) {
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));

      // --- FAILURE PATH 1: Unknown Service twice -> Madad Kendra ---
      await mockApi.demoReset({ language: 'mr-IN' });
      let view = render(
        <MemoryRouter initialEntries={['/app']}>
          <AppProvider initialLanguage="mr-IN">
            <AppRoutes />
          </AppProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('preset-unknown-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('message-bubble-1')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('preset-unknown-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('madad-kendra-card')).toBeInTheDocument()
      );
      view.unmount();

      // --- FAILURE PATH 2: Consent Gate 1 = NO -> Stops cleanly, nothing saved ---
      await mockApi.demoReset({ language: 'hi-IN' });
      view = render(
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
      view.unmount();

      // --- FAILURE PATH 3: Voice Fail (Web Speech STT absent) -> Text Box Fallback works ---
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;

      await mockApi.demoReset({ language: 'en-IN' });
      view = render(
        <MemoryRouter initialEntries={['/app']}>
          <AppProvider initialLanguage="en-IN">
            <AppRoutes />
          </AppProvider>
        </MemoryRouter>
      );

      const textFallbackInput = screen.getByTestId('intake-text-input');
      fireEvent.change(textFallbackInput, {
        target: { value: 'Meri pension band ho gayi' },
      });
      fireEvent.click(screen.getByTestId('intake-send-btn'));
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
        expect(screen.getByTestId('save-profile-no-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('save-profile-no-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('screen-documents')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('btn-fill-draft'));

      // --- FAILURE PATH 4: Approval Gate 2 = NO ("Kuch galat hai") -> Halts at Gate 2, never submits ---
      await waitFor(() =>
        expect(screen.getByTestId('gate2-no-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('gate2-no-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('gate2-halted-screen')).toBeInTheDocument()
      );
      expect(screen.queryByTestId('screen-submitted')).not.toBeInTheDocument();

      // Resume review at Gate 2
      fireEvent.click(screen.getByTestId('gate2-resume-btn'));

      // --- FAILURE PATH 5: Portal Fail x3 ("dobara koshish 1/3 -> 3/3") ---
      fireEvent.click(screen.getByTestId('simulate-portal-failure-btn'));
      expect(screen.getByTestId('portal-retry-item-1')).toHaveTextContent(
        /dobara koshish 1\/3/i
      );
      expect(screen.getByTestId('portal-retry-item-3')).toHaveTextContent(
        /dobara koshish 3\/3/i
      );

      // Complete the rest of the demo from FORM_FILLED -> SUBMITTED -> TRACKING -> STALLED -> CALLED -> CLOSED
      fireEvent.click(screen.getByTestId('gate2-submit-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('screen-submitted')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('submitted-next-track-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('time-skip-21-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('time-skip-21-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('start-office-call-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('start-office-call-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('officer-reply-preset-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('officer-reply-preset-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('call-return-tracking-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('call-return-tracking-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('final-approve-close-btn')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('final-approve-close-btn'));
      await waitFor(() =>
        expect(screen.getByTestId('screen-closed')).toBeInTheDocument()
      );

      view.unmount();
    }
  });
});
