import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface IMessage {
  _id: ObjectId;
  applicationId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'superadmin';
  content: string;
  attachmentUrl?: string;
  isRead?: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface IMessageCreate {
  applicationId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'superadmin';
  content: string;
  attachmentUrl?: string;
}

export class MessageModel {
  private _collection: Collection<IMessage> | null = null;

  private get collection(): Collection<IMessage> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IMessage>('messages');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IMessage>('messages');
    }
  }

  async createIndexes(): Promise<void> {
    try {
      await this.collection.createIndex(
        { applicationId: 1, createdAt: 1 },
        { name: 'app_createdAt_idx' }
      );
      await this.collection.createIndex(
        { applicationId: 1, isRead: 1 },
        { name: 'app_unread_idx' }
      );
      console.log('✓ Message indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create message indexes:', error);
      throw error;
    }
  }

  async create(data: IMessageCreate): Promise<IMessage> {
    const doc: Omit<IMessage, '_id'> = {
      ...data,
      isRead: false,
      createdAt: new Date(),
    };
    const result = await this.collection.insertOne(doc as IMessage);
    return {
      _id: result.insertedId,
      ...doc,
    } as IMessage;
  }

  async findByApplication(applicationId: ObjectId | string): Promise<IMessage[]> {
    const appId = typeof applicationId === 'string' ? new ObjectId(applicationId) : applicationId;
    return this.collection.find({ applicationId: appId }).sort({ createdAt: 1 }).toArray();
  }

  async markAsRead(applicationId: ObjectId | string, currentUserId: ObjectId | string): Promise<void> {
    const appId = typeof applicationId === 'string' ? new ObjectId(applicationId) : applicationId;
    const currId = typeof currentUserId === 'string' ? new ObjectId(currentUserId) : currentUserId;
    await this.collection.updateMany(
      { applicationId: appId, senderId: { $ne: currId }, isRead: { $ne: true } },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  getCollection(): Collection<IMessage> {
    return this.collection;
  }
}

export default new MessageModel();
