"use client";

import { useRef, useState, useEffect } from "react";
import type { Humanoid } from "@/data/humanoids";

interface HumanoidCardProps {
  humanoid: Humanoid;
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
  const [videoReady, setVideoReady] = useState(false);
  const showVideo = isEnlarged && !!humanoid.videoUrl;

  // Reset ready state when leaving spotlight
  useEffect(() => {
    if (!isEnlarged) setVideoReady(false);
  }, [isEnlarged]);

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
            style={{ opacity: showVideo && videoReady ? 0 : 1, transition: 'opacity 0.15s ease-out' }}
          />
          {showVideo && (
            <video
              ref={videoRef}
              src={humanoid.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              onCanPlay={() => setVideoReady(true)}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ transform: `scale(${humanoid.videoScale || 1})`, opacity: videoReady ? 1 : 0, transition: 'opacity 0.15s ease-out' }}
            />
          )}
        </div>
      </button>
    </div>
  );
}
