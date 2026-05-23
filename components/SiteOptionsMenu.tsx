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
        ? `relative ${visible ? "" : "opacity-0 pointer-events-none"}`
        : `fixed bottom-6 left-1/2 z-[49] ${visible ? "intro-nav" : "opacity-0 pointer-events-none"}`}
      style={inline ? undefined : { transform: "translateX(-50%)" }}
    >
      <div
        aria-hidden={!open}
        style={inline ? {
          position: "absolute",
          left: "100%",
          top: 0,
          bottom: 0,
          paddingLeft: 10,
          display: open ? "flex" : "none",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          pointerEvents: open ? "auto" : "none",
          whiteSpace: "nowrap",
        } : {
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
            inline={inline}
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
        aria-label="Contribute"
        aria-expanded={open}
        className="hover:underline underline-offset-2"
        style={{
          padding: 0,
          background: "transparent",
          border: "none",
          color: "oklch(65% 0.011 222.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "normal",
          lineHeight: 1,
          opacity: open ? 0.45 : 1,
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

function PopItem({ label, onClick, inline = false }: { label: string; onClick: () => void; inline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:underline underline-offset-2"
      style={{
        padding: inline ? 0 : "2px 0 2px 14px",
        border: "none",
        background: "transparent",
        color: "oklch(65% 0.011 222.2)",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "normal",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
