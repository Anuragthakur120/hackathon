import { useApp } from '../state/AppContext.jsx';

export function WorkflowShellScreen() {
  const {
    t,
    caseState,
    lastAgentReply,
    safetyAlert,
    runMockAction,
  } = useApp();

  const handleAction = async (actionName) => {
    try {
      await runMockAction(actionName);
    } catch {
      // Handled in AppContext safetyAlert
    }
  };

  return (
    <div className="ns-workflow-shell">
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

        <div className="ns-safety-banner" role="note">
          {t('safetyRuleBanner')}
        </div>
      </section>

      <section className="ns-card" aria-label={t('workflowPreviewTitle')}>
        <div className="ns-status-row">
          <span className="ns-status-label">{t('currentStatusLabel')}:</span>
          <strong className="ns-status-value" data-testid="current-case-status">
            {t(`status.${caseState.status}`)}
          </strong>
        </div>

        {safetyAlert && (
          <div
            className="ns-alert-error"
            role="alert"
            data-testid="safety-guard-alert"
          >
            {safetyAlert}
          </div>
        )}

        <h2 className="ns-section-heading">{t('workflowPreviewTitle')}</h2>

        <div className="ns-action-grid">
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-intake"
            onClick={() => handleAction('intake')}
          >
            {t('actionStartIntake')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-confirm-service"
            onClick={() => handleAction('confirmService')}
          >
            {t('actionConfirmService')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-consent"
            onClick={() => handleAction('consent')}
          >
            {t('actionGiveConsent')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-collect-docs"
            onClick={() => handleAction('collectDocs')}
          >
            {t('actionCollectDocs')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-ready-docs"
            onClick={() => handleAction('readyDocs')}
          >
            {t('actionReadyDocs')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-fill-draft"
            onClick={() => handleAction('fillDraft')}
          >
            {t('actionFillDraft')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-accent"
            data-testid="btn-approve-draft"
            onClick={() => handleAction('approveDraft')}
          >
            {t('actionApproveDraft')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-primary"
            data-testid="btn-submit-form"
            onClick={() => handleAction('submitForm')}
          >
            {t('actionSubmitForm')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-track-status"
            onClick={() => handleAction('trackStatus')}
          >
            {t('actionTrackStatus')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-raise-query"
            onClick={() => handleAction('raiseQuery')}
          >
            {t('actionRaiseQuery')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-skip-days"
            onClick={() => handleAction('skipDaysStall')}
          >
            {t('actionSkipDaysStall')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-call-office"
            onClick={() => handleAction('callOffice')}
          >
            {t('actionCallOffice')}
          </button>
          <button
            type="button"
            className="ns-btn"
            data-testid="btn-resume-tracking"
            onClick={() => handleAction('trackStatus')}
          >
            {t('actionResumeTracking')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-success"
            data-testid="btn-close-case"
            onClick={() => handleAction('closeCase')}
          >
            {t('actionCloseCase')}
          </button>
          <button
            type="button"
            className="ns-btn ns-btn-outline"
            data-testid="btn-reset-demo"
            onClick={() => handleAction('reset')}
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

