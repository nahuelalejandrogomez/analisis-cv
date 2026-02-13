const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getJobs(refresh = false) {
  const params = refresh ? '?refresh=true' : '';
  return fetchAPI(`/jobs${params}`);
}

export async function getJob(jobId) {
  return fetchAPI(`/jobs/${jobId}`);
}

export async function refreshJobs() {
  return fetchAPI('/jobs/refresh', { method: 'POST' });
}

export async function getCandidates(jobId) {
  return fetchAPI(`/jobs/${jobId}/candidates`);
}

export async function getCVText(candidateId) {
  return fetchAPI(`/candidates/${candidateId}/cv`);
}

export async function getCVMetadata(candidateId) {
  return fetchAPI(`/candidates/${candidateId}/cv-metadata`);
}

export async function evaluateCandidate(jobId, candidate) {
  return fetchAPI('/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      jobId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
    }),
  });
}

export async function evaluateBatch(jobId, candidates) {
  return fetchAPI('/evaluate/batch', {
    method: 'POST',
    body: JSON.stringify({ jobId, candidates }),
  });
}

export async function getEvaluations(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const url = queryParams ? `/evaluations?${queryParams}` : '/evaluations';
  return fetchAPI(url);
}

export async function getEvaluationStats(jobId) {
  return fetchAPI(`/evaluations/stats/${jobId}`);
}

export async function getEvaluationSummary(jobId) {
  return fetchAPI(`/jobs/${jobId}/evaluations/summary`);
}

export async function deleteEvaluation(id) {
  return fetchAPI(`/evaluations/${id}`, { method: 'DELETE' });
}

export async function deleteEvaluationByCandidate(jobId, candidateId) {
  return fetchAPI(`/jobs/${jobId}/candidates/${candidateId}/evaluation`, { 
    method: 'DELETE' 
  });
}

export async function deleteEvaluationsBatch(ids) {
  return fetchAPI('/evaluations/delete-batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function getResumeDownloadUrl(candidateId, resumeId, candidateName) {
  const params = new URLSearchParams({
    resumeId,
    name: candidateName || 'candidato'
  });
  return `${API_URL}/candidates/${candidateId}/resume/download?${params}`;
}
