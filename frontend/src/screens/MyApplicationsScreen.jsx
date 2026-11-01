import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { SearchBar } from '../components/SearchBar.jsx';
import { StatusBadge } from '../components/ui/Chip.jsx';

const STATUS_FILTERS = [
  'ALL',
  'SUBMITTED',
  'TRACKING',
  'QUERY_RAISED',
  'STALLED',
  'APPROVED',
  'CLOSED',
];

export function MyApplicationsScreen() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let mounted = true;
    async function loadApps() {
      try {
        setLoading(true);
        const res = await api.getApplications();
        if (mounted) {
          setApplications(res?.data?.applications || []);
        }
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadApps();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredApps = applications.filter((app) => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        app.applicationId?.toLowerCase().includes(q) ||
        app.schemeName?.toLowerCase().includes(q) ||
        app.referenceNumber?.toLowerCase().includes(q) ||
        app.department?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="my-applications-screen">
      {/* Page Header */}
      <PageHeader
        title="My Government Applications"
        subtitle="Track submitted requests, view official portal Application IDs, check officer objections, and review stage progress."
        badge={`${applications.length} Requests`}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'My Applications' },
        ]}
        actions={
          <Link
            to="/schemes"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
          >
            + New Service Request
          </Link>
        }
      />

      {/* Filter and Search Bar Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <SearchBar
          value={search}
          onChange={(val) => setSearch(val)}
          onClear={() => setSearch('')}
          placeholder="Search applications by ID (e.g. PEN-2026-88213), scheme name, or reference..."
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* SLA Processing Advisory Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 text-xs text-blue-950 flex items-start gap-3 shadow-xs">
        <span className="text-2xl shrink-0" aria-hidden="true">⏱️</span>
        <div className="space-y-1">
          <h4 className="font-bold text-blue-950 text-sm">
            Statutory Processing & Verification Timelines (7 to 14 Working Days)
          </h4>
          <p className="text-blue-900 leading-relaxed">
            Every submitted application is logged with a government tracking reference and assigned to the relevant department or college desk. Verification typically takes <strong>7 to 14 working days</strong> according to official workload. Track live progress below.
          </p>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
          No applications match your filter criteria.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredApps.map((app) => (
            <div
              key={app.id || app.applicationId}
              data-testid={`app-row-${app.applicationId}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  {app.service === 'pension' ? '👴' : app.service === 'scholarship' ? '🎓' : '🌾'}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {app.schemeName}
                    </h3>
                    <StatusBadge status={app.status} />
                  </div>

                  <p className="text-xs text-slate-500">
                    Application ID: <span className="font-mono font-bold text-slate-800">{app.applicationId}</span> • Ref: {app.referenceNumber}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Department: {app.department}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-[11px] font-bold text-blue-900">
                      <span>⏱️</span>
                      <span>Processing Timeline: {app.estimatedTimeline || '7 to 14 Working Days'}</span>
                      {app.daysElapsed !== undefined && (
                        <span className="text-blue-700">({app.daysElapsed} days elapsed)</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <div className="text-right text-[11px] text-slate-400 hidden md:block">
                  <p>Submitted: {new Date(app.submissionDate || Date.now()).toLocaleDateString()}</p>
                  <p className="text-slate-500 font-medium">Status active</p>
                </div>

                <Link
                  to={`/applications/${app.id || app.applicationId}/tracking`}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <span>Track Status</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

