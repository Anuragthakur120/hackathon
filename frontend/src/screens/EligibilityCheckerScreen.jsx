import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';

export function EligibilityCheckerScreen() {
  const [formData, setFormData] = useState({
    age: '68',
    gender: 'Female',
    state: 'Maharashtra',
    district: 'Pune',
    occupation: 'Retired',
    income: '24000',
    category: 'General',
  });

  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    try {
      const res = await api.checkEligibility({
        age: Number(formData.age),
        gender: formData.gender,
        state: formData.state,
        district: formData.district,
        occupation: formData.occupation,
        income: Number(formData.income),
        category: formData.category,
      });
      setResults(res?.data || null);
    } catch (err) {
      console.error('Eligibility check error:', err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="eligibility-screen">
      {/* Page Header */}
      <PageHeader
        title="AI Welfare Scheme Eligibility Checker"
        subtitle="Answer a few simple questions to discover which central and Maharashtra government welfare schemes match your demographic profile."
        badge="Smart Match"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Eligibility Checker' },
        ]}
      />

      {/* Questionnaire Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Citizen Demographic Questionnaire
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Your answers are processed locally and securely. No personal identifiers are transmitted without consent.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Age */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Age (in years)
              </label>
              <input
                type="number"
                data-testid="eligibility-age-input"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                data-testid="eligibility-gender-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                State / UT
              </label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Other">Other State</option>
              </select>
            </div>

            {/* Annual Income */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Annual Family Income (₹)
              </label>
              <input
                type="number"
                data-testid="eligibility-income-input"
                value={formData.income}
                onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Occupation
              </label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              >
                <option value="Retired">Retired / Senior Citizen</option>
                <option value="Farmer">Farmer / Cultivator</option>
                <option value="Student">Student (College / Higher Sec)</option>
                <option value="Daily Wage">Daily Wage / Unorganized</option>
                <option value="Homemaker">Homemaker</option>
                <option value="Self-employed">Self-employed / Shopkeeper</option>
              </select>
            </div>

            {/* Social Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Social Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              >
                <option value="General">General / Open</option>
                <option value="OBC">OBC</option>
                <option value="SC">Scheduled Caste (SC)</option>
                <option value="ST">Scheduled Tribe (ST)</option>
                <option value="VJNT">VJNT / NT</option>
                <option value="EWS">Economically Weaker Section (EWS)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              data-testid="check-eligibility-btn"
              disabled={checking}
              className="rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
            >
              {checking ? 'Evaluating Criteria...' : 'Evaluate My Eligibility →'}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {results ? (
        <div className="space-y-6" data-testid="eligibility-results">
          {/* Important Government Disclaimer Alert */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
            <span className="text-base shrink-0" aria-hidden="true">
              ⚖️
            </span>
            <div className="space-y-1">
              <span className="font-bold">Official Disclaimer:</span>
              <p className="leading-relaxed text-amber-800">
                {results.disclaimer}
              </p>
            </div>
          </div>

          {/* 1. Eligible Schemes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white font-bold">
                ✓
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                Eligible Schemes ({results.eligible?.length || 0})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(results.eligible || []).map((s) => (
                <div
                  key={s.schemeId}
                  className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
                      {s.category}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-700">
                      {s.matchScore}% Match
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{s.name?.en}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.benefits?.en}</p>
                  </div>

                  <div className="space-y-1 text-xs text-emerald-900 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="font-bold block text-[11px] text-emerald-950 uppercase tracking-wider">
                      Why you match:
                    </span>
                    {s.reasons.map((r, i) => (
                      <p key={i} className="flex items-center gap-1.5">
                        <span>•</span>
                        <span>{r}</span>
                      </p>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <Link
                      to={`/apply/${s.schemeId}`}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-center text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                    >
                      Apply for Scheme →
                    </Link>
                    <Link
                      to={`/schemes/${s.schemeId}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Potentially Eligible Schemes */}
          {results.potentiallyEligible?.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white font-bold">
                  ~
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Potentially Eligible Schemes ({results.potentiallyEligible.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.potentiallyEligible.map((s) => (
                  <div
                    key={s.schemeId}
                    className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-xs font-bold">
                        {s.category}
                      </span>
                      <span className="text-xs font-extrabold text-amber-700">
                        {s.matchScore}% Match
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{s.name?.en}</h4>
                    </div>

                    <div className="space-y-1 text-xs text-amber-900 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      <span className="font-bold block text-[11px] text-amber-950 uppercase tracking-wider">
                        Missing Criteria:
                      </span>
                      {s.missingRequirements.map((m, i) => (
                        <p key={i} className="flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>{m}</span>
                        </p>
                      ))}
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/schemes/${s.schemeId}`}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        View Criteria Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
