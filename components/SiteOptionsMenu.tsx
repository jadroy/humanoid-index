"use client";

import { useEffect, useRef, useState } from "react";
import { SURFACE, SURFACE_HOVER, INK_MEDIUM, INK_MUTED } from "@/lib/design/tokens";

const CONTACT_EMAIL = "jadroy77@gmail.com";

const MAILTO = {
  feedback: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Humanoid Index — feedback")}`,
  suggest: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Humanoid Index — suggest a humanoid")}&body=${encodeURIComponent("Name:\nManufacturer:\nLink:\n\nWhy it belongs:")}`,
  subscribe: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Subscribe")}&body=${encodeURIComponent("Add me to the list — notify me when new humanoids are added.")}`,
};

type Props = {
  onShortcuts: () => void;
  visible: boolean;
};

export default function SiteOptionsMenu({ onShortcuts, visible }: Props) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: { label: string; onSelect: () => void }[] = [
    { label: "Submit feedback", onSelect: () => window.open(MAILTO.feedback) },
    { label: "Suggest a humanoid", onSelect: () => window.open(MAILTO.suggest) },
    { label: "Get notified", onSelect: () => window.open(MAILTO.subscribe) },
    { label: "Keyboard shortcuts", onSelect: () => onShortcuts() },
  ];

  return (
    <div
      ref={wrapRef}
      className={`fixed bottom-6 right-6 z-[49] ${visible ? "intro-nav" : "opacity-0 pointer-events-none"}`}
    >
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            bottom: 44,
            right: 0,
            minWidth: 200,
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {items.map((it) => (
            <MenuItem
              key={it.label}
              label={it.label}
              onClick={() => {
                it.onSelect();
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Options"
        aria-expanded={open}
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: open || hover ? SURFACE_HOVER : SURFACE,
          border: "none",
          color: open ? INK_MEDIUM : "#737373",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 200ms ease, color 200ms ease",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left",
        padding: "8px 12px",
        border: "none",
        background: hover ? SURFACE : "transparent",
        borderRadius: 8,
        fontSize: 13,
        letterSpacing: "-0.005em",
        color: INK_MEDIUM,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background 140ms ease",
      }}
    >
      {label}
    </button>
  );
}
