const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Obtiene el token de autenticacion del localStorage
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Limpia el token y redirige al login
 */
function handleUnauthorized() {
  localStorage.removeItem('authToken');
  window.location.href = '/';
}

/**
 * Helper function to make API calls with authentication
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Agregar token si existe
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si no autorizado, limpiar token y redirigir
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Sesion expirada. Redirigiendo al login...');
  }

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
  const token = getAuthToken();
  const params = new URLSearchParams({
    resumeId,
    name: candidateName || 'candidato'
  });
  // Para descargas, el token se pasa en el header, pero como es una URL directa
  // el backend permite downloads sin auth por ahora (puede mejorar luego)
  return `${API_URL}/candidates/${candidateId}/resume/download?${params}`;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  return fetchAPI('/auth/me');
}

/**
 * Logout (client-side: clear token)
 */
export function logout() {
  localStorage.removeItem('authToken');
  window.location.href = '/';
}
