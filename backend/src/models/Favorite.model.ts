import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Favorite Model
 *
 * Defines the Favorite data structure for EventSphere.
 * Allows users to favorite/bookmark expos.
 */
export interface IFavorite {
  _id: ObjectId;
  userId: ObjectId;  // ref: users._id
  expoId: ObjectId;  // ref: expos._id
  createdAt: Date;
}

export interface IFavoriteCreate {
  userId: ObjectId;
  expoId: ObjectId;
}

export class FavoriteModel {
  private _collection: Collection<IFavorite> | null = null;

  private get collection(): Collection<IFavorite> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IFavorite>('favorites');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IFavorite>('favorites');
    }
  }

  async createIndexes(): Promise<void> {
    try {
      await this.collection.createIndex(
        { userId: 1, expoId: 1 },
        { unique: true, name: 'user_expo_favorite_unique_idx' }
      );
      await this.collection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'user_favorite_createdAt_idx' }
      );
      await this.collection.createIndex(
        { expoId: 1 },
        { name: 'expo_favorite_idx' }
      );
      console.log('✓ Favorite indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create favorite indexes:', error);
      throw error;
    }
  }

  async findByUserAndExpo(userId: ObjectId | string, expoId: ObjectId | string): Promise<IFavorite | null> {
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    return this.collection.findOne({ userId: uid, expoId: eid });
  }

  async findByUser(userId: ObjectId | string): Promise<IFavorite[]> {
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return this.collection.find({ userId: uid }).sort({ createdAt: -1 }).toArray();
  }

  async create(data: IFavoriteCreate): Promise<IFavorite> {
    const doc: Omit<IFavorite, '_id'> = {
      ...data,
      createdAt: new Date(),
    };
    const result = await this.collection.insertOne(doc as IFavorite);
    return {
      _id: result.insertedId,
      ...doc,
    } as IFavorite;
  }

  async deleteByUserAndExpo(userId: ObjectId | string, expoId: ObjectId | string): Promise<boolean> {
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    const result = await this.collection.deleteOne({ userId: uid, expoId: eid });
    return result.deletedCount > 0;
  }

  getCollection(): Collection<IFavorite> {
    return this.collection;
  }
}

export default new FavoriteModel();
