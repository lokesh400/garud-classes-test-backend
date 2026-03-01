/**
 * auth-guard.js — reads user/token from localStorage, redirects if not authed.
 * Also exposes getUser() helper used by all pages.
 */

function getUser() {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function getToken() {
  return localStorage.getItem('token') || null;
}

/**
 * requireAuth(role?)
 * Call at the top of every page script.
 * Redirects to /login if not logged in; redirects to role dashboard if wrong role.
 * Returns the user object if auth passes.
 */
function requireAuth(role) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login';
    return null;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return null;
  }
  return user;
}

/**
 * handleLogout — used by sidebar logout button
 */
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
