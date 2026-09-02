"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { INK, FILL, SEAM, RADIUS, WEIGHT, EASE, DUR } from "@/lib/design/chrome";
import Overlay from "@/components/Overlay";

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
  const [message, setMessage] = useState("");
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Esc and the scrim are Overlay's; all this needs to do is take the caret.
  useEffect(() => {
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, []);

  const canSubmit = message.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const url = `mailto:${email}?subject=${encodeURIComponent(COPY[variant].subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = url;
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl+Enter sends, the way it does in every compose box. Plain Enter
    // stays a newline — this is a paragraph field, not a search query.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit(e);
  };

  return (
    <Overlay onClose={onClose} label={COPY[variant].title}>
      {/* No title bar, no ✕, no Cancel. The placeholder says what the box is
          for, and the scrim and Esc are how you leave — the same two exits
          Search and Ask have. A dialog that spelled out all four was the only
          surface here that felt like paperwork. */}
      <form onSubmit={handleSubmit}>
        {/* Same anatomy as Search: the field is the panel's top, seamed off
            from a quiet footer. The field used to carry its own inset ring,
            which drew a second box inside a box — the panel is the container. */}
        <div style={{ padding: "16px 20px" }}>
          <Field
            as="textarea"
            placeholder={variant === "feedback" ? "What's on your mind?" : "Which humanoid are we missing?"}
            value={message}
            onChange={setMessage}
            onKeyDown={handleKeyDown}
            rows={variant === "feedback" ? 5 : 2}
            inputRef={firstFieldRef}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 12px 10px 20px",
            borderTop: `1px solid ${SEAM}`,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: WEIGHT.body, color: INK.faint }}>
            Sends from your mail app
          </span>
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
              transition: `background ${DUR.fast}ms ${EASE}, color ${DUR.fast}ms ${EASE}`,
            }}
          >
            {COPY[variant].submit}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

type FieldProps = {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  as?: "input" | "textarea";
  type?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  inputRef?: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
};

function Field({ placeholder, value, onChange, as = "input", type = "text", rows, onKeyDown, inputRef }: FieldProps) {
  const base: CSSProperties = {
    width: "100%",
    padding: 0,
    fontSize: 14,
    fontWeight: WEIGHT.body,
    letterSpacing: "normal",
    lineHeight: 1.45,
    fontFamily: "inherit",
    color: INK.on,
    // Borderless, like Search's input. The panel is the field's container;
    // a ring inside it was a box drawn inside a box.
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
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
        onKeyDown={onKeyDown}
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
      onKeyDown={onKeyDown}
      style={base}
    />
  );
}
