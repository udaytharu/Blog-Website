const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:3000';

const toast = document.getElementById('toast');
const logoutBtn = document.getElementById('logoutBtn');
const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');

function showToast(message, type = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('currentUser');
  window.location.href = '../userlog.html';
}

async function loadMe() {
  const { res, data } = await api('/api/auth/me', { method: 'GET' });
  if (res.status === 401) {
    window.location.href = '../userlog.html';
    return null;
  }
  if (!res.ok) throw new Error(data.error || 'Failed to load profile');
  return data.user;
}

function fillForm(user) {
  document.getElementById('username').value = user.username || '';
  document.getElementById('displayName').value = user.displayName || '';
  document.getElementById('avatarUrl').value = user.avatarUrl || '';
  document.getElementById('bio').value = user.bio || '';

  const links = user.socialLinks || {};
  document.getElementById('twitter').value = links.twitter || '';
  document.getElementById('github').value = links.github || '';
  document.getElementById('linkedin').value = links.linkedin || '';
  document.getElementById('website').value = links.website || '';
}

async function saveProfile(e) {
  e.preventDefault();
  const payload = {
    username: document.getElementById('username').value.trim(),
    displayName: document.getElementById('displayName').value.trim(),
    avatarUrl: document.getElementById('avatarUrl').value.trim(),
    bio: document.getElementById('bio').value.trim(),
    socialLinks: {
      twitter: document.getElementById('twitter').value.trim(),
      github: document.getElementById('github').value.trim(),
      linkedin: document.getElementById('linkedin').value.trim(),
      website: document.getElementById('website').value.trim(),
    }
  };

  try {
    const { res, data } = await api('/api/users/me', { method: 'PUT', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    showToast('Profile updated');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to update profile', 'error');
  }
}

async function changePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!oldPassword || !newPassword) {
    showToast('Please fill both password fields', 'error');
    return;
  }

  try {
    const { res, data } = await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    showToast('Password updated');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to change password', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await loadMe();
    if (!me) return;
    fillForm(me);
  } catch (err) {
    console.error(err);
    showToast('Failed to load settings', 'error');
  }

  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  profileForm?.addEventListener('submit', saveProfile);
  passwordForm?.addEventListener('submit', changePassword);
});

