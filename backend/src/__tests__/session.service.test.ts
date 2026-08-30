/**
 * Integration Tests — SessionService
 *
 * Task 23: Direct service-layer tests against the real test MongoDB instance.
 * Covers all five sub-tasks: create (23a), update (23b), delete (23c),
 * listByExpo (23d), and the private checkRoomConflict (23e) exercised
 * indirectly through create/update.
 *
 * Requirements: REQ-6, REQ-6.1, REQ-6.5, REQ-6.7
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from './helpers/db';
import { createTestUser } from './helpers/auth';
import SessionService from '../services/session.service';

// ── Mock email service (prevents real SMTP calls) ─────────────────────────────
vi.mock('../services/email.service', () => ({
  createEmailService: vi.fn(() => ({
    sendOTPEmail: vi.fn().mockResolvedValue(true),
  })),
  EmailService: vi.fn(),
}));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

beforeEach(async () => {
  await clearCollections();
  const db = getTestDb();
  await db.collection('expos').deleteMany({});
  await db.collection('sessions').deleteMany({});
  await db.collection('bookmarks').deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Insert an expo document directly into the test DB and return its string ID.
 */
async function insertExpo(organizerId: string, status = 'published'): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Session Test Expo',
    description: 'test',
    status,
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Venue',
    venueAddress: 'Addr',
    totalBooths: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

/**
 * Build a pair of start/end Date objects offset from 30 days in the future.
 * startOffsetHours: how many hours after the base timestamp to start
 * durationHours:    length of the session in hours
 */
