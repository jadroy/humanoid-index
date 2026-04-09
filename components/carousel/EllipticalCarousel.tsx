"use client";

import { useMemo, useCallback, useState } from "react";
import { humanoids } from "@/data/humanoids";
import { useCarouselSpring } from "./useCarouselSpring";
import { useWheelInput } from "./useWheelInput";
import CarouselCard from "./CarouselCard";
import { CARD_W, CARD_GAP, MAX_COLS } from "./carouselMath";

export default function EllipticalCarousel() {
  // ── Tunable parameters ──
  const [wheelR, setWheelR] = useState(800);
  const [arcSpread, setArcSpread] = useState(0.45);   // fraction of π
  const [dotR, setDotR] = useState(3.5);
  const [stiffness, setStiffness] = useState(0.06);
  const [damping, setDamping] = useState(0.82);
  const [wheelThreshold, setWheelThreshold] = useState(50);
  const [arcHeight, setArcHeight] = useState(100);
  const [fadeRange, setFadeRange] = useState(0.6);     // fraction of spread
  const [showPanel, setShowPanel] = useState(false);

  const ARC_SPREAD = Math.PI * arcSpread;

  const { groups, years, newestYear } = useMemo(() => {
    const byYear: Record<number, typeof humanoids> = {};
    for (const h of humanoids) {
      const y = h.year ?? 0;
      if (!y) continue;
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(h);
    }
    const yrs = Object.keys(byYear).map(Number).sort((a, b) => a - b);
    return { groups: byYear, years: yrs, newestYear: yrs[yrs.length - 1] };
  }, []);

  const N = years.length;
  const sliceAngle = ARC_SPREAD / (N - 1);

  const spring = useCarouselSpring({
    initialAngle: (N - 1) * sliceAngle,
    stiffness,
    damping,
  });

  const handleStep = useCallback(
    (dir: 1 | -1) => spring.advance(dir, sliceAngle),
    [spring, sliceAngle],
  );

  useWheelInput({ onStep: handleStep, threshold: wheelThreshold });

  // Determine which year is closest to center (top of arc)
  const centerAngle = spring.angle;
  const activeIdx = Math.round(centerAngle / sliceAngle);
  const clampedIdx = Math.max(0, Math.min(N - 1, activeIdx));
  const activeYear = years[clampedIdx];
  const activeEntries = groups[activeYear];
  const cols = Math.min(activeEntries.length, MAX_COLS);

  // Wheel center is below the viewport. The top of the arc pokes up.
  // We position dots at angle theta relative to the top of the circle (12 o'clock = 0).
  // Positive theta = clockwise = right, negative = left.

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white flex flex-col">
      {/* Cards area */}
      <div className="flex-1 flex items-center justify-center px-8 pt-12">
        <div className="flex flex-col items-center">
          <div
            key={`label-${activeYear}`}
            className="flex items-center gap-3 mb-6"
            style={{ opacity: 0, animation: "carousel-fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          >
            <span
              className="text-[36px] font-light tabular-nums"
              style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}
            >
              {activeYear}
            </span>
            <span className="text-[12px] text-neutral-300 uppercase tracking-wider">
              {activeEntries.length} {activeEntries.length === 1 ? "robot" : "robots"}
            </span>
          </div>

          <div
            key={activeYear}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${CARD_W}px)`,
              gap: CARD_GAP,
              opacity: 0,
              animation: "carousel-fade-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {activeEntries.map((h) => (
              <CarouselCard key={h.id} humanoid={h} isNew={h.year === newestYear} />
            ))}
          </div>
        </div>
      </div>

      {/* Arc wheel — bottom, clipped */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{ height: arcHeight }}
      >
        {/* The wheel center sits below this container */}
        <svg
          className="absolute overflow-visible"
          style={{
            width: wheelR * 2,
            height: wheelR * 2,
            left: "50%",
            top: 0,
            transform: `translate(-50%, 0)`,
          }}
          viewBox={`0 0 ${wheelR * 2} ${wheelR * 2}`}
        >
          {/* Arc line — full visible portion */}
          <circle
            cx={wheelR}
            cy={wheelR}
            r={wheelR - 20}
            fill="none"
            stroke="#ebebeb"
            strokeWidth="1"
          />

          {/* Year dots along the arc */}
          {years.map((year, i) => {
            // Each dot's angle on the wheel
            // When this year is active, it should be at the top (12 o'clock = -π/2)
            const dotAngle = -Math.PI / 2 + (i * sliceAngle - centerAngle);
            const r = wheelR - 20;
            const cx = wheelR + Math.cos(dotAngle) * r;
            const cy = wheelR + Math.sin(dotAngle) * r;

            // Only render dots in the visible arc region (top portion)
            if (dotAngle < -Math.PI / 2 - ARC_SPREAD * 0.7 || dotAngle > -Math.PI / 2 + ARC_SPREAD * 0.7) return null;

            const isActive = i === clampedIdx;
            // Fade based on distance from center
            const dist = Math.abs(dotAngle + Math.PI / 2);
            const opacity = Math.max(0.2, 1 - dist / (ARC_SPREAD * fadeRange));

            return (
              <g
                key={year}
                className="cursor-pointer"
                onClick={() => {
                  spring.target.current = i * sliceAngle;
                  spring.advance(0, sliceAngle); // trigger animation
                }}
                style={{ opacity }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? dotR + 1.5 : dotR}
                  fill={isActive ? "var(--c-ink)" : "#ccc"}
                  style={{ transition: "r 0.2s ease, fill 0.2s ease" }}
                />
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  style={{
                    fontSize: isActive ? 11 : 9,
                    fontWeight: isActive ? 600 : 400,
                    fill: isActive ? "var(--c-ink)" : "#b3b3b3",
                    fontFamily: "inherit",
                    letterSpacing: "-0.01em",
                    transition: "all 0.2s ease",
                  }}
                >
                  {year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tuner toggle */}
      <button
        className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-400 text-[14px] cursor-pointer transition-colors"
        onClick={() => setShowPanel(!showPanel)}
      >
        ⚙
      </button>

      {/* Control panel */}
      {showPanel && (
        <div className="fixed bottom-14 right-4 z-50 w-64 bg-white border border-neutral-200 rounded-lg p-4 shadow-lg space-y-3" style={{ fontSize: 10 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium">Arc Tuner</p>
            <button
              className="text-[9px] text-neutral-300 hover:text-neutral-500 cursor-pointer"
              onClick={() => { setWheelR(800); setArcSpread(0.45); setDotR(3.5); setStiffness(0.06); setDamping(0.82); setWheelThreshold(50); setArcHeight(100); setFadeRange(0.6); }}
            >Reset</button>
          </div>
          <div><label className="text-neutral-500 flex justify-between">Stiffness <span className="tabular-nums text-neutral-400">{stiffness.toFixed(2)}</span></label><input type="range" min={1} max={20} value={Math.round(stiffness * 100)} onChange={(e) => setStiffness(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Damping <span className="tabular-nums text-neutral-400">{damping.toFixed(2)}</span></label><input type="range" min={50} max={98} value={Math.round(damping * 100)} onChange={(e) => setDamping(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Wheel threshold <span className="tabular-nums text-neutral-400">{wheelThreshold}px</span></label><input type="range" min={10} max={150} value={wheelThreshold} onChange={(e) => setWheelThreshold(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Wheel radius <span className="tabular-nums text-neutral-400">{wheelR}px</span></label><input type="range" min={300} max={1500} value={wheelR} onChange={(e) => setWheelR(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Arc spread <span className="tabular-nums text-neutral-400">{(arcSpread * 180).toFixed(0)}°</span></label><input type="range" min={10} max={90} value={Math.round(arcSpread * 100)} onChange={(e) => setArcSpread(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Arc height <span className="tabular-nums text-neutral-400">{arcHeight}px</span></label><input type="range" min={40} max={250} value={arcHeight} onChange={(e) => setArcHeight(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Dot size <span className="tabular-nums text-neutral-400">{dotR.toFixed(1)}</span></label><input type="range" min={10} max={80} value={Math.round(dotR * 10)} onChange={(e) => setDotR(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Fade range <span className="tabular-nums text-neutral-400">{fadeRange.toFixed(2)}</span></label><input type="range" min={20} max={100} value={Math.round(fadeRange * 100)} onChange={(e) => setFadeRange(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
        </div>
      )}
    </div>
  );
}
