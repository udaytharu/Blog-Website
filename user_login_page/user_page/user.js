// Get current user from localStorage
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// State management
let posts = JSON.parse(localStorage.getItem('posts')) || [];
let currentPostIndex = -1;
let searchQuery = '';
let sortBy = 'newest';
let filterBy = 'all';

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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) {
        window.location.href = '../userlog.html';
        return;
    }
    displayPosts();
    setupEventListeners();
});

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        displayPosts();
    });

    sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        displayPosts();
    });

    filterSelect.addEventListener('change', (e) => {
        filterBy = e.target.value;
        displayPosts();
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

function displayPosts() {
    let filteredPosts = [...posts].filter(post => post.status !== 'draft'); // Only show published posts

    // Apply search filter
    if (searchQuery) {
        filteredPosts = filteredPosts.filter(post =>
            post.title.toLowerCase().includes(searchQuery) ||
            post.description.toLowerCase().includes(searchQuery)
        );
    }

    // Apply user-based filters
    switch (filterBy) {
        case 'liked':
            filteredPosts = filteredPosts.filter(post => post.likes.some(like => like.userId === currentUser.id));
            break;
        case 'commented':
            filteredPosts = filteredPosts.filter(post => post.comments.some(comment => comment.userId === currentUser.id));
            break;
    }

    // Apply sort
    switch (sortBy) {
        case 'newest':
            filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'oldest':
            filteredPosts.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'mostLiked':
            filteredPosts.sort((a, b) => b.likes.length - a.likes.length);
            break;
    }

    if (filteredPosts.length === 0) {
        noPostsMessage.style.display = 'block';
        postsContainer.innerHTML = '';
        return;
    }

    noPostsMessage.style.display = 'none';
    postsContainer.innerHTML = filteredPosts.map((post, index) => {
        const isLongContent = post.description.length > 200;
        const displayText = isLongContent ? truncateText(post.description, 200) : post.description;
        return `
            <div class="post-card">
                <div class="post-header">
                    <h2>${post.title}</h2>
                    <div class="post-meta">
                        <span><i class="fas fa-user"></i> ${post.author || 'Uday Tharu'}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(post.date)}</span>
                    </div>
                </div>
                <div class="post-content">
                    <p>${displayText}</p>
                    ${isLongContent ? `<a href="javascript:void(0)" class="read-more">Read More</a>` : ''}
                    ${post.photos && post.photos.length > 0 ? `
                        <div class="post-images">
                            ${post.photos.map(photo => `
                                <img src="${photo}" alt="Post image" loading="lazy">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="post-actions">
                    <button onclick="toggleLike(${index})" class="btn btn-like ${post.likes.some(like => like.userId === currentUser.id) ? 'liked' : ''}">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes.length}</span>
                    </button>
                    <button onclick="openCommentModal(${index})" class="btn btn-comment">
                        <i class="fas fa-comment"></i>
                        <span>${post.comments.length}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleLike(index) {
    const post = posts[index];
    const likeIndex = post.likes.findIndex(like => like.userId === currentUser.id);

    if (likeIndex === -1) {
        post.likes.push({
            userId: currentUser.id,
            username: currentUser.username,
            date: new Date().toISOString()
        });
    } else {
        post.likes.splice(likeIndex, 1);
    }

    localStorage.setItem('posts', JSON.stringify(posts));
    displayPosts();
    if (postModal.style.display === 'block' && currentPostIndex === index) {
        openPostModal(index);
    }
    showToast('Like status updated');
}

function openPostModal(index) {
    currentPostIndex = index;
    const post = posts[index];

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
            <button onclick="toggleLike(${index})" class="btn btn-like ${post.likes.some(like => like.userId === currentUser.id) ? 'liked' : ''}">
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
    
    modalComments.innerHTML = post.comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${comment.username}</span>
                <span class="comment-date">${formatDate(comment.date)}</span>
            </div>
            <p class="comment-text">${comment.text}</p>
            ${comment.userId === currentUser.id ? `
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
    post.comments.push({
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
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
    const commentIndex = post.comments.findIndex(comment => comment.id === commentId);

    if (commentIndex !== -1 && post.comments[commentIndex].userId === currentUser.id) {
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