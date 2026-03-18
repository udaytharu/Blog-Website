// Constants
const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:3000';
const CURRENT_USER_KEY = 'currentUser';

// State management
let posts = [];
let currentPostIndex = -1;
let searchQuery = '';
let sortBy = 'newest';
let filterBy = 'all';
let currentUser = null;

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
const logoutBtn = document.getElementById('logoutBtn');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuth();
    
    // Get current user
    loadCurrentUser();
    
    // Load posts from MongoDB
    loadPosts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup modal close handlers
    setupModals();
});

// Authentication check
function checkAuth() {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (!userId || !username) {
        // Redirect to login if not authenticated
        window.location.href = '../userlog.html';
    }
}

// Load current user from localStorage
function loadCurrentUser() {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    if (userId && username) {
        currentUser = {
            id: userId,
            username: username
        };
    }
    
    // Update welcome message if element exists
    const welcomeDiv = document.getElementById('welcomeUser');
    if (welcomeDiv && username) {
        welcomeDiv.textContent = `Welcome, ${username}!`;
    }
}

// Setup event listeners
function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            displayPosts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            displayPosts();
        });
    }

    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            filterBy = e.target.value;
            displayPosts();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Event delegation for post interactions
    if (postsContainer) {
        postsContainer.addEventListener('click', handlePostClick);
    }
}

// Handle post clicks (delegation)
function handlePostClick(e) {
    const postCard = e.target.closest('.post');
    if (!postCard) return;
    
    const postId = postCard.dataset.id;
    const post = posts.find(p => p._id === postId);
    if (!post) return;
    
    // Handle image clicks
    if (e.target.closest('.post-images img')) {
        e.stopPropagation();
        const img = e.target.closest('.post-images img');
        openImageModal(img.src);
        return;
    }
    
    // Handle like button clicks
    if (e.target.closest('.btn-like')) {
        e.stopPropagation();
        toggleLike(postId);
        return;
    }
    
    // Handle comment button clicks
    if (e.target.closest('.btn-comment')) {
        e.stopPropagation();
        toggleCommentBox(postId);
        return;
    }
    
    // Handle show more/less clicks
    if (e.target.closest('.show-more') || e.target.closest('.show-less')) {
        e.stopPropagation();
        const btn = e.target.closest('.show-more, .show-less');
        const postId = btn.dataset.postId;
        const expanded = btn.classList.contains('show-more');
        togglePostContent(postId, expanded);
        return;
    }
    
    // Handle links inside post content
    if (e.target.tagName === 'A') {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        if (href) {
            window.open(href, '_blank');
        }
        return;
    }
    
    // Handle edit comment clicks
    if (e.target.closest('.btn-edit')) {
        e.stopPropagation();
        const btn = e.target.closest('.btn-edit');
        const postId = btn.dataset.postId;
        const commentId = btn.dataset.commentId;
        editComment(postId, commentId);
        return;
    }
    
    // Handle delete comment clicks
    if (e.target.closest('.btn-delete')) {
        e.stopPropagation();
        const btn = e.target.closest('.btn-delete');
        const postId = btn.dataset.postId;
        const commentId = btn.dataset.commentId;
        deleteComment(postId, commentId);
        return;
    }
    
    // Open post modal for any other click on post (shows only post details)
    openPostModal(postId);
}

// Setup modals
function setupModals() {
    // Image modal
    const imageModal = document.getElementById('imageModal');
    const imageModalClose = document.getElementById('imageModalClose');
    
    if (imageModalClose) {
        imageModalClose.addEventListener('click', () => {
            imageModal.style.display = 'none';
        });
    }
    
    // Post modal close
    const closePostModalBtn = document.querySelector('#postModal .close-modal');
    if (closePostModalBtn) {
        closePostModalBtn.addEventListener('click', closePostModal);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === postModal) {
            closePostModal();
        }
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });
    
    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (postModal && postModal.style.display === 'block') {
                closePostModal();
            }
            if (imageModal) {
                imageModal.style.display = 'none';
            }
        }
    });
}

