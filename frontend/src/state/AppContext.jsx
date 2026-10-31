import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  DEFAULT_LANGUAGE,
  normalizeLangCode,
  getDictionary,
  t as translateKey,
} from '../i18n/index.js';
import {
  CASE_STATUS,
  createInitialCaseState,
  transitionCaseState,
} from './caseMachine.js';
import { api } from '../api/index.js';

const STORAGE_KEY = 'nagarsathi_lang';

const AppContext = createContext(null);

function loadStoredLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeLangCode(saved) : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function AppProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(
    () => (initialLanguage ? normalizeLangCode(initialLanguage) : loadStoredLanguage())
  );
  const [caseState, setCaseState] = useState(() =>
    createInitialCaseState(initialLanguage ? normalizeLangCode(initialLanguage) : loadStoredLanguage())
  );
  const [lastAgentReply, setLastAgentReply] = useState(null);
  const [safetyAlert, setSafetyAlert] = useState(null);

  const setLanguage = useCallback((nextLang) => {
    const normalized = normalizeLangCode(nextLang);
    setLanguageState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = normalized.split('-')[0];
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
    setCaseState((prev) => ({ ...prev, language: normalized }));
  }, []);

  useEffect(() => {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = language.split('-')[0];
      }
    } catch {
      // Ignore
    }
  }, [language]);

  const t = useCallback(
    (keyPath) => translateKey(language, keyPath),
    [language]
  );

  const dictionary = useMemo(() => getDictionary(language), [language]);

  const dispatchTransition = useCallback((nextStatus, payload = {}) => {
    setSafetyAlert(null);
    setCaseState((prev) => transitionCaseState(prev, nextStatus, payload));
  }, []);

  const runMockAction = useCallback(
    async (actionName) => {
      setSafetyAlert(null);
      try {
        let reply = null;
        switch (actionName) {
          case 'intake':
            reply = await api.createCaseFromTranscript({ language });
            setCaseState((prev) => ({
              ...prev,
              status: CASE_STATUS.INTAKE,
              serviceId: reply.data.service.id,
              serviceName: reply.data.service.name,
              confidence: reply.data.confidence,
              language,
            }));
            break;
          case 'confirmService':
            reply = await api.confirmService({
              caseId: caseState.id,
              serviceId: 'pension_restoration',
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.SERVICE_CONFIRMED, {
                serviceId: reply.data.serviceId,
                confidence: reply.data.confidence,
              })
            );
            break;
          case 'consent':
            reply = await api.giveConsent({
              caseId: caseState.id,
              given: true,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.CONSENTED, {
                consent: reply.data.consent,
              })
            );
            break;
          case 'collectDocs':
            reply = await api.uploadDocuments({
              caseId: caseState.id,
              markReady: false,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.DOCS_COLLECTING, {
                documents: reply.data.checklist,
              })
            );
            break;
          case 'readyDocs':
            reply = await api.uploadDocuments({
              caseId: caseState.id,
              markReady: true,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.DOCS_READY, {
                documents: reply.data.checklist,
              })
            );
            break;
          case 'fillDraft':
            reply = await api.fillDraft({
              caseId: caseState.id,
              language,
            });
            setCaseState((prev) => {
              let current = prev;
              if (current.status === CASE_STATUS.DOCS_COLLECTING || current.status === CASE_STATUS.CONSENTED) {
                current = transitionCaseState(current, CASE_STATUS.DOCS_READY);
              }
              return transitionCaseState(current, CASE_STATUS.FORM_FILLED, {
                draft: reply.data.draft,
                approval: { given: false, timestamp: null },
              });
            });
            break;
          case 'approveDraft':
            reply = await api.approveDraft({
              caseId: caseState.id,
              given: true,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.APPROVED, {
                approval: reply.data.approval,
              })
            );
            break;
          case 'submitForm':
            // First check client-side state machine guard
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.SUBMITTED, {
                submission: {
                  applicationId: 'PEN-2026-88213',
                  submittedAt: new Date().toISOString(),
                },
              })
            );
            reply = await api.submitApplication({
              caseId: caseState.id,
              language,
            });
            break;
          case 'trackStatus':
            reply = await api.getCaseStatus({
              caseId: caseState.id,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.TRACKING, {
                tracking: reply.data.tracking,
              })
            );
            break;
          case 'raiseQuery':
            reply = await api.demoRaiseQuery({
              caseId: caseState.id,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.QUERY_RAISED, {
                tracking: {
                  ...(prev.tracking || {}),
                  query: reply.data.query,
                },
              })
            );
            break;
          case 'skipDaysStall':
            reply = await api.demoSkipDays({
              caseId: caseState.id,
              days: 15,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.STALLED, {
                tracking: {
                  ...(prev.tracking || {}),
                  daysElapsed: 15,
                  stalled: true,
                },
              })
            );
            break;
          case 'callOffice':
            await api.startCall({ caseId: caseState.id, language });
            await api.callTurn({ caseId: caseState.id, language });
            reply = await api.endCall({ caseId: caseState.id, language });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.CALLED, {
                callRecord: {
                  referenceId: reply.data.referenceId,
                  summary: reply.data.summary,
                },
              })
            );
            break;
          case 'closeCase':
            reply = await api.demoApproveAndClose({
              caseId: caseState.id,
              language,
            });
            setCaseState((prev) =>
              transitionCaseState(prev, CASE_STATUS.CLOSED, {
                resolution: reply.data.resolution,
              })
            );
            break;
          case 'reset':
            reply = await api.demoReset({ language });
            setCaseState(createInitialCaseState(language));
            break;
          default:
            break;
        }
        if (reply) {
          setLastAgentReply(reply);
        }
        return reply;
      } catch (err) {
        if (err.code === 'APPROVAL_REQUIRED') {
          setSafetyAlert(translateKey(language, 'approvalBlockedAlert'));
        } else {
          setSafetyAlert(err.message);
        }
        throw err;
      }
    },
    [caseState.id, language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      dictionary,
      caseState,
      setCaseState,
      dispatchTransition,
      lastAgentReply,
      setLastAgentReply,
      safetyAlert,
      setSafetyAlert,
      runMockAction,
    }),
    [
      language,
      setLanguage,
      t,
      dictionary,
      caseState,
      dispatchTransition,
      lastAgentReply,
      safetyAlert,
      runMockAction,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return ctx;
}

