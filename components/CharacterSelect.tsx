"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Humanoid } from "@/data/humanoids";

const MAX_COMPARE = 4;

interface CharacterSelectProps {
  humanoids: Humanoid[];
}

export default function CharacterSelect({ humanoids }: CharacterSelectProps) {
  const roster = humanoids.filter((h) => h.id !== "__intro__");

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const rosterRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = hoveredIndex ?? selectedIndex;
  const active = roster[activeIndex];
  const isComparing = compareIds.length >= 2;

  const displayedHumanoids = isComparing
    ? compareIds.map((id) => roster.find((h) => h.id === id)).filter(Boolean) as Humanoid[]
    : [];

  // Add/remove from compare set
  const togglePin = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_COMPARE) return prev;
      // If pinning the first extra, auto-include the currently selected item
      if (prev.length === 0) {
        const selectedId = roster[selectedIndex]?.id;
        if (selectedId && selectedId !== id) return [selectedId, id];
        return [id];
      }
      return [...prev, id];
    });
  }, [roster, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape" && compareIds.length > 0) {
        e.preventDefault();
        setCompareIds([]);
        return;
      }

      let newIndex = selectedIndex;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(roster.length - 1, selectedIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = roster.length - 1;
          break;
        default:
          return;
      }
      if (newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);
        setHoveredIndex(null);
      }
    },
    [selectedIndex, roster.length, compareIds.length]
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

  const statBars = active ? getStatBars(active) : [];

  const specGrid = active ? [
    active.year && { label: "Year", value: active.year },
    active.cost && { label: "Cost", value: active.cost },
    active.status && { label: "Status", value: active.status },
    active.manufacturer && { label: "Mfr", value: active.manufacturer },
  ].filter(Boolean) as { label: string; value: string | number }[] : [];

  return (
    <div className="w-full h-full flex overflow-hidden select-none bg-white">
      {/* ═══ LEFT: Scrollable roster ═══ */}
      <div
        ref={rosterRef}
        className="flex-shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide w-[140px] sm:w-[200px]"
        style={{
          borderRight: "1px solid #e5e5e5",
        }}
      >
        {roster.map((humanoid, index) => {
          const isSelected = index === selectedIndex;
          const isHovered = index === hoveredIndex;
          const isActive = index === activeIndex;
          const isPinned = compareIds.includes(humanoid.id);

          return (
            <button
              key={humanoid.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              onClick={() => { setSelectedIndex(index); setHoveredIndex(null); }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 font-mono group/item"
              style={{
                background: isSelected ? "#f5f5f5" : isHovered ? "#fafafa" : "transparent",
                borderBottom: "1px solid #f0f0f0",
                opacity: 0,
                animation: `select-slide-in 300ms cubic-bezier(0.22, 1, 0.36, 1) ${30 + index * 20}ms forwards`,
              }}
            >
              {/* Pulsing corner brackets on selected */}
              {isSelected && !isComparing && (
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
              <div className="w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] flex-shrink-0 flex items-center justify-center">
                <img
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  draggable={false}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    opacity: isActive || isPinned ? 1 : 0.35,
                    transition: "opacity 0.12s ease",
                  }}
                />
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10px] tracking-[0.06em] uppercase truncate"
                  style={{ color: isActive || isPinned ? "#000" : "#999" }}
                >
                  {humanoid.name}
                </div>
                <div className="hidden sm:block text-[8px] tracking-[0.08em] uppercase truncate text-[#bbb]">
                  {humanoid.manufacturer}
                </div>
              </div>

              {/* Pin / add-to-compare button */}
              {isPinned ? (
                <div
                  role="button"
                  onClick={(e) => { e.stopPropagation(); togglePin(humanoid.id); }}
                  className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-[4px] transition-colors duration-100 hover:bg-black/10"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="0.5" y="0.5" width="11" height="11" rx="2" fill="#000" stroke="#000" strokeWidth="1" />
                    <path d="M3 6L5.5 8.5L9 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : isSelected ? (
                <div className="w-1 h-1 rounded-full bg-black flex-shrink-0" />
              ) : (
                <div
                  role="button"
                  onClick={(e) => { e.stopPropagation(); togglePin(humanoid.id); }}
                  className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-[4px] opacity-0 group-hover/item:opacity-100 transition-all duration-100 hover:bg-black/10"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 2V8M2 5H8" stroke="#999" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ RIGHT: Preview panel ═══ */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 min-h-0">
        {!isComparing && active ? (
          /* ── Single humanoid preview ── */
          <div
            key={active.id}
            className="flex flex-col items-center w-full max-w-[480px] my-auto"
            style={{ animation: "select-preview-in 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
          >
            <div className="relative w-full flex items-center justify-center h-[200px] sm:h-[320px]">
              <img
                src={active.imageUrl || "/robots/placeholder.png"}
                alt={active.name}
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
                {active.name}
              </div>
              <div className="text-[14px] leading-none tracking-tight text-[#999] mt-1">
                {active.manufacturer}
              </div>
            </div>

            {statBars.length > 0 && (
              <div className="w-full flex flex-col gap-[6px] mt-5" style={{ textTransform: "none" }}>
                {statBars.map((stat, i) => {
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

            {specGrid.length > 0 && (
              <div
                className="w-full grid grid-cols-2 gap-x-6 gap-y-2 mt-5 font-mono text-[11px]"
                style={{ textTransform: "none" }}
              >
                {specGrid.map((spec) => (
                  <div key={spec.label} className="flex justify-between">
                    <span className="text-[#999] uppercase">{spec.label}</span>
                    <span className="text-[#444]">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            {active.description && (
              <p
                className="w-full font-mono text-[11px] leading-relaxed text-[#777] mt-4"
                style={{ textTransform: "none" }}
              >
                {active.description}
              </p>
            )}

            {active.purchaseUrl && (
              <a
                href={active.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] font-medium px-4 py-1 mt-4 rounded-sm transition-colors duration-150 uppercase tracking-wider text-center bg-black/5 hover:bg-black/10 text-black border border-black/15"
              >
                Buy
              </a>
            )}
          </div>
        ) : isComparing ? (
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
        ) : null}
      </div>
    </div>
  );
}
