"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { humanoids } from "@/data/humanoids";
import type { SpringSubscribe } from "@/hooks/useSpring";

// Session memory: once an arc logo has decoded in this tab, future swaps to
// the same URL skip the swipe-up reveal so the active logo doesn't re-animate
// every time the user scrolls past it again.
const loadedArcLogos = new Set<string>();
const ARC_LOGO_CLOSED = "inset(100% 0 0 0)";
const ARC_LOGO_OPEN = "inset(0)";

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
          transition: "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1)), right var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))",
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
export const MARKER_VARIANTS: Array<{ id: number; label: string; el: React.ReactNode; accentColor?: string; opacity?: number }> = [
  { id: 1,  label: "Hairline",    el: <div style={{ width: 0.5, height: 16, background: "currentColor", borderRadius: 0.5 }} /> },
  { id: 2,  label: "Pip",         el: <div style={{ width: 2.5, height: 10, background: "currentColor", borderRadius: 2 }} /> },
  { id: 3,  label: "Block",       el: <div style={{ width: 4, height: 14, background: "currentColor", borderRadius: 2 }} /> },
  { id: 4,  label: "Chevron",     el: <svg width={7} height={12} viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 5,  label: "Dbl Chevron", el: <svg width={10} height={12} viewBox="0 0 10 12" fill="none"><path d="M1 1L5 6L1 11" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><path d="M5 1L9 6L5 11" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.4}/></svg> },
  { id: 6,  label: "Corner",      el: <svg width={8} height={10} viewBox="0 0 8 10" fill="none"><path d="M1 1L1 9L8 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 7,  label: "Bracket",     el: <svg width={6} height={12} viewBox="0 0 6 12" fill="none"><path d="M6 1L1 1L1 11L6 11" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 8,  label: "Bullseye",    el: <div style={{ position: "relative", width: 9, height: 9, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ position: "absolute", width: 9, height: 9, borderRadius: "50%", border: "1.5px solid currentColor" }}/><div style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor" }}/></div> },
  { id: 9,  label: "Pulse",       el: <div style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid currentColor", animation: "marker-pulse 2s ease-in-out infinite" }} /> },
  { id: 10, label: "Dot Trail",   el: <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 2, height: 2, borderRadius: "50%", background: "currentColor", opacity: 0.25 }}/><div style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: "currentColor", opacity: 0.6 }}/><div style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}/></div> },
  { id: 11, label: "Scan",        el: <div style={{ width: 20, height: 1.5, borderRadius: 1, background: "linear-gradient(to right, currentColor 0%, transparent 100%)" }} /> },
  { id: 12, label: "Fade Pip",    el: <div style={{ width: 2, height: 14, borderRadius: 1, background: "linear-gradient(to bottom, transparent, currentColor 40%, currentColor 60%, transparent)" }} /> },
  { id: 13, label: "Dashed Ring", el: <svg width={11} height={11} viewBox="0 0 11 11" fill="none"><circle cx={5.5} cy={5.5} r={4} stroke="currentColor" strokeWidth={1.2} strokeDasharray="3 2.2" strokeLinecap="round"/></svg> },
  { id: 14, label: "Crosshair",   el: <svg width={11} height={11} viewBox="0 0 11 11" fill="none"><line x1={5.5} y1={1} x2={5.5} y2={10} stroke="currentColor" strokeWidth={1} strokeLinecap="round"/><line x1={1} y1={5.5} x2={10} y2={5.5} stroke="currentColor" strokeWidth={1} strokeLinecap="round"/></svg> },
  { id: 15, label: "Hollow Tri",  el: <svg width={8} height={11} viewBox="0 0 8 11" fill="none"><path d="M1 1L7 5.5L1 10Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"/></svg> },
  { id: 16, label: "Arc",         el: <svg width={7} height={13} viewBox="0 0 7 13" fill="none"><path d="M1 1Q7 6.5 1 12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/></svg> },
  { id: 17, label: "S-Curve",     el: <svg width={8} height={14} viewBox="0 0 8 14" fill="none"><path d="M6 1C1 1 7 7 2 7C-3 7 5 13 2 13" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" fill="none"/></svg> },
  { id: 18, label: "Graduated",   el: <div style={{ display: "flex", flexDirection: "column", gap: 2.5, alignItems: "flex-start" }}><div style={{ width: 6, height: 1.5, background: "currentColor", borderRadius: 1, opacity: 0.35 }}/><div style={{ width: 11, height: 1.5, background: "currentColor", borderRadius: 1 }}/><div style={{ width: 6, height: 1.5, background: "currentColor", borderRadius: 1, opacity: 0.35 }}/></div> },
  { id: 19, label: "Serif ›",     el: <span style={{ fontSize: 16, lineHeight: 1, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>›</span> },
  { id: 20, label: "Radar",       el: <svg width={12} height={12} viewBox="0 0 12 12" fill="none">{[0,45,90,135].map(d => { const r=(d*Math.PI)/180; return <line key={d} x1={6+1.5*Math.cos(r)} y1={6+1.5*Math.sin(r)} x2={6+5.5*Math.cos(r)} y2={6+5.5*Math.sin(r)} stroke="currentColor" strokeWidth={1} strokeLinecap="round"/>; })}</svg> },
  { id: 21, label: "Stacked",     el: <div style={{ display: "flex", flexDirection: "column", gap: 3.5 }}><div style={{ width: 10, height: 1.5, background: "currentColor", borderRadius: 1 }}/><div style={{ width: 10, height: 1.5, background: "currentColor", borderRadius: 1 }}/></div> },
  { id: 22, label: "Color Dot",   accentColor: "#FF6B35", opacity: 1, el: <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} /> },
];

function ArcCurrentMarker({ markerVariant = 1, markerColor, mirrored, aInset, aTextGap }: {
  markerVariant?: number;
  markerColor?: string;
  mirrored?: boolean;
  aInset: number;
  aTextGap: number;
}) {
  if (!markerVariant) return null;
  const anchor = aInset - aTextGap - 18;
  const side = mirrored ? "right" : "left";
  const translate = mirrored ? "translateX(100%)" : "translateX(-100%)";
  const marker = MARKER_VARIANTS.find(m => m.id === markerVariant) ?? MARKER_VARIANTS[0];
  const resolvedColor = markerColor ?? marker.accentColor ?? "var(--c-ink)";

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none select-none"
      style={{
        top: "50%",
        [side]: anchor,
        transform: `translateY(-50%) ${translate}`,
        color: resolvedColor,
        opacity: marker.opacity ?? 0.5,
        display: "flex",
        alignItems: "center",
        transition: "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1)), right var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))",
      }}
    >
      <div style={mirrored ? { transform: "scaleX(-1)" } : undefined}>{marker.el}</div>
    </div>
  );
}

export type ArcBoundary = "off" | "dots" | "arc" | "wedge";

function ArcNamesWheel({ index, subscribe, mirrored, onClickItem, aInset, aWheelR, aStepDeg, aTextGap, aLineOp, aFsMax, aFsMin, aFontFamily, aFontWeight, aLetterSpacing, aItalic, aAllCaps, markerVariant, markerAccentColor, aMaskFade, boundary = "off", aInactiveOp = 1, aNameOuterOffset = 0 }: {
  index: number;
  subscribe: SpringSubscribe;
  mirrored?: boolean;
  onClickItem: (idx: number) => void;
  aInset: number; aWheelR: number; aStepDeg: number; aTextGap: number; aLineOp: number; aFsMax: number; aFsMin: number;
  aFontFamily?: string;
  aFontWeight?: number;
  aLetterSpacing?: string;
  aItalic?: boolean;
  aAllCaps?: boolean;
  markerVariant?: number;
  markerAccentColor?: string;
  aMaskFade?: number;
  boundary?: ArcBoundary;
  aInactiveOp?: number;
  aNameOuterOffset?: number;
}) {
  const wheelR = aWheelR;
  const r = wheelR - aTextGap;
  // When > 0, name anchors sit outside the disk rim and right-edge-align
  // toward the card. Rim geometry (disk, boundary, ghosts) stays at `r`.
  const rName = r + aNameOuterOffset;
  const rightAlign = aNameOuterOffset > 0;
  const items: { i: number; ghost: boolean }[] = [];
  for (let n = index - 14; n <= index + 15; n++) {
    const outOfRange = n < 0 || n >= humanoids.length;
    if (outOfRange && boundary !== "dots") continue;
    items.push({ i: n, ghost: outOfRange });
  }
  const textRefs = useRef<Array<SVGTextElement | null>>([]);
  const nameRefs = useRef<Array<SVGTSpanElement | null>>([]);
  const hitRefs = useRef<Array<SVGRectElement | null>>([]);
  const ghostRefs = useRef<Array<SVGCircleElement | null>>([]);
  const boundaryRef = useRef<SVGPathElement | null>(null);
  const logoGroupRef = useRef<SVGGElement | null>(null);
  const logoImgRef = useRef<SVGImageElement | null>(null);
  const lastLogoUrlRef = useRef<string>("");
  // Tie the logo + gap to the active text size so they shrink in lockstep
  // when the wheel auto-scales to fit a narrow side budget. At the default
  // aFsMax of 22 these resolve to ~20px / ~12px (the prior fixed values).
  const LOGO_SIZE = Math.round(aFsMax * 0.91);
  const LOGO_GAP = Math.round(aFsMax * 0.55);
  const arcLogoClipId = `arc-logo-clip${mirrored ? "-r" : "-l"}`;
  // Tangent distance to the adjacent item — used to size click rects so they tile.
  const stepH = r * Math.sin((aStepDeg * Math.PI) / 180);

  useLayoutEffect(() => {
    const update = (pos: number) => {
      let activeIdx = -1;
      let activeCx = 0;
      let activeCy = 0;
      let activeTangentDeg = 0;
      let activeDist = Infinity;
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const i = item.i;
        const o = i - pos;
        const deg = o * aStepDeg;
        const rad = (deg * Math.PI) / 180;
        const baseAngle = mirrored ? Math.PI : 0;
        const theta = baseAngle + (mirrored ? -rad : rad);
        const cxRim = wheelR + Math.cos(theta) * r;
        const cyRim = wheelR + Math.sin(theta) * r;
        const cx = wheelR + Math.cos(theta) * rName;
        const cy = wheelR + Math.sin(theta) * rName;
        const tangentDeg = (theta * 180) / Math.PI + (mirrored ? 180 : 0);
        const dist = Math.abs(o);
        if (!item.ghost && dist < activeDist) {
          activeDist = dist;
          activeIdx = idx;
          activeCx = cx;
          activeCy = cy;
          activeTangentDeg = tangentDeg;
        }
        const t = Math.min(dist / 5, 1);

        if (item.ghost) {
          const ghostEl = ghostRefs.current[idx];
          if (ghostEl) {
            ghostEl.setAttribute("cx", String(cxRim));
            ghostEl.setAttribute("cy", String(cyRim));
            ghostEl.style.opacity = String(Math.max(0, 0.6 - dist * 0.08));
          }
          continue;
        }

        const el = textRefs.current[idx];
        const nameEl = nameRefs.current[idx];
        if (!el || !nameEl) continue;
        const isAct = dist < 0.5;
        // Smooth bell curve: aFsMax at the center, easing down to aFsMin
        // over ~5 items for a gentle spotlight, not a sharp pop.
        const prox = Math.max(0, 1 - dist / 5);
        const eased = prox * prox * (3 - 2 * prox);
        const fs = aFsMin + (aFsMax - aFsMin) * eased;
        const fw = isAct ? 500 : 400;
        const baseOp = Math.max(0.08, 1 - t * 0.9);
        const op = isAct ? baseOp : baseOp * aInactiveOp;
        const fill = isAct ? (markerAccentColor ?? "var(--c-ink)") : `rgba(0,0,0,${0.15 + (1 - t) * 0.25})`;

        el.setAttribute("y", String(cy));
        el.setAttribute("transform", `rotate(${tangentDeg}, ${cx}, ${cy})`);
        el.style.fontSize = `${fs}px`;
        el.style.fontWeight = String(fw);
        nameEl.style.fill = fill;
        nameEl.style.opacity = String(op);
        nameEl.setAttribute("x", String(cx));

        // Hit zone — sized to the tangent step so adjacent items tile without gaps.
        const rectEl = hitRefs.current[idx];
        if (rectEl) {
          const hitX = rightAlign ? (mirrored ? cx - 40 : cx - 220) : (mirrored ? cx - 220 : cx - 40);
          rectEl.setAttribute("x", String(hitX));
          rectEl.setAttribute("y", String(cy - stepH / 2));
          rectEl.setAttribute("transform", `rotate(${tangentDeg}, ${cx}, ${cy})`);
        }
      }

      // Logo on the active item only — anchored just left of the first letter of
      // the name (in reading order), rotated with the text's tangent. Hidden when
      // the active humanoid has no logoUrl or no item is in range.
      const groupEl = logoGroupRef.current;
      const imgEl = logoImgRef.current;
      if (groupEl && imgEl) {
        const activeItem = activeIdx >= 0 ? items[activeIdx] : null;
        const activeH = activeItem ? humanoids[activeItem.i] : null;
        const logoUrl = activeH?.logoUrl;
        if (activeItem && logoUrl && activeDist < 0.5) {
          const textEl = textRefs.current[activeIdx];
          const textWidth = textEl ? textEl.getComputedTextLength() : 0;
          // Place the disc on the outer edge of the arc — opposite the card.
          // For the left (non-mirrored) wheel that's negative-x past the first
          // character; for the right (mirrored) wheel it's positive-x past the
          // last character, so the layout mirrors symmetrically.
          const anchorIsEnd =
            (rightAlign && !mirrored) || (!rightAlign && mirrored);
          const outerDir = mirrored ? 1 : -1;
          const textOuterEdgeLocalX =
            outerDir < 0 ? (anchorIsEnd ? -textWidth : 0) : (anchorIsEnd ? 0 : textWidth);
          const centerX =
            activeCx + textOuterEdgeLocalX + outerDir * (LOGO_GAP + LOGO_SIZE / 2);
          // `dominantBaseline="middle"` puts the em-box midline at cy, but the
          // visual middle of the cap-height sits a touch higher. Nudge the disc
          // up by a fraction of the font size so it reads as centered.
          const centerY = activeCy - aFsMax * 0.06;
          groupEl.setAttribute(
            "transform",
            `translate(${centerX} ${centerY}) rotate(${activeTangentDeg})`,
          );
          if (lastLogoUrlRef.current !== logoUrl) {
            imgEl.setAttribute("href", logoUrl);
            lastLogoUrlRef.current = logoUrl;
            if (loadedArcLogos.has(logoUrl)) {
              imgEl.style.clipPath = ARC_LOGO_OPEN;
            } else {
              imgEl.style.clipPath = ARC_LOGO_CLOSED;
              const onImgLoad = () => {
                loadedArcLogos.add(logoUrl);
                // Only reveal if we're still showing this logo — a fast
                // scroll past several robots can swap href again before
                // load fires.
                if (lastLogoUrlRef.current === logoUrl) {
                  imgEl.style.clipPath = ARC_LOGO_OPEN;
                }
                imgEl.removeEventListener("load", onImgLoad);
              };
              imgEl.addEventListener("load", onImgLoad);
            }
          }
          groupEl.style.opacity = "1";
        } else {
          groupEl.style.opacity = "0";
        }
      }
    };
    return subscribe(update);
  }, [items, subscribe, mirrored, wheelR, r, rName, rightAlign, aStepDeg, aFsMax, aFsMin, stepH, markerAccentColor, aInactiveOp, LOGO_SIZE, LOGO_GAP]);

  // Boundary fill (arc / wedge): render a path that covers the angular range
  // where ghost items would be — keeps the wheel visually "complete" at list ends.
  useLayoutEffect(() => {
    if (boundary !== "arc" && boundary !== "wedge") return;
    const N = humanoids.length;
    const stepRad = (aStepDeg * Math.PI) / 180;
    const baseAngle = mirrored ? Math.PI : 0;
    const mir = mirrored ? -1 : 1;
    const SPAN = 14; // how far past the list edge to extend the fill
    const PAD = 0.5; // gap between last real name and the fill

    const update = (pos: number) => {
      const path = boundaryRef.current;
      if (!path) return;
      const ranges: Array<[number, number]> = [];
      if (pos < SPAN) {
        const oEnd = -pos - PAD;
        const oStart = -SPAN;
        if (oStart < oEnd) ranges.push([oStart, oEnd]);
      }
      if (pos > N - 1 - SPAN) {
        const oStart = (N - 1 - pos) + PAD;
        const oEnd = SPAN;
        if (oStart < oEnd) ranges.push([oStart, oEnd]);
      }
      let d = "";
      for (const [oA, oB] of ranges) {
        const θ1 = baseAngle + mir * oA * stepRad;
        const θ2 = baseAngle + mir * oB * stepRad;
        const x1 = wheelR + Math.cos(θ1) * r;
        const y1 = wheelR + Math.sin(θ1) * r;
        const x2 = wheelR + Math.cos(θ2) * r;
        const y2 = wheelR + Math.sin(θ2) * r;
        const dθ = θ2 - θ1;
        const sweep = dθ > 0 ? 1 : 0;
        const largeArc = Math.abs(dθ) > Math.PI ? 1 : 0;
        if (boundary === "wedge") {
          d += `M ${wheelR} ${wheelR} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2} Z `;
        } else {
          d += `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2} `;
        }
      }
      path.setAttribute("d", d);
    };
    return subscribe(update);
  }, [subscribe, boundary, mirrored, wheelR, r, aStepDeg]);

  const fade = Math.max(0, Math.min(45, aMaskFade ?? 22));
  const maskGradient = `linear-gradient(to bottom, transparent 0%, black ${fade}%, black ${100 - fade}%, transparent 100%)`;

  return (
    <div
      className="absolute overflow-visible pointer-events-none"
      style={{
        top: 0,
        bottom: 0,
        width: "100vw",
        ...(mirrored ? { right: 0 } : { left: 0 }),
        maskImage: maskGradient,
        WebkitMaskImage: maskGradient,
      }}
    >
      <ArcCurrentMarker markerVariant={markerVariant} markerColor={markerAccentColor} mirrored={mirrored} aInset={aInset} aTextGap={aTextGap} />
      <svg
        className="absolute overflow-visible pointer-events-auto"
        style={{
          width: wheelR * 2,
          height: wheelR * 2,
          top: "50%",
          ...(mirrored ? { left: "auto", right: -wheelR * 2 + aInset } : { left: -wheelR * 2 + aInset }),
          transform: "translateY(-50%)",
          transition: "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1)), right var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))",
        }}
        viewBox={`0 0 ${wheelR * 2} ${wheelR * 2}`}
      >
        <circle cx={wheelR} cy={wheelR} r={r} fill="none" stroke="#ebebeb" strokeWidth="0.5" style={{ opacity: aLineOp }} />
        {(boundary === "arc" || boundary === "wedge") && (
          <path
            ref={boundaryRef}
            fill={boundary === "wedge" ? "#ececec" : "none"}
            stroke={boundary === "arc" ? "#d4d4d4" : "none"}
            strokeWidth={boundary === "arc" ? 1 : 0}
            style={{ pointerEvents: "none" }}
          />
        )}
        {items.map(({ i, ghost }, idx) => {
          if (ghost) {
            return (
              <circle
                key={`ghost-${i}`}
                ref={(el) => { ghostRefs.current[idx] = el; }}
                r={2}
                fill="#b5b5b5"
                style={{ pointerEvents: "none" }}
              />
            );
          }
          const h = humanoids[i];
          const name = h?.name ?? String(i).padStart(2, "0");
          return (
            <g key={i} className="cursor-pointer" onClick={() => onClickItem(i)}>
              <rect
                ref={(el) => { hitRefs.current[idx] = el; }}
                width={260}
                height={stepH}
                fill="transparent"
                pointerEvents="all"
              />
              <text
                ref={(el) => { textRefs.current[idx] = el; }}
                dominantBaseline="middle"
                style={{
                  fontFamily: aFontFamily ?? "inherit",
                  fontWeight: aFontWeight ?? 400,
                  fontStyle: aItalic ? "italic" : "normal",
                  letterSpacing: aLetterSpacing ?? "-0.02em",
                  transition: "opacity 0.15s ease",
                  pointerEvents: "none",
                  ...(aAllCaps ? { textTransform: "uppercase" } : {}),
                }}
              >
                <tspan
                  ref={(el) => { nameRefs.current[idx] = el; }}
                  textAnchor={rightAlign ? (mirrored ? "start" : "end") : (mirrored ? "end" : "start")}
                >
                  {name}
                </tspan>
              </text>
            </g>
          );
        })}
        <defs>
          <clipPath id={arcLogoClipId} clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>
        <g
          ref={logoGroupRef}
          clipPath={`url(#${arcLogoClipId})`}
          style={{
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          {/* Grey tile shows through while the image is clipped — matches the
              share-thumbnail reveal so the swipe actually reads as a slide. */}
          <rect
            x={-LOGO_SIZE / 2}
            y={-LOGO_SIZE / 2}
            width={LOGO_SIZE}
            height={LOGO_SIZE}
            fill="rgba(0,0,0,0.06)"
          />
          <image
            ref={logoImgRef}
            x={-LOGO_SIZE / 2}
            y={-LOGO_SIZE / 2}
            width={LOGO_SIZE}
            height={LOGO_SIZE}
            preserveAspectRatio="xMidYMid slice"
            style={{
              clipPath: ARC_LOGO_CLOSED,
              transition: "clip-path 520ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </g>
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
          transition: "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1)), right var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))",
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
          transition: "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1)), right var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))",
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
          transition: "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1)), right var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))",
        }}
      >
        <svg width={tagMarkerSize} height={tagMarkerSize * 2} viewBox="0 0 6 12" fill="none">
          <path d={mirrored ? "M6,0 L0,6 L6,12" : "M0,0 L6,6 L0,12"} fill="#222" opacity={tagMarkerOp} />
        </svg>
      </div>
    </div>
  );
}

export function ArcDots({ index, subscribe, mirrored, onClickItem, dimmed, variant = "pills", drumAngle: dAngle = 18, drumRadius: dRadius = 152, drumFsMax: dFsMax = 20, drumFsMin: dFsMin = 8, drumFwMax: dFwMax = 500, drumCompression: dComp = 0.59, drumOpPower: dOpPow = 4.0, drumXOffset: dXOff = 120, drumTracking: dTrack = 0.04, drumRange: dRange = 2, drumMaskFade: dMaskFade = 35, arcInset: aInset = 80, arcWheelR: aWheelR = 700, arcStepDeg: aStepDeg = 3.5, arcTextGap: aTextGap = 15, arcLineOp: aLineOp = 0.5, arcFsMax: aFsMax = 22, arcFsMin: aFsMin = 10, arcDiskGap: aDiskGap = 26, arcDiskColor: aDiskColor = "#f5f5f5", arcFontFamily: aFontFamily, arcFontWeight: aFontWeight, arcLetterSpacing: aLetterSpacing, arcItalic: aItalic, arcAllCaps: aAllCaps, arcMaskFade: aMaskFade = 22, arcMarkerVariant = 0, arcMarkerColor, arcBoundary = "off", arcInactiveOp = 1, arcNameOuterOffset = 0, entered, tagFsMin: tFsMin = 11, tagFsMax: tFsMax = 14, tagOpMin: tOpMin = 1, tagOpMax: tOpMax = 1, tagGreyMin: tGreyMin = 64, tagGreyMax: tGreyMax = 213, tagPillOp: tPillOp = 0.03, tagFalloff: tFalloff = 2, tagPadX: tPadX = 0, tagPadY: tPadY = 0, tagRadius: tRadius = 20, tagMarkerSize: tMarkerSize = 4, tagMarkerOp: tMarkerOp = 0.32 }: { index: number; subscribe: SpringSubscribe; mirrored?: boolean; onClickItem: (idx: number) => void; dimmed?: boolean; variant?: ArcStyle; drumAngle?: number; drumRadius?: number; drumFsMax?: number; drumFsMin?: number; drumFwMax?: number; drumCompression?: number; drumOpPower?: number; drumXOffset?: number; drumTracking?: number; drumRange?: number; drumMaskFade?: number; arcInset?: number; arcWheelR?: number; arcStepDeg?: number; arcTextGap?: number; arcLineOp?: number; arcFsMax?: number; arcFsMin?: number; arcDiskGap?: number; arcDiskColor?: string; arcFontFamily?: string; arcFontWeight?: number; arcLetterSpacing?: string; arcItalic?: boolean; arcAllCaps?: boolean; arcMaskFade?: number; arcMarkerVariant?: number; arcMarkerColor?: string; arcBoundary?: ArcBoundary; arcInactiveOp?: number; arcNameOuterOffset?: number; entered?: boolean; tagFsMin?: number; tagFsMax?: number; tagOpMin?: number; tagOpMax?: number; tagGreyMin?: number; tagGreyMax?: number; tagPillOp?: number; tagFalloff?: number; tagPadX?: number; tagPadY?: number; tagRadius?: number; tagMarkerSize?: number; tagMarkerOp?: number }) {
  // arc-timeline / arc-names / arc-tag take the imperative path to avoid React reconciliation per frame
  if (variant === "arc-timeline") {
    return <ArcTimelineWheel index={index} subscribe={subscribe} mirrored={mirrored} onClickItem={onClickItem} aInset={aInset} aWheelR={aWheelR} aStepDeg={aStepDeg} aTextGap={aTextGap} aLineOp={aLineOp} aFsMax={aFsMax} aFsMin={aFsMin} aDiskGap={aDiskGap} aDiskColor={aDiskColor} entered={entered} />;
  }
  if (variant === "arc-names") {
    { const resolvedAccent = arcMarkerColor ?? MARKER_VARIANTS.find(m => m.id === arcMarkerVariant)?.accentColor;
      return <ArcNamesWheel index={index} subscribe={subscribe} mirrored={mirrored} onClickItem={onClickItem} aInset={aInset} aWheelR={aWheelR} aStepDeg={aStepDeg} aTextGap={aTextGap} aLineOp={aLineOp} aFsMax={aFsMax} aFsMin={aFsMin} aFontFamily={aFontFamily} aFontWeight={aFontWeight} aLetterSpacing={aLetterSpacing} aItalic={aItalic} aAllCaps={aAllCaps} markerVariant={arcMarkerVariant} markerAccentColor={resolvedAccent} aMaskFade={aMaskFade} boundary={arcBoundary} aInactiveOp={arcInactiveOp} aNameOuterOffset={arcNameOuterOffset} />; }
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
