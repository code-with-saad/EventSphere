import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Bookmark Model
 *
 * Defines the Bookmark data structure for EventSphere Phase 2.
 * Manages attendee session bookmarks: add/remove/list for schedule browsing.
 *
 * Requirements: REQ-7, REQ-7.4, REQ-7.5, REQ-6.7
 */

/**
 * Bookmark interface — represents a bookmark document in MongoDB
 */
export interface IBookmark {
  _id: ObjectId;
  sessionId: ObjectId;  // ref: sessions._id
  attendeeId: ObjectId; // ref: users._id
  createdAt: Date;
}

/**
 * Bookmark creation data (without auto-generated fields)
 */
export interface IBookmarkCreate {
  sessionId: ObjectId;
  attendeeId: ObjectId;
}

/**
 * Bookmark Model class with type-safe methods
 */
export class BookmarkModel {
  private _collection: Collection<IBookmark> | null = null;

  /**
   * Get the collection instance (lazy initialization)
   */
  private get collection(): Collection<IBookmark> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IBookmark>('bookmarks');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IBookmark>('bookmarks');
    }
    // If no db provided, collection will be lazily initialized on first access
  }

  /**
   * Initialize indexes for the bookmarks collection.
   * Should be called once during application startup.
   */
  async createIndexes(): Promise<void> {
    try {
      // REQ-7: Unique bookmark per attendee × session — prevents duplicate bookmarks
      await this.collection.createIndex(
        { sessionId: 1, attendeeId: 1 },
        { unique: true, name: 'session_attendee_unique_idx' }
      );

      // REQ-7.5: Attendee's bookmarks sorted by creation date for schedule browsing
      await this.collection.createIndex(
        { attendeeId: 1, createdAt: 1 },
        { name: 'attendee_createdAt_idx' }
      );

      // REQ-6.7: Cascade delete bookmarks when a session is deleted
      await this.collection.createIndex(
        { sessionId: 1 },
        { name: 'sessionId_idx' }
      );

      console.log('✓ Bookmark indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create bookmark indexes:', error);
      throw error;
    }
  }

  /**
   * Find a specific bookmark by session and attendee
   *
   * Used for toggle/idempotency checks — determine whether a bookmark already exists.
   *
   * @param sessionId Session ID
   * @param attendeeId Attendee user ID
   * @returns The matching bookmark or null if not found
   */
  async findBySessionAndAttendee(
    sessionId: ObjectId | string,
    attendeeId: ObjectId | string
  ): Promise<IBookmark | null> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.findOne({ sessionId: sid, attendeeId: aid });
  }

  /**
   * Find all bookmarks for a given attendee, sorted by creation date ascending
   *
   * Supports REQ-7.5: attendee views their full bookmark list.
   *
   * @param attendeeId Attendee user ID
   * @returns Array of bookmark documents for that attendee
   */
  async findByAttendee(attendeeId: ObjectId | string): Promise<IBookmark[]> {
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.find({ attendeeId: aid }).sort({ createdAt: 1 }).toArray();
  }

  /**
   * Find which sessions an attendee has bookmarked from a given set of session IDs
   *
   * Used by schedule browsing to render filled/unfilled bookmark icons efficiently
   * without fetching all bookmarks for the attendee.
   *
   * @param attendeeId Attendee user ID
   * @param sessionIds Array of session IDs to check against
   * @returns Array of bookmark documents matching the attendee + session filter
   */
  async findByAttendeeAndSessions(
    attendeeId: ObjectId | string,
    sessionIds: (ObjectId | string)[]
  ): Promise<IBookmark[]> {
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    const sids = sessionIds.map((id) =>
      typeof id === 'string' ? new ObjectId(id) : id
    );
    return this.collection
      .find({ attendeeId: aid, sessionId: { $in: sids } })
      .toArray();
  }

  /**
   * Create a new bookmark
   *
   * Automatically sets `createdAt`. Bookmarks are immutable once created —
   * there is no `updatedAt` field.
   *
   * @param data Bookmark creation payload
   * @returns The full inserted bookmark document
   */
  async create(data: IBookmarkCreate): Promise<IBookmark> {
    const doc: Omit<IBookmark, '_id'> = {
      ...data,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(doc as IBookmark);
    return {
      _id: result.insertedId,
      ...doc,
    } as IBookmark;
  }

  /**
   * Delete a bookmark by session and attendee
   *
   * Supports REQ-7.4: attendee removes a bookmark.
   *
   * @param sessionId Session ID
   * @param attendeeId Attendee user ID
   * @returns true if a document was deleted, false if not found
   */
  async deleteBySessionAndAttendee(
    sessionId: ObjectId | string,
    attendeeId: ObjectId | string
  ): Promise<boolean> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    const result = await this.collection.deleteOne({ sessionId: sid, attendeeId: aid });
    return result.deletedCount > 0;
  }

  /**
   * Delete all bookmarks for a given session
   *
   * Used during session cascade delete (REQ-6.7).
   *
   * @param sessionId Session ID
   * @returns Count of deleted bookmark documents
   */
  async deleteBySession(sessionId: ObjectId | string): Promise<number> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const result = await this.collection.deleteMany({ sessionId: sid });
    return result.deletedCount;
  }

  /**
   * Get the underlying MongoDB collection for advanced queries
   *
   * @returns The MongoDB collection
   */
  getCollection(): Collection<IBookmark> {
    return this.collection;
  }
}

// Export a singleton instance
export default new BookmarkModel();
