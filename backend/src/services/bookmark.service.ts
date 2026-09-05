import { ObjectId } from 'mongodb';
import BookmarkModel from '../models/Bookmark.model';
import SessionModel from '../models/Session.model';
import type { IBookmark } from '../models/Bookmark.model';
import type { ISession } from '../models/Session.model';

/**
 * BookmarkService
 *
 * Handles all bookmark business logic: add, remove, and list bookmarked
 * sessions for an attendee within a specific expo.
 *
 * Requirements: REQ-7, REQ-7.4, REQ-7.5
 */

// ---------------------------------------------------------------------------
// BookmarkService class
// ---------------------------------------------------------------------------

class BookmarkService {
  // -------------------------------------------------------------------------
  // 24a — add()
  // -------------------------------------------------------------------------

  /**
   * Add a bookmark for an attendee on a session (idempotent upsert).
   *
   * If the attendee has already bookmarked this session, the existing bookmark
   * is returned without creating a duplicate.
   *
   * No session existence check is performed here — the route layer validates
   * the session param exists before calling this service.
   *
   * @param sessionId   Session ID string
   * @param attendeeId  Attendee user ID string
   * @returns The existing or newly created IBookmark document
   */
  async add(sessionId: string, attendeeId: string): Promise<IBookmark> {
    // 1. Check if bookmark already exists (idempotency)
    const existing = await BookmarkModel.findBySessionAndAttendee(sessionId, attendeeId);
    if (existing) {
      return existing;
    }

    // 2. Create and return new bookmark
    return BookmarkModel.create({
      sessionId: new ObjectId(sessionId),
      attendeeId: new ObjectId(attendeeId),
    });
  }

  // -------------------------------------------------------------------------
  // 24b — remove()
  // -------------------------------------------------------------------------

  /**
   * Remove a bookmark for an attendee on a session (no-op if not found).
   *
   * Returns void regardless of whether a document was actually deleted —
   * removing a non-existent bookmark is not an error.
   *
   * @param sessionId   Session ID string
   * @param attendeeId  Attendee user ID string
   */
  async remove(sessionId: string, attendeeId: string): Promise<void> {
    await BookmarkModel.deleteBySessionAndAttendee(sessionId, attendeeId);
  }

  // -------------------------------------------------------------------------
  // 24c — listForAttendeeAndExpo()
  // -------------------------------------------------------------------------

  /**
   * Return all sessions the attendee has bookmarked within a given expo,
   * sorted by startTime ascending (preserving the expo schedule order).
   *
   * @param attendeeId  Attendee user ID string
   * @param expoId      Expo ID string
   * @returns Array of ISession documents bookmarked by the attendee, sorted by startTime
   */
  async listForAttendeeAndExpo(attendeeId: string, expoId: string): Promise<ISession[]> {
    // 1. Fetch all sessions for the expo (already sorted by startTime ascending)
    const sessions = await SessionModel.findByExpo(expoId);
    if (sessions.length === 0) {
      return [];
    }

    // 2. Get session IDs to query bookmarks efficiently
    const sessionIds = sessions.map((s) => s._id);

    // 3. Fetch attendee's bookmarks for those sessions
    const bookmarks = await BookmarkModel.findByAttendeeAndSessions(attendeeId, sessionIds);

    // 4. Build a Set of bookmarked session ID strings for O(1) lookup
    const bookmarkedIds = new Set(bookmarks.map((b) => b.sessionId.toString()));

    // 5. Filter sessions to only those bookmarked, preserving startTime sort order
    return sessions.filter((s) => bookmarkedIds.has(s._id.toString()));
  }

  // -------------------------------------------------------------------------
  // 24d — listAllForAttendee()
  // -------------------------------------------------------------------------

  /**
   * Return all sessions the attendee has bookmarked across ALL expos,
   * grouped with expo information.
   *
   * @param attendeeId  Attendee user ID string
   * @returns Array of bookmarked sessions with populated expo information, sorted by startTime
   */
  async listAllForAttendee(attendeeId: string): Promise<any[]> {
    // 1. Fetch all attendee bookmarks
    const bookmarks = await BookmarkModel.findByAttendee(attendeeId);
    if (bookmarks.length === 0) {
      return [];
    }

    const sessionIds = bookmarks.map((b) => b.sessionId);

    // 2. Fetch session documents
    const sessions = await SessionModel.getCollection()
      .find({ _id: { $in: sessionIds } })
      .sort({ startTime: 1 })
      .toArray();

    if (sessions.length === 0) {
      return [];
    }

    // 3. Fetch expo details for all unique expos
    const expoIds = [...new Set(sessions.map((s) => s.expoId))];
    const expos = await (await import('../models/Expo.model')).default.getCollection()
      .find({ _id: { $in: expoIds } })
      .toArray();

    const expoMap = new Map<string, any>();
    expos.forEach((e) => {
      expoMap.set(e._id.toString(), {
        _id: e._id.toString(),
        name: e.name,
        startDate: e.startDate,
        endDate: e.endDate,
        venueName: e.venueName,
        bannerUrl: e.bannerUrl,
      });
    });

    // 4. Return sessions populated with expo info
    return sessions.map((s) => ({
      _id: s._id.toString(),
      expoId: s.expoId.toString(),
      title: s.title,
      speakerName: s.speakerName,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      description: s.description,
      track: s.track,
      expo: expoMap.get(s.expoId.toString()) || null,
    }));
  }
}

export default new BookmarkService();
