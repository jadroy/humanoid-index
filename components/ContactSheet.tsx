"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { INK, FILL, SEAM, SCRIM, RADIUS, WEIGHT, EASE, GLASS_EDGE, PANEL_SHADOW } from "@/lib/design/chrome";

type Variant = "feedback" | "suggest";

type Props = {
  variant: Variant;
  email: string;
  onClose: () => void;
};

const COPY: Record<Variant, { title: string; subject: string; submit: string }> = {
  feedback: {
    title: "Submit feedback",
    subject: "Humanoid Index — feedback",
    submit: "Send",
  },
  suggest: {
    title: "Suggest a humanoid",
    subject: "Humanoid Index — suggest a humanoid",
    submit: "Send",
  },
};

export default function ContactSheet({ variant, email, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [onClose]);

  const canSubmit = message.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const url = `mailto:${email}?subject=${encodeURIComponent(COPY[variant].subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        // Warm and light, matching the search modal's scrim. 32% black over
        // this page reads as a different app's dialog.
        background: SCRIM,
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "contact-fade 180ms ease-out",
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={COPY[variant].title}
        style={{
          width: "100%",
          maxWidth: 380,
          // Was a dark panel — the only one in the app besides the tooltip,
          // and the reason opening Feedback felt like leaving the site. Same
          // white glass and inset edge as the search modal and the chat.
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(28px) saturate(1.4)",
          WebkitBackdropFilter: "blur(28px) saturate(1.4)",
          border: "none",
          borderRadius: RADIUS.panel,
          boxShadow: `${GLASS_EDGE}, ${PANEL_SHADOW}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animation: "contact-pop 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: WEIGHT.label,
              letterSpacing: "normal",
              color: INK.on,
            }}
          >
            {COPY[variant].title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: INK.off,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <Field
          as="textarea"
          placeholder={variant === "feedback" ? "What's on your mind?" : "Which humanoid are we missing?"}
          value={message}
          onChange={setMessage}
          rows={variant === "feedback" ? 5 : 2}
          inputRef={firstFieldRef}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: WEIGHT.label,
              letterSpacing: "normal",
              borderRadius: RADIUS.row,
              border: "none",
              background: "transparent",
              color: INK.off,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: WEIGHT.label,
              letterSpacing: "normal",
              borderRadius: RADIUS.row,
              border: "none",
              background: canSubmit ? FILL.hover : FILL.rest,
              color: canSubmit ? INK.on : INK.faint,
              cursor: canSubmit ? "pointer" : "default",
              transition: `background 200ms ${EASE}, color 200ms ${EASE}`,
            }}
          >
            {COPY[variant].submit}
          </button>
        </div>
      </form>

      <style jsx>{`
        @keyframes contact-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes contact-pop {
          from { opacity: 0; transform: translateY(6px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

type FieldProps = {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  as?: "input" | "textarea";
  type?: string;
  rows?: number;
  inputRef?: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
};

function Field({ placeholder, value, onChange, as = "input", type = "text", rows, inputRef }: FieldProps) {
  const [focus, setFocus] = useState(false);
  const base: CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    fontSize: 14,
    fontWeight: WEIGHT.body,
    letterSpacing: "normal",
    lineHeight: 1.45,
    fontFamily: "inherit",
    color: INK.on,
    background: focus ? FILL.hover : FILL.rest,
    // An inset ring rather than a border, so focus does not shift the field by
    // a pixel and the edge matches every other surface here.
    boxShadow: `inset 0 0 0 1px ${focus ? "rgba(95, 96, 89, 0.22)" : SEAM}`,
    border: "none",
    borderRadius: 14,
    outline: "none",
    resize: "none",
    transition: `background 200ms ${EASE}, box-shadow 200ms ${EASE}`,
  };
  if (as === "textarea") {
    return (
      <textarea
        ref={(el) => {
          if (inputRef) inputRef.current = el;
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        rows={rows}
        style={base}
      />
    );
  }
  return (
    <input
      ref={(el) => {
        if (inputRef) inputRef.current = el;
      }}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={base}
    />
  );
}
