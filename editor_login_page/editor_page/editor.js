// Constants
const TOKEN_KEY = 'editor_token';
const ROLE_KEY = 'editor_role';
const POSTS_KEY = 'posts';
const DRAFTS_KEY = 'drafts';

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
const changePictureBtn = document.querySelector('.profile-upload .btn-secondary');
const editorNameDisplay = document.getElementById('editorName');

// State
let currentPhotos = [];
let currentSection = 'dashboard';
let profilePicture = localStorage.getItem('editor_profile_picture') || 'https://via.placeholder.com/50';

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
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Section Navigation
function showSection(section) {
    currentSection = section;
    
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('a').getAttribute('onclick').includes(section)) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.editor-section').forEach(s => {
        s.style.display = s.id === `${section}-section` ? 'block' : 'none';
    });

    switch(section) {
        case 'dashboard':
            loadDashboard();
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
        case 'analytics':
            loadAnalytics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
    updateSidebarProfile();
}

// LocalStorage Helper Functions
function getLocalStorageItem(key, defaultValue = '[]') {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : JSON.parse(defaultValue);
    } catch (error) {
        console.error(`Error reading from localStorage (${key}):`, error);
        return JSON.parse(defaultValue);
    }
}

function setLocalStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error writing to localStorage (${key}):`, error);
        showToast('Storage limit reached. Please clear some data.', 'error');
        return false;
    }
}

// Text Formatting Functions
function formatText(command) {
    document.execCommand(command, false, null);
    descriptionInput.focus();
}

function insertLink() {
    const url = prompt('Enter the URL:');
    if (url) {
        document.execCommand('createLink', false, url);
        descriptionInput.focus();
    }
}

function triggerPhotoUpload() {
    photoInput.click();
}

// Update Sidebar Profile
function updateSidebarProfile() {
    try {
        const editorName = localStorage.getItem('editor_name') || 'Editor Name';
        const profileImageElement = document.querySelector('.editor-profile .profile-image');
        
        if (!editorNameDisplay || !profileImageElement) {
            console.error('Sidebar profile elements not found');
            showToast('Error updating profile display', 'error');
            return;
        }

        console.log('Updating sidebar with name:', editorName, 'and picture:', profilePicture);
        editorNameDisplay.textContent = editorName;
        profileImageElement.src = profilePicture;
    } catch (error) {
        console.error('Error updating sidebar profile:', error);
        showToast('Error updating profile display', 'error');
    }
}

// Dashboard Functions
function loadDashboard() {
    const posts = getLocalStorageItem(POSTS_KEY);
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const range = timeRangeSelect.value;

    let filteredPosts = posts;
    const now = new Date();
    switch(range) {
        case 'today':
            filteredPosts = posts.filter(p => new Date(p.date).toDateString() === now.toDateString());
            break;
        case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            filteredPosts = posts.filter(p => new Date(p.date) >= weekAgo);
            break;
        case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            filteredPosts = posts.filter(p => new Date(p.date) >= monthAgo);
            break;
    }

    document.getElementById('totalPosts').textContent = filteredPosts.length;
    document.getElementById('totalViews').textContent = filteredPosts.reduce((sum, post) => sum + (post.views || 0), 0);
    document.getElementById('totalComments').textContent = filteredPosts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    document.getElementById('totalLikes').textContent = filteredPosts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    draftCountBadge.textContent = drafts.length;
    postCountBadge.textContent = posts.length;

    updateViewsChart();
    updateTopPosts();
    updateTabContent('overview');
    updateSidebarProfile();
}

// Tab Navigation for Dashboard
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        updateTabContent(tab);
    });
});

function updateTabContent(tab) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');

    switch(tab) {
        case 'overview':
            updateViewsChart();
            updateTopPosts();
            break;
        case 'activity':
            updateActivityLog();
            break;
        case 'performance':
            updateEngagementChart();
            updatePerformanceList();
            break;
        case 'trends':
            updateTrendsChart();
            updateActivityTrendChart();
            break;
    }
}

// Chart Functions
function updateViewsChart() {
    const ctx = document.getElementById('viewsChart').getContext('2d');
    const posts = getLocalStorageItem(POSTS_KEY);
    const range = timeRangeSelect.value;
    let days = 7;
    if (range === 'month') days = 30;
    else if (range === 'year') days = 365;

    const dates = Array.from({length: days}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString();
    }).reverse();

    const viewsData = dates.map(date => posts.reduce((sum, post) => sum + (post.views?.[date] || 0), 0));

    if (window.viewsChart) window.viewsChart.destroy();
    window.viewsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{ label: 'Views', data: viewsData, borderColor: '#4CAF50', tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function updateTopPosts() {
    const topPosts = document.getElementById('topPosts');
    const posts = getLocalStorageItem(POSTS_KEY);
    const sortedPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    topPosts.innerHTML = sortedPosts.map(post => `
        <div class="top-post-item">
            <h4>${post.title}</h4>
            <p>${post.views || 0} views</p>
        </div>
    `).join('');
}

function updateActivityLog() {
    const activityList = document.getElementById('activityList');
    const posts = getLocalStorageItem(POSTS_KEY);
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const activities = [...posts, ...drafts]
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, 10)
        .map(item => `
            <div class="activity-item">
                <span><i class="fas fa-file-alt"></i> ${item.title} - ${item.status || 'draft'}</span>
                <span>${new Date(item.lastModified).toLocaleString()}</span>
            </div>
        `);
    activityList.innerHTML = activities.join('');
}

function updateEngagementChart() {
    const ctx = document.getElementById('engagementChart').getContext('2d');
    const posts = getLocalStorageItem(POSTS_KEY);
    const data = {
        views: posts.reduce((sum, post) => sum + (post.views || 0), 0),
        likes: posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
        comments: posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0)
    };

    if (window.engagementChart) window.engagementChart.destroy();
    window.engagementChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Views', 'Likes', 'Comments'],
            datasets: [{ data: [data.views, data.likes, data.comments], backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updatePerformanceList() {
    const performanceList = document.getElementById('performanceList');
    const posts = getLocalStorageItem(POSTS_KEY);
    const sortedPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    performanceList.innerHTML = sortedPosts.map(post => `
        <div class="performance-item">
            <h4>${post.title}</h4>
            <p>Views: ${post.views || 0} | Likes: ${post.likes?.length || 0} | Comments: ${post.comments?.length || 0}</p>
        </div>
    `).join('');
}

function updateTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    const posts = getLocalStorageItem(POSTS_KEY);
    const dates = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString();
    }).reverse();

    const viewsData = dates.map(date => posts.reduce((sum, post) => sum + (post.views?.[date] || 0), 0));

    if (window.trendsChart) window.trendsChart.destroy();
    window.trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{ label: 'Views', data: viewsData, borderColor: '#4CAF50', tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function updateActivityTrendChart() {
    const ctx = document.getElementById('activityTrendChart').getContext('2d');
    const posts = getLocalStorageItem(POSTS_KEY);
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const dates = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString();
    }).reverse();

    const activityData = dates.map(date => 
        [...posts, ...drafts].filter(item => new Date(item.lastModified).toLocaleDateString() === date).length
    );

    if (window.activityTrendChart) window.activityTrendChart.destroy();
    window.activityTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{ label: 'Activity', data: activityData, backgroundColor: '#4CAF50' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

// Posts Functions
function displayPosts(searchTerm = '') {
    const posts = getLocalStorageItem(POSTS_KEY);
    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    postsList.innerHTML = filteredPosts.length === 0 ? '<tr><td colspan="5">No posts found</td></tr>' : filteredPosts.map((post, index) => `
        <tr>
            <td>${post.title}</td>
            <td>${post.status}</td>
            <td>${new Date(post.date).toLocaleDateString()}</td>
            <td>${post.views || 0}</td>
            <td>
                <button class="btn btn-primary" onclick="editPost(${index})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-secondary" onclick="deletePost(${index})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Edit Post
