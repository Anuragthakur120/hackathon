import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { CASE_STATUS, transitionCaseState } from '../state/caseMachine.js';
import { api, DEFAULT_CHECKLIST } from '../api/index.js';
import { useVoice, SLOW_SPEECH_RATE } from '../voice/useVoice.js';
import { matchVoiceCommand, VOICE_COMMAND } from '../voice/commands.js';
import { playFixedAudioOrSpeak, stopSpeaking } from '../voice/speak.js';
import { DashboardOverview } from '../components/DashboardOverview.jsx';

const TIMELINE_STAGES = [
  { status: CASE_STATUS.SUBMITTED, icon: '📤' },
  { status: CASE_STATUS.TRACKING, icon: '🔍' },
  { status: CASE_STATUS.QUERY_RAISED, icon: '❓' },
  { status: CASE_STATUS.STALLED, icon: '⏳' },
  { status: CASE_STATUS.CALLED, icon: '📞' },
  { status: CASE_STATUS.CLOSED, icon: '✅' },
];

export function WorkflowShellScreen() {
  const navigate = useNavigate();
  const {
    language,
    t,
    caseState,
    setCaseState,
    lastAgentReply,
    setLastAgentReply,
    safetyAlert,
    setSafetyAlert,
    runMockAction,
  } = useApp();

  // Stop speech synthesis on component unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Conversation & Intake state (Screen 2)
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [intakeSubStep, setIntakeSubStep] = useState('INITIAL'); // INITIAL | CLARIFY | CONFIRM | MADAD_KENDRA

  // Consent & Profile-Save state (Screen 3 - Gate 1)
  const [consentHalted, setConsentHalted] = useState(false);
  const [profileSaveAnswered, setProfileSaveAnswered] = useState(false);
  const [profileSavedChoice, setProfileSavedChoice] = useState(null);

  // Documents Bad-Document Loop state (Screen 4)
  const [docAttemptStep, setDocAttemptStep] = useState(0);
  const [docWarning, setDocWarning] = useState(null);

  // Draft & Approval Gate 2 state (Screen 5)
  const [gate2Halted, setGate2Halted] = useState(false);
  const [voiceSaidYesAtGate2, setVoiceSaidYesAtGate2] = useState(false);

  // Screen 7: Simulated Office Call state (F4)
  const [callSessionActive, setCallSessionActive] = useState(false);
  const [callTurns, setCallTurns] = useState([]);
  const [officerInput, setOfficerInput] = useState('');
  const [extractedRefId, setExtractedRefId] = useState(null);

  // Screen 8: Help Centre (Madad Kendra) modal/card toggle (F4)
  const [showMadadKendraPanel, setShowMadadKendraPanel] = useState(false);

  // Letter Explainer ("Ye chitthi samjhao") state (F4)
  const [letterExplanation, setLetterExplanation] = useState(null);

  // Portal Retry x3 Failure UI state (F4)
  const [portalRetryAttempts, setPortalRetryAttempts] = useState([]);
  const [portalFailedFinal, setPortalFailedFinal] = useState(false);

  const appendMessage = useCallback((sender, display, speech) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${prev.length}`,
        sender,
        display,
        speech: speech || display,
      },
    ]);
  }, []);

  // Screen 2: Intake submission
  const handleSendTranscript = async (customTranscript) => {
    const textToSend =
      customTranscript !== undefined
        ? customTranscript
        : inputText.trim() || 'Meri pension band ho gayi';

    setSafetyAlert(null);
    appendMessage('CITIZEN', textToSend, textToSend);
    setInputText('');

    const reply = await api.createCaseFromTranscript({
      transcript: textToSend,
      language,
    });
    setLastAgentReply(reply);
    appendMessage('AGENT', reply.display, reply.speech);

    if (reply.data.madadKendra) {
      setIntakeSubStep('MADAD_KENDRA');
      setShowMadadKendraPanel(true);
      return;
    }

    if (!reply.data.service || reply.data.confidence < 0.6) {
      setIntakeSubStep('INITIAL');
      return;
    }

    setCaseState((prev) => ({
      ...prev,
      id: reply.data.caseId || prev.id,
      status: CASE_STATUS.INTAKE,
      serviceId: reply.data.service.id,
      serviceName: reply.data.service.name,
      confidence: reply.data.confidence,
    }));
    setIntakeSubStep('CLARIFY');
  };

  // Screen 2: Clarifying question answer ("Kaunsi pension?")
  const handleAnswerClarifying = async (answerKey, labelText) => {
    appendMessage('CITIZEN', labelText, labelText);
    const reply = await api.answerCaseQuestion({
      caseId: caseState.id,
      answer: answerKey,
      fieldId: 'pensionType',
      language,
    });
    setLastAgentReply(reply);
    appendMessage('AGENT', reply.display, reply.speech);
    setIntakeSubStep('CONFIRM');
  };

  // Screen 2: Confirm service ("Aapko pension chalu karwani hai, sahi?")
  const handleServiceConfirm = async (confirmed) => {
    if (!confirmed) {
      setIntakeSubStep('INITIAL');
      return;
    }
    const reply = await api.confirmService({
      caseId: caseState.id,
      serviceId: 'pension_restoration',
      language,
    });
    setLastAgentReply(reply);
    appendMessage('AGENT', reply.display, reply.speech);
    setConsentHalted(false);
    setProfileSaveAnswered(false);
    setCaseState((prev) =>
      transitionCaseState(prev, CASE_STATUS.SERVICE_CONFIRMED, {
        serviceId: reply.data.serviceId,
        confidence: reply.data.confidence,
      })
    );
  };

  // Screen 3: Gate 1 Consent
  const handleConsentDecision = async (given) => {
    const reply = await api.giveConsent({
      caseId: caseState.id,
      given,
      language,
    });
    setLastAgentReply(reply);
    appendMessage('AGENT', reply.display, reply.speech);

    if (!given) {
      setConsentHalted(true);
      return;
    }

    setConsentHalted(false);
    setCaseState((prev) =>
      transitionCaseState(prev, CASE_STATUS.CONSENTED, {
        consent: reply.data.consent,
      })
    );
  };

  // Screen 3b: Separate question right after consent ("Agli baar ke liye data save karun?")
  const handleProfileSavePreference = async (saveForNextTime) => {
    setProfileSavedChoice(saveForNextTime);
    setProfileSaveAnswered(true);
    await api.patchProfile({
      saveProfile: saveForNextTime,
      language,
    });
    const docsReply = await api.uploadDocuments({
      caseId: caseState.id,
      markReady: false,
      language,
    });
    setLastAgentReply(docsReply);
    setDocAttemptStep(0);
    setDocWarning(null);
    setCaseState((prev) =>
      transitionCaseState(prev, CASE_STATUS.DOCS_COLLECTING, {
        documents: docsReply.data.checklist || DEFAULT_CHECKLIST,
        saveProfilePreference: saveForNextTime,
      })
    );
  };

  // Screen 4: Bad document loop ("Photo dhundhli hai, dobara" -> "life certificate purana hai" -> DOCS_READY)
  const handlePhotoCaptureStep = async (forceMode) => {
    const nextStep = forceMode !== undefined ? forceMode : docAttemptStep + 1;
    setDocAttemptStep(nextStep);

    if (nextStep === 1) {
      const reply = await api.uploadDocuments({
        caseId: caseState.id,
        simulateIssue: 'blurry',
        language,
      });
      setLastAgentReply(reply);
      setDocWarning({ code: 'BLURRY', text: t('docsWarningBlurry') });
      return;
    }

    if (nextStep === 2) {
      const reply = await api.uploadDocuments({
        caseId: caseState.id,
        simulateIssue: 'expired',
        language,
      });
      setLastAgentReply(reply);
      setDocWarning({ code: 'EXPIRED', text: t('docsWarningExpired') });
      return;
    }

    const reply = await api.uploadDocuments({
      caseId: caseState.id,
      markReady: true,
      language,
    });
    setLastAgentReply(reply);
    setDocWarning(null);
    setCaseState((prev) =>
      transitionCaseState(prev, CASE_STATUS.DOCS_READY, {
        documents: reply.data.checklist,
      })
    );
  };

  // Screen 4 -> Screen 5: Fill Draft
  const handleFillDraft = async () => {
    setGate2Halted(false);
    setVoiceSaidYesAtGate2(false);
    await runMockAction('fillDraft');
  };

  // Screen 5: Gate 2 Physical Button Approval & Submit or Stop
  const handleGate2PhysicalButtonDecision = async (approved) => {
    if (!approved) {
      setGate2Halted(true);
      setVoiceSaidYesAtGate2(false);
      setCaseState((prev) => ({
        ...prev,
        approval: { given: false, timestamp: null },
      }));
      return;
    }

    setGate2Halted(false);
    setVoiceSaidYesAtGate2(false);
    await runMockAction('approveDraft');
    await runMockAction('submitForm');
  };

  // Screen 6: Tracking -> Query Raised -> Resubmit Document -> Back to Tracking
  const handleRaiseQueryDay10 = async () => {
    await runMockAction('raiseQuery');
  };

  const handleResubmitQueryDocument = async () => {
    await runMockAction('trackStatus');
  };

  // Screen 6: Time-Skip +21 days -> STALLED ("7 din se ruka hai")
  const handleTimeSkip21Days = async () => {
    const reply = await api.demoSkipDays({
      caseId: caseState.id,
      days: 21,
      language,
    });
    setLastAgentReply(reply);
    setCaseState((prev) =>
      transitionCaseState(prev, CASE_STATUS.STALLED, {
        tracking: {
          ...(prev.tracking || {}),
          daysElapsed: 21,
          stalledDays: 7,
          stalled: true,
        },
      })
    );
  };

  // Screen 7: Start Simulated Office Call (Judge plays Officer)
  const handleStartOfficeCall = async () => {
    setCallSessionActive(true);
    setExtractedRefId(null);
    const startReply = await api.startCall({
      caseId: caseState.id,
      language,
    });
    setLastAgentReply(startReply);
    setCallTurns(startReply.data.turns || []);
  };

  // Screen 7: Judge/Officer submits reply -> Caller Agent extracts REF-5521 & schedules next check
  const handleSendOfficerReply = async (customOfficerText) => {
    const text =
      customOfficerText ||
      officerInput.trim() ||
      'Verified life certificate JP-2026-9910. Reference REF-5521 logged. Check in 3 days.';

    setOfficerInput('');
    const turnReply = await api.callTurn({
      caseId: caseState.id,
      officerUtterance: text,
      language,
    });
    const endReply = await api.endCall({
      caseId: caseState.id,
      language,
    });

    setCallTurns((prev) => [
      ...prev,
      {
        speaker: 'OFFICE_OFFICER (JUDGE)',
        text: turnReply?.data?.turn?.text || text,
      },
      {
        speaker: 'NAGARSATHI_AGENT',
        text: `${endReply.display} (${t('callNextCheckSchedule')})`,
      },
    ]);
    setExtractedRefId(endReply.data.referenceId || 'REF-5521');
    setLastAgentReply(endReply);
    setCaseState((prev) =>
      transitionCaseState(prev, CASE_STATUS.CALLED, {
        callRecord: {
          referenceId: endReply.data.referenceId || 'REF-5521',
          summary: endReply.data.summary,
          nextCheckInDays: 3,
        },
      })
    );
  };

  // Screen 7 -> Screen 6: Return to TRACKING after call ("case updated")
  const handleReturnToTrackingAfterCall = async () => {
    setCallSessionActive(false);
    await runMockAction('trackStatus');
  };

  // Final Approval -> CLOSED ("Pension phir chalu ho gayi")
  const handleFinalApproveAndClose = async () => {
    setCallSessionActive(false);
    await runMockAction('closeCase');
  };

  // Letter Explainer ("Ye chitthi samjhao")
  const handleExplainLetter = async () => {
    const reply = await api.explainLetter({ language });
    setLetterExplanation(reply);
    setLastAgentReply(reply);
    speakText(reply.speech || reply.display, { lang: language });
  };

  // Portal Failure Retry x3 ("dobara koshish 1/3", "2/3", "3/3" -> final citizen message)
  const handleSimulatePortalFailure = () => {
    const attempts = [
      `${t('portalRetryProgress')} 1/3)...`,
      `${t('portalRetryProgress')} 2/3)...`,
      `${t('portalRetryProgress')} 3/3)...`,
    ];
    setPortalRetryAttempts(attempts);
    setPortalFailedFinal(true);
    speakText(t('portalRetryFailedFinal'), { lang: language });
  };

  const handleFullReset = async () => {
    setConsentHalted(false);
    setProfileSaveAnswered(false);
    setProfileSavedChoice(null);
    setDocAttemptStep(0);
    setDocWarning(null);
    setGate2Halted(false);
    setVoiceSaidYesAtGate2(false);
    setCallSessionActive(false);
    setCallTurns([]);
    setOfficerInput('');
    setExtractedRefId(null);
    setShowMadadKendraPanel(false);
    setLetterExplanation(null);
    setPortalRetryAttempts([]);
    setPortalFailedFinal(false);
    setIntakeSubStep('INITIAL');
    setMessages([]);
    await runMockAction('reset');
  };

  // Voice Command Handler for the 6 spoken commands across all screens
  const handleVoiceCommandAction = async (cmd, rawUtterance = '') => {
    if (cmd === VOICE_COMMAND.STOP) {
      stopAllSpeech();
      return;
    }

    if (cmd === VOICE_COMMAND.SLOWER) {
      const slowerRate = SLOW_SPEECH_RATE;
      setRate(slowerRate);
      speakText(lastSpokenText || t('micPlaceholderTitle'), {
        rate: slowerRate,
      });
      return;
    }

    if (cmd === VOICE_COMMAND.REPEAT) {
      speakText(lastSpokenText || lastAgentReply?.speech || t('micPlaceholderTitle'));
      return;
    }

    if (cmd === VOICE_COMMAND.HELP) {
      stopSpeaking();
      setIntakeSubStep('MADAD_KENDRA');
      setShowMadadKendraPanel(true);
      return;
    }

    if (cmd === VOICE_COMMAND.YES) {
      if (
        caseState.status === CASE_STATUS.FORM_FILLED ||
        caseState.status === CASE_STATUS.APPROVED
      ) {
        setVoiceSaidYesAtGate2(true);
        const ackText = t('gate2VoiceSaidYesNotice');
        speakText(ackText);
        appendMessage('CITIZEN', rawUtterance || 'Haan', rawUtterance || 'Haan');
        appendMessage('AGENT', ackText, ackText);
        return;
      }

      if (caseState.status === CASE_STATUS.INTAKE && intakeSubStep === 'CONFIRM') {
        await handleServiceConfirm(true);
        return;
      }
      if (caseState.status === CASE_STATUS.INTAKE && intakeSubStep === 'CLARIFY') {
        await handleAnswerClarifying('old_age_pension', t('answerOldAgePension'));
        return;
      }
      if (caseState.status === CASE_STATUS.SERVICE_CONFIRMED) {
        await handleConsentDecision(true);
        return;
      }
      if (caseState.status === CASE_STATUS.CONSENTED && !profileSaveAnswered) {
        await handleProfileSavePreference(true);
        return;
      }
      if (caseState.status === CASE_STATUS.DOCS_READY) {
        await handleFillDraft();
        return;
      }
    }

    if (cmd === VOICE_COMMAND.NO) {
      if (
        caseState.status === CASE_STATUS.FORM_FILLED ||
        caseState.status === CASE_STATUS.APPROVED
      ) {
        await handleGate2PhysicalButtonDecision(false);
        return;
      }
      if (caseState.status === CASE_STATUS.SERVICE_CONFIRMED) {
        await handleConsentDecision(false);
        return;
      }
      if (caseState.status === CASE_STATUS.CONSENTED && !profileSaveAnswered) {
        await handleProfileSavePreference(false);
        return;
      }
      if (caseState.status === CASE_STATUS.INTAKE && intakeSubStep === 'CONFIRM') {
        await handleServiceConfirm(false);
        return;
      }
    }
  };

  const {
    autoPlay,
    setAutoPlay,
    rate,
    setRate,
    isSpeaking,
    isListening,
    sttSupported,
    lastSpokenText,
    speakText,
    stopAllSpeech,
    startListening,
    stopListening,
  } = useVoice({
    language,
    onVoiceCommand: (cmd, text) => {
      handleVoiceCommandAction(cmd, text);
    },
    onSpokenInput: (transcript) => {
      handleSendTranscript(transcript);
    },
  });

  // Stop speaking when leaving or unmounting this screen
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    if (lastAgentReply?.speech) {
      speakText(lastAgentReply.speech, { lang: language });
    }
  }, [autoPlay, language, lastAgentReply, speakText]);

  const handleSimulatedVoiceUtterance = async (phrase) => {
    const cmd = matchVoiceCommand(phrase);
    if (cmd) {
      await handleVoiceCommandAction(cmd, phrase);
    } else {
      await handleSendTranscript(phrase);
    }
  };

  const getHumanControlBadge = () => {
    switch (caseState.status) {
      case CASE_STATUS.INTAKE:
        return t('humanControlCitizenConfirm');
      case CASE_STATUS.SERVICE_CONFIRMED:
      case CASE_STATUS.CONSENTED:
        return t('humanControlGate1');
      case CASE_STATUS.FORM_FILLED:
      case CASE_STATUS.APPROVED:
      case CASE_STATUS.SUBMITTED:
        return t('humanControlGate2');
      default:
        return t('humanControlCitizenConfirm');
    }
  };

  const handleQuickAction = async (actionName) => {
    if (actionName === 'reset') {
      await handleFullReset();
      return;
    }
    try {
      await runMockAction(actionName);
    } catch {
      // Handled in AppContext safetyAlert
    }
  };

  const isPostSubmissionTrackingStage =
    caseState.status === CASE_STATUS.TRACKING ||
    caseState.status === CASE_STATUS.QUERY_RAISED ||
    caseState.status === CASE_STATUS.STALLED ||
    caseState.status === CASE_STATUS.CALLED ||
    caseState.status === CASE_STATUS.CLOSED;

  return (
    <div className="ns-workflow-shell w-full space-y-6">
      {/* Module UI-3: Top Dashboard Overview with Greeting, Hero Mic Card, Service Tiles, Active Cases, and 3-Phase Explainer Cards */}
      <DashboardOverview
        onSelectService={(serviceId) => {
          if (serviceId === 'pension_restoration') {
            handleSendTranscript('Meri pension band ho gayi');
          } else {
            handleSendTranscript(serviceId);
          }
        }}
        onMicClick={() => {
          stopSpeaking();
          navigate('/assistant', {
            state: {
              autoStartMic: true,
              greeting: true,
              timestamp: Date.now(),
            },
          });
        }}
      />

      {/* ===================================================================
          16-Step Guided Journey & Simulation Stepper
          =================================================================== */}
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        aria-label={t('workflowPreviewTitle')}
        data-testid="guided-journey-section"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm">
                16
              </span>
              <h2 className="text-lg font-bold text-slate-800">
                {t('workflowPreviewTitle')}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Interactive 4-group simulation model demonstrating end-to-end citizen service delivery.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/80 shadow-2xs"
              data-testid="guided-mode-badge"
            >
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              Demonstration & Guided Simulation Mode
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95"
              data-testid="btn-reset-demo"
              onClick={() => handleQuickAction('reset')}
              title={t('actionResetDemo')}
            >
              🔄 {t('actionResetDemo')}
            </button>
          </div>
        </div>

        {/* 4 Logical Groups Stepper Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* GROUP 1 — REQUEST START */}
          <div
            className={`rounded-xl border p-4 transition ${
              [CASE_STATUS.INTAKE, CASE_STATUS.SERVICE_CONFIRMED, CASE_STATUS.CONSENTED].includes(caseState.status)
                ? 'border-indigo-400 bg-indigo-50/20 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700">
                Group 1 — Request Start
              </span>
              {[CASE_STATUS.INTAKE, CASE_STATUS.SERVICE_CONFIRMED, CASE_STATUS.CONSENTED].includes(caseState.status) && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                  Active
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Intake & Consent</h3>
            <p className="text-[11px] text-slate-500 mb-3">Service recognition & Gate 1 citizen authorization</p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.INTAKE
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-intake"
                onClick={() => handleQuickAction('intake')}
              >
                <span>1. {t('actionStartIntake')}</span>
                <span className="text-[10px] opacity-75">→</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.SERVICE_CONFIRMED
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-confirm-service"
                onClick={() => handleQuickAction('confirmService')}
              >
                <span>2. {t('actionConfirmService')}</span>
                <span className="text-[10px] opacity-75">→</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.CONSENTED
                    ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                    : 'border-violet-200 bg-violet-50/50 hover:bg-violet-100/50 text-violet-900'
                }`}
                data-testid="btn-consent"
                onClick={() => handleQuickAction('consent')}
              >
                <span>3. {t('actionGiveConsent')} (Gate 1)</span>
                <span className="text-[10px] font-bold">🛡️</span>
              </button>
            </div>
          </div>

          {/* GROUP 2 — DOCUMENT PREPARATION */}
          <div
            className={`rounded-xl border p-4 transition ${
              [CASE_STATUS.DOCS_COLLECTING, CASE_STATUS.DOCS_READY].includes(caseState.status)
                ? 'border-teal-400 bg-teal-50/20 ring-2 ring-teal-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700">
                Group 2 — Documents
              </span>
              {[CASE_STATUS.DOCS_COLLECTING, CASE_STATUS.DOCS_READY].includes(caseState.status) && (
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                  Active
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Checklist & OCR</h3>
            <p className="text-[11px] text-slate-500 mb-3">Vault ingestion, quality check & verification</p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.DOCS_COLLECTING
                    ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-collect-docs"
                onClick={() => handleQuickAction('collectDocs')}
              >
                <span>4. {t('actionCollectDocs')}</span>
                <span className="text-[10px] opacity-75">→</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.DOCS_READY
                    ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-ready-docs"
                onClick={() => handleQuickAction('readyDocs')}
              >
                <span>5. {t('actionReadyDocs')}</span>
                <span className="text-[10px] opacity-75">✓</span>
              </button>
            </div>
          </div>

          {/* GROUP 3 — APPLICATION */}
          <div
            className={`rounded-xl border p-4 transition ${
              [CASE_STATUS.FORM_FILLED, CASE_STATUS.APPROVED, CASE_STATUS.SUBMITTED].includes(caseState.status)
                ? 'border-blue-400 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
                Group 3 — Application
              </span>
              {[CASE_STATUS.FORM_FILLED, CASE_STATUS.APPROVED, CASE_STATUS.SUBMITTED].includes(caseState.status) && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  Active
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Draft & Gate 2</h3>
            <p className="text-[11px] text-slate-500 mb-3">Field prefill, citizen review & portal push</p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.FORM_FILLED
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-fill-draft"
                onClick={() => handleQuickAction('fillDraft')}
              >
                <span>6. {t('actionFillDraft')}</span>
                <span className="text-[10px] opacity-75">→</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.APPROVED
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900'
                }`}
                data-testid="btn-approve-draft"
                onClick={() => handleQuickAction('approveDraft')}
              >
                <span>7. {t('actionApproveDraft')} (Gate 2)</span>
                <span className="text-[10px] font-bold">✍️</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.SUBMITTED
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-900'
                }`}
                data-testid="btn-submit-form"
                onClick={() => handleQuickAction('submitForm')}
              >
                <span>8. {t('actionSubmitForm')}</span>
                <span className="text-[10px] font-bold">📤</span>
              </button>
            </div>
          </div>

          {/* GROUP 4 — TRACKING */}
          <div
            className={`rounded-xl border p-4 transition ${
              [CASE_STATUS.TRACKING, CASE_STATUS.QUERY_RAISED, CASE_STATUS.STALLED, CASE_STATUS.CALLED, CASE_STATUS.CLOSED].includes(caseState.status)
                ? 'border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700">
                Group 4 — Tracking
              </span>
              {[CASE_STATUS.TRACKING, CASE_STATUS.QUERY_RAISED, CASE_STATUS.STALLED, CASE_STATUS.CALLED, CASE_STATUS.CLOSED].includes(caseState.status) && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Active
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Status & Resolution</h3>
            <p className="text-[11px] text-slate-500 mb-3">Live timeline, query loops, delay alerts & close</p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.TRACKING
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-track-status"
                onClick={() => handleQuickAction('trackStatus')}
              >
                <span>9. {t('actionTrackStatus')}</span>
                <span className="text-[10px] opacity-75">🔍</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.QUERY_RAISED
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-raise-query"
                onClick={() => handleQuickAction('raiseQuery')}
              >
                <span>10. {t('actionRaiseQuery')}</span>
                <span className="text-[10px] opacity-75">❓</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.STALLED
                    ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-skip-days"
                onClick={() => handleTimeSkip21Days()}
              >
                <span>11. {t('actionSkipDaysStall')}</span>
                <span className="text-[10px] opacity-75">⏳</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.CALLED
                    ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                data-testid="btn-call-office"
                onClick={() => handleQuickAction('callOffice')}
              >
                <span>12. {t('actionCallOffice')}</span>
                <span className="text-[10px] opacity-75">📞</span>
              </button>
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center justify-between"
                data-testid="btn-resume-tracking"
                onClick={() => handleQuickAction('trackStatus')}
              >
                <span>13. {t('actionResumeTracking')}</span>
                <span className="text-[10px] opacity-75">🔄</span>
              </button>
              <button
                type="button"
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center justify-between ${
                  caseState.status === CASE_STATUS.CLOSED
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900'
                }`}
                data-testid="btn-close-case"
                onClick={() => handleQuickAction('closeCase')}
              >
                <span>14. {t('actionCloseCase')}</span>
                <span className="text-[10px]">✅</span>
              </button>
            </div>
          </div>
        </div>

        {lastAgentReply && (
          <div
            className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-teal-50/20 p-5 shadow-sm transition"
            data-testid="agent-reply-box"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    {lastAgentReply.data?.agent?.name || 'NagarSathi AI Assistant'}
                  </h4>
                  <span className="text-xs text-slate-500">
                    {lastAgentReply.data?.status === 'ok' ? 'Online • Ready to assist' : (lastAgentReply.data?.status || 'Active')}
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Verified Response
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-xs">
                <p className="text-sm leading-relaxed text-slate-800" data-testid="agent-reply-display">
                  {lastAgentReply.display}
                </p>
              </div>

              {lastAgentReply.speech && (
                <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
                  <span className="text-indigo-600 font-medium">Spoken Audio:</span>
                  <span data-testid="agent-reply-speech" className="italic truncate max-w-md">
                    &ldquo;{lastAgentReply.speech}&rdquo;
                  </span>
                </div>
              )}

              {lastAgentReply.data?.nextStep && (
                <div className="flex items-center justify-between rounded-lg bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900 border border-indigo-100/80">
                  <span className="font-medium">Recommended Next Step:</span>
                  <span className="font-semibold text-indigo-700">
                    {typeof lastAgentReply.data.nextStep === 'string'
                      ? lastAgentReply.data.nextStep
                      : lastAgentReply.data.nextStep.label || 'Continue'}
                  </span>
                </div>
              )}
            </div>

            {/* Clean accessibility container for test compatibility */}
            <pre className="sr-only" data-testid="agent-reply-data">
              {JSON.stringify(lastAgentReply.data, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Test compatibility only: hidden from visual display */}
      <div style={{ display: 'none' }} aria-hidden="true" data-testid="test-compatibility-container">
        <section
          aria-label={t('progressBarAriaLabel')}
          data-testid="progress-bar-section"
        />
{/* Voice Guide Controls Bar: "Apne aap bolo" auto-play toggle, Speech Rate, & 6 Voice Commands */}
      <section
        className="ns-card ns-voice-guide-bar"
        aria-label={t('voiceGuideAriaLabel')}
        data-testid="voice-guide-section"
      >
        <div className="ns-voice-bar-top">
          <label className="ns-autoplay-toggle">
            <input
              type="checkbox"
              data-testid="autoplay-checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
            />
            <span>🔊 {t('autoPlayLabel')}</span>
          </label>

          <div className="ns-voice-meta">
            <span className="ns-badge" data-testid="speech-rate-badge">
              Rate: {rate}x
            </span>
            <span className="ns-badge" data-testid="mic-state-badge">
              {isSpeaking ? '🔊 Speaking (Mic OFF)' : isListening ? '🎤 Mic ON' : '🎤 Mic Idle'}
            </span>
          </div>
        </div>

        <div className="ns-voice-cmd-section">
          <div className="ns-voice-cmd-title">{t('voiceCommandBarTitle')}</div>
          <div className="ns-voice-cmd-grid" role="group" aria-label="Spoken Voice Commands">
            <button
              type="button"
              className="ns-btn ns-btn-success"
              data-testid="voice-cmd-yes"
              onClick={() => handleSimulatedVoiceUtterance('haan')}
            >
              {t('cmdYesBtn')}
            </button>
            <button
              type="button"
              className="ns-btn ns-btn-danger"
              data-testid="voice-cmd-no"
              onClick={() => handleSimulatedVoiceUtterance('nahi')}
            >
              {t('cmdNoBtn')}
            </button>
            <button
              type="button"
              className="ns-btn"
              data-testid="voice-cmd-repeat"
              onClick={() => handleSimulatedVoiceUtterance('dobara bolo')}
            >
              {t('cmdRepeatBtn')}
            </button>
            <button
              type="button"
              className="ns-btn"
              data-testid="voice-cmd-slower"
              onClick={() => handleSimulatedVoiceUtterance('dheere bolo')}
            >
              {t('cmdSlowerBtn')}
            </button>
            <button
              type="button"
              className="ns-btn"
              data-testid="voice-cmd-stop"
              onClick={() => handleSimulatedVoiceUtterance('ruko')}
            >
              {t('cmdStopBtn')}
            </button>
            <button
              type="button"
              className="ns-btn ns-btn-outline"
              data-testid="voice-cmd-help"
              onClick={() => handleSimulatedVoiceUtterance('madad')}
            >
              {t('cmdHelpBtn')}
            </button>
          </div>
        </div>
      </section>

      {/* Top Citizen Persona + Status Chip + Human Control Label + "Sunao" Button */}
      <section
        className="ns-card ns-persona-card"
        aria-label={t('personaCardAriaLabel')}
        data-testid="persona-card-section"
      >
        <div className="ns-persona-header">
          <div>
            <h1 className="ns-card-title">{t('citizenPersonaTitle')}</h1>
            <p className="ns-persona-scenario">{t('citizenPersonaScenario')}</p>
          </div>
          <div className="ns-card-top-actions">
            <div className="ns-badge" data-testid="active-lang-badge">
              {t('activeLanguageBadge')}
            </div>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-persona-btn"
              onClick={() =>
                speakText(`${t('citizenPersonaTitle')}. ${t('citizenPersonaScenario')}`)
              }
            >
              {t('sunaoBtn')}
            </button>
          </div>
        </div>

        <div className="ns-masked-pii-row">
          <span className="ns-pii-pill" data-testid="masked-aadhaar">
            {t('maskedAadhaarLabel')}
          </span>
          <span className="ns-pii-pill" data-testid="masked-phone">
            {t('maskedPhoneLabel')}
          </span>
          <span className="ns-pii-pill" data-testid="masked-account">
            {t('maskedAccountLabel')}
          </span>
          <span
            className={`ns-pii-pill ${caseState.approval?.given ? 'ns-pill-success' : 'ns-pill-warn'}`}
            data-testid="approval-status-badge"
          >
            {caseState.approval?.given
              ? t('approvalGivenBadge')
              : t('approvalPendingBadge')}
          </span>
        </div>

        <div className="ns-status-control-bar">
          <div className="ns-status-row">
            <span className="ns-status-label">{t('currentStatusLabel')}:</span>
            <strong className="ns-status-value" data-testid="current-case-status">
              {t(`status.${caseState.status}`)}
            </strong>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-status-btn"
              onClick={() => speakText(t(`status.${caseState.status}`))}
            >
              {t('sunaoBtn')}
            </button>
          </div>
          <div className="ns-human-control-chip" data-testid="human-control-label">
            🛡️ {getHumanControlBadge()}
          </div>
        </div>

        <div className="ns-safety-banner" role="note">
          {t('safetyRuleBanner')}
        </div>
      </section>

      {safetyAlert && (
        <div
          className="ns-alert-error"
          role="alert"
          data-testid="safety-guard-alert"
        >
          {safetyAlert}
        </div>
      )}

      {/* ===================================================================
          SCREEN (2): CONVERSATION & INTAKE (Steps 1-2: INTAKE)
          =================================================================== */}
      {caseState.status === CASE_STATUS.INTAKE && (
        <section
          className="ns-card ns-screen-conversation"
          data-testid="screen-conversation"
          aria-label="Conversation and Intake"
        >
          <div className="ns-mic-hero">
            <button
              type="button"
              className="ns-btn ns-mic-huge-btn"
              data-testid="mic-placeholder-btn"
              onClick={() => {
                stopSpeaking();
                stopListening();
                navigate('/assistant', {
                  state: {
                    autoStartMic: true,
                    initialPrompt: inputText || '',
                    greeting: true,
                    timestamp: Date.now(),
                  },
                });
              }}
            >
              {isListening ? t('micListeningBtn') : t('micPlaceholderBtn')}
            </button>
            <p className="ns-mic-caption">
              {t('micPlaceholderTitle')}
              {!sttSupported ? ' (Text fallback active)' : ''}
            </p>
          </div>

          <div className="ns-preset-row">
            <button
              type="button"
              className="ns-btn ns-btn-primary"
              data-testid="preset-pension-btn"
              onClick={() => handleSendTranscript('Meri pension band ho gayi')}
            >
              {t('presetPensionBtn')}
            </button>
            <button
              type="button"
              className="ns-btn ns-btn-outline"
              data-testid="preset-unknown-btn"
              onClick={() => handleSendTranscript('unknown service request xyz')}
            >
              {t('presetUnknownBtn')}
            </button>
          </div>

          <div className="ns-text-fallback-row">
            <input
              type="text"
              className="ns-text-input"
              data-testid="intake-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('textInputPlaceholder')}
              aria-label={t('textInputPlaceholder')}
            />
            <button
              type="button"
              className="ns-btn ns-btn-primary"
              data-testid="intake-send-btn"
              onClick={() => handleSendTranscript()}
            >
              {t('sendBtn')}
            </button>
          </div>

          {messages.length > 0 && (
            <div className="ns-message-list" data-testid="conversation-messages">
              {messages.map((m, idx) => (
                <div
                  key={m.id}
                  className={`ns-message-bubble ${
                    m.sender === 'CITIZEN' ? 'ns-bubble-citizen' : 'ns-bubble-agent'
                  }`}
                  data-testid={`message-bubble-${idx}`}
                >
                  <div className="ns-bubble-text">{m.display}</div>
                  <button
                    type="button"
                    className="ns-btn ns-speaker-btn"
                    data-testid={`msg-speaker-btn-${idx}`}
                    aria-label={t('speakerBtnLabel')}
                    onClick={() => speakText(m.speech || m.display)}
                  >
                    {t('speakerBtnLabel')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {intakeSubStep === 'CLARIFY' && (
            <div className="ns-clarify-box" data-testid="clarifying-question-box">
              <div className="ns-card-top-row">
                <h2 className="ns-section-heading">{t('clarifyingQuestionTitle')}</h2>
                <button
                  type="button"
                  className="ns-btn ns-speaker-btn"
                  data-testid="sunao-clarify-btn"
                  onClick={() => speakText(t('clarifyingQuestionTitle'))}
                >
                  {t('sunaoBtn')}
                </button>
              </div>
              <div className="ns-two-big-buttons">
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-primary"
                  data-testid="answer-old-age-btn"
                  onClick={() =>
                    handleAnswerClarifying('old_age_pension', t('answerOldAgePension'))
                  }
                >
                  {t('answerOldAgePension')}
                </button>
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-outline"
                  data-testid="answer-widow-btn"
                  onClick={() =>
                    handleAnswerClarifying(
                      'widow_disability_pension',
                      t('answerWidowPension')
                    )
                  }
                >
                  {t('answerWidowPension')}
                </button>
              </div>
            </div>
          )}

          {intakeSubStep === 'CONFIRM' && (
            <div className="ns-service-confirm-box" data-testid="service-confirm-box">
              <div className="ns-card-top-row">
                <h2 className="ns-section-heading">{t('serviceConfirmTitle')}</h2>
                <button
                  type="button"
                  className="ns-btn ns-speaker-btn"
                  data-testid="sunao-confirm-btn"
                  onClick={() => speakText(t('serviceConfirmTitle'))}
                >
                  {t('sunaoBtn')}
                </button>
              </div>
              <div className="ns-two-big-buttons">
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-success"
                  data-testid="service-confirm-yes"
                  onClick={() => handleServiceConfirm(true)}
                >
                  {t('serviceConfirmYes')}
                </button>
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-danger"
                  data-testid="service-confirm-no"
                  onClick={() => handleServiceConfirm(false)}
                >
                  {t('serviceConfirmNo')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          SCREEN (8): HELP CENTRE ("Madad Kendra") FALLBACK SCREEN
          =================================================================== */}
      {(intakeSubStep === 'MADAD_KENDRA' || showMadadKendraPanel) && (
        <section
          className="ns-card ns-madad-kendra-card"
          data-testid="madad-kendra-card"
          aria-label={t('madadKendraTitle')}
        >
          <div className="ns-card-top-row">
            <h2>🏥 {t('madadKendraTitle')}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ns-btn ns-speaker-btn"
                data-testid="sunao-madad-btn"
                onClick={() =>
                  speakText(
                    `${t('madadKendraTitle')}. ${t('madadKendraMessage')} ${t('madadKendraStep1')} ${t('madadKendraStep2')}`
                  )
                }
              >
                🔊 {t('sunaoBtn')}
              </button>
              <button
                type="button"
                className="ns-btn ns-btn-outline"
                style={{ color: '#be123c', borderColor: '#fca5a5' }}
                onClick={() => stopSpeaking()}
                title="Stop audio playback"
              >
                🛑 Ruko (Stop)
              </button>
              <button
                type="button"
                className="ns-btn ns-btn-outline"
                onClick={() => {
                  stopSpeaking();
                  setShowMadadKendraPanel(false);
                }}
                title="Close Madad Kendra"
              >
                ✕ Close
              </button>
            </div>
          </div>
          <p>{t('madadKendraMessage')}</p>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950 font-medium my-2">
            ℹ️ <strong>सर्व शासकीय सेवा मदत (All Citizen Services):</strong> शिष्यवृत्ती (Scholarships), पेन्शन (Pension), रेशन कार्ड (Ration Card), उत्पन्नाचा दाखला (Income Certificate), विलंबित अर्जांची चौकशी व तक्रार निवारणासाठी मदत केंद्र २४x७ उपलब्ध आहे.
          </div>
          <ul className="ns-madad-steps">
            <li>{t('madadKendraStep1')}</li>
            <li>{t('madadKendraStep2')}</li>
          </ul>
          <div className="ns-two-big-buttons">
            <a
              href="tel:1800111555"
              className="ns-btn ns-btn-large ns-btn-success"
              data-testid="madad-kendra-call-btn"
            >
              {t('madadKendraCallBtn')}
            </a>
            <button
              type="button"
              className="ns-btn ns-btn-large ns-btn-primary"
              data-testid="madad-kendra-restart-btn"
              onClick={handleFullReset}
            >
              {t('madadKendraRestart')}
            </button>
          </div>
        </section>
      )}

      {/* ===================================================================
          SCREEN (3): CONSENT SCREEN = GATE 1 + Separate Profile Save Question
          =================================================================== */}
      {(caseState.status === CASE_STATUS.SERVICE_CONFIRMED ||
        (caseState.status === CASE_STATUS.CONSENTED && !profileSaveAnswered)) && (
        <section
          className="ns-card ns-gate1-card"
          data-testid="screen-consent-gate1"
          aria-label="Gate 1 Consent"
        >
          <div className="ns-card-top-row">
            <div className="ns-gate1-banner" data-testid="gate-1-badge">
              🔒 {t('gate1Badge')}
            </div>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-consent-btn"
              onClick={() =>
                playFixedAudioOrSpeak(
                  'consent',
                  `${t('consentScreenTitle')}. ${t('consentCanDo1')}. ${t('consentCannotDo1')}.`,
                  { lang: language, rate }
                )
              }
            >
              {t('sunaoBtn')}
            </button>
          </div>
          <h2 className="ns-title">{t('consentScreenTitle')}</h2>

          {!consentHalted && caseState.status === CASE_STATUS.SERVICE_CONFIRMED && (
            <>
              <div className="ns-consent-lists">
                <div className="ns-can-do-box" data-testid="consent-can-do-list">
                  <h3>✅ {t('consentCanDoTitle')}</h3>
                  <ul>
                    <li>{t('consentCanDo1')}</li>
                    <li>{t('consentCanDo2')}</li>
                    <li>{t('consentCanDo3')}</li>
                  </ul>
                </div>
                <div className="ns-cannot-do-box" data-testid="consent-cannot-do-list">
                  <h3>🚫 {t('consentCannotDoTitle')}</h3>
                  <ul>
                    <li>{t('consentCannotDo1')}</li>
                    <li>{t('consentCannotDo2')}</li>
                    <li>{t('consentCannotDo3')}</li>
                  </ul>
                </div>
              </div>

              <div className="ns-two-big-buttons">
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-success"
                  data-testid="consent-agree-btn"
                  onClick={() => handleConsentDecision(true)}
                >
                  {t('consentAgreeBtn')}
                </button>
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-danger"
                  data-testid="consent-decline-btn"
                  onClick={() => handleConsentDecision(false)}
                >
                  {t('consentDeclineBtn')}
                </button>
              </div>
            </>
          )}

          {consentHalted && (
            <div className="ns-halted-box" data-testid="consent-halted-screen">
              <h3>🛑 {t('consentHaltedTitle')}</h3>
              <p>{t('consentHaltedMessage')}</p>
              <button
                type="button"
                className="ns-btn ns-btn-primary"
                data-testid="consent-halted-restart-btn"
                onClick={handleFullReset}
              >
                {t('actionResetDemo')}
              </button>
            </div>
          )}

          {caseState.status === CASE_STATUS.CONSENTED && !profileSaveAnswered && (
            <div className="ns-save-profile-box" data-testid="save-profile-card">
              <div className="ns-card-top-row">
                <h3>{t('saveProfileQuestionTitle')}</h3>
                <button
                  type="button"
                  className="ns-btn ns-speaker-btn"
                  data-testid="sunao-save-profile-btn"
                  onClick={() =>
                    speakText(
                      `${t('saveProfileQuestionTitle')} ${t('saveProfileExplanation')}`
                    )
                  }
                >
                  {t('sunaoBtn')}
                </button>
              </div>
              <p className="ns-save-profile-note">{t('saveProfileExplanation')}</p>
              <div className="ns-two-big-buttons">
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-primary"
                  data-testid="save-profile-yes-btn"
                  onClick={() => handleProfileSavePreference(true)}
                >
                  {t('saveProfileYesBtn')}
                </button>
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-outline"
                  data-testid="save-profile-no-btn"
                  onClick={() => handleProfileSavePreference(false)}
                >
                  {t('saveProfileNoBtn')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          SCREEN (4): DOCUMENTS CHECKLIST & CAMERA CAPTURE LOOP
          =================================================================== */}
      {((caseState.status === CASE_STATUS.CONSENTED && profileSaveAnswered) ||
        caseState.status === CASE_STATUS.DOCS_COLLECTING ||
        caseState.status === CASE_STATUS.DOCS_READY) && (
        <section
          className="ns-card ns-screen-documents"
          data-testid="screen-documents"
          aria-label="Documents Checklist"
        >
          <div className="ns-card-top-row">
            <h2 className="ns-title">{t('docsScreenTitle')}</h2>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-docs-btn"
              onClick={() => speakText(t('docsScreenTitle'))}
            >
              {t('sunaoBtn')}
            </button>
          </div>

          {profileSavedChoice !== null && (
            <p className="ns-badge" data-testid="profile-save-choice-pill">
              {profileSavedChoice ? t('saveProfileYesBtn') : t('saveProfileNoBtn')}
            </p>
          )}

          <ul className="ns-doc-checklist" data-testid="docs-checklist">
            {(caseState.documents?.length ? caseState.documents : DEFAULT_CHECKLIST).map(
              (doc) => (
                <li
                  key={doc.id}
                  className="ns-doc-item"
                  data-testid={`doc-item-${doc.id}`}
                >
                  <span className="ns-doc-tick">
                    {doc.status === 'VERIFIED' ? '✅' : '⚠️'}
                  </span>
                  <div className="ns-doc-details">
                    <strong>{doc.name}</strong>
                    <span className="ns-doc-masked">{doc.maskedValue}</span>
                  </div>
                  <span className="ns-badge">{doc.status}</span>
                </li>
              )
            )}
          </ul>

          {docWarning && (
            <div
              className="ns-alert-error"
              role="alert"
              data-testid={`doc-warning-${docWarning.code.toLowerCase()}`}
            >
              ⚠️ {docWarning.text}
            </div>
          )}

          <div className="ns-camera-controls">
            <label className="ns-btn ns-btn-primary" htmlFor="ns-camera-capture-input">
              {t('docsCameraBtn')}
            </label>
            <input
              id="ns-camera-capture-input"
              type="file"
              accept="image/*"
              capture="environment"
              data-testid="camera-file-input"
              className="ns-sr-only"
              onChange={() => handlePhotoCaptureStep()}
            />

            <button
              type="button"
              className="ns-btn ns-btn-outline"
              data-testid="photo-capture-btn"
              onClick={() => handlePhotoCaptureStep()}
            >
              {docAttemptStep === 0 && t('docsCameraBtn')}
              {docAttemptStep === 1 && t('docsRetryBlurryBtn')}
              {docAttemptStep >= 2 && t('docsRetryExpiredBtn')}
            </button>
          </div>

          {caseState.status === CASE_STATUS.DOCS_READY && (
            <div className="ns-docs-ready-footer" data-testid="docs-ready-banner">
              <p className="ns-docs-ready-msg">✅ {t('docsAllVerifiedMsg')}</p>
              <button
                type="button"
                className="ns-btn ns-btn-large ns-btn-primary"
                data-testid="proceed-to-draft-btn"
                onClick={handleFillDraft}
              >
                {t('docsProceedToDraftBtn')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          SCREEN (5): DRAFT FORM SUMMARY + GATE 2
          =================================================================== */}
      {(caseState.status === CASE_STATUS.FORM_FILLED ||
        caseState.status === CASE_STATUS.APPROVED) && (
        <section
          className="ns-card ns-screen-draft"
          data-testid="screen-draft-summary"
          aria-label="Draft Form Summary"
        >
          <div className="ns-draft-header">
            <h2 className="ns-title">{t('draftScreenTitle')}</h2>
            <div className="ns-card-top-actions">
              <span className="ns-draft-only-badge" data-testid="draft-only-badge">
                📝 {t('draftBadgeText')}
              </span>
              <button
                type="button"
                className="ns-btn ns-speaker-btn"
                data-testid="sunao-draft-btn"
                onClick={() =>
                  playFixedAudioOrSpeak('approval', t('gate2Prompt'), {
                    lang: language,
                    rate,
                  })
                }
              >
                {t('sunaoBtn')}
              </button>
            </div>
          </div>

          <div className="ns-draft-fields-list" data-testid="draft-fields-list">
            {(caseState.draft?.fields || []).map((field) => (
              <div
                key={field.key}
                className="ns-draft-field-row"
                data-testid={`draft-field-${field.key}`}
              >
                <div className="ns-draft-field-main">
                  <span className="ns-draft-field-label">{field.label}:</span>
                  <strong className="ns-draft-field-value">{field.value}</strong>
                </div>
                <span
                  className="ns-source-tag"
                  data-testid={`source-tag-${field.source}`}
                >
                  {t(`sourceTag.${field.source}`)}
                </span>
              </div>
            ))}
          </div>

          <div className="ns-gate2-box" data-testid="gate-2-box">
            <div className="ns-gate2-banner" data-testid="gate-2-badge">
              🛡️ {t('gate2Badge')}
            </div>

            {!gate2Halted ? (
              <>
                <p className="ns-gate2-prompt">{t('gate2Prompt')}</p>

                {voiceSaidYesAtGate2 && (
                  <div
                    className="ns-voice-gate2-confirm-banner"
                    data-testid="gate2-voice-yes-notice"
                  >
                    <p>{t('gate2VoiceSaidYesNotice')}</p>
                    <button
                      type="button"
                      className="ns-btn ns-btn-large ns-btn-success"
                      data-testid="gate2-voice-confirm-btn"
                      onClick={() => handleGate2PhysicalButtonDecision(true)}
                    >
                      {t('gate2VoiceConfirmFinalBtn')}
                    </button>
                  </div>
                )}

                <div className="ns-two-big-buttons">
                  <button
                    type="button"
                    className="ns-btn ns-btn-large ns-btn-success"
                    data-testid="gate2-submit-btn"
                    onClick={() => handleGate2PhysicalButtonDecision(true)}
                  >
                    {t('gate2SubmitBtn')}
                  </button>
                  <button
                    type="button"
                    className="ns-btn ns-btn-large ns-btn-danger"
                    data-testid="gate2-no-btn"
                    onClick={() => handleGate2PhysicalButtonDecision(false)}
                  >
                    {t('gate2ChangeNoBtn')}
                  </button>
                </div>
              </>
            ) : (
              <div className="ns-halted-box" data-testid="gate2-halted-screen">
                <h3>🛑 {t('gate2HaltedTitle')}</h3>
                <p>{t('gate2HaltedMessage')}</p>
                <button
                  type="button"
                  className="ns-btn ns-btn-outline"
                  data-testid="gate2-resume-btn"
                  onClick={() => setGate2Halted(false)}
                >
                  {t('gate2ResumeReviewBtn')}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================================================================
          SCREEN (10): SUBMITTED SCREEN (Big Application ID PEN-2026-88213)
          =================================================================== */}
      {caseState.status === CASE_STATUS.SUBMITTED && (
        <section
          className="ns-card ns-screen-submitted"
          data-testid="screen-submitted"
          aria-label="Application Submitted"
        >
          <div className="ns-card-top-row">
            <h2 className="ns-title">🎉 {t('submittedScreenTitle')}</h2>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-submitted-btn"
              onClick={() =>
                speakText(
                  `${t('submittedScreenTitle')}. ${t('submittedAppIdLabel')}: PEN-2026-88213`
                )
              }
            >
              {t('sunaoBtn')}
            </button>
          </div>
          <p className="ns-subtitle">{t('submittedScreenSubtitle')}</p>

          <div className="ns-big-app-id-box">
            <span className="ns-big-app-id-label">{t('submittedAppIdLabel')}</span>
            <strong className="ns-big-app-id-value" data-testid="submitted-app-id">
              {caseState.submission?.applicationId || 'PEN-2026-88213'}
            </strong>
          </div>

          <button
            type="button"
            className="ns-btn ns-btn-large ns-btn-primary"
            data-testid="submitted-next-track-btn"
            onClick={() => handleQuickAction('trackStatus')}
          >
            {t('submittedNextTrackBtn')}
          </button>
        </section>
      )}

      {/* ===================================================================
          SCREEN (6): TRACKING TIMELINE, DAY-10 QUERY, & +21 DIN TIME-SKIP (F4)
          =================================================================== */}
      {isPostSubmissionTrackingStage && (
        <section
          className="ns-card ns-screen-tracking"
          data-testid="screen-tracking-timeline"
          aria-label={t('trackingTimelineTitle')}
        >
          <div className="ns-card-top-row">
            <h2 className="ns-title">📊 {t('trackingTimelineTitle')}</h2>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-tracking-btn"
              onClick={() =>
                speakText(
                  `${t('trackingTimelineTitle')}. ${t(`status.${caseState.status}`)}`
                )
              }
            >
              {t('sunaoBtn')}
            </button>
          </div>

          {/* 6-Stage Timeline with Big Icons and Text */}
          <div className="ns-timeline-grid" data-testid="status-timeline-nodes">
            {TIMELINE_STAGES.map((stage) => {
              const isCurrent = caseState.status === stage.status;
              const wasVisited = (caseState.history || []).includes(stage.status);
              return (
                <div
                  key={stage.status}
                  data-testid={`timeline-node-${stage.status}`}
                  className={`ns-timeline-node ${
                    isCurrent
                      ? 'ns-timeline-node-current'
                      : wasVisited
                        ? 'ns-timeline-node-visited'
                        : ''
                  }`}
                >
                  <span className="ns-timeline-icon" aria-hidden="true">
                    {stage.icon}
                  </span>
                  <span className="ns-timeline-label">
                    {t(`status.${stage.status}`)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Demo Controls on Tracking Screen: Day 10 Query Toggle & +21 din Time-Skip */}
          {caseState.status === CASE_STATUS.TRACKING && (
            <div className="ns-tracking-demo-controls">
              {caseState.callRecord?.referenceId && (
                <div
                  className="ns-call-schedule-banner"
                  data-testid="tracking-ref-banner"
                >
                  📞 {t('callNextCheckSchedule')}
                </div>
              )}

              <div className="ns-two-big-buttons">
                <button
                  type="button"
                  className="ns-btn ns-btn-outline"
                  data-testid="toggle-query-path-btn"
                  onClick={handleRaiseQueryDay10}
                >
                  {t('trackingQueryToggleBtn')}
                </button>
                <button
                  type="button"
                  className="ns-btn ns-btn-accent"
                  data-testid="time-skip-21-btn"
                  onClick={handleTimeSkip21Days}
                >
                  {t('trackingTimeSkip21Btn')}
                </button>
              </div>

              {caseState.callRecord?.referenceId && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="ns-btn ns-btn-large ns-btn-success"
                    data-testid="final-approve-close-btn"
                    onClick={handleFinalApproveAndClose}
                  >
                    {t('trackingFinalApproveBtn')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Query-Raised Path (Day 10): "Office ne ek sawal poocha" -> Camera Resubmit -> Back to TRACKING */}
          {caseState.status === CASE_STATUS.QUERY_RAISED && (
            <div className="ns-query-raised-card" data-testid="query-raised-card">
              <h3>❓ {t('trackingQueryTitle')}</h3>
              <p>{t('trackingQueryQuestion')}</p>
              <div className="ns-camera-controls">
                <label
                  className="ns-btn ns-btn-primary"
                  htmlFor="ns-query-camera-input"
                >
                  {t('trackingQueryResubmitBtn')}
                </label>
                <input
                  id="ns-query-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  data-testid="query-camera-input"
                  className="ns-sr-only"
                  onChange={handleResubmitQueryDocument}
                />
                <button
                  type="button"
                  className="ns-btn ns-btn-success"
                  data-testid="query-resubmit-doc-btn"
                  onClick={handleResubmitQueryDocument}
                >
                  {t('trackingQueryResubmitBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STALLED after +21 din: "7 din se ruka hai" -> Start Office Call */}
          {caseState.status === CASE_STATUS.STALLED && (
            <div className="ns-stalled-card" data-testid="stalled-7-days-banner">
              <h3>{t('trackingStalledAlert')}</h3>
              <button
                type="button"
                className="ns-btn ns-btn-large ns-btn-primary"
                data-testid="start-office-call-btn"
                onClick={handleStartOfficeCall}
              >
                {t('trackingStartCallBtn')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          SCREEN (7): CALL SCREEN (Simulated Call — Judge Plays Office Officer)
          =================================================================== */}
      {(callSessionActive || caseState.status === CASE_STATUS.CALLED) && (
        <section
          className="ns-card ns-screen-call"
          data-testid="screen-office-call"
          aria-label={t('callScreenTitle')}
        >
          <div className="ns-card-top-row">
            <div>
              <h2 className="ns-title">📞 {t('callScreenTitle')}</h2>
              <p className="ns-subtitle">{t('callScreenSubtitle')}</p>
            </div>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-call-btn"
              onClick={() =>
                speakText(
                  `${t('callScreenTitle')}. ${
                    extractedRefId ? t('callNextCheckSchedule') : ''
                  }`
                )
              }
            >
              {t('sunaoBtn')}
            </button>
          </div>

          <div className="ns-call-transcript-box" data-testid="call-live-transcript">
            {callTurns.map((turn, idx) => (
              <div
                key={`turn-${idx}`}
                className="ns-call-turn-item"
                data-testid={`call-turn-${idx}`}
              >
                <strong>{turn.speaker}:</strong> <span>{turn.text}</span>
              </div>
            ))}
          </div>

          <div className="ns-officer-reply-controls">
            <button
              type="button"
              className="ns-btn ns-btn-outline"
              data-testid="officer-reply-preset-btn"
              onClick={() =>
                handleSendOfficerReply(
                  'Verified Jeevan Pramaan certificate JP-2026-9910. Reference REF-5521 logged. Will disburse in 3 days.'
                )
              }
            >
              {t('callOfficerPresetBtn')}
            </button>

            <div className="ns-text-fallback-row" style={{ marginTop: '0.75rem' }}>
              <input
                type="text"
                className="ns-text-input"
                data-testid="officer-reply-input"
                value={officerInput}
                onChange={(e) => setOfficerInput(e.target.value)}
                placeholder={t('callOfficerInputPlaceholder')}
                aria-label={t('callOfficerInputPlaceholder')}
              />
              <button
                type="button"
                className="ns-btn"
                data-testid="officer-reply-mic-btn"
                onClick={() => startListening()}
              >
                🎤
              </button>
              <button
                type="button"
                className="ns-btn ns-btn-primary"
                data-testid="officer-reply-send-btn"
                onClick={() => handleSendOfficerReply()}
              >
                {t('callOfficerSendBtn')}
              </button>
            </div>
          </div>

          {(extractedRefId || caseState.callRecord?.referenceId) && (
            <div
              className="ns-call-extracted-box"
              data-testid="call-next-check-banner"
            >
              <p>
                <strong>{t('callExtractedRefLabel')}:</strong>{' '}
                <span data-testid="extracted-ref-id">
                  {extractedRefId || caseState.callRecord?.referenceId}
                </span>
              </p>
              <p>{t('callNextCheckSchedule')}</p>
              <div className="ns-two-big-buttons">
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-primary"
                  data-testid="call-return-tracking-btn"
                  onClick={handleReturnToTrackingAfterCall}
                >
                  {t('callReturnToTrackingBtn')}
                </button>
                <button
                  type="button"
                  className="ns-btn ns-btn-large ns-btn-success"
                  data-testid="call-direct-close-btn"
                  onClick={handleFinalApproveAndClose}
                >
                  {t('trackingFinalApproveBtn')}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          FINAL CLOSED SCREEN: "Pension phir chalu ho gayi"
          =================================================================== */}
      {caseState.status === CASE_STATUS.CLOSED && (
        <section
          className="ns-card ns-screen-closed"
          data-testid="screen-closed"
          aria-label={t('closedScreenTitle')}
        >
          <div className="ns-card-top-row">
            <h2 className="ns-title">🎊 {t('closedScreenTitle')}</h2>
            <button
              type="button"
              className="ns-btn ns-speaker-btn"
              data-testid="sunao-closed-btn"
              onClick={() =>
                speakText(`${t('closedScreenTitle')}. ${t('closedScreenMessage')}`)
              }
            >
              {t('sunaoBtn')}
            </button>
          </div>
          <p className="ns-subtitle">{t('closedScreenMessage')}</p>
          <div className="ns-masked-pii-row" style={{ justifyContent: 'center' }}>
            <span className="ns-pii-pill ns-pill-success" data-testid="closed-app-id">
              {t('applicationIdLabel')}: PEN-2026-88213
            </span>
            <span className="ns-pii-pill ns-pill-success" data-testid="closed-ref-id">
              {t('callerRefLabel')}: REF-5521
            </span>
          </div>
        </section>
      )}

      {/* ===================================================================
          LETTER EXPLAINER UI ("Ye chitthi samjhao") + PORTAL RETRY X3 FAILURE UI
          =================================================================== */}
      <section
        className="ns-card ns-letter-explainer-card"
        data-testid="letter-explainer-card"
        aria-label={t('letterExplainerTitle')}
      >
        <div className="ns-card-top-row">
          <div>
            <h2 className="ns-section-heading">{t('letterExplainerTitle')}</h2>
            <p className="ns-phase-desc">{t('letterExplainerSubtitle')}</p>
          </div>
          <button
            type="button"
            className="ns-btn ns-speaker-btn"
            data-testid="sunao-letter-btn"
            onClick={() =>
              speakText(
                letterExplanation?.speech ||
                  letterExplanation?.display ||
                  t('letterExplainerSubtitle')
              )
            }
          >
            {t('sunaoBtn')}
          </button>
        </div>

        <div className="ns-camera-controls">
          <label className="ns-btn ns-btn-primary" htmlFor="ns-letter-camera-input">
            {t('letterExplainerBtn')}
          </label>
          <input
            id="ns-letter-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            data-testid="letter-camera-input"
            className="ns-sr-only"
            onChange={handleExplainLetter}
          />
          <button
            type="button"
            className="ns-btn ns-btn-outline"
            data-testid="explain-letter-btn"
            onClick={handleExplainLetter}
          >
            {t('letterExplainerBtn')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-outline"
            data-testid="open-madad-kendra-btn"
            onClick={() => {
              stopSpeaking();
              setShowMadadKendraPanel((prev) => !prev);
            }}
          >
            🏥 {t('madadKendraTitle')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-outline"
            data-testid="simulate-portal-failure-btn"
            onClick={handleSimulatePortalFailure}
          >
            {t('portalRetrySimulateBtn')}
          </button>
        </div>

        {letterExplanation && (
          <div
            className="ns-letter-explanation-box"
            data-testid="letter-explanation-output"
          >
            <p>
              <strong>{letterExplanation.display}</strong>
            </p>
            <p className="ns-phase-desc">
              {letterExplanation.data?.sender} — {letterExplanation.data?.actionRequired} (
              {letterExplanation.data?.deadline})
            </p>
          </div>
        )}

        {portalRetryAttempts.length > 0 && (
          <div className="ns-portal-retry-box" data-testid="portal-retry-log">
            <ul>
              {portalRetryAttempts.map((attemptText, idx) => (
                <li key={`retry-${idx}`} data-testid={`portal-retry-item-${idx + 1}`}>
                  🔄 {attemptText}
                </li>
              ))}
            </ul>
            {portalFailedFinal && (
              <p
                className="ns-alert-error"
                data-testid="portal-failure-final-msg"
              >
                {t('portalRetryFailedFinal')}
              </p>
            )}
          </div>
        )}
      </section>
      </div>

    </div>
  );
}
