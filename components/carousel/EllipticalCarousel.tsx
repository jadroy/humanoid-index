"use client";

import { useMemo, useCallback } from "react";
import { humanoids } from "@/data/humanoids";
import { useCarouselSpring } from "./useCarouselSpring";
import { useWheelInput } from "./useWheelInput";
import CarouselCard from "./CarouselCard";
import { CARD_W, CARD_GAP, MAX_COLS } from "./carouselMath";

// A large circle "wheel" that pokes up from below the viewport.
// Only the top arc is visible — scrolling rotates it.
const WHEEL_R = 800;           // radius of the wheel
const ARC_SPREAD = Math.PI * 0.45; // how much of the arc is visible (~80°)
const DOT_R = 3.5;

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
  // Angular spacing between each year on the wheel
  const sliceAngle = ARC_SPREAD / (N - 1);

  // Spring drives a continuous position value
  // Start at last index (newest year at top center)
  const spring = useCarouselSpring({
    initialAngle: (N - 1) * sliceAngle,
    stiffness: 0.1,
    damping: 0.75,
  });

  const handleStep = useCallback(
    (dir: 1 | -1) => spring.advance(dir, sliceAngle),
    [spring, sliceAngle],
  );

  useWheelInput({ onStep: handleStep, threshold: 50 });

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
          <div className="flex items-center gap-3 mb-6">
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
              animation: "grid-card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
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
        style={{ height: 100 }}
      >
        {/* The wheel center sits below this container */}
        <svg
          className="absolute overflow-visible"
          style={{
            width: WHEEL_R * 2,
            height: WHEEL_R * 2,
            left: "50%",
            top: 0,
            transform: `translate(-50%, 0)`,
          }}
          viewBox={`0 0 ${WHEEL_R * 2} ${WHEEL_R * 2}`}
        >
          {/* Arc line — full visible portion */}
          <circle
            cx={WHEEL_R}
            cy={WHEEL_R}
            r={WHEEL_R - 20}
            fill="none"
            stroke="#ebebeb"
            strokeWidth="1"
          />

          {/* Year dots along the arc */}
          {years.map((year, i) => {
            // Each dot's angle on the wheel
            // When this year is active, it should be at the top (12 o'clock = -π/2)
            const dotAngle = -Math.PI / 2 + (i * sliceAngle - centerAngle);
            const r = WHEEL_R - 20;
            const cx = WHEEL_R + Math.cos(dotAngle) * r;
            const cy = WHEEL_R + Math.sin(dotAngle) * r;

            // Only render dots in the visible arc region (top portion)
            if (dotAngle < -Math.PI / 2 - ARC_SPREAD * 0.7 || dotAngle > -Math.PI / 2 + ARC_SPREAD * 0.7) return null;

            const isActive = i === clampedIdx;
            // Fade based on distance from center
            const dist = Math.abs(dotAngle + Math.PI / 2);
            const opacity = Math.max(0.2, 1 - dist / (ARC_SPREAD * 0.6));

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
                  r={isActive ? DOT_R + 1.5 : DOT_R}
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
    </div>
  );
}
