"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ViewConfig, defaultConfig } from "@/components/Sidebar";
import HumanoidCard from "@/components/HumanoidCard";
import ViewSwitcher, { ViewMode } from "@/components/ViewSwitcher";
import GridView from "@/components/GridView";
import SmashPicker from "@/components/SmashPicker";
import CharacterSelect from "@/components/CharacterSelect";
import CatalogIndex from "@/components/CatalogIndex";
import { humanoids, legends, Humanoid } from "@/data/humanoids";
import { defaultLayoutConfig } from "@/components/BottomBar";

// ═══ 3D Carousel Constants ═══
const DEFAULT_RX = 600;
const DEFAULT_RY = 250;
const DEFAULT_OFFSET_Y = 120;
const WHEEL_SENSITIVITY = 0.15;
const FRICTION = 0.92;
const SNAP_THRESHOLD = 0.08;
const SNAP_STRENGTH = 0.08;

const introItem: Humanoid = { id: '__intro__', name: 'Humanoid Index', manufacturer: '' };
const allRobots = [introItem, ...humanoids, ...legends];
const N_CARDS = allRobots.length;
const ANGLE_PER_CARD = 360 / N_CARDS;

function normalizeIndex(rotation: number): number {
  const raw = rotation / ANGLE_PER_CARD;
  return ((Math.round(raw) % N_CARDS) + N_CARDS) % N_CARDS;
}

