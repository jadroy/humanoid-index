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

const INDEX_SUB_VIEWS = ["list", "timeline"] as const;

// ─── Layout Switcher ────────────────────────────────────────────
function LayoutSwitcher({
  active,
  onChange,
  indexSubView,
  onIndexSubViewChange,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  indexSubView: IndexSubView;
  onIndexSubViewChange: (v: IndexSubView) => void;
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto px-5 py-2.5 rounded-2xl border border-neutral-200/60 bg-white">
        {/* Mark — abstract humanoid form */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.25 }}>
          <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
          <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
        </svg>

        {/* View toggles — understated */}
        <div className="flex items-center gap-0.5">
          {ALL_LAYOUTS.map((l) => (
            <button
              key={l}
              onClick={() => onChange(l)}
              className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
              style={{
                color: active === l ? "var(--c-ink)" : "#c4c4c4",
                fontWeight: active === l ? 500 : 400,
              }}
            >
              {layoutLabels[l]}
            </button>
          ))}

          {/* Index sub-view options — appear inline when Index is active */}
          {active === "Z" && (
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
  const [pos, setPos] = useState(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const force = (targetRef.current - posRef.current) * sRef.current;
    velRef.current = (velRef.current + force) * dRef.current;
    posRef.current += velRef.current;
    if (Math.abs(posRef.current - targetRef.current) < 0.001 && Math.abs(velRef.current) < 0.001) {
      posRef.current = targetRef.current; velRef.current = 0; setPos(targetRef.current); rafRef.current = 0; return;
    }
    setPos(posRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => { if (rafRef.current) return; rafRef.current = requestAnimationFrame(tick); }, [tick]);

  const go = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(humanoids.length - 1, targetRef.current + delta));
    if (next === targetRef.current) return;
    targetRef.current = next; start();
  }, [start]);

  const jumpTo = useCallback((idx: number) => { targetRef.current = Math.max(0, Math.min(humanoids.length - 1, idx)); start(); }, [start]);

  useEffect(() => {
    posRef.current = targetRef.current; velRef.current = 0; setPos(targetRef.current); rafRef.current = 0;
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } };
  }, []);

  const index = Math.max(0, Math.min(humanoids.length - 1, Math.round(pos)));
  return { pos, index, go, jumpTo, targetRef };
}

// ═══════════════════════════════════════════════════════════════
// Arc styles
// ═══════════════════════════════════════════════════════════════
const ARC_STYLES = [
  // core
  "pills", "classic", "ticks", "minimal",
  // pill + number hybrids
  "h-clean", "h-stacked", "h-reveal", "h-flush", "h-mono",
  "h-light", "h-bold", "h-spaced", "h-underline", "h-tag",
] as const;
type ArcStyle = (typeof ARC_STYLES)[number];
const arcStyleLabels: Record<ArcStyle, string> = {
  pills: "Pills", classic: "Classic", ticks: "Ticks", minimal: "Minimal",
  "h-clean": "Clean", "h-stacked": "Stacked", "h-reveal": "Reveal", "h-flush": "Flush", "h-mono": "Mono",
  "h-light": "Light", "h-bold": "Bold", "h-spaced": "Spaced", "h-underline": "Underline", "h-tag": "Tag",
};

