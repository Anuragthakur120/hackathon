import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

  const checkPositioning = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (detectMobileViewport()) {
      setDropUp(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > 260) {
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

    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !event.target.closest('[data-testid="language-switcher-menu"]')
      ) {
        clearCloseTimer();
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        clearCloseTimer();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
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

  const handleTriggerClick = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
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
    triggerRef.current?.focus();
  };

  // Content for the list of languages
  const languageListContent = (
    <div
      role="listbox"
      aria-label={t('languagePickerTitle')}
      data-testid={menuTestId}
      data-layout={isMobile ? 'bottom-sheet' : 'dropdown'}
      className={
        isMobile
          ? 'relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 overscroll-contain text-slate-900 dark:text-slate-100'
          : `absolute right-0 z-50 w-72 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150 text-slate-900 dark:text-slate-100 ${
              dropUp
                ? 'bottom-full mb-2 slide-in-from-bottom-2'
                : 'top-full mt-2 slide-in-from-top-2'
            }`
      }
    >
      {isMobile ? (
        <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🌐</span>
            <div>
              <span className="text-base font-black text-slate-900 dark:text-white block leading-snug">
                {t('languagePickerTitle')}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                7 Indian Languages Supported
              </span>
            </div>
          </div>
          <button
            type="button"
            data-testid="language-switcher-sheet-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 cursor-pointer"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mb-2 px-2 pt-1 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('languagePickerTitle')}
          </span>
          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
            {SUPPORTED_LANGUAGES.length} Languages
          </span>
        </div>
      )}

      {/* Language items container */}
      <div
        className={
          isMobile
            ? 'flex flex-col gap-2 overflow-y-auto overscroll-contain pr-1 pb-6'
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
              className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer min-h-[56px] border ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/80 dark:to-blue-950/80 text-indigo-950 dark:text-indigo-200 font-bold border-indigo-200 dark:border-indigo-800 shadow-xs'
                  : 'bg-transparent text-slate-700 dark:text-slate-300 font-semibold border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex flex-col">
                <span className="text-base font-extrabold leading-tight text-slate-900 dark:text-white">
                  {item.nativeLabel}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.englishName} ({item.shortCode.toUpperCase()})
                </span>
              </span>
              {isSelected ? (
                <span
                  data-testid={`lang-active-check-${item.shortCode}`}
                  aria-label="Selected"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs"
                >
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );

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
        className="ns-btn min-h-[44px] sm:min-h-[48px] inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 px-3 sm:px-4 py-2 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 shadow-xs transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/70 dark:hover:bg-slate-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-98 cursor-pointer"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          🌐
        </span>
        <span data-testid="language-switcher-current-label" className="font-bold text-slate-900 dark:text-white">
          {activeMeta.nativeLabel}
        </span>
        <span
          aria-hidden="true"
          className={`text-xs text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? (dropUp ? '-rotate-180' : 'rotate-180') : ''
          }`}
        >
          ▾
        </span>
      </button>

      {/* Render Mobile Bottom Sheet with Portal (escapes all parent overflow and stacking traps) */}
      {isOpen && isMobile && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
              <div
                data-testid="language-switcher-backdrop"
                aria-hidden="true"
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              />
              {languageListContent}
            </div>,
            document.body
          )
        : isOpen && !isMobile
        ? languageListContent
        : null}
    </nav>
  );
}
