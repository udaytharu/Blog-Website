const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:3000';

function getPostIdFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'blog' && parts[1]) return parts[1];
  const url = new URL(window.location.href);
  return url.searchParams.get('id');
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

let postId = getPostIdFromUrl();
let post = null;

async function loadPost() {
  const titleEl = document.getElementById('title');
  const metaEl = document.getElementById('meta');
  const contentEl = document.getElementById('content');

  const res = await fetch(`${API_BASE_URL}/api/posts/${encodeURIComponent(postId)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    titleEl.textContent = 'Post not found';
    return;
  }

  post = data;
  document.title = post.title ? `${post.title} - Blog` : 'Blog Post';
  titleEl.textContent = post.title || 'Untitled';
  const created = post.createdAt ? new Date(post.createdAt).toLocaleString() : '';
  metaEl.innerHTML = `
    <span><i class="fas fa-user"></i> ${escapeHtml(post.author || 'Unknown')}</span>
    <span><i class="fas fa-calendar"></i> ${escapeHtml(created)}</span>
    <span><i class="fas fa-eye"></i> ${post.views || 0}</span>
  `;
  contentEl.innerHTML = post.content || '';

  updateCounts();
  renderComments();
}

function updateCounts() {
  document.getElementById('likeCount').textContent = (post.likes || []).length;
  document.getElementById('commentCount').textContent = (post.comments || []).length;
}

function renderComments() {
  const list = document.getElementById('commentsList');
  const comments = post.comments || [];
  list.innerHTML = comments.map((c) => {
    const when = c.date ? new Date(c.date).toLocaleString() : '';
    const replies = Array.isArray(c.replies) ? c.replies : [];
    return `
      <div class="comment">
        <div style="display:flex; justify-content: space-between; gap:10px; flex-wrap:wrap;">
          <strong>${escapeHtml(c.author || 'Anonymous')}</strong>
          <small>${escapeHtml(when)}</small>
        </div>
        <p style="margin: 8px 0 0 0;">${escapeHtml(c.text || '')}</p>
        ${replies.map(r => {
          const rw = r.date ? new Date(r.date).toLocaleString() : '';
          return `
            <div class="comment" style="margin-left: 16px;">
              <div style="display:flex; justify-content: space-between; gap:10px; flex-wrap:wrap;">
                <strong><i class="fas fa-reply"></i> ${escapeHtml(r.author || 'Anonymous')}</strong>
                <small>${escapeHtml(rw)}</small>
              </div>
              <p style="margin: 8px 0 0 0;">${escapeHtml(r.text || '')}</p>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('') || '<p style="opacity:0.7;">No comments yet.</p>';
}

async function like() {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  if (!userId || !username) {
    alert('Please login to like this post.');
    return;
  }

  const hasLiked = (post.likes || []).some(l => l.userId === userId);
  const endpoint = hasLiked ? 'unlike' : 'like';
  const res = await fetch(`${API_BASE_URL}/api/posts/${encodeURIComponent(postId)}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, username })
  });
  if (!res.ok) return;

  if (hasLiked) {
    post.likes = (post.likes || []).filter(l => l.userId !== userId);
  } else {
    post.likes = [...(post.likes || []), { userId, username, date: new Date().toISOString() }];
  }
  updateCounts();
}

async function comment() {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  if (!userId || !username) {
    alert('Please login to comment.');
    return;
  }

  const input = document.getElementById('commentText');
  const text = (input.value || '').trim();
  if (!text) return;

  const res = await fetch(`${API_BASE_URL}/api/posts/${encodeURIComponent(postId)}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author: username, userId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return;

  post.comments = [...(post.comments || []), data.comment];
  input.value = '';
  updateCounts();
  renderComments();
}

document.addEventListener('DOMContentLoaded', () => {
  postId = getPostIdFromUrl();
  if (!postId) {
    document.getElementById('title').textContent = 'Post not found';
    return;
  }

  document.getElementById('likeBtn').addEventListener('click', like);
  document.getElementById('commentBtn').addEventListener('click', comment);
  document.getElementById('commentToggleBtn').addEventListener('click', () => {
    const sec = document.getElementById('commentsSection');
    sec.style.display = sec.style.display === 'none' || sec.style.display === '' ? 'block' : 'none';
  });

  loadPost().catch(console.error);
});

