export function StatisticsCard({
  label,
  value,
  icon,
  color = 'indigo',
  subtitle,
  testId,
}) {
  const COLOR_MAP = {
    indigo: {
      bg: 'bg-indigo-50/80',
      text: 'text-indigo-950',
      iconBg: 'bg-indigo-600 text-white',
      border: 'border-indigo-100',
    },
    emerald: {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-950',
      iconBg: 'bg-emerald-600 text-white',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50/80',
      text: 'text-amber-950',
      iconBg: 'bg-amber-600 text-white',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50/80',
      text: 'text-rose-950',
      iconBg: 'bg-rose-600 text-white',
      border: 'border-rose-100',
    },
    blue: {
      bg: 'bg-blue-50/80',
      text: 'text-blue-950',
      iconBg: 'bg-blue-600 text-white',
      border: 'border-blue-100',
    },
  };

  const scheme = COLOR_MAP[color] || COLOR_MAP.indigo;

  return (
    <div
      data-testid={testId}
      className={`relative overflow-hidden rounded-2xl border ${scheme.border} bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>
          ) : null}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-xs ${scheme.iconBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

