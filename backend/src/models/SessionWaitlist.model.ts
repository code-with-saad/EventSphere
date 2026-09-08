import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * SessionWaitlist Model
 *
 * Manages overflow waitlists for capacity-constrained sessions and workshops.
 */

export interface ISessionWaitlist {
  _id: ObjectId;
  sessionId: ObjectId;  // ref: sessions._id
  expoId: ObjectId;     // ref: expos._id
  attendeeId: ObjectId; // ref: users._id
  joinedAt: Date;
}

export interface ISessionWaitlistCreate {
  sessionId: ObjectId;
  expoId: ObjectId;
  attendeeId: ObjectId;
}

export class SessionWaitlistModel {
  private _collection: Collection<ISessionWaitlist> | null = null;

  private get collection(): Collection<ISessionWaitlist> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<ISessionWaitlist>('session_waitlists');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<ISessionWaitlist>('session_waitlists');
    }
  }

  async createIndexes(): Promise<void> {
    try {
      // Unique waitlist entry per attendee per session
      await this.collection.createIndex(
        { sessionId: 1, attendeeId: 1 },
        { unique: true, name: 'session_attendee_waitlist_unique_idx' }
      );

      // FIFO order for promoting waitlisted attendees
      await this.collection.createIndex(
        { sessionId: 1, joinedAt: 1 },
        { name: 'session_joinedAt_fifo_idx' }
      );

      // Query waitlists by attendee
      await this.collection.createIndex(
        { attendeeId: 1 },
        { name: 'attendee_waitlist_idx' }
      );

      console.log('✓ SessionWaitlist indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create session waitlist indexes:', error);
      throw error;
    }
  }

  async create(data: ISessionWaitlistCreate): Promise<ISessionWaitlist> {
    const doc: Omit<ISessionWaitlist, '_id'> = {
      ...data,
      joinedAt: new Date(),
    };
    const result = await this.collection.insertOne(doc as ISessionWaitlist);
    return {
      _id: result.insertedId,
      ...doc,
    } as ISessionWaitlist;
  }

  async findBySessionAndAttendee(
    sessionId: ObjectId | string,
    attendeeId: ObjectId | string
  ): Promise<ISessionWaitlist | null> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.findOne({ sessionId: sid, attendeeId: aid });
  }

  async getPosition(sessionId: ObjectId | string, attendeeId: ObjectId | string): Promise<number | null> {
    const entry = await this.findBySessionAndAttendee(sessionId, attendeeId);
    if (!entry) return null;

    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const aheadCount = await this.collection.countDocuments({
      sessionId: sid,
      joinedAt: { $lt: entry.joinedAt },
    });
    return aheadCount + 1;
  }

  async countBySession(sessionId: ObjectId | string): Promise<number> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    return this.collection.countDocuments({ sessionId: sid });
  }

  async getNextInLine(sessionId: ObjectId | string): Promise<ISessionWaitlist | null> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    return this.collection.findOne({ sessionId: sid }, { sort: { joinedAt: 1 } });
  }

  async deleteBySessionAndAttendee(
    sessionId: ObjectId | string,
    attendeeId: ObjectId | string
  ): Promise<boolean> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    const result = await this.collection.deleteOne({ sessionId: sid, attendeeId: aid });
    return result.deletedCount > 0;
  }

  async deleteById(id: ObjectId | string): Promise<boolean> {
    const oid = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: oid });
    return result.deletedCount > 0;
  }

  getCollection(): Collection<ISessionWaitlist> {
    return this.collection;
  }
}

export default new SessionWaitlistModel();
