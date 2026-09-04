import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Feedback Model
 *
 * Manages user-submitted feedback/issues visible to SuperAdmin for review.
 *
 * Requirements: REQ-F1 (submit), REQ-F2 (admin review), REQ-F3 (status update)
 */

export type FeedbackCategory = 'bug' | 'feature_request' | 'general' | 'billing' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface IFeedback {
  _id: ObjectId;
  userId: ObjectId;           // ref: users._id
  userEmail: string;
  userName: string;
  userRole: string;
  category: FeedbackCategory;
  subject: string;            // 5–120 chars
  message: string;            // 10–2000 chars
  status: FeedbackStatus;
  adminNote?: string;         // optional note from SuperAdmin
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedbackCreate {
  userId: ObjectId;
  userEmail: string;
  userName: string;
  userRole: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
}

class FeedbackModelClass {
  private _collection: Collection<IFeedback> | null = null;

  private get collection(): Collection<IFeedback> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IFeedback>('feedbacks');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IFeedback>('feedbacks');
    }
  }

  async createIndexes(): Promise<void> {
    try {
      // Admin queries: filter by status
      await this.collection.createIndex({ status: 1 }, { name: 'status_idx' });
      // Admin queries: filter by category
      await this.collection.createIndex({ category: 1 }, { name: 'category_idx' });
      // User's own feedback history
      await this.collection.createIndex({ userId: 1, createdAt: -1 }, { name: 'user_createdAt_idx' });
      console.log('✓ Feedback indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create feedback indexes:', error);
      throw error;
    }
  }

  async create(data: IFeedbackCreate): Promise<IFeedback> {
    const now = new Date();
    const doc: Omit<IFeedback, '_id'> = {
      ...data,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(doc as IFeedback);
    return { _id: result.insertedId, ...doc } as IFeedback;
  }

  async findById(id: ObjectId | string): Promise<IFeedback | null> {
    const fid = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: fid });
  }

  async findAll(filters: {
    status?: FeedbackStatus;
    category?: FeedbackCategory;
    limit?: number;
    skip?: number;
  }): Promise<{ items: IFeedback[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters.status) query['status'] = filters.status;
    if (filters.category) query['category'] = filters.category;

    const [items, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(filters.skip ?? 0)
        .limit(filters.limit ?? 50)
        .toArray(),
      this.collection.countDocuments(query),
    ]);
    return { items, total };
  }

  async updateStatus(
    id: ObjectId | string,
    status: FeedbackStatus,
    adminNote?: string
  ): Promise<IFeedback | null> {
    const fid = typeof id === 'string' ? new ObjectId(id) : id;
    const update: Record<string, unknown> = { status, updatedAt: new Date() };
    if (adminNote !== undefined) update['adminNote'] = adminNote;

    const result = await this.collection.findOneAndUpdate(
      { _id: fid },
      { $set: update },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  getCollection(): Collection<IFeedback> {
    return this.collection;
  }
}

export default new FeedbackModelClass();
