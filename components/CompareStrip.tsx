"use client";

import type { Humanoid } from "@/data/humanoids";

interface CompareStripProps {
  pinnedIds: string[];
  allRobots: Humanoid[];
  onRemove: (id: string) => void;
  onClear: () => void;
  isMobile?: boolean;
}

const getStatBars = (h: Humanoid) => [
  h.height && { label: "height", value: `${h.height}cm`, pct: Math.max(4, Math.min(100, ((h.height - 100) / 100) * 100)) },
  h.weight && { label: "weight", value: `${h.weight}kg`, pct: Math.max(4, Math.min(100, (h.weight / 100) * 100)) },
  h.dof && { label: "dof", value: `${h.dof}`, pct: Math.max(4, Math.min(100, (h.dof / 70) * 100)) },
  h.maxSpeed && { label: "speed", value: `${h.maxSpeed}m/s`, pct: Math.max(4, Math.min(100, (h.maxSpeed / 4.5) * 100)) },
].filter(Boolean) as { label: string; value: string; pct: number }[];

const STAT_COLORS = [
  'rgba(0,0,0,0.55)',
  'rgba(0,0,0,0.35)',
  'rgba(0,0,0,0.22)',
  'rgba(0,0,0,0.14)',
];

export default function CompareStrip({ pinnedIds, allRobots, onRemove, onClear, isMobile }: CompareStripProps) {
  const pinned = pinnedIds
    .map(id => allRobots.find(r => r.id === id))
    .filter(Boolean) as Humanoid[];

  if (pinned.length === 0) return null;

  const showStats = pinned.length >= 2 && !isMobile;
  const statLabels = showStats
    ? ['height', 'weight', 'dof', 'speed'].filter(label =>
        pinned.some(h => getStatBars(h).some(s => s.label === label))
      )
    : [];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] animate-compare-strip-up"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="mx-auto bg-white/95 backdrop-blur-sm border-t border-neutral-200 shadow-lg"
        style={{ maxWidth: '900px' }}
      >
        {/* Thumbnails row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {pinned.map((h, i) => (
            <div
              key={h.id}
              className="relative flex items-center gap-2 group/pin"
              style={{
                opacity: 0,
                animation: `compare-strip-item-in 250ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 60}ms forwards`,
              }}
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <img
                  src={h.imageUrl || "/robots/placeholder.png"}
                  alt={h.name}
                  draggable={false}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <span className="font-mono text-[12px] tracking-wider uppercase text-neutral-600 whitespace-nowrap">
                {h.name}
              </span>
              <button
                onClick={() => onRemove(h.id)}
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover/pin:opacity-100 transition-opacity duration-100 hover:bg-neutral-100"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1L7 7M7 1L1 7" stroke="#999" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}

          <div className="flex-1" />

          {pinned.length > 0 && (
            <button
              onClick={onClear}
              className="font-mono text-[12px] tracking-wider uppercase text-neutral-400 hover:text-neutral-600 transition-colors px-2 py-1"
            >
              Clear
            </button>
          )}

          <div className="font-mono text-[12px] tracking-wider uppercase text-neutral-300 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-neutral-200 text-neutral-400">P</kbd>
            <span>pin</span>
          </div>
        </div>

        {/* Stat bars — visible when 2+ pinned (desktop only) */}
        {showStats && statLabels.length > 0 && (
          <div className="px-4 pb-3 flex flex-col gap-2 border-t border-neutral-100 pt-2">
            {statLabels.map(label => (
              <div key={label} className="flex items-center gap-3">
                <span className="font-mono text-[12px] tracking-wider uppercase text-neutral-400 w-12 flex-shrink-0">
                  {label}
                </span>
                <div className="flex-1 flex gap-1.5">
                  {pinned.map((h, i) => {
                    const stat = getStatBars(h).find(s => s.label === label);
                    return (
                      <div key={h.id} className="flex-1">
                        <div className="relative h-[3px] w-full rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                          <div
                            className="absolute inset-y-0 left-0 rounded-full animate-bar-fill"
                            style={{
                              width: stat ? `${stat.pct}%` : '0%',
                              backgroundColor: STAT_COLORS[i % STAT_COLORS.length],
                              animationDelay: `${100 + i * 60}ms`,
                            }}
                          />
                        </div>
                        <div className="font-mono text-[12px] text-neutral-400 mt-0.5 text-right">
                          {stat ? stat.value : '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
