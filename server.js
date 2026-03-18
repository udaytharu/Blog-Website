const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
require('dotenv').config();
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const slugify = require('slugify');

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

app.set('trust proxy', 1);

// Core middleware (order matters)
app.use(morgan('dev'));
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Dynamic blog URLs (simple ID-based route)
app.get('/blog/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog.html'));
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me');
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'session';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function toSlug(input) {
    return slugify(String(input || ''), { lower: true, strict: true, trim: true }) || '';
}

async function ensureUniqueUsername(db, base) {
    let attempt = toSlug(base).replace(/-/g, '') || 'user';
    if (attempt.length < 3) attempt = `user${attempt}`;

    let candidate = attempt;
    for (let i = 0; i < 50; i++) {
        const existing = await db.collection('users').findOne({ username: candidate }, { projection: { _id: 1 } });
        if (!existing) return candidate;
        candidate = `${attempt}${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    return `${attempt}${Date.now().toString().slice(-6)}`;
}

function signAccessToken(user) {
    if (!JWT_SECRET) {
        throw new Error('Missing JWT_SECRET in environment');
    }
    return jwt.sign(
        { sub: user._id.toString(), username: user.username, role: user.role || 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function setAuthCookie(res, token) {
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

function clearAuthCookie(res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    });
}

async function requireAuth(req, res, next) {
    try {
        const tokenFromCookie = req.cookies?.[AUTH_COOKIE_NAME];
        const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
        const token = tokenFromCookie || tokenFromHeader;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(req.db, payload.sub);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

function publicUser(user) {
    if (!user) return null;
    return {
        _id: user._id,
        username: user.username,
        slug: user.slug || user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || '',
        socialLinks: user.socialLinks || {},
        role: user.role || 'user',
        joinDate: user.joinDate,
        lastLogin: user.lastLogin
    };
}

async function createNotification(db, notif) {
    const payload = {
        userId: notif.userId || null,
        username: notif.username || null,
        type: notif.type,
        actorUserId: notif.actorUserId || null,
        actorUsername: notif.actorUsername || null,
        entityType: notif.entityType || null,
        entityId: notif.entityId || null,
        message: notif.message || null,
        isRead: false,
        createdAt: new Date()
    };
    await db.collection('notifications').insertOne(payload);
}

async function notifyUsername(db, receiverUsername, notif) {
    if (!receiverUsername) return;
    if (notif.actorUsername && receiverUsername === notif.actorUsername) return;
    const receiver = await User.findByUsername(db, receiverUsername);
    await createNotification(db, {
        userId: receiver ? receiver._id.toString() : null,
        username: receiverUsername,
        ...notif
    });
}

// Auth: email/password register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body || {};
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, and password are required' });
        }
        const normalizedUsername = toSlug(username).replace(/-/g, '');
        if (normalizedUsername.length < 3) {
            return res.status(400).json({ error: 'username must be at least 3 characters' });
        }

        const existing = await User.findByUsername(req.db, normalizedUsername) || await User.findByEmail(req.db, email);
        if (existing) return res.status(409).json({ error: 'Username or email already exists' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create(req.db, {
            username: normalizedUsername,
            slug: normalizedUsername,
            displayName: username,
            email,
            password: passwordHash
        });
        await User.updateLastLogin(req.db, user._id);

        const token = signAccessToken(user);
        setAuthCookie(res, token);
        return res.status(201).json({ user: publicUser(user) });
    } catch (error) {
        console.error('Auth register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Auth: email/password login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

        const normalizedUsername = toSlug(username).replace(/-/g, '');
        const user = await User.findByUsername(req.db, normalizedUsername);
        if (!user || !user.password) return res.status(401).json({ error: 'Invalid username or password' });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

        await User.updateLastLogin(req.db, user._id);
        const token = signAccessToken(user);
        setAuthCookie(res, token);
        return res.json({ user: publicUser(user) });
    } catch (error) {
        console.error('Auth login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Auth: Google sign-in (ID token)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken } = req.body || {};
        if (!idToken) return res.status(400).json({ error: 'idToken is required' });
        if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google auth not configured' });

        const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload?.email) return res.status(401).json({ error: 'Invalid Google token' });

        const googleId = payload.sub;
        const email = payload.email;
        const displayName = payload.name || (email.split('@')[0] || 'User');
        const avatarUrl = payload.picture || null;

        let user = await User.findByGoogleId(req.db, googleId);
        if (!user) user = await User.findByEmail(req.db, email);

        if (!user) {
            const base = email.split('@')[0] || displayName || 'user';
            const username = await ensureUniqueUsername(req.db, base);
            user = await User.create(req.db, {
                username,
                slug: username,
                displayName,
                email,
                googleId,
                avatarUrl
            });
        } else {
            await User.update(req.db, user._id, {
                googleId: user.googleId || googleId,
                avatarUrl: user.avatarUrl || avatarUrl,
                displayName: user.displayName || displayName
            });
        }

        await User.updateLastLogin(req.db, user._id);
        const token = signAccessToken(user);
        setAuthCookie(res, token);
        return res.json({ user: publicUser(await User.findById(req.db, user._id)) });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body || {};
        if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword are required' });
        if (!req.user.password) return res.status(400).json({ error: 'Password login not enabled for this account' });

        const ok = await bcrypt.compare(oldPassword, req.user.password);
        if (!ok) return res.status(401).json({ error: 'Old password is incorrect' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await User.update(req.db, req.user._id, { password: passwordHash });
        res.json({ ok: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Notifications
app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.user._id.toString();
        const items = await db.collection('notifications')
            .find({ $or: [{ userId }, { username: req.user.username }] })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
        res.json(items);
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

app.post('/api/notifications/mark-read', requireAuth, async (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.user._id.toString();
        const { ids, all } = req.body || {};

        if (all) {
            await db.collection('notifications').updateMany(
                { $or: [{ userId }, { username: req.user.username }] },
                { $set: { isRead: true, seenAt: new Date() } }
            );
            return res.json({ ok: true });
        }

        const idList = Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : [];
        if (idList.length === 0) return res.json({ ok: true });

        await db.collection('notifications').updateMany(
            { _id: { $in: idList.map(id => new ObjectId(id)) }, $or: [{ userId }, { username: req.user.username }] },
            { $set: { isRead: true, seenAt: new Date() } }
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('Notifications mark-read error:', error);
        res.status(500).json({ error: 'Failed to mark notifications read' });
    }
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

// Search blogs and users
app.get('/api/search', async (req, res) => {
    try {
        const db = getDatabase();
        const qRaw = String(req.query.q || '').trim();
        const type = String(req.query.type || 'all');
        if (!qRaw) return res.json({ blogs: [], users: [] });

        const q = qRaw.slice(0, 80);
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

        const result = { blogs: [], users: [] };

        if (type === 'all' || type === 'blogs') {
            const blogs = await db.collection('posts')
                .find({
                    published: true,
                    $or: [
                        { title: { $regex: regex } },
                        { content: { $regex: regex } },
                        { excerpt: { $regex: regex } },
                        { tags: { $elemMatch: { $regex: regex } } }
                    ]
                })
                .sort({ createdAt: -1 })
                .limit(20)
                .project({ title: 1, excerpt: 1, author: 1, createdAt: 1, views: 1, likeCount: 1, commentCount: 1 })
                .toArray();
            result.blogs = blogs;
        }

        if (type === 'all' || type === 'users') {
            const users = await db.collection('users')
                .find({
                    $or: [
                        { username: { $regex: regex } },
                        { displayName: { $regex: regex } },
                        { bio: { $regex: regex } }
                    ]
                })
                .sort({ joinDate: -1 })
                .limit(20)
                .project({ username: 1, slug: 1, displayName: 1, avatarUrl: 1, bio: 1, joinDate: 1 })
                .toArray();
            result.users = users;
        }

        res.json(result);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
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

// Public profile (by slug or ObjectId)
app.get('/api/users/:slugOrId', async (req, res) => {
    try {
        const { slugOrId } = req.params;
        const isObjectId = /^[a-fA-F0-9]{24}$/.test(slugOrId);
        const user = isObjectId ? await User.findById(req.db, slugOrId) : await User.findBySlug(req.db, slugOrId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const blogs = await req.db.collection('posts')
            .find({ author: user.username, published: true })
            .sort({ createdAt: -1 })
            .project({ title: 1, createdAt: 1, updatedAt: 1, views: 1, tags: 1, photos: 1 })
            .toArray();

        res.json({
            user: {
                _id: user._id,
                username: user.username,
                slug: user.slug || user.username,
                displayName: user.displayName || user.username,
                avatarUrl: user.avatarUrl || null,
                bio: user.bio || '',
                socialLinks: user.socialLinks || {},
                joinDate: user.joinDate
            },
            blogs
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Current user's profile
app.get('/api/users/me', requireAuth, async (req, res) => {
    res.json({ user: publicUser(req.user) });
});

// Update current user's profile
app.put('/api/users/me', requireAuth, async (req, res) => {
    try {
        const { username, displayName, bio, avatarUrl, socialLinks } = req.body || {};
        const update = {};

        if (typeof displayName === 'string') update.displayName = displayName.trim().slice(0, 60);
        if (typeof bio === 'string') update.bio = bio.trim().slice(0, 300);
        if (typeof avatarUrl === 'string') update.avatarUrl = avatarUrl.trim().slice(0, 400);
        if (socialLinks && typeof socialLinks === 'object') update.socialLinks = socialLinks;

        if (typeof username === 'string' && username.trim()) {
            const nextUsername = toSlug(username).replace(/-/g, '');
            if (nextUsername.length < 3) return res.status(400).json({ error: 'username must be at least 3 characters' });
            if (nextUsername !== req.user.username) {
                const existing = await User.findByUsername(req.db, nextUsername);
                if (existing) return res.status(409).json({ error: 'Username already taken' });
                update.username = nextUsername;
                update.slug = nextUsername;
            }
        }

        if (Object.keys(update).length === 0) return res.json({ user: publicUser(req.user) });

        await User.update(req.db, req.user._id, update);
        const refreshed = await User.findById(req.db, req.user._id);
        res.json({ user: publicUser(refreshed) });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        // Legacy endpoint: forward to /api/auth/register
        const { username, email, password } = req.body || {};
        req.url = '/api/auth/register';
        req.body = { username, email, password };
        return app._router.handle(req, res, () => {});
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    try {
        // Legacy endpoint: forward to /api/auth/login
        const { username, password } = req.body || {};
        req.url = '/api/auth/login';
        req.body = { username, password };
        return app._router.handle(req, res, () => {});
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
            { $push: { likes: { userId, username, date: new Date() } }, $inc: { likeCount: 1 } }
        );

        if (post.author) {
            await notifyUsername(db, post.author, {
                type: 'like',
                actorUserId: userId,
                actorUsername: username,
                entityType: 'post',
                entityId: req.params.id,
                message: `${username} liked your post "${post.title || 'Untitled'}"`
            });
        }
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
            { $pull: { likes: { userId } }, $inc: { likeCount: -1 } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Unliked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike post' });
    }
});

// Get likes summary for a post
app.get('/api/posts/:id/likes', async (req, res) => {
    try {
        const db = getDatabase();
        const post = await db.collection('posts').findOne(
            { _id: new ObjectId(req.params.id) },
            { projection: { likes: 1, likeCount: 1 } }
        );
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json({ likeCount: post.likeCount || (post.likes || []).length, likes: post.likes || [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch likes' });
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
            date: new Date(),
            replies: []
        };
        await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $push: { comments: comment }, $inc: { commentCount: 1 } }
        );

        const post = await db.collection('posts').findOne({ _id: new ObjectId(req.params.id) }, { projection: { author: 1, title: 1 } });
        if (post?.author) {
            await notifyUsername(db, post.author, {
                type: 'comment',
                actorUserId: userId,
                actorUsername: author,
                entityType: 'post',
                entityId: req.params.id,
                message: `${author} commented on your post "${post.title || 'Untitled'}"`
            });
        }
        res.json({ message: 'Comment added', comment });
    } catch (error) {
        res.status(500).json({ error: 'Failed to comment' });
    }
});

// Reply to a comment (nested)
app.post('/api/posts/:postId/comment/:commentId/reply', async (req, res) => {
    try {
        const db = getDatabase();
        const { text, author, userId } = req.body;
        if (!text || !author || !userId) {
            return res.status(400).json({ error: 'text, author, and userId are required' });
        }

        const reply = {
            id: new ObjectId().toString(),
            text,
            author,
            userId,
            date: new Date()
        };

        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(req.params.postId), 'comments.id': req.params.commentId },
            { $push: { 'comments.$.replies': reply }, $inc: { commentCount: 1 } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Post or comment not found' });
        }

        const post = await db.collection('posts').findOne({ _id: new ObjectId(req.params.postId) }, { projection: { author: 1, title: 1 } });
        if (post?.author) {
            await notifyUsername(db, post.author, {
                type: 'reply',
                actorUserId: userId,
                actorUsername: author,
                entityType: 'comment',
                entityId: req.params.commentId,
                message: `${author} replied to a comment on "${post.title || 'Untitled'}"`
            });
        }
        res.json({ message: 'Reply added', reply });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reply' });
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
            { $pull: { comments: { id: req.params.commentId, userId } }, $inc: { commentCount: -1 } }
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

startServer();