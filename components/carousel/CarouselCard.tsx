import React from "react";
import Image from "next/image";
import type { Humanoid } from "@/data/humanoids";
import { CARD_W } from "./carouselMath";

const cardRadius = 6;

function PlaceholderMark() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.045 }}>
        <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
        <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
      </svg>
    </div>
  );
}

function CarouselCard({ humanoid: h, isNew, width = CARD_W, allCaps }: { humanoid: Humanoid; isNew: boolean; width?: number; allCaps?: boolean }) {
  return (
    <div className="group flex flex-col gap-1.5 cursor-pointer" style={{ width }}>
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ borderRadius: cardRadius, background: "#FAFAFA" }}>
        {isNew && (
          <div className="absolute top-2 left-2 z-10 px-1.5 py-0 rounded-full text-[12px] font-semibold" style={{ background: "#8e8e93", color: "#ffffff" }}>
            New
          </div>
        )}
        {h.description && (
          <div className="absolute top-2 right-2 z-10 group/info">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div className="absolute top-5 right-0 w-44 px-2.5 py-1.5 rounded-md opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity duration-150" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <p className="text-[12px] leading-relaxed" style={{ color: "#999" }}>{h.description}</p>
            </div>
          </div>
        )}
        {h.status === "Anticipated" ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[12px] tracking-[0.2em] uppercase" style={{ color: "#a3a3a3" }}>Coming Soon</span>
          </div>
        ) : h.imageUrl ? (
          <Image
            src={h.imageUrl}
            alt={h.name}
            fill
            className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
            style={h.imagePosition ? { objectPosition: h.imagePosition, padding: h.imageFit === "cover" ? 0 : 14 } : { padding: 14 }}
            sizes={`${width}px`}
          />
        ) : (
          <PlaceholderMark />
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 px-0.5">
        <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: 3, background: h.logoUrl ? "transparent" : "#EFEFEF" }}>
          {h.logoUrl ? (
            <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes="20px" />
          ) : (
            <svg width="9" height="9" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
              <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
              <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2, textTransform: allCaps ? "uppercase" : undefined }}>{h.name}</p>
          <p className="text-[12px] font-medium truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2, textTransform: allCaps ? "uppercase" : undefined, opacity: 0.4 }}>{h.manufacturer}</p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(CarouselCard);
