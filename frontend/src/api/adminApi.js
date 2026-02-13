const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

async function fetchAdmin(endpoint, options = {}) {
  const url = `${API_URL}/admin${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

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

export async function getUsers() {
  return fetchAdmin('/users');
}

export async function createUser(data) {
  return fetchAdmin('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id, data) {
  return fetchAdmin(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function changePassword(id, password) {
  return fetchAdmin(`/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
}

export async function toggleUserActive(id) {
  return fetchAdmin(`/users/${id}/toggle-active`, {
    method: 'PATCH',
  });
}

export async function deleteUser(id) {
  return fetchAdmin(`/users/${id}`, {
    method: 'DELETE',
  });
}
