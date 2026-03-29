"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { humanoids } from "@/data/humanoids";
import Image from "next/image";

const ALL_LAYOUTS = ["E", "V", "Z"] as const;
type Layout = (typeof ALL_LAYOUTS)[number];

const layoutLabels: Record<Layout, string> = {
  E: "Scroll",
  V: "Grid",
  Z: "Index",
};

// ─── Layout Switcher ────────────────────────────────────────────
function LayoutSwitcher({
  active,
  onChange,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-6 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        {/* Mark — abstract humanoid form */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.25 }}>
          <circle cx="10" cy="5" r="3" fill="#343433" />
          <rect x="7" y="9.5" width="6" height="8" rx="3" fill="#343433" />
        </svg>

        {/* View toggles — understated */}
        <div className="flex items-center gap-0.5">
          {ALL_LAYOUTS.map((l) => (
            <button
              key={l}
              onClick={() => onChange(l)}
              className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{
                color: active === l ? "#343433" : "#c4c4c4",
                fontWeight: active === l ? 500 : 400,
              }}
            >
              {layoutLabels[l]}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ─── Deterministic pseudo-random ────────────────────────────────
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ═══════════════════════════════════════════════════════════════
// Scroll presets + tuning
// ═══════════════════════════════════════════════════════════════
const SCROLL_PRESETS = {
  snappy:    { stiffness: 0.22, damping: 0.72, wheelThreshold: 20, label: "Snappy" },
  smooth:    { stiffness: 0.10, damping: 0.82, wheelThreshold: 35, label: "Smooth" },
  bouncy:    { stiffness: 0.18, damping: 0.65, wheelThreshold: 25, label: "Bouncy" },
  heavy:     { stiffness: 0.06, damping: 0.88, wheelThreshold: 40, label: "Heavy" },
  tight:     { stiffness: 0.25, damping: 0.80, wheelThreshold: 15, label: "Tight" },
  elastic:   { stiffness: 0.14, damping: 0.58, wheelThreshold: 30, label: "Elastic" },
  silk:      { stiffness: 0.08, damping: 0.90, wheelThreshold: 30, label: "Silk" },
  mechanical:{ stiffness: 0.30, damping: 0.85, wheelThreshold: 10, label: "Mechanical" },
} as const;
type PresetKey = keyof typeof SCROLL_PRESETS;

// ═══════════════════════════════════════════════════════════════
// BROWSE — Spring-physics scroll, robot is the hero
// ═══════════════════════════════════════════════════════════════
function Browse() {
  const [presetKey, setPresetKey] = useState<PresetKey>("smooth");
  const [customStiffness, setCustomStiffness] = useState(0.10);
  const [customDamping, setCustomDamping] = useState(0.42);
  const [customThreshold, setCustomThreshold] = useState(54);
  const [robotSquish, setRobotSquish] = useState(0.00);
  const [robotFade, setRobotFade] = useState(0.08);
  const [showTuner, setShowTuner] = useState(false);
  const [isCustom, setIsCustom] = useState(true);

  const stiffness = isCustom ? customStiffness : SCROLL_PRESETS[presetKey].stiffness;
  const damping = isCustom ? customDamping : SCROLL_PRESETS[presetKey].damping;
  const wheelThreshold = isCustom ? customThreshold : SCROLL_PRESETS[presetKey].wheelThreshold;

  // Refs for spring
  const stiffnessRef = useRef(stiffness);
  const dampingRef = useRef(damping);
  const thresholdRef = useRef(wheelThreshold);
  const squishRef = useRef(robotSquish);
  const fadeRef = useRef(robotFade);
  stiffnessRef.current = stiffness;
  dampingRef.current = damping;
  thresholdRef.current = wheelThreshold;
  squishRef.current = robotSquish;
  fadeRef.current = robotFade;

  const targetRef = useRef(0);
  const posRef = useRef(0);
  const velRef = useRef(0);
  const [pos, setPos] = useState(0);
  const [settled, setSettled] = useState(true);
  const rafRef = useRef<number>(0);

  const index = Math.max(0, Math.min(humanoids.length - 1, Math.round(pos)));

  const tick = useCallback(() => {
    const target = targetRef.current;
    const force = (target - posRef.current) * stiffnessRef.current;
    velRef.current = (velRef.current + force) * dampingRef.current;
    posRef.current += velRef.current;

    if (Math.abs(posRef.current - target) < 0.001 && Math.abs(velRef.current) < 0.001) {
      posRef.current = target;
      velRef.current = 0;
      setPos(target);
      setSettled(true);
      rafRef.current = 0;
      return;
    }

    setPos(posRef.current);
    setSettled(false);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startSpring = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const go = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(humanoids.length - 1, targetRef.current + delta));
    if (next === targetRef.current) return;
    targetRef.current = next;
    setSettled(false);
    startSpring();
  }, [startSpring]);

  useEffect(() => {
    // Reset spring state on mount
    posRef.current = targetRef.current;
    velRef.current = 0;
    setPos(targetRef.current);
    rafRef.current = 0;
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
  }, []);

  // Input
  useEffect(() => {
    let acc = 0;
    let decay: ReturnType<typeof setTimeout>;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      clearTimeout(decay);
      decay = setTimeout(() => { acc = 0; }, 150);
      if (Math.abs(acc) > thresholdRef.current) { go(acc > 0 ? 1 : -1); acc = 0; }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); clearTimeout(decay); };
  }, [go]);

  const applyPreset = (key: PresetKey) => {
    setPresetKey(key);
    setIsCustom(false);
    const p = SCROLL_PRESETS[key];
    setCustomStiffness(p.stiffness);
    setCustomDamping(p.damping);
    setCustomThreshold(p.wheelThreshold);
  };

  const h = humanoids[index];

  const stats = [
    h.height && { label: "Height", value: `${h.height} cm` },
    h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` },
    h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];

  // Arc geometry
  const arcRadius = 480;
  const arcOffset = 50;
  const visibleRange = 3; // items visible above/below

  const getArcPos = (offset: number) => {
    const angleRad = (offset * 10 * Math.PI) / 180;
    const x = (-arcRadius + arcOffset) + arcRadius * Math.cos(angleRad);
    const y = arcRadius * Math.sin(angleRad);
    return { x, y };
  };

  // Build visible items based on continuous position
  const visibleItems: { itemIndex: number; offset: number }[] = [];
  const floorPos = Math.floor(pos);
  for (let i = floorPos - visibleRange; i <= floorPos + visibleRange + 1; i++) {
    if (i >= 0 && i < humanoids.length) {
      visibleItems.push({ itemIndex: i, offset: i - pos });
    }
  }

  // Robot microinteractions — respond to spring motion
  const distFromTarget = Math.abs(pos - targetRef.current);
  const robotScale = 1 - distFromTarget * squishRef.current;
  const robotOpacity = 1 - distFromTarget * fadeRef.current;

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white">
      {/* Arc line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <circle cx={-arcRadius + arcOffset} cy="50%" r={arcRadius} fill="none" stroke="currentColor" className="text-neutral-100" strokeWidth="1" />
      </svg>

      {/* Arc — just dots and numbers, nothing else */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {visibleItems.map(({ itemIndex, offset }) => {
          const absOffset = Math.abs(offset);
          const arcPos = getArcPos(offset);
          const t = Math.min(absOffset, 1);
          const dotSize = 3 + (1 - t) * 3;
          const fontSize = 24 + (1 - t) * 10;
          const opacity = absOffset < 0.1 ? 1 : Math.max(0, 0.4 - absOffset * 0.1);

          return (
            <div
              key={itemIndex}
              className="absolute flex items-center gap-2.5 cursor-pointer"
              style={{
                left: `${arcPos.x}px`,
                top: `calc(50% + ${arcPos.y}px)`,
                transform: "translateY(-50%)",
                opacity,
                willChange: "transform, opacity",
              }}
              onClick={() => {
                targetRef.current = itemIndex;
                setSettled(false);
                if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
              }}
            >
              <div
                className="rounded-full flex-shrink-0"
                style={{ width: dotSize, height: dotSize, opacity: 0.2 + (1 - t) * 0.8, background: "#343433" }}
              />
              <span
                className="tabular-nums font-medium"
                style={{
                  fontSize, letterSpacing: "-0.04em", lineHeight: 1,
                  fontStyle: t > 0.5 ? "italic" : "normal",
                  opacity: 0.2 + (1 - t) * 0.8,
                  color: "#343433",
                }}
              >
                {String(itemIndex).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>

      {/* Robot — top half, rising from bottom */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
        <div
          key={index}
          className="absolute"
          style={{
            left: "42%", top: "20%", width: "48%", height: "160%", maxWidth: 560,
            transform: `scale(${robotScale})`,
            opacity: Math.max(0.5, robotOpacity),
            willChange: "transform, opacity",
          }}
        >
          <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain object-top" sizes="48vw" priority />
        </div>
      </div>

      {/* Info — bottom left */}
      <div className="absolute bottom-8 left-8 md:left-10" style={{ zIndex: 2 }}>
        <div key={index} className="animate-arc-text">
          <h2 className="text-[20px] font-semibold" style={{ letterSpacing: "-0.02em", color: "#343433" }}>{h.name}</h2>
          <p className="text-[12px] mt-1" style={{ color: "#747484" }}>
            {h.manufacturer}{h.year ? ` · ${h.year}` : ""}
          </p>
          {stats.length > 0 && (
            <div className="flex items-center gap-4 mt-3">
              {stats.map((s) => (
                <span key={s.label} className="text-[11px] tabular-nums" style={{ color: "#747484" }}>
                  <span style={{ color: "#494440", fontWeight: 500 }}>{s.value}</span> {s.label.toLowerCase()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Counter — bottom right */}
      <div className="absolute bottom-8 right-8" style={{ zIndex: 2 }}>
        <span className="text-[11px] tracking-widest tabular-nums" style={{ color: "#c4c4c4" }}>
          {String(index + 1).padStart(2, "0")} / {String(humanoids.length).padStart(2, "0")}
        </span>
      </div>

      {/* Tuner toggle */}
      <button
        className="absolute top-20 right-5 z-50 text-[11px] text-neutral-300 hover:text-neutral-500 cursor-pointer transition-colors"
        onClick={() => setShowTuner(!showTuner)}
      >
        {showTuner ? "Close" : "Tune"}
      </button>

      {/* Tuner panel */}
      {showTuner && (
        <div className="absolute top-28 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-5">
          {/* Presets */}
          <div>
            <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SCROLL_PRESETS) as PresetKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all ${
                    presetKey === key && !isCustom
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {SCROLL_PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[10px] tracking-widest uppercase text-neutral-400">Fine Tune</p>
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">
                Stiffness <span className="tabular-nums text-neutral-400">{(isCustom ? customStiffness : stiffness).toFixed(2)}</span>
              </label>
              <input type="range" min={2} max={40} value={Math.round((isCustom ? customStiffness : stiffness) * 100)} onChange={(e) => { setCustomStiffness(Number(e.target.value) / 100); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">
                Damping <span className="tabular-nums text-neutral-400">{(isCustom ? customDamping : damping).toFixed(2)}</span>
              </label>
              <input type="range" min={40} max={95} value={Math.round((isCustom ? customDamping : damping) * 100)} onChange={(e) => { setCustomDamping(Number(e.target.value) / 100); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">
                Wheel sensitivity <span className="tabular-nums text-neutral-400">{isCustom ? customThreshold : wheelThreshold}</span>
              </label>
              <input type="range" min={5} max={60} value={isCustom ? customThreshold : wheelThreshold} onChange={(e) => { setCustomThreshold(Number(e.target.value)); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>

          {/* Microinteractions */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[10px] tracking-widest uppercase text-neutral-400">Microinteractions</p>
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">
                Robot squish <span className="tabular-nums text-neutral-400">{robotSquish.toFixed(2)}</span>
              </label>
              <input type="range" min={0} max={15} value={Math.round(robotSquish * 100)} onChange={(e) => setRobotSquish(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">
                Robot fade <span className="tabular-nums text-neutral-400">{robotFade.toFixed(2)}</span>
              </label>
              <input type="range" min={0} max={60} value={Math.round(robotFade * 100)} onChange={(e) => setRobotFade(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>

          {isCustom && (
            <p className="text-[9px] text-neutral-400 pt-1 border-t border-neutral-100 tabular-nums">
              Custom: s={customStiffness.toFixed(2)} d={customDamping.toFixed(2)} t={customThreshold}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GRID — Clean cards on neutral backgrounds
// ═══════════════════════════════════════════════════════════════
function Grid() {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen overflow-y-auto scrollbar-hide select-none">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 max-w-[1400px] mx-auto pt-16">
        {humanoids.map((h, idx) => {
          const isSelected = selected === idx;
          return (
            <div
              key={h.id}
              className="group relative rounded-3xl overflow-hidden cursor-pointer aspect-square"
              style={{
                background: "#F7F7F7",
                opacity: selected !== null && !isSelected ? 0.4 : 1,
                transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => setSelected(isSelected ? null : idx)}
            >
              {/* Robot image — centered */}
              <div className="absolute inset-0 flex items-center justify-center p-10 md:p-14">
                <div className="relative w-full h-full">
                  <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="(max-width: 768px) 50vw, 33vw" />
                </div>
              </div>

              {/* Index number — swoops in from top */}
              <div
                className="absolute top-5 left-0 right-0 -translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out text-center"
              >
                <span className="text-[11px] tabular-nums text-neutral-400">{String(idx + 1).padStart(2, "0")}</span>
              </div>

              {/* Name + manufacturer — swoops in from bottom */}
              <div
                className="absolute bottom-5 left-0 right-0 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out text-center"
              >
                <p className="text-[14px] font-medium text-neutral-800" style={{ letterSpacing: "-0.02em" }}>{h.name}</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">{h.manufacturer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INDEX — Minimal text list
// ═══════════════════════════════════════════════════════════════
function TextIndex() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mouseY, setMouseY] = useState(0);

  return (
    <div className="min-h-screen overflow-y-auto scrollbar-hide select-none relative" onMouseMove={(e) => setMouseY(e.clientY)}>
      <div className="max-w-[640px] mx-auto pt-24 pb-16 px-6 md:px-10">
        <p className="text-[12px] text-neutral-400 mb-10">
          {humanoids.length} humanoids
        </p>
        {humanoids.map((h, i) => (
          <div
            key={h.id}
            className="border-b border-neutral-100 py-4 cursor-pointer flex items-baseline gap-4 transition-colors"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-[11px] tabular-nums text-neutral-300 w-5">{String(i + 1).padStart(2, "0")}</span>
            <span
              className={`text-[15px] transition-colors duration-200 ${hovered === i ? "text-neutral-900 font-medium" : "text-neutral-500"}`}
              style={{ letterSpacing: "-0.02em" }}
            >
              {h.name}
            </span>
            <span className="text-[11px] text-neutral-300 ml-auto">{h.manufacturer}</span>
          </div>
        ))}
      </div>
      {/* Floating image */}
      {hovered !== null && (
        <div className="fixed pointer-events-none z-50 animate-blur-fade" style={{ right: "10%", top: mouseY - 140 }}>
          <div className="relative w-[200px] h-[280px]">
            <Image src={humanoids[hovered].imageUrl || "/robots/placeholder.png"} alt={humanoids[hovered].name} fill className="object-contain" sizes="200px" />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const [layout, setLayout] = useState<Layout>("E");

  return (
    <main className="min-h-screen bg-white">
      <LayoutSwitcher active={layout} onChange={setLayout} />

      {layout === "E" && <Browse />}
      {layout === "V" && <Grid />}
      {layout === "Z" && <TextIndex />}
    </main>
  );
}
