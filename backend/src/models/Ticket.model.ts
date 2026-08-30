import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Ticket Model
 *
 * Defines the Ticket data structure for EventSphere Phase 2.
 * Manages attendee registrations and QR check-in lifecycle.
 *
 * Requirements: REQ-5, REQ-5.6, REQ-5.7, REQ-12.4, REQ-12.20, REQ-12.22
 */

/**
 * Ticket lifecycle status values
 */
export type TicketStatus = 'active' | 'checked_in' | 'cancelled';

/**
 * Ticket interface — represents a ticket document in MongoDB
 */
export interface ITicket {
  _id: ObjectId;
  ticketId: string;       // UUID v4, globally unique (REQ-12.22)
  expoId: ObjectId;       // ref: expos._id
  attendeeId: ObjectId;   // ref: users._id
  status: TicketStatus;
  registeredAt: Date;
  checkedInAt?: Date;     // set when status → checked_in
  updatedAt: Date;
}

/**
 * Ticket creation data (without auto-generated fields)
 */
export interface ITicketCreate {
  ticketId: string;
  expoId: ObjectId;
  attendeeId: ObjectId;
}

/**
 * Ticket Model class with type-safe methods
 */
export class TicketModel {
  private _collection: Collection<ITicket> | null = null;

  /**
   * Get the collection instance (lazy initialization)
   */
  private get collection(): Collection<ITicket> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<ITicket>('tickets');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<ITicket>('tickets');
    }
    // If no db provided, collection will be lazily initialized on first access
  }

  /**
   * Initialize indexes for the tickets collection.
   * Should be called once during application startup.
   */
  async createIndexes(): Promise<void> {
    try {
      // REQ-12.22: Globally unique ticket ID — fast check-in lookup
      await this.collection.createIndex(
        { ticketId: 1 },
        { unique: true, name: 'ticketId_unique_idx' }
      );

      // REQ-5.7: Attendee's ticket list sorted by registration date
      await this.collection.createIndex(
        { attendeeId: 1, registeredAt: -1 },
        { name: 'attendee_registeredAt_idx' }
      );

      // REQ-5.6: Duplicate registration guard — one active ticket per attendee per expo
      await this.collection.createIndex(
        { expoId: 1, attendeeId: 1 },
        { name: 'expo_attendee_idx' }
      );

      // REQ-12.20: Cascade cancel on expo archive/delete
      await this.collection.createIndex(
        { expoId: 1, status: 1 },
        { name: 'expo_status_idx' }
      );

      // REQ-12.4: Check-in performance — composite lookup by ticketId + expoId
      await this.collection.createIndex(
        { ticketId: 1, expoId: 1 },
        { name: 'ticketId_expo_idx' }
      );

      console.log('✓ Ticket indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create ticket indexes:', error);
      throw error;
    }
  }

  /**
   * Find a ticket by its MongoDB _id
   *
   * @param id Ticket _id
   * @returns The ticket document or null if not found
   */
  async findById(id: ObjectId | string): Promise<ITicket | null> {
    const ticketObjId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: ticketObjId });
  }

  /**
   * Find a ticket by its UUID ticketId field
   *
   * Used for check-in lookups (REQ-12.4, REQ-12.22).
   *
   * @param ticketId UUID v4 string
   * @returns The ticket document or null if not found
   */
  async findByTicketId(ticketId: string): Promise<ITicket | null> {
    return this.collection.findOne({ ticketId });
  }

  /**
   * Find all tickets for a given attendee, sorted by registration date descending
   *
   * Supports REQ-5.7: attendee views their ticket history.
   *
   * @param attendeeId Attendee user ID
   * @returns Array of ticket documents for that attendee
   */
  async findByAttendee(attendeeId: ObjectId | string): Promise<ITicket[]> {
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.find({ attendeeId: aid }).sort({ registeredAt: -1 }).toArray();
  }

  /**
   * Find a specific attendee's ticket for a given expo
   *
   * Supports REQ-5.6: duplicate registration guard.
   *
   * @param expoId Expo ID
   * @param attendeeId Attendee user ID
   * @returns The matching ticket or null if not found
   */
  async findByExpoAndAttendee(
    expoId: ObjectId | string,
    attendeeId: ObjectId | string
  ): Promise<ITicket | null> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.findOne({ expoId: eid, attendeeId: aid });
  }

  /**
   * Create a new ticket
   *
   * Automatically sets `status: 'active'`, `registeredAt`, and `updatedAt`.
   *
   * @param data Ticket creation payload
   * @returns The full inserted ticket document
   */
  async create(data: ITicketCreate): Promise<ITicket> {
    const now = new Date();
    const doc: Omit<ITicket, '_id'> = {
      ...data,
      status: 'active',
      registeredAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as ITicket);
    return {
      _id: result.insertedId,
      ...doc,
    } as ITicket;
  }

  /**
   * Apply a partial update to a ticket document.
   *
   * `updatedAt` is always set to the current time.
   * `_id` and `registeredAt` cannot be changed.
   *
   * @param id Ticket _id
   * @param data Fields to update
   * @returns The updated ticket document, or null if not found
   */
  async updateById(
    id: ObjectId | string,
    data: Partial<Omit<ITicket, '_id' | 'registeredAt'>>
  ): Promise<ITicket | null> {
    const ticketObjId = typeof id === 'string' ? new ObjectId(id) : id;

    const updateDoc = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: ticketObjId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result || null;
  }

  /**
   * Delete a ticket by ID
   *
   * @param id Ticket _id
   * @returns true if a document was deleted, false if not found
   */
  async deleteById(id: ObjectId | string): Promise<boolean> {
    const ticketObjId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: ticketObjId });
    return result.deletedCount > 0;
  }

  /**
   * Get the underlying MongoDB collection for advanced queries
   *
   * @returns The MongoDB collection
   */
  getCollection(): Collection<ITicket> {
    return this.collection;
  }
}

// Export a singleton instance
export default new TicketModel();
