const BAR_COLORS = {
  brand: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500',
  samajhna: 'bg-gradient-to-r from-indigo-600 to-blue-600',
  karna: 'bg-gradient-to-r from-emerald-600 to-teal-500',
  peecha: 'bg-gradient-to-r from-amber-500 to-orange-500',
  consent: 'bg-violet-600',
  success: 'bg-green-600',
};

/**
 * Accessible ProgressBar component supporting phase-specific color families.
 */
export function ProgressBar({
  value = 50,
  max = 100,
  phase = 'brand',
  label = 'Progress',
  showPercentage = true,
  className = '',
}) {
  const clampedPct = Math.min(
    100,
    Math.max(0, Math.round((Number(value) / Number(max || 100)) * 100))
  );
  const fillClass = BAR_COLORS[phase] || BAR_COLORS.brand;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        {showPercentage && (
          <span className="text-sm font-extrabold text-slate-900">
            {clampedPct}%
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clampedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-200 motion-reduce:transition-none ${fillClass}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;

