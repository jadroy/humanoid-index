"use client";

import { useState, useRef, useEffect } from "react";
import { ViewConfig, defaultConfig } from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import ComparePanel from "@/components/ComparePanel";
import BottomBar from "@/components/BottomBar";
import { humanoids } from "@/data/humanoids";

export default function Home() {
  const [config, setConfig] = useState<ViewConfig>(defaultConfig);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Convert vertical scroll to horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleExitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds([]);
    setShowComparePanel(false);
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Compare mode toggle */}
      <button
        onClick={() => compareMode ? handleExitCompareMode() : setCompareMode(true)}
        className={`fixed top-4 right-4 z-30 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
          compareMode
            ? 'bg-neutral-900 text-white'
            : 'bg-white text-neutral-600 shadow-md hover:shadow-lg'
        }`}
      >
        {compareMode ? 'Exit Compare' : 'Compare'}
      </button>

      {/* Main content - centered cards */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden flex items-center"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingLeft: config.horizontalPadding,
          paddingRight: config.horizontalPadding,
        }}
      >
        <div
          className="flex items-center gap-0"
          style={{ gap: `${config.cardGap}px` }}
        >
          {humanoids.map((humanoid) => (
            <div
              key={humanoid.id}
              className="flex-shrink-0"
              style={{
                width: `${config.cardWidth}px`,
                height: '420px',
              }}
            >
              <HumanoidCard
                humanoid={humanoid}
                config={config}
                compareMode={compareMode}
                isSelected={selectedIds.includes(humanoid.id)}
                onToggleSelect={handleToggleSelect}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Bottom bar with controls */}
      <BottomBar
        config={config}
        onConfigChange={setConfig}
        compareMode={compareMode}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onCompare={() => setShowComparePanel(true)}
      />

      {/* Compare panel modal */}
      {showComparePanel && (
        <ComparePanel
          selectedIds={selectedIds}
          onRemove={(id) => setSelectedIds(prev => prev.filter(i => i !== id))}
          onClear={() => setSelectedIds([])}
          onClose={() => setShowComparePanel(false)}
        />
      )}
    </div>
  );
}
