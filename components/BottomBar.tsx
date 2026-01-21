"use client";

import { useState } from "react";
import { ViewConfig, defaultConfig } from "./Sidebar";

interface BottomBarProps {
  config: ViewConfig;
  onConfigChange: (config: ViewConfig) => void;
  compareMode: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onCompare: () => void;
}

export default function BottomBar({
  config,
  onConfigChange,
  compareMode,
  selectedCount,
  onClearSelection,
  onCompare,
}: BottomBarProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="border-t border-neutral-100 bg-white px-6 py-3 flex items-center justify-between">
      {/* Left side - title */}
      <div className="flex items-center gap-4">
        <div>
          <span className="text-[13px] text-neutral-600">Humanoid</span>
          <span className="text-[13px] text-neutral-400 ml-1">Index</span>
        </div>
      </div>

      {/* Center - quick controls */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-400">Size</span>
          <input
            type="range"
            min={120}
            max={300}
            value={config.cardWidth}
            onChange={(e) => onConfigChange({ ...config, cardWidth: Number(e.target.value) })}
            className="w-16 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-400">Gap</span>
          <input
            type="range"
            min={0}
            max={32}
            value={config.cardGap}
            onChange={(e) => onConfigChange({ ...config, cardGap: Number(e.target.value) })}
            className="w-16 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-400">Radius</span>
          <input
            type="range"
            min={0}
            max={32}
            value={config.cardRadius}
            onChange={(e) => onConfigChange({ ...config, cardRadius: Number(e.target.value) })}
            className="w-16 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-400">Padding</span>
          <input
            type="range"
            min={0}
            max={48}
            value={config.cardPadding}
            onChange={(e) => onConfigChange({ ...config, cardPadding: Number(e.target.value) })}
            className="w-16 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
          />
        </div>
        <button
          onClick={() => onConfigChange(defaultConfig)}
          className="text-[13px] text-neutral-400 hover:text-neutral-600"
        >
          Reset
        </button>
      </div>

      {/* Right side - compare info or keyboard hint */}
      <div className="flex items-center gap-4">
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
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-500">⌘K</kbd>
            <span>Search</span>
          </div>
        )}
      </div>
    </div>
  );
}
