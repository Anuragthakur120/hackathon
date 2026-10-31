const VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 text-white border border-transparent shadow-sm hover:from-indigo-700 hover:via-blue-700 hover:to-teal-600 active:scale-[0.99] focus-visible:ring-indigo-500',
  secondary:
    'bg-white text-slate-900 border-2 border-slate-300 shadow-sm hover:bg-slate-100 hover:border-slate-400 active:bg-slate-200 focus-visible:ring-slate-500',
  ghost:
    'bg-transparent text-slate-800 border border-transparent hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-500',
  danger:
    'bg-red-600 text-white border border-transparent shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
  samajhna:
    'bg-indigo-600 text-white border border-transparent shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500',
  karna:
    'bg-emerald-600 text-white border border-transparent shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
  peecha:
    'bg-amber-600 text-white border border-transparent shadow-sm hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-amber-500',
  'gate-consent':
    'bg-violet-600 text-white border border-transparent shadow-sm hover:bg-violet-700 active:bg-violet-800 focus-visible:ring-violet-500',
  'gate-change':
    'bg-rose-600 text-white border border-transparent shadow-sm hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500',
  'gate-submit':
    'bg-emerald-600 text-white border border-transparent shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
};

/**
 * Govtech accessible Button component (min 56px touch target).
 * Supports primary gradient, secondary, ghost, danger, phase, and gate variants,
 * plus hover, active, focus-visible ring, loading, and disabled states.
 */
export function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ariaLabel,
  onClick,
  ...rest
}) {
  const isDisabled = Boolean(disabled || loading);
  const variantCls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      onClick={isDisabled ? undefined : onClick}
      className={[
        'inline-flex items-center justify-center gap-2.5 min-h-[56px] min-w-[56px] px-5 py-3 rounded-xl font-bold text-base leading-snug',
        'transition-all duration-200 motion-reduce:transition-none',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        fullWidth ? 'w-full' : '',
        variantCls,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          data-testid="button-spinner"
          aria-hidden="true"
          className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none"
        />
      ) : (
        leftIcon && <span aria-hidden="true">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  );
}

export default Button;

