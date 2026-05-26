"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SURFACE_HOVER_SOFT } from "@/lib/design/tokens";

type Props = {
  available: boolean;
  enabled: boolean;
  onToggle: () => void;
  visible?: boolean;
};

export default function EnvironmentToggle({ available, enabled, onToggle, visible = true }: Props) {
  const [hover, setHover] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Match the floating-chip system: light fill + thin outline + soft sheen.
  // SURFACE_HOVER_SOFT kept as the hover wash so the button still signals
  // hoverability without going fully tinted like the in-card chips.
  void SURFACE_HOVER_SOFT;
  const ink = "rgba(0,0,0,0.6)";
  const bg = enabled
    ? "rgba(0,0,0,0.05)"
    : hover
      ? "rgba(255,255,255,0.95)"
      : "rgba(255,255,255,1)";
  const label = "Scene";

  if (!mounted) return null;
  if (!visible) return null;
  if (!available) return null;

  return createPortal(
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="intro-nav fixed z-[1000]"
      style={{ top: 8, right: "var(--nav-x, 24px)", display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}
    >
      <button
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Hide scene" : "Show scene"}
        style={{
          height: 40,
          padding: "0 17px",
          borderRadius: 20,
          border: "1px solid transparent",
          background: bg,
          color: ink,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.01em",
          lineHeight: 1,
          whiteSpace: "nowrap",
          cursor: "pointer",
          // Mirror the floating chip's box-shadow stack (subtle inner sheen +
          // inset outline + soft drop) so the Scene toggle reads as part of
          // the same chip system.
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(102,102,102,0.18), 0 1px 3px rgba(0,0,0,0.05)",
          transition: "background 200ms ease, color 200ms ease",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 18l5-6 4 5 3-4 6 7" />
          <circle cx="17" cy="6" r="2" />
        </svg>
        {label}
      </button>
    </div>,
    document.body,
  );
}
