"use client";

export default function MobileView() {
  return (
    <main
      className="min-h-[100dvh] bg-white flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <div className="inline-flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden style={{ opacity: 0.55 }}>
          <circle cx="10" cy="5" r="3" fill="#737373" />
          <rect x="7" y="9.5" width="6" height="8" rx="3" fill="#737373" />
        </svg>
        <span className="text-[15px] tracking-tight text-neutral-500">
          Mobile experience coming soon
        </span>
      </div>
    </main>

  );
}
