import { Link } from 'react-router-dom';
import { isCitizenVerified } from '../utils/verifyDocument.js';

const CATEGORY_COLORS = {
  Pension: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Education: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Healthcare: 'bg-teal-50 text-teal-700 border-teal-200',
  Housing: 'bg-amber-50 text-amber-700 border-amber-200',
  Employment: 'bg-blue-50 text-blue-700 border-blue-200',
  Agriculture: 'bg-green-50 text-green-700 border-green-200',
  'Financial Assistance': 'bg-rose-50 text-rose-700 border-rose-200',
  'Social Welfare': 'bg-purple-50 text-purple-700 border-purple-200',
};

export function SchemeCard({ scheme, language = 'en' }) {
  const langKey = language?.startsWith('hi') ? 'hi' : language?.startsWith('mr') ? 'mr' : 'en';

  const name = scheme.name?.[langKey] || scheme.name?.en || 'Government Scheme';
  const description = scheme.description?.[langKey] || scheme.description?.en || '';
  const benefits = scheme.benefits?.[langKey] || scheme.benefits?.en || '';
  const department = scheme.department?.[langKey] || scheme.department?.en || 'Govt Department';

  const categoryClass = CATEGORY_COLORS[scheme.category] || 'bg-slate-100 text-slate-700 border-slate-200';

  const requiresStrictId = ['Pension', 'Financial Assistance', 'Social Welfare'].includes(scheme.category);
  const citizenVerified = isCitizenVerified();
  const isLocked = requiresStrictId && !citizenVerified;

  return (
    <div
      data-testid={`scheme-card-${scheme.schemeId}`}
      className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md min-w-0 overflow-hidden break-words [word-break:break-word]"
      style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-word' }}
    >
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Meta: Category & Code (Single Row, No Wrapping) */}
        <div className="flex items-center justify-between gap-2 mb-3.5 w-full">
          <span
            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold whitespace-nowrap shrink-0 ${categoryClass}`}
            style={{ whiteSpace: 'nowrap' }}
            title={scheme.category}
          >
            {scheme.category}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {isLocked ? (
              <span
                data-testid={`scheme-lock-badge-${scheme.schemeId}`}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                title="Verify Aadhaar/PAN to unlock this scheme"
              >
                🔒 Verify Aadhaar/PAN
              </span>
            ) : citizenVerified && requiresStrictId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                ✓ Unlocked
              </span>
            ) : null}
            <span
              className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
              style={{ whiteSpace: 'nowrap' }}
            >
              {scheme.code}
            </span>
          </div>
        </div>

        {/* Scheme Header: Fixed 48px Icon Beside Title */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform"
            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', maxWidth: '48px', maxHeight: '48px' }}
          >
            {scheme.icon || '🏛️'}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-[18px] sm:text-[19px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-[1.3] line-clamp-3 overflow-hidden break-words [word-break:break-word]"
              style={{ lineHeight: 1.3, wordBreak: 'break-word' }}
            >
              <Link to={`/schemes/${scheme.schemeId}`} title={name}>{name}</Link>
            </h3>
            <p className="text-xs font-medium text-slate-500 truncate mt-1" title={department}>
              {department}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[2.5rem] mb-3">
          {description}
        </p>

        {/* Benefit Highlight Tag */}
        <div className="mt-auto mb-4">
          {benefits ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5 text-xs text-emerald-950 font-medium flex items-start gap-2 min-h-[46px]">
              <span className="text-sm shrink-0" aria-hidden="true">
                ✨
              </span>
              <span className="line-clamp-2 leading-snug">{benefits}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs text-slate-500 font-medium flex items-start gap-2 min-h-[46px]">
              <span className="text-sm shrink-0" aria-hidden="true">
                📋
              </span>
              <span className="line-clamp-2 leading-snug">Direct Government Citizen Benefit</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Pinned at Bottom, No Wrapping */}
      <div className="border-t border-slate-100 pt-4 mt-auto flex items-center gap-2.5">
        <Link
          to={`/schemes/${scheme.schemeId}`}
          className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
          style={{ whiteSpace: 'nowrap' }}
        >
          Details
        </Link>
        {isLocked ? (
          <Link
            to="/documents"
            className="flex-1 min-w-0 rounded-xl bg-amber-600 py-2.5 px-3 text-center text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors whitespace-nowrap"
            style={{ whiteSpace: 'nowrap' }}
            title="Verify Aadhaar or PAN in Documents Vault to apply"
          >
            Verify to Unlock 🔒
          </Link>
        ) : (
          <Link
            to={`/apply/${scheme.schemeId}`}
            className="flex-1 min-w-0 rounded-xl bg-indigo-600 py-2.5 px-3 text-center text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap"
            style={{ whiteSpace: 'nowrap' }}
          >
            Apply Now →
          </Link>
        )}
      </div>
    </div>
  );
}
