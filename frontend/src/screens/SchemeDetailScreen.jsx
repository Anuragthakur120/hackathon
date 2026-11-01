import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';

export function SchemeDetailScreen() {
  const { id } = useParams();
  const { language } = useApp();

  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadScheme() {
      try {
        setLoading(true);
        const res = await api.getSchemeById(id);
        if (mounted) {
          setScheme(res?.data?.scheme || null);
        }
      } catch (err) {
        console.error('Failed to load scheme details:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadScheme();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800">Scheme Not Found</h2>
        <Link to="/schemes" className="mt-4 inline-block text-sm font-bold text-indigo-600">
          ← Back to all schemes
        </Link>
      </div>
    );
  }

  const langKey = language?.startsWith('hi') ? 'hi' : language?.startsWith('mr') ? 'mr' : 'en';
  const name = scheme.name?.[langKey] || scheme.name?.en;
  const description = scheme.description?.[langKey] || scheme.description?.en;
  const benefits = scheme.benefits?.[langKey] || scheme.benefits?.en;
  const department = scheme.department?.[langKey] || scheme.department?.en;
  const criteriaText = scheme.eligibilityCriteria?.criteriaText?.[langKey] || scheme.eligibilityCriteria?.criteriaText?.en;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="scheme-detail-screen">
      {/* Header */}
      <PageHeader
        title={name}
        subtitle={department}
        badge={scheme.category}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Government Schemes', href: '/schemes' },
          { label: scheme.code },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              to={`/eligibility?scheme=${scheme.schemeId}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              🎯 Check Eligibility
            </Link>
            <Link
              to={`/apply/${scheme.schemeId}`}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
            >
              Apply Now →
            </Link>
          </div>
        }
      />

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Description, Benefits & Process */}
        <div className="md:col-span-2 space-y-6">
          {/* Overview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">About the Scheme</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
          </div>

          {/* Key Benefits */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <span>✨</span>
              <span>Scheme Benefits & Financial Assistance</span>
            </h2>
            <p className="text-sm text-emerald-900 font-medium leading-relaxed">{benefits}</p>
          </div>

          {/* Eligibility Criteria */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Eligibility Criteria</h2>
            {criteriaText ? (
              <p className="text-sm text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                {criteriaText}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-slate-400 font-bold block mb-1">AGE RANGE</span>
                <span className="font-bold text-slate-800">
                  {scheme.eligibilityCriteria?.minAge || 0} to {scheme.eligibilityCriteria?.maxAge || 100} years
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-slate-400 font-bold block mb-1">RESIDENCE / STATE</span>
                <span className="font-bold text-slate-800">
                  {scheme.eligibilityCriteria?.state || 'All India'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-slate-400 font-bold block mb-1">MAX ANNUAL INCOME</span>
                <span className="font-bold text-slate-800">
                  {scheme.eligibilityCriteria?.maxIncome ? `Up to ₹${scheme.eligibilityCriteria.maxIncome.toLocaleString()}` : 'No Income Limit'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-slate-400 font-bold block mb-1">GENDER</span>
                <span className="font-bold text-slate-800">
                  {scheme.eligibilityCriteria?.gender || 'All'}
                </span>
              </div>
            </div>
          </div>

          {/* Application Steps */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">Application Process</h2>
            <ol className="space-y-2.5 text-xs text-slate-700">
              {(scheme.applicationProcess || []).map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 font-medium">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right Col: Documents, Dates & Official Source */}
        <div className="space-y-6">
          {/* Required Documents Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Required Documents</h3>
            <ul className="space-y-2 text-xs text-slate-700">
              {(scheme.requiredDocuments || []).map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span className="font-medium capitalize">{doc.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Important Dates */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Important Dates</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Applications Open:</span>
                <span className="font-bold text-slate-800">{scheme.importantDates?.startDate || 'Ongoing'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Deadline:</span>
                <span className="font-bold text-slate-800">{scheme.importantDates?.deadline || 'Open All Year'}</span>
              </div>
            </div>
          </div>

          {/* Official Source Reference */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Official Portal Source</h3>
            <p className="text-slate-600 leading-relaxed">
              Authority: <span className="font-semibold text-slate-800">{scheme.officialReference?.authority}</span>
            </p>
            {scheme.officialReference?.url ? (
              <a
                href={scheme.officialReference.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:underline"
              >
                <span>Visit Official Website</span>
                <span>↗</span>
              </a>
            ) : null}
          </div>

          {/* Ask AI Assistant */}
          <Link
            to="/assistant"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-indigo-50 border border-indigo-200 p-3.5 text-center text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            <span>🎙️</span>
            <span>Ask NagarSathi Assistant About This Scheme</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

