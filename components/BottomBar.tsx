"use client";

import { ViewConfig } from "./Sidebar";
import { ViewMode } from "./ViewSwitcher";

export interface LayoutConfig {
  cardSize: number;
  gap: number;
  activeScale: number;
  inactiveScale: number;
  margins: number;
  gridCardSize: number;
  gridGap: number;
  // Orbital parameters
  orbitCurve: number;      // curve intensity (0-20)
  orbitMaxOffset: number;  // max vertical offset (50-200)
  orbitDepth: number;      // horizontal depth compression (0-50)
}

export const defaultLayoutConfig: LayoutConfig = {
  cardSize: 140,
  gap: 120,
  activeScale: 1.15,
  inactiveScale: 0.95,
  margins: 12,
  gridCardSize: 220,
  gridGap: 24,
  // Orbital defaults
  orbitCurve: 8,
  orbitMaxOffset: 120,
  orbitDepth: 15,
};

interface BottomBarProps {
  config: ViewConfig;
  onConfigChange: (config: ViewConfig) => void;
  layoutConfig: LayoutConfig;
  onLayoutConfigChange: (config: LayoutConfig) => void;
  viewMode: ViewMode;
  compareMode: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onCompare: () => void;
}

export default function BottomBar({
  config,
  onConfigChange,
  layoutConfig,
  onLayoutConfigChange,
  viewMode,
  compareMode,
  selectedCount,
  onClearSelection,
  onCompare,
}: BottomBarProps) {
  const handleReset = () => {
    onLayoutConfigChange(defaultLayoutConfig);
  };

  return (
    <div className="relative z-40 border-t border-neutral-100 bg-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between rounded-xl shadow-lg">
      {/* Left side - title (hidden on mobile) */}
      <div className="hidden sm:flex items-center gap-4">
        <div>
          <span className="text-[13px] text-neutral-600">Humanoid</span>
          <span className="text-[13px] text-neutral-400 ml-1">Index</span>
        </div>
      </div>

      {/* Center - layout controls */}
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        {viewMode === 'carousel' ? (
          <>
            {/* Mobile: simplified 2-slider version */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Size</span>
              <input
                type="range"
                min={80}
                max={300}
                value={layoutConfig.cardSize}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, cardSize: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Gap</span>
              <input
                type="range"
                min={20}
                max={500}
                value={layoutConfig.gap}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, gap: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            {/* Desktop only: additional controls */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Focus</span>
              <input
                type="range"
                min={100}
                max={150}
                value={layoutConfig.activeScale * 100}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, activeScale: Number(e.target.value) / 100 })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Unfocus</span>
              <input
                type="range"
                min={60}
                max={100}
                value={layoutConfig.inactiveScale * 100}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, inactiveScale: Number(e.target.value) / 100 })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Margins</span>
              <input
                type="range"
                min={4}
                max={20}
                value={layoutConfig.margins}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, margins: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            {/* Orbital controls */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Curve</span>
              <input
                type="range"
                min={0}
                max={20}
                value={layoutConfig.orbitCurve}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, orbitCurve: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Arc</span>
              <input
                type="range"
                min={50}
                max={200}
                value={layoutConfig.orbitMaxOffset}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, orbitMaxOffset: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Depth</span>
              <input
                type="range"
                min={0}
                max={50}
                value={layoutConfig.orbitDepth}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, orbitDepth: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Card Size</span>
              <input
                type="range"
                min={120}
                max={300}
                value={layoutConfig.gridCardSize}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, gridCardSize: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-neutral-400">Gap</span>
              <input
                type="range"
                min={8}
                max={48}
                value={layoutConfig.gridGap}
                onChange={(e) => onLayoutConfigChange({ ...layoutConfig, gridGap: Number(e.target.value) })}
                className="w-14 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
              />
            </div>
          </>
        )}
        <button
          onClick={handleReset}
          className="text-[13px] text-neutral-400 hover:text-neutral-600"
        >
          Reset
        </button>
      </div>

      {/* Right side - compare info or keyboard hint (hidden on mobile unless compare mode active) */}
      <div className={`${compareMode && selectedCount > 0 ? 'flex' : 'hidden sm:flex'} items-center gap-4`}>
        {compareMode && selectedCount > 0 ? (
          <>
            <span className="text-[13px] text-neutral-600">
              <span className="font-medium">{selectedCount}</span> selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-[13px] text-neutral-400 hover:text-neutral-600"
            >
              Clear
            </button>
            <button
              onClick={onCompare}
              disabled={selectedCount < 2}
              className={`px-3 py-1 rounded-full text-[13px] font-medium ${
                selectedCount >= 2
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              Compare
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-neutral-400">
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-500">←→</kbd>
            <span>Navigate</span>
          </div>
        )}
      </div>
    </div>
  );
}
