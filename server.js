const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Basic security middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Serve static files from the project root and subdirectories
app.use(express.static(path.join(__dirname)));
app.use('/editor_login_page', express.static(path.join(__dirname, 'editor_login_page')));
app.use('/user_login_page', express.static(path.join(__dirname, 'user_login_page')));
app.use('/editor_page', express.static(path.join(__dirname, 'editor_page')));
app.use('/user_page', express.static(path.join(__dirname, 'user_page')));

// In-memory data store (replace with a database in production)
const dataStore = {
    posts: [],
    drafts: [],
    users: new Map()
};

// Serve the main index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to get posts
app.get('/api/posts', (req, res) => {
    try {
        res.json(dataStore.posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// API to save posts
app.post('/api/posts', (req, res) => {
    try {
        const post = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        dataStore.posts.push(post);
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// API to get drafts
app.get('/api/drafts', (req, res) => {
    try {
        res.json(dataStore.drafts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// API to save drafts
app.post('/api/drafts', (req, res) => {
    try {
        const draft = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        dataStore.drafts.push(draft);
        res.status(201).json(draft);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// API for editor login
app.post('/api/editor/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const VALID_EDITOR_USERNAME = 'udaytharu';
        const VALID_EDITOR_PASSWORD = '123@321!!uday';

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username === VALID_EDITOR_USERNAME && password === VALID_EDITOR_PASSWORD) {
            const token = Buffer.from(`${username}-${Date.now()}-${Math.random().toString(36).substr(2)}`).toString('base64');
            res.json({ token, role: 'editor' });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// API for user login
app.post('/api/user/login', (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        let user = dataStore.users.get(username);
        if (!user) {
            user = {
                id: Date.now().toString(),
                username,
                joinDate: new Date().toISOString()
            };
            dataStore.users.set(username, user);
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});