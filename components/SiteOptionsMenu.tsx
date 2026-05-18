"use client";

import { useEffect, useRef, useState } from "react";
import ContactSheet from "./ContactSheet";

const CONTACT_EMAIL = "jadroy77@gmail.com";

type Props = {
  shareLabel: string;
  onShare: () => void;
  visible: boolean;
  inline?: boolean;
};

export default function SiteOptionsMenu({ visible, inline = false }: Props) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<"feedback" | "suggest" | null>(null);
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
    { label: "Submit feedback", onSelect: () => setSheet("feedback") },
    { label: "Suggest a humanoid", onSelect: () => setSheet("suggest") },
  ];

  return (
    <div
      ref={wrapRef}
      className={inline
        ? `relative ${visible ? "intro-nav" : "opacity-0 pointer-events-none"}`
        : `fixed bottom-6 left-1/2 z-[49] ${visible ? "intro-nav" : "opacity-0 pointer-events-none"}`}
      style={inline ? undefined : { transform: "translateX(-50%)" }}
    >
      <div
        aria-hidden={!open}
        style={{
          position: "absolute",
          bottom: "100%",
          right: 0,
          paddingBottom: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(4px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 160ms ease, transform 160ms ease",
        }}
      >
        {items.map((it) => (
          <PopItem
            key={it.label}
            label={it.label}
            onClick={() => {
              it.onSelect();
              setOpen(false);
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Contribute"
        aria-expanded={open}
        style={{
          height: 36,
          padding: "0 14px",
          marginRight: -14,
          borderRadius: 999,
          background: "transparent",
          border: "none",
          color: open || hover ? "rgba(95, 96, 89, 0.8)" : "rgba(95, 96, 89, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "normal",
          transition: "color 140ms ease",
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

function PopItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "2px 14px",
        border: "none",
        background: "transparent",
        color: hover ? "rgba(95, 96, 89, 0.82)" : "rgba(95, 96, 89, 0.7)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "normal",
        whiteSpace: "nowrap",
        transition: "color 140ms ease",
      }}
    >
      {label}
    </button>
  );
}
