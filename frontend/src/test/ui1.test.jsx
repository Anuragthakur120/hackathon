import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';
import mr from '../i18n/mr.json';
import gu from '../i18n/gu.json';
import bn from '../i18n/bn.json';
import ta from '../i18n/ta.json';
import te from '../i18n/te.json';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  t,
  toBcp47Lang,
  toShortLangCode,
} from '../i18n/index.js';
import { speak } from '../voice/speak.js';
import { createMicController } from '../voice/useVoice.js';
import { mockApi } from '../api/mockApi.js';
import { AppProvider } from '../state/AppContext.jsx';
import { AppRoutes } from '../App.jsx';

function flattenI18n(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const pathKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenI18n(v, pathKey));
    } else {
      result[pathKey] = v;
    }
  }
  return result;
}

describe('Module UI-1: 7 Languages, English Default, LanguageSwitcher (Hover/Click/Keyboard/Mobile Sheet), i18n Key Parity & STT/TTS/API Propagation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));
  });

  it('defines all 7 languages with exact native labels and defaults to English (en / en-IN) on first load', () => {
    expect(DEFAULT_LANGUAGE).toBe('en-IN');
    expect(
      SUPPORTED_LANGUAGES.map((l) => ({
        shortCode: l.shortCode,
        code: l.code,
        nativeLabel: l.nativeLabel,
      }))
    ).toEqual([
      { shortCode: 'en', code: 'en-IN', nativeLabel: 'English' },
      { shortCode: 'hi', code: 'hi-IN', nativeLabel: 'हिन्दी' },
      { shortCode: 'mr', code: 'mr-IN', nativeLabel: 'मराठी' },
      { shortCode: 'gu', code: 'gu-IN', nativeLabel: 'ગુજરાતી' },
      { shortCode: 'bn', code: 'bn-IN', nativeLabel: 'বাংলা' },
      { shortCode: 'ta', code: 'ta-IN', nativeLabel: 'தமிழ்' },
      { shortCode: 'te', code: 'te-IN', nativeLabel: 'తెలుగు' },
    ]);

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('language-switcher-current-label')).toHaveTextContent(
      'English'
    );
    expect(screen.getByText(en.appName)).toBeInTheDocument();
  });

  it('enforces 100% key parity across all 7 language JSON files (en, hi, mr, gu, bn, ta, te) and falls back to English for missing keys', () => {
    const allDictionaries = { en, hi, mr, gu, bn, ta, te };
    const flattened = Object.fromEntries(
      Object.entries(allDictionaries).map(([code, dict]) => [
        code,
        flattenI18n(dict),
      ])
    );

    const referenceKeys = Object.keys(flattened.en).sort();
    expect(referenceKeys.length).toBeGreaterThan(150);

    for (const [langCode, flatDict] of Object.entries(flattened)) {
      const langKeys = Object.keys(flatDict).sort();
      const missingFromLang = referenceKeys.filter((k) => !(k in flatDict));
      const extraInLang = langKeys.filter((k) => !(k in flattened.en));

      expect(
        missingFromLang,
        `Missing keys in ${langCode}.json: ${missingFromLang.join(', ')}`
      ).toEqual([]);
      expect(
        extraInLang,
        `Extra keys in ${langCode}.json: ${extraInLang.join(', ')}`
      ).toEqual([]);

      for (const key of referenceKeys) {
        expect(typeof flatDict[key]).toBe('string');
        expect(flatDict[key].trim().length).toBeGreaterThan(0);
      }
    }

    // Verify fallback to English when a key is missing in a target language dictionary
    const partialBundles = {
      'gu-IN': { appName: 'નગરસાથી' },
      'en-IN': en,
    };
    expect(t('gu-IN', 'appName', partialBundles)).toBe('નગરસાથી');
    expect(t('gu-IN', 'languagePickerTitle', partialBundles)).toBe(
      en.languagePickerTitle
    );
  });

  it('supports desktop hover open with anti-flicker close delay, click/keyboard toggle, outside-click & Escape close, and instant switching across all 7 languages', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    const nav = screen.getByTestId('header-lang-nav');
    const trigger = screen.getByTestId('language-switcher-trigger');

    // 1. Hover opens the desktop dropdown
    fireEvent.mouseEnter(nav);
    const menu = screen.getByTestId('language-switcher-menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('data-layout', 'dropdown');
    expect(screen.getByTestId('lang-active-check-en')).toBeInTheDocument();

    // 2. Brief mouseLeave (< 160ms) followed by mouseEnter does NOT close the menu (anti-flicker)
    fireEvent.mouseLeave(nav);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    fireEvent.mouseEnter(nav);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('language-switcher-menu')).toBeInTheDocument();

    // 3. Full mouseLeave (>= 160ms) closes the menu
    fireEvent.mouseLeave(nav);
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(screen.queryByTestId('language-switcher-menu')).not.toBeInTheDocument();

    // 4. Keyboard ArrowDown opens, Escape closes
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByTestId('language-switcher-menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('language-switcher-menu')).not.toBeInTheDocument();

    // 5. Click opens, outside mousedown closes
    fireEvent.click(trigger);
    expect(screen.getByTestId('language-switcher-menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('language-switcher-menu')).not.toBeInTheDocument();

    // 6. Switch across all 7 languages and verify instant UI update + localStorage + <html lang>
    const bundlesByShort = { en, hi, mr, gu, bn, ta, te };
    for (const item of SUPPORTED_LANGUAGES) {
      fireEvent.click(trigger);
      const option = screen.getByTestId(`lang-option-${item.shortCode}`);
      expect(option).toHaveTextContent(item.nativeLabel);
      expect(option).toHaveTextContent(item.englishName);

      fireEvent.click(option);

      // Menu closes and header shows selected native label
      expect(screen.queryByTestId('language-switcher-menu')).not.toBeInTheDocument();
      expect(
        screen.getByTestId('language-switcher-current-label')
      ).toHaveTextContent(item.nativeLabel);

      // Every visible string updates immediately without reload
      const expectedBundle = bundlesByShort[item.shortCode];
      expect(screen.getByText(expectedBundle.appName)).toBeInTheDocument();
      expect(
        screen.getByText(expectedBundle.citizenPersonaTitle)
      ).toBeInTheDocument();

      // Persisted in localStorage and <html lang> updated
      expect(window.localStorage.getItem('nagarsathi_lang')).toBe(item.code);
      expect(document.documentElement.lang).toBe(item.shortCode);
    }

    vi.useRealTimers();
  });

  it('renders a mobile bottom sheet on narrow viewports (< 768px)', () => {
    window.innerWidth = 360;
    window.dispatchEvent(new Event('resize'));

    render(
      <MemoryRouter initialEntries={['/app']}>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </MemoryRouter>
    );

    const trigger = screen.getByTestId('language-switcher-trigger');
    fireEvent.click(trigger);

    const menu = screen.getByTestId('language-switcher-menu');
    expect(menu).toHaveAttribute('data-layout', 'bottom-sheet');
    expect(screen.getByTestId('language-switcher-backdrop')).toBeInTheDocument();

    // Select Gujarati from bottom sheet
    fireEvent.click(screen.getByTestId('lang-option-gu'));
    expect(screen.queryByTestId('language-switcher-menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('language-switcher-current-label')).toHaveTextContent(
      'ગુજરાતી'
    );
    expect(document.documentElement.lang).toBe('gu');
  });

  it('passes the selected language (en-IN, hi-IN, mr-IN, gu-IN, bn-IN, ta-IN, te-IN) into STT, TTS, and mockApi', async () => {
    const spoken = [];
    globalThis.SpeechSynthesisUtterance = function MockUtterance(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
    };
    globalThis.speechSynthesis = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      speak: vi.fn((u) => spoken.push(u)),
    };

    for (const item of SUPPORTED_LANGUAGES) {
      expect(toBcp47Lang(item.shortCode)).toBe(item.code);
      expect(toShortLangCode(item.code)).toBe(item.shortCode);

      // TTS receives mapped BCP-47 code
      speak('Test sentence.', { lang: item.shortCode });
      expect(spoken[spoken.length - 1].lang).toBe(item.code);

      // STT recognition receives mapped BCP-47 code
      const mockRec = { lang: '', start: vi.fn(), stop: vi.fn() };
      const mic = createMicController({
        lang: item.shortCode,
        recognitionInstance: mockRec,
      });
      mic.startMic();
      expect(mockRec.lang).toBe(item.code);

      // mockApi receives and normalizes the language code
      const intakeRes = await mockApi.createCaseFromTranscript({
        transcript: 'Meri pension band ho gayi',
        language: item.shortCode,
      });
      expect(intakeRes.data.language).toBe(item.code);
    }
  });
});

