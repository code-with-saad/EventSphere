import { ObjectId } from 'mongodb';
import ExpoModel from '../models/Expo.model';
import ApplicationModel from '../models/Application.model';
import TicketModel from '../models/Ticket.model';
import type { IExpo, ExpoStatus } from '../models/Expo.model';

/**
 * ExpoService
 *
 * Handles all expo business logic: CRUD, status lifecycle, cascade gate,
 * public listing with pagination + text search, and organizer-scoped queries.
 *
 * Requirements: REQ-1, REQ-2, REQ-12.6, REQ-12.20
 */

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export type ExpoListStatusFilter = 'upcoming' | 'ongoing' | 'completed';

export interface ExpoListQuery {
  page?: number;
  limit?: number;
  status?: ExpoListStatusFilter;
  search?: string;
}

export interface ExpoCardDTO {
  _id: string;
  name: string;
  description: string; // truncated to 160 chars
  status: ExpoStatus;
  startDate: string; // ISO 8601
  endDate: string;
  venueName: string;
  venueAddress: string;
  bannerUrl?: string;
  category?: string;
  approvedExhibitorCount: number;
}

export interface ExpoDetailDTO extends Omit<IExpo, '_id' | 'organizerId'> {
  _id: string;
  organizerId: string;
  approvedApplications: ApprovedExhibitorDTO[];
}

export interface ApprovedExhibitorDTO {
  _id: string;
  companyName: string;
  companyDescription: string;
  category: string;
  logoUrl?: string;
  websiteUrl?: string;
  boothLabel?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CascadePreview {
  activeTickets: number;
  pendingApplications: number;
  approvedApplications: number;
  requiresConfirmation: boolean;
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

/**
 * Valid status transitions for the expo lifecycle.
 * archive applies from published, ongoing, or completed.
 */
const VALID_TRANSITIONS: Record<ExpoStatus, ExpoStatus[]> = {
  draft: ['published'],
  published: ['ongoing', 'archived'],
  ongoing: ['completed', 'archived'],
  completed: ['archived'],
  archived: [],
};

/**
 * Statuses visible in the public listing (REQ-1.2).
 */
const PUBLIC_STATUSES: ExpoStatus[] = ['published', 'ongoing', 'completed'];

/**
 * Truncate a string to at most `max` characters.
 */
function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) : str;
}

// ---------------------------------------------------------------------------
// ExpoService class
// ---------------------------------------------------------------------------

class ExpoService {
  // -------------------------------------------------------------------------
  // 11a - create()
  // -------------------------------------------------------------------------

  /**
   * Create a new expo in `draft` status.
   *
   * Validates required field lengths and date logic before inserting.
   *
   * @param organizerId - string from req.user.userId
   * @param data        - raw body from the route handler
   */
  async create(
    organizerId: string,
    data: {
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      venueName: string;
      venueAddress: string;
      totalBooths: number;
      zones?: { name: string; boothCount: number }[];
      bannerUrl?: string;
      websiteUrl?: string;
      category?: string;
      tags?: string[];
      venueMapUrl?: string;
    }
  ): Promise<IExpo> {
    // If zones are provided, calculate totalBooths from zones
    let totalBooths = data.totalBooths;
    if (data.zones && Array.isArray(data.zones) && data.zones.length > 0) {
      totalBooths = data.zones.reduce((sum, z) => sum + (Number(z.boothCount) || 0), 0);
    }

    // Field presence
    const requiredFields: Array<keyof typeof data> = [
      'name',
      'description',
      'startDate',
      'endDate',
      'venueName',
      'venueAddress',
    ];
    const missing = requiredFields.filter((f) => !data[f] && data[f] !== 0);
    if (!totalBooths || totalBooths < 1) {
      missing.push('totalBooths');
    }
    if (missing.length > 0) {
      const err = createError(
        `Missing required fields: ${missing.join(', ')}`,
        'MISSING_REQUIRED_FIELDS',
        400
      );
      (err as any).fields = missing;
      throw err;
    }

    // Field length validation
    if (data.name.length < 1 || data.name.length > 120) {
      throw createError('name must be between 1 and 120 characters', 'INVALID_FIELD_LENGTH', 400);
    }
    if (data.description.length < 1 || data.description.length > 2000) {
      throw createError(
        'description must be between 1 and 2000 characters',
        'INVALID_FIELD_LENGTH',
        400
      );
    }
    if (!data.venueName.trim()) {
      throw createError('venueName is required', 'MISSING_REQUIRED_FIELDS', 400);
    }
    if (!data.venueAddress.trim()) {
      throw createError('venueAddress is required', 'MISSING_REQUIRED_FIELDS', 400);
    }
    if (!Number.isInteger(totalBooths) || totalBooths < 1) {
      throw createError('totalBooths must be an integer ≥ 1', 'INVALID_FIELD_LENGTH', 400);
    }
    if (data.tags && data.tags.length > 10) {
      throw createError('tags must have at most 10 items', 'INVALID_FIELD_LENGTH', 400);
    }
    if (data.tags) {
      for (const tag of data.tags) {
        if (tag.length < 1 || tag.length > 30) {
          throw createError(
            'Each tag must be between 1 and 30 characters',
            'INVALID_FIELD_LENGTH',
            400
          );
        }
      }
    }

    // Date logic (REQ-2.5, REQ-2.6)
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(startDate.getTime())) {
      throw createError('startDate is not a valid date', 'INVALID_DATE_RANGE', 400);
    }
    if (isNaN(endDate.getTime())) {
      throw createError('endDate is not a valid date', 'INVALID_DATE_RANGE', 400);
    }
    if (startDate <= new Date()) {
      throw createError('startDate must be in the future', 'INVALID_DATE_RANGE', 400);
    }
    if (endDate <= startDate) {
      throw createError('endDate must be after startDate', 'INVALID_DATE_RANGE', 400);
    }

