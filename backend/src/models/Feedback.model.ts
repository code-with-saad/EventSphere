import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Feedback Model
 *
 * Manages user-submitted feedback, issue reports, and attendee structured ratings.
 * Role-aware routing:
 * - Attendee -> Exhibitor / Booth / Session -> routed to Organizer
 * - Exhibitor -> Platform -> routed to SuperAdmin
 * - Organizer -> Software -> routed to SuperAdmin
 */

export type FeedbackCategory = 'bug' | 'feature_request' | 'general' | 'billing' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type FeedbackType =
  | 'general_exhibitor'
  | 'booth_visit'
  | 'session'
  | 'organizer_to_superadmin'
  | 'exhibitor_to_superadmin'
  | 'general';

export type FeedbackRecipientRole = 'organizer' | 'superadmin';

export interface IFeedbackRatings {
  overallExperience: number;      // 1–5
  staffOrSpeakerQuality: number;  // 1–5
  contentRelevance: number;       // 1–5
  engagementLevel: number;        // 1–5
  likelihoodToRecommend: number;  // 1–5
}

export interface IFeedback {
  _id: ObjectId;
  userId: ObjectId;           // ref: users._id
  userEmail: string;
  userName: string;
  userRole: string;
  category?: FeedbackCategory;
  feedbackType: FeedbackType;
  targetId?: ObjectId;        // application._id, booth label ref, or session._id
  targetName?: string;        // Snapshotted company name, session title, etc.
  recipientRole: FeedbackRecipientRole;
  recipientId?: ObjectId;     // organizerId when recipientRole === 'organizer'
  ratings?: IFeedbackRatings;
  subject?: string;           // 5–120 chars (for free-text superadmin feedback)
  message?: string;           // 10–2000 chars (for free-text superadmin feedback)
  comment?: string;           // optional free-text <=500 chars (for attendee rating surveys)
  status: FeedbackStatus;
  adminNote?: string;         // optional note from reviewer (SuperAdmin or Organizer)
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedbackCreate {
  userId: ObjectId;
  userEmail: string;
  userName: string;
  userRole: string;
  feedbackType: FeedbackType;
  recipientRole: FeedbackRecipientRole;
  recipientId?: ObjectId;
  targetId?: ObjectId;
  targetName?: string;
  category?: FeedbackCategory;
  ratings?: IFeedbackRatings;
  subject?: string;
  message?: string;
  comment?: string;
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
      // Recipient queries
      await this.collection.createIndex({ recipientRole: 1, recipientId: 1, createdAt: -1 }, { name: 'recipient_idx' });
      // Status & Category filters
      await this.collection.createIndex({ status: 1 }, { name: 'status_idx' });
      await this.collection.createIndex({ feedbackType: 1 }, { name: 'feedbackType_idx' });
      // User's own feedback history
      await this.collection.createIndex({ userId: 1, createdAt: -1 }, { name: 'user_createdAt_idx' });
      // Attendee rating lookup index
      await this.collection.createIndex({ userId: 1, targetId: 1, feedbackType: 1 }, { name: 'user_target_feedback_idx' });
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

  async findExistingRating(
    userId: ObjectId | string,
    targetId: ObjectId | string,
    feedbackType: FeedbackType
  ): Promise<IFeedback | null> {
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const tid = typeof targetId === 'string' ? new ObjectId(targetId) : targetId;
    return this.collection.findOne({
      userId: uid,
      targetId: tid,
      feedbackType,
    });
  }

  async findAll(filters: {
    recipientRole?: FeedbackRecipientRole;
    recipientId?: ObjectId | string;
    status?: FeedbackStatus;
    category?: FeedbackCategory;
    feedbackType?: FeedbackType;
    limit?: number;
    skip?: number;
  }): Promise<{ items: IFeedback[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters.recipientRole) query['recipientRole'] = filters.recipientRole;
    if (filters.recipientId) {
      query['recipientId'] = typeof filters.recipientId === 'string'
        ? new ObjectId(filters.recipientId)
        : filters.recipientId;
    }
    if (filters.status) query['status'] = filters.status;
    if (filters.category) query['category'] = filters.category;
    if (filters.feedbackType) query['feedbackType'] = filters.feedbackType;

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

  async findByUserId(userId: ObjectId | string): Promise<IFeedback[]> {
    const uid = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return this.collection.find({ userId: uid }).sort({ createdAt: -1 }).toArray();
  }

  async updateStatus(
    id: ObjectId | string,
    status: FeedbackStatus,
    adminNote?: string,
    expectedRecipient?: { role: FeedbackRecipientRole; id?: ObjectId | string }
  ): Promise<IFeedback | null> {
    const fid = typeof id === 'string' ? new ObjectId(id) : id;
    const query: Record<string, unknown> = { _id: fid };

    if (expectedRecipient) {
      query['recipientRole'] = expectedRecipient.role;
      if (expectedRecipient.id) {
        query['recipientId'] = typeof expectedRecipient.id === 'string'
          ? new ObjectId(expectedRecipient.id)
          : expectedRecipient.id;
      }
    }

    const update: Record<string, unknown> = { status, updatedAt: new Date() };
    if (adminNote !== undefined) update['adminNote'] = adminNote;

    const result = await this.collection.findOneAndUpdate(
      query,
      { $set: update },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  /**
   * Aggregates ratings for a list of targetIds (applications / exhibitors).
   * Computes per-submission average of 5 rating dimensions, then calculates the
   * overall average rating and review count per targetId.
   */
  async getExhibitorRatingAggregates(
    targetIds: (ObjectId | string)[]
  ): Promise<Record<string, { averageRating: number; reviewCount: number }>> {
    if (!targetIds || targetIds.length === 0) return {};

    const objIds = targetIds.map((id) => (typeof id === 'string' ? new ObjectId(id) : id));

    const pipeline = [
      {
        $match: {
          targetId: { $in: objIds },
          ratings: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          targetId: 1,
          submissionAvg: {
            $avg: [
              '$ratings.overallExperience',
              '$ratings.staffOrSpeakerQuality',
              '$ratings.contentRelevance',
              '$ratings.engagementLevel',
              '$ratings.likelihoodToRecommend',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$targetId',
          averageRating: { $avg: '$submissionAvg' },
          reviewCount: { $sum: 1 },
        },
      },
    ];

    const results = await this.collection.aggregate<{
      _id: ObjectId;
      averageRating: number;
      reviewCount: number;
    }>(pipeline).toArray();

    const aggregateMap: Record<string, { averageRating: number; reviewCount: number }> = {};
    for (const r of results) {
      if (r._id) {
        aggregateMap[r._id.toString()] = {
          averageRating: Math.round((r.averageRating || 0) * 10) / 10,
          reviewCount: r.reviewCount || 0,
        };
      }
    }

    return aggregateMap;
  }

  getCollection(): Collection<IFeedback> {
    return this.collection;
  }
}

export default new FeedbackModelClass();

