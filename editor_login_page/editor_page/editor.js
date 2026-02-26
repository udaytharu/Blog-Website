// Constants
const TOKEN_KEY = 'editor_token';
const ROLE_KEY = 'editor_role';
const THEME_KEY = 'editor_theme';
const API_BASE_URL = window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:3000';

// DOM Elements
const form = document.getElementById('postForm');
const titleInput = document.getElementById('postTitle');
const descriptionInput = document.getElementById('postDescription');
const photoInput = document.getElementById('postPhotos');
const editIndexInput = document.getElementById('editIndex');
const formTitle = document.getElementById('formTitle');
const cancelBtn = document.getElementById('cancelBtn');
const searchInput = document.getElementById('searchPosts');
const searchMediaInput = document.getElementById('searchMedia');
const logoutBtn = document.getElementById('logoutBtn');
const postStatusSelect = document.getElementById('postStatus');
const postsList = document.getElementById('postsList');
const draftsList = document.getElementById('draftsList');
const draftCountBadge = document.getElementById('draftCount');
const postCountBadge = document.getElementById('postCount');
const timeRangeSelect = document.getElementById('timeRange');

// Settings-specific DOM Elements
const profileForm = document.getElementById('profileForm');
const notificationForm = document.getElementById('notificationForm');
const profilePreview = document.getElementById('profilePreview');
const editorNameDisplay = document.getElementById('editorName');

// State
let currentPhotos = [];
let currentSection = 'dashboard';
let profilePicture = localStorage.getItem('editor_profile_picture') || 'https://via.placeholder.com/50';
let sortBy = 'newest';
let filterBy = 'all';
let refreshInterval = null;
let activeCharts = {};

// Chart instances
let viewsChart = null;
let engagementChart = null;
let trendsChart = null;
let activityTrendChart = null;
let trafficChart = null;
let engagementChartAnalytics = null;
let deviceChart = null;
let topPostsChart = null;

// Authentication Check
function checkAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    
    if (!token || role !== 'editor') {
        window.location.href = '../editorlog.html';
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Format date function
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If less than 7 days, show relative time
    if (diffDays < 7) {
        if (diffDays === 0) {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffTime / (1000 * 60));
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            }
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else {
            return `${diffDays} days ago`;
        }
    }
    
    // Otherwise show formatted date
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format date for display in table
function formatTableDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Section Navigation
function showSection(section) {
    currentSection = section;
    
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
        const link = item.querySelector('a');
        if (link && link.getAttribute('onclick') && link.getAttribute('onclick').includes(section)) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.editor-section').forEach(s => {
        s.style.display = s.id === `${section}-section` ? 'block' : 'none';
    });

    // Clear any existing refresh interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }

    switch(section) {
        case 'dashboard':
            loadDashboard();
            // Refresh dashboard every 30 seconds
            refreshInterval = setInterval(loadDashboard, 30000);
            break;
        case 'posts':
            displayPosts();
            break;
        case 'new-post':
            formTitle.textContent = editIndexInput.value === '-1' ? 'Create New Post' : 'Edit Post';
            break;
        case 'drafts':
            displayDrafts();
            break;
        case 'media':
            loadMediaLibrary();
            break;
        case 'settings':
            loadSettings();
            break;
    }
    updateSidebarProfile();
}

// ============ DATABASE API FUNCTIONS ============

// Helper: generate demo posts for charts when there is no real data
function generateDemoPosts() {
    const now = new Date();
    const titles = [
        'Getting Started with the Platform',
        '10 Tips to Grow Your Blog',
        'Optimizing Images for Faster Loads',
        'Writing Content that Converts',
        'Monthly Traffic & Growth Report'
    ];

    const posts = titles.map((title, index) => {
        const createdAt = new Date(now);
        createdAt.setDate(now.getDate() - (10 - index * 2));

        // Build simple viewsByDate for last 14 days
        const viewsByDate = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const label = d.toLocaleDateString();
            // Random but stable-ish pattern
            const base = 40 + index * 15;
            const noise = Math.floor(Math.random() * 25);
            viewsByDate[label] = Math.max(0, base + noise - i * 3);
        }

        const views = Object.values(viewsByDate).reduce((sum, v) => sum + v, 0);
        const likesCount = Math.floor(views / 25);
        const commentsCount = Math.floor(views / 60);

        const likes = Array.from({ length: likesCount }).map((_, i) => ({
            user: `user${i + 1}`,
            date: new Date(createdAt.getTime() + i * 86400000).toISOString()
        }));

        const comments = Array.from({ length: commentsCount }).map((_, i) => ({
            user: `user${i + 1}`,
            message: 'Great post!',
            date: new Date(createdAt.getTime() + i * 86400000).toISOString()
        }));

        return {
            _id: `demo-post-${index + 1}`,
            title,
            content: '',
            status: 'published',
            published: true,
            createdAt: createdAt.toISOString(),
            updatedAt: createdAt.toISOString(),
            publishedAt: createdAt.toISOString(),
            views,
            viewsByDate,
            likes,
            comments
        };
    });

    return posts;
}

// Posts API
async function fetchAllPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/all`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        const posts = Array.isArray(data) ? data : [];
        if (posts.length === 0) {
            const demoPosts = generateDemoPosts();
            localStorage.setItem('posts', JSON.stringify(demoPosts));
            return demoPosts;
        }
        return posts;
    } catch (error) {
        console.error('Error fetching posts, falling back to local/demo data:', error);
        // Fallback to localStorage (with safe parsing)
        let localPosts = [];
        try {
            const stored = localStorage.getItem('posts');
            localPosts = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('Invalid posts data in localStorage, resetting demo data.', e);
            localPosts = [];
        }
        if (!Array.isArray(localPosts) || localPosts.length === 0) {
            localPosts = generateDemoPosts();
            localStorage.setItem('posts', JSON.stringify(localPosts));
        }
        return localPosts;
    }
}

async function fetchPublishedPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching published posts:', error);
        return [];
    }
}

async function fetchPostById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${id}`);
        if (!response.ok) throw new Error('Failed to fetch post');
        return await response.json();
    } catch (error) {
        console.error('Error fetching post:', error);
        return null;
    }
}