// Load posts from MongoDB
async function loadPosts() {
    try {
        showToast('Loading posts...', 'info');
        
        // Fetch published posts from MongoDB
        const response = await fetch(`${API_BASE_URL}/api/posts`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }
        
        posts = await response.json();
        
        // Ensure posts have required fields
        posts = posts.map(post => ({
            ...post,
            status: post.status || (post.published ? 'published' : 'draft'),
            likes: post.likes || [],
            comments: post.comments || [],
            // Format published date
            publishedDate: post.publishedAt || post.createdAt || post.updatedAt || new Date().toISOString()
        }));
        
        displayPosts();
        showToast('Posts loaded successfully');
    } catch (error) {
        console.error('Error loading posts from MongoDB:', error);
        showToast('Failed to load posts from server', 'error');
        
        // Fallback to localStorage if MongoDB fails
        try {
            const localPosts = JSON.parse(localStorage.getItem('posts')) || [];
            posts = localPosts.filter(post => post.status === 'published' || post.published === true);
            displayPosts();
            showToast('Loaded posts from local storage', 'info');
        } catch (localError) {
            console.error('Error loading local posts:', localError);
        }
    }
}

// Display posts
function displayPosts() {
    if (!postsContainer) return;
    
    let filteredPosts = [...posts];
    
    // Apply search filter
    if (searchQuery) {
        filteredPosts = filteredPosts.filter(post =>
            (post.title || '').toLowerCase().includes(searchQuery) ||
            (post.content || '').toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply filter
    if (filterBy === 'liked') {
        filteredPosts = filteredPosts.filter(post => 
            (post.likes || []).some(like => like.userId === currentUser?.id)
        );
    } else if (filterBy === 'commented') {
        filteredPosts = filteredPosts.filter(post => 
            (post.comments || []).some(comment => comment.userId === currentUser?.id)
        );
    }
    
    // Apply sort
    if (sortBy === 'newest') {
        filteredPosts.sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0));
    } else if (sortBy === 'oldest') {
        filteredPosts.sort((a, b) => new Date(a.publishedDate || 0) - new Date(b.publishedDate || 0));
    } else if (sortBy === 'mostLiked') {
        filteredPosts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    }
    
    // Show/hide no posts message
    if (noPostsMessage) {
        noPostsMessage.style.display = filteredPosts.length === 0 ? 'block' : 'none';
    }
    
    // Render posts
    postsContainer.innerHTML = filteredPosts.map(post => {
        const hasLiked = (post.likes || []).some(like => like.userId === currentUser?.id);
        const commentsCount = post.comments?.length || 0;
        const likesCount = post.likes?.length || 0;
        const publishedDate = post.publishedDate ? new Date(post.publishedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown date';
        const author = post.author || 'Unknown Author';
        
        return `
        <div class="post" data-id="${post._id}">
            <h2>${escapeHtml(post.title || 'Untitled')}</h2>
            
            ${post.photos && post.photos.length > 0 ? `
                <div class="post-images">
                    ${post.photos.map(photo => `
                        <img src="${photo}" alt="Post image" loading="lazy" style="cursor: pointer;">
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="post-content" id="post-content-${post._id}">
                ${createPostContent(post)}
            </div>
            
            <div class="post-meta">
                <span><i class="fas fa-user"></i> ${escapeHtml(author)}</span>
                <span><i class="fas fa-calendar"></i> ${publishedDate}</span>
                ${post.views ? `<span><i class="fas fa-eye"></i> ${post.views} views</span>` : ''}
            </div>
            
            <div class="post-actions">
                <button onclick="event.stopPropagation(); toggleLike('${post._id}')" 
                        class="btn btn-like ${hasLiked ? 'liked' : ''}">
                    <i class="fas fa-heart"></i>
                    <span>${likesCount}</span>
                </button>
                
                <button onclick="event.stopPropagation(); toggleCommentBox('${post._id}')" 
                        class="btn btn-comment">
                    <i class="fas fa-comment"></i>
                    <span>${commentsCount}</span>
                </button>
            </div>
            
            <div id="comments-${post._id}" class="comments-section" style="display: none;">
                <div class="comments-list" id="comments-list-${post._id}">
                    ${renderComments(post.comments || [], post._id)}
                </div>
                
                <form onsubmit="event.preventDefault(); submitComment('${post._id}')" class="comment-form">
                    <input type="text" id="comment-input-${post._id}" 
                           placeholder="Write a comment..." 
                           class="comment-input"
                           required>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Post
                    </button>
                </form>
            </div>
        </div>
        `;
    }).join('');
}

// Create post content with show more/less functionality
function createPostContent(post) {
    const maxLength = 300;
    // Strip HTML tags for length calculation
    const textContent = stripHtml(post.content || '');
    const isTruncated = textContent.length > maxLength;
    
    if (isTruncated) {
        // Show truncated version with HTML stripped for length check but preserve HTML in display
        return `
            <div class="post-text truncated" id="post-text-${post._id}">
                ${truncateHtml(post.content || '', maxLength)}
                <button class="show-more" data-post-id="${post._id}">Show more</button>
            </div>
        `;
    } else {
        return `
            <div class="post-text full" id="post-text-${post._id}">
                ${post.content || ''}
            </div>
        `;
    }
}

// Helper function to strip HTML tags
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// Helper function to truncate HTML while preserving tags
function truncateHtml(html, maxLength) {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Get text content for length check
    const text = div.textContent || div.innerText;
    
    if (text.length <= maxLength) {
        return html;
    }
    
    // Truncate while trying to keep HTML structure
    let result = '';
    let currentLength = 0;
    const stack = [];
    
    function processNode(node) {
        if (currentLength >= maxLength) return;
        
        if (node.nodeType === Node.TEXT_NODE) {
            const remaining = maxLength - currentLength;
            const text = node.textContent;
            if (text.length > remaining) {
                result += text.substring(0, remaining) + '...';
                currentLength = maxLength;
            } else {
                result += text;
                currentLength += text.length;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Open tag
            result += `<${node.tagName.toLowerCase()}`;
            
            // Add attributes
            Array.from(node.attributes).forEach(attr => {
                result += ` ${attr.name}="${attr.value}"`;
            });
            
            result += '>';
            stack.push(node.tagName.toLowerCase());
            
            // Process children
            Array.from(node.childNodes).forEach(processNode);
            
            // Close tag if we didn't exceed maxLength
            if (currentLength < maxLength) {
                result += `</${stack.pop()}>`;
            }
        }
    }
    
    Array.from(div.childNodes).forEach(processNode);
    
    // Close any remaining open tags
    while (stack.length > 0 && currentLength < maxLength) {
        result += `</${stack.pop()}>`;
    }
    
    return result;
}

// Toggle post content (show more/less)
function togglePostContent(postId, expanded) {
    const post = posts.find(p => p._id === postId);
    if (!post) return;
    
    const contentDiv = document.getElementById(`post-content-${postId}`);
    if (!contentDiv) return;
    
    if (expanded) {
        contentDiv.innerHTML = `
            <div class="post-text full" id="post-text-${postId}">
                ${post.content || ''}
                <button class="show-less" data-post-id="${postId}">Show less</button>
            </div>
        `;
    } else {
        const maxLength = 300;
        contentDiv.innerHTML = `
            <div class="post-text truncated" id="post-text-${postId}">
                ${truncateHtml(post.content || '', maxLength)}
                <button class="show-more" data-post-id="${postId}">Show more</button>
            </div>
        `;
    }
}

// Render comments
function renderComments(comments, postId) {
    if (!comments || comments.length === 0) {
        return '<div class="no-comments">No comments yet. Be the first to comment!</div>';
    }
    
    const renderReply = (reply, parentCommentId, depth = 1) => {
        const isOwner = reply.userId === currentUser?.id;
        const replyDate = reply.date ? new Date(reply.date).toLocaleString() : '';
        const margin = Math.min(32, depth * 16);

        return `
            <div class="comment reply" data-comment-id="${reply.id}" style="margin-left: ${margin}px;">
                <div class="comment-header">
                    <span class="comment-author">
                        <i class="fas fa-reply"></i> ${escapeHtml(reply.username || reply.author || 'Anonymous')}
                    </span>
                    <span class="comment-date">${replyDate}</span>
                </div>
                <div class="comment-content">
                    <p class="comment-text" id="comment-text-${reply.id}">${escapeHtml(reply.text)}</p>
                    ${isOwner ? `
                        <div class="comment-actions">
                            <button class="btn-edit" data-post-id="${postId}" data-comment-id="${parentCommentId}" data-reply-id="${reply.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    };

    const renderComment = (comment) => {
        const isOwner = comment.userId === currentUser?.id;
        const commentDate = comment.date ? new Date(comment.date).toLocaleString() : '';
        const replies = Array.isArray(comment.replies) ? comment.replies : [];

        return `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">
                        <i class="fas fa-user-circle"></i> ${escapeHtml(comment.username || comment.author || 'Anonymous')}
                    </span>
                    <span class="comment-date">${commentDate}</span>
                </div>
                <div class="comment-content">
                    <p class="comment-text" id="comment-text-${comment.id}">${escapeHtml(comment.text)}</p>
                    <div class="comment-actions">
                        <button class="btn-reply" onclick="event.stopPropagation(); toggleReplyBox('${postId}', '${comment.id}')">
                            <i class="fas fa-reply"></i> Reply
                        </button>
                        ${isOwner ? `
                            <button class="btn-edit" data-post-id="${postId}" data-comment-id="${comment.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-delete" data-post-id="${postId}" data-comment-id="${comment.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>

                    <div class="comment-form reply-form" id="reply-form-${postId}-${comment.id}" style="display:none; margin-top: 10px;">
                        <input type="text" id="reply-input-${postId}-${comment.id}" placeholder="Write a reply..." class="comment-input" required>
                        <button class="btn btn-primary" onclick="event.stopPropagation(); submitReply('${postId}', '${comment.id}')">
                            <i class="fas fa-paper-plane"></i> Reply
                        </button>
                    </div>
                </div>

                <div class="replies">
                    ${replies.map(r => renderReply(r, comment.id, 1)).join('')}
                </div>
            </div>
        `;
    };

    return comments.map(renderComment).join('');
}

function toggleReplyBox(postId, commentId) {
    const form = document.getElementById(`reply-form-${postId}-${commentId}`);
    if (!form) return;
    form.style.display = form.style.display === 'none' || form.style.display === '' ? 'flex' : 'none';
    const input = document.getElementById(`reply-input-${postId}-${commentId}`);
    if (input) input.focus();
}

async function submitReply(postId, commentId) {
    if (!currentUser) {
        showToast('Please login to reply', 'error');
        return;
    }
    const input = document.getElementById(`reply-input-${postId}-${commentId}`);
    const text = (input?.value || '').trim();
    if (!text) {
        showToast('Please enter a reply', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comment/${commentId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                author: currentUser.username,
                userId: currentUser.id
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to reply');

        const postIndex = posts.findIndex(p => p._id === postId);
        if (postIndex === -1) return;
        const post = posts[postIndex];
        const comments = post.comments || [];
        const c = comments.find(c => c.id === commentId);
        if (c) {
            c.replies = Array.isArray(c.replies) ? c.replies : [];
            c.replies.push(data.reply);
        }
        post.comments = comments;
        posts[postIndex] = post;

        if (input) input.value = '';
        const form = document.getElementById(`reply-form-${postId}-${commentId}`);
        if (form) form.style.display = 'none';

        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (commentsList) commentsList.innerHTML = renderComments(comments, postId);

        showToast('Reply added!');
    } catch (error) {
        console.error('Error submitting reply:', error);
        showToast('Failed to add reply', 'error');
    }
}

// Toggle like
async function toggleLike(postId) {
    if (!currentUser) {
        showToast('Please login to like posts', 'error');
        return;
    }
    
    try {
        const postIndex = posts.findIndex(p => p._id === postId);
        if (postIndex === -1) return;
        
        const post = posts[postIndex];
        const hasLiked = (post.likes || []).some(like => like.userId === currentUser.id);
        
        // Send request to server
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/${hasLiked ? 'unlike' : 'like'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update like');
        }
        
        // Update local state
        const likes = post.likes || [];
        
        if (!hasLiked) {
            // Add like
            likes.push({
                userId: currentUser.id,
                username: currentUser.username,
                date: new Date().toISOString()
            });
        } else {
            // Remove like
            const likeIndex = likes.findIndex(like => like.userId === currentUser.id);
            if (likeIndex !== -1) {
                likes.splice(likeIndex, 1);
            }
        }
        
        post.likes = likes;
        posts[postIndex] = post;
        
        // Update UI
        displayPosts();
        
        showToast(hasLiked ? 'Post unliked!' : 'Post liked!');
    } catch (error) {
        console.error('Error toggling like:', error);
        showToast('Failed to update like', 'error');
    }
}

// Toggle comment box
function toggleCommentBox(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;
    
    if (commentsSection.style.display === 'none' || commentsSection.style.display === '') {
        commentsSection.style.display = 'block';
        
        // Scroll to comments
        setTimeout(() => {
            commentsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } else {
        commentsSection.style.display = 'none';
    }
}

// Submit comment
async function submitComment(postId) {
    if (!currentUser) {
        showToast('Please login to comment', 'error');
        return;
    }
    
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) {
        showToast('Please enter a comment', 'error');
        return;
    }
    
    try {
        const postIndex = posts.findIndex(p => p._id === postId);
        if (postIndex === -1) return;
        
        const post = posts[postIndex];
        
        // Send comment to server
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                author: currentUser.username,
                userId: currentUser.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add comment');
        }
        
        const data = await response.json();
        
        // Update local state with the comment from server
        const comments = post.comments || [];
        comments.push(data.comment);
        post.comments = comments;
        posts[postIndex] = post;
        
        // Clear input
        input.value = '';
        
        // Update UI
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (commentsList) {
            commentsList.innerHTML = renderComments(comments, postId);
        }
        
        // Update comment count in post actions
        const commentBtn = document.querySelector(`.post[data-id="${postId}"] .btn-comment span`);
        if (commentBtn) {
            commentBtn.textContent = comments.length;
        }
        
        showToast('Comment added!');
    } catch (error) {
        console.error('Error submitting comment:', error);
        showToast('Failed to add comment', 'error');
    }
}

// Edit comment
async function editComment(postId, commentId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;
    
    const post = posts.find(p => p._id === postId);
    if (!post) return;
    
    const comment = (post.comments || []).find(c => c.id === commentId);
    if (!comment) return;
    
    input.value = comment.text;
    input.dataset.editing = commentId;
    input.focus();
    
    // Open comments section if closed
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection && commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
    }
}

// Delete comment
async function deleteComment(postId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
        const postIndex = posts.findIndex(p => p._id === postId);
        if (postIndex === -1) return;
        
        const post = posts[postIndex];
        
        // Send delete request to server
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comment/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete comment');
        }
        
        // Update local state
        const comments = post.comments || [];
        const commentIndex = comments.findIndex(c => c.id === commentId);
        
        if (commentIndex !== -1) {
            comments.splice(commentIndex, 1);
            post.comments = comments;
            posts[postIndex] = post;
            
            // Update UI
            const commentsList = document.getElementById(`comments-list-${postId}`);
            if (commentsList) {
                commentsList.innerHTML = renderComments(comments, postId);
            }
            
            // Update comment count
            const commentBtn = document.querySelector(`.post[data-id="${postId}"] .btn-comment span`);
            if (commentBtn) {
                commentBtn.textContent = comments.length;
            }
            
            showToast('Comment deleted!');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showToast('Failed to delete comment', 'error');
    }
}

// Open post modal - SHOWS ONLY POST DETAILS (NO LIKE/COMMENT BUTTONS)
async function openPostModal(postId) {
    const post = posts.find(p => p._id === postId);
    if (!post || !postModal) return;
    
    currentPostIndex = posts.indexOf(post);
    
    // Increment view count
    try {
        await fetch(`${API_BASE_URL}/api/posts/${postId}`);
        // Update local view count
        post.views = (post.views || 0) + 1;
    } catch (error) {
        console.error('Error incrementing views:', error);
    }
    
    const publishedDate = post.publishedDate ? new Date(post.publishedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Unknown date';
    
    // MODAL WITH ONLY POST DETAILS - NO LIKE/COMMENT BUTTONS
    modalPostContent.innerHTML = `
        <div class="post-modal-content">
            <h2>${escapeHtml(post.title || 'Untitled')}</h2>
            
            <div class="post-meta">
                <span><i class="fas fa-user"></i> ${escapeHtml(post.author || 'Unknown Author')}</span>
                <span><i class="fas fa-calendar"></i> ${publishedDate}</span>
                ${post.views ? `<span><i class="fas fa-eye"></i> ${post.views} views</span>` : ''}
            </div>
            
            ${post.photos && post.photos.length > 0 ? `
                <div class="post-images">
                    ${post.photos.map(photo => `
                        <img src="${photo}" alt="Post image" style="cursor: pointer; max-width: 100%; margin: 10px 0;" 
                             onclick="openImageModal('${photo}')">
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="post-full-content">
                ${post.content || ''}
            </div>
            
            <!-- NO LIKE OR COMMENT BUTTONS IN MODAL - ONLY POST DETAILS -->
        </div>
    `;
    
    postModal.style.display = 'block';
}

// Close post modal
function closePostModal() {
    if (postModal) {
        postModal.style.display = 'none';
    }
    currentPostIndex = -1;
}

// Open image modal
function openImageModal(src) {
    const imageModal = document.getElementById('imageModal');
    const imageModalImg = document.getElementById('imageModalImg');
    
    if (imageModal && imageModalImg) {
        imageModalImg.src = src;
        imageModal.style.display = 'flex';
    }
}

// Logout function
function logout() {
    try {
        fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
        // ignore
    }
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('currentUser');
    window.location.href = '../userlog.html';
}

// Utility function to escape HTML (only for user input/comments, not post content)
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show toast notification
function showToast(message, type = 'success') {
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Make functions globally available
window.toggleLike = toggleLike;
window.toggleCommentBox = toggleCommentBox;
window.submitComment = submitComment;
window.editComment = editComment;
window.deleteComment = deleteComment;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.openImageModal = openImageModal;
window.toggleReplyBox = toggleReplyBox;
window.submitReply = submitReply;

// Poll for new posts every 30 seconds
setInterval(loadPosts, 30000);

// Initial load
loadPosts();