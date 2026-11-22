const PHASE_ACCENT_BAR = {
  brand: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500',
  samajhna: 'bg-gradient-to-r from-indigo-600 to-blue-600',
  karna: 'bg-gradient-to-r from-emerald-600 to-teal-500',
  peecha: 'bg-gradient-to-r from-amber-500 to-orange-500',
  'gate-consent': 'bg-violet-600',
  'gate-change': 'bg-rose-600',
  'gate-submit': 'bg-emerald-600',
};

/**
 * Govtech Card component:
 * White surface, rounded-2xl, shadow-sm, border slate-200,
 * hover:shadow-lg hover:-translate-y-0.5 transition.
 */
export function Card({
  children,
  title,
  subtitle,
  headerAction,
  accent = null,
  hoverable = true,
  className = '',
  ...rest
}) {
  const accentBar = accent ? PHASE_ACCENT_BAR[accent] : null;

  return (
    <div
      className={[
        'bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100',
        'transition-all duration-200 motion-reduce:transition-none',
        hoverable ? 'hover:shadow-md transition-shadow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {accentBar && <div className={`h-2 w-full ${accentBar}`} aria-hidden="true" />}
      <div className="p-6">
        {(title || subtitle || headerAction) && (
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              {title && (
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-base text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Card;

