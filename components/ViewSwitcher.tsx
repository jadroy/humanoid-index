"use client";

export type ViewMode = 'carousel' | 'grid';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewSwitcher({ viewMode, onViewModeChange }: ViewSwitcherProps) {
  const toggle = () => {
    onViewModeChange(viewMode === 'carousel' ? 'grid' : 'carousel');
  };

  return (
    <button
      onClick={toggle}
      className="relative flex items-center gap-0.5 bg-neutral-100 rounded-lg p-1 border border-neutral-200/50 cursor-pointer hover:bg-neutral-150 transition-colors"
      title={`Switch to ${viewMode === 'carousel' ? 'grid' : 'carousel'} view`}
    >
      {/* Sliding highlight */}
      <span
        className="absolute top-1 left-1 w-[28px] h-[28px] bg-white rounded-md shadow-sm transition-transform duration-150 ease-out"
        style={{
          transform: viewMode === 'grid' ? 'translateX(calc(100% + 2px))' : 'translateX(0)',
        }}
      />
      <span
        className={`relative z-10 p-1.5 rounded-md transition-colors duration-200 ${
          viewMode === 'carousel' ? 'text-neutral-600' : 'text-neutral-400'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
          <rect x="1" y="4" width="3" height="8" rx="0.5" />
          <rect x="5.5" y="2" width="5" height="12" rx="1" />
          <rect x="12" y="4" width="3" height="8" rx="0.5" />
        </svg>
      </span>
      <span
        className={`relative z-10 p-1.5 rounded-md transition-colors duration-200 ${
          viewMode === 'grid' ? 'text-neutral-600' : 'text-neutral-400'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      </span>
    </button>
  );
}
