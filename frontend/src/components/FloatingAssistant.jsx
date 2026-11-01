import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { playFixedAudioOrSpeak } from '../voice/speak.js';

export function FloatingAssistant({ onQuickPrompt }) {
  const { t, language } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSpeakSample = () => {
    playFixedAudioOrSpeak(
      'welcome',
      t('floatingAssistantDesc'),
      { lang: language }
    );
  };

  const handlePreset = (promptText) => {
    if (typeof onQuickPrompt === 'function') {
      onQuickPrompt(promptText);
    }
    navigate(`/assistant?prompt=${encodeURIComponent(promptText)}`, {
      state: { initialPrompt: promptText, timestamp: Date.now() },
    });
    setIsOpen(false);
  };

  const handleAssistantClick = (e) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    navigate('/assistant', {
      state: { autoStartMic: true, greeting: true, timestamp: Date.now() },
    });
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Floating Action Button */}
      <aside aria-label="NagarSathi Assistant" className="fixed bottom-20 md:bottom-8 right-5 z-40">
        <button
          type="button"
          data-testid="floating-assistant-btn"
          aria-label={t('floatingAssistantLabel')}
          aria-expanded={isOpen}
          onClick={handleToggle}
          onDoubleClick={handleAssistantClick}
          className="group relative flex min-h-[56px] items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 px-5 py-3 text-white shadow-xl shadow-indigo-500/30 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 active:scale-95 cursor-pointer"
        >
          {/* Subtle glowing ring */}
          <span className="absolute -inset-1 -z-10 rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 opacity-60 blur-sm group-hover:opacity-100 animate-pulse" />
          <span className="text-xl" aria-hidden="true">🎙️</span>
          <span className="text-sm font-bold tracking-wide">
            {t('floatingAssistantLabel')}
          </span>
        </button>
      </aside>

      {/* Slide-over Assistant Panel (UI-7 placeholder panel) */}
      {isOpen ? (
        <aside aria-label="Voice Assistant Panel" className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            data-testid="floating-assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-panel-title"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl backdrop-blur-sm">
                  🎙️
                </span>
                <div>
                  <h3 id="assistant-panel-title" className="text-base font-bold text-white">
                    {t('floatingAssistantTitle')}
                  </h3>
                  <p className="text-xs text-indigo-100">
                    Voice-First GovTech Assistant (CITY-02)
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-assistant-btn"
                aria-label={t('closeAssistant')}
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Panel Body */}
            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <p className="text-sm font-medium text-indigo-950 leading-relaxed">
                  {t('floatingAssistantDesc')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="assistant-sunao-btn"
                    onClick={handleSpeakSample}
                    className="ns-btn min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <span>🔊</span>
                    <span>{t('sunaoBtn')}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="open-full-assistant-btn"
                    onClick={handleAssistantClick}
                    className="ns-btn min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    <span>🎙️</span>
                    <span>Open Full Voice Assistant Screen →</span>
                  </button>
                </div>
              </div>

              {/* Quick Prompt Presets */}
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick Prompts:
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    data-testid="assistant-preset-pension"
                    onClick={() => handlePreset('माझी पेन्शन बंद झाली (Pension stopped)')}
                    className="ns-btn min-h-[48px] w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <span>👵 &ldquo;माझी पेन्शन बंद झाली&rdquo;</span>
                    <span className="text-xs text-indigo-600 font-bold">Start →</span>
                  </button>
                  <button
                    type="button"
                    data-testid="assistant-preset-scholarship"
                    onClick={() => handlePreset('शिष्यवृत्ती अर्ज भरायचा आहे (Apply for scholarship)')}
                    className="ns-btn min-h-[48px] w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <span>🎓 &ldquo;शिष्यवृत्ती अर्ज भरायचा आहे&rdquo;</span>
                    <span className="text-xs text-emerald-600 font-bold">Start →</span>
                  </button>
                  <button
                    type="button"
                    data-testid="assistant-preset-income"
                    onClick={() => handlePreset('उत्पन्नाचा दाखला कसा काढायचा? (Income certificate)')}
                    className="ns-btn min-h-[48px] w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50/50"
                  >
                    <span>📜 &ldquo;उत्पन्नाचा दाखला कसा काढायचा?&rdquo;</span>
                    <span className="text-xs text-blue-600 font-bold">Start →</span>
                  </button>
                  <button
                    type="button"
                    data-testid="assistant-preset-ration"
                    onClick={() => handlePreset('रेशन कार्ड मध्ये नाव जोडायचे आहे (Ration card update)')}
                    className="ns-btn min-h-[48px] w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-amber-300 hover:bg-amber-50/50"
                  >
                    <span>🍚 &ldquo;रेशन कार्ड मध्ये नाव जोडायचे आहे&rdquo;</span>
                    <span className="text-xs text-amber-600 font-bold">Start →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}

