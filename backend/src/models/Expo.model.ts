import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * Expo Model
 *
 * Defines the Expo data structure for EventSphere Phase 2.
 * Manages expo lifecycle: draft → published → ongoing → completed → archived.
 *
 * Requirements: REQ-1, REQ-2, REQ-2.7, REQ-1.2, REQ-1.5, REQ-1.6
 */

/**
 * Expo lifecycle status values
 */
export type ExpoStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

export interface IExpoZone {
  name: string;
  boothCount: number;
}

export interface IBoothSpatialItem {
  boothLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zoneName?: string;
}

export interface IReferenceShape {
  id: string;
  label: string;
  type: 'stage' | 'entrance' | 'exit' | 'restroom' | 'pillar' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IExpoSpatialLayout {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  booths: IBoothSpatialItem[];
  referenceShapes?: IReferenceShape[];
}

/**
 * Expo interface — represents an expo document in MongoDB
 */
export interface IExpo {
  _id: ObjectId;
  organizerId: ObjectId;      // ref: users._id
  name: string;               // 1–120 chars
  description: string;        // 1–2000 chars
  status: ExpoStatus;
  startDate: Date;
  endDate: Date;
  venueName: string;
  venueAddress: string;
  totalBooths: number;        // integer ≥ 1
  zones?: IExpoZone[];        // optional zone-based booth configuration
  spatialLayout?: IExpoSpatialLayout; // optional visual 2D spatial arrangement
  bannerUrl?: string;         // Cloudinary URL (PNG/JPG/WebP, ≤5 MB)
  websiteUrl?: string;
  category?: string;          // e.g. Technology, Health, Art
  tags?: string[];            // up to 10 tags, each 1–30 chars
  venueMapUrl?: string;       // optional link shown to approved exhibitors
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Expo creation data (without auto-generated fields)
 */
export interface IExpoCreate {
  organizerId: ObjectId;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  venueName: string;
  venueAddress: string;
  totalBooths: number;
  zones?: IExpoZone[];
  spatialLayout?: IExpoSpatialLayout;
  bannerUrl?: string;
  websiteUrl?: string;
  category?: string;
  tags?: string[];
  venueMapUrl?: string;
}

/**
 * Expo Model class with type-safe methods
 */
export class ExpoModel {
  private _collection: Collection<IExpo> | null = null;

  /**
   * Get the collection instance (lazy initialization)
   */
  private get collection(): Collection<IExpo> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IExpo>('expos');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IExpo>('expos');
    }
    // If no db provided, collection will be lazily initialized on first access
  }

  /**
   * Initialize indexes for the expos collection.
   * Should be called once during application startup.
   */
  async createIndexes(): Promise<void> {
    try {
      // REQ-2.7: Primary ownership query — organizer's own expo list
      await this.collection.createIndex(
        { organizerId: 1, status: 1 },
        { name: 'organizer_status_idx' }
      );

      // REQ-1.2, REQ-1.5: Public listing query — status filter + sort by startDate
      await this.collection.createIndex(
        { status: 1, startDate: 1 },
        { name: 'status_startDate_idx' }
      );

      // REQ-1.6: Text search across name and description
      await this.collection.createIndex(
        { name: 'text', description: 'text' },
        { name: 'name_description_text_idx' }
      );

      // Note: _id index is created by MongoDB automatically

      console.log('✓ Expo indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create expo indexes:', error);
      throw error;
    }
  }

  /**
   * Find an expo by ID
   *
   * @param id Expo ID
   * @returns The expo document or null if not found
   */
  async findById(id: ObjectId | string): Promise<IExpo | null> {
    const expoId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: expoId });
  }

  /**
   * Find all expos belonging to a given organizer
   *
   * @param organizerId Organizer user ID
   * @returns Array of expo documents for that organizer
   */
  async findByOrganizer(organizerId: ObjectId | string): Promise<IExpo[]> {
    const oid = typeof organizerId === 'string' ? new ObjectId(organizerId) : organizerId;
    return this.collection.find({ organizerId: oid }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Insert a new expo document
   *
   * Sets `status: 'draft'`, `createdAt`, and `updatedAt` automatically.
   *
   * @param data Expo creation payload
   * @returns The full inserted expo document
   */
  async create(data: IExpoCreate): Promise<IExpo> {
    const now = new Date();
    const doc: Omit<IExpo, '_id'> = {
      ...data,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(doc as IExpo);
    return {
      _id: result.insertedId,
      ...doc,
    } as IExpo;
  }

  /**
   * Apply a partial update to an expo document.
   *
   * `updatedAt` is always set to the current time.
   *
   * @param id Expo ID
   * @param data Fields to update (cannot change `_id` or `createdAt`)
   * @returns The updated expo document, or null if not found
   */
  async updateById(
    id: ObjectId | string,
    data: Partial<Omit<IExpo, '_id' | 'createdAt'>>
  ): Promise<IExpo | null> {
    const expoId = typeof id === 'string' ? new ObjectId(id) : id;

    const updateDoc = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: expoId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result || null;
  }

  /**
   * Delete an expo by ID
   *
   * @param id Expo ID
   * @returns true if a document was deleted, false if not found
   */
  async deleteById(id: ObjectId | string): Promise<boolean> {
    const expoId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: expoId });
    return result.deletedCount > 0;
  }

  /**
   * Get the underlying MongoDB collection for advanced queries
   *
   * @returns The MongoDB collection
   */
  getCollection(): Collection<IExpo> {
    return this.collection;
  }
}

// Export a singleton instance
export default new ExpoModel();
