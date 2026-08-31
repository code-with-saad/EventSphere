/**
 * Integration Tests — BookmarkService
 *
 * Task 24 (sub-tasks 24a–24c)
 *
 * 24a. add(): idempotent upsert — returns existing if already bookmarked
 * 24b. remove(): no-op if not found, removes correctly otherwise
 * 24c. listForAttendeeAndExpo(): filters bookmarked sessions for an expo, sorted by startTime
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import BookmarkService from '../services/bookmark.service';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from './helpers/db';

// ── Mock email service (not needed here but prevents real SMTP calls) ─────────
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

async function insertExpo(organizerId: string): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Bookmark Test Expo',
    description: 'test',
    status: 'published',
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

async function insertSession(expoId: string, startOffsetHours: number): Promise<string> {
  const db = getTestDb();
  const base = Date.now() + 86400000 * 30;
  const result = await db.collection('sessions').insertOne({
    expoId: new ObjectId(expoId),
    title: `Session at +${startOffsetHours}h`,
    speakerName: 'Speaker',
    startTime: new Date(base + startOffsetHours * 3600000),
    endTime: new Date(base + (startOffsetHours + 1) * 3600000),
    room: 'Hall A',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

// ── BookmarkService.add() ─────────────────────────────────────────────────────

describe('BookmarkService.add()', () => {
  // Shared organizer ID (not a real user — just a valid ObjectId for expo creation)
  let organizerId: string;

  beforeAll(() => {
    organizerId = new ObjectId().toString();
  });

  it('24a-1: adds bookmark → returns IBookmark with correct sessionId/attendeeId', async () => {
    const expoId = await insertExpo(organizerId);
    const sessionId = await insertSession(expoId, 0);
    const attendeeId = new ObjectId().toString();

    const result = await BookmarkService.add(sessionId, attendeeId);

    expect(result._id).toBeDefined();
    expect(result.sessionId.toString()).toBe(sessionId);
    expect(result.attendeeId.toString()).toBe(attendeeId);
  });

  it('24a-2: idempotent — calling twice returns the same bookmark, no duplicate in DB', async () => {
    const expoId = await insertExpo(organizerId);
    const sessionId = await insertSession(expoId, 0);
    const attendeeId = new ObjectId().toString();

    const first = await BookmarkService.add(sessionId, attendeeId);
    const second = await BookmarkService.add(sessionId, attendeeId);

    // Both calls should resolve without throwing
    expect(first._id).toBeDefined();
    expect(second._id).toBeDefined();

    // The returned _id must be identical
    expect(first._id.toString()).toBe(second._id.toString());

    // Only one document in DB
    const db = getTestDb();
    const count = await db.collection('bookmarks').countDocuments({
      sessionId: new ObjectId(sessionId),
      attendeeId: new ObjectId(attendeeId),
    });
    expect(count).toBe(1);
  });

  it('24a-3: two different attendees can bookmark the same session independently', async () => {
    const expoId = await insertExpo(organizerId);
    const sessionId = await insertSession(expoId, 0);
    const attendeeA = new ObjectId().toString();
    const attendeeB = new ObjectId().toString();

    await BookmarkService.add(sessionId, attendeeA);
    await BookmarkService.add(sessionId, attendeeB);

    const db = getTestDb();
    const count = await db.collection('bookmarks').countDocuments({
      sessionId: new ObjectId(sessionId),
    });
    expect(count).toBe(2);
  });
});

// ── BookmarkService.remove() ──────────────────────────────────────────────────

describe('BookmarkService.remove()', () => {
  let organizerId: string;

  beforeAll(() => {
    organizerId = new ObjectId().toString();
  });

  it('24b-1: removes an existing bookmark → void returned, record gone from DB', async () => {
    const expoId = await insertExpo(organizerId);
    const sessionId = await insertSession(expoId, 0);
    const attendeeId = new ObjectId().toString();

    await BookmarkService.add(sessionId, attendeeId);
    await BookmarkService.remove(sessionId, attendeeId);

    const db = getTestDb();
    const count = await db.collection('bookmarks').countDocuments({
      sessionId: new ObjectId(sessionId),
      attendeeId: new ObjectId(attendeeId),
    });
    expect(count).toBe(0);
  });

  it('24b-2: no-op when bookmark does not exist → resolves without throwing', async () => {
    const randomSessionId = new ObjectId().toString();
    const randomAttendeeId = new ObjectId().toString();

    // Should not throw — returns void
    const result = await BookmarkService.remove(randomSessionId, randomAttendeeId);
    expect(result).toBeUndefined();
  });

  it('24b-3: only removes the matching bookmark, others intact', async () => {
    const expoId = await insertExpo(organizerId);
    const sessionId = await insertSession(expoId, 0);
    const attendeeA = new ObjectId().toString();
    const attendeeB = new ObjectId().toString();

    await BookmarkService.add(sessionId, attendeeA);
    await BookmarkService.add(sessionId, attendeeB);

    // Remove only attendeeA's bookmark
    await BookmarkService.remove(sessionId, attendeeA);

    const db = getTestDb();
    const count = await db.collection('bookmarks').countDocuments({
      sessionId: new ObjectId(sessionId),
    });
    expect(count).toBe(1);

    // AttendeeB's bookmark must still exist
    const remaining = await db.collection('bookmarks').findOne({
      sessionId: new ObjectId(sessionId),
      attendeeId: new ObjectId(attendeeB),
    });
    expect(remaining).not.toBeNull();
  });
});

// ── BookmarkService.listForAttendeeAndExpo() ──────────────────────────────────

describe('BookmarkService.listForAttendeeAndExpo()', () => {
  let organizerId: string;

  beforeAll(() => {
    organizerId = new ObjectId().toString();
  });

  it('24c-1: returns only bookmarked sessions for the attendee in that expo, sorted by startTime', async () => {
    const expoId = await insertExpo(organizerId);
    // Insert three sessions at offsets 0h, 1h, 2h
    const session0h = await insertSession(expoId, 0);
    await insertSession(expoId, 1); // middle session — intentionally not bookmarked
    const session2h = await insertSession(expoId, 2);

    const attendeeId = new ObjectId().toString();

    // Bookmark sessions at 0h and 2h — skip 1h
    await BookmarkService.add(session0h, attendeeId);
    await BookmarkService.add(session2h, attendeeId);

    const result = await BookmarkService.listForAttendeeAndExpo(attendeeId, expoId);

    expect(result.length).toBe(2);

    // Should preserve startTime sort order (0h before 2h)
    expect(result[0].title).toBe('Session at +0h');
    expect(result[1].title).toBe('Session at +2h');

    // The 1h session must not appear
    const titles = result.map((s) => s.title);
    expect(titles).not.toContain('Session at +1h');

    // Verify sorted by startTime ascending
    expect(result[0].startTime.getTime()).toBeLessThan(result[1].startTime.getTime());
  });

  it('24c-2: returns empty array when attendee has no bookmarks in this expo', async () => {
    const expoId = await insertExpo(organizerId);
    await insertSession(expoId, 0);
    await insertSession(expoId, 1);

    const attendeeId = new ObjectId().toString();

    const result = await BookmarkService.listForAttendeeAndExpo(attendeeId, expoId);

    expect(result).toEqual([]);
  });

  it('24c-3: returns empty array for expo with no sessions', async () => {
    const expoId = await insertExpo(organizerId);
    const attendeeId = new ObjectId().toString();

    const result = await BookmarkService.listForAttendeeAndExpo(attendeeId, expoId);

    expect(result).toEqual([]);
  });

  it('24c-4: does not leak bookmarks from other expos', async () => {
    const expoA = await insertExpo(organizerId);
    const expoB = await insertExpo(organizerId);

    const sessionA = await insertSession(expoA, 0);
    const sessionB = await insertSession(expoB, 0);

    const attendeeId = new ObjectId().toString();

    // Attendee bookmarks both sessions (in different expos)
    await BookmarkService.add(sessionA, attendeeId);
    await BookmarkService.add(sessionB, attendeeId);

    // Query only expo A
    const result = await BookmarkService.listForAttendeeAndExpo(attendeeId, expoA);

    expect(result.length).toBe(1);
    expect(result[0]._id.toString()).toBe(sessionA);

    // Session B from expo B must not appear
    const ids = result.map((s) => s._id.toString());
    expect(ids).not.toContain(sessionB);
  });
});
