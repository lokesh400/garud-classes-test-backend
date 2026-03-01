/**
 * toast.js — lightweight toast notification (replaces react-hot-toast)
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'none';
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 350);
  }, 3000);
}

const toast = {
  success: (msg) => showToast(msg, 'success'),
  error:   (msg) => showToast(msg, 'error'),
  info:    (msg) => showToast(msg, 'info'),
};
