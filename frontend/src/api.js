const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Helper function to make API calls
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get all active jobs
 */
export async function getJobs(refresh = false) {
  const params = refresh ? '?refresh=true' : '';
  return fetchAPI(`/jobs${params}`);
}

/**
 * Get a specific job
 */
export async function getJob(jobId) {
  return fetchAPI(`/jobs/${jobId}`);
}

/**
 * Refresh jobs cache
 */
export async function refreshJobs() {
  return fetchAPI('/jobs/refresh', { method: 'POST' });
}

/**
 * Get candidates for a job
 */
export async function getCandidates(jobId) {
  return fetchAPI(`/jobs/${jobId}/candidates`);
}

/**
 * Get CV text for a candidate
 */
export async function getCVText(candidateId) {
  return fetchAPI(`/candidates/${candidateId}/cv`);
}

/**
 * Get CV metadata from Lever API (real-time, always fresh)
 */
export async function getCVMetadata(candidateId) {
  return fetchAPI(`/candidates/${candidateId}/cv-metadata`);
}

/**
 * Evaluate a single candidate
 */
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

/**
 * Evaluate multiple candidates
 */
export async function evaluateBatch(jobId, candidates) {
  return fetchAPI('/evaluate/batch', {
    method: 'POST',
    body: JSON.stringify({ jobId, candidates }),
  });
}

/**
 * Get evaluation history
 */
export async function getEvaluations(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const url = queryParams ? `/evaluations?${queryParams}` : '/evaluations';
  return fetchAPI(url);
}

/**
 * Get evaluation stats for a job
 */
export async function getEvaluationStats(jobId) {
  return fetchAPI(`/evaluations/stats/${jobId}`);
}

/**
 * Delete an evaluation
 */
export async function deleteEvaluation(id) {
  return fetchAPI(`/evaluations/${id}`, { method: 'DELETE' });
}

/**
 * Get resume download URL
 */
export function getResumeDownloadUrl(candidateId, resumeId, candidateName) {
  const params = new URLSearchParams({
    resumeId,
    name: candidateName || 'candidato'
  });
  return `${API_URL}/candidates/${candidateId}/resume/download?${params}`;
}
