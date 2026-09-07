import { Collection, Db, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';

export interface IDirectMessage {
  _id: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  recipientId: ObjectId;
  recipientName: string;
  recipientRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  content: string;
  attachmentUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface IDirectMessageCreate {
  senderId: ObjectId;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  recipientId: ObjectId;
  recipientName: string;
  recipientRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  content: string;
  attachmentUrl?: string;
}

export class DirectMessageModel {
  private _collection: Collection<IDirectMessage> | null = null;

  private get collection(): Collection<IDirectMessage> {
    if (!this._collection) {
      const db = getDatabase();
      this._collection = db.collection<IDirectMessage>('direct_messages');
    }
    return this._collection;
  }

  constructor(db?: Db) {
    if (db) {
      this._collection = db.collection<IDirectMessage>('direct_messages');
    }
  }

  async createIndexes(): Promise<void> {
    try {
      await this.collection.createIndex(
        { senderId: 1, recipientId: 1, createdAt: 1 },
        { name: 'direct_msg_participants_idx' }
      );
      await this.collection.createIndex(
        { recipientId: 1, isRead: 1 },
        { name: 'direct_msg_unread_idx' }
      );
      console.log('✓ DirectMessage indexes created successfully');
    } catch (error) {
      console.error('✗ Failed to create DirectMessage indexes:', error);
      throw error;
    }
  }

  async create(data: IDirectMessageCreate): Promise<IDirectMessage> {
    const doc: Omit<IDirectMessage, '_id'> = {
      ...data,
      isRead: false,
      createdAt: new Date(),
    };
    const result = await this.collection.insertOne(doc as IDirectMessage);
    return {
      _id: result.insertedId,
      ...doc,
    } as IDirectMessage;
  }

  async getConversation(userId1: ObjectId | string, userId2: ObjectId | string): Promise<IDirectMessage[]> {
    const u1 = typeof userId1 === 'string' ? new ObjectId(userId1) : userId1;
    const u2 = typeof userId2 === 'string' ? new ObjectId(userId2) : userId2;

    return this.collection
      .find({
        $or: [
          { senderId: u1, recipientId: u2 },
          { senderId: u2, recipientId: u1 },
        ],
      })
      .sort({ createdAt: 1 })
      .toArray();
  }

  async markAsRead(recipientId: ObjectId | string, senderId: ObjectId | string): Promise<void> {
    const recId = typeof recipientId === 'string' ? new ObjectId(recipientId) : recipientId;
    const sndId = typeof senderId === 'string' ? new ObjectId(senderId) : senderId;

    await this.collection.updateMany(
      { recipientId: recId, senderId: sndId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  getCollection(): Collection<IDirectMessage> {
    return this.collection;
  }
}

export default new DirectMessageModel();
