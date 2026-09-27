const API =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('projecthub_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  /* =========================
     HEALTH
  ========================= */

  health: () => request('/health'),

  /* =========================
     AUTH
  ========================= */

  register: (body) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  login: (body) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  /* =========================
     USER
  ========================= */

  me: () => request('/users/me'),

  updateMe: (body) =>
    request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  /* =========================
     PROJECTS
  ========================= */

  projects: (q = '') =>
    request(
      `/projects${q ? `?q=${encodeURIComponent(q)}` : ''}`
    ),

  createProject: (body) =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  project: (id) =>
    request(`/projects/${id}`),

  apply: (id, message = '') =>
    request(`/projects/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ message })
    }),

  manageApplication: (projectId, applicationId, status) =>
    request(
      `/projects/${projectId}/applications/${applicationId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }
    ),

  /* =========================
     PROJECT CHAT
  ========================= */

  messages: (projectId) =>
    request(`/projects/${projectId}/messages`),

  sendMessage: (projectId, content) =>
  request(`/projects/${projectId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
  }),

projectAI: (projectId, question) =>
  request(`/projects/${projectId}/ai`, {
    method: 'POST',
    body: JSON.stringify({ question })
  }),

deleteProject: (projectId) =>
  request(`/projects/${projectId}`, {
    method: 'DELETE'
  })
};