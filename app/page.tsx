"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import HumanoidCard from "@/components/HumanoidCard";
import ViewSwitcher, { ViewMode } from "@/components/ViewSwitcher";
import GridView from "@/components/GridView";
import SmashPicker from "@/components/SmashPicker";
import CharacterSelect from "@/components/CharacterSelect";
import CatalogIndex from "@/components/CatalogIndex";
import { humanoids, legends, Humanoid } from "@/data/humanoids";
import { defaultLayoutConfig } from "@/components/BottomBar";

// ═══ Ring Shape Presets (desktop baseline) ═══
const RING_PRESETS_BASE = [
  { id: 'wide',   label: 'Wide',   rx: 660, ry: 110, offsetY: -40, cardScale: 1 },
  { id: 'round',  label: 'Round',  rx: 420, ry: 320, offsetY: -60, cardScale: 0.7 },
] as const;

function scaledPresets(w: number) {
  const scale = w < 640 ? w / 900 : w < 1024 ? w / 1200 : 1;
  return RING_PRESETS_BASE.map(p => ({
    ...p,
    rx: Math.round(p.rx * scale),
    ry: Math.round(p.ry * scale),
    offsetY: Math.round(p.offsetY * scale),
  }));
}

// ═══ 3D Carousel Constants ═══
const DEFAULT_RX: number = RING_PRESETS_BASE[0].rx;
const DEFAULT_RY: number = RING_PRESETS_BASE[0].ry;
const DEFAULT_OFFSET_Y: number = RING_PRESETS_BASE[0].offsetY;
const WHEEL_SENSITIVITY = 0.08;
const FRICTION = 0.92;
const SNAP_THRESHOLD = 0.08;
const SNAP_STRENGTH = 0.08;

const introItem: Humanoid = { id: '__intro__', name: 'Humanoid Index', manufacturer: '' };
const allRobots = [introItem, ...humanoids, ...legends];
const N_CARDS = allRobots.length;
const CARD_SPACING = 15; // fixed degrees between cards — independent of count
const TOTAL_ARC = N_CARDS * CARD_SPACING;

function normalizeIndex(rotation: number): number {
  const raw = rotation / CARD_SPACING;
  return ((Math.round(raw) % N_CARDS) + N_CARDS) % N_CARDS;
}

