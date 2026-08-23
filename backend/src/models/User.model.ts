import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * User Model
 * 
 * Defines the User data structure for EventSphere multi-role system.
 * Supports four roles: SuperAdmin, Organizer, Exhibitor, Attendee.
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

/**
 * User roles in the EventSphere system
 */
export type UserRole = 'superadmin' | 'organizer' | 'exhibitor' | 'attendee';

/**
 * User account status
 */
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

/**
 * User interface - represents a user document in MongoDB
 */
export interface IUser {
  _id: ObjectId;
  email: string;              // Unique, lowercase, validated
  passwordHash: string;       // bcrypt hash with salt rounds = 10
  fullName: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;   // true for Exhibitor/Attendee after OTP, always false for Organizer
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation data (without auto-generated fields)
 */
export interface IUserCreate {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  status?: UserStatus;        // Optional, defaults based on role
  isEmailVerified?: boolean;  // Optional, defaults to false
}

/**
 * User Model class with type-safe methods
 */
export class UserModel {
  private _collection: Collection<IUser> | null = null;

  /**
   * Get the collection instance (lazy initialization)
   */
  private get collection(): Collection<IUser> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IUser>('users');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IUser>('users');
    }
    // If no db provided, collection will be lazily initialized on first access
  }

  /**
   * Initialize indexes for the users collection
   * Should be called once during application startup
   */
  async createIndexes(): Promise<void> {
    try {
      // Requirement 5.2: Unique index on email
      await this.collection.createIndex(
        { email: 1 },
        { unique: true, name: 'email_unique_idx' }
      );

      // Requirement 5.2: Compound index on role + status for admin queries
      await this.collection.createIndex(
        { role: 1, status: 1 },
        { name: 'role_status_idx' }
      );

      console.log('✓ User indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create user indexes:', error);
      throw error;
    }
  }

  /**
   * Validate email format
   * Requirement 5.2: Email format validation
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password hash format (bcrypt output is 60 characters)
   * Requirement 5.4: Password hash validation
   */
  private validatePasswordHash(passwordHash: string): boolean {
    return passwordHash.length >= 60;
  }

  /**
   * Validate user role
   * Requirement 5.5, 5.6: Role enum validation
   */
  private validateRole(role: string): role is UserRole {
    const validRoles: UserRole[] = ['superadmin', 'organizer', 'exhibitor', 'attendee'];
    return validRoles.includes(role as UserRole);
  }

  /**
   * Validate user status
   * Requirement 5.7: Status enum validation
   */
  private validateStatus(status: string): status is UserStatus {
    const validStatuses: UserStatus[] = ['pending', 'active', 'suspended', 'rejected'];
    return validStatuses.includes(status as UserStatus);
  }

  /**
   * Validate user data before insertion or update
   */
  private validateUserData(data: Partial<IUserCreate>): void {
    if (data.email !== undefined) {
      if (!this.validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    if (data.passwordHash !== undefined) {
      if (!this.validatePasswordHash(data.passwordHash)) {
        throw new Error('Invalid password hash format (must be bcrypt hash with min 60 characters)');
      }
    }

    if (data.role !== undefined) {
      if (!this.validateRole(data.role)) {
        throw new Error('Invalid role. Must be one of: superadmin, organizer, exhibitor, attendee');
      }
    }

    if (data.status !== undefined) {
      if (!this.validateStatus(data.status)) {
        throw new Error('Invalid status. Must be one of: pending, active, suspended');
      }
    }

    if (data.fullName !== undefined) {
      if (data.fullName.length < 2 || data.fullName.length > 100) {
        throw new Error('Full name must be between 2 and 100 characters');
      }
    }
  }

  /**
   * Create a new user
   * 
   * @param userData User creation data
   * @returns The created user document
   * @throws Error if validation fails or email already exists
   */
  async create(userData: IUserCreate): Promise<IUser> {
    // Validate user data
    this.validateUserData(userData);

    // Convert email to lowercase for consistency
    const email = userData.email.toLowerCase();

    // Set default status based on role if not provided
    // Requirement 5.7: Organizer defaults to 'pending', others to 'active'
    let status: UserStatus = userData.status || 'active';
    if (!userData.status && userData.role === 'organizer') {
      status = 'pending';
    }

    // Set default isEmailVerified to false if not provided
    const isEmailVerified = userData.isEmailVerified || false;

    // Create user document
    const user: Omit<IUser, '_id'> = {
      email,
      passwordHash: userData.passwordHash,
      fullName: userData.fullName,
      role: userData.role,
      status,
      isEmailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await this.collection.insertOne(user as IUser);
      return {
        _id: result.insertedId,
        ...user,
      } as IUser;
    } catch (error: any) {
      // Handle duplicate email error (MongoDB error code 11000)
      if (error.code === 11000) {
        throw new Error('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Find a user by email
   * 
   * @param email User email (case-insensitive)
   * @returns The user document or null if not found
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return this.collection.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find a user by ID
   * 
   * @param id User ID
   * @returns The user document or null if not found
   */
  async findById(id: ObjectId | string): Promise<IUser | null> {
    const userId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.collection.findOne({ _id: userId });
  }

  /**
   * Find users by role and status
   * Useful for admin queries (e.g., pending organizers)
   * 
   * @param role User role
   * @param status User status
   * @returns Array of matching user documents
   */
  async findByRoleAndStatus(role: UserRole, status: UserStatus): Promise<IUser[]> {
    return this.collection.find({ role, status }).toArray();
  }

  /**
   * Find all users by role (any status)
   * Useful for admin overview queries
   *
   * @param role User role
   * @returns Array of matching user documents, sorted by createdAt descending
   */
  async findByRole(role: UserRole): Promise<IUser[]> {
    return this.collection.find({ role }).sort({ createdAt: -1 }).toArray();
  }

  /**
   * Update a user by ID
   * 
   * @param id User ID
   * @param updateData Partial user data to update
   * @returns The updated user document or null if not found
   * @throws Error if validation fails
   */
  async updateById(
    id: ObjectId | string,
    updateData: Partial<Omit<IUser, '_id' | 'createdAt'>>
  ): Promise<IUser | null> {
    // Validate update data
    this.validateUserData(updateData as Partial<IUserCreate>);

    const userId = typeof id === 'string' ? new ObjectId(id) : id;

    // Convert email to lowercase if being updated
    const dataToUpdate = { ...updateData };
    if (dataToUpdate.email) {
      dataToUpdate.email = dataToUpdate.email.toLowerCase();
    }

    // Always update the updatedAt timestamp
    const updateDoc = {
      ...dataToUpdate,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: userId },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result || null;
  }

  /**
   * Delete a user by ID
   * 
   * @param id User ID
   * @returns true if deleted, false if not found
   */
  async deleteById(id: ObjectId | string): Promise<boolean> {
    const userId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: userId });
    return result.deletedCount > 0;
  }

  /**
   * Check if a user exists by email
   * 
   * @param email User email
   * @returns true if user exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  /**
   * Get the total count of users
   * 
   * @param filter Optional filter criteria
   * @returns Total count
   */
  async count(filter?: Partial<IUser>): Promise<number> {
    return this.collection.countDocuments(filter || {});
  }

  /**
   * Get the underlying MongoDB collection
   * For advanced queries not covered by the model methods
   * 
   * @returns The MongoDB collection
   */
  getCollection(): Collection<IUser> {
    return this.collection;
  }
}

// Export a singleton instance
export default new UserModel();
