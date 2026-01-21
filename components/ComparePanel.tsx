"use client";

import { humanoids, type Humanoid } from "@/data/humanoids";

interface ComparePanelProps {
  selectedIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function StatRow({ label, values }: { label: string; values: (string | number | undefined)[] }) {
  const definedValues = values.filter(v => v !== undefined && v !== null);
  if (definedValues.length === 0) return null;

  // Find best value for highlighting (highest for most stats)
  const numericValues = values.map(v => typeof v === 'number' ? v : parseFloat(String(v) || '0'));
  const maxVal = Math.max(...numericValues.filter(n => !isNaN(n)));

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${values.length}, 1fr)` }}>
      <div className="text-[13px] text-neutral-400">{label}</div>
      {values.map((val, i) => {
        const isMax = typeof val === 'number' && val === maxVal && numericValues.filter(n => n === maxVal).length === 1;
        return (
          <div key={i} className={`text-[13px] ${isMax ? 'text-neutral-900 font-medium' : 'text-neutral-600'}`}>
            {val ?? '—'}
          </div>
        );
      })}
    </div>
  );
}

export default function ComparePanel({ selectedIds, onRemove, onClear, onClose }: ComparePanelProps) {
  const selectedRobots = selectedIds
    .map(id => humanoids.find(h => h.id === id))
    .filter((h): h is Humanoid => h !== undefined);

  if (selectedRobots.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-neutral-800">
            Comparing {selectedRobots.length} robots
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              className="text-[13px] text-neutral-400 hover:text-neutral-600"
            >
              Clear all
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Robot headers with images */}
        <div className="px-6 py-4 border-b border-neutral-100">
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${selectedRobots.length}, 1fr)` }}>
            <div />
            {selectedRobots.map(robot => (
              <div key={robot.id} className="text-center relative group">
                <button
                  onClick={() => onRemove(robot.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neutral-200 hover:bg-red-500 hover:text-white text-neutral-500 text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
                >
                  ×
                </button>
                <div className="w-20 h-24 mx-auto mb-2 bg-neutral-50 rounded-lg flex items-center justify-center">
                  <img
                    src={robot.imageUrl || "/robots/placeholder.png"}
                    alt={robot.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="text-[13px] font-medium text-neutral-800">{robot.name}</div>
                <div className="text-[13px] text-neutral-400">{robot.manufacturer}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats comparison */}
        <div className="px-6 py-4 space-y-3">
          <StatRow
            label="Status"
            values={selectedRobots.map(r => r.status)}
          />
          <StatRow
            label="Year"
            values={selectedRobots.map(r => r.year)}
          />
          <StatRow
            label="Price"
            values={selectedRobots.map(r => r.cost)}
          />
          <StatRow
            label="Height"
            values={selectedRobots.map(r => r.height ? `${r.height} cm` : undefined)}
          />
          <StatRow
            label="Weight"
            values={selectedRobots.map(r => r.weight ? `${r.weight} kg` : undefined)}
          />
          <StatRow
            label="DOF"
            values={selectedRobots.map(r => r.dof)}
          />
          <StatRow
            label="Max Speed"
            values={selectedRobots.map(r => r.maxSpeed ? `${r.maxSpeed} m/s` : undefined)}
          />
        </div>

        {/* Descriptions */}
        <div className="px-6 py-4 border-t border-neutral-100">
          <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${selectedRobots.length}, 1fr)` }}>
            <div className="text-[13px] text-neutral-400">Description</div>
            {selectedRobots.map(robot => (
              <div key={robot.id} className="text-[13px] text-neutral-500 leading-relaxed">
                {robot.description || '—'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
