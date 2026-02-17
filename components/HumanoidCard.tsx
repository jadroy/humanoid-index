"use client";

import { useRef } from "react";
import type { Humanoid } from "@/data/humanoids";
import type { ViewConfig } from "./Sidebar";

interface HumanoidCardProps {
  humanoid: Humanoid;
  config: ViewConfig;
  scale?: number;
  overlay?: number;
  bottomFade?: number;
  compareMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  isActive?: boolean;
  onInfoChange?: (open: boolean) => void;
  onClick?: () => void;
  effectClass?: string;
  isEnlarged?: boolean;
}

export default function HumanoidCard({
  humanoid,
  onClick,
  effectClass,
  isEnlarged,
}: HumanoidCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = isEnlarged && !!humanoid.videoUrl;

  return (
    <div className="relative w-full h-full">
      <button
        onClick={onClick}
        className="block w-full h-full cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-neutral-400 focus-visible:outline-offset-4"
      >
        <div className={`w-full h-full flex items-center justify-center ${effectClass || ''}`}>
          <img
            src={humanoid.imageUrl || "/robots/placeholder.png"}
            alt={humanoid.name}
            draggable="false"
            className="h-full object-contain"
            style={{ opacity: showVideo ? 0 : 1 }}
          />
          {showVideo && (
            <video
              ref={videoRef}
              src={humanoid.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
              style={{ transform: `scale(${humanoid.videoScale || 1})` }}
            />
          )}
        </div>
      </button>
    </div>
  );
}
