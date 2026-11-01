import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { useAuthStore } from '../state/authStore.js';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatisticsCard } from '../components/StatisticsCard.jsx';
import { SchemeCard } from '../components/SchemeCard.jsx';
import { StatusBadge } from '../components/ui/Chip.jsx';

export function CitizenDashboardScreen() {
  const { language, t } = useApp();
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [statsRes, schemesRes, appsRes, notifsRes] = await Promise.all([
          api.getDashboardStats ? api.getDashboardStats() : Promise.resolve({ data: {} }),
          api.getSchemes ? api.getSchemes({ limit: 4 }) : Promise.resolve({ data: { schemes: [] } }),
          api.getApplications ? api.getApplications() : Promise.resolve({ data: { applications: [] } }),
          api.getNotifications ? api.getNotifications() : Promise.resolve({ data: { notifications: [] } }),
        ]);

        if (mounted) {
          setStats(statsRes?.data?.stats || null);
          setSchemes(schemesRes?.data?.schemes || []);
          setApplications(appsRes?.data?.applications || []);
          setNotifications((notifsRes?.data?.notifications || []).slice(0, 3));
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const citizenName = user?.name || stats?.citizen?.name || 'Citizen';

  return (
    <div className="w-full space-y-8" data-testid="citizen-dashboard">
      {loading ? (
        <div className="h-1 w-full bg-indigo-100 overflow-hidden rounded-full" aria-hidden="true">
          <div className="h-full bg-indigo-600 animate-pulse w-1/3" />
        </div>
      ) : null}
      {/* 1. Page Header with Greeting & Quick Action */}
      <PageHeader
        title={`${t('greetingMorning') || 'Welcome,'} ${citizenName}`}
        subtitle="Access government citizen services, monitor application progress, and verify benefits with human-guarded AI assistance."
        badge="Citizen Portal"
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              to="/schemes"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
            >
              Browse Schemes →
            </Link>
            <Link
              to="/assistant"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition flex items-center gap-1.5"
            >
              <span>🎙️</span>
              <span>AI Assistant</span>
            </Link>
          </div>
        }
      />

      {/* 2. Key Metrics Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticsCard
          testId="stat-total-applications"
          label="Total Applications"
          value={stats?.totalApplications ?? applications.length ?? 0}
          icon="📋"
          color="indigo"
          subtitle="All active requests"
        />
        <StatisticsCard
          testId="stat-approved-applications"
          label="Approved Applications"
          value={stats?.approvedApplications ?? stats?.approved ?? 0}
          icon="✅"
          color="emerald"
          subtitle="Benefit sanctioned"
        />
        <StatisticsCard
          testId="stat-pending-applications"
          label="Pending Applications"
          value={stats?.pendingApplications ?? stats?.pending ?? 0}
          icon="⏳"
          color="amber"
          subtitle="Under review"
        />
        <StatisticsCard
          testId="stat-uploaded-documents"
          label="Uploaded Documents"
          value={stats?.uploadedDocuments ?? stats?.documentsUploaded ?? 0}
          icon="📄"
          color="blue"
          subtitle="Secure in vault"
        />
      </div>

      {/* 3. Hero Quick Action Card (Voice First / Start Request) */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-300">
              <span>🏛️</span>
              <span>City-02 Citizen AI Assistant</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Apply for Services in Your Own Language
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              No complex forms or bureaucratic jargon. Speak or write your problem in Marathi, Hindi, or English. NagarSathi verifies your documents and prepares draft forms safely.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/assistant"
              data-testid="start-new-request-btn"
              className="rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 px-6 py-3.5 text-center text-sm font-extrabold text-slate-950 shadow-md hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              <span>🎤</span>
              <span>Start a New Request</span>
            </Link>
            <Link
              to="/eligibility"
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-center text-sm font-bold text-white hover:bg-white/20 transition"
            >
              Check Eligibility
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Active Applications & Recent Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Active Applications */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                My Active Applications
              </h3>
              <p className="text-xs text-slate-500">
                Track current progress and departmental actions
              </p>
            </div>
            <Link
              to="/applications"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              View All ({applications.length}) →
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <span className="text-3xl block mb-2">📄</span>
              <p className="text-sm font-semibold">No applications submitted yet.</p>
              <p className="text-xs text-slate-400 mt-1">Start a new service request using the voice assistant or explore programs below.</p>
              <Link
                to="/schemes"
                className="mt-3 inline-block rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
              >
                Explore Schemes
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.slice(0, 3).map((app) => (
                <div
                  key={app.id || app.applicationId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                      {app.service === 'pension' ? '👴' : app.service === 'scholarship' ? '🎓' : '🌾'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {app.schemeName || 'Government Service Application'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        App ID: <span className="font-semibold text-slate-700">{app.applicationId}</span> • Ref: {app.referenceNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusBadge status={app.status} />
                    <Link
                      to={`/applications/${app.id || app.applicationId}/tracking`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition"
                    >
                      Track →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Recent Notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Notifications
              </h3>
              <Link
                to="/notifications"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                All →
              </Link>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <span className="text-xl block mb-1">🔔</span>
                  No new notifications.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.notificationId || n.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1 font-bold text-slate-800">
                      <span className="line-clamp-1">{n.title}</span>
                      {!n.read ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/support"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <span>📞</span>
            <span>Need Help? Contact Madad Kendra</span>
          </Link>
        </div>
      </div>

      {/* 5. All Government Schemes Showcase */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
              All Government Schemes
            </h3>
            <p className="text-xs text-slate-500">
              Verified state and central citizen welfare programs
            </p>
          </div>
          <Link
            to="/schemes"
            data-testid="dashboard-view-all-schemes-btn"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            View All ({schemes.length}) →
          </Link>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {schemes.map((scheme) => (
            <SchemeCard key={scheme.schemeId} scheme={scheme} language={language} />
          ))}
        </div>
      </div>

      {/* 6. Quick Action Navigation Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Quick Portal Actions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center">
          <Link
            to="/schemes"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition"
          >
            <span className="text-xl">🔍</span>
            <span className="text-xs font-bold text-slate-800">Find Schemes</span>
          </Link>
          <Link
            to="/eligibility"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition"
          >
            <span className="text-xl">🎯</span>
            <span className="text-xs font-bold text-slate-800">Check Eligibility</span>
          </Link>
          <Link
            to="/documents"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition"
          >
            <span className="text-xl">📁</span>
            <span className="text-xs font-bold text-slate-800">Document Vault</span>
          </Link>
          <Link
            to="/applications"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition"
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-bold text-slate-800">My Applications</span>
          </Link>
          <Link
            to="/workflow"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition"
          >
            <span className="text-xl">⚡</span>
            <span className="text-xs font-bold text-slate-800">16-Step Demo</span>
          </Link>
          <Link
            to="/support"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-indigo-50/50 hover:border-indigo-200 transition"
          >
            <span className="text-xl">🤝</span>
            <span className="text-xs font-bold text-slate-800">Madad Kendra</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