async function savePostToDB(post, isDraft, editId = null) {
    const url = isDraft
        ? (editId ? `${API_BASE_URL}/api/drafts/${editId}` : `${API_BASE_URL}/api/drafts`)
        : (editId ? `${API_BASE_URL}/api/posts/${editId}` : `${API_BASE_URL}/api/posts`);
    
    const method = editId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to save');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving to database:', error);
        throw error;
    }
}

async function deletePostFromDB(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete');
        return await response.json();
    } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
    }
}

// Drafts API
async function fetchAllDrafts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/drafts`);
        if (!response.ok) throw new Error('Failed to fetch drafts');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching drafts, falling back to local data:', error);
        // Fallback to localStorage with safe parsing
        let localDrafts = [];
        try {
            const stored = localStorage.getItem('drafts');
            localDrafts = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('Invalid drafts data in localStorage, clearing.', e);
            localDrafts = [];
            localStorage.removeItem('drafts');
        }
        return Array.isArray(localDrafts) ? localDrafts : [];
    }
}

async function fetchDraftById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/drafts/${id}`);
        if (!response.ok) throw new Error('Failed to fetch draft');
        return await response.json();
    } catch (error) {
        console.error('Error fetching draft:', error);
        return null;
    }
}

async function saveDraftToDB(draft, editId = null) {
    const url = editId ? `${API_BASE_URL}/api/drafts/${editId}` : `${API_BASE_URL}/api/drafts`;
    const method = editId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draft)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to save draft');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving draft:', error);
        throw error;
    }
}

async function deleteDraftFromDB(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/drafts/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete draft');
        return await response.json();
    } catch (error) {
        console.error('Error deleting draft:', error);
        throw error;
    }
}