export default function Home() {
  const [config] = useState<ViewConfig>(defaultConfig);
  const [layoutConfig] = useState(defaultLayoutConfig);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('carousel');
  const [hoveredHumanoid, setHoveredHumanoid] = useState<Humanoid | null>(null);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [enlargedHumanoid, setEnlargedHumanoid] = useState<Humanoid | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [, forceControls] = useState(0);
  const [scrollModal, setScrollModal] = useState<string | null>(null);
  const [easterShake, setEasterShake] = useState(false);
  const ellipseRef = useRef({ rx: DEFAULT_RX, ry: DEFAULT_RY, offsetY: DEFAULT_OFFSET_Y, flipY: -1 });
  const scrollAccumRef = useRef(0);
  const scrollResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollModalShownRef = useRef(false);

  // 3D carousel refs
  const currentRotationRef = useRef(0);
  const velocityRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const enlargedRef = useRef<Humanoid | null>(null);
  const currentIndexRef = useRef(0);
  const touchStartRef = useRef<{ x: number; rotation: number } | null>(null);
  const transitionUntilRef = useRef(0);
  const enterAnimRef = useRef<{ start: number; startRot: number; targetRx: number; targetRy: number } | null>(null);

  const minimapRef = useRef<HTMLDivElement>(null);
  const isDraggingMinimapRef = useRef(false);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });

  // Keep enlargedRef in sync + set transition deadline on exit
  useEffect(() => {
    if (enlargedHumanoid === null && enlargedRef.current !== null) {
      transitionUntilRef.current = performance.now() + 700;
    }
    enlargedRef.current = enlargedHumanoid;
  }, [enlargedHumanoid]);

  // Auto-dismiss intro
  useEffect(() => {
    if (!showIntro || introExiting) return;
    const timer = setTimeout(() => {
      setIntroExiting(true);
      setTimeout(() => { setShowIntro(false); setIntroExiting(false); }, 400);
    }, 1000);
    return () => clearTimeout(timer);
  }, [showIntro, introExiting]);

  // Window width tracking
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse parallax — smooth cursor tracking for center card
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
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', handleMouseMove);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(raf); };
  }, []);

  // Layout
  const insetX = windowWidth < 640 ? 16 : windowWidth < 768 ? 48 : windowWidth < 1024 ? 120 : 252;
  const topBarInset = windowWidth < 640 ? 6 : 10;
  const allRobotsCount = humanoids.length + legends.length;
  const trackWidth = Math.max(140, allRobotsCount * 11);

  // Animate to specific card index (shortest angular path)
  const animateToIndex = useCallback((targetIdx: number) => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    velocityRef.current = 0;
    const startRotation = currentRotationRef.current;
    let diff = targetIdx * ANGLE_PER_CARD - startRotation;
    diff = ((diff % 360) + 540) % 360 - 180;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / 400);
      currentRotationRef.current = startRotation + diff * easeOutCubic(progress);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // ═══ Main rAF render loop — positions all cards via transforms ═══
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }
    const loop = () => {
      const isEnlargedMode = !!enlargedRef.current;
      const now = performance.now();

      if (!isEnlargedMode && animationRef.current === null) {
        currentRotationRef.current += velocityRef.current;
        velocityRef.current *= FRICTION;
        if (Math.abs(velocityRef.current) < SNAP_THRESHOLD) {
          velocityRef.current = 0;
          const nearest = Math.round(currentRotationRef.current / ANGLE_PER_CARD) * ANGLE_PER_CARD;
          const snapDelta = nearest - currentRotationRef.current;
          currentRotationRef.current += snapDelta * SNAP_STRENGTH;
          if (Math.abs(snapDelta) < 0.05) currentRotationRef.current = nearest;
        }
      }

      // Enter animation: expand ring + spin + scale cards
      let enterScale = 1;
      const ea = enterAnimRef.current;
      if (ea) {
        const progress = Math.min(1, (now - ea.start) / 900);
        const e = 1 - Math.pow(1 - progress, 3);
        currentRotationRef.current = ea.startRot + 120 * e;
        ellipseRef.current.rx = ea.targetRx * 0.5 + ea.targetRx * 0.5 * e;
        ellipseRef.current.ry = ea.targetRy * 0.5 + ea.targetRy * 0.5 * e;
        enterScale = 0.7 + 0.3 * e;
        if (progress >= 1) enterAnimRef.current = null;
      }

      const rotation = currentRotationRef.current;
      const newIndex = normalizeIndex(rotation);
      if (newIndex !== currentIndexRef.current) {
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
      }

      const needsTransition = isEnlargedMode || now < transitionUntilRef.current;

      const { rx, ry, offsetY, flipY } = ellipseRef.current;

      // Update ring track size/position
      if (ringRef.current) {
        ringRef.current.style.opacity = isEnlargedMode ? '0' : '1';
        ringRef.current.style.width = `${rx * 2}px`;
        ringRef.current.style.height = `${ry * 2}px`;
        ringRef.current.style.marginLeft = `${-rx}px`;
        ringRef.current.style.marginTop = `${-ry}px`;
        ringRef.current.style.transform = `translateY(${offsetY}px)`;
      }

      for (let i = 0; i < N_CARDS; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const rawAngle = i * ANGLE_PER_CARD - rotation;
        const angle = ((rawAngle % 360) + 540) % 360 - 180;
        const absAngle = Math.abs(angle);
        const rad = (angle * Math.PI) / 180;

        // Elliptical path — cards travel around visible ring
        const x = Math.sin(rad) * rx;
        const y = flipY * Math.cos(rad) * ry;
        const depth = (Math.cos(rad) + 1) / 2;       // 1.0 at front, 0.0 at back

        const scale = 0.3 + 0.7 * depth;
        const opacity = Math.max(0.08, Math.pow(depth, 1.8));
        const blur = (1 - depth) * 4;
        const zIdx = Math.round(depth * 1000);
        const rotY = angle * 0.3;
        const isCenter = absAngle < ANGLE_PER_CARD * 0.5;

        const isEnlarged = isEnlargedMode && enlargedRef.current?.id === allRobots[i].id;
        let fx = x, fy = y, fScale = scale * enterScale, fOpacity = opacity, fBlur = blur, fRotY = rotY;

        if (isEnlargedMode) {
          if (isEnlarged) {
            fx = 0; fy = -offsetY; fScale = 1.12; fOpacity = 1; fBlur = 0; fRotY = 0;
          } else {
            fOpacity = Math.max(0, 0.15 - absAngle * 0.003);
            fBlur = 3;
          }
        }

        const mx = isCenter && !isEnlargedMode ? mouseCurrent.current.x * 10 : 0;
        const my = isCenter && !isEnlargedMode ? mouseCurrent.current.y * 6 : 0;

        el.style.transform = `translate3d(${fx + mx}px, ${fy + my + offsetY}px, 0) scale(${fScale}) rotateY(${fRotY}deg)`;
        el.style.opacity = String(fOpacity);
        el.style.filter = fBlur > 0.1 ? `blur(${fBlur}px)` : 'none';
        el.style.zIndex = String(zIdx);
        el.style.visibility = 'visible';
        el.style.pointerEvents = isCenter || isEnlarged ? 'auto' : 'none';
        el.style.transition = needsTransition
          ? 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease'
          : 'none';

        // Position dot marker on the ring
        const dot = dotRefs.current[i];
        if (dot) {
          dot.style.transform = `translate(${x}px, ${y + offsetY}px)`;
          dot.style.opacity = isEnlargedMode ? '0' : String(isCenter ? 0.6 : Math.max(0.08, depth * 0.25));
        }
      }
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => { if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current); };
  }, [viewMode, showIntro]);

  // Wheel handler
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) return;
    const handleWheel = (e: WheelEvent) => {
      if (enlargedRef.current) return;
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      velocityRef.current += delta * WHEEL_SENSITIVITY;
      if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }

      // Easter egg: one-time modal after excessive scrolling
      scrollAccumRef.current += Math.abs(delta);
      if (scrollResetTimerRef.current) clearTimeout(scrollResetTimerRef.current);
      scrollResetTimerRef.current = setTimeout(() => { scrollAccumRef.current = 0; }, 1500);
      if (scrollAccumRef.current > 50000 && !scrollModalShownRef.current) {
        scrollModalShownRef.current = true;
        setScrollModal('what are you doing');
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [viewMode, showIntro]);

  // Touch support
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (enlargedRef.current) return;
      touchStartRef.current = { x: e.touches[0].clientX, rotation: currentRotationRef.current };
      velocityRef.current = 0;
      if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || enlargedRef.current) return;
      currentRotationRef.current = touchStartRef.current.rotation - (e.touches[0].clientX - touchStartRef.current.x) * 0.3;
    };
    const handleTouchEnd = () => {
      if (!touchStartRef.current) return;
      touchStartRef.current = null;
      animateToIndex(normalizeIndex(currentRotationRef.current));
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewMode, showIntro, animateToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (viewMode !== 'carousel') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          animateToIndex((currentIndexRef.current - 1 + N_CARDS) % N_CARDS);
          break;
        case 'ArrowRight':
          e.preventDefault();
          animateToIndex((currentIndexRef.current + 1) % N_CARDS);
          break;
        case 'Enter':
          { const h = allRobots[currentIndexRef.current]; if (h) setEnlargedHumanoid(h); }
          break;
        case 'Escape':
          setEnlargedHumanoid(null);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, animateToIndex]);

  // Derived values
  const currentHumanoid = allRobots[currentIndex];
  const isIntro = currentHumanoid?.id === '__intro__';
  const currentBg = '#fff';
  const cardW = layoutConfig.cardSize;
  const cardH = layoutConfig.cardSize * 2.1;

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'carousel') {
      // Spin + expand: start as tiny circle, expand to full ring while spinning
      if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
      velocityRef.current = 0;
      const target = ANGLE_PER_CARD;
      const startRot = target - 120;
      currentRotationRef.current = startRot;
      // Guard against multiple ViewSwitcher instances firing simultaneously
      if (!enterAnimRef.current) {
        enterAnimRef.current = {
          start: performance.now(),
          startRot,
          targetRx: ellipseRef.current.rx,
          targetRy: ellipseRef.current.ry,
        };
        ellipseRef.current.rx = enterAnimRef.current.targetRx * 0.5;
        ellipseRef.current.ry = enterAnimRef.current.targetRy * 0.5;
      }
    }
  }, []);

  // Minimap: click/drag → jump to card (angle-based for elliptical map)
  const handleMinimapNav = useCallback((clientX: number, clientY: number) => {
    const minimap = minimapRef.current;
    if (!minimap) return;
    const rect = minimap.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const { flipY } = ellipseRef.current;
    const clickAngle = Math.atan2(dx, flipY * dy) * (180 / Math.PI);
    const offset = Math.round(clickAngle / ANGLE_PER_CARD);
    const target = ((currentIndexRef.current + offset) % N_CARDS + N_CARDS) % N_CARDS;
    animateToIndex(target);
  }, [animateToIndex]);

  const handleMinimapMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); isDraggingMinimapRef.current = true; handleMinimapNav(e.clientX, e.clientY);
  };
  const handleMinimapTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); isDraggingMinimapRef.current = true; handleMinimapNav(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDraggingMinimapRef.current) handleMinimapNav(e.clientX, e.clientY); };
    const onUp = () => { isDraggingMinimapRef.current = false; };
    const onTouchMove = (e: TouchEvent) => { if (isDraggingMinimapRef.current) handleMinimapNav(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = () => { isDraggingMinimapRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleMinimapNav]);

  return (
    <div
      className={`relative h-screen transition-colors duration-500 ease-out ${viewMode === 'grid' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
      style={{
        backgroundColor: currentBg,
        animation: easterShake ? 'easter-shake 0.6s ease-out' : 'none',
      }}
    >
      {/* ═══ LOGO ═══ */}
      {!showIntro && (
        <div
          className="fixed z-[5] animate-blur-fade font-mono text-[11px] font-medium uppercase tracking-wider cursor-pointer select-none rounded border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors duration-150"
          style={{
            top: windowWidth < 640 ? '10px' : '13px',
            left: windowWidth < 640 ? '10px' : '14px',
            color: 'rgba(0,0,0,0.7)',
            padding: '3px 10px',
          }}
          onClick={() => {
            setViewMode('carousel');
            setEasterShake(true);
            velocityRef.current = -30;
            if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
            setTimeout(() => setEasterShake(false), 600);
          }}
        >
          Humanoid Index
        </div>
      )}

      {/* ═══ HUD OVERLAY ═══ */}
      {!showIntro && (
        <>
          {/* HUD toggle — top-right, sliding pill like view switcher */}
          <div
            className="fixed z-[5]"
            style={{
              top: windowWidth < 640 ? '10px' : '13px',
              right: windowWidth < 640 ? '10px' : '14px',
            }}
          >
            <div className="relative flex items-center gap-0 border border-neutral-200 rounded px-0.5 py-0.5 font-mono text-[11px] uppercase tracking-normal select-none">
              {/* Sliding background */}
              <div
                className="absolute top-0.5 bottom-0.5 rounded-sm bg-neutral-100 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  width: 'calc(50% - 2px)',
                  left: showHud ? 'calc(50% + 1px)' : '2px',
                }}
              />
              {['Off', 'HUD'].map((label) => {
                const isActive = label === 'HUD' ? showHud : !showHud;
                return (
                  <button
                    key={label}
                    onClick={() => setShowHud(label === 'HUD')}
                    className="relative z-10 px-2.5 py-0.5 transition-colors duration-200"
                    style={{ color: isActive ? '#000' : '#bbb' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {showHud && (
            <>
              {/* Corner brackets */}
              <div className="fixed inset-0 z-[1] pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-l border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="absolute top-4 right-4 w-8 h-8 border-r border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
              </div>

              {/* Scanline overlay */}
              <div className="fixed inset-0 z-[1] pointer-events-none hud-scanlines" />

              {/* Vignette overlay */}
              <div className="fixed inset-0 z-[1] pointer-events-none hud-vignette" />

              {/* Top-left system readout */}
              <div
                className="fixed z-[2] pointer-events-none font-mono text-[9px] leading-relaxed flex flex-col"
                style={{ top: '36px', left: windowWidth < 640 ? '12px' : '16px', color: 'rgba(0,0,0,0.12)' }}
              >
                <span>SYS.HUMANOID_INDEX</span>
                <span>MODE: {viewMode === 'carousel' ? 'CAROUSEL' : viewMode === 'grid' ? 'GRID' : viewMode === 'select' ? 'COMPARE' : 'SMASH'}</span>
                <span>UNITS: {humanoids.length + legends.length}</span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block rounded-full hud-blink"
                    style={{ width: '4px', height: '4px', backgroundColor: 'rgba(0,0,0,0.4)' }}
                  />
                  ACTIVE
                </span>
              </div>

              {/* Top-right coordinate readout — carousel only */}
              {viewMode === 'carousel' && (
                <div
                  className="fixed z-[2] pointer-events-none font-mono text-[9px] leading-relaxed text-right flex flex-col"
                  style={{ top: '20px', right: windowWidth < 640 ? '20px' : '24px', color: 'rgba(0,0,0,0.12)' }}
                >
                  <span>POS: {(currentIndex / N_CARDS * 100).toFixed(1)}%</span>
                  <span>IDX: {String(currentIndex).padStart(3, '0')}</span>
                  <span>FRM: {String(allRobotsCount).padStart(3, '0')}</span>
                </div>
              )}

              {/* Center crosshair — carousel only */}
              {viewMode === 'carousel' && (
                <div className="fixed inset-0 z-[1] pointer-events-none flex items-center justify-center">
                  <div className="relative" style={{ width: '24px', height: '24px' }}>
                    <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2" style={{ width: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
                    <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2" style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.06)' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* INTRO — brief splash with all humanoids */}
      {showIntro && (
        <section
          className="absolute inset-0 z-50 h-screen flex flex-col items-center justify-center bg-white select-none overflow-hidden"
          style={{
            opacity: introExiting ? 0 : 1,
            transition: 'opacity 400ms ease-out',
          }}
        >
          <div className="animate-blur-fade flex flex-col items-center gap-6">
            <div className="flex items-end gap-[3px]">
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
            <div className="font-mono text-[13px] text-[#999] tracking-wider uppercase animate-blur-fade-delayed">
              Humanoid Index
            </div>
          </div>
        </section>
      )}

      {/* CHARACTER SELECT — always mounted overlay for smooth transitions */}
      {!showIntro && (
        <section
          className="absolute inset-0 h-screen flex flex-col bg-white"
          style={{
            opacity: viewMode === 'select' ? 1 : 0,
            pointerEvents: viewMode === 'select' ? 'auto' : 'none',
            transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1)',
            zIndex: viewMode === 'select' ? 10 : -1,
          }}
        >
          <div
            className="flex-shrink-0 relative z-20 flex justify-center"
            style={{ padding: `${topBarInset}px ${insetX}px` }}
          >
            <ViewSwitcher viewMode={viewMode} onViewModeChange={handleViewChange} width={trackWidth} showHud={showHud} />
          </div>
          <div className="flex-1 min-h-0">
            <CharacterSelect humanoids={allRobots} />
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
            <ViewSwitcher viewMode={viewMode} onViewModeChange={handleViewChange} width={trackWidth} showHud={showHud} />
          </div>
          <div className="flex-1 min-h-0">
            <SmashPicker humanoids={allRobots} />
          </div>
        </section>
      )}

      {/* CAROUSEL SECTION */}
      {viewMode !== 'smash' && !showIntro && (
      <section className={`flex flex-col relative animate-blur-fade ${viewMode === 'grid' ? 'min-h-screen bg-white overflow-y-auto' : 'h-screen overflow-hidden'}`}>
        {/* TOP BAR */}
        <div
          className="flex-shrink-0 relative z-20 flex justify-center"
          style={{ padding: `${topBarInset}px ${insetX}px` }}
        >
          <ViewSwitcher viewMode={viewMode} onViewModeChange={handleViewChange} width={trackWidth} showHud={showHud} />
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

        {/* Left/right click zones — always visible, wrap around */}
        {viewMode === 'carousel' && (
          <>
            <div
              onClick={() => animateToIndex((currentIndex - 1 + N_CARDS) % N_CARDS)}
              className="absolute top-0 left-0 bottom-0 z-[50] select-none"
              style={{ width: '40%', cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M15 4l-8 8 8 8' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, pointer` }}
            />
            <div
              onClick={() => animateToIndex((currentIndex + 1) % N_CARDS)}
              className="absolute top-0 right-0 bottom-0 z-[50] select-none"
              style={{ width: '40%', cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 4l8 8-8 8' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, pointer` }}
            />
          </>
        )}

        {/* MAIN CONTENT */}
        <div className={`flex flex-col ${viewMode === 'carousel' ? 'flex-1 justify-center overflow-hidden' : 'overflow-visible'}`}>
          {viewMode === 'carousel' ? (
            <main className="flex-1 relative overflow-hidden select-none" onDragStart={(e) => e.preventDefault()}>
              {/* 3D carousel container */}
              <div
                ref={carouselRef}
                className="absolute inset-0"
                style={{ perspective: '1200px' }}
              >
                {/* Visible ring track */}
                <div
                  ref={ringRef}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: DEFAULT_RX * 2,
                    height: DEFAULT_RY * 2,
                    marginLeft: -DEFAULT_RX,
                    marginTop: -DEFAULT_RY,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.06)',
                    transition: 'opacity 0.5s ease',
                  }}
                />
                {/* Dot markers on the ring */}
                {allRobots.map((_, i) => (
                  <div
                    key={`dot-${i}`}
                    ref={el => { dotRefs.current[i] = el; }}
                    className="absolute pointer-events-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: '3px',
                      height: '3px',
                      marginLeft: '-1.5px',
                      marginTop: '-1.5px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                ))}
                {allRobots.map((humanoid, index) => {
                  const isCenterCard = index === currentIndex;
                  const isEnlarged = enlargedHumanoid?.id === humanoid.id;

                  return (
                    <div
                      key={humanoid.id}
                      ref={el => { cardRefs.current[index] = el; }}
                      data-card-index={index}
                      className="absolute group"
                      style={{
                        width: `${cardW}px`,
                        height: `${cardH}px`,
                        left: '50%',
                        top: '50%',
                        marginLeft: `${-cardW / 2}px`,
                        marginTop: `${-cardH / 2}px`,
                        willChange: 'transform, opacity',
                      }}
                    >
                      {humanoid.id === '__intro__' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="font-mono flex flex-col items-center">
                            <div className="tracking-tight uppercase leading-[0.85]" style={{ fontSize: '32px', color: 'rgba(0,0,0,0.35)' }}>
                              Humanoid
                            </div>
                            <div className="tracking-tight uppercase leading-[0.85]" style={{ fontSize: '32px', color: 'rgba(0,0,0,0.18)' }}>
                              Index
                            </div>
                            <div className="text-[10px] mt-3 tracking-wider" style={{ color: 'rgba(0,0,0,0.2)' }}>
                              {humanoids.length + legends.length} UNITS
                            </div>
                          </div>
                        </div>
                      ) : (
                      <>
                      {/* Targeting corners */}
                      {isCenterCard && !isEnlarged && (
                        <div
                          className="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out pointer-events-none"
                          style={{ top: '10px', bottom: '10px', left: '-40px', right: '-40px' }}
                        >
                          <div className="absolute inset-[20px] group-hover:inset-[10px] transition-all duration-150 ease-out pointer-events-none">
                            <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-neutral-300" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-neutral-300" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-neutral-300" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-neutral-300" />
                          </div>
                        </div>
                      )}
                      {isCenterCard && !isEnlarged && (
                        <div
                          className="absolute bottom-[5%] left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
                          style={{ width: '50%', height: '10px', background: 'radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%)' }}
                        />
                      )}
                      <HumanoidCard
                        humanoid={humanoid}
                        config={config}
                        effectClass="distortion-wave"
                        onClick={() => isCenterCard && setEnlargedHumanoid(isEnlarged ? null : humanoid)}
                      />
                      </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stats panel — outside 3D context to avoid transform distortion */}
              {currentHumanoid && !isIntro && !enlargedHumanoid && (
                <div
                  key={currentHumanoid.id}
                  className="absolute z-[60] pointer-events-none font-mono text-left flex flex-col animate-stat-cascade"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translateX(${cardW / 2 + 80}px) translateY(${ellipseRef.current.flipY * ellipseRef.current.ry + ellipseRef.current.offsetY - cardH / 2 + 10}px) perspective(200px) rotateY(12deg)`,
                    transformOrigin: 'left center',
                    width: '200px',
                  }}
                >
                  <div className="text-[28px] leading-none tracking-tight" style={{ color: showHud ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.85)' }}>
                    {currentHumanoid.name}
                  </div>
                  <div className="text-[28px] leading-none tracking-tight" style={{ color: showHud ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.45)' }}>
                    {currentHumanoid.manufacturer}
                  </div>
                  <div className="flex flex-col gap-[6px] mt-4 text-left" style={{ textTransform: 'none' }}>
                    {[
                      currentHumanoid.height && { label: 'height', value: `${currentHumanoid.height}cm`, pct: ((currentHumanoid.height - 100) / 100) * 100 },
                      currentHumanoid.weight && { label: 'weight', value: `${currentHumanoid.weight}kg`, pct: (currentHumanoid.weight / 100) * 100 },
                      currentHumanoid.dof && { label: 'dof', value: currentHumanoid.dof, pct: (currentHumanoid.dof / 70) * 100 },
                      currentHumanoid.maxSpeed && { label: 'speed', value: `${currentHumanoid.maxSpeed}m/s`, pct: (currentHumanoid.maxSpeed / 4.5) * 100 },
                    ].filter(Boolean).map((stat, i) => {
                      const s = stat as { label: string; value: string | number; pct: number };
                      const clampedPct = Math.max(4, Math.min(100, s.pct));
                      return (
                        <div key={s.label} className="animate-stat-cascade" style={{ animationDelay: `${80 + i * 60}ms` }}>
                          <div className="flex justify-between items-baseline text-[13px] leading-none mb-[3px]">
                            <span style={{ color: showHud ? '#999' : '#777' }}>{s.label}</span>
                            <span className="text-[15px]" style={{ color: showHud ? '#555' : '#222' }}>{s.value}</span>
                          </div>
                          <div className="relative h-[3px] w-full rounded-full" style={{ backgroundColor: showHud ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.08)' }}>
                            <div
                              className="absolute inset-y-0 left-0 rounded-full animate-bar-fill"
                              style={{
                                width: `${clampedPct}%`,
                                backgroundColor: showHud ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.35)',
                                animationDelay: `${120 + i * 60}ms`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {currentHumanoid.purchaseUrl && (() => {
                    const isNeo = currentHumanoid.id === '4';
                    return (
                      <a
                        href={currentHumanoid.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`animate-blur-fade-stagger font-mono text-[12px] font-medium px-4 py-1 mt-3 rounded-sm transition-colors duration-150 uppercase tracking-wider text-center self-start pointer-events-auto ${
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
              )}
            </main>
          ) : (
            <main>
              <GridView
                humanoids={humanoids}
                layoutConfig={layoutConfig}
                compareMode={false}
                selectedIds={[]}
                onToggleSelect={() => {}}
                onHoverChange={setHoveredHumanoid}
              />
              {viewMode === 'grid' && (
                <CatalogIndex humanoids={humanoids} legends={legends} />
              )}
            </main>
          )}

          {/* MINIMAP — elliptical ring */}
          {viewMode === 'carousel' && (() => {
            const ep = ellipseRef.current;
            const MINI_RX = 60;
            const MINI_RY = Math.max(12, Math.min(35, Math.round(MINI_RX * ep.ry / ep.rx)));
            return (
              <div className="flex-shrink-0 relative z-20 flex justify-center pt-2 pb-3 transition-opacity duration-300" style={{ opacity: enlargedHumanoid ? 0 : 1 }}>
                <div
                  ref={minimapRef}
                  className="relative cursor-pointer select-none"
                  style={{ width: `${MINI_RX * 2 + 16}px`, height: `${MINI_RY * 2 + 16}px` }}
                  onMouseDown={handleMinimapMouseDown}
                  onTouchStart={handleMinimapTouchStart}
                  onDragStart={(e) => e.preventDefault()}
                >
                  {/* Mini ring outline */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: '50%', top: '50%',
                      width: MINI_RX * 2, height: MINI_RY * 2,
                      marginLeft: -MINI_RX, marginTop: -MINI_RY,
                      borderRadius: '50%',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  />
                  {/* Dots on the ring */}
                  {allRobots.map((_, i) => {
                    const ang = (i - currentIndex) * ANGLE_PER_CARD;
                    const rad = (ang * Math.PI) / 180;
                    const dotX = Math.sin(rad) * MINI_RX;
                    const dotY = ep.flipY * Math.cos(rad) * MINI_RY;
                    const depth = (Math.cos(rad) + 1) / 2;
                    const isActive = i === currentIndex;
                    return (
                      <div
                        key={i}
                        className="absolute transition-all duration-300"
                        style={{
                          left: '50%', top: '50%',
                          width: isActive ? '5px' : '2px',
                          height: isActive ? '5px' : '2px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#000' : `rgba(0,0,0,${0.08 + depth * 0.15})`,
                          transform: `translate(${dotX - (isActive ? 2.5 : 1)}px, ${dotY - (isActive ? 2.5 : 1)}px)`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Bottom spacer — keeps layout stable */}
          <div className="flex-shrink-0" style={{ height: '40px' }} />

        </div>
      </section>
      )}

      {/* ═══ SCROLL EASTER EGG ═══ */}
      {scrollModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center animate-blur-fade cursor-pointer"
          onClick={() => setScrollModal(null)}
        >
          <div className="font-mono text-[13px] text-neutral-400">
            {scrollModal}
          </div>
        </div>
      )}

      {/* ═══ RING CONTROLS ═══ */}
      {!showIntro && viewMode === 'carousel' && (
        <>
          <button
            onClick={() => setShowControls(s => !s)}
            className="fixed z-[100] font-mono text-[9px] uppercase tracking-wider transition-colors duration-150"
            style={{
              bottom: '18px',
              right: windowWidth < 640 ? '20px' : '24px',
              color: showControls ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.10)',
            }}
          >
            Ring {showControls ? 'ON' : 'OFF'}
          </button>
          {showControls && (
            <div
              className="fixed z-[100] bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg font-mono shadow-sm"
              style={{ bottom: '40px', right: '24px', width: '220px', padding: '12px 14px' }}
            >
              {([
                { label: 'Spread X', key: 'rx' as const, min: 100, max: 900 },
                { label: 'Spread Y', key: 'ry' as const, min: 30, max: 500 },
                { label: 'Offset Y', key: 'offsetY' as const, min: -300, max: 400 },
              ]).map(({ label, key, min, max }) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                    <span>{label}</span>
                    <span className="text-neutral-600">{ellipseRef.current[key]}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={10}
                    value={ellipseRef.current[key]}
                    onChange={e => { ellipseRef.current[key] = +e.target.value; forceControls(n => n + 1); }}
                    className="w-full h-1 appearance-none bg-neutral-200 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-500"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between mt-1 pt-2 border-t border-neutral-100">
                <span className="text-[10px] text-neutral-400">Direction</span>
                <button
                  onClick={() => { ellipseRef.current.flipY *= -1; forceControls(n => n + 1); }}
                  className="text-[10px] px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
                >
                  {ellipseRef.current.flipY === -1 ? 'Front Top' : 'Front Bottom'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
