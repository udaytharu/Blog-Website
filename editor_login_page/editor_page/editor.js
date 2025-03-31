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
const logoutBtn = document.getElementById('logoutBtn');

// State
let currentPhotos = [];
let currentSection = 'posts';

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
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('a').getAttribute('onclick').includes(section)) {
            item.classList.add('active');
        }
    });

    // Show/hide sections
    document.querySelectorAll('.editor-section').forEach(s => {
        s.style.display = s.id === `${section}-section` ? 'block' : 'none';
    });

    // Update form title
    formTitle.textContent = section === 'new-post' ? 'Create New Post' : 'Edit Post';

    // Load section-specific content
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'posts':
            displayPosts();
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
}

// Dashboard Functions
function loadDashboard() {
    // Update stats
    const posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
    const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    
    document.getElementById('totalPosts').textContent = posts.length;
    document.getElementById('draftCount').textContent = drafts.length;
    
    // Calculate total views and likes
    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    
    document.getElementById('totalViews').textContent = totalViews;
    document.getElementById('totalLikes').textContent = totalLikes;
    document.getElementById('totalComments').textContent = totalComments;

    // Update charts
    updateViewsChart();
    updateTopPosts();
}

// Views Chart
function updateViewsChart() {
    try {
        const ctx = document.getElementById('viewsChart');
        if (!ctx) {
            console.error('Views chart canvas not found');
            return;
        }

        const posts = getLocalStorageItem(POSTS_KEY);
        
        // Get last 7 days of data
        const dates = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toLocaleDateString();
        }).reverse();

        const viewsData = dates.map(date => {
            return posts.reduce((sum, post) => {
                return sum + (post.views?.[date] || 0);
            }, 0);
        });

        // Destroy existing chart if it exists
        if (window.viewsChart) {
            window.viewsChart.destroy();
        }

        window.viewsChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Views',
                    data: viewsData,
                    borderColor: '#4CAF50',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        console.error('Error creating views chart:', error);
        showToast('Error loading views chart', 'error');
    }
}

// Top Posts
function updateTopPosts() {
    const topPosts = document.getElementById('topPosts');
    const posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
    
    const sortedPosts = [...posts].sort((a, b) => {
        const viewsA = Object.values(a.views || {}).reduce((sum, val) => sum + val, 0);
        const viewsB = Object.values(b.views || {}).reduce((sum, val) => sum + val, 0);
        return viewsB - viewsA;
    }).slice(0, 5);

    topPosts.innerHTML = sortedPosts.map(post => `
        <div class="top-post-item">
            <h4>${post.title}</h4>
            <p>${Object.values(post.views || {}).reduce((sum, val) => sum + val, 0)} views</p>
        </div>
    `).join('');
}

