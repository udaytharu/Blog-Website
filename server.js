const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const VALID_EDITOR_USERNAME = process.env.EDITOR_USERNAME;
const VALID_EDITOR_PASSWORD = process.env.EDITOR_PASSWORD;

let db;

// Connect to MongoDB
async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db('blogDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}
connectDB();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(compression());
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
app.use('/editor_page', express.static(path.join(__dirname, 'editor_page')));
app.use('/user_page', express.static(path.join(__dirname, 'user_page')));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to get posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await db.collection('posts').find().toArray();
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// API to save posts
app.post('/api/posts', async (req, res) => {
    try {
        const post = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        await db.collection('posts').insertOne(post);
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// API to get drafts
app.get('/api/drafts', async (req, res) => {
    try {
        const drafts = await db.collection('drafts').find().toArray();
        res.json(drafts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// API to save drafts
app.post('/api/drafts', async (req, res) => {
    try {
        const draft = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        await db.collection('drafts').insertOne(draft);
        res.status(201).json(draft);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// API for editor login
app.post('/api/editor/login', (req, res) => {
    try {
        const { username, password } = req.body;
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
        let user = await db.collection('users').findOne({ username });
        if (!user) {
            user = {
                id: Date.now().toString(),
                username,
                joinDate: new Date().toISOString()
            };
            await db.collection('users').insertOne(user);
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