function editPost(index) {
    const posts = getLocalStorageItem(POSTS_KEY);
    const post = posts[index];
    
    titleInput.value = post.title;
    descriptionInput.value = post.description;
    postStatusSelect.value = post.status;
    editIndexInput.value = index;
    editIndexInput.dataset.source = 'posts';
    currentPhotos = [...(post.photos || [])];
    
    showSection('new-post');
    previewPhotos(currentPhotos);
    cancelBtn.style.display = 'inline-block';
}

// Delete Post
function deletePost(index) {
    if (confirm('Are you sure you want to delete this post?')) {
        const posts = getLocalStorageItem(POSTS_KEY);
        posts.splice(index, 1);
        if (setLocalStorageItem(POSTS_KEY, posts)) {
            showToast('Post deleted successfully');
            displayPosts(searchInput.value);
            loadDashboard();
        }
    }
}

// Drafts Functions
function displayDrafts(searchTerm = '') {
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const filteredDrafts = drafts.filter(draft => 
        (draft.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (draft.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    draftsList.innerHTML = filteredDrafts.length === 0 ? '<tr><td colspan="5">No drafts found</td></tr>' : filteredDrafts.map((draft, index) => `
        <tr>
            <td>${draft.title || 'Untitled'}</td>
            <td>${draft.status || 'draft'}</td>
            <td>${draft.date ? new Date(draft.date).toLocaleDateString() : new Date().toLocaleDateString()}</td>
            <td>${draft.views || 0}</td>
            <td>
                <button class="btn btn-primary" onclick="editDraft(${index})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-secondary" onclick="deleteDraft(${index})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Edit Draft
function editDraft(index) {
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const draft = drafts[index];
    
    if (!draft) {
        showToast('Draft not found', 'error');
        return;
    }

    titleInput.value = draft.title || '';
    descriptionInput.value = draft.description || '';
    postStatusSelect.value = draft.status || 'draft';
    editIndexInput.value = index;
    editIndexInput.dataset.source = 'drafts';
    currentPhotos = [...(draft.photos || [])];
    
    showSection('new-post');
    previewPhotos(currentPhotos);
    cancelBtn.style.display = 'inline-block';
}

// Delete Draft
function deleteDraft(index) {
    if (confirm('Are you sure you want to delete this draft?')) {
        const drafts = getLocalStorageItem(DRAFTS_KEY);
        if (index < 0 || index >= drafts.length) {
            showToast('Invalid draft index', 'error');
            return;
        }
        
        drafts.splice(index, 1);
        if (setLocalStorageItem(DRAFTS_KEY, drafts)) {
            showToast('Draft deleted successfully');
            displayDrafts();
            loadDashboard();
        }
    }
}

// Save Post
async function savePost(e) {
    e.preventDefault();
    
    if (!titleInput.value.trim() || !descriptionInput.value.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const post = {
        id: editIndexInput.value === '-1' ? Date.now().toString() : undefined,
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        date: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        photos: [...currentPhotos],
        status: postStatusSelect.value,
        author: localStorage.getItem('editor_name') || 'Editor Name', // Set author
        views: 0,
        likes: [],
        comments: []
    };

    const editIndex = parseInt(editIndexInput.value);
    const isDraft = post.status === 'draft';
    const storageKey = isDraft ? DRAFTS_KEY : POSTS_KEY;
    const source = editIndexInput.dataset.source;
    let items = getLocalStorageItem(storageKey);

    if (editIndex === -1) {
        post.id = Date.now().toString();
        items.push(post);
        if (setLocalStorageItem(storageKey, items)) {
            showToast('Post created successfully');
            clearForm();
            showSection(isDraft ? 'drafts' : 'posts');
            loadDashboard();
        }
    } else {
        const existingItem = source === 'posts' ? getLocalStorageItem(POSTS_KEY)[editIndex] : getLocalStorageItem(DRAFTS_KEY)[editIndex];
        post.id = existingItem.id;
        post.views = existingItem.views || 0;
        post.likes = existingItem.likes || [];
        post.comments = existingItem.comments || [];

        if (source === 'drafts' && !isDraft) {
            const drafts = getLocalStorageItem(DRAFTS_KEY);
            drafts.splice(editIndex, 1);
            setLocalStorageItem(DRAFTS_KEY, drafts);
            const posts = getLocalStorageItem(POSTS_KEY);
            posts.push(post);
            if (setLocalStorageItem(POSTS_KEY, posts)) {
                showToast('Post published successfully');
                clearForm();
                showSection('posts');
                loadDashboard();
            }
        } else if (source === 'posts' && isDraft) {
            const posts = getLocalStorageItem(POSTS_KEY);
            posts.splice(editIndex, 1);
            setLocalStorageItem(POSTS_KEY, posts);
            const drafts = getLocalStorageItem(DRAFTS_KEY);
            drafts.push(post);
            if (setLocalStorageItem(DRAFTS_KEY, drafts)) {
                showToast('Post moved to drafts');
                clearForm();
                showSection('drafts');
                loadDashboard();
            }
        } else {
            items[editIndex] = post;
            if (setLocalStorageItem(storageKey, items)) {
                showToast('Post updated successfully');
                clearForm();
                showSection(isDraft ? 'drafts' : 'posts');
                loadDashboard();
            }
        }
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
}

// Cancel Edit
function cancelEdit() {
    clearForm();
    showSection('posts');
}

// Preview Photos
function previewPhotos(photos) {
    const preview = document.getElementById('photoPreview');
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
function loadMediaLibrary(searchTerm = '') {
    const mediaGrid = document.getElementById('mediaGrid');
    const posts = getLocalStorageItem(POSTS_KEY);
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    let allImages = [...posts, ...drafts].flatMap(item => item.photos || []);
    
    if (searchTerm) {
        allImages = allImages.filter((image, index) => `media ${index + 1}`.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    mediaGrid.innerHTML = allImages.length === 0 ? '<div class="no-media">No media found</div>' : allImages.map((image, index) => `
        <div class="media-item">
            <img src="${image}" alt="Media ${index + 1}" loading="lazy">
            <div class="media-overlay">
                <button class="btn btn-secondary" onclick="deleteMedia('${image}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function searchMedia() {
    const searchTerm = searchMediaInput.value;
    loadMediaLibrary(searchTerm);
}

function deleteMedia(image) {
    if (confirm('Are you sure you want to delete this media?')) {
        const posts = getLocalStorageItem(POSTS_KEY);
        const drafts = getLocalStorageItem(DRAFTS_KEY);
        
        posts.forEach(post => post.photos = post.photos?.filter(p => p !== image) || []);
        drafts.forEach(draft => draft.photos = draft.photos?.filter(p => p !== image) || []);
        
        if (setLocalStorageItem(POSTS_KEY, posts) && setLocalStorageItem(DRAFTS_KEY, drafts)) {
            showToast('Media deleted successfully');
            loadMediaLibrary(searchMediaInput.value);
        }
    }
}

function uploadMedia() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024;
        
        if (files.some(file => !validTypes.includes(file.type) || file.size > maxSize)) {
            showToast('Only JPEG, PNG, GIF under 5MB allowed', 'error');
            return;
        }

        const newPhotos = await Promise.all(files.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        })));

        currentPhotos = [...currentPhotos, ...newPhotos];
        previewPhotos(currentPhotos);
        showToast('Media uploaded to current post');
    };
    
    input.click();
}

