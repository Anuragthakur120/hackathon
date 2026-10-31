async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok) {
    const err = new Error(payload?.display || payload?.error || 'API Error');
    err.code = payload?.code || `HTTP_${response.status}`;
    throw err;
  }
  return payload;
}

export const realApi = {
  getState() {
    return null;
  },

  requestOtp({ phone = '9876543210', language = 'mr-IN' } = {}) {
    return request('/api/auth/otp', {
      method: 'POST',
      body: JSON.stringify({ phone, language }),
    });
  },

  verifyOtp({ phone = '9876543210', otp = '123456', language = 'mr-IN' } = {}) {
    return request('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, language }),
    });
  },

  createCaseFromTranscript({
    transcript = 'Meri pension band ho gayi',
    language = 'mr-IN',
  } = {}) {
    return request('/api/cases', {
      method: 'POST',
      body: JSON.stringify({ transcript, language }),
    });
  },

  answerCaseQuestion({
    caseId,
    answer,
    fieldId = 'pensionType',
    language = 'mr-IN',
  } = {}) {
    return request(`/api/cases/${caseId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer, fieldId, language }),
    });
  },

  confirmService({
    caseId,
    serviceId = 'pension_restoration',
    confirmed = true,
    language = 'mr-IN',
  } = {}) {
    return request(`/api/cases/${caseId}/confirm-service`, {
      method: 'POST',
      body: JSON.stringify({ serviceId, confirmed, language }),
    });
  },

  giveConsent({ caseId, given = true, language = 'mr-IN' } = {}) {
    return request(`/api/cases/${caseId}/consent`, {
      method: 'POST',
      body: JSON.stringify({ given, language }),
    });
  },

  uploadDocuments({
    caseId,
    documents = [],
    markReady = false,
    simulateIssue = null,
    language = 'mr-IN',
  } = {}) {
    return request(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ documents, markReady, simulateIssue, language }),
    });
  },

  fillDraft({ caseId, language = 'mr-IN' } = {}) {
    return request(`/api/cases/${caseId}/fill-draft`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  },

  approveDraft({ caseId, given = true, language = 'mr-IN' } = {}) {
    return request(`/api/cases/${caseId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ given, language }),
    });
  },

  submitApplication({ caseId, language = 'mr-IN' } = {}) {
    return request(`/api/cases/${caseId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  },

  getCaseStatus({ caseId, language = 'mr-IN' } = {}) {
    return request(
      `/api/cases/${caseId}?language=${encodeURIComponent(language)}`
    );
  },

  startCall({ caseId, language = 'mr-IN' } = {}) {
    return request(`/api/cases/${caseId}/call/start`, {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  },

  callTurn({
    caseId,
    callId = 'CALL-SIM-001',
    officerUtterance = '',
    language = 'mr-IN',
  } = {}) {
    return request(`/api/cases/${caseId}/call/turn`, {
      method: 'POST',
      body: JSON.stringify({ callId, officerUtterance, language }),
    });
  },

  endCall({ caseId, callId = 'CALL-SIM-001', language = 'mr-IN' } = {}) {
    return request(`/api/cases/${caseId}/call/end`, {
      method: 'POST',
      body: JSON.stringify({ callId, language }),
    });
  },

  getProfile({ language = 'mr-IN' } = {}) {
    return request(`/api/profile?language=${encodeURIComponent(language)}`);
  },

  patchProfile({
    name = 'Ramabai Kulkarni',
    saveProfile = true,
    language = 'mr-IN',
  } = {}) {
    return request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name, saveProfile, language }),
    });
  },

  deleteProfile({ language = 'mr-IN' } = {}) {
    return request('/api/profile', {
      method: 'DELETE',
      body: JSON.stringify({ language }),
    });
  },

  deleteAllMyData({ language = 'mr-IN' } = {}) {
    return request('/api/profile/delete-all-my-data', {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  },

  explainLetter({ text = '', imageName = '', language = 'mr-IN' } = {}) {
    return request('/api/letters/explain', {
      method: 'POST',
      body: JSON.stringify({ text, imageName, language }),
    });
  },

  demoRaiseQuery({ caseId, queryText = '', language = 'mr-IN' } = {}) {
    return request('/api/demo/raise-query', {
      method: 'POST',
      body: JSON.stringify({ caseId, queryText, language }),
    });
  },

  demoSkipDays({ caseId, days = 21, language = 'mr-IN' } = {}) {
    return request('/api/demo/skip-days', {
      method: 'POST',
      body: JSON.stringify({ caseId, days, language }),
    });
  },

  demoApproveAndClose({ caseId, language = 'mr-IN' } = {}) {
    return request('/api/demo/approve', {
      method: 'POST',
      body: JSON.stringify({ caseId, language }),
    });
  },

  demoReset({ language = 'mr-IN' } = {}) {
    return request('/api/demo/reset', {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
  },
};
