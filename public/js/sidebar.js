/**
 * sidebar.js — builds the sidebar navigation and wires up mobile menu.
 * Depends on: auth-guard.js (getUser)
 */

const ADMIN_LINKS = [
  { href: '/admin/dashboard',    label: 'Dashboard',     icon: iconHome() },
  { href: '/admin/question-bank',label: 'Question Bank', icon: iconDB() },
  { href: '/admin/upload',       label: 'Upload',        icon: iconUpload() },
  { href: '/admin/tests',        label: 'Tests',         icon: iconFile() },
  { href: '/admin/test-series',  label: 'Test Series',   icon: iconLayers() },
];

const STUDENT_LINKS = [
  { href: '/student/dashboard',      label: 'Dashboard',       icon: iconHome() },
  { href: '/student/purchase-series',label: 'Purchase Series', icon: iconLayers() },
  { href: '/student/study',          label: 'Study',           icon: iconBook() },
  { href: '/student/purchases',      label: 'My Purchases',    icon: iconFile() },
  { href: '/student/tests',          label: 'My Tests',        icon: iconBook() },
];

function buildSidebar() {
  const user = getUser();
  if (!user) return;

  const nav    = document.getElementById('sidebar-nav');
  const avatar = document.getElementById('user-avatar');
  const name   = document.getElementById('user-name');
  const role   = document.getElementById('user-role');

  if (!nav) return;

  if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  if (name)   name.textContent   = user.name;
  if (role)   role.textContent   = user.role;

  // Populate top navbar
  const navUser   = document.getElementById('navbar-user');
  const navName   = document.getElementById('navbar-username');
  const navRole   = document.getElementById('navbar-role');
  const navAvatar = document.getElementById('navbar-avatar');
  if (navUser)   { navUser.classList.remove('hidden'); navUser.classList.add('flex'); }
  if (navName)   navName.textContent   = user.name;
  if (navRole)   navRole.textContent   = user.role;
  if (navAvatar) navAvatar.textContent = user.name.charAt(0).toUpperCase();

  const links = user.role === 'admin' ? ADMIN_LINKS : STUDENT_LINKS;
  const curr  = window.location.pathname;

  nav.innerHTML = links.map(link => {
    const isActive = curr === link.href || curr.startsWith(link.href + '/');
    return `
      <a href="${link.href}"
         onclick="closeSidebar()"
         class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-garud-highlight text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-garud-highlight'}">
        ${link.icon}
        <span>${link.label}</span>
      </a>`;
  }).join('');
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('-translate-x-full');
  if (overlay) overlay.classList.remove('hidden');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (overlay) overlay.classList.add('hidden');
}

// ── SVG Icon helpers ──────────────────────────────────────────────────
function iconHome()   { return svgWrap('M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15v-5.25a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z'); }
function iconDB()     { return svgWrap('M4 7c0-1.1 3.6-2 8-2s8 .9 8 2v2c0 1.1-3.6 2-8 2s-8-.9-8-2V7zm0 5v5c0 1.1 3.6 2 8 2s8-.9 8-2v-5c-1.8 1-4.6 1.5-8 1.5S5.8 13 4 12z'); }
function iconUpload() { return svgWrap('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'); }
function iconFile()   { return svgWrap('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'); }
function iconLayers() { return svgWrap('M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'); }
function iconBook()   { return svgWrap('M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'); }
function svgWrap(d)   {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="${d}"/>
  </svg>`;
}

// Run once DOM is ready
document.addEventListener('DOMContentLoaded', buildSidebar);