async function publishDraftToDB(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/drafts/${id}/publish`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to publish draft');
        return await response.json();
    } catch (error) {
        console.error('Error publishing draft:', error);
        throw error;
    }
}

// Analytics API
async function fetchAnalyticsData(days = 30) {
    try {
        const posts = await fetchAllPosts();
        const drafts = await fetchAllDrafts();
        
        // Calculate analytics
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - days);
        
        // Filter posts by date range
        const postsInRange = posts.filter(post => 
            new Date(post.createdAt) >= startDate
        );
        
        // Calculate metrics
        const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
        const totalLikes = posts.reduce((sum, post) => sum + ((post.likes && post.likes.length) || 0), 0);
        const totalComments = posts.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0);
        const totalPosts = posts.length;
        const totalDrafts = drafts.length;
        
        // Calculate engagement rate
        const engagementRate = totalViews > 0 
            ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1)
            : 0;
        
        // Calculate average views per post
        const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
        
        // Generate daily data for charts
        const dailyData = [];
        const dailyViews = [];
        const dailyLikes = [];
        const dailyComments = [];
        
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - (days - 1 - i));
            const dateString = date.toISOString().split('T')[0];
            
            const dayPosts = posts.filter(post => 
                post.createdAt && post.createdAt.split('T')[0] === dateString
            );
            
            const dayViews = dayPosts.reduce((sum, post) => sum + (post.views || 0), 0);
            const dayLikes = dayPosts.reduce((sum, post) => sum + ((post.likes && post.likes.length) || 0), 0);
            const dayComments = dayPosts.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0);
            
            dailyData.push(date.toLocaleDateString());
            dailyViews.push(dayViews);
            dailyLikes.push(dayLikes);
            dailyComments.push(dayComments);
        }
        
        // Get top performing posts
        const topPosts = [...posts]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 5)
            .map(post => ({
                title: post.title || 'Untitled',
                views: post.views || 0,
                likes: (post.likes && post.likes.length) || 0,
                comments: (post.comments && post.comments.length) || 0,
                createdAt: post.createdAt
            }));
        
        // Get recent activity
        const recentActivity = [...posts, ...drafts]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 10)
            .map(item => ({
                title: item.title || 'Untitled',
                type: item.status === 'draft' ? 'draft' : 'post',
                date: item.updatedAt || item.createdAt,
                views: item.views || 0
            }));
        
        return {
            summary: {
                totalViews,
                totalLikes,
                totalComments,
                totalPosts,
                totalDrafts,
                engagementRate,
                avgViews
            },
            charts: {
                labels: dailyData,
                views: dailyViews,
                likes: dailyLikes,
                comments: dailyComments
            },
            topPosts,
            recentActivity
        };
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return null;
    }
}

// ============ DASHBOARD FUNCTIONS ============

async function loadDashboard() {
    try {
        // Show loading state
        const dashboardCards = document.querySelectorAll('.stat-card .stat-value');
        dashboardCards.forEach(card => {
            if (card) card.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        
        // Fetch data from database
        const posts = await fetchAllPosts();
        const drafts = await fetchAllDrafts();
        
        const range = timeRangeSelect ? timeRangeSelect.value : 'week';
        
        let filteredPosts = posts;
        const now = new Date();
        
        // Calculate date range
        let days = 7;
        switch(range) {
            case 'today':
                days = 1;
                filteredPosts = posts.filter(p => {
                    const postDate = new Date(p.createdAt);
                    return postDate.toDateString() === now.toDateString();
                });
                break;
            case 'week':
                days = 7;
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                filteredPosts = posts.filter(p => new Date(p.createdAt) >= weekAgo);
                break;
            case 'month':
                days = 30;
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                filteredPosts = posts.filter(p => new Date(p.createdAt) >= monthAgo);
                break;
            case 'year':
                days = 365;
                const yearAgo = new Date(now);
                yearAgo.setFullYear(now.getFullYear() - 1);
                filteredPosts = posts.filter(p => new Date(p.createdAt) >= yearAgo);
                break;
        }

        // Calculate statistics
        const totalPosts = posts.length;
        const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
        const totalComments = posts.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0);
        const totalLikes = posts.reduce((sum, post) => sum + ((post.likes && post.likes.length) || 0), 0);
        const totalDrafts = drafts.length;
        
        // Calculate period statistics
        const periodViews = filteredPosts.reduce((sum, post) => sum + (post.views || 0), 0);
        const periodLikes = filteredPosts.reduce((sum, post) => sum + ((post.likes && post.likes.length) || 0), 0);
        const periodComments = filteredPosts.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0);
        
        // Calculate engagement rate
        const engagementRate = totalViews > 0 
            ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1)
            : 0;
        
        // Calculate average views per post
        const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

        // Update stats
        const totalPostsEl = document.getElementById('totalPosts');
        const totalViewsEl = document.getElementById('totalViews');
        const totalCommentsEl = document.getElementById('totalComments');
        const totalLikesEl = document.getElementById('totalLikes');
        const draftCountEl = document.getElementById('draftCount');
        const postCountEl = document.getElementById('postCount');
        const engagementRateEl = document.getElementById('engagementRate');
        const avgViewsEl = document.getElementById('avgViews');
        
        if (totalPostsEl) totalPostsEl.textContent = totalPosts;
        if (totalViewsEl) totalViewsEl.textContent = formatNumber(totalViews);
        if (totalCommentsEl) totalCommentsEl.textContent = formatNumber(totalComments);
        if (totalLikesEl) totalLikesEl.textContent = formatNumber(totalLikes);
        if (draftCountEl) draftCountEl.textContent = totalDrafts;
        if (postCountEl) postCountEl.textContent = totalPosts;
        if (engagementRateEl) engagementRateEl.textContent = engagementRate + '%';
        if (avgViewsEl) avgViewsEl.textContent = formatNumber(avgViews);

        // Update charts
        updateViewsChart(posts, days);
        updateEngagementChart(posts);
        updateTopPosts(posts);
        updateTrendsChart(posts, days);
        updateActivityTrendChart(posts, drafts, days);
        updateActivityLog(posts, drafts);
        updatePerformanceList(posts);
        updateDeviceChart();
        
        updateSidebarProfile();
        // Dashboard loaded; avoid noisy toast on every refresh
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function updateViewsChart(posts, days = 7) {
    const canvas = document.getElementById('viewsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Generate dates and data
    const dates = [];
    const viewsData = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateString = date.toLocaleDateString();
        dates.push(dateString);
        
        const dailyViews = posts.reduce((sum, post) => {
            // Check if post has viewsByDate or calculate from createdAt
            if (post.viewsByDate && post.viewsByDate[dateString]) {
                return sum + post.viewsByDate[dateString];
            }
            // Alternative: count views based on when post was viewed
            // This is simplified - in production you'd want actual view tracking per day
            if (post.createdAt && new Date(post.createdAt).toLocaleDateString() === dateString) {
                return sum + (post.views || 0);
            }
            return sum;
        }, 0);
        
        viewsData.push(dailyViews);
    }

    // Destroy existing chart if it exists
    if (window.viewsChart) {
        window.viewsChart.destroy();
    }

    try {
        window.viewsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Views',
                    data: viewsData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4CAF50',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Views: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatNumber(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    } catch (error) {
        console.error('Error creating views chart:', error);
    }
}

function updateTopPosts(posts) {
    const topPosts = document.getElementById('topPosts');
    if (!topPosts) return;
    
    const sortedPosts = [...posts]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);
    
    if (sortedPosts.length === 0) {
        topPosts.innerHTML = '<div class="no-data">No posts available</div>';
        return;
    }
    
    topPosts.innerHTML = sortedPosts.map(post => {
        const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown';
        
        return `
        <div class="top-post-item" onclick="editPost('${post._id}', false)" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; flex: 1;">${escapeHtml(post.title || 'Untitled')}</h4>
                <span style="background: #4CAF20; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">
                    ${post.views || 0} views
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.8rem; color: #666;">
                <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                <span style="color: #e91e63;">
                    <i class="fas fa-heart"></i> ${(post.likes && post.likes.length) || 0}
                </span>
                <span style="color: #2196F3;">
                    <i class="fas fa-comment"></i> ${(post.comments && post.comments.length) || 0}
                </span>
            </div>
        </div>
    `}).join('');
}

function updateEngagementChart(posts) {
    const canvas = document.getElementById('engagementChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const data = {
        views: posts.reduce((sum, post) => sum + (post.views || 0), 0),
        likes: posts.reduce((sum, post) => sum + ((post.likes && post.likes.length) || 0), 0),
        comments: posts.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0)
    };

    if (window.engagementChart) {
        window.engagementChart.destroy();
    }

    try {
        window.engagementChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Views', 'Likes', 'Comments'],
                datasets: [{
                    data: [data.views, data.likes, data.comments],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${formatNumber(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    } catch (error) {
        console.error('Error creating engagement chart:', error);
    }
}

function updateActivityLog(posts, drafts) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    const activities = [...posts, ...drafts]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 10)
        .map(item => {
            const isDraft = item.status === 'draft' || !item.published;
            const date = new Date(item.updatedAt || item.createdAt);
            const timeAgo = getTimeAgo(date);
            const formattedDate = formatTableDate(item.updatedAt || item.createdAt);
            
            return `
            <div class="activity-item" onclick="editPost('${item._id}', ${isDraft})" style="cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${isDraft ? 'fa-file-alt' : 'fa-newspaper'}" 
                       style="color: ${isDraft ? '#ff9800' : '#4CAF50'}; width: 20px;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${escapeHtml(item.title || 'Untitled')}</div>
                        <div style="display: flex; gap: 15px; font-size: 0.8rem; color: #666;">
                            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                            <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                            <span><i class="fas fa-eye"></i> ${item.views || 0} views</span>
                        </div>
                    </div>
                    <span class="badge" style="background: ${isDraft ? '#ff9800' : '#4CAF50'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">
                        ${isDraft ? 'draft' : 'published'}
                    </span>
                </div>
            </div>
        `}).join('');
    
    activityList.innerHTML = activities.length ? activities : '<div class="no-data">No recent activity</div>';
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return '1 year ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return '1 month ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return '1 day ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return '1 hour ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return '1 minute ago';
    
    return 'just now';
}

function updatePerformanceList(posts) {
    const performanceList = document.getElementById('performanceList');
    if (!performanceList) return;
    
    const sortedPosts = [...posts]
        .sort((a, b) => {
            const scoreA = (a.views || 0) + ((a.likes && a.likes.length) || 0) * 2 + ((a.comments && a.comments.length) || 0) * 3;
            const scoreB = (b.views || 0) + ((b.likes && b.likes.length) || 0) * 2 + ((b.comments && b.comments.length) || 0) * 3;
            return scoreB - scoreA;
        })
        .slice(0, 5);
    
    performanceList.innerHTML = sortedPosts.length ? sortedPosts.map((post, index) => {
        const engagement = ((post.likes && post.likes.length) || 0) + ((post.comments && post.comments.length) || 0);
        const engagementRate = post.views > 0 ? ((engagement / post.views) * 100).toFixed(1) : 0;
        const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown';
        
        return `
        <div class="performance-item" onclick="editPost('${post._id}', false)" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 24px; height: 24px; background: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#f0f0f0'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: ${index < 3 ? '#000' : '#666'};">
                    ${index + 1}
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0;">${escapeHtml(post.title || 'Untitled')}</h4>
                    <div style="display: flex; gap: 15px; margin-top: 5px; font-size: 0.85rem; flex-wrap: wrap;">
                        <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                        <span><i class="fas fa-eye"></i> ${post.views || 0}</span>
                        <span><i class="fas fa-heart" style="color: #e91e63;"></i> ${(post.likes && post.likes.length) || 0}</span>
                        <span><i class="fas fa-comment" style="color: #2196F3;"></i> ${(post.comments && post.comments.length) || 0}</span>
                        <span style="color: #4CAF50;">${engagementRate}% eng.</span>
                    </div>
                </div>
            </div>
        </div>
    `}).join('') : '<div class="no-data">No performance data available</div>';
}

function updateTrendsChart(posts, days = 30) {
    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Generate last 'days' days
    const dates = [];
    const viewsData = [];
    const likesData = [];
    const commentsData = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateString = date.toLocaleDateString();
        dates.push(dateString);
        
        // Calculate metrics for this day
        let dayViews = 0;
        let dayLikes = 0;
        let dayComments = 0;
        
        posts.forEach(post => {
            // Check if post has detailed tracking
            if (post.viewsByDate && post.viewsByDate[dateString]) {
                dayViews += post.viewsByDate[dateString];
            }
            
            // Count likes and comments from that day
            if (post.likes) {
                post.likes.forEach(like => {
                    if (like.date && new Date(like.date).toLocaleDateString() === dateString) {
                        dayLikes++;
                    }
                });
            }
            
            if (post.comments) {
                post.comments.forEach(comment => {
                    if (comment.date && new Date(comment.date).toLocaleDateString() === dateString) {
                        dayComments++;
                    }
                });
            }
        });
        
        viewsData.push(dayViews);
        likesData.push(dayLikes);
        commentsData.push(dayComments);
    }

    if (window.trendsChart) {
        window.trendsChart.destroy();
    }

    try {
        window.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Views',
                        data: viewsData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Likes',
                        data: likesData,
                        borderColor: '#e91e63',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Comments',
                        data: commentsData,
                        borderColor: '#2196F3',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatNumber(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating trends chart:', error);
    }
}

function updateActivityTrendChart(posts, drafts, days = 30) {
    const canvas = document.getElementById('activityTrendChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Generate last 'days' days
    const dates = [];
    const postsData = [];
    const draftsData = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateString = date.toLocaleDateString();
        dates.push(dateString);
        
        // Count posts and drafts created/updated on this day
        let dayPosts = 0;
        let dayDrafts = 0;
        
        posts.forEach(item => {
            const itemDate = new Date(item.updatedAt || item.createdAt).toLocaleDateString();
            if (itemDate === dateString) {
                dayPosts++;
            }
        });
        
        drafts.forEach(item => {
            const itemDate = new Date(item.updatedAt || item.createdAt).toLocaleDateString();
            if (itemDate === dateString) {
                dayDrafts++;
            }
        });
        
        postsData.push(dayPosts);
        draftsData.push(dayDrafts);
    }

    if (window.activityTrendChart) {
        window.activityTrendChart.destroy();
    }

    try {
        window.activityTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Posts',
                        data: postsData,
                        backgroundColor: '#4CAF50',
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Drafts',
                        data: draftsData,
                        backgroundColor: '#ff9800',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'rect'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stepSize: 1,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating activity trend chart:', error);
    }
}

function updateDeviceChart() {
    const canvas = document.getElementById('deviceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Simulated device data (in production, this would come from real analytics)
    const data = {
        desktop: 45,
        mobile: 40,
        tablet: 15
    };

    if (window.deviceChart) {
        window.deviceChart.destroy();
    }

    try {
        window.deviceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{
                    data: [data.desktop, data.mobile, data.tablet],
                    backgroundColor: ['#2196F3', '#4CAF50', '#FFC107'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    } catch (error) {
        console.error('Error creating device chart:', error);
    }
}

// Tab Navigation
function updateTabContent(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabButton = document.querySelector(`.tab-button[data-tab="${tab}"]`);
    const tabContent = document.getElementById(`${tab}-tab`);
    
    if (tabButton) tabButton.classList.add('active');
    if (tabContent) tabContent.classList.add('active');

    // Load data based on tab
    loadDashboard();
}

// ============ POSTS FUNCTIONS ============

async function displayPosts(searchTerm = '') {
    try {
        let posts = await fetchAllPosts();
        
        // Filter
        let filteredPosts = posts.filter(post =>
            (post.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (post.content || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filterBy === 'published') {
            filteredPosts = filteredPosts.filter(post => post.status === 'published' || post.published);
        } else if (filterBy === 'draft') {
            filteredPosts = filteredPosts.filter(post => post.status === 'draft' || post.published === false);
        }
        
        // Sort
        if (sortBy === 'newest') {
            filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'oldest') {
            filteredPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else if (sortBy === 'mostViewed') {
            filteredPosts.sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (sortBy === 'mostLiked') {
            filteredPosts.sort((a, b) => ((b.likes && b.likes.length) || 0) - ((a.likes && a.likes.length) || 0));
        } else if (sortBy === 'trending') {
            const now = new Date();
            filteredPosts.sort((a, b) => {
                const score = (post) => {
                    const views = post.views || 0;
                    const likes = (post.likes && post.likes.length) || 0;
                    const comments = (post.comments && post.comments.length) || 0;
                    const created = post.createdAt ? new Date(post.createdAt) : now;
                    const daysOld = Math.max(1, (now - created) / (1000 * 60 * 60 * 24));
                    const engagementScore = views + likes * 3 + comments * 4;
                    return engagementScore / daysOld;
                };
                return score(b) - score(a);
            });
        }
        
        if (postsList) {
            postsList.innerHTML = filteredPosts.length === 0 
                ? '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No posts found</td></tr>' 
                : filteredPosts.map((post) => {
                    const createdDate = formatTableDate(post.createdAt);
                    const updatedDate = post.updatedAt ? formatTableDate(post.updatedAt) : createdDate;
                    const publishedDate = post.publishedAt ? formatTableDate(post.publishedAt) : createdDate;
                    
                    return `
                    <tr>
                        <td><strong>${escapeHtml(post.title)}</strong></td>
                        <td>
                            <span style="background: ${post.status === 'published' ? '#4CAF50' : '#ff9800'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">
                                ${post.status || (post.published ? 'published' : 'draft')}
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <span title="Created"><i class="fas fa-plus-circle" style="color: #4CAF50; font-size: 0.8rem;"></i> ${createdDate}</span>
                                <span title="Updated"><i class="fas fa-edit" style="color: #2196F3; font-size: 0.8rem;"></i> ${updatedDate}</span>
                                ${post.status === 'published' ? `<span title="Published"><i class="fas fa-check-circle" style="color: #FFC107; font-size: 0.8rem;"></i> ${publishedDate}</span>` : ''}
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; gap: 5px; justify-content: center; flex-direction: column; align-items: center;">
                                <span title="Views"><i class="fas fa-eye"></i> ${post.views || 0}</span>
                                <span title="Likes"><i class="fas fa-heart" style="color: #e91e63;"></i> ${(post.likes && post.likes.length) || 0}</span>
                                <span title="Comments"><i class="fas fa-comment" style="color: #2196F3;"></i> ${(post.comments && post.comments.length) || 0}</span>
                            </div>
                        </td>
                        <td>
                            <button class="btn btn-primary" onclick="editPost('${post._id}', false)" style="margin-right: 5px;" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-secondary" onclick="deletePost('${post._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `}).join('');
        }
    } catch (error) {
        console.error('Error displaying posts:', error);
        showToast('Failed to load posts', 'error');
    }
}

