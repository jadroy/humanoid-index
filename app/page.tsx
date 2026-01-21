"use client";

import { useState } from "react";
import Sidebar, { ViewConfig, defaultConfig } from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import ComparePanel from "@/components/ComparePanel";
import { humanoids } from "@/data/humanoids";

export default function Home() {
  const [config, setConfig] = useState<ViewConfig>(defaultConfig);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) return prev; // Max 4 robots
      return [...prev, id];
    });
  };

  const handleExitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds([]);
    setShowComparePanel(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 md:hidden p-2 rounded-lg bg-white text-neutral-800 shadow-md"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

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

      <Sidebar
        config={config}
        onConfigChange={setConfig}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 md:ml-52 h-screen overflow-hidden pt-16 md:pt-0">
        <div
          className="h-full overflow-x-auto overflow-y-hidden"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingTop: config.verticalPadding,
            paddingBottom: config.verticalPadding,
            paddingLeft: config.horizontalPadding,
            paddingRight: config.horizontalPadding,
          }}
        >
          <div
            className="grid grid-flow-col"
            style={{
              gridTemplateRows: 'repeat(2, auto)',
              gridAutoColumns: `${config.cardWidth}px`,
              columnGap: `${config.cardGap}px`,
              rowGap: `${config.cardGap}px`,
            }}
          >
            {humanoids.map((humanoid) => (
              <div key={humanoid.id} style={{ aspectRatio: '3/4' }}>
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
        </div>
      </main>

      {/* Compare mode footer bar */}
      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-52 bg-white border-t border-neutral-200 px-6 py-3 flex items-center justify-between z-40">
          <div className="text-[13px] text-neutral-600">
            <span className="font-medium">{selectedIds.length}</span> robot{selectedIds.length !== 1 ? 's' : ''} selected
            <span className="text-neutral-400 ml-2">(max 4)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds([])}
              className="text-[13px] text-neutral-400 hover:text-neutral-600"
            >
              Clear
            </button>
            <button
              onClick={() => setShowComparePanel(true)}
              disabled={selectedIds.length < 2}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                selectedIds.length >= 2
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              Compare
            </button>
          </div>
        </div>
      )}

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
