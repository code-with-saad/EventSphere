/**
 * Integration Tests — StatsService
 *
 * Task 29 (sub-tasks 29a–29c)
 *
 * 29a. getOrganizerDashboard(): active expo counts, attendee/checkin totals, fill rate, recentExpos
 * 29b. getExpoStats(): per-expo stats, error cases (not found, wrong organizer)
 * 29c. getSuperAdminDashboard(): platform-wide totals, recentExpos with organizer name
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import StatsService from '../services/stats.service';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from './helpers/db';
import { createTestUser } from './helpers/auth';

// ── Mock email service ────────────────────────────────────────────────────────
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
  await db.collection('tickets').deleteMany({});
  await db.collection('applications').deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function insertExpo(
  organizerId: string,
  status = 'published',
  totalBooths = 10,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Stats Test Expo',
    description: 'test',
    status,
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Venue',
    venueAddress: 'Addr',
    totalBooths,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return result.insertedId.toString();
}

async function insertTicket(expoId: string, attendeeId: string, status = 'active'): Promise<void> {
  const db = getTestDb();
  await db.collection('tickets').insertOne({
    ticketId: `ticket-${Math.random()}`,
    expoId: new ObjectId(expoId),
    attendeeId: new ObjectId(attendeeId),
    status,
    registeredAt: new Date(),
    updatedAt: new Date(),
  });
}

async function insertApplication(
  expoId: string,
  exhibitorId: string,
  status = 'pending',
  boothLabel?: string
): Promise<void> {
  const db = getTestDb();
  const doc: any = {
    expoId: new ObjectId(expoId),
    exhibitorId: new ObjectId(exhibitorId),
    status,
    companyName: 'Test Co',
    companyDescription: 'desc',
    category: 'Tech',
    phoneNumber: '+1234567890',
    submittedAt: new Date(),
    updatedAt: new Date(),
  };
  if (boothLabel) doc.boothLabel = boothLabel;
  await db.collection('applications').insertOne(doc);
}

// ── StatsService.getOrganizerDashboard() — 29a ────────────────────────────────

describe('StatsService.getOrganizerDashboard()', () => {
  let organizerId: string;

  beforeAll(async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    organizerId = organizer._id.toString();
  });

  it('29a-1: returns correct counts for organizer with active expos', async () => {
    const attendeeId = new ObjectId().toString();
    const exhibitorId = new ObjectId().toString();

    // 2 published expos (5 booths each), 1 draft that should NOT count
    const expoA = await insertExpo(organizerId, 'published', 5);
    const expoB = await insertExpo(organizerId, 'published', 5);
    await insertExpo(organizerId, 'draft', 10); // should be excluded

    // 3 active tickets + 1 checked_in across the 2 published expos
    await insertTicket(expoA, attendeeId, 'active');
    await insertTicket(expoA, attendeeId, 'active');
    await insertTicket(expoB, attendeeId, 'active');
    await insertTicket(expoB, attendeeId, 'checked_in');

    // 2 approved applications across both expos
    await insertApplication(expoA, exhibitorId, 'approved', 'A1');
    await insertApplication(expoB, exhibitorId, 'approved', 'B1');

    const result = await StatsService.getOrganizerDashboard(organizerId);

    expect(result.activeExpoCount).toBe(2);
    expect(result.totalAttendees).toBe(4); // all 4 tickets
    expect(result.totalCheckIns).toBe(1);
    // 2 approved / 10 total booths * 100 = 20.00
    expect(result.aggregateBoothFillRate).toBe(20);
  });

  it('29a-2: returns zeros when no active expos', async () => {
    // Only a draft expo
    await insertExpo(organizerId, 'draft', 10);

    const result = await StatsService.getOrganizerDashboard(organizerId);

    expect(result.activeExpoCount).toBe(0);
    expect(result.totalAttendees).toBe(0);
    expect(result.totalCheckIns).toBe(0);
    expect(result.aggregateBoothFillRate).toBe(0);
    // recentExpos still shows the draft expo (any status)
    expect(result.recentExpos.length).toBe(1);
    expect(result.recentExpos[0].status).toBe('draft');
  });

  it('29a-3: recentExpos returns up to 5 expos sorted by updatedAt desc', async () => {
    const db = getTestDb();
    const baseTime = Date.now();

    // Insert 6 expos with sequential updatedAt values
    for (let i = 0; i < 6; i++) {
      await db.collection('expos').insertOne({
        organizerId: new ObjectId(organizerId),
        name: `Expo ${i}`,
        description: 'test',
        status: 'draft',
        startDate: new Date(baseTime + 86400000 * 30),
        endDate: new Date(baseTime + 86400000 * 32),
        venueName: 'Venue',
        venueAddress: 'Addr',
        totalBooths: 10,
        createdAt: new Date(baseTime + i * 1000),
        updatedAt: new Date(baseTime + i * 1000),
      });
    }

    const result = await StatsService.getOrganizerDashboard(organizerId);

    expect(result.recentExpos.length).toBe(5);
    // Most recently updated first: Expo 5, 4, 3, 2, 1
    expect(result.recentExpos[0].name).toBe('Expo 5');
    expect(result.recentExpos[4].name).toBe('Expo 1');
  });

  it('29a-4: includes ongoing expos (not just published)', async () => {
    await insertExpo(organizerId, 'published', 10);
    await insertExpo(organizerId, 'ongoing', 10);

    const result = await StatsService.getOrganizerDashboard(organizerId);

    expect(result.activeExpoCount).toBe(2);
  });
});

// ── StatsService.getExpoStats() — 29b ─────────────────────────────────────────

describe('StatsService.getExpoStats()', () => {
  let organizerId: string;

  beforeAll(async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    organizerId = organizer._id.toString();
  });

  it('29b-1: returns correct per-expo stats', async () => {
    const exhibitorId = new ObjectId().toString();
    const attendeeId = new ObjectId().toString();

    // 10-booth expo
    const expoId = await insertExpo(organizerId, 'published', 10);

    // Applications: 2 pending, 1 approved, 1 rejected
    await insertApplication(expoId, exhibitorId, 'pending');
    await insertApplication(expoId, exhibitorId, 'pending');
    await insertApplication(expoId, exhibitorId, 'approved', 'A1');
    await insertApplication(expoId, exhibitorId, 'rejected');

    // Tickets: 3 active, 1 checked_in
    await insertTicket(expoId, attendeeId, 'active');
    await insertTicket(expoId, attendeeId, 'active');
    await insertTicket(expoId, attendeeId, 'active');
    await insertTicket(expoId, attendeeId, 'checked_in');

    const result = await StatsService.getExpoStats(expoId, organizerId);

    expect(result.totalApplications).toBe(4);
    expect(result.pendingApplications).toBe(2);
    expect(result.approvedExhibitors).toBe(1);
    expect(result.rejectedApplications).toBe(1);
    expect(result.totalAttendees).toBe(4);
    expect(result.confirmedCheckIns).toBe(1);
    // 1 approved / 10 booths * 100 = 10.00
    expect(result.boothFillRate).toBe(10);
  });

  it('29b-2: boothFillRate is 0 when totalBooths is 0 (edge case)', async () => {
    const db = getTestDb();
    // Insert expo with totalBooths: 0 directly
    const res = await db.collection('expos').insertOne({
      organizerId: new ObjectId(organizerId),
      name: 'Zero Booth Expo',
      description: 'test',
      status: 'published',
      startDate: new Date(Date.now() + 86400000 * 30),
      endDate: new Date(Date.now() + 86400000 * 32),
      venueName: 'Venue',
      venueAddress: 'Addr',
      totalBooths: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const expoId = res.insertedId.toString();

    const result = await StatsService.getExpoStats(expoId, organizerId);

    expect(result.boothFillRate).toBe(0);
  });

  it('29b-3: throws EXPO_NOT_FOUND (404) for non-existent expo', async () => {
    const fakeId = new ObjectId().toString();

    await expect(StatsService.getExpoStats(fakeId, organizerId)).rejects.toMatchObject({
      code: 'EXPO_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('29b-4: throws STATS_FORBIDDEN (403) for wrong organizer', async () => {
    const expoId = await insertExpo(organizerId, 'published', 10);
    const wrongOrganizerId = new ObjectId().toString();

    await expect(StatsService.getExpoStats(expoId, wrongOrganizerId)).rejects.toMatchObject({
      code: 'STATS_FORBIDDEN',
      statusCode: 403,
    });
  });
});

// ── StatsService.getSuperAdminDashboard() — 29c ───────────────────────────────

describe('StatsService.getSuperAdminDashboard()', () => {
  it('29c-1: returns correct platform-wide totals', async () => {
    const orgA = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const orgB = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendeeId = new ObjectId().toString();
    const exhibitorId = new ObjectId().toString();

    // 3 expos across 2 organizers
    const expoA = await insertExpo(orgA._id.toString(), 'published', 10);
    const expoB = await insertExpo(orgA._id.toString(), 'published', 10);
    const expoC = await insertExpo(orgB._id.toString(), 'published', 10);

    // 5 tickets (2 checked_in)
    await insertTicket(expoA, attendeeId, 'active');
    await insertTicket(expoA, attendeeId, 'checked_in');
    await insertTicket(expoB, attendeeId, 'active');
    await insertTicket(expoC, attendeeId, 'active');
    await insertTicket(expoC, attendeeId, 'checked_in');

    // 4 applications
    await insertApplication(expoA, exhibitorId, 'pending');
    await insertApplication(expoA, exhibitorId, 'approved', 'A1');
    await insertApplication(expoB, exhibitorId, 'pending');
    await insertApplication(expoC, exhibitorId, 'rejected');

    const result = await StatsService.getSuperAdminDashboard();

    expect(result.totalExpos).toBe(3);
    expect(result.totalAttendees).toBe(5);
    expect(result.totalApplications).toBe(4);
    expect(result.totalCheckIns).toBe(2);
  });

  it('29c-2: recentExpos contains organizer name from users join', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
      fullName: 'John Organizer',
    });

    await insertExpo(organizer._id.toString(), 'published', 10);

    const result = await StatsService.getSuperAdminDashboard();

    expect(result.recentExpos.length).toBeGreaterThan(0);
    expect(result.recentExpos[0].organizerName).toBeTruthy();
    expect(typeof result.recentExpos[0].organizerName).toBe('string');
    expect(result.recentExpos[0].organizerName.length).toBeGreaterThan(0);
  });

  it('29c-3: recentExpos limited to 5, sorted by createdAt desc', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const db = getTestDb();
    const baseTime = Date.now();

    // Insert 6 expos with sequential createdAt values
    for (let i = 0; i < 6; i++) {
      await db.collection('expos').insertOne({
        organizerId: organizer._id,
        name: `SuperAdmin Expo ${i}`,
        description: 'test',
        status: 'published',
        startDate: new Date(baseTime + 86400000 * 30),
        endDate: new Date(baseTime + 86400000 * 32),
        venueName: 'Venue',
        venueAddress: 'Addr',
        totalBooths: 10,
        createdAt: new Date(baseTime + i * 1000),
        updatedAt: new Date(baseTime + i * 1000),
      });
    }

    const result = await StatsService.getSuperAdminDashboard();

    expect(result.recentExpos.length).toBe(5);
    // Most recently created first: Expo 5, 4, 3, 2, 1
    expect(result.recentExpos[0].name).toBe('SuperAdmin Expo 5');
    expect(result.recentExpos[4].name).toBe('SuperAdmin Expo 1');
  });

  it('29c-4: returns zeros and empty array when no data exists', async () => {
    // DB is already cleared by beforeEach
    const result = await StatsService.getSuperAdminDashboard();

    expect(result.totalExpos).toBe(0);
    expect(result.totalAttendees).toBe(0);
    expect(result.totalApplications).toBe(0);
    expect(result.totalCheckIns).toBe(0);
    expect(result.recentExpos).toEqual([]);
  });
});
