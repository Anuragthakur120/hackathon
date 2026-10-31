import { useState } from 'react';
import {
  DESIGN_TOKENS,
  Button,
  IconButton,
  Card,
  Chip,
  StatusBadge,
  Input,
  OtpInput,
  Modal,
  Toast,
  Stepper,
  ProgressBar,
  Skeleton,
  EmptyState,
  BigChoiceButton,
} from '../components/ui/index.js';
import { useUiStore } from '../state/uiStore.js';

const ALL_16_STATUSES = [
  'LANGUAGE_SELECTED',
  'INTAKE',
  'CLARIFYING',
  'SERVICE_CONFIRMED',
  'CONSENT_PENDING',
  'CONSENTED',
  'PROFILE_SAVE_CONSENT',
  'DOCS_CHECKLIST',
  'DOCS_READY',
  'FORM_FILLED',
  'APPROVED',
  'SUBMITTED',
  'TRACKING',
  'QUERY_RAISED',
  'STALLED',
  'CLOSED',
];

export function StyleGuideScreen() {
  const {
    activePhase,
    setActivePhase,
    toasts,
    pushToast,
    dismissToast,
    activeModal,
    openModal,
    closeModal,
  } = useUiStore();

  const [otpValue, setOtpValue] = useState('123456');
  const [selectedChoice, setSelectedChoice] = useState('old_age_pension');
  const [nameValue, setNameValue] = useState('रमाबाई कुलकर्णी (Ramabai Kulkarni)');

  return (
    <div
      data-testid="style-guide-page"
      className="relative min-h-screen bg-slate-50 text-slate-900 font-sans text-base overflow-x-hidden pb-16"
    >
      {/* Soft decorative gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/3 -right-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl"
      />

      {/* Brand Hero Banner */}
      <header
        data-testid="style-guide-hero"
        className={`${DESIGN_TOKENS.brandGradient} text-white py-10 px-6 shadow-md`}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-sm font-bold tracking-wide uppercase mb-2">
              MODULE UI-0 • Design System & Component Library
            </span>
            <h1 className="text-3xl font-extrabold leading-tight">
              NagarSathi GovTech Design System
            </h1>
            <p className="text-lg text-indigo-50 mt-1 leading-relaxed">
              Clean, calm, high-contrast, mobile-first • 18px base • ≥56px touch targets
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip variant="samajhna">1 Samajhna (Indigo/Blue)</Chip>
            <Chip variant="karna">2 Karna (Emerald/Teal)</Chip>
            <Chip variant="peecha">3 Peecha karna (Amber/Orange)</Chip>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-8 relative z-10">
        {/* 1. Color Tokens */}
        <Card
          title="1. Design Tokens — Brand, Phase, Gate & Semantic Palettes"
          subtitle="Configured strictly in tailwind.config.js with zero random colors."
          accent="brand"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50">
              <div className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 mb-3" />
              <h4 className="font-extrabold text-indigo-950">
                Phase 1: Samajhna (Understand)
              </h4>
              <p className="text-sm text-indigo-900 mt-1">
                Indigo / Blue family (Steps 1–6)
              </p>
            </div>
            <div className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50">
              <div className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 mb-3" />
              <h4 className="font-extrabold text-emerald-950">
                Phase 2: Karna (Execute)
              </h4>
              <p className="text-sm text-emerald-900 mt-1">
                Emerald / Teal family (Steps 7–11)
              </p>
            </div>
            <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50">
              <div className="h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 mb-3" />
              <h4 className="font-extrabold text-amber-950">
                Phase 3: Peecha karna (Follow-up)
              </h4>
              <p className="text-sm text-amber-900 mt-1">
                Amber / Orange family (Steps 12–16)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border-2 border-violet-300 bg-violet-50">
              <div className="h-8 rounded-lg bg-violet-600 mb-2" />
              <h4 className="font-extrabold text-violet-950">
                Gate 1: Consent (Violet)
              </h4>
              <p className="text-sm text-violet-900">
                Explicit CAN / CANNOT permission gate
              </p>
            </div>
            <div className="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50">
              <div className="h-8 rounded-lg bg-rose-600 mb-2" />
              <h4 className="font-extrabold text-rose-950">
                Gate 2: Approval — Change (Rose)
              </h4>
              <p className="text-sm text-rose-900">
                Halts submission & re-opens draft editor
              </p>
            </div>
            <div className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50">
              <div className="h-8 rounded-lg bg-emerald-600 mb-2" />
              <h4 className="font-extrabold text-emerald-950">
                Gate 2: Approval — Submit (Emerald)
              </h4>
              <p className="text-sm text-emerald-900">
                Physical button confirmation required
              </p>
            </div>
          </div>
        </Card>

        {/* 2. Multilingual Typography */}
        <Card
          title="2. Typography — Inter + Indic Noto Sans (18px Base, Generous Line Height)"
          subtitle="Inter for Latin + Noto Sans Devanagari, Gujarati, Bengali, Tamil, Telugu."
          accent="samajhna"
        >
          <div className="space-y-3">
            <p className="text-lg font-bold text-slate-900">
              मराठी (Devanagari): जो वाचू शकत नाही, तो सुद्धा सर्व सरकारी कामे करू शकतो.
            </p>
            <p className="text-lg font-bold text-slate-900">
              हिन्दी (Devanagari): जो पढ़ नहीं सकता, वो भी सब कुछ कर सकता है।
            </p>
            <p className="text-lg font-semibold text-slate-800">
              ગુજરાતી (Gujarati): નાગરિક સેવાઓ માટે સરળ અવાજ સહાયક.
            </p>
            <p className="text-lg font-semibold text-slate-800">
              বাংলা (Bengali): প্রবীণ নাগরিকদের জন্য সহজ সরকারি পরিষেবা সহায়ক।
            </p>
            <p className="text-lg font-semibold text-slate-800">
              தமிழ் (Tamil): மூத்த குடிமக்களுக்கான எளிய அரசு சேவை உதவியாளர்.
            </p>
            <p className="text-lg font-semibold text-slate-800">
              తెలుగు (Telugu): పౌరుల కోసం సరళమైన ప్రభుత్వ సేవా సహాయకుడు.
            </p>
            <p className="text-base text-slate-700">
              English (Inter): Voice-first AI agent for low-literacy and elderly Indian citizens.
            </p>
          </div>
        </Card>

        {/* 3. Buttons & IconButtons (All Variants + States) */}
        <Card
          title="3. Buttons & IconButtons (Min 56px Touch Target)"
          subtitle="Primary gradient, secondary, ghost, danger, phase, and gate variants with hover, focus, loading, and disabled states."
          accent="karna"
        >
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button variant="primary">Primary Gradient</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="gate-consent">Gate 1 Consent (Violet)</Button>
            <Button variant="gate-change">Gate 2 Change (Rose)</Button>
            <Button variant="gate-submit">Gate 2 Submit (Emerald)</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
            <Button variant="primary" loading>
              Loading State
            </Button>
            <Button variant="primary" disabled>
              Disabled Primary
            </Button>
            <Button variant="secondary" disabled>
              Disabled Secondary
            </Button>
            <IconButton
              icon="🔊"
              variant="speaker"
              ariaLabel="Sunao — Read aloud in Marathi"
            />
            <IconButton
              icon="🎤"
              variant="primary"
              ariaLabel="Start voice input"
            />
            <IconButton
              icon="🗑️"
              variant="danger"
              ariaLabel="Delete item"
            />
            <IconButton
              icon="⏳"
              variant="secondary"
              loading
              ariaLabel="Loading icon action"
            />
            <IconButton
              icon="🔒"
              variant="secondary"
              disabled
              ariaLabel="Disabled icon action"
            />
          </div>
        </Card>

        {/* 4. BigChoiceButton for Low-Literacy Citizens */}
        <Card
          title="4. BigChoiceButton (Low-Literacy Answer Cards)"
          subtitle="Large touch cards (>= 76px height) with icon, native script label, and active state."
          accent="samajhna"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BigChoiceButton
              icon="👵"
              title="वृद्धापकाळ पेन्शन (Old Age Pension)"
              subtitle="वय ६० वर्षांपुढील ज्येष्ठ नागरिकांसाठी"
              badgeText="Selected"
              tone="samajhna"
              selected={selectedChoice === 'old_age_pension'}
              onClick={() => setSelectedChoice('old_age_pension')}
            />
            <BigChoiceButton
              icon="🏠"
              title="विधवा पेन्शन (Widow Pension)"
              subtitle="निराधार महिला पेन्शन योजना"
              badgeText="Option 2"
              tone="samajhna"
              selected={selectedChoice === 'widow_pension'}
              onClick={() => setSelectedChoice('widow_pension')}
            />
            <BigChoiceButton
              icon="✏️"
              title="माहिती बदला (Change Draft)"
              subtitle="Gate 2 — Rose Action"
              tone="change"
              onClick={() => {}}
            />
            <BigChoiceButton
              icon="✅"
              title="अर्ज सबमिट करा (Confirm & Submit)"
              subtitle="Gate 2 — Emerald Physical Button"
              tone="submit"
              disabled
            />
          </div>
        </Card>

        {/* 5. Chips & 16-Step StatusBadges */}
        <Card
          title="5. Chips & 16-Step StatusBadges"
          subtitle="Phase chips, gate chips, semantic chips, and all 16 case status badges."
          accent="peecha"
        >
          <div className="flex flex-wrap gap-2.5 mb-5">
            <Chip variant="samajhna" icon="1️⃣">
              Samajhna
            </Chip>
            <Chip variant="karna" icon="2️⃣">
              Karna
            </Chip>
            <Chip variant="peecha" icon="3️⃣">
              Peecha karna
            </Chip>
            <Chip variant="consent" icon="🛡️">
              Gate 1 Consent
            </Chip>
            <Chip variant="change" icon="✏️">
              Gate 2 Change
            </Chip>
            <Chip variant="submit" icon="✅">
              Gate 2 Submit
            </Chip>
            <Chip variant="success">Success</Chip>
            <Chip variant="warning">Warning</Chip>
            <Chip variant="danger">Danger</Chip>
            <Chip variant="neutral">Neutral</Chip>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
            {ALL_16_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Card>

        {/* 6. Stepper & ProgressBars */}
        <Card
          title="6. Stepper & Phase ProgressBars"
          subtitle="Interactive 3-phase stepper (powered by Zustand) and phase-colored progress bars."
          accent="samajhna"
        >
          <Stepper
            activePhase={activePhase}
            onSelectPhase={(phase) => setActivePhase(phase)}
            className="mb-6"
          />
          <div className="space-y-4">
            <ProgressBar
              label="Phase 1: Samajhna (Understand — Indigo/Blue)"
              value={100}
              phase="samajhna"
            />
            <ProgressBar
              label="Phase 2: Karna (Execute — Emerald/Teal)"
              value={65}
              phase="karna"
            />
            <ProgressBar
              label="Phase 3: Peecha karna (Follow-up — Amber/Orange)"
              value={30}
              phase="peecha"
            />
          </div>
        </Card>

        {/* 7. Inputs & 6-Box OtpInput */}
        <Card
          title="7. Form Inputs & 6-Box OTP Input"
          subtitle="Accessible label, helper text, error alert, disabled state, and 6-box OTP entry."
          accent="karna"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              label="अर्जदाराचे पूर्ण नाव (Full Name)"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              helper="प्रोफाइलमधून आपोआप भरले (From Profile)"
              required
            />
            <Input
              label="हयातीचा दाखला क्रमांक (Life Certificate ID)"
              defaultValue="JP-2023-0012"
              error="हयातीचा दाखला जुना आहे (Certificate is older than 365 days)"
            />
            <Input
              label="आधार क्रमांक (Masked Aadhaar)"
              defaultValue="XXXX-XXXX-4821"
              disabled
              helper="सुरक्षेसाठी मास्क केलेले"
            />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <OtpInput
              label="मोबाईल ओटीपी प्रविष्ट करा (6-Box OTP Input)"
              value={otpValue}
              onChange={setOtpValue}
            />
          </div>
        </Card>

        {/* 8. Toasts, Modal, Skeleton & EmptyState */}
        <Card
          title="8. Toasts, Modal, Skeleton Loader & EmptyState"
          subtitle="Feedback notifications, confirmation dialogs, loading skeletons, and empty states."
          accent="peecha"
        >
          <div className="space-y-3 mb-6">
            <Toast
              variant="info"
              title="आवाज मार्गदर्शक सुरू आहे (Apne aap bolo)"
              message="प्रत्येक प्रश्न मराठीत आपोआप वाचून दाखवला जाईल."
            />
            <Toast
              variant="success"
              title="अर्ज सादर झाला (PEN-2026-88213)"
              message="तुमच्या अंतिम मंजुरीनंतर अर्ज यशस्वीरित्या सादर केला आहे."
            />
            <Toast
              variant="warning"
              title="कार्यालयाने एक प्रश्न विचारला आहे (Day 10)"
              message="हयातीचा दाखला जुना आहे — कृपया नवीन फोटो काढा."
            />
            <Toast
              variant="danger"
              title="७ दिवसांपासून अर्ज थांबला आहे (STALLED)"
              message="आम्ही पेन्शन कार्यालयाला फोन करून पाठपुरावा करू का?"
            />
            {toasts.map((t) => (
              <Toast
                key={t.id}
                variant={t.variant}
                title={t.title}
                message={t.message}
                onDismiss={() => dismissToast(t.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant="gate-consent"
              onClick={() => openModal('style-guide-modal')}
            >
              Open Gate 1 Consent Modal
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                pushToast({
                  title: 'नवीन सूचना (Toast Added)',
                  message: 'Zustand store मधून सूचना दाखवली.',
                  variant: 'success',
                })
              }
            >
              Trigger Zustand Toast
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Skeleton Loader</h4>
              <Skeleton lines={4} label="Loading draft fields..." />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-2">EmptyState</h4>
              <EmptyState
                icon="📂"
                title="कोणतेही प्रलंबित कागदपत्र नाही"
                description="तुमची सर्व आवश्यक कागदपत्रे पडताळली गेली आहेत."
                actionLabel="पुढील टप्प्यावर जा"
                onAction={() => {}}
              />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={activeModal === 'style-guide-modal'}
        tone="consent"
        title="गेट १: तुमची संमती (Gate 1 Consent)"
        onClose={closeModal}
        footer={
          <>
            <Button variant="gate-change" onClick={closeModal}>
              नाही, थांबा (Decline)
            </Button>
            <Button variant="gate-consent" onClick={closeModal}>
              हो, मला मान्य आहे (Agree)
            </Button>
          </>
        }
      >
        <p>
          नगरसाथी केवळ तुमच्या संमतीने मसुदा अर्ज भरेल आणि तुमच्या अंतिम मंजुरीशिवाय कधीही अर्ज सबमिट करणार नाही.
        </p>
      </Modal>
    </div>
  );
}

export default StyleGuideScreen;
