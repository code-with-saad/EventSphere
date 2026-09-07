import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Ticket,
  ScanLine,
} from 'lucide-react';

interface AttendeeItem {
  _id: string;
  ticketId: string;
  expoId: string;
  expoName: string;
  attendeeId: string;
  fullName: string;
  email: string;
  status: 'active' | 'checked_in' | 'cancelled';
  registeredAt: string;
  checkedInAt?: string;
  checkIns?: Array<{ checkedInAt: string }>;
  checkInCount: number;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active: { label: 'Registered', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  checked_in: { label: 'Checked In', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
};

export default function OrganizerAttendeesPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [expos, setExpos] = useState<Array<{ _id: string; name: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedExpoId, setSelectedExpoId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ticketService.getOrganizerAttendees({
        expoId: selectedExpoId !== 'all' ? selectedExpoId : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
      });
      setAttendees(data?.attendees || []);
      if (data?.expos) {
        setExpos(data.expos);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load attendees directory');
    } finally {
      setLoading(false);
    }
  }, [selectedExpoId, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const totalRegistered = attendees.length;
  const checkedInCount = attendees.filter((a) => a.status === 'checked_in').length;
  const activeUncheckedCount = attendees.filter((a) => a.status === 'active').length;

  const bgCard = isDarkMode
    ? 'bg-glass-dark border-glass-border-dark'
    : 'bg-glass-light border-glass-border-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Attendees Directory" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h1 className={`text-xl-token md:text-2xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                Attendee Management &amp; Check-in Records
              </h1>
              <p className={`text-xs-token md:text-sm-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Complete record of registered, checked-in, and active event attendees across your expos
              </p>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token mb-lg-token">
            <BentoCard className="p-md-token flex items-center gap-3">
              <div className={`p-2.5 rounded-xl-token ${isDarkMode ? 'bg-bg-hover-dark text-text-primary-dark' : 'bg-bg-hover-light text-text-primary-light'}`}>
                <Users className="w-5 h-5 text-brand-primary-dark" />
              </div>
              <div>
                <div className={`text-2xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                  {totalRegistered}
                </div>
                <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Total Registrations
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-md-token flex items-center gap-3">
              <div className="p-2.5 rounded-xl-token bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl-token font-bold text-emerald-500">
                  {checkedInCount}
                </div>
                <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Checked In Attendees
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-md-token flex items-center gap-3">
              <div className="p-2.5 rounded-xl-token bg-blue-500/10 text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl-token font-bold text-blue-500">
                  {activeUncheckedCount}
                </div>
                <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Awaiting Check-in
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-sm-token mb-lg-token">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Search by attendee name, email, ticket ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg-token border text-xs-token outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark'
                    : 'bg-white border-border-base-light text-text-primary-light placeholder:text-text-secondary-light'
                }`}
              />
            </div>

            {/* Expo Filter */}
            <select
              value={selectedExpoId}
              onChange={(e) => setSelectedExpoId(e.target.value)}
              className={`px-3 py-2 rounded-lg-token border text-xs-token font-medium outline-none ${
                isDarkMode
                  ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                  : 'bg-white border-border-base-light text-text-primary-light'
              }`}
            >
              <option value="all">All Expos ({expos.length})</option>
              {expos.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.status})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`px-3 py-2 rounded-lg-token border text-xs-token font-medium outline-none ${
                isDarkMode
                  ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                  : 'bg-white border-border-base-light text-text-primary-light'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="checked_in">Checked In</option>
              <option value="active">Registered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Attendees Table */}
          {loading ? (
            <div className="py-20 text-center text-xs opacity-60">Loading attendees…</div>
          ) : error ? (
            <div className="p-4 rounded-lg-token bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              {error}
            </div>
          ) : attendees.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl-token border backdrop-blur-md ${bgCard}`}>
              <Ticket className="w-10 h-10 mx-auto mb-2 opacity-40 text-text-secondary-dark" />
              <p className="text-base-token font-semibold">No attendees found</p>
              <p className={`text-xs-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                {searchQuery
                  ? 'No attendee records match your search query.'
                  : 'No tickets registered for the selected filter.'}
              </p>
            </div>
          ) : (
            <div className={`rounded-xl-token border backdrop-blur-md overflow-hidden ${bgCard}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs-token border-collapse">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        isDarkMode
                          ? 'border-border-base-dark bg-bg-surface-dark/40 text-text-secondary-dark'
                          : 'border-border-base-light bg-bg-surface-light/40 text-text-secondary-light'
                      }`}
                    >
                      <th className="px-4 py-3">Attendee</th>
                      <th className="px-4 py-3">Expo</th>
                      <th className="px-4 py-3">Ticket ID</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Check-In Count</th>
                      <th className="px-4 py-3">Last Check-In Time</th>
                      <th className="px-4 py-3 text-right">Registered On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {attendees.map((item) => {
                      const badge = STATUS_BADGE[item.status] || STATUS_BADGE.active;

                      return (
                        <tr
                          key={item._id}
                          className={`transition-colors hover:bg-black/5 ${
                            isDarkMode ? 'hover:bg-white/5' : ''
                          }`}
                        >
                          {/* Attendee Name & Email */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isDarkMode
                                    ? 'bg-brand-primary-dark/20 text-brand-primary-dark'
                                    : 'bg-brand-primary-light/20 text-brand-primary-light'
                                }`}
                              >
                                {item.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold truncate ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                                  {item.fullName}
                                </div>
                                <div className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                                  {item.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Expo Name */}
                          <td className="px-4 py-3.5">
                            <span className={`font-medium ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                              {item.expoName}
                            </span>
                          </td>

                          {/* Ticket ID */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[11px] text-brand-primary-dark font-medium">
                              {item.ticketId.slice(0, 8)}…
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* Check-In Count */}
                          <td className="px-4 py-3.5">
                            {item.checkInCount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                                <ScanLine className="w-3.5 h-3.5" />
                                <span>{item.checkInCount} scan{item.checkInCount === 1 ? '' : 's'}</span>
                              </span>
                            ) : (
                              <span className="text-text-muted-dark text-[11px]">—</span>
                            )}
                          </td>

                          {/* Last Check-In Time (12-hour AM/PM format) */}
                          <td className="px-4 py-3.5">
                            {item.checkedInAt ? (
                              <div className="flex flex-col text-[11px]">
                                <span className="font-mono text-emerald-400 font-medium">
                                  {new Date(item.checkedInAt).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </span>
                                <span className="text-[10px] opacity-60">
                                  {new Date(item.checkedInAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-text-muted-dark text-[11px]">Not yet</span>
                            )}
                          </td>

                          {/* Registered On */}
                          <td className="px-4 py-3.5 text-right text-[11px] opacity-70">
                            {new Date(item.registeredAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
