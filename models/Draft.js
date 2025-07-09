const { ObjectId } = require('mongodb');

class Draft {
    constructor(data) {
        this._id = data._id || new ObjectId();
        this.title = data.title;
        this.content = data.content;
        this.author = data.author;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.isDraft = true;
        this.tags = data.tags || [];
    }

    static async create(db, draftData) {
        const draft = new Draft(draftData);
        const result = await db.collection('drafts').insertOne(draft);
        return { ...draft, _id: result.insertedId };
    }

    static async findById(db, id) {
        return await db.collection('drafts').findOne({ _id: new ObjectId(id) });
    }

    static async findAll(db, filter = {}) {
        return await db.collection('drafts').find(filter).sort({ updatedAt: -1 }).toArray();
    }

    static async findByAuthor(db, author) {
        return await db.collection('drafts').find({ author }).sort({ updatedAt: -1 }).toArray();
    }

    static async update(db, id, updateData) {
        updateData.updatedAt = new Date();
        const result = await db.collection('drafts').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        return result;
    }

    static async delete(db, id) {
        return await db.collection('drafts').deleteOne({ _id: new ObjectId(id) });
    }

    static async publishDraft(db, draftId) {
        const draft = await this.findById(db, draftId);
        if (!draft) {
            throw new Error('Draft not found');
        }

        // Create a new post from the draft
        const Post = require('./Post');
        const postData = {
            title: draft.title,
            content: draft.content,
            author: draft.author,
            tags: draft.tags,
            published: true
        };

        const post = await Post.create(db, postData);
        
        // Delete the draft
        await this.delete(db, draftId);
        
        return post;
    }
}

module.exports = Draft; 