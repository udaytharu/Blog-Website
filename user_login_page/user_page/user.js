// Get current user from localStorage
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// State management
let posts = JSON.parse(localStorage.getItem('posts')) || [];
let currentPostIndex = -1;
let searchQuery = '';
let sortBy = 'newest';
let filterBy = 'all';
let allPosts = [];

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const searchInput = document.getElementById('searchPosts');
const sortSelect = document.getElementById('sortBy');
const filterSelect = document.getElementById('filterBy');
const commentModal = document.getElementById('commentModal');
const modalComments = document.getElementById('modalComments');
const modalCommentInput = document.getElementById('modalCommentInput');
const postModal = document.getElementById('postModal');
const modalPostContent = document.getElementById('modalPostContent');
const noPostsMessage = document.getElementById('noPosts');
const toast = document.getElementById('toast');

// Helper to get current user from localStorage
function getCurrentUser() {
    return {
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username')
    };
}

// Update currentUser variable after login/logout
function syncCurrentUser() {
    const { userId, username } = getCurrentUser();
    if (userId && username) {
        window.currentUser = { id: userId, username };
    } else {
        window.currentUser = null;
    }
}

// Call syncCurrentUser on page load
syncCurrentUser();

// Event Listeners
async function registerUser(username, email) {
    try {
        const response = await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email })
        });
        const data = await response.json();
        if (data.user && data.user._id) {
            localStorage.setItem('userId', data.user._id);
            localStorage.setItem('username', data.user.username);
            syncCurrentUser();
        }
        return data.user;
    } catch (error) {
        alert('Failed to register/login user');
        return null;
    }
}

// Add a logout function
function logoutUser() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    syncCurrentUser();
    // Optionally reload or redirect to login
    window.location.reload();
}

// Call this on page load or login
window.addEventListener('DOMContentLoaded', async () => {
    let username = localStorage.getItem('username');
    let email = localStorage.getItem('email');
    if (!username) {
        username = prompt('Enter your username:');
        if (!username) return;
        email = prompt('Enter your email (optional):') || '';
        await registerUser(username, email);
        localStorage.setItem('email', email);
    }
    // Show welcome message
    const welcomeDiv = document.getElementById('welcomeUser');
    if (welcomeDiv && username) {
        welcomeDiv.textContent = `Welcome, ${username}!`;
    }
    setupEventListeners();
    loadPosts();
});

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('imageModalImg');
  const modalClose = document.getElementById('imageModalClose');

  document.body.addEventListener('click', function(e) {
    if (e.target.matches('.post-images img')) {
      modal.style.display = 'flex';
      modalImg.src = e.target.src;
    }
    if (e.target === modal || e.target === modalClose) {
      modal.style.display = 'none';
      modalImg.src = '';
    }
  });
});

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        loadPosts();
    });

    sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        loadPosts();
    });

    filterSelect.addEventListener('change', (e) => {
        filterBy = e.target.value;
        loadPosts();
    });

    // Event delegation for post content and read more clicks
    postsContainer.addEventListener('click', (e) => {
        const postContent = e.target.closest('.post-content');
        const readMoreLink = e.target.closest('.read-more');
        const postCard = (postContent || readMoreLink)?.closest('.post-card');
        if (postContent || readMoreLink) {
            const index = Array.from(postsContainer.querySelectorAll('.post-card')).indexOf(postCard);
            openPostModal(index);
        }
    });
}

async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        allPosts = await response.json();
    } catch (error) {
        alert('Failed to load posts from server');
        return;
    }
    displayPosts();
}

