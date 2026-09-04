import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  Layers,
  Building2,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import ChartWrapper from '../../components/analytics/ChartWrapper';
import PendingApprovalScreen from '../../components/dashboard/PendingApprovalScreen';

const COLORS = {
  primary: '#FF4D2E',
  approved: '#10B981',
  pending: '#F59E0B',
  rejected: '#EF4444',
  withdrawn: '#8A8A8E',
  mutedText: '#8A8A8E',
  gridDark: 'rgba(255, 255, 255, 0.08)',
  gridLight: 'rgba(0, 0, 0, 0.06)',
};

const STATUS_COLORS: Record<string, string> = {
  Approved: COLORS.approved,
  Pending: COLORS.pending,
  Rejected: COLORS.rejected,
  Withdrawn: COLORS.withdrawn,
};

export default function ExhibitorAnalyticsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const rawApps = await applicationService.listAllMine();
        const appList: any[] = Array.isArray(rawApps) ? rawApps : (rawApps?.applications ?? []);

        let exposMap: Record<string, any> = {};
        try {
          const exposData = await expoService.list({ limit: 100 });
          const exposList: any[] = exposData?.expos ?? [];
          exposList.forEach((e) => {
            exposMap[e._id] = e;
          });
        } catch {
          // continue if expo map fails
        }

        const enriched = appList.map((app) => {
          const eid = typeof app.expoId === 'object' ? app.expoId?._id : app.expoId;
          const expoInfo = exposMap[eid];
          return {
            ...app,
            expoName: app.expoName || expoInfo?.name || 'Expo',
          };
        });

        if (!cancelled) {
          setApplications(enriched);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err?.message || 'Failed to load exhibitor analytics'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  if (user?.status === 'pending') {
    return <PendingApprovalScreen />;
  }

  // Aggregate stats
  const totalApps = applications.length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  const withdrawnCount = applications.filter((a) => a.status === 'withdrawn').length;

  const approvalRate =
    totalApps > 0 ? Math.round((approvedCount / totalApps) * 100) : 0;

  const statusPieData = [
    { name: 'Approved', value: approvedCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Rejected', value: rejectedCount },
    { name: 'Withdrawn', value: withdrawnCount },
  ].filter((d) => d.value > 0);

  // Group by category
  const categoryCounts: Record<string, number> = {};
  applications.forEach((a) => {
    const cat = a.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categoryBarData = Object.entries(categoryCounts).map(([cat, count]) => ({
    category: cat,
    count,
  }));

  // Applications list by Expo for visualization
  const expoAppCounts: Record<string, { approved: number; pending: number; rejected: number }> = {};
  applications.forEach((a) => {
    const name = a.expoName || 'Expo';
    if (!expoAppCounts[name]) {
      expoAppCounts[name] = { approved: 0, pending: 0, rejected: 0 };
    }
    if (a.status === 'approved') expoAppCounts[name].approved += 1;
    else if (a.status === 'pending') expoAppCounts[name].pending += 1;
    else if (a.status === 'rejected') expoAppCounts[name].rejected += 1;
  });

  const expoBarData = Object.entries(expoAppCounts).map(([expoName, counts]) => ({
    expoName,
    ...counts,
  }));

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
              Exhibitor Performance & Applications
            </h2>
            <p
              className={`text-sm-token mt-xs-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Overview of your booth application lifecycle, acceptance rates, and participation history
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
                  <Layers className="w-4 h-4 text-brand-primary-dark" />
                  <span>Applications</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : totalApps}
                </span>
                <span className="text-[11px] text-text-secondary-dark">Total submitted</span>
              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary-dark" />
                  <span>Approved Booths</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : approvedCount}
                </span>
                <span className="text-[11px] text-text-secondary-dark">{approvalRate}% acceptance rate</span>
              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <Clock className="w-4 h-4 text-brand-primary-dark" />
                  <span>Pending Review</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : pendingCount}
                </span>
                <span className="text-[11px] text-text-secondary-dark">Awaiting response</span>
              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col gap-sm-token">
                <div className="flex items-center gap-xs-token text-xs-token text-text-secondary-dark">
                  <Building2 className="w-4 h-4 text-brand-primary-dark" />
                  <span>Unique Expos</span>
                </div>
                <span className="text-2xl font-bold">
                  {loading ? '...' : Object.keys(expoAppCounts).length}
                </span>
                <span className="text-[11px] text-text-secondary-dark">Applied to</span>
              </div>
            </BentoCard>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg-token mb-xl-token">
            {/* Chart 1: Application Status Breakdown */}
            <ChartWrapper
              title="Application Status Breakdown"
              subtitle="Proportion of approved, pending, and rejected booth requests"
              loading={loading}
              isEmpty={!loading && statusPieData.length === 0}
              emptyMessage="No applications submitted yet"
              minHeight={300}
            >
              <div className="flex flex-col sm:flex-row items-center justify-around h-full w-full">
                <div className="w-full sm:w-3/5 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.name] || COLORS.primary}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={customTooltipStyle}
                        formatter={(val: any, name: any) => [
                          `${val} (${Math.round((Number(val) / (totalApps || 1)) * 100)}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2.5 sm:w-2/5 px-2">
                  {statusPieData.map((item) => (
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
                        {item.value} ({Math.round((item.value / (totalApps || 1)) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartWrapper>

            {/* Chart 2: Submissions by Category */}
            <ChartWrapper
              title="Applications by Industry Category"
              subtitle="Distribution of your applications across different categories"
              loading={loading}
              isEmpty={!loading && categoryBarData.length === 0}
              emptyMessage="No category data available"
              minHeight={300}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={categoryBarData}
                  margin={{ top: 10, right: 20, left: -20, bottom: 20 }}
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
                  />
                  <YAxis
                    stroke={COLORS.mutedText}
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Applications"
                    fill={COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          {/* Row 2: Applications per Expo */}
          {expoBarData.length > 0 && (
            <div className="mb-xl-token">
              <ChartWrapper
                title="Applications by Expo Event"
                subtitle="Status breakdown for each expo event you have applied to"
                loading={loading}
                isEmpty={!loading && expoBarData.length === 0}
                emptyMessage="No expo application records"
                minHeight={280}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={expoBarData}
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
                      angle={-15}
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
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      fill={COLORS.pending}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="rejected"
                      name="Rejected"
                      fill={COLORS.rejected}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
