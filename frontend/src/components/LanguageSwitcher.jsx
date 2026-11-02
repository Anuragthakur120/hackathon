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
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const activeMeta = getLanguageMeta(language);
  const normalizedCurrent = normalizeLangCode(language);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Check available space below to decide if we ever need upward positioning
  const checkPositioning = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (detectMobileViewport()) {
      setDropUp(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Default to DOWNWARD. Only open upward if space below is less than 240px and space above is greater
      if (spaceBelow < 240 && rect.top > 260) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectMobileViewport());
      checkPositioning();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearCloseTimer();
    };
  }, [clearCloseTimer, checkPositioning]);

  useEffect(() => {
    if (!isOpen) return undefined;
    checkPositioning();

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
  }, [isOpen, clearCloseTimer, checkPositioning]);

  const handleMouseEnter = () => {
    clearCloseTimer();
    if (!detectMobileViewport()) {
      checkPositioning();
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
    checkPositioning();
    setIsOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' && !isOpen) {
      event.preventDefault();
      clearCloseTimer();
      checkPositioning();
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
        ref={triggerRef}
        type="button"
        data-testid={triggerTestId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('changeLanguageLabel')}: ${activeMeta.nativeLabel} (${activeMeta.englishName})`}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className="ns-btn min-h-[44px] sm:min-h-[48px] inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3 sm:px-4 py-2 text-sm sm:text-base font-bold text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/70 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-98"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          🌐
        </span>
        <span data-testid="language-switcher-current-label" className="font-bold text-slate-900">
          {activeMeta.nativeLabel}
        </span>
        <span
          aria-hidden="true"
          className={`text-xs text-slate-400 transition-transform duration-200 ${
            isOpen ? (dropUp ? '-rotate-180' : 'rotate-180') : ''
          }`}
        >
          ▾
        </span>
      </button>

      {/* Backdrop for Mobile Bottom Sheet */}
      {isOpen && isMobile ? (
        <div
          data-testid="language-switcher-backdrop"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 md:hidden"
        />
      ) : null}

      {/* Language Menu Dropdown / Bottom Sheet */}
      {isOpen ? (
        <div
          role="listbox"
          aria-label={t('languagePickerTitle')}
          data-testid={menuTestId}
          data-layout={isMobile ? 'bottom-sheet' : 'dropdown'}
          className={
            isMobile
              ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom duration-250'
              : `absolute right-0 z-50 w-72 rounded-2xl border border-slate-200/90 bg-white/98 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150 ${
                  dropUp
                    ? 'bottom-full mb-2 slide-in-from-bottom-2'
                    : 'top-full mt-2 slide-in-from-top-2'
                }`
          }
        >
          {isMobile ? (
            <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🌐</span>
                <span className="text-base font-black text-slate-900">
                  {t('languagePickerTitle')}
                </span>
              </div>
              <button
                type="button"
                data-testid="language-switcher-sheet-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="ns-btn flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 active:scale-95"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="mb-2 px-2 pt-1 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('languagePickerTitle')}
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {SUPPORTED_LANGUAGES.length} Languages
              </span>
            </div>
          )}

          {/* Scrollable list of ALL supported languages */}
          <div
            className={
              isMobile
                ? 'flex flex-col gap-1.5 overflow-y-auto overscroll-contain pr-1 pb-4'
                : 'flex flex-col gap-1 max-h-72 overflow-y-auto overscroll-contain pr-1'
            }
          >
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
                  className={`ns-btn w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-950 font-bold border border-indigo-200/80 shadow-xs'
                      : 'bg-transparent text-slate-700 font-semibold border border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="text-sm sm:text-base font-bold leading-tight text-slate-900">
                      {item.nativeLabel}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {item.englishName} ({item.shortCode.toUpperCase()})
                    </span>
                  </span>
                  {isSelected ? (
                    <span
                      data-testid={`lang-active-check-${item.shortCode}`}
                      aria-label="Selected"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs"
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

