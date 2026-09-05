import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  IExpoSpatialLayout,
  IBoothSpatialItem,
  IReferenceShape,
  IExpoZone,
} from '../../services/expoService';
import {
  Save,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  initialLayout?: IExpoSpatialLayout;
  totalBooths: number;
  zones?: IExpoZone[];
  onSave: (layout: IExpoSpatialLayout) => Promise<void>;
  saving?: boolean;
}

const SHAPE_TEMPLATES: { type: IReferenceShape['type']; label: string; width: number; height: number; color: string }[] = [
  { type: 'stage', label: 'Main Stage', width: 160, height: 80, color: '#8B5CF6' },
  { type: 'entrance', label: 'Entrance', width: 100, height: 40, color: '#10B981' },
  { type: 'exit', label: 'Emergency Exit', width: 100, height: 40, color: '#EF4444' },
  { type: 'restroom', label: 'Restrooms', width: 80, height: 60, color: '#06B6D4' },
  { type: 'pillar', label: 'Support Pillar', width: 40, height: 40, color: '#6B7280' },
  { type: 'custom', label: 'Information Desk', width: 100, height: 50, color: '#F59E0B' },
];

export default function SpatialFloorPlanEditor({
  initialLayout,
  totalBooths,
  zones = [],
  onSave,
  saving = false,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultCanvasWidth = initialLayout?.canvasWidth || 800;
  const defaultCanvasHeight = initialLayout?.canvasHeight || 600;
  const gridSize = initialLayout?.gridSize || 20;

  const [canvasWidth, setCanvasWidth] = useState(defaultCanvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(defaultCanvasHeight);
  const [booths, setBooths] = useState<IBoothSpatialItem[]>(initialLayout?.booths || []);
  const [referenceShapes, setReferenceShapes] = useState<IReferenceShape[]>(
    initialLayout?.referenceShapes || []
  );

  const [selectedItem, setSelectedItem] = useState<{
    type: 'booth' | 'shape';
    id: string; // boothLabel or shape.id
  } | null>(null);

  const [dragging, setDragging] = useState<{
    type: 'booth' | 'shape';
    id: string;
    startX: number;
    startY: number;
    initialItemX: number;
    initialItemY: number;
  } | null>(null);

  const [resizing, setResizing] = useState<{
    type: 'booth' | 'shape';
    id: string;
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const snap = (val: number) => Math.round(val / gridSize) * gridSize;

  // Auto-generate layout if booths are empty
  const handleAutoGenerate = () => {
    const newBooths: IBoothSpatialItem[] = [];
    const boothW = 70;
    const boothH = 60;
    const gapX = 20;
    const gapY = 30;
    const startX = 40;
    let currentY = 120;

    if (zones && zones.length > 0) {
      zones.forEach((z, zIdx) => {
        const prefix = z.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || `Z${zIdx + 1}`;
        const cols = Math.max(1, Math.floor((canvasWidth - 80) / (boothW + gapX)));
        for (let i = 1; i <= z.boothCount; i++) {
          const row = Math.floor((i - 1) / cols);
          const col = (i - 1) % cols;
          newBooths.push({
            boothLabel: `${prefix}-${String(i).padStart(2, '0')}`,
            x: startX + col * (boothW + gapX),
            y: currentY + row * (boothH + gapY),
            width: boothW,
            height: boothH,
            zoneName: z.name,
          });
        }
        const totalRows = Math.ceil(z.boothCount / cols);
        currentY += totalRows * (boothH + gapY) + 50;
      });
    } else {
      const cols = Math.max(1, Math.floor((canvasWidth - 80) / (boothW + gapX)));
      for (let i = 1; i <= (totalBooths || 20); i++) {
        const row = Math.floor((i - 1) / cols);
        const col = (i - 1) % cols;
        newBooths.push({
          boothLabel: `B-${String(i).padStart(2, '0')}`,
          x: startX + col * (boothW + gapX),
          y: currentY + row * (boothH + gapY),
          width: boothW,
          height: boothH,
          zoneName: 'Main Hall',
        });
      }
    }

    if (currentY > canvasHeight - 50) {
      setCanvasHeight(currentY + 100);
    }
    setBooths(newBooths);
    toast.success('Auto-arranged booths on canvas');
  };

  const handleAddBooth = () => {
    const nextIdx = booths.length + 1;
    const zoneName = zones[0]?.name || 'Main Hall';
    const prefix = zoneName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'B';
    const label = `${prefix}-${String(nextIdx).padStart(2, '0')}`;

    const newBooth: IBoothSpatialItem = {
      boothLabel: label,
      x: snap(canvasWidth / 2 - 35),
      y: snap(canvasHeight / 2 - 30),
      width: 70,
      height: 60,
      zoneName,
    };
    setBooths((p) => [...p, newBooth]);
    setSelectedItem({ type: 'booth', id: label });
  };

  const handleAddShape = (tmpl: (typeof SHAPE_TEMPLATES)[0]) => {
    const newShape: IReferenceShape = {
      id: `shape-${Date.now()}`,
      label: tmpl.label,
      type: tmpl.type,
      x: snap(canvasWidth / 2 - tmpl.width / 2),
      y: snap(40),
      width: tmpl.width,
      height: tmpl.height,
    };
    setReferenceShapes((p) => [...p, newShape]);
    setSelectedItem({ type: 'shape', id: newShape.id });
  };

  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'booth') {
      setBooths((p) => p.filter((b) => b.boothLabel !== selectedItem.id));
    } else {
      setReferenceShapes((p) => p.filter((s) => s.id !== selectedItem.id));
    }
    setSelectedItem(null);
  };

  const handleSave = async () => {
    const payload: IExpoSpatialLayout = {
      canvasWidth,
      canvasHeight,
      gridSize,
      booths,
      referenceShapes,
    };
    await onSave(payload);
  };

  // Mouse drag & resize handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    type: 'booth' | 'shape',
    id: string,
    isResizeHandle: boolean = false
  ) => {
    e.stopPropagation();
    setSelectedItem({ type, id });

    if (isResizeHandle) {
      const item =
        type === 'booth'
          ? booths.find((b) => b.boothLabel === id)
          : referenceShapes.find((s) => s.id === id);
      if (item) {
        setResizing({
          type,
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialWidth: item.width,
          initialHeight: item.height,
        });
      }
    } else {
      const item =
        type === 'booth'
          ? booths.find((b) => b.boothLabel === id)
          : referenceShapes.find((s) => s.id === id);
      if (item) {
        setDragging({
          type,
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialItemX: item.x,
          initialItemY: item.y,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const nextX = Math.max(0, Math.min(canvasWidth - 40, snap(dragging.initialItemX + dx)));
      const nextY = Math.max(0, Math.min(canvasHeight - 40, snap(dragging.initialItemY + dy)));

      if (dragging.type === 'booth') {
        setBooths((prev) =>
          prev.map((b) => (b.boothLabel === dragging.id ? { ...b, x: nextX, y: nextY } : b))
        );
      } else {
        setReferenceShapes((prev) =>
          prev.map((s) => (s.id === dragging.id ? { ...s, x: nextX, y: nextY } : s))
        );
      }
    } else if (resizing) {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      const nextW = Math.max(40, snap(resizing.initialWidth + dx));
      const nextH = Math.max(30, snap(resizing.initialHeight + dy));

      if (resizing.type === 'booth') {
        setBooths((prev) =>
          prev.map((b) =>
            b.boothLabel === resizing.id ? { ...b, width: nextW, height: nextH } : b
          )
        );
      } else {
        setReferenceShapes((prev) =>
          prev.map((s) =>
            s.id === resizing.id ? { ...s, width: nextW, height: nextH } : s
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const selectedBooth =
    selectedItem?.type === 'booth'
      ? booths.find((b) => b.boothLabel === selectedItem.id)
      : null;

  const selectedShape =
    selectedItem?.type === 'shape'
      ? referenceShapes.find((s) => s.id === selectedItem.id)
      : null;

  return (
    <div className="flex flex-col gap-md-token" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* Top Toolbar */}
      <div
        className={`p-md-token rounded-xl-token border flex flex-wrap items-center justify-between gap-md-token backdrop-blur-md ${
          isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddBooth}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md-token text-xs-token font-semibold border cursor-pointer ${
              isDark
                ? 'bg-brand-primary-dark/20 text-brand-primary-dark border-brand-primary-dark/30 hover:bg-brand-primary-dark/30'
                : 'bg-brand-primary-light/20 text-brand-primary-light border-brand-primary-light/30 hover:bg-brand-primary-light/30'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Booth</span>
          </button>

          {/* Add Template dropdown / buttons */}
          <div className="flex items-center gap-1">
            {SHAPE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.type}
                type="button"
                onClick={() => handleAddShape(tmpl)}
                className={`px-2.5 py-1.5 rounded-md-token text-xs-token font-medium border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-surface-dark'
                    : 'border-border-base-light text-text-secondary-light hover:bg-bg-surface-light'
                }`}
                title={`Add ${tmpl.label}`}
              >
                + {tmpl.label}
              </button>
            ))}
          </div>

          {booths.length === 0 && (
            <button
              type="button"
              onClick={handleAutoGenerate}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md-token text-xs-token font-medium border text-purple-400 border-purple-500/30 hover:bg-purple-500/10 cursor-pointer`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Arrange All</span>
            </button>
          )}

          {selectedItem && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md-token text-xs-token font-medium text-red-500 border border-red-500/30 hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs-token ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            {booths.length} Booths Placed
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md-token text-xs-token font-semibold shadow-md transition-all cursor-pointer ${
              isDark
                ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Floor Plan'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas & Property Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-md-token items-start">
        {/* SVG Interactive Canvas (8 or 9 cols on lg) */}
        <div
          className={`lg:col-span-9 p-md-token rounded-xl-token border overflow-auto backdrop-blur-md ${
            isDark ? 'bg-[#0E0E12] border-glass-border-dark' : 'bg-[#F9F9FB] border-glass-border-light'
          }`}
          style={{ minHeight: '500px', maxHeight: '75vh' }}
          onClick={() => setSelectedItem(null)}
        >
          <svg
            ref={svgRef}
            width={canvasWidth}
            height={canvasHeight}
            className="border border-border-base-dark/20 rounded-md-token shadow-inner select-none cursor-default"
            style={{
              backgroundColor: isDark ? '#141419' : '#FFFFFF',
              backgroundImage: isDark
                ? `radial-gradient(circle, #2A2A35 1px, transparent 1px)`
                : `radial-gradient(circle, #E5E7EB 1px, transparent 1px)`,
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          >
            {/* Grid Boundary Border */}
            <rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="none"
              stroke={isDark ? '#2D2D38' : '#E5E7EB'}
              strokeWidth={2}
            />

            {/* Reference Shapes (Stage, Entrances, etc.) */}
            {referenceShapes.map((shape) => {
              const isSelected = selectedItem?.type === 'shape' && selectedItem.id === shape.id;
              return (
                <g
                  key={shape.id}
                  transform={`translate(${shape.x}, ${shape.y})`}
                  onMouseDown={(e) => handleMouseDown(e, 'shape', shape.id)}
                  className="cursor-move"
                >
                  <rect
                    width={shape.width}
                    height={shape.height}
                    rx={6}
                    fill={isDark ? '#1E1E28' : '#F3F4F6'}
                    stroke={isSelected ? '#8B5CF6' : isDark ? '#3D3D52' : '#CBD5E1'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeDasharray={shape.type === 'exit' || shape.type === 'entrance' ? '4 2' : undefined}
                  />
                  <text
                    x={shape.width / 2}
                    y={shape.height / 2 + 4}
                    textAnchor="middle"
                    fill={isDark ? '#A1A1AA' : '#4B5563'}
                    fontSize={11}
                    fontWeight="600"
                  >
                    {shape.label}
                  </text>

                  {/* Resize Handle */}
                  {isSelected && (
                    <circle
                      cx={shape.width}
                      cy={shape.height}
                      r={5}
                      fill="#8B5CF6"
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'shape', shape.id, true)}
                    />
                  )}
                </g>
              );
            })}

            {/* Booths */}
            {booths.map((booth) => {
              const isSelected = selectedItem?.type === 'booth' && selectedItem.id === booth.boothLabel;

              return (
                <g
                  key={booth.boothLabel}
                  transform={`translate(${booth.x}, ${booth.y})`}
                  onMouseDown={(e) => handleMouseDown(e, 'booth', booth.boothLabel)}
                  className="cursor-move"
                >
                  <rect
                    width={booth.width}
                    height={booth.height}
                    rx={6}
                    fill={
                      isSelected
                        ? isDark
                          ? '#2E2248'
                          : '#EDE9FE'
                        : isDark
                        ? '#1A2333'
                        : '#EFF6FF'
                    }
                    stroke={
                      isSelected
                        ? '#8B5CF6'
                        : isDark
                        ? '#2B3B59'
                        : '#BFDBFE'
                    }
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />

                  {/* Booth Label */}
                  <text
                    x={booth.width / 2}
                    y={booth.height / 2 - 4}
                    textAnchor="middle"
                    fill={isDark ? '#93C5FD' : '#1D4ED8'}
                    fontSize={12}
                    fontWeight="bold"
                  >
                    {booth.boothLabel}
                  </text>

                  {/* Zone Name */}
                  {booth.zoneName && (
                    <text
                      x={booth.width / 2}
                      y={booth.height / 2 + 12}
                      textAnchor="middle"
                      fill={isDark ? '#6B7280' : '#9CA3AF'}
                      fontSize={9}
                      fontWeight="500"
                    >
                      {booth.zoneName}
                    </text>
                  )}

                  {/* Resize Handle */}
                  {isSelected && (
                    <circle
                      cx={booth.width}
                      cy={booth.height}
                      r={5}
                      fill="#8B5CF6"
                      className="cursor-se-resize"
                      onMouseDown={(e) => handleMouseDown(e, 'booth', booth.boothLabel, true)}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Column: Properties Inspector */}
        <div
          className={`lg:col-span-3 p-md-token rounded-xl-token border flex flex-col gap-md-token backdrop-blur-md ${
            isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
          }`}
        >
          <div className="border-b border-border-base-dark/20 pb-sm-token">
            <h2 className={`text-sm-token font-bold ${isDark ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Layout Inspector
            </h2>
            <p className={`text-xs-token ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              {selectedBooth
                ? `Editing Booth ${selectedBooth.boothLabel}`
                : selectedShape
                ? `Editing Shape: ${selectedShape.label}`
                : 'Click an item on canvas to edit'}
            </p>
          </div>

          {selectedBooth ? (
            <div className="space-y-sm-token">
              <div>
                <label className="block text-xs-token font-medium mb-1 opacity-70">Booth Label</label>
                <input
                  type="text"
                  value={selectedBooth.boothLabel}
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setBooths((prev) =>
                      prev.map((b) => (b.boothLabel === selectedBooth.boothLabel ? { ...b, boothLabel: newLabel } : b))
                    );
                    setSelectedItem({ type: 'booth', id: newLabel });
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                    isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs-token font-medium mb-1 opacity-70">Zone</label>
                {zones && zones.length > 0 ? (
                  <select
                    value={selectedBooth.zoneName || ''}
                    onChange={(e) => {
                      const newZone = e.target.value;
                      setBooths((prev) =>
                        prev.map((b) =>
                          b.boothLabel === selectedBooth.boothLabel ? { ...b, zoneName: newZone } : b
                        )
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                      isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                    }`}
                  >
                    {zones.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedBooth.zoneName || ''}
                    onChange={(e) => {
                      const newZone = e.target.value;
                      setBooths((prev) =>
                        prev.map((b) =>
                          b.boothLabel === selectedBooth.boothLabel ? { ...b, zoneName: newZone } : b
                        )
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                      isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                    }`}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs-token font-medium mb-1 opacity-70">Width (px)</label>
                  <input
                    type="number"
                    value={selectedBooth.width}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBooths((prev) =>
                        prev.map((b) =>
                          b.boothLabel === selectedBooth.boothLabel ? { ...b, width: Math.max(30, val) } : b
                        )
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                      isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs-token font-medium mb-1 opacity-70">Height (px)</label>
                  <input
                    type="number"
                    value={selectedBooth.height}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBooths((prev) =>
                        prev.map((b) =>
                          b.boothLabel === selectedBooth.boothLabel ? { ...b, height: Math.max(30, val) } : b
                        )
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                      isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : selectedShape ? (
            <div className="space-y-sm-token">
              <div>
                <label className="block text-xs-token font-medium mb-1 opacity-70">Label</label>
                <input
                  type="text"
                  value={selectedShape.label}
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setReferenceShapes((prev) =>
                      prev.map((s) => (s.id === selectedShape.id ? { ...s, label: newLabel } : s))
                    );
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                    isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs-token font-medium mb-1 opacity-70">Width</label>
                  <input
                    type="number"
                    value={selectedShape.width}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setReferenceShapes((prev) =>
                        prev.map((s) =>
                          s.id === selectedShape.id ? { ...s, width: Math.max(30, val) } : s
                        )
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                      isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs-token font-medium mb-1 opacity-70">Height</label>
                  <input
                    type="number"
                    value={selectedShape.height}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setReferenceShapes((prev) =>
                        prev.map((s) =>
                          s.id === selectedShape.id ? { ...s, height: Math.max(30, val) } : s
                        )
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-md-token border text-xs-token outline-none ${
                      isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg-token text-xs-token opacity-70 border border-dashed text-center">
              Select or drag any booth or venue shape to fine-tune its position, dimensions, or zone assignment.
            </div>
          )}

          {/* Canvas Settings */}
          <div className="border-t border-border-base-dark/20 pt-sm-token">
            <h3 className="text-xs-token font-bold mb-2 opacity-80">Canvas Dimensions</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] opacity-70 mb-1">Canvas Width</label>
                <input
                  type="number"
                  value={canvasWidth}
                  onChange={(e) => setCanvasWidth(Math.max(400, Number(e.target.value)))}
                  className={`w-full px-2 py-1 rounded-md-token border text-xs-token ${
                    isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] opacity-70 mb-1">Canvas Height</label>
                <input
                  type="number"
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(Math.max(400, Number(e.target.value)))}
                  className={`w-full px-2 py-1 rounded-md-token border text-xs-token ${
                    isDark ? 'bg-bg-surface-dark border-border-base-dark text-white' : 'bg-white border-border-base-light'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
