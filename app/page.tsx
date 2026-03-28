"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { humanoids, Humanoid } from "@/data/humanoids";
import Image from "next/image";

const ALL_LAYOUTS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N",
  "O","P","Q","R","S","T","U","V","W","X","Y","Z","AA",
] as const;
type Layout = (typeof ALL_LAYOUTS)[number];

const layoutLabels: Record<Layout, string> = {
  A: "Full Bleed", B: "Rolodex", C: "Split", D: "Filmstrip",
  E: "Arc", F: "Spread", G: "Orbit", H: "Stack", I: "Timeline",
  J: "Wheel", K: "Coverflow", L: "Ticker", M: "Accordion",
  N: "Spotlight", O: "Marquee", P: "Cascade", Q: "Blinds",
  R: "Gallery", S: "Spiral", T: "Flip", U: "Dial",
  V: "Columns", W: "Reveal", X: "Pendulum", Y: "Telescope",
  Z: "Index", AA: "Diorama",
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
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-white/80 backdrop-blur-xl rounded-2xl border border-neutral-200/60 p-1 shadow-sm max-w-[90vw] overflow-x-auto scrollbar-hide">
      {ALL_LAYOUTS.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`relative px-2.5 py-1.5 rounded-full text-[10px] tracking-wide font-medium transition-all duration-200 flex-shrink-0 ${
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

// ─── Shared nav hook (wheel + keyboard) ─────────────────────────
function useNav(total: number, animDuration = 450) {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const go = useCallback(
    (delta: number) => {
      if (isAnimating) return;
      setIndex((prev) => {
        const next = Math.max(0, Math.min(total - 1, prev + delta));
        if (next === prev) return prev;
        setIsAnimating(true);
        timeoutRef.current = setTimeout(() => setIsAnimating(false), animDuration);
        return next;
      });
    },
    [isAnimating, total, animDuration]
  );
  useEffect(() => {
    let acc = 0;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); acc += e.deltaY; if (Math.abs(acc) > 50) { go(acc > 0 ? 1 : -1); acc = 0; } };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [go]);
  return { index, setIndex, go, isAnimating };
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
// LAYOUT H — Stack
// Tinder-style stacked cards, scroll to throw the top card away
// ═══════════════════════════════════════════════════════════════
function Stack() {
  const { index, go } = useNav(humanoids.length);
  const visibleCount = 4;

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center">
      <div className="relative" style={{ width: 300, height: 420 }}>
        {humanoids.slice(index, index + visibleCount).reverse().map((h, reverseI) => {
          const stackI = visibleCount - 1 - reverseI;
          const isTop = stackI === 0;
          return (
            <div
              key={h.id}
              className="absolute inset-0 rounded-2xl bg-white border border-neutral-100 shadow-lg overflow-hidden cursor-pointer"
              style={{
                transform: `translateY(${stackI * -8}px) scale(${1 - stackI * 0.04})`,
                zIndex: visibleCount - stackI,
                opacity: 1 - stackI * 0.15,
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => isTop && go(1)}
            >
              <div className="relative w-full h-[75%]">
                <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-4" sizes="300px" />
              </div>
              {isTop && (
                <div className="px-5 pb-4">
                  <h2 className="text-[18px] font-medium text-neutral-800" style={{ letterSpacing: "-0.03em" }}>{h.name}</h2>
                  <p className="text-[12px] text-neutral-400 mt-0.5">{h.manufacturer}{h.year ? ` · ${h.year}` : ""}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-8"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT I — Timeline
// Horizontal year-based timeline
// ═══════════════════════════════════════════════════════════════
function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = [...humanoids].sort((a, b) => (a.year || 0) - (b.year || 0));
  const minYear = sorted[0]?.year || 2013;
  const maxYear = sorted[sorted.length - 1]?.year || 2025;

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current?.querySelector(`[data-tl-index="${idx}"]`) as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); const n = Math.min(activeIndex + 1, sorted.length - 1); setActiveIndex(n); scrollTo(n); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); const n = Math.max(activeIndex - 1, 0); setActiveIndex(n); scrollTo(n); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, scrollTo, sorted.length]);

  return (
    <div className="h-screen overflow-hidden select-none flex flex-col justify-center">
      {/* Active robot display */}
      <div className="flex items-center justify-center mb-8">
        <div key={activeIndex} className="flex items-center gap-8 animate-blur-fade">
          <div className="relative w-[180px] h-[240px]">
            <Image src={sorted[activeIndex]?.imageUrl || "/robots/placeholder.png"} alt={sorted[activeIndex]?.name} fill className="object-contain" sizes="180px" />
          </div>
          <div>
            <p className="text-[11px] tracking-widest uppercase text-neutral-400">{sorted[activeIndex]?.manufacturer}</p>
            <h2 className="text-[28px] font-medium text-neutral-800 mt-1" style={{ letterSpacing: "-0.04em" }}>{sorted[activeIndex]?.name}</h2>
            <span className="text-[48px] font-medium text-neutral-200 tabular-nums" style={{ letterSpacing: "-0.04em" }}>{sorted[activeIndex]?.year}</span>
          </div>
        </div>
      </div>
      {/* Timeline bar */}
      <div ref={scrollRef} className="relative overflow-x-auto scrollbar-hide px-[40vw]">
        <div className="h-px bg-neutral-200 absolute top-1/2 left-0 right-0" />
        <div className="flex items-center gap-12 relative py-8">
          {sorted.map((h, i) => (
            <button key={h.id} data-tl-index={i} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group" onClick={() => { setActiveIndex(i); }}>
              <span className={`text-[11px] tabular-nums transition-colors ${i === activeIndex ? "text-neutral-800 font-medium" : "text-neutral-400"}`}>{h.year}</span>
              <div className={`rounded-full transition-all duration-300 ${i === activeIndex ? "w-3 h-3 bg-neutral-800" : "w-2 h-2 bg-neutral-300 group-hover:bg-neutral-500"}`} />
              <span className={`text-[11px] tracking-tight transition-colors max-w-[80px] text-center ${i === activeIndex ? "text-neutral-700" : "text-neutral-400"}`}>{h.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT J — Wheel
// Ferris wheel rotation — items around a circle
// ═══════════════════════════════════════════════════════════════
function Wheel() {
  const { index, go } = useNav(humanoids.length);
  const visibleCount = 8;
  const radius = 280;

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center">
      <div className="relative" style={{ width: radius * 2 + 120, height: radius * 2 + 120 }}>
        {/* Circle outline */}
        <div className="absolute inset-[60px] rounded-full border border-neutral-100" />
        {humanoids.slice(Math.max(0, index - Math.floor(visibleCount / 2)), Math.max(0, index - Math.floor(visibleCount / 2)) + visibleCount).map((h, i) => {
          const realIdx = Math.max(0, index - Math.floor(visibleCount / 2)) + i;
          const offset = realIdx - index;
          const angle = (offset / visibleCount) * Math.PI * 2 - Math.PI / 2;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          const isActive = realIdx === index;
          return (
            <div
              key={h.id}
              className="absolute cursor-pointer"
              style={{
                left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) scale(${isActive ? 1.2 : 0.7})`,
                opacity: isActive ? 1 : 0.4,
                zIndex: isActive ? 10 : 1,
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => go(offset)}
            >
              <div className="relative w-[80px] h-[110px] md:w-[100px] md:h-[140px]">
                <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="100px" />
              </div>
            </div>
          );
        })}
        {/* Center info */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div key={index} className="text-center animate-blur-fade">
            <h2 className="text-[22px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{humanoids[index].name}</h2>
            <p className="text-[12px] text-neutral-400 mt-1">{humanoids[index].manufacturer}</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-8"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT K — Coverflow
// 3D perspective carousel (iTunes-style)
// ═══════════════════════════════════════════════════════════════
function Coverflow() {
  const { index, go } = useNav(humanoids.length);
  const visibleHalf = 3;

  return (
    <div className="h-screen overflow-hidden select-none relative flex flex-col items-center justify-center" style={{ perspective: "1200px" }}>
      <div className="relative flex items-center justify-center" style={{ height: 440, transformStyle: "preserve-3d" }}>
        {humanoids.map((h, i) => {
          const offset = i - index;
          const absOff = Math.abs(offset);
          if (absOff > visibleHalf) return null;
          const x = offset * 220;
          const z = -absOff * 100;
          const rotateY = offset < 0 ? 45 : offset > 0 ? -45 : 0;
          return (
            <div
              key={h.id}
              className="absolute cursor-pointer"
              style={{
                transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg)`,
                opacity: absOff === 0 ? 1 : 0.7 - absOff * 0.1,
                zIndex: 10 - absOff,
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                transformStyle: "preserve-3d",
              }}
              onClick={() => go(offset)}
            >
              <div className="w-[220px] h-[320px] md:w-[260px] md:h-[380px] rounded-xl bg-white shadow-xl border border-neutral-100 overflow-hidden">
                <div className="relative w-full h-full">
                  <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-4" sizes="260px" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div key={index} className="mt-6 text-center animate-blur-fade">
        <h2 className="text-[22px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{humanoids[index].name}</h2>
        <p className="text-[12px] text-neutral-400 mt-1">{humanoids[index].manufacturer}{humanoids[index].year ? ` · ${humanoids[index].year}` : ""}</p>
      </div>
      <div className="absolute bottom-8"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT L — Ticker
// Airport departure board — vertical list of names
// ═══════════════════════════════════════════════════════════════
function Ticker() {
  const { index, go } = useNav(humanoids.length);

  return (
    <div className="h-screen overflow-hidden select-none relative flex">
      {/* Left: ticker list */}
      <div className="w-[45%] h-full flex flex-col justify-center pl-12 md:pl-24">
        <div className="space-y-1">
          {humanoids.map((h, i) => {
            const distance = Math.abs(i - index);
            if (distance > 6) return null;
            const isActive = i === index;
            return (
              <button
                key={h.id}
                className="block w-full text-left cursor-pointer"
                style={{
                  opacity: isActive ? 1 : Math.max(0.08, 0.4 - distance * 0.06),
                  transform: `translateY(${(i - index) * (isActive ? 0 : 0)}px)`,
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onClick={() => go(i - index)}
              >
                <div className="flex items-baseline gap-4">
                  <span className={`tabular-nums font-medium ${isActive ? "text-[42px] text-neutral-800" : "text-[24px] text-neutral-300"}`} style={{ letterSpacing: "-0.04em", lineHeight: 1.2 }}>
                    {String(i).padStart(2, "0")}
                  </span>
                  <div>
                    <span className={`block ${isActive ? "text-[18px] font-medium text-neutral-800" : "text-[14px] text-neutral-400"}`} style={{ letterSpacing: "-0.03em" }}>{h.name}</span>
                    {isActive && <span className="text-[12px] text-neutral-400 mt-0.5 block">{h.manufacturer}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {/* Right: image */}
      <div className="w-[55%] h-full flex items-center justify-center">
        <div key={index} className="relative w-[300px] h-[440px] animate-split-image">
          <Image src={humanoids[index].imageUrl || "/robots/placeholder.png"} alt={humanoids[index].name} fill className="object-contain" sizes="300px" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT M — Accordion
// Full-width rows that expand on selection
// ═══════════════════════════════════════════════════════════════
function Accordion() {
  const { index, go } = useNav(humanoids.length);

  return (
    <div className="h-screen overflow-y-auto scrollbar-hide select-none">
      {humanoids.map((h, i) => {
        const isActive = i === index;
        return (
          <div
            key={h.id}
            className="border-b border-neutral-100 cursor-pointer overflow-hidden"
            style={{
              height: isActive ? "420px" : "52px",
              transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={() => go(i - index)}
          >
            {/* Header row */}
            <div className="h-[52px] flex items-center px-8 md:px-16 gap-6">
              <span className="text-[11px] tabular-nums text-neutral-400 w-6">{String(i + 1).padStart(2, "0")}</span>
              <span className={`text-[14px] ${isActive ? "font-medium text-neutral-800" : "text-neutral-500"}`} style={{ letterSpacing: "-0.03em" }}>{h.name}</span>
              <span className="text-[12px] text-neutral-400 ml-auto">{h.manufacturer}</span>
            </div>
            {/* Expanded content */}
            {isActive && (
              <div className="flex items-center gap-12 px-8 md:px-16 pb-8 animate-fade-in-up">
                <div className="relative w-[200px] h-[300px] flex-shrink-0">
                  <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="200px" />
                </div>
                <div>
                  <p className="text-[11px] tracking-widest uppercase text-neutral-400 mb-2">{h.manufacturer} {h.year ? `· ${h.year}` : ""}</p>
                  <h2 className="text-[28px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{h.name}</h2>
                  {h.status && <span className="text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 mt-3 inline-block">{h.status}</span>}
                  {h.description && <p className="text-[13px] text-neutral-500 mt-4 max-w-[380px] leading-relaxed">{h.description}</p>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT N — Spotlight
// Dark background, illuminated circle on the robot
// ═══════════════════════════════════════════════════════════════
function Spotlight() {
  const { index, go } = useNav(humanoids.length);
  const h = humanoids[index];

  return (
    <div className="h-screen overflow-hidden select-none relative bg-neutral-900 flex items-center justify-center">
      {/* Spotlight glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)" }} />
      {/* Robot */}
      <div key={index} className="relative w-[280px] h-[400px] md:w-[340px] md:h-[480px] animate-split-image z-10">
        <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="340px" />
      </div>
      {/* Info */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center z-10">
        <h2 key={index} className="text-[22px] font-medium text-white/90 animate-blur-fade" style={{ letterSpacing: "-0.04em" }}>{h.name}</h2>
        <p className="text-[12px] text-white/40 mt-1">{h.manufacturer}{h.year ? ` · ${h.year}` : ""}</p>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <span className="text-[11px] tracking-widest uppercase text-white/25 tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(humanoids.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT O — Marquee
// Auto-scrolling horizontal ribbon of images
// ═══════════════════════════════════════════════════════════════
function Marquee() {
  const [paused, setPaused] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const speed = 0.5;

  useEffect(() => {
    if (paused !== null) return;
    let raf: number;
    const tick = () => { setOffset((o) => o - speed); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaused(null);
      else if (e.key === "ArrowRight") { e.preventDefault(); setPaused((p) => p !== null ? Math.min(p + 1, humanoids.length - 1) : 0); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setPaused((p) => p !== null ? Math.max(p - 1, 0) : 0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const itemWidth = 200;
  const totalWidth = humanoids.length * itemWidth;
  const wrappedOffset = ((offset % totalWidth) + totalWidth) % totalWidth;

  return (
    <div className="h-screen overflow-hidden select-none relative flex flex-col items-center justify-center">
      {/* Paused detail */}
      {paused !== null && (
        <div key={paused} className="mb-10 text-center animate-blur-fade">
          <div className="relative w-[200px] h-[280px] mx-auto mb-4">
            <Image src={humanoids[paused].imageUrl || "/robots/placeholder.png"} alt={humanoids[paused].name} fill className="object-contain" sizes="200px" />
          </div>
          <h2 className="text-[22px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{humanoids[paused].name}</h2>
          <p className="text-[12px] text-neutral-400 mt-1">{humanoids[paused].manufacturer}</p>
        </div>
      )}
      {/* Scrolling ribbon */}
      <div className="relative w-full overflow-hidden" style={{ height: paused !== null ? 60 : 120 }}>
        <div className="flex absolute whitespace-nowrap" style={{ transform: `translateX(${-wrappedOffset}px)`, transition: paused !== null ? "none" : undefined }}>
          {[...humanoids, ...humanoids, ...humanoids].map((h, i) => (
            <button
              key={`${h.id}-${i}`}
              className={`flex-shrink-0 flex items-center gap-3 px-6 cursor-pointer transition-opacity ${paused !== null && paused !== (i % humanoids.length) ? "opacity-20" : "opacity-100"}`}
              style={{ width: itemWidth }}
              onClick={() => setPaused(paused === (i % humanoids.length) ? null : (i % humanoids.length))}
            >
              <div className={`relative flex-shrink-0 ${paused !== null ? "w-[30px] h-[40px]" : "w-[50px] h-[70px]"} transition-all`}>
                <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="50px" />
              </div>
              <span className="text-[12px] text-neutral-600 truncate">{h.name}</span>
            </button>
          ))}
        </div>
      </div>
      {paused === null && <p className="text-[11px] text-neutral-300 mt-6">click to pause</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT P — Cascade
// Diagonal waterfall of overlapping cards
// ═══════════════════════════════════════════════════════════════
function Cascade() {
  const { index, go } = useNav(humanoids.length);
  const visibleCount = 6;

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center">
      <div className="relative" style={{ width: 600, height: 500 }}>
        {humanoids.slice(Math.max(0, index - 1), Math.max(0, index - 1) + visibleCount).map((h, i) => {
          const realIdx = Math.max(0, index - 1) + i;
          const offset = realIdx - index;
          const isActive = offset === 0;
          return (
            <div
              key={h.id}
              className="absolute cursor-pointer"
              style={{
                left: `${50 + offset * 80}px`,
                top: `${50 + offset * 50}px`,
                transform: `scale(${isActive ? 1.05 : 0.9})`,
                opacity: isActive ? 1 : 0.5 - Math.abs(offset) * 0.08,
                zIndex: isActive ? 20 : 10 - Math.abs(offset),
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => go(offset)}
            >
              <div className="w-[200px] h-[280px] rounded-xl bg-white shadow-lg border border-neutral-100 overflow-hidden">
                <div className="relative w-full h-[75%]">
                  <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-3" sizes="200px" />
                </div>
                <div className="px-3 pb-2">
                  <p className="text-[12px] font-medium text-neutral-700 truncate">{h.name}</p>
                  <p className="text-[10px] text-neutral-400">{h.manufacturer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-8"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT Q — Blinds
// Vertical strips, each revealing a different robot
// ═══════════════════════════════════════════════════════════════
function Blinds() {
  const { index, go } = useNav(humanoids.length);
  const stripCount = 7;
  const half = Math.floor(stripCount / 2);

  return (
    <div className="h-screen overflow-hidden select-none relative flex">
      {Array.from({ length: stripCount }).map((_, si) => {
        const offset = si - half;
        const itemIdx = ((index + offset) % humanoids.length + humanoids.length) % humanoids.length;
        const h = humanoids[itemIdx];
        const isCenter = offset === 0;
        return (
          <div
            key={si}
            className="h-full relative cursor-pointer border-r border-neutral-100/50 overflow-hidden"
            style={{
              flex: isCenter ? 3 : 1,
              opacity: isCenter ? 1 : 0.3 + (1 - Math.abs(offset) / half) * 0.3,
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={() => go(offset)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-[60vh]">
                <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes={isCenter ? "40vw" : "15vw"} />
              </div>
            </div>
            {isCenter && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center z-10">
                <h2 className="text-[22px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{h.name}</h2>
                <p className="text-[12px] text-neutral-400 mt-1">{h.manufacturer}</p>
              </div>
            )}
          </div>
        );
      })}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT R — Gallery
// Random-sized frames on a white wall
// ═══════════════════════════════════════════════════════════════
function Gallery() {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setSelected((p) => p !== null ? Math.min(p + 1, humanoids.length - 1) : 0); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setSelected((p) => p !== null ? Math.max(p - 1, 0) : 0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen overflow-hidden select-none relative p-8 md:p-12">
      <div className="w-full h-full relative">
        {humanoids.map((h, i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          const sizeW = 120 + seededRandom(i * 31) * 60;
          const sizeH = 140 + seededRandom(i * 47) * 80;
          const x = col * 20 + seededRandom(i * 11) * 4;
          const y = row * 22 + seededRandom(i * 23) * 6;
          const isSelected = selected === i;
          return (
            <div
              key={h.id}
              className="absolute cursor-pointer"
              style={{
                left: `${x}%`, top: `${y}%`,
                width: sizeW, height: sizeH,
                transform: isSelected ? "scale(1.3)" : "scale(1)",
                zIndex: isSelected ? 20 : 1,
                opacity: selected !== null && !isSelected ? 0.2 : 1,
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => setSelected(isSelected ? null : i)}
            >
              <div className="w-full h-full rounded-lg bg-white shadow-sm border border-neutral-100 overflow-hidden p-2">
                <div className="relative w-full h-full">
                  <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="180px" />
                </div>
              </div>
              {isSelected && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap animate-blur-fade">
                  <span className="text-[12px] font-medium text-neutral-700">{h.name}</span>
                  <span className="text-[11px] text-neutral-400 ml-2">{h.manufacturer}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT S — Spiral
// Items arranged in a logarithmic spiral from center
// ═══════════════════════════════════════════════════════════════
function SpiralLayout() {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setSelected((p) => p !== null ? Math.min(p + 1, humanoids.length - 1) : 0); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setSelected((p) => p !== null ? Math.max(p - 1, 0) : 0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center">
      {humanoids.map((h, i) => {
        const angle = i * 0.7;
        const radius = 40 + i * 22;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const size = 50 + Math.max(0, 30 - i * 1.2);
        const isSelected = selected === i;
        return (
          <div
            key={h.id}
            className="absolute cursor-pointer"
            style={{
              left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) scale(${isSelected ? 1.8 : 1})`,
              zIndex: isSelected ? 20 : humanoids.length - i,
              opacity: selected !== null && !isSelected ? 0.15 : 1,
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={() => setSelected(isSelected ? null : i)}
          >
            <div className="relative" style={{ width: size, height: size * 1.3 }}>
              <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes={`${size}px`} />
            </div>
          </div>
        );
      })}
      {selected !== null && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center z-30 animate-blur-fade">
          <h2 className="text-[22px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{humanoids[selected].name}</h2>
          <p className="text-[12px] text-neutral-400 mt-1">{humanoids[selected].manufacturer}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT T — Flip
// 3D card flip between robots
// ═══════════════════════════════════════════════════════════════
function Flip() {
  const { index, go } = useNav(humanoids.length, 600);
  const [flipping, setFlipping] = useState(false);
  const prevIndex = useRef(0);

  useEffect(() => {
    if (index !== prevIndex.current) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 600);
      prevIndex.current = index;
      return () => clearTimeout(t);
    }
  }, [index]);

  const h = humanoids[index];

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center" style={{ perspective: "1000px" }}>
      <div
        className="relative w-[300px] h-[440px] md:w-[340px] md:h-[480px]"
        style={{
          transformStyle: "preserve-3d",
          transform: flipping ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Front face */}
        <div className="absolute inset-0 rounded-2xl bg-white border border-neutral-100 shadow-xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
          <div className="relative w-full h-[75%]">
            <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-6" sizes="340px" />
          </div>
          <div className="px-6 pb-6">
            <h2 className="text-[20px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{h.name}</h2>
            <p className="text-[12px] text-neutral-400 mt-1">{h.manufacturer}{h.year ? ` · ${h.year}` : ""}</p>
          </div>
        </div>
        {/* Back face */}
        <div className="absolute inset-0 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-xl flex items-center justify-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <div className="relative w-full h-[75%]">
            <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-6 brightness-0 invert opacity-20" sizes="340px" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-8"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT U — Dial
// Circular rotary selector
// ═══════════════════════════════════════════════════════════════
function Dial() {
  const { index, go } = useNav(humanoids.length);
  const radius = 320;
  const h = humanoids[index];

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center">
      {/* Dial ring */}
      <div className="absolute rounded-full border border-neutral-200" style={{ width: radius * 2, height: radius * 2 }}>
        {humanoids.map((bot, i) => {
          const angle = ((i - index) / humanoids.length) * Math.PI * 2 - Math.PI / 2;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          const isActive = i === index;
          return (
            <div
              key={bot.id}
              className="absolute cursor-pointer"
              style={{
                left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
                transform: "translate(-50%, -50%)",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => { const diff = i - index; const shortest = ((diff + humanoids.length / 2) % humanoids.length) - humanoids.length / 2; go(Math.round(shortest)); }}
            >
              <div className={`rounded-full flex items-center justify-center transition-all ${isActive ? "w-10 h-10 bg-neutral-800" : "w-3 h-3 bg-neutral-300 hover:bg-neutral-400"}`}>
                {isActive && <span className="text-[11px] font-medium text-white tabular-nums">{String(i + 1).padStart(2, "0")}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {/* Center content */}
      <div key={index} className="text-center z-10 animate-blur-fade">
        <div className="relative w-[160px] h-[220px] mx-auto mb-4">
          <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="160px" />
        </div>
        <h2 className="text-[24px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{h.name}</h2>
        <p className="text-[12px] text-neutral-400 mt-1">{h.manufacturer}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT V — Columns
// Multi-column layout with staggered vertical scroll
// ═══════════════════════════════════════════════════════════════
function Columns() {
  const [selected, setSelected] = useState<number | null>(null);
  const cols = [[] as number[], [] as number[], [] as number[]];
  humanoids.forEach((_, i) => cols[i % 3].push(i));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setSelected((p) => p !== null ? Math.min(p + 1, humanoids.length - 1) : 0); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setSelected((p) => p !== null ? Math.max(p - 1, 0) : 0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen overflow-y-auto scrollbar-hide select-none">
      <div className="flex gap-4 p-6 md:p-10 max-w-[900px] mx-auto">
        {cols.map((col, ci) => (
          <div key={ci} className="flex-1 space-y-4" style={{ marginTop: ci * 40 }}>
            {col.map((idx) => {
              const h = humanoids[idx];
              const isSelected = selected === idx;
              const height = 200 + seededRandom(idx * 7) * 120;
              return (
                <div
                  key={h.id}
                  className="rounded-xl bg-white border border-neutral-100 overflow-hidden cursor-pointer"
                  style={{
                    opacity: selected !== null && !isSelected ? 0.3 : 1,
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onClick={() => setSelected(isSelected ? null : idx)}
                >
                  <div className="relative w-full" style={{ height }}>
                    <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-4" sizes="300px" />
                  </div>
                  <div className="px-3 pb-3">
                    <p className="text-[13px] font-medium text-neutral-700" style={{ letterSpacing: "-0.03em" }}>{h.name}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{h.manufacturer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT W — Reveal
// Grid of blurred/masked thumbnails — hover to reveal
// ═══════════════════════════════════════════════════════════════
function Reveal() {
  const [revealed, setRevealed] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRevealed(null);
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setRevealed((p) => p !== null ? Math.min(p + 1, humanoids.length - 1) : 0); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setRevealed((p) => p !== null ? Math.max(p - 1, 0) : 0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen overflow-hidden select-none flex items-center justify-center">
      <div className="grid grid-cols-5 gap-3 p-8 max-w-[800px]">
        {humanoids.map((h, i) => {
          const isRevealed = revealed === i;
          return (
            <div
              key={h.id}
              className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer relative bg-neutral-100"
              onMouseEnter={() => setRevealed(i)}
              onMouseLeave={() => setRevealed(null)}
              style={{
                filter: isRevealed ? "blur(0px) grayscale(0)" : "blur(8px) grayscale(1)",
                transform: isRevealed ? "scale(1.15)" : "scale(1)",
                zIndex: isRevealed ? 10 : 1,
                transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain p-2" sizes="160px" />
              {isRevealed && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2 pt-6">
                  <p className="text-[11px] font-medium text-white">{h.name}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT X — Pendulum
// Cards hanging from top, swinging based on position
// ═══════════════════════════════════════════════════════════════
function Pendulum() {
  const { index, go } = useNav(humanoids.length);
  const visibleCount = 7;
  const half = Math.floor(visibleCount / 2);

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-end justify-center pb-16">
      {/* Attachment point line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-neutral-200" />
      {humanoids.slice(Math.max(0, index - half), Math.max(0, index - half) + visibleCount).map((h, i) => {
        const realIdx = Math.max(0, index - half) + i;
        const offset = realIdx - index;
        const isActive = offset === 0;
        const swingAngle = offset * 8;
        const stringLength = 200;
        return (
          <div key={h.id} className="absolute" style={{ left: `calc(50% + ${offset * 130}px)`, top: 0 }}>
            {/* String */}
            <svg className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" width="2" height={stringLength} style={{ transform: `rotate(${swingAngle}deg)`, transformOrigin: "top center", transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <line x1="1" y1="0" x2="1" y2={stringLength} stroke="#d4d4d4" strokeWidth="1" />
            </svg>
            {/* Card */}
            <div
              className="cursor-pointer"
              style={{
                transform: `rotate(${swingAngle}deg) translateY(${stringLength}px)`,
                transformOrigin: "top center",
                opacity: isActive ? 1 : 0.4,
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onClick={() => go(offset)}
            >
              <div className="relative w-[120px] h-[170px] md:w-[140px] md:h-[200px] -translate-x-1/2">
                <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="140px" />
              </div>
            </div>
          </div>
        );
      })}
      {/* Bottom info */}
      <div key={index} className="text-center z-10 animate-blur-fade">
        <h2 className="text-[22px] font-medium text-neutral-800" style={{ letterSpacing: "-0.04em" }}>{humanoids[index].name}</h2>
        <p className="text-[12px] text-neutral-400 mt-1">{humanoids[index].manufacturer}</p>
      </div>
      <div className="absolute bottom-4"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT Y — Telescope
// Concentric rings — zoom from center outward
// ═══════════════════════════════════════════════════════════════
function Telescope() {
  const { index, go } = useNav(humanoids.length);

  return (
    <div className="h-screen overflow-hidden select-none relative flex items-center justify-center bg-neutral-50">
      {/* Concentric rings */}
      {[1, 2, 3, 4].map((ring) => (
        <div key={ring} className="absolute rounded-full border border-neutral-100" style={{ width: ring * 200, height: ring * 200, opacity: 1 - ring * 0.2 }} />
      ))}
      {/* Surrounding thumbnails in outer ring */}
      {humanoids.map((h, i) => {
        if (i === index) return null;
        const distance = Math.abs(i - index);
        if (distance > 8) return null;
        const angle = ((i - index) / 16) * Math.PI * 2 - Math.PI / 2;
        const r = 180 + distance * 35;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        return (
          <div
            key={h.id}
            className="absolute cursor-pointer"
            style={{
              left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`,
              transform: "translate(-50%, -50%)",
              opacity: 0.15 + (1 - distance / 8) * 0.3,
              transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={() => go(i - index)}
          >
            <div className="relative w-[40px] h-[55px]">
              <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="40px" />
            </div>
          </div>
        );
      })}
      {/* Center: active robot */}
      <div key={index} className="z-10 text-center animate-split-image">
        <div className="relative w-[200px] h-[280px] mx-auto">
          <Image src={humanoids[index].imageUrl || "/robots/placeholder.png"} alt={humanoids[index].name} fill className="object-contain" sizes="200px" />
        </div>
        <h2 className="text-[22px] font-medium text-neutral-800 mt-4" style={{ letterSpacing: "-0.04em" }}>{humanoids[index].name}</h2>
        <p className="text-[12px] text-neutral-400 mt-1">{humanoids[index].manufacturer}</p>
      </div>
      <div className="absolute bottom-8"><Counter current={index + 1} total={humanoids.length} /></div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT Z — Index
// Pure text list on left, image tooltip on hover
// ═══════════════════════════════════════════════════════════════
function TextIndex() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setHovered((p) => p !== null ? Math.min(p + 1, humanoids.length - 1) : 0); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setHovered((p) => p !== null ? Math.max(p - 1, 0) : 0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen overflow-y-auto scrollbar-hide select-none relative" onMouseMove={(e) => setMouseY(e.clientY)}>
      <div className="max-w-[600px] mx-auto py-24 px-8">
        <h1 className="text-[11px] tracking-widest uppercase text-neutral-400 mb-12">Index — {humanoids.length} humanoids</h1>
        {humanoids.map((h, i) => (
          <div
            key={h.id}
            className="group border-b border-neutral-100 py-3 cursor-pointer flex items-baseline gap-4"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-[11px] tabular-nums text-neutral-300 w-6">{String(i + 1).padStart(2, "0")}</span>
            <span className={`text-[15px] transition-colors ${hovered === i ? "text-neutral-800 font-medium" : "text-neutral-500"}`} style={{ letterSpacing: "-0.03em" }}>{h.name}</span>
            <span className="text-[11px] text-neutral-300 ml-auto">{h.manufacturer}</span>
            {h.year && <span className="text-[11px] tabular-nums text-neutral-300">{h.year}</span>}
          </div>
        ))}
      </div>
      {/* Floating image that follows the cursor */}
      {hovered !== null && (
        <div
          className="fixed pointer-events-none z-50 animate-blur-fade"
          style={{ right: "12%", top: mouseY - 120 }}
        >
          <div className="relative w-[180px] h-[250px]">
            <Image src={humanoids[hovered].imageUrl || "/robots/placeholder.png"} alt={humanoids[hovered].name} fill className="object-contain" sizes="180px" />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT AA — Diorama
// Parallax depth layers creating a 3D scene
// ═══════════════════════════════════════════════════════════════
function Diorama() {
  const { index, go } = useNav(humanoids.length);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);
  const h = humanoids[index];
  const prev = index > 0 ? humanoids[index - 1] : null;
  const next = index < humanoids.length - 1 ? humanoids[index + 1] : null;

  const parallax = (depth: number) => ({
    transform: `translate(${(mouseX - 0.5) * depth * -40}px, ${(mouseY - 0.5) * depth * -20}px)`,
    transition: "transform 0.3s ease-out",
  });

  return (
    <div
      className="h-screen overflow-hidden select-none relative flex items-center justify-center bg-neutral-50"
      onMouseMove={(e) => { setMouseX(e.clientX / window.innerWidth); setMouseY(e.clientY / window.innerHeight); }}
    >
      {/* Background layer — previous/next ghosts */}
      <div className="absolute inset-0 flex items-center justify-between px-16 pointer-events-none" style={parallax(0.3)}>
        {prev && (
          <div className="relative w-[120px] h-[180px] opacity-10">
            <Image src={prev.imageUrl || "/robots/placeholder.png"} alt={prev.name} fill className="object-contain" sizes="120px" />
          </div>
        )}
        {next && (
          <div className="relative w-[120px] h-[180px] opacity-10">
            <Image src={next.imageUrl || "/robots/placeholder.png"} alt={next.name} fill className="object-contain" sizes="120px" />
          </div>
        )}
      </div>
      {/* Mid layer — decorative circles */}
      <div className="absolute inset-0 pointer-events-none" style={parallax(0.6)}>
        <div className="absolute top-[20%] left-[15%] w-[200px] h-[200px] rounded-full bg-neutral-100/50" />
        <div className="absolute bottom-[15%] right-[20%] w-[300px] h-[300px] rounded-full bg-neutral-100/30" />
      </div>
      {/* Front layer — main robot */}
      <div style={parallax(1)} key={index} className="z-10 text-center animate-split-image">
        <div className="relative w-[260px] h-[380px] md:w-[300px] md:h-[440px] mx-auto">
          <Image src={h.imageUrl || "/robots/placeholder.png"} alt={h.name} fill className="object-contain" sizes="300px" />
        </div>
      </div>
      {/* Info layer — moves opposite */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center z-20" style={parallax(1.5)}>
        <h2 key={index} className="text-[24px] font-medium text-neutral-800 animate-blur-fade" style={{ letterSpacing: "-0.04em" }}>{h.name}</h2>
        <p className="text-[12px] text-neutral-400 mt-1">{h.manufacturer}{h.year ? ` · ${h.year}` : ""}</p>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"><Counter current={index + 1} total={humanoids.length} /></div>
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
      {layout === "H" && <Stack />}
      {layout === "I" && <Timeline />}
      {layout === "J" && <Wheel />}
      {layout === "K" && <Coverflow />}
      {layout === "L" && <Ticker />}
      {layout === "M" && <Accordion />}
      {layout === "N" && <Spotlight />}
      {layout === "O" && <Marquee />}
      {layout === "P" && <Cascade />}
      {layout === "Q" && <Blinds />}
      {layout === "R" && <Gallery />}
      {layout === "S" && <SpiralLayout />}
      {layout === "T" && <Flip />}
      {layout === "U" && <Dial />}
      {layout === "V" && <Columns />}
      {layout === "W" && <Reveal />}
      {layout === "X" && <Pendulum />}
      {layout === "Y" && <Telescope />}
      {layout === "Z" && <TextIndex />}
      {layout === "AA" && <Diorama />}

      {/* Layout label */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <span className="text-[11px] tracking-widest uppercase text-neutral-300">
          {layoutLabels[layout]}
        </span>
      </div>
    </main>
  );
}
