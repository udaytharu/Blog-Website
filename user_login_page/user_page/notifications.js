const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:3000';

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const loginRequiredEl = document.getElementById('loginRequired');
const unreadBadge = document.getElementById('unreadBadge');
const markAllReadBtn = document.getElementById('markAllReadBtn');
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

function isRecent(isoDate) {
  try {
    const t = new Date(isoDate).getTime();
    return Date.now() - t < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function render(items) {
  const unread = items.filter(n => !n.isRead).length;
  if (unreadBadge) {
    unreadBadge.style.display = unread ? 'inline-block' : 'none';
    unreadBadge.textContent = `${unread} unread`;
  }

  if (!listEl || !emptyEl) return;

  if (!items.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.innerHTML = items.map((n) => {
    const recent = isRecent(n.createdAt);
    const unreadClass = !n.isRead ? 'liked' : '';
    const border = !n.isRead ? '2px solid rgba(76, 175, 80, 0.35)' : recent ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(0,0,0,0.05)';
    const created = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';
    return `
      <div class="post ${unreadClass}" style="cursor: default; border: ${border};">
        <h2 style="display:flex; gap:10px; align-items:center;">
          <i class="fas fa-bell"></i>
          <span>${escapeHtml(n.type || 'notification')}</span>
          ${!n.isRead ? '<span style="margin-left:auto; font-size:0.75rem; background:#4CAF50; color:#fff; padding:2px 8px; border-radius:999px;">NEW</span>' : ''}
        </h2>
        <div class="post-content">
          <div class="post-text full">
            <p>${escapeHtml(n.message || '')}</p>
          </div>
        </div>
        <div class="post-meta">
          <span><i class="fas fa-user"></i> ${escapeHtml(n.actorUsername || 'Someone')}</span>
          <span><i class="fas fa-clock"></i> ${escapeHtml(created)}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function load() {
  if (loginRequiredEl) loginRequiredEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications`, { credentials: 'include' });
    if (res.status === 401) {
      if (loginRequiredEl) loginRequiredEl.style.display = 'block';
      if (listEl) listEl.innerHTML = '';
      return;
    }
    const items = await res.json().catch(() => []);
    if (!res.ok) throw new Error(items?.error || 'Failed to load');
    render(Array.isArray(items) ? items : []);
  } catch (err) {
    console.error(err);
    showToast('Failed to load notifications', 'error');
  }
}

async function markAllRead() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ all: true })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed');
    showToast('Marked all as read');
    await load();
  } catch (err) {
    console.error(err);
    showToast('Failed to mark read', 'error');
  }
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('currentUser');
  window.location.href = '../userlog.html';
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  if (markAllReadBtn) markAllReadBtn.addEventListener('click', markAllRead);
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
});

