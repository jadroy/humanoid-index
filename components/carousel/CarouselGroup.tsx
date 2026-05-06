import type { Humanoid } from "@/data/humanoids";
import type { CarouselItemPosition } from "./carouselMath";
import { CARD_W, CARD_GAP, MAX_COLS, getGroupWidth } from "./carouselMath";
import CarouselCard from "./CarouselCard";

interface Props {
  year: number;
  entries: Humanoid[];
  isNewestYear: boolean;
  position: CarouselItemPosition;
}

export default function CarouselGroup({ year, entries, isNewestYear, position }: Props) {
  const { x, y, scale, opacity, zIndex, interactive } = position;
  const cols = Math.min(entries.length, MAX_COLS);
  const groupW = getGroupWidth(entries.length);

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: "50%",
        bottom: 0,
        transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) scale(${scale})`,
        transformOrigin: "bottom center",
        zIndex,
        opacity,
        pointerEvents: interactive ? "auto" : "none",
        willChange: "transform, opacity",
      }}
    >
      {/* Cards grid */}
      <div
        className="mb-3"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${CARD_W}px)`,
          gap: CARD_GAP,
        }}
      >
        {entries.map((h) => (
          <CarouselCard key={h.id} humanoid={h} isNew={h.year === (isNewestYear ? year : -1)} />
        ))}
      </div>

      {/* Year label */}
      <div className="flex items-center gap-3 border-t border-neutral-100 pt-2.5" style={{ width: groupW }}>
        <span className="text-[26px] font-medium tabular-nums" style={{ color: "var(--c-ink)", letterSpacing: "-0.03em" }}>{year}</span>
        <span className="text-[12px] text-neutral-300 uppercase tracking-wider ml-auto">{entries.length}</span>
      </div>
    </div>
  );
}
