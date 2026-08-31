import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ApplicationStatusBadge from './ApplicationStatusBadge';

interface ReviewPanelProps {
  application: {
    _id: string;
    companyName: string;
    companyDescription: string;
    category: string;
    phoneNumber: string;
    websiteUrl?: string;
    logoUrl?: string;
    organizerNote?: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    boothLabel?: string;
    rejectionReason?: string;
  } | null;
  onClose: () => void;
  onApprove: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onRevoke: (applicationId: string) => void;
  isActing?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function ReviewPanel({
  application,
  onClose,
  onApprove,
  onReject,
  onRevoke,
  isActing = false,
}: ReviewPanelProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset reject input when panel closes or application changes
  useEffect(() => {
    setShowRejectInput(false);
    setRejectReason('');
  }, [application?._id]);

  if (!application) return null;

  const labelClass = `text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`;
  const valueClass = `text-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`;

  const primaryBtn = `px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60`;
  const dangerBtn = `${primaryBtn} ${isDarkMode ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark hover:opacity-80' : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light hover:opacity-80'}`;
  const successBtn = `${primaryBtn} ${isDarkMode ? 'bg-bg-success-dark text-text-success-dark border border-text-success-dark hover:opacity-80' : 'bg-bg-success-light text-text-success-light border border-text-success-light hover:opacity-80'}`;
  const warningBtn = `${primaryBtn} ${isDarkMode ? 'bg-bg-warning-dark text-text-warning-dark border border-text-warning-dark hover:opacity-80' : 'bg-bg-warning-light text-text-warning-light border border-text-warning-light hover:opacity-80'}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside
        role="complementary"
        aria-label="Application review panel"
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col shadow-2xl overflow-y-auto ${
          isDarkMode
            ? 'bg-bg-surface-dark border-l border-border-base-dark'
            : 'bg-bg-surface-light border-l border-border-base-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-md-token border-b ${
          isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
        }`}>
          <h2 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            Application Review
          </h2>
          <button
            onClick={onClose}
            aria-label="Close review panel"
            className={`text-xl-token leading-none ${isDarkMode ? 'text-text-secondary-dark hover:text-text-primary-dark' : 'text-text-secondary-light hover:text-text-primary-light'}`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-md-token flex flex-col gap-md-token">

          {/* Company header */}
          <div className="flex items-center gap-md-token">
            {application.logoUrl ? (
              <img
                src={application.logoUrl}
                alt={`${application.companyName} logo`}
                className={`w-14 h-14 rounded-md-token object-contain border flex-shrink-0 ${
                  isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
                }`}
              />
            ) : (
              <div className={`w-14 h-14 rounded-md-token flex items-center justify-center text-base-token font-bold flex-shrink-0 ${
                isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
              }`}>
                {application.companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                {application.companyName}
              </div>
              <div className="flex items-center gap-xs-token mt-xs-token">
                <ApplicationStatusBadge status={application.status} />
                <span className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {application.category}
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-sm-token">
            <div>
              <p className={labelClass}>Description</p>
              <p className={valueClass}>{application.companyDescription}</p>
            </div>
            <div>
              <p className={labelClass}>Phone</p>
              <p className={valueClass}>{application.phoneNumber}</p>
            </div>
            {application.websiteUrl && (
              <div>
                <p className={labelClass}>Website</p>
                <a
                  href={application.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm-token underline ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}
                >
                  {application.websiteUrl}
                </a>
              </div>
            )}
            {application.organizerNote && (
              <div>
                <p className={labelClass}>Note to Organizer</p>
                <p className={valueClass}>{application.organizerNote}</p>
              </div>
            )}
            <div>
              <p className={labelClass}>Submitted</p>
              <p className={valueClass}>{formatDate(application.submittedAt)}</p>
            </div>
            {application.boothLabel && (
              <div>
                <p className={labelClass}>Assigned Booth</p>
                <p className={`${valueClass} font-medium`}>{application.boothLabel}</p>
              </div>
            )}
            {application.rejectionReason && (
              <div>
                <p className={labelClass}>Rejection Reason</p>
                <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
                  {application.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-sm-token mt-auto pt-md-token">
            {application.status === 'pending' && !showRejectInput && (
              <div className="flex gap-sm-token">
                <button
                  onClick={() => onApprove(application._id)}
                  disabled={isActing}
                  className={`flex-1 ${successBtn}`}
                >
                  {isActing ? 'Processing…' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={isActing}
                  className={`flex-1 ${dangerBtn}`}
                >
                  Reject
                </button>
              </div>
            )}

            {/* Reject with reason input */}
            {application.status === 'pending' && showRejectInput && (
              <div className="flex flex-col gap-sm-token">
                <label htmlFor="reject-reason" className={labelClass}>
                  Rejection reason (optional)
                </label>
                <textarea
                  id="reject-reason"
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for the exhibitor…"
                  maxLength={300}
                  className={`w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none resize-none ${
                    isDarkMode
                      ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark'
                      : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder:text-text-secondary-light'
                  }`}
                />
                <div className="flex gap-sm-token">
                  <button
                    onClick={() => onReject(application._id)}
                    disabled={isActing}
                    className={`flex-1 ${dangerBtn}`}
                  >
                    {isActing ? 'Processing…' : 'Confirm Reject'}
                  </button>
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                    disabled={isActing}
                    className={`px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors ${
                      isDarkMode
                        ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                        : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Revoke for approved */}
            {application.status === 'approved' && (
              <button
                onClick={() => onRevoke(application._id)}
                disabled={isActing}
                className={`w-full ${warningBtn}`}
              >
                {isActing ? 'Processing…' : 'Revoke Approval'}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
