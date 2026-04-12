"use client";

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
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

// ─── Logo mark ──────────────────────────────────────────────────
function LogoMark({
  fill = "var(--c-ink)",
  opacity = 0.25,
  size = 20,
  onClick,
  loading = false,
  hintNonce = 0,
  ringColor = "var(--c-ink)",
}: {
  fill?: string;
  opacity?: number;
  size?: number;
  onClick?: () => void;
  loading?: boolean;
  hintNonce?: number;
  ringColor?: string;
}) {
  const pad = 6;
  const total = size + pad * 2;

  // Swift draw ring when loading fires.
  const [ringKey, setRingKey] = useState(0);
  const [ringVisible, setRingVisible] = useState(false);
  useEffect(() => {
    if (!loading) return;
    setRingKey((k) => k + 1);
    setRingVisible(true);
    const t = setTimeout(() => setRingVisible(false), 720);
    return () => clearTimeout(t);
  }, [loading]);

  // Hint pulse — expanding ring each time hintNonce bumps.
  const [hintKey, setHintKey] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    if (!hintNonce) return;
    setHintKey((k) => k + 1);
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 2000);
    return () => clearTimeout(t);
  }, [hintNonce]);

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-pointer"
      style={{ width: total, height: total }}
      onClick={onClick}
    >
      {hintVisible && (
        <svg
          key={`hint-${hintKey}`}
          width={total}
          height={total}
          viewBox={`0 0 ${total} ${total}`}
          fill="none"
          className="absolute inset-0 pointer-events-none"
          style={{
            transformOrigin: "center",
            animation: "lucky-ring-hint 2000ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        >
          <circle
            cx={total / 2}
            cy={total / 2}
            r={total / 2 - 2}
            fill="none"
            stroke={ringColor}
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      )}
      {ringVisible && (
        <svg
          key={`ring-${ringKey}`}
          width={total}
          height={total}
          viewBox={`0 0 ${total} ${total}`}
          fill="none"
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={total / 2}
            cy={total / 2}
            r={total / 2 - 2}
            fill="none"
            stroke={ringColor}
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="88"
            strokeDashoffset="88"
            style={{
              opacity: 0,
              animation: "lucky-ring-swipe 700ms cubic-bezier(0.33, 1, 0.68, 1) forwards",
            }}
          />
        </svg>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        style={{ opacity }}
      >
        <circle cx="10" cy="5" r="3" fill={fill} />
        <rect x="7" y="9.5" width="6" height="8" rx="3" fill={fill} />
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
  onRandomHumanoid,
  luckyActive = false,
  hintNonce = 0,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  navStyle: NavStyle;
  onNavStyleChange: (s: NavStyle) => void;
  onRandomHumanoid?: () => void;
  luckyActive?: boolean;
  hintNonce?: number;
}) {
  const handleClick = () => {
    if (active !== "E") onChange("E" as Layout);
    onRandomHumanoid?.();
  };

  const mark = <LogoMark onClick={handleClick} loading={luckyActive} hintNonce={hintNonce} />;
  const solidMark = <LogoMark fill="#fff" opacity={0.4} onClick={handleClick} loading={luckyActive} hintNonce={hintNonce} ringColor="#fff" />;

  const frost = { background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } as React.CSSProperties;

  let navEl: React.ReactElement;
  // ── Style: floating (original — island with border) ──
  if (navStyle === "floating") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-5 py-2.5 rounded-sm border border-neutral-200/60" style={frost}>
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
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: pill — rounded capsule, tinted active state ──
  else if (navStyle === "pill") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-3 py-2 rounded-2xl" style={frost}>
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
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: underline — clean text with active underline ──
  else if (navStyle === "underline") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-4 py-2.5 rounded-sm" style={frost}>
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
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: bordered — full-width top bar with bottom border ──
  else if (navStyle === "bordered") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/60 pointer-events-auto" style={{ ...frost, paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex items-center gap-4 pb-3">
        <div>{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1">
            {ALL_LAYOUTS.map((l) => (
              <button key={l} onClick={() => onChange(l)}
                className="px-3 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
                style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
                {layoutLabels[l]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: minimal — just text, no container, no border ──
  else if (navStyle === "minimal") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-4 py-2.5 rounded-sm" style={frost}>
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
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: solid — dark bar, inverted text ──
  else navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{solidMark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-5 py-2.5 rounded-sm" style={{ background: "rgba(23,23,23,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
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
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  return navEl;
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
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const subscribersRef = useRef<Set<(p: number) => void>>(new Set());

  const notify = useCallback((p: number) => {
    subscribersRef.current.forEach((cb) => cb(p));
  }, []);

  const commitIndex = useCallback(() => {
    const next = Math.max(0, Math.min(humanoids.length - 1, Math.round(posRef.current)));
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  }, []);

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
      notify(targetRef.current);
      commitIndex();
      rafRef.current = 0;
      return;
    }
    notify(posRef.current + nudgeRef.current);
    commitIndex();
    rafRef.current = requestAnimationFrame(tick);
  }, [notify, commitIndex]);

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

  const subscribe = useCallback((cb: (p: number) => void) => {
    subscribersRef.current.add(cb);
    cb(posRef.current + nudgeRef.current);
    return () => { subscribersRef.current.delete(cb); };
  }, []);

  const getPos = useCallback(() => posRef.current + nudgeRef.current, []);
  const getVel = useCallback(() => velRef.current, []);

  useEffect(() => {
    posRef.current = targetRef.current; velRef.current = 0; nudgeRef.current = 0;
    indexRef.current = Math.round(targetRef.current);
    setIndex(indexRef.current);
    notify(targetRef.current);
    rafRef.current = 0;
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } };
  }, [notify]);

  return { index, subscribe, getPos, getVel, go, nudge, jumpTo, targetRef };
}

// ═══════════════════════════════════════════════════════════════
// Arc styles
// ═══════════════════════════════════════════════════════════════
const ARC_STYLES = [
  // core
  "crown", "arc-timeline", "pills", "classic", "ticks", "minimal",
  // pill + number hybrids
  "h-clean", "h-stacked", "h-reveal", "h-flush", "h-mono",
  "h-light", "h-bold", "h-spaced", "h-underline", "h-tag",
] as const;
type ArcStyle = (typeof ARC_STYLES)[number];
const arcStyleLabels: Record<ArcStyle, string> = {
  crown: "Crown", "arc-timeline": "Arc", pills: "Pills", classic: "Classic", ticks: "Ticks", minimal: "Minimal",
  "h-clean": "Clean", "h-stacked": "Stacked", "h-reveal": "Reveal", "h-flush": "Flush", "h-mono": "Mono",
  "h-light": "Light", "h-bold": "Bold", "h-spaced": "Spaced", "h-underline": "Underline", "h-tag": "Tag",
};

// ═══════════════════════════════════════════════════════════════
// Arc renderer — multiple visual styles along a translucent curved track
// ═══════════════════════════════════════════════════════════════
type SpringSubscribe = (cb: (p: number) => void) => () => void;

// Miscellaneous tint — older / legend entries get a gold fill in the arc timeline
const MISC_GOLD = "176,141,87"; // rgb parts of #b08d57
const isMisc = (h: typeof humanoids[0] | undefined) =>
  !!h && (h.id.startsWith("legend-") || (h.year ?? 0) < 2020);

// Imperative arc-timeline wheel: renders text nodes once per window, then
// updates their x/y/transform/fontSize/opacity directly in response to spring
// ticks — avoids a React reconciliation per frame.
function ArcTimelineWheel({ index, subscribe, mirrored, onClickItem, aInset, aWheelR, aStepDeg, aTextGap, aLineOp, aFsMax, aFsMin }: {
  index: number;
  subscribe: SpringSubscribe;
  mirrored?: boolean;
  onClickItem: (idx: number) => void;
  aInset: number; aWheelR: number; aStepDeg: number; aTextGap: number; aLineOp: number; aFsMax: number; aFsMin: number;
}) {
  const wheelR = aWheelR;
  const r = wheelR - aTextGap;
  const items: { i: number }[] = [];
  for (let n = index - 14; n <= index + 15; n++) {
    if (n >= 0 && n < humanoids.length) items.push({ i: n });
  }
  const textRefs = useRef<Array<SVGTextElement | null>>([]);

  useLayoutEffect(() => {
    const update = (pos: number) => {
      for (let idx = 0; idx < items.length; idx++) {
        const el = textRefs.current[idx];
        if (!el) continue;
        const i = items[idx].i;
        const misc = isMisc(humanoids[i]);
        const o = i - pos;
        const deg = o * aStepDeg;
        const rad = (deg * Math.PI) / 180;
        const baseAngle = mirrored ? Math.PI : 0;
        const theta = baseAngle + (mirrored ? -rad : rad);
        const cx = wheelR + Math.cos(theta) * r;
        const cy = wheelR + Math.sin(theta) * r;
        const tangentDeg = (theta * 180) / Math.PI + (mirrored ? 180 : 0);
        const dist = Math.abs(o);
        const isAct = dist < 0.5;
        const t = Math.min(dist / 10, 1);
        const fs = isAct ? aFsMax : Math.max(aFsMin, aFsMax - 4 - dist * 1.2);
        const fw = isAct ? 500 : 400;
        const op = Math.max(0.08, 1 - t * 0.9);
        const fill = misc
          ? (isAct ? `rgb(${MISC_GOLD})` : `rgba(${MISC_GOLD},${0.3 + (1 - t) * 0.45})`)
          : (isAct ? "var(--c-ink)" : `rgba(0,0,0,${0.15 + (1 - t) * 0.25})`);

        el.setAttribute("x", String(cx));
        el.setAttribute("y", String(cy));
        el.setAttribute("transform", `rotate(${tangentDeg}, ${cx}, ${cy})`);
        el.style.fontSize = `${fs}px`;
        el.style.fontWeight = String(fw);
        el.style.fill = fill;
        el.style.opacity = String(op);
      }
    };
    return subscribe(update);
  }, [items, subscribe, mirrored, wheelR, r, aStepDeg, aFsMax, aFsMin]);

  return (
    <div className="absolute inset-0 overflow-visible pointer-events-auto">
      <svg
        className="absolute overflow-visible pointer-events-auto"
        style={{
          width: wheelR * 2,
          height: wheelR * 2,
          top: "50%",
          ...(mirrored ? { left: "auto", right: -wheelR * 2 + aInset } : { left: -wheelR * 2 + aInset }),
          transform: "translateY(-50%)",
          transition: "left 0.55s cubic-bezier(0.16, 1, 0.3, 1), right 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        viewBox={`0 0 ${wheelR * 2} ${wheelR * 2}`}
      >
        <circle cx={wheelR} cy={wheelR} r={r} fill="none" stroke="#ebebeb" strokeWidth="0.5" style={{ opacity: aLineOp }} />
        {items.map(({ i }, idx) => {
          const name = humanoids[i]?.name ?? String(i).padStart(2, "0");
          return (
            <text
              key={i}
              ref={(el) => { textRefs.current[idx] = el; }}
              className="cursor-pointer"
              textAnchor={mirrored ? "end" : "start"}
              dominantBaseline="middle"
              onClick={() => onClickItem(i)}
              style={{
                fontFamily: "inherit",
                letterSpacing: "-0.02em",
                transition: "opacity 0.15s ease",
              }}
            >
              {name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ArcDots({ index, subscribe, mirrored, onClickItem, dimmed, variant = "pills", drumAngle: dAngle = 18, drumRadius: dRadius = 152, drumFsMax: dFsMax = 20, drumFsMin: dFsMin = 8, drumFwMax: dFwMax = 500, drumCompression: dComp = 0.59, drumOpPower: dOpPow = 4.0, drumXOffset: dXOff = 120, drumTracking: dTrack = 0.04, drumRange: dRange = 2, drumMaskFade: dMaskFade = 35, arcInset: aInset = 80, arcWheelR: aWheelR = 700, arcStepDeg: aStepDeg = 3.5, arcTextGap: aTextGap = 15, arcLineOp: aLineOp = 0.5, arcFsMax: aFsMax = 22, arcFsMin: aFsMin = 10 }: { index: number; subscribe: SpringSubscribe; mirrored?: boolean; onClickItem: (idx: number) => void; dimmed?: boolean; variant?: ArcStyle; drumAngle?: number; drumRadius?: number; drumFsMax?: number; drumFsMin?: number; drumFwMax?: number; drumCompression?: number; drumOpPower?: number; drumXOffset?: number; drumTracking?: number; drumRange?: number; drumMaskFade?: number; arcInset?: number; arcWheelR?: number; arcStepDeg?: number; arcTextGap?: number; arcLineOp?: number; arcFsMax?: number; arcFsMin?: number }) {
  // arc-timeline takes the imperative path to avoid React reconciliation per frame
  if (variant === "arc-timeline") {
    return <ArcTimelineWheel index={index} subscribe={subscribe} mirrored={mirrored} onClickItem={onClickItem} aInset={aInset} aWheelR={aWheelR} aStepDeg={aStepDeg} aTextGap={aTextGap} aLineOp={aLineOp} aFsMax={aFsMax} aFsMin={aFsMin} />;
  }

  // Other variants: subscribe locally so fractional updates stay contained
  // inside ArcDots instead of re-rendering Browse.
  const [pos, setPos] = useState<number>(index);
  useLayoutEffect(() => subscribe((p) => setPos(p)), [subscribe]);

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

  if (variant === "crown") {
    return (
      <div
        className="absolute top-0 bottom-0"
        style={{
          width: "100vw",
          ...(mirrored ? { right: 0, transform: "scaleX(-1)" } : { left: 0 }),
          ...finalMask,
        }}
      >
        {crownElements}
        {content}
      </div>
    );
  }
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
// Card "give" — subtle physical reactions to the spring, applied
// imperatively on each subscription tick.
// ═══════════════════════════════════════════════════════════════
const GIVE_STYLES = [
  "none", "squish-y", "squish-x", "breath", "sag", "float",
  "push", "lean", "tilt", "blur", "dim", "drag",
] as const;
type GiveStyle = (typeof GIVE_STYLES)[number];
const giveStyleLabels: Record<GiveStyle, string> = {
  none: "None",
  "squish-y": "Squish Y",
  "squish-x": "Squish X",
  breath: "Breath",
  sag: "Sag",
  float: "Float",
  push: "Push",
  lean: "Lean",
  tilt: "Tilt",
  blur: "Blur",
  dim: "Dim",
  drag: "Drag",
};

type GiveSettings = {
  velScale: number;   // multiplier applied to raw spring velocity
  pushAmt: number;    // px of translateY per unit velocity
  leanAmt: number;    // degrees of rotateZ per unit velocity
  tiltAmt: number;    // degrees of rotateX per unit velocity
  tiltDepth: number;  // perspective depth for tilt (px)
};

function applyGive(
  el: HTMLDivElement,
  variant: GiveStyle,
  pos: number,
  vel: number,
  s: GiveSettings,
) {
  const dist = Math.abs(pos - Math.round(pos)); // 0..0.5
  // Normalize velocity into roughly [-1, 1] for the reactive variants.
  const v = Math.max(-1, Math.min(1, vel * s.velScale));
  switch (variant) {
    case "none":
      el.style.transform = "";
      el.style.filter = "";
      return;
    case "squish-y":
      el.style.transform = `scaleY(${1 - dist * 0.04})`;
      el.style.filter = "";
      return;
    case "squish-x":
      el.style.transform = `scaleX(${1 - dist * 0.04})`;
      el.style.filter = "";
      return;
    case "breath":
      el.style.transform = `scale(${1 - dist * 0.025})`;
      el.style.filter = "";
      return;
    case "sag":
      el.style.transform = `translateY(${dist * 5}px)`;
      el.style.filter = "";
      return;
    case "float":
      el.style.transform = `translateY(${-dist * 5}px)`;
      el.style.filter = "";
      return;
    case "push":
      el.style.transform = `translateY(${v * s.pushAmt}px)`;
      el.style.filter = "";
      return;
    case "lean":
      el.style.transform = `rotate(${v * s.leanAmt}deg)`;
      el.style.filter = "";
      return;
    case "tilt":
      el.style.transform = `perspective(${s.tiltDepth}px) rotateX(${-v * s.tiltAmt}deg)`;
      el.style.filter = "";
      return;
    case "blur":
      el.style.transform = "";
      el.style.filter = `blur(${dist * 2.2}px)`;
      return;
    case "dim":
      el.style.transform = "";
      el.style.filter = `brightness(${1 - dist * 0.14})`;
      return;
    case "drag":
      el.style.transform = `scaleY(${1 - dist * 0.025}) translateY(${v * s.pushAmt * 0.6}px)`;
      el.style.filter = "";
      return;
  }
}

// ═══════════════════════════════════════════════════════════════
// BROWSE — Single + Compare
// ═══════════════════════════════════════════════════════════════
function Browse({ goToIndex, navStyle, onNavStyleChange, luckyNonce = 0, luckyActive = false, addHintNonce = 0, onEnterCompare }: { goToIndex?: number | null; navStyle: NavStyle; onNavStyleChange: (s: NavStyle) => void; luckyNonce?: number; luckyActive?: boolean; addHintNonce?: number; onEnterCompare?: () => void }) {
  const [presetKey, setPresetKey] = useState<PresetKey>("smooth");
  const [customStiffness, setCustomStiffness] = useState(0.10);
  const [customDamping, setCustomDamping] = useState(0.42);
  const [customThreshold, setCustomThreshold] = useState(54);
  const [robotSquish, setRobotSquish] = useState(0.00);
  const [robotFade, setRobotFade] = useState(0.08);
  const [bottomFadeH, setBottomFadeH] = useState(40);
  const [bottomFadeOpacity, setBottomFadeOpacity] = useState(0.9);
  const [showTuner, setShowTuner] = useState(false);
  const [buyLayout, setBuyLayout] = useState<"card" | "chip">("card");
  const [buyCardStyle, setBuyCardStyle] = useState<"split" | "dark">("split");
  const [isCustom, setIsCustom] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [splitHover, setSplitHover] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [arcStyle, setArcStyle] = useState<ArcStyle>("arc-timeline");

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
  const [arcInset, setArcInset] = useState(70);
  const [navTop, setNavTop] = useState(8);
  const [giveStyle, setGiveStyle] = useState<GiveStyle>("none");
  const [giveVelScale, setGiveVelScale] = useState(3);
  const [givePushAmt, setGivePushAmt] = useState(5);
  const [giveLeanAmt, setGiveLeanAmt] = useState(0.9);
  const [giveTiltAmt, setGiveTiltAmt] = useState(4);
  const [giveTiltDepth, setGiveTiltDepth] = useState(800);
  const [arcWheelR, setArcWheelR] = useState(700);
  const [arcStepDeg, setArcStepDeg] = useState(3.5);
  const [arcTextGap, setArcTextGap] = useState(15);
  const [arcLineOp, setArcLineOp] = useState(0.5);
  const [arcFsMax, setArcFsMax] = useState(22);
  const [arcFsMin, setArcFsMin] = useState(10);
  // Per-card gallery index: keyed by humanoid index
  const [galleryIdx, setGalleryIdx] = useState<Record<number, number>>({});
  const galleryScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // Inner-card refs — spring subscriptions drive a subtle "give" transform
  const leftCardRef = useRef<HTMLDivElement | null>(null);
  const rightCardRef = useRef<HTMLDivElement | null>(null);
  const [openStat, setOpenStat] = useState<string | null>(null);
  // Layout dimensions
  const [robotW, setRobotW] = useState(30);       // vw
  const [robotH, setRobotH] = useState(60);       // vh
  const [robotMaxW, setRobotMaxW] = useState(400); // px
  const [statsW, setStatsW] = useState(260);       // px
  const [cardGap, setCardGap] = useState(8);       // px
  const [statsGap, setStatsGap] = useState(8);     // px — gap between robot and stats
  const [cardRadius, setCardRadius] = useState(28);  // px

  // Compare-header split tuner
  const [showSplitTuner, setShowSplitTuner] = useState(false);
  const [splitVariant, setSplitVariant] = useState<"morph" | "push" | "lift" | "shrink" | "swap">("shrink");
  const [splitAmount, setSplitAmount] = useState(44);
  const [splitScale, setSplitScale] = useState(0.97);
  const [splitLiftY, setSplitLiftY] = useState(4);
  const [splitShadowOp, setSplitShadowOp] = useState(0.12);
  const [splitDur, setSplitDur] = useState(320); // ms

  // Adaptive arc positioning
  const [windowWidth, setWindowWidth] = useState(1920);
  const [autoArcInset, setAutoArcInset] = useState(true);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    let raf: number;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWindowWidth(window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
  }, []);

  const centerHalfWidth = (() => {
    const cardPx = comparing
      ? Math.min((robotW - 8) * windowWidth / 100, robotMaxW - 100)
      : Math.min(robotW * windowWidth / 100, robotMaxW);
    const statsPx = statsW;
    const gap = statsGap;
    if (comparing) {
      return cardPx + gap + statsPx / 2;
    }
    return (cardPx + gap + statsPx) / 2;
  })();

  const availableSpace = (windowWidth / 2) - centerHalfWidth;
  const adaptiveArcInset = Math.round(Math.min(180, Math.max(48, availableSpace * 0.3)));
  const adaptiveDrumXOffset = Math.round(Math.min(300, Math.max(40, availableSpace * 0.5)));
  const effectiveArcInset = autoArcInset ? adaptiveArcInset : arcInset;
  const effectiveDrumXOffset = autoArcInset ? adaptiveDrumXOffset : drumXOffset;

  // Publish the arc's leftmost-label x so the nav logo can align to it
  useEffect(() => {
    const x = Math.max(16, effectiveArcInset - arcTextGap);
    document.documentElement.style.setProperty("--arc-logo-x", `${x}px`);
  }, [effectiveArcInset, arcTextGap]);

  // Publish nav top offset as a CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-top", `${navTop}px`);
  }, [navTop]);

  const stiffness = isCustom ? customStiffness : SCROLL_PRESETS[presetKey].stiffness;
  const damping = isCustom ? customDamping : SCROLL_PRESETS[presetKey].damping;
  const wheelThreshold = isCustom ? customThreshold : SCROLL_PRESETS[presetKey].wheelThreshold;
  const thresholdRef = useRef(wheelThreshold); thresholdRef.current = wheelThreshold;

  const springL = useSpring(stiffness, damping);
  const springR = useSpring(stiffness, damping);
  const activeGo = comparing ? (activeSide === "left" ? springL.go : springR.go) : springL.go;

  // Continuous card "give" — dispatches to the active variant on each
  // spring tick. Variant + settings changes hot-swap the callback.
  const effectiveGive: GiveStyle = luckyActive ? "tilt" : giveStyle;
  const giveSettings: GiveSettings = {
    velScale: giveVelScale,
    pushAmt: givePushAmt,
    leanAmt: giveLeanAmt,
    tiltAmt: giveTiltAmt,
    tiltDepth: giveTiltDepth,
  };
  const giveSettingsRef = useRef(giveSettings);
  giveSettingsRef.current = giveSettings;
  const giveStyleRef = useRef(effectiveGive);
  giveStyleRef.current = effectiveGive;
  useLayoutEffect(() => {
    const make = (
      ref: React.MutableRefObject<HTMLDivElement | null>,
      getVel: () => number,
    ) => (pos: number) => {
      const el = ref.current;
      if (!el) return;
      applyGive(el, giveStyleRef.current, pos, getVel(), giveSettingsRef.current);
    };
    const unsubL = springL.subscribe(make(leftCardRef, springL.getVel));
    const unsubR = springR.subscribe(make(rightCardRef, springR.getVel));
    return () => { unsubL(); unsubR(); };
  }, [springL.subscribe, springR.subscribe, springL.getVel, springR.getVel]);

  // Re-apply immediately when variant or slider values change so the preview
  // reflects the new settings even while the spring is at rest.
  useLayoutEffect(() => {
    const apply = (ref: React.MutableRefObject<HTMLDivElement | null>, getPos: () => number, getVel: () => number) => {
      const el = ref.current;
      if (!el) return;
      applyGive(el, effectiveGive, getPos(), getVel(), giveSettingsRef.current);
    };
    apply(leftCardRef, springL.getPos, springL.getVel);
    apply(rightCardRef, springR.getPos, springR.getVel);
  }, [effectiveGive, giveVelScale, givePushAmt, giveLeanAmt, giveTiltAmt, giveTiltDepth, springL.getPos, springR.getPos, springL.getVel, springR.getVel]);

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

  // "I'm feeling lucky" — react to Home bumping the nonce. Skip the initial 0.
  useEffect(() => {
    if (!luckyNonce) return;
    const pickDifferent = (exclude: number[]) => {
      let t = Math.floor(Math.random() * humanoids.length);
      let guard = 0;
      while (exclude.includes(t) && guard++ < 20) {
        t = Math.floor(Math.random() * humanoids.length);
      }
      return t;
    };
    const targetL = pickDifferent([springL.index]);
    springL.jumpTo(targetL);
    if (comparing) {
      const targetR = pickDifferent([springR.index, targetL]);
      springR.jumpTo(targetR);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luckyNonce]);
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
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); activeGo(1); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); activeGo(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGo, comparing]);


  const applyPreset = (key: PresetKey) => { setPresetKey(key); setIsCustom(false); const p = SCROLL_PRESETS[key]; setCustomStiffness(p.stiffness); setCustomDamping(p.damping); setCustomThreshold(p.wheelThreshold); };
  const enterCompare = () => { springR.jumpTo(springL.index < humanoids.length - 1 ? springL.index + 1 : 0); setComparing(true); setActiveSide("right"); onEnterCompare?.(); };

  // Add-compare nudge — a quick double-tap leftward motion via CSS keyframe.
  // Bumps a key so the animation restarts on every nudge cycle.
  const [addNudgeKey, setAddNudgeKey] = useState(0);
  const [addHintVisible, setAddHintVisible] = useState(false);
  useEffect(() => {
    if (!addHintNonce) return;
    setAddNudgeKey((k) => k + 1);
    setAddHintVisible(true);
    const t = setTimeout(() => setAddHintVisible(false), 1400);
    return () => clearTimeout(t);
  }, [addHintNonce]);
  const exitCompare = () => { setComparing(false); setActiveSide("left"); setSplitHover(false); };

  const hL = humanoids[springL.index];
  const hR = humanoids[springR.index];
  const distL = Math.abs(springL.getPos() - springL.targetRef.current);
  const distR = Math.abs(springR.getPos() - springR.targetRef.current);
  const getStats = (h: typeof humanoids[0]) => [
    h.height && { label: "Height", value: `${h.height} cm` }, h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` }, h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];
  const statsL = getStats(hL);

  // Transition easing — Material standard: smooth, clean, no overshoot
  const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
  const dur = "0.5s";

  // Image preloader. Starts tight (±2 around current) then widens during
  // idle time until every humanoid's image has been fetched via the same
  // Next/Image optimization pipeline — crossings always hit cache, even
  // on the first pass.
  const [preloadRadius, setPreloadRadius] = useState(2);
  useEffect(() => {
    if (preloadRadius >= humanoids.length) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const w = window as IdleWindow;
    const run = () => setPreloadRadius((r) => Math.min(humanoids.length, r + 4));
    let handle: number;
    if (w.requestIdleCallback) {
      handle = w.requestIdleCallback(run, { timeout: 1500 });
      return () => { w.cancelIdleCallback?.(handle); };
    }
    handle = window.setTimeout(run, 400);
    return () => { window.clearTimeout(handle); };
  }, [preloadRadius]);

  const preloadIndices = (() => {
    const s = new Set<number>();
    const add = (idx: number) => {
      for (let k = -preloadRadius; k <= preloadRadius; k++) {
        const n = idx + k;
        if (n >= 0 && n < humanoids.length && k !== 0) s.add(n);
      }
    };
    add(springL.index);
    if (comparing) add(springR.index);
    return Array.from(s);
  })();
  const preloadSizes = `${Math.round(robotW)}vw`;

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white">
      {/* Neighbor-image preloader — off-screen Next/Image tags matching the
          card's sizes, so the optimized variants are cached before crossings. */}
      <div aria-hidden style={{ position: "absolute", left: -99999, top: 0, width: `${robotW}vw`, height: `${robotH}vh`, maxWidth: robotMaxW, pointerEvents: "none", opacity: 0 }}>
        {preloadIndices.map((i) => {
          const h = humanoids[i];
          if (!h?.imageUrl) return null;
          return (
            <div key={i} style={{ position: "absolute", inset: 0 }}>
              <Image src={h.imageUrl} alt="" fill sizes={preloadSizes} />
            </div>
          );
        })}
      </div>

      {/* Left arc nav */}
      <div className="fixed top-0 bottom-0 left-0 z-[3] pointer-events-none overflow-visible" style={{ width: 0 }}>
        <ArcDots
          index={springL.index}
          subscribe={springL.subscribe}
          onClickItem={(idx) => springL.jumpTo(idx)}
          variant={arcStyle}
          drumAngle={drumAngle}
          drumRadius={drumRadius}
          drumFsMax={drumFsMax}
          drumFsMin={drumFsMin}
          drumFwMax={drumFwMax}
          drumCompression={drumCompression}
          drumOpPower={drumOpPower}
          drumXOffset={effectiveDrumXOffset}
          drumTracking={drumTracking}
          drumRange={drumRange}
          drumMaskFade={drumMaskFade}
          arcInset={effectiveArcInset}
          arcWheelR={arcWheelR}
          arcStepDeg={arcStepDeg}
          arcTextGap={arcTextGap}
          arcLineOp={arcLineOp}
          arcFsMax={arcFsMax}
          arcFsMin={arcFsMin}
        />
      </div>
      {/* Right arc nav */}
      {comparing && (
        <div className="fixed top-0 bottom-0 right-0 z-[3] pointer-events-none overflow-visible" style={{ width: 0 }}>
          <ArcDots
            index={springR.index}
            subscribe={springR.subscribe}
            mirrored
            onClickItem={(idx) => springR.jumpTo(idx)}
            variant={arcStyle}
            drumAngle={drumAngle}
            drumRadius={drumRadius}
            drumFsMax={drumFsMax}
            drumFsMin={drumFsMin}
            drumFwMax={drumFwMax}
            drumCompression={drumCompression}
            drumOpPower={drumOpPower}
            drumXOffset={effectiveDrumXOffset}
            drumTracking={drumTracking}
            drumRange={drumRange}
            drumMaskFade={drumMaskFade}
            arcInset={effectiveArcInset}
            arcWheelR={arcWheelR}
            arcStepDeg={arcStepDeg}
            arcTextGap={arcTextGap}
            arcLineOp={arcLineOp}
            arcFsMax={arcFsMax}
            arcFsMin={arcFsMin}
          />
        </div>
      )}

      {/* ── Add compare button — hover zone right of center ── */}
      {!comparing && (() => {
        const addShown = addHover || addHintVisible;
        return (
          <div
            className="absolute top-0 bottom-0 right-0 flex items-center justify-center cursor-pointer"
            style={{ width: "38%", zIndex: 10 }}
            onClick={() => { setAddHover(false); enterCompare(); }}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
          >
            <div
              className="rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                width: 40,
                height: 40,
                background: "#ebebeb",
                opacity: addShown ? 1 : 0,
                transform: `scale(${addShown ? 1 : 0.75})`,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </div>
          </div>
        );
      })()}

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
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: `transform 0.42s ${ease}`, transform: open ? "rotate(180deg)" : "rotate(0)" }}>
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
        ];
        };

        const cardMorph = "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), padding 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

        const renderStats = (h: typeof humanoids[0]) => {
          const sections = statSections(h);
          return (
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
                        maxHeight: isOpen ? 140 : 0,
                        opacity: isOpen ? 1 : 0,
                        overflow: "hidden",
                        transition: `max-height 0.45s ${ease}, opacity 0.35s ${ease}`,
                      }}>
                        <div className="pb-2 pl-[22.5px]">{s.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {buyLayout === "card" && renderBuyCard(h)}
            </div>
          );
        };

        const renderBuyCard = (h: typeof humanoids[0]) => {
          const priceLabel = h.cost && h.cost !== "N/A" ? h.cost : null;
          const leadIn = h.status === "In Production" ? "From" : "Est.";
          const href = h.purchaseUrl;

          if (buyCardStyle === "split") {
            const disabled = !href;
            const priceContainer = (
              <div className="flex items-center pointer-events-auto" style={{
                flex: 1,
                minWidth: 0,
                borderRadius: cardRadius,
                background: "#FAFAFA",
                padding: "10px 16px",
                minHeight: 52,
                opacity: disabled ? 0.4 : 1,
              }}>
                {disabled ? (
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.01em" }}>
                    Not purchaseable
                  </p>
                ) : (
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: "#a3a3a3", letterSpacing: "0.08em" }}>
                      {priceLabel ? leadIn : "Price"}
                    </p>
                    <p className="text-[15px] font-medium tabular-nums mt-0.5 truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                      {priceLabel || "Inquire"}
                    </p>
                  </div>
                )}
              </div>
            );
            const circleStyle: React.CSSProperties = {
              width: 52,
              height: 52,
              borderRadius: 999,
              background: "#FAFAFA",
              flexShrink: 0,
            };
            const circleIcon = (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
              </svg>
            );
            const linkCircle = href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buy ${h.name}`}
                className="flex items-center justify-center pointer-events-auto transition-colors hover:bg-neutral-100"
                style={{ ...circleStyle, textDecoration: "none" }}
              >
                {circleIcon}
              </a>
            ) : (
              <div className="flex items-center justify-center pointer-events-auto" style={{ ...circleStyle, opacity: 0.4 }}>
                {circleIcon}
              </div>
            );
            return (
              <div className="flex items-center" style={{ flexShrink: 0, gap: cardGap }}>
                {priceContainer}
                {linkCircle}
              </div>
            );
          }

          // "dark" — slim sleek premium CTA
          if (!href && !priceLabel) return null;
          const darkBody = (
            <>
              <span className="text-[9px] tracking-[0.14em] uppercase font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {href ? "Purchase" : "Price"}
              </span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-[12px] font-medium tabular-nums truncate" style={{ color: "#fff", letterSpacing: "-0.01em" }}>
                  {priceLabel || "Inquire"}
                </span>
                {href && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                    <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
                  </svg>
                )}
              </span>
            </>
          );
          const darkStyle: React.CSSProperties = {
            background: "#0f0f10",
            borderRadius: 999,
            padding: "7px 14px",
            flexShrink: 0,
            height: 32,
          };
          const darkClass = "flex items-center justify-between gap-3 pointer-events-auto transition-[filter] hover:brightness-125";
          return href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={darkClass} style={{ ...darkStyle, textDecoration: "none" }}>
              {darkBody}
            </a>
          ) : (
            <div className={darkClass} style={darkStyle}>{darkBody}</div>
          );
        };

        const renderMergedStats = () => {
          const heightL = hL.height ?? 0, heightR = hR.height ?? 0;
          const weightL = hL.weight ?? 0, weightR = hR.weight ?? 0;
          const dofL = hL.dof ?? 0, dofR = hR.dof ?? 0;
          const speedL = hL.maxSpeed ?? 0, speedR = hR.maxSpeed ?? 0;
          const statusColor = (status?: string) => status === "In Production" ? "#22c55e" : status === "Prototype" ? "#eab308" : status === "Concept" ? "#3b82f6" : "#a3a3a3";

          const compareRow = (label: string, valL: string | null, valR: string | null, lWin: boolean, rWin: boolean) => (
            <div className="flex items-baseline justify-between gap-2" style={{ marginTop: 6 }}>
              <p className="text-[11px] tabular-nums flex-1 text-left" style={{ color: lWin ? "var(--c-ink)" : "#c4c4c4" }}>{valL || "—"}</p>
              <p className="text-[9px] uppercase text-center" style={{ color: "#a3a3a3", letterSpacing: "0.08em", minWidth: 44 }}>{label}</p>
              <p className="text-[11px] tabular-nums flex-1 text-right" style={{ color: rWin ? "var(--c-ink)" : "#c4c4c4" }}>{valR || "—"}</p>
            </div>
          );

          const sections = [
            {
              key: "overview",
              show: !!(heightL || weightL || heightR || weightR),
              label: (
                <div className="flex items-center gap-2.5">
                  {icoRuler}
                  <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Overview</p>
                </div>
              ),
              detail: (
                <div>
                  {(heightL || heightR) ? compareRow("Height", heightL ? `${heightL} cm` : null, heightR ? `${heightR} cm` : null, heightL > heightR && heightL > 0, heightR > heightL && heightR > 0) : null}
                  {(weightL || weightR) ? compareRow("Weight", weightL ? `${weightL} kg` : null, weightR ? `${weightR} kg` : null, weightL > 0 && (weightR === 0 || weightL < weightR), weightR > 0 && (weightL === 0 || weightR < weightL)) : null}
                </div>
              ),
            },
            {
              key: "dof",
              show: !!(dofL || dofR),
              label: (
                <div className="flex items-center gap-2.5">
                  {icoDof}
                  <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Degrees of Freedom</p>
                </div>
              ),
              detail: compareRow("DOF", dofL ? `${dofL}` : null, dofR ? `${dofR}` : null, dofL > dofR && dofL > 0, dofR > dofL && dofR > 0),
            },
            {
              key: "speed",
              show: !!(speedL || speedR),
              label: (
                <div className="flex items-center gap-2.5">
                  {icoSpeed}
                  <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Speed</p>
                </div>
              ),
              detail: compareRow("Speed", speedL ? `${speedL} m/s` : null, speedR ? `${speedR} m/s` : null, speedL > speedR && speedL > 0, speedR > speedL && speedR > 0),
            },
            {
              key: "status",
              show: !!(hL.status || hR.status),
              label: (
                <div className="flex items-center gap-2.5">
                  {icoStatus}
                  <p className="text-[13px] font-medium" style={{ color: "var(--c-ink-body)" }}>Status</p>
                </div>
              ),
              detail: (
                <div className="flex items-center gap-3" style={{ marginTop: 6 }}>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(hL.status) }} />
                    <p className="text-[11px] truncate" style={{ color: "var(--c-ink-body)" }}>{hL.status || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <p className="text-[11px] truncate" style={{ color: "var(--c-ink-body)" }}>{hR.status || "—"}</p>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(hR.status) }} />
                  </div>
                </div>
              ),
            },
          ];

          const headerCell = (h: typeof humanoids[0]) => (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: cardRadius * 0.6, background: h.logoUrl ? "transparent" : "#EFEFEF" }}>
                {h.logoUrl ? (
                  <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes="26px" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                    <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                    <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{h.name}</p>
                <p className="text-[9px] tracking-widest uppercase font-medium truncate" style={{ color: "#a3a3a3", letterSpacing: "0.06em", marginTop: 1 }}>{h.manufacturer}</p>
              </div>
            </div>
          );

          return (
            <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, gap: cardGap }}>
              {(() => {
                const active = splitHover;
                const sDur = `${splitDur}ms`;
                const unifiedL = `${cardRadius}px 0 0 ${cardRadius}px`;
                const unifiedR = `0 ${cardRadius}px ${cardRadius}px 0`;
                const roundedAll: string | number = cardRadius;
                let containerGap = 0;
                let leftRadius: string | number = active ? roundedAll : unifiedL;
                let rightRadius: string | number = active ? roundedAll : unifiedR;
                let leftTransform = "translateX(0)";
                let rightTransform = "translateX(0)";
                let leftShadow = "none";
                let rightShadow = "none";
                let transformOrigin = "center center";

                if (splitVariant === "morph") {
                  containerGap = active ? splitAmount : 0;
                } else if (splitVariant === "push") {
                  leftTransform = active ? `translateX(-${splitAmount / 2}px)` : "translateX(0)";
                  rightTransform = active ? `translateX(${splitAmount / 2}px)` : "translateX(0)";
                } else if (splitVariant === "lift") {
                  containerGap = active ? splitAmount : 0;
                  leftTransform = active ? `translateY(-${splitLiftY}px)` : "translateY(0)";
                  rightTransform = active ? `translateY(-${splitLiftY}px)` : "translateY(0)";
                  const blur = Math.max(6, splitLiftY * 3);
                  leftShadow = active ? `0 ${splitLiftY + 2}px ${blur}px rgba(0,0,0,${splitShadowOp})` : "none";
                  rightShadow = leftShadow;
                } else if (splitVariant === "shrink") {
                  containerGap = active ? splitAmount : 0;
                  leftTransform = active ? `scale(${splitScale})` : "scale(1)";
                  rightTransform = active ? `scale(${splitScale})` : "scale(1)";
                  transformOrigin = "center center";
                } else if (splitVariant === "swap") {
                  containerGap = active ? splitAmount : 0;
                  leftTransform = active ? `translateX(${splitAmount / 2}px)` : "translateX(0)";
                  rightTransform = active ? `translateX(-${splitAmount / 2}px)` : "translateX(0)";
                }

                const pillTransition = `border-radius ${sDur} ${ease}, transform ${sDur} ${ease}, box-shadow ${sDur} ${ease}`;

                return (
                  <div className="flex items-center pointer-events-auto" style={{
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 11,
                    gap: containerGap,
                    transition: `gap ${sDur} ${ease}`,
                  }}>
                    <div className="flex-1 min-w-0 flex items-center" style={{
                      background: "#FAFAFA",
                      padding: "10px 12px",
                      borderRadius: leftRadius,
                      transform: leftTransform,
                      boxShadow: leftShadow,
                      transformOrigin,
                      transition: pillTransition,
                    }}>
                      {headerCell(hL)}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center" style={{
                      background: "#FAFAFA",
                      padding: "10px 12px",
                      borderRadius: rightRadius,
                      transform: rightTransform,
                      boxShadow: rightShadow,
                      transformOrigin,
                      transition: pillTransition,
                    }}>
                      {headerCell(hR)}
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-col pointer-events-auto" style={{ padding: "6px 12px", borderRadius: cardRadius, background: "#FCFCFC", position: "relative", zIndex: 11 }}>
                {sections.filter((s) => s.show).map((s) => {
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
                        maxHeight: isOpen ? 140 : 0,
                        opacity: isOpen ? 1 : 0,
                        overflow: "hidden",
                        transition: `max-height 0.45s ${ease}, opacity 0.35s ${ease}`,
                      }}>
                        <div className="pb-2">{s.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        };

        const renderMedia = (mh: typeof humanoids[0], mIdx: number, markPriority: boolean) => {
          const mGallery = mh.media?.filter((m) => m.type === "image") || [];
          const mImages = [mh.imageUrl, ...mGallery.map((m) => m.url)].filter(Boolean) as string[];
          const mHasGallery = mImages.length > 1;
          const mCurrent = galleryIdx[mIdx] || 0;

          const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            if (idx !== (galleryIdx[mIdx] || 0)) {
              setGalleryIdx((prev) => ({ ...prev, [mIdx]: idx }));
            }
          };

          return (
            <>
              {/* New badge — rides with the humanoid */}
              {mh.year === 2025 && (
                <div className="absolute top-3 left-3 z-20 px-2 py-0.5 text-[9px] tracking-[0.08em] uppercase font-medium" style={{ borderRadius: Math.max(3, cardRadius - 1), background: "#fef0e4", color: "#c47a2a" }}>New</div>
              )}
              <div
                ref={(el) => { galleryScrollRefs.current[mIdx] = el; }}
                data-gallery-scroll={mHasGallery ? "" : undefined}
                className="scrollbar-hide"
                style={{
                  display: "flex",
                  width: "100%", height: "100%",
                  overflowX: mHasGallery ? "auto" : "hidden",
                  overflowY: "hidden",
                  scrollSnapType: "x mandatory",
                }}
                onScroll={mHasGallery ? onScroll : undefined}
              >
                {mImages.length > 0 ? mImages.map((src, i) => (
                  <div key={i} className="relative flex items-center justify-center pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", padding: mh.imageFit === "cover" ? 0 : mh.imagePosition === "bottom" ? "24px 24px 0 24px" : 24 }}>
                    <div className="relative w-full h-full">
                      <Image src={src} alt={`${mh.name} ${i + 1}`} fill className={mh.imageFit === "cover" ? "object-cover" : "object-contain"} style={mh.imagePosition ? { objectPosition: mh.imagePosition } : undefined} sizes={comparing ? `${robotW - 8}vw` : `${robotW}vw`} priority={markPriority && i === 0} />
                    </div>
                  </div>
                )) : (
                  <div className="relative flex items-center justify-center p-6 pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0 }}>
                    <PlaceholderLogo />
                  </div>
                )}
              </div>

              {/* Bottom fade for cut-off images */}
              {mh.imagePosition?.includes("bottom") && (
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[2]" style={{ height: bottomFadeH, background: `linear-gradient(to bottom, transparent, rgba(250,250,250,${bottomFadeOpacity}))` }} />
              )}
              {/* Dot strip — overlaid at bottom with fade */}
              {mHasGallery && (
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-[3] pointer-events-none" style={{ height: 28, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))" }}>
                  <div className="flex gap-1.5">
                    {mImages.map((_, i) => (
                      <div key={i} style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: i === mCurrent ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)",
                        transition: "background 0.2s ease",
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        };

        const renderBuyChip = (h: typeof humanoids[0]) => {
          if (!h.purchaseUrl) return null;
          return (
            <div className="absolute z-[6]" style={{ top: 14, right: 14 }}>
              <a
                href={h.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buy ${h.name}`}
                className="flex items-center justify-center pointer-events-auto transition-transform hover:scale-[1.06]"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.08)",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1d1d1f" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M7 2.5v9M2.5 7h9" />
                </svg>
              </a>
            </div>
          );
        };

        const renderRobot = (h: typeof humanoids[0], _dist: number, hIdx: number, isFirst: boolean) => {
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

          return (
            <div className="relative flex-shrink-0 group/card" style={{ zIndex: 1 }}>
            {/* Inner card */}
            <div
              ref={isFirst ? leftCardRef : rightCardRef}
              className="relative flex flex-col overflow-hidden"
              style={{
                width: comparing ? `${robotW - 8}vw` : `${robotW}vw`,
                height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
                maxWidth: comparing ? robotMaxW - 100 : robotMaxW,
                borderRadius: cardRadius,
                background: "#FAFAFA",
                pointerEvents: "auto",
                transition: `width ${dur} ${ease}, height ${dur} ${ease}, max-width ${dur} ${ease}`,
                willChange: "transform",
              }}
            >
              {/* Media area */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                {renderMedia(h, hIdx, isFirst)}
              </div>

              {/* Hover arrows — anchored to the active humanoid's gallery */}
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

              {buyLayout === "chip" && renderBuyChip(h)}

            </div>


            </div>
          );
        };

        const effectiveGap = statsGap;
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 11 }}>
            <div className="flex items-start">
              {/* Left robot */}
              <div
                key={addHintVisible ? `nudge-${addNudgeKey}` : "idle-l"}
                className={addHintVisible ? "animate-add-nudge-double" : ""}
                style={{
                  transform: addHintVisible
                    ? undefined
                    : splitHover ? "translateX(-12px)" : addHover ? "translateX(-16px)" : "translateX(0)",
                  transition: addHintVisible ? undefined : `transform ${dur} ${ease}`,
                }}
              >
                {renderRobot(hL, distL, springL.index, true)}
              </div>

              {/* Stats slot — crossfade single ↔ merged */}
              <div
                key={addHintVisible ? `nudge-${addNudgeKey}-s` : "idle-s"}
                className={`flex-shrink-0 relative${addHintVisible ? " animate-add-nudge-double" : ""}`}
                style={{
                  marginLeft: effectiveGap,
                  overflowX: "visible", overflowY: "visible",
                  width: statsW,
                  height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
                  transform: addHintVisible
                    ? undefined
                    : !comparing && addHover ? "translateX(-16px)" : "translateX(0)",
                  transition: addHintVisible
                    ? `width ${dur} ${ease}, height ${dur} ${ease}, opacity ${dur} ${ease}, margin-left ${dur} ${ease}`
                    : `width ${dur} ${ease}, height ${dur} ${ease}, opacity ${dur} ${ease}, margin-left ${dur} ${ease}, transform ${dur} ${ease}`,
                }}
              >
                <div className="absolute inset-0" style={{
                  opacity: comparing ? 0 : 1,
                  pointerEvents: comparing ? "none" : "auto",
                  transition: `opacity 0.2s ${ease}`,
                }}>
                  {renderStats(hL)}
                </div>
                <div className="absolute inset-0" style={{
                  opacity: comparing ? 1 : 0,
                  pointerEvents: comparing ? "auto" : "none",
                  transition: `opacity 0.2s ${ease} ${comparing ? "0.06s" : "0s"}`,
                }}>
                  {renderMergedStats()}
                </div>

                {/* Exit compare — hover zone overlaying dual header; minus sits on divider */}
                {comparing && (
                  <div
                    className="absolute cursor-pointer pointer-events-auto flex items-center justify-center"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 48,
                      zIndex: 12,
                    }}
                    onClick={exitCompare}
                    onMouseEnter={() => setSplitHover(true)}
                    onMouseLeave={() => setSplitHover(false)}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: "#ebebeb",
                        opacity: splitHover ? 1 : 0,
                        transform: `scale(${splitHover ? 1 : 0.75})`,
                        transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="4" y1="8" x2="12" y2="8" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Right robot — compare only */}
              <div className="flex-shrink-0" style={{
                opacity: comparing ? 1 : 0,
                transform: `translateX(${splitHover ? 12 : 0}px) scale(${comparing ? 1 : 0.95})`,
                width: comparing ? "auto" : 0,
                marginLeft: comparing ? effectiveGap : 0,
                overflow: comparing ? "visible" : "hidden",
                transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}, width ${dur} ${ease}, margin-left ${dur} ${ease}`,
              }}>
                {renderRobot(hR, distR, springR.index, false)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tuner ── */}
      <button className="absolute top-20 right-5 z-50 text-[11px] text-neutral-300 hover:text-neutral-500 cursor-pointer transition-colors" onClick={() => setShowTuner(!showTuner)}>{showTuner ? "Close" : "Tune"}</button>

      <button className="absolute top-32 right-5 z-50 text-[11px] text-neutral-300 hover:text-neutral-500 cursor-pointer transition-colors" onClick={() => setShowSplitTuner(!showSplitTuner)}>{showSplitTuner ? "Close" : "Split"}</button>
      {showSplitTuner && (
        <div data-tuner className="absolute top-40 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Header Split</p>
            <div className="flex flex-wrap gap-1.5">
              {(["morph", "push", "lift", "shrink", "swap"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSplitVariant(v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all capitalize ${splitVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[10px] tracking-widest uppercase text-neutral-400">Fine Tune</p>
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">Split amount <span className="tabular-nums text-neutral-400">{splitAmount}px</span></label>
              <input type="range" min={0} max={120} value={splitAmount} onChange={(e) => setSplitAmount(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            {splitVariant === "shrink" && (
              <div>
                <label className="text-[10px] text-neutral-500 flex justify-between">Scale <span className="tabular-nums text-neutral-400">{splitScale.toFixed(2)}</span></label>
                <input type="range" min={70} max={100} value={Math.round(splitScale * 100)} onChange={(e) => setSplitScale(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
              </div>
            )}
            {splitVariant === "lift" && (
              <>
                <div>
                  <label className="text-[10px] text-neutral-500 flex justify-between">Lift Y <span className="tabular-nums text-neutral-400">{splitLiftY}px</span></label>
                  <input type="range" min={0} max={24} value={splitLiftY} onChange={(e) => setSplitLiftY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 flex justify-between">Shadow <span className="tabular-nums text-neutral-400">{splitShadowOp.toFixed(2)}</span></label>
                  <input type="range" min={0} max={40} value={Math.round(splitShadowOp * 100)} onChange={(e) => setSplitShadowOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
                </div>
              </>
            )}
            <div>
              <label className="text-[10px] text-neutral-500 flex justify-between">Duration <span className="tabular-nums text-neutral-400">{splitDur}ms</span></label>
              <input type="range" min={150} max={1200} step={10} value={splitDur} onChange={(e) => setSplitDur(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <div className="pt-2 border-t border-neutral-100">
            <button
              onClick={() => { setSplitVariant("shrink"); setSplitAmount(44); setSplitScale(0.97); setSplitLiftY(4); setSplitShadowOp(0.12); setSplitDur(320); }}
              className="text-[10px] text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      {showTuner && (
        <div data-tuner className="absolute top-28 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-5 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide" style={{ overscrollBehavior: "contain" }}>
          <div>
            <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Buy</p>
            <div className="flex flex-wrap gap-1.5">
              {(["card", "chip"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setBuyLayout(v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all capitalize ${buyLayout === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v === "card" ? "Stats card" : "Image chip"}
                </button>
              ))}
            </div>
            {buyLayout === "card" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["split", "dark"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setBuyCardStyle(v)}
                    className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all capitalize ${buyCardStyle === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-2">Arc Style</p><div className="flex flex-wrap gap-1.5">{ARC_STYLES.map((s) => (<button key={s} onClick={() => setArcStyle(s)} className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all ${arcStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{arcStyleLabels[s]}</button>))}</div></div>
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Nav</p>
            <div><p className="text-[10px] text-neutral-500 mb-1.5">Style</p><div className="flex flex-wrap gap-1.5">{NAV_STYLES.map((s) => (<button key={s} onClick={() => onNavStyleChange(s)} className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all capitalize ${navStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Top offset <span className="tabular-nums text-neutral-400">{navTop}px</span></label><input type="range" min={0} max={48} value={navTop} onChange={(e) => setNavTop(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[10px] tracking-widest uppercase text-neutral-400">Card Give</p><button className="text-[9px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setGiveVelScale(3); setGivePushAmt(5); setGiveLeanAmt(0.9); setGiveTiltAmt(4); setGiveTiltDepth(800); }}>Reset</button></div>
            <div className="flex flex-wrap gap-1.5">{GIVE_STYLES.map((s) => (<button key={s} onClick={() => setGiveStyle(s)} className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all ${giveStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{giveStyleLabels[s]}</button>))}</div>
            <div style={{ opacity: (giveStyle === "push" || giveStyle === "lean" || giveStyle === "tilt" || giveStyle === "drag") ? 1 : 0.3 }}><label className="text-[10px] text-neutral-500 flex justify-between">Velocity scale <span className="tabular-nums text-neutral-400">{giveVelScale.toFixed(1)}</span></label><input type="range" min={5} max={80} value={Math.round(giveVelScale * 10)} onChange={(e) => setGiveVelScale(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: (giveStyle === "push" || giveStyle === "drag") ? 1 : 0.3 }}><label className="text-[10px] text-neutral-500 flex justify-between">Push amount <span className="tabular-nums text-neutral-400">{givePushAmt}px</span></label><input type="range" min={0} max={30} value={givePushAmt} onChange={(e) => setGivePushAmt(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "lean" ? 1 : 0.3 }}><label className="text-[10px] text-neutral-500 flex justify-between">Lean amount <span className="tabular-nums text-neutral-400">{giveLeanAmt.toFixed(1)}°</span></label><input type="range" min={0} max={50} value={Math.round(giveLeanAmt * 10)} onChange={(e) => setGiveLeanAmt(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "tilt" ? 1 : 0.3 }}><label className="text-[10px] text-neutral-500 flex justify-between">Tilt amount <span className="tabular-nums text-neutral-400">{giveTiltAmt.toFixed(1)}°</span></label><input type="range" min={0} max={200} value={Math.round(giveTiltAmt * 10)} onChange={(e) => setGiveTiltAmt(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "tilt" ? 1 : 0.3 }}><label className="text-[10px] text-neutral-500 flex justify-between">Tilt depth <span className="tabular-nums text-neutral-400">{giveTiltDepth}px</span></label><input type="range" min={200} max={2000} step={50} value={giveTiltDepth} onChange={(e) => setGiveTiltDepth(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          {(arcStyle === "crown" || arcStyle === "arc-timeline") && (
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
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Scroll threshold <span className="tabular-nums text-neutral-400">{wheelThreshold}</span></label><input type="range" min={5} max={100} value={wheelThreshold} onChange={(e) => { setCustomThreshold(Number(e.target.value)); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[10px] text-neutral-500 flex-1">Auto position</label><button className={`px-2 py-0.5 rounded text-[9px] cursor-pointer ${autoArcInset ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setAutoArcInset(!autoArcInset)}>{autoArcInset ? "On" : "Off"}</button><span className="text-[9px] tabular-nums text-neutral-300">{effectiveArcInset}px</span></div>
            <div style={{ opacity: autoArcInset ? 0.3 : 1 }}><label className="text-[10px] text-neutral-500 flex justify-between">Arc inset <span className="tabular-nums text-neutral-400">{arcInset}px</span></label><input type="range" min={30} max={600} value={arcInset} onChange={(e) => { setArcInset(Number(e.target.value)); setAutoArcInset(false); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Arc radius <span className="tabular-nums text-neutral-400">{arcWheelR}px</span></label><input type="range" min={300} max={1500} value={arcWheelR} onChange={(e) => setArcWheelR(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Step angle <span className="tabular-nums text-neutral-400">{arcStepDeg.toFixed(1)}°</span></label><input type="range" min={10} max={80} value={Math.round(arcStepDeg * 10)} onChange={(e) => setArcStepDeg(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Text gap <span className="tabular-nums text-neutral-400">{arcTextGap}px</span></label><input type="range" min={0} max={80} value={arcTextGap} onChange={(e) => setArcTextGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Line opacity <span className="tabular-nums text-neutral-400">{arcLineOp.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(arcLineOp * 100)} onChange={(e) => setArcLineOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Font max <span className="tabular-nums text-neutral-400">{arcFsMax}px</span></label><input type="range" min={12} max={40} value={arcFsMax} onChange={(e) => setArcFsMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[10px] text-neutral-500 flex justify-between">Font min <span className="tabular-nums text-neutral-400">{arcFsMin}px</span></label><input type="range" min={6} max={20} value={arcFsMin} onChange={(e) => setArcFsMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
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
  // Anchors
  { name: "Geist Sans", family: "var(--font-geist-sans)" },
  { name: "Geist Mono", family: "var(--font-geist-mono)" },
  { name: "Inter", family: "var(--font-inter)" },
  // Aerospace / cockpit
  { name: "B612", family: "var(--font-b612)" },
  { name: "B612 Mono", family: "var(--font-b612-mono)" },
  { name: "Space Mono", family: "var(--font-space-mono)" },
  // Dev / computer
  { name: "JetBrains Mono", family: "var(--font-jetbrains-mono)" },
  { name: "IBM Plex Sans", family: "var(--font-ibm-plex-sans)" },
  { name: "IBM Plex Mono", family: "var(--font-ibm-plex-mono)" },
  { name: "Azeret Mono", family: "var(--font-azeret-mono)" },
  { name: "Chivo Mono", family: "var(--font-chivo-mono)" },
  { name: "Fira Code", family: "var(--font-fira-code)" },
  // Sci-fi / futuristic
  { name: "Orbitron", family: "var(--font-orbitron)" },
  { name: "Chakra Petch", family: "var(--font-chakra-petch)" },
  { name: "Oxanium", family: "var(--font-oxanium)" },
  { name: "Rajdhani", family: "var(--font-rajdhani)" },
  { name: "Exo 2", family: "var(--font-exo-2)" },
  { name: "Michroma", family: "var(--font-michroma)" },
  { name: "Major Mono Display", family: "var(--font-major-mono)" },
  // Contemporary geometric
  { name: "Tektur", family: "var(--font-tektur)" },
  { name: "Anta", family: "var(--font-anta)" },
  { name: "Syne", family: "var(--font-syne)" },
] as const;

export default function Home() {
  const [layout, setLayout] = useState<Layout>("E");

  const [navStyle, setNavStyle] = useState<NavStyle>("underline");
  const [chatOpen, setChatOpen] = useState(false);
  const [goToIndex, setGoToIndex] = useState<number | null>(null);
  const [luckyActive, setLuckyActive] = useState(false);
  const [luckyNonce, setLuckyNonce] = useState(0);
  const [luckyUsed, setLuckyUsed] = useState(false);
  const [hintNonce, setHintNonce] = useState(0);
  const [addHintNonce, setAddHintNonce] = useState(0);
  const [comparingUsed, setComparingUsed] = useState(false);
  const luckyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (luckyTimer.current) clearTimeout(luckyTimer.current); }, []);
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
      if (e.key === "R" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const idx = Math.floor(Math.random() * humanoids.length);
        setLayout("E");
        setGoToIndex(idx);
        setChatOpen(false);
        setTimeout(() => setGoToIndex(null), 100);
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

  const onRandomHumanoid = useCallback(() => {
    if (layout !== "E") setLayout("E");
    setChatOpen(false);
    setLuckyNonce((n) => n + 1);
    setLuckyActive(true);
    setLuckyUsed(true);
    if (luckyTimer.current) clearTimeout(luckyTimer.current);
    luckyTimer.current = setTimeout(() => setLuckyActive(false), 1400);
  }, [layout]);

  const introDone = introPhase === "done";

  // Subtle affordance: the add-compare nudge fires first (primary action),
  // then the logo pulse a bit later (secondary, lower priority). Repeats
  // until each one is used.
  useEffect(() => {
    if (!introDone) return;
    if (luckyUsed && comparingUsed) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fireCycle = () => {
      if (!comparingUsed) setAddHintNonce((n) => n + 1);
      if (!luckyUsed) {
        timers.push(setTimeout(() => setHintNonce((n) => n + 1), 5500));
      }
    };
    const schedule = (delay: number) => {
      const t = setTimeout(() => {
        fireCycle();
        schedule(20000);
      }, delay);
      timers.push(t);
    };
    schedule(5500);
    return () => { timers.forEach(clearTimeout); };
  }, [introDone, luckyUsed, comparingUsed]);

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
            onRandomHumanoid={onRandomHumanoid}
            luckyActive={luckyActive}
            hintNonce={hintNonce}
          />
        </div>
      )}

      {/* ── Content ── */}
      <div className={introDone ? "intro-content" : "opacity-0"}>
        {layout === "E" && <Browse goToIndex={goToIndex} navStyle={navStyle} onNavStyleChange={setNavStyle} luckyNonce={luckyNonce} luckyActive={luckyActive} addHintNonce={addHintNonce} onEnterCompare={() => setComparingUsed(true)} />}
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
