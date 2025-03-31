// Constants
const VALID_EDITOR_USERNAME = 'udaytharu';
const VALID_EDITOR_PASSWORD = '123@321!!uday';
const TOKEN_KEY = 'editor_token';
const ROLE_KEY = 'editor_role';
const REMEMBER_ME_KEY = 'remember_me';

// DOM Elements
const form = document.getElementById('editor-form');
const usernameInput = document.getElementById('editor-username');
const passwordInput = document.getElementById('editor-password');
const togglePassword = document.querySelector('.toggle-password');
const rememberMeCheckbox = document.getElementById('remember-me');
const errorElement = document.getElementById('editor-error');

// Check for remembered credentials
document.addEventListener('DOMContentLoaded', () => {
    const rememberedUsername = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberedUsername) {
        usernameInput.value = rememberedUsername;
        rememberMeCheckbox.checked = true;
    }
});

// Toggle password visibility
togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.querySelector('i').classList.toggle('fa-eye');
    this.querySelector('i').classList.toggle('fa-eye-slash');
});

// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

// Validate input
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
    return true;
}

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!validateInput(username, password)) {
        return;
    }

    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        if (username === VALID_EDITOR_USERNAME && password === VALID_EDITOR_PASSWORD) {
            // Generate a token
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

            // Redirect to editor dashboard
            window.location.href = 'editor_page/editor.html';
        } else {
            showError('Invalid username or password');
            // Add shake animation to form
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
    } catch (error) {
        showError('An error occurred. Please try again.');
        console.error('Login error:', error);
    }
});

// Add shake animation CSS
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
`;
document.head.appendChild(style);

