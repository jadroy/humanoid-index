"use client";

import { useEffect, useRef, useState } from "react";

/* Suggest panel — the ghost "+" card at the end of the grid opens this in the
   same side column as item details. A single quiet field; Send hands off to the
   visitor's mail app (zero-upkeep, no backend). Esc closes. */
export type SuggestConfig = {
  label: string;        // card label + panel title ("Suggest a robot")
  email: string;        // where suggestions go
  subject?: string;     // mail subject (defaults to label)
  placeholder?: string; // field placeholder
  blurb?: string;       // one line of context above the field
};

export default function SuggestPanel({ cfg, onClose }: { cfg: SuggestConfig; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = message.trim().length > 0;

  // `onClose` is an inline arrow from the parent; read it through a ref so
  // the listener (and the focus timer) bind once, not once per render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    // preventScroll: the panel is sticky and already in view — a plain focus()
    // would yank the page to the field's static position near the document top.
    const t = window.setTimeout(() => fieldRef.current?.focus({ preventScroll: true }), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, []);

  const send = () => {
    if (!canSend) return;
    const subject = cfg.subject ?? cfg.label;
    window.location.href = `mailto:${cfg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    onClose();
  };

  return (
    <aside className="v3-panel" aria-label={cfg.label}>
      {/* ✕ on the right, matching the detail panel's close position. */}
      <div className="v3-panel-controls" style={{ justifyContent: "flex-end" }}>
        <button className="v3-panel-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">✕</button>
      </div>

      <div className="v3-panel-content">
        <span className="v3-display" style={{ fontSize: 20 }}>{cfg.label}</span>
        {cfg.blurb && (
          <p className="v3-label v3-label--soft" style={{ lineHeight: 1.6, marginTop: 14 }}>{cfg.blurb}</p>
        )}

        <textarea
          ref={fieldRef}
          className="v3-suggest-field"
          placeholder={cfg.placeholder ?? "What are we missing?"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{ marginTop: 16 }}
        />

        <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
          <span className="v3-label v3-label--faint">Sends from your mail app</span>
          <button
            onClick={send}
            disabled={!canSend}
            className="v3-label v3-suggest-send"
          >
            Send ↗
          </button>
        </div>
      </div>
    </aside>
  );
}
