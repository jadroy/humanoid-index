"use client";

import Link from "next/link";
import { useState } from "react";
import type { Humanoid } from "@/data/humanoids";
import { humanoids as allHumanoids } from "@/data/humanoids";
import type { ViewConfig } from "./Sidebar";

interface HumanoidCardProps {
  humanoid: Humanoid;
  config: ViewConfig;
  scale?: number;
  overlay?: number; // 0 = no overlay, 1 = fully white
  bottomFade?: number; // 0 = no fade, 1 = full fade from bottom
  compareMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function HumanoidCard({
  humanoid,
  config,
  scale = 1,
  overlay = 0,
  bottomFade = 0,
  compareMode = false,
  isSelected = false,
  onToggleSelect
}: HumanoidCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const newestYear = Math.max(...allHumanoids.filter(h => h.year).map(h => h.year!));
  const isNew = humanoid.year === newestYear;

  // Get alternative image from media if available
  const alternativeImage = humanoid.media && humanoid.media.length > 1
    ? humanoid.media[1].url
    : null;

  // Only apply hover image effect for Unitree G1
  const displayImage = isHovered && alternativeImage && humanoid.id === "11"
    ? alternativeImage
    : humanoid.imageUrl || "/robots/placeholder.png";

  const handleClick = (e: React.MouseEvent) => {
    if (compareMode && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(humanoid.id);
    }
  };

  const CardWrapper = compareMode ? 'div' : Link;
  const cardProps = compareMode
    ? { onClick: handleClick, className: "block w-full h-full group cursor-pointer" }
    : { href: `/robot/${humanoid.id}`, className: "block w-full h-full group" };

  return (
    <div
      className="relative w-full h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      <CardWrapper {...cardProps as any}>
        <div
          className={`relative w-full h-full flex items-center justify-center ${
            isSelected ? 'ring-2 ring-neutral-900 rounded-lg' : ''
          }`}
        >
          {/* Compare mode selection indicator */}
          {compareMode && (
            <div className={`absolute top-2 right-2 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
              isSelected
                ? 'bg-neutral-900 border-neutral-900'
                : 'bg-white/80 border-neutral-300'
            }`}>
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </div>
          )}

          {/* New badge */}
          {isNew && !compareMode && (
            <div className="absolute top-2 left-2 z-20 px-1.5 py-0 rounded text-[11px] font-semibold" style={{ background: "#8e8e93", color: "#ffffff" }}>
              New
            </div>
          )}

          <img
            src={displayImage}
            alt={humanoid.name}
            draggable="false"
            className="h-full object-contain"
            style={{
              transform: `scale(${scale})`,
              transition: 'transform 150ms linear',
              willChange: 'transform',
            }}
          />
          {/* White overlay for non-current cards */}
          {overlay > 0 && (
            <div
              className="absolute inset-0 bg-white pointer-events-none"
              style={{
                opacity: overlay,
                transition: 'opacity 150ms linear',
              }}
            />
          )}
          {/* Bottom fade gradient for edge cards */}
          {bottomFade > 0 && (
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: '40%',
                background: 'linear-gradient(to bottom, transparent 0%, white 100%)',
                opacity: bottomFade,
                transition: 'opacity 150ms linear',
              }}
            />
          )}
        </div>
      </CardWrapper>
    </div>
  );
}
