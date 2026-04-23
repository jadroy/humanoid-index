"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { humanoids } from "@/data/humanoids";
import type { SpringSubscribe } from "@/hooks/useSpring";

// ═══════════════════════════════════════════════════════════════
// Arc styles
// ═══════════════════════════════════════════════════════════════
export const ARC_STYLES = [
  // core
  "crown", "arc-timeline", "arc-names", "arc-tag", "pills", "classic", "ticks", "minimal",
  // pill + number hybrids
  "h-clean", "h-stacked", "h-reveal", "h-flush", "h-mono",
  "h-light", "h-bold", "h-spaced", "h-underline", "h-tag",
] as const;
export type ArcStyle = (typeof ARC_STYLES)[number];
export const arcStyleLabels: Record<ArcStyle, string> = {
  crown: "Crown", "arc-timeline": "Arc", "arc-names": "Arc Names", "arc-tag": "Arc Tag", pills: "Pills", classic: "Classic", ticks: "Ticks", minimal: "Minimal",
  "h-clean": "Clean", "h-stacked": "Stacked", "h-reveal": "Reveal", "h-flush": "Flush", "h-mono": "Mono",
  "h-light": "Light", "h-bold": "Bold", "h-spaced": "Spaced", "h-underline": "Underline", "h-tag": "Tag",
};

// Per-variant arc tuner presets. Picking a variant resets the shared arc
// sliders to that variant's canonical values. Only variants whose look
// depends on the arc-* params need an entry; the rest (crown, pills, etc.)
// read their own controls.
export const ARC_PRESETS: Partial<Record<ArcStyle, { wheelR: number; stepDeg: number; textGap: number; diskGap?: number; lineOp?: number }>> = {
  "arc-names": { wheelR: 700, stepDeg: 3.5, textGap: 15, lineOp: 0 },
  "arc-timeline": { wheelR: 181, stepDeg: 8, textGap: 2, diskGap: 26 },
  "arc-tag": { wheelR: 181, stepDeg: 8, textGap: 2, diskGap: 26 },
};

