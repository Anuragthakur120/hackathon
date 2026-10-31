const DEFAULT_PHASES = [
  {
    id: 'samajhna',
    number: 1,
    title: '1. Samajhna (Understand)',
    subtitle: 'समजून घेणे • समझना',
    activeClass:
      'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-600/20',
    badgeClass: 'bg-indigo-600 text-white',
  },
  {
    id: 'karna',
    number: 2,
    title: '2. Karna (Execute)',
    subtitle: 'प्रत्यक्ष कृती • करना',
    activeClass:
      'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20',
    badgeClass: 'bg-emerald-600 text-white',
  },
  {
    id: 'peecha',
    number: 3,
    title: '3. Peecha karna (Follow-up)',
    subtitle: 'पाठपुरावा • पीछा करना',
    activeClass:
      'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600/20',
    badgeClass: 'bg-amber-600 text-white',
  },
];

/**
 * 3-Phase Govtech Stepper component using each phase's dedicated color family:
 *   1 Samajhna = indigo/blue
 *   2 Karna = emerald/teal
 *   3 Peecha karna = amber/orange
 */
export function Stepper({
  activePhase = 'samajhna',
  steps = DEFAULT_PHASES,
  onSelectPhase,
  className = '',
}) {
  const activeIdx = Math.max(
    0,
    steps.findIndex((s) => s.id === activePhase)
  );

  return (
    <nav aria-label="Journey phases" className={`w-full ${className}`}>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 list-none p-0 m-0">
        {steps.map((step, idx) => {
          const isActive = step.id === activePhase;
          const isCompleted = idx < activeIdx;

          return (
            <li key={step.id}>
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                disabled={typeof onSelectPhase !== 'function'}
                onClick={() => onSelectPhase?.(step.id)}
                className={[
                  'w-full min-h-[68px] text-left p-4 rounded-2xl border-2 transition-all duration-200',
                  'flex items-center gap-3.5',
                  'focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30',
                  isActive
                    ? step.activeClass
                    : isCompleted
                      ? 'border-green-500 bg-green-50/70 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700',
                  typeof onSelectPhase === 'function'
                    ? 'cursor-pointer hover:shadow-md'
                    : 'cursor-default',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-extrabold shrink-0',
                    isActive
                      ? step.badgeClass
                      : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-800',
                  ].join(' ')}
                >
                  {isCompleted ? '✓' : step.number || idx + 1}
                </span>
                <div>
                  <div className="font-extrabold text-base leading-snug">
                    {step.title}
                  </div>
                  {step.subtitle && (
                    <div className="text-sm text-slate-600 mt-0.5 leading-snug">
                      {step.subtitle}
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
