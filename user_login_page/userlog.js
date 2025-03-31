function login() {
    const username = document.getElementById('username').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    if (username) {
        // Create user object with unique ID
        const user = {
            id: Date.now().toString(),
            username: username,
            joinDate: new Date().toISOString()
        };

        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Initialize posts array if it doesn't exist
        if (!localStorage.getItem('posts')) {
            localStorage.setItem('posts', JSON.stringify([]));
        }

        // Redirect to user page
        window.location.href = 'user_page/user.html';
    } else {
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 3000);
    }
}

// Check if Enter key is pressed
document.getElementById('username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});

// Clear username on page load (optional)
localStorage.removeItem('username');