async function editPost(id, isDraft) {
    try {
        let item;
        if (isDraft) {
            item = await fetchDraftById(id);
        } else {
            item = await fetchPostById(id);
        }
        
        if (!item) {
            showToast('Post not found', 'error');
            return;
        }
        
        titleInput.value = item.title || '';
        descriptionInput.innerHTML = item.content || '';
        editIndexInput.value = id;
        postStatusSelect.value = item.status || (isDraft ? 'draft' : 'published');
        formTitle.textContent = isDraft ? 'Edit Draft' : 'Edit Post';
        cancelBtn.style.display = 'inline-block';
        currentPhotos = item.photos || [];
        previewPhotos(currentPhotos);
        
        editIndexInput.dataset.source = isDraft ? 'drafts' : 'posts';
        
        showSection('new-post');
        updateActionButtons();
    } catch (error) {
        console.error('Error editing post:', error);
        showToast('Failed to load item for editing', 'error');
    }
}

async function deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        await deletePostFromDB(id);
        showToast('Post deleted successfully');
        displayPosts(searchInput ? searchInput.value : '');
        loadDashboard();
    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('Failed to delete post', 'error');
    }
}

// ============ DRAFTS FUNCTIONS ============

async function displayDrafts(searchTerm = '') {
    try {
        let drafts = await fetchAllDrafts();
        
        const filteredDrafts = drafts.filter(draft => 
            (draft.title || '').toLowerCase().includes(searchTerm ? searchTerm.toLowerCase() : '') ||
            (draft.content || '').toLowerCase().includes(searchTerm ? searchTerm.toLowerCase() : '')
        );

        if (draftsList) {
            draftsList.innerHTML = filteredDrafts.length === 0 
                ? '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No drafts found</td></tr>' 
                : filteredDrafts.map((draft) => {
                    const createdDate = formatTableDate(draft.createdAt);
                    const updatedDate = draft.updatedAt ? formatTableDate(draft.updatedAt) : createdDate;
                    
                    return `
                    <tr>
                        <td><strong>${escapeHtml(draft.title || 'Untitled')}</strong></td>
                        <td>
                            <span style="background: #ff9800; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">
                                draft
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <span title="Created"><i class="fas fa-plus-circle" style="color: #4CAF50; font-size: 0.8rem;"></i> ${createdDate}</span>
                                <span title="Updated"><i class="fas fa-edit" style="color: #2196F3; font-size: 0.8rem;"></i> ${updatedDate}</span>
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; gap: 5px; justify-content: center;">
                                <span title="Views"><i class="fas fa-eye"></i> ${draft.views || 0}</span>
                            </div>
                        </td>
                        <td>
                            <button class="btn btn-primary" onclick="editDraft('${draft._id}')" style="margin-right: 5px;" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-success" onclick="publishDraft('${draft._id}')" style="margin-right: 5px;" title="Publish">
                                <i class="fas fa-upload"></i>
                            </button>
                            <button class="btn btn-secondary" onclick="deleteDraft('${draft._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `}).join('');
        }
    } catch (error) {
        console.error('Error displaying drafts:', error);
        showToast('Failed to load drafts', 'error');
    }
}

