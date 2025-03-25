let currentPhotos = []; // Track photos in memory for preview and deletion

function savePost() {
    const title = document.getElementById('postTitle').value;
    const description = document.getElementById('postDescription').value;
    const photoInput = document.getElementById('postPhotos');
    const editIndex = document.getElementById('editIndex').value;

    if (title && description) {
        let posts = JSON.parse(localStorage.getItem('posts') || '[]');
        let post = {
            title: title,
            description: description,
            date: new Date().toLocaleDateString(),
            likes: 0,
            likedByUser: false,
            comments: [],
            photos: []
        };

        // Handle photo uploads
        if (photoInput.files && photoInput.files.length > 0) {
            const files = Array.from(photoInput.files);
            const photoPromises = files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(photoPromises).then(newPhotos => {
                if (editIndex === "-1") {
                    // New post: use currentPhotos (may include deletions)
                    post.photos = currentPhotos.length > 0 ? currentPhotos : newPhotos;
                    posts.push(post);
                    alert('Post created successfully!');
                } else {
                    // Edit post: append new photos to existing ones, then apply deletions
                    const existingPhotos = posts[editIndex].photos || [];
                    posts[editIndex] = {
                        ...posts[editIndex],
                        title: title,
                        description: description,
                        date: new Date().toLocaleDateString(),
                        photos: [...existingPhotos, ...newPhotos] // Append new photos
                    };
                    // If currentPhotos is updated (deletions occurred), use it
                    if (currentPhotos.length > 0) {
                        posts[editIndex].photos = currentPhotos;
                    }
                    alert('Post updated successfully!');
                    cancelEdit();
                }

                localStorage.setItem('posts', JSON.stringify(posts));
                clearForm();
                displayPosts();
            });
        } else {
            // No new photos uploaded
            if (editIndex === "-1") {
                post.photos = currentPhotos; // Use currentPhotos if any were previewed
                posts.push(post);
                alert('Post created successfully!');
            } else {
                posts[editIndex] = {
                    ...posts[editIndex],
                    title: title,
                    description: description,
                    date: new Date().toLocaleDateString(),
                    photos: currentPhotos.length > 0 ? currentPhotos : posts[editIndex].photos // Apply deletions
                };
                alert('Post updated successfully!');
                cancelEdit();
            }

            localStorage.setItem('posts', JSON.stringify(posts));
            clearForm();
            displayPosts();
        }
    } else {
        alert('Please fill in both title and description');
    }
}

function displayPosts() {
    const postList = document.getElementById('postList');
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    
    postList.innerHTML = '';
    
    posts.forEach((post, index) => {
        const postDiv = document.createElement('div');
        postDiv.className = 'post-item';
        const photoHTML = post.photos && post.photos.length > 0 
            ? post.photos.map(photo => `<img src="${photo}" alt="Post Image" class="post-image">`).join('')
            : '';
        postDiv.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.description}</p>
            ${photoHTML}
            <p>Date: ${post.date}</p>
            <button class="edit-btn" onclick="editPost(${index})">Edit</button>
            <button class="delete-btn" onclick="deletePost(${index})">Delete</button>
        `;
        postList.appendChild(postDiv);
    });
}

function editPost(index) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const post = posts[index];
    
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postDescription').value = post.description;
    document.getElementById('editIndex').value = index;
    document.getElementById('formTitle').textContent = 'Edit Post';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    // Initialize currentPhotos with existing photos
    currentPhotos = [...(post.photos || [])];
    previewPhotos(currentPhotos);
}

function deletePost(index) {
    if (confirm('Are you sure you want to delete this post?')) {
        let posts = JSON.parse(localStorage.getItem('posts') || '[]');
        posts.splice(index, 1);
        localStorage.setItem('posts', JSON.stringify(posts));
        displayPosts();
    }
}

function clearForm() {
    document.getElementById('postTitle').value = '';
    document.getElementById('postDescription').value = '';
    document.getElementById('postPhotos').value = '';
    document.getElementById('photoPreview').innerHTML = '';
    currentPhotos = []; // Reset currentPhotos
}

function cancelEdit() {
    clearForm();
    document.getElementById('editIndex').value = '-1';
    document.getElementById('formTitle').textContent = 'Create New Post';
    document.getElementById('cancelBtn').style.display = 'none';
}

// Preview photos when selected
document.getElementById('postPhotos').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const photoPromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    });

    Promise.all(photoPromises).then(newPhotos => {
        const editIndex = document.getElementById('editIndex').value;
        if (editIndex !== "-1") {
            // During edit, append new photos to currentPhotos
            currentPhotos = [...currentPhotos, ...newPhotos];
        } else {
            currentPhotos = newPhotos;
        }
        previewPhotos(currentPhotos);
    });
});

function previewPhotos(photos) {
    const previewContainer = document.getElementById('photoPreview');
    previewContainer.innerHTML = photos.map((photo, index) => `
        <div class="preview-item">
            <img src="${photo}" alt="Preview" class="preview-image">
            <button class="delete-photo-btn" onclick="deletePhoto(${index})">Delete</button>
        </div>
    `).join('');
}

function deletePhoto(index) {
    currentPhotos.splice(index, 1); // Remove the photo at the given index
    previewPhotos(currentPhotos); // Re-render preview
}

displayPosts();