    const expo = await ExpoModel.create({
      organizerId: new ObjectId(organizerId),
      name: data.name,
      description: data.description,
      startDate,
      endDate,
      venueName: data.venueName,
      venueAddress: data.venueAddress,
      totalBooths,
      zones: data.zones,
      bannerUrl: data.bannerUrl,
      websiteUrl: data.websiteUrl,
      category: data.category,
      tags: data.tags,
      venueMapUrl: data.venueMapUrl,
    });

    return expo;
  }

  // -------------------------------------------------------------------------
  // 11b - update()
  // -------------------------------------------------------------------------

  /**
   * Partially update an expo. Validates ownership and re-validates date logic
   * if any date field is included in the update.
   *
   * @param expoId      - MongoDB _id string
   * @param organizerId - string from req.user.userId
   * @param data        - partial update fields
   */
  async update(
    expoId: string,
    organizerId: string,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      venueName?: string;
      venueAddress?: string;
      totalBooths?: number;
      zones?: { name: string; boothCount: number }[];
      bannerUrl?: string;
      websiteUrl?: string;
      category?: string;
      tags?: string[];
      venueMapUrl?: string;
    }
  ): Promise<IExpo> {
    const expo = await this._requireExpo(expoId);
    this._requireOwnership(expo, organizerId);

    // If zones are provided, calculate totalBooths from zones
    let totalBooths = data.totalBooths;
    if (data.zones && Array.isArray(data.zones) && data.zones.length > 0) {
      totalBooths = data.zones.reduce((sum, z) => sum + (Number(z.boothCount) || 0), 0);
    }

    // Optional field length checks
    if (data.name !== undefined && (data.name.length < 1 || data.name.length > 120)) {
      throw createError('name must be between 1 and 120 characters', 'INVALID_FIELD_LENGTH', 400);
    }
    if (
      data.description !== undefined &&
      (data.description.length < 1 || data.description.length > 2000)
    ) {
      throw createError(
        'description must be between 1 and 2000 characters',
        'INVALID_FIELD_LENGTH',
        400
      );
    }
    if (totalBooths !== undefined) {
      if (!Number.isInteger(totalBooths) || totalBooths < 1) {
        throw createError('totalBooths must be an integer ≥ 1', 'INVALID_FIELD_LENGTH', 400);
      }
    }
    if (data.tags !== undefined) {
      if (data.tags.length > 10) {
        throw createError('tags must have at most 10 items', 'INVALID_FIELD_LENGTH', 400);
      }
      for (const tag of data.tags) {
        if (tag.length < 1 || tag.length > 30) {
          throw createError(
            'Each tag must be between 1 and 30 characters',
            'INVALID_FIELD_LENGTH',
            400
          );
        }
      }
    }

    // Date re-validation when either date field is provided
    const hasDateChange = data.startDate !== undefined || data.endDate !== undefined;
    if (hasDateChange) {
      const startDate = data.startDate ? new Date(data.startDate) : expo.startDate;
      const endDate = data.endDate ? new Date(data.endDate) : expo.endDate;

      if (data.startDate !== undefined && isNaN(new Date(data.startDate).getTime())) {
        throw createError('startDate is not a valid date', 'INVALID_DATE_RANGE', 400);
      }
      if (data.endDate !== undefined && isNaN(new Date(data.endDate).getTime())) {
        throw createError('endDate is not a valid date', 'INVALID_DATE_RANGE', 400);
      }
      if (data.startDate !== undefined && startDate <= new Date()) {
        throw createError('startDate must be in the future', 'INVALID_DATE_RANGE', 400);
      }
      if (endDate <= startDate) {
        throw createError('endDate must be after startDate', 'INVALID_DATE_RANGE', 400);
      }
    }

    // Build update payload, parsing any date strings
    const updatePayload: any = { ...data };
    if (data.startDate) updatePayload.startDate = new Date(data.startDate);
    if (data.endDate) updatePayload.endDate = new Date(data.endDate);

    const updated = await ExpoModel.updateById(expoId, updatePayload);
    if (!updated) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  // 11c - transition()
  // -------------------------------------------------------------------------

  /**
   * Validate and execute a status transition on an expo.
   *
   * - Enforces VALID_TRANSITIONS map.
   * - `draft - published` additionally runs validateForPublish().
   * - `* - archived` runs the cascade gate.
   *
   * @param expoId      - MongoDB _id string
   * @param organizerId - string from req.user.userId
   * @param newStatus   - target status
   * @param confirmed   - must be true to proceed through cascade gate
   */
  async transition(
    expoId: string,
    organizerId: string,
    newStatus: ExpoStatus,
    confirmed?: boolean
  ): Promise<IExpo> {
    const expo = await this._requireExpo(expoId);
    this._requireOwnership(expo, organizerId);

    const allowed = VALID_TRANSITIONS[expo.status];
    if (!allowed.includes(newStatus)) {
      throw createError(
        `Cannot transition from '${expo.status}' to '${newStatus}'`,
        'INVALID_STATUS_TRANSITION',
        400
      );
    }

    // Publish gate: validate required fields (REQ-2.9)
    if (newStatus === 'published') {
      const missing = this.validateForPublish(expo);
      if (missing.length > 0) {
        const err = createError(
          `Cannot publish: missing required fields: ${missing.join(', ')}`,
          'MISSING_REQUIRED_FIELDS',
          400
        );
        (err as any).fields = missing;
        throw err;
      }
    }

    // Cascade gate: archive requires confirmation when records exist (REQ-2.16)
    if (newStatus === 'archived') {
      await this._cascadeGate(expoId, confirmed);
    }

    // Execute cascade if archiving with confirmed flag
    if (newStatus === 'archived' && confirmed) {
      await this.executeCascade(expoId);
    }

    const updated = await ExpoModel.updateById(expoId, { status: newStatus });
    if (!updated) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  // 11d - getCascadePreview()
  // -------------------------------------------------------------------------

  /**
   * Return counts used in the cascade confirmation dialog (REQ-2.16).
   */
  async getCascadePreview(expoId: string): Promise<CascadePreview> {
    const expoObjectId = new ObjectId(expoId);

    const [activeTickets, pendingApplications, approvedApplications] = await Promise.all([
      TicketModel.getCollection().countDocuments({
        expoId: expoObjectId,
        status: 'active',
      }),
      ApplicationModel.getCollection().countDocuments({
        expoId: expoObjectId,
        status: 'pending',
      }),
      ApplicationModel.getCollection().countDocuments({
        expoId: expoObjectId,
        status: 'approved',
      }),
    ]);

    const requiresConfirmation =
      activeTickets > 0 || pendingApplications > 0 || approvedApplications > 0;

    return {
      activeTickets,
      pendingApplications,
      approvedApplications,
      requiresConfirmation,
    };
  }

  // -------------------------------------------------------------------------
  // 11e - delete()
  // -------------------------------------------------------------------------

  /**
   * Permanently delete an expo. Validates ownership, runs cascade gate,
   * executes cascade if confirmed, then removes the document.
   *
   * @param expoId      - MongoDB _id string
   * @param organizerId - string from req.user.userId
   * @param confirmed   - must be true to proceed when cascade counts > 0
   */
  async delete(expoId: string, organizerId: string, confirmed?: boolean): Promise<void> {
    const expo = await this._requireExpo(expoId);
    this._requireOwnership(expo, organizerId);

    // Cascade gate applies regardless of expo status (REQ-2.12, REQ-2.16)
    await this._cascadeGate(expoId, confirmed);

    // Execute cascade if confirmed
    if (confirmed) {
      await this.executeCascade(expoId);
    }

    const deleted = await ExpoModel.deleteById(expoId);
    if (!deleted) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }
  }

  // -------------------------------------------------------------------------
  // 11f - listPublic()
  // -------------------------------------------------------------------------

  /**
   * Paginated public listing of expos (max 12/page).
   *
   * Status filter mapping:
   *   'upcoming'  - published
   *   'ongoing'   - ongoing
   *   'completed' - completed
   *   (none)      - published + ongoing + completed
   *
   * Appends approvedExhibitorCount to each DTO via a separate aggregation.
   */
  async listPublic(
    query: ExpoListQuery
  ): Promise<{ expos: ExpoCardDTO[]; pagination: PaginationMeta }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(12, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    // Build MongoDB filter
    const filter: any = {};

    // Status filter mapping (REQ-1.5)
    if (query.status) {
      const statusMap: Record<ExpoListStatusFilter, ExpoStatus> = {
        upcoming: 'published',
        ongoing: 'ongoing',
        completed: 'completed',
      };
      filter.status = statusMap[query.status];
    } else {
      filter.status = { $in: PUBLIC_STATUSES };
    }

    // Text search (REQ-1.6)
    if (query.search && query.search.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const collection = ExpoModel.getCollection();

    const [docs, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    // Fetch approvedExhibitorCount for each expo on this page
    const expoIds = docs.map((d) => d._id);
    const approvedCounts = await this._getApprovedExhibitorCounts(expoIds);

    const expos: ExpoCardDTO[] = docs.map((expo) => ({
      _id: expo._id.toString(),
      name: expo.name,
      description: truncate(expo.description, 160),
      status: expo.status,
      startDate: expo.startDate.toISOString(),
      endDate: expo.endDate.toISOString(),
      venueName: expo.venueName,
      venueAddress: expo.venueAddress,
      bannerUrl: expo.bannerUrl,
      category: expo.category,
      approvedExhibitorCount: approvedCounts.get(expo._id.toString()) ?? 0,
    }));

    return {
      expos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // getById - organizer-scoped (all statuses including draft)
  async getById(expoId: string, organizerId: string): Promise<IExpo> {
    const expo = await this._requireExpo(expoId);
    this._requireOwnership(expo, organizerId);
    return expo;
  }

  // -------------------------------------------------------------------------
  // 11g - getPublicDetail()
  // -------------------------------------------------------------------------

  /**
   * Full expo document + all approved applications for the exhibitor list.
   */
  async getPublicDetail(expoId: string): Promise<ExpoDetailDTO> {
    const expo = await this._requireExpo(expoId);

    // Only publicly visible expos are accessible via this method
    if (!PUBLIC_STATUSES.includes(expo.status)) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    const approvedApplications = await ApplicationModel.getCollection()
      .find({ expoId: expo._id, status: 'approved' })
      .toArray();

    const exhibitors: ApprovedExhibitorDTO[] = approvedApplications.map((app) => ({
      _id: app._id.toString(),
      companyName: app.companyName,
      companyDescription: app.companyDescription,
      category: app.category,
      logoUrl: app.logoUrl,
      websiteUrl: app.websiteUrl,
      boothLabel: app.boothLabel,
    }));

    return {
      _id: expo._id.toString(),
      organizerId: expo.organizerId.toString(),
      name: expo.name,
      description: expo.description,
      status: expo.status,
      startDate: expo.startDate,
      endDate: expo.endDate,
      venueName: expo.venueName,
      venueAddress: expo.venueAddress,
      totalBooths: expo.totalBooths,
      bannerUrl: expo.bannerUrl,
      websiteUrl: expo.websiteUrl,
      category: expo.category,
      tags: expo.tags,
      venueMapUrl: expo.venueMapUrl,
      createdAt: expo.createdAt,
      updatedAt: expo.updatedAt,
      approvedApplications: exhibitors,
    };
  }

  // -------------------------------------------------------------------------
  // 11h - listByOrganizer() and getExpoStats()
  // -------------------------------------------------------------------------

  /**
   * Return all expos belonging to the given organizer, sorted by createdAt desc.
   */
  async listByOrganizer(organizerId: string): Promise<IExpo[]> {
    return ExpoModel.findByOrganizer(organizerId);
  }

  // -------------------------------------------------------------------------
  // 11i - private validateForPublish() and executeCascade()
  // -------------------------------------------------------------------------

  /**
   * Return an array of missing required field names for the publish gate.
   * An empty array means the expo is ready to publish.
   */
  private validateForPublish(expo: IExpo): string[] {
    const missing: string[] = [];

    if (!expo.name || expo.name.trim() === '') missing.push('name');
    if (!expo.description || expo.description.trim() === '') missing.push('description');
    if (!expo.startDate) missing.push('startDate');
    if (!expo.endDate) missing.push('endDate');
    if (!expo.venueName || expo.venueName.trim() === '') missing.push('venueName');
    if (!expo.venueAddress || expo.venueAddress.trim() === '') missing.push('venueAddress');
    if (!expo.totalBooths || expo.totalBooths < 1) missing.push('totalBooths');

    return missing;
  }

  /**
   * Execute cascade: bulk-cancel active tickets and bulk-reject pending applications
   * for the given expo. Called after cascade confirmation (REQ-12.20).
   */
  private async executeCascade(expoId: string): Promise<void> {
    const expoObjectId = new ObjectId(expoId);
    const now = new Date();

    await Promise.all([
      TicketModel.getCollection().updateMany(
        { expoId: expoObjectId, status: 'active' },
        { $set: { status: 'cancelled', updatedAt: now } }
      ),
      ApplicationModel.getCollection().updateMany(
        { expoId: expoObjectId, status: 'pending' },
        { $set: { status: 'rejected', updatedAt: now } }
      ),
    ]);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Load an expo by ID, throwing EXPO_NOT_FOUND if absent.
   */
  private async _requireExpo(expoId: string): Promise<IExpo> {
    if (!ObjectId.isValid(expoId)) {
      throw createError('Invalid expo ID', 'EXPO_NOT_FOUND', 404);
    }
    const expo = await ExpoModel.findById(expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }
    return expo;
  }

  /**
   * Throw EXPO_FORBIDDEN if the expo's organizerId doesn't match.
   */
  private _requireOwnership(expo: IExpo, organizerId: string): void {
    if (expo.organizerId.toString() !== organizerId) {
      throw createError(
        'You do not have permission to modify this expo',
        'EXPO_FORBIDDEN',
        403
      );
    }
  }

  /**
   * Run the cascade gate check.
   * Throws CASCADE_CONFIRMATION_REQUIRED (409) if there are active tickets or
   * pending/approved applications and `confirmed` is not true.
   */
  private async _cascadeGate(expoId: string, confirmed?: boolean): Promise<void> {
    const preview = await this.getCascadePreview(expoId);
    if (preview.requiresConfirmation && !confirmed) {
      const err = createError(
        'This expo has active tickets or applications. Please confirm cascade cancellation.',
        'CASCADE_CONFIRMATION_REQUIRED',
        409
      );
      (err as any).counts = {
        activeTickets: preview.activeTickets,
        pendingApplications: preview.pendingApplications,
        approvedApplications: preview.approvedApplications,
      };
      throw err;
    }
  }

  /**
   * Fetch the count of approved applications for each expo in the given list.
   * Returns a Map<expoId string, count>.
   */
  private async _getApprovedExhibitorCounts(
    expoIds: ObjectId[]
  ): Promise<Map<string, number>> {
    if (expoIds.length === 0) return new Map();

    const results = await ApplicationModel.getCollection()
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { expoId: { $in: expoIds }, status: 'approved' } },
        { $group: { _id: '$expoId', count: { $sum: 1 } } },
      ])
      .toArray();

    const map = new Map<string, number>();
    for (const r of results) {
      map.set(r._id.toString(), r.count);
    }
    return map;
  }
}

export default new ExpoService();


