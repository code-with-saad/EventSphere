import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CalendarDays,
  Users,
  Store,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { statsService } from '../../services/statsService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import ChartWrapper from '../../components/analytics/ChartWrapper';
import PendingApprovalScreen from '../../components/dashboard/PendingApprovalScreen';

const COLORS = {
  primary: '#FF4D2E',
  secondary: '#FF7A59',
  approved: '#10B981',
  pending: '#F59E0B',
  rejected: '#EF4444',
  checkin: '#06B6D4',
  accent: '#8B5CF6',
  mutedText: '#8A8A8E',
  gridDark: 'rgba(255, 255, 255, 0.08)',
  gridLight: 'rgba(0, 0, 0, 0.06)',
};

const STATUS_COLORS: Record<string, string> = {
  Approved: COLORS.approved,
  Pending: COLORS.pending,
  Rejected: COLORS.rejected,
};

export default function OrganizerAnalyticsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Engagement depth state
  const [engagementExpos, setEngagementExpos] = useState<{ expoId: string; expoName: string }[]>([]);
  const [selectedExpoId, setSelectedExpoId] = useState<string>('');
  const [engagement, setEngagement] = useState<any>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [engagementError, setEngagementError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    statsService
      .getOrganizerAnalytics()
      .then((data: any) => {
        if (!cancelled) {
          setAnalytics(data);
          if (data?.boothsByExpo?.length) {
            const expos = data.boothsByExpo.map((b: any) => ({
              expoId: b.expoId,
              expoName: b.expoName,
            }));
            setEngagementExpos(expos);
            setSelectedExpoId((prev) => prev || expos[0].expoId);
          }
        }
      })
      .catch((err: any) => {
        if (!cancelled)
          setError(
            err?.response?.data?.message || err?.message || 'Failed to load analytics'
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch engagement depth when selectedExpoId changes
  useEffect(() => {
    if (!selectedExpoId) return;

    let cancelled = false;
    setEngagementLoading(true);
    setEngagementError(null);

    statsService
      .getEngagementDepth(selectedExpoId)
      .then((data: any) => {
        if (!cancelled) setEngagement(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setEngagementError(
            err?.response?.data?.message || err?.message || 'Failed to load engagement data'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setEngagementLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedExpoId]);

  if (user?.status === 'pending') {
    return <PendingApprovalScreen />;
  }

  const applicationsStatusData = analytics?.applicationsByStatus
    ? [
        { name: 'Approved', value: analytics.applicationsByStatus.approved || 0 },
        { name: 'Pending', value: analytics.applicationsByStatus.pending || 0 },
        { name: 'Rejected', value: analytics.applicationsByStatus.rejected || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const applicationsDateData = analytics?.applicationsByDate ?? [];
  const ticketsByExpoData = analytics?.ticketsByExpo ?? [];
  const boothsByExpoData = analytics?.boothsByExpo ?? [];

  const sessionPopularityData = engagement?.sessionPopularity ?? [];
  const categoryDistributionData = engagement?.categoryDistribution ?? [];

  // Custom tooltip styling
  const customTooltipStyle = {
    backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    color: isDarkMode ? '#F4F4F5' : '#18181B',
    fontSize: '12px',
    padding: '8px 12px',
  };

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Reports & Analytics" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          {/* Header Title */}
          <div className="mb-lg-token">
            <h2
              className={`text-xl-token font-bold leading-tight-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              Cross-Expo Reports & Analytics
            </h2>
            <p
              className={`text-sm-token mt-xs-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Aggregate performance metrics, application flow, and attendance across all your expos
            </p>
          </div>

          {error && (
            <div
              className={`mb-lg-token p-md-token rounded-lg-token border text-sm-token ${
                isDarkMode
                  ? 'bg-bg-error-dark/10 border-border-error-dark text-text-error-dark'
                  : 'bg-bg-error-light/10 border-border-error-light text-text-error-light'
              }`}
            >
              {error}
            </div>
          )}

          {/* Metric Bento Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md-token mb-xl-token">
            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <CalendarDays className="w-4 h-4 text-brand-primary-dark" />
                  <span>Total Expos</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : (analytics?.totalExpos ?? 0)}
                </span>
                <span className="text-[11px] text-text-secondary-dark">Managed by you</span>
              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <Layers className="w-4 h-4 text-brand-primary-dark" />
                  <span>Applications</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : (analytics?.totalApplications ?? 0)}
                </span>
                <span className="text-[11px] text-text-secondary-dark">Exhibitor submissions</span>
              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <Users className="w-4 h-4 text-brand-primary-dark" />
                  <span>Total Attendees</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : (analytics?.totalAttendees ?? 0)}
                </span>
                <span className="text-[11px] text-text-secondary-dark">{analytics?.totalCheckIns ?? 0} checked in</span>
              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <Store className="w-4 h-4 text-brand-primary-dark" />
                  <span>Booth Fill Rate</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : `${analytics?.boothFillRate ?? 0}%`}
                </span>
                <span className="text-[11px] text-text-secondary-dark">Overall capacity</span>
              </div>
            </BentoCard>
          </div>

          {/* Charts Grid - Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg-token mb-xl-token">
            {/* Chart 1: Applications Over Time */}
            <ChartWrapper
              title="Applications Submitted Over Time"
              subtitle="Daily trend of exhibitor applications across all expos"
              loading={loading}
              isEmpty={!loading && applicationsDateData.length === 0}
              emptyMessage="No application timeline data available yet"
              minHeight={300}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={applicationsDateData}
                  margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={isDarkMode ? COLORS.gridDark : COLORS.gridLight}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return isNaN(d.getTime()) ? val : `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any) => [`${value} application(s)`, 'Submissions']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Applications"
                    stroke={COLORS.primary}
                    strokeWidth={2.5}
                    dot={{ fill: COLORS.primary, r: 3.5 }}
                    activeDot={{ r: 6, fill: COLORS.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrapper>

            {/* Chart 2: Application Status Breakdown */}
            <ChartWrapper
              title="Application Status Breakdown"
              subtitle="Distribution of pending, approved, and rejected applications"
              loading={loading}
              isEmpty={!loading && applicationsStatusData.length === 0}
              emptyMessage="No applications to display"
              minHeight={300}
            >
              <div className="flex flex-col sm:flex-row items-center justify-around h-full w-full">
                <div className="w-full sm:w-3/5 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={applicationsStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {applicationsStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.name] || COLORS.primary}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={customTooltipStyle}
                        formatter={(val: any, name: any) => [
                          `${val} (${Math.round((Number(val) / (analytics?.totalApplications || 1)) * 100)}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 sm:w-2/5 px-2">
                  {applicationsStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs-token">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[item.name] || COLORS.primary }}
                        />
                        <span className={isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`font-semibold ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        {item.value} ({Math.round((item.value / (analytics?.totalApplications || 1)) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartWrapper>
          </div>

          {/* Row 2: Per Expo Tickets & Booth Fill Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg-token mb-xl-token">
            {/* Chart 3: Registrations & Check-ins by Expo */}
            <ChartWrapper
              title="Registrations & Check-ins by Expo"
              subtitle="Attendee signups compared against verified gate check-ins"
              loading={loading}
              isEmpty={!loading && ticketsByExpoData.length === 0}
              emptyMessage="No expo attendance records found"
              minHeight={320}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={ticketsByExpoData}
                  margin={{ top: 10, right: 20, left: -20, bottom: 25 }}
                >
                  <CartesianGrid
                    stroke={isDarkMode ? COLORS.gridDark : COLORS.gridLight}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="expoName"
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey="totalTickets"
                    name="Registered"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="checkedInTickets"
                    name="Checked In"
                    fill={COLORS.checkin}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>

            {/* Chart 4: Booth Fill Rate by Expo */}
            <ChartWrapper
              title="Booth Occupancy Rate by Expo"
              subtitle="Approved exhibitor booths vs total available capacity (%)"
              loading={loading}
              isEmpty={!loading && boothsByExpoData.length === 0}
              emptyMessage="No booth layout data available"
              minHeight={320}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={boothsByExpoData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={isDarkMode ? COLORS.gridDark : COLORS.gridLight}
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="expoName"
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, _name: any, item: any) => [
                      `${value}% (${item.payload.approvedBooths} / ${item.payload.totalBooths} booths)`,
                      'Fill Rate',
                    ]}
                  />
                  <Bar
                    dataKey="fillRate"
                    name="Fill Rate (%)"
                    fill={COLORS.approved}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          {/* Section: Engagement Depth Analytics */}
          <div className="pt-sm-token">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-md-token">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-primary-dark" />
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    Engagement Depth & Session Performance
                  </h3>
                  <p
                    className={`text-xs-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Granular audience bookmarks and category interest breakdown for a specific expo
                  </p>
                </div>
              </div>

              {engagementExpos.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="expo-select"
                    className={`text-xs-token font-medium ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Expo:
                  </label>
                  <select
                    id="expo-select"
                    value={selectedExpoId}
                    onChange={(e) => setSelectedExpoId(e.target.value)}
                    className={`text-xs-token rounded-md-token px-3 py-1.5 border outline-none font-medium cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark hover:border-brand-primary-dark'
                        : 'bg-bg-surface-light border-border-base-light text-text-primary-light hover:border-brand-primary-light'
                    }`}
                  >
                    {engagementExpos.map((expo) => (
                      <option key={expo.expoId} value={expo.expoId}>
                        {expo.expoName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {engagementError && (
              <div
                className={`mb-lg-token p-md-token rounded-lg-token border text-xs-token ${
                  isDarkMode
                    ? 'bg-bg-error-dark/10 border-border-error-dark text-text-error-dark'
                    : 'bg-bg-error-light/10 border-border-error-light text-text-error-light'
                }`}
              >
                {engagementError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg-token">
              {/* Chart 5: Session Popularity (Bookmarks) */}
              <ChartWrapper
                title="Session Popularity & Bookmarks"
                subtitle="Most saved / bookmarked sessions by attendees"
                loading={engagementLoading}
                isEmpty={!engagementLoading && sessionPopularityData.length === 0}
                emptyMessage="No session schedule or bookmarks recorded for this expo"
                minHeight={320}
              >
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sessionPopularityData.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke={isDarkMode ? COLORS.gridDark : COLORS.gridLight}
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke={COLORS.mutedText}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="title"
                        stroke={COLORS.mutedText}
                        fontSize={11}
                        tickLine={false}
                        width={120}
                        tickFormatter={(val) => (val?.length > 18 ? `${val.slice(0, 16)}…` : val)}
                      />
                      <Tooltip
                        contentStyle={customTooltipStyle}
                        formatter={(value: any, name: any, item: any) => [
                          name === 'bookmarkCount'
                            ? `${value} bookmark(s) (${item.payload.capacityFillRate ?? 0}% room fill estimate)`
                            : value,
                          'Interest',
                        ]}
                        labelFormatter={(label) => `Session: ${label}`}
                      />
                      <Bar
                        dataKey="bookmarkCount"
                        name="Bookmarks"
                        fill={COLORS.accent}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartWrapper>

              {/* Chart 6: Exhibitor Category Distribution */}
              <ChartWrapper
                title="Exhibitor Category Distribution"
                subtitle="Application volume and status breakdown by industry sector"
                loading={engagementLoading}
                isEmpty={!engagementLoading && categoryDistributionData.length === 0}
                emptyMessage="No exhibitor applications submitted for this expo"
                minHeight={320}
              >
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryDistributionData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                    >
                      <CartesianGrid
                        stroke={isDarkMode ? COLORS.gridDark : COLORS.gridLight}
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="category"
                        stroke={COLORS.mutedText}
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke={COLORS.mutedText}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                      />
                      <Bar
                        dataKey="approved"
                        name="Approved"
                        fill={COLORS.approved}
                        stackId="status"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        fill={COLORS.pending}
                        stackId="status"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="rejected"
                        name="Rejected"
                        fill={COLORS.rejected}
                        stackId="status"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartWrapper>
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
