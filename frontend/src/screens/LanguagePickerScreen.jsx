import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export function LanguagePickerScreen() {
  const { language, setLanguage, t } = useApp();
  const navigate = useNavigate();

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
  };

  return (
    <section className="ns-card ns-lang-picker-screen" aria-labelledby="lang-picker-heading">
      <div className="ns-badge" data-testid="active-lang-badge">
        {t('activeLanguageBadge')}
      </div>

      <h1 id="lang-picker-heading" className="ns-title">
        {t('languagePickerTitle')}
      </h1>
      <p className="ns-subtitle">{t('languagePickerSubtitle')}</p>

      <div className="ns-huge-lang-list" role="group" aria-label={t('languagePickerTitle')}>
        {SUPPORTED_LANGUAGES.map((item) => {
          const isSelected = language === item.code;
          return (
            <button
              key={item.code}
              type="button"
              data-testid={`picker-lang-${item.shortCode}`}
              className={`ns-btn ns-huge-lang-btn ${isSelected ? 'ns-huge-lang-btn-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => handleSelectLanguage(item.code)}
            >
              <span className="ns-huge-lang-native">{item.nativeLabel}</span>
              <span className="ns-huge-lang-code">{item.code}</span>
            </button>
          );
        })}
      </div>

      <div className="ns-picker-actions">
        <button
          type="button"
          data-testid="continue-to-app-btn"
          className="ns-btn ns-btn-primary ns-btn-large"
          onClick={() => navigate('/app')}
        >
          {t('continueToApp')}
        </button>
      </div>
    </section>
  );
}