// Drafts Functions
function displayDrafts() {
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const postList = document.getElementById('postList');
    
    postList.innerHTML = '';
    
    if (drafts.length === 0) {
        postList.innerHTML = '<div class="no-posts">No drafts found</div>';
        return;
    }
    
    drafts.forEach((draft, index) => {
        const draftDiv = document.createElement('div');
        draftDiv.className = 'post-item';
        draftDiv.innerHTML = `
            <h3>${draft.title}</h3>
            <p>${draft.description}</p>
            ${draft.photos && draft.photos.length > 0 ? 
                draft.photos.map(photo => `<img src="${photo}" alt="Draft Image" class="post-image">`).join('') 
                : ''}
            <div class="post-meta">
                <span><i class="fas fa-calendar"></i> ${draft.date}</span>
                <span><i class="fas fa-clock"></i> Last modified: ${new Date(draft.lastModified).toLocaleString()}</span>
            </div>
            <div class="post-actions">
                <button class="btn btn-primary" onclick="editDraft(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary" onclick="deleteDraft(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        postList.appendChild(draftDiv);
    });
}

// Edit Draft
function editDraft(index) {
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    const draft = drafts[index];
    
    titleInput.value = draft.title;
    descriptionInput.value = draft.description;
    editIndexInput.value = index;
    currentPhotos = [...(draft.photos || [])];
    
    showSection('new-post');
    previewPhotos(currentPhotos);
    cancelBtn.style.display = 'inline-block';
}

// Delete Draft
function deleteDraft(index) {
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
        try {
            let drafts = getLocalStorageItem(DRAFTS_KEY);
            drafts.splice(index, 1);
            if (setLocalStorageItem(DRAFTS_KEY, drafts)) {
                showToast('Draft deleted successfully');
                displayDrafts();
            }
        } catch (error) {
            showToast('Error deleting draft', 'error');
            console.error('Delete error:', error);
        }
    }
}

// Media Library Functions
function loadMediaLibrary() {
    const mediaGrid = document.getElementById('mediaGrid');
    const posts = getLocalStorageItem(POSTS_KEY);
    const drafts = getLocalStorageItem(DRAFTS_KEY);
    
    // Collect all images from posts and drafts
    const allImages = [
        ...posts.flatMap(post => post.photos || []),
        ...drafts.flatMap(draft => draft.photos || [])
    ];
    
    if (allImages.length === 0) {
        mediaGrid.innerHTML = '<div class="no-media">No media found</div>';
        return;
    }
    
    mediaGrid.innerHTML = allImages.map((image, index) => `
        <div class="media-item">
            <img src="${image}" alt="Media ${index + 1}">
            <div class="media-overlay">
                <button class="btn btn-secondary" onclick="deleteMedia(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Delete Media
function deleteMedia(index) {
    if (confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
        try {
            const posts = getLocalStorageItem(POSTS_KEY);
            const drafts = getLocalStorageItem(DRAFTS_KEY);
            
            // Remove image from posts
            posts.forEach(post => {
                if (post.photos) {
                    post.photos = post.photos.filter((_, i) => i !== index);
                }
            });
            
            // Remove image from drafts
            drafts.forEach(draft => {
                if (draft.photos) {
                    draft.photos = draft.photos.filter((_, i) => i !== index);
                }
            });
            
            if (setLocalStorageItem(POSTS_KEY, posts) && setLocalStorageItem(DRAFTS_KEY, drafts)) {
                showToast('Media deleted successfully');
                loadMediaLibrary();
            }
        } catch (error) {
            showToast('Error deleting media', 'error');
            console.error('Delete error:', error);
        }
    }
}

// Upload Media
function uploadMedia() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = function(e) {
        const files = Array.from(e.target.files);
        
        // Validate file types and sizes
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        const invalidFiles = files.filter(file => 
            !validTypes.includes(file.type) || file.size > maxSize
        );
        
        if (invalidFiles.length > 0) {
            showToast('Please upload only images (JPEG, PNG, GIF) under 5MB', 'error');
            return;
        }

        const photoPromises = files.map(file => 
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            })
        );

        Promise.all(photoPromises)
            .then(newPhotos => {
                const posts = getLocalStorageItem(POSTS_KEY);
                const drafts = getLocalStorageItem(DRAFTS_KEY);
                
                // Add new photos to a temporary post
                const tempPost = {
                    title: 'Media Library',
                    description: 'Temporary post for media storage',
                    photos: newPhotos,
                    date: new Date().toLocaleDateString(),
                    lastModified: new Date().toISOString()
                };
                
                posts.push(tempPost);
                
                if (setLocalStorageItem(POSTS_KEY, posts)) {
                    showToast('Media uploaded successfully');
                    loadMediaLibrary();
                }
            })
            .catch(error => {
                showToast('Error uploading media', 'error');
                console.error('Upload error:', error);
            });
    };
    
    input.click();
}

