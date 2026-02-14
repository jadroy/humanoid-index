"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ViewConfig, defaultConfig } from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import ViewSwitcher, { ViewMode } from "@/components/ViewSwitcher";
import GridView from "@/components/GridView";
import SmashPicker from "@/components/SmashPicker";
import { humanoids, legends, Humanoid } from "@/data/humanoids";
import { defaultLayoutConfig } from "@/components/BottomBar";

export default function Home() {
  const router = useRouter();
  const [config] = useState<ViewConfig>(defaultConfig);
  const [layoutConfig] = useState(defaultLayoutConfig);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportRatio, setViewportRatio] = useState(0.2);
  const [isInActiveZone, setIsInActiveZone] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('carousel');
  const [hoveredHumanoid, setHoveredHumanoid] = useState<Humanoid | null>(null);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [scrollFraction, setScrollFraction] = useState(0);
  const [enlargedHumanoid, setEnlargedHumanoid] = useState<Humanoid | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const carouselRef = useRef<HTMLDivElement>(null);
  const isDraggingMinimapRef = useRef(false);
  const scrollAnimationRef = useRef<number | null>(null);

  // Dismiss intro on click or keypress
  useEffect(() => {
    if (!showIntro || introExiting) return;
    const dismiss = () => {
      setIntroExiting(true);
      setTimeout(() => {
        setShowIntro(false);
        setIntroExiting(false);
      }, 700);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      dismiss();
    };
    const handleClick = () => dismiss();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('click', handleClick);
    };
  }, [showIntro, introExiting]);

  // Window width tracking
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse parallax — subtle tilt following cursor, applied via CSS vars
  useEffect(() => {
    let raf: number;
    const handleMouseMove = (e: MouseEvent) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    const tick = () => {
      const c = mouseCurrent.current;
      const t = mouseTarget.current;
      c.x += (t.x - c.x) * 0.06;
      c.y += (t.y - c.y) * 0.06;
      const el = carouselRef.current;
      if (el) {
        el.style.setProperty('--mouse-x', `${c.x * 10}px`);
        el.style.setProperty('--mouse-y', `${c.y * 6}px`);
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', handleMouseMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Responsive inset margins
  const insetX = windowWidth < 640 ? 16 : windowWidth < 768 ? 48 : windowWidth < 1024 ? 120 : 252;
  const topBarInset = windowWidth < 640 ? 6 : 10;

  // Track target index for keyboard navigation
  const targetIndexRef = useRef(0);

  // Scroll to specific card — cancellable animation for responsive rapid keypresses
  const scrollToCard = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    // Cancel any in-flight animation immediately
    if (scrollAnimationRef.current !== null) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    // Find the actual card element and center it
    const targetEl = container.querySelector(`[data-card-index="${index}"]`) as HTMLElement;
    if (!targetEl) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = targetEl.getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const targetScroll = container.scrollLeft + (cardCenter - containerCenter);
    const clampedTarget = Math.max(0, Math.min(targetScroll, container.scrollWidth - container.clientWidth));

    const startScroll = container.scrollLeft;
    const distance = clampedTarget - startScroll;
    if (Math.abs(distance) < 1) return;

    const duration = Math.min(300, Math.max(150, Math.abs(distance) * 0.4));
    const startTime = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      container.scrollLeft = startScroll + distance * eased;

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
      } else {
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // Scroll to initial position when carousel appears (after intro dismisses)
  useEffect(() => {
    if (showIntro) return;
    const container = scrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const targetEl = container.querySelector('[data-card-index="0"]') as HTMLElement;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
      }
    });
  }, [showIntro]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = humanoids.length + legends.length;

      switch (e.key) {
        case 'ArrowLeft':
          if (viewMode === 'carousel') {
            e.preventDefault();
            const newIndex = Math.max(0, targetIndexRef.current - 1);
            targetIndexRef.current = newIndex;
            scrollToCard(newIndex);
          }
          break;
        case 'ArrowRight':
          if (viewMode === 'carousel') {
            e.preventDefault();
            const newIndex = Math.min(totalItems - 1, targetIndexRef.current + 1);
            targetIndexRef.current = newIndex;
            scrollToCard(newIndex);
          }
          break;
        case 'Enter':
          {
            const allRobots = [...humanoids, ...legends];
            if (allRobots[currentIndex]) {
              setEnlargedHumanoid(allRobots[currentIndex]);
            }
          }
          break;
        case 'Escape':
          setEnlargedHumanoid(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, scrollToCard, viewMode, router]);

  const allRobotsCount = humanoids.length + legends.length;
  // Shared width for minimap, view switcher, and targeting corners
  const trackWidth = Math.max(140, allRobotsCount * 11);

  // Padding to center first/last card in viewport
  // Gap sized so ~50px of each neighbor peeks into the viewport edges
  const effectiveGap = Math.max(layoutConfig.gap, (windowWidth - layoutConfig.cardSize) / 2 - 50);

  // Padding to allow first/last card to center in viewport
  const innerPad = Math.max(0, windowWidth / 2 - insetX - layoutConfig.cardSize / 2);

  // Horizontal scroll handling — wheel listener on document so overlays don't block it
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const handleWheel = (e: WheelEvent) => {
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
        const cardTotalWidth = layoutConfig.cardSize + effectiveGap;
        const fractionalIndex = scrollLeft / cardTotalWidth;

        const index = Math.round(fractionalIndex);
        scrollPositionRef.current = fractionalIndex;
        setScrollFraction(fractionalIndex);
        const totalRobots = humanoids.length + legends.length;
        setCurrentIndex(Math.max(0, Math.min(index, totalRobots - 1)));

        const inActiveZone = fractionalIndex >= -0.3 && fractionalIndex <= totalRobots - 0.7;
        setIsInActiveZone(inActiveZone);

        const maxScroll = el.scrollWidth - el.clientWidth;
        setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
        setViewportRatio(el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 0.2);
      });
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      document.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [layoutConfig.cardSize, effectiveGap, viewMode, showIntro]);

  // All robots flat list with intro card at index 0
  const introItem: Humanoid = { id: '__intro__', name: 'Humanoid Index', manufacturer: '' };
  const allRobots = [introItem, ...humanoids, ...legends];
  const currentHumanoid = allRobots[currentIndex];
  const isIntro = currentHumanoid?.id === '__intro__';
  const activeHumanoid = viewMode === 'grid' ? hoveredHumanoid : (isIntro ? null : currentHumanoid);
  const showActiveInfo = viewMode === 'grid' ? hoveredHumanoid !== null : (isInActiveZone && !isIntro);

  const currentBg = '#fff';

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
      className={`h-screen transition-colors duration-500 ease-out ${viewMode === 'grid' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
      style={{ backgroundColor: currentBg }}
    >
      {/* INTRO — all humanoids side by side */}
      {showIntro && (
        <section
          className="absolute inset-0 z-50 h-screen flex flex-col items-center justify-center bg-white cursor-pointer select-none overflow-hidden"
        >
          <div className="animate-blur-fade flex flex-col items-center gap-8">
            <div
              className="flex items-end gap-[3px]"
              style={{
                transform: introExiting ? 'scale(5)' : 'scale(1)',
                opacity: introExiting ? 0 : 1,
                transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease-out',
              }}
            >
              {allRobots.map((humanoid, i) => (
                <img
                  key={humanoid.id}
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  draggable="false"
                  className="animate-blur-fade-stagger object-contain"
                  style={{
                    height: '70px',
                    animationDelay: `${100 + i * 40}ms`,
                  }}
                />
              ))}
            </div>
            <div
              className="flex flex-col items-center gap-2"
              style={{
                opacity: introExiting ? 0 : 1,
                transition: 'opacity 200ms ease-out',
              }}
            >
              <div className="font-mono text-[13px] text-[#999] tracking-wider uppercase">
                Humanoid Index
              </div>
              <div className="font-mono text-[11px] text-[#ccc] tracking-wider uppercase animate-blur-fade-delayed">
                Click to enter
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SMASH PICKER — full screen takeover */}
      {viewMode === 'smash' && !showIntro && (
        <section className="h-screen flex flex-col animate-blur-fade">
          <div
            className="flex-shrink-0 relative z-20 flex justify-center"
            style={{ padding: `${topBarInset}px ${insetX}px` }}
          >
            <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} width={trackWidth} />
          </div>
          <div className="flex-1 min-h-0">
            <SmashPicker humanoids={allRobots} />
          </div>
        </section>
      )}

      {/* CAROUSEL SECTION */}
      {viewMode !== 'smash' && !showIntro && (
      <section className={`flex flex-col relative animate-blur-fade ${viewMode === 'grid' ? 'min-h-screen bg-white overflow-y-auto' : 'h-screen overflow-x-hidden'}`}>
        {/* TOP BAR */}
        <div
          className="flex-shrink-0 relative z-20 flex justify-center"
          style={{ padding: `${topBarInset}px ${insetX}px` }}
        >
          <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} width={trackWidth} />
        </div>

        {/* Factory floor grid — low, flat perspective */}
        {viewMode === 'carousel' && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute left-0 right-0 bottom-0" style={{ height: '35%', perspective: '300px', perspectiveOrigin: '50% 0%' }}>
              <div style={{
                width: '100%', height: '100%', transformOrigin: 'top center', transform: 'rotateX(65deg)',
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                maskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 10%, transparent 60%)',
                WebkitMaskImage: 'radial-gradient(ellipse 80% 100% at 50% 0%, black 10%, transparent 60%)',
              }} />
            </div>
          </div>
        )}

        {/* Left/right click zones with carat cursors */}
        {viewMode === 'carousel' && (
          <>
            {currentIndex > 0 && (
              <div
                onClick={() => { targetIndexRef.current = currentIndex - 1; scrollToCard(currentIndex - 1); }}
                className="absolute top-0 left-0 bottom-0 z-10 select-none"
                style={{ width: '45%', cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M15 4l-8 8 8 8' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, pointer` }}
              />
            )}
            {currentIndex < allRobots.length - 1 && (
              <div
                onClick={() => { targetIndexRef.current = currentIndex + 1; scrollToCard(currentIndex + 1); }}
                className="absolute top-0 right-0 bottom-0 z-10 select-none"
                style={{ width: '45%', cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 4l8 8-8 8' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, pointer` }}
              />
            )}
          </>
        )}

        {/* Peek overlays — labels on edges */}
        {viewMode === 'carousel' && !enlargedHumanoid && (
          <>
            {currentIndex > 0 && allRobots[currentIndex - 1].id !== '__intro__' && (
              <div key={`prev-${currentIndex}`} className="absolute left-8 top-1/2 -translate-y-1/2 z-[15] pointer-events-none animate-blur-fade">
                <span className="font-mono text-[11px] text-[#ccc]">{allRobots[currentIndex - 1].name}</span>
              </div>
            )}
            {currentIndex < allRobots.length - 1 && (
              <div key={`next-${currentIndex}`} className="absolute right-8 top-1/2 -translate-y-1/2 z-[15] pointer-events-none animate-blur-fade">
                <span className="font-mono text-[11px] text-[#ccc]">{allRobots[currentIndex + 1].name}</span>
              </div>
            )}
          </>
        )}

        {/* MAIN CONTENT */}
        <div className={`flex-1 flex flex-col justify-center ${viewMode === 'carousel' ? 'overflow-x-hidden' : 'overflow-visible'}`} style={viewMode === 'carousel' ? { padding: `0 ${insetX}px`, paddingBottom: '4vh' } : undefined}>
          {viewMode === 'carousel' ? (
            <main
              ref={scrollRef}
              className="flex-1 horizontal-scroll overflow-x-auto overflow-y-hidden flex items-center select-none"
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
                ref={carouselRef}
                className="flex items-end relative"
                style={{
                  gap: `${effectiveGap}px`,
                  paddingLeft: `${innerPad}px`,
                  paddingRight: `${innerPad}px`,
                }}
              >
                {/* All robots — flat, targeting corners on center */}
                {allRobots.map((humanoid, index) => {
                  const distance = Math.abs(index - scrollFraction);
                  const isCenter = distance < 0.5;
                  const isEnlarged = enlargedHumanoid?.id === humanoid.id;
                  // Center card: full opacity fading slightly with distance
                  // Neighbors: subtle peek opacity, fading out further away
                  const cardOpacity = enlargedHumanoid
                    ? (isEnlarged ? 1 : 0)
                    : distance < 0.5
                      ? 1 - distance * 0.6
                      : Math.max(0, 0.25 - (distance - 0.5) * 0.2);
                  return (
                    <div
                      key={humanoid.id}
                      data-card-index={index}
                      className="flex-shrink-0 gpu-accelerated relative group z-20 animate-float"
                      style={{
                        width: `${layoutConfig.cardSize}px`,
                        height: `${layoutConfig.cardSize * 2.1}px`,
                        opacity: cardOpacity,
                        transform: `scale(${isEnlarged ? 1.15 : Math.max(0.88, 1.03 - distance * 0.08)}) translateY(${Math.min(distance * 20, 25)}px)${isCenter && !isEnlarged ? ' translate(var(--mouse-x, 0px), var(--mouse-y, 0px))' : ''}`,
                        transition: 'opacity 0.15s ease-out, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {/* Intro card — special content */}
                      {humanoid.id === '__intro__' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="font-mono text-center flex flex-col gap-3">
                            <div className="text-[20px] text-[#333] tracking-wider uppercase">Humanoid Index</div>
                            <div className="text-[11px] text-[#aaa] leading-relaxed">
                              {humanoids.length} robots<br />
                              Scroll to explore
                            </div>
                          </div>
                        </div>
                      ) : (
                      <>
                      {/* Targeting corners — hidden until hover, then hones in */}
                      {isCenter && !isEnlarged && (
                        <div
                          className="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out pointer-events-none"
                          style={{
                            top: '10px',
                            bottom: '10px',
                            left: '-40px',
                            right: '-40px',
                          }}
                        >
                          <div className="absolute inset-[20px] group-hover:inset-[10px] transition-all duration-150 ease-out pointer-events-none">
                            <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-neutral-300" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-neutral-300" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-neutral-300" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-neutral-300" />
                          </div>
                        </div>
                      )}
                      {isCenter && !isEnlarged && (
                        <div
                          className="absolute bottom-[5%] left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
                          style={{
                            width: '50%',
                            height: '10px',
                            background: 'radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%)',
                          }}
                        />
                      )}
                      <HumanoidCard
                        humanoid={humanoid}
                        config={config}
                        effectClass="distortion-wave"
                        onClick={() => isCenter && setEnlargedHumanoid(isEnlarged ? null : humanoid)}
                      />
                      {/* Floating counter — left side, mirroring stats */}
                      {isCenter && !isEnlarged && (
                        <div
                          className="absolute font-mono text-right pointer-events-none animate-stat-cascade"
                          style={{
                            right: `${layoutConfig.cardSize + 80}px`,
                            top: '10px',
                            width: '140px',
                            transform: 'perspective(400px) rotateY(-8deg)',
                            transformOrigin: 'right center',
                          }}
                        >
                          <div className="text-[28px] leading-none tracking-tight" style={{ color: 'rgba(0,0,0,0.15)' }}>
                            {String(index).padStart(2, '0')}
                          </div>
                          <div className="text-[11px] mt-1" style={{ color: 'rgba(0,0,0,0.1)' }}>
                            / {String(allRobots.length - 1).padStart(2, '0')}
                          </div>
                        </div>
                      )}
                      {/* Floating stats — right side, hidden when enlarged */}
                      {isCenter && !isEnlarged && (() => {
                        const stats = [
                          humanoid.year && { label: 'year', value: humanoid.year },
                          humanoid.status && { label: 'status', value: humanoid.status },
                          humanoid.height && { label: 'height', value: `${humanoid.height}cm` },
                          humanoid.weight && { label: 'weight', value: `${humanoid.weight}kg` },
                          humanoid.dof && { label: 'dof', value: humanoid.dof },
                          humanoid.maxSpeed && { label: 'speed', value: `${humanoid.maxSpeed}m/s` },
                          humanoid.cost && humanoid.cost !== "N/A" && { label: 'cost', value: humanoid.cost },
                        ].filter(Boolean) as { label: string; value: string | number }[];
                        return (
                          <div
                            className="absolute font-mono text-[11px] text-left flex flex-col justify-between"
                            style={{ left: `${layoutConfig.cardSize + 80}px`, top: '10px', bottom: '10px', width: '200px', textTransform: 'none', transform: 'perspective(400px) rotateY(8deg)', transformOrigin: 'left center' }}
                          >
                            <div className="flex flex-col gap-0 pointer-events-none">
                              {stats.map((stat, i) => (
                                <div
                                  key={stat.label}
                                  className="animate-stat-cascade leading-none"
                                  style={{ animationDelay: `${80 + i * 60}ms` }}
                                >
                                  <span className="text-[#888]">{stat.label}</span> <span className="text-[#555]">{stat.value}</span>
                                </div>
                              ))}
                            </div>
                            {humanoid.purchaseUrl && (() => {
                              const isNeo = humanoid.id === '4';
                              return (
                                <a
                                  href={humanoid.purchaseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`animate-blur-fade-stagger font-mono text-[12px] font-medium px-4 py-1 rounded-sm transition-colors duration-150 uppercase tracking-wider text-center self-start ${
                                    isNeo
                                      ? 'bg-[#d4c5a0]/20 hover:bg-[#d4c5a0]/30 text-[#8a7a55] border border-[#d4c5a0]/40'
                                      : 'bg-black/5 hover:bg-black/10 text-black border border-black/15'
                                  }`}
                                  style={{ animationDelay: `190ms` }}
                                >
                                  Buy
                                </a>
                              );
                            })()}
                          </div>
                        );
                      })()}
                      </>
                      )}
                    </div>
                  );
                })}
              </div>
            </main>
          ) : (
            <main className="flex-1">
              <GridView
                humanoids={humanoids}
                layoutConfig={layoutConfig}
                compareMode={false}
                selectedIds={[]}
                onToggleSelect={() => {}}
                onHoverChange={setHoveredHumanoid}
              />
            </main>
          )}

          {/* MINIMAP — dashes */}
          {viewMode === 'carousel' && (
            <div className="flex-shrink-0 relative z-20 flex justify-center pt-2 pb-3 transition-opacity duration-300" style={{ opacity: enlargedHumanoid ? 0 : 1 }}>
              <div
                ref={minimapRef}
                className="relative cursor-pointer select-none flex items-center justify-center gap-[3px]"
                style={{
                  width: `${trackWidth}px`,
                  height: '20px',
                }}
                onMouseDown={handleMinimapMouseDown}
                onTouchStart={handleMinimapTouchStart}
                onDragStart={(e) => e.preventDefault()}
              >
                {allRobots.map((_, i) => {
                  const isActive = i === currentIndex && isInActiveZone;
                  return (
                    <div
                      key={i}
                      className="transition-all duration-200"
                      style={{
                        width: isActive ? '13px' : '8px',
                        height: '1px',
                        backgroundColor: isActive ? '#000' : '#ccc',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* LABEL + BUY + INFO — fixed height so layout never shifts, hidden when enlarged */}
          <div
            className="flex-shrink-0 relative z-20 flex flex-col items-center justify-center py-2 transition-opacity duration-300"
            style={{ height: '120px', opacity: enlargedHumanoid ? 0 : 1 }}
          >
            {showActiveInfo && activeHumanoid ? (
              <>
                <div key={`humanoid-${activeHumanoid.id}`} className="animate-blur-fade text-center font-mono">
                  <div className="text-[13px] text-[#999] tracking-normal">{activeHumanoid.manufacturer}</div>
                  <div className="text-[13px] text-black tracking-normal">{activeHumanoid.name}</div>
                </div>
              </>
            ) : (
              <div />
            )}
          </div>

        </div>
      </section>
      )}

    </div>
  );
}
