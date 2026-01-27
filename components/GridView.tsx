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
    <div className="w-full min-h-full px-4 sm:px-6 py-6 bg-white">
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
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

          return (
            <CardWrapper
              key={humanoid.id}
              {...(cardProps as any)}
              className="relative group cursor-pointer animate-fade-in-up flex flex-col"
              onMouseEnter={() => onHoverChange(humanoid)}
              onMouseLeave={() => onHoverChange(null)}
              style={{
                animationDelay: `${index * 20}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <div
                className={`relative overflow-hidden rounded-xl bg-neutral-50 transition-colors duration-300 aspect-[3/4] ${
                  isSelected ? "ring-2 ring-neutral-900" : ""
                } hover:bg-neutral-100`}
              >
                {/* Compare mode selection indicator */}
                {compareMode && (
                  <div
                    className={`absolute top-3 right-3 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
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
                  className="w-full h-full object-contain p-6"
                />

                {/* Top info - appears on hover */}
                <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                  <span className="px-2 py-0.5 bg-white rounded-full font-mono text-[13px] font-medium text-neutral-500">
                    {humanoid.cost || "N/A"}
                  </span>
                  {humanoid.purchaseUrl && (
                    <span className="px-3 py-0.5 bg-neutral-700 rounded-full font-mono text-[13px] font-medium text-white">
                      Buy
                    </span>
                  )}
                </div>

                {/* Bottom info - appears on hover */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                  <div className="flex gap-3 px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded-full">
                    {humanoid.height && (
                      <span className="font-mono text-[13px] font-medium text-neutral-500">
                        {humanoid.height}cm
                      </span>
                    )}
                    {humanoid.weight && (
                      <span className="font-mono text-[13px] font-medium text-neutral-500">
                        {humanoid.weight}kg
                      </span>
                    )}
                    {humanoid.maxSpeed && (
                      <span className="font-mono text-[13px] font-medium text-neutral-500">
                        {humanoid.maxSpeed}m/s
                      </span>
                    )}
                    {!humanoid.height && !humanoid.weight && !humanoid.maxSpeed && (
                      <span className="font-mono text-[13px] font-medium text-neutral-500">No specs</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="mt-2 mb-4 text-center px-1">
                <div className="text-sm font-medium text-neutral-800 truncate">
                  {humanoid.name}
                </div>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  {humanoid.manufacturer}
                </div>
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}
