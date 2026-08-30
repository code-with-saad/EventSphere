import { ObjectId } from 'mongodb';
import ApplicationModel from '../models/Application.model';
import ExpoModel from '../models/Expo.model';
import type { IApplication, IApplicationCreate } from '../models/Application.model';

/**
 * ApplicationService
 *
 * Handles all application business logic: submitting, editing, withdrawing,
 * organizer review (approve/reject/revoke), booth assignment, and fill rate.
 *
 * Requirements: REQ-3, REQ-4, REQ-12.6
 */

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface ApplicationDTO {
  _id: string;
  expoId: string;
  exhibitorId: string;
  status: 'pending' | 'approved' | 'rejected';
  companyName: string;
  companyDescription: string;
  category: string;
  phoneNumber: string;
  websiteUrl?: string;
  logoUrl?: string;
  organizerNote?: string;
  boothLabel?: string;
  rejectionReason?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface ApplicationListResponse {
  pending: IApplication[];
  approved: IApplication[];
  rejected: IApplication[];
  boothFillRate: number;
  totalBooths: number;
  assignedBooths: number;
}

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
// ApplicationService class
// ---------------------------------------------------------------------------

class ApplicationService {
  // -------------------------------------------------------------------------
  // 15a — submit()
  // -------------------------------------------------------------------------

  /**
   * Submit a new exhibitor application for an expo.
   *
   * Validates:
   * 1. The expo exists (EXPO_NOT_FOUND 404)
   * 2. The expo is in `published` status (EXPO_NOT_ACCEPTING_APPLICATIONS 400)
   * 3. No existing `pending` or `approved` application for the (exhibitorId, expoId) pair
   *    (DUPLICATE_APPLICATION 409)
   *
   * On success, creates the application record with `status: 'pending'`.
   *
   * @param data — IApplicationCreate payload (expoId, exhibitorId, company fields)
   * @returns The newly created IApplication document
   */
  async submit(data: IApplicationCreate): Promise<IApplication> {
    // 1. Validate expo exists
    const expo = await ExpoModel.findById(data.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 2. Validate expo is published (REQ-3.1, REQ-3.11)
    if (expo.status !== 'published') {
      throw createError(
        'This expo is not currently accepting applications',
        'EXPO_NOT_ACCEPTING_APPLICATIONS',
        400
      );
    }

    // 3. Check for existing pending or approved application (REQ-3.6, Property 10)
    const existingApplication = await ApplicationModel.findByExpoAndExhibitor(
      data.expoId,
      data.exhibitorId
    );

    if (
      existingApplication &&
      (existingApplication.status === 'pending' || existingApplication.status === 'approved')
    ) {
      throw createError(
        'You already have an active or pending application for this expo',
        'DUPLICATE_APPLICATION',
        409
      );
    }

    // 4. Create application record — model sets status: 'pending' automatically (REQ-3.7)
    const application = await ApplicationModel.create(data);
    return application;
  }

  // -------------------------------------------------------------------------
  // 15b — edit()
  // -------------------------------------------------------------------------

  /**
   * Edit application details.
   *
   * Validates:
   * 1. Application exists (APPLICATION_NOT_FOUND 404)
   * 2. Caller owns the application (APPLICATION_FORBIDDEN 403)
   * 3. Application is still pending (APPLICATION_NOT_EDITABLE 400)
   * 4. Field length constraints on any provided fields
   *
   * @param applicationId — MongoDB _id string of the application to edit
   * @param exhibitorId   — string from req.user.userId (must match application.exhibitorId)
   * @param data          — partial update payload (cannot change expoId or exhibitorId)
   * @returns The updated IApplication document
   */
  async edit(
    applicationId: string,
    exhibitorId: string,
    data: Partial<Omit<IApplicationCreate, 'expoId' | 'exhibitorId'>>
  ): Promise<IApplication> {
    // 1. Look up application
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // 2. Validate ownership
    if (application.exhibitorId.toString() !== exhibitorId) {
      throw createError(
        'You do not have permission to edit this application',
        'APPLICATION_FORBIDDEN',
        403
      );
    }

    // 3. Only pending applications can be edited
    if (application.status !== 'pending') {
      throw createError(
        'Only pending applications can be edited',
        'APPLICATION_NOT_EDITABLE',
        400
      );
    }

    // 4. Field length validation
    if (data.companyName !== undefined) {
      if (data.companyName.length < 1 || data.companyName.length > 120) {
        throw createError(
          'companyName must be between 1 and 120 characters',
          'INVALID_FIELD_LENGTH',
          400
        );
      }
    }

    if (data.companyDescription !== undefined) {
      if (data.companyDescription.length < 1 || data.companyDescription.length > 500) {
        throw createError(
          'companyDescription must be between 1 and 500 characters',
          'INVALID_FIELD_LENGTH',
          400
        );
      }
    }

    if (data.organizerNote !== undefined) {
      if (data.organizerNote.length > 500) {
        throw createError(
          'organizerNote must be at most 500 characters',
          'INVALID_FIELD_LENGTH',
          400
        );
      }
    }

    // 5. Apply update
    const updated = await ApplicationModel.updateById(applicationId, data);
    if (!updated) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // 15c — withdraw()
  // -------------------------------------------------------------------------

  /**
   * Withdraw a pending application (hard-delete).
   *
   * Validates:
   * 1. Application exists (APPLICATION_NOT_FOUND 404)
   * 2. Caller owns the application (APPLICATION_FORBIDDEN 403)
   * 3. Application is still pending (APPLICATION_NOT_WITHDRAWABLE 400)
   *
   * On success, hard-deletes the record and returns void.
   *
   * @param applicationId — MongoDB _id string of the application to withdraw
   * @param exhibitorId   — string from req.user.userId (must match application.exhibitorId)
   */
  async withdraw(applicationId: string, exhibitorId: string): Promise<void> {
    // 1. Look up application
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // 2. Validate ownership
    if (application.exhibitorId.toString() !== exhibitorId) {
      throw createError(
        'You do not have permission to withdraw this application',
        'APPLICATION_FORBIDDEN',
        403
      );
    }

    // 3. Only pending applications can be withdrawn
    if (application.status !== 'pending') {
      throw createError(
        'Only pending applications can be withdrawn',
        'APPLICATION_NOT_WITHDRAWABLE',
        400
      );
    }

    // 4. Hard-delete the record (race condition guard)
    const deleted = await ApplicationModel.deleteById(applicationId);
    if (!deleted) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }
  }

  // -------------------------------------------------------------------------
  // 15d — approve()
  // -------------------------------------------------------------------------

  /**
   * Approve an application and assign a booth label.
   *
   * Validates:
   * 1. Application exists (APPLICATION_NOT_FOUND 404)
   * 2. Expo exists (EXPO_NOT_FOUND 404)
   * 3. Caller is the expo organizer (APPLICATION_FORBIDDEN 403)
   * 4. boothLabel is 1–20 chars (INVALID_BOOTH_LABEL 400)
   * 5. boothLabel not already assigned in this expo (BOOTH_CONFLICT 409)
   *
   * Sets overfillWarning: true when approvedCount >= expo.totalBooths before approval.
   *
   * @param applicationId — MongoDB _id string of the application
   * @param organizerId   — string from req.user.userId
   * @param boothLabel    — 1–20 char label to assign
   * @returns The updated IApplication with optional overfillWarning flag
   */
  async approve(
    applicationId: string,
    organizerId: string,
    boothLabel: string
  ): Promise<IApplication & { overfillWarning?: boolean }> {
    // 1. Look up application
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // 2. Look up expo
    const expo = await ExpoModel.findById(application.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 3. Organizer ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to approve this application',
        'APPLICATION_FORBIDDEN',
        403
      );
    }

    // 4. Validate boothLabel
    if (!boothLabel || boothLabel.length < 1 || boothLabel.length > 20) {
      throw createError(
        'boothLabel must be between 1 and 20 characters',
        'INVALID_BOOTH_LABEL',
        400
      );
    }

    // 5. Check booth label uniqueness within this expo
    const conflicting = await ApplicationModel.getCollection().findOne({
      expoId: application.expoId,
      boothLabel,
      status: 'approved',
      _id: { $ne: application._id },
    });
    if (conflicting) {
      throw createError(
        'This booth label is already assigned in this expo',
        'BOOTH_CONFLICT',
        409
      );
    }

    // 6. Count currently approved applications
    const approvedCount = await ApplicationModel.getCollection().countDocuments({
      expoId: application.expoId,
      status: 'approved',
    });

    // 7. Determine overfill warning (at or above capacity before adding this one)
    const overfillWarning = approvedCount >= expo.totalBooths;

    // 8. Persist approval
    const updated = await ApplicationModel.updateById(applicationId, {
      status: 'approved',
      boothLabel,
    });
    if (!updated) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // 9. Return with warning flag
    return { ...updated, overfillWarning };
  }

  // -------------------------------------------------------------------------
  // 15e — reject()
  // -------------------------------------------------------------------------

  /**
   * Reject an application with an optional reason.
   *
   * Validates:
   * 1. Application exists (APPLICATION_NOT_FOUND 404)
   * 2. Expo exists (EXPO_NOT_FOUND 404)
   * 3. Caller is the expo organizer (APPLICATION_FORBIDDEN 403)
   * 4. reason ≤ 300 chars if provided (INVALID_FIELD_LENGTH 400)
   *
   * @param applicationId — MongoDB _id string of the application
   * @param organizerId   — string from req.user.userId
   * @param reason        — optional rejection reason (max 300 chars)
   * @returns The updated IApplication document
   */
  async reject(
    applicationId: string,
    organizerId: string,
    reason?: string
  ): Promise<IApplication> {
    // 1. Look up application
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // 2. Look up expo
    const expo = await ExpoModel.findById(application.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 3. Organizer ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to reject this application',
        'APPLICATION_FORBIDDEN',
        403
      );
    }

    // 4. Validate reason length
    if (reason !== undefined && reason.length > 300) {
      throw createError(
        'rejectionReason must be at most 300 characters',
        'INVALID_FIELD_LENGTH',
        400
      );
    }

    // 5. Build update payload
    const updateData: Partial<IApplication> = { status: 'rejected' };
    if (reason !== undefined) {
      updateData.rejectionReason = reason;
    }

    // 6. Persist rejection
    const updated = await ApplicationModel.updateById(applicationId, updateData);
    if (!updated) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // 15f — revokeApproval()
  // -------------------------------------------------------------------------

  /**
   * Revoke an approval — resets status to pending and clears boothLabel.
   *
   * Validates:
   * 1. Application exists (APPLICATION_NOT_FOUND 404)
   * 2. Expo exists (EXPO_NOT_FOUND 404)
   * 3. Caller is the expo organizer (APPLICATION_FORBIDDEN 403)
   * 4. Application is approved (APPLICATION_NOT_REVOCABLE 400)
   *
   * Uses $unset to properly clear boothLabel in MongoDB.
   *
   * @param applicationId — MongoDB _id string of the application
   * @param organizerId   — string from req.user.userId
   * @returns The updated IApplication document
   */
  async revokeApproval(
    applicationId: string,
    organizerId: string
  ): Promise<IApplication> {
    // 1. Look up application
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // 2. Look up expo
    const expo = await ExpoModel.findById(application.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 3. Organizer ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to revoke this application',
        'APPLICATION_FORBIDDEN',
        403
      );
    }

    // 4. Only approved applications can be revoked
    if (application.status !== 'approved') {
      throw createError(
        'Only approved applications can have their approval revoked',
        'APPLICATION_NOT_REVOCABLE',
        400
      );
    }

    // 5. Use $unset to properly clear boothLabel alongside status reset
    const result = await ApplicationModel.getCollection().findOneAndUpdate(
      { _id: new ObjectId(applicationId) },
      { $set: { status: 'pending', updatedAt: new Date() }, $unset: { boothLabel: '' } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw createError('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    return result as IApplication;
  }

  // -------------------------------------------------------------------------
  // 15g — listForExpo()
  // -------------------------------------------------------------------------

  /**
   * Return all applications for an expo grouped by status.
   * Includes boothFillRate, totalBooths, and assignedBooths metadata.
   *
   * Validates:
   * 1. Expo exists (EXPO_NOT_FOUND 404)
   * 2. Caller is the expo organizer (APPLICATION_FORBIDDEN 403)
   *
   * @param expoId      — string expo ID
   * @param organizerId — string from req.user.userId
   * @returns ApplicationListResponse with grouped arrays and fill-rate stats
   */
  async listForExpo(
    expoId: string,
    organizerId: string
  ): Promise<ApplicationListResponse> {
    // 1. Look up expo
    const expo = await ExpoModel.findById(expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 2. Organizer ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to list applications for this expo',
        'APPLICATION_FORBIDDEN',
        403
      );
    }

    // 3. Fetch all applications for this expo
    const applications = await ApplicationModel.findByExpo(expoId);

    // 4. Group by status
    const pending = applications.filter(a => a.status === 'pending');
    const approved = applications.filter(a => a.status === 'approved');
    const rejected = applications.filter(a => a.status === 'rejected');

    // 5. Calculate fill rate
    const totalBooths = expo.totalBooths;
    const assignedBooths = approved.length;
    const boothFillRate = totalBooths > 0
      ? Math.round((assignedBooths / totalBooths) * 10000) / 100
      : 0;

    return { pending, approved, rejected, boothFillRate, totalBooths, assignedBooths };
  }

  // -------------------------------------------------------------------------
  // 15h — getByExhibitorAndExpo() and getBoothFillRate()
  // -------------------------------------------------------------------------

  /**
   * Get an exhibitor's own application for a specific expo.
   *
   * @param exhibitorId — string exhibitor user ID
   * @param expoId      — string expo ID
   * @returns The matching IApplication or null
   */
  async getByExhibitorAndExpo(
    exhibitorId: string,
    expoId: string
  ): Promise<IApplication | null> {
    return ApplicationModel.findByExpoAndExhibitor(expoId, exhibitorId);
  }

  /**
   * Calculate booth fill rate for an expo.
   * Returns (approvedCount / totalBooths) * 100, rounded to 2 decimal places.
   * Returns 0 when totalBooths is 0 (division guard).
   *
   * @param expoId      — string expo ID
   * @param totalBooths — total booth capacity
   * @returns Fill rate percentage (0–100+)
   */
  async getBoothFillRate(expoId: string, totalBooths: number): Promise<number> {
    if (totalBooths <= 0) return 0;

    const approvedCount = await ApplicationModel.getCollection().countDocuments({
      expoId: new ObjectId(expoId),
      status: 'approved',
    });

    return Math.round((approvedCount / totalBooths) * 10000) / 100;
  }
}

export default new ApplicationService();
