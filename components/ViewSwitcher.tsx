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
      className="relative w-10 h-5 bg-neutral-200 rounded-full transition-colors duration-200 hover:bg-neutral-300"
      title={`Switch to ${viewMode === 'carousel' ? 'grid' : 'carousel'} view`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-out"
        style={{
          transform: viewMode === 'grid' ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
