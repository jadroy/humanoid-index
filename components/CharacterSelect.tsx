"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Humanoid } from "@/data/humanoids";

const MAX_COMPARE = 4;

interface CharacterSelectProps {
  humanoids: Humanoid[];
}

export default function CharacterSelect({ humanoids }: CharacterSelectProps) {
  // Filter out non-selectable items (intro card, etc.)
  const roster = humanoids.filter((h) => h.id !== "__intro__");

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const hoveredHumanoid = hoveredIndex !== null ? roster[hoveredIndex] : null;
  const isEmpty = compareIds.length === 0;
  const isSingleView = compareIds.length <= 1;

  // In single view, hover previews the hovered item; otherwise show the selected
  const singleActive = isSingleView && !isEmpty
    ? (hoveredHumanoid ?? roster.find((h) => h.id === compareIds[0]) ?? null)
    : isSingleView && isEmpty
    ? hoveredHumanoid
    : null;

  const displayedHumanoids = !isSingleView
    ? compareIds.map((id) => roster.find((h) => h.id === id)).filter(Boolean) as Humanoid[]
    : [];

  const handleClick = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }, []);

  const resetToEmpty = useCallback(() => {
    setCompareIds([]);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape" && compareIds.length > 0) {
        e.preventDefault();
        resetToEmpty();
        return;
      }
    },
    [compareIds.length, resetToEmpty]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Stat bars helper
  const getStatBars = (h: Humanoid) => [
    h.height && { label: "height", value: `${h.height}cm`, pct: ((h.height - 100) / 100) * 100 },
    h.weight && { label: "weight", value: `${h.weight}kg`, pct: (h.weight / 100) * 100 },
    h.dof && { label: "dof", value: h.dof, pct: (h.dof / 70) * 100 },
    h.maxSpeed && { label: "speed", value: `${h.maxSpeed}m/s`, pct: (h.maxSpeed / 4.5) * 100 },
  ].filter(Boolean) as { label: string; value: string | number; pct: number }[];

  const singleStatBars = singleActive ? getStatBars(singleActive) : [];

  const singleSpecGrid = singleActive ? [
    singleActive.year && { label: "Year", value: singleActive.year },
    singleActive.cost && { label: "Cost", value: singleActive.cost },
    singleActive.status && { label: "Status", value: singleActive.status },
    singleActive.manufacturer && { label: "Mfr", value: singleActive.manufacturer },
  ].filter(Boolean) as { label: string; value: string | number }[] : [];

  return (
    <div className="w-full h-full flex overflow-hidden select-none bg-white">
      {/* ═══ LEFT: Scrollable roster ═══ */}
      <div
        ref={rosterRef}
        className="flex-shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{
          width: "200px",
          borderRight: "1px solid #e5e5e5",
        }}
      >
        {roster.map((humanoid, index) => {
          const isInCompare = compareIds.includes(humanoid.id);
          const isHovered = index === hoveredIndex;
          const isOnlySelected = isSingleView && compareIds[0] === humanoid.id;

          return (
            <button
              key={humanoid.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              onClick={() => handleClick(humanoid.id)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 font-mono"
              style={{
                background: isInCompare ? "#f0f0f0" : isHovered ? "#fafafa" : "transparent",
                borderBottom: "1px solid #f0f0f0",
                opacity: 0,
                animation: `select-slide-in 300ms cubic-bezier(0.22, 1, 0.36, 1) ${30 + index * 20}ms forwards`,
              }}
            >
              {/* Pulsing corner brackets on single selected */}
              {isOnlySelected && !isHovered && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ animation: "select-bracket-pulse 1.2s ease-in-out infinite" }}
                >
                  <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-black" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-black" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-black" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-black" />
                </div>
              )}

              {/* Portrait */}
              <div className="w-[36px] h-[36px] flex-shrink-0 flex items-center justify-center">
                <img
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  draggable={false}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    opacity: isInCompare || isHovered ? 1 : 0.35,
                    transition: "opacity 0.12s ease",
                  }}
                />
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10px] tracking-[0.06em] uppercase truncate"
                  style={{ color: isInCompare || isHovered ? "#000" : "#999" }}
                >
                  {humanoid.name}
                </div>
                <div className="text-[8px] tracking-[0.08em] uppercase truncate text-[#bbb]">
                  {humanoid.manufacturer}
                </div>
              </div>

              {/* Indicator */}
              {isInCompare ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <rect x="0.5" y="0.5" width="11" height="11" rx="2" fill="#000" stroke="#000" strokeWidth="1" />
                  <path d="M3 6L5.5 8.5L9 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div
                  className="w-3 h-3 rounded-[3px] border flex-shrink-0 transition-colors duration-100"
                  style={{ borderColor: isHovered ? "#999" : "#ddd" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ RIGHT: Preview panel ═══ */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 py-6 min-h-0">
        {isEmpty && !singleActive ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center my-auto font-mono text-center">
            <div className="text-[11px] text-[#ccc] tracking-wider uppercase">
              Select humanoids to compare
            </div>
          </div>
        ) : isSingleView && singleActive ? (
          /* ── Single humanoid preview ── */
          <div
            key={singleActive.id}
            className="flex flex-col items-center w-full max-w-[480px] my-auto"
            style={{ animation: "select-preview-in 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
          >
            <div className="relative w-full flex items-center justify-center" style={{ height: "320px" }}>
              <img
                src={singleActive.imageUrl || "/robots/placeholder.png"}
                alt={singleActive.name}
                draggable={false}
                className="max-h-full max-w-full object-contain"
              />
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
                style={{
                  width: "60%",
                  height: "12px",
                  background: "radial-gradient(ellipse, rgba(0,0,0,0.10) 0%, transparent 70%)",
                }}
              />
            </div>

            <div className="w-full mt-4 font-mono text-center">
              <div className="text-[24px] leading-none tracking-tight text-black">
                {singleActive.name}
              </div>
              <div className="text-[14px] leading-none tracking-tight text-[#999] mt-1">
                {singleActive.manufacturer}
              </div>
            </div>

            {singleStatBars.length > 0 && (
              <div className="w-full flex flex-col gap-[6px] mt-5" style={{ textTransform: "none" }}>
                {singleStatBars.map((stat, i) => {
                  const clampedPct = Math.max(4, Math.min(100, stat.pct));
                  return (
                    <div key={stat.label} className="animate-stat-cascade" style={{ animationDelay: `${80 + i * 60}ms` }}>
                      <div className="flex justify-between items-baseline text-[13px] leading-none mb-[3px] font-mono">
                        <span style={{ color: "#777" }}>{stat.label}</span>
                        <span className="text-[15px]" style={{ color: "#222" }}>{stat.value}</span>
                      </div>
                      <div className="relative h-[3px] w-full rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.08)" }}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-full animate-bar-fill"
                          style={{
                            width: `${clampedPct}%`,
                            backgroundColor: "rgba(0,0,0,0.35)",
                            animationDelay: `${120 + i * 60}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {singleSpecGrid.length > 0 && (
              <div
                className="w-full grid grid-cols-2 gap-x-6 gap-y-2 mt-5 font-mono text-[11px]"
                style={{ textTransform: "none" }}
              >
                {singleSpecGrid.map((spec) => (
                  <div key={spec.label} className="flex justify-between">
                    <span className="text-[#999] uppercase">{spec.label}</span>
                    <span className="text-[#444]">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {singleActive.description && (
              <p
                className="w-full font-mono text-[11px] leading-relaxed text-[#777] mt-4"
                style={{ textTransform: "none" }}
              >
                {singleActive.description}
              </p>
            )}

            {singleActive.purchaseUrl && (
              <a
                href={singleActive.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] font-medium px-4 py-1 mt-4 rounded-sm transition-colors duration-150 uppercase tracking-wider text-center bg-black/5 hover:bg-black/10 text-black border border-black/15"
              >
                Buy
              </a>
            )}

            {/* Hint to add more */}
            <div className="font-mono text-[10px] text-[#ccc] mt-6 tracking-wider uppercase">
              Select others to compare
            </div>
          </div>
        ) : (
          /* ── Side by side ── */
          <div
            className="grid gap-6 w-full my-auto"
            style={{ gridTemplateColumns: `repeat(${displayedHumanoids.length}, 1fr)` }}
          >
            {displayedHumanoids.map((h, i) => {
              const stats = getStatBars(h);

              return (
                <div
                  key={h.id}
                  className="flex flex-col items-center font-mono"
                  style={{
                    opacity: 0,
                    animation: `select-compare-in 350ms cubic-bezier(0.22, 1, 0.36, 1) ${60 + i * 80}ms forwards`,
                  }}
                >
                  <div className="relative w-full flex items-center justify-center" style={{ height: "200px" }}>
                    <img
                      src={h.imageUrl || "/robots/placeholder.png"}
                      alt={h.name}
                      draggable={false}
                      className="max-h-full max-w-full object-contain"
                    />
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
                      style={{
                        width: "60%",
                        height: "8px",
                        background: "radial-gradient(ellipse, rgba(0,0,0,0.08) 0%, transparent 70%)",
                      }}
                    />
                  </div>

                  <div className="text-[16px] leading-none tracking-tight text-black mt-3 text-center">
                    {h.name}
                  </div>
                  <div className="text-[11px] leading-none tracking-tight text-[#999] mt-1 text-center">
                    {h.manufacturer}
                  </div>

                  {stats.length > 0 && (
                    <div className="w-full flex flex-col gap-[6px] mt-4 px-1" style={{ textTransform: "none" }}>
                      {stats.map((stat, si) => {
                        const clampedPct = Math.max(4, Math.min(100, stat.pct));
                        return (
                          <div key={stat.label} className="animate-stat-cascade" style={{ animationDelay: `${120 + i * 80 + si * 50}ms` }}>
                            <div className="flex justify-between items-baseline text-[11px] leading-none mb-[2px]">
                              <span style={{ color: "#999" }}>{stat.label}</span>
                              <span className="text-[12px]" style={{ color: "#444" }}>{stat.value}</span>
                            </div>
                            <div className="relative h-[3px] w-full rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.08)" }}>
                              <div
                                className="absolute inset-y-0 left-0 rounded-full animate-bar-fill"
                                style={{
                                  width: `${clampedPct}%`,
                                  backgroundColor: "rgba(0,0,0,0.30)",
                                  animationDelay: `${160 + i * 80 + si * 50}ms`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
