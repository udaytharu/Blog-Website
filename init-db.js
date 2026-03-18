const { connectToDatabase, getDatabase } = require('./config/database');

async function initializeDatabase() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        async function safeCreateIndex(collection, keys, options) {
            try {
                await collection.createIndex(keys, options);
            } catch (error) {
                // ignore conflicts when an equivalent index already exists
                if (error && (error.code === 85 || error.codeName === 'IndexOptionsConflict')) {
                    return;
                }
                throw error;
            }
        }

        // Create collections if they don't exist
        const collections = ['posts', 'drafts', 'users', 'notifications'];
        
        for (const collectionName of collections) {
            try {
                await db.createCollection(collectionName);
                console.log(`Collection '${collectionName}' created successfully`);
            } catch (error) {
                if (error.code === 48) { // Collection already exists
                    console.log(`Collection '${collectionName}' already exists`);
                } else {
                    console.error(`Error creating collection '${collectionName}':`, error);
                }
            }
        }

        // Create indexes for better performance
        const postsCollection = db.collection('posts');
        await safeCreateIndex(postsCollection, { published: 1, createdAt: -1 });
        await safeCreateIndex(postsCollection, { author: 1 });
        await safeCreateIndex(postsCollection, { tags: 1 });
        await safeCreateIndex(postsCollection, { title: 'text', content: 'text', excerpt: 'text', tags: 'text' });

        const draftsCollection = db.collection('drafts');
        await safeCreateIndex(draftsCollection, { author: 1, updatedAt: -1 });

        const usersCollection = db.collection('users');
        await safeCreateIndex(usersCollection, { username: 1 }, { unique: true });
        await safeCreateIndex(usersCollection, { slug: 1 });
        await safeCreateIndex(usersCollection, { email: 1 });
        await safeCreateIndex(usersCollection, { username: 'text', displayName: 'text', bio: 'text' });

        const notificationsCollection = db.collection('notifications');
        await safeCreateIndex(notificationsCollection, { userId: 1, createdAt: -1 });
        await safeCreateIndex(notificationsCollection, { userId: 1, isRead: 1, createdAt: -1 });

        console.log('Database initialization completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase(); 