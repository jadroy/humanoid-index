"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ViewConfig, defaultConfig } from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import ComparePanel from "@/components/ComparePanel";
import BottomBar, { LayoutConfig, defaultLayoutConfig } from "@/components/BottomBar";
import ChatBot from "@/components/ChatBot";
import ViewSwitcher, { ViewMode } from "@/components/ViewSwitcher";
import GridView from "@/components/GridView";
import HumanoidDetailSection from "@/components/HumanoidDetailSection";
import { humanoids, legends, Humanoid } from "@/data/humanoids";

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
  const [viewMode, setViewMode] = useState<ViewMode>('carousel');
  const [hoveredHumanoid, setHoveredHumanoid] = useState<Humanoid | null>(null);
  const [isInDetailView, setIsInDetailView] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [minimapStyle, setMinimapStyle] = useState<'thumbnails' | 'dots'>('thumbnails');
  const [windowWidth, setWindowWidth] = useState(1200);

  const pageScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const isDraggingMinimapRef = useRef(false);

  // Window width tracking
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive inset margins
  const insetX = windowWidth < 640 ? 16 : windowWidth < 768 ? 48 : windowWidth < 1024 ? 120 : 252;
  const insetY = windowWidth < 640 ? 60 : windowWidth < 768 ? 80 : 120;
  const topBarInset = windowWidth < 640 ? 12 : 24;

  // Scale - smooth interpolation, center is larger
  const getScale = useCallback((index: number) => {
    const distance = Math.abs(index - scrollPositionRef.current);
    const t = Math.min(1, distance);
    return layoutConfig.activeScale - t * (layoutConfig.activeScale - layoutConfig.inactiveScale);
  }, [layoutConfig.activeScale, layoutConfig.inactiveScale]);

  // Overlay: 0 = no overlay (current), higher = more white overlay
  const getOverlay = useCallback((index: number) => {
    const distance = Math.abs(index - scrollPositionRef.current);
    if (distance <= 0.3) return 0; // center card - no overlay
    if (distance <= 1.2) return 0.35; // immediate neighbors - subtle overlay
    if (distance <= 2.2) return 0.5; // 2 away - moderate overlay
    // 3+ away - noticeable overlay
    return 0.6;
  }, []);

  // Vertical offset: curved arc like an orbit (flattened semi-circle)
  const getVerticalOffset = useCallback((index: number) => {
    const distance = index - scrollPositionRef.current;
    // Use a parabolic curve for the orbital effect
    // Cards at center are at the "front" (bottom), sides curve up and back
    const curveIntensity = layoutConfig.orbitCurve / 100; // 0-0.2
    return distance * distance * curveIntensity * layoutConfig.orbitMaxOffset;
  }, [layoutConfig.orbitCurve, layoutConfig.orbitMaxOffset]);

  // Horizontal depth offset: subtle push toward center for orbital feel
  const getHorizontalOffset = useCallback((index: number) => {
    const distance = index - scrollPositionRef.current;
    // Positive values push right, negative push left (toward center)
    const depthFactor = layoutConfig.orbitDepth / 100; // 0-0.5
    return -distance * Math.abs(distance) * depthFactor * 10;
  }, [layoutConfig.orbitDepth]);

  // Track target index for keyboard navigation
  const targetIndexRef = useRef(0);

  // Scroll to specific card
  const scrollToCard = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const targetEl = container.querySelector(`[data-card-index="${index}"]`) as HTMLElement;
    if (!targetEl) return;

    targetEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  // Scroll to detail view
  const scrollToDetail = useCallback(() => {
    const el = pageScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  }, []);

  // Scroll back to carousel
  const scrollToCarousel = useCallback(() => {
    const el = pageScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync target index with current index
  useEffect(() => {
    targetIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComparePanel) return;

      const totalItems = humanoids.length + legends.length;

      switch (e.key) {
        case 'ArrowLeft':
          if (!isInDetailView && viewMode === 'carousel') {
            e.preventDefault();
            // Use targetIndexRef for held keys to queue up destinations
            const newIndex = Math.max(0, targetIndexRef.current - 1);
            targetIndexRef.current = newIndex;
            scrollToCard(newIndex);
          }
          break;
        case 'ArrowRight':
          if (!isInDetailView && viewMode === 'carousel') {
            e.preventDefault();
            const newIndex = Math.min(totalItems - 1, targetIndexRef.current + 1);
            targetIndexRef.current = newIndex;
            scrollToCard(newIndex);
          }
          break;
        case 'ArrowDown':
          if (!isInDetailView && isInActiveZone && viewMode === 'carousel') {
            e.preventDefault();
            scrollToDetail();
          }
          break;
        case 'ArrowUp':
          if (isInDetailView) {
            e.preventDefault();
            scrollToCarousel();
          }
          break;
        case 'Escape':
          if (isInDetailView) {
            e.preventDefault();
            scrollToCarousel();
          }
          break;
        case 'Enter':
          if (!compareMode && !isInDetailView) {
            router.push(`/robot/${humanoids[currentIndex].id}`);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, compareMode, showComparePanel, scrollToCard, scrollToDetail, scrollToCarousel, isInDetailView, isInActiveZone, viewMode, router]);

  // Content area width
  const contentWidth = windowWidth - 2 * insetX;
  const leadingSpace = Math.max(0, (contentWidth - layoutConfig.cardSize) / 2 - layoutConfig.gap);
  const trailingSpace = Math.max(0, (contentWidth - layoutConfig.cardSize) / 2 - layoutConfig.gap);

  // Page vertical scroll tracking
  useEffect(() => {
    const el = pageScrollRef.current;
    if (!el) return;

    const handlePageScroll = () => {
      const scrollTop = el.scrollTop;
      const viewportHeight = window.innerHeight;
      setIsInDetailView(scrollTop > viewportHeight * 0.5);
    };

    el.addEventListener('scroll', handlePageScroll, { passive: true });
    return () => el.removeEventListener('scroll', handlePageScroll);
  }, []);

  // Horizontal scroll handling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const handleWheel = (e: WheelEvent) => {
      if (isInDetailView) return;

      // Scroll down to detail view
      if (e.deltaY > 30 && isInActiveZone && viewMode === 'carousel') {
        e.preventDefault();
        scrollToDetail();
        return;
      }

      if (e.deltaX !== 0) return;

      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollLeft = el.scrollLeft;
        const cardTotalWidth = layoutConfig.cardSize + layoutConfig.gap;
        let fractionalIndex = scrollLeft / cardTotalWidth - 1;

        const separatorWidth = (layoutConfig.cardSize * 0.6 + layoutConfig.gap) / cardTotalWidth;
        if (fractionalIndex > humanoids.length + separatorWidth * 0.5) {
          fractionalIndex -= separatorWidth;
        }

        const index = Math.round(fractionalIndex);
        scrollPositionRef.current = fractionalIndex;
        const totalRobots = humanoids.length + legends.length;
        setCurrentIndex(Math.max(0, Math.min(index, totalRobots - 1)));

        const rawFractionalIndex = scrollLeft / cardTotalWidth - 1;
        const inActiveZone = rawFractionalIndex >= -0.3 && rawFractionalIndex <= totalRobots + separatorWidth - 0.7;
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
  }, [layoutConfig.cardSize, layoutConfig.gap, isInDetailView, isInActiveZone, viewMode, scrollToDetail]);

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

  // Combined list
  const allRobots = [...humanoids, ...legends];
  const currentHumanoid = allRobots[currentIndex];
  const activeHumanoid = viewMode === 'grid' ? hoveredHumanoid : currentHumanoid;
  const showActiveInfo = viewMode === 'grid' ? hoveredHumanoid !== null : isInActiveZone;
  const isInLegendZone = currentIndex >= humanoids.length;

  // Background colors - only legends get colored backgrounds
  const legendBackgroundColors: Record<string, string> = {
    "legend-1": "#faf8f5",
    "legend-2": "#f9f8fa",
  };
  const bgColor = viewMode === 'grid'
    ? '#ffffff'
    : isInActiveZone && activeHumanoid && activeHumanoid.id.startsWith('legend-')
      ? legendBackgroundColors[activeHumanoid.id] || '#fafafa'
      : '#ffffff';

  const handleMinimapMouseMove = useCallback((clientX: number) => {
    const minimap = minimapRef.current;
    const scrollEl = scrollRef.current;
    if (!minimap || !scrollEl) return;

    const rect = minimap.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, relativeX / rect.width));
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    scrollEl.scrollLeft = progress * maxScroll;
  }, []);

  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingMinimapRef.current = true;
    handleMinimapMouseMove(e.clientX);
  };

  // Touch handlers for minimap
  const handleMinimapTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingMinimapRef.current = true;
    handleMinimapMouseMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingMinimapRef.current) return;
      handleMinimapMouseMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      isDraggingMinimapRef.current = false;
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingMinimapRef.current) return;
      handleMinimapMouseMove(e.touches[0].clientX);
    };

    const handleGlobalTouchEnd = () => {
      isDraggingMinimapRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleMinimapMouseMove]);

  return (
    <div
      ref={pageScrollRef}
      className="h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory scrollbar-hide transition-colors duration-700 ease-out"
      style={{ backgroundColor: bgColor }}
    >
      {/* CAROUSEL SECTION */}
      <section className={`flex-shrink-0 snap-start flex flex-col relative ${viewMode === 'grid' ? 'min-h-screen bg-white' : 'h-screen overflow-hidden'}`}>
        {/* TOP BAR - View Switcher Only */}
        <div
          className="flex-shrink-0 relative z-20 flex justify-center"
          style={{ padding: `${topBarInset}px ${insetX}px` }}
        >
          <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* MAIN CONTENT WRAPPER */}
        <div className={`flex-1 flex flex-col ${viewMode === 'carousel' ? 'overflow-hidden' : 'overflow-visible'}`} style={viewMode === 'carousel' ? { padding: `0 ${insetX}px`, paddingBottom: '8vh' } : undefined}>
          {viewMode === 'carousel' ? (
            <main
              ref={scrollRef}
              className="flex-1 horizontal-scroll overflow-x-auto overflow-y-hidden flex items-center select-none snap-x snap-mandatory"
              style={{
                marginLeft: -insetX,
                marginRight: -insetX,
                paddingLeft: insetX,
                paddingRight: insetX,
                scrollPaddingInline: insetX,
              }}
              onDragStart={(e) => e.preventDefault()}
            >
              <div
                className="flex items-end relative"
                style={{ gap: `${layoutConfig.gap}px` }}
              >
                {leadingSpace > 0 && <div className="flex-shrink-0" style={{ width: leadingSpace }} />}

                {/* Placeholder */}
                <div
                  data-card-index={-1}
                  className="flex-shrink-0 gpu-accelerated flex items-center justify-center snap-center relative"
                  style={{
                    width: `${layoutConfig.cardSize}px`,
                    height: `${layoutConfig.cardSize * 2.1}px`,
                    transform: `translateX(${getHorizontalOffset(-1)}px) translateY(${getVerticalOffset(-1)}px)`,
                    transition: 'transform 150ms linear',
                  }}
                >
                  <img
                    src="/robots/placeholder.png"
                    alt="Humanoid Index"
                    draggable={false}
                    className="h-full object-contain"
                    style={{
                      transform: `scale(${getScale(-1)})`,
                      transition: 'transform 150ms linear',
                    }}
                  />
                  {getOverlay(-1) > 0 && (
                    <div
                      className="absolute inset-0 bg-white pointer-events-none"
                      style={{
                        opacity: getOverlay(-1),
                        transition: 'opacity 150ms linear',
                      }}
                    />
                  )}
                </div>

                {humanoids.map((humanoid, index) => (
                  <div
                    key={humanoid.id}
                    data-card-index={index}
                    className="flex-shrink-0 gpu-accelerated snap-center"
                    style={{
                      width: `${layoutConfig.cardSize}px`,
                      height: `${layoutConfig.cardSize * 2.1}px`,
                      transform: `translateX(${getHorizontalOffset(index)}px) translateY(${getVerticalOffset(index)}px)`,
                      transition: 'transform 150ms linear',
                    }}
                  >
                    <HumanoidCard
                      humanoid={humanoid}
                      config={config}
                      scale={getScale(index)}
                      overlay={getOverlay(index)}
                      compareMode={compareMode}
                      isSelected={selectedIds.includes(humanoid.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  </div>
                ))}

                {/* Hall of Fame Separator */}
                <div
                  className="flex-shrink-0 flex items-center justify-center snap-center"
                  style={{
                    width: `${layoutConfig.cardSize * 0.6}px`,
                    height: `${layoutConfig.cardSize * 2.1}px`,
                  }}
                >
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-widest text-neutral-400 mb-1">Hall of</div>
                    <div className="text-[15px] font-medium text-neutral-600">Fame</div>
                  </div>
                </div>

                {/* Legends */}
                {legends.map((legend, index) => (
                  <div
                    key={legend.id}
                    data-card-index={humanoids.length + index}
                    className="flex-shrink-0 gpu-accelerated snap-center"
                    style={{
                      width: `${layoutConfig.cardSize}px`,
                      height: `${layoutConfig.cardSize * 2.1}px`,
                      transform: `translateX(${getHorizontalOffset(humanoids.length + index)}px) translateY(${getVerticalOffset(humanoids.length + index)}px)`,
                      transition: 'transform 150ms linear',
                    }}
                  >
                    <HumanoidCard
                      humanoid={legend}
                      config={config}
                      scale={getScale(humanoids.length + index)}
                      overlay={getOverlay(humanoids.length + index)}
                      compareMode={compareMode}
                      isSelected={selectedIds.includes(legend.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  </div>
                ))}

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
          ) : (
            <main className="flex-1 bg-white">
              <GridView
                humanoids={humanoids}
                layoutConfig={layoutConfig}
                compareMode={compareMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onHoverChange={setHoveredHumanoid}
              />
            </main>
          )}


          {/* BUY BUTTON */}
          {viewMode === 'carousel' && (
            <div className="flex-shrink-0 relative z-20 flex justify-center h-8">
              {activeHumanoid?.purchaseUrl && showActiveInfo && (
                <a
                  key={`buy-${activeHumanoid.id}`}
                  href={activeHumanoid.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="animate-blur-fade buy-button-glass"
                >
                  Buy
                </a>
              )}
            </div>
          )}

          {/* LABEL */}
          <div className="flex-shrink-0 relative z-20 flex items-center justify-center py-4">
            {!showActiveInfo || !activeHumanoid ? (
              <div key="index-label" className="animate-blur-fade text-center">
                <div className="text-[13px] text-neutral-400 tracking-tight">Index</div>
                <div className="text-[16px] font-medium text-neutral-800 tracking-tight">Humanoid</div>
              </div>
            ) : (
              <div key={`humanoid-${activeHumanoid.id}`} className="animate-blur-fade text-center">
                <div className="text-[13px] text-neutral-400 tracking-tight">{activeHumanoid.manufacturer}</div>
                <div className="text-[16px] font-medium text-neutral-800 tracking-tight">{activeHumanoid.name}</div>
              </div>
            )}
          </div>

          {/* MINIMAP */}
          {viewMode === 'carousel' && (
            <div className="flex-shrink-0 relative z-20 flex justify-center items-center gap-3 pb-4">
              <div
                ref={minimapRef}
                className="relative cursor-pointer select-none transition-all duration-300"
                style={{
                  width: windowWidth < 640
                    ? `${Math.max(140, (humanoids.length + legends.length) * 14 + 40)}px`
                    : minimapStyle === 'thumbnails'
                      ? `${Math.max(220, (humanoids.length + legends.length) * 26 + 56)}px`
                      : `${Math.max(140, (humanoids.length + legends.length) * 14 + 40)}px`,
                  height: windowWidth < 640 ? '40px' : minimapStyle === 'thumbnails' ? '48px' : '36px'
                }}
                onMouseDown={handleMinimapMouseDown}
                onTouchStart={handleMinimapTouchStart}
                onDragStart={(e) => e.preventDefault()}
              >
                {(windowWidth < 640 || minimapStyle === 'dots') ? (
                  /* Dots style - orbital arc arrangement */
                  <div className="absolute inset-0 pointer-events-none">
                    {(() => {
                      const totalItems = 1 + humanoids.length + legends.length; // +1 for placeholder
                      const arcHeight = windowWidth < 640 ? 8 : 6; // vertical arc amplitude
                      return (
                        <>
                          {/* Placeholder dot */}
                          {(() => {
                            const normalizedPos = 0 / (totalItems - 1); // 0 to 1
                            const arcY = Math.sin(normalizedPos * Math.PI) * arcHeight;
                            return (
                              <div
                                key="placeholder"
                                className={`absolute w-3 h-3 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                                  !isInActiveZone
                                    ? 'bg-neutral-800 scale-125'
                                    : 'bg-neutral-300 scale-100'
                                }`}
                                style={{
                                  left: `${8 + normalizedPos * 84}%`,
                                  top: `50%`,
                                  transform: `translate(-50%, -50%) translateY(${-arcY}px)`,
                                }}
                              />
                            );
                          })()}
                          {/* Humanoid dots */}
                          {humanoids.map((_, i) => {
                            const itemIndex = i + 1; // +1 for placeholder
                            const normalizedPos = itemIndex / (totalItems - 1);
                            const arcY = Math.sin(normalizedPos * Math.PI) * arcHeight;
                            return (
                              <div
                                key={i}
                                className={`absolute w-3 h-3 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                                  i === currentIndex && isInActiveZone
                                    ? 'bg-neutral-800 scale-125'
                                    : 'bg-neutral-300 scale-100'
                                }`}
                                style={{
                                  left: `${8 + normalizedPos * 84}%`,
                                  top: `50%`,
                                  transform: `translate(-50%, -50%) translateY(${-arcY}px)`,
                                }}
                              />
                            );
                          })}
                          {/* Legend dots */}
                          {legends.map((_, i) => {
                            const itemIndex = humanoids.length + 1 + i; // +1 for placeholder
                            const normalizedPos = itemIndex / (totalItems - 1);
                            const arcY = Math.sin(normalizedPos * Math.PI) * arcHeight;
                            return (
                              <div
                                key={`legend-${i}`}
                                className={`absolute w-3 h-3 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                                  humanoids.length + i === currentIndex && isInActiveZone
                                    ? 'bg-amber-500 scale-125'
                                    : 'bg-amber-200 scale-100'
                                }`}
                                style={{
                                  left: `${8 + normalizedPos * 84}%`,
                                  top: `50%`,
                                  transform: `translate(-50%, -50%) translateY(${-arcY}px)`,
                                }}
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* Thumbnail style (desktop only) - orbital arc arrangement */
                  <div className="absolute inset-0 pointer-events-none">
                    {(() => {
                      const totalItems = 1 + humanoids.length + legends.length;
                      const arcHeight = 8; // vertical arc amplitude
                      return (
                        <>
                          {/* Placeholder thumbnail */}
                          {(() => {
                            const normalizedPos = 0 / (totalItems - 1);
                            const arcY = Math.sin(normalizedPos * Math.PI) * arcHeight;
                            return (
                              <div
                                key="placeholder"
                                className={`absolute w-5 h-5 rounded-full transition-all duration-200 overflow-hidden border-2 ${
                                  !isInActiveZone ? 'border-neutral-400 scale-110' : 'border-transparent scale-100 opacity-50'
                                }`}
                                style={{
                                  left: `${6 + normalizedPos * 88}%`,
                                  top: `50%`,
                                  transform: `translate(-50%, -50%) translateY(${-arcY}px)`,
                                }}
                              >
                                <img
                                  src="/robots/placeholder.png"
                                  alt="Index"
                                  draggable={false}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            );
                          })()}
                          {/* Humanoid thumbnails */}
                          {humanoids.map((h, i) => {
                            const itemIndex = i + 1;
                            const normalizedPos = itemIndex / (totalItems - 1);
                            const arcY = Math.sin(normalizedPos * Math.PI) * arcHeight;
                            return (
                              <div
                                key={h.id}
                                className={`absolute w-5 h-5 rounded-full transition-all duration-200 overflow-hidden border-2 ${
                                  i === currentIndex && isInActiveZone
                                    ? 'border-neutral-400 scale-110'
                                    : 'border-transparent scale-100 opacity-60'
                                }`}
                                style={{
                                  left: `${6 + normalizedPos * 88}%`,
                                  top: `50%`,
                                  transform: `translate(-50%, -50%) translateY(${-arcY}px)`,
                                }}
                              >
                                <img
                                  src={h.imageUrl || '/robots/placeholder.png'}
                                  alt={h.name}
                                  draggable={false}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            );
                          })}
                          {/* Legend thumbnails */}
                          {legends.map((h, i) => {
                            const itemIndex = humanoids.length + 1 + i;
                            const normalizedPos = itemIndex / (totalItems - 1);
                            const arcY = Math.sin(normalizedPos * Math.PI) * arcHeight;
                            return (
                              <div
                                key={h.id}
                                className={`absolute w-5 h-5 rounded-full transition-all duration-200 overflow-hidden border-2 ${
                                  humanoids.length + i === currentIndex && isInActiveZone
                                    ? 'border-amber-400 scale-110'
                                    : 'border-transparent scale-100 opacity-60'
                                }`}
                                style={{
                                  left: `${6 + normalizedPos * 88}%`,
                                  top: `50%`,
                                  transform: `translate(-50%, -50%) translateY(${-arcY}px)`,
                                }}
                              >
                                <img
                                  src={h.imageUrl || '/robots/placeholder.png'}
                                  alt={h.name}
                                  draggable={false}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Minimap style toggle - hidden on mobile */}
              <button
                onClick={() => setMinimapStyle(minimapStyle === 'thumbnails' ? 'dots' : 'thumbnails')}
                className="hidden sm:block p-1.5 rounded-full hover:bg-neutral-200 transition-colors"
                title={minimapStyle === 'thumbnails' ? 'Switch to dots' : 'Switch to thumbnails'}
              >
                {minimapStyle === 'thumbnails' ? (
                  <svg className="w-3.5 h-3.5 text-neutral-500" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="6" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="18" cy="12" r="2" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Scroll down indicator - positioned at bottom */}
        {viewMode === 'carousel' && (
          <div
            className="absolute bottom-4 left-0 right-0 flex justify-center transition-all duration-300 ease-out pointer-events-none"
            style={{
              opacity: isInActiveZone && !isInDetailView ? 1 : 0,
            }}
          >
            <button
              onClick={scrollToDetail}
              className="flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-600 transition-colors animate-pulse pointer-events-auto"
            >
              <span className="text-[11px] uppercase tracking-wider">More details</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
          </div>
        )}

      </section>

      {/* DETAIL SECTION */}
      {viewMode === 'carousel' && (
        <section className="min-h-screen flex-shrink-0 snap-start bg-white">
          {activeHumanoid && (
            <HumanoidDetailSection
              humanoid={activeHumanoid}
              isActive={true}
              onScrollUp={scrollToCarousel}
            />
          )}
        </section>
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

      {/* AI Chatbot */}
      <ChatBot />


      {/* Bottom Left Buttons */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 flex items-center gap-2">
        <button
          onClick={() => setShowControls(!showControls)}
          className={`p-2.5 rounded-full text-[13px] font-medium transition-all ${
            showControls
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 shadow-md hover:shadow-lg'
          }`}
          title="Toggle controls"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          onClick={() => compareMode ? handleExitCompareMode() : setCompareMode(true)}
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
            compareMode
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 shadow-md hover:shadow-lg'
          }`}
        >
          {compareMode ? 'Exit Compare' : 'Compare'}
        </button>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <div className="fixed bottom-20 left-4 sm:left-6 z-30">
          <BottomBar
            config={config}
            onConfigChange={setConfig}
            layoutConfig={layoutConfig}
            onLayoutConfigChange={setLayoutConfig}
            viewMode={viewMode}
            compareMode={compareMode}
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            onCompare={() => setShowComparePanel(true)}
          />
        </div>
      )}
    </div>
  );
}