async function editDraft(id) {
    editPost(id, true);
}

async function publishDraft(id) {
    if (!confirm('Publish this draft?')) return;
    
    try {
        await publishDraftToDB(id);
        showToast('Draft published successfully');
        displayDrafts();
        loadDashboard();
        displayPosts();
    } catch (error) {
        console.error('Error publishing draft:', error);
        showToast('Failed to publish draft', 'error');
    }
}

async function deleteDraft(id) {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    try {
        await deleteDraftFromDB(id);
        showToast('Draft deleted successfully');
        displayDrafts();
        loadDashboard();
    } catch (error) {
        console.error('Error deleting draft:', error);
        showToast('Failed to delete draft', 'error');
    }
}

// ============ SAVE POST ============

async function savePost(e) {
    e.preventDefault();
    
    const title = titleInput.value.trim();
    const content = descriptionInput.innerHTML.trim();
    
    if (!title || !content || content === '<br>') {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const isDraft = postStatusSelect.value === 'draft';
    const editId = editIndexInput.value !== '-1' ? editIndexInput.value : null;
    const source = editIndexInput.dataset.source;
    
    const editorName = localStorage.getItem('editor_name') || 'Editor Name';
    const now = new Date().toISOString();
    
    const post = {
        title: title,
        content: content,
        author: editorName,
        updatedAt: now,
        published: !isDraft,
        status: isDraft ? 'draft' : 'published',
        tags: [],
        photos: currentPhotos,
        views: 0,
        likes: [],
        comments: []
    };
    
    // Set createdAt only for new posts
    if (!editId) {
        post.createdAt = now;
    }
    
    // Set publishedAt when publishing
    if (!isDraft) {
        post.publishedAt = now;
    }
    
    try {
        if (editId) {
            // Update existing
            if (source === 'drafts') {
                await saveDraftToDB(post, editId);
            } else {
                await savePostToDB(post, isDraft, editId);
            }
        } else {
            // Create new
            if (isDraft) {
                await saveDraftToDB(post);
            } else {
                await savePostToDB(post, false);
            }
        }
        
        showToast(isDraft ? 'Draft saved successfully' : 'Post published successfully');
        clearForm();
        showSection(isDraft ? 'drafts' : 'posts');
        loadDashboard();
    } catch (error) {
        console.error('Error saving:', error);
        showToast(error.message || 'Failed to save', 'error');
    }
}

// Clear Form
function clearForm() {
    form.reset();
    currentPhotos = [];
    document.getElementById('photoPreview').innerHTML = '';
    editIndexInput.value = '-1';
    editIndexInput.dataset.source = '';
    formTitle.textContent = 'Create New Post';
    cancelBtn.style.display = 'none';
    descriptionInput.innerHTML = '';
    updateActionButtons();
    updateReadTime();
}

// Cancel Edit
function cancelEdit() {
    clearForm();
    if (editIndexInput.dataset.source === 'drafts') {
        showSection('drafts');
    } else {
        showSection('posts');
    }
}

// Preview Photos
function previewPhotos(photos) {
    const preview = document.getElementById('photoPreview');
    if (!preview) return;
    
    preview.innerHTML = photos.map(photo => `
        <div class="preview-item">
            <img src="${photo}" alt="Preview" loading="lazy">
            <button type="button" class="remove-photo" onclick="removePhoto('${photo}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Remove Photo
function removePhoto(photo) {
    currentPhotos = currentPhotos.filter(p => p !== photo);
    previewPhotos(currentPhotos);
}

// Media Library Functions
function getMediaLibraryImages() {
    try {
        return JSON.parse(localStorage.getItem('MEDIA_LIBRARY_IMAGES')) || [];
    } catch {
        return [];
    }
}

function setMediaLibraryImages(images) {
    localStorage.setItem('MEDIA_LIBRARY_IMAGES', JSON.stringify(images));
}

function loadMediaLibrary(searchTerm = '') {
    const mediaGrid = document.getElementById('mediaGrid');
    if (!mediaGrid) return;
    
    const mediaImages = getMediaLibraryImages();
    
    let filteredImages = mediaImages;
    if (searchTerm) {
        filteredImages = mediaImages.filter((_, index) => 
            `media ${index + 1}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    mediaGrid.innerHTML = filteredImages.length === 0 
        ? '<div class="no-media">No media found. Upload images in the post editor.</div>' 
        : filteredImages.map((image, index) => `
            <div class="media-item">
                <img src="${image}" alt="Media ${index + 1}" loading="lazy">
                <div class="media-overlay">
                    <button class="btn btn-primary" onclick="copyMediaUrl('${image}')" style="margin-right: 5px;" title="Copy URL">
                        <i class="fas fa-link"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="deleteMedia('${image}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
}

function copyMediaUrl(image) {
    navigator.clipboard.writeText(image).then(() => {
        showToast('Image URL copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy URL', 'error');
    });
}

function searchMedia() {
    const searchTerm = searchMediaInput ? searchMediaInput.value : '';
    loadMediaLibrary(searchTerm);
}

function deleteMedia(image) {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    let mediaImages = getMediaLibraryImages();
    mediaImages = mediaImages.filter(p => p !== image);
    setMediaLibraryImages(mediaImages);
    
    showToast('Media deleted successfully');
    loadMediaLibrary(searchMediaInput ? searchMediaInput.value : '');
}

function uploadMedia() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024;
        
        const invalidFiles = files.filter(file => !validTypes.includes(file.type) || file.size > maxSize);
        if (invalidFiles.length > 0) {
            showToast('Only JPEG, PNG, GIF, WEBP under 5MB allowed', 'error');
            return;
        }

        const newPhotos = await Promise.all(files.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        })));

        currentPhotos = [...currentPhotos, ...newPhotos];
        previewPhotos(currentPhotos);
        
        // Add to media library
        let mediaImages = getMediaLibraryImages();
        mediaImages = [...new Set([...mediaImages, ...newPhotos])];
        setMediaLibraryImages(mediaImages);
        
        showToast(`${newPhotos.length} image(s) uploaded to library`);
        loadMediaLibrary();
    };
    
    input.click();
}

// ============ ANALYTICS FUNCTIONS ============

async function loadAnalytics() {
    try {
        const rangeSelect = document.getElementById('analyticsRange');
        const days = rangeSelect ? parseInt(rangeSelect.value) : 30;
        
        const analytics = await fetchAnalyticsData(days);
        
        if (!analytics) {
            showToast('Failed to load analytics', 'error');
            return;
        }
        
        // Update summary cards
        document.getElementById('totalViewsAnalytics').textContent = formatNumber(analytics.summary.totalViews);
        document.getElementById('totalLikesAnalytics').textContent = formatNumber(analytics.summary.totalLikes);
        document.getElementById('totalCommentsAnalytics').textContent = formatNumber(analytics.summary.totalComments);
        document.getElementById('totalPostsAnalytics').textContent = analytics.summary.totalPosts;
        document.getElementById('totalDraftsAnalytics').textContent = analytics.summary.totalDrafts;
        document.getElementById('engagementRateAnalytics').textContent = analytics.summary.engagementRate + '%';
        document.getElementById('avgViewsAnalytics').textContent = formatNumber(analytics.summary.avgViews);

        // Update traffic chart
        const trafficCanvas = document.getElementById('trafficChart');
        if (trafficCanvas) {
            const ctxTraffic = trafficCanvas.getContext('2d');
            if (window.trafficChart) window.trafficChart.destroy();
            
            window.trafficChart = new Chart(ctxTraffic, {
                type: 'line',
                data: {
                    labels: analytics.charts.labels,
                    datasets: [
                        {
                            label: 'Views',
                            data: analytics.charts.views,
                            borderColor: '#4CAF50',
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Likes',
                            data: analytics.charts.likes,
                            borderColor: '#e91e63',
                            backgroundColor: 'rgba(233, 30, 99, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Comments',
                            data: analytics.charts.comments,
                            borderColor: '#2196F3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    stacked: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Views'
                            },
                            ticks: {
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Likes/Comments'
                            },
                            grid: {
                                drawOnChartArea: false
                            },
                            ticks: {
                                callback: function(value) {
                                    return formatNumber(value);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Update engagement chart in analytics
        const engagementCanvas = document.getElementById('engagementChartAnalytics');
        if (engagementCanvas) {
            const ctxEngagement = engagementCanvas.getContext('2d');
            
            const engagementData = {
                views: analytics.summary.totalViews,
                likes: analytics.summary.totalLikes,
                comments: analytics.summary.totalComments
            };

            if (window.engagementChartAnalytics) window.engagementChartAnalytics.destroy();
            
            window.engagementChartAnalytics = new Chart(ctxEngagement, {
                type: 'doughnut',
                data: {
                    labels: ['Views', 'Likes', 'Comments'],
                    datasets: [{
                        data: [engagementData.views, engagementData.likes, engagementData.comments],
                        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${formatNumber(value)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }

        // Update popular posts
        const popularPosts = document.getElementById('popularPosts');
        if (popularPosts) {
            popularPosts.innerHTML = analytics.topPosts.length === 0 
                ? '<div class="no-data">No posts available</div>'
                : analytics.topPosts.map((post, index) => {
                    const createdDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown';
                    
                    return `
                    <div class="popular-post-item">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 30px; height: 30px; background: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#f0f0f0'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${index + 1}
                            </div>
                            <div style="flex: 1;">
                                <h4 style="margin: 0;">${escapeHtml(post.title)}</h4>
                                <div style="display: flex; gap: 15px; margin-top: 5px; flex-wrap: wrap;">
                                    <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                                    <span><i class="fas fa-eye"></i> ${formatNumber(post.views)}</span>
                                    <span><i class="fas fa-heart" style="color: #e91e63;"></i> ${post.likes}</span>
                                    <span><i class="fas fa-comment" style="color: #2196F3;"></i> ${post.comments}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `}).join('');
        }

        // Update recent activity in analytics
        const recentActivityAnalytics = document.getElementById('recentActivityAnalytics');
        if (recentActivityAnalytics) {
            recentActivityAnalytics.innerHTML = analytics.recentActivity.length === 0
                ? '<div class="no-data">No recent activity</div>'
                : analytics.recentActivity.map(item => {
                    const formattedDate = formatTableDate(item.date);
                    const timeAgo = getTimeAgo(new Date(item.date));
                    
                    return `
                    <div class="activity-item">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas ${item.type === 'draft' ? 'fa-file-alt' : 'fa-newspaper'}" 
                               style="color: ${item.type === 'draft' ? '#ff9800' : '#4CAF50'}; width: 20px;"></i>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${escapeHtml(item.title)}</div>
                                <div style="display: flex; gap: 15px; font-size: 0.8rem; color: #666; flex-wrap: wrap;">
                                    <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                                    <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                                    <span><i class="fas fa-eye"></i> ${item.views} views</span>
                                </div>
                            </div>
                            <span class="badge" style="background: ${item.type === 'draft' ? '#ff9800' : '#4CAF50'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;">
                                ${item.type}
                            </span>
                        </div>
                    </div>
                `}).join('');
        }
        
        showToast('Analytics updated');
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Error loading analytics', 'error');
    }
}

// ============ SETTINGS FUNCTIONS ============

function loadSettings() {
    try {
        const editorName = localStorage.getItem('editor_name') || 'Editor Name';
        const editorEmail = localStorage.getItem('editor_email') || 'editor@example.com';
        const notifications = JSON.parse(localStorage.getItem('editor_notifications')) || {
            comments: true,
            views: true,
            weeklyReport: false
        };

        const nameInput = document.getElementById('editorNameInput');
        const emailInput = document.getElementById('editorEmail');
        
        if (nameInput) nameInput.value = editorName;
        if (emailInput) emailInput.value = editorEmail;
        if (profilePreview) profilePreview.src = profilePicture;
        
        const commentsCheckbox = document.querySelector('input[name="comments"]');
        const viewsCheckbox = document.querySelector('input[name="views"]');
        const weeklyCheckbox = document.querySelector('input[name="weeklyReport"]');
        
        if (commentsCheckbox) commentsCheckbox.checked = notifications.comments;
        if (viewsCheckbox) viewsCheckbox.checked = notifications.views;
        if (weeklyCheckbox) weeklyCheckbox.checked = notifications.weeklyReport;

        updateSidebarProfile();
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error loading settings', 'error');
    }
}

function uploadProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 2 * 1024 * 1024;

        if (!validTypes.includes(file.type) || file.size > maxSize) {
            showToast('Only JPEG, PNG, GIF, WEBP under 2MB allowed', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                profilePicture = e.target.result;
                localStorage.setItem('editor_profile_picture', profilePicture);
                if (profilePreview) profilePreview.src = profilePicture;
                updateSidebarProfile();
                showToast('Profile picture updated');
            } catch (error) {
                console.error('Error uploading profile picture:', error);
                showToast('Error updating profile picture', 'error');
            }
        };
        reader.readAsDataURL(file);
    };

    input.click();
}

function saveProfileSettings(e) {
    e.preventDefault();
    try {
        const name = document.getElementById('editorNameInput').value.trim();
        const email = document.getElementById('editorEmail').value.trim();

        if (!name || !email) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            showToast('Please enter a valid email', 'error');
            return;
        }

        localStorage.setItem('editor_name', name);
        localStorage.setItem('editor_email', email);
        
        updateSidebarProfile();
        showToast('Profile settings saved');
    } catch (error) {
        console.error('Error saving profile settings:', error);
        showToast('Error saving profile settings', 'error');
    }
}

function saveNotificationSettings(e) {
    e.preventDefault();
    try {
        const notifications = {
            comments: document.querySelector('input[name="comments"]')?.checked || false,
            views: document.querySelector('input[name="views"]')?.checked || false,
            weeklyReport: document.querySelector('input[name="weeklyReport"]')?.checked || false
        };

        localStorage.setItem('editor_notifications', JSON.stringify(notifications));
        showToast('Notification preferences saved');
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showToast('Error saving notification preferences', 'error');
    }
}

// Update Sidebar Profile
function updateSidebarProfile() {
    try {
        const editorName = localStorage.getItem('editor_name') || 'Editor Name';
        const profileImageElement = document.querySelector('.editor-profile .profile-image');
        const editorNameElement = document.getElementById('editorName');
        
        if (editorNameElement) {
            editorNameElement.textContent = editorName;
        }
        
        if (profileImageElement) {
            profileImageElement.src = profilePicture;
        }
    } catch (error) {
        console.error('Error updating sidebar profile:', error);
    }
}

// Theme handling
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark-theme');
    } else {
        root.classList.remove('dark-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
}

// Utility Functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateReadTime() {
    if (!descriptionInput) return;
    const raw = descriptionInput.innerHTML || '';
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    const minutes = words === 0 ? 0 : Math.max(1, Math.round(words / 200));
    const indicator = document.getElementById('readTimeIndicator');
    if (indicator) {
        indicator.textContent = `Estimated read time: ${minutes} min`;
    }
}

function updateActionButtons() {
    const publishNowBtn = document.getElementById('publishNowBtn');
    const moveToDraftBtn = document.getElementById('moveToDraftBtn');
    
    if (!postStatusSelect || !publishNowBtn || !moveToDraftBtn) return;
    
    if (postStatusSelect.value === 'draft') {
        publishNowBtn.style.display = 'inline-block';
        moveToDraftBtn.style.display = 'none';
    } else {
        publishNowBtn.style.display = 'none';
        moveToDraftBtn.style.display = 'inline-block';
    }
}

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Apply saved theme before rendering UI
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
    updateSidebarProfile();
    
    // Show dashboard by default
    showSection('dashboard');
    
    // Add event listener for time range change
    const timeRange = document.getElementById('timeRange');
    if (timeRange) {
        timeRange.addEventListener('change', loadDashboard);
    }
    
    // Initialize tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            updateTabContent(tab);
        });
    });
    
    // Add sort and filter listeners
    const sortSelect = document.getElementById('sortBy');
    const filterSelect = document.getElementById('filterBy');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            displayPosts(searchInput ? searchInput.value : '');
        });
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            filterBy = e.target.value;
            displayPosts(searchInput ? searchInput.value : '');
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', savePost);
    }
    
    // Live read-time updates
    if (descriptionInput) {
        descriptionInput.addEventListener('input', updateReadTime);
        updateReadTime();
    }
    
    // Photo input change
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxSize = 5 * 1024 * 1024;

            const invalidFiles = files.filter(file => !validTypes.includes(file.type) || file.size > maxSize);
            if (invalidFiles.length > 0) {
                showToast('Only JPEG, PNG, GIF, WEBP under 5MB allowed', 'error');
                photoInput.value = '';
                return;
            }

            const newPhotos = await Promise.all(files.map(file => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            })));
            
            currentPhotos = [...currentPhotos, ...newPhotos];
            previewPhotos(currentPhotos);
            
            // Add to media library
            let mediaImages = getMediaLibraryImages();
            mediaImages = [...new Set([...mediaImages, ...newPhotos])];
            setMediaLibraryImages(mediaImages);
        });
    }
    
    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => displayPosts(e.target.value));
    }
    
    // Search media input
    if (searchMediaInput) {
        searchMediaInput.addEventListener('input', searchMedia);
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear refresh interval
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ROLE_KEY);
            window.location.href = '../editorlog.html';
        });
    }
    
    // Post status change
    if (postStatusSelect) {
        postStatusSelect.addEventListener('change', updateActionButtons);
    }
    
    // Publish now button
    const publishNowBtn = document.getElementById('publishNowBtn');
    if (publishNowBtn) {
        publishNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (postStatusSelect) postStatusSelect.value = 'published';
            savePost(e);
        });
    }
    
    // Move to draft button
    const moveToDraftBtn = document.getElementById('moveToDraftBtn');
    if (moveToDraftBtn) {
        moveToDraftBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (postStatusSelect) postStatusSelect.value = 'draft';
            savePost(e);
        });
    }
    
    // Settings forms
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfileSettings);
    }
    
    if (notificationForm) {
        notificationForm.addEventListener('submit', saveNotificationSettings);
    }
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
        darkModeToggle.checked = currentTheme === 'dark';
        darkModeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked ? 'dark' : 'light');
        });
    }
    
    // Change picture button
    const changePictureBtn = document.querySelector('.profile-upload .btn-secondary');
    if (changePictureBtn) {
        changePictureBtn.addEventListener('click', uploadProfilePicture);
    }
});

// ============ HAMBURGER MENU ============

const hamburgerMenu = document.querySelector('.hamburger-menu');
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.sidebar-overlay');

function toggleMenu() {
    const isOpen = hamburgerMenu.classList.toggle('active');
    sidebar.classList.toggle('show', isOpen);
    overlay.classList.toggle('show', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    hamburgerMenu.setAttribute('aria-expanded', isOpen);
}

if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', toggleMenu);
}

if (overlay) {
    overlay.addEventListener('click', toggleMenu);
}

document.querySelectorAll('.sidebar-menu a').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleMenu();
        }
    });
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('show')) {
        toggleMenu();
    }
});

// Keyboard Navigation
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            link.click();
        }
    });
});

// Make functions globally available
window.showSection = showSection;
window.editPost = editPost;
window.editDraft = editDraft;
window.deletePost = deletePost;
window.deleteDraft = deleteDraft;
window.publishDraft = publishDraft;
window.formatText = formatText;
window.insertLink = insertLink;
window.triggerPhotoUpload = triggerPhotoUpload;
window.removePhoto = removePhoto;
window.cancelEdit = cancelEdit;
window.uploadMedia = uploadMedia;
window.deleteMedia = deleteMedia;
window.searchMedia = searchMedia;
window.copyMediaUrl = copyMediaUrl;
window.uploadProfilePicture = uploadProfilePicture;

// Text Formatting Functions
function formatText(command) {
    document.execCommand(command, false, null);
    descriptionInput.focus();
}

function insertLink() {
    let url = prompt('Enter the URL:');
    if (url) {
        url = url.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        document.execCommand('createLink', false, url);
        descriptionInput.focus();
    }
}

function triggerPhotoUpload() {
    photoInput.click();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// Refresh when localStorage changes
window.addEventListener('storage', function(e) {
    if (e.key === 'posts' || e.key === 'drafts') {
        if (currentSection === 'dashboard') {
            loadDashboard();
        } else if (currentSection === 'posts') {
            displayPosts();
        } else if (currentSection === 'drafts') {
            displayDrafts();
        }
    }
});