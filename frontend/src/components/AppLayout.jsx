import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { getMacroPhase, MACRO_PHASES } from '../state/caseMachine.js';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';

export function AppLayout({ children }) {
  const { t, caseState } = useApp();
  const location = useLocation();
  const activePhase = getMacroPhase(caseState.status);

  const phases = [
    {
      id: MACRO_PHASES.SAMAJHNA,
      title: t('phaseSamajhna'),
      desc: t('phaseSamajhnaDesc'),
    },
    {
      id: MACRO_PHASES.KARNA,
      title: t('phaseKarna'),
      desc: t('phaseKarnaDesc'),
    },
    {
      id: MACRO_PHASES.PEECHA_KARNA,
      title: t('phasePeechaKarna'),
      desc: t('phasePeechaKarnaDesc'),
    },
  ];

  return (
    <div className="ns-shell">
      <a
        href="#ns-main-content"
        className="ns-skip-link"
        data-testid="skip-to-main-link"
      >
        {t('skipToMainLabel')}
      </a>

      <header className="ns-header" role="banner">
        <div className="ns-header-brand">
          <Link to="/" className="ns-brand-link">
            <span className="ns-brand-title">{t('appName')}</span>
          </Link>
          <p className="ns-brand-slogan">{t('slogan')}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <LanguageSwitcher navTestId="header-lang-nav" />
          {location.pathname !== '/' && (
            <Link to="/" className="ns-btn ns-btn-outline">
              {t('changeLanguage')}
            </Link>
          )}
        </div>
      </header>

      <section
        className="ns-progress-bar"
        aria-label={t('progressBarAriaLabel')}
        data-testid="progress-bar-section"
      >
        <div className="ns-progress-grid">
          {phases.map((phase) => {
            const isCurrent = activePhase === phase.id;
            return (
              <div
                key={phase.id}
                data-testid={`phase-${phase.id}`}
                className={`ns-phase-step ${isCurrent ? 'ns-phase-step-active' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="ns-phase-title">{phase.title}</div>
                <div className="ns-phase-desc">{phase.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <main id="ns-main-content" className="ns-main" role="main" tabIndex={-1}>
        {children}
      </main>

      <footer className="ns-footer" role="contentinfo">
        <p data-testid="prototype-footer">{t('footerDisclaimer')}</p>
      </footer>
    </div>
  );
}
