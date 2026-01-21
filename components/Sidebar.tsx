"use client";

import { useState, useEffect } from "react";

export interface ViewConfig {
  cardWidth: number;
  cardGap: number;
  cardRadius: number;
  cardPadding: number;
  verticalPadding: number;
  horizontalPadding: number;
  badgeRadius: number;
}

export const defaultConfig: ViewConfig = {
  cardWidth: 230,
  cardGap: 12,
  cardRadius: 16,
  cardPadding: 32,
  verticalPadding: 48,
  horizontalPadding: 20,
  badgeRadius: 8,
};

type SaveSlot = ViewConfig | null;
const SLOTS_KEY = 'humanoid-index-save-slots';
const NUM_SLOTS = 12;

function SlotThumbnail({ config }: { config: ViewConfig }) {
  // Normalize values to thumbnail scale
  const radius = Math.round((config.cardRadius / 40) * 6);
  const gap = Math.max(2, Math.round((config.cardGap / 40) * 6));

  return (
    <div className="w-full h-full bg-neutral-100 p-2">
      <div
        className="grid grid-cols-4 grid-rows-2 w-full h-full"
        style={{ gap }}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-neutral-400"
            style={{ borderRadius: radius }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptySlotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface SidebarProps {
  config: ViewConfig;
  onConfigChange: (config: ViewConfig) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  unit = 'px'
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[13px] uppercase" style={{ color: 'rgba(98, 93, 93, 0.5)' }}>
          {label}
        </span>
        <span className="text-[13px] font-mono" style={{ color: '#625D5D' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-800"
      />
    </div>
  );
}

export default function Sidebar({ config, onConfigChange, isMobileOpen, onMobileClose }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [slots, setSlots] = useState<SaveSlot[]>(Array(NUM_SLOTS).fill(null));

  const update = <K extends keyof ViewConfig>(key: K, value: ViewConfig[K]) => {
    onConfigChange({ ...config, [key]: value });
  };

  // Load slots from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SLOTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure we always have NUM_SLOTS slots
        const normalized = Array(NUM_SLOTS).fill(null).map((_, i) => parsed[i] || null);
        setSlots(normalized);
      } catch {}
    }
  }, []);

  // Save slots to localStorage when they change
  const saveSlots = (newSlots: SaveSlot[]) => {
    setSlots(newSlots);
    localStorage.setItem(SLOTS_KEY, JSON.stringify(newSlots));
  };

  const handleSlotClick = (index: number) => {
    if (slots[index]) {
      // Load saved config
      onConfigChange(slots[index]!);
    } else {
      // Save current config to slot
      const newSlots = [...slots];
      newSlots[index] = { ...config };
      saveSlots(newSlots);
    }
  };

  const handleSlotClear = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSlots = [...slots];
    newSlots[index] = null;
    saveSlots(newSlots);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onMobileClose) {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen, onMobileClose]);

  const copyConfig = () => {
    const configStr = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configStr);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={`w-52 h-screen bg-white p-5 flex flex-col fixed left-0 top-0 overflow-y-auto border-r border-neutral-100 z-50 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="mb-6">
          <h1 className="text-[13px]" style={{ color: '#625D5D' }}>
            Humanoid
          </h1>
          <h1 className="text-[13px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
            Index
          </h1>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full py-2 px-2 mb-2 text-[13px] font-medium rounded hover:bg-neutral-50"
          style={{ color: '#625D5D' }}
        >
          <span>Adjust Layout</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isExpanded ? 'rotate-180' : ''}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isExpanded && (
          <div className="flex-1 space-y-5 pb-4 border-t border-neutral-100 pt-4">
            <Slider
              label="Card Width"
              value={config.cardWidth}
              onChange={(v) => update('cardWidth', v)}
              min={150}
              max={350}
            />

            <Slider
              label="Card Gap"
              value={config.cardGap}
              onChange={(v) => update('cardGap', v)}
              min={0}
              max={40}
            />

            <Slider
              label="Border Radius"
              value={config.cardRadius}
              onChange={(v) => update('cardRadius', v)}
              min={0}
              max={40}
            />

            <Slider
              label="Card Padding"
              value={config.cardPadding}
              onChange={(v) => update('cardPadding', v)}
              min={0}
              max={60}
            />

            <Slider
              label="Vertical Padding"
              value={config.verticalPadding}
              onChange={(v) => update('verticalPadding', v)}
              min={0}
              max={80}
            />

            <Slider
              label="Horizontal Padding"
              value={config.horizontalPadding}
              onChange={(v) => update('horizontalPadding', v)}
              min={0}
              max={60}
            />

            <Slider
              label="Badge Radius"
              value={config.badgeRadius}
              onChange={(v) => update('badgeRadius', v)}
              min={0}
              max={40}
            />

            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <div>
                <span className="text-[13px] uppercase" style={{ color: 'rgba(98, 93, 93, 0.5)' }}>
                  Presets
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => handleSlotClick(i)}
                      className={`relative h-16 rounded-lg overflow-hidden group border ${
                        slot
                          ? 'border-neutral-300 hover:border-neutral-400'
                          : 'border-dashed border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100'
                      }`}
                    >
                      {slot ? (
                        <>
                          <SlotThumbnail config={slot} />
                          <button
                            onClick={(e) => handleSlotClear(i, e)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 text-white text-[13px] leading-none opacity-0 group-hover:opacity-100 flex items-center justify-center rounded"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300 group-hover:text-neutral-400">
                          <EmptySlotIcon />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onConfigChange(defaultConfig)}
                className="w-full py-2 text-[13px] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 rounded"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-neutral-100 pt-4 mt-auto">
          <div className="space-y-2 text-[13px] mb-4" style={{ color: 'rgba(98, 93, 93, 0.5)' }}>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-[13px]" style={{ color: '#625D5D' }}>⌘K</kbd>
              <span>Search</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'rgba(98, 93, 93, 0.5)' }}>
            <span>Created with</span>
            <span>🤖</span>
          </div>
        </div>
      </aside>
    </>
  );
}
