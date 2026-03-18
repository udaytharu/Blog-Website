const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'blog_website';

let db = null;
let client = null;

async function connectToDatabase() {
    try {
        if (!MONGODB_URI) {
            throw new Error('Missing MONGODB_URI in environment');
        }

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB successfully');
        
        db = client.db(DB_NAME);
        return db;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not connected. Call connectToDatabase() first.');
    }
    return db;
}

async function closeDatabase() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

module.exports = {
    connectToDatabase,
    getDatabase,
    closeDatabase
}; 