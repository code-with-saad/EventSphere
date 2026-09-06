import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { expoService, IExpoSpatialLayout } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import BackButton from '../../components/layout/BackButton';
import SpatialFloorPlanEditor from '../../components/expo/SpatialFloorPlanEditor';
import { Map, List, Store } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApprovedApplication {
  _id: string;
  companyName: string;
  boothLabel: string;
  category?: string;
  status: 'approved';
}

export default function BoothLayoutPage() {
  const { id: paramExpoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [expos, setExpos] = useState<any[]>([]);
  const [selectedExpoId, setSelectedExpoId] = useState<string>(paramExpoId || '');
  const [expo, setExpo] = useState<any | null>(null);

  const [approved, setApproved] = useState<ApprovedApplication[]>([]);
  const [totalBooths, setTotalBooths] = useState(0);
  const [assignedBooths, setAssignedBooths] = useState(0);
  const [boothFillRate, setBoothFillRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'editor' | 'table'>('editor');

  // 1. Fetch organizer's expos if no ID or for dropdown
  useEffect(() => {
    expoService
      .listMine()
      .then((list: any[]) => {
        setExpos(list || []);
        if (!selectedExpoId && list && list.length > 0) {
          setSelectedExpoId(list[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  const activeExpoId = paramExpoId || selectedExpoId;

  // 2. Fetch expo details and booths data
  const fetchBooths = useCallback(async () => {
    if (!activeExpoId) return;
    setLoading(true);
    setError(null);
    try {
      const [appData, expoData] = await Promise.all([
        applicationService.listForExpo(activeExpoId),
        expoService.getByIdForOrganizer(activeExpoId).catch(() => null),
      ]);

      setApproved(appData?.approved ?? []);
      setTotalBooths(appData?.totalBooths ?? expoData?.expo?.totalBooths ?? 0);
      setAssignedBooths(appData?.assignedBooths ?? 0);
      setBoothFillRate(appData?.boothFillRate ?? 0);
      setExpo(expoData?.expo ?? expoData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load booth layout');
    } finally {
      setLoading(false);
    }
  }, [activeExpoId]);

  useEffect(() => {
    fetchBooths();
  }, [fetchBooths]);

  const handleSaveSpatialLayout = async (layout: IExpoSpatialLayout) => {
    if (!activeExpoId) return;
    setSaving(true);
    try {
      await expoService.saveSpatialLayout(activeExpoId, layout);
      toast.success('Floor plan layout saved successfully!');
      fetchBooths();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save floor plan layout');
    } finally {
      setSaving(false);
    }
  };

  const sortedApproved = useMemo(
    () =>
      [...approved].sort((a, b) =>
        a.boothLabel.localeCompare(b.boothLabel, undefined, { numeric: true })
      ),
    [approved]
  );

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Booth Layout & Floor Plan" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          
          {/* Back button & Expo selector */}
          <div className="mb-lg-token flex flex-wrap items-center justify-between gap-md-token">
            <BackButton fallback="/organizer/expos" label="My Expos" />

            {/* Expo Selector Bar */}
            {expos.length > 0 && (
              <div className="flex items-center gap-2">
                <span className={`text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Select Expo:
                </span>
                <select
                  value={activeExpoId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedExpoId(newId);
                    if (paramExpoId) {
                      navigate(`/organizer/expos/${newId}/booths`);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg-token border text-xs-token font-medium outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                      : 'bg-white border-border-base-light text-text-primary-light'
                  }`}
                >
                  {expos.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Page header */}
          <div className="mb-lg-token flex flex-wrap items-end justify-between gap-md-token">
            <div>
              <h1 className={`text-xl-token md:text-2xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                {expo ? `${expo.name} — Floor Plan` : 'Booth Layout'}
              </h1>
              <p className={`mt-xs-token text-xs-token md:text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Design spatial layout and manage booth allocations
              </p>
            </div>

            {/* Stats Badge */}
            {!loading && (
              <div className="flex items-center gap-2">
                <span className={`text-xs-token px-3 py-1 rounded-full border ${
                  isDarkMode ? 'bg-glass-dark border-glass-border-dark text-text-primary-dark' : 'bg-glass-light border-glass-border-light text-text-primary-light'
                }`}>
                  <span className="font-bold text-brand-primary-dark">{assignedBooths}</span> / {totalBooths} booths assigned ({boothFillRate}%)
                </span>
              </div>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex border-b border-border-base-dark/20 mb-lg-token text-xs-token font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`inline-flex items-center gap-2 py-2.5 px-4 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'editor'
                  ? isDarkMode
                    ? 'border-brand-primary-dark text-brand-primary-dark'
                    : 'border-brand-primary-light text-brand-primary-light'
                  : isDarkMode
                  ? 'border-transparent text-text-secondary-dark hover:text-white'
                  : 'border-transparent text-text-secondary-light hover:text-black'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Spatial Layout Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center gap-2 py-2.5 px-4 transition-colors border-b-2 cursor-pointer ${
                activeTab === 'table'
                  ? isDarkMode
                    ? 'border-brand-primary-dark text-brand-primary-dark'
                    : 'border-brand-primary-light text-brand-primary-light'
                  : isDarkMode
                  ? 'border-transparent text-text-secondary-dark hover:text-white'
                  : 'border-transparent text-text-secondary-light hover:text-black'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Assigned Directory ({assignedBooths})</span>
            </button>
          </div>

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-xs-token opacity-70">
              Loading floor plan…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-lg-token bg-red-500/10 border border-red-500/20 text-red-500 text-xs-token">
              {error}
            </div>
          )}

          {!loading && !error && activeTab === 'editor' && (
            <SpatialFloorPlanEditor
              key={activeExpoId}
              initialLayout={expo?.spatialLayout}
              totalBooths={totalBooths}
              zones={expo?.zones}
              onSave={handleSaveSpatialLayout}
              saving={saving}
              readOnly={expo?.status === 'completed' || expo?.status === 'archived'}
            />
          )}

          {/* Table Tab */}
          {!loading && !error && activeTab === 'table' && (
            <div>
              {sortedApproved.length === 0 ? (
                <div className={`p-12 text-center rounded-xl-token border backdrop-blur-md ${
                  isDarkMode ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark' : 'bg-glass-light border-glass-border-light text-text-secondary-light'
                }`}>
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm-token font-medium">No booths assigned yet</p>
                  <p className="text-xs-token mt-1">Approve exhibitor applications in the Applications tab to allocate booths.</p>
                </div>
              ) : (
                <div
                  className={`rounded-xl-token border backdrop-blur-md overflow-hidden ${
                    isDarkMode ? 'border-glass-border-dark bg-glass-dark' : 'border-glass-border-light bg-glass-light'
                  }`}
                >
                  <table className="w-full text-sm-token border-collapse">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
                        {['Booth Label', 'Company Name', 'Category'].map((col) => (
                          <th
                            key={col}
                            className={`px-md-token py-sm-token text-left text-xs-token font-semibold tracking-wide ${
                              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                            }`}
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
            </div>
          )}

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
