const TONE_CLASSES = {
  samajhna: {
    selected:
      'border-indigo-600 bg-indigo-50 text-indigo-950 ring-4 ring-indigo-600/20',
    idle: 'border-slate-300 bg-white text-slate-900 hover:border-indigo-500 hover:bg-indigo-50/40',
    badge: 'bg-indigo-600 text-white',
  },
  karna: {
    selected:
      'border-emerald-600 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-600/20',
    idle: 'border-slate-300 bg-white text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/40',
    badge: 'bg-emerald-600 text-white',
  },
  peecha: {
    selected:
      'border-amber-600 bg-amber-50 text-amber-950 ring-4 ring-amber-600/20',
    idle: 'border-slate-300 bg-white text-slate-900 hover:border-amber-500 hover:bg-amber-50/40',
    badge: 'bg-amber-600 text-white',
  },
  consent: {
    selected:
      'border-violet-600 bg-violet-50 text-violet-950 ring-4 ring-violet-600/20',
    idle: 'border-slate-300 bg-white text-slate-900 hover:border-violet-500 hover:bg-violet-50/40',
    badge: 'bg-violet-600 text-white',
  },
  change: {
    selected:
      'border-rose-600 bg-rose-50 text-rose-950 ring-4 ring-rose-600/20',
    idle: 'border-rose-300 bg-white text-slate-900 hover:border-rose-500 hover:bg-rose-50/40',
    badge: 'bg-rose-600 text-white',
  },
  submit: {
    selected:
      'border-emerald-600 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-600/20',
    idle: 'border-emerald-300 bg-white text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/40',
    badge: 'bg-emerald-600 text-white',
  },
};

/**
 * BigChoiceButton: Large answer button (min 72px height) designed for low-literacy
 * and elderly citizens. Features a big icon/option badge, high-contrast title,
 * optional native-script subtitle, and selected/disabled states.
 */
export function BigChoiceButton({
  title,
  subtitle,
  icon = '👉',
  badgeText = '',
  tone = 'samajhna',
  selected = false,
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  const palette = TONE_CLASSES[tone] || TONE_CLASSES.samajhna;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={disabled ? undefined : onClick}
      className={[
        'w-full min-h-[76px] p-5 rounded-2xl border-2 text-left',
        'flex items-center justify-between gap-4 shadow-sm',
        'transition-all duration-200 motion-reduce:transition-none',
        'hover:shadow-md hover:-translate-y-0.5',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        selected ? palette.selected : palette.idle,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-2xl shrink-0"
        >
          {icon}
        </span>
        <div>
          <div className="text-xl font-extrabold leading-snug">{title}</div>
          {subtitle && (
            <div className="text-base text-slate-600 mt-0.5 leading-relaxed">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {badgeText && (
        <span
          className={`px-3 py-1 rounded-full text-sm font-extrabold shrink-0 ${palette.badge}`}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
}

export default BigChoiceButton;
