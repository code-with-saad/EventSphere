import { ObjectId } from 'mongodb';
import SessionModel from '../models/Session.model';
import ExpoModel from '../models/Expo.model';
import BookmarkModel from '../models/Bookmark.model';
import type { ISession, ISessionCreate } from '../models/Session.model';

/**
 * SessionService
 *
 * Handles all session business logic: create, update, delete, list,
 * and room conflict detection.
 *
 * Requirements: REQ-6, REQ-6.1, REQ-6.5, REQ-6.7
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a plain Error with statusCode and code fields matching Phase 1 pattern.
 */
function createError(message: string, code: string, statusCode: number): Error {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// SessionService class
// ---------------------------------------------------------------------------

class SessionService {
  // -------------------------------------------------------------------------
  // 23e — private checkRoomConflict()
  // -------------------------------------------------------------------------

  /**
   * Find room conflicts for the given expo + room + time range.
   * Optionally excludes a specific session ID (used during updates).
   *
   * @param expoId     Expo ID string
   * @param room       Room/location name
   * @param startTime  Proposed start time
   * @param endTime    Proposed end time
   * @param excludeId  Optional session ID to exclude from conflict check
   * @returns Array of conflicting session documents
   */
  private async checkRoomConflict(
    expoId: string,
    room: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ): Promise<ISession[]> {
    return SessionModel.findRoomConflicts(expoId, room, startTime, endTime, excludeId);
  }

  // -------------------------------------------------------------------------
  // 23a — create()
  // -------------------------------------------------------------------------

  /**
   * Create a new session for an expo.
   *
   * Validates:
   * 1. Expo exists (EXPO_NOT_FOUND 404)
   * 2. Caller owns the expo (SESSION_FORBIDDEN 403)
   * 3. endTime > startTime (INVALID_TIME_RANGE 400)
   * 4. No room conflict during the proposed time slot (ROOM_CONFLICT 409)
   *
   * @param expoId       Expo ID string
   * @param organizerId  Caller's user ID (must match expo.organizerId)
   * @param data         Session fields (all except expoId)
   * @returns The created ISession document
   */
  async create(
    expoId: string,
    organizerId: string,
    data: Omit<ISessionCreate, 'expoId'>
  ): Promise<ISession> {
    // 1. Validate expo exists
    const expo = await ExpoModel.findById(expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 2. Ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to create sessions for this expo',
        'SESSION_FORBIDDEN',
        403
      );
    }

    // 3. Time range validation
    if (data.endTime <= data.startTime) {
      throw createError('endTime must be after startTime', 'INVALID_TIME_RANGE', 400);
    }

    // 4. Room conflict check
    const conflicts = await this.checkRoomConflict(
      expoId,
      data.room,
      data.startTime,
      data.endTime
    );
    if (conflicts.length > 0) {
      const err: any = createError(
        'Room is already booked during this time slot',
        'ROOM_CONFLICT',
        409
      );
      err.conflictingSession = conflicts[0];
      throw err;
    }

    // 5. Create session
    const session = await SessionModel.create({ ...data, expoId: new ObjectId(expoId) });
    return session;
  }

  // -------------------------------------------------------------------------
  // 23b — update()
  // -------------------------------------------------------------------------

  /**
   * Update an existing session.
   *
   * Validates:
   * 1. Session exists (SESSION_NOT_FOUND 404)
   * 2. Expo exists (EXPO_NOT_FOUND 404)
   * 3. Caller owns the expo (SESSION_FORBIDDEN 403)
   * 4. Effective time range is valid if time fields changed (INVALID_TIME_RANGE 400)
   * 5. No room conflict when room or times change, excluding self (ROOM_CONFLICT 409)
   *
   * @param sessionId    Session ID string
   * @param organizerId  Caller's user ID (must match expo.organizerId)
   * @param data         Partial session update payload
   * @returns The updated ISession document
   */
  async update(
    sessionId: string,
    organizerId: string,
    data: Partial<Omit<ISessionCreate, 'expoId'>>
  ): Promise<ISession> {
    // 1. Look up session
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw createError('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    // 2. Look up expo
    const expo = await ExpoModel.findById(session.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 3. Ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to update this session',
        'SESSION_FORBIDDEN',
        403
      );
    }

    // 4. Time range validation (only if start or end time is being changed)
    if (data.startTime !== undefined || data.endTime !== undefined) {
      const effectiveStart = data.startTime ?? session.startTime;
      const effectiveEnd = data.endTime ?? session.endTime;
      if (effectiveEnd <= effectiveStart) {
        throw createError('endTime must be after startTime', 'INVALID_TIME_RANGE', 400);
      }
    }

    // 5. Room conflict check (if room or either time is changing)
    if (data.room !== undefined || data.startTime !== undefined || data.endTime !== undefined) {
      const effectiveRoom = data.room ?? session.room;
      const effectiveStart = data.startTime ?? session.startTime;
      const effectiveEnd = data.endTime ?? session.endTime;

      const conflicts = await this.checkRoomConflict(
        session.expoId.toString(),
        effectiveRoom,
        effectiveStart,
        effectiveEnd,
        sessionId
      );
      if (conflicts.length > 0) {
        const err: any = createError(
          'Room is already booked during this time slot',
          'ROOM_CONFLICT',
          409
        );
        err.conflictingSession = conflicts[0];
        throw err;
      }
    }

    // 6. Apply update
    const updated = await SessionModel.updateById(sessionId, data);
    if (!updated) {
      throw createError('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // 23c — delete()
  // -------------------------------------------------------------------------

  /**
   * Delete a session and cascade-delete all associated bookmarks (REQ-6.7).
   *
   * Validates:
   * 1. Session exists (SESSION_NOT_FOUND 404)
   * 2. Expo exists (EXPO_NOT_FOUND 404)
   * 3. Caller owns the expo (SESSION_FORBIDDEN 403)
   *
   * @param sessionId    Session ID string
   * @param organizerId  Caller's user ID (must match expo.organizerId)
   */
  async delete(sessionId: string, organizerId: string): Promise<void> {
    // 1. Look up session
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw createError('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    // 2. Look up expo
    const expo = await ExpoModel.findById(session.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 3. Ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to delete this session',
        'SESSION_FORBIDDEN',
        403
      );
    }

    // 4. Delete session
    await SessionModel.deleteById(sessionId);

    // 5. Cascade delete bookmarks (REQ-6.7)
    await BookmarkModel.deleteBySession(sessionId);
  }

  // -------------------------------------------------------------------------
  // 23d — listByExpo()
  // -------------------------------------------------------------------------

  /**
   * Return all sessions for an expo, sorted by startTime ascending.
   * Public read — no ownership check needed.
   *
   * @param expoId  Expo ID string
   * @returns Array of ISession documents sorted by startTime ascending
   */
  async listByExpo(expoId: string): Promise<ISession[]> {
    return SessionModel.findByExpo(expoId);
  }
}

export default new SessionService();
