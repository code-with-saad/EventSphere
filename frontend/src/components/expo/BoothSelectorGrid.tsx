import React, { useState } from 'react';
import { Store, CheckCircle, Ban, Layers, Map as MapIcon, LayoutGrid } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { IExpoSpatialLayout } from '../../services/expoService';
import SpatialFloorPlanViewer from './SpatialFloorPlanViewer';

export interface ExpoZone {
  name: string;
  boothCount: number;
}

interface BoothSelectorGridProps {
  totalBooths?: number;
  zones?: ExpoZone[];
  spatialLayout?: IExpoSpatialLayout;
  occupiedBooths: string[];
  boothOwners?: Record<string, string>;
  selectedBooth?: string;
  onSelectBooth: (boothLabel: string) => void;
  disabled?: boolean;
}

/**
 * Derives a clean zone prefix code:
 * e.g. "Hall A" -> "A", "Hall B" -> "B", "North Wing" -> "NW", "Main Hall" -> "M", "Zone 1" -> "Z1"
 */
function getZonePrefix(zoneName: string, index: number): string {
  const trimmed = zoneName.trim();
  const matchHall = trimmed.match(/^(?:hall|zone|section|area|room)\s+([a-z0-9]+)/i);
  if (matchHall) {
    return matchHall[1].toUpperCase();
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  }
  if (trimmed.length > 0) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  return String.fromCharCode(65 + index);
}

/**
 * Generates an array of formatted booth labels for a zone, e.g. A-01, A-02 ...
 */
function generateZoneBoothLabels(prefix: string, count: number): string[] {
  const labels: string[] = [];
  for (let i = 1; i <= count; i++) {
    const padNum = i < 10 ? `0${i}` : `${i}`;
    labels.push(`${prefix}-${padNum}`);
  }
  return labels;
}

export const BoothSelectorGrid: React.FC<BoothSelectorGridProps> = ({
  totalBooths = 20,
  zones,
  spatialLayout,
  occupiedBooths = [],
  boothOwners = {},
  selectedBooth,
  onSelectBooth,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const hasSpatial = Boolean(spatialLayout && spatialLayout.booths && spatialLayout.booths.length > 0);
  const [viewMode, setViewMode] = useState<'spatial' | 'grid'>(hasSpatial ? 'spatial' : 'grid');

  // If no explicit zones provided, create a default "Main Hall" zone using totalBooths
  const effectiveZones: ExpoZone[] = zones && zones.length > 0
    ? zones
    : [{ name: 'Main Hall', boothCount: Math.max(totalBooths || 1, 1) }];

  const occupiedSet = new Set(occupiedBooths.map((b) => b.toUpperCase().trim()));

  // If spatialLayout exists, group the spatial booths for Grid View so booth codes match 100%
  const gridZoneGroups = React.useMemo(() => {
    if (spatialLayout?.booths && spatialLayout.booths.length > 0) {
      const groups: { name: string; prefix?: string; labels: string[] }[] = [];
      const map = new globalThis.Map<string, string[]>();
      for (const b of spatialLayout.booths) {
        const zName = b.zoneName || 'Main Hall';
        if (!map.has(zName)) {
          map.set(zName, []);
        }
        map.get(zName)!.push(b.boothLabel);
      }
      for (const [name, labels] of map.entries()) {
        groups.push({
          name,
          labels,
        });
      }
      return groups;
    }

    return effectiveZones.map((zone, zIdx) => {
      const prefix = getZonePrefix(zone.name, zIdx);
      const labels = generateZoneBoothLabels(prefix, zone.boothCount);
      return {
        name: zone.name,
        prefix,
        labels,
      };
    });
  }, [spatialLayout, effectiveZones]);

  return (
    <div className="flex flex-col gap-4">
      {/* View Toggle Bar when spatial layout exists */}
      {hasSpatial && (
        <div className="flex items-center justify-between gap-2 border-b border-border-base-dark/20 pb-2">
          <span className={`text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            Venue Booth Layout
          </span>
          <div className="flex items-center gap-1 rounded-md-token p-0.5 bg-black/10 dark:bg-white/5 border border-border-base-dark/30">
            <button
              type="button"
              onClick={() => setViewMode('spatial')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs-token font-medium transition-colors cursor-pointer ${
                viewMode === 'spatial'
                  ? isDarkMode
                    ? 'bg-brand-primary-dark text-white shadow'
                    : 'bg-brand-primary-light text-white shadow'
                  : isDarkMode
                  ? 'text-text-secondary-dark hover:text-white'
                  : 'text-text-secondary-light hover:text-black'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Interactive Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs-token font-medium transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? isDarkMode
                    ? 'bg-brand-primary-dark text-white shadow'
                    : 'bg-brand-primary-light text-white shadow'
                  : isDarkMode
                  ? 'text-text-secondary-dark hover:text-white'
                  : 'text-text-secondary-light hover:text-black'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === 'spatial' && spatialLayout ? (
        <SpatialFloorPlanViewer
          spatialLayout={spatialLayout}
          occupiedBooths={occupiedBooths}
          boothOwners={boothOwners}
          selectedBooth={selectedBooth}
          onSelectBooth={disabled ? undefined : onSelectBooth}
          interactive={!disabled}
        />
      ) : (
        <>
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

          {/* Zoned containers */}
          <div className="flex flex-col gap-4">
            {gridZoneGroups.map((group, gIdx) => {
              const boothLabels = group.labels;
              const availableCount = boothLabels.filter(l => !occupiedSet.has(l.toUpperCase())).length;

              return (
                <div
                  key={`${group.name}-${gIdx}`}
                  className={`p-3 md:p-4 rounded-lg-token border ${
                    isDarkMode
                      ? 'bg-black/20 border-border-base-dark'
                      : 'bg-black/5 border-border-base-light'
                  }`}
                >
                  {/* Zone Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border-base-dark/20">
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
                      <span className={`text-sm-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        {group.name}
                      </span>
                      {group.prefix && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                          isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
                        }`}>
                          Code: {group.prefix}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      <span className="font-semibold text-brand-primary-dark">{availableCount}</span> / {boothLabels.length} available
                    </div>
                  </div>

                  {/* Booth grid for this zone */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {boothLabels.map((label) => {
                      const isOccupied = occupiedSet.has(label.toUpperCase());
                      const isSelected = selectedBooth?.toUpperCase() === label.toUpperCase();
                      const ownerName = boothOwners[label] || boothOwners[label.toUpperCase()];

                      if (isOccupied) {
                        return (
                          <div
                            key={label}
                            title={ownerName ? `Booth ${label} reserved by ${ownerName}` : `Booth ${label} is already reserved`}
                            className={`flex flex-col items-center justify-center p-2 rounded-md-token text-xs-token font-medium cursor-not-allowed opacity-40 border border-dashed ${
                              isDarkMode
                                ? 'bg-black/40 border-border-base-dark text-text-muted-dark'
                                : 'bg-black/10 border-border-base-light text-text-muted-light'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5 mb-0.5 opacity-60" />
                            <span className="text-[11px] font-mono">{label}</span>
                            {ownerName && (
                              <span className="text-[9px] truncate max-w-full opacity-75">{ownerName}</span>
                            )}
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
              );
            })}
          </div>
        </>
      )}

      <p className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        Click an available booth to request it. Booth allocation is confirmed upon organizer approval.
      </p>
    </div>
  );
};

export default BoothSelectorGrid;
