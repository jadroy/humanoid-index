"use client";

import { useMemo, useCallback, useState } from "react";
import Image from "next/image";
import { humanoids } from "@/data/humanoids";
import { useCarouselSpring } from "./useCarouselSpring";
import { useWheelInput } from "./useWheelInput";
import CarouselCard from "./CarouselCard";
import { CARD_W, CARD_GAP, MAX_COLS } from "./carouselMath";

// Arc geometry
const ARC_WIDTH = 900;     // px, total width of the arc
const ARC_HEIGHT = 60;     // px, how much the arc curves down
const DOT_R = 4;

export default function EllipticalCarousel() {
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

  // Active index — which year is focused
  const [activeIdx, setActiveIdx] = useState(N - 1); // start at newest

  const handleStep = useCallback(
    (dir: 1 | -1) => {
      setActiveIdx((i) => Math.max(0, Math.min(N - 1, i + dir)));
    },
    [N],
  );

  useWheelInput({ onStep: handleStep, threshold: 60 });

  const activeYear = years[activeIdx];
  const activeEntries = groups[activeYear];
  const cols = Math.min(activeEntries.length, MAX_COLS);

  // Arc path: a quadratic bezier, opening downward
  // Start at left, peak (highest) at center, end at right
  const arcPath = `M 0 ${ARC_HEIGHT} Q ${ARC_WIDTH / 2} 0 ${ARC_WIDTH} ${ARC_HEIGHT}`;

  // Position each dot along the arc
  const dotPositions = years.map((_, i) => {
    const t = N > 1 ? i / (N - 1) : 0.5;
    // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const x = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (ARC_WIDTH / 2) + t * t * ARC_WIDTH;
    const y = (1 - t) * (1 - t) * ARC_HEIGHT + 2 * (1 - t) * t * 0 + t * t * ARC_HEIGHT;
    return { x, y };
  });

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white flex flex-col">
      {/* Cards area — centered above the arc */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="flex flex-col items-center">
          {/* Year + count */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[36px] font-light tabular-nums" style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}>
              {activeYear}
            </span>
            <span className="text-[12px] text-neutral-300 uppercase tracking-wider">
              {activeEntries.length} {activeEntries.length === 1 ? "robot" : "robots"}
            </span>
          </div>

          {/* Card grid */}
          <div
            key={activeYear}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${CARD_W}px)`,
              gap: CARD_GAP,
              animation: "grid-card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {activeEntries.map((h) => (
              <CarouselCard key={h.id} humanoid={h} isNew={h.year === newestYear} />
            ))}
          </div>
        </div>
      </div>

      {/* Arc timeline — bottom */}
      <div className="flex-shrink-0 flex justify-center pb-10 pt-4">
        <svg
          width={ARC_WIDTH}
          height={ARC_HEIGHT + 50}
          viewBox={`0 -10 ${ARC_WIDTH} ${ARC_HEIGHT + 50}`}
          className="overflow-visible"
        >
          {/* Arc line */}
          <path
            d={arcPath}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth="1"
          />

          {/* Dots + labels */}
          {years.map((year, i) => {
            const { x, y } = dotPositions[i];
            const isActive = i === activeIdx;
            return (
              <g
                key={year}
                className="cursor-pointer"
                onClick={() => setActiveIdx(i)}
              >
                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? DOT_R + 1 : DOT_R}
                  fill={isActive ? "var(--c-ink)" : "#d4d4d4"}
                  style={{ transition: "all 0.2s ease" }}
                />
                {/* Year label below dot */}
                <text
                  x={x}
                  y={y + 18}
                  textAnchor="middle"
                  className="select-none"
                  style={{
                    fontSize: isActive ? 12 : 10,
                    fontWeight: isActive ? 500 : 400,
                    fill: isActive ? "var(--c-ink)" : "#b3b3b3",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {year}
                </text>
                {/* Robot count — only for active */}
                {isActive && (
                  <text
                    x={x}
                    y={y + 30}
                    textAnchor="middle"
                    style={{
                      fontSize: 9,
                      fill: "#ccc",
                      fontFamily: "inherit",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {groups[year].length}×
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
