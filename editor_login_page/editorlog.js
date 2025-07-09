// Constants
const VALID_EDITOR_USERNAME = 'udaytharu';
const VALID_EDITOR_PASSWORD = '123@321!!uday';
const TOKEN_KEY = 'editor_token';
const ROLE_KEY = 'editor_role';
const REMEMBER_ME_KEY = 'remember_me';
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// DOM Elements
const form = document.getElementById('editor-form');
const usernameInput = document.getElementById('editor-username');
const passwordInput = document.getElementById('editor-password');
const togglePassword = document.querySelector('.toggle-password');
const rememberMeCheckbox = document.getElementById('remember-me');
const errorElement = document.getElementById('editor-error');
const submitButton = document.querySelector('button[type="submit"]');

// State management
let loginAttempts = parseInt(localStorage.getItem('login_attempts') || '0');
let lockoutEndTime = parseInt(localStorage.getItem('lockout_end_time') || '0');

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

// Check for remembered credentials and lockout status
document.addEventListener('DOMContentLoaded', () => {
    const rememberedUsername = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberedUsername) {
        usernameInput.value = rememberedUsername;
        rememberMeCheckbox.checked = true;
    }

    checkLockoutStatus();
});

// Check if user is locked out
function checkLockoutStatus() {
    const now = Date.now();
    if (now < lockoutEndTime) {
        const remainingTime = Math.ceil((lockoutEndTime - now) / 1000 / 60);
        disableForm(`Account is locked. Please try again in ${remainingTime} minutes.`);
        setTimeout(checkLockoutStatus, 60000); // Check every minute
    } else {
        enableForm();
        loginAttempts = 0;
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('lockout_end_time');
    }
}

// Disable form during lockout
function disableForm(message) {
    form.classList.add('disabled');
    submitButton.disabled = true;
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    showError(message);
}

// Enable form
function enableForm() {
    form.classList.remove('disabled');
    submitButton.disabled = false;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    errorElement.style.display = 'none';
}

// Toggle password visibility with debounce
togglePassword.addEventListener('click', debounce(function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-lock');
    this.classList.toggle('fa-lock-open');
}, 300));

// Show error message with animation
function showError(message, type = 'error') {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.classList.add('fade-in');
    if (type === 'success') {
        errorElement.style.color = '#4CAF50'; // green
    } else {
        errorElement.style.color = '#e74c3c'; // red
    }
    setTimeout(() => {
        errorElement.classList.remove('fade-in');
    }, 500);
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

// Validate input with enhanced checks
function validateInput(username, password) {
    if (!username || !password) {
        showError('Please fill in all fields');
        return false;
    }
    if (username.length < 3) {
        showError('Username must be at least 3 characters long');
        return false;
    }
    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('Username can only contain letters, numbers, and underscores');
        return false;
    }
    return true;
}

// Handle form submission with enhanced security
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!validateInput(username, password)) {
        return;
    }

    // Check lockout status before proceeding
    if (Date.now() < lockoutEndTime) {
        checkLockoutStatus();
        return;
    }

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        if (username === VALID_EDITOR_USERNAME && password === VALID_EDITOR_PASSWORD) {
            // Reset login attempts on successful login
            loginAttempts = 0;
            localStorage.removeItem('login_attempts');
            localStorage.removeItem('lockout_end_time');

            // Generate a secure token
            const token = btoa(`${username}-${Date.now()}-${Math.random().toString(36).substr(2)}`);
            
            // Store authentication data
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(ROLE_KEY, 'editor');

            // Handle remember me
            if (rememberMeCheckbox.checked) {
                localStorage.setItem(REMEMBER_ME_KEY, username);
            } else {
                localStorage.removeItem(REMEMBER_ME_KEY);
            }

            // Show success message before redirect
            showError('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'editor_page/editor.html';
            }, 1000);
        } else {
            // Increment login attempts
            loginAttempts++;
            localStorage.setItem('login_attempts', loginAttempts.toString());

            if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                lockoutEndTime = Date.now() + LOCKOUT_DURATION;
                localStorage.setItem('lockout_end_time', lockoutEndTime.toString());
                disableForm(`Too many failed attempts. Account locked for 15 minutes.`);
            } else {
                showError(`Invalid username or password. ${MAX_LOGIN_ATTEMPTS - loginAttempts} attempts remaining.`);
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
            }
        }
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Login error:', error);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Login';
    }
});

// Add enhanced animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    .disabled {
        opacity: 0.7;
        pointer-events: none;
    }
    button:disabled {
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

