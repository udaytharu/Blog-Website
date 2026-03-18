const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:3000';

const qInput = document.getElementById('q');
const typeSelect = document.getElementById('type');
const resultsEl = document.getElementById('results');
const emptyEl = document.getElementById('empty');
const toast = document.getElementById('toast');
const logoutBtn = document.getElementById('logoutBtn');

function showToast(message, type = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let pending = null;
function debounce(fn, ms) {
  return (...args) => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => fn(...args), ms);
  };
}

async function runSearch() {
  const q = (qInput?.value || '').trim();
  const type = typeSelect?.value || 'all';
  if (!resultsEl || !emptyEl) return;

  if (!q) {
    resultsEl.innerHTML = '';
    emptyEl.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Search failed');

    const blogs = Array.isArray(data.blogs) ? data.blogs : [];
    const users = Array.isArray(data.users) ? data.users : [];

    const cards = [];

    blogs.forEach((b) => {
      cards.push(`
        <div class="post" style="cursor: default;">
          <h2>${escapeHtml(b.title || 'Untitled')}</h2>
          <div class="post-content">
            <div class="post-text full">
              <p>${escapeHtml(b.excerpt || '').slice(0, 220)}${(b.excerpt || '').length > 220 ? '...' : ''}</p>
            </div>
          </div>
          <div class="post-meta">
            <span><i class="fas fa-user"></i> ${escapeHtml(b.author || 'Unknown')}</span>
            <span><i class="fas fa-eye"></i> ${b.views || 0}</span>
            <span><i class="fas fa-heart"></i> ${b.likeCount || 0}</span>
            <span><i class="fas fa-comment"></i> ${b.commentCount || 0}</span>
          </div>
        </div>
      `);
    });

    users.forEach((u) => {
      cards.push(`
        <div class="post" style="cursor: default;">
          <h2><i class="fas fa-user-circle"></i> ${escapeHtml(u.displayName || u.username || 'User')}</h2>
          <div class="post-meta">
            <span><i class="fas fa-at"></i> ${escapeHtml(u.username || '')}</span>
            <span><i class="fas fa-calendar"></i> ${u.joinDate ? new Date(u.joinDate).toLocaleDateString() : ''}</span>
          </div>
          ${u.bio ? `<div class="post-content"><div class="post-text full"><p>${escapeHtml(u.bio)}</p></div></div>` : ''}
        </div>
      `);
    });

    resultsEl.innerHTML = cards.join('');
    emptyEl.style.display = cards.length === 0 ? 'block' : 'none';
  } catch (err) {
    console.error(err);
    showToast('Search failed', 'error');
  }
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('currentUser');
  window.location.href = '../userlog.html';
}

document.addEventListener('DOMContentLoaded', () => {
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  const doSearch = debounce(runSearch, 250);
  qInput?.addEventListener('input', doSearch);
  typeSelect?.addEventListener('change', runSearch);
});