// Analytics Functions
function loadAnalytics() {
    const range = parseInt(document.getElementById('analyticsRange').value);
    const posts = getLocalStorageItem(POSTS_KEY);
    const dates = Array.from({length: range}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toLocaleDateString();
    }).reverse();

    const trafficData = dates.map(date => posts.reduce((sum, post) => sum + (post.views?.[date] || 0), 0));
    const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
    if (window.trafficChart) window.trafficChart.destroy();
    window.trafficChart = new Chart(ctxTraffic, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{ label: 'Views', data: trafficData, borderColor: '#4CAF50', tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    const engagementData = {
        views: posts.reduce((sum, post) => sum + (post.views || 0), 0),
        likes: posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
        comments: posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0)
    };
    const ctxEngagement = document.getElementById('engagementChart').getContext('2d');
    if (window.engagementChart) window.engagementChart.destroy();
    window.engagementChart = new Chart(ctxEngagement, {
        type: 'doughnut',
        data: {
            labels: ['Views', 'Likes', 'Comments'],
            datasets: [{ data: [engagementData.views, engagementData.likes, engagementData.comments], backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const popularPosts = document.getElementById('popularPosts');
    popularPosts.innerHTML = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map(post => `
        <div class="popular-post-item">
            <h4>${post.title}</h4>
            <p>${post.views || 0} views</p>
        </div>
    `).join('');
}

// Settings Functions
function loadSettings() {
    try {
        const editorName = localStorage.getItem('editor_name') || 'Editor Name';
        const editorEmail = localStorage.getItem('editor_email') || 'editor@example.com';
        const notifications = JSON.parse(localStorage.getItem('editor_notifications')) || {
            comments: true,
            views: true,
            weeklyReport: false
        };

        document.getElementById('editorNameInput').value = editorName;
        document.getElementById('editorEmail').value = editorEmail;
        profilePreview.src = profilePicture;
        
        document.querySelector('input[name="comments"]').checked = notifications.comments;
        document.querySelector('input[name="views"]').checked = notifications.views;
        document.querySelector('input[name="weeklyReport"]').checked = notifications.weeklyReport;

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
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 2 * 1024 * 1024;

        if (!validTypes.includes(file.type) || file.size > maxSize) {
            showToast('Only JPEG, PNG, GIF under 2MB allowed', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                profilePicture = e.target.result;
                localStorage.setItem('editor_profile_picture', profilePicture);
                console.log('Profile picture saved to localStorage:', profilePicture);
                profilePreview.src = profilePicture;
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
        console.log('Profile saved to localStorage - Name:', name, 'Email:', email);
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
            comments: document.querySelector('input[name="comments"]').checked,
            views: document.querySelector('input[name="views"]').checked,
            weeklyReport: document.querySelector('input[name="weeklyReport"]').checked
        };

        localStorage.setItem('editor_notifications', JSON.stringify(notifications));
        showToast('Notification preferences saved');
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showToast('Error saving notification preferences', 'error');
    }
}

// Event Listeners
form.addEventListener('submit', savePost);
photoInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    if (files.some(file => !validTypes.includes(file.type) || file.size > maxSize)) {
        showToast('Only JPEG, PNG, GIF under 5MB allowed', 'error');
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
});

searchInput.addEventListener('input', (e) => displayPosts(e.target.value));
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    window.location.href = '../editorlog.html';
});

// Hamburger Menu
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

hamburgerMenu.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);
document.querySelectorAll('.sidebar-menu a').forEach(item => {
    item.addEventListener('click', () => window.innerWidth <= 768 && toggleMenu());
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar.classList.contains('show')) {
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

// Initialize
checkAuth();
updateSidebarProfile();
showSection('dashboard');