"use client";

import { useState, useEffect, useCallback } from "react";
import type { Humanoid } from "@/data/humanoids";

interface SmashPickerProps {
  humanoids: Humanoid[];
}

export default function SmashPicker({ humanoids }: SmashPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [announceText, setAnnounceText] = useState("");
  const [shakeCard, setShakeCard] = useState(false);

  // Wide grid like Smash — fill the width, ~9 columns
  const columns = 9;
  const selected = humanoids[selectedIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (confirmed) {
        if (e.key === "Escape") {
          setConfirmed(false);
          setAnnounceText("");
        }
        return;
      }

      let newIndex = selectedIndex;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newIndex = Math.min(humanoids.length - 1, selectedIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - columns);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(humanoids.length - 1, selectedIndex + columns);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          confirmSelection();
          return;
      }

      if (newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);
      }
    },
    [selectedIndex, confirmed, columns, humanoids.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const confirmSelection = () => {
    setFlashActive(true);
    setShakeCard(true);
    setTimeout(() => setFlashActive(false), 300);
    setTimeout(() => setShakeCard(false), 500);
    setTimeout(() => {
      setConfirmed(true);
      setAnnounceText(selected.name.toUpperCase());
    }, 350);
  };

  const getStats = (h: Humanoid) => [
    { label: "PWR", value: Math.min(100, ((h.weight || 50) / 95) * 100) },
    { label: "SPD", value: Math.min(100, ((h.maxSpeed || 1.5) / 4) * 100) },
    { label: "TEC", value: Math.min(100, ((h.dof || 20) / 63) * 100) },
    { label: "SIZ", value: Math.min(100, ((h.height || 160) / 186) * 100) },
  ];

  const emptySlots = (columns - (humanoids.length % columns)) % columns;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden select-none bg-white">
      {/* Screen flash on confirm */}
      {flashActive && (
        <div
          className="absolute inset-0 z-50 pointer-events-none bg-black"
          style={{ animation: "smash-flash 300ms ease-out forwards" }}
        />
      )}

      {/* ══════════════════════════════════════
          ROSTER GRID — hero element, like Smash
          ══════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-6 pt-2 pb-2 min-h-0">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            border: "1px solid #e5e5e5",
            gap: 0,
            width: "100%",
            maxWidth: `${columns * 90}px`,
          }}
        >
          {humanoids.map((humanoid, index) => {
            const isSelected = index === selectedIndex;
            const isConfirmed = confirmed && isSelected;

            return (
              <button
                key={humanoid.id}
                onClick={() => {
                  if (confirmed) {
                    setConfirmed(false);
                    setAnnounceText("");
                  }
                  if (index === selectedIndex && !confirmed) {
                    confirmSelection();
                  } else {
                    setSelectedIndex(index);
                  }
                }}
                onMouseEnter={() => {
                  if (!confirmed) setSelectedIndex(index);
                }}
                className="relative aspect-square flex items-center justify-center overflow-hidden transition-all duration-100"
                style={{
                  background: isConfirmed ? "#f5f5f5" : isSelected ? "#fafafa" : "#fff",
                  outline: isConfirmed
                    ? "2px solid #000"
                    : isSelected
                    ? "1.5px solid #000"
                    : "none",
                  outlineOffset: isConfirmed ? "-2px" : "-1.5px",
                  borderRight: "1px solid #e5e5e5",
                  borderBottom: "1px solid #e5e5e5",
                  zIndex: isSelected ? 2 : 1,
                }}
              >
                <img
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  draggable={false}
                  className="w-full h-full object-contain p-2"
                  style={{
                    opacity: isSelected ? 1 : 0.3,
                    transition: "opacity 0.12s ease",
                  }}
                />

                {/* Name label */}
                {isSelected && !isConfirmed && (
                  <div
                    className="absolute bottom-0 left-0 right-0 font-mono text-[7px] tracking-[0.08em] uppercase text-center py-0.5 truncate px-1 text-[#999]"
                    style={{ background: "linear-gradient(transparent, rgba(255,255,255,0.95))" }}
                  >
                    {humanoid.name}
                  </div>
                )}

                {/* P1 token on confirmed */}
                {isConfirmed && (
                  <div className="absolute top-1 right-1.5 font-mono text-[7px] tracking-[0.1em] text-[#999]">
                    P1
                  </div>
                )}

                {/* Pulsing selection corners */}
                {isSelected && !isConfirmed && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ animation: "smash-cursor-pulse 0.8s ease-in-out infinite" }}
                  >
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-l border-t border-black" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-r border-t border-black" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-l border-b border-black" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-r border-b border-black" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square"
              style={{
                background: "#fafafa",
                borderRight: "1px solid #e5e5e5",
                borderBottom: "1px solid #e5e5e5",
              }}
            />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          PLAYER PANEL — bottom strip, like Smash
          ══════════════════════════════════════ */}
      <div
        className="flex-shrink-0 flex items-stretch gap-0"
        style={{ borderTop: "1px solid #e5e5e5", height: "160px" }}
      >
        {/* P1 Panel */}
        <div className="flex-1 flex items-center gap-5 px-6 relative">
          {/* Player tag */}
          <div
            className="absolute top-0 left-0 font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1 bg-black text-white"
          >
            1P
          </div>

          {/* Character render */}
          <div className="h-full w-[120px] flex-shrink-0 flex items-center justify-center py-3">
            <img
              key={selected.id}
              src={selected.imageUrl || "/robots/placeholder.png"}
              alt={selected.name}
              draggable={false}
              className="max-h-full max-w-full object-contain"
              style={{
                animation: shakeCard
                  ? "smash-shake 0.5s ease-out"
                  : confirmed
                  ? "smash-idle 2s ease-in-out infinite"
                  : "smash-bounce-in 0.2s ease-out",
              }}
            />
          </div>

          {/* Name + info */}
          <div className="flex flex-col justify-center min-w-0">
            {confirmed && announceText ? (
              <div
                key={announceText}
                className="font-mono"
                style={{ animation: "smash-name-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
              >
                <div className="text-[18px] font-medium tracking-[0.08em] uppercase text-black">
                  {announceText}
                </div>
                <div className="text-[9px] font-normal tracking-[0.2em] uppercase mt-1 text-[#999]">
                  Locked In
                </div>
              </div>
            ) : (
              <>
                <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#999]">
                  {selected.manufacturer}
                </div>
                <div className="font-mono text-[15px] font-medium tracking-[0.04em] uppercase text-black mt-0.5">
                  {selected.name}
                </div>
                <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#ccc] mt-1">
                  {selected.year || "—"} &middot; {selected.status || "—"}
                </div>
              </>
            )}
          </div>

          {/* Stat bars */}
          <div className="w-[160px] flex-shrink-0 space-y-1.5 py-1">
            {getStats(selected).map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <span className="font-mono text-[8px] tracking-[0.08em] w-6 text-right text-[#bbb]">
                  {stat.label}
                </span>
                <div className="flex-1 h-[3px] relative overflow-hidden bg-[#f0f0f0]">
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-300 ease-out bg-black"
                    style={{ width: `${stat.value}%` }}
                  />
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1"
                        style={{ borderRight: i < 9 ? "1px solid rgba(255,255,255,0.8)" : "none" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: "1px", background: "#e5e5e5" }} />

        {/* Empty P2-P4 slots */}
        {[2, 3, 4].map((p) => (
          <div
            key={p}
            className="flex-1 flex items-center justify-center relative"
            style={{ background: "#fafafa" }}
          >
            <div
              className="absolute top-0 left-0 font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1 text-[#ccc]"
              style={{ background: "#f0f0f0" }}
            >
              {p}P
            </div>
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#ccc]">
              Press Start
            </span>
          </div>
        ))}
      </div>

      {/* STATUS BAR */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-2 font-mono text-[9px] tracking-[0.1em] uppercase"
        style={{ borderTop: "1px solid #e5e5e5" }}
      >
        <span className={confirmed ? "text-black" : "text-[#999]"}>
          {confirmed ? "Ready to Fight" : "Choose a Fighter"}
        </span>
      </div>
    </div>
  );
}
