

// Hardcoded editor credentials
const VALID_EDITOR_USERNAME = 'udaytharu';
const VALID_EDITOR_PASSWORD = '123@321!!uday';


// Editor Authentication (Hardcoded)
document.getElementById('editor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('editor-username').value;
    const password = document.getElementById('editor-password').value;

    if (username === VALID_EDITOR_USERNAME && password === VALID_EDITOR_PASSWORD) {
        const mockToken = 'editor-token-udaytharu';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('role', 'editor');
        window.location.href = 'editor_page/editor.html';
    } else {
        showError('editor-error', 'Invalid username or password');
    }
});

