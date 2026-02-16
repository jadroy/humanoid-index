"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Humanoid } from "@/data/humanoids";

interface CharacterSelectProps {
  humanoids: Humanoid[];
}

export default function CharacterSelect({ humanoids }: CharacterSelectProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = hoveredIndex ?? selectedIndex;
  const active = humanoids[activeIndex];

  // Auto-scroll selected item into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      let newIndex = selectedIndex;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(humanoids.length - 1, selectedIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = humanoids.length - 1;
          break;
        default:
          return;
      }
      if (newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);
        setHoveredIndex(null);
      }
    },
    [selectedIndex, humanoids.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const statBars = [
    active.height && { label: "height", value: `${active.height}cm`, pct: ((active.height - 100) / 100) * 100 },
    active.weight && { label: "weight", value: `${active.weight}kg`, pct: (active.weight / 100) * 100 },
    active.dof && { label: "dof", value: active.dof, pct: (active.dof / 70) * 100 },
    active.maxSpeed && { label: "speed", value: `${active.maxSpeed}m/s`, pct: (active.maxSpeed / 4.5) * 100 },
  ].filter(Boolean) as { label: string; value: string | number; pct: number }[];

  const specGrid = [
    active.year && { label: "Year", value: active.year },
    active.cost && { label: "Cost", value: active.cost },
    active.status && { label: "Status", value: active.status },
    active.manufacturer && { label: "Mfr", value: active.manufacturer },
  ].filter(Boolean) as { label: string; value: string | number }[];

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
        {humanoids.map((humanoid, index) => {
          const isSelected = index === selectedIndex;
          const isHovered = index === hoveredIndex;
          const isActive = index === activeIndex;

          return (
            <button
              key={humanoid.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              onClick={() => { setSelectedIndex(index); setHoveredIndex(null); }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 font-mono"
              style={{
                background: isSelected ? "#f5f5f5" : isHovered ? "#fafafa" : "transparent",
                borderBottom: "1px solid #f0f0f0",
                opacity: 0,
                animation: `select-slide-in 300ms cubic-bezier(0.22, 1, 0.36, 1) ${30 + index * 20}ms forwards`,
              }}
            >
              {/* Pulsing corner brackets on selected */}
              {isSelected && (
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
                    opacity: isActive ? 1 : 0.35,
                    transition: "opacity 0.12s ease",
                  }}
                />
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10px] tracking-[0.06em] uppercase truncate"
                  style={{ color: isActive ? "#000" : "#999" }}
                >
                  {humanoid.name}
                </div>
                <div className="text-[8px] tracking-[0.08em] uppercase truncate text-[#bbb]">
                  {humanoid.manufacturer}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="w-1 h-1 rounded-full bg-black flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ RIGHT: Large preview + spec sheet ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-8 py-6 min-h-0">
        <div
          key={active.id}
          className="flex flex-col items-center w-full max-w-[480px]"
          style={{ animation: "select-preview-in 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards" }}
        >
          {/* Large robot image */}
          <div className="relative w-full flex items-center justify-center" style={{ height: "320px" }}>
            <img
              src={active.imageUrl || "/robots/placeholder.png"}
              alt={active.name}
              draggable={false}
              className="max-h-full max-w-full object-contain"
            />
            {/* Shadow ellipse */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] pointer-events-none"
              style={{
                width: "60%",
                height: "12px",
                background: "radial-gradient(ellipse, rgba(0,0,0,0.10) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Name + manufacturer header */}
          <div className="w-full mt-4 font-mono text-center">
            <div className="text-[24px] leading-none tracking-tight text-black">
              {active.name}
            </div>
            <div className="text-[14px] leading-none tracking-tight text-[#999] mt-1">
              {active.manufacturer}
            </div>
          </div>

          {/* Stat bars */}
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

          {/* 2-col spec grid */}
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

          {/* Description */}
          {active.description && (
            <p
              className="w-full font-mono text-[11px] leading-relaxed text-[#777] mt-4"
              style={{ textTransform: "none" }}
            >
              {active.description}
            </p>
          )}

          {/* Purchase link */}
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
      </div>
    </div>
  );
}