function makeTimes(startOffsetHours: number, durationHours: number) {
  const base = Date.now() + 86400000 * 30; // 30 days from now
  return {
    startTime: new Date(base + startOffsetHours * 3600000),
    endTime: new Date(base + (startOffsetHours + durationHours) * 3600000),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionService.create()  (task 23a)
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionService.create()', () => {
  it('1. valid session → created and returned with correct fields', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const result = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Opening Keynote',
      speakerName: 'Jane Doe',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    expect(result).toBeDefined();
    expect(result.title).toBe('Opening Keynote');
    expect(result.room).toBe('Hall A');
    expect(result.speakerName).toBe('Jane Doe');
    expect(result.expoId.toString()).toBe(expoId);
  });

  it('2a. endTime === startTime → throws INVALID_TIME_RANGE (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());
    const t = new Date(Date.now() + 86400000 * 30);

    let caughtError: any;
    try {
      await SessionService.create(expoId, organizer._id.toString(), {
        title: 'Bad Session',
        speakerName: 'No One',
        startTime: t,
        endTime: t, // equal — invalid
        room: 'Hall A',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('INVALID_TIME_RANGE');
    expect(caughtError.statusCode).toBe(400);
  });

  it('2b. endTime < startTime → throws INVALID_TIME_RANGE (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());
    const times = makeTimes(2, 1);

    let caughtError: any;
    try {
      await SessionService.create(expoId, organizer._id.toString(), {
        title: 'Backwards Session',
        speakerName: 'No One',
        startTime: times.endTime,   // swap: end before start
        endTime: times.startTime,
        room: 'Hall A',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('INVALID_TIME_RANGE');
    expect(caughtError.statusCode).toBe(400);
  });

  it('3. overlapping room → throws ROOM_CONFLICT (409)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    // Create first session: Hall A, 0h–1h
    await SessionService.create(expoId, organizer._id.toString(), {
      title: 'First Session',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Attempt conflicting session: Hall A, 0h30–1h30 (overlaps first by 30 min)
    let caughtError: any;
    try {
      await SessionService.create(expoId, organizer._id.toString(), {
        title: 'Conflicting Session',
        speakerName: 'Bob',
        ...makeTimes(0.5, 1),
        room: 'Hall A',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('ROOM_CONFLICT');
    expect(caughtError.statusCode).toBe(409);
    expect(caughtError.conflictingSession).toBeDefined();
  });

  it('4. same room at non-overlapping times (back-to-back) → succeeds', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    // Session A: Hall A, 0h–1h
    await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session A',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Session B: Hall A, 1h–2h (starts exactly when A ends — no overlap)
    const result = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session B',
      speakerName: 'Bob',
      ...makeTimes(1, 1),
      room: 'Hall A',
    });

    expect(result).toBeDefined();
    expect(result.title).toBe('Session B');
  });

  it('5. wrong organizerId → throws SESSION_FORBIDDEN (403)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const otherOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    let caughtError: any;
    try {
      await SessionService.create(expoId, otherOrganizer._id.toString(), {
        title: 'Unauthorized',
        speakerName: 'Hacker',
        ...makeTimes(0, 1),
        room: 'Hall A',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('SESSION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });

  it('6. non-existent expo → throws EXPO_NOT_FOUND (404)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const fakeExpoId = new ObjectId().toString();

    let caughtError: any;
    try {
      await SessionService.create(fakeExpoId, organizer._id.toString(), {
        title: 'Ghost Session',
        speakerName: 'No Expo',
        ...makeTimes(0, 1),
        room: 'Hall A',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SessionService.update()  (task 23b)
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionService.update()', () => {
  it('1. owner can update title → returns updated session', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const session = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Original Title',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    const updated = await SessionService.update(session._id.toString(), organizer._id.toString(), {
      title: 'Updated Title',
    });

    expect(updated.title).toBe('Updated Title');
    expect(updated._id.toString()).toBe(session._id.toString());
  });

  it('2. endTime === startTime on update → throws INVALID_TIME_RANGE (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const session = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Valid Session',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Set endTime equal to existing startTime → invalid
    let caughtError: any;
    try {
      await SessionService.update(session._id.toString(), organizer._id.toString(), {
        endTime: session.startTime,
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('INVALID_TIME_RANGE');
    expect(caughtError.statusCode).toBe(400);
  });

  it('3. room conflict on update → throws ROOM_CONFLICT (409)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    // Session A: Hall A, 0h–1h
    await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session A',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Session B: Hall B, 0h–1h
    const sessionB = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session B',
      speakerName: 'Bob',
      ...makeTimes(0, 1),
      room: 'Hall B',
    });

    // Move Session B to Hall A at same time → conflict with A
    let caughtError: any;
    try {
      await SessionService.update(sessionB._id.toString(), organizer._id.toString(), {
        room: 'Hall A',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('ROOM_CONFLICT');
    expect(caughtError.statusCode).toBe(409);
  });

  it('4. update excludes self from conflict check → no false conflict', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    // Session A in Hall A
    const sessionA = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session A',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Update A's title only — self should be excluded from conflict check
    const updated = await SessionService.update(sessionA._id.toString(), organizer._id.toString(), {
      title: 'Session A (Updated)',
    });

    expect(updated.title).toBe('Session A (Updated)');
  });

  it('5. non-owner → throws SESSION_FORBIDDEN (403)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const otherOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const session = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'My Session',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    let caughtError: any;
    try {
      await SessionService.update(session._id.toString(), otherOrganizer._id.toString(), {
        title: 'Hijacked',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('SESSION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SessionService.delete()  (task 23c)
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionService.delete()', () => {
  it('1. owner can delete session → void returned, session gone from DB', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const session = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'To Delete',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Should resolve without throwing and return undefined
    await expect(
      SessionService.delete(session._id.toString(), organizer._id.toString())
    ).resolves.toBeUndefined();

    // Session must be gone from DB
    const db = getTestDb();
    const found = await db.collection('sessions').findOne({ _id: session._id });
    expect(found).toBeNull();
  });

  it('2. delete cascades bookmarks (REQ-6.7)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());
    const db = getTestDb();

    const session = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session With Bookmarks',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Insert 2 bookmark documents directly into DB
    const attendeeA = new ObjectId();
    const attendeeB = new ObjectId();
    await db.collection('bookmarks').insertMany([
      { sessionId: session._id, attendeeId: attendeeA, createdAt: new Date() },
      { sessionId: session._id, attendeeId: attendeeB, createdAt: new Date() },
    ]);

    // Verify bookmarks exist before delete
    const beforeCount = await db.collection('bookmarks').countDocuments({ sessionId: session._id });
    expect(beforeCount).toBe(2);

    // Delete session
    await SessionService.delete(session._id.toString(), organizer._id.toString());

    // All bookmarks for that session must be gone
    const afterCount = await db.collection('bookmarks').countDocuments({ sessionId: session._id });
    expect(afterCount).toBe(0);
  });

  it('3. non-owner → throws SESSION_FORBIDDEN (403)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const otherOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const session = await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Protected Session',
      speakerName: 'Alice',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    let caughtError: any;
    try {
      await SessionService.delete(session._id.toString(), otherOrganizer._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('SESSION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);

    // Session must still exist
    const db = getTestDb();
    const found = await db.collection('sessions').findOne({ _id: session._id });
    expect(found).not.toBeNull();
  });

  it('4. non-existent sessionId → throws SESSION_NOT_FOUND (404)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const fakeId = new ObjectId().toString();

    let caughtError: any;
    try {
      await SessionService.delete(fakeId, organizer._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('SESSION_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SessionService.listByExpo()  (task 23d)
// ─────────────────────────────────────────────────────────────────────────────

describe('SessionService.listByExpo()', () => {
  it('1. returns sessions sorted by startTime ascending', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    // Create sessions in non-chronological order
    await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session C',
      speakerName: 'Carol',
      ...makeTimes(2, 1), // starts at offset +2h
      room: 'Hall A',
    });
    await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session A',
      speakerName: 'Alice',
      ...makeTimes(0, 1), // starts at offset +0h
      room: 'Hall B',
    });
    await SessionService.create(expoId, organizer._id.toString(), {
      title: 'Session B',
      speakerName: 'Bob',
      ...makeTimes(1, 1), // starts at offset +1h
      room: 'Hall C',
    });

    const sessions = await SessionService.listByExpo(expoId);

    expect(sessions.length).toBe(3);
    // Verify ascending order
    expect(sessions[0].title).toBe('Session A');
    expect(sessions[1].title).toBe('Session B');
    expect(sessions[2].title).toBe('Session C');
    // Verify startTime is non-decreasing
    expect(sessions[0].startTime.getTime()).toBeLessThanOrEqual(sessions[1].startTime.getTime());
    expect(sessions[1].startTime.getTime()).toBeLessThanOrEqual(sessions[2].startTime.getTime());
  });

  it('2. returns empty array for expo with no sessions', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString());

    const sessions = await SessionService.listByExpo(expoId);

    expect(sessions).toEqual([]);
  });
});
