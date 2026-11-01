import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';

const FAQS = [
  {
    q: 'How does NagarSathi protect my Aadhaar and Bank Account details?',
    a: 'All sensitive identifiers are encrypted using AES-256-GCM before storage. Only the masked last-4 digits are displayed in the interface and sent to AI models.',
  },
  {
    q: 'Can an application be submitted by voice alone?',
    a: 'No. NagarSathi enforces Safety Gate 2. Submission requires an explicit physical button press by the citizen after reviewing the draft summary.',
  },
  {
    q: 'What should I do if my application is stalled (+21 days)?',
    a: 'Go to your application tracking page and tap "Simulate Office Call". NagarSathi AI Caller will simulate an inquiry call to the Taluka Welfare Officer and log an escalation reference.',
  },
  {
    q: 'How does 80% auto-fill work for a second service?',
    a: 'When you give consent to save your profile during your first application, your verified identity, address, and vault documents are stored securely. When applying for another scheme (like MahaDBT Scholarship), verified fields are pre-filled automatically.',
  },
];

export function HelpSupportScreen() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: 'APPLICATION_DELAY',
    subject: '',
    description: '',
    priority: 'HIGH',
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getSupportTickets();
      setTickets(res?.data?.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createSupportTicket(ticketForm);
      setShowModal(false);
      setTicketForm({
        category: 'APPLICATION_DELAY',
        subject: '',
        description: '',
        priority: 'HIGH',
      });
      fetchTickets();
    } catch (err) {
      console.error('Create ticket failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="support-screen">
      {/* Page Header */}
      <PageHeader
        title="Help & Citizen Support (Madad Kendra)"
        subtitle="Frequently asked questions, official government helplines, complaint escalation, and grievance ticket tracking."
        badge="Madad Kendra"
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Help & Support' },
        ]}
        actions={
          <button
            type="button"
            data-testid="create-ticket-btn"
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
          >
            + Create Support Ticket
          </button>
        }
      />

      {/* Helplines Strip (Demo vs Official Clearly Labeled) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📞</span>
            <h3 className="text-sm font-bold text-indigo-950">
              Verified Government Helplines (Official)
            </h3>
          </div>
          <p className="text-xs text-indigo-900 leading-relaxed">
            • Chief Minister Citizen Helpline: <span className="font-bold">1800-120-8040</span> (Toll-Free, 24x7)
          </p>
          <p className="text-xs text-indigo-900 leading-relaxed">
            • Social Justice Pension Cell: <span className="font-bold">020-26122652</span> (Pune Division)
          </p>
          <p className="text-xs text-indigo-900 leading-relaxed">
            • MahaDBT Scholarship Helpline: <span className="font-bold">022-49150800</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="text-sm font-bold text-slate-900">
              NagarSathi AI Assistance (Demo Service)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Need real-time assistance in your own language? Tap below to speak with the NagarSathi AI voice assistant.
          </p>
          <div className="pt-2">
            <Link
              to="/assistant"
              className="inline-flex items-center gap-1.5 font-bold text-xs text-indigo-600 hover:text-indigo-800"
            >
              <span>🎙️ Talk to AI Assistant</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Support Tickets Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              My Support & Grievance Tickets ({tickets.length})
            </h3>
            <p className="text-xs text-slate-500">
              Track officer replies and grievance escalations
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ) : tickets.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No active support tickets found.
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.ticketId}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{t.ticketId}</span>
                    <span className="rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                      {t.category}
                    </span>
                  </div>
                  <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    {t.status}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{t.subject}</h4>
                <p className="text-slate-600">{t.description}</p>

                {t.responses?.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                      <span>Officer Reply ({t.responses[0].author})</span>
                      <time className="text-slate-400 font-normal">
                        {new Date(t.responses[0].createdAt).toLocaleDateString()}
                      </time>
                    </div>
                    <p className="text-slate-700 font-medium">{t.responses[0].message}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Frequently Asked Questions (FAQ) Accordion */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Frequently Asked Questions
        </h3>

        <div className="divide-y divide-slate-100">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-slate-800 hover:text-indigo-600"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 text-lg ml-2">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen ? (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                    {faq.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Create Support / Grievance Ticket
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-800"
                >
                  <option value="APPLICATION_DELAY">Application Delay / Stall</option>
                  <option value="SCHEME_INQUIRY">Scheme Eligibility Question</option>
                  <option value="DOCUMENT_VERIFICATION">Document Rejection Issue</option>
                  <option value="COMPLAINT">Grievance / Complaint</option>
                  <option value="OTHER">Other Assistance</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pension application delayed for 2 weeks"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Description of Issue
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide any relevant details, Application ID, or office information..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Submitting Ticket...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

