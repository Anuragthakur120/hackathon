const CHIP_VARIANTS = {
  samajhna: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  karna: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  peecha: 'bg-amber-100 text-amber-900 border-amber-300',
  consent: 'bg-violet-100 text-violet-900 border-violet-300',
  change: 'bg-rose-100 text-rose-900 border-rose-300',
  submit: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  success: 'bg-green-100 text-green-900 border-green-300',
  warning: 'bg-amber-100 text-amber-900 border-amber-300',
  danger: 'bg-red-100 text-red-900 border-red-300',
  neutral: 'bg-slate-100 text-slate-800 border-slate-300',
};

const STATUS_TO_VARIANT = {
  LANGUAGE_SELECTED: 'samajhna',
  INTAKE: 'samajhna',
  CLARIFYING: 'samajhna',
  SERVICE_CONFIRMED: 'samajhna',
  CONSENT_PENDING: 'consent',
  CONSENTED: 'consent',
  PROFILE_SAVE_CONSENT: 'karna',
  DOCS_CHECKLIST: 'karna',
  DOCS_COLLECTING: 'karna',
  DOCS_READY: 'karna',
  FORM_FILLED: 'karna',
  APPROVED: 'submit',
  SUBMITTED: 'peecha',
  TRACKING: 'peecha',
  QUERY_RAISED: 'warning',
  STALLED: 'danger',
  CALLED: 'peecha',
  CLOSED: 'success',
};

/**
 * Chip component using the strict phase, gate, and semantic token families.
 */
export function Chip({
  children,
  variant = 'neutral',
  icon = null,
  className = '',
  ...rest
}) {
  const cls = CHIP_VARIANTS[variant] || CHIP_VARIANTS.neutral;
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-bold leading-snug',
        cls,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

/**
 * StatusBadge maps any of the 16 NagarSathi case statuses to its phase/gate/semantic Chip.
 */
export function StatusBadge({ status = 'INTAKE', label, className = '', ...rest }) {
  const variant = STATUS_TO_VARIANT[status] || 'neutral';
  return (
    <Chip variant={variant} className={className} {...rest}>
      {label || status}
    </Chip>
  );
}

export default Chip;
