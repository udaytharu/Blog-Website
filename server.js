const express = require('express');
const path = require('path');
const fs = require('fs').promises;
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

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/editor_login_page', express.static(path.join(__dirname, 'editor_login_page')));
app.use('/user_login_page', express.static(path.join(__dirname, 'user_login_page')));

// Helper function to read data
async function readData() {
    try {
        const data = await fs.readFile('posts.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { posts: [], drafts: [], users: [] };
    }
}

// Helper function to write data
async function writeData(data) {
    await fs.writeFile('posts.json', JSON.stringify(data, null, 2));
}

// Serve the main index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to get posts
app.get('/api/posts', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// API to save posts
app.post('/api/posts', async (req, res) => {
    try {
        const data = await readData();
        const post = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        data.posts.push(post);
        await writeData(data);
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// API to get drafts
app.get('/api/drafts', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.drafts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// API to save drafts
app.post('/api/drafts', async (req, res) => {
    try {
        const data = await readData();
        const draft = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        data.drafts.push(draft);
        await writeData(data);
        res.status(201).json(draft);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// API for editor login
app.post('/api/editor/login', async (req, res) => {
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
app.post('/api/user/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const data = await readData();
        let user = data.users.find(u => u.username === username);
        
        if (!user) {
            user = {
                id: Date.now().toString(),
                username,
                joinDate: new Date().toISOString()
            };
            data.users.push(user);
            await writeData(data);
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