import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { CASE_STATUS, transitionCaseState } from '../state/caseMachine.js';
import { api, DEFAULT_CHECKLIST } from '../api/index.js';

export function WorkflowShellScreen() {
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

  // Conversation & Intake state (Screen 2)
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [intakeSubStep, setIntakeSubStep] = useState('INITIAL'); // INITIAL | CLARIFY | CONFIRM | MADAD_KENDRA

  // Consent & Profile-Save state (Screen 3 - Gate 1)
  const [consentHalted, setConsentHalted] = useState(false);
  const [profileSaveAnswered, setProfileSaveAnswered] = useState(false);
  const [profileSavedChoice, setProfileSavedChoice] = useState(null);

  // Documents Bad-Document Loop state (Screen 4)
  const [docAttemptStep, setDocAttemptStep] = useState(0); // 0: initial, 1: blurry, 2: expired, 3: ready
  const [docWarning, setDocWarning] = useState(null);

  // Draft & Approval Gate 2 state (Screen 5)
  const [gate2Halted, setGate2Halted] = useState(false);

  const appendMessage = (sender, display, speech) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${prev.length}`,
        sender,
        display,
        speech: speech || display,
      },
    ]);
  };

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
      return;
    }

    if (!reply.data.service || reply.data.confidence < 0.6) {
      setIntakeSubStep('INITIAL');
      return;
    }

    setCaseState((prev) => ({
      ...prev,
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
    // Move to Documents Checklist (DOCS_COLLECTING)
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

    // Step 3+: All documents clear and valid -> DOCS_READY
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
    await runMockAction('fillDraft');
  };

  // Screen 5: Gate 2 Approval & Submit or Stop
  const handleGate2Decision = async (approved) => {
    if (!approved) {
      setGate2Halted(true);
      setCaseState((prev) => ({
        ...prev,
        approval: { given: false, timestamp: null },
      }));
      return;
    }

    setGate2Halted(false);
    await runMockAction('approveDraft');
    await runMockAction('submitForm');
  };

  const handleFullReset = async () => {
    setConsentHalted(false);
    setProfileSaveAnswered(false);
    setProfileSavedChoice(null);
    setDocAttemptStep(0);
    setDocWarning(null);
    setGate2Halted(false);
    setIntakeSubStep('INITIAL');
    setMessages([]);
    await runMockAction('reset');
  };

  // Determine Human-Control Label for current step
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

  return (
    <div className="ns-workflow-shell">
      {/* Top Citizen Persona + Status Chip + Human Control Label */}
      <section className="ns-card ns-persona-card" aria-label="Citizen Persona">
        <div className="ns-persona-header">
          <div>
            <h1 className="ns-card-title">{t('citizenPersonaTitle')}</h1>
            <p className="ns-persona-scenario">{t('citizenPersonaScenario')}</p>
          </div>
          <div className="ns-badge" data-testid="active-lang-badge">
            {t('activeLanguageBadge')}
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
          {/* Big Mic Button Placeholder (Wired in F3) */}
          <div className="ns-mic-hero">
            <button
              type="button"
              className="ns-btn ns-mic-huge-btn"
              data-testid="mic-placeholder-btn"
              onClick={() => handleSendTranscript('Meri pension band ho gayi')}
            >
              {t('micPlaceholderBtn')}
            </button>
            <p className="ns-mic-caption">{t('micPlaceholderTitle')}</p>
          </div>

          {/* Preset Utterance Buttons for quick citizen / demo selection */}
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

          {/* Text Box Fallback */}
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

          {/* Message Bubbles with Display text + Speaker button on every message */}
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
                  >
                    {t('speakerBtnLabel')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Clarifying Question -> TWO BIG ANSWER BUTTONS */}
          {intakeSubStep === 'CLARIFY' && (
            <div className="ns-clarify-box" data-testid="clarifying-question-box">
              <h2 className="ns-section-heading">{t('clarifyingQuestionTitle')}</h2>
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

          {/* Citizen Service Confirmation ("Aapko pension chalu karwani hai, sahi?") */}
          {intakeSubStep === 'CONFIRM' && (
            <div className="ns-service-confirm-box" data-testid="service-confirm-box">
              <h2 className="ns-section-heading">{t('serviceConfirmTitle')}</h2>
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

          {/* Unknown Service / Low Confidence -> Madad Kendra */}
          {intakeSubStep === 'MADAD_KENDRA' && (
            <div className="ns-madad-kendra-card" data-testid="madad-kendra-card">
              <h2>{t('madadKendraTitle')}</h2>
              <p>{t('madadKendraMessage')}</p>
              <button
                type="button"
                className="ns-btn ns-btn-primary"
                data-testid="madad-kendra-restart-btn"
                onClick={handleFullReset}
              >
                {t('madadKendraRestart')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          SCREEN (3): CONSENT SCREEN = GATE 1 (Distinct Gate 1 Color)
          + Separate Profile Save Question
          =================================================================== */}
      {(caseState.status === CASE_STATUS.SERVICE_CONFIRMED ||
        (caseState.status === CASE_STATUS.CONSENTED && !profileSaveAnswered)) && (
        <section
          className="ns-card ns-gate1-card"
          data-testid="screen-consent-gate1"
          aria-label="Gate 1 Consent"
        >
          <div className="ns-gate1-banner" data-testid="gate-1-badge">
            🔒 {t('gate1Badge')}
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

          {/* Consent NO -> Friendly Halted End Screen, nothing saved */}
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

          {/* Separate Question Right After Consent: Save Profile for Next Time? */}
          {caseState.status === CASE_STATUS.CONSENTED && !profileSaveAnswered && (
            <div className="ns-save-profile-box" data-testid="save-profile-card">
              <h3>{t('saveProfileQuestionTitle')}</h3>
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
          <h2 className="ns-title">{t('docsScreenTitle')}</h2>
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

          {/* Bad Document Warning Banner */}
          {docWarning && (
            <div
              className="ns-alert-error"
              role="alert"
              data-testid={`doc-warning-${docWarning.code.toLowerCase()}`}
            >
              ⚠️ {docWarning.text}
            </div>
          )}

          {/* Camera Input + Capture Buttons */}
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
          SCREEN (5): DRAFT FORM SUMMARY + GATE 2 (Distinct Gate 2 Color)
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
            <span className="ns-draft-only-badge" data-testid="draft-only-badge">
              📝 {t('draftBadgeText')}
            </span>
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

          {/* GATE 2: Final Approval Gate (Distinct Color) */}
          <div className="ns-gate2-box" data-testid="gate-2-box">
            <div className="ns-gate2-banner" data-testid="gate-2-badge">
              🛡️ {t('gate2Badge')}
            </div>

            {!gate2Halted ? (
              <>
                <p className="ns-gate2-prompt">{t('gate2Prompt')}</p>
                <div className="ns-two-big-buttons">
                  <button
                    type="button"
                    className="ns-btn ns-btn-large ns-btn-success"
                    data-testid="gate2-submit-btn"
                    onClick={() => handleGate2Decision(true)}
                  >
                    {t('gate2SubmitBtn')}
                  </button>
                  <button
                    type="button"
                    className="ns-btn ns-btn-large ns-btn-danger"
                    data-testid="gate2-no-btn"
                    onClick={() => handleGate2Decision(false)}
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
          <h2 className="ns-title">🎉 {t('submittedScreenTitle')}</h2>
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
          Developer / Demo Step Bar & Agent Reply Inspector
          =================================================================== */}
      <section className="ns-card" aria-label={t('workflowPreviewTitle')}>
        <h2 className="ns-section-heading">{t('workflowPreviewTitle')}</h2>

        <div className="ns-action-grid">
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-intake"
            onClick={() => handleQuickAction('intake')}
          >
            {t('actionStartIntake')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-confirm-service"
            onClick={() => handleQuickAction('confirmService')}
          >
            {t('actionConfirmService')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-consent"
            onClick={() => handleQuickAction('consent')}
          >
            {t('actionGiveConsent')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-collect-docs"
            onClick={() => handleQuickAction('collectDocs')}
          >
            {t('actionCollectDocs')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-ready-docs"
            onClick={() => handleQuickAction('readyDocs')}
          >
            {t('actionReadyDocs')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-fill-draft"
            onClick={() => handleQuickAction('fillDraft')}
          >
            {t('actionFillDraft')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-accent"
            data-testid="btn-approve-draft"
            onClick={() => handleQuickAction('approveDraft')}
          >
            {t('actionApproveDraft')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-primary"
            data-testid="btn-submit-form"
            onClick={() => handleQuickAction('submitForm')}
          >
            {t('actionSubmitForm')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-track-status"
            onClick={() => handleQuickAction('trackStatus')}
          >
            {t('actionTrackStatus')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-raise-query"
            onClick={() => handleQuickAction('raiseQuery')}
          >
            {t('actionRaiseQuery')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-skip-days"
            onClick={() => handleQuickAction('skipDaysStall')}
          >
            {t('actionSkipDaysStall')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-call-office"
            onClick={() => handleQuickAction('callOffice')}
          >
            {t('actionCallOffice')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-resume-tracking"
            onClick={() => handleQuickAction('trackStatus')}
          >
            {t('actionResumeTracking')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-success"
            data-testid="btn-close-case"
            onClick={() => handleQuickAction('closeCase')}
          >
            {t('actionCloseCase')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-outline"
            data-testid="btn-reset-demo"
            onClick={() => handleQuickAction('reset')}
          >
            {t('actionResetDemo')}
          </button>
        </div>

        {lastAgentReply && (
          <div className="ns-reply-box" data-testid="agent-reply-box">
            <div className="ns-reply-item">
              <strong>{t('agentDisplayLabel')}:</strong>{' '}
              <span data-testid="agent-reply-display">
                {lastAgentReply.display}
              </span>
            </div>
            <div className="ns-reply-item">
              <strong>{t('agentSpeechLabel')}:</strong>{' '}
              <span data-testid="agent-reply-speech">
                {lastAgentReply.speech}
              </span>
            </div>
            <div className="ns-reply-item">
              <strong>{t('agentDataLabel')}:</strong>
              <pre
                className="ns-reply-json"
                data-testid="agent-reply-data"
              >
                {JSON.stringify(lastAgentReply.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
