"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { humanoids } from "@/data/humanoids";
import Image from "next/image";
import EllipticalCarousel from "@/components/carousel/EllipticalCarousel";

function PlaceholderLogo({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className ?? ""}`}>
      <svg width="280" height="280" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.045 }}>
        <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
        <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
      </svg>
    </div>
  );
}

const ALL_LAYOUTS = ["E", "Z"] as const;
type Layout = (typeof ALL_LAYOUTS)[number];

const layoutLabels: Record<Layout, string> = {
  E: "Scroll",
  Z: "Index",
};


// ─── Nav Styles ─────────────────────────────────────────────────
const NAV_STYLES = ["floating", "pill", "underline", "bordered", "minimal", "solid"] as const;
type NavStyle = (typeof NAV_STYLES)[number];

// ─── Layout Switcher ────────────────────────────────────────────
function LayoutSwitcher({
  active,
  onChange,
  navStyle,
  onNavStyleChange,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  navStyle: NavStyle;
  onNavStyleChange: (s: NavStyle) => void;
}) {
  const cycleNavStyle = (e: React.MouseEvent) => {
    e.preventDefault();
    const idx = NAV_STYLES.indexOf(navStyle);
    onNavStyleChange(NAV_STYLES[(idx + 1) % NAV_STYLES.length]);
  };

  // ── Mark logo (shared) ──
  const mark = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.25 }} className="cursor-pointer" onClick={() => onChange("E" as Layout)} onContextMenu={cycleNavStyle}>
      <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
      <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
    </svg>
  );

  // ── Style: floating (original — island with border) ──
  if (navStyle === "floating") return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-5 px-6 pointer-events-none">
      <div className="flex items-center justify-between pointer-events-auto px-5 py-2.5 rounded-sm border border-neutral-200/60 mx-auto" style={{ maxWidth: 1052, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
          {mark}
          <div className="flex items-center gap-0.5">
            {ALL_LAYOUTS.map((l) => (
              <button key={l} onClick={() => onChange(l)}
                className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
                style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
                {layoutLabels[l]}
              </button>
            ))}
  
          </div>
        </div>
      </nav>
  );

  const frost = { background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } as React.CSSProperties;

  // ── Style: pill — rounded capsule, tinted active state ──
  if (navStyle === "pill") return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto px-2 py-1.5 rounded-full" style={frost}>
        <div className="pl-2">{mark}</div>
        <div className="flex items-center gap-1">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-3 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer rounded-full"
              style={{
                color: active === l ? "#fff" : "#999",
                background: active === l ? "var(--c-ink)" : "transparent",
                fontWeight: active === l ? 500 : 400,
              }}>
              {layoutLabels[l]}
            </button>
          ))}

        </div>
      </div>
    </nav>
  );

  // ── Style: underline — clean text with active underline ──
  if (navStyle === "underline") return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-6 pointer-events-auto px-4 py-2 rounded-sm" style={frost}>
        {mark}
        <div className="flex items-center gap-4">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="relative px-1 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
              {layoutLabels[l]}
              {active === l && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-neutral-800 rounded-full" />}
            </button>
          ))}

        </div>
      </div>
    </nav>
  );

  // ── Style: bordered — full-width top bar with bottom border ──
  if (navStyle === "bordered") return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/60 pointer-events-auto" style={frost}>
      <div className="flex items-center justify-between max-w-[1100px] mx-auto px-6 py-3">
        {mark}
        <div className="flex items-center gap-1">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-3 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
              {layoutLabels[l]}
            </button>
          ))}

        </div>
        <div className="w-5" /> {/* balance spacer */}
      </div>
    </nav>
  );

  // ── Style: minimal — just text, no container, no border ──
  if (navStyle === "minimal") return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-6 pointer-events-none">
      <div className="flex items-center gap-5 pointer-events-auto px-4 py-2 rounded-sm" style={frost}>
        {mark}
        <div className="flex items-center gap-3">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-1 py-0.5 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{ color: active === l ? "var(--c-ink)" : "#d4d4d4", fontWeight: active === l ? 600 : 400 }}>
              {layoutLabels[l]}
            </button>
          ))}

        </div>
      </div>
    </nav>
  );

  // ── Style: solid — dark bar, inverted text ──
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto px-5 py-2 rounded-sm" style={{ background: "rgba(23,23,23,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.4 }} className="cursor-pointer" onContextMenu={cycleNavStyle}>
          <circle cx="10" cy="5" r="3" fill="#fff" />
          <rect x="7" y="9.5" width="6" height="8" rx="3" fill="#fff" />
        </svg>
        <div className="flex items-center gap-0.5">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{ color: active === l ? "#fff" : "#666", fontWeight: active === l ? 500 : 400 }}>
              {layoutLabels[l]}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
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
// Spring hook — reusable for each scroll side
// ═══════════════════════════════════════════════════════════════
function useSpring(s: number, d: number) {
  const sRef = useRef(s); sRef.current = s;
  const dRef = useRef(d); dRef.current = d;
  const targetRef = useRef(0);
  const posRef = useRef(0);
  const velRef = useRef(0);
  const nudgeRef = useRef(0);
  const [pos, setPos] = useState(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const force = (targetRef.current - posRef.current) * sRef.current;
    velRef.current = (velRef.current + force) * dRef.current;
    posRef.current += velRef.current;

    // Decay elastic nudge
    nudgeRef.current *= 0.85;
    if (Math.abs(nudgeRef.current) < 0.001) nudgeRef.current = 0;

    const settled = Math.abs(posRef.current - targetRef.current) < 0.001 && Math.abs(velRef.current) < 0.001;
    if (settled && nudgeRef.current === 0) {
      posRef.current = targetRef.current; velRef.current = 0;
      setPos(targetRef.current); rafRef.current = 0; return;
    }
    setPos(posRef.current + nudgeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => { if (rafRef.current) return; rafRef.current = requestAnimationFrame(tick); }, [tick]);

  const go = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(humanoids.length - 1, targetRef.current + delta));
    if (next === targetRef.current) return;
    targetRef.current = next; start();
  }, [start]);

  const nudge = useCallback((amount: number) => {
    nudgeRef.current = Math.max(-0.15, Math.min(0.15, nudgeRef.current + amount));
    start();
  }, [start]);

  const jumpTo = useCallback((idx: number) => { targetRef.current = Math.max(0, Math.min(humanoids.length - 1, idx)); start(); }, [start]);

  useEffect(() => {
    posRef.current = targetRef.current; velRef.current = 0; nudgeRef.current = 0;
    setPos(targetRef.current); rafRef.current = 0;
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } };
  }, []);

  const index = Math.max(0, Math.min(humanoids.length - 1, Math.round(pos)));
  return { pos, index, go, nudge, jumpTo, targetRef };
}

// ═══════════════════════════════════════════════════════════════
// Arc styles
// ═══════════════════════════════════════════════════════════════
const ARC_STYLES = [
  // core
  "crown", "pills", "classic", "ticks", "minimal",
  // pill + number hybrids
  "h-clean", "h-stacked", "h-reveal", "h-flush", "h-mono",
  "h-light", "h-bold", "h-spaced", "h-underline", "h-tag",
] as const;
type ArcStyle = (typeof ARC_STYLES)[number];
const arcStyleLabels: Record<ArcStyle, string> = {
  crown: "Crown", pills: "Pills", classic: "Classic", ticks: "Ticks", minimal: "Minimal",
  "h-clean": "Clean", "h-stacked": "Stacked", "h-reveal": "Reveal", "h-flush": "Flush", "h-mono": "Mono",
  "h-light": "Light", "h-bold": "Bold", "h-spaced": "Spaced", "h-underline": "Underline", "h-tag": "Tag",
};

// ═══════════════════════════════════════════════════════════════
// Arc renderer — multiple visual styles along a translucent curved track
// ═══════════════════════════════════════════════════════════════
function ArcDots({ pos, mirrored, onClickItem, dimmed, variant = "pills", drumAngle: dAngle = 18, drumRadius: dRadius = 152, drumFsMax: dFsMax = 20, drumFsMin: dFsMin = 8, drumFwMax: dFwMax = 500, drumCompression: dComp = 0.59, drumOpPower: dOpPow = 4.0, drumXOffset: dXOff = 120, drumTracking: dTrack = 0.04, drumRange: dRange = 2, drumMaskFade: dMaskFade = 35 }: { pos: number; mirrored?: boolean; onClickItem: (idx: number) => void; dimmed?: boolean; variant?: ArcStyle; drumAngle?: number; drumRadius?: number; drumFsMax?: number; drumFsMin?: number; drumFwMax?: number; drumCompression?: number; drumOpPower?: number; drumXOffset?: number; drumTracking?: number; drumRange?: number; drumMaskFade?: number }) {
  const R = 300, off = 30, range = variant === "crown" ? dRange : 2;
  const cx = -R + off;
  const getP = (o: number) => {
    const a = (o * 8 * Math.PI) / 180;
    return { x: cx + R * Math.cos(a), y: R * Math.sin(a) };
  };
  const items: { i: number; o: number }[] = [];
  const f = Math.floor(pos);
  for (let n = f - range; n <= f + range + 1; n++) if (n >= 0 && n < humanoids.length) items.push({ i: n, o: n - pos });

  const sid = mirrored ? "r" : "l";
  const noTrack = true;

  const track = (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <filter id={`ts-${sid}`}>
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.04" />
        </filter>
      </defs>
      {noTrack ? (
        variant !== "minimal" && variant !== "crown" && <circle cx={cx} cy="50%" r={R} fill="none" stroke="#e8e8e8" strokeWidth="1" style={{ opacity: dimmed ? 0.3 : 1 }} />
      ) : (
        <circle cx={cx} cy="50%" r={R} fill="none" stroke="rgba(243,243,243,0.85)" strokeWidth={variant === "ticks" ? 44 : 38} filter={`url(#ts-${sid})`} style={{ opacity: dimmed ? 0.3 : 1 }} />
      )}
    </svg>
  );

  const renderItem = (i: number, o: number) => {
    const abs = Math.abs(o), p = getP(o), t = Math.min(abs, 1);
    const angleDeg = o * 10;
    const isActive = abs < 0.15;
    const bOp = dimmed ? 0.35 : 1;
    const ap = { left: `${p.x}px`, top: `calc(50% + ${p.y}px)` };
    const cr = { ...ap, transform: `translate(-50%, -50%) rotate(${angleDeg}deg)` };
    const co = { ...ap, transform: "translateY(-50%)" };
    const num = String(i).padStart(2, "0");
    const flip = mirrored ? "scaleX(-1)" : undefined;

    // ── crown: physical drum wheel ──
    if (variant === "crown") {
      const drumDeg = o * dAngle;
      const drumRad = drumDeg * Math.PI / 180;
      const drumY = Math.sin(drumRad) * dRadius;
      const drumZ = Math.cos(drumRad);
      if (drumZ <= 0.01) return <div key={i} />;
      const fsRange = dFsMax - dFsMin;
      const fs = dFsMin + drumZ * fsRange;
      const fw = drumZ > 0.94 ? dFwMax : drumZ > 0.7 ? Math.min(dFwMax, 500) : 400;
      const op = Math.pow(Math.max(0, drumZ), dOpPow) * bOp;
      const color = drumZ > 0.94 ? "#1d1d1f" : `rgba(29,29,31,${0.15 + drumZ * 0.35})`;
      const compMin = dComp;
      return (<div key={i} className="absolute cursor-pointer" style={{ left: dXOff + 14, top: `calc(50% + ${drumY}px)`, transform: `translateY(-50%) scaleY(${compMin + drumZ * (1 - compMin)})`, opacity: op }} onClick={() => onClickItem(i)}>
        <span className="tabular-nums" style={{ fontSize: fs, fontWeight: fw, lineHeight: 1, color, letterSpacing: `${dTrack}em` }}>{num}</span>
      </div>);
    }
    // ── pills (no text) ──
    if (variant === "pills") {
      const op = (isActive ? 1 : Math.max(0.3, 0.65 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 6 : 4, height: isActive ? 24 : 12 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── classic (original dot + italic number) ──
    if (variant === "classic") {
      const dot = 3 + (1 - t) * 3, fs = 24 + (1 - t) * 10;
      const op = (abs < 0.1 ? 1 : Math.max(0, 0.4 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute flex items-center gap-2.5 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div className="rounded-full flex-shrink-0" style={{ width: dot, height: dot, opacity: 0.2 + (1 - t) * 0.8, background: "var(--c-ink)" }} />
        <span className="tabular-nums font-medium" style={{ fontSize: fs, letterSpacing: "-0.04em", lineHeight: 1, fontStyle: t > 0.5 ? "italic" : "normal", opacity: 0.2 + (1 - t) * 0.8, color: "var(--c-ink)", transform: flip }}>{num}</span>
      </div>);
    }
    // ── ticks (gauge notches, no text) ──
    if (variant === "ticks") {
      const op = (isActive ? 1 : Math.max(0.25, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 20 : 10 + (1 - t) * 4, height: isActive ? 5 : 3, borderRadius: 99, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── minimal (single dot, no track) ──
    if (variant === "minimal") {
      if (!isActive) return <div key={i} />;
      return (<div key={i} className="absolute" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: bOp }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#222" }} />
      </div>);
    }

    // ════════════════════════════════════════════════════════════
    // PILL + NUMBER HYBRIDS
    // ════════════════════════════════════════════════════════════

    // ── h-clean: pill left, number right, uniform weight, gentle fade ──
    if (variant === "h-clean") {
      const op = (isActive ? 1 : Math.max(0.08, 0.5 - abs * 0.14)) * bOp;
      const fs = isActive ? 26 : 14 + (1 - t) * 4;
      return (<div key={i} className="absolute flex items-center gap-3 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 5 : 3, height: isActive ? 20 : 10 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#333" : "#c0c0c0", transform: `rotate(${angleDeg}deg)` }} />
        <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.03em", lineHeight: 1, color: isActive ? "#333" : "#c0c0c0", fontWeight: isActive ? 500 : 400, transform: flip }}>{num}</span>
      </div>);
    }
    // ── h-stacked: number above pill, vertically centered ──
    if (variant === "h-stacked") {
      const op = (isActive ? 1 : Math.max(0.08, 0.45 - abs * 0.12)) * bOp;
      const fs = isActive ? 18 : 10 + (1 - t) * 3;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div className="flex flex-col items-center gap-1.5">
          <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.02em", lineHeight: 1, color: isActive ? "#333" : "#bbb", fontWeight: isActive ? 600 : 400, transform: flip, display: "inline-block" }}>{num}</span>
          <div style={{ width: isActive ? 5 : 3, height: isActive ? 14 : 6 + (1 - t) * 3, borderRadius: 99, background: isActive ? "#333" : "#c5c5c5", transform: `rotate(${angleDeg}deg)` }} />
        </div>
      </div>);
    }
    // ── h-reveal: pills only, number fades in near active ──
    if (variant === "h-reveal") {
      const op = (isActive ? 1 : Math.max(0.25, 0.6 - abs * 0.12)) * bOp;
      const showNum = abs < 0.6;
      const numOp = showNum ? Math.max(0, 1 - abs * 2.5) : 0;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: isActive ? 6 : 4, height: isActive ? 22 : 10 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#222" : "#aaa", transform: `rotate(${angleDeg}deg)` }} />
          {showNum && <span className="tabular-nums" style={{ fontSize: isActive ? 24 : 16, letterSpacing: "-0.04em", lineHeight: 1, color: "#333", fontWeight: 500, opacity: numOp, transform: flip, display: "inline-block", whiteSpace: "nowrap" }}>{num}</span>}
        </div>
      </div>);
    }
    // ── h-flush: number flush against pill, tight spacing ──
    if (variant === "h-flush") {
      const op = (isActive ? 1 : Math.max(0.06, 0.4 - abs * 0.1)) * bOp;
      const fs = isActive ? 22 : 12 + (1 - t) * 4;
      return (<div key={i} className="absolute flex items-center cursor-pointer" style={{ ...co, opacity: op, gap: isActive ? 6 : 4 }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 4 : 2.5, height: isActive ? 18 : 8 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#222" : "#ccc", transform: `rotate(${angleDeg}deg)` }} />
        <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.06em", lineHeight: 1, color: isActive ? "#222" : "#ccc", fontWeight: isActive ? 600 : 300, transform: flip }}>{num}</span>
      </div>);
    }
    // ── h-mono: monospace font, pill as cursor/caret ──
    if (variant === "h-mono") {
      const op = (isActive ? 1 : Math.max(0.08, 0.45 - abs * 0.1)) * bOp;
      const fs = isActive ? 20 : 12 + (1 - t) * 3;
      return (<div key={i} className="absolute flex items-center gap-2 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 3 : 2, height: isActive ? 20 : 10 + (1 - t) * 3, borderRadius: 1, background: isActive ? "#222" : "#ccc" }} />
        <span className="font-mono tabular-nums" style={{ fontSize: fs, lineHeight: 1, color: isActive ? "#222" : "#bbb", fontWeight: isActive ? 600 : 400, letterSpacing: "0.02em", transform: flip }}>{num}</span>
      </div>);
    }
    // ── h-light: ultra-thin pill, light font weight, airy ──
    if (variant === "h-light") {
      const op = (isActive ? 1 : Math.max(0.1, 0.5 - abs * 0.13)) * bOp;
      const fs = isActive ? 28 : 16 + (1 - t) * 5;
      return (<div key={i} className="absolute flex items-center gap-3.5 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 2 : 1.5, height: isActive ? 26 : 12 + (1 - t) * 5, borderRadius: 99, background: isActive ? "#555" : "#d0d0d0", transform: `rotate(${angleDeg}deg)` }} />
        <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.03em", lineHeight: 1, color: isActive ? "#555" : "#d0d0d0", fontWeight: isActive ? 300 : 200, transform: flip }}>{num}</span>
      </div>);
    }
    // ── h-bold: heavy pill, heavy number, high contrast ──
    if (variant === "h-bold") {
      const op = (isActive ? 1 : Math.max(0.1, 0.5 - abs * 0.12)) * bOp;
      const fs = isActive ? 32 : 16 + (1 - t) * 6;
      return (<div key={i} className="absolute flex items-center gap-2.5 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 7 : 4, height: isActive ? 26 : 12 + (1 - t) * 5, borderRadius: 99, background: isActive ? "#111" : "#999", transform: `rotate(${angleDeg}deg)` }} />
        <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.05em", lineHeight: 1, color: isActive ? "#111" : "#999", fontWeight: isActive ? 800 : 500, transform: flip }}>{num}</span>
      </div>);
    }
    // ── h-spaced: wide letter-spacing, editorial feel ──
    if (variant === "h-spaced") {
      const op = (isActive ? 1 : Math.max(0.06, 0.42 - abs * 0.1)) * bOp;
      const fs = isActive ? 16 : 9 + (1 - t) * 3;
      return (<div key={i} className="absolute flex items-center gap-2 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 4 : 3, height: isActive ? 16 : 8 + (1 - t) * 3, borderRadius: 99, background: isActive ? "#333" : "#c5c5c5", transform: `rotate(${angleDeg}deg)` }} />
        <span className="tabular-nums uppercase" style={{ fontSize: fs, letterSpacing: "0.2em", lineHeight: 1, color: isActive ? "#333" : "#c5c5c5", fontWeight: isActive ? 500 : 400, transform: flip }}>{num}</span>
      </div>);
    }
    // ── h-underline: number with thin line underneath ──
    if (variant === "h-underline") {
      const op = (isActive ? 1 : Math.max(0.06, 0.42 - abs * 0.1)) * bOp;
      const fs = isActive ? 24 : 13 + (1 - t) * 4;
      return (<div key={i} className="absolute flex items-center gap-3 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 4 : 2.5, height: isActive ? 18 : 8 + (1 - t) * 3, borderRadius: 99, background: isActive ? "#333" : "#ccc", transform: `rotate(${angleDeg}deg)` }} />
        <div className="flex flex-col" style={{ gap: isActive ? 3 : 2 }}>
          <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.03em", lineHeight: 1, color: isActive ? "#333" : "#ccc", fontWeight: isActive ? 500 : 400, transform: flip, display: "inline-block" }}>{num}</span>
          <div style={{ height: isActive ? 1.5 : 1, width: "100%", background: isActive ? "#333" : "#d5d5d5", borderRadius: 1 }} />
        </div>
      </div>);
    }
    // ── h-tag: number in a rounded tag/badge ──
    const op = (isActive ? 1 : Math.max(0.08, 0.45 - abs * 0.12)) * bOp;
    const fs = isActive ? 14 : 9 + (1 - t) * 2;
    return (<div key={i} className="absolute flex items-center gap-2 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
      <div style={{ width: isActive ? 4 : 2.5, height: isActive ? 16 : 8 + (1 - t) * 3, borderRadius: 99, background: isActive ? "#333" : "#ccc", transform: `rotate(${angleDeg}deg)` }} />
      <span className="tabular-nums" style={{ fontSize: fs, lineHeight: 1, color: isActive ? "#333" : "#c0c0c0", fontWeight: isActive ? 500 : 400, padding: isActive ? "4px 8px" : "2px 5px", borderRadius: 6, background: isActive ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)", transform: flip, display: "inline-block", whiteSpace: "nowrap" }}>{num}</span>
    </div>);
  };

  const content = (
    <>
      {track}
      {items.map(({ i, o }) => renderItem(i, o))}
    </>
  );

  const drumMask = variant === "crown" ? { maskImage: `linear-gradient(to bottom, transparent ${dMaskFade}%, black ${dMaskFade + 20}%, black 70%, transparent 90%)`, WebkitMaskImage: `linear-gradient(to bottom, transparent ${dMaskFade}%, black ${dMaskFade + 20}%, black 70%, transparent 90%)` } as React.CSSProperties : {};

  // Crown physical elements — static dashes + blued marker
  const crownElements = variant === "crown" ? (
    <>
      {/* Static dashed lines — fixed ruler markings */}
      {Array.from({ length: 21 }, (_, j) => {
        const y = (j - 10) * 12;
        const distFromCenter = Math.abs(j - 10);
        const isMajor = j % 5 === 0;
        const op = Math.max(0, 1 - distFromCenter * 0.09);
        return (
          <div key={j} className="absolute pointer-events-none" style={{
            left: dXOff,
            top: `calc(50% + ${y}px)`,
            width: isMajor ? 12 : 7,
            height: 1,
            background: `rgba(0,0,0,${isMajor ? 0.12 : 0.06})`,
            borderRadius: 1,
            opacity: op,
            transform: "translateY(-50%)",
          }} />
        );
      })}
      {/* Rail line */}
      <div className="absolute pointer-events-none" style={{
        left: dXOff, top: "15%", bottom: "15%", width: 1,
        background: "rgba(0,0,0,0.06)", borderRadius: 1,
      }} />
      {/* Fixed reading marker — warm brass triangle */}
      <div className="absolute pointer-events-none" style={{ left: dXOff - 12, top: "50%", transform: "translateY(-50%)" }}>
        <svg width="8" height="10" viewBox="0 0 8 10" fill="#8a7245" opacity="0.45">
          <polygon points="0,2.5 8,5 0,7.5" />
        </svg>
      </div>
    </>
  ) : null;

  // Enhanced depth mask for crown — stronger curve shading
  const crownDepth = variant === "crown" ? {
    maskImage: `linear-gradient(to bottom, transparent ${dMaskFade}%, black ${dMaskFade + 15}%, black 65%, transparent 88%)`,
    WebkitMaskImage: `linear-gradient(to bottom, transparent ${dMaskFade}%, black ${dMaskFade + 15}%, black 65%, transparent 88%)`,
  } as React.CSSProperties : drumMask;

  const finalMask = variant === "crown" ? crownDepth : drumMask;

  if (mirrored) {
    return <div className="absolute inset-0" style={{ transform: "scaleX(-1)", ...finalMask }}>{crownElements}{content}</div>;
  }
  return <div className="absolute inset-0" style={finalMask}>{crownElements}{content}</div>;
}

// ═══════════════════════════════════════════════════════════════
// Stat comparison
// ═══════════════════════════════════════════════════════════════
function StatCompare({ left, right }: { left: typeof humanoids[0]; right: typeof humanoids[0] }) {
  const keys: { key: keyof typeof left; label: string; unit: string }[] = [
    { key: "height", label: "Height", unit: "cm" }, { key: "weight", label: "Weight", unit: "kg" },
    { key: "dof", label: "DOF", unit: "" }, { key: "maxSpeed", label: "Speed", unit: "m/s" },
  ];
  const rows = keys.filter((k) => left[k.key] || right[k.key]);
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      {rows.map((k) => {
        const lv = (left[k.key] as number) || 0, rv = (right[k.key] as number) || 0;
        const w = lv > rv ? "left" : rv > lv ? "right" : "tie";
        return (
          <div key={k.key} className="flex items-baseline justify-between gap-6" style={{ minWidth: 200 }}>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "left" ? "var(--c-ink)" : "#c4c4c4" }}>{lv ? `${lv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
            <span className="text-[10px] tracking-widest uppercase" style={{ color: "#b4b4b4" }}>{k.label}</span>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "right" ? "var(--c-ink)" : "#c4c4c4" }}>{rv ? `${rv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPANDED VIEW — Editorial detail popover
// ═══════════════════════════════════════════════════════════════
function ExpandedView({ humanoid, onClose, onPrev, onNext }: {
  humanoid: typeof humanoids[0];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const h = humanoid;
  const idx = humanoids.findIndex((x) => x.id === h.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const specs = [
    h.status && { label: "Status", value: h.status },
    h.height && { label: "Height", value: `${h.height} cm` },
    h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` },
    h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(23,23,23,0.5)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-expand-in flex relative overflow-hidden"
        style={{
          width: "calc(100vw - 96px)",
          height: "calc(100vh - 96px)",
          maxWidth: 1200,
          maxHeight: 760,
          borderRadius: 10,
          background: "#f5f5f4",
          boxShadow: "0 40px 100px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        {/* Left — text content */}
        <div className="flex flex-col justify-between py-10 px-10" style={{ width: "42%", minWidth: 360 }}>
          <div className="flex items-center justify-between mb-10">
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-200"
              style={{ borderRadius: 6, background: "#ebebeb" }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
                <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-200"
                style={{ borderRadius: 6, background: "#ebebeb" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7.5,2 3.5,6 7.5,10" />
                </svg>
              </button>
              <span className="text-[10px] tabular-nums mx-1" style={{ color: "#a3a3a3" }}>
                {String(idx + 1).padStart(2, "0")}<span style={{ color: "#d4d4d4" }}>/</span>{String(humanoids.length).padStart(2, "0")}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-200"
                style={{ borderRadius: 6, background: "#ebebeb" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4.5,2 8.5,6 4.5,10" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="animate-expand-content" style={{ animationDelay: "0.1s" }}>
              <p className="text-[10px] tracking-widest uppercase font-medium mb-3" style={{ color: "#a3a3a3", letterSpacing: "0.08em" }}>
                {h.manufacturer}
              </p>
              <h2 className="text-[32px] font-medium leading-none" style={{ color: "#171717", letterSpacing: "-0.04em" }}>
                {h.name}
              </h2>
              {h.year && (
                <p className="text-[13px] mt-2.5" style={{ color: "#a3a3a3" }}>{h.year}</p>
              )}
            </div>

            <div className="animate-expand-content" style={{ animationDelay: "0.18s" }}>
              {h.description && (
                <p className="text-[13px] leading-relaxed mt-6" style={{ color: "#737373", maxWidth: 340 }}>
                  {h.description}
                </p>
              )}
            </div>

            <div className="animate-expand-content" style={{ animationDelay: "0.25s" }}>
              {h.cost && h.cost !== "N/A" && (
                <p className="text-[18px] font-medium mt-8" style={{ color: "#171717", letterSpacing: "-0.03em" }}>
                  {h.cost}
                </p>
              )}
              {h.purchaseUrl && (
                <a
                  href={h.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center mt-4 px-5 py-2 text-[11px] font-medium tracking-wide transition-colors hover:bg-neutral-800"
                  style={{ background: "#171717", color: "#fff", borderRadius: 6 }}
                >
                  Buy
                </a>
              )}
            </div>
          </div>

          <div className="animate-expand-content" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-start gap-8 pt-6" style={{ borderTop: "1px solid #e5e5e5" }}>
              {specs.map((s) => (
                <div key={s.label}>
                  <p className="text-[9px] tracking-widest uppercase" style={{ color: "#a3a3a3", letterSpacing: "0.1em" }}>
                    {s.label}
                  </p>
                  <p className="text-[13px] font-medium mt-1" style={{ color: "#262626" }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — robot image on slate surface */}
        <div
          className="flex-1 flex items-center justify-center relative"
          style={{ background: "#ececea", borderLeft: "1px solid #e5e5e5" }}
        >
          <div className="animate-expand-content relative" style={{ width: "75%", height: "75%", animationDelay: "0.08s" }}>
            {h.imageUrl ? <Image src={h.imageUrl} alt={h.name} fill className="object-contain" sizes="50vw" priority /> : <PlaceholderLogo />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BROWSE — Single + Compare
// ═══════════════════════════════════════════════════════════════
function Browse({ goToIndex }: { goToIndex?: number | null }) {
  const [presetKey, setPresetKey] = useState<PresetKey>("smooth");
  const [customStiffness, setCustomStiffness] = useState(0.10);
  const [customDamping, setCustomDamping] = useState(0.42);
  const [customThreshold, setCustomThreshold] = useState(54);
  const [robotSquish, setRobotSquish] = useState(0.00);
  const [robotFade, setRobotFade] = useState(0.08);
  const [bottomFadeH, setBottomFadeH] = useState(40);
  const [bottomFadeOpacity, setBottomFadeOpacity] = useState(0.9);
  const [showTuner, setShowTuner] = useState(false);
  const [isCustom, setIsCustom] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [splitHover, setSplitHover] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [arcStyle, setArcStyle] = useState<ArcStyle>("crown");

  // Crown drum config
  const [drumAngle, setDrumAngle] = useState(14);
  const [drumRadius, setDrumRadius] = useState(90);
  const [drumFsMax, setDrumFsMax] = useState(16);
  const [drumFsMin, setDrumFsMin] = useState(8);
  const [drumFwMax, setDrumFwMax] = useState(500);
  const [drumCompression, setDrumCompression] = useState(0.62);
  const [drumOpPower, setDrumOpPower] = useState(3.5);
  const [drumXOffset, setDrumXOffset] = useState(120);
  const [drumMaskFade, setDrumMaskFade] = useState(30);
  const [drumRange, setDrumRange] = useState(1);
  const [drumTracking, setDrumTracking] = useState(0.04);
  const [miniCrownRadius, setMiniCrownRadius] = useState(70);
  const [showStats, setShowStats] = useState(true);
  // Per-card gallery index: keyed by humanoid index
  const [galleryIdx, setGalleryIdx] = useState<Record<number, number>>({});
  const galleryScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [openStat, setOpenStat] = useState<string | null>(null);
  // Layout dimensions
  const [robotW, setRobotW] = useState(30);       // vw
  const [robotH, setRobotH] = useState(60);       // vh
  const [robotMaxW, setRobotMaxW] = useState(400); // px
  const [statsW, setStatsW] = useState(260);       // px
  const [cardGap, setCardGap] = useState(8);       // px
  const [cardRadius, setCardRadius] = useState(6);  // px

  const stiffness = isCustom ? customStiffness : SCROLL_PRESETS[presetKey].stiffness;
  const damping = isCustom ? customDamping : SCROLL_PRESETS[presetKey].damping;
  const wheelThreshold = isCustom ? customThreshold : SCROLL_PRESETS[presetKey].wheelThreshold;
  const thresholdRef = useRef(wheelThreshold); thresholdRef.current = wheelThreshold;

  const springL = useSpring(stiffness, damping);
  const springR = useSpring(stiffness, damping);
  const activeGo = comparing ? (activeSide === "left" ? springL.go : springR.go) : springL.go;

  // External navigation from chat
  useEffect(() => {
    if (goToIndex != null) springL.jumpTo(goToIndex);
  }, [goToIndex, springL.jumpTo]);

  // Wheel accumulators for each side
  const accL = useRef(0);
  const accR = useRef(0);
  const decayL = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decayR = useRef<ReturnType<typeof setTimeout> | null>(null);

  const makeWheelHandler = useCallback((go: (d: number) => void, acc: React.MutableRefObject<number>, decay: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    return (e: React.WheelEvent) => {
      e.preventDefault();
      acc.current += e.deltaY;
      if (decay.current) clearTimeout(decay.current);
      decay.current = setTimeout(() => { acc.current = 0; }, 150);
      if (Math.abs(acc.current) > thresholdRef.current) {
        go(acc.current > 0 ? 1 : -1);
        acc.current = 0;
      }
    };
  }, []);

  const onWheelLeft = makeWheelHandler(springL.go, accL, decayL);
  const onWheelRight = makeWheelHandler(springR.go, accR, decayR);

  // Global wheel — velocity-aware stepping + elastic pre-threshold feedback
  const activeSideRef = useRef(activeSide); activeSideRef.current = activeSide;
  const comparingRef = useRef(comparing); comparingRef.current = comparing;
  useEffect(() => {
    let acc = 0;
    let lastTime = 0;
    let velocity = 0;
    let decay: ReturnType<typeof setTimeout>;

    const route = (delta: number, nudgeAmt?: number) => {
      if (!comparingRef.current) {
        if (nudgeAmt !== undefined) springL.nudge(nudgeAmt);
        else springL.go(delta);
      } else {
        // handled per-side below
      }
    };

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-tuner]")) return;
      if ((e.target as HTMLElement)?.closest?.("[data-gallery-scroll]") && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      acc += e.deltaY;
      // Track velocity (pixels per ms, smoothed)
      if (dt > 0 && dt < 200) {
        velocity = velocity * 0.6 + (Math.abs(e.deltaY) / dt) * 0.4;
      }

      clearTimeout(decay);
      decay = setTimeout(() => { acc = 0; velocity = 0; }, 150);

      const thresh = thresholdRef.current;
      const ratio = Math.abs(acc) / thresh;

      if (ratio < 1) {
        // Pre-threshold: elastic nudge proportional to accumulation
        const nudgeAmt = (acc > 0 ? 1 : -1) * ratio * 0.02;
        if (!comparingRef.current) {
          springL.nudge(nudgeAmt);
        } else {
          const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
          if (side === "left") springL.nudge(nudgeAmt); else springR.nudge(nudgeAmt);
        }
        return;
      }

      // Threshold crossed — velocity determines step size
      const dir = acc > 0 ? 1 : -1;
      const steps = velocity > 3 ? 3 : velocity > 1.5 ? 2 : 1;
      if (!comparingRef.current) {
        springL.go(dir * steps);
      } else {
        const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
        if (side === "left") springL.go(dir * steps); else springR.go(dir * steps);
      }
      acc = 0;
      velocity = 0;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("wheel", onWheel); clearTimeout(decay); };
  }, [springL.go, springL.nudge, springR.go, springR.nudge]);

  // Keyboard — arrows control active side, tab switches, esc exits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && comparing) { e.preventDefault(); setActiveSide((s) => s === "left" ? "right" : "left"); return; }
      if (e.key === "Escape" && comparing) { setComparing(false); setActiveSide("left"); return; }
      if (e.key === "s") { setArcStyle((s) => ARC_STYLES[(ARC_STYLES.indexOf(s) + 1) % ARC_STYLES.length]); return; }
      if (e.key === "i") { setShowStats((s) => !s); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); activeGo(1); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); activeGo(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGo, comparing]);


  const applyPreset = (key: PresetKey) => { setPresetKey(key); setIsCustom(false); const p = SCROLL_PRESETS[key]; setCustomStiffness(p.stiffness); setCustomDamping(p.damping); setCustomThreshold(p.wheelThreshold); };
  const enterCompare = () => { springR.jumpTo(springL.index < humanoids.length - 1 ? springL.index + 1 : 0); setComparing(true); setActiveSide("right"); };
  const exitCompare = () => { setComparing(false); setActiveSide("left"); setSplitHover(false); };

  const hL = humanoids[springL.index];
  const hR = humanoids[springR.index];
  const distL = Math.abs(springL.pos - springL.targetRef.current);
  const distR = Math.abs(springR.pos - springR.targetRef.current);
  const getStats = (h: typeof humanoids[0]) => [
    h.height && { label: "Height", value: `${h.height} cm` }, h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` }, h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];
  const statsL = getStats(hL);

  // Transition easing
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
  const dur = "0.55s";

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white">
      {/* Arc dots are rendered inside their respective section groups below */}

      {/* ── Add compare button — hover zone right of center ── */}
      {!comparing && (
        <div
          className="absolute top-0 bottom-0 right-0 flex items-center justify-center group cursor-pointer"
          style={{ width: "38%", zIndex: 10 }}
          onClick={() => { setAddHover(false); enterCompare(); }}
          onMouseEnter={() => setAddHover(true)}
          onMouseLeave={() => setAddHover(false)}
        >
          <div
            className="rounded-full flex items-center justify-center transition-all duration-300 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
            style={{ width: 40, height: 40, background: "#ebebeb" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Exit compare — hover over center splits the two sides apart ── */}
      {comparing && (
        <div
          className="absolute top-0 bottom-0 flex items-center justify-center group/split cursor-pointer"
          style={{ left: "50%", width: 120, marginLeft: -60, zIndex: 10 }}
          onClick={exitCompare}
          onMouseEnter={() => setSplitHover(true)}
          onMouseLeave={() => setSplitHover(false)}
        >
          {/* Minus button — appears on hover */}
          <div
            className="rounded-full flex items-center justify-center transition-all duration-300 opacity-0 scale-75 group-hover/split:opacity-100 group-hover/split:scale-100"
            style={{ width: 32, height: 32, background: "#ebebeb", zIndex: 1 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="8" x2="12" y2="8" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Humanoid groups: [stats | robot] per side ── */}
      {(() => {
        const bodyStyle = { color: "#999", lineHeight: 1.4 } as const;
        const ico = (d: string) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.45 }}><path d={d} /></svg>;
        const icoInfo = ico("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v2m0 4h.01");
        const icoRuler = ico("M6 3v18 M6 9h4 M6 15h4 M18 3v18 M18 9h-4 M18 15h-4");
        const icoDof = ico("M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83");
        const icoSpeed = ico("M12 12l4-8M19.07 4.93A10 10 0 1 0 20.45 13");
        const icoStatus = ico("M22 12h-4l-3 9L9 3l-3 9H2");

        const chevron = (open: boolean) => (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
            <polyline points="2,3.5 5,6.5 8,3.5" />
          </svg>
        );

        const statSections = (h: typeof humanoids[0]) => {
        const heightPct = Math.min(((h.height ?? 0) / 200) * 100, 100);
        const weightPct = Math.min(((h.weight ?? 0) / 120) * 100, 100);
        const dofPct = Math.min(((h.dof ?? 0) / 50) * 100, 100);
        const speedPct = Math.min(((h.maxSpeed ?? 0) / 5) * 100, 100);
        const statusColor = h.status === "In Production" ? "#22c55e" : h.status === "Prototype" ? "#eab308" : h.status === "Concept" ? "#3b82f6" : "#a3a3a3";

        const barViz = (label: string, value: string, pct: number, delay: number) => (
          <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
            <p className="text-[10px] w-[32px] text-right flex-shrink-0" style={{ color: "#aaa" }}>{label}</p>
            <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "#EFEFEF" }}>
              <div className="h-full rounded-full" style={{
                width: openStat === "overview" ? `${pct}%` : "0%",
                background: "#c4c4c4",
                transition: `width 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
              }} />
            </div>
            <p className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: "var(--c-ink-body)", minWidth: 42 }}>{value}</p>
          </div>
        );

        return [
          { key: "desc", show: !!h.description, label: (
            <div className="flex items-center gap-2.5">
              {icoInfo}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Info</p>
            </div>
          ), detail: (
            <p className="text-[12px] leading-relaxed" style={{ color: "#999" }}>{h.description}</p>
          ) },
          { key: "overview", show: !!(h.height || h.weight), label: (
            <div className="flex items-center gap-2.5">
              {icoRuler}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Overview</p>
            </div>
          ), detail: (
            <div>
              {h.height ? barViz("Height", `${h.height} cm`, heightPct, 0.05) : null}
              {h.weight ? barViz("Weight", `${h.weight} kg`, weightPct, 0.12) : null}
            </div>
          ) },
          { key: "dof", show: !!h.dof, label: (
            <div className="flex items-center gap-2.5">
              {icoDof}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Degrees of Freedom</p>
            </div>
          ), detail: (
            <div>
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                <div className="flex gap-[3px]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="rounded-full" style={{
                      width: 6, height: 6,
                      background: i < Math.round((h.dof ?? 0) / 5) ? "#c4c4c4" : "#EFEFEF",
                      transform: openStat === "dof" ? "scale(1)" : "scale(0)",
                      transition: `transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${0.03 * i}s`,
                    }} />
                  ))}
                </div>
                <p className="text-[12px] font-medium" style={{ color: "var(--c-ink-body)" }}>{h.dof}</p>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "#999" }}>{(h.dof ?? 0) >= 40 ? "High dexterity — suited for complex manipulation." : (h.dof ?? 0) >= 25 ? "Moderate articulation for general mobility." : "Streamlined with fewer active joints."}</p>
            </div>
          ) },
          { key: "speed", show: !!h.maxSpeed, label: (
            <div className="flex items-center gap-2.5">
              {icoSpeed}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Speed</p>
            </div>
          ), detail: (
            <div>
              <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                <svg width="40" height="24" viewBox="0 0 40 24">
                  <path d="M4 20 A16 16 0 0 1 36 20" fill="none" stroke="#EFEFEF" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4 20 A16 16 0 0 1 36 20" fill="none" stroke="#c4c4c4" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray="50.3"
                    strokeDashoffset={openStat === "speed" ? 50.3 * (1 - speedPct / 100) : 50.3}
                    style={{ transition: `stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s` }}
                  />
                </svg>
                <p className="text-[12px] font-medium" style={{ color: "var(--c-ink-body)" }}>{h.maxSpeed} m/s</p>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "#999" }}>{(h.maxSpeed ?? 0) >= 3.0 ? "Exceeds typical human walking speed." : (h.maxSpeed ?? 0) >= 2.0 ? "Comparable to human walking pace." : "Designed for precision over speed."}</p>
            </div>
          ) },
          { key: "status", show: !!h.status, label: (
            <div className="flex items-center gap-2.5">
              {icoStatus}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Status</p>
            </div>
          ), detail: (
            <div>
              <div className="flex items-center gap-2.5" style={{ marginTop: 4 }}>
                <span className="relative flex h-2.5 w-2.5">
                  {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: statusColor, opacity: 0.4 }} />}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: statusColor }} />
                </span>
                <p className="text-[12px] font-medium" style={{ color: "var(--c-ink-body)" }}>{h.status}</p>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "#999" }}>{h.status === "In Production" ? "Commercially available and actively deployed." : h.status === "Prototype" ? "In active development — not yet commercially available." : h.status === "Concept" ? "Early-stage design, not yet built." : "No longer in active production."}</p>
            </div>
          ) },
          { key: "buy", show: !!(h.purchaseUrl || (h.cost && h.cost !== "N/A")), content: (
            h.purchaseUrl ? (
              <a href={h.purchaseUrl} target="_blank" rel="noopener noreferrer"
                className="pointer-events-auto block"
                style={{ textDecoration: "none", background: "#2563eb", margin: "-12px", padding: "12px", borderRadius: cardRadius }}>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>From {h.cost && h.cost !== "N/A" ? h.cost : ""}</p>
                <p className="text-[13px] font-medium mt-1" style={{ color: "#fff" }}>Buy &rarr;</p>
              </a>
            ) : (
              <>
                <p className="text-[13px]" style={{ color: "#999" }}>{h.status === "In Production" ? "Starting at" : "Est."}</p>
                <p className="text-[13px] font-medium mt-1" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em" }}>{h.cost}</p>
              </>
            )
          )},
        ];
        };

        const cardMorph = "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), padding 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

        const renderStats = (h: typeof humanoids[0]) => {
          const sections = statSections(h);
          return (
            <div className="flex-shrink-0 relative group/stats" style={{
              overflowX: "hidden", overflowY: "visible",
              width: !showStats ? 0 : statsW,
              opacity: !showStats ? 0 : 1,
              height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
              maxHeight: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
              transition: `width ${dur} ${ease}, opacity 0.25s ${ease}`,
            }}>
              {/* Fixed-width inner to prevent text reflow during width transition */}
              <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, gap: cardGap }}>
              {/* Info header — fixed height */}
              <div className="flex items-center gap-3 pointer-events-auto" style={{ borderRadius: cardRadius, background: "#FAFAFA", padding: "10px 12px", flexShrink: 0, position: "relative", zIndex: 11 }}>
                <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: cardRadius * 0.6, background: h.logoUrl ? "transparent" : "#EFEFEF" }}>
                  {h.logoUrl ? (
                    <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes="32px" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                      <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                      <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{h.name}</p>
                  <p className="text-[10px] tracking-widest uppercase font-medium mt-0.5 truncate" style={{ color: "#a3a3a3", letterSpacing: "0.08em" }}>
                    {h.manufacturer}{h.year ? ` · ${h.year}` : ''}{h.id.startsWith("legend") ? '' : ''}
                  </p>
                </div>
                {h.id.startsWith("legend") && <span className="flex-shrink-0 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: "#b08d57", background: "rgba(176,141,87,0.1)", letterSpacing: "0.06em" }}>Legend</span>}
              </div>
              {/* Stats — lighter container, spaced out */}
              <div className="flex flex-col pointer-events-auto" style={{ padding: "6px 12px", borderRadius: cardRadius, background: "#FCFCFC", position: "relative", zIndex: 11 }}>
                {sections.filter((s) => s.show && s.label).map((s) => {
                  const isOpen = openStat === s.key;
                  return (
                    <div key={s.key}>
                      <button
                        className="w-full flex items-center justify-between cursor-pointer py-2"
                        style={{ background: "none", border: "none", padding: "8px 0" }}
                        onClick={() => setOpenStat(isOpen ? null : s.key)}
                      >
                        {s.label}
                        {chevron(isOpen)}
                      </button>
                      <div style={{
                        maxHeight: isOpen ? 120 : 0,
                        opacity: isOpen ? 1 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.25s ease, opacity 0.2s ease",
                      }}>
                        <div className="pb-2 pl-[22.5px]">{s.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          );
        };

        const renderRobot = (h: typeof humanoids[0], dist: number, hIdx: number, isFirst: boolean) => {
          const gallery = h.media?.filter((m) => m.type === "image") || [];
          const allImages = [h.imageUrl, ...gallery.map((m) => m.url)].filter(Boolean) as string[];
          const hasGallery = allImages.length > 1;
          const currentImg = galleryIdx[hIdx] || 0;

          const scrollGallery = (idx: number) => {
            const el = galleryScrollRefs.current[hIdx];
            if (!el || !el.children[idx]) return;
            const child = el.children[idx] as HTMLElement;
            el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
          };

          const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            if (idx !== (galleryIdx[hIdx] || 0)) {
              setGalleryIdx((prev) => ({ ...prev, [hIdx]: idx }));
            }
          };

          return (
            <div className="relative flex-shrink-0 group/card" style={{ zIndex: 1 }}>
            {/* Inner card */}
            <div
              className="relative flex flex-col overflow-hidden"
              style={{
                width: comparing ? `${robotW - 8}vw` : `${robotW}vw`,
                height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
                maxWidth: comparing ? robotMaxW - 100 : robotMaxW,
                borderRadius: cardRadius,
                background: "#FAFAFA",
                pointerEvents: "auto",
              }}
            >
              {/* New badge */}
              {h.year === 2025 && (
                <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-medium" style={{ background: "#e5e5e5", color: "#737373" }}>
                  New
                </div>
              )}
              {/* Media area — fills remaining space */}
              <div className="relative flex-1 min-h-0">
                <div
                  ref={(el) => { galleryScrollRefs.current[hIdx] = el; }}
                  data-gallery-scroll={hasGallery ? "" : undefined}
                  className="scrollbar-hide"
                  style={{
                    display: "flex",
                    width: "100%", height: "100%",
                    overflowX: hasGallery ? "auto" : "hidden",
                    overflowY: "hidden",
                    scrollSnapType: "x mandatory",
                    opacity: Math.max(0.5, 1 - dist * robotFade),
                  }}
                  onScroll={hasGallery ? onScroll : undefined}
                >
                  {allImages.length > 0 ? allImages.map((src, i) => (
                    <div key={i} className="relative flex items-center justify-center pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", padding: h.imageFit === "cover" ? 0 : h.imagePosition === "bottom" ? "24px 24px 0 24px" : 24 }}>
                      <div className="relative w-full h-full">
                        <Image src={src} alt={`${h.name} ${i + 1}`} fill className={h.imageFit === "cover" ? "object-cover" : "object-contain"} style={h.imagePosition ? { objectPosition: h.imagePosition } : undefined} sizes={comparing ? `${robotW - 8}vw` : `${robotW}vw`} priority={isFirst && i === 0} />
                      </div>
                    </div>
                  )) : (
                    <div className="relative flex items-center justify-center p-6 pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0 }}>
                      <PlaceholderLogo />
                    </div>
                  )}
                </div>

                {/* Bottom fade for cut-off images */}
                {h.imagePosition?.includes("bottom") && (
                  <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[2]" style={{ height: bottomFadeH, background: `linear-gradient(to bottom, transparent, rgba(250,250,250,${bottomFadeOpacity}))` }} />
                )}
                {/* Dot strip — overlaid at bottom with fade */}
                {hasGallery && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-[3] pointer-events-none" style={{ height: 28, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))" }}>
                    <div className="flex gap-1.5">
                      {allImages.map((_, i) => (
                        <div key={i} style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: i === currentImg ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)",
                          transition: "background 0.2s ease",
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hover arrows — at card level, above scroll container */}
              {hasGallery && currentImg > 0 && (
                <button
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-0 group-hover/card:opacity-60 hover:!opacity-100 transition-opacity duration-200 cursor-pointer z-[5]"
                  style={{ background: "rgba(255,255,255,0.8)", borderRadius: "50%", pointerEvents: "auto" }}
                  onClick={(e) => { e.stopPropagation(); scrollGallery(currentImg - 1); }}
                >
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,1.5 2,5 6,8.5" /></svg>
                </button>
              )}
              {hasGallery && currentImg < allImages.length - 1 && (
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-0 group-hover/card:opacity-60 hover:!opacity-100 transition-opacity duration-200 cursor-pointer z-[5]"
                  style={{ background: "rgba(255,255,255,0.8)", borderRadius: "50%", pointerEvents: "auto" }}
                  onClick={(e) => { e.stopPropagation(); scrollGallery(currentImg + 1); }}
                >
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,1.5 6,5 2,8.5" /></svg>
                </button>
              )}

            </div>

              {/* Mini crown — outside edge of card */}
              {(() => {
                const crownSpring = isFirst ? springL : springR;
                const crownSide = isFirst ? "left" : "right";
                const crownItems: { idx: number; o: number; cy: number; cz: number }[] = [];
                const cf = Math.floor(crownSpring.pos);
                for (let n = cf - 1; n <= cf + 2; n++) {
                  if (n < 0 || n >= humanoids.length) continue;
                  const co = n - crownSpring.pos;
                  const rad = (co * 14 * Math.PI) / 180;
                  const cz = Math.cos(rad);
                  if (cz <= 0.01) continue;
                  const cy = Math.sin(rad) * miniCrownRadius;
                  crownItems.push({ idx: n, o: co, cy, cz });
                }
                const crownYRange = crownItems.reduce((acc, { cy }) => ({ min: Math.min(acc.min, cy), max: Math.max(acc.max, cy) }), { min: Infinity, max: -Infinity });
                return (
                  <div className="absolute top-3 pointer-events-auto z-[3]" style={{ ...(crownSide === "left" ? { right: "100%", marginRight: 6 } : { left: "100%", marginLeft: 6 }), height: 110, width: 30 }}>
                    {/* Static dashes */}
                    {Array.from({ length: 11 }, (_, j) => {
                      const y = (j - 5) * 9;
                      if (crownYRange.min !== Infinity && (y < crownYRange.min - 2 || y > crownYRange.max + 2)) return null;
                      const isMajor = j % 3 === 0;
                      const dfc = Math.abs(j - 5);
                      return <div key={j} className="absolute" style={{ [crownSide === "left" ? "left" : "right"]: 0, top: `calc(50% + ${y}px)`, width: isMajor ? 8 : 5, height: 1, background: `rgba(0,0,0,${isMajor ? 0.1 : 0.05})`, borderRadius: 1, opacity: Math.max(0, 1 - dfc * 0.14), transform: "translateY(-50%)" }} />;
                    })}
                    {/* Rail */}
                    {crownYRange.min !== Infinity && <div className="absolute" style={{ [crownSide === "left" ? "left" : "right"]: 0, top: `calc(50% + ${crownYRange.min}px)`, height: crownYRange.max - crownYRange.min, width: 1, background: "rgba(0,0,0,0.05)" }} />}
                    {/* Brass marker */}
                    <div className="absolute" style={{ [crownSide === "left" ? "left" : "right"]: -4, top: "50%", transform: `translateY(-50%)${crownSide === "right" ? " scaleX(-1)" : ""}` }}>
                      <svg width="5" height="7" viewBox="0 0 5 7" fill="#8a7245" opacity="0.45"><polygon points="0,1.5 5,3.5 0,5.5" /></svg>
                    </div>
                    {/* Scrolling numbers */}
                    {crownItems.map(({ idx: ci, o: co, cy, cz }) => {
                      const cfs = 7 + cz * 3.5;
                      const cop = Math.pow(cz, 3);
                      const cAct = Math.abs(co) < 0.15;
                      return <div key={ci} className="absolute cursor-pointer" style={{ [crownSide === "left" ? "left" : "right"]: 10, top: `calc(50% + ${cy}px)`, transform: `translateY(-50%) scaleY(${0.6 + cz * 0.4})`, opacity: cop }} onClick={() => crownSpring.jumpTo(ci)}>
                        <span className="tabular-nums" style={{ fontSize: cfs, fontWeight: cAct ? 600 : 400, lineHeight: 1, color: cAct ? "#1d1d1f" : `rgba(0,0,0,${0.15 + cz * 0.25})`, letterSpacing: "0.02em" }}>{String(ci).padStart(2, "0")}</span>
                      </div>;
                    })}
                  </div>
                );
              })()}

              {/* Stats toggle — outside bottom-left of card */}
              <button
                className="absolute bottom-3 w-5 h-5 flex items-center justify-center cursor-pointer opacity-50 hover:opacity-80 transition-opacity duration-200 z-[3]"
                style={{ ...(isFirst ? { right: "100%", marginRight: 8 } : { left: "100%", marginLeft: 8 }), borderRadius: 4, pointerEvents: "auto" }}
                onClick={() => setShowStats((s) => !s)}
                title={showStats ? "Hide stats (i)" : "Show stats (i)"}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#525252" strokeWidth="1.2" strokeLinecap="round">
                  <rect x="1.5" y="2" width="4" height="10" rx="1" />
                  <line x1="8.5" y1="4" x2="12.5" y2="4" />
                  <line x1="8.5" y1="7" x2="12.5" y2="7" />
                  <line x1="8.5" y1="10" x2="11" y2="10" />
                </svg>
              </button>
            </div>
          );
        };

        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 11 }}>
            <div className="flex items-start" style={{ gap: cardGap }}>
              {/* Left group */}
              <div className="flex items-start" style={{
                gap: cardGap,
                transform: splitHover ? "translateX(-12px)" : addHover ? "translateX(-16px)" : "translateX(0)",
                transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {renderRobot(hL, distL, springL.index, true)}
                {renderStats(hL)}
              </div>

              {/* Right group */}
              <div className="flex items-start" style={{
                gap: cardGap,
                transform: splitHover ? "translateX(12px)" : "translateX(0)",
                transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                <div className="flex-shrink-0 overflow-hidden" style={{
                  width: comparing ? statsW : 0,
                  opacity: comparing ? 1 : 0,
                  transition: `width ${dur} ${ease}, opacity 0.3s ${ease} ${comparing ? "0.1s" : "0s"}`,
                }}>
                  {renderStats(hR)}
                </div>

                <div className="flex-shrink-0" style={{
                  opacity: comparing ? 1 : 0,
                  transform: `scale(${comparing ? 1 : 0.95})`,
                  width: comparing ? "auto" : 0,
                  overflow: comparing ? "visible" : "hidden",
                  transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}, width ${dur} ${ease}`,
                }}>
                  {renderRobot(hR, distR, springR.index, false)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tuner ── */}
      <button className="absolute top-20 right-5 z-50 text-[11px] text-neutral-300 hover:text-neutral-500 cursor-pointer transition-colors" onClick={() => setShowTuner(!showTuner)}>{showTuner ? "Close" : "Tune"}</button>
      {showTuner && (
        <div data-tuner className="absolute top-28 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-5 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
          <div><p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Presets</p><div className="flex flex-wrap gap-1.5">{(Object.keys(SCROLL_PRESETS) as PresetKey[]).map((key) => (<button key={key} onClick={() => applyPreset(key)} className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all ${presetKey === key && !isCustom ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{SCROLL_PRESETS[key].label}</button>))}</div></div>
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Fine Tune</p>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Stiffness <span className="tabular-nums text-neutral-400">{stiffness.toFixed(2)}</span></label><input type="range" min={2} max={40} value={Math.round(stiffness * 100)} onChange={(e) => { setCustomStiffness(Number(e.target.value) / 100); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Damping <span className="tabular-nums text-neutral-400">{damping.toFixed(2)}</span></label><input type="range" min={40} max={95} value={Math.round(damping * 100)} onChange={(e) => { setCustomDamping(Number(e.target.value) / 100); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Sensitivity <span className="tabular-nums text-neutral-400">{wheelThreshold}</span></label><input type="range" min={5} max={60} value={wheelThreshold} onChange={(e) => { setCustomThreshold(Number(e.target.value)); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Layout</p>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Robot width <span className="tabular-nums text-neutral-400">{robotW}vw</span></label><input type="range" min={15} max={50} value={robotW} onChange={(e) => setRobotW(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Robot height <span className="tabular-nums text-neutral-400">{robotH}vh</span></label><input type="range" min={30} max={90} value={robotH} onChange={(e) => setRobotH(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Max width <span className="tabular-nums text-neutral-400">{robotMaxW}px</span></label><input type="range" min={200} max={800} step={10} value={robotMaxW} onChange={(e) => setRobotMaxW(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Stats width <span className="tabular-nums text-neutral-400">{statsW}px</span></label><input type="range" min={0} max={300} step={5} value={statsW} onChange={(e) => setStatsW(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Gap <span className="tabular-nums text-neutral-400">{cardGap}px</span></label><input type="range" min={0} max={32} value={cardGap} onChange={(e) => setCardGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Radius <span className="tabular-nums text-neutral-400">{cardRadius}px</span></label><input type="range" min={0} max={32} value={cardRadius} onChange={(e) => setCardRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Microinteractions</p>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Squish <span className="tabular-nums text-neutral-400">{robotSquish.toFixed(2)}</span></label><input type="range" min={0} max={15} value={Math.round(robotSquish * 100)} onChange={(e) => setRobotSquish(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Fade <span className="tabular-nums text-neutral-400">{robotFade.toFixed(2)}</span></label><input type="range" min={0} max={60} value={Math.round(robotFade * 100)} onChange={(e) => setRobotFade(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Bottom fade height <span className="tabular-nums text-neutral-400">{bottomFadeH}px</span></label><input type="range" min={0} max={120} value={bottomFadeH} onChange={(e) => setBottomFadeH(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Bottom fade opacity <span className="tabular-nums text-neutral-400">{bottomFadeOpacity.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(bottomFadeOpacity * 100)} onChange={(e) => setBottomFadeOpacity(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          {arcStyle === "crown" && (
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Crown</p><button className="text-[9px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setDrumAngle(18); setDrumRadius(90); setDrumFsMax(16); setDrumFsMin(8); setDrumFwMax(500); setDrumCompression(0.59); setDrumOpPower(4.0); setDrumXOffset(120); setDrumMaskFade(35); setDrumRange(1); setDrumTracking(0.04); setMiniCrownRadius(70); }}>Reset</button></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Angle <span className="tabular-nums text-neutral-400">{drumAngle}°</span></label><input type="range" min={8} max={45} value={drumAngle} onChange={(e) => setDrumAngle(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Radius <span className="tabular-nums text-neutral-400">{drumRadius}px</span></label><input type="range" min={60} max={300} value={drumRadius} onChange={(e) => setDrumRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Size max <span className="tabular-nums text-neutral-400">{drumFsMax}px</span></label><input type="range" min={20} max={80} value={drumFsMax} onChange={(e) => setDrumFsMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Size min <span className="tabular-nums text-neutral-400">{drumFsMin}px</span></label><input type="range" min={6} max={32} value={drumFsMin} onChange={(e) => setDrumFsMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Weight <span className="tabular-nums text-neutral-400">{drumFwMax}</span></label><input type="range" min={300} max={900} step={100} value={drumFwMax} onChange={(e) => setDrumFwMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Compression <span className="tabular-nums text-neutral-400">{drumCompression.toFixed(2)}</span></label><input type="range" min={40} max={100} value={Math.round(drumCompression * 100)} onChange={(e) => setDrumCompression(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Fade power <span className="tabular-nums text-neutral-400">{drumOpPower.toFixed(1)}</span></label><input type="range" min={3} max={40} value={Math.round(drumOpPower * 10)} onChange={(e) => setDrumOpPower(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">X offset <span className="tabular-nums text-neutral-400">{drumXOffset}px</span></label><input type="range" min={10} max={120} value={drumXOffset} onChange={(e) => setDrumXOffset(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Mask fade <span className="tabular-nums text-neutral-400">{drumMaskFade}%</span></label><input type="range" min={0} max={35} value={drumMaskFade} onChange={(e) => setDrumMaskFade(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Visible items <span className="tabular-nums text-neutral-400">{drumRange}</span></label><input type="range" min={2} max={8} value={drumRange} onChange={(e) => setDrumRange(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Tracking <span className="tabular-nums text-neutral-400">{drumTracking.toFixed(2)}em</span></label><input type="range" min={-10} max={10} value={Math.round(drumTracking * 100)} onChange={(e) => setDrumTracking(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Mini radius <span className="tabular-nums text-neutral-400">{miniCrownRadius}px</span></label><input type="range" min={20} max={100} value={miniCrownRadius} onChange={(e) => setMiniCrownRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          )}
        </div>
      )}

    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// Guide chat — keyword matching to help find the right humanoid
// ═══════════════════════════════════════════════════════════════
function GuideChat({ onSelect }: { onSelect: (idx: number) => void }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "guide"; text: string; suggestions?: typeof humanoids }[]>([
    { role: "guide", text: "What kind of humanoid are you looking for? I can help you narrow it down." },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setQuery("");

    // Simple keyword matching
    let results = humanoids;
    if (q.includes("cheap") || q.includes("affordable") || q.includes("budget")) {
      results = humanoids.filter((h) => h.cost && h.cost !== "N/A").sort((a, b) => parseInt(a.cost || "999") - parseInt(b.cost || "999"));
    } else if (q.includes("fast") || q.includes("speed")) {
      results = humanoids.filter((h) => h.maxSpeed).sort((a, b) => (b.maxSpeed || 0) - (a.maxSpeed || 0));
    } else if (q.includes("tall") || q.includes("height")) {
      results = humanoids.filter((h) => h.height).sort((a, b) => (b.height || 0) - (a.height || 0));
    } else if (q.includes("light") || q.includes("lightweight")) {
      results = humanoids.filter((h) => h.weight).sort((a, b) => (a.weight || 999) - (b.weight || 999));
    } else if (q.includes("production") || q.includes("available") || q.includes("buy")) {
      results = humanoids.filter((h) => h.status === "In Production");
    } else if (q.includes("dexterous") || q.includes("dof") || q.includes("flexible")) {
      results = humanoids.filter((h) => h.dof).sort((a, b) => (b.dof || 0) - (a.dof || 0));
    } else if (q.includes("home") || q.includes("domestic") || q.includes("household")) {
      results = humanoids.filter((h) => h.description?.toLowerCase().includes("home") || h.description?.toLowerCase().includes("household") || h.description?.toLowerCase().includes("domestic"));
    } else if (q.includes("warehouse") || q.includes("logistics") || q.includes("industrial")) {
      results = humanoids.filter((h) => h.description?.toLowerCase().includes("warehouse") || h.description?.toLowerCase().includes("logistics") || h.description?.toLowerCase().includes("industrial"));
    } else {
      // Name/manufacturer search
      results = humanoids.filter((h) => h.name.toLowerCase().includes(q) || h.manufacturer.toLowerCase().includes(q));
    }

    const top = results.slice(0, 3);
    if (top.length > 0) {
      setMessages((prev) => [...prev, { role: "guide", text: `Here are ${top.length} match${top.length > 1 ? "es" : ""}:`, suggestions: top }]);
    } else {
      setMessages((prev) => [...prev, { role: "guide", text: "No matches found. Try asking about speed, price, height, or use case (home, warehouse, etc)." }]);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-16 px-4 pointer-events-none">
      <div className="w-full max-w-[420px] rounded-2xl overflow-hidden pointer-events-auto animate-slide-from-bottom" style={{ background: "white", border: "1px solid #e8e8e8", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        {/* Messages */}
        <div ref={scrollRef} className="max-h-[300px] overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`text-[13px] leading-relaxed max-w-[85%] px-3 py-2 rounded-2xl ${m.role === "user" ? "text-white" : ""}`}
                  style={m.role === "user" ? { background: "var(--c-ink)", color: "white" } : { background: "#f5f5f5", color: "var(--c-ink-medium)" }}>
                  {m.text}
                </p>
              </div>
              {m.suggestions && (
                <div className="flex gap-2 mt-2 ml-1">
                  {m.suggestions.map((h) => {
                    const idx = humanoids.findIndex((x) => x.id === h.id);
                    return (
                      <button key={h.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all hover:scale-105" style={{ background: "#f5f5f5" }}
                        onClick={() => onSelect(idx)}>
                        <div className="relative w-6 h-8 flex-shrink-0">
                          {h.imageUrl ? <Image src={h.imageUrl} alt={h.name} fill className="object-contain" sizes="24px" /> : <PlaceholderLogo />}
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-medium" style={{ color: "var(--c-ink)" }}>{h.name}</p>
                          <p className="text-[9px]" style={{ color: "var(--c-ink-body)" }}>{h.manufacturer}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid #f0f0f0" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. fastest, cheapest, for warehouse..."
            className="flex-1 text-[13px] outline-none bg-transparent"
            style={{ color: "var(--c-ink)" }}
          />
          <button onClick={handleSubmit} className="text-[13px] font-medium cursor-pointer" style={{ color: query ? "var(--c-ink)" : "#c4c4c4" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fonts ─────────────────────────────────────────────────────
const FONTS = [
  { name: "Geist Sans", family: "var(--font-geist-sans)" },
  { name: "Inter", family: "var(--font-inter)" },
  { name: "DM Sans", family: "var(--font-dm-sans)" },
  { name: "Plus Jakarta Sans", family: "var(--font-jakarta)" },
  { name: "Space Grotesk", family: "var(--font-space-grotesk)" },
  { name: "Manrope", family: "var(--font-manrope)" },
  { name: "Outfit", family: "var(--font-outfit)" },
  { name: "Sora", family: "var(--font-sora)" },
  { name: "Albert Sans", family: "var(--font-albert-sans)" },
  { name: "Instrument Sans", family: "var(--font-instrument-sans)" },
  { name: "Rubik", family: "var(--font-rubik)" },
  { name: "Nunito Sans", family: "var(--font-nunito-sans)" },
  { name: "Work Sans", family: "var(--font-work-sans)" },
  { name: "Poppins", family: "var(--font-poppins)" },
  { name: "Raleway", family: "var(--font-raleway)" },
  { name: "Figtree", family: "var(--font-figtree)" },
  { name: "Karla", family: "var(--font-karla)" },
  { name: "Lexend", family: "var(--font-lexend)" },
  { name: "Red Hat Display", family: "var(--font-red-hat-display)" },
  { name: "Archivo", family: "var(--font-archivo)" },
  { name: "Be Vietnam Pro", family: "var(--font-be-vietnam-pro)" },
  { name: "Urbanist", family: "var(--font-urbanist)" },
  { name: "Jost", family: "var(--font-jost)" },
  { name: "Quicksand", family: "var(--font-quicksand)" },
  { name: "Cabin", family: "var(--font-cabin)" },
  { name: "Bricolage Grotesque", family: "var(--font-bricolage-grotesque)" },
  { name: "Onest", family: "var(--font-onest)" },
  { name: "Wix Madefor", family: "var(--font-wix-madefor)" },
  { name: "Gabarito", family: "var(--font-gabarito)" },
  { name: "Noto Sans", family: "var(--font-noto-sans)" },
  { name: "Schibsted Grotesk", family: "var(--font-schibsted-grotesk)" },
] as const;

export default function Home() {
  const [layout, setLayout] = useState<Layout>("Z");

  const [navStyle, setNavStyle] = useState<NavStyle>("underline");
  const [chatOpen, setChatOpen] = useState(false);
  const [goToIndex, setGoToIndex] = useState<number | null>(null);
  const [fontIdx, setFontIdx] = useState(0);
  const [textDim, setTextDim] = useState(0);
  const [showFontToast, setShowFontToast] = useState(false);
  const [showDimSlider, setShowDimSlider] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Intro animation state ──
  const [introPhase, setIntroPhase] = useState<"logo" | "exit" | "done">("logo");

  useEffect(() => {
    // Phase 1: logo sits for a beat, then exits
    const t1 = setTimeout(() => setIntroPhase("exit"), 800);
    // Phase 2: overlay unmounts, content expands in
    const t2 = setTimeout(() => setIntroPhase("done"), 1150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
        setFontIdx((i) => (i + 1) % FONTS.length);
        setShowFontToast(true);
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setShowFontToast(false), 1800);
      }
      if (e.key === "d" && !e.metaKey && !e.ctrlKey) {
        setShowDimSlider((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSelectHumanoid = (idx: number) => {
    setLayout("E");
    setGoToIndex(idx);
    setChatOpen(false);
    setTimeout(() => setGoToIndex(null), 100);
  };

  const introDone = introPhase === "done";

  return (
    <main
      className="min-h-screen bg-white"
      style={{ fontFamily: FONTS[fontIdx].family, "--text-dim": textDim } as React.CSSProperties}
    >
      {/* ── Intro overlay ── */}
      {introPhase !== "done" && (
        <div className="intro-overlay">
          <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
            {/* Ring */}
            <svg
              width="56" height="56" viewBox="0 0 56 56" fill="none"
              className="absolute inset-0"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="28" cy="28" r="18"
                stroke="var(--c-ink)" strokeWidth="1" fill="none"
                strokeDasharray="113" strokeDashoffset="113"
                strokeLinecap="round"
                style={{
                  opacity: 0.1,
                  animation: introPhase === "logo"
                    ? "intro-ring-draw 0.7s cubic-bezier(0.33, 1, 0.68, 1) 0.35s forwards"
                    : "intro-ring-fade 0.3s ease forwards",
                }}
              />
            </svg>
            {/* Logo */}
            <svg
              width="24" height="24" viewBox="0 0 20 20" fill="none"
              className={introPhase === "logo" ? "intro-logo-enter" : "intro-logo-exit"}
            >
              <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
              <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      {introDone && (
        <div className="intro-nav fixed inset-0 z-[999] pointer-events-none">
          <LayoutSwitcher
            active={layout}
            onChange={setLayout}
            navStyle={navStyle}
            onNavStyleChange={setNavStyle}
          />
        </div>
      )}

      {/* ── Content ── */}
      <div className={introDone ? "intro-content" : "opacity-0"}>
        {layout === "E" && <Browse goToIndex={goToIndex} />}
        {layout === "Z" && <EllipticalCarousel />}
      </div>

      {/* Font toast */}
      {showFontToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg animate-blur-fade"
          style={{ background: "rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
        >
          <p className="text-[11px] tracking-wide" style={{ color: "#999" }}>
            <span style={{ color: "#737373", fontWeight: 500 }}>{FONTS[fontIdx].name}</span>
            <span className="ml-2 tabular-nums" style={{ color: "#c4c4c4" }}>{fontIdx + 1}/{FONTS.length}</span>
          </p>
        </div>
      )}

      {/* Text dim slider */}
      {showDimSlider && (
        <div
          className="fixed bottom-16 right-5 z-[60] px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", border: "1px solid #e8e8e8", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
        >
          <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: "#b4b4b4" }}>Text lightness</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={70}
              value={textDim}
              onChange={(e) => setTextDim(Number(e.target.value))}
              className="w-28 h-1 accent-neutral-800 cursor-pointer"
            />
            <span className="text-[11px] tabular-nums w-6 text-right" style={{ color: "#999" }}>{textDim}</span>
          </div>
        </div>
      )}

      {/* Bottom ? button */}
      <div className={introDone ? "intro-nav" : "opacity-0"}>
        <button
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{ background: chatOpen ? "var(--c-ink)" : "#F7F7F7", color: chatOpen ? "white" : "#999" }}
          onClick={() => setChatOpen(!chatOpen)}
        >
          <span className="text-[14px] font-medium">{chatOpen ? "×" : "?"}</span>
        </button>
      </div>

      {chatOpen && <GuideChat onSelect={handleSelectHumanoid} />}
    </main>
  );
}
