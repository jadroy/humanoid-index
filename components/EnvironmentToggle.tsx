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
  const ink = enabled ? "#1d1d1f" : "#737373";
  const bg = enabled
    ? "#E8E8ED"
    : hover
      ? SURFACE_HOVER_SOFT
      : "transparent";
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
          height: 32,
          padding: "0 12px",
          borderRadius: 999,
          border: "none",
          background: bg,
          color: ink,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12.5,
          fontWeight: 500,
          letterSpacing: "-0.005em",
          whiteSpace: "nowrap",
          cursor: "pointer",
          transition: "background 200ms ease, color 200ms ease",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 18l5-6 4 5 3-4 6 7" />
          <circle cx="17" cy="6" r="2" />
        </svg>
        {label}
      </button>
    </div>,
    document.body,
  );
}
