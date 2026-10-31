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
  requestOtp: (body) =>
    request('/api/auth/otp', { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp: (body) =>
    request('/api/auth/verify', { method: 'POST', body: JSON.stringify(body) }),
  createCaseFromTranscript: (body) =>
    request('/api/cases', { method: 'POST', body: JSON.stringify(body) }),
  answerCaseQuestion: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  confirmService: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/confirm-service`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  giveConsent: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/consent`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  uploadDocuments: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  fillDraft: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/fill-draft`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  approveDraft: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  submitApplication: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/submit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getCaseStatus: ({ caseId, language }) =>
    request(`/api/cases/${caseId}?language=${encodeURIComponent(language || 'mr-IN')}`),
  startCall: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/call/start`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  callTurn: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/call/turn`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  endCall: ({ caseId, ...body }) =>
    request(`/api/cases/${caseId}/call/end`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getProfile: () => request('/api/profile'),
  patchProfile: (body) =>
    request('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProfile: () => request('/api/profile', { method: 'DELETE' }),
  deleteAllMyData: () =>
    request('/api/profile/delete-all-my-data', { method: 'POST' }),
  explainLetter: (body) =>
    request('/api/letters/explain', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  demoRaiseQuery: (body) =>
    request('/api/demo/raise-query', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  demoSkipDays: (body) =>
    request('/api/demo/skip-days', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  demoApproveAndClose: (body) =>
    request('/api/demo/approve', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  demoReset: (body) =>
    request('/api/demo/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

