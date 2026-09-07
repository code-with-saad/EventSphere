import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * SessionRegistration Model
 *
 * Manages attendee formal registrations for sessions / workshops.
 */

export interface ISessionRegistration {
  _id: ObjectId;
  sessionId: ObjectId;  // ref: sessions._id
  expoId: ObjectId;     // ref: expos._id
  attendeeId: ObjectId; // ref: users._id
  registeredAt: Date;
}

export interface ISessionRegistrationCreate {
  sessionId: ObjectId;
  expoId: ObjectId;
  attendeeId: ObjectId;
}

export class SessionRegistrationModel {
  private _collection: Collection<ISessionRegistration> | null = null;

  private get collection(): Collection<ISessionRegistration> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<ISessionRegistration>('session_registrations');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<ISessionRegistration>('session_registrations');
    }
  }

  async createIndexes(): Promise<void> {
    try {
      // Unique registration per attendee per session
      await this.collection.createIndex(
        { sessionId: 1, attendeeId: 1 },
        { unique: true, name: 'session_attendee_reg_unique_idx' }
      );

      // Fast query by attendee for "my registered sessions"
      await this.collection.createIndex(
        { attendeeId: 1, registeredAt: 1 },
        { name: 'attendee_registeredAt_idx' }
      );

      // Fast count and attendee listing per session
      await this.collection.createIndex(
        { sessionId: 1, registeredAt: 1 },
        { name: 'sessionId_registeredAt_idx' }
      );

      // Fast query by expo
      await this.collection.createIndex(
        { expoId: 1 },
        { name: 'expoId_idx' }
      );

      console.log('✓ SessionRegistration indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create session registration indexes:', error);
      throw error;
    }
  }

  async findBySessionAndAttendee(
    sessionId: ObjectId | string,
    attendeeId: ObjectId | string
  ): Promise<ISessionRegistration | null> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.findOne({ sessionId: sid, attendeeId: aid });
  }

  async findByAttendeeAndExpo(
    attendeeId: ObjectId | string,
    expoId: ObjectId | string
  ): Promise<ISessionRegistration[]> {
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    return this.collection.find({ attendeeId: aid, expoId: eid }).sort({ registeredAt: 1 }).toArray();
  }

  async findByAttendee(attendeeId: ObjectId | string): Promise<ISessionRegistration[]> {
    const aid = typeof attendeeId === 'string' ? new ObjectId(attendeeId) : attendeeId;
    return this.collection.find({ attendeeId: aid }).sort({ registeredAt: 1 }).toArray();
  }

  async countBySession(sessionId: ObjectId | string): Promise<number> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    return this.collection.countDocuments({ sessionId: sid });
  }

  async findBySession(sessionId: ObjectId | string): Promise<ISessionRegistration[]> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    return this.collection.find({ sessionId: sid }).sort({ registeredAt: 1 }).toArray();
  }

  async create(data: ISessionRegistrationCreate): Promise<ISessionRegistration> {
    const doc: Omit<ISessionRegistration, '_id'> = {
      ...data,
      registeredAt: new Date(),
    };

    const result = await this.collection.insertOne(doc as ISessionRegistration);
    return {
      _id: result.insertedId,
      ...doc,
    } as ISessionRegistration;
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

  async deleteBySession(sessionId: ObjectId | string): Promise<number> {
    const sid = typeof sessionId === 'string' ? new ObjectId(sessionId) : sessionId;
    const result = await this.collection.deleteMany({ sessionId: sid });
    return result.deletedCount;
  }

  async deleteByExpo(expoId: ObjectId | string): Promise<number> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    const result = await this.collection.deleteMany({ expoId: eid });
    return result.deletedCount;
  }
}

export default new SessionRegistrationModel();
