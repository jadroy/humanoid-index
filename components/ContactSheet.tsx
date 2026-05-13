"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

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
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [link, setLink] = useState("");
  const [why, setWhy] = useState("");
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

  const canSubmit =
    variant === "feedback"
      ? message.trim().length > 0
      : name.trim().length > 0 || manufacturer.trim().length > 0 || why.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const body =
      variant === "feedback"
        ? message
        : `Name: ${name}\nManufacturer: ${manufacturer}\nLink: ${link}\n\nWhy it belongs:\n${why}`;
    const url = `mailto:${email}?subject=${encodeURIComponent(COPY[variant].subject)}&body=${encodeURIComponent(body)}`;
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
        background: "rgba(0,0,0,0.32)",
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
          background: "rgba(38, 38, 38, 0.92)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          boxShadow: "0 24px 48px rgba(0,0,0,0.32), 0 4px 10px rgba(0,0,0,0.16)",
          padding: 18,
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
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "rgba(255,255,255,0.95)",
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
              color: "rgba(255,255,255,0.5)",
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

        {variant === "feedback" ? (
          <Field
            as="textarea"
            placeholder="What's on your mind?"
            value={message}
            onChange={setMessage}
            rows={5}
            inputRef={firstFieldRef}
          />
        ) : (
          <>
            <Field placeholder="Robot name" value={name} onChange={setName} inputRef={firstFieldRef} />
            <Field placeholder="Manufacturer" value={manufacturer} onChange={setManufacturer} />
            <Field placeholder="Link (video, site, paper)" value={link} onChange={setLink} type="url" />
            <Field as="textarea" placeholder="Why it belongs" value={why} onChange={setWhy} rows={3} />
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: canSubmit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)",
              color: canSubmit ? "#1a1a1a" : "rgba(255,255,255,0.45)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 140ms ease, color 140ms ease",
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
    fontSize: 13,
    fontWeight: 400,
    letterSpacing: "-0.005em",
    lineHeight: 1.45,
    fontFamily: "inherit",
    color: "rgba(255,255,255,0.95)",
    background: focus ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.035)",
    border: `1px solid ${focus ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 9,
    outline: "none",
    resize: "none",
    transition: "background 140ms ease, border-color 140ms ease",
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
