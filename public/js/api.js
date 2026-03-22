/**
 * api.js — thin fetch wrapper.
 * Auth is handled by the HttpOnly session cookie set by the server;
 * no token is stored or read by client-side JS.
 */
const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  // Don't set Content-Type for FormData; browser sets it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // always send the session cookie
  });

  if (res.status === 401) {
    sessionStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  // Try to parse JSON; fall back to text
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const err = new Error(
      (typeof data === 'object' && data.message) ? data.message : `HTTP ${res.status}`
    );
    err.data   = data;
    err.status = res.status;
    throw err;
  }

  return data;
}

const API = {
  get:      (path, params)     => apiFetch(path + (params ? '?' + new URLSearchParams(params) : '')),
  post:     (path, body)       => apiFetch(path, { method: 'POST',   body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:      (path, body)       => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:    (path, body)       => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:   (path)             => apiFetch(path, { method: 'DELETE' }),
  postForm: (path, formData)   => apiFetch(path, { method: 'POST',   body: formData }),
};
