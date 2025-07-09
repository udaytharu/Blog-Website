const { ObjectId } = require('mongodb');

class Post {
    constructor(data) {
        this._id = data._id || new ObjectId();
        this.title = data.title;
        this.content = data.content;
        this.author = data.author;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.published = data.published || false;
        this.tags = data.tags || [];
        this.views = data.views || 0;
        this.photos = data.photos || [];
    }

    static async create(db, postData) {
        const post = new Post(postData);
        const result = await db.collection('posts').insertOne(post);
        return { ...post, _id: result.insertedId };
    }

    static async findById(db, id) {
        return await db.collection('posts').findOne({ _id: new ObjectId(id) });
    }

    static async findAll(db, filter = {}) {
        return await db.collection('posts').find(filter).sort({ createdAt: -1 }).toArray();
    }

    static async findPublished(db) {
        return await db.collection('posts').find({ published: true }).sort({ createdAt: -1 }).toArray();
    }

    static async update(db, id, updateData) {
        updateData.updatedAt = new Date();
        const result = await db.collection('posts').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        return result;
    }

    static async delete(db, id) {
        return await db.collection('posts').deleteOne({ _id: new ObjectId(id) });
    }

    static async incrementViews(db, id) {
        return await db.collection('posts').updateOne(
            { _id: new ObjectId(id) },
            { $inc: { views: 1 } }
        );
    }
}

module.exports = Post; 