"use client";

import { useEffect, useState } from "react";
import { INK, SEAM, WEIGHT } from "@/lib/design/chrome";
import { Key } from "@/components/Key";

type Row = { label: string; keys: string[][] };

const ROWS: Row[] = [
  { label: "Browse one at a time", keys: [["←", "→"], ["↑", "↓"]] },
  { label: "Jump to first or last", keys: [["⌘", "←/→"], ["PgUp", "PgDn"], ["Home", "End"]] },
  { label: "Switch side in compare", keys: [["Tab"]] },
  { label: "Exit / close", keys: [["Esc"]] },
  { label: "Random robot", keys: [["⇧", "R"]] },
  { label: "Save this robot", keys: [["⇧", "S"]] },
  { label: "Toggle this sheet", keys: [["/"], ["?"]] },
];

function ModRow({ row, isMac }: { row: Row; isMac: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 py-[7px]">
      <span style={{ fontSize: 13, fontWeight: WEIGHT.body, color: INK.off }}>{row.label}</span>
      <span className="flex items-center gap-1.5 flex-wrap justify-end">
        {row.keys.map((group, gi) => (
          <span key={gi} className="flex items-center gap-1">
            {gi > 0 && <span style={{ fontSize: 10, color: INK.faint }}>·</span>}
            {group.map((k, ki) => (
              <Key key={ki}>{k === "⌘" && !isMac ? "Ctrl" : k}</Key>
            ))}
          </span>
        ))}
      </span>
    </li>
  );
}

export function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="welcome-backdrop" onClick={onClose} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="welcome-card"
        style={{ maxWidth: 380, padding: "26px 26px 20px" }}
      >
        <div className="flex items-center justify-between mb-4">
          {/* On the page's ink scale — #1a1a1a was darker than any other text
              on the site, and 10.5px was a size used nowhere else. */}
          <h2 style={{ fontSize: 14, fontWeight: WEIGHT.label, color: INK.on, letterSpacing: "normal" }}>
            Shortcuts
          </h2>
          <span style={{ fontSize: 12, fontWeight: WEIGHT.body, color: INK.faint }}>press / to toggle</span>
        </div>
        <ul className="divide-y" style={{ borderColor: SEAM }}>
          {ROWS.map((row) => (
            <ModRow key={row.label} row={row} isMac={isMac} />
          ))}
        </ul>
      </div>
    </div>
  );
}
