import React from 'react';
import { Store, CheckCircle, Ban } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface BoothSelectorGridProps {
  totalBooths: number;
  occupiedBooths: string[];
  selectedBooth?: string;
  onSelectBooth: (boothLabel: string) => void;
  disabled?: boolean;
}

/**
 * Generates an array of formatted booth labels, e.g. A-01, A-02 ... B-01 ... up to totalBooths
 */
function generateBoothLabels(total: number): string[] {
  const labels: string[] = [];
  const boothsPerRow = 10;
  for (let i = 0; i < total; i++) {
    const rowChar = String.fromCharCode(65 + Math.floor(i / boothsPerRow)); // A, B, C...
    const colNum = (i % boothsPerRow) + 1;
    const padNum = colNum < 10 ? `0${colNum}` : `${colNum}`;
    labels.push(`${rowChar}-${padNum}`);
  }
  return labels;
}

export const BoothSelectorGrid: React.FC<BoothSelectorGridProps> = ({
  totalBooths,
  occupiedBooths = [],
  selectedBooth,
  onSelectBooth,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const allBooths = generateBoothLabels(Math.min(Math.max(totalBooths || 1, 1), 60));
  const occupiedSet = new Set(occupiedBooths.map((b) => b.toUpperCase().trim()));

  return (
    <div className="flex flex-col gap-3">
      {/* Legend & Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs-token">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded border ${isDarkMode ? 'bg-bg-glass-dark border-border-base-dark' : 'bg-white border-border-base-light'}`} />
            <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded ${isDarkMode ? 'bg-brand-primary-dark text-white' : 'bg-brand-primary-light text-white'}`} />
            <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded ${isDarkMode ? 'bg-black/40 border border-border-base-dark/50' : 'bg-black/10 border border-border-base-light'}`} />
            <span className={isDarkMode ? 'text-text-muted-dark' : 'text-text-muted-light'}>Reserved</span>
          </div>
        </div>

        {selectedBooth && (
          <div className={`font-semibold ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}>
            Selected Booth: {selectedBooth}
          </div>
        )}
      </div>

      {/* Grid container */}
      <div
        className={`p-3 md:p-4 rounded-lg-token border max-h-64 overflow-y-auto ${
          isDarkMode
            ? 'bg-black/20 border-border-base-dark'
            : 'bg-black/5 border-border-base-light'
        }`}
      >
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
          {allBooths.map((label) => {
            const isOccupied = occupiedSet.has(label.toUpperCase());
            const isSelected = selectedBooth?.toUpperCase() === label.toUpperCase();

            if (isOccupied) {
              return (
                <div
                  key={label}
                  title={`Booth ${label} is already reserved`}
                  className={`flex flex-col items-center justify-center p-2 rounded-md-token text-xs-token font-medium cursor-not-allowed opacity-40 border border-dashed ${
                    isDarkMode
                      ? 'bg-black/40 border-border-base-dark text-text-muted-dark'
                      : 'bg-black/10 border-border-base-light text-text-muted-light'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 mb-0.5 opacity-60" />
                  <span className="text-[11px] font-mono">{label}</span>
                </div>
              );
            }

            return (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => onSelectBooth(isSelected ? '' : label)}
                className={`flex flex-col items-center justify-center p-2 rounded-md-token text-xs-token font-medium transition-all duration-150 cursor-pointer border ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-brand-primary-dark border-brand-primary-dark text-white shadow-md scale-105'
                      : 'bg-brand-primary-light border-brand-primary-light text-white shadow-md scale-105'
                    : isDarkMode
                    ? 'bg-bg-glass-dark border-border-base-dark text-text-primary-dark hover:border-brand-primary-dark hover:bg-white/5'
                    : 'bg-white border-border-base-light text-text-primary-light hover:border-brand-primary-light hover:bg-black/5'
                }`}
              >
                {isSelected ? (
                  <CheckCircle className="w-3.5 h-3.5 mb-0.5 text-white" />
                ) : (
                  <Store className={`w-3.5 h-3.5 mb-0.5 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`} />
                )}
                <span className="text-[11px] font-mono font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        Click an available booth to request it. Booth allocation is confirmed upon organizer approval.
      </p>
    </div>
  );
};

export default BoothSelectorGrid;