// Analytics Functions
function loadAnalytics() {
    try {
        const posts = getLocalStorageItem(POSTS_KEY);
        const analyticsRange = document.getElementById('analyticsRange').value;
        
        // Traffic Overview Chart
        const trafficCtx = document.getElementById('trafficChart');
        if (!trafficCtx) {
            console.error('Traffic chart canvas not found');
            return;
        }

        const dates = Array.from({length: parseInt(analyticsRange)}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toLocaleDateString();
        }).reverse();

        const trafficData = dates.map(date => {
            return posts.reduce((sum, post) => {
                return sum + (post.views?.[date] || 0);
            }, 0);
        });

        // Destroy existing chart if it exists
        if (window.trafficChart) {
            window.trafficChart.destroy();
        }

        window.trafficChart = new Chart(trafficCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Views',
                    data: trafficData,
                    borderColor: '#4CAF50',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // User Engagement Chart
        const engagementCtx = document.getElementById('engagementChart');
        if (!engagementCtx) {
            console.error('Engagement chart canvas not found');
            return;
        }

        const engagementData = {
            views: posts.reduce((sum, post) => sum + (Object.values(post.views || {}).reduce((s, v) => s + v, 0)), 0),
            likes: posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
            comments: posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0)
        };

        // Destroy existing chart if it exists
        if (window.engagementChart) {
            window.engagementChart.destroy();
        }

        window.engagementChart = new Chart(engagementCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Views', 'Likes', 'Comments'],
                datasets: [{
                    data: [engagementData.views, engagementData.likes, engagementData.comments],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });

        // Popular Posts
        const popularPosts = document.getElementById('popularPosts');
        const sortedPosts = [...posts].sort((a, b) => {
            const viewsA = Object.values(a.views || {}).reduce((sum, val) => sum + val, 0);
            const viewsB = Object.values(b.views || {}).reduce((sum, val) => sum + val, 0);
            return viewsB - viewsA;
        }).slice(0, 5);

        popularPosts.innerHTML = sortedPosts.map(post => `
            <div class="popular-post-item">
                <h4>${post.title}</h4>
                <p>${Object.values(post.views || {}).reduce((sum, val) => sum + val, 0)} views</p>
                <small>${post.date}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('Error loading analytics data', 'error');
    }
}

// Add event listener for analytics range change
document.getElementById('analyticsRange').addEventListener('change', loadAnalytics);

// Settings Functions
function loadSettings() {
    // Load profile settings
    const editorName = localStorage.getItem('editor_name') || 'Editor Name';
    const editorEmail = localStorage.getItem('editor_email') || 'editor@example.com';
    
    document.querySelector('#profileForm input[type="text"]').value = editorName;
    document.querySelector('#profileForm input[type="email"]').value = editorEmail;

    // Load notification settings
    const notifications = JSON.parse(localStorage.getItem('notification_settings') || '{}');
    document.querySelectorAll('#notificationForm input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = notifications[checkbox.value] !== false;
    });
}

// Save Settings
document.getElementById('profileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    
    localStorage.setItem('editor_name', name);
    localStorage.setItem('editor_email', email);
    
    showToast('Profile settings saved successfully');
});

document.getElementById('notificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const settings = {};
    this.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        settings[checkbox.value] = checkbox.checked;
    });
    
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    showToast('Notification settings saved successfully');
});

// Form Validation
function validateForm() {
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        showToast('Please enter a title', 'error');
        titleInput.focus();
        return false;
    }

    if (!description) {
        showToast('Please enter post content', 'error');
        descriptionInput.focus();
        return false;
    }

    return true;
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
        showToast('Error saving data. Please check your browser storage settings.', 'error');
        return false;
    }
}

// Save Post
async function savePost(e) {
    e.preventDefault();
    
    if (!validateForm()) return;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const editIndex = editIndexInput.value;
    const isDraft = currentSection === 'drafts';

    try {
        let posts = getLocalStorageItem(isDraft ? DRAFTS_KEY : POSTS_KEY);
        let post = {
            title,
            description,
            date: new Date().toLocaleDateString(),
            lastModified: new Date().toISOString(),
            photos: currentPhotos,
            author: 'Editor',
            likes: [],
            comments: [],
            status: isDraft ? 'draft' : 'published'
        };

        if (photoInput.files && photoInput.files.length > 0) {
            const newPhotos = await Promise.all(
                Array.from(photoInput.files).map(file => 
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = () => reject(new Error('Failed to read file'));
                        reader.readAsDataURL(file);
                    })
                )
            );

            if (editIndex === "-1") {
                post.photos = currentPhotos.length > 0 ? currentPhotos : newPhotos;
                posts.push(post);
            } else {
                const existingPhotos = posts[editIndex].photos || [];
                posts[editIndex] = {
                    ...posts[editIndex],
                    ...post,
                    photos: [...existingPhotos, ...newPhotos]
                };
                if (currentPhotos.length > 0) {
                    posts[editIndex].photos = currentPhotos;
                }
            }
        } else {
            if (editIndex === "-1") {
                post.photos = currentPhotos;
                posts.push(post);
            } else {
                posts[editIndex] = {
                    ...posts[editIndex],
                    ...post,
                    photos: currentPhotos.length > 0 ? currentPhotos : posts[editIndex].photos
                };
            }
        }

        if (setLocalStorageItem(isDraft ? DRAFTS_KEY : POSTS_KEY, posts)) {
            showToast(editIndex === "-1" ? 'Post created successfully!' : 'Post updated successfully!');
            clearForm();
            displayPosts();
        }
    } catch (error) {
        showToast('An error occurred while saving the post', 'error');
        console.error('Save error:', error);
    }
}

// Display Posts
function displayPosts(searchTerm = '') {
    const postList = document.getElementById('postList');
    const posts = getLocalStorageItem(POSTS_KEY);
    
    postList.innerHTML = '';
    
    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredPosts.length === 0) {
        postList.innerHTML = '<div class="no-posts">No posts found</div>';
        return;
    }
    
    filteredPosts.forEach((post, index) => {
        const postDiv = document.createElement('div');
        postDiv.className = 'post-item';
        const photoHTML = post.photos && post.photos.length > 0 
            ? post.photos.map(photo => `<img src="${photo}" alt="Post Image" class="post-image">`).join('')
            : '';
        postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.description}</p>
            ${photoHTML}
            <div class="post-meta">
                <span><i class="fas fa-calendar"></i> ${post.date}</span>
                <span><i class="fas fa-clock"></i> Last modified: ${new Date(post.lastModified).toLocaleString()}</span>
            </div>
            <div class="post-actions">
                <button class="btn btn-primary" onclick="editPost(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary" onclick="deletePost(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        postList.appendChild(postDiv);
    });
}

// Edit Post
function editPost(index) {
    const posts = getLocalStorageItem(POSTS_KEY);
    const post = posts[index];
    
    titleInput.value = post.title;
    descriptionInput.value = post.description;
    editIndexInput.value = index;
    currentPhotos = [...(post.photos || [])];
    
    showSection('new-post');
    previewPhotos(currentPhotos);
    cancelBtn.style.display = 'inline-block';
}

// Delete Post
function deletePost(index) {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        try {
            let posts = getLocalStorageItem(POSTS_KEY);
            posts.splice(index, 1);
            setLocalStorageItem(POSTS_KEY, posts);
            showToast('Post deleted successfully');
            displayPosts(searchInput.value);
        } catch (error) {
            showToast('Error deleting post', 'error');
            console.error('Delete error:', error);
        }
    }
}

// Clear Form
function clearForm() {
    form.reset();
    currentPhotos = [];
    document.getElementById('photoPreview').innerHTML = '';
    editIndexInput.value = '-1';
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
            <img src="${photo}" alt="Preview">
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

// Search Posts
searchInput.addEventListener('input', (e) => {
    displayPosts(e.target.value);
});

// Logout
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    window.location.href = '../editorlog.html';
});

// Event Listeners
form.addEventListener('submit', savePost);
photoInput.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    
    // Validate file types and sizes
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const invalidFiles = files.filter(file => 
        !validTypes.includes(file.type) || file.size > maxSize
    );
    
    if (invalidFiles.length > 0) {
        showToast('Please upload only images (JPEG, PNG, GIF) under 5MB', 'error');
        this.value = ''; // Clear the input
        return;
    }

    const photoPromises = files.map(file => 
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        })
    );

    Promise.all(photoPromises)
        .then(newPhotos => {
            const editIndex = editIndexInput.value;
            if (editIndex !== "-1") {
                currentPhotos = [...currentPhotos, ...newPhotos];
            } else {
                currentPhotos = newPhotos;
            }
            previewPhotos(currentPhotos);
        })
        .catch(error => {
            showToast('Error processing images. Please try again.', 'error');
            console.error('Photo processing error:', error);
            this.value = ''; // Clear the input
        });
});

// Hamburger Menu Functionality
const hamburgerMenu = document.querySelector('.hamburger-menu');
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.sidebar-overlay');

function toggleMenu() {
    hamburgerMenu.classList.toggle('active');
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
    document.body.style.overflow = sidebar.classList.contains('show') ? 'hidden' : '';
}

hamburgerMenu.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);

// Close menu when clicking on a menu item
const menuItems = document.querySelectorAll('.sidebar-menu a');
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleMenu();
        }
    });
});

// Close menu on window resize if open
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar.classList.contains('show')) {
        toggleMenu();
    }
});

// Initialize
checkAuth();
displayPosts();


