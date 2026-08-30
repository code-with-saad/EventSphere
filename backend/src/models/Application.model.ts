import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Application Model
 *
 * Defines the Application data structure for EventSphere Phase 2.
 * Manages exhibitor applications to expos: pending → approved | rejected.
 *
 * Requirements: REQ-3, REQ-4, REQ-4.1, REQ-3.6, REQ-3.8, REQ-12.21
 */

/**
 * Application review status values
 */
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Application interface — represents an application document in MongoDB
 */
export interface IApplication {
  _id: ObjectId;
  expoId: ObjectId;               // ref: expos._id
  exhibitorId: ObjectId;          // ref: users._id
  status: ApplicationStatus;
  companyName: string;            // 1–120 chars
  companyDescription: string;     // 1–500 chars
  category: string;               // selected from predefined list
  phoneNumber: string;            // at least one contact number
  websiteUrl?: string;
  logoUrl?: string;               // Cloudinary URL (PNG/JPG/WebP, ≤2 MB)
  organizerNote?: string;         // max 500 chars
  boothLabel?: string;            // 1–20 chars, set on approval
  rejectionReason?: string;       // max 300 chars, set on rejection
  submittedAt: Date;
  updatedAt: Date;
}

/**
 * Application creation data (without auto-generated fields)
 */
export interface IApplicationCreate {
  expoId: ObjectId;
  exhibitorId: ObjectId;
  companyName: string;
  companyDescription: string;
  category: string;
  phoneNumber: string;
  websiteUrl?: string;
  logoUrl?: string;
  organizerNote?: string;
}

/**
 * Application Model class with type-safe methods
 */
export class ApplicationModel {
  private _collection: Collection<IApplication> | null = null;

  /**
   * Get the collection instance (lazy initialization)
   */
  private get collection(): Collection<IApplication> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IApplication>('applications');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IApplication>('applications');
    }
    // If no db provided, collection will be lazily initialized on first access
  }

  /**
   * Initialize indexes for the applications collection.
   * Should be called once during application startup.
   */
  async createIndexes(): Promise<void> {
    try {
      // REQ-4.1: Organizer reviews all applications for an expo
      await this.collection.createIndex(
        { expoId: 1, status: 1 },
        { name: 'expo_status_idx' }
      );

      // REQ-3.6: Exhibitor checks own application for a specific expo
      await this.collection.createIndex(
        { expoId: 1, exhibitorId: 1 },
        { name: 'expo_exhibitor_idx' }
      );

      // REQ-3.8: Exhibitor's full application history sorted by submission date
      await this.collection.createIndex(
        { exhibitorId: 1, submittedAt: -1 },
        { name: 'exhibitor_submittedAt_idx' }
      );

      // REQ-12.21: Booth uniqueness within an expo — partial unique index
      // Only enforces uniqueness when boothLabel exists and is not null,
      // allowing multiple applications without a booth label (pending/rejected).
      await this.collection.createIndex(
        { expoId: 1, boothLabel: 1 },
        {
          unique: true,
          partialFilterExpression: { boothLabel: { $exists: true, $ne: null } },
          name: 'expo_boothLabel_unique_idx',
        }
      );

      console.log('✓ Application indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create application indexes:', error);
      throw error;
    }
  }

  /**
   * Find an application by ID
   *
   * @param id Application ID
   * @returns The application document or null if not found
   */
  async findById(id: ObjectId | string): Promise<IApplication | null> {
    const appId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: appId });
  }

  /**
   * Find an exhibitor's application for a specific expo
   *
   * Supports REQ-3.6: an exhibitor can check whether they have already applied.
   *
   * @param expoId Expo ID
   * @param exhibitorId Exhibitor user ID
   * @returns The matching application or null if not found
   */
  async findByExpoAndExhibitor(
    expoId: ObjectId | string,
    exhibitorId: ObjectId | string
  ): Promise<IApplication | null> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    const xid = typeof exhibitorId === 'string' ? new ObjectId(exhibitorId) : exhibitorId;
    return this.collection.findOne({ expoId: eid, exhibitorId: xid });
  }

  /**
   * Find all applications for a given expo
   *
   * Supports REQ-4.1: organizer reviews all applications for an expo.
   *
   * @param expoId Expo ID
   * @returns Array of application documents for that expo
   */
  async findByExpo(expoId: ObjectId | string): Promise<IApplication[]> {
    const eid = typeof expoId === 'string' ? new ObjectId(expoId) : expoId;
    return this.collection.find({ expoId: eid }).toArray();
  }

  /**
   * Find all applications submitted by a given exhibitor
   *
   * Supports REQ-3.8: exhibitor views their full application history.
   * Results are sorted by submission date descending (most recent first).
   *
   * @param exhibitorId Exhibitor user ID
   * @returns Array of application documents for that exhibitor
   */
  async findByExhibitor(exhibitorId: ObjectId | string): Promise<IApplication[]> {
    const xid = typeof exhibitorId === 'string' ? new ObjectId(exhibitorId) : exhibitorId;
    return this.collection.find({ exhibitorId: xid }).sort({ submittedAt: -1 }).toArray();
  }

  /**
   * Create a new application
   *
   * Automatically sets `status: 'pending'`, `submittedAt`, and `updatedAt`.
   *
   * @param data Application creation payload
   * @returns The full inserted application document
   */
  async create(data: IApplicationCreate): Promise<IApplication> {
    const now = new Date();
    const doc: Omit<IApplication, '_id'> = {
      ...data,
      status: 'pending',
      submittedAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as IApplication);
    return {
      _id: result.insertedId,
      ...doc,
    } as IApplication;
  }

  /**
   * Apply a partial update to an application document.
   *
   * `updatedAt` is always set to the current time.
   * `submittedAt` and `_id` cannot be changed.
   *
   * @param id Application ID
   * @param data Fields to update
   * @returns The updated application document, or null if not found
   */
  async updateById(
    id: ObjectId | string,
    data: Partial<Omit<IApplication, '_id' | 'submittedAt'>>
  ): Promise<IApplication | null> {
    const appId = typeof id === 'string' ? new ObjectId(id) : id;

    const updateDoc = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: appId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result || null;
  }

  /**
   * Delete an application by ID
   *
   * @param id Application ID
   * @returns true if a document was deleted, false if not found
   */
  async deleteById(id: ObjectId | string): Promise<boolean> {
    const appId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: appId });
    return result.deletedCount > 0;
  }

  /**
   * Get the underlying MongoDB collection for advanced queries
   *
   * @returns The MongoDB collection
   */
  getCollection(): Collection<IApplication> {
    return this.collection;
  }
}

// Export a singleton instance
export default new ApplicationModel();
