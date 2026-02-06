"use client";

import Link from "next/link";
import type { Humanoid } from "@/data/humanoids";
import type { LayoutConfig } from "./BottomBar";

interface GridViewProps {
  humanoids: Humanoid[];
  layoutConfig: LayoutConfig;
  compareMode: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onHoverChange: (humanoid: Humanoid | null) => void;
}

export default function GridView({
  humanoids,
  layoutConfig,
  compareMode,
  selectedIds,
  onToggleSelect,
  onHoverChange,
}: GridViewProps) {
  return (
    <div className="w-full min-h-full bg-white">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${layoutConfig.gridColumns}, 1fr)`,
        }}
      >
        {humanoids.map((humanoid, index) => {
          const isSelected = selectedIds.includes(humanoid.id);

          const handleClick = (e: React.MouseEvent) => {
            if (compareMode) {
              e.preventDefault();
              onToggleSelect(humanoid.id);
            }
          };

          const CardWrapper = compareMode ? "div" : Link;
          const cardProps = compareMode
            ? { onClick: handleClick }
            : { href: `/robot/${humanoid.id}` };

          const borderOpacity = layoutConfig.gridBorderOpacity / 100;

          return (
            <CardWrapper
              key={humanoid.id}
              {...(cardProps as any)}
              className={`relative group cursor-pointer flex flex-col items-center justify-center aspect-square ${
                isSelected ? "bg-neutral-100" : ""
              }`}
              style={{
                borderRight: `1px solid rgba(0,0,0,${borderOpacity * 0.1})`,
                borderBottom: `1px solid rgba(0,0,0,${borderOpacity * 0.1})`,
              }}
              onMouseEnter={() => onHoverChange(humanoid)}
              onMouseLeave={() => onHoverChange(null)}
            >
              {/* Sci-fi corner brackets - appear on hover */}
              <div className="absolute inset-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-10">
                {/* Top left */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-neutral-300" />
                {/* Top right */}
                <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-neutral-300" />
                {/* Bottom left */}
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-neutral-300" />
                {/* Bottom right */}
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-neutral-300" />
              </div>

              {/* Compare mode selection indicator */}
              {compareMode && (
                <div
                  className={`absolute top-3 right-3 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-100 ${
                    isSelected
                      ? "bg-neutral-900 border-neutral-900"
                      : "bg-white/80 border-neutral-300"
                  }`}
                >
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </div>
              )}

              {/* Image */}
              <img
                src={humanoid.imageUrl || "/robots/placeholder.png"}
                alt={humanoid.name}
                draggable={false}
                className="w-full h-full object-contain transition-opacity duration-100"
                style={{
                  padding: `${layoutConfig.gridPadding}px`,
                  opacity: 1,
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = String(layoutConfig.gridHoverOpacity / 100)}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              />

              {/* Label - shows on hover */}
              {layoutConfig.gridShowLabels && (
                <div className="absolute bottom-3 text-center text-[11px] text-neutral-400 truncate px-2 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                  {humanoid.name}
                </div>
              )}
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}
