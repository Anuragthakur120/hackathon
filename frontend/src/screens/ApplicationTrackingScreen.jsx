import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { ApplicationTimeline } from '../components/ApplicationTimeline.jsx';
import { StatusBadge } from '../components/ui/Chip.jsx';

export function ApplicationTrackingScreen() {
  const { id } = useParams();

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulatingCall, setSimulatingCall] = useState(false);
  const [callResolved, setCallResolved] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchTracking() {
      try {
        setLoading(true);
        const res = await api.getApplicationTracking(id);
        if (mounted) {
          setTrackingData(res?.data || null);
        }
      } catch (err) {
        console.error('Failed to load tracking data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchTracking();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSimulateOfficeCall = async () => {
    setSimulatingCall(true);
    try {
      if (api.endCall) {
        await api.endCall({ callId: 'CALL-TRACKING-001' });
      }
      setTimeout(() => {
        setSimulatingCall(false);
        setCallResolved(true);
      }, 1200);
    } catch (err) {
      console.error('Call failed:', err);
      setSimulatingCall(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const app = trackingData || {
    applicationId: 'PEN-2026-88213',
    referenceNumber: 'REF-5521',
    status: 'STALLED',
    department: 'Taluka Social Welfare Office, Pune',
    scheme: 'pension',
    stalled: true,
    queryActive: false,
    daysElapsed: 21,
    timeline: [],
    nextAction: 'Simulate Office Call with AI Caller to expedite resolution',
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="application-tracking-screen">
      {/* Page Header */}
      <PageHeader
        title={`Application Tracking: ${app.applicationId}`}
        subtitle="Live state machine timeline, office query resolution, and automated stall delay detection."
        badge={app.status}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'My Applications', href: '/applications' },
          { label: app.applicationId },
        ]}
        actions={
          <Link
            to="/workflow"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            ⚡ Open 16-Step Ramabai Journey
          </Link>
        }
      />

      {/* Delay / Stall Alert Banner (if stalled) */}
      {app.stalled && !callResolved ? (
        <div
          data-testid="stall-alert-banner"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0" aria-hidden="true">
                ⏳
              </span>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Application Delay Detected (+21 Days / 7 Days Stalled)
                </h3>
                <p className="mt-0.5 text-xs text-amber-900 leading-relaxed max-w-2xl">
                  This application has remained pending at the Ward Verification Desk beyond the statutory SLA. NagarSathi AI Caller is ready to place a simulated follow-up call to the Taluka Welfare Officer on your behalf.
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="trigger-office-call-btn"
              disabled={simulatingCall}
              onClick={handleSimulateOfficeCall}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition shrink-0 cursor-pointer"
            >
              {simulatingCall ? 'Simulating Call with Officer...' : '📞 Simulate Office Call Now'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Call Resolved Success Banner */}
      {callResolved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <span>✓</span>
          <span>
            Office Call simulated successfully! Officer verified the life certificate and logged escalation reference REF-5521. Application returned to TRACKING.
          </span>
        </div>
      ) : null}

      {/* Official Physical Verification Timeline Notice */}
      <div
        data-testid="verification-timeline-notice"
        className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 p-4 text-xs text-blue-950 flex items-start gap-3 shadow-xs"
      >
        <span className="text-2xl shrink-0" aria-hidden="true">⏱️</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-blue-950 text-sm">
              Physical Verification & Processing Timeline
            </h4>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
              7 to 14 Working Days
            </span>
          </div>
          <p className="text-blue-900 leading-relaxed">
            If your application is not yet submitted or approved following physical verification, please note that official processing and ward officer approval take up to <strong>7 to 14 days according to workload</strong> and verification requirements. You will receive SMS alerts as each milestone completes.
          </p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            APPLICATION ID
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
            {app.applicationId}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            OFFICIAL REFERENCE
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 mt-1 block">
            {app.referenceNumber}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            DAYS ELAPSED
          </span>
          <span className="text-sm font-bold text-slate-900 mt-1 block">
            {app.daysElapsed} days
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            CURRENT STATUS
          </span>
          <div className="mt-1">
            <StatusBadge status={callResolved ? 'TRACKING' : app.status} />
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline Stepper */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-6">
            Application Progress Timeline
          </h3>
          <ApplicationTimeline
            timeline={app.timeline}
            currentStatus={callResolved ? 'TRACKING' : app.status}
          />
        </div>

        {/* Right Col: Department Details & Next Steps */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-slate-900">Department & Verification Details</h4>
            <p className="text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Department:</span>{' '}
              {String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('scholar') || String(app.applicationId || '').startsWith('SCH')
                ? 'Directorate of Higher Education & Tribal Development (MPTASS / MahaDBT)'
                : String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('income') || String(app.applicationId || '').startsWith('INC')
                ? 'District Revenue & Tahsildar Office'
                : app.department}
            </p>
            <p className="text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Assigned Verification Desk:</span>{' '}
              {String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('scholar') || String(app.applicationId || '').startsWith('SCH')
                ? 'College / Institute Nodal Officer Verification Desk (Principal & Committee)'
                : String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('income') || String(app.applicationId || '').startsWith('INC')
                ? 'Talathi Field Office & Circle Revenue Officer'
                : (app.assignedDesk || 'Ward Verification Officer (Pension Cell)')}
            </p>
            <p className="text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Service:</span>{' '}
              {String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('scholar') || String(app.applicationId || '').startsWith('SCH')
                ? 'MPTASS / MahaDBT Post-Matric Scholarship'
                : String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('income') || String(app.applicationId || '').startsWith('INC')
                ? 'Tahsildar Income Certificate'
                : 'Sanjay Gandhi Niradhar Scheme'}
            </p>
            {(String(app.scheme || app.service || id || app.applicationId || '').toLowerCase().includes('scholar') || String(app.applicationId || '').startsWith('SCH')) && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-2.5 text-[11px] text-indigo-950 font-medium">
                🎓 <strong>College Verification:</strong> No visit to Taluka Social Welfare office is needed. Your college nodal officer verifies your student enrollment online.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-xs space-y-2 text-xs">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span>💡</span>
              <span>Recommended Next Action</span>
            </h4>
            <p className="text-indigo-900 font-medium leading-relaxed">
              {app.nextAction}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-bold text-slate-900">Explain Letter (&ldquo;Ye chitthi samjhao&rdquo;)</h4>
            <p className="text-slate-500">
              Received a physical letter or notice from the department?
            </p>
            <Link
              to="/workflow"
              className="block rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              📷 Scan & Explain Official Letter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
