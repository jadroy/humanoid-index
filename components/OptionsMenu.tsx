"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type ButtonVariant =
  | "dots"
  | "semicircle"
  | "plus"
  | "outlined"
  | "glass"
  | "pill"
  | "grid"
  | "ring";

export const BUTTON_VARIANTS: ButtonVariant[] = [
  "dots",
  "semicircle",
  "plus",
  "outlined",
  "glass",
  "pill",
  "grid",
  "ring",
];

export const BUTTON_LABELS: Record<ButtonVariant, string> = {
  dots: "Dots",
  semicircle: "Peek",
  plus: "Plus",
  outlined: "Outlined",
  glass: "Glass",
  pill: "Pill",
  grid: "Grid",
  ring: "Ring",
};

type Props = {
  variant: ButtonVariant;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  onShareSite: () => void;
  onShareView: () => void;
  visible: boolean;
};

// ── Icons ────────────────────────────────────────────────────

const strokeIcon: CSSProperties = { fill: "none", stroke: "currentColor" };

function IconShare({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={strokeIcon}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
function IconLink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={strokeIcon}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconHelp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={strokeIcon}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconDots({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
function IconDotGrid({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="7" cy="7" r="1.5" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="17" cy="7" r="1.5" />
      <circle cx="7" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17" cy="12" r="1.5" />
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
      <circle cx="17" cy="17" r="1.5" />
    </svg>
  );
}

// Plus ↔ × via rotation
function IconPlusX({ rotated, size = 18 }: { rotated: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ ...strokeIcon, transition: "transform 200ms cubic-bezier(0.16,1,0.3,1)", transform: `rotate(${rotated ? 45 : 0}deg)` }}
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────

export default function OptionsMenu({
  variant,
  chatOpen,
  setChatOpen,
  onShareSite,
  onShareView,
  visible,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (chatOpen) setOpen(false);
  }, [chatOpen]);

  useEffect(() => {
    setOpen(false);
  }, [variant]);

  const items = [
    { key: "site", label: "Share site", Icon: IconShare, onClick: () => { onShareSite(); setOpen(false); } },
    { key: "view", label: "Share current view", Icon: IconLink, onClick: () => { onShareView(); setOpen(false); } },
    { key: "help", label: "Help", Icon: IconHelp, onClick: () => { setOpen(false); setChatOpen(true); } },
  ];

  const onTriggerClick = () => {
    if (chatOpen) { setChatOpen(false); return; }
    setOpen((v) => !v);
  };

  // Sheet sits higher for the peek variant (which dips below the edge)
  const sheetBottom = variant === "semicircle" ? 52 : 80;

  return (
    <div className={visible ? "intro-nav" : "opacity-0"}>
      <div ref={rootRef}>
        <TriggerButton variant={variant} chatOpen={chatOpen} open={open} onClick={onTriggerClick} />
        {open && !chatOpen && (
          <div
            className="fixed left-1/2 z-[49]"
            style={{
              bottom: sheetBottom,
              transform: "translateX(-50%)",
              width: "min(320px, calc(100vw - 32px))",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px) saturate(1.2)",
              WebkitBackdropFilter: "blur(20px) saturate(1.2)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16,
              padding: 6,
              boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
              animation: "sheet-rise 0.26s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            {items.map((it) => (
              <button
                key={it.key}
                onClick={it.onClick}
                className="cursor-pointer transition-colors duration-100 hover:bg-black/[0.04]"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  fontSize: 13,
                  color: "#1d1d1f",
                  textAlign: "left",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                }}
              >
                <span style={{ color: "#888", display: "flex" }}><it.Icon size={14} /></span>
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        )}
        <style jsx>{`
          @keyframes sheet-rise {
            from { opacity: 0; transform: translate(-50%, 16px); }
            to   { opacity: 1; transform: translate(-50%, 0); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Trigger button (variants) ────────────────────────────────

function TriggerButton({
  variant,
  chatOpen,
  open,
  onClick,
}: {
  variant: ButtonVariant;
  chatOpen: boolean;
  open: boolean;
  onClick: () => void;
}) {
  const ariaLabel = chatOpen ? "Close help" : "Options";
  const dim = chatOpen ? "var(--c-ink)" : undefined;
  const fg = chatOpen ? "white" : "#999";

  const closeGlyph = <span style={{ fontSize: 14, fontWeight: 500 }}>×</span>;

  // ── semicircle: full circle peeking up from bottom edge ──
  if (variant === "semicircle") {
    const D = 64; // diameter
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="fixed left-1/2 z-50 cursor-pointer"
        style={{
          bottom: -D / 2,
          width: D,
          height: D,
          marginLeft: -D / 2,
          borderRadius: "50%",
          background: chatOpen ? "var(--c-ink)" : "#F7F7F7",
          color: fg,
          border: "none",
          boxShadow: "0 -4px 14px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: open || chatOpen ? 8 : 6,
          transition: "transform 240ms cubic-bezier(0.16,1,0.3,1), background 200ms, padding-top 200ms",
          transform: open ? "translateY(-6px)" : "translateY(0)",
        }}
      >
        {chatOpen ? (
          <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1 }}>×</span>
        ) : (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span
              style={{
                width: 22,
                height: 3,
                borderRadius: 2,
                background: "#c8c8c8",
                transition: "width 200ms, background 200ms",
              }}
            />
            <IconDots size={14} />
          </span>
        )}
      </button>
    );
  }

  // ── pill: circle that expands to "••• More" on hover ──
  if (variant === "pill") {
    return (
      <PillTrigger chatOpen={chatOpen} onClick={onClick} ariaLabel={ariaLabel} />
    );
  }

  // Shared 36px round for the remaining variants
  const base36: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 200ms",
    border: "none",
  };

  let style: CSSProperties = { ...base36, background: dim ?? "#F7F7F7", color: fg };
  let inner: ReactNode = <IconDots />;

  if (variant === "plus") {
    style = { ...base36, background: dim ?? "#F7F7F7", color: fg };
    inner = chatOpen ? closeGlyph : <IconPlusX rotated={open} />;
  } else if (variant === "outlined") {
    style = {
      ...base36,
      background: chatOpen ? "var(--c-ink)" : "transparent",
      color: chatOpen ? "white" : "#a8a8a8",
      border: chatOpen ? "1px solid transparent" : "1px solid #e0e0e0",
    };
    inner = chatOpen ? closeGlyph : <IconDots />;
  } else if (variant === "glass") {
    style = {
      ...base36,
      background: chatOpen ? "var(--c-ink)" : "rgba(255,255,255,0.55)",
      backdropFilter: "blur(14px) saturate(1.2)",
      WebkitBackdropFilter: "blur(14px) saturate(1.2)",
      border: chatOpen ? "1px solid transparent" : "1px solid rgba(0,0,0,0.06)",
      color: chatOpen ? "white" : "#666",
      boxShadow: chatOpen ? "none" : "0 4px 14px rgba(0,0,0,0.05)",
    };
    inner = chatOpen ? closeGlyph : <IconDots />;
  } else if (variant === "grid") {
    style = { ...base36, background: dim ?? "#F7F7F7", color: chatOpen ? "white" : "#888" };
    inner = chatOpen ? closeGlyph : <IconDotGrid size={14} />;
  } else if (variant === "ring") {
    style = {
      ...base36,
      background: chatOpen ? "var(--c-ink)" : "transparent",
      color: chatOpen ? "white" : "#a8a8a8",
      border: chatOpen ? "1px solid transparent" : "1.5px solid #d8d8d8",
    };
    inner = chatOpen ? closeGlyph : <IconDots />;
  }
  // "dots" falls through to the defaults

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-6 left-1/2 z-50 hover:scale-[1.06]"
      style={{ ...style, transform: "translateX(-50%)" }}
    >
      {inner}
    </button>
  );
}

function PillTrigger({
  chatOpen,
  onClick,
  ariaLabel,
}: {
  chatOpen: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState(false);
  const expanded = hover && !chatOpen;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      className="fixed bottom-6 left-1/2 z-50 cursor-pointer"
      style={{
        height: 36,
        minWidth: 36,
        padding: expanded ? "0 16px 0 12px" : 0,
        borderRadius: 999,
        background: chatOpen ? "var(--c-ink)" : "#F7F7F7",
        color: chatOpen ? "white" : "#999",
        border: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        transition: "padding 220ms cubic-bezier(0.16,1,0.3,1), background 200ms",
        transform: "translateX(-50%)",
        overflow: "hidden",
      }}
    >
      {chatOpen ? <span style={{ fontSize: 14, fontWeight: 500 }}>×</span> : <IconDots />}
      <span
        style={{
          maxWidth: expanded ? 60 : 0,
          opacity: expanded ? 1 : 0,
          fontSize: 12,
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          transition: "max-width 220ms cubic-bezier(0.16,1,0.3,1), opacity 160ms",
        }}
      >
        More
      </span>
    </button>
  );
}

