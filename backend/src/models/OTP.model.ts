import { Db, Collection, ObjectId } from 'mongodb';

/**
 * IOTP Interface
 * Defines the structure for OTP documents stored in MongoDB
 */
export interface IOTP {
  _id?: ObjectId;
  email: string;              // Associated user email
  otpHash: string;            // bcrypt hash of 6-digit OTP
  purpose: 'registration' | 'password_reset';
  expiresAt: Date;            // Current time + 5 minutes
  resendCount: number;        // Max 3 attempts
  createdAt: Date;
}

/**
 * OTP Model Class
 * Handles OTP document operations with MongoDB
 */
export class OTPModel {
  private collection: Collection<IOTP>;

  constructor(db: Db) {
    this.collection = db.collection<IOTP>('otps');
    this.ensureIndexes();
  }

  /**
   * Ensure required indexes are created
   * - Compound unique index on email + purpose
   * - TTL index on expiresAt for auto-deletion
   */
  private async ensureIndexes(): Promise<void> {
    try {
      // Compound unique index: one OTP per email per purpose
      await this.collection.createIndex(
        { email: 1, purpose: 1 },
        { unique: true }
      );

      // TTL index: auto-delete expired OTPs
      await this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );

      console.log('✓ OTP indexes created successfully');
    } catch (error) {
      console.error('Error creating OTP indexes:', error);
    }
  }

  /**
   * Create a new OTP document
   */
  async create(otpData: Omit<IOTP, '_id' | 'createdAt'>): Promise<IOTP> {
    const document: IOTP = {
      ...otpData,
      email: otpData.email.toLowerCase(),
      createdAt: new Date()
    };

    const result = await this.collection.insertOne(document as any);
    return { ...document, _id: result.insertedId };
  }

  /**
   * Find OTP by email and purpose
   */
  async findByEmailAndPurpose(
    email: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<IOTP | null> {
    return this.collection.findOne({
      email: email.toLowerCase(),
      purpose
    });
  }

  /**
   * Update existing OTP (for resend)
   */
  async updateOTP(
    email: string,
    purpose: 'registration' | 'password_reset',
    otpHash: string,
    expiresAt: Date,
    resendCount: number
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { email: email.toLowerCase(), purpose },
      {
        $set: {
          otpHash,
          expiresAt,
          resendCount
        }
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete OTP by email and purpose
   */
  async deleteByEmailAndPurpose(
    email: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<boolean> {
    const result = await this.collection.deleteOne({
      email: email.toLowerCase(),
      purpose
    });

    return result.deletedCount > 0;
  }

  /**
   * Delete OTP by ID
   */
  async deleteById(id: ObjectId): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  /**
   * Check if OTP has expired
   */
  isExpired(otp: IOTP): boolean {
    return new Date() > otp.expiresAt;
  }

  /**
   * Check if resend limit has been reached
   */
  hasReachedResendLimit(otp: IOTP): boolean {
    return otp.resendCount >= 3;
  }
}

/**
 * Factory function to create OTP model instance
 */
export function createOTPModel(db: Db): OTPModel {
  return new OTPModel(db);
}
