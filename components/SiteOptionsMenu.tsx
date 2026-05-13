"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SURFACE_HOVER_SOFT } from "@/lib/design/tokens";
import ContactSheet from "./ContactSheet";

const CONTACT_EMAIL = "jadroy77@gmail.com";

type Props = {
  shareLabel: string;
  onShare: () => void;
  visible: boolean;
  inline?: boolean;
};

export default function SiteOptionsMenu({ shareLabel, onShare, visible, inline = false }: Props) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [sheet, setSheet] = useState<"feedback" | "suggest" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | null>(null);

  // Measure the natural width of the menu content via a hidden ghost,
  // then drive the visible popover's width with a CSS transition so
  // dynamic share labels (e.g. "Share Atlas vs Optimus") slide in/out
  // smoothly instead of snapping.
  useLayoutEffect(() => {
    const el = ghostRef.current;
    if (!el) return;
    const measure = () => setPopoverWidth(Math.ceil(el.scrollWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shareLabel]);

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

  type MenuEntry =
    | { kind: "item"; label: string; icon: ReactNode; onSelect: () => void }
    | { kind: "divider" };
  const items: MenuEntry[] = [
    { kind: "item", label: "Submit feedback", icon: <IconChat />, onSelect: () => setSheet("feedback") },
    { kind: "item", label: "Suggest a humanoid", icon: <IconPlus />, onSelect: () => setSheet("suggest") },
  ];

  return (
    <div
      ref={wrapRef}
      className={inline
        ? `relative ${visible ? "intro-nav" : "opacity-0 pointer-events-none"}`
        : `fixed bottom-6 left-1/2 z-[49] ${visible ? "intro-nav" : "opacity-0 pointer-events-none"}`}
      style={inline ? undefined : { transform: "translateX(-50%)" }}
    >
      {/* Hidden ghost: measures the natural content width as shareLabel changes. */}
      <div
        ref={ghostRef}
        aria-hidden
        style={{
          position: "fixed",
          visibility: "hidden",
          pointerEvents: "none",
          top: 0,
          left: -9999,
          padding: 6,
          display: "inline-flex",
          flexDirection: "column",
          whiteSpace: "nowrap",
        }}
      >
        {items.map((it, i) =>
          it.kind === "item" ? (
            <div
              key={`g-${i}`}
              style={{
                padding: "7px 11px",
                fontSize: 12.5,
                fontWeight: 500,
                letterSpacing: "-0.005em",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ width: 15, height: 15, display: "inline-block", flexShrink: 0 }} />
              <span>{it.label}</span>
            </div>
          ) : null,
        )}
      </div>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            bottom: 48,
            right: 0,
            width: popoverWidth ?? "auto",
            minWidth: 200,
            background: "rgba(38, 38, 38, 0.86)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            boxShadow: "0 14px 32px rgba(0,0,0,0.24), 0 2px 6px rgba(0,0,0,0.10)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            transition: "width 320ms cubic-bezier(0.22, 1, 0.36, 1)",
            overflow: "hidden",
          }}
        >
          {items.map((it, i) =>
            it.kind === "divider" ? (
              <div
                key={`d-${i}`}
                aria-hidden
                style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 10px" }}
              />
            ) : (
              <MenuItem
                key={it.label}
                label={it.label}
                icon={it.icon}
                onClick={() => {
                  it.onSelect();
                  setOpen(false);
                }}
              />
            ),
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Contribute"
        aria-expanded={open}
        style={{
          height: 36,
          padding: "0 14px",
          borderRadius: 999,
          background: open || hover ? SURFACE_HOVER_SOFT : "transparent",
          border: "none",
          color: "rgba(95, 96, 89, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "normal",
          transition: "background 200ms ease, color 200ms ease",
        }}
      >
        Contribute
      </button>

      {sheet && (
        <ContactSheet variant={sheet} email={CONTACT_EMAIL} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}

function MenuItem({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left",
        padding: "7px 11px",
        border: "none",
        background: hover ? "rgba(255,255,255,0.08)" : "transparent",
        borderRadius: 8,
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "background 140ms ease",
      }}
    >
      <span style={{ display: "inline-flex", color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function IconLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
