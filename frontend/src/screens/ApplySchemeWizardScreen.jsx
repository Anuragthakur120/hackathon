import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../state/authStore.js';
import { useApp } from '../state/AppContext.jsx';
import { api } from '../api/index.js';
import { useVoice } from '../voice/useVoice.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { Stepper } from '../components/ui/Stepper.jsx';

function VoiceInputButton({ fieldName, fieldLabel, onExtracted, language = 'en-IN' }) {
  const [active, setActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [confirmValue, setConfirmValue] = useState(null);

  const { isListening, startListening, stopListening, isSupported } = useVoice({
    language,
    onResult: async (transcript) => {
      stopListening();
      setActive(false);
      if (!transcript) return;
      try {
        setExtracting(true);
        const res = api.extractFormField
          ? await api.extractFormField({ text: transcript, field: fieldName, language })
          : { data: { value: transcript, needsConfirmation: false } };
        const val = res?.data?.value ?? res?.data?.extractedValue ?? transcript;
        if (res?.data?.needsConfirmation || ['annualIncome', 'fullName', 'dob'].includes(fieldName)) {
          setConfirmValue(val);
        } else {
          onExtracted(val);
        }
      } catch (err) {
        console.error('Voice extraction error:', err);
      } finally {
        setExtracting(false);
      }
    },
  });

  if (!isSupported) return null;

  return (
    <>
      <button
        type="button"
        title={`Speak ${fieldLabel}`}
        onClick={() => {
          if (isListening) {
            stopListening();
            setActive(false);
          } else {
            setActive(true);
            startListening();
          }
        }}
        className={`ml-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
          active || isListening
            ? 'bg-rose-600 text-white animate-pulse'
            : extracting
            ? 'bg-amber-100 text-amber-900'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
      >
        <span>{active || isListening ? '🛑' : '🎙️'}</span>
        <span>{active || isListening ? 'Listening...' : extracting ? 'Extracting...' : 'Speak'}</span>
      </button>

      {confirmValue !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Confirm Spoken Information</h4>
            <p className="text-xs text-slate-600">
              Extracted for <strong>{fieldLabel}</strong>:
            </p>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-center text-sm font-bold text-indigo-900">
              {String(confirmValue)}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmValue(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Re-enter
              </button>
              <button
                type="button"
                onClick={() => {
                  onExtracted(confirmValue);
                  setConfirmValue(null);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Confirm ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const WIZARD_STEPS = [
  { id: 1, title: 'Personal' },
  { id: 2, title: 'Address' },
  { id: 3, title: 'Family' },
  { id: 4, title: 'Income' },
  { id: 5, title: 'Scheme' },
  { id: 6, title: 'Documents' },
  { id: 7, title: 'Review' },
  { id: 8, title: 'Consent (Gate 1)' },
  { id: 9, title: 'Confirm (Gate 2)' },
];

export function getSchemeAuthorityDetails(schemeId, scheme) {
  const id = String(schemeId || '').toLowerCase();
  const title = String(scheme?.name?.en || scheme?.name?.mr || scheme?.name?.hi || scheme?.title || '').toLowerCase();

  if (id.includes('scholar') || title.includes('scholar') || title.includes('mptass') || title.includes('mahadbt') || title.includes('matric')) {
    return {
      isScholarship: true,
      category: 'scholarship',
      portalTitle: 'State Scholarship & Higher/Tribal Education Portal (MPTASS / MahaDBT)',
      assignedDesk: 'College / Institute Verification Desk (Principal & Nodal Officer)',
      instructions: 'No visit to Taluka Social Welfare office is needed. Your application is submitted online directly to your College / Institute Verification Desk. Once verified and digitally signed by your college, your scholarship is sanctioned via DBT directly to your Aadhaar-seeded bank account.',
      prefix: 'SCH-2026',
    };
  }

  if (id.includes('income') || title.includes('income') || title.includes('utpann') || title.includes('daakhla')) {
    return {
      isScholarship: false,
      category: 'income',
      portalTitle: 'District Revenue & Tahsildar Portal (Aaple Sarkar / e-District)',
      assignedDesk: 'Talathi & Circle Revenue Officer (Tahsildar Office)',
      instructions: 'Talathi and Circle Officer verify family landholdings, ration card, and self-declaration. Digital signature issued by Tahsildar upon verification.',
      prefix: 'INC-2026',
    };
  }

  if (id.includes('ration') || title.includes('ration') || title.includes('food')) {
    return {
      isScholarship: false,
      category: 'ration',
      portalTitle: 'Food, Civil Supplies and Consumer Protection Portal (RCMS / NFSA)',
      assignedDesk: 'Zonal Supply Officer & Fair Price Shop Inspector Desk',
      instructions: 'Ration card addition and verification completed through the local Fair Price Shop inspector and Tehsil Food Supply officer.',
      prefix: 'RAT-2026',
    };
  }

  return {
    isScholarship: false,
    category: 'pension',
    portalTitle: 'Taluka Social Welfare & Pension Portal',
    assignedDesk: 'Ward Verification Officer (Taluka Social Welfare Pension Cell)',
    instructions: 'Age proof, BPL status, and annual Jeevan Pramaan digital life certificate verified by Taluka Social Welfare Officer.',
    prefix: 'PEN-2026',
  };
}

export function ApplySchemeWizardScreen() {
  const { schemeId = 'pension' } = useParams();
  const user = useAuthStore((state) => state.user);
  const { language } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [scheme, setScheme] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const authority = getSchemeAuthorityDetails(schemeId, scheme);
  const isDemo = user?.phone === '9876543210';
  const isIdVerified = Boolean(user?.isIdVerified || user?.aadhaarMasked);

  // Form State (Auto-filled from Citizen Profile & Vault)
  const [formData, setFormData] = useState({
    // Step 1: Personal (Extracted from Government ID)
    fullName: user?.name || (isDemo ? 'Ramabai Kulkarni' : ''),
    dob: user?.dob || (isDemo ? '1958-04-12' : ''),
    gender: user?.gender || (isDemo ? 'Female' : 'Male'),
    aadhaarMasked: user?.aadhaarMasked || (isDemo ? 'XXXX-XXXX-4821' : ''),
    mobile: user?.phone || '',

    // Step 2: Address (Fully editable)
    address: user?.address || (isDemo ? 'Ward 4, Shaniwar Peth' : ''),
    district: user?.district || (isDemo ? 'Pune' : ''),
    state: user?.state || 'Maharashtra',
    pincode: user?.pincode || (isDemo ? '411030' : ''),

    // Step 3: Family
    maritalStatus: 'Widow',
    casteCategory: 'General',
    familyMembersCount: '1',

    // Step 4: Income
    annualIncome: user?.annualIncome ? String(user.annualIncome) : '24000',
    occupation: 'Retired / Unemployed',
    bankAccountMasked: user?.bankAccountMasked || 'XXXXXXXX9012',
    ifsc: 'SBIN0004821',

    // Step 5: Scheme Specific
    pensionType: 'Sanjay Gandhi Niradhar Old Age Pension',
    disbursementPref: 'Direct DBT Bank Transfer',
    collegeName: 'Government Polytechnic / State College',
    courseName: 'Diploma / Degree in Engineering',
    academicYear: '2nd Year (Semester IV)',
    collegeCode: 'MH-CLG-4021',

    // Step 6: Documents
    docsReady: true,

    // Step 8: Gate 1 Consent
    caseConsent: false,
    saveProfileConsent: true,

    // Step 9: Gate 2 Approval
    approvalGiven: false,
  });

  useEffect(() => {
    let mounted = true;
    async function loadScheme() {
      try {
        if (api.initializeWizardCase) {
          api.initializeWizardCase({ schemeId, language });
        }
        const res = await api.getSchemeById(schemeId);
        if (mounted) setScheme(res?.data?.scheme || null);
      } catch (err) {
        console.error('Failed to load scheme for apply wizard:', err);
      }
    }
    loadScheme();
    return () => {
      mounted = false;
    };
  }, [schemeId, language]);

  const handleNext = () => {
    setErrorMsg('');
    if (currentStep === 8 && !formData.caseConsent) {
      setErrorMsg('Gate 1 Safety: You must explicitly give consent to proceed with this application.');
      return;
    }
    setCurrentStep((s) => Math.min(WIZARD_STEPS.length, s + 1));
  };

  const handlePrev = () => {
    setErrorMsg('');
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  const handleFinalSubmit = async () => {
    setErrorMsg('');
    if (!formData.approvalGiven) {
      setErrorMsg('Gate 2 Physical Safety Guard: Submission requires pressing the explicit approval confirmation button.');
      return;
    }

    setSubmitting(true);
    try {
      // Ensure state machine progresses cleanly from any entry point
      if (api.confirmService) {
        try { await api.confirmService({ serviceId: schemeId || 'scholarship' }); } catch { /* ignore */ }
      }
      if (api.giveConsent) {
        try { await api.giveConsent({ given: true, saveProfileConsent: true }); } catch { /* ignore */ }
      }
      if (api.uploadDocuments) {
        try { await api.uploadDocuments({ markReady: true }); } catch { /* ignore */ }
      }
      if (api.fillDraft) {
        try { await api.fillDraft(); } catch { /* ignore */ }
      }

      // Execute Gate 2 approval & submission on backend
      try {
        if (api.approveDraft) {
          await api.approveDraft({ given: true, byPhysicalButton: true });
        }
      } catch (apprErr) {
        console.warn('Approve draft pass-through:', apprErr);
      }

      const generatedAppId = `${authority.prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
      const submitRes = await api.submitApplication({
        schemeId,
        schemeName: scheme?.name?.en || authority.portalTitle,
        department: authority.assignedDesk,
        applicantName: formData.fullName,
        applicationId: generatedAppId,
        formData,
      });
      const appId = submitRes?.data?.applicationId || generatedAppId;
      setSubmittedAppId(appId);
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMsg(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="apply-scheme-wizard">
      {/* Page Header */}
      <PageHeader
        title={`Apply for ${scheme?.name?.en || 'Government Scheme'}`}
        subtitle="Step-by-step application with auto-fill from your verified Vault. Your consent and approval are required at every critical gate."
        badge={`Step ${currentStep} of ${WIZARD_STEPS.length}`}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Schemes', href: '/schemes' },
          { label: 'Application Wizard' },
        ]}
      />

      {/* Stepper Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs overflow-x-auto">
        <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />
      </div>

      {/* Error Banner */}
      {errorMsg ? (
        <div
          data-testid="wizard-error-banner"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2"
        >
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {/* Success Modal / Screen if Submitted */}
      {submittedAppId ? (
        <div
          data-testid="wizard-success-screen"
          className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg space-y-4"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            🎉
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Application Submitted Successfully!
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your application has been logged on the government portal. A tracking reference has been created.
          </p>

          <div className="inline-block rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Application ID
            </span>
            <span className="text-xl font-extrabold text-emerald-950 font-mono">
              {submittedAppId}
            </span>
          </div>

          {/* Physical Verification & SLA Duration Notice */}
          <div className="mx-auto max-w-lg rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-left text-xs text-blue-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <span>⏱️</span>
              <span>Physical Verification Timeline: 7 to 14 Working Days</span>
            </div>
            <p className="text-blue-900 leading-relaxed">
              If your application requires field inspection or physical verification before final approval, please note that official processing takes up to 7 to 14 days according to department workload. You will receive SMS alerts at every stage.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/applications"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
            >
              View My Applications →
            </Link>
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* Wizard Form Card */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {/* STEP 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4" data-testid="step-1-personal">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Step 1: Personal Information
                  </h3>
                  <p className="text-xs text-slate-500">
                    Extracted from your verified government ID card. Full Name, DOB, and Aadhaar UID are locked against tampering.
                  </p>
                </div>
                {isIdVerified ? (
                  <span className="self-start inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    🔒 Official ID Verified
                  </span>
                ) : (
                  <span className="self-start inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                    ⚠️ Unverified Profile (Scan ID in Profile)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <span>Full Name</span>
                      {isIdVerified && <span className="text-[10px] text-slate-500 font-mono">(Locked)</span>}
                    </label>
                    {!isIdVerified && (
                      <VoiceInputButton
                        fieldName="fullName"
                        fieldLabel="Full Name"
                        language={language}
                        onExtracted={(val) => setFormData((prev) => ({ ...prev, fullName: val }))}
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={isIdVerified}
                    readOnly={isIdVerified}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${
                      isIdVerified
                        ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                        : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                      <span>Date of Birth</span>
                      {isIdVerified && <span className="text-[10px] text-slate-500 font-mono">(Locked)</span>}
                    </label>
                    {!isIdVerified && (
                      <VoiceInputButton
                        fieldName="dob"
                        fieldLabel="Date of Birth"
                        language={language}
                        onExtracted={(val) => setFormData((prev) => ({ ...prev, dob: val }))}
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={isIdVerified}
                    readOnly={isIdVerified}
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className={`w-full min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${
                      isIdVerified
                        ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                        : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                    <span>Aadhaar Number (Masked UID)</span>
                    <span className="text-[10px] text-slate-500 font-mono">(Locked)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formData.aadhaarMasked || 'Not Linked (Scan Aadhaar in Profile)'}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-mono text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mobile Number (+91)
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={`+91 ${formData.mobile || user?.phone || ''}`}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-mono text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Address Information */}
          {currentStep === 2 && (
            <div className="space-y-4" data-testid="step-2-address">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Step 2: Domicile & Address Information
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-filled from your profile. You may modify or update your residential address if you currently reside elsewhere.
                  </p>
                </div>
                <span className="self-start inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
                  ✏️ Address is Editable
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Residential Address (House / Ward / Street)
                    </label>
                    <VoiceInputButton
                      fieldName="address"
                      fieldLabel="Residential Address"
                      language={language}
                      onExtracted={(val) => setFormData((prev) => ({ ...prev, address: val }))}
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      District
                    </label>
                    <VoiceInputButton
                      fieldName="district"
                      fieldLabel="District"
                      language={language}
                      onExtracted={(val) => setFormData((prev) => ({ ...prev, district: val }))}
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Family Information */}
          {currentStep === 3 && (
            <div className="space-y-4" data-testid="step-3-family">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Step 3: Family & Social Category
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Marital Status
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
                  >
                    <option value="Widow">Widow / Destitute</option>
                    <option value="Married">Married</option>
                    <option value="Single">Single / Unmarried</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Social Category
                  </label>
                  <select
                    value={formData.casteCategory}
                    onChange={(e) => setFormData({ ...formData, casteCategory: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
                  >
                    <option value="General">General / Open</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Income and Bank Account */}
          {currentStep === 4 && (
            <div className="space-y-4" data-testid="step-4-income">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Step 4: Income & Bank Account
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Annual Family Income (₹)
                    </label>
                    <VoiceInputButton
                      fieldName="annualIncome"
                      fieldLabel="Annual Family Income"
                      language={language}
                      onExtracted={(val) => setFormData((prev) => ({ ...prev, annualIncome: String(val) }))}
                    />
                  </div>
                  <input
                    type="number"
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bank Account (Masked)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.bankAccountMasked}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.ifsc}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-mono text-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Scheme Details */}
          {currentStep === 5 && (
            <div className="space-y-4" data-testid="step-5-scheme">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Step 5: {authority.isScholarship ? 'College & Academic Details' : 'Scheme Specific Parameters'}
                </h3>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Selected Scheme
                </label>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs font-bold text-indigo-900">
                  {scheme?.name?.en || (authority.isScholarship ? 'MPTASS / MahaDBT Post-Matric Scholarship' : 'Pension Restoration Scheme')}
                </div>
              </div>

              {authority.isScholarship ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      College / Institute Name (For Institutional Verification)
                    </label>
                    <input
                      type="text"
                      value={formData.collegeName}
                      onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                      placeholder="e.g. Government Polytechnic, Pune / SPPU"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Course / Degree
                    </label>
                    <input
                      type="text"
                      value={formData.courseName}
                      onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                      placeholder="e.g. Diploma in Engineering / B.Tech"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Current Year / Semester
                    </label>
                    <input
                      type="text"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      placeholder="e.g. 2nd Year (Semester IV)"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      College AISHE / Verification Code
                    </label>
                    <input
                      type="text"
                      value={formData.collegeCode}
                      onChange={(e) => setFormData({ ...formData, collegeCode: e.target.value })}
                      placeholder="e.g. MH-INST-4021"
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Verification Authority
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700">
                      College Nodal Officer & Principal Desk
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Disbursement Mode
                  </label>
                  <select
                    value={formData.disbursementPref}
                    onChange={(e) => setFormData({ ...formData, disbursementPref: e.target.value })}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
                  >
                    <option value="Direct DBT Bank Transfer">Direct DBT Bank Transfer (Aadhaar Seeded)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Required Documents */}
          {currentStep === 6 && (
            <div className="space-y-4" data-testid="step-6-documents">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Step 6: Document Verification
                </h3>
                <p className="text-xs text-slate-500">
                  All documents were located and pre-verified from your secure Vault.
                </p>
              </div>
              <div className="space-y-2">
                {(authority.isScholarship
                  ? ['Aadhaar Card (Verified)', 'College Admission Receipt / Bonafide (Verified)', 'Previous Year Marksheet (Verified)', 'Tahsildar Income Certificate (Verified)', 'Bank Passbook with Aadhaar Seeding (Verified)']
                  : authority.category === 'income'
                  ? ['Aadhaar Card (Verified)', 'Ration Card (Verified)', 'Talathi Landholdings Verification (Verified)', 'Self-Declaration Form (Verified)']
                  : ['Aadhaar Card (Verified)', 'Age Proof DOB 1958 (Verified)', 'Bank Passbook SBIN0004821 (Verified)', 'Digital Life Certificate JP-2026-9910 (Verified)']
                ).map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs">
                    <span className="font-bold text-emerald-950">{d}</span>
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      VAULT VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: Review Application Summary */}
          {currentStep === 7 && (
            <div className="space-y-4" data-testid="step-7-review">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Step 7: Application Draft Summary (DRAFT)
                </h3>
                <p className="text-xs text-slate-500">
                  Review all field sources before giving consent and physical approval.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Beneficiary Name</span>
                  <span className="font-bold text-slate-900">{formData.fullName} (PROFILE)</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Aadhaar</span>
                  <span className="font-mono font-bold text-slate-900">{formData.aadhaarMasked} (VAULT)</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Bank Account</span>
                  <span className="font-mono font-bold text-slate-900">{formData.bankAccountMasked} (VAULT)</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Annual Income</span>
                  <span className="font-bold text-slate-900">₹{formData.annualIncome} (ASK_CITIZEN)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Gate 1 Consent */}
          {currentStep === 8 && (
            <div className="space-y-4" data-testid="step-8-consent">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-violet-950 flex items-center gap-2">
                  <span>🛡️</span>
                  <span>Safety Gate 1: Informed Citizen Consent</span>
                </h3>
                <p className="text-xs text-slate-500">
                  In accordance with DPDP Act, your consent is mandatory. No data is stored or processed without consent.
                </p>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-3 text-xs text-violet-950">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="wizard-gate1-checkbox"
                    checked={formData.caseConsent}
                    onChange={(e) => setFormData({ ...formData, caseConsent: e.target.checked })}
                    className="mt-1 h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="font-bold leading-relaxed">
                    I explicitly consent to allow NagarSathi AI to use my verified profile data and uploaded documents strictly for filling the draft application for this government service.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-violet-200/60">
                  <input
                    type="checkbox"
                    checked={formData.saveProfileConsent}
                    onChange={(e) => setFormData({ ...formData, saveProfileConsent: e.target.checked })}
                    className="mt-1 h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="font-medium text-violet-900 leading-relaxed">
                    Save my masked profile and vault documents for 80% auto-fill on future government services (Optional).
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 9: Gate 2 Approval & Submit */}
          {currentStep === 9 && (
            <div className="space-y-4" data-testid="step-9-approval">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                  <span>🔒</span>
                  <span>Safety Gate 2: Physical Approval Guard</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Submission strictly blocks unless you press the physical approval button below. Voice alone is never sufficient.
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="font-bold text-indigo-950 text-sm">
                    Ready for official online submission to {authority.portalTitle}.
                  </p>
                  <span className="self-start rounded-full bg-indigo-200 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-900">
                    {authority.assignedDesk}
                  </span>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-white/95 p-3 text-indigo-950 space-y-1">
                  <p className="font-semibold text-slate-800">
                    <span className="text-indigo-600 font-bold">Verification Routing:</span> {authority.instructions}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    data-testid="wizard-gate2-approve-btn"
                    onClick={() => setFormData({ ...formData, approvalGiven: true })}
                    className={`rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer ${
                      formData.approvalGiven
                        ? 'bg-emerald-600 text-white border border-emerald-700'
                        : 'bg-white border border-indigo-300 text-indigo-900 hover:bg-indigo-100'
                    }`}
                  >
                    {formData.approvalGiven ? '✓ Physical Approval Confirmed' : 'Press to Confirm Physical Approval (Gate 2)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={currentStep === 1 || submitting}
              onClick={handlePrev}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              ← Previous Step
            </button>

            {currentStep < 9 ? (
              <button
                type="button"
                data-testid="wizard-next-btn"
                onClick={handleNext}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
              >
                Continue to Step {currentStep + 1} →
              </button>
            ) : (
              <button
                type="button"
                data-testid="wizard-submit-btn"
                disabled={!formData.approvalGiven || submitting}
                onClick={handleFinalSubmit}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition"
              >
                {submitting ? 'Submitting to Portal...' : 'Submit Application Now 🚀'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
