"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Humanoid } from "@/data/humanoids";

interface GridViewProps {
  humanoids: Humanoid[];
}

const MIN_COLS = 2;
const MAX_COLS = 8;
const HIDE_OFFSET = "-96px";
const HIDE_ACCUM = 80;
const SHOW_ACCUM = 24;

export default function GridView({ humanoids }: GridViewProps) {
  const cardRadius = 28;
  const [cols, setCols] = useState(3);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const root = document.documentElement;
    let lastY = el.scrollTop;
    let accum = 0;
    let hidden = false;
    const setHidden = (v: boolean) => {
      if (v === hidden) return;
      hidden = v;
      root.style.setProperty("--nav-hide-y", v ? HIDE_OFFSET : "0px");
      root.style.setProperty("--nav-hide-delay", v ? "260ms" : "0ms");
    };
    const onScroll = () => {
      const y = el.scrollTop;
      const dy = y - lastY;
      lastY = y;
      if (y < 40) {
        accum = 0;
        setHidden(false);
        return;
      }
      if ((dy > 0) !== (accum > 0)) accum = 0;
      accum += dy;
      if (accum > HIDE_ACCUM) setHidden(true);
      else if (accum < -SHOW_ACCUM) setHidden(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      root.style.setProperty("--nav-hide-y", "0px");
      root.style.setProperty("--nav-hide-delay", "0ms");
    };
  }, []);

  return (
    <div ref={scrollRef} className="w-full h-screen overflow-y-auto bg-white pt-24 pb-16 px-6 md:px-10 lg:px-16 scrollbar-hide">
      <div
        className="nav-slide fixed z-40 flex items-center gap-2 pointer-events-auto px-3 py-2 rounded-full"
        style={{
          top: "var(--nav-top, 4px)",
          right: "var(--arc-logo-x, 24px)",
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span className="text-[9px] tracking-[0.14em] uppercase" style={{ color: "#a3a3a3" }}>Cols</span>
        <input
          type="range"
          min={MIN_COLS}
          max={MAX_COLS}
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
          className="w-20 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
        />
        <span className="text-[10px] tabular-nums w-3 text-right" style={{ color: "var(--c-ink)" }}>{cols}</span>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {humanoids.map((h) => (
          <Link
            key={h.id}
            href={`/robot/${h.id}`}
            className="group block"
          >
            <div
              className="relative w-full overflow-hidden flex items-center justify-center"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: cardRadius,
                background: "#FAFAFA",
              }}
            >
              <img
                src={h.imageUrl || "/robots/placeholder.png"}
                alt={h.name}
                draggable={false}
                className="h-[78%] w-auto object-contain transition-transform duration-200 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div className="mt-2 flex items-center gap-2 px-0.5">
              <div
                className="flex-shrink-0 relative overflow-hidden flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: cardRadius * 0.6,
                  background: h.logoUrl ? "transparent" : "#EFEFEF",
                }}
              >
                {h.logoUrl ? (
                  <Image
                    src={h.logoUrl}
                    alt={h.manufacturer}
                    fill
                    className="object-cover"
                    sizes="22px"
                  />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                    <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                    <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13px] font-medium truncate"
                  style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}
                >
                  {h.name}
                </p>
                <p
                  className="text-[9px] uppercase font-medium truncate"
                  style={{ color: "#a3a3a3", letterSpacing: "0.06em" }}
                >
                  {h.manufacturer}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
