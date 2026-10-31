import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../state/AppContext.jsx';
import {
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  normalizeLangCode,
} from '../i18n/index.js';

const HOVER_CLOSE_DELAY_MS = 160;

function detectMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

export function LanguageSwitcher({
  navTestId = 'header-lang-nav',
  triggerTestId = 'language-switcher-trigger',
  menuTestId = 'language-switcher-menu',
  className = '',
}) {
  const { language, setLanguage, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(detectMobileViewport);
  const containerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const activeMeta = getLanguageMeta(language);
  const normalizedCurrent = normalizeLangCode(language);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectMobileViewport());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideMouseDown = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        clearCloseTimer();
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        clearCloseTimer();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, clearCloseTimer]);

  const handleMouseEnter = () => {
    clearCloseTimer();
    if (!detectMobileViewport()) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    if (!detectMobileViewport()) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, HOVER_CLOSE_DELAY_MS);
    }
  };

  const handleTriggerClick = () => {
    clearCloseTimer();
    setIsMobile(detectMobileViewport());
    setIsOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' && !isOpen) {
      event.preventDefault();
      clearCloseTimer();
      setIsOpen(true);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      clearCloseTimer();
      setIsOpen(false);
    }
  };

  const handleSelectLanguage = (langCode) => {
    clearCloseTimer();
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <nav
      ref={containerRef}
      data-testid={navTestId}
      aria-label={t('changeLanguageLabel')}
      className={`relative inline-block ${className}`.trim()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        data-testid={triggerTestId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('changeLanguageLabel')}: ${activeMeta.nativeLabel} (${activeMeta.englishName})`}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className="ns-btn min-h-[56px] min-w-[56px] inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-900 shadow-sm transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          🌐
        </span>
        <span data-testid="language-switcher-current-label">
          {activeMeta.nativeLabel}
        </span>
        <span
          aria-hidden="true"
          className={`text-xs text-slate-500 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && isMobile ? (
        <div
          data-testid="language-switcher-backdrop"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
        />
      ) : null}

      {isOpen ? (
        <div
          role="listbox"
          aria-label={t('languagePickerTitle')}
          data-testid={menuTestId}
          data-layout={isMobile ? 'bottom-sheet' : 'dropdown'}
          className={
            isMobile
              ? 'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white p-5 shadow-2xl'
              : 'absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl'
          }
        >
          {isMobile ? (
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-base font-bold text-slate-900">
                🌐 {t('languagePickerTitle')}
              </span>
              <button
                type="button"
                data-testid="language-switcher-sheet-close"
                onClick={() => setIsOpen(false)}
                className="ns-btn min-h-[56px] min-w-[56px] inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            {SUPPORTED_LANGUAGES.map((item) => {
              const isSelected = normalizedCurrent === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`lang-option-${item.shortCode}`}
                  onClick={() => handleSelectLanguage(item.code)}
                  className={`ns-btn min-h-[56px] w-full flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isSelected
                      ? 'bg-indigo-50/90 text-indigo-950 font-bold border border-indigo-200'
                      : 'bg-transparent text-slate-800 font-medium border border-transparent'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="text-base font-bold leading-snug">
                      {item.nativeLabel}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {item.englishName} ({item.shortCode.toUpperCase()})
                    </span>
                  </span>
                  {isSelected ? (
                    <span
                      data-testid={`lang-active-check-${item.shortCode}`}
                      aria-label="Selected"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}

