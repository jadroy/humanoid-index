"use client";

import { useState } from "react";
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
  onHoverChange,
}: GridViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="w-full min-h-full pt-8">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${layoutConfig.gridColumns}, 1fr)`,
          rowGap: '40px',
        }}
      >
        {humanoids.map((humanoid, index) => {
          const isHovered = hoveredId === humanoid.id;
          const stats = [
            humanoid.year && { label: 'year', value: humanoid.year },
            humanoid.height && { label: 'ht', value: `${humanoid.height}cm` },
            humanoid.weight && { label: 'wt', value: `${humanoid.weight}kg` },
            humanoid.dof && { label: 'dof', value: humanoid.dof },
          ].filter(Boolean) as { label: string; value: string | number }[];

          return (
            <Link
              key={humanoid.id}
              href={`/robot/${humanoid.id}`}
              className="relative cursor-pointer flex flex-col items-center group"
              style={{
                opacity: 0,
                animation: `grid-item-in 400ms cubic-bezier(0.22, 1, 0.36, 1) ${60 + index * 30}ms forwards`,
              }}
              onMouseEnter={() => { setHoveredId(humanoid.id); onHoverChange(humanoid); }}
              onMouseLeave={() => { setHoveredId(null); onHoverChange(null); }}
            >
              {/* Targeting corners — slide in from edges */}
              <div className="absolute inset-2 z-10 pointer-events-none">
                {[
                  { pos: 'top-0 left-0', border: 'border-l border-t', tx: '-6px', ty: '-6px' },
                  { pos: 'top-0 right-0', border: 'border-r border-t', tx: '6px', ty: '-6px' },
                  { pos: 'bottom-0 left-0', border: 'border-l border-b', tx: '-6px', ty: '6px' },
                  { pos: 'bottom-0 right-0', border: 'border-r border-b', tx: '6px', ty: '6px' },
                ].map((c, i) => (
                  <div
                    key={i}
                    className={`absolute ${c.pos} w-3 h-3 ${c.border} border-neutral-300`}
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? 'translate(0, 0)' : `translate(${c.tx}, ${c.ty})`,
                      transition: isHovered
                        ? `opacity 60ms ease-out ${i * 20}ms, transform 100ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 20}ms`
                        : `opacity 120ms cubic-bezier(0.4, 0, 0.2, 1) ${(3 - i) * 15}ms, transform 160ms cubic-bezier(0.4, 0, 0.2, 1) ${(3 - i) * 15}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="aspect-square w-full flex items-center justify-center overflow-hidden relative">
                <img
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  draggable={false}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    padding: '6px',
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                    transition: isHovered
                      ? 'transform 80ms cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />

                {/* Stats sidebar — slide in from right */}
                {stats.length > 0 && (
                  <div
                    className="absolute right-[-4px] top-[10%] font-mono text-[9px] leading-[1.6] pointer-events-none flex flex-col"
                    style={{ transformOrigin: 'left center' }}
                  >
                    {stats.map((s, i) => (
                      <span
                        key={s.label}
                        style={{
                          opacity: isHovered ? 1 : 0,
                          transform: isHovered ? 'translateX(0)' : 'translateX(8px)',
                          transition: isHovered
                            ? `opacity 50ms ease-out ${40 + i * 30}ms, transform 80ms cubic-bezier(0.16, 1, 0.3, 1) ${40 + i * 30}ms`
                            : `opacity 100ms cubic-bezier(0.4, 0, 0.2, 1) ${(stats.length - 1 - i) * 20}ms, transform 140ms cubic-bezier(0.4, 0, 0.2, 1) ${(stats.length - 1 - i) * 20}ms`,
                        }}
                      >
                        <span className="text-[#bbb]">{s.label}</span>{' '}
                        <span className="text-[#888]">{s.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center font-mono pt-3 pb-2 leading-[1.15]">
                <div className="text-[13px] text-[#999] truncate">{humanoid.manufacturer}</div>
                <div className="text-[13px] text-black truncate">{humanoid.name}</div>
                {humanoid.purchaseUrl && (
                  <a
                    href={humanoid.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block font-mono text-[10px] font-medium px-3 py-[2px] mt-1 rounded-sm uppercase tracking-wider bg-black/5 hover:bg-black/10 text-black border border-black/15"
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transform: isHovered ? 'translateY(0)' : 'translateY(6px)',
                      transition: isHovered
                        ? 'opacity 50ms ease-out 80ms, transform 100ms cubic-bezier(0.16, 1, 0.3, 1) 80ms, background-color 80ms ease'
                        : 'opacity 120ms cubic-bezier(0.4, 0, 0.2, 1), transform 160ms cubic-bezier(0.4, 0, 0.2, 1), background-color 80ms ease',
                    }}
                  >
                    Buy
                  </a>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