// Imperative arc-timeline wheel: renders text nodes once per window, then
// updates their x/y/transform/fontSize/opacity directly in response to spring
// ticks — avoids a React reconciliation per frame.
function ArcTimelineWheel({ index, subscribe, mirrored, onClickItem, aInset, aWheelR, aStepDeg, aTextGap, aLineOp, aFsMax, aFsMin, aDiskGap, aDiskColor, entered }: {
  index: number;
  subscribe: SpringSubscribe;
  mirrored?: boolean;
  onClickItem: (idx: number) => void;
  aInset: number; aWheelR: number; aStepDeg: number; aTextGap: number; aLineOp: number; aFsMax: number; aFsMin: number;
  aDiskGap: number; aDiskColor: string; entered?: boolean;
}) {
  const wheelR = aWheelR;
  const r = wheelR - aTextGap;
  const items: { i: number }[] = [];
  for (let n = index - 10; n <= index + 10; n++) {
    if (n >= 0 && n < humanoids.length) items.push({ i: n });
  }
  const textRefs = useRef<Array<SVGTextElement | null>>([]);
  const groupRefs = useRef<Array<SVGGElement | null>>([]);

  // Configure text once per items window. Per-frame work only sets
  // transform + opacity on the group.
  useLayoutEffect(() => {
    for (let idx = 0; idx < items.length; idx++) {
      const text = textRefs.current[idx];
      if (!text) continue;
      text.setAttribute("x", "0");
      text.setAttribute("y", "0");
      text.style.fontSize = `${aFsMax}px`;
      text.style.fontWeight = "500";
      text.style.fill = "var(--c-ink)";
    }
  }, [items, aFsMax]);

  useLayoutEffect(() => {
    const baseAngle = mirrored ? Math.PI : 0;
    const stepRad = (aStepDeg * Math.PI) / 180;
    const mir = mirrored ? -1 : 1;
    const rotOff = mirrored ? 180 : 0;
    const lastT = new Array<string>(items.length).fill("");
    const lastO = new Array<number>(items.length).fill(-1);

    const update = (pos: number) => {
      for (let idx = 0; idx < items.length; idx++) {
        const g = groupRefs.current[idx];
        if (!g) continue;
        const o = items[idx].i - pos;
        const dist = o < 0 ? -o : o;
        const isAct = dist < 0.5;
        const t = dist > 7 ? 1 : dist / 7;
        const fade = isAct ? 1 : Math.pow(1 - t, 1.2);
        const alpha = isAct ? 1 : 0.15 + (1 - t) * 0.25;
        const op = isAct ? 1 : alpha * fade;
        const clampedOp = op < 0.04 ? 0.04 : op;

        const theta = baseAngle + mir * o * stepRad;
        const cx = wheelR + Math.cos(theta) * r;
        const cy = wheelR + Math.sin(theta) * r;
        const tangentDeg = (theta * 180) / Math.PI + rotOff;
        const fs = isAct ? aFsMax : aFsMax - 4 - dist * 1.2;
        const scale = (fs < aFsMin ? aFsMin : fs) / aFsMax;

        const tf = `translate(${cx}px,${cy}px) rotate(${tangentDeg}deg) scale(${scale})`;
        if (tf !== lastT[idx]) {
          g.style.transform = tf;
          lastT[idx] = tf;
        }
        if (clampedOp !== lastO[idx]) {
          g.style.opacity = String(clampedOp);
          lastO[idx] = clampedOp;
        }
      }
    };
    return subscribe(update);
  }, [items, subscribe, mirrored, wheelR, r, aStepDeg, aFsMax, aFsMin]);

  return (
    <div
      className="absolute inset-0 overflow-visible pointer-events-auto"
      style={entered ? {
        "--disk-slide-from": `${mirrored ? "" : "-"}${aInset + 40}px`,
        animation: "arc-disk-slide 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards",
        opacity: 0,
      } as React.CSSProperties : { opacity: 0 }}
    >
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
        <circle
          cx={wheelR}
          cy={wheelR}
          r={Math.max(0, r - aDiskGap)}
          fill={aDiskColor}
          style={{ pointerEvents: "none" }}
        />
        {items.map(({ i }, idx) => {
          const name = humanoids[i]?.name ?? String(i).padStart(2, "0");
          return (
            <g
              key={i}
              ref={(el) => { groupRefs.current[idx] = el; }}
              style={{
                transition: "opacity 0.15s ease",
                willChange: "transform, opacity",
                transformBox: "view-box",
                transformOrigin: "0 0",
              }}
            >
              <text
                ref={(el) => { textRefs.current[idx] = el; }}
                className="cursor-pointer"
                textAnchor={mirrored ? "end" : "start"}
                dominantBaseline="middle"
                onClick={() => onClickItem(i)}
                style={{
                  fontFamily: "inherit",
                  letterSpacing: "-0.02em",
                }}
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Arc-names wheel: original pre-disk look/motion (commit 5e99d4c) ──
// Thin stroke ring, wider window, linear fade over 10, misc-gold tint,
// per-frame fontSize updates (no CSS scale), no entrance animation.
function ArcNamesWheel({ index, subscribe, mirrored, onClickItem, aInset, aWheelR, aStepDeg, aTextGap, aLineOp, aFsMax, aFsMin }: {
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
  const yearRefs = useRef<Array<SVGTSpanElement | null>>([]);

  useLayoutEffect(() => {
    const update = (pos: number) => {
      for (let idx = 0; idx < items.length; idx++) {
        const el = textRefs.current[idx];
        if (!el) continue;
        const i = items[idx].i;
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
        const fill = isAct ? "var(--c-ink)" : `rgba(0,0,0,${0.15 + (1 - t) * 0.25})`;

        el.setAttribute("x", String(cx));
        el.setAttribute("y", String(cy));
        el.setAttribute("transform", `rotate(${tangentDeg}, ${cx}, ${cy})`);
        el.style.fontSize = `${fs}px`;
        el.style.fontWeight = String(fw);
        el.style.fill = fill;
        el.style.opacity = String(op);

        const yearEl = yearRefs.current[idx];
        if (yearEl) {
          if (isAct && humanoids[i]?.year) {
            yearEl.style.display = "inline";
            yearEl.style.fontSize = `${Math.round(aFsMax * 0.55)}px`;
            yearEl.style.fontWeight = "400";
            yearEl.style.opacity = "0.35";
          } else {
            yearEl.style.display = "none";
          }
        }
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
          const h = humanoids[i];
          const name = h?.name ?? String(i).padStart(2, "0");
          const year = h?.year;
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
              <tspan ref={(el) => { yearRefs.current[idx] = el; }} style={{ display: "none" }}>
                {year ? `${year} ` : ""}
              </tspan>
              <tspan>{name}</tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Arc-tag wheel: arc-timeline positioning with tag-styled numbers ──
function ArcTagWheel({ index, subscribe, mirrored, onClickItem, aInset, aWheelR, aStepDeg, aTextGap, aDiskGap, aDiskColor, entered, tagFsMin = 11, tagFsMax = 14, tagOpMin = 0.58, tagOpMax = 1, tagGreyMin = 64, tagGreyMax = 213, tagPillOp = 0.03, tagFalloff = 2, tagPadX = 0, tagPadY = 0, tagRadius = 20, tagMarkerSize = 4, tagMarkerOp = 0.32 }: {
  index: number;
  subscribe: SpringSubscribe;
  mirrored?: boolean;
  onClickItem: (idx: number) => void;
  aInset: number; aWheelR: number; aStepDeg: number; aTextGap: number;
  aDiskGap: number; aDiskColor: string; entered?: boolean;
  tagFsMin?: number; tagFsMax?: number; tagOpMin?: number; tagOpMax?: number;
  tagGreyMin?: number; tagGreyMax?: number; tagPillOp?: number; tagFalloff?: number;
  tagPadX?: number; tagPadY?: number; tagRadius?: number;
  tagMarkerSize?: number; tagMarkerOp?: number;
}) {
  const wheelR = aWheelR;
  const r = wheelR - aTextGap;
  const items: { i: number }[] = [];
  for (let n = index - 10; n <= index + 10; n++) {
    if (n >= 0 && n < humanoids.length) items.push({ i: n });
  }
  const elRefs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const baseAngle = mirrored ? Math.PI : 0;
    const stepRad = (aStepDeg * Math.PI) / 180;
    const mir = mirrored ? -1 : 1;

    const update = (pos: number) => {
      for (let idx = 0; idx < items.length; idx++) {
        const el = elRefs.current[idx];
        if (!el) continue;
        const o = items[idx].i - pos;
        const dist = Math.abs(o);
        const prox = Math.max(0, 1 - dist / tagFalloff);
        const op = tagOpMin + prox * (tagOpMax - tagOpMin);

        const theta = baseAngle + mir * o * stepRad;
        const cx = wheelR + Math.cos(theta) * r;
        const cy = wheelR + Math.sin(theta) * r;
        const tangentDeg = (theta * 180) / Math.PI + (mirrored ? 180 : 0);

        el.style.transform = `translate(${cx}px,${cy}px) rotate(${tangentDeg}deg) translate(0,-50%)`;
        el.style.opacity = String(op);

        const tag = el.firstElementChild as HTMLElement | null;
        if (tag) {
          const fs = tagFsMin + prox * (tagFsMax - tagFsMin);
          const grey = Math.round(tagGreyMax - prox * (tagGreyMax - tagGreyMin));
          tag.style.fontSize = `${fs}px`;
          tag.style.fontWeight = prox > 0.7 ? "500" : "400";
          tag.style.color = `rgb(${grey},${grey},${grey})`;
          tag.style.background = `rgba(0,0,0,${prox > 0.5 ? (prox - 0.5) * 2 * tagPillOp : 0})`;
          tag.style.padding = `${2 + prox * tagPadY}px ${5 + prox * tagPadX}px`;
          tag.style.borderRadius = `${tagRadius}px`;
        }
      }
    };
    return subscribe(update);
  }, [items, subscribe, mirrored, wheelR, r, aStepDeg, tagFsMin, tagFsMax, tagOpMin, tagOpMax, tagGreyMin, tagGreyMax, tagPillOp, tagFalloff, tagPadX, tagPadY, tagRadius]);

  return (
    <div
      className="absolute inset-0 overflow-visible pointer-events-auto"
      style={entered ? {
        "--disk-slide-from": `${mirrored ? "" : "-"}${aInset + 40}px`,
        animation: "arc-disk-slide 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards",
        opacity: 0,
      } as React.CSSProperties : { opacity: 0 }}
    >
      {/* Disk */}
      <svg
        className="absolute overflow-visible pointer-events-none"
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
        <circle cx={wheelR} cy={wheelR} r={Math.max(0, r - aDiskGap)} fill={aDiskColor} />
      </svg>
      {/* Tag items */}
      <div
        className="absolute overflow-visible pointer-events-auto"
        style={{
          width: wheelR * 2,
          height: wheelR * 2,
          top: "50%",
          ...(mirrored ? { left: "auto", right: -wheelR * 2 + aInset } : { left: -wheelR * 2 + aInset }),
          transform: "translateY(-50%)",
          transition: "left 0.55s cubic-bezier(0.16, 1, 0.3, 1), right 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {items.map(({ i }, idx) => {
          const num = String(i + 1).padStart(2, "0");
          return (
            <div
              key={i}
              ref={(el) => { elRefs.current[idx] = el; }}
              className="absolute cursor-pointer"
              style={{ left: 0, top: 0, willChange: "transform, opacity", transformOrigin: "0 50%" }}
              onClick={() => onClickItem(i)}
            >
              <span className="tabular-nums whitespace-nowrap" style={{ lineHeight: 1, letterSpacing: "-0.02em", borderRadius: 8, transition: "font-size 0.15s, padding 0.15s, background 0.15s", display: "inline-block", transform: mirrored ? "scaleX(-1)" : undefined }}>{num}</span>
            </div>
          );
        })}
      </div>
      {/* Center marker */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          ...(mirrored ? { right: aInset - 10 } : { left: aInset - 10 }),
          transform: "translateY(-50%)",
          transition: "left 0.55s cubic-bezier(0.16, 1, 0.3, 1), right 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <svg width={tagMarkerSize} height={tagMarkerSize * 2} viewBox="0 0 6 12" fill="none">
          <path d={mirrored ? "M6,0 L0,6 L6,12" : "M0,0 L6,6 L0,12"} fill="#222" opacity={tagMarkerOp} />
        </svg>
      </div>
    </div>
  );
}

export function ArcDots({ index, subscribe, mirrored, onClickItem, dimmed, variant = "pills", drumAngle: dAngle = 18, drumRadius: dRadius = 152, drumFsMax: dFsMax = 20, drumFsMin: dFsMin = 8, drumFwMax: dFwMax = 500, drumCompression: dComp = 0.59, drumOpPower: dOpPow = 4.0, drumXOffset: dXOff = 120, drumTracking: dTrack = 0.04, drumRange: dRange = 2, drumMaskFade: dMaskFade = 35, arcInset: aInset = 80, arcWheelR: aWheelR = 700, arcStepDeg: aStepDeg = 3.5, arcTextGap: aTextGap = 15, arcLineOp: aLineOp = 0.5, arcFsMax: aFsMax = 22, arcFsMin: aFsMin = 10, arcDiskGap: aDiskGap = 26, arcDiskColor: aDiskColor = "#f5f5f5", entered, tagFsMin: tFsMin = 11, tagFsMax: tFsMax = 14, tagOpMin: tOpMin = 1, tagOpMax: tOpMax = 1, tagGreyMin: tGreyMin = 64, tagGreyMax: tGreyMax = 213, tagPillOp: tPillOp = 0.03, tagFalloff: tFalloff = 2, tagPadX: tPadX = 0, tagPadY: tPadY = 0, tagRadius: tRadius = 20, tagMarkerSize: tMarkerSize = 4, tagMarkerOp: tMarkerOp = 0.32 }: { index: number; subscribe: SpringSubscribe; mirrored?: boolean; onClickItem: (idx: number) => void; dimmed?: boolean; variant?: ArcStyle; drumAngle?: number; drumRadius?: number; drumFsMax?: number; drumFsMin?: number; drumFwMax?: number; drumCompression?: number; drumOpPower?: number; drumXOffset?: number; drumTracking?: number; drumRange?: number; drumMaskFade?: number; arcInset?: number; arcWheelR?: number; arcStepDeg?: number; arcTextGap?: number; arcLineOp?: number; arcFsMax?: number; arcFsMin?: number; arcDiskGap?: number; arcDiskColor?: string; entered?: boolean; tagFsMin?: number; tagFsMax?: number; tagOpMin?: number; tagOpMax?: number; tagGreyMin?: number; tagGreyMax?: number; tagPillOp?: number; tagFalloff?: number; tagPadX?: number; tagPadY?: number; tagRadius?: number; tagMarkerSize?: number; tagMarkerOp?: number }) {
  // arc-timeline / arc-names / arc-tag take the imperative path to avoid React reconciliation per frame
  if (variant === "arc-timeline") {
    return <ArcTimelineWheel index={index} subscribe={subscribe} mirrored={mirrored} onClickItem={onClickItem} aInset={aInset} aWheelR={aWheelR} aStepDeg={aStepDeg} aTextGap={aTextGap} aLineOp={aLineOp} aFsMax={aFsMax} aFsMin={aFsMin} aDiskGap={aDiskGap} aDiskColor={aDiskColor} entered={entered} />;
  }
  if (variant === "arc-names") {
    return <ArcNamesWheel index={index} subscribe={subscribe} mirrored={mirrored} onClickItem={onClickItem} aInset={aInset} aWheelR={aWheelR} aStepDeg={aStepDeg} aTextGap={aTextGap} aLineOp={aLineOp} aFsMax={aFsMax} aFsMin={aFsMin} />;
  }
  if (variant === "arc-tag") {
    return <ArcTagWheel index={index} subscribe={subscribe} mirrored={mirrored} onClickItem={onClickItem} aInset={aInset} aWheelR={aWheelR} aStepDeg={aStepDeg} aTextGap={aTextGap} aDiskGap={aDiskGap} aDiskColor={aDiskColor} entered={entered} tagFsMin={tFsMin} tagFsMax={tFsMax} tagOpMin={tOpMin} tagOpMax={tOpMax} tagGreyMin={tGreyMin} tagGreyMax={tGreyMax} tagPillOp={tPillOp} tagFalloff={tFalloff} tagPadX={tPadX} tagPadY={tPadY} tagRadius={tRadius} tagMarkerSize={tMarkerSize} tagMarkerOp={tMarkerOp} />;
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
