"use client";

import { useMemo, useCallback, useState, useRef } from "react";
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
  const [freq, setFreq] = useState(2.2);               // spring natural freq (Hz)
  const [zeta, setZeta] = useState(1.0);               // damping ratio — 1.0 = critical
  const [pxPerYear, setPxPerYear] = useState(130);     // wheel px to advance one year
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
    minAngle: 0,
    maxAngle: (N - 1) * sliceAngle,
    sliceAngle,
    freq,
    zeta,
  });

  // Every wheel event drags the target by (deltaY / pxPerYear) years of arc.
  const pxPerYearRef = useRef(pxPerYear); pxPerYearRef.current = pxPerYear;
  const sliceRef = useRef(sliceAngle); sliceRef.current = sliceAngle;
  const handleScrub = useCallback((deltaY: number) => {
    const deltaYears = deltaY / pxPerYearRef.current;
    spring.scrubBy(deltaYears * sliceRef.current);
  }, [spring]);
  const handleRelease = useCallback(() => {
    spring.release();
  }, [spring]);
  useWheelInput({ onScrub: handleScrub, onRelease: handleRelease });

  // Continuous index float. Floor/ceil/frac drives the year-to-year crossfade.
  const centerAngle = spring.angle;
  const idxFloat = Math.max(0, Math.min(N - 1, centerAngle / sliceAngle));
  const floorIdx = Math.max(0, Math.min(N - 1, Math.floor(idxFloat)));
  const ceilIdx = Math.min(N - 1, floorIdx + 1);
  const frac = Math.max(0, Math.min(1, idxFloat - floorIdx));
  const sameIdx = floorIdx === ceilIdx;
  const floorYear = years[floorIdx];
  const ceilYear = years[ceilIdx];
  const floorEntries = groups[floorYear];
  const ceilEntries = groups[ceilYear];

  // Sparse years stay at CARD_W=160 (up to 8 cards in 2 rows of 4). Heavy years
  // spread into 2 rows with a smaller card width, so a 12-robot year fits at 6×2.
  const DENSE_CARD_W = 128;
  const layoutFor = (count: number): { cols: number; cardW: number } => {
    if (count <= 4) return { cols: count, cardW: CARD_W };
    if (count <= 8) return { cols: MAX_COLS, cardW: CARD_W };
    return { cols: Math.ceil(count / 2), cardW: DENSE_CARD_W };
  };
  const floorLayout = layoutFor(floorEntries.length);
  const ceilLayout = layoutFor(ceilEntries.length);

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white flex flex-col">
      {/* Cards area */}
      <div className="flex-1 flex items-center justify-center px-8 pt-12">
        <div className="flex flex-col items-center">
          {/* Swift slide between adjacent years.
              Floor (older) exits left; ceil (newer) enters from right.
              Opacity curve is accelerated so cards vanish fast and the
              slide reads as motion, not a crossfade blur. */}
          {(() => {
            const CARD_SLIDE = 260;      // px the card grid travels
            const LABEL_SLIDE = 90;      // px the year label travels
            const fadeOut = Math.max(0, 1 - frac * 1.9);           // floor gone by ~0.53
            const fadeIn = Math.max(0, Math.min(1, (frac - 0.15) * 1.9)); // ceil starts at 0.15, full by ~0.68
            const floorDx = -frac * CARD_SLIDE;
            const ceilDx = (1 - frac) * CARD_SLIDE;
            const floorLabelDx = -frac * LABEL_SLIDE;
            const ceilLabelDx = (1 - frac) * LABEL_SLIDE;
            return (
              <>
                {/* Year label */}
                <div className="relative mb-6" style={{ height: 44 }}>
                  <div
                    className="absolute inset-0 flex items-center justify-center gap-3"
                    style={{
                      opacity: fadeOut,
                      transform: `translate3d(${floorLabelDx}px,0,0)`,
                      willChange: "transform, opacity",
                    }}
                  >
                    <span
                      className="text-[36px] font-light tabular-nums"
                      style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}
                    >
                      {floorYear}
                    </span>
                    <span className="text-[12px] text-neutral-300 uppercase tracking-wider">
                      {floorEntries.length} {floorEntries.length === 1 ? "robot" : "robots"}
                    </span>
                  </div>
                  {!sameIdx && frac > 0.001 && (
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-3"
                      style={{
                        opacity: fadeIn,
                        transform: `translate3d(${ceilLabelDx}px,0,0)`,
                        willChange: "transform, opacity",
                      }}
                    >
                      <span
                        className="text-[36px] font-light tabular-nums"
                        style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}
                      >
                        {ceilYear}
                      </span>
                      <span className="text-[12px] text-neutral-300 uppercase tracking-wider">
                        {ceilEntries.length} {ceilEntries.length === 1 ? "robot" : "robots"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card grid */}
                <div className="relative">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${floorLayout.cols}, ${floorLayout.cardW}px)`,
                      gap: CARD_GAP,
                      opacity: fadeOut,
                      transform: `translate3d(${floorDx}px,0,0)`,
                      willChange: "transform, opacity",
                      pointerEvents: frac > 0.5 ? "none" : "auto",
                    }}
                  >
                    {floorEntries.map((h) => (
                      <CarouselCard key={h.id} humanoid={h} isNew={h.year === newestYear} width={floorLayout.cardW} />
                    ))}
                  </div>
                  {!sameIdx && frac > 0.001 && (
                    <div
                      className="absolute inset-0 flex items-start justify-center"
                      style={{
                        opacity: fadeIn,
                        transform: `translate3d(${ceilDx}px,0,0)`,
                        willChange: "transform, opacity",
                        pointerEvents: frac > 0.5 ? "auto" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${ceilLayout.cols}, ${ceilLayout.cardW}px)`,
                          gap: CARD_GAP,
                        }}
                      >
                        {ceilEntries.map((h) => (
                          <CarouselCard key={h.id} humanoid={h} isNew={h.year === newestYear} width={ceilLayout.cardW} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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

            // Smooth "active" weighting based on distance (no hard round boundary)
            const distSlices = Math.abs(i - idxFloat);
            const activeWeight = Math.max(0, 1 - distSlices);
            const dotSize = dotR + 1.5 * activeWeight;
            const fill = activeWeight > 0.001
              ? `rgba(29,29,31,${0.35 + 0.65 * activeWeight})`
              : "#ccc";

            // Fade based on distance from center of arc
            const dist = Math.abs(dotAngle + Math.PI / 2);
            const opacity = Math.max(0.2, 1 - dist / (ARC_SPREAD * fadeRange));

            return (
              <g
                key={year}
                className="cursor-pointer"
                onClick={() => spring.jumpTo(i * sliceAngle)}
                style={{ opacity }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={dotSize}
                  fill={fill}
                />
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  style={{
                    fontSize: 9 + 2 * activeWeight,
                    fontWeight: activeWeight > 0.5 ? 600 : 400,
                    fill: activeWeight > 0.001
                      ? `rgba(29,29,31,${0.4 + 0.6 * activeWeight})`
                      : "#b3b3b3",
                    fontFamily: "inherit",
                    letterSpacing: "-0.01em",
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
              onClick={() => { setWheelR(800); setArcSpread(0.45); setDotR(3.5); setFreq(2.2); setZeta(1.0); setPxPerYear(130); setArcHeight(100); setFadeRange(0.6); }}
            >Reset</button>
          </div>
          <div><label className="text-neutral-500 flex justify-between">Frequency <span className="tabular-nums text-neutral-400">{freq.toFixed(1)} Hz</span></label><input type="range" min={10} max={60} value={Math.round(freq * 10)} onChange={(e) => setFreq(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Damping <span className="tabular-nums text-neutral-400">{zeta.toFixed(2)}</span></label><input type="range" min={50} max={130} value={Math.round(zeta * 100)} onChange={(e) => setZeta(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          <div><label className="text-neutral-500 flex justify-between">Sensitivity <span className="tabular-nums text-neutral-400">{pxPerYear} px/yr</span></label><input type="range" min={60} max={260} value={pxPerYear} onChange={(e) => setPxPerYear(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
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
