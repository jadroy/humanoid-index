"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { humanoids, Humanoid } from "@/data/humanoids";
import Image from "next/image";

type Layout = "A" | "B" | "C" | "D" | "E" | "F" | "G";

const layoutLabels: Record<Layout, string> = {
  A: "Full Bleed",
  B: "Rolodex",
  C: "Split",
  D: "Filmstrip",
  E: "Arc",
  F: "Spread",
  G: "Orbit",
};

// ─── Layout Switcher Pill ───────────────────────────────────────
function LayoutSwitcher({
  active,
  onChange,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
}) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-white/80 backdrop-blur-xl rounded-full border border-neutral-200/60 p-1 shadow-sm">
      {(["A", "B", "C", "D", "E", "F", "G"] as Layout[]).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`relative px-3.5 py-1.5 rounded-full text-[11px] tracking-wide font-medium transition-all duration-200 ${
            active === l
              ? "bg-neutral-900 text-white"
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ─── Counter / Position ─────────────────────────────────────────
function Counter({
  current,
  total,
  className = "",
}: {
  current: number;
  total: number;
  className?: string;
}) {
  return (
    <span
      className={`text-[11px] tracking-widest uppercase text-neutral-400 tabular-nums ${className}`}
    >
      {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT A — Full Bleed
// ═══════════════════════════════════════════════════════════════
function FullBleed({
  onIndexChange,
}: {
  onIndexChange?: (i: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.index
            );
            if (!isNaN(idx)) {
              setActiveIndex(idx);
              onIndexChange?.(idx);
            }
          }
        });
      },
      { root: el, threshold: 0.6 }
    );

    el.querySelectorAll("[data-index]").forEach((child) =>
      observer.observe(child)
    );
    return () => observer.disconnect();
  }, [onIndexChange]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(activeIndex + 1, humanoids.length - 1);
        el.children[next]?.scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        el.children[prev]?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide"
    >
      {humanoids.map((h, i) => (
        <div
          key={h.id}
          data-index={i}
          className="h-screen snap-start snap-always relative flex items-center justify-center"
        >
          {/* Image */}
          <div className="relative w-full h-[62vh] flex items-center justify-center">
            <Image
              src={h.imageUrl || "/robots/placeholder.png"}
              alt={h.name}
              fill
              className="object-contain"
              sizes="100vw"
              priority={i < 3}
            />
          </div>

          {/* Info overlay — bottom left */}
          <div className="absolute bottom-12 left-10 md:left-16">
            <h2
              className="text-[22px] font-medium text-neutral-800"
              style={{ letterSpacing: "-0.04em" }}
            >
              {h.name}
            </h2>
            <p className="text-[13px] text-neutral-400 mt-0.5 tracking-tight">
              {h.manufacturer}
              {h.year ? ` · ${h.year}` : ""}
            </p>
          </div>

          {/* Counter — bottom right */}
          <div className="absolute bottom-12 right-10 md:right-16">
            <Counter current={i + 1} total={humanoids.length} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT B — Rolodex
// ═══════════════════════════════════════════════════════════════
function Rolodex() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback(
    (dir: "up" | "down") => {
      if (isAnimating) return;
      const next =
        dir === "down"
          ? Math.min(index + 1, humanoids.length - 1)
          : Math.max(index - 1, 0);
      if (next === index) return;
      setDirection(dir);
      setIsAnimating(true);
      setIndex(next);
      timeoutRef.current = setTimeout(() => setIsAnimating(false), 400);
    },
    [index, isAnimating]
  );

  // Wheel / keyboard
  useEffect(() => {
    let wheelAccum = 0;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) > 50) {
        go(wheelAccum > 0 ? "down" : "up");
        wheelAccum = 0;
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        go("down");
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        go("up");
      }
    };
    window.addEventListener("wheel", wheelHandler, { passive: false });
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("wheel", wheelHandler);
      window.removeEventListener("keydown", keyHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [go]);

  const current = humanoids[index];
  const prev = index > 0 ? humanoids[index - 1] : null;
  const next = index < humanoids.length - 1 ? humanoids[index + 1] : null;

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Previous peek */}
      <button
        onClick={() => go("up")}
        className="mb-6 h-8 flex items-center gap-2 opacity-30 hover:opacity-60 transition-opacity cursor-pointer"
      >
        {prev && (
          <span className="text-[13px] tracking-tight text-neutral-500">
            {prev.name}
          </span>
        )}
      </button>

      {/* Main card */}
      <div
        key={index}
        className={`flex flex-col items-center ${
          direction === "down"
            ? "animate-rolodex-down"
            : "animate-rolodex-up"
        }`}
      >
        <div className="relative w-[280px] h-[380px] md:w-[340px] md:h-[460px] flex items-center justify-center">
          <Image
            src={current.imageUrl || "/robots/placeholder.png"}
            alt={current.name}
            fill
            className="object-contain"
            sizes="340px"
          />
        </div>
        <div className="mt-6 text-center">
          <h2
            className="text-[24px] font-medium text-neutral-800"
            style={{ letterSpacing: "-0.04em" }}
          >
            {current.name}
          </h2>
          <p className="text-[13px] text-neutral-400 mt-1 tracking-tight">
            {current.manufacturer}
            {current.year ? ` · ${current.year}` : ""}
          </p>
        </div>
      </div>

      {/* Next peek */}
      <button
        onClick={() => go("down")}
        className="mt-6 h-8 flex items-center gap-2 opacity-30 hover:opacity-60 transition-opacity cursor-pointer"
      >
        {next && (
          <span className="text-[13px] tracking-tight text-neutral-500">
            {next.name}
          </span>
        )}
      </button>

      {/* Counter */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <Counter current={index + 1} total={humanoids.length} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT C — Split Pane
// ═══════════════════════════════════════════════════════════════
function SplitPane() {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback(
    (dir: "up" | "down") => {
      if (isAnimating) return;
      const next =
        dir === "down"
          ? Math.min(index + 1, humanoids.length - 1)
          : Math.max(index - 1, 0);
      if (next === index) return;
      setIsAnimating(true);
      setIndex(next);
      timeoutRef.current = setTimeout(() => setIsAnimating(false), 450);
    },
    [index, isAnimating]
  );

  useEffect(() => {
    let wheelAccum = 0;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) > 50) {
        go(wheelAccum > 0 ? "down" : "up");
        wheelAccum = 0;
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        go("down");
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        go("up");
      }
    };
    window.addEventListener("wheel", wheelHandler, { passive: false });
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("wheel", wheelHandler);
      window.removeEventListener("keydown", keyHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [go]);

  const h = humanoids[index];

  const stats = [
    h.height && { label: "Height", value: `${h.height} cm` },
    h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` },
    h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
    h.cost && h.cost !== "N/A" && { label: "Cost", value: h.cost },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="h-screen flex overflow-hidden select-none">
      {/* Left — Image */}
      <div className="w-[55%] h-full flex items-center justify-center relative">
        <div
          key={index}
          className="relative w-full h-[70vh] animate-split-image"
        >
          <Image
            src={h.imageUrl || "/robots/placeholder.png"}
            alt={h.name}
            fill
            className="object-contain"
            sizes="55vw"
          />
        </div>
      </div>

      {/* Right — Info */}
      <div className="w-[45%] h-full flex items-center">
        <div key={index} className="px-12 md:px-16 animate-split-text">
          <p className="text-[11px] tracking-widest uppercase text-neutral-400 mb-4">
            {h.manufacturer}
          </p>
          <h2
            className="text-[32px] font-medium text-neutral-800 leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            {h.name}
          </h2>
          <div className="flex items-center gap-3 mt-3">
            {h.year && (
              <span className="text-[13px] text-neutral-500">{h.year}</span>
            )}
            {h.status && (
              <span className="text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                {h.status}
              </span>
            )}
          </div>

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-10 space-y-4">
              {stats.slice(0, 4).map((s) => (
                <div key={s.label} className="flex items-baseline justify-between max-w-[200px]">
                  <span className="text-[11px] tracking-widest uppercase text-neutral-400">
                    {s.label}
                  </span>
                  <span className="text-[14px] text-neutral-700 font-medium tabular-nums">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Counter */}
          <div className="mt-14">
            <Counter current={index + 1} total={humanoids.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT D — Filmstrip
// ═══════════════════════════════════════════════════════════════
function Filmstrip() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Snap scroll observer
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.filmIndex
            );
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );

    el.querySelectorAll("[data-film-index]").forEach((child) =>
      observer.observe(child)
    );
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector(
      `[data-film-index="${idx}"]`
    ) as HTMLElement;
    target?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(activeIndex + 1, humanoids.length - 1);
        scrollTo(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        scrollTo(prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, scrollTo]);

  return (
    <div className="h-screen flex flex-col justify-center overflow-hidden select-none">
      {/* Filmstrip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-[calc(50vw-160px)] md:px-[calc(50vw-190px)]"
      >
        {humanoids.map((h, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={h.id}
              data-film-index={i}
              className="flex-shrink-0 snap-center flex flex-col items-center cursor-pointer"
              style={{
                transform: isActive ? "scale(1)" : "scale(0.85)",
                opacity: isActive ? 1 : 0.35,
                transition:
                  "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => scrollTo(i)}
            >
              <div className="relative w-[320px] h-[420px] md:w-[380px] md:h-[500px] flex items-center justify-center">
                <Image
                  src={h.imageUrl || "/robots/placeholder.png"}
                  alt={h.name}
                  fill
                  className="object-contain"
                  sizes="380px"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom info bar */}
      <div className="flex flex-col items-center mt-8">
        <h2
          key={activeIndex}
          className="text-[20px] font-medium text-neutral-800 animate-blur-fade"
          style={{ letterSpacing: "-0.04em" }}
        >
          {humanoids[activeIndex].name}
        </h2>
        <p className="text-[13px] text-neutral-400 mt-1 tracking-tight">
          {humanoids[activeIndex].manufacturer}
        </p>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 mt-6">
          {humanoids.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className="p-0.5 cursor-pointer"
            >
              <div
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "w-2 h-2 bg-neutral-800 scale-110"
                    : "w-1.5 h-1.5 bg-neutral-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT E — Arc
// ═══════════════════════════════════════════════════════════════
function Arc() {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback(
    (dir: "up" | "down") => {
      if (isAnimating) return;
      const next =
        dir === "down"
          ? Math.min(index + 1, humanoids.length - 1)
          : Math.max(index - 1, 0);
      if (next === index) return;
      setIsAnimating(true);
      setIndex(next);
      timeoutRef.current = setTimeout(() => setIsAnimating(false), 400);
    },
    [index, isAnimating]
  );

  useEffect(() => {
    let wheelAccum = 0;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) > 50) {
        go(wheelAccum > 0 ? "down" : "up");
        wheelAccum = 0;
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        go("down");
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        go("up");
      }
    };
    window.addEventListener("wheel", wheelHandler, { passive: false });
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("wheel", wheelHandler);
      window.removeEventListener("keydown", keyHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [go]);

  // Arc geometry: items sit along a large circle anchored off-screen left
  // The circle center is at (-arcRadius + arcLeftOffset, 50vh)
  const arcRadius = 600;
  const arcLeftOffset = 80; // how far the arc peeks into the viewport
  const visibleSlots = 5; // show 2 above, active, 2 below

  const getArcPosition = (slotOffset: number) => {
    // slotOffset: -2, -1, 0, +1, +2 from center
    const angleSpacing = 12; // degrees between items
    const angleDeg = slotOffset * angleSpacing;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Circle center is off-screen left
    const cx = -arcRadius + arcLeftOffset;
    const cy = 0; // relative to viewport center

    const x = cx + arcRadius * Math.cos(angleRad);
    const y = cy + arcRadius * Math.sin(angleRad);

    return { x, y };
  };

  // Which items to show (centered around current index)
  const halfSlots = Math.floor(visibleSlots / 2);
  const slots: { itemIndex: number; slotOffset: number }[] = [];
  for (let offset = -halfSlots; offset <= halfSlots; offset++) {
    const itemIndex = index + offset;
    if (itemIndex >= 0 && itemIndex < humanoids.length) {
      slots.push({ itemIndex, slotOffset: offset });
    }
  }

  return (
    <div className="h-screen overflow-hidden select-none relative">
      {/* Arc line (SVG) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <circle
          cx={-arcRadius + arcLeftOffset}
          cy="50%"
          r={arcRadius}
          fill="none"
          stroke="currentColor"
          className="text-neutral-200"
          strokeWidth="1"
        />
      </svg>

      {/* Items along the arc */}
      <div className="relative w-full h-full" style={{ zIndex: 1 }}>
        {slots.map(({ itemIndex, slotOffset }) => {
          const pos = getArcPosition(slotOffset);
          const isActive = slotOffset === 0;
          const distance = Math.abs(slotOffset);

          return (
            <div
              key={itemIndex}
              className="absolute flex items-center gap-5 cursor-pointer"
              style={{
                left: `${pos.x}px`,
                top: `calc(50% + ${pos.y}px)`,
                transform: "translateY(-50%)",
                opacity: isActive ? 1 : 0.25 - distance * 0.05,
                transition:
                  "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => {
                if (slotOffset < 0) go("up");
                if (slotOffset > 0) go("down");
              }}
            >
              {/* Dot on arc */}
              <div
                className={`rounded-full flex-shrink-0 transition-all duration-400 ${
                  isActive
                    ? "w-2.5 h-2.5 bg-neutral-800"
                    : "w-1.5 h-1.5 bg-neutral-400"
                }`}
              />

              {/* Number */}
              <span
                className={`tabular-nums font-medium transition-all duration-400 ${
                  isActive
                    ? "text-[56px] text-neutral-800"
                    : "text-[40px] text-neutral-300"
                }`}
                style={{
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  fontStyle: isActive ? "normal" : "italic",
                }}
              >
                {String(itemIndex).padStart(2, "0")}
              </span>

              {/* Name + info (only on active) */}
              {isActive && (
                <div
                  key={itemIndex}
                  className="ml-1 animate-arc-text"
                >
                  <h2
                    className="text-[18px] font-medium text-neutral-800"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {humanoids[itemIndex].name}
                  </h2>
                  <p className="text-[13px] text-neutral-400 mt-0.5 tracking-tight max-w-[280px]">
                    {humanoids[itemIndex].manufacturer}
                    {humanoids[itemIndex].year
                      ? ` · ${humanoids[itemIndex].year}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Robot image — right side */}
      <div
        className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2"
        style={{ zIndex: 1 }}
      >
        <div
          key={index}
          className="relative w-[240px] h-[360px] md:w-[320px] md:h-[460px] animate-split-image"
        >
          <Image
            src={humanoids[index].imageUrl || "/robots/placeholder.png"}
            alt={humanoids[index].name}
            fill
            className="object-contain"
            sizes="320px"
          />
        </div>
      </div>

      {/* Counter — bottom right */}
      <div className="absolute bottom-8 right-10 md:right-16" style={{ zIndex: 2 }}>
        <Counter current={index + 1} total={humanoids.length} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT F — Spread
// ═══════════════════════════════════════════════════════════════
function Spread() {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const go = useCallback(
    (dir: "left" | "right") => {
      if (isAnimating) return;
      const next =
        dir === "right"
          ? Math.min(index + 1, humanoids.length - 1)
          : Math.max(index - 1, 0);
      if (next === index) return;
      setIsAnimating(true);
      setIndex(next);
      timeoutRef.current = setTimeout(() => setIsAnimating(false), 500);
    },
    [index, isAnimating]
  );

  useEffect(() => {
    let wheelAccum = 0;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum += e.deltaY + e.deltaX;
      if (Math.abs(wheelAccum) > 50) {
        go(wheelAccum > 0 ? "right" : "left");
        wheelAccum = 0;
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        go("right");
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go("left");
      }
    };
    window.addEventListener("wheel", wheelHandler, { passive: false });
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("wheel", wheelHandler);
      window.removeEventListener("keydown", keyHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [go]);

  // Fan geometry — cards arranged along a bowl-shaped curve
  const visibleCount = 7;
  const half = Math.floor(visibleCount / 2);

  // Build visible slots relative to current index
  const slots: { itemIndex: number; offset: number }[] = [];
  for (let off = -half; off <= half; off++) {
    const idx = index + off;
    if (idx >= 0 && idx < humanoids.length) {
      slots.push({ itemIndex: idx, offset: off });
    }
  }

  const getCardStyle = (offset: number): React.CSSProperties => {
    const absOffset = Math.abs(offset);

    // Horizontal spacing — increases toward edges
    const xSpacing = 180;
    const x = offset * xSpacing;

    // Vertical — parabolic curve (bowl shape, cards at edges drop down)
    const yDrop = offset * offset * 18;

    // Rotation — cards tilt outward from center
    const rotation = offset * -6;

    // Scale — center is largest
    const scale = 1 - absOffset * 0.06;

    // Opacity
    const opacity = absOffset === 0 ? 1 : Math.max(0.3, 1 - absOffset * 0.2);

    // Z-index — center on top
    const zIndex = visibleCount - absOffset;

    return {
      transform: `translateX(${x}px) translateY(${yDrop}px) rotate(${rotation}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    };
  };

  return (
    <div className="h-screen overflow-hidden select-none relative flex flex-col items-center justify-center">
      {/* Card fan */}
      <div className="relative flex items-center justify-center" style={{ height: 380 }}>
        {slots.map(({ itemIndex, offset }) => (
          <div
            key={itemIndex}
            className="absolute cursor-pointer"
            style={getCardStyle(offset)}
            onClick={() => {
              if (offset < 0) go("left");
              else if (offset > 0) go("right");
            }}
          >
            <div
              className="w-[180px] h-[240px] md:w-[200px] md:h-[280px] rounded-2xl overflow-hidden bg-white shadow-lg border border-neutral-100/80"
              style={{
                transformOrigin: "center bottom",
              }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={humanoids[itemIndex].imageUrl || "/robots/placeholder.png"}
                  alt={humanoids[itemIndex].name}
                  fill
                  className="object-contain p-3"
                  sizes="200px"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Label below */}
      <div className="mt-12 text-center">
        <p className="text-[13px] text-neutral-400 tracking-tight">
          {humanoids[index].manufacturer}
          {humanoids[index].year ? ` · ${humanoids[index].year}` : ""}
        </p>
        <h2
          key={index}
          className="text-[22px] font-medium text-neutral-800 mt-1 animate-blur-fade"
          style={{ letterSpacing: "-0.04em" }}
        >
          {humanoids[index].name}
        </h2>
      </div>

      {/* Counter */}
      <div className="absolute bottom-8">
        <Counter current={index + 1} total={humanoids.length} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT G — Orbit
// ═══════════════════════════════════════════════════════════════

// Deterministic pseudo-random based on index (consistent across renders)
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Orbit() {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        return;
      }
      const dir =
        e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 :
        e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      setSelected((prev) => {
        if (prev === null) return 0;
        const next = prev + dir;
        if (next < 0 || next >= humanoids.length) return prev;
        return next;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Position each robot along an ellipse around the viewport edges
  // with slight random offsets for an organic, scattered feel
  const getItemPosition = (i: number, total: number) => {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;

    // Ellipse radii as percentage of viewport
    const rx = 42; // horizontal radius (% of vw)
    const ry = 40; // vertical radius (% of vh)

    // Base position on ellipse
    const baseX = 50 + rx * Math.cos(angle);
    const baseY = 50 + ry * Math.sin(angle);

    // Deterministic scatter offset
    const offsetX = (seededRandom(i * 3) - 0.5) * 6;
    const offsetY = (seededRandom(i * 7) - 0.5) * 6;

    // Deterministic rotation
    const rotation = (seededRandom(i * 13) - 0.5) * 30;

    // Scale variation
    const scale = 0.7 + seededRandom(i * 17) * 0.35;

    return {
      x: baseX + offsetX,
      y: baseY + offsetY,
      rotation,
      scale,
    };
  };

  const activeIndex = selected ?? hovered;
  const activeBot = activeIndex !== null ? humanoids[activeIndex] : null;

  return (
    <div className="h-screen overflow-hidden select-none relative bg-neutral-50">
      {/* Scattered items around the edge */}
      {humanoids.map((h, i) => {
        const pos = getItemPosition(i, humanoids.length);
        const isSelected = selected === i;
        const isHovered = hovered === i;
        const isHighlighted = isSelected || isHovered;

        return (
          <div
            key={h.id}
            className="absolute cursor-pointer"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) rotate(${isHighlighted ? 0 : pos.rotation}deg) scale(${isHighlighted ? 1.15 : pos.scale})`,
              opacity: selected !== null && !isSelected ? 0.25 : isHighlighted ? 1 : 0.7,
              zIndex: isHighlighted ? 20 : 1,
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={() => setSelected(isSelected ? null : i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="relative w-[70px] h-[90px] md:w-[90px] md:h-[115px]">
              <Image
                src={h.imageUrl || "/robots/placeholder.png"}
                alt={h.name}
                fill
                className="object-contain"
                sizes="90px"
              />
            </div>
          </div>
        );
      })}

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {activeBot ? (
          <div key={activeIndex} className="text-center animate-blur-fade pointer-events-auto">
            <p className="text-[11px] tracking-widest uppercase text-neutral-400">
              {activeBot.manufacturer}
            </p>
            <h2
              className="text-[28px] md:text-[36px] font-medium text-neutral-800 mt-1"
              style={{ letterSpacing: "-0.04em" }}
            >
              {activeBot.name}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-2">
              {activeBot.year && (
                <span className="text-[13px] text-neutral-500">{activeBot.year}</span>
              )}
              {activeBot.status && (
                <span className="text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                  {activeBot.status}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h1
              className="text-[32px] md:text-[42px] font-medium text-neutral-800"
              style={{ letterSpacing: "-0.04em", lineHeight: 1.15 }}
            >
              Humanoid
              <br />
              Index
            </h1>
            <p className="text-[13px] text-neutral-400 mt-4 tracking-tight">
              {humanoids.length} robots · click to explore
            </p>
          </div>
        )}
      </div>

      {/* Counter */}
      {selected !== null && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Counter current={selected + 1} total={humanoids.length} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const [layout, setLayout] = useState<Layout>("A");

  return (
    <main className="bg-neutral-50 min-h-screen">
      <LayoutSwitcher active={layout} onChange={setLayout} />

      {layout === "A" && <FullBleed />}
      {layout === "B" && <Rolodex />}
      {layout === "C" && <SplitPane />}
      {layout === "D" && <Filmstrip />}
      {layout === "E" && <Arc />}
      {layout === "F" && <Spread />}
      {layout === "G" && <Orbit />}

      {/* Layout label */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <span className="text-[11px] tracking-widest uppercase text-neutral-300">
          {layoutLabels[layout]}
        </span>
      </div>
    </main>
  );
}
