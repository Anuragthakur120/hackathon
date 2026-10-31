/**
 * NagarSathi (CITY-02) — Canonical Design System Tokens (MODULE UI-0)
 * Strictly aligned with `frontend/tailwind.config.js`.
 */
export const DESIGN_TOKENS = Object.freeze({
  brandGradient: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500',
  pageBackground: 'bg-slate-50',
  cardBase:
    'bg-white rounded-2xl shadow-sm border border-slate-200 transition-all duration-200',
  cardHover: 'hover:shadow-lg hover:-translate-y-0.5',
  touchTargetMinPx: 56,
  baseFontSizePx: 18,
  fonts: [
    'Inter',
    'Noto Sans Devanagari',
    'Noto Sans Gujarati',
    'Noto Sans Bengali',
    'Noto Sans Tamil',
    'Noto Sans Telugu',
  ],
  phases: {
    samajhna: {
      id: 'samajhna',
      number: 1,
      name: '1 Samajhna (Understand)',
      family: 'indigo/blue',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      headerClass: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white',
      barClass: 'bg-gradient-to-r from-indigo-600 to-blue-600',
      buttonClass:
        'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500',
      borderClass: 'border-indigo-200',
    },
    karna: {
      id: 'karna',
      number: 2,
      name: '2 Karna (Execute)',
      family: 'emerald/teal',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      headerClass: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white',
      barClass: 'bg-gradient-to-r from-emerald-600 to-teal-500',
      buttonClass:
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
      borderClass: 'border-emerald-200',
    },
    peecha: {
      id: 'peecha',
      number: 3,
      name: '3 Peecha karna (Follow-up)',
      family: 'amber/orange',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      headerClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950',
      barClass: 'bg-gradient-to-r from-amber-500 to-orange-500',
      buttonClass:
        'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-amber-500',
      borderClass: 'border-amber-200',
    },
  },
  gates: {
    consent: {
      id: 'gate1-consent',
      name: 'Gate 1 Consent',
      family: 'violet',
      badgeClass: 'bg-violet-100 text-violet-900 border-violet-300',
      cardClass: 'bg-violet-50/70 border-violet-300',
      buttonClass:
        'bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 focus-visible:ring-violet-500',
    },
    approvalChange: {
      id: 'gate2-change',
      name: 'Gate 2 Approval — Change',
      family: 'rose',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
      buttonClass:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500',
    },
    approvalSubmit: {
      id: 'gate2-submit',
      name: 'Gate 2 Approval — Submit',
      family: 'emerald',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      buttonClass:
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
    },
  },
  semantic: {
    danger: {
      family: 'red',
      badgeClass: 'bg-red-100 text-red-900 border-red-300',
    },
    success: {
      family: 'green',
      badgeClass: 'bg-green-100 text-green-900 border-green-300',
    },
    warning: {
      family: 'amber',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    },
  },
});

export default DESIGN_TOKENS;
