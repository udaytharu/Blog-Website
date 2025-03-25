function login() {
    const username = document.getElementById('username').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    if (username) {
        // Store username in localStorage
        localStorage.setItem('username', username);
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