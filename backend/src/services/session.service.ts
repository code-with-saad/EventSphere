import { ObjectId } from 'mongodb';
import SessionModel from '../models/Session.model';
import ExpoModel from '../models/Expo.model';
import BookmarkModel from '../models/Bookmark.model';
import SessionRegistrationModel, { ISessionRegistration } from '../models/SessionRegistration.model';
import SessionWaitlistModel, { ISessionWaitlist } from '../models/SessionWaitlist.model';
import TicketModel from '../models/Ticket.model';
import UserModel from '../models/User.model';
import emailService from './email.service';
import type { ISession, ISessionCreate } from '../models/Session.model';

/**
 * SessionService
 *
 * Handles all session business logic: create, update, delete, list,
 * room & speaker conflict detection, and formal session registration.
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
  // private checkRoomConflict()
  // -------------------------------------------------------------------------

  /**
   * Find room conflicts for the given expo + room + time range.
   * Optionally excludes a specific session ID (used during updates).
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
  // private checkSpeakerConflict()
  // -------------------------------------------------------------------------

  /**
   * Find speaker conflicts for the given expo + speakerName + time range.
   * Optionally excludes a specific session ID (used during updates).
   */
  private async checkSpeakerConflict(
    expoId: string,
    speakerName: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
    speakerId?: string
  ): Promise<ISession[]> {
    return SessionModel.findSpeakerConflicts(expoId, speakerName, startTime, endTime, excludeId, speakerId);
  }

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------

  /**
   * Create a new session for an expo.
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

    // 2b. Status check (completed / archived expos are locked)
    if (expo.status === 'completed' || expo.status === 'archived') {
      throw createError(
        'Cannot add sessions to a completed or archived expo',
        'EXPO_COMPLETED_LOCKED',
        400
      );
    }

    // 3. Time range validation
    if (data.endTime <= data.startTime) {
      throw createError('endTime must be after startTime', 'INVALID_TIME_RANGE', 400);
    }

    // 3c. Bounds check: Session must fall within the expo date range
    if (data.startTime < expo.startDate || data.endTime > expo.endDate) {
      throw createError(
        'Session start and end times must fall within the expo dates',
        'SESSION_OUTSIDE_EXPO_DATES',
        400
      );
    }

    // 4. Room conflict check
    const roomConflicts = await this.checkRoomConflict(
      expoId,
      data.room,
      data.startTime,
      data.endTime
    );
    if (roomConflicts.length > 0) {
      const err: any = createError(
        'Room is already booked during this time slot',
        'ROOM_CONFLICT',
        409
      );
      err.conflictingSession = roomConflicts[0];
      throw err;
    }

    // 5. Speaker conflict check
    const speakerConflicts = await this.checkSpeakerConflict(
      expoId,
      data.speakerName,
      data.startTime,
      data.endTime,
      undefined,
      data.speakerId?.toString()
    );
    if (speakerConflicts.length > 0) {
      const err: any = createError(
        `Speaker "${data.speakerName}" is already scheduled for another session during this time slot`,
        'SPEAKER_CONFLICT',
        409
      );
      err.conflictingSession = speakerConflicts[0];
      throw err;
    }

    // 6. Create session
    const session = await SessionModel.create({ ...data, expoId: new ObjectId(expoId) });
    return session;
  }

  // -------------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------------

  /**
   * Update an existing session.
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

    // 3b. Status check (completed / archived expos are locked)
    if (expo.status === 'completed' || expo.status === 'archived') {
      throw createError(
        'Cannot update sessions for a completed or archived expo',
        'EXPO_COMPLETED_LOCKED',
        400
      );
    }

    // 4. Time range validation (only if start or end time is being changed)
    const effectiveStart = data.startTime ?? session.startTime;
    const effectiveEnd = data.endTime ?? session.endTime;
    const effectiveRoom = data.room ?? session.room;
    const effectiveSpeakerName = data.speakerName ?? session.speakerName;
    const effectiveSpeakerId = data.speakerId?.toString() ?? session.speakerId?.toString();

    if (data.startTime !== undefined || data.endTime !== undefined) {
      if (effectiveEnd <= effectiveStart) {
        throw createError('endTime must be after startTime', 'INVALID_TIME_RANGE', 400);
      }
      // Bounds check: Session must fall within the expo date range
      if (effectiveStart < expo.startDate || effectiveEnd > expo.endDate) {
        throw createError(
          'Session start and end times must fall within the expo dates',
          'SESSION_OUTSIDE_EXPO_DATES',
          400
        );
      }
    }

    // 5. Room conflict check (if room or either time is changing)
    if (data.room !== undefined || data.startTime !== undefined || data.endTime !== undefined) {
      const roomConflicts = await this.checkRoomConflict(
        session.expoId.toString(),
        effectiveRoom,
        effectiveStart,
        effectiveEnd,
        sessionId
      );
      if (roomConflicts.length > 0) {
        const err: any = createError(
          'Room is already booked during this time slot',
          'ROOM_CONFLICT',
          409
        );
        err.conflictingSession = roomConflicts[0];
        throw err;
      }
    }

    // 6. Speaker conflict check (if speaker or either time is changing)
    if (
      data.speakerName !== undefined ||
      data.speakerId !== undefined ||
      data.startTime !== undefined ||
      data.endTime !== undefined
    ) {
      const speakerConflicts = await this.checkSpeakerConflict(
        session.expoId.toString(),
        effectiveSpeakerName,
        effectiveStart,
        effectiveEnd,
        sessionId,
        effectiveSpeakerId
      );
      if (speakerConflicts.length > 0) {
        const err: any = createError(
          `Speaker "${effectiveSpeakerName}" is already scheduled for another session during this time slot`,
          'SPEAKER_CONFLICT',
          409
        );
        err.conflictingSession = speakerConflicts[0];
        throw err;
      }
    }

    // 7. Apply update
    const updated = await SessionModel.updateById(sessionId, data);
    if (!updated) {
      throw createError('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // delete()
  // -------------------------------------------------------------------------

  /**
   * Delete a session and cascade-delete all associated bookmarks and registrations.
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

    // 3b. Status check (completed / archived expos are locked)
    if (expo.status === 'completed' || expo.status === 'archived') {
      throw createError(
        'Cannot delete sessions from a completed or archived expo',
        'EXPO_COMPLETED_LOCKED',
        400
      );
    }

    // 4. Delete session
    await SessionModel.deleteById(sessionId);

    // 5. Cascade delete bookmarks (REQ-6.7)
    await BookmarkModel.deleteBySession(sessionId);

    // 6. Cascade delete registrations
    await SessionRegistrationModel.deleteBySession(sessionId);
  }

  // -------------------------------------------------------------------------
  // listByExpo()
  // -------------------------------------------------------------------------

  /**
   * Return all sessions for an expo with registration counts and optional user status.
   */
  async listByExpo(expoId: string, attendeeId?: string): Promise<any[]> {
    const sessions = await SessionModel.findByExpo(expoId);
    if (sessions.length === 0) return [];

    // Fetch registered session IDs for attendee if provided
    let myRegisteredSet = new Set<string>();
    if (attendeeId) {
      const myRegs = await SessionRegistrationModel.findByAttendeeAndExpo(attendeeId, expoId);
      myRegisteredSet = new Set(myRegs.map((r) => r.sessionId.toString()));
    }

    // Attach registration counts, waitlist status, and registration status
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const registrationCount = await SessionRegistrationModel.countBySession(s._id);
        const waitlistCount = await SessionWaitlistModel.countBySession(s._id);
        const isRegistered = myRegisteredSet.has(s._id.toString());
        const waitlistPosition = attendeeId
          ? await SessionWaitlistModel.getPosition(s._id, attendeeId)
          : null;

        return {
          ...s,
          registrationCount,
          waitlistCount,
          isRegistered,
          isWaitlisted: waitlistPosition !== null,
          waitlistPosition,
          isFull: s.capacity ? registrationCount >= s.capacity : false,
        };
      })
    );

    return enriched;
  }

  // -------------------------------------------------------------------------
  // Session Registration & Waitlist Methods
  // -------------------------------------------------------------------------

  /**
   * Register an attendee for a session (or join waitlist if full).
   */
  async registerSession(
    sessionId: string,
    attendeeId: string
  ): Promise<{ type: 'registered' | 'waitlisted'; registration?: ISessionRegistration; waitlist?: ISessionWaitlist; position?: number }> {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw createError('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    const expo = await ExpoModel.findById(session.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // Verify attendee has an active/valid ticket for this expo
    const activeTicket = await TicketModel.findByExpoAndAttendee(session.expoId, attendeeId);
    if (!activeTicket || (activeTicket.status !== 'active' && activeTicket.status !== 'checked_in')) {
      throw createError(
        'You must have a valid ticket for this expo to register for sessions',
        'TICKET_REQUIRED',
        403
      );
    }

    // Check if already registered
    const existing = await SessionRegistrationModel.findBySessionAndAttendee(sessionId, attendeeId);
    if (existing) {
      return { type: 'registered', registration: existing };
    }

    // Check if session capacity is set and full
    if (session.capacity && session.capacity > 0) {
      const currentCount = await SessionRegistrationModel.countBySession(sessionId);
      if (currentCount >= session.capacity) {
        // Session full -> automatically add to waitlist
        const existingWaitlist = await SessionWaitlistModel.findBySessionAndAttendee(sessionId, attendeeId);
        if (existingWaitlist) {
          const position = await SessionWaitlistModel.getPosition(sessionId, attendeeId);
          return { type: 'waitlisted', waitlist: existingWaitlist, position: position ?? 1 };
        }

        const waitlist = await SessionWaitlistModel.create({
          sessionId: session._id,
          expoId: session.expoId,
          attendeeId: new ObjectId(attendeeId),
        });
        const position = await SessionWaitlistModel.getPosition(sessionId, attendeeId);
        return { type: 'waitlisted', waitlist, position: position ?? 1 };
      }
    }

    // If on waitlist previously, remove from waitlist
    await SessionWaitlistModel.deleteBySessionAndAttendee(sessionId, attendeeId);

    const registration = await SessionRegistrationModel.create({
      sessionId: session._id,
      expoId: session.expoId,
      attendeeId: new ObjectId(attendeeId),
    });

    return { type: 'registered', registration };
  }

  /**
   * Cancel an attendee's registration for a session (promotes next person on waitlist).
   */
  async unregisterSession(sessionId: string, attendeeId: string): Promise<boolean> {
    const deleted = await SessionRegistrationModel.deleteBySessionAndAttendee(sessionId, attendeeId);

    // Also remove from waitlist if present
    await SessionWaitlistModel.deleteBySessionAndAttendee(sessionId, attendeeId);

    // If a confirmed registration was deleted, promote next person in line
    if (deleted) {
      const session = await SessionModel.findById(sessionId);
      if (session) {
        const nextInLine = await SessionWaitlistModel.getNextInLine(sessionId);
        if (nextInLine) {
          // Promote waitlisted attendee to registered
          await SessionRegistrationModel.create({
            sessionId: session._id,
            expoId: session.expoId,
            attendeeId: nextInLine.attendeeId,
          });
          await SessionWaitlistModel.deleteById(nextInLine._id);

          // Trigger email notification for promoted attendee
          Promise.all([
            UserModel.findById(nextInLine.attendeeId),
            ExpoModel.findById(session.expoId),
          ])
            .then(([attendeeUser, expoDoc]) => {
              if (attendeeUser?.email && expoDoc) {
                emailService.sendWaitlistPromotedEmail(
                  attendeeUser.email,
                  attendeeUser.fullName || 'Attendee',
                  session.title,
                  expoDoc.name
                ).catch((e) => console.error('Error sending waitlist promotion email:', e));
              }
            })
            .catch((e) => console.error('Error finding user for waitlist notification:', e));
        }
      }
    }

    return deleted;
  }

  /**
   * Leave a session waitlist.
   */
  async leaveWaitlist(sessionId: string, attendeeId: string): Promise<boolean> {
    return SessionWaitlistModel.deleteBySessionAndAttendee(sessionId, attendeeId);
  }

  /**
   * Get all sessions an attendee is registered for in an expo.
   */
  async getMyRegisteredSessions(expoId: string, attendeeId: string): Promise<ISession[]> {
    const regs = await SessionRegistrationModel.findByAttendeeAndExpo(attendeeId, expoId);
    if (regs.length === 0) return [];
    const sessionIds = regs.map((r) => r.sessionId);
    return SessionModel.findByIds(sessionIds);
  }

  /**
   * List attendees registered for a session (Organizer only).
   */
  async listSessionRegistrations(sessionId: string, organizerId: string): Promise<ISessionRegistration[]> {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw createError('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    const expo = await ExpoModel.findById(session.expoId);
    if (!expo || expo.organizerId.toString() !== organizerId) {
      throw createError('You do not have permission to view registrations for this session', 'SESSION_FORBIDDEN', 403);
    }

    return SessionRegistrationModel.findBySession(sessionId);
  }
}

export default new SessionService();
