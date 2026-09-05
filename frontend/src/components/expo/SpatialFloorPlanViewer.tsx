import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { IExpoSpatialLayout } from '../../services/expoService';
import { Check } from 'lucide-react';

interface Props {
  spatialLayout: IExpoSpatialLayout;
  occupiedBooths?: string[];
  boothOwners?: Record<string, string>; // boothLabel -> companyName
  selectedBooth?: string;
  onSelectBooth?: (boothLabel: string) => void;
  interactive?: boolean;
}

export default function SpatialFloorPlanViewer({
  spatialLayout,
  occupiedBooths = [],
  boothOwners = {},
  selectedBooth,
  onSelectBooth,
  interactive = true,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [hoveredBooth, setHoveredBooth] = useState<{
    boothLabel: string;
    zoneName?: string;
    isOccupied: boolean;
    companyName?: string;
    x: number;
    y: number;
  } | null>(null);

  const canvasWidth = spatialLayout.canvasWidth || 800;
  const canvasHeight = spatialLayout.canvasHeight || 600;
  const booths = spatialLayout.booths || [];
  const referenceShapes = spatialLayout.referenceShapes || [];

  const occupiedSet = new Set(occupiedBooths);

  return (
    <div className="flex flex-col gap-sm-token">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-sm-token text-xs-token px-sm-token py-xs-token">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-emerald-500/20 border border-emerald-500/50" />
            <span className={isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
              Available
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-purple-500/30 border border-purple-500" />
            <span className={isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
              Selected
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-red-500/20 border border-red-500/40" />
            <span className={isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
              Reserved
            </span>
          </div>
        </div>

        {selectedBooth && (
          <div className="flex items-center gap-1 font-semibold text-purple-400">
            <Check className="w-3.5 h-3.5" />
            <span>Selected Booth: {selectedBooth}</span>
          </div>
        )}
      </div>

      {/* SVG Canvas Container */}
      <div
        className={`relative w-full rounded-xl-token border overflow-auto backdrop-blur-md ${
          isDark ? 'bg-[#0F0F14] border-glass-border-dark' : 'bg-[#FAFAFC] border-glass-border-light'
        }`}
        style={{ maxHeight: '600px' }}
      >
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="w-full h-auto max-w-full select-none"
          style={{
            minWidth: Math.min(canvasWidth, 600),
            backgroundColor: isDark ? '#121217' : '#FFFFFF',
            backgroundImage: isDark
              ? `radial-gradient(circle, #242430 1px, transparent 1px)`
              : `radial-gradient(circle, #E5E7EB 1px, transparent 1px)`,
            backgroundSize: `${spatialLayout.gridSize || 20}px ${spatialLayout.gridSize || 20}px`,
          }}
        >
          {/* Outer Venue Border */}
          <rect
            x={2}
            y={2}
            width={canvasWidth - 4}
            height={canvasHeight - 4}
            fill="none"
            stroke={isDark ? '#262633' : '#E2E8F0'}
            strokeWidth={2}
            rx={8}
          />

          {/* Reference Shapes (Stage, Entrances, etc.) */}
          {referenceShapes.map((shape) => (
            <g key={shape.id} transform={`translate(${shape.x}, ${shape.y})`}>
              <rect
                width={shape.width}
                height={shape.height}
                rx={6}
                fill={isDark ? '#1C1C26' : '#F1F5F9'}
                stroke={isDark ? '#333344' : '#CBD5E1'}
                strokeWidth={1.5}
                strokeDasharray={shape.type === 'exit' || shape.type === 'entrance' ? '4 2' : undefined}
              />
              <text
                x={shape.width / 2}
                y={shape.height / 2 + 4}
                textAnchor="middle"
                fill={isDark ? '#9CA3AF' : '#64748B'}
                fontSize={11}
                fontWeight="600"
              >
                {shape.label}
              </text>
            </g>
          ))}

          {/* Booths */}
          {booths.map((booth) => {
            const isOccupied = occupiedSet.has(booth.boothLabel);
            const isSelected = selectedBooth === booth.boothLabel;
            const ownerName = boothOwners[booth.boothLabel];

            // Colors based on state
            let fillColor = isDark ? '#1F2430' : '#FFFFFF';
            let strokeColor = isDark ? '#374151' : '#D1D5DB';
            let textColor = isDark ? '#E5E7EB' : '#1F2937';

            if (isSelected) {
              fillColor = isDark ? '#581C87' : '#E9D5FF';
              strokeColor = '#A855F7';
              textColor = '#A855F7';
            } else if (isOccupied) {
              fillColor = isDark ? '#2A1515' : '#FEE2E2';
              strokeColor = isDark ? '#7F1D1D' : '#FCA5A5';
              textColor = isDark ? '#F87171' : '#DC2626';
            }

            return (
              <g
                key={booth.boothLabel}
                transform={`translate(${booth.x}, ${booth.y})`}
                className={`transition-all duration-150 ${
                  interactive && !isOccupied ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
                }`}
                onClick={() => {
                  if (interactive && !isOccupied && onSelectBooth) {
                    onSelectBooth(isSelected ? '' : booth.boothLabel);
                  }
                }}
                onMouseEnter={() =>
                  setHoveredBooth({
                    boothLabel: booth.boothLabel,
                    zoneName: booth.zoneName,
                    isOccupied,
                    companyName: ownerName,
                    x: booth.x + booth.width / 2,
                    y: booth.y,
                  })
                }
                onMouseLeave={() => setHoveredBooth(null)}
              >
                <rect
                  width={booth.width}
                  height={booth.height}
                  rx={6}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                <text
                  x={booth.width / 2}
                  y={booth.height / 2 - (ownerName ? 6 : 2)}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize={11}
                  fontWeight="bold"
                >
                  {booth.boothLabel}
                </text>

                {ownerName ? (
                  <text
                    x={booth.width / 2}
                    y={booth.height / 2 + 8}
                    textAnchor="middle"
                    fill={isDark ? '#FCA5A5' : '#DC2626'}
                    fontSize={8.5}
                    fontWeight="600"
                  >
                    {ownerName.length > 9 ? `${ownerName.slice(0, 8)}…` : ownerName}
                  </text>
                ) : booth.zoneName ? (
                  <text
                    x={booth.width / 2}
                    y={booth.height / 2 + 12}
                    textAnchor="middle"
                    fill={isDark ? '#6B7280' : '#9CA3AF'}
                    fontSize={9}
                  >
                    {booth.zoneName}
                  </text>
                ) : null}

                {isOccupied && !ownerName && (
                  <text
                    x={booth.width / 2}
                    y={booth.height - 6}
                    textAnchor="middle"
                    fill={isDark ? '#EF4444' : '#DC2626'}
                    fontSize={8}
                    fontWeight="bold"
                  >
                    RESERVED
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredBooth && (
          <div
            className={`absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border shadow-lg backdrop-blur-md ${
              isDark ? 'bg-black/90 text-white border-white/20' : 'bg-white/95 text-gray-900 border-gray-300'
            }`}
            style={{
              left: `${(hoveredBooth.x / canvasWidth) * 100}%`,
              top: `${(hoveredBooth.y / canvasHeight) * 100}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-bold">Booth {hoveredBooth.boothLabel}</div>
            {hoveredBooth.companyName && (
              <div className="text-[10px] text-brand-primary-light dark:text-brand-primary-dark font-medium">
                Exhibitor: {hoveredBooth.companyName}
              </div>
            )}
            {hoveredBooth.zoneName && <div className="text-[9px] opacity-70">{hoveredBooth.zoneName}</div>}
            <div className={`text-[9px] font-bold mt-0.5 ${hoveredBooth.isOccupied ? 'text-red-400' : 'text-emerald-400'}`}>
              {hoveredBooth.isOccupied ? (hoveredBooth.companyName ? 'Occupied' : 'Reserved') : 'Available'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
