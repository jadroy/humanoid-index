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
  onHoverChange,
}: GridViewProps) {
  return (
    <div className="w-full min-h-full pt-8">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${layoutConfig.gridColumns}, 1fr)`,
          rowGap: '40px',
        }}
      >
        {humanoids.map((humanoid) => (
          <Link
            key={humanoid.id}
            href={`/robot/${humanoid.id}`}
            className="relative cursor-pointer flex flex-col items-center"
            onMouseEnter={() => onHoverChange(humanoid)}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="aspect-square w-full flex items-center justify-center overflow-hidden">
              <img
                src={humanoid.imageUrl || "/robots/placeholder.png"}
                alt={humanoid.name}
                draggable={false}
                className="max-w-full max-h-full object-contain"
                style={{ padding: '6px' }}
              />
            </div>
            <div className="text-center font-mono pt-1 pb-2">
              <div className="text-[11px] text-[#999] truncate">{humanoid.manufacturer}</div>
              <div className="text-[11px] text-black truncate">{humanoid.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
