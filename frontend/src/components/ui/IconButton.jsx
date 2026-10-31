const ICON_VARIANT_CLASSES = {
  primary:
    'bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 text-white hover:from-indigo-700 hover:to-teal-600 focus-visible:ring-indigo-500',
  secondary:
    'bg-white text-slate-900 border-2 border-slate-300 hover:bg-slate-100 focus-visible:ring-slate-500',
  ghost:
    'bg-transparent text-slate-800 hover:bg-slate-100 focus-visible:ring-slate-500',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  speaker:
    'bg-indigo-50 text-indigo-900 border-2 border-indigo-200 hover:bg-indigo-100 focus-visible:ring-indigo-500',
};

/**
 * Accessible IconButton with strict >= 56px x 56px touch target and aria-label.
 */
export function IconButton({
  icon,
  children,
  ariaLabel = 'Action button',
  variant = 'secondary',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  ...rest
}) {
  const isDisabled = Boolean(disabled || loading);
  const variantCls =
    ICON_VARIANT_CLASSES[variant] || ICON_VARIANT_CLASSES.secondary;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onClick={isDisabled ? undefined : onClick}
      className={[
        'inline-flex items-center justify-center min-h-[56px] min-w-[56px] p-3 rounded-xl font-bold',
        'transition-all duration-200 motion-reduce:transition-none',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantCls,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin motion-reduce:animate-none"
        />
      ) : (
        <span aria-hidden="true" className="text-xl leading-none">
          {icon || children || '🔊'}
        </span>
      )}
    </button>
  );
}

export default IconButton;
