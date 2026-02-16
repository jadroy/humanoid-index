"use client";

import { useRef, useEffect, useState } from "react";

export type ViewMode = 'carousel' | 'grid' | 'select' | 'smash';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  width?: number;
  showHud?: boolean;
}

const modes: { key: ViewMode; label: string; shortcut: string }[] = [
  { key: 'carousel', label: 'Carousel', shortcut: '1' },
  { key: 'grid', label: 'Grid', shortcut: '2' },
  { key: 'select', label: 'Compare', shortcut: '3' },
];

export default function ViewSwitcher({ viewMode, onViewModeChange, width, showHud = true }: ViewSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-mode="${viewMode}"]`) as HTMLElement;
    if (!activeBtn) return;
    setSliderStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [viewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mode = modes.find(m => m.shortcut === e.key);
      if (mode) onViewModeChange(mode.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewModeChange]);

  return (
    <div
      className="flex items-center justify-center font-mono text-[11px] uppercase tracking-normal select-none"
      style={width ? { width: `${width}px` } : undefined}
    >
      {/* Left flanking line */}
      {showHud && (
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.08))' }}
        />
      )}
      <div
        ref={containerRef}
        className="relative flex items-center gap-0 border border-neutral-200 rounded px-0.5 py-0.5"
      >
        {/* Sliding background */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded-sm bg-neutral-100 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ left: `${sliderStyle.left}px`, width: `${sliderStyle.width}px` }}
        />
        {modes.map((mode) => (
          <button
            key={mode.key}
            data-mode={mode.key}
            onClick={() => onViewModeChange(mode.key)}
            className="relative z-10 px-2.5 py-0.5 transition-colors duration-150 flex items-center gap-1.5"
            style={{ color: viewMode === mode.key ? '#000' : '#bbb' }}
          >
            {mode.label}
            <span
              className="text-[9px] opacity-30"
              style={{ color: viewMode === mode.key ? '#000' : '#999' }}
            >
              {mode.shortcut}
            </span>
          </button>
        ))}
      </div>
      {/* Right flanking line */}
      {showHud && (
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.08))' }}
        />
      )}
    </div>
  );
}
