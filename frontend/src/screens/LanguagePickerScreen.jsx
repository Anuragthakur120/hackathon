import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';
import { checkVoiceSupport, playFixedAudioOrSpeak } from '../voice/speak.js';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';

export function LanguagePickerScreen() {
  const { language, setLanguage, t } = useApp();
  const navigate = useNavigate();
  const [voiceCheck, setVoiceCheck] = useState(() =>
    checkVoiceSupport(language)
  );
  const [testedOnce, setTestedOnce] = useState(false);

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    playFixedAudioOrSpeak('welcome', t('languagePickerSubtitle'), {
      lang: langCode,
    });
  };

  const handleRunVoiceTest = () => {
    const result = checkVoiceSupport(language);
    setVoiceCheck(result);
    setTestedOnce(true);
    playFixedAudioOrSpeak(
      'welcome',
      'नमस्कार रमाबाई, नगरसाथीमध्ये तुमचे स्वागत आहे. आपली मराठी आवाज तपासणी सुरू आहे.',
      { lang: language }
    );
  };

  return (
    <section
      className="ns-card ns-lang-picker-screen"
      aria-labelledby="lang-picker-heading"
    >
      <div className="ns-card-top-row flex-wrap gap-2">
        <div className="ns-badge" data-testid="active-lang-badge">
          {t('activeLanguageBadge')}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LanguageSwitcher
            navTestId="landing-lang-switcher"
            triggerTestId="landing-lang-trigger"
            menuTestId="landing-lang-menu"
          />
          <button
            type="button"
            className="ns-btn ns-speaker-btn"
            data-testid="sunao-picker-btn"
            onClick={() =>
              playFixedAudioOrSpeak('welcome', t('languagePickerSubtitle'), {
                lang: language,
              })
            }
          >
            {t('sunaoBtn')}
          </button>
        </div>
      </div>

      <h1 id="lang-picker-heading" className="ns-title">
        {t('languagePickerTitle')}
      </h1>
      <p className="ns-subtitle">{t('languagePickerSubtitle')}</p>

      <div
        className="ns-huge-lang-list"
        role="group"
        aria-label={t('languagePickerTitle')}
      >
        {SUPPORTED_LANGUAGES.map((item) => {
          const isSelected = language === item.code;
          return (
            <button
              key={item.code}
              type="button"
              data-testid={`picker-lang-${item.shortCode}`}
              className={`ns-btn ns-huge-lang-btn ${
                isSelected ? 'ns-huge-lang-btn-selected' : ''
              }`}
              aria-pressed={isSelected}
              onClick={() => handleSelectLanguage(item.code)}
            >
              <span className="ns-huge-lang-native">
                {item.nativeLabel}{' '}
                <span className="text-sm font-medium opacity-80">
                  ({item.englishName})
                </span>
              </span>
              <span className="ns-huge-lang-code">
                {isSelected ? `✓ ${item.code}` : item.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Startup Self-Check: "Voice test" */}
      <div
        className="ns-voice-self-check-card"
        data-testid="voice-self-check-card"
      >
        <div className="ns-voice-check-header">
          <strong>🎙️ {t('voiceSelfCheckTitle')}</strong>
          <button
            type="button"
            className="ns-btn ns-btn-outline"
            data-testid="run-voice-test-btn"
            onClick={handleRunVoiceTest}
          >
            {t('voiceSelfCheckRunBtn')}
          </button>
        </div>
        <p
          className="ns-voice-check-status"
          data-testid="voice-check-status"
        >
          {voiceCheck.hasNativeMarathi
            ? `✅ ${t('voiceSelfCheckNativeOk')}`
            : `⚠️ ${t('voiceSelfCheckHindiFallback')}`}
          {testedOnce && voiceCheck.selectedVoiceLang
            ? ` (${voiceCheck.selectedVoiceLang})`
            : ''}
        </p>
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
