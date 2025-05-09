// Constants
const USER_KEY = 'currentUser';
const POSTS_KEY = 'posts';
const MAX_USERNAME_LENGTH = 20;
const MIN_USERNAME_LENGTH = 3;

// DOM Elements
const form = document.getElementById('user-form');
const usernameInput = document.getElementById('username');
const errorMsg = document.getElementById('errorMsg');
const submitButton = document.querySelector('button[type="submit"]');

// Utility functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Show error message with animation
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    errorMsg.classList.add('fade-in');
    
    // Remove fade-in class after animation
    setTimeout(() => {
        errorMsg.classList.remove('fade-in');
    }, 500);

    // Hide error after 3 seconds
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 3000);
}

// Validate username
function validateUsername(username) {
    if (!username) {
        showError('Please enter a username');
        return false;
    }
    if (username.length < MIN_USERNAME_LENGTH) {
        showError(`Username must be at least ${MIN_USERNAME_LENGTH} characters long`);
        return false;
    }
    if (username.length > MAX_USERNAME_LENGTH) {
        showError(`Username must be no more than ${MAX_USERNAME_LENGTH} characters long`);
        return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('Username can only contain letters, numbers, and underscores');
        return false;
    }
    return true;
}

// Handle login
async function login() {
    const username = usernameInput.value.trim();

    if (!validateUsername(username)) {
        return;
    }

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create user object with unique ID and additional metadata
        const user = {
            id: Date.now().toString(),
            username: username,
            joinDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
                theme: 'light',
                notifications: true
            }
        };

        // Store user data in localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        // Initialize posts array if it doesn't exist
        if (!localStorage.getItem(POSTS_KEY)) {
            localStorage.setItem(POSTS_KEY, JSON.stringify([]));
        }

        // Show success message before redirect
        showError('Login successful! Redirecting...');
        setTimeout(() => {
            window.location.href = 'user_page/user.html';
        }, 1000);
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Login error:', error);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Login';
    }
}

// Event Listeners
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
}

// Handle Enter key press with debounce
usernameInput.addEventListener('keypress', debounce((e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        login();
    }
}, 300));

// Real-time username validation
usernameInput.addEventListener('input', debounce(() => {
    const username = usernameInput.value.trim();
    if (username) {
        validateUsername(username);
    }
}, 500));

// Add enhanced animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    button:disabled {
        cursor: not-allowed;
        opacity: 0.7;
    }
    #errorMsg {
        transition: all 0.3s ease-in-out;
    }
`;
document.head.appendChild(style);

// Clear any existing user data on page load
window.addEventListener('load', () => {
    localStorage.removeItem(USER_KEY);
    usernameInput.focus();
});
localStorage.removeItem('username');