const { ObjectId } = require('mongodb');

class User {
    constructor(data) {
        this._id = data._id || new ObjectId();
        this.username = data.username;
        this.email = data.email;
        this.password = data.password; // Save password (hashed)
        this.joinDate = data.joinDate || new Date();
        this.lastLogin = data.lastLogin || new Date();
        this.role = data.role || 'user'; // 'user' or 'editor'
        this.isActive = data.isActive !== undefined ? data.isActive : true;
    }

    static async create(db, userData) {
        const user = new User(userData);
        const result = await db.collection('users').insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    static async findById(db, id) {
        return await db.collection('users').findOne({ _id: new ObjectId(id) });
    }

    static async findByUsername(db, username) {
        return await db.collection('users').findOne({ username });
    }

    static async findByEmail(db, email) {
        return await db.collection('users').findOne({ email });
    }

    static async findAll(db, filter = {}) {
        return await db.collection('users').find(filter).sort({ joinDate: -1 }).toArray();
    }

    static async update(db, id, updateData) {
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        return result;
    }

    static async updateLastLogin(db, id) {
        return await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: { lastLogin: new Date() } }
        );
    }

    static async delete(db, id) {
        return await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    }

    static async findOrCreate(db, username, email = null) {
        let user = await this.findByUsername(db, username);
        
        if (!user) {
            user = await this.create(db, { username, email });
        } else {
            await this.updateLastLogin(db, user._id);
        }
        
        return user;
    }
}

module.exports = User; 