// ═══════════════════════════════════════════════════════════════
// Arc renderer — multiple visual styles along a translucent curved track
// ═══════════════════════════════════════════════════════════════
function ArcDots({ pos, mirrored, onClickItem, dimmed, variant = "pills" }: { pos: number; mirrored?: boolean; onClickItem: (idx: number) => void; dimmed?: boolean; variant?: ArcStyle }) {
  const R = 300, off = 30, range = 2;
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
        variant !== "minimal" && <circle cx={cx} cy="50%" r={R} fill="none" stroke="#e8e8e8" strokeWidth="1" style={{ opacity: dimmed ? 0.3 : 1 }} />
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

  if (mirrored) {
    return <div className="absolute inset-0" style={{ transform: "scaleX(-1)" }}>{content}</div>;
  }
  return <div className="absolute inset-0">{content}</div>;
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
            <span className="text-[9px] tracking-widest uppercase" style={{ color: "#b4b4b4" }}>{k.label}</span>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "right" ? "var(--c-ink)" : "#c4c4c4" }}>{rv ? `${rv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
          </div>
        );
      })}
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
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [arcStyle, setArcStyle] = useState<ArcStyle>("classic");
  const [nameStyle, setNameStyle] = useState<"top" | "bottom" | "left">("left");

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

  // Global wheel — always prevent default scroll, route to correct side
  const activeSideRef = useRef(activeSide); activeSideRef.current = activeSide;
  const comparingRef = useRef(comparing); comparingRef.current = comparing;
  useEffect(() => {
    let acc = 0;
    let decay: ReturnType<typeof setTimeout>;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      clearTimeout(decay);
      decay = setTimeout(() => { acc = 0; }, 150);
      if (Math.abs(acc) > thresholdRef.current) {
        const delta = acc > 0 ? 1 : -1;
        if (!comparingRef.current) {
          springL.go(delta);
        } else {
          // Route based on mouse position — left half vs right half
          const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
          if (side === "left") springL.go(delta); else springR.go(delta);
        }
        acc = 0;
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("wheel", onWheel); clearTimeout(decay); };
  }, [springL.go, springR.go]);

  // Keyboard — arrows control active side, tab switches, esc exits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && comparing) { e.preventDefault(); setActiveSide((s) => s === "left" ? "right" : "left"); return; }
      if (e.key === "Escape" && comparing) { setComparing(false); setActiveSide("left"); return; }
      if (e.key === "s") { setArcStyle((s) => ARC_STYLES[(ARC_STYLES.indexOf(s) + 1) % ARC_STYLES.length]); return; }
      if (e.key === "n") { setNameStyle((s) => s === "top" ? "bottom" : s === "bottom" ? "left" : "top"); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); activeGo(1); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); activeGo(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGo, comparing]);

  const applyPreset = (key: PresetKey) => { setPresetKey(key); setIsCustom(false); const p = SCROLL_PRESETS[key]; setCustomStiffness(p.stiffness); setCustomDamping(p.damping); setCustomThreshold(p.wheelThreshold); };
  const enterCompare = () => { springR.jumpTo(springL.index < humanoids.length - 1 ? springL.index + 1 : 0); setComparing(true); setActiveSide("right"); };
  const exitCompare = () => { setComparing(false); setActiveSide("left"); };

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
      {/* ── Left arc ── */}
      <div className="absolute top-0 bottom-0 left-0" style={{ width: "50%", zIndex: 2, opacity: comparing && activeSide !== "left" ? 0.35 : 1, transition: `opacity 0.3s ${ease}` }}
        onMouseEnter={() => comparing && setActiveSide("left")}
      >
        <ArcDots pos={springL.pos} onClickItem={(i) => { springL.jumpTo(i); if (comparing) setActiveSide("left"); }} dimmed={comparing && activeSide !== "left"} variant={arcStyle} />
      </div>

      {/* ── Right arc — only visible in compare ── */}
      <div
        className="absolute top-0 bottom-0 right-0"
        style={{
          width: "50%",
          zIndex: 2,
          opacity: comparing ? (activeSide === "right" ? 1 : 0.35) : 0,
          pointerEvents: comparing ? "auto" : "none",
          transition: `opacity ${dur} ${ease}`,
        }}
        onMouseEnter={() => comparing && setActiveSide("right")}
      >
        <ArcDots pos={springR.pos} mirrored onClickItem={(i) => { if (comparing) { springR.jumpTo(i); setActiveSide("right"); } }} dimmed={comparing && activeSide !== "right"} variant={arcStyle} />
      </div>

      {/* ── Add compare button — large hover zone, button appears on hover ── */}
      {!comparing && (
        <div
          className="absolute top-0 bottom-0 right-0 flex items-center group cursor-pointer"
          style={{ width: "45%", zIndex: 3, justifyContent: "center", paddingRight: "12%" }}
          onClick={enterCompare}
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

      {/* ── Remove compare button — shows between the two robots on hover ── */}
      {comparing && (
        <div
          className="absolute top-0 bottom-0 flex items-center justify-center group cursor-pointer"
          style={{ left: "40%", width: "20%", zIndex: 3 }}
          onClick={exitCompare}
        >
          <div
            className="rounded-full flex items-center justify-center transition-all duration-300 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
            style={{ width: 40, height: 40, background: "#ebebeb" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
          </div>
        </div>
      )}

      {/* ── Humanoid groups: [stats | robot] per side ── */}
      {(() => {
        const makeCards = (h: typeof humanoids[0]) => [
          { key: "name", show: true, content: (
            <>
              <p className="text-[15px] font-semibold" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em" }}>{h.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--c-ink-body)" }}>{h.manufacturer}{h.year ? ` · ${h.year}` : ""}</p>
            </>
          )},
          { key: "overview", show: !!(h.height || h.weight), content: (
            <>
              <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--c-ink)" }}>Overview</p>
              <div className="space-y-1">
                <p className="text-[12px]" style={{ color: "var(--c-ink-body)" }}><span style={{ color: "var(--c-ink-medium)", fontWeight: 500 }}>{h.height || "—"} cm</span> height</p>
                <p className="text-[12px]" style={{ color: "var(--c-ink-body)" }}><span style={{ color: "var(--c-ink-medium)", fontWeight: 500 }}>{h.weight || "—"} kg</span> weight</p>
              </div>
            </>
          )},
          { key: "dof", show: !!h.dof, content: (
            <>
              <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--c-ink)" }}>Degrees of Freedom</p>
              <p className="text-[12px]" style={{ color: "var(--c-ink-body)" }}><span style={{ color: "var(--c-ink-medium)", fontWeight: 500 }}>{h.dof || "—"}</span> DOF</p>
            </>
          )},
          { key: "speed", show: !!h.maxSpeed, content: (
            <>
              <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--c-ink)" }}>Speed</p>
              <p className="text-[12px]" style={{ color: "var(--c-ink-body)" }}><span style={{ color: "var(--c-ink-medium)", fontWeight: 500 }}>{h.maxSpeed || "—"} m/s</span> max</p>
            </>
          )},
          { key: "status", show: !!h.status, content: (
            <>
              <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--c-ink)" }}>Status</p>
              <p className="text-[12px]" style={{ color: "var(--c-ink-medium)", fontWeight: 500 }}>{h.status || "—"}</p>
              {h.cost && h.cost !== "N/A" && <p className="text-[12px] mt-0.5" style={{ color: "var(--c-ink-body)" }}>{h.cost}</p>}
            </>
          )},
          { key: "buy", show: !!(h.purchaseUrl || (h.cost && h.cost !== "N/A")), content: (
            h.purchaseUrl ? (
              <a href={h.purchaseUrl} target="_blank" rel="noopener noreferrer"
                className="pointer-events-auto block rounded-2xl"
                style={{ textDecoration: "none", background: "#2563eb", margin: "-14px -16px", padding: "14px 16px" }}>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>From {h.cost && h.cost !== "N/A" ? h.cost : ""}</p>
                <p className="text-[13px] font-medium mt-1" style={{ color: "#fff" }}>Buy &rarr;</p>
              </a>
            ) : (
              <div className="pointer-events-auto">
                <p className="text-[11px]" style={{ color: "#999" }}>{h.status === "In Production" ? "Starting at" : "Est."}</p>
                <p className="text-[14px] font-semibold mt-0.5" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em" }}>{h.cost}</p>
              </div>
            )
          )},
        ];

        const cardMorph = "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), padding 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

        const renderCards = (cards: ReturnType<typeof makeCards>) => (
          <div className="flex flex-col gap-2 flex-shrink-0 overflow-hidden" style={{
            width: 150,
            height: comparing ? "50vh" : "60vh",
            maxHeight: comparing ? "50vh" : "60vh",
            transition: `height ${dur} ${ease}, max-height ${dur} ${ease}`,
          }}>
            {cards.map((c) => (
              <div key={c.key} className="overflow-hidden" style={{
                borderRadius: 16, background: "#F7F7F7",
                maxHeight: c.show ? 120 : 0,
                padding: c.show ? "14px 16px" : "0 16px",
                opacity: c.show ? 1 : 0,
                marginBottom: c.show ? 0 : -8,
                transition: cardMorph,
              }}>{c.content}</div>
            ))}
          </div>
        );

        const renderRobot = (h: typeof humanoids[0], dist: number, idx: number) => (
          <div className="relative overflow-hidden flex-shrink-0" style={{
            width: comparing ? "22vw" : "30vw",
            height: comparing ? "50vh" : "60vh",
            maxWidth: comparing ? 300 : 400,
            borderRadius: 28,
            background: "#F7F7F7",
            transition: `width ${dur} ${ease}, height ${dur} ${ease}, max-width ${dur} ${ease}`,
          }}>
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ opacity: Math.max(0.5, 1 - dist * robotFade) }}>
              <div className="relative w-full h-full">
                <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes={comparing ? "22vw" : "30vw"} priority={idx === 0} />
              </div>
            </div>
          </div>
        );

        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
            <div className="flex items-start" style={{ gap: 8 }}>
              {/* Left robot */}
              {renderRobot(hL, distL, 0)}

              {/* Left stats (always visible) */}
              {renderCards(makeCards(hL))}

              {/* Right stats — slides in during compare */}
              <div className="flex-shrink-0 overflow-hidden" style={{
                width: comparing ? 150 : 0,
                opacity: comparing ? 1 : 0,
                transition: `width ${dur} ${ease}, opacity 0.3s ${ease} ${comparing ? "0.1s" : "0s"}`,
              }}>
                {renderCards(makeCards(hR))}
              </div>

              {/* Right robot — appears in compare mode */}
              <div className="flex-shrink-0 overflow-hidden" style={{
                opacity: comparing ? 1 : 0,
                transform: `scale(${comparing ? 1 : 0.95})`,
                width: comparing ? "auto" : 0,
                transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}, width ${dur} ${ease}`,
              }}>
                {renderRobot(hR, distR, 1)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tuner ── */}
      <button className="absolute top-20 right-5 z-50 text-[11px] text-neutral-300 hover:text-neutral-500 cursor-pointer transition-colors" onClick={() => setShowTuner(!showTuner)}>{showTuner ? "Close" : "Tune"}</button>
      {showTuner && (
        <div className="absolute top-28 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-5">
          <div><p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Presets</p><div className="flex flex-wrap gap-1.5">{(Object.keys(SCROLL_PRESETS) as PresetKey[]).map((key) => (<button key={key} onClick={() => applyPreset(key)} className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all ${presetKey === key && !isCustom ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{SCROLL_PRESETS[key].label}</button>))}</div></div>
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Fine Tune</p>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Stiffness <span className="tabular-nums text-neutral-400">{stiffness.toFixed(2)}</span></label><input type="range" min={2} max={40} value={Math.round(stiffness * 100)} onChange={(e) => { setCustomStiffness(Number(e.target.value) / 100); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Damping <span className="tabular-nums text-neutral-400">{damping.toFixed(2)}</span></label><input type="range" min={40} max={95} value={Math.round(damping * 100)} onChange={(e) => { setCustomDamping(Number(e.target.value) / 100); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Sensitivity <span className="tabular-nums text-neutral-400">{wheelThreshold}</span></label><input type="range" min={5} max={60} value={wheelThreshold} onChange={(e) => { setCustomThreshold(Number(e.target.value)); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Microinteractions</p>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Squish <span className="tabular-nums text-neutral-400">{robotSquish.toFixed(2)}</span></label><input type="range" min={0} max={15} value={Math.round(robotSquish * 100)} onChange={(e) => setRobotSquish(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Fade <span className="tabular-nums text-neutral-400">{robotFade.toFixed(2)}</span></label><input type="range" min={0} max={60} value={Math.round(robotFade * 100)} onChange={(e) => setRobotFade(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          </div>
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
      <div className="grid grid-cols-2 md:grid-cols-3 p-4 max-w-[1400px] mx-auto pt-16" style={{ gap: 15 }}>
        {humanoids.map((h, idx) => {
          const isSelected = selected === idx;
          return (
            <div
              key={h.id}
              className="group relative overflow-hidden cursor-pointer aspect-square"
              style={{
                borderRadius: 32,
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
          <p className="text-[12px] text-neutral-400 mb-10">{humanoids.length} humanoids</p>
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
            <p className="text-[14px] font-medium mt-3" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em" }}>
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
                  <span className="text-[18px] font-semibold tabular-nums" style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}>
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
                      className={`text-[12px] whitespace-nowrap cursor-pointer transition-colors duration-150 leading-relaxed ${
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
          <button onClick={handleSubmit} className="text-[12px] font-medium cursor-pointer" style={{ color: query ? "var(--c-ink)" : "#c4c4c4" }}>
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
] as const;

export default function Home() {
  const [layout, setLayout] = useState<Layout>("E");
  const [indexSubView, setIndexSubView] = useState<IndexSubView>("list");
  const [chatOpen, setChatOpen] = useState(false);
  const [goToIndex, setGoToIndex] = useState<number | null>(null);
  const [fontIdx, setFontIdx] = useState(0);
  const [textDim, setTextDim] = useState(0);
  const [showFontToast, setShowFontToast] = useState(false);
  const [showDimSlider, setShowDimSlider] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(null);

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

  return (
    <main
      className="min-h-screen bg-white"
      style={{ fontFamily: FONTS[fontIdx].family, "--text-dim": textDim } as React.CSSProperties}
    >
      <LayoutSwitcher
        active={layout}
        onChange={setLayout}
        indexSubView={indexSubView}
        onIndexSubViewChange={setIndexSubView}
      />

      {layout === "E" && <Browse goToIndex={goToIndex} />}
      {layout === "V" && <Grid />}
      {layout === "Z" && <TextIndex subView={indexSubView} />}

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
      <button
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{ background: chatOpen ? "var(--c-ink)" : "#F7F7F7", color: chatOpen ? "white" : "#999" }}
        onClick={() => setChatOpen(!chatOpen)}
      >
        <span className="text-[14px] font-medium">{chatOpen ? "×" : "?"}</span>
      </button>

      {chatOpen && <GuideChat onSelect={handleSelectHumanoid} />}
    </main>
  );
}
