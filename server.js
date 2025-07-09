const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Import database and models
const { connectToDatabase, getDatabase } = require('./config/database');
const Post = require('./models/Post');
const User = require('./models/User');
const Draft = require('./models/Draft');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

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

// Database connection middleware
app.use(async (req, res, next) => {
    try {
        req.db = getDatabase();
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Serve the main index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to get published posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.findPublished(req.db);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// API to get all posts (for editors)
app.get('/api/posts/all', async (req, res) => {
    try {
        const posts = await Post.findAll(req.db);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching all posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// API to get single post
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.db, req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Increment view count
        await Post.incrementViews(req.db, req.params.id);
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// API to save posts
app.post('/api/posts', async (req, res) => {
    try {
        const postData = {
            ...req.body,
            published: true
        };
        const post = await Post.create(req.db, postData);
        res.status(201).json(post);
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// Edit post
app.put('/api/posts/:id', async (req, res) => {
    try {
        const db = getDatabase();
        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update post' });
    }
});

// API to delete posts
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const result = await Post.delete(req.db, req.params.id);
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// API to get drafts
app.get('/api/drafts', async (req, res) => {
    try {
        const drafts = await Draft.findAll(req.db);
        res.json(drafts);
    } catch (error) {
        console.error('Error fetching drafts:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// API to get drafts by author
app.get('/api/drafts/author/:author', async (req, res) => {
    try {
        const drafts = await Draft.findByAuthor(req.db, req.params.author);
        res.json(drafts);
    } catch (error) {
        console.error('Error fetching drafts:', error);
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// API to get a single draft by ID
app.get('/api/drafts/:id', async (req, res) => {
    try {
        const draft = await Draft.findById(req.db, req.params.id);
        if (!draft) {
            return res.status(404).json({ error: 'Draft not found' });
        }
        res.json(draft);
    } catch (error) {
        console.error('Error fetching draft:', error);
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

// API to save drafts
app.post('/api/drafts', async (req, res) => {
    try {
        const draft = await Draft.create(req.db, req.body);
        res.status(201).json(draft);
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

// Edit draft
app.put('/api/drafts/:id', async (req, res) => {
    try {
        const db = getDatabase();
        const result = await db.collection('drafts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Draft not found' });
        }
        res.json({ message: 'Draft updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update draft' });
    }
});

// API to delete drafts
app.delete('/api/drafts/:id', async (req, res) => {
    try {
        const result = await Draft.delete(req.db, req.params.id);
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Draft not found' });
        }
        res.json({ message: 'Draft deleted successfully' });
    } catch (error) {
        console.error('Error deleting draft:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

// API to publish draft
app.post('/api/drafts/:id/publish', async (req, res) => {
    try {
        const post = await Draft.publishDraft(req.db, req.params.id);
        res.json({ message: 'Draft published successfully', post });
    } catch (error) {
        console.error('Error publishing draft:', error);
        res.status(500).json({ error: 'Failed to publish draft' });
    }
});

// API for editor login
app.post('/api/editor/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const VALID_EDITOR_USERNAME = process.env.EDITOR_USERNAME || 'udaytharu';
        const VALID_EDITOR_PASSWORD = process.env.EDITOR_PASSWORD || '123@321!!uday';

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
        console.error('Editor login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// API for user login
app.post('/api/user/login', async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const user = await User.findOrCreate(req.db, username, email);
        res.json({ user });
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// API to get users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll(req.db);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        // Check if user already exists
        const existingUser = await User.findByUsername(req.db, username) || await User.findByEmail(req.db, email);
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Save user
        const userData = { username, email, password: hashedPassword };
        const user = await User.create(req.db, userData);
        res.status(201).json({ message: 'Registration successful', user: { username: user.username, email: user.email } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        // Find user by username
        const user = await User.findByUsername(req.db, username);
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        // Compare password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        // Optionally update last login
        await User.updateLastLogin(req.db, user._id);
        // Respond with user info (excluding password)
        res.json({ message: 'Login successful', user: { username: user.username, email: user.email } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Image upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const db = getDatabase();
        const image = {
            data: req.file.buffer,
            contentType: req.file.mimetype,
            filename: req.file.originalname,
            uploadedAt: new Date()
        };
        const result = await db.collection('images').insertOne(image);
        res.json({ message: 'Image uploaded!', imageId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Like a post
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const db = getDatabase();
        const { userId, username } = req.body;
        if (!userId || !username) {
            return res.status(400).json({ error: 'userId and username are required' });
        }
        // Check if user already liked the post
        const post = await db.collection('posts').findOne({ _id: new ObjectId(req.params.id) });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        if ((post.likes || []).some(like => like.userId === userId)) {
            return res.status(400).json({ error: 'User has already liked this post' });
        }
        await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $push: { likes: { userId, username, date: new Date() } } }
        );
        res.json({ message: 'Liked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to like post' });
    }
});
// Unlike a post
app.post('/api/posts/:id/unlike', async (req, res) => {
    try {
        const db = getDatabase();
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        // Remove the like from the post's likes array
        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $pull: { likes: { userId } } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Unliked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});
// Comment on a post
app.post('/api/posts/:id/comment', async (req, res) => {
    try {
        const db = getDatabase();
        const { text, author, userId } = req.body;
        if (!text || !author || !userId) {
            return res.status(400).json({ error: 'text, author, and userId are required' });
        }
        const comment = {
            id: new ObjectId().toString(),
            text,
            author,
            userId,
            date: new Date()
        };
        await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $push: { comments: comment } }
        );
        res.json({ message: 'Comment added', comment });
    } catch (error) {
        res.status(500).json({ error: 'Failed to comment' });
    }
});

// Edit a comment on a post (only by the comment's author)
app.put('/api/posts/:postId/comment/:commentId', async (req, res) => {
    try {
        const db = getDatabase();
        const { userId, text } = req.body;
        if (!userId || !text) {
            return res.status(400).json({ error: 'userId and text are required' });
        }
        // Find the post
        const post = await db.collection('posts').findOne({ _id: new ObjectId(req.params.postId) });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Find the comment
        const comment = (post.comments || []).find(c => c.id === req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        // Check if the user is the author
        if (comment.userId !== userId) {
            return res.status(403).json({ error: 'You can only edit your own comment' });
        }
        // Update the comment text
        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.postId), 'comments.id': req.params.commentId },
            { $set: { 'comments.$.text': text, 'comments.$.date': new Date() } }
        );
        if (result.modifiedCount === 0) {
            return res.status(500).json({ error: 'Failed to edit comment' });
        }
        res.json({ message: 'Comment edited' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to edit comment' });
    }
});

// Delete a comment from a post (only by the comment's author)
app.delete('/api/posts/:postId/comment/:commentId', async (req, res) => {
    try {
        const db = getDatabase();
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        // Find the post
        const post = await db.collection('posts').findOne({ _id: new ObjectId(req.params.postId) });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        // Find the comment
        const comment = (post.comments || []).find(c => (c.id === req.params.commentId || c._id?.toString() === req.params.commentId));
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        // Check if the user is the author
        if (comment.userId !== userId) {
            return res.status(403).json({ error: 'You can only delete your own comment' });
        }
        // Remove the comment
        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.postId) },
            { $pull: { comments: { id: req.params.commentId, userId } } }
        );
        if (result.modifiedCount === 0) {
            return res.status(500).json({ error: 'Failed to delete comment' });
        }
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function startServer() {
    try {
        await connectToDatabase();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log('MongoDB integration is active');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

app.use(cors());

startServer();