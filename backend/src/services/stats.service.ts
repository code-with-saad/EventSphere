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

export interface OrganizerAnalyticsDTO {
  totalExpos: number;
  totalApplications: number;
  totalAttendees: number;
  totalCheckIns: number;
  boothFillRate: number;
  applicationsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  applicationsByDate: {
    date: string;
    count: number;
  }[];
  ticketsByExpo: {
    expoId: string;
    expoName: string;
    totalTickets: number;
    checkedInTickets: number;
  }[];
  boothsByExpo: {
    expoId: string;
    expoName: string;
    totalBooths: number;
    approvedBooths: number;
    fillRate: number;
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

  // -------------------------------------------------------------------------
  // 29d — getOrganizerAnalytics()
  // -------------------------------------------------------------------------

  /**
   * Return comprehensive analytics aggregated across all expos owned by the organizer.
   */
  async getOrganizerAnalytics(organizerId: string): Promise<OrganizerAnalyticsDTO> {
    const expos = await ExpoModel.getCollection()
      .find({ organizerId: new ObjectId(organizerId) })
      .toArray();

    if (expos.length === 0) {
      return {
        totalExpos: 0,
        totalApplications: 0,
        totalAttendees: 0,
        totalCheckIns: 0,
        boothFillRate: 0,
        applicationsByStatus: { pending: 0, approved: 0, rejected: 0 },
        applicationsByDate: [],
        ticketsByExpo: [],
        boothsByExpo: [],
      };
    }

    const expoIds = expos.map((e) => e._id);
    const expoNameMap = new Map<string, string>();
    const expoBoothsMap = new Map<string, number>();
    expos.forEach((e) => {
      expoNameMap.set(e._id.toString(), e.name);
      expoBoothsMap.set(e._id.toString(), e.totalBooths || 0);
    });

    const [statusAgg, dateAgg, ticketsAgg, approvedAppsAgg, totalAttendees, totalCheckIns] =
      await Promise.all([
        // Applications by status
        ApplicationModel.getCollection()
          .aggregate<{ _id: string; count: number }>([
            { $match: { expoId: { $in: expoIds } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
          .toArray(),

        // Applications by date
        ApplicationModel.getCollection()
          .aggregate<{ _id: string; count: number }>([
            { $match: { expoId: { $in: expoIds } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray(),

        // Tickets & check-ins per expo
        TicketModel.getCollection()
          .aggregate<{ _id: ObjectId; totalTickets: number; checkedInTickets: number }>([
            { $match: { expoId: { $in: expoIds }, status: { $ne: 'cancelled' } } },
            {
              $group: {
                _id: '$expoId',
                totalTickets: { $sum: 1 },
                checkedInTickets: {
                  $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] },
                },
              },
            },
          ])
          .toArray(),

        // Approved apps per expo (for booth fill rates)
        ApplicationModel.getCollection()
          .aggregate<{ _id: ObjectId; approvedCount: number }>([
            { $match: { expoId: { $in: expoIds }, status: 'approved' } },
            { $group: { _id: '$expoId', approvedCount: { $sum: 1 } } },
          ])
          .toArray(),

        // Total non-cancelled tickets across all expos
        TicketModel.getCollection().countDocuments({
          expoId: { $in: expoIds },
          status: { $ne: 'cancelled' },
        }),

        // Total check-ins
        TicketModel.getCollection().countDocuments({
          expoId: { $in: expoIds },
          status: 'checked_in',
        }),
      ]);

    const applicationsByStatus = {
      pending: statusAgg.find((s) => s._id === 'pending')?.count ?? 0,
      approved: statusAgg.find((s) => s._id === 'approved')?.count ?? 0,
      rejected: statusAgg.find((s) => s._id === 'rejected')?.count ?? 0,
    };
    const totalApplications =
      applicationsByStatus.pending +
      applicationsByStatus.approved +
      applicationsByStatus.rejected;

    const applicationsByDate = dateAgg.map((d) => ({
      date: d._id || 'Unknown',
      count: d.count,
    }));

    const ticketMap = new Map<string, { totalTickets: number; checkedInTickets: number }>();
    ticketsAgg.forEach((t) => {
      ticketMap.set(t._id.toString(), {
        totalTickets: t.totalTickets,
        checkedInTickets: t.checkedInTickets,
      });
    });

    const approvedAppMap = new Map<string, number>();
    approvedAppsAgg.forEach((a) => {
      approvedAppMap.set(a._id.toString(), a.approvedCount);
    });

    const ticketsByExpo = expos.map((e) => {
      const eid = e._id.toString();
      const stats = ticketMap.get(eid) || { totalTickets: 0, checkedInTickets: 0 };
      return {
        expoId: eid,
        expoName: e.name,
        totalTickets: stats.totalTickets,
        checkedInTickets: stats.checkedInTickets,
      };
    });

    let totalAllBooths = 0;
    let totalAllApproved = 0;

    const boothsByExpo = expos.map((e) => {
      const eid = e._id.toString();
      const totalBooths = e.totalBooths || 0;
      const approvedBooths = approvedAppMap.get(eid) || 0;
      const fillRate =
        totalBooths > 0 ? Math.round((approvedBooths / totalBooths) * 10000) / 100 : 0;

      totalAllBooths += totalBooths;
      totalAllApproved += approvedBooths;

      return {
        expoId: eid,
        expoName: e.name,
        totalBooths,
        approvedBooths,
        fillRate,
      };
    });

    const boothFillRate =
      totalAllBooths > 0
        ? Math.round((totalAllApproved / totalAllBooths) * 10000) / 100
        : 0;

    return {
      totalExpos: expos.length,
      totalApplications,
      totalAttendees,
      totalCheckIns,
      boothFillRate,
      applicationsByStatus,
      applicationsByDate,
      ticketsByExpo,
      boothsByExpo,
    };
  }
}

export default new StatsService();
