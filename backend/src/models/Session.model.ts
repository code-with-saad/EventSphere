import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Session Model
 *
 * Defines the Session data structure for EventSphere Phase 2.
 * Manages expo schedule sessions: title, speaker, time slot, room/location.
 *
 * Requirements: REQ-6, REQ-6.1, REQ-6.5, REQ-6.7, REQ-7.1
 */

/**
 * Session interface — represents a session document in MongoDB
 */
export interface ISession {
  _id: ObjectId;
  expoId: ObjectId;       // ref: expos._id
  title: string;          // 1–120 chars
  speakerName: string;    // 1–100 chars
  startTime: Date;
  endTime: Date;
  room: string;           // 1–80 chars (location/room name)
  description?: string;   // max 500 chars
  track?: string;         // e.g. Keynote, Workshop, Panel; max 30 chars
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session creation data (without auto-generated fields)
 */
export interface ISessionCreate {
  expoId: ObjectId;
  title: string;
  speakerName: string;
  startTime: Date;
  endTime: Date;
  room: string;
  description?: string;
  track?: string;
}

/**
 * Session Model class with type-safe methods
 */
export class SessionModel {
  private _collection: Collection<ISession> | null = null;

  /**
   * Get the collection instance (lazy initialization)
   */
  private get collection(): Collection<ISession> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<ISession>('sessions');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<ISession>('sessions');
    }
    // If no db provided, collection will be lazily initialized on first access
  }

  /**
   * Initialize indexes for the sessions collection.
   * Should be called once during application startup.
   */
  async createIndexes(): Promise<void> {
    try {
      // REQ-6.1, REQ-7.1: Session list for an expo sorted by start time
      await this.collection.createIndex(
        { expoId: 1, startTime: 1 },
        { name: 'expo_startTime_idx' }
      );

      // REQ-6.5: Room conflict detection — query by expo + room + time range overlap
      await this.collection.createIndex(
        { expoId: 1, room: 1, startTime: 1, endTime: 1 },
        { name: 'expo_room_time_idx' }
      );

      console.log('✓ Session indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create session indexes:', error);
      throw error;
    }
  }

  /**
   * Find a session by ID
   *
   * @param id Session ID
   * @returns The session document or null if not found
   */
  async findById(id: ObjectId | string): Promise<ISession | null> {
    const sessionId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: sessionId });
  }

  /**
   * Find all sessions for a given expo, sorted by start time ascending
   *
   * Supports REQ-6.1, REQ-7.1: session list sorted by start time.
   *
   * @param expoId Expo ID
   * @returns Array of session documents for that expo
   */
  async findByExpo(expoId: ObjectId | string): Promise<ISession[]> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    return this.collection.find({ expoId: eid }).sort({ startTime: 1 }).toArray();
  }

  /**
   * Find sessions in a given room within an expo that overlap a time range.
   *
   * Used by SessionService for room conflict detection (REQ-6.5).
   * Two sessions overlap if: sessionA.startTime < newEndTime && sessionA.endTime > newStartTime.
   *
   * @param expoId Expo ID
   * @param room Room/location name
   * @param startTime Proposed session start time
   * @param endTime Proposed session end time
   * @param excludeId Optional session ID to exclude (for update conflict checks)
   * @returns Array of conflicting session documents
   */
  async findRoomConflicts(
    expoId: ObjectId | string,
    room: string,
    startTime: Date,
    endTime: Date,
    excludeId?: ObjectId | string
  ): Promise<ISession[]> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;

    const filter: Record<string, unknown> = {
      expoId: eid,
      room,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };

    if (excludeId) {
      const excId = typeof excludeId === 'string' ? new ObjectId(excludeId) : excludeId;
      filter['_id'] = { $ne: excId };
    }

    return this.collection.find(filter).toArray();
  }

  /**
   * Create a new session
   *
   * Automatically sets `createdAt` and `updatedAt`.
   *
   * @param data Session creation payload
   * @returns The full inserted session document
   */
  async create(data: ISessionCreate): Promise<ISession> {
    const now = new Date();
    const doc: Omit<ISession, '_id'> = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as ISession);
    return {
      _id: result.insertedId,
      ...doc,
    } as ISession;
  }

  /**
   * Apply a partial update to a session document.
   *
   * `updatedAt` is always set to the current time.
   * `_id` and `createdAt` cannot be changed.
   *
   * @param id Session ID
   * @param data Fields to update
   * @returns The updated session document, or null if not found
   */
  async updateById(
    id: ObjectId | string,
    data: Partial<Omit<ISession, '_id' | 'createdAt'>>
  ): Promise<ISession | null> {
    const sessionId = typeof id === 'string' ? new ObjectId(id) : id;

    const updateDoc = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: sessionId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result || null;
  }

  /**
   * Delete a session by ID
   *
   * @param id Session ID
   * @returns true if a document was deleted, false if not found
   */
  async deleteById(id: ObjectId | string): Promise<boolean> {
    const sessionId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: sessionId });
    return result.deletedCount > 0;
  }

  /**
   * Delete all sessions for a given expo
   *
   * Used during expo cascade delete (REQ-12.20).
   *
   * @param expoId Expo ID
   * @returns Count of deleted session documents
   */
  async deleteByExpo(expoId: ObjectId | string): Promise<number> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    const result = await this.collection.deleteMany({ expoId: eid });
    return result.deletedCount;
  }

  /**
   * Get the underlying MongoDB collection for advanced queries
   *
   * @returns The MongoDB collection
   */
  getCollection(): Collection<ISession> {
    return this.collection;
  }
}

// Export a singleton instance
export default new SessionModel();
