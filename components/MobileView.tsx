"use client";

export default function MobileView() {
  return (
    <main
      className="min-h-[100dvh] bg-white flex items-center justify-center px-6"
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <div
        className="inline-flex items-center gap-3 pl-5 pr-6 py-3.5 rounded-full border border-neutral-200/70"
        style={{
          background: "#f5f5f5",
          boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 6px 20px rgba(23,23,23,0.04)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden style={{ opacity: 0.55 }}>
          <circle cx="10" cy="5" r="3" fill="#737373" />
          <rect x="7" y="9.5" width="6" height="8" rx="3" fill="#737373" />
        </svg>
        <span className="text-[15px] tracking-tight text-neutral-500">
          Best enjoyed on desktop
        </span>
      </div>
    </main>

  );
}
