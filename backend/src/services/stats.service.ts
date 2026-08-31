import { ObjectId } from 'mongodb';
import ExpoModel from '../models/Expo.model';
import ApplicationModel from '../models/Application.model';
import TicketModel from '../models/Ticket.model';

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface OrganizerDashboardDTO {
  activeExpoCount: number;
  totalAttendees: number;
  totalCheckIns: number;
  aggregateBoothFillRate: number;
  recentExpos: {
    _id: string;
    name: string;
    status: string;
    startDate: Date;
    endDate: Date;
    totalBooths: number;
    updatedAt: Date;
  }[];
}

export interface ExpoStatsDTO {
  totalApplications: number;
  pendingApplications: number;
  approvedExhibitors: number;
  rejectedApplications: number;
  totalAttendees: number;
  confirmedCheckIns: number;
  boothFillRate: number;
}

export interface SuperAdminDashboardDTO {
  totalExpos: number;
  totalAttendees: number;
  totalApplications: number;
  totalCheckIns: number;
  recentExpos: {
    _id: string;
    name: string;
    organizerName: string;
    status: string;
    createdAt: Date;
  }[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createError(message: string, code: string, statusCode: number): Error {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// StatsService class
// ---------------------------------------------------------------------------

class StatsService {
  // -------------------------------------------------------------------------
  // 29a — getOrganizerDashboard()
  // -------------------------------------------------------------------------

  /**
   * Return aggregated dashboard stats for an organizer.
   *
   * - activeExpoCount: published + ongoing expos for this organizer
   * - totalAttendees: all tickets across active expos
   * - totalCheckIns: checked_in tickets across active expos
   * - aggregateBoothFillRate: (approved apps / total booths) * 100, 2dp
   * - recentExpos: last 5 expos updated by this organizer (any status)
   */
  async getOrganizerDashboard(organizerId: string): Promise<OrganizerDashboardDTO> {
    // Step 1: fetch active expos
    const activeExpos = await ExpoModel.getCollection()
      .find({ organizerId: new ObjectId(organizerId), status: { $in: ['published', 'ongoing'] } })
      .toArray();

    // Step 2: short-circuit when no active expos — counts are zero but still fetch recentExpos
    if (activeExpos.length === 0) {
      const recentExposRaw = await ExpoModel.getCollection()
        .find({ organizerId: new ObjectId(organizerId) })
        .sort({ updatedAt: -1 })
        .limit(5)
        .project({ _id: 1, name: 1, status: 1, startDate: 1, endDate: 1, totalBooths: 1, updatedAt: 1 })
        .toArray();

      return {
        activeExpoCount: 0,
        totalAttendees: 0,
        totalCheckIns: 0,
        aggregateBoothFillRate: 0,
        recentExpos: recentExposRaw.map((e: any) => ({
          _id: e._id.toString(),
          name: e.name,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate,
          totalBooths: e.totalBooths,
          updatedAt: e.updatedAt,
        })),
      };
    }

    // Step 3: collect active expo IDs
    const activeExpoIds = activeExpos.map((e) => e._id);

    // Step 4: run parallel queries
    const [totalAttendees, totalCheckIns, approvedCounts] = await Promise.all([
      TicketModel.getCollection().countDocuments({ expoId: { $in: activeExpoIds } }),
      TicketModel.getCollection().countDocuments({
        expoId: { $in: activeExpoIds },
        status: 'checked_in',
      }),
      ApplicationModel.getCollection()
        .aggregate<{ _id: null; totalApproved: number }>([
          { $match: { expoId: { $in: activeExpoIds }, status: 'approved' } },
          { $group: { _id: null, totalApproved: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    // Step 5: total booths from active expos
    const totalBooths = activeExpos.reduce((sum, e) => sum + e.totalBooths, 0);

    // Step 6: aggregate booth fill rate
    const totalApproved = approvedCounts[0]?.totalApproved ?? 0;
    const aggregateBoothFillRate =
      totalBooths > 0 ? Math.round((totalApproved / totalBooths) * 10000) / 100 : 0;

    // Step 7: last 5 updated expos (any status)
    const recentExposRaw = await ExpoModel.getCollection()
      .find({ organizerId: new ObjectId(organizerId) })
      .sort({ updatedAt: -1 })
      .limit(5)
      .project({ _id: 1, name: 1, status: 1, startDate: 1, endDate: 1, totalBooths: 1, updatedAt: 1 })
      .toArray();

    // Step 8: return DTO
    return {
      activeExpoCount: activeExpos.length,
      totalAttendees,
      totalCheckIns,
      aggregateBoothFillRate,
      recentExpos: recentExposRaw.map((e: any) => ({
        _id: e._id.toString(),
        name: e.name,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        totalBooths: e.totalBooths,
        updatedAt: e.updatedAt,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // 29b — getExpoStats()
  // -------------------------------------------------------------------------

  /**
   * Return per-expo statistics for the owning organizer.
   *
   * Throws EXPO_NOT_FOUND (404) if the expo does not exist.
   * Throws STATS_FORBIDDEN (403) if organizerId does not own the expo.
   */
  async getExpoStats(expoId: string, organizerId: string): Promise<ExpoStatsDTO> {
    // Step 1: look up expo
    if (!ObjectId.isValid(expoId)) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }
    const expo = await ExpoModel.findById(expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // Step 2: ownership check
    if (expo.organizerId.toString() !== organizerId) {
      throw createError('Access denied', 'STATS_FORBIDDEN', 403);
    }

    // Step 3: parallel count queries
    const expoObjectId = expo._id;
    const [
      totalApplications,
      pendingApplications,
      approvedExhibitors,
      rejectedApplications,
      totalAttendees,
      confirmedCheckIns,
    ] = await Promise.all([
      ApplicationModel.getCollection().countDocuments({ expoId: expoObjectId }),
      ApplicationModel.getCollection().countDocuments({ expoId: expoObjectId, status: 'pending' }),
      ApplicationModel.getCollection().countDocuments({ expoId: expoObjectId, status: 'approved' }),
      ApplicationModel.getCollection().countDocuments({ expoId: expoObjectId, status: 'rejected' }),
      TicketModel.getCollection().countDocuments({ expoId: expoObjectId }),
      TicketModel.getCollection().countDocuments({ expoId: expoObjectId, status: 'checked_in' }),
    ]);

    // Step 4: booth fill rate
    const boothFillRate =
      expo.totalBooths > 0
        ? Math.round((approvedExhibitors / expo.totalBooths) * 10000) / 100
        : 0;

    // Step 5: return DTO
    return {
      totalApplications,
      pendingApplications,
      approvedExhibitors,
      rejectedApplications,
      totalAttendees,
      confirmedCheckIns,
      boothFillRate,
    };
  }

  // -------------------------------------------------------------------------
  // 29c — getSuperAdminDashboard()
  // -------------------------------------------------------------------------

  /**
   * Return platform-wide statistics for the super admin dashboard.
   *
   * recentExpos includes the organizer's fullName via a $lookup on the users
   * collection. Expos whose organizer has been deleted are excluded cleanly
   * (preserveNullAndEmpty: false on $unwind).
   */
  async getSuperAdminDashboard(): Promise<SuperAdminDashboardDTO> {
    // Step 1: platform-wide counts in parallel
    const [totalExpos, totalAttendees, totalApplications, totalCheckIns] = await Promise.all([
      ExpoModel.getCollection().countDocuments({}),
      TicketModel.getCollection().countDocuments({}),
      ApplicationModel.getCollection().countDocuments({}),
      TicketModel.getCollection().countDocuments({ status: 'checked_in' }),
    ]);

    // Step 2: 5 most recently created expos with organizer name
    const recentExposRaw = await ExpoModel.getCollection()
      .aggregate<{
        _id: ObjectId;
        name: string;
        status: string;
        createdAt: Date;
        organizerName: string;
      }>([
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: 'organizerId',
            foreignField: '_id',
            as: 'organizer',
          },
        },
        { $unwind: { path: '$organizer', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            _id: 1,
            name: 1,
            status: 1,
            createdAt: 1,
            organizerName: '$organizer.fullName',
          },
        },
      ])
      .toArray();

    // Step 3: return DTO
    return {
      totalExpos,
      totalAttendees,
      totalApplications,
      totalCheckIns,
      recentExpos: recentExposRaw.map((e) => ({
        _id: e._id.toString(),
        name: e.name,
        organizerName: e.organizerName,
        status: e.status,
        createdAt: e.createdAt,
      })),
    };
  }
}

export default new StatsService();
