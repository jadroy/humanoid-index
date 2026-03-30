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
  onToggleChat,
  chatOpen,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  indexSubView: IndexSubView;
  onIndexSubViewChange: (v: IndexSubView) => void;
  onToggleChat: () => void;
  chatOpen: boolean;
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
                    color: indexSubView === v ? "#343433" : "#c4c4c4",
                    fontWeight: indexSubView === v ? 500 : 400,
                  }}
                >
                  {v}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Guide */}
        <button
          onClick={onToggleChat}
          className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{ background: chatOpen ? "#343433" : "transparent", color: chatOpen ? "white" : "#c4c4c4" }}
        >
          <span className="text-[12px] font-medium">{chatOpen ? "×" : "?"}</span>
        </button>
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
  "pills", "labeled", "hybrid", "classic", "ticks",
  "dots", "dash", "diamond", "outline", "glow",
  "minimal", "blade", "binary", "rings", "arrows",
  "blocks", "gradient", "rail", "morse", "scatter",
  "cross", "needle", "roman", "braille", "orbit",
] as const;
type ArcStyle = (typeof ARC_STYLES)[number];
const arcStyleLabels: Record<ArcStyle, string> = {
  pills: "Pills", labeled: "Labeled", hybrid: "Hybrid", classic: "Classic+", ticks: "Ticks",
  dots: "Dots", dash: "Dash", diamond: "Diamond", outline: "Outline", glow: "Glow",
  minimal: "Minimal", blade: "Blade", binary: "Binary", rings: "Rings", arrows: "Arrows",
  blocks: "Blocks", gradient: "Gradient", rail: "Rail", morse: "Morse", scatter: "Scatter",
  cross: "Cross", needle: "Needle", roman: "Roman", braille: "Braille", orbit: "Orbit",
};

