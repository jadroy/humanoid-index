"use client";

import Link from "next/link";
import { useState } from "react";
import type { Humanoid } from "@/data/humanoids";
import type { ViewConfig } from "./Sidebar";

interface HumanoidCardProps {
  humanoid: Humanoid;
  config: ViewConfig;
  compareMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function HumanoidCard({
  humanoid,
  config,
  compareMode = false,
  isSelected = false,
  onToggleSelect
}: HumanoidCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get alternative image from media if available
  const alternativeImage = humanoid.media && humanoid.media.length > 1
    ? humanoid.media[1].url
    : null;

  // Only apply hover image effect for Unitree G1
  const displayImage = isHovered && alternativeImage && humanoid.id === "11"
    ? alternativeImage
    : humanoid.imageUrl || "/robots/placeholder.png";

  const hasSpecs = humanoid.height || humanoid.weight || humanoid.maxSpeed;

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
    <CardWrapper {...cardProps as any}>
      <div
        className={`relative w-full h-full overflow-hidden bg-neutral-50 hover:bg-neutral-100 ${
          isSelected ? 'ring-2 ring-neutral-900' : ''
        }`}
        style={{ borderRadius: config.cardRadius }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

        {/* Price - top center, swoops in */}
        {!compareMode && humanoid.cost && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out bg-white/80 backdrop-blur-md text-neutral-600 px-2 py-0.5 text-[13px] font-medium shadow-sm whitespace-nowrap"
            style={{ borderRadius: config.badgeRadius }}
          >
            {humanoid.cost}
          </div>
        )}

        {/* Quick specs - bottom center, fades up */}
        {!compareMode && hasSpecs && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out bg-white/80 backdrop-blur-md text-neutral-500 px-2.5 py-1 text-[13px] shadow-sm flex items-center gap-3"
            style={{ borderRadius: config.badgeRadius }}
          >
            {humanoid.height && <span><span className="text-neutral-400">{humanoid.height}</span>cm</span>}
            {humanoid.weight && <span><span className="text-neutral-400">{humanoid.weight}</span>kg</span>}
            {humanoid.maxSpeed && <span><span className="text-neutral-400">{humanoid.maxSpeed}</span>m/s</span>}
          </div>
        )}

        {/* Buy button - top right, swoops down from top */}
        {!compareMode && humanoid.purchaseUrl && (
          <a
            href={humanoid.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 z-10 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out bg-neutral-700 hover:bg-neutral-900 text-white px-2 py-0.5 text-[13px] font-medium rounded-full whitespace-nowrap"
          >
            Buy
          </a>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ padding: config.cardPadding }}
        >
          <img
            src={displayImage}
            alt={humanoid.name}
            draggable="false"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </CardWrapper>
  );
}