export default function Home() {
  const layoutConfig = defaultLayoutConfig;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('carousel');
  const [hoveredHumanoid, setHoveredHumanoid] = useState<Humanoid | null>(null);
  const [hoveredCarouselCard, setHoveredCarouselCard] = useState<Humanoid | null>(null);
  const [windowWidth, setWindowWidth] = useState(1200);
  const [enlargedHumanoid, setEnlargedHumanoid] = useState<Humanoid | null>(null);
  const [spotlightFx, setSpotlightFx] = useState<Set<string>>(new Set(['specs']));
  const [prevEnlarged, setPrevEnlarged] = useState<Humanoid | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);

  const [showControls, setShowControls] = useState(false);
  const [, forceControls] = useState(0);
  const [scrollModal, setScrollModal] = useState<string | null>(null);
  const [easterShake, setEasterShake] = useState(false);
  const [activePreset, setActivePreset] = useState('wide');
  const presetAnimRef = useRef<number | null>(null);
  const fadeRef = useRef({ center: 1, near: 0.75, mid: 0.5, far: 0.25 });
  const spotlightFxRef = useRef(spotlightFx);
  const ringPresets = scaledPresets(windowWidth);
  const ellipseRef = useRef({ rx: DEFAULT_RX, ry: DEFAULT_RY, offsetY: DEFAULT_OFFSET_Y, flipY: 1, cardScale: 1 });
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
  const dragRef = useRef<{ x: number; rotation: number; prevX: number; prevTime: number } | null>(null);
  const isDraggingRef = useRef(false);
  const transitionUntilRef = useRef(0);
  const enterAnimRef = useRef<{ start: number; startRot: number; targetRx: number; targetRy: number; startRx?: number; startRy?: number; startOffsetY?: number; targetOffsetY?: number; startCardScale?: number; targetCardScale?: number; fadeIn?: boolean } | null>(null);
  const bumpRef = useRef<number>(0); // timestamp of spacebar bump

  const labelRef = useRef<HTMLDivElement>(null);
  const labelEntryRef = useRef<number>(0);
  const cardDimsRef = useRef({ w: 150, h: 315 });
  const waveRef = useRef<{ start: number } | null>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const isDraggingMinimapRef = useRef(false);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });

  // Keep enlargedRef in sync + set transition deadline on exit + track prev for A/B ghost
  useEffect(() => {
    if (enlargedHumanoid === null && enlargedRef.current !== null) {
      transitionUntilRef.current = performance.now() + 350;
    }
    if (enlargedHumanoid && enlargedRef.current && enlargedHumanoid.id !== enlargedRef.current.id) {
      setPrevEnlarged(enlargedRef.current);
    }
    if (enlargedHumanoid && !enlargedRef.current) {
      // fresh spotlight, keep prev from last session
    }
    enlargedRef.current = enlargedHumanoid;
  }, [enlargedHumanoid]);

  useEffect(() => { spotlightFxRef.current = spotlightFx; }, [spotlightFx]);

  // Auto-dismiss intro
  useEffect(() => {
    if (!showIntro || introExiting) return;
    const timer = setTimeout(() => {
      setIntroExiting(true);
      setTimeout(() => { setShowIntro(false); setIntroExiting(false); }, 400);
    }, 2200);
    return () => clearTimeout(timer);
  }, [showIntro, introExiting]);

  // Window width tracking + rescale ring on resize
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      const presets = scaledPresets(w);
      const active = presets.find(p => p.id === activePreset) || presets[0];
      ellipseRef.current.rx = active.rx;
      ellipseRef.current.ry = active.ry;
      ellipseRef.current.offsetY = active.offsetY;
      ellipseRef.current.cardScale = active.cardScale;
    };
    apply();
    const handleResize = () => apply();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse parallax — smooth cursor tracking for center card
  useEffect(() => {
    let raf: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
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
    let diff = targetIdx * CARD_SPACING - startRotation;
    diff = ((diff % TOTAL_ARC) + TOTAL_ARC * 1.5) % TOTAL_ARC - TOTAL_ARC / 2;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / 200);
      currentRotationRef.current = startRotation + diff * easeOutCubic(progress);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Trigger enter animation: start as round preset, morph to wide
  useEffect(() => {
    if (showIntro || viewMode !== 'carousel') return;
    velocityRef.current = 0;
    const target = CARD_SPACING;
    const startRot = target - 120;
    currentRotationRef.current = startRot;
    if (!enterAnimRef.current) {
      const presets = scaledPresets(window.innerWidth);
      const round = presets.find(p => p.id === 'round')!;
      const wide = presets.find(p => p.id === 'wide')!;
      ellipseRef.current.rx = round.rx * 0.4;
      ellipseRef.current.ry = round.ry * 0.4;
      ellipseRef.current.offsetY = round.offsetY;
      ellipseRef.current.cardScale = round.cardScale * 0.5;
      enterAnimRef.current = {
        start: performance.now(),
        startRot,
        targetRx: wide.rx,
        targetRy: wide.ry,
        startRx: round.rx * 0.4,
        startRy: round.ry * 0.4,
        startOffsetY: round.offsetY,
        targetOffsetY: wide.offsetY,
        startCardScale: round.cardScale * 0.5,
        targetCardScale: wide.cardScale,
        fadeIn: true,
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);

  // ═══ Main rAF render loop — positions all cards via transforms ═══
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }
    const loop = () => {
      const isEnlargedMode = !!enlargedRef.current;
      const now = performance.now();

      if (!isEnlargedMode && animationRef.current === null && !dragRef.current) {
        currentRotationRef.current += velocityRef.current;
        velocityRef.current *= FRICTION;
        if (Math.abs(velocityRef.current) < SNAP_THRESHOLD) {
          velocityRef.current = 0;
          const nearest = Math.round(currentRotationRef.current / CARD_SPACING) * CARD_SPACING;
          const snapDelta = nearest - currentRotationRef.current;
          currentRotationRef.current += snapDelta * SNAP_STRENGTH;
          if (Math.abs(snapDelta) < 0.05) currentRotationRef.current = nearest;
        }
      }

      // Enter animation: round→wide morph + spin + scale cards
      let enterScale = 1;
      let enterOpacity = 1;
      const ea = enterAnimRef.current;
      if (ea) {
        const progress = Math.min(1, (now - ea.start) / 1400);
        const e = 1 - Math.pow(1 - progress, 3);
        currentRotationRef.current = ea.startRot + 120 * e;
        ellipseRef.current.rx = (ea.startRx ?? ea.targetRx * 0.5) + (ea.targetRx - (ea.startRx ?? ea.targetRx * 0.5)) * e;
        ellipseRef.current.ry = (ea.startRy ?? ea.targetRy * 0.5) + (ea.targetRy - (ea.startRy ?? ea.targetRy * 0.5)) * e;
        if (ea.startOffsetY != null) ellipseRef.current.offsetY = ea.startOffsetY + (ea.targetOffsetY! - ea.startOffsetY) * e;
        if (ea.startCardScale != null) ellipseRef.current.cardScale = ea.startCardScale + (ea.targetCardScale! - ea.startCardScale) * e;
        enterScale = (ea.startCardScale ?? 0.7) + ((ea.targetCardScale ?? 1) - (ea.startCardScale ?? 0.7)) * e;
        if (ea.fadeIn) enterOpacity = Math.min(1, progress * 2.5); // fade in over first ~40% of animation
        if (progress >= 1) enterAnimRef.current = null;
      }

      const rotation = currentRotationRef.current;
      const newIndex = normalizeIndex(rotation);
      if (newIndex !== currentIndexRef.current) {
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
      }

      const { rx, ry, offsetY, flipY } = ellipseRef.current;

      // Update ring track size/position
      if (ringRef.current) {
        ringRef.current.style.opacity = isEnlargedMode ? '0' : String(enterOpacity);
        ringRef.current.style.width = `${rx * 2}px`;
        ringRef.current.style.height = `${ry * 2}px`;
        ringRef.current.style.marginLeft = `${-rx}px`;
        ringRef.current.style.marginTop = `${-ry}px`;
        ringRef.current.style.transform = `translateY(${offsetY}px)`;
      }

      for (let i = 0; i < N_CARDS; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        // Index-distance-based angle — fixed spacing regardless of card count
        const currentIdx = rotation / CARD_SPACING;
        let idxDiff = i - currentIdx;
        idxDiff = idxDiff - Math.round(idxDiff / N_CARDS) * N_CARDS;
        const angle = idxDiff * CARD_SPACING;
        const absAngle = Math.abs(angle);

        if (absAngle > 150 && !isEnlargedMode) {
          el.style.visibility = 'hidden';
          continue;
        }
        const rad = (angle * Math.PI) / 180;

        // Elliptical path — cards travel around visible ring
        const x = Math.sin(rad) * rx;
        const y = flipY * Math.cos(rad) * ry;
        const depth = (Math.cos(rad) + 1) / 2;       // 1.0 at front, 0.0 at back

        const centerBoost = Math.max(0, 1 - absAngle / (CARD_SPACING * 2)) * 0.15;
        const scale = (0.3 + 0.7 * depth) * (1 + centerBoost);
        const steps = absAngle / CARD_SPACING;
        const f = fadeRef.current;
        const opacity = steps < 0.5 ? f.center : steps < 1.5 ? f.near : steps < 2.5 ? f.mid : f.far;
        const blur = 0;
        const zIdx = Math.round(depth * 1000);
        const rotY = angle * 0.3;
        const isCenter = absAngle < CARD_SPACING * 0.5;

        const isEnlarged = isEnlargedMode && enlargedRef.current?.id === allRobots[i].id;
        let fx = x, fy = y, fScale = scale * enterScale * ellipseRef.current.cardScale, fOpacity = opacity * enterOpacity, fBlur = blur, fRotY = rotY;

        if (isEnlargedMode) {
          if (isEnlarged) {
            fx = 0; fy = -offsetY; fScale = 1.12; fOpacity = 1; fBlur = 0; fRotY = 0;
            // Bump — snappy pop up then settle
            let bumpY = 0;
            if (bumpRef.current > 0) {
              const elapsed = now - bumpRef.current;
              if (elapsed < 250) {
                const t = elapsed / 250;
                bumpY = -10 * Math.sin(t * Math.PI) * (1 - t * 0.5);
              } else {
                bumpRef.current = 0;
              }
            }
            el.style.transform = `translate3d(0px, ${bumpY}px, 0) scale(${fScale})`;
            el.style.opacity = '1';
            el.style.filter = 'none';
            el.style.zIndex = '1100';
            el.style.visibility = 'visible';
            el.style.pointerEvents = 'auto';
            el.style.transition = 'none';
            continue;
          } else {
            // Push out — subtle horizontal spread
            fx = x * 1.4;
            fy = y * 1.05;
            fOpacity = Math.max(0.12, 0.45 - absAngle * 0.004);
            fBlur = 1;
          }
        }

        // Wave effect — ripple outward from center
        const wv = waveRef.current;
        if (wv) {
          const elapsed = now - wv.start;
          // Radiates both directions from center
          const delay = steps / 20 * 1000;
          const localT = (elapsed - delay) / 300;

          if (elapsed < 800) {
            if (localT > 0 && localT < 1) {
              const wave = Math.sin(localT * Math.PI);
              // Push outward along the ring's radial direction
              fx += Math.sin(rad) * wave * 12;
              fy += flipY * Math.cos(rad) * wave * 12;
              fScale *= 1 + wave * 0.05;
            }
          } else {
            waveRef.current = null;
          }
        }

        el.style.transform = `translate3d(${fx}px, ${fy + offsetY}px, 0) scale(${fScale}) rotateY(${fRotY}deg)`;
        el.style.opacity = String(fOpacity);
        el.style.filter = fBlur > 0.1 ? `blur(${fBlur}px)` : 'none';
        el.style.zIndex = isEnlarged ? '1100' : String(zIdx);
        el.style.visibility = 'visible';
        el.style.pointerEvents = isEnlarged ? 'auto' : 'none';
        const useTransition = isEnlargedMode || now < transitionUntilRef.current;
        el.style.transition = (useTransition && !wv)
          ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease-out, filter 0.3s ease-out'
          : 'none';

        // Position dot marker on the ring
        const dot = dotRefs.current[i];
        if (dot) {
          dot.style.transform = `translate(${x}px, ${y + offsetY}px)`;
          dot.style.opacity = isEnlargedMode ? '0' : String(isCenter ? 0.6 : Math.max(0.08, depth * 0.25));
        }
      }

      // Position floating label above center card — settles from above
      if (labelRef.current) {
        if (!labelEntryRef.current) labelEntryRef.current = now;
        const labelAge = now - labelEntryRef.current;
        const entryDuration = 700;
        const entryProgress = Math.min(1, labelAge / entryDuration);
        const entryEase = 1 - Math.pow(1 - entryProgress, 3); // ease-out cubic

        const centerY = flipY * ry;
        const centerScale = 1.15 * enterScale * ellipseRef.current.cardScale;
        const labelY = centerY + offsetY - (cardDimsRef.current.h * centerScale) / 2 - 40;
        // Start 25px above final position, settle down softly
        const entryOffset = (1 - entryEase) * -25;
        labelRef.current.style.transform = `translate(-50%, ${labelY + entryOffset}px)`;
        labelRef.current.style.opacity = isEnlargedMode ? '0' : String(Math.min(entryEase, 1));
      } else {
        labelEntryRef.current = 0; // reset when label unmounts
      }

      // Minimap catapult — synced to bump, squishes down then springs back
      if (minimapRef.current) {
        if (bumpRef.current > 0) {
          const elapsed = now - bumpRef.current;
          if (elapsed < 300) {
            const t = elapsed / 300;
            // Quick squish down (first 30%), then spring up past neutral
            const squish = t < 0.3
              ? t / 0.3
              : 1 - (t - 0.3) / 0.7;
            const scaleY = 1 - squish * 0.15;
            const pushY = squish * 4;
            minimapRef.current.style.transform = `translateY(${pushY}px) scaleY(${scaleY})`;
          } else {
            minimapRef.current.style.transform = 'translateY(0) scaleY(1)';
          }
        } else {
          minimapRef.current.style.transform = 'translateY(0) scaleY(1)';
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

  // Touch support — with velocity tracking for momentum
  const touchPrevRef = useRef<{ x: number; time: number } | null>(null);
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (enlargedRef.current) return;
      const x = e.touches[0].clientX;
      touchStartRef.current = { x, rotation: currentRotationRef.current };
      touchPrevRef.current = { x, time: performance.now() };
      velocityRef.current = 0;
      if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || enlargedRef.current) return;
      const x = e.touches[0].clientX;
      const now = performance.now();
      currentRotationRef.current = touchStartRef.current.rotation - (x - touchStartRef.current.x) * 0.25;
      // Track velocity from last frame
      if (touchPrevRef.current) {
        const dt = now - touchPrevRef.current.time;
        if (dt > 0) {
          velocityRef.current = -(x - touchPrevRef.current.x) / dt * 1.2;
        }
      }
      touchPrevRef.current = { x, time: now };
    };
    const handleTouchEnd = () => {
      if (!touchStartRef.current) return;
      touchStartRef.current = null;
      touchPrevRef.current = null;
      // Let momentum carry via the rAF loop instead of snapping immediately
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewMode, showIntro]);

  // Mouse drag support
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (enlargedRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, [data-no-drag]')) return;
      const now = performance.now();
      dragRef.current = { x: e.clientX, rotation: currentRotationRef.current, prevX: e.clientX, prevTime: now };
      isDraggingRef.current = false;
      velocityRef.current = 0;
      if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      if (!isDraggingRef.current && Math.abs(dx) > 4) {
        isDraggingRef.current = true;
        document.body.style.cursor = 'grabbing';
      }
      if (isDraggingRef.current) {
        const now = performance.now();
        const frameDx = e.clientX - dragRef.current.prevX;
        const frameDt = now - dragRef.current.prevTime;
        if (frameDt > 0) {
          velocityRef.current = -(frameDx / frameDt) * 1.5;
        }
        dragRef.current.prevX = e.clientX;
        dragRef.current.prevTime = now;
        currentRotationRef.current = dragRef.current.rotation - dx * 0.15;
      }
    };
    const handleMouseUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
    };
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewMode, showIntro]);

  // Double-click to select/dismiss
  useEffect(() => {
    if (viewMode !== 'carousel' || showIntro) return;
    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, [data-no-drag]')) return;
      const h = allRobots[currentIndexRef.current];
      if (h && h.id === '__intro__') {
        waveRef.current = { start: performance.now() };
      } else if (h) {
        setEnlargedHumanoid(prev => prev ? null : h);
      }
    };
    document.addEventListener('dblclick', handleDblClick);
    return () => document.removeEventListener('dblclick', handleDblClick);
  }, [viewMode, showIntro]);

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
        case ' ':
          e.preventDefault();
          if (e.repeat) break;
          { const h = allRobots[currentIndexRef.current];
            if (h && h.id === '__intro__') {
              // Scatter & reform
              waveRef.current = { start: performance.now() };
            } else if (h) {
              const willEnlarge = !enlargedRef.current;
              setEnlargedHumanoid(prev => prev ? null : h);
              if (willEnlarge) bumpRef.current = performance.now();
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
  }, [viewMode, animateToIndex]);

  // Derived values
  const currentHumanoid = allRobots[currentIndex];
  const isIntro = currentHumanoid?.id === '__intro__';
  const currentBg = '#fff';
  const cardW = windowWidth < 640 ? Math.min(layoutConfig.cardSize, 100) : layoutConfig.cardSize;
  const cardH = cardW * 2.1;
  cardDimsRef.current = { w: cardW, h: cardH };

  const toggleFx = useCallback((fx: string) => {
    setSpotlightFx(prev => {
      const next = new Set(prev);
      if (next.has(fx)) next.delete(fx); else next.add(fx);
      return next;
    });
  }, []);

  // Compute rankings for the spotlight
  const getRank = useCallback((h: Humanoid) => {
    const all = [...humanoids, ...legends].filter(r => r.id !== '__intro__');
    const ranks: { label: string; rank: number; total: number; value: string }[] = [];
    if (h.maxSpeed) {
      const sorted = all.filter(r => r.maxSpeed).sort((a, b) => (b.maxSpeed || 0) - (a.maxSpeed || 0));
      const rank = sorted.findIndex(r => r.id === h.id) + 1;
      if (rank <= 3) ranks.push({ label: 'Fastest', rank, total: sorted.length, value: `${h.maxSpeed}m/s` });
    }
    if (h.height) {
      const sorted = all.filter(r => r.height).sort((a, b) => (b.height || 0) - (a.height || 0));
      const rank = sorted.findIndex(r => r.id === h.id) + 1;
      if (rank <= 3) ranks.push({ label: 'Tallest', rank, total: sorted.length, value: `${h.height}cm` });
    }
    if (h.dof) {
      const sorted = all.filter(r => r.dof).sort((a, b) => (b.dof || 0) - (a.dof || 0));
      const rank = sorted.findIndex(r => r.id === h.id) + 1;
      if (rank <= 3) ranks.push({ label: 'Most DOF', rank, total: sorted.length, value: `${h.dof}` });
    }
    return ranks.length > 0 ? ranks[0] : null;
  }, []);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'carousel') {
      // Spin + expand: start as tiny circle, expand to full ring while spinning
      if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
      velocityRef.current = 0;
      const target = CARD_SPACING;
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
    const offset = Math.round(clickAngle / (360 / N_CARDS));
    const target = ((currentIndexRef.current + offset) % N_CARDS + N_CARDS) % N_CARDS;
    animateToIndex(target);
  }, [animateToIndex]);

  const applyPreset = useCallback((presetId: string) => {
    const presets = scaledPresets(window.innerWidth);
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    if (presetAnimRef.current) cancelAnimationFrame(presetAnimRef.current);
    const startRx = ellipseRef.current.rx;
    const startRy = ellipseRef.current.ry;
    const startOY = ellipseRef.current.offsetY;
    const startCS = ellipseRef.current.cardScale;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / 500);
      const e = 1 - Math.pow(1 - progress, 3);
      ellipseRef.current.rx = startRx + (preset.rx - startRx) * e;
      ellipseRef.current.ry = startRy + (preset.ry - startRy) * e;
      ellipseRef.current.offsetY = startOY + (preset.offsetY - startOY) * e;
      ellipseRef.current.cardScale = startCS + (preset.cardScale - startCS) * e;
      if (progress < 1) {
        presetAnimRef.current = requestAnimationFrame(animate);
      } else {
        presetAnimRef.current = null;
      }
    };
    presetAnimRef.current = requestAnimationFrame(animate);
  }, []);

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
          className="fixed z-[5] animate-slide-from-top cursor-pointer select-none transition-opacity duration-150 hover:opacity-70"
          style={{
            top: windowWidth < 640 ? '10px' : '13px',
            left: windowWidth < 640 ? '10px' : '14px',
          }}
          onClick={() => {
            setViewMode('carousel');
            setEasterShake(true);
            if (animationRef.current !== null) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
            velocityRef.current = 0;
            const startRot = currentRotationRef.current;
            const startTime = performance.now();
            const animate = (now: number) => {
              const progress = Math.min(1, (now - startTime) / 1800);
              // Push-and-spin: fast flick at start, long gentle wind-down
              const k = 8;
              const e = (1 - Math.exp(-k * progress)) / (1 - Math.exp(-k));
              currentRotationRef.current = startRot - TOTAL_ARC * e;
              if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
              } else {
                animationRef.current = null;
              }
            };
            animationRef.current = requestAnimationFrame(animate);
            setTimeout(() => setEasterShake(false), 600);
          }}
        >
          <img src="/robots/darker logo.png" alt="Humanoid Index" draggable="false" className="object-contain" style={{ height: '22px' }} />
        </div>
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
          <img
            src="/robots/logo-0.png"
            alt="Humanoid Index"
            draggable="false"
            className="animate-logo-pulse object-contain"
            style={{ height: '60px' }}
          />
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
            <ViewSwitcher viewMode={viewMode} onViewModeChange={handleViewChange} width={trackWidth} />
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
            <ViewSwitcher viewMode={viewMode} onViewModeChange={handleViewChange} width={trackWidth} />
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
          className="flex-shrink-0 relative z-20 flex justify-center animate-slide-from-top"
          style={{ padding: `${topBarInset}px ${insetX}px` }}
        >
          <ViewSwitcher viewMode={viewMode} onViewModeChange={handleViewChange} width={trackWidth} />
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
                {/* Click-anywhere backdrop to dismiss enlarged card */}
                {enlargedHumanoid && (
                  <div
                    className="absolute inset-0 z-[999]"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setEnlargedHumanoid(null)}
                  />
                )}
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
                      onMouseEnter={() => {
                        if (!isDraggingRef.current && !enlargedHumanoid && humanoid.id !== '__intro__') {
                          setHoveredCarouselCard(humanoid);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredCarouselCard(prev => prev?.id === humanoid.id ? null : prev);
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
                        <HumanoidCard
                          humanoid={humanoid}
                          effectClass="distortion-wave"
                          isEnlarged={enlargedHumanoid?.id === humanoid.id}
                        />
                      </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating label — persistent container, text swaps */}
              {!isIntro && (
                <div
                  ref={labelRef}
                  className="absolute z-[60] pointer-events-none font-mono"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                >
                  <div className="text-[11px] leading-none tracking-wider uppercase px-3 py-1.5 rounded-full border border-neutral-200 whitespace-nowrap" style={{ color: 'rgba(0,0,0,0.5)' }}>
                    {(hoveredCarouselCard || currentHumanoid)?.name} <span style={{ color: 'rgba(0,0,0,0.2)' }}>&middot;</span> {(hoveredCarouselCard || currentHumanoid)?.manufacturer}
                  </div>
                </div>
              )}


            </main>
          ) : (
            <main>
              <GridView
                humanoids={humanoids}
                layoutConfig={layoutConfig}
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
              <div className="flex-shrink-0 relative z-20 flex justify-center pt-2 pb-3 animate-slide-from-bottom transition-all duration-500 ease-out" style={{
                opacity: enlargedHumanoid ? 0.3 : 1,
              }}>
                <div
                  ref={minimapRef}
                  className="relative cursor-pointer select-none transition-transform duration-300 ease-out"
                  style={{
                    width: `${MINI_RX * 2 + 16}px`,
                    height: `${MINI_RY * 2 + 16}px`,
                  }}
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
                    let idxDiff = i - currentIndex;
                    idxDiff = idxDiff - Math.round(idxDiff / N_CARDS) * N_CARDS;
                    const ang = idxDiff * (360 / N_CARDS); // evenly spaced on minimap
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

          {/* Spacebar hint — under minimap, always mounted to preserve layout */}
          {viewMode === 'carousel' && windowWidth >= 640 && (
            <div className="flex-shrink-0 flex justify-center pointer-events-none animate-slide-from-bottom transition-opacity duration-400 ease-out" style={{ opacity: enlargedHumanoid ? 0 : 1 }}>
              <div
                className="flex items-center rounded border"
                style={{
                  borderColor: 'rgba(0,0,0,0.12)',
                  padding: '2px 8px',
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{
                    color: 'rgba(0,0,0,0.25)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  space
                </span>
              </div>
            </div>
          )}

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


      {/* ═══ DEV CONTROLS — bottom-right corner (desktop only) ═══ */}
      {!showIntro && viewMode === 'carousel' && windowWidth >= 640 && (
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
            Tune
          </button>
          {showControls && (
            <div
              className="fixed z-[100] bg-white/90 backdrop-blur-sm border border-neutral-200 rounded-lg font-mono shadow-sm"
              style={{ bottom: '38px', right: '24px', width: '240px', padding: '12px 14px' }}
            >
              {/* Ring shape sliders */}
              <div className="text-[9px] uppercase tracking-wider text-neutral-300 mb-2">Ring</div>
              {([
                { label: 'Spread X', key: 'rx' as const, min: 100, max: 900 },
                { label: 'Spread Y', key: 'ry' as const, min: 30, max: 500 },
                { label: 'Offset Y', key: 'offsetY' as const, min: -300, max: 400 },
              ]).map(({ label, key, min, max }) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                    <span>{label}</span>
                    <span className="text-neutral-600">{Math.round(ellipseRef.current[key])}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={10}
                    value={ellipseRef.current[key]}
                    onChange={e => { ellipseRef.current[key] = +e.target.value; forceControls(n => n + 1); }}
                    className="w-full h-1 appearance-none bg-neutral-200 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-500"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between mb-3 pt-1 pb-2 border-b border-neutral-100">
                <span className="text-[10px] text-neutral-400">Direction</span>
                <button
                  onClick={() => { ellipseRef.current.flipY *= -1; forceControls(n => n + 1); }}
                  className="text-[10px] px-2 py-0.5 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
                >
                  {ellipseRef.current.flipY === -1 ? 'Front Top' : 'Front Bottom'}
                </button>
              </div>

              {/* Fade sliders */}
              <div className="text-[9px] uppercase tracking-wider text-neutral-300 mb-2">Fade</div>
              {([
                { label: 'Center', key: 'center' as const },
                { label: '±1 Card', key: 'near' as const },
                { label: '±2 Cards', key: 'mid' as const },
                { label: 'Far', key: 'far' as const },
              ]).map(({ label, key }) => (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-0.5">
                    <span>{label}</span>
                    <span className="text-neutral-600">{fadeRef.current[key].toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={fadeRef.current[key] * 100}
                    onChange={e => { fadeRef.current[key] = +e.target.value / 100; forceControls(n => n + 1); }}
                    className="w-full h-1 appearance-none bg-neutral-200 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-500"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
