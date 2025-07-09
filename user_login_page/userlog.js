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

// Update login to use backend
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-errorMsg');
    errorMsg.style.display = 'none';

    if (!username || !password) {
        showLoginError('Please enter your username and password');
        return;
    }
    try {
        const btn = document.querySelector('#login-form button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
            showLoginError(data.error || 'Login failed.');
        } else {
            errorMsg.style.display = 'block';
            errorMsg.style.color = '#28a745';
            errorMsg.querySelector('span').textContent = 'Login successful! Redirecting...';
            setTimeout(() => {
                window.location.href = 'user_page/user.html';
            }, 1000);
        }
    } catch (err) {
        showLoginError('Network error. Please try again.');
    } finally {
        const btn = document.querySelector('#login-form button[type="submit"]');
        btn.disabled = false;
        btn.innerHTML = '<span>Login</span> <i class="fas fa-arrow-right"></i>';
    }
}

function showLoginError(message) {
    const errorMsg = document.getElementById('login-errorMsg');
    errorMsg.style.display = 'block';
    errorMsg.style.color = '#dc3545';
    errorMsg.querySelector('span').textContent = message;
}

// Registration handler
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const errorMsg = document.getElementById('register-errorMsg');

    // Hide error initially
    errorMsg.style.display = 'none';

    if (!username || !email || !password || !confirmPassword) {
        showRegisterError('All fields are required.');
        return;
    }
    if (!validateEmail(email)) {
        showRegisterError('Please enter a valid email address.');
        return;
    }
    if (password !== confirmPassword) {
        showRegisterError('Passwords do not match.');
        return;
    }
    if (password.length < 6) {
        showRegisterError('Password must be at least 6 characters.');
        return;
    }
    try {
        const btn = document.querySelector('#register-form button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            showRegisterError(data.error || 'Registration failed.');
        } else {
            errorMsg.style.display = 'block';
            errorMsg.style.color = '#28a745';
            errorMsg.querySelector('span').textContent = 'Registration successful! You can now log in.';
            setTimeout(() => {
                showLoginForm();
                errorMsg.style.display = 'none';
                errorMsg.style.color = '';
            }, 1500);
        }
    } catch (err) {
        showRegisterError('Network error. Please try again.');
    } finally {
        const btn = document.querySelector('#register-form button[type="submit"]');
        btn.disabled = false;
        btn.innerHTML = '<span>Register</span> <i class="fas fa-arrow-right"></i>';
    }
}

function showRegisterError(message) {
    const errorMsg = document.getElementById('register-errorMsg');
    errorMsg.style.display = 'block';
    errorMsg.style.color = '#dc3545';
    errorMsg.querySelector('span').textContent = message;
}

function validateEmail(email) {
    // Simple email validation regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function togglePassword(inputId, el) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        el.classList.remove('fa-lock');
        el.classList.add('fa-lock-open');
    } else {
        input.type = 'password';
        el.classList.remove('fa-lock-open');
        el.classList.add('fa-lock');
    }
}