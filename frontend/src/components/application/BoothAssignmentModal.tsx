import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { IExpoSpatialLayout } from '../../services/expoService';
import { MapPin, AlertCircle, Info, Sparkles, Check } from 'lucide-react';

interface BoothAssignmentModalProps {
  isOpen: boolean;
  applicationId: string;
  expoId: string;
  totalBooths: number;
  assignedBooths: number;
  initialBooth?: string;
  preferredBooth?: string;
  spatialLayout?: IExpoSpatialLayout;
  zones?: { name: string; boothCount: number }[];
  approvedApplications?: { _id: string; companyName: string; boothLabel?: string }[];
  onConfirm: (boothLabel: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BoothAssignmentModal({
  isOpen,
  applicationId,
  totalBooths,
  assignedBooths,
  initialBooth = '',
  preferredBooth = '',
  spatialLayout,
  zones,
  approvedApplications = [],
  onConfirm,
  onCancel,
  isLoading = false,
}: BoothAssignmentModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const hasSpatialLayout = Boolean(spatialLayout?.booths && spatialLayout.booths.length > 0);

  // Map occupied booth labels to company names (excluding the current application if re-assigning)
  const occupiedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of approvedApplications) {
      if (app._id !== applicationId && app.boothLabel) {
        map.set(app.boothLabel.toUpperCase().trim(), app.companyName);
      }
    }
    return map;
  }, [approvedApplications, applicationId]);

  // Derive booth choices
  const boothOptions = useMemo(() => {
    if (hasSpatialLayout && spatialLayout?.booths) {
      return spatialLayout.booths.map((b) => {
        const key = b.boothLabel.toUpperCase().trim();
        const occupiedBy = occupiedMap.get(key);
        const isOccupied = Boolean(occupiedBy);
        const isPreferred = Boolean(
          preferredBooth && key === preferredBooth.toUpperCase().trim()
        );
        return {
          label: b.boothLabel,
          zoneName: b.zoneName || 'Main Hall',
          isOccupied,
          occupiedBy,
          isPreferred,
        };
      });
    }

    // If no spatial layout, generate from zones or totalBooths
    if (zones && zones.length > 0) {
      const list: {
        label: string;
        zoneName: string;
        isOccupied: boolean;
        occupiedBy?: string;
        isPreferred: boolean;
      }[] = [];
      zones.forEach((z, zIdx) => {
        const prefix =
          z.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() ||
          `Z${zIdx + 1}`;
        for (let i = 1; i <= z.boothCount; i++) {
          const label = `${prefix}-${String(i).padStart(2, '0')}`;
          const key = label.toUpperCase().trim();
          const occupiedBy = occupiedMap.get(key);
          list.push({
            label,
            zoneName: z.name,
            isOccupied: Boolean(occupiedBy),
            occupiedBy,
            isPreferred: Boolean(
              preferredBooth && key === preferredBooth.toUpperCase().trim()
            ),
          });
        }
      });
      return list;
    }

    // Default fallback list
    const count = Math.max(totalBooths || 1, 1);
    const list: {
      label: string;
      zoneName: string;
      isOccupied: boolean;
      occupiedBy?: string;
      isPreferred: boolean;
    }[] = [];
    for (let i = 1; i <= count; i++) {
      const label = `B-${String(i).padStart(2, '0')}`;
      const key = label.toUpperCase().trim();
      const occupiedBy = occupiedMap.get(key);
      list.push({
        label,
        zoneName: 'Main Hall',
        isOccupied: Boolean(occupiedBy),
        occupiedBy,
        isPreferred: Boolean(
          preferredBooth && key === preferredBooth.toUpperCase().trim()
        ),
      });
    }
    return list;
  }, [hasSpatialLayout, spatialLayout, zones, totalBooths, occupiedMap, preferredBooth]);

  const [selectedBooth, setSelectedBooth] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customBooth, setCustomBooth] = useState('');
  const [error, setError] = useState('');

  const fillRate = totalBooths > 0 ? Math.round((assignedBooths / totalBooths) * 100) : 0;
  const isFull = assignedBooths >= totalBooths;

  // Initialize selected booth when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setError('');

    // Preference priority:
    // 1. initialBooth if valid
    // 2. preferredBooth if valid & available
    // 3. first available booth option
    if (initialBooth) {
      const match = boothOptions.find(
        (o) => o.label.toUpperCase() === initialBooth.toUpperCase()
      );
      if (match) {
        setSelectedBooth(match.label);
        setCustomMode(false);
      } else {
        setSelectedBooth('');
        setCustomBooth(initialBooth);
        setCustomMode(true);
      }
      return;
    }

    if (preferredBooth) {
      const match = boothOptions.find(
        (o) => o.label.toUpperCase() === preferredBooth.toUpperCase()
      );
      if (match && !match.isOccupied) {
        setSelectedBooth(match.label);
        setCustomMode(false);
        return;
      }
    }

    const firstAvailable = boothOptions.find((o) => !o.isOccupied);
    if (firstAvailable) {
      setSelectedBooth(firstAvailable.label);
      setCustomMode(false);
    } else {
      setSelectedBooth(boothOptions[0]?.label || '');
      setCustomMode(false);
    }
  }, [isOpen, initialBooth, preferredBooth, boothOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalLabel = (customMode ? customBooth : selectedBooth).trim();

    if (!finalLabel) {
      setError('Please select or enter a booth label');
      return;
    }
    if (finalLabel.length > 20) {
      setError('Booth label must be 20 characters or fewer');
      return;
    }

    const occupiedCompany = occupiedMap.get(finalLabel.toUpperCase());
    if (occupiedCompany) {
      setError(`Booth "${finalLabel}" is already assigned to ${occupiedCompany}`);
      return;
    }

    setError('');
    onConfirm(finalLabel);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        className={`relative z-10 w-full max-w-md rounded-xl-token border p-lg-token shadow-2xl ${
          isDarkMode
            ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
            : 'bg-bg-surface-light border-border-base-light text-text-primary-light'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-md-token">
          <div className="flex items-center gap-2">
            <MapPin
              className={`w-5 h-5 ${
                isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
              }`}
            />
            <h2 id="booth-modal-title" className="text-base-token font-bold">
              Assign Booth to Exhibitor
            </h2>
          </div>
          <button
            onClick={onCancel}
            className={`text-lg leading-none p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Fill rate summary bar */}
        <div className="mb-md-token">
          <div
            className={`flex justify-between text-xs-token mb-xs-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            <span>Booth Fill Rate</span>
            <span>
              {assignedBooths} / {totalBooths} ({fillRate}%)
            </span>
          </div>
          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all ${
                isFull
                  ? isDarkMode
                    ? 'bg-text-danger-dark'
                    : 'bg-text-danger-light'
                  : fillRate >= 80
                  ? isDarkMode
                    ? 'bg-text-warning-dark'
                    : 'bg-text-warning-light'
                  : isDarkMode
                  ? 'bg-text-success-dark'
                  : 'bg-text-success-light'
              }`}
              style={{ width: `${Math.min(fillRate, 100)}%` }}
              role="progressbar"
              aria-valuenow={fillRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Booth fill rate: ${fillRate}%`}
            />
          </div>
        </div>

        {/* Overfill warning */}
        {isFull && (
          <div
            className={`mb-md-token px-sm-token py-xs-token rounded-md-token text-xs-token flex items-center gap-2 ${
              isDarkMode
                ? 'bg-bg-warning-dark text-text-warning-dark'
                : 'bg-bg-warning-light text-text-warning-light'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>All booths are filled. Approving this exhibitor will exceed expo capacity.</span>
          </div>
        )}

        {/* Preferred booth callout */}
        {preferredBooth && (
          <div
            className={`mb-md-token px-sm-token py-xs-token rounded-md-token text-xs-token flex items-center justify-between gap-2 ${
              isDarkMode
                ? 'bg-bg-hover-dark text-text-secondary-dark'
                : 'bg-bg-hover-light text-text-secondary-light'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary-dark" />
              Applicant preferred: <strong className="text-brand-primary-dark">{preferredBooth}</strong>
            </span>
            {occupiedMap.has(preferredBooth.toUpperCase()) ? (
              <span className="text-[11px] text-text-danger-dark font-medium">Already Reserved</span>
            ) : (
              <span className="text-[11px] text-text-success-dark font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Available
              </span>
            )}
          </div>
        )}

        {/* Informational banner when no spatial floor plan is created */}
        {!hasSpatialLayout && (
          <div
            className={`mb-md-token p-sm-token rounded-md-token text-xs-token flex items-start gap-2 border ${
              isDarkMode
                ? 'bg-bg-surface-dark border-border-base-dark text-text-secondary-dark'
                : 'bg-bg-surface-light border-border-base-light text-text-secondary-light'
            }`}
          >
            <Info className="w-4 h-4 text-brand-primary-dark shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text-primary-dark dark:text-text-primary-dark">
                No 2D floor plan defined yet
              </p>
              <p className="mt-0.5 text-[11px]">
                Showing standard generated booth codes. You can customize the visual map anytime in the <strong>Booth Layout</strong> editor.
              </p>
            </div>
          </div>
        )}

        {/* Booth Picker / Dropdown */}
        <div className="mb-md-token">
          <div className="flex items-center justify-between mb-xs-token">
            <label
              htmlFor="booth-picker-select"
              className="text-sm-token font-semibold"
            >
              Select Booth <span className="text-text-danger-dark">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setCustomMode(!customMode);
                setError('');
              }}
              className={`text-xs-token underline transition-colors cursor-pointer ${
                isDarkMode ? 'text-brand-primary-dark hover:opacity-80' : 'text-brand-primary-light hover:opacity-80'
              }`}
            >
              {customMode ? '← Pick from Floor Plan' : 'Enter Custom Code'}
            </button>
          </div>

          {!customMode ? (
            <div className="relative">
              <select
                id="booth-picker-select"
                value={selectedBooth}
                onChange={(e) => {
                  setSelectedBooth(e.target.value);
                  setError('');
                }}
                className={`w-full rounded-md-token border px-sm-token py-2 text-sm-token outline-none transition-colors appearance-none cursor-pointer ${
                  error
                    ? isDarkMode
                      ? 'border-text-danger-dark'
                      : 'border-text-danger-light'
                    : isDarkMode
                    ? 'border-border-base-dark bg-bg-surface-dark text-text-primary-dark focus:border-brand-primary-dark'
                    : 'border-border-base-light bg-bg-surface-light text-text-primary-light focus:border-brand-primary-light'
                }`}
              >
                <option value="" disabled>
                  -- Choose a booth code --
                </option>
                {boothOptions.map((opt) => (
                  <option
                    key={opt.label}
                    value={opt.label}
                    disabled={opt.isOccupied}
                  >
                    {opt.label} ({opt.zoneName})
                    {opt.isOccupied ? ` — Reserved (${opt.occupiedBy})` : ' — Available'}
                    {opt.isPreferred ? ' ★ (Applicant Requested)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary-dark">
                ▼
              </div>
            </div>
          ) : (
            <div>
              <input
                id="booth-picker-input"
                type="text"
                value={customBooth}
                onChange={(e) => {
                  setCustomBooth(e.target.value);
                  setError('');
                }}
                placeholder="e.g. B-01, VIP-1, Booth 104"
                maxLength={20}
                autoFocus
                className={`w-full rounded-md-token border px-sm-token py-2 text-sm-token outline-none transition-colors ${
                  error
                    ? isDarkMode
                      ? 'border-text-danger-dark'
                      : 'border-text-danger-light'
                    : isDarkMode
                    ? 'border-border-base-dark bg-bg-surface-dark text-text-primary-dark focus:border-brand-primary-dark'
                    : 'border-border-base-light bg-bg-surface-light text-text-primary-light focus:border-brand-primary-light'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
              <p
                className={`mt-1 text-[11px] ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                ⚠️ Custom codes not on the spatial layout will not highlight on the interactive map until added in Booth Layout editor.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className={`mt-xs-token text-xs-token font-medium ${
                isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
              }`}
            >
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-sm-token justify-end pt-sm-token border-t border-border-base-dark/20">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={`px-md-token py-1.5 rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 cursor-pointer ${
              isDarkMode
                ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-md-token py-1.5 rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 cursor-pointer ${
              isDarkMode
                ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
            }`}
          >
            {isLoading ? 'Approving…' : 'Confirm & Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

