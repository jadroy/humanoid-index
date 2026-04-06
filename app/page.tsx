"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { humanoids } from "@/data/humanoids";
import Image from "next/image";

const ALL_LAYOUTS = ["E", "Z"] as const;
type Layout = (typeof ALL_LAYOUTS)[number];

const layoutLabels: Record<Layout, string> = {
  E: "Scroll",
  Z: "Index",
};

const INDEX_SUB_VIEWS = ["list", "timeline"] as const;

// ─── Nav Styles ─────────────────────────────────────────────────
const NAV_STYLES = ["floating", "pill", "underline", "bordered", "minimal", "solid"] as const;
type NavStyle = (typeof NAV_STYLES)[number];

// ─── Layout Switcher ────────────────────────────────────────────
function LayoutSwitcher({
  active,
  onChange,
  indexSubView,
  onIndexSubViewChange,
  navStyle,
  onNavStyleChange,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  indexSubView: IndexSubView;
  onIndexSubViewChange: (v: IndexSubView) => void;
  navStyle: NavStyle;
  onNavStyleChange: (s: NavStyle) => void;
}) {
  const cycleNavStyle = (e: React.MouseEvent) => {
    e.preventDefault();
    const idx = NAV_STYLES.indexOf(navStyle);
    onNavStyleChange(NAV_STYLES[(idx + 1) % NAV_STYLES.length]);
  };

  // ── Sub-view buttons (shared across all styles) ──
  const subViewButtons = active === "Z" && (
    <>
      <span className="text-[11px] text-neutral-200 mx-1">/</span>
      {INDEX_SUB_VIEWS.map((v) => (
        <button
          key={v}
          onClick={() => onIndexSubViewChange(v)}
          className="px-1.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer capitalize"
          style={{
            color: indexSubView === v ? "var(--c-ink)" : "#c4c4c4",
            fontWeight: indexSubView === v ? 500 : 400,
          }}
        >
          {v}
        </button>
      ))}
    </>
  );

  // ── Mark logo (shared) ──
  const mark = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.25 }} className="cursor-pointer" onContextMenu={cycleNavStyle}>
      <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
      <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
    </svg>
  );

  // ── Style: floating (original — island with border) ──
  if (navStyle === "floating") return (
    <nav className="pt-5 px-6">
      <div className="flex items-center justify-between pointer-events-auto px-5 py-2.5 rounded-sm border border-neutral-200/60 bg-white mx-auto" style={{ maxWidth: 1052 }}>
        {mark}
        <div className="flex items-center gap-0.5">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
              {layoutLabels[l]}
            </button>
          ))}
          {subViewButtons}
        </div>
      </div>
    </nav>
  );

  // ── Style: pill — rounded capsule, tinted active state ──
  if (navStyle === "pill") return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto px-2 py-1.5 rounded-full bg-neutral-100/80 backdrop-blur-sm">
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
          {subViewButtons}
        </div>
      </div>
    </nav>
  );

  // ── Style: underline — clean text with active underline ──
  if (navStyle === "underline") return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-6 pointer-events-auto px-4 py-2">
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
          {subViewButtons}
        </div>
      </div>
    </nav>
  );

  // ── Style: bordered — full-width top bar with bottom border ──
  if (navStyle === "bordered") return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/60 bg-white/90 backdrop-blur-sm pointer-events-auto">
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
          {subViewButtons}
        </div>
        <div className="w-5" /> {/* balance spacer */}
      </div>
    </nav>
  );

  // ── Style: minimal — just text, no container, no border ──
  if (navStyle === "minimal") return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-6 pointer-events-none">
      <div className="flex items-center gap-5 pointer-events-auto">
        {mark}
        <div className="flex items-center gap-3">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-1 py-0.5 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{ color: active === l ? "var(--c-ink)" : "#d4d4d4", fontWeight: active === l ? 600 : 400 }}>
              {layoutLabels[l]}
            </button>
          ))}
          {subViewButtons}
        </div>
      </div>
    </nav>
  );

  // ── Style: solid — dark bar, inverted text ──
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto px-5 py-2 rounded-sm bg-neutral-900">
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
          {active === "Z" && (
            <>
              <span className="text-[11px] text-neutral-600 mx-1">/</span>
              {INDEX_SUB_VIEWS.map((v) => (
                <button key={v} onClick={() => onIndexSubViewChange(v)}
                  className="px-1.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer capitalize"
                  style={{ color: indexSubView === v ? "#fff" : "#666", fontWeight: indexSubView === v ? 500 : 400 }}>
                  {v}
                </button>
              ))}
            </>
          )}
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
            <Image
              src={h.imageUrl || "/robots/placeholder.png"}
              alt={h.name}
              fill
              className="object-contain"
              sizes="50vw"
              priority
            />
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
  const [showTuner, setShowTuner] = useState(false);
  const [isCustom, setIsCustom] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [splitHover, setSplitHover] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [arcStyle, setArcStyle] = useState<ArcStyle>("crown");

  // Crown drum config
  const [drumAngle, setDrumAngle] = useState(14);
  const [drumRadius, setDrumRadius] = useState(168);
  const [drumFsMax, setDrumFsMax] = useState(20);
  const [drumFsMin, setDrumFsMin] = useState(8);
  const [drumFwMax, setDrumFwMax] = useState(500);
  const [drumCompression, setDrumCompression] = useState(0.62);
  const [drumOpPower, setDrumOpPower] = useState(3.5);
  const [drumXOffset, setDrumXOffset] = useState(120);
  const [drumMaskFade, setDrumMaskFade] = useState(30);
  const [drumRange, setDrumRange] = useState(3);
  const [drumTracking, setDrumTracking] = useState(0.04);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(true);

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
      e.preventDefault();
      if (expandedIdxRef.current !== null) return;

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
  const expandedIdxRef = useRef(expandedIdx); expandedIdxRef.current = expandedIdx;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (expandedIdxRef.current !== null) return;
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

  // Keyboard for expanded view
  useEffect(() => {
    if (expandedIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setExpandedIdx(null); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setExpandedIdx((p) => p !== null && p > 0 ? p - 1 : humanoids.length - 1); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setExpandedIdx((p) => p !== null && p < humanoids.length - 1 ? p + 1 : 0); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedIdx]);

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
        const icoRuler = ico("M6 3v18 M6 9h4 M6 15h4 M18 3v18 M18 9h-4 M18 15h-4");
        const icoDof = ico("M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83");
        const icoSpeed = ico("M12 12l4-8M19.07 4.93A10 10 0 1 0 20.45 13");
        const icoStatus = ico("M22 12h-4l-3 9L9 3l-3 9H2");

        const infoBtn = (tip: string) => (
          <span className="relative group/info flex-shrink-0 pointer-events-auto cursor-default" style={{ marginLeft: "auto" }}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ background: "#EFEFEF", color: "#aaa" }}>i</span>
            <span className="absolute bottom-full right-0 mb-1.5 px-2.5 py-1.5 rounded text-[11px] leading-snug whitespace-normal opacity-0 scale-95 group-hover/info:opacity-100 group-hover/info:scale-100 transition-all duration-150 pointer-events-none" style={{ background: "#333", color: "#e5e5e5", width: 200, zIndex: 50 }}>{tip}</span>
          </span>
        );

        const statSections = (h: typeof humanoids[0]) => [
          { key: "overview", show: !!(h.height || h.weight), content: (
            <div className="flex items-start gap-2.5">
              {icoRuler}
              <div className="font-medium" style={{ lineHeight: 1.15 }}>
                {h.height ? <p className="text-[13px]" style={{ color: "var(--c-ink-body)" }}>Height: {h.height} cm</p> : null}
                {h.weight ? <p className="text-[13px]" style={{ color: "var(--c-ink-body)" }}>Weight: {h.weight} kg</p> : null}
              </div>
              {infoBtn("Physical dimensions measured without additional payload or tooling attached.")}
            </div>
          )},
          { key: "dof", show: !!h.dof, content: (
            <div className="flex items-center gap-2.5">
              {icoDof}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Degrees of Freedom: {h.dof}</p>
              {infoBtn((h.dof ?? 0) >= 40 ? "High dexterity — suited for complex manipulation tasks." : (h.dof ?? 0) >= 25 ? "Moderate articulation for general-purpose mobility." : "Streamlined design with fewer active joints.")}
            </div>
          )},
          { key: "speed", show: !!h.maxSpeed, content: (
            <div className="flex items-center gap-2.5">
              {icoSpeed}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Max Speed: {h.maxSpeed} m/s</p>
              {infoBtn((h.maxSpeed ?? 0) >= 3.0 ? "Among the fastest humanoids — exceeds typical human walking speed." : (h.maxSpeed ?? 0) >= 2.0 ? "Comparable to average human walking pace." : "Designed for precision over speed.")}
            </div>
          )},
          { key: "status", show: !!h.status, content: (
            <div className="flex items-center gap-2.5">
              {icoStatus}
              <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Status: {h.status}</p>
              {infoBtn(h.status === "In Production" ? "Commercially available and actively deployed." : h.status === "Prototype" ? "In active development — not yet commercially available." : h.status === "Concept" ? "Early-stage design, not yet built." : "No longer in active production.")}
            </div>
          )},
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

        const cardMorph = "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), padding 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

        const renderStats = (h: typeof humanoids[0]) => {
          const sections = statSections(h);
          return (
            <div className="flex-shrink-0 relative group/stats" style={{
              overflowX: "hidden", overflowY: "visible",
              width: expandedIdx !== null || !showStats ? 0 : statsW,
              opacity: expandedIdx !== null || !showStats ? 0 : 1,
              height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
              maxHeight: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
              transition: `width ${dur} ${ease}, opacity 0.25s ${ease}`,
            }}>
              {/* Hide toggle — appears on hover */}
              <button
                className="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center cursor-pointer opacity-0 group-hover/stats:opacity-60 transition-opacity duration-200"
                style={{ borderRadius: 4, pointerEvents: "auto" }}
                onClick={() => setShowStats(false)}
                title="Hide stats (i)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#999" strokeWidth="1.2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
              {/* Fixed-width inner to prevent text reflow during width transition */}
              <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, gap: cardGap }}>
              {/* Info header */}
              <div className="flex flex-col" style={{ borderRadius: cardRadius, background: "#FAFAFA", padding: "12px" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: "#a3a3a3", letterSpacing: "0.08em" }}>{h.manufacturer}</p>
                    <p className="text-[15px] font-medium mt-1.5" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{h.name}</p>
                    {h.year && <p className="text-[11px] mt-1" style={{ color: "#a3a3a3" }}>{h.year}</p>}
                  </div>
                  {h.logoUrl && (
                    <div className="flex-shrink-0 relative overflow-hidden" style={{ width: 28, height: 28, borderRadius: "50%" }}>
                      <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes="28px" />
                    </div>
                  )}
                </div>
                {h.description && <p className="text-[12.5px] mt-4 leading-relaxed" style={{ color: "#999" }}>{h.description}</p>}
              </div>
              {/* Stats — lighter container, spaced out */}
              <div className="flex flex-col gap-3 pointer-events-auto" style={{ padding: "10px 12px", borderRadius: cardRadius, background: "#FCFCFC", position: "relative", zIndex: 11 }}>
                {sections.filter((s) => s.show).map((s) => (
                  <div key={s.key}>{s.content}</div>
                ))}
              </div>
              </div>
            </div>
          );
        };

        const expandEase = "0.5s cubic-bezier(0.16, 1, 0.3, 1)";
        const renderRobot = (h: typeof humanoids[0], dist: number, hIdx: number, isFirst: boolean) => {
          const isExpanded = expandedIdx === hIdx;
          const gallery = h.media?.filter((m) => m.type === "image") || [];
          const allImages = [h.imageUrl || "/robots/placeholder.png", ...gallery.map((m) => m.url)];

          return (
            <div
              className="relative overflow-hidden flex-shrink-0 group/card flex"
              style={{
                width: isExpanded ? `${robotW + 14}vw` : comparing ? `${robotW - 8}vw` : `${robotW}vw`,
                height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
                maxWidth: isExpanded ? robotMaxW + 240 : comparing ? robotMaxW - 100 : robotMaxW,
                transition: `all ${expandEase}`,
                borderRadius: cardRadius,
                background: "#FAFAFA",
                pointerEvents: "auto",
                zIndex: isExpanded ? 20 : 1,
              }}
            >
              {/* Main image area */}
              <div className="relative flex-1 flex items-center justify-center p-6 pointer-events-none" style={{
                opacity: isExpanded ? 1 : Math.max(0.5, 1 - dist * robotFade),
                transition: `opacity ${expandEase}`,
              }}>
                <div className="relative w-full h-full">
                  <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes={isExpanded ? "40vw" : comparing ? `${robotW - 8}vw` : `${robotW}vw`} priority={isFirst} />
                </div>
              </div>

              {/* Right side — thumbnails + info, revealed on expand */}
              <div style={{
                width: isExpanded ? 140 : 0,
                opacity: isExpanded ? 1 : 0,
                overflow: "hidden",
                flexShrink: 0,
                transition: `width ${expandEase}, opacity 0.3s ease ${isExpanded ? "0.12s" : "0s"}`,
              }}>
                <div className="flex flex-col justify-between h-full py-5 pr-5" style={{ width: 140, minWidth: 140 }}>
                  {/* Name + meta */}
                  <div>
                    <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: "#a3a3a3", letterSpacing: "0.08em" }}>{h.manufacturer}</p>
                    <p className="text-[14px] font-medium mt-1" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{h.name}</p>
                    {h.cost && h.cost !== "N/A" && (
                      <p className="text-[12px] mt-1" style={{ color: "#a3a3a3" }}>{h.cost}</p>
                    )}
                  </div>

                  {/* Vertical thumbnail strip */}
                  <div className="flex flex-col gap-1.5 overflow-y-auto scrollbar-hide mt-3 flex-1" style={{ minHeight: 0 }}>
                    {allImages.map((src, i) => (
                      <div
                        key={i}
                        className="relative flex-shrink-0 cursor-pointer overflow-hidden"
                        style={{ width: "100%", aspectRatio: "1", borderRadius: cardRadius - 1, background: "#f0f0ee" }}
                      >
                        <Image src={src} alt={`${h.name} ${i + 1}`} fill className="object-contain p-1.5" sizes="120px" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Close button — shown when expanded */}
              {isExpanded && (
                <button
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-neutral-200 transition-opacity duration-200"
                  style={{ background: "rgba(245,245,244,0.9)", borderRadius: cardRadius, pointerEvents: "auto", zIndex: 2 }}
                  onClick={() => setExpandedIdx(null)}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" /><line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
                  </svg>
                </button>
              )}

              {/* Expand button — shown on hover when collapsed */}
              {!isExpanded && (
                <button
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center cursor-pointer opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
                  style={{ background: "rgba(245,245,244,0.9)", borderRadius: cardRadius, pointerEvents: "auto", zIndex: 2 }}
                  onClick={(e) => { e.stopPropagation(); setExpandedIdx(hIdx); }}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="8.5,1.5 12.5,1.5 12.5,5.5" />
                    <line x1="12.5" y1="1.5" x2="8" y2="6" />
                    <polyline points="5.5,12.5 1.5,12.5 1.5,8.5" />
                    <line x1="1.5" y1="12.5" x2="6" y2="8" />
                  </svg>
                </button>
              )}

              {/* Show stats button — visible on robot card when stats hidden */}
              {!showStats && !isExpanded && (
                <button
                  className="absolute bottom-3 right-3 w-7 h-7 flex items-center justify-center cursor-pointer opacity-0 group-hover/card:opacity-60 transition-opacity duration-200"
                  style={{ borderRadius: cardRadius, pointerEvents: "auto" }}
                  onClick={() => setShowStats(true)}
                  title="Show stats (i)"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#525252" strokeWidth="1.3" strokeLinecap="round">
                    <rect x="1.5" y="2" width="4" height="10" rx="1" />
                    <line x1="8.5" y1="4" x2="12.5" y2="4" />
                    <line x1="8.5" y1="7" x2="12.5" y2="7" />
                    <line x1="8.5" y1="10" x2="11" y2="10" />
                  </svg>
                </button>
              )}
            </div>
          );
        };

        const arcProps = { drumAngle, drumRadius, drumFsMax, drumFsMin, drumFwMax, drumCompression, drumOpPower, drumXOffset, drumTracking, drumRange, drumMaskFade };

        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 11 }}>
            <div className="flex items-start" style={{ gap: cardGap }}>
              {/* Left group — arc + robot + stats */}
              <div className="relative flex items-start" style={{
                gap: cardGap,
                transform: splitHover ? "translateX(-12px)" : addHover ? "translateX(-16px)" : "translateX(0)",
                transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
              }}>
                {/* Left arc — positioned to the left of the robot */}
                <div className="absolute top-0 bottom-0 right-full" style={{
                  width: 200, zIndex: 2,
                  opacity: comparing && activeSide !== "left" ? 0.35 : 1,
                  transition: `opacity 0.3s ${ease}`,
                }}>
                  <ArcDots pos={springL.pos} onClickItem={(i) => { springL.jumpTo(i); if (comparing) setActiveSide("left"); }} dimmed={comparing && activeSide !== "left"} variant={arcStyle} {...arcProps} />
                </div>
                {renderRobot(hL, distL, springL.index, true)}
                {renderStats(hL)}
              </div>

              {/* Right group — stats + robot + arc */}
              <div className="relative flex items-start" style={{
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

                {/* Right robot — appears in compare mode */}
                <div className="flex-shrink-0 overflow-hidden" style={{
                  opacity: comparing ? 1 : 0,
                  transform: `scale(${comparing ? 1 : 0.95})`,
                  width: comparing ? "auto" : 0,
                  transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}, width ${dur} ${ease}`,
                }}>
                  {renderRobot(hR, distR, springR.index, false)}
                </div>

                {/* Right arc — positioned to the right of the robot */}
                <div className="absolute top-0 bottom-0 left-full" style={{
                  width: 200, zIndex: 2,
                  opacity: comparing ? (activeSide === "right" ? 1 : 0.35) : 0,
                  pointerEvents: comparing ? "auto" : "none",
                  transition: `opacity ${dur} ${ease}`,
                }}>
                  <ArcDots pos={springR.pos} mirrored onClickItem={(i) => { if (comparing) { springR.jumpTo(i); setActiveSide("right"); } }} dimmed={comparing && activeSide !== "right"} variant={arcStyle} {...arcProps} />
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
          </div>
          {arcStyle === "crown" && (
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Crown</p><button className="text-[9px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setDrumAngle(18); setDrumRadius(152); setDrumFsMax(20); setDrumFsMin(8); setDrumFwMax(500); setDrumCompression(0.59); setDrumOpPower(4.0); setDrumXOffset(120); setDrumMaskFade(35); setDrumRange(2); setDrumTracking(0.04); }}>Reset</button></div>
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
          </div>
          )}
        </div>
      )}

      {/* Click-away to close expanded */}
      {expandedIdx !== null && (
        <div className="fixed inset-0 z-[3]" onClick={() => setExpandedIdx(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INDEX — Minimal text list + Timeline sub-view
// ═══════════════════════════════════════════════════════════════
type IndexSubView = "list" | "timeline";

function TextIndex({ subView }: { subView: IndexSubView }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  // Group by year for timeline, sorted descending
  const byYear = humanoids.reduce<Record<number, { h: typeof humanoids[number]; idx: number }[]>>((acc, h, idx) => {
    const y = h.year ?? 0;
    if (!acc[y]) acc[y] = [];
    acc[y].push({ h, idx });
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).filter(Boolean).sort((a, b) => b - a);

  const timelineRef = useRef<HTMLDivElement>(null);

  // Map wheel Y → horizontal scroll for timeline
  useEffect(() => {
    if (subView !== "timeline") return;
    const el = timelineRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY + e.deltaX;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [subView]);

  // ── List sub-view ──
  if (subView === "list") {
    return (
      <div
        className="min-h-screen overflow-y-auto scrollbar-hide select-none relative"
        onMouseMove={(e) => {
          if (floatingRef.current) floatingRef.current.style.top = `${e.clientY - 140}px`;
        }}
      >
        <div className="max-w-[640px] mx-auto pt-24 pb-16 px-6 md:px-10">
          <p className="text-[13px] text-neutral-400 mb-10">{humanoids.length} humanoids</p>
          {humanoids.map((h, i) => (
            <div
              key={h.id}
              className="border-b border-neutral-100 py-4 cursor-pointer flex items-baseline gap-4 transition-colors"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="text-[11px] tabular-nums text-neutral-300 w-5">{String(i + 1).padStart(2, "0")}</span>
              <span
                className={`text-[13px] transition-colors duration-200 ${hovered === i ? "text-neutral-900 font-medium" : "text-neutral-500"}`}
                style={{ letterSpacing: "-0.02em" }}
              >
                {h.name}
              </span>
              <span className="text-[11px] text-neutral-300 ml-auto">{h.manufacturer}</span>
            </div>
          ))}
        </div>
        {hovered !== null && (
          <div ref={floatingRef} className="fixed pointer-events-none z-50 animate-blur-fade" style={{ right: "10%" }}>
            <div className="relative w-[200px] h-[280px]">
              <Image src={humanoids[hovered].imageUrl || "/robots/placeholder.png"} alt={humanoids[hovered].name} fill className="object-contain" sizes="200px" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Timeline sub-view ──
  const sortedYears = [...years].sort((a, b) => a - b); // oldest → newest (left → right)
  const YEAR_COL_W = 220;
  const PAD_X = 100;
  const timelineW = sortedYears.length * YEAR_COL_W + PAD_X * 2;

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white">
      {/* Robot preview — upper area */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center pointer-events-none" style={{ height: "50%" }}>
        {hovered !== null ? (
          <div className="animate-blur-fade flex flex-col items-center">
            <div className="relative w-[180px] h-[240px]">
              <Image src={humanoids[hovered].imageUrl || "/robots/placeholder.png"} alt={humanoids[hovered].name} fill className="object-contain" sizes="180px" />
            </div>
            <p className="text-[13px] font-medium mt-3" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em" }}>
              {humanoids[hovered].name}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {humanoids[hovered].manufacturer}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-300 italic">Hover to preview</p>
        )}
      </div>

      {/* Horizontal scrollable timeline — lower area */}
      <div
        ref={timelineRef}
        className="absolute bottom-0 left-0 right-0 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ height: "50%" }}
      >
        <div className="relative h-full" style={{ width: timelineW, minWidth: "100%" }}>
          {/* Horizontal line */}
          <div
            className="absolute bg-neutral-200"
            style={{ top: "50%", left: PAD_X - 20, right: PAD_X - 20, height: 1 }}
          />

          {/* Year columns */}
          {sortedYears.map((year, yi) => {
            const x = PAD_X + yi * YEAR_COL_W;
            const entries = byYear[year];

            return (
              <div key={year} className="absolute" style={{ left: x, top: 0, bottom: 0, width: YEAR_COL_W }}>
                {/* Dot on the line */}
                <div
                  className="absolute w-[7px] h-[7px] rounded-full bg-neutral-400"
                  style={{ top: "50%", left: 0, transform: "translate(-50%, -50%)" }}
                />

                {/* Year label — below the line */}
                <div className="absolute" style={{ top: "calc(50% + 16px)", left: 0, transform: "translateX(-50%)" }}>
                  <span className="text-[18px] font-medium tabular-nums" style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}>
                    {year}
                  </span>
                </div>

                {/* Names — stacked above the line, growing upward */}
                <div
                  className="absolute flex flex-col-reverse items-start gap-0.5"
                  style={{ bottom: "calc(50% + 14px)", left: -6 }}
                >
                  {entries.map(({ h, idx }) => (
                    <span
                      key={h.id}
                      className={`text-[13px] whitespace-nowrap cursor-pointer transition-colors duration-150 leading-relaxed ${
                        hovered === idx ? "text-neutral-900 font-medium" : "text-neutral-400"
                      }`}
                      style={{ letterSpacing: "-0.01em" }}
                      onMouseEnter={() => setHovered(idx)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {h.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
                          <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="24px" />
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
  const [layout, setLayout] = useState<Layout>("E");
  const [indexSubView, setIndexSubView] = useState<IndexSubView>("list");
  const [navStyle, setNavStyle] = useState<NavStyle>("floating");
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
            indexSubView={indexSubView}
            onIndexSubViewChange={setIndexSubView}
            navStyle={navStyle}
            onNavStyleChange={setNavStyle}
          />
        </div>
      )}

      {/* ── Content ── */}
      <div className={introDone ? "intro-content" : "opacity-0"}>
        {layout === "E" && <Browse goToIndex={goToIndex} />}
        {layout === "Z" && <TextIndex subView={indexSubView} />}
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