// ═══════════════════════════════════════════════════════════════
// Arc renderer — multiple visual styles along a translucent curved track
// ═══════════════════════════════════════════════════════════════
function ArcDots({ pos, mirrored, onClickItem, dimmed, variant = "pills" }: { pos: number; mirrored?: boolean; onClickItem: (idx: number) => void; dimmed?: boolean; variant?: ArcStyle }) {
  const R = 480, off = 50, range = 3;
  const cx = -R + off;
  const getP = (o: number) => {
    const a = (o * 10 * Math.PI) / 180;
    return { x: cx + R * Math.cos(a), y: R * Math.sin(a) };
  };
  const items: { i: number; o: number }[] = [];
  const f = Math.floor(pos);
  for (let n = f - range; n <= f + range + 1; n++) if (n >= 0 && n < humanoids.length) items.push({ i: n, o: n - pos });

  const sid = mirrored ? "r" : "l";
  const noTrack = new Set<ArcStyle>(["classic", "minimal", "needle"]);
  const wideTrack = new Set<ArcStyle>(["ticks", "blocks", "rail", "dash"]);
  const trackW = wideTrack.has(variant) ? 44 : 38;

  const track = (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <filter id={`ts-${sid}`}>
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.04" />
        </filter>
      </defs>
      {noTrack.has(variant) ? (
        variant !== "minimal" && <circle cx={cx} cy="50%" r={R} fill="none" stroke="#e8e8e8" strokeWidth="1" style={{ opacity: dimmed ? 0.3 : 1 }} />
      ) : variant === "rail" ? (<>
        <circle cx={cx} cy="50%" r={R - 10} fill="none" stroke="rgba(230,230,230,0.7)" strokeWidth="2" style={{ opacity: dimmed ? 0.3 : 1 }} />
        <circle cx={cx} cy="50%" r={R + 10} fill="none" stroke="rgba(230,230,230,0.7)" strokeWidth="2" style={{ opacity: dimmed ? 0.3 : 1 }} />
      </>) : (
        <circle cx={cx} cy="50%" r={R} fill="none" stroke="rgba(243,243,243,0.85)" strokeWidth={trackW} filter={`url(#ts-${sid})`} style={{ opacity: dimmed ? 0.3 : 1 }} />
      )}
    </svg>
  );

  const toRoman = (n: number): string => {
    const v = [10,9,5,4,1], s = ["X","IX","V","IV","I"];
    let r = ""; for (let j = 0; j < v.length; j++) while (n >= v[j]) { r += s[j]; n -= v[j]; } return r || "0";
  };

  const renderItem = (i: number, o: number) => {
    const abs = Math.abs(o), p = getP(o), t = Math.min(abs, 1);
    const angleDeg = o * 10;
    const isActive = abs < 0.15;
    const bOp = dimmed ? 0.35 : 1;
    const ap = { left: `${p.x}px`, top: `calc(50% + ${p.y}px)` };
    const cr = { ...ap, transform: `translate(-50%, -50%) rotate(${angleDeg}deg)` };
    const co = { ...ap, transform: "translateY(-50%)" };

    // ── pills ──
    if (variant === "pills") {
      const op = (isActive ? 1 : Math.max(0.3, 0.65 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 6 : 4, height: isActive ? 24 : 12 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── labeled ──
    if (variant === "labeled") {
      const op = (isActive ? 1 : Math.max(0.3, 0.65 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ transform: `rotate(${angleDeg}deg)` }}>
          <div style={{ width: isActive ? 6 : 4, height: isActive ? 24 : 12 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#222" : "#aaa" }} />
        </div>
        {isActive && <span className="absolute left-5 top-1/2 -translate-y-1/2 tabular-nums font-semibold" style={{ fontSize: 28, letterSpacing: "-0.04em", color: "#222", transform: mirrored ? "scaleX(-1)" : undefined, whiteSpace: "nowrap" }}>{String(i).padStart(2, "0")}</span>}
      </div>);
    }
    // ── hybrid ──
    if (variant === "hybrid") {
      const op = (isActive ? 1 : Math.max(0.15, 0.45 - abs * 0.1)) * bOp;
      const fs = isActive ? 30 : 18 + (1 - t) * 6;
      return (<div key={i} className="absolute flex items-center gap-3 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 5 : 3.5, height: isActive ? 22 : 10 + (1 - t) * 4, borderRadius: 99, background: isActive ? "#222" : "#bbb", transform: `rotate(${angleDeg}deg)` }} />
        <span className="tabular-nums" style={{ fontSize: fs, letterSpacing: "-0.04em", lineHeight: 1, color: isActive ? "#222" : "#bbb", fontWeight: isActive ? 600 : 400, transform: mirrored ? "scaleX(-1)" : undefined }}>{String(i).padStart(2, "0")}</span>
      </div>);
    }
    // ── classic+ ──
    if (variant === "classic") {
      const dot = 3 + (1 - t) * 3, fs = 24 + (1 - t) * 10;
      const op = (abs < 0.1 ? 1 : Math.max(0, 0.4 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute flex items-center gap-2.5 cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <div className="rounded-full flex-shrink-0" style={{ width: dot, height: dot, opacity: 0.2 + (1 - t) * 0.8, background: "#343433" }} />
        <span className="tabular-nums font-medium" style={{ fontSize: fs, letterSpacing: "-0.04em", lineHeight: 1, fontStyle: t > 0.5 ? "italic" : "normal", opacity: 0.2 + (1 - t) * 0.8, color: "#343433", transform: mirrored ? "scaleX(-1)" : undefined }}>{String(i).padStart(2, "0")}</span>
      </div>);
    }
    // ── ticks ──
    if (variant === "ticks") {
      const op = (isActive ? 1 : Math.max(0.25, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 20 : 10 + (1 - t) * 4, height: isActive ? 5 : 3, borderRadius: 99, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── dots (round dots, active larger) ──
    if (variant === "dots") {
      const sz = isActive ? 10 : 4 + (1 - t) * 2;
      const op = (isActive ? 1 : Math.max(0.3, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: sz, height: sz, borderRadius: "50%", background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── dash (horizontal dashes) ──
    if (variant === "dash") {
      const op = (isActive ? 1 : Math.max(0.25, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 22 : 12 + (1 - t) * 4, height: isActive ? 3 : 2, borderRadius: 1, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── diamond (rotated squares) ──
    if (variant === "diamond") {
      const sz = isActive ? 10 : 5 + (1 - t) * 2;
      const op = (isActive ? 1 : Math.max(0.25, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: `translate(-50%,-50%) rotate(${angleDeg + 45}deg)`, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: sz, height: sz, borderRadius: 1.5, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── outline (hollow pills) ──
    if (variant === "outline") {
      const h = isActive ? 24 : 12 + (1 - t) * 4, w = isActive ? 8 : 5;
      const op = (isActive ? 1 : Math.max(0.3, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: w, height: h, borderRadius: 99, border: `${isActive ? 2 : 1.5}px solid ${isActive ? "#222" : "#bbb"}` }} />
      </div>);
    }
    // ── glow (soft glowing orbs) ──
    if (variant === "glow") {
      const sz = isActive ? 12 : 5 + (1 - t) * 2;
      const op = (isActive ? 1 : Math.max(0.3, 0.55 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: sz, height: sz, borderRadius: "50%", background: isActive ? "#333" : "#bbb", boxShadow: isActive ? "0 0 12px 4px rgba(0,0,0,0.15)" : "0 0 6px 2px rgba(0,0,0,0.06)" }} />
      </div>);
    }
    // ── minimal (single dot, no track) ──
    if (variant === "minimal") {
      if (!isActive) return <div key={i} />;
      return (<div key={i} className="absolute" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: bOp }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#222" }} />
      </div>);
    }
    // ── blade (very thin, very tall) ──
    if (variant === "blade") {
      const op = (isActive ? 1 : Math.max(0.2, 0.55 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 3 : 1.5, height: isActive ? 40 : 18 + (1 - t) * 8, borderRadius: 99, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── binary ──
    if (variant === "binary") {
      const fs = isActive ? 16 : 10 + (1 - t) * 3;
      const op = (isActive ? 1 : Math.max(0.15, 0.45 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <span className="font-mono" style={{ fontSize: fs, color: isActive ? "#222" : "#bbb", fontWeight: isActive ? 700 : 400, letterSpacing: "0.05em", transform: mirrored ? "scaleX(-1)" : undefined, display: "inline-block" }}>{i.toString(2).padStart(5, "0")}</span>
      </div>);
    }
    // ── rings (hollow circles) ──
    if (variant === "rings") {
      const sz = isActive ? 14 : 7 + (1 - t) * 3;
      const op = (isActive ? 1 : Math.max(0.3, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: sz, height: sz, borderRadius: "50%", border: `${isActive ? 2.5 : 1.5}px solid ${isActive ? "#222" : "#aaa"}` }} />
      </div>);
    }
    // ── arrows (triangular pointers) ──
    if (variant === "arrows") {
      const sz = isActive ? 10 : 5 + (1 - t) * 2;
      const op = (isActive ? 1 : Math.max(0.25, 0.55 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: `translate(-50%,-50%) rotate(${angleDeg - 90}deg)`, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: 0, height: 0, borderLeft: `${sz / 2}px solid transparent`, borderRight: `${sz / 2}px solid transparent`, borderBottom: `${sz}px solid ${isActive ? "#222" : "#aaa"}` }} />
      </div>);
    }
    // ── blocks (square blocks) ──
    if (variant === "blocks") {
      const sz = isActive ? 12 : 6 + (1 - t) * 2;
      const op = (isActive ? 1 : Math.max(0.25, 0.6 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: sz, height: sz, borderRadius: 2, background: isActive ? "#222" : "#aaa" }} />
      </div>);
    }
    // ── gradient (hue-shifting pills) ──
    if (variant === "gradient") {
      const hue = (i / humanoids.length) * 240;
      const op = (isActive ? 1 : Math.max(0.3, 0.65 - abs * 0.12)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 6 : 4, height: isActive ? 24 : 12 + (1 - t) * 4, borderRadius: 99, background: isActive ? `hsl(${hue},60%,40%)` : `hsl(${hue},25%,72%)` }} />
      </div>);
    }
    // ── rail (crossbar ties) ──
    if (variant === "rail") {
      const op = (isActive ? 1 : Math.max(0.3, 0.55 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: isActive ? 24 : 16 + (1 - t) * 4, height: isActive ? 4 : 2.5, borderRadius: 1, background: isActive ? "#444" : "#bbb" }} />
      </div>);
    }
    // ── morse (dot-dash encoding) ──
    if (variant === "morse") {
      const mm: Record<string, string> = { "0":"−−−−−","1":"·−−−−","2":"··−−−","3":"···−−","4":"····−","5":"·····","6":"−····","7":"−−···","8":"−−−··","9":"−−−−·" };
      const code = String(i).split("").map(d => mm[d] || "").join(" ");
      const fs = isActive ? 14 : 9 + (1 - t) * 2;
      const op = (isActive ? 1 : Math.max(0.15, 0.4 - abs * 0.08)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <span className="font-mono" style={{ fontSize: fs, color: isActive ? "#222" : "#bbb", fontWeight: isActive ? 700 : 400, letterSpacing: "0.1em", whiteSpace: "nowrap", transform: mirrored ? "scaleX(-1)" : undefined, display: "inline-block" }}>{code}</span>
      </div>);
    }
    // ── scatter (cluster of tiny dots) ──
    if (variant === "scatter") {
      const count = isActive ? 7 : 3 + Math.round((1 - t) * 2);
      const spread = isActive ? 10 : 5 + (1 - t) * 3;
      const op = (isActive ? 1 : Math.max(0.3, 0.6 - abs * 0.12)) * bOp;
      const seed = i * 7;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        {Array.from({ length: count }, (_, j) => {
          const ang = ((seed + j * 137.5) % 360) * Math.PI / 180;
          const r = ((seed + j * 73) % 100) / 100 * spread;
          return <div key={j} style={{ position: "absolute", left: Math.cos(ang) * r, top: Math.sin(ang) * r, width: isActive ? 3 : 2, height: isActive ? 3 : 2, borderRadius: "50%", background: isActive ? "#333" : "#aaa" }} />;
        })}
      </div>);
    }
    // ── cross (plus-shaped) ──
    if (variant === "cross") {
      const sz = isActive ? 12 : 6 + (1 - t) * 2, th = isActive ? 2.5 : 1.5;
      const op = (isActive ? 1 : Math.max(0.25, 0.55 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...cr, opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ position: "relative", width: sz, height: sz }}>
          <div style={{ position: "absolute", left: "50%", top: 0, width: th, height: sz, marginLeft: -th / 2, borderRadius: 1, background: isActive ? "#222" : "#aaa" }} />
          <div style={{ position: "absolute", top: "50%", left: 0, width: sz, height: th, marginTop: -th / 2, borderRadius: 1, background: isActive ? "#222" : "#aaa" }} />
        </div>
      </div>);
    }
    // ── needle (long active indicator, dots for rest) ──
    if (variant === "needle") {
      const op = (isActive ? 1 : Math.max(0.2, 0.5 - abs * 0.1)) * bOp;
      if (isActive) return (<div key={i} className="absolute" style={{ ...cr, opacity: op }}>
        <div style={{ width: 2, height: 60, borderRadius: 99, background: "#222" }} />
      </div>);
      return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#bbb" }} />
      </div>);
    }
    // ── roman (roman numeral labels) ──
    if (variant === "roman") {
      const fs = isActive ? 22 : 12 + (1 - t) * 4;
      const op = (isActive ? 1 : Math.max(0.12, 0.4 - abs * 0.08)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <span style={{ fontSize: fs, fontWeight: isActive ? 600 : 400, letterSpacing: "0.06em", color: isActive ? "#222" : "#bbb", fontVariant: "small-caps", transform: mirrored ? "scaleX(-1)" : undefined, display: "inline-block" }}>{toRoman(i + 1)}</span>
      </div>);
    }
    // ── braille (braille unicode patterns) ──
    if (variant === "braille") {
      const fs = isActive ? 28 : 16 + (1 - t) * 4;
      const op = (isActive ? 1 : Math.max(0.2, 0.5 - abs * 0.1)) * bOp;
      return (<div key={i} className="absolute cursor-pointer" style={{ ...co, opacity: op }} onClick={() => onClickItem(i)}>
        <span style={{ fontSize: fs, color: isActive ? "#222" : "#bbb", transform: mirrored ? "scaleX(-1)" : undefined, display: "inline-block" }}>{String.fromCharCode(0x2800 + Math.min(i + 1, 255))}</span>
      </div>);
    }
    // ── orbit (spinning dot around a ring) ──
    const sz = isActive ? 16 : 8 + (1 - t) * 3;
    const op = (isActive ? 1 : Math.max(0.25, 0.55 - abs * 0.1)) * bOp;
    return (<div key={i} className="absolute cursor-pointer" style={{ ...ap, transform: "translate(-50%,-50%)", opacity: op }} onClick={() => onClickItem(i)}>
      <div style={{ width: sz, height: sz, borderRadius: "50%", border: `${isActive ? 1.5 : 1}px solid ${isActive ? "#222" : "#bbb"}`, position: "relative" }}>
        {isActive && <div className="animate-spin" style={{ position: "absolute", width: 4, height: 4, borderRadius: "50%", background: "#222", top: -2, left: "50%", marginLeft: -2, animationDuration: "2s" }} />}
      </div>
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
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "left" ? "#343433" : "#c4c4c4" }}>{lv ? `${lv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
            <span className="text-[9px] tracking-widest uppercase" style={{ color: "#b4b4b4" }}>{k.label}</span>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "right" ? "#343433" : "#c4c4c4" }}>{rv ? `${rv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BROWSE — Single + Compare
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
  const [comparing, setComparing] = useState(false);
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [arcStyle, setArcStyle] = useState<ArcStyle>("pills");

  const stiffness = isCustom ? customStiffness : SCROLL_PRESETS[presetKey].stiffness;
  const damping = isCustom ? customDamping : SCROLL_PRESETS[presetKey].damping;
  const wheelThreshold = isCustom ? customThreshold : SCROLL_PRESETS[presetKey].wheelThreshold;
  const thresholdRef = useRef(wheelThreshold); thresholdRef.current = wheelThreshold;

  const springL = useSpring(stiffness, damping);
  const springR = useSpring(stiffness, damping);
  const activeGo = comparing ? (activeSide === "left" ? springL.go : springR.go) : springL.go;

  // Wheel accumulators for each side
  const accL = useRef(0);
  const accR = useRef(0);
  const decayL = useRef<ReturnType<typeof setTimeout>>();
  const decayR = useRef<ReturnType<typeof setTimeout>>();

  const makeWheelHandler = useCallback((go: (d: number) => void, acc: React.MutableRefObject<number>, decay: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>) => {
    return (e: React.WheelEvent) => {
      e.preventDefault();
      acc.current += e.deltaY;
      clearTimeout(decay.current);
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
          className="absolute top-0 bottom-0 right-0 flex items-center justify-center group cursor-pointer"
          style={{ width: "20%", zIndex: 3 }}
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

      {/* ── Left robot — centered in single, slides left in compare ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <div
          key={springL.index}
          className="relative"
          style={{
            width: comparing ? "22vw" : "40vw",
            height: comparing ? "55vh" : "65vh",
            maxWidth: comparing ? 280 : 460,
            transform: `translateX(${comparing ? "-14vw" : "0"}) scale(${1 - distL * robotSquish})`,
            opacity: Math.max(0.5, 1 - distL * robotFade),
            transition: `width ${dur} ${ease}, height ${dur} ${ease}, max-width ${dur} ${ease}, transform ${dur} ${ease}`,
          }}
        >
          <Image src={hL.imageUrl || "/robots/placeholder.png"} alt={hL.name} fill className="object-contain" sizes={comparing ? "22vw" : "40vw"} priority />
        </div>
      </div>

      {/* ── Right robot — hidden in single, fades in for compare ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <div
          key={springR.index}
          className="relative"
          style={{
            width: "22vw", height: "55vh", maxWidth: 280,
            transform: `translateX(${comparing ? "14vw" : "10vw"}) scale(${comparing ? 1 - distR * robotSquish : 0.9})`,
            opacity: comparing ? Math.max(0.5, 1 - distR * robotFade) : 0,
            transition: `transform ${dur} ${ease}, opacity ${dur} ${ease}`,
            pointerEvents: "none",
          }}
        >
          <Image src={hR.imageUrl || "/robots/placeholder.png"} alt={hR.name} fill className="object-contain" sizes="22vw" />
        </div>
      </div>

      {/* ── Info panel (single mode) — between arc and robot ── */}
      <div className="absolute top-1/2 -translate-y-1/2" style={{
        left: "8%", zIndex: 2, opacity: comparing ? 0 : 1, pointerEvents: comparing ? "none" : "auto",
        transition: `opacity 0.3s ${ease}`,
      }}>
        <div key={springL.index} className="animate-arc-text">
          <h2 className="text-[20px] font-semibold" style={{ letterSpacing: "-0.02em", color: "#343433" }}>{hL.name}</h2>
          <p className="text-[12px] mt-1" style={{ color: "#747484" }}>{hL.manufacturer}{hL.year ? ` · ${hL.year}` : ""}</p>
          {statsL.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {statsL.map((s) => (
                <div key={s.label} className="flex items-baseline gap-2.5">
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: "#b4b4b4" }}>{s.label}</span>
                  <span className="text-[13px] font-medium tabular-nums" style={{ color: "#494440" }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Names under each robot (compare mode) ── */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none" style={{
        zIndex: 2, opacity: comparing ? 1 : 0, paddingBottom: "18vh",
        transition: `opacity 0.4s ${ease}`,
      }}>
        <div className="text-center" style={{ transform: `translateX(${comparing ? "-14vw" : "0"})`, transition: `transform ${dur} ${ease}` }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "#343433" }}>{hL.name}</h3>
          <p className="text-[11px]" style={{ color: "#747484" }}>{hL.manufacturer}</p>
        </div>
        <div style={{ width: "6vw" }} />
        <div className="text-center" style={{ transform: `translateX(${comparing ? "14vw" : "0"})`, transition: `transform ${dur} ${ease}` }}>
          <h3 className="text-[15px] font-semibold" style={{ color: "#343433" }}>{hR.name}</h3>
          <p className="text-[11px]" style={{ color: "#747484" }}>{hR.manufacturer}</p>
        </div>
      </div>

      {/* ── Stats centered between robots (compare mode) ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{
        zIndex: 3, opacity: comparing ? 1 : 0, pointerEvents: comparing ? "auto" : "none",
        transform: `translateX(-50%) translateY(${comparing ? "0" : "12px"})`,
        transition: `opacity 0.4s ${ease}, transform 0.4s ${ease}`,
      }}>
        <StatCompare left={hL} right={hR} />
      </div>

      {/* ── Bottom bar — adapts between modes ── */}
      <div className="absolute bottom-8 right-8 flex items-center gap-4" style={{ zIndex: 4 }}>
        {comparing && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: activeSide === "left" ? "#343433" : "#c4c4c4" }}>L</span>
              <span className="text-[9px]" style={{ color: "#ddd" }}>tab</span>
              <span className="text-[10px]" style={{ color: activeSide === "right" ? "#343433" : "#c4c4c4" }}>R</span>
            </div>
            <button className="text-[11px] cursor-pointer" style={{ color: "#c4c4c4" }} onClick={exitCompare}>esc</button>
          </>
        )}
        {!comparing && (
          <>
            <button className="text-[10px] tracking-widest uppercase cursor-pointer transition-colors hover:text-neutral-500" style={{ color: "#c4c4c4" }}
              onClick={() => setArcStyle((s) => ARC_STYLES[(ARC_STYLES.indexOf(s) + 1) % ARC_STYLES.length])}>
              {arcStyleLabels[arcStyle]} <span className="text-[9px] normal-case" style={{ color: "#ddd" }}>s</span>
            </button>
            <span className="text-[11px] tracking-widest tabular-nums" style={{ color: "#c4c4c4" }}>{String(springL.index + 1).padStart(2, "0")} / {String(humanoids.length).padStart(2, "0")}</span>
          </>
        )}
      </div>

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
            <p className="text-[14px] font-medium mt-3" style={{ color: "#343433", letterSpacing: "-0.02em" }}>
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
                  <span className="text-[18px] font-semibold tabular-nums" style={{ color: "#343433", letterSpacing: "-0.03em" }}>
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
function GuideChat({ onClose }: { onClose: () => void }) {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none">
      <div className="w-full max-w-[420px] rounded-2xl overflow-hidden pointer-events-auto" style={{ background: "white", border: "1px solid #e8e8e8", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        {/* Messages */}
        <div ref={scrollRef} className="max-h-[300px] overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`text-[13px] leading-relaxed max-w-[85%] px-3 py-2 rounded-2xl ${m.role === "user" ? "text-white" : ""}`}
                  style={m.role === "user" ? { background: "#343433", color: "white" } : { background: "#f5f5f5", color: "#494440" }}>
                  {m.text}
                </p>
              </div>
              {m.suggestions && (
                <div className="flex gap-2 mt-2 ml-1">
                  {m.suggestions.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: "#f5f5f5" }}>
                      <div className="relative w-6 h-8 flex-shrink-0">
                        <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="24px" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium" style={{ color: "#343433" }}>{h.name}</p>
                        <p className="text-[9px]" style={{ color: "#747484" }}>{h.manufacturer}</p>
                      </div>
                    </div>
                  ))}
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
            style={{ color: "#343433" }}
          />
          <button onClick={handleSubmit} className="text-[12px] font-medium cursor-pointer" style={{ color: query ? "#343433" : "#c4c4c4" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [layout, setLayout] = useState<Layout>("E");
  const [indexSubView, setIndexSubView] = useState<IndexSubView>("list");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <LayoutSwitcher
        active={layout}
        onChange={setLayout}
        indexSubView={indexSubView}
        onIndexSubViewChange={setIndexSubView}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
      />

      {layout === "E" && <Browse />}
      {layout === "V" && <Grid />}
      {layout === "Z" && <TextIndex subView={indexSubView} />}

      {chatOpen && <GuideChat onClose={() => setChatOpen(false)} />}
    </main>
  );
}
