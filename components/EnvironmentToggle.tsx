"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SURFACE, SURFACE_HOVER } from "@/lib/design/tokens";

type Props = {
  available: boolean;
  enabled: boolean;
  onToggle: () => void;
  hintRobotNames?: string[];
};

export default function EnvironmentToggle({ available, enabled, onToggle, hintRobotNames }: Props) {
  const [hover, setHover] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showTooltip = !available && !!hintRobotNames && hintRobotNames.length > 0 && hover;
  const ink = !available ? "#b4b4b4" : enabled ? "#1d1d1f" : "#737373";
  const bg = !available ? SURFACE : enabled ? "#E8E8ED" : hover ? SURFACE_HOVER : SURFACE;
  const label = !available ? "Coming soon" : "Environment";

  const hintText = hintRobotNames && hintRobotNames.length > 0
    ? `Available for ${hintRobotNames.length === 1
        ? hintRobotNames[0]
        : hintRobotNames.length === 2
          ? `${hintRobotNames[0]} & ${hintRobotNames[1]}`
          : `${hintRobotNames.slice(0, -1).join(", ")} & ${hintRobotNames[hintRobotNames.length - 1]}`}`
    : "";

  if (!mounted) return null;

  return createPortal(
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fixed z-[1000]"
      style={{ top: 8, right: "var(--nav-x, 24px)", display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}
    >
      <button
        onClick={available ? onToggle : undefined}
        aria-pressed={available ? enabled : undefined}
        aria-disabled={!available}
        aria-label={!available ? "Environment — coming soon" : enabled ? "Hide environment" : "Show environment"}
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
          cursor: available ? "pointer" : "default",
          opacity: available ? 1 : 0.75,
          transition: "background 200ms ease, color 200ms ease, opacity 220ms ease",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 18l5-6 4 5 3-4 6 7" />
          <circle cx="17" cy="6" r="2" />
        </svg>
        {label}
      </button>
      <span
        style={{
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: "-0.005em",
          color: "#9a9a9a",
          whiteSpace: "nowrap",
          paddingRight: 4,
          opacity: showTooltip ? 1 : 0,
          transform: showTooltip ? "translateY(0)" : "translateY(-3px)",
          transition: "opacity 200ms ease, transform 200ms ease",
          pointerEvents: "none",
        }}
        aria-hidden
      >
        {hintText}
      </span>
    </div>,
    document.body,
  );
}
