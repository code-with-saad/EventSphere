import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import BackButton from '../../components/layout/BackButton';

interface ApprovedApplication {
  _id: string;
  companyName: string;
  boothLabel: string;
  category?: string;
  status: 'approved';
}

export default function BoothLayoutPage() {
  const { id: expoId } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [approved, setApproved] = useState<ApprovedApplication[]>([]);
  const [totalBooths, setTotalBooths] = useState(0);
  const [assignedBooths, setAssignedBooths] = useState(0);
  const [boothFillRate, setBoothFillRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooths = useCallback(async () => {
    if (!expoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await applicationService.listForExpo(expoId);
      setApproved(data?.approved ?? []);
      setTotalBooths(data?.totalBooths ?? 0);
      setAssignedBooths(data?.assignedBooths ?? 0);
      setBoothFillRate(data?.boothFillRate ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load booth layout');
    } finally {
      setLoading(false);
    }
  }, [expoId]);

  useEffect(() => { fetchBooths(); }, [fetchBooths]);

  const sortedApproved = useMemo(
    () => [...approved].sort((a, b) =>
      a.boothLabel.localeCompare(b.boothLabel, undefined, { numeric: true })
    ),
    [approved]
  );

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Booth layout" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>

          {/* Page header */}
          <div className="mb-xl-token">
            <div className="mb-sm-token">
              <BackButton fallback="/organizer/expos" label="My Expos" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-md-token">
              <div>
                <h1 className={`text-xl-token font-semibold leading-tight-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                  Booth layout
                </h1>
                <p className={`mt-xs-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Assigned booths sorted by label
                </p>
              </div>

              {/* Stat */}
              {!loading && (
                <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  <span className={`font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                    {assignedBooths} / {totalBooths}
                  </span>
                  {' '}booths assigned ({boothFillRate}%)
                </p>
              )}
            </div>
          </div>

          {/* States */}
          {loading && (
            <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              Loading booths…
            </p>
          )}

          {!loading && error && (
            <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
              {error}
            </p>
          )}

          {!loading && !error && sortedApproved.length === 0 && (
            <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              No booths assigned yet. Approve applications to assign booth labels.
            </p>
          )}

          {/* Table */}
          {!loading && !error && sortedApproved.length > 0 && (
            <div className={`rounded-xl-token border backdrop-blur-md overflow-hidden ${isDarkMode ? 'border-glass-border-dark bg-glass-dark' : 'border-glass-border-light bg-glass-light'}`}>
              <table className="w-full text-sm-token border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
                    {['Booth', 'Company', 'Category'].map((col) => (
                      <th
                        key={col}
                        className={`px-md-token py-sm-token text-left text-xs-token font-semibold tracking-wide ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedApproved.map((app, index) => (
                    <tr
                      key={app._id}
                      className={[
                        'transition-colors duration-120',
                        index < sortedApproved.length - 1
                          ? `border-b ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`
                          : '',
                        isDarkMode ? 'hover:bg-bg-hover-dark' : 'hover:bg-bg-hover-light',
                      ].join(' ')}
                    >
                      <td className={`px-md-token py-sm-token font-medium ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}>
                        {app.boothLabel}
                      </td>
                      <td className={`px-md-token py-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        {app.companyName}
                      </td>
                      <td className={`px-md-token py-sm-token ${isDarkMode ? 'text-text-muted-dark' : 'text-text-muted-light'}`}>
                        {app.category ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
