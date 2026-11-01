import { useApp } from '../state/AppContext.jsx';

export function AuthBrandPanel() {
  const { t } = useApp();

  return (
    <div className="relative hidden w-full lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-600 to-teal-600 p-10 xl:p-14 text-white shadow-2xl">
      {/* Background soft blur blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

      {/* Top Brand */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/20">
          <span className="text-3xl" aria-hidden="true">🏛️</span>
          <div>
            <div className="text-2xl font-black tracking-tight text-white">NagarSathi</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-200">GovTech India AI</div>
          </div>
        </div>

        <p className="mt-8 text-2xl font-bold leading-relaxed text-indigo-50 xl:text-3xl">
          &ldquo;{t('sloganOriginal')}&rdquo;
        </p>
        <p className="mt-2 text-sm text-indigo-200">
          {t('slogan')}
        </p>
      </div>

      {/* Middle 3-Phase Highlights */}
      <div className="relative z-10 my-8 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-teal-200">
          {t('phaseExplainerTitle')}
        </div>

        <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/15 transition-all hover:bg-white/15">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/40 text-xl">
            🎙️
          </div>
          <div>
            <div className="text-base font-bold text-white">{t('auth.phase1Title')}</div>
            <div className="text-xs text-indigo-100">{t('auth.phase1Desc')}</div>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/15 transition-all hover:bg-white/15">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/40 text-xl">
            📝
          </div>
          <div>
            <div className="text-base font-bold text-white">{t('auth.phase2Title')}</div>
            <div className="text-xs text-indigo-100">{t('auth.phase2Desc')}</div>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/15 transition-all hover:bg-white/15">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/40 text-xl">
            🔍
          </div>
          <div>
            <div className="text-base font-bold text-white">{t('auth.phase3Title')}</div>
            <div className="text-xs text-indigo-100">{t('auth.phase3Desc')}</div>
          </div>
        </div>
      </div>

      {/* Footer Trust badge */}
      <div className="relative z-10 border-t border-white/20 pt-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-100">
          <span className="text-base" aria-hidden="true">🛡️</span>
          <span>{t('auth.trustStrip')}</span>
        </div>
      </div>
    </div>
  );
}

