import { Columns2, Columns3 } from 'lucide-react';

interface SidebarProps {
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
}

export default function Sidebar({ gridSize = 2, onGridSizeChange }: SidebarProps) {
  return (
    <aside className="w-40 h-screen bg-white p-5 flex flex-col fixed left-0 top-0">
      <div className="mb-8">
        <h1 className="text-[12px]" style={{ color: '#625D5D' }}>
          Humanoid
        </h1>
        <h1 className="text-[12px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
          Index
        </h1>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Shortcuts */}
        <div className="space-y-3 text-[11px] mb-12" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-[10px]" style={{ color: '#625D5D' }}>⌘K</kbd>
            <span>Search</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-[10px]" style={{ color: '#625D5D' }}>←</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-[10px]" style={{ color: '#625D5D' }}>→</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 text-[10px]" style={{ color: '#625D5D' }}>esc</kbd>
            <span>Back</span>
          </div>
        </div>

        {/* View Control */}
        {onGridSizeChange && (
          <div className="mb-12">
            <p className="text-[11px] mb-3" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
              View
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onGridSizeChange(2)}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  gridSize === 2
                    ? 'bg-neutral-100 border border-neutral-300'
                    : 'bg-neutral-100 border border-transparent hover:border-neutral-200'
                }`}
              >
                <Columns2 
                  size={14} 
                  className={gridSize === 2 ? 'text-neutral-500' : 'text-neutral-400'}
                />
              </button>
              <button
                onClick={() => onGridSizeChange(3)}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  gridSize === 3
                    ? 'bg-neutral-100 border border-neutral-300'
                    : 'bg-neutral-100 border border-transparent hover:border-neutral-200'
                }`}
              >
                <Columns3 
                  size={14} 
                  className={gridSize === 3 ? 'text-neutral-500' : 'text-neutral-400'}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
        <span>Created with</span>
        <span>🤖</span>
      </div>
    </aside>
  );
}
