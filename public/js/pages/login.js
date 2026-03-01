/**
 * pages/login.js — Login page logic
 */
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user) {
    window.location.href = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return;
  }

  const form      = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const data = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Login successful!');
      window.location.href = data.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});
