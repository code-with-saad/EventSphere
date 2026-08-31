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
}

export default new BookmarkService();
