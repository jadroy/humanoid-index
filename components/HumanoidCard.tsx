"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { Humanoid } from "@/data/humanoids";

interface HumanoidCardProps {
  humanoid: Humanoid;
  large?: boolean;
}

export default function HumanoidCard({ humanoid, large = false }: HumanoidCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Combine cover image with media array
  const allMedia = [
    { type: 'image' as const, url: humanoid.imageUrl || "/robots/placeholder.png" },
    ...(humanoid.media || [])
  ];

  const hasMultipleMedia = allMedia.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
  };

  // Add keyboard event listener when hovered
  useEffect(() => {
    if (!isHovered || !hasMultipleMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, hasMultipleMedia, allMedia.length]);

  const currentMedia = allMedia[currentIndex];

  return (
    <Link 
      href={`/robot/${humanoid.id}`} 
      className="flex flex-col group"
    >
      {/* Card with robot image */}
      <div 
        className={`relative rounded-xl overflow-hidden bg-neutral-50 hover:bg-neutral-100 transition-all duration-300 ${
          large 
            ? 'aspect-[3/4] hover:scale-[1.02]' 
            : 'aspect-[3/4]'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* "New" badge in top left corner */}
        {humanoid.id === '1' && (
          <div className={`absolute z-20 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-md ${
            large ? 'top-4 left-4' : 'top-2 left-2'
          }`}>
            <span className={`font-medium leading-tight ${large ? 'text-xs' : 'text-[10px]'}`} style={{ color: '#625D5D' }}>
              New
            </span>
          </div>
        )}

        {/* Dots indicator in top right corner - only visible on hover */}
        {hasMultipleMedia && isHovered && (
          <div className={`absolute flex gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity ${
            large ? 'top-5 right-5' : 'top-3 right-3'
          }`}>
            {allMedia.map((_, index) => (
              <div
                key={index}
                className={`rounded-full transition-all ${
                  large 
                    ? index === currentIndex ? 'bg-neutral-400 w-5 h-2' : 'bg-neutral-300 w-2 h-2'
                    : index === currentIndex ? 'bg-neutral-400 w-3 h-1.5' : 'bg-neutral-300 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        )}

        <div className={`absolute inset-0 flex items-center justify-center ${
          currentIndex === 0 ? (large ? 'p-12' : 'p-6') : 'p-0'
        }`}>
          {currentMedia.type === 'image' ? (
            <img
              src={currentMedia.url}
              alt={humanoid.name}
              draggable="false"
              className={`w-full h-full ${currentIndex === 0 ? 'object-contain' : 'object-cover'} transition-transform duration-300`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
              Video (click to view)
            </div>
          )}
        </div>

        {/* Navigation Arrows - show on hover */}
        {hasMultipleMedia && isHovered && (
          <>
            {/* Left Arrow - only show if not on first image */}
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToPrevious();
                }}
                className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10 ${
                  large ? 'left-5 w-12 h-12' : 'left-3 w-10 h-10'
                }`}
                aria-label="Previous image"
              >
                <svg width={large ? "24" : "20"} height={large ? "24" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Right Arrow - only show if not on last image */}
            {currentIndex < allMedia.length - 1 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToNext();
                }}
                className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10 ${
                  large ? 'right-5 w-12 h-12' : 'right-3 w-10 h-10'
                }`}
                aria-label="Next image"
              >
                <svg width={large ? "24" : "20"} height={large ? "24" : "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Text labels BELOW the card */}
      <div className={`flex items-center gap-3 ${large ? 'mt-6' : 'mt-2'}`}>
        {/* Grey tile for company logo */}
        <div className={`rounded-lg bg-neutral-100 flex-shrink-0 ${large ? 'w-14 h-14' : 'w-10 h-10'}`} />
        
        {/* Text column */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`truncate font-medium ${large ? 'text-lg' : 'text-[12px]'}`} style={{ color: '#625D5D' }}>
            {humanoid.name}
          </span>
          <span className={`truncate ${large ? 'text-base' : 'text-[12px]'}`} style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
            {humanoid.manufacturer}
          </span>
        </div>
      </div>
    </Link>
  );
}
