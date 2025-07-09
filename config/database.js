const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://udaytharu813:GtGDshYkHsCGaA4p@clusterblog.wkt8a4g.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'blog_website';

let db = null;

async function connectToDatabase() {
    try {
        const client = new MongoClient(MONGODB_URI);
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

module.exports = {
    connectToDatabase,
    getDatabase
}; 