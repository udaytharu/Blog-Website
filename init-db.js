const { connectToDatabase, getDatabase } = require('./config/database');

async function initializeDatabase() {
    try {
        await connectToDatabase();
        const db = getDatabase();

        // Create collections if they don't exist
        const collections = ['posts', 'drafts', 'users'];
        
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
        await postsCollection.createIndex({ published: 1, createdAt: -1 });
        await postsCollection.createIndex({ author: 1 });
        await postsCollection.createIndex({ tags: 1 });

        const draftsCollection = db.collection('drafts');
        await draftsCollection.createIndex({ author: 1, updatedAt: -1 });

        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });
        await usersCollection.createIndex({ email: 1 });

        console.log('Database initialization completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase(); 