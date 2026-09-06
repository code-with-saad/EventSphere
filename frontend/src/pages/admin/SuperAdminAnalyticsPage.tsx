import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import { useTheme } from '../../contexts/ThemeContext';
import { adminService, SuperAdminAnalyticsData } from '../../services/adminService';
import {
  Users,
  CalendarDays,
  FileText,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  BarChart2,
  AlertCircle,
  RefreshCw,
  Clock,
  Ban,
  UserCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

export default function SuperAdminAnalyticsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<SuperAdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load SuperAdmin analytics:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format colors for chart
  const roleColors = {
    attendees: isDark ? '#60a5fa' : '#2563eb', // Blue
    exhibitors: isDark ? '#a78bfa' : '#7c3aed', // Purple
    organizers: isDark ? '#34d399' : '#059669', // Emerald
  };

  const expoStatusColors: Record<string, string> = {
    published: isDark ? '#34d399' : '#10b981',
    ongoing: isDark ? '#38bdf8' : '#0284c7',
    draft: isDark ? '#9ca3af' : '#6b7280',
    cancelled: isDark ? '#f87171' : '#ef4444',
    completed: isDark ? '#60a5fa' : '#3b82f6',
  };

  const appStatusColors: Record<string, string> = {
    pending: isDark ? '#fbbf24' : '#f59e0b',
    approved: isDark ? '#34d399' : '#10b981',
    rejected: isDark ? '#f87171' : '#ef4444',
  };

  const applicationChartData = data
    ? [
        { status: 'Pending', count: data.applicationsByStatus.pending },
        { status: 'Approved', count: data.applicationsByStatus.approved },
        { status: 'Rejected', count: data.applicationsByStatus.rejected },
      ]
    : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex col md:pl-64">
        <div className="flex-1 flex flex-col">
          <Header title="Reports & Analytics" />
          <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Platform Reports & Analytics
                </h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  System-wide metrics, user onboarding trends, expo lifecycles, and organizer performance.
                </p>
              </div>
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                  isDark
                    ? 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700 text-gray-200'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>

            {error && (
              <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 border ${
                isDark ? 'bg-red-950/40 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && !data ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={`h-32 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-200'}`} />
                ))}
              </div>
            ) : data ? (
              <div className="space-y-8">
                {/* Top Row: KPI Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <BentoCard>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Total Registered Users
                      </span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{data.totalUsers.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>Platform-wide verified accounts</span>
                    </div>
                  </BentoCard>

                  <BentoCard>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Total Expos Created
                      </span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <CalendarDays className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{data.totalExpos.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>Across all organizer accounts</span>
                    </div>
                  </BentoCard>

                  <BentoCard>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Exhibitor Applications
                      </span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{data.totalApplications.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>Submitted booth & stall requests</span>
                    </div>
                  </BentoCard>

                  <BentoCard>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Attendee Check-Ins
                      </span>
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{data.totalCheckIns.toLocaleString()}</span>
                      <span className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        ({data.overallCheckInRate}% turn-out)
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>Out of {data.totalRegistrations.toLocaleString()} registered tickets</span>
                    </div>
                  </BentoCard>
                </div>

                {/* Middle Row: User Growth Timeline (AreaChart) */}
                <BentoCard>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-primary-light dark:text-brand-primary-dark" />
                        User Signups Over Time
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Monthly user registrations grouped by attendee, exhibitor, and organizer roles.
                      </p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    {data.usersOverTime.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        No user signup history available yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.usersOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAttendees" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={roleColors.attendees} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={roleColors.attendees} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorExhibitors" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={roleColors.exhibitors} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={roleColors.exhibitors} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOrganizers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={roleColors.organizers} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={roleColors.organizers} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                          <XAxis
                            dataKey="period"
                            stroke={isDark ? '#9ca3af' : '#6b7280'}
                            fontSize={12}
                            tickLine={false}
                          />
                          <YAxis
                            stroke={isDark ? '#9ca3af' : '#6b7280'}
                            fontSize={12}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? '#1f2937' : '#ffffff',
                              borderColor: isDark ? '#374151' : '#e5e7eb',
                              borderRadius: '0.5rem',
                              color: isDark ? '#ffffff' : '#111827',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Area
                            type="monotone"
                            dataKey="attendees"
                            name="Attendees"
                            stroke={roleColors.attendees}
                            fillOpacity={1}
                            fill="url(#colorAttendees)"
                          />
                          <Area
                            type="monotone"
                            dataKey="exhibitors"
                            name="Exhibitors"
                            stroke={roleColors.exhibitors}
                            fillOpacity={1}
                            fill="url(#colorExhibitors)"
                          />
                          <Area
                            type="monotone"
                            dataKey="organizers"
                            name="Organizers"
                            stroke={roleColors.organizers}
                            fillOpacity={1}
                            fill="url(#colorOrganizers)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </BentoCard>

                {/* Two Column Grid: Expo Lifecycle Breakdown & Applications Funnel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Expo Status Breakdown */}
                  <BentoCard>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-emerald-500" />
                        Expo Lifecycle Statuses
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Distribution of events by publication and operation state.
                      </p>
                    </div>

                    <div className="h-64 w-full flex items-center justify-center">
                      {data.exposByStatus.length === 0 ? (
                        <span className="text-sm text-gray-400">No expos found.</span>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.exposByStatus}
                              dataKey="count"
                              nameKey="status"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                              label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {data.exposByStatus.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={expoStatusColors[entry.status.toLowerCase()] || '#8884d8'}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                borderRadius: '0.5rem',
                                color: isDark ? '#ffffff' : '#111827',
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </BentoCard>

                  {/* Applications Pipeline */}
                  <BentoCard>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-purple-500" />
                        Application Pipeline
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Exhibitor application status breakdown across all events.
                      </p>
                    </div>

                    <div className="h-64 w-full">
                      {applicationChartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-gray-400">
                          No applications recorded yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={applicationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                            <XAxis
                              dataKey="status"
                              stroke={isDark ? '#9ca3af' : '#6b7280'}
                              fontSize={12}
                              tickLine={false}
                            />
                            <YAxis
                              stroke={isDark ? '#9ca3af' : '#6b7280'}
                              fontSize={12}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                borderRadius: '0.5rem',
                                color: isDark ? '#ffffff' : '#111827',
                              }}
                            />
                            <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
                              {applicationChartData.map((entry, index) => (
                                <Cell
                                  key={`app-cell-${index}`}
                                  fill={appStatusColors[entry.status.toLowerCase()] || '#6366f1'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </BentoCard>
                </div>

                {/* Bottom Section: Organizer Performance & Turnout Rollup */}
                <BentoCard>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-primary-light dark:text-brand-primary-dark" />
                        Organizer Performance & Check-In Turnout
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Performance summary per organizer detailing event volume, attendee registrations, and actual check-in rates.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className={`border-b ${isDark ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                          <th className="pb-3 font-semibold">Organizer</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold text-center">Expos Hosted</th>
                          <th className="pb-3 font-semibold text-center">Total Attendees</th>
                          <th className="pb-3 font-semibold text-center">Total Check-Ins</th>
                          <th className="pb-3 font-semibold text-right">Check-In Turnout Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {data.organizersRollup.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                              No organizers registered yet.
                            </td>
                          </tr>
                        ) : (
                          data.organizersRollup.map((org) => {
                            const rate = org.checkInRate;

                            return (
                              <tr key={org.organizerId} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors`}>
                                <td className="py-3.5">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">{org.fullName}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{org.email}</div>
                                </td>
                                <td className="py-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    org.status === 'active'
                                      ? isDark ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : org.status === 'suspended'
                                      ? isDark ? 'bg-red-950/50 text-red-400 border border-red-800/50' : 'bg-red-50 text-red-700 border border-red-200'
                                      : org.status === 'pending'
                                      ? isDark ? 'bg-amber-950/50 text-amber-400 border border-amber-800/50' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {org.status === 'active' && <UserCheck className="w-3 h-3" />}
                                    {org.status === 'suspended' && <Ban className="w-3 h-3" />}
                                    {org.status === 'pending' && <Clock className="w-3 h-3" />}
                                    {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                                  </span>
                                </td>
                                <td className="py-3.5 text-center font-medium">
                                  {org.expoCount}
                                </td>
                                <td className="py-3.5 text-center text-gray-600 dark:text-gray-300">
                                  {org.totalAttendees.toLocaleString()}
                                </td>
                                <td className="py-3.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                  {org.totalCheckIns.toLocaleString()}
                                </td>
                                <td className="py-3.5 text-right">
                                  <div className="inline-flex items-center gap-2 justify-end">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          rate >= 75 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${Math.min(rate, 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-semibold text-xs min-w-[32px] text-right">
                                      {rate}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              </div>
            ) : null}
          </main>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
