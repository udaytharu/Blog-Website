function displayPosts() {
    const postsContainer = document.getElementById('postsContainer');
    let posts = JSON.parse(localStorage.getItem('posts') || '[]');
    
    // Ensure all posts have required fields
    posts = posts.map(post => ({
        ...post,
        likes: post.likes || 0,
        likedByUser: post.likedByUser || false,
        comments: post.comments || [] // Comments: { id, text, username }
    }));
    
    postsContainer.innerHTML = '';
    
    const currentUser = localStorage.getItem('username') || 'Anonymous';
    
    posts.forEach((post, index) => {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        const likeButtonTitle = post.likedByUser ? `Liked by ${currentUser}` : '';
        
        // Add photo rendering logic
        const photoHTML = post.photos && post.photos.length > 0 
            ? post.photos.map(photo => `<img src="${photo}" alt="Post Image" class="post-image">`).join('')
            : '';
        
        postElement.innerHTML = `
            <h2 class="post-title">${post.title}</h2>
            <div class="post-date">Posted on: ${post.date}</div>
            <div class="post-content">${post.description}</div>
            ${photoHTML} <!-- Insert photos here -->
            <div class="interaction-bar">
                <button class="like-btn ${post.likedByUser ? 'liked' : ''}" 
                        onclick="toggleLike(${index})" 
                        title="${likeButtonTitle}">
                    ${post.likedByUser ? 'Unlike' : 'Like'} (${post.likes})
                </button>
            </div>
            <div class="comment-section">
                <h3>Comments:</h3>
                <div id="comments-${index}">
                    ${post.comments.map(comment => `
                        <div class="comment">
                            ${comment.username}: ${comment.text}
                            ${comment.username === currentUser ? 
                                `<button class="delete-comment-btn" onclick="deleteComment(${index}, '${comment.id}')">Delete</button>` 
                                : ''}
                        </div>
                    `).join('')}
                </div>
                <textarea class="comment-input" id="comment-input-${index}" 
                        placeholder="Add a comment..."></textarea>
                <button class="comment-btn" onclick="addComment(${index})">Comment</button>
            </div>
        `;
        postsContainer.appendChild(postElement);
    });
    
    localStorage.setItem('posts', JSON.stringify(posts));
}

function toggleLike(index) {
    let posts = JSON.parse(localStorage.getItem('posts') || '[]');
    if (!posts[index].likedByUser) {
        posts[index].likes += 1;
        posts[index].likedByUser = true;
    } else {
        posts[index].likes -= 1;
        posts[index].likedByUser = false;
    }
    localStorage.setItem('posts', JSON.stringify(posts));
    displayPosts();
}

function addComment(index) {
    const commentInput = document.getElementById(`comment-input-${index}`);
    const commentText = commentInput.value.trim();
    const currentUser = localStorage.getItem('username') || 'Anonymous';
    
    if (commentText) {
        let posts = JSON.parse(localStorage.getItem('posts') || '[]');
        posts[index].comments = posts[index].comments || [];
        const commentId = Date.now().toString(); // Unique ID
        posts[index].comments.push({ id: commentId, text: commentText, username: currentUser });
        localStorage.setItem('posts', JSON.stringify(posts));
        commentInput.value = '';
        displayPosts();
    }
}

function deleteComment(postIndex, commentId) {
    let posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const currentUser = localStorage.getItem('username') || 'Anonymous';
    
    // Only delete if the comment belongs to the current user
    const commentToDelete = posts[postIndex].comments.find(comment => comment.id === commentId);
    if (commentToDelete && commentToDelete.username === currentUser) {
        posts[postIndex].comments = posts[postIndex].comments.filter(comment => 
            comment.id !== commentId
        );
        localStorage.setItem('posts', JSON.stringify(posts));
        displayPosts();
    } else {
        console.log('You can only delete your own comments.');
        // Optionally, alert the user: alert('You can only delete your own comments.');
    }
}

// Initial display of posts when the page loads
window.onload = function() {
    displayPosts();
};