function displayPosts() {
    let posts = allPosts.slice();
    // Apply search
    if (searchQuery) {
        posts = posts.filter(post =>
            post.title.toLowerCase().includes(searchQuery) ||
            post.content.toLowerCase().includes(searchQuery)
        );
    }
    // Apply filter
    if (filterBy === 'liked') {
        const { userId } = getCurrentUser();
        posts = posts.filter(post => (post.likes || []).some(like => like.userId === userId));
    } else if (filterBy === 'commented') {
        const { userId } = getCurrentUser();
        posts = posts.filter(post => (post.comments || []).some(comment => comment.userId === userId));
    }
    // Apply sort
    if (sortBy === 'newest') {
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
        posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'mostLiked') {
        posts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    }
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = posts.map((post, idx) => {
        const { userId } = getCurrentUser();
        const likesArr = Array.isArray(post.likes) ? post.likes : [];
        const hasLiked = likesArr.some(like => like.userId === userId);
        return `
        <div class="post" data-index="${idx}">
            <h2>${post.title}</h2>
            ${post.photos && post.photos.length > 0 ? `
                <div class="post-images">
                    ${post.photos.map(photo => `<img src="${photo}" alt="Post image" loading="lazy">`).join('')}
                </div>
            ` : ''}
            ${createPostContent(post, idx)}
            <div>Author: ${post.author} | ${new Date(post.createdAt).toLocaleString()} | Status: ${post.status || (post.published ? 'published' : 'draft')}</div>
            <div>
                <button onclick="toggleLikePost('${post._id}'); event.stopPropagation();" class="btn btn-like${hasLiked ? ' liked' : ''}">
                    <i class="fas fa-heart"></i> <span>${likesArr.length}</span>
                </button>
                <button onclick="toggleCommentBox('${post._id}'); event.stopPropagation();" class="btn btn-comment">
                    <i class="fas fa-comment"></i> <span>${post.comments ? post.comments.length : 0}</span>
                </button>
            </div>
            <div id="comments-${post._id}" style="display:none;">
                <form onsubmit="submitComment(event, '${post._id}')">
                    <input type="text" id="comment-input-${post._id}" placeholder="Add a comment..." required />
                    <button type="submit" class="btn btn-comment"><i class="fas fa-paper-plane"></i> Post</button>
                </form>
            </div>
        </div>
        `;
    }).join('');

    // Add click event to open modal for the whole post
    postsContainer.querySelectorAll('.post').forEach(postDiv => {
        postDiv.addEventListener('click', function(e) {
            // Prevent if clicking a button or inside a form
            if (e.target.closest('button') || e.target.closest('form')) return;
            const idx = parseInt(postDiv.getAttribute('data-index'));
            openPostModal(idx);
        });
    });

    // Add event delegation for 'Show more' links after rendering posts
    postsContainer.querySelectorAll('.show-more').forEach(link => {
        link.addEventListener('click', function(e) {
            e.stopPropagation();
            const idx = this.getAttribute('data-idx');
            const post = posts[idx];
            const postText = document.getElementById(`post-text-${idx}`);
            postText.innerHTML = `${post.content}`;
        });
    });
    setupShowMoreLessHandlers(posts);
}

// Always get username from localStorage for comments and likes
function getCurrentUsername() {
    return localStorage.getItem('username');
}

window.toggleLikePost = async function(postId) {
    const { userId, username } = getCurrentUser();
    if (!userId || !username) return alert('Please login first');
    console.log('Liking as:', { userId, username });
    try {
        const response = await fetch(`/api/posts/${postId}`);
        const post = await response.json();
        const hasLiked = (post.likes || []).some(like => like.userId === userId);
        if (hasLiked) {
            // Unlike
            await fetch(`/api/posts/${postId}/unlike`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
        } else {
            // Like
            await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, username })
            });
        }
        loadPosts();
    } catch (error) {
        alert('Failed to update like');
    }
}

window.toggleCommentBox = async function(postId) {
    const box = document.getElementById(`comments-${postId}`);
    if (!box) return;

    if (box.style.display === 'none' || box.style.display === '') {
        // Fetch comments from backend
        try {
            const response = await fetch(`/api/posts/${postId}`);
            const post = await response.json();
            const comments = post.comments || [];
            // Get the comment form HTML
            const form = box.querySelector('form') ? box.querySelector('form').outerHTML : '';
            // Render form first, then comments
            let commentsHtml = form + `
                <div class="comments-list">
                    ${comments.length === 0 ? '<div>No comments yet.</div>' : comments.map(comment => `
                        <div class="comment">
                            <strong>${comment.username || comment.author}</strong>: ${comment.text}
                        </div>
                    `).join('')}
                </div>
            `;
            box.innerHTML = commentsHtml;
        } catch (err) {
            box.innerHTML = '<div style="color:red;">Failed to load comments.</div>';
        }
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
};

window.submitComment = async function(e, postId) {
    e.preventDefault();
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    const { userId, username } = getCurrentUser();
    if (!text || !username || !userId) return;
    console.log('Submitting comment as:', { userId, username });
    try {
        // Check if editing
        const editingId = input.dataset.editing;
        if (editingId) {
            await fetch(`/api/posts/${postId}/comment/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, userId })
            });
            delete input.dataset.editing;
        } else {
            await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, author: username, userId })
            });
        }
        input.value = '';
        loadPosts();
    } catch (error) {
        alert('Failed to comment');
    }
}

window.editComment = async function(postId, commentId) {
    const input = document.getElementById(`comment-input-${postId}`);
    try {
        const response = await fetch(`/api/posts/${postId}`);
        const post = await response.json();
        const comment = (post.comments || []).find(c => c.id === commentId);
        if (comment) {
            input.value = comment.text;
            input.focus();
            input.dataset.editing = commentId;
        }
    } catch (error) {
        alert('Failed to fetch comment for editing');
    }
}

window.deleteComment = async function(postId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    const { userId } = getCurrentUser();
    try {
        await fetch(`/api/posts/${postId}/comment/${commentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        loadPosts();
    } catch (error) {
        alert('Failed to delete comment');
    }
}

function toggleLike(index) {
    const post = posts[index];
    const { userId, username } = getCurrentUser();
    const likeIndex = post.likes.findIndex(like => like.userId === userId);

    if (likeIndex === -1) {
        post.likes.push({
            userId,
            username,
            date: new Date().toISOString()
        });
    } else {
        post.likes.splice(likeIndex, 1);
    }

    localStorage.setItem('posts', JSON.stringify(posts));
    loadPosts();
    if (postModal.style.display === 'block' && currentPostIndex === index) {
        openPostModal(index);
    }
    showToast('Like status updated');
}

function openPostModal(index) {
    currentPostIndex = index;
    const post = posts[index];
    const { userId } = getCurrentUser();

    modalPostContent.innerHTML = `
        <div class="post-header">
            <h2>${post.title}</h2>
            <div class="post-meta">
                <span><i class="fas fa-user"></i> ${post.author || 'Unknown Author'}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(post.date)}</span>
            </div>
        </div>
        <div class="post-content">
            <p>${post.description}</p>
            ${post.photos && post.photos.length > 0 ? `
                <div class="post-images">
                    ${post.photos.map(photo => `
                        <img src="${photo}" alt="Post image" loading="lazy">
                    `).join('')}
                </div>
            ` : ''}
        </div>
        <div class="post-actions">
            <button onclick="toggleLike(${index})" class="btn btn-like ${post.likes.some(like => like.userId === userId) ? 'liked' : ''}">
                <i class="fas fa-heart"></i>
                <span>${post.likes.length}</span>
            </button>
            <button onclick="openCommentModal(${index}); closePostModal();" class="btn btn-comment">
                <i class="fas fa-comment"></i>
                <span>${post.comments.length}</span>
            </button>
        </div>
    `;
    
    postModal.style.display = 'block';
}

function closePostModal() {
    postModal.style.display = 'none';
    currentPostIndex = -1;
}

function openCommentModal(index) {
    currentPostIndex = index;
    const post = posts[index];
    const { userId } = getCurrentUser();
    
    modalComments.innerHTML = post.comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${comment.username || comment.author}</span>
                <span class="comment-date">${formatDate(comment.date)}</span>
            </div>
            <p class="comment-text">${comment.text}</p>
            ${comment.userId === userId ? `
                <button onclick="deleteComment(${index}, '${comment.id}')" class="btn btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
    
    commentModal.style.display = 'block';
}

function closeCommentModal() {
    commentModal.style.display = 'none';
    currentPostIndex = -1;
}

function submitModalComment() {
    if (currentPostIndex === -1) return;

    const commentText = modalCommentInput.value.trim();
    if (!commentText) {
        showToast('Please enter a comment');
        return;
    }

    const post = posts[currentPostIndex];
    const { userId, username } = getCurrentUser();
    post.comments.push({
        id: Date.now().toString(),
        userId,
        username,
        text: commentText,
        date: new Date().toISOString()
    });

    localStorage.setItem('posts', JSON.stringify(posts));
    modalCommentInput.value = '';
    openCommentModal(currentPostIndex);
    showToast('Comment added successfully');
}

function deleteComment(postIndex, commentId) {
    const post = posts[postIndex];
    const { userId } = getCurrentUser();
    const commentIndex = post.comments.findIndex(comment => comment.id === commentId);

    if (commentIndex !== -1 && post.comments[commentIndex].userId === userId) {
        post.comments.splice(commentIndex, 1);
        localStorage.setItem('posts', JSON.stringify(posts));
        openCommentModal(postIndex);
        showToast('Comment deleted successfully');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target === commentModal) {
        closeCommentModal();
    }
    if (event.target === postModal) {
        closePostModal();
    }
};

// Handle keyboard events
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (commentModal.style.display === 'block') {
            closeCommentModal();
        }
        if (postModal.style.display === 'block') {
            closePostModal();
        }
    }
});

// Update createPostContent to always support toggling between truncated and full content
function createPostContent(post, idx, expanded = false) {
    const maxLength = 300;
    let isTruncated = post.content.length > maxLength;
    if (expanded && isTruncated) {
        return `
            <p class="post-text" id="post-text-${idx}">
                ${post.content}
                <button type="button" class="show-less" data-idx="${idx}">Hide</button>
            </p>
        `;
    } else {
        let displayContent = isTruncated ? truncateText(post.content, maxLength) : post.content;
        return `
            <p class="post-text" id="post-text-${idx}">
                ${displayContent}
                ${isTruncated ? `<button type="button" class="show-more" data-idx="${idx}">Show more...</button>` : ''}
            </p>
        `;
    }
}

// In displayPosts, after rendering posts, set up event delegation for both 'Show more' and 'Hide'
function setupShowMoreLessHandlers(posts) {
    posts.forEach((post, idx) => {
        const postText = document.getElementById(`post-text-${idx}`);
        if (!postText) return;
        const showMore = postText.querySelector('.show-more');
        const showLess = postText.querySelector('.show-less');
        if (showMore) {
            showMore.onclick = function(e) {
                e.stopPropagation();
                postText.outerHTML = createPostContent(post, idx, true);
                setupShowMoreLessHandlers(posts); // re-attach handlers
            };
        }
        if (showLess) {
            showLess.onclick = function(e) {
                e.stopPropagation();
                postText.outerHTML = createPostContent(post, idx, false);
                setupShowMoreLessHandlers(posts); // re-attach handlers
            };
            // Also allow clicking anywhere on the expanded post-text to collapse
            postText.onclick = function(e) {
                // Prevent collapse if clicking the 'Hide' link itself
                if (e.target.classList.contains('show-less')) return;
                postText.outerHTML = createPostContent(post, idx, false);
                setupShowMoreLessHandlers(posts);
            };
        }
    });
}
// Call setupShowMoreLessHandlers(posts) at the end of displayPosts