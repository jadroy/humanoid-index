"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ViewConfig, defaultConfig } from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import ComparePanel from "@/components/ComparePanel";
import BottomBar, { LayoutConfig, defaultLayoutConfig } from "@/components/BottomBar";
import ChatBot from "@/components/ChatBot";
import { humanoids } from "@/data/humanoids";

export default function Home() {
  const router = useRouter();
  const [config, setConfig] = useState<ViewConfig>(defaultConfig);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(defaultLayoutConfig);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportRatio, setViewportRatio] = useState(0.2);
  const [isInActiveZone, setIsInActiveZone] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const isDraggingMinimapRef = useRef(false);

  // Scale - no hover effect, just scroll position based
  const getScale = useCallback((index: number) => {
    const distance = Math.abs(index - scrollPositionRef.current);
    if (distance < 0.5) return layoutConfig.activeScale;
    return Math.max(layoutConfig.inactiveScale, layoutConfig.activeScale - distance * 0.08);
  }, [layoutConfig.activeScale, layoutConfig.inactiveScale]);

  // Opacity: items to the left fade out more, right stays visible
  const getOpacity = useCallback((index: number) => {
    const currentPos = scrollPositionRef.current;
    const diff = index - currentPos;

    // Items to the left fade out aggressively
    if (diff < -0.5) return 0.15;
    // Current item
    if (Math.abs(diff) < 0.5) return 1;
    // Items to the right fade gradually
    return Math.max(0.4, 1 - diff * 0.15);
  }, []);


  // Scroll to specific card
  const scrollToCard = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;

    const cardTotalWidth = layoutConfig.cardSize + layoutConfig.gap;
    // Account for the placeholder card
    const targetScroll = (index + 1) * cardTotalWidth;
    el.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, [layoutConfig.cardSize, layoutConfig.gap]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComparePanel) return; // Don't navigate when modal is open

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          scrollToCard(Math.max(0, currentIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          scrollToCard(Math.min(humanoids.length - 1, currentIndex + 1));
          break;
        case 'Enter':
          if (!compareMode) {
            router.push(`/robot/${humanoids[currentIndex].id}`);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, compareMode, showComparePanel, scrollToCard, router]);

  // Leading/trailing space for scroll zones
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fixed inset margins
  const insetX = 252;
  const insetY = 120;

  // Trailing space after last card (so last card can be at left + space for outro)
  const trailingSpace = windowWidth * 0.8;

  // Horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const handleWheel = (e: WheelEvent) => {
      // Use horizontal scroll directly (deltaX), or convert vertical if no horizontal
      if (e.deltaX !== 0) {
        // Native horizontal scroll - let it through
        return;
      }
      // If only vertical scroll (e.g., regular mouse wheel), convert to horizontal
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    const handleScroll = () => {
      // Throttle state updates with RAF
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollLeft = el.scrollLeft;
        const cardTotalWidth = layoutConfig.cardSize + layoutConfig.gap;
        // Account for placeholder card at index -1 (subtract one card width)
        const adjustedScroll = scrollLeft - cardTotalWidth + insetX;
        const fractionalIndex = adjustedScroll / cardTotalWidth;
        const index = Math.round(fractionalIndex);

        scrollPositionRef.current = fractionalIndex;
        setCurrentIndex(Math.max(0, Math.min(index, humanoids.length - 1)));

        // In active zone when past the placeholder card
        const inActiveZone = fractionalIndex >= -0.3 && fractionalIndex <= humanoids.length - 0.7;
        setIsInActiveZone(inActiveZone);

        const maxScroll = el.scrollWidth - el.clientWidth;
        setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
        setViewportRatio(el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 0.2);
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [layoutConfig.cardSize, layoutConfig.gap, insetX]);

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

  const currentHumanoid = humanoids[currentIndex];
  const activeHumanoid = currentHumanoid;

  const handleMinimapMouseMove = useCallback((clientX: number) => {
    const minimap = minimapRef.current;
    const scrollEl = scrollRef.current;
    if (!minimap || !scrollEl) return;

    const rect = minimap.getBoundingClientRect();

    // Direct position mapping - cursor X on minimap maps to scroll position
    const relativeX = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, relativeX / rect.width));
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    scrollEl.scrollLeft = progress * maxScroll;
  }, []);

  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingMinimapRef.current = true;
    // Immediately update scroll position on click
    handleMinimapMouseMove(e.clientX);
  };

  // Global mouse handlers for minimap dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingMinimapRef.current) return;
      handleMinimapMouseMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      isDraggingMinimapRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleMinimapMouseMove]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ padding: `${insetY}px ${insetX}px`, backgroundColor: '#fafafa' }}>
      {/* LABEL + MINIMAP ROW */}
      <div className="flex-shrink-0 relative z-20 flex items-start justify-between">
        {/* Left: Name/Manufacturer - aligned with first humanoid */}
        {!isInActiveZone ? (
          <div key="index-label" className="animate-blur-fade">
            <div className="text-[13px] text-neutral-400 tracking-tight">Index</div>
            <div className="text-[22px] font-medium text-neutral-800 tracking-tighter">Humanoid</div>
          </div>
        ) : (
          <div key={`humanoid-${activeHumanoid.id}`} className="animate-blur-fade">
            <div className="text-[13px] text-neutral-400 tracking-tight">{activeHumanoid.manufacturer}</div>
            <div className="text-[22px] font-medium text-neutral-800 tracking-tighter">{activeHumanoid.name}</div>
          </div>
        )}

        {/* Center: Minimap with humanoid thumbnails */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
          <div
            ref={minimapRef}
            className="relative h-10 bg-neutral-50/80 backdrop-blur-sm rounded-full cursor-pointer overflow-hidden border border-neutral-100 select-none"
            style={{ width: `${Math.max(200, humanoids.length * 24 + 32)}px` }}
            onMouseDown={handleMinimapMouseDown}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="absolute inset-0 flex items-center justify-center px-3 gap-1 pointer-events-none">
              {/* Placeholder dot */}
              <div
                className={`w-5 h-5 rounded-full flex-shrink-0 transition-all duration-200 overflow-hidden border-2 ${
                  !isInActiveZone ? 'border-neutral-400 scale-110' : 'border-transparent scale-100 opacity-50'
                }`}
              >
                <img
                  src="/robots/placeholder.png"
                  alt="Index"
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              </div>
              {humanoids.map((h, i) => (
                <div
                  key={h.id}
                  className={`w-5 h-5 rounded-full flex-shrink-0 transition-all duration-200 overflow-hidden border-2 ${
                    i === currentIndex && isInActiveZone
                      ? 'border-neutral-400 scale-110'
                      : 'border-transparent scale-100 opacity-60'
                  }`}
                >
                  <img
                    src={h.imageUrl || '/robots/placeholder.png'}
                    alt={h.name}
                    draggable={false}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {/* Viewport indicator */}
            <div
              className="absolute top-1 bottom-1 bg-neutral-900/10 rounded-full pointer-events-none transition-all duration-150"
              style={{
                width: `${Math.max(15, viewportRatio * 100)}%`,
                left: `${scrollProgress * (100 - Math.max(15, viewportRatio * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Right: Compare button */}
        <button
          onClick={() => compareMode ? handleExitCompareMode() : setCompareMode(true)}
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
            compareMode
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 shadow-md hover:shadow-lg'
          }`}
        >
          {compareMode ? 'Exit Compare' : 'Compare'}
        </button>
      </div>

      {/* SCROLL AREA (flex-1) - extends beyond inset */}
      <main
        ref={scrollRef}
        className="flex-1 horizontal-scroll overflow-x-auto overflow-y-hidden flex items-center select-none snap-x snap-mandatory"
        style={{ marginLeft: -insetX, marginRight: -insetX, paddingLeft: insetX, paddingRight: insetX }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="flex items-end relative"
          style={{ gap: `${layoutConfig.gap}px` }}
        >
          {/* Floor */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent"
            style={{ marginLeft: -100, marginRight: -100 }}
          />
          {/* Placeholder intro card */}
          <div
            className="flex-shrink-0 gpu-accelerated transition-transform duration-300 flex items-center justify-center snap-center"
            style={{
              width: `${layoutConfig.cardSize}px`,
              height: `${layoutConfig.cardSize * 2.1}px`,
              transitionTimingFunction: 'var(--ease-out-expo)',
            }}
          >
            <img
              src="/robots/placeholder.png"
              alt="Humanoid Index"
              draggable={false}
              className="h-full object-contain"
              style={{
                transform: `scale(${!isInActiveZone ? layoutConfig.activeScale : layoutConfig.inactiveScale})`,
                opacity: !isInActiveZone ? 1 : 0.15,
                transition: 'transform 300ms var(--ease-out-expo), opacity 300ms var(--ease-out-expo)',
              }}
            />
          </div>

          {humanoids.map((humanoid, index) => (
            <div
              key={humanoid.id}
              className="flex-shrink-0 gpu-accelerated transition-transform duration-300 snap-center"
              style={{
                width: `${layoutConfig.cardSize}px`,
                height: `${layoutConfig.cardSize * 2.1}px`,
                transitionTimingFunction: 'var(--ease-out-expo)',
              }}
            >
              <HumanoidCard
                humanoid={humanoid}
                config={config}
                scale={getScale(index)}
                opacity={getOpacity(index)}
                compareMode={compareMode}
                isSelected={selectedIds.includes(humanoid.id)}
                onToggleSelect={handleToggleSelect}
              />
            </div>
          ))}

          {/* Trailing spacer with credit */}
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ width: trailingSpace }}
          >
            <div className="text-neutral-300 text-[13px]">
              created by roy
            </div>
          </div>
        </div>
      </main>

      {/* STATS ZONE - fixed height to prevent layout shift */}
      <div className="h-24 flex-shrink-0 relative z-20 flex items-start pt-2">
        {isInActiveZone && (
          <div key={`stats-${activeHumanoid.id}`} className="flex items-center gap-12 text-neutral-600 animate-blur-fade">
            {activeHumanoid.height && (
              <div>
                <div className="text-[48px] font-light leading-none">{activeHumanoid.height}</div>
                <div className="text-[13px] text-neutral-400 mt-1">cm</div>
              </div>
            )}
            {activeHumanoid.weight && (
              <div>
                <div className="text-[48px] font-light leading-none">{activeHumanoid.weight}</div>
                <div className="text-[13px] text-neutral-400 mt-1">kg</div>
              </div>
            )}
            {activeHumanoid.maxSpeed && (
              <div>
                <div className="text-[48px] font-light leading-none">{activeHumanoid.maxSpeed}</div>
                <div className="text-[13px] text-neutral-400 mt-1">m/s</div>
              </div>
            )}
            {activeHumanoid.dof && (
              <div>
                <div className="text-[48px] font-light leading-none">{activeHumanoid.dof}</div>
                <div className="text-[13px] text-neutral-400 mt-1">DOF</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM BAR - extends beyond inset */}
      <div style={{ marginLeft: -insetX, marginRight: -insetX, marginBottom: -insetY }}>
        <BottomBar
          config={config}
          onConfigChange={setConfig}
          layoutConfig={layoutConfig}
          onLayoutConfigChange={setLayoutConfig}
          compareMode={compareMode}
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onCompare={() => setShowComparePanel(true)}
        />
      </div>

      {/* Compare panel modal (z-50) */}
      {showComparePanel && (
        <ComparePanel
          selectedIds={selectedIds}
          onRemove={(id) => setSelectedIds(prev => prev.filter(i => i !== id))}
          onClear={() => setSelectedIds([])}
          onClose={() => setShowComparePanel(false)}
        />
      )}

      {/* AI Chatbot */}
      <ChatBot />
    </div>
  );
}
