"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

export type ButtonVariant =
  | "dots"
  | "semicircle"
  | "plus"
  | "outlined"
  | "glass"
  | "pill"
  | "grid"
  | "ring"
  | "apple";

export const BUTTON_VARIANTS: ButtonVariant[] = [
  "dots",
  "semicircle",
  "plus",
  "outlined",
  "glass",
  "pill",
  "grid",
  "ring",
  "apple",
];

export const BUTTON_LABELS: Record<ButtonVariant, string> = {
  dots: "Dots",
  semicircle: "Peek",
  plus: "Plus",
  outlined: "Outlined",
  glass: "Glass",
  pill: "Pill",
  grid: "Grid",
  ring: "Ring",
  apple: "Apple",
};

type Props = {
  variant: ButtonVariant;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  visible: boolean;
};

// ── Icons ────────────────────────────────────────────────────

const strokeIcon: CSSProperties = { fill: "none", stroke: "currentColor" };

function IconQuestion({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={strokeIcon} aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────

export default function OptionsMenu({
  variant,
  chatOpen,
  setChatOpen,
  visible,
}: Props) {
  const onTriggerClick = () => setChatOpen(!chatOpen);

  return (
    <div className={`${visible ? "intro-nav" : "opacity-0"} fixed inset-0 pointer-events-none z-[48]`}>
      <div className="pointer-events-auto">
        <TriggerButton variant={variant} chatOpen={chatOpen} onClick={onTriggerClick} />
      </div>
    </div>
  );
}

// ── Trigger button (variants) ────────────────────────────────

function TriggerButton({
  variant,
  chatOpen,
  onClick,
}: {
  variant: ButtonVariant;
  chatOpen: boolean;
  onClick: () => void;
}) {
  const ariaLabel = chatOpen ? "Close help" : "Help";
  const icon = chatOpen
    ? <span style={{ fontSize: 16, fontWeight: 400, lineHeight: 1, color: "inherit" }}>×</span>
    : <IconQuestion />;

  // ── semicircle: full circle peeking up from bottom edge ──
  if (variant === "semicircle") {
    const D = 64;
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="fixed left-1/2 z-50 cursor-pointer"
        style={{
          bottom: -D / 2,
          width: D,
          height: D,
          marginLeft: -D / 2,
          borderRadius: "50%",
          background: "#F7F7F7",
          color: chatOpen ? "#555" : "#b4b4b4",
          border: chatOpen ? "1px solid #ccc" : "none",
          boxShadow: "0 -4px 14px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 6,
          transition: "color 240ms ease, border-color 240ms ease",
          transform: "translateX(-50%)",
        }}
      >
        {icon}
      </button>
    );
  }

  // ── pill: expands to show "Help" label on hover ──
  if (variant === "pill") {
    return <PillTrigger chatOpen={chatOpen} onClick={onClick} ariaLabel={ariaLabel} />;
  }

  // ── apple: iMessage-style soft circle with label below ──
  if (variant === "apple") {
    return <AppleTrigger chatOpen={chatOpen} onClick={onClick} ariaLabel={ariaLabel} />;
  }

  // Shared base style — pill fill, no border (matches humanoid card/pills)
  const base: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: "none",
    color: chatOpen ? "#555" : "#b4b4b4",
    transition: "color 220ms ease, background 220ms ease, box-shadow 220ms ease",
  };

  let style: CSSProperties = { ...base, background: "#F4F4F4" };

  if (variant === "dots" || variant === "plus" || variant === "grid") {
    style = { ...base, background: "#F4F4F4" };
  } else if (variant === "glass") {
    style = {
      ...base,
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(14px) saturate(1.2)",
      WebkitBackdropFilter: "blur(14px) saturate(1.2)",
      border: chatOpen ? "1px solid #bbb" : "1px solid rgba(0,0,0,0.06)",
      boxShadow: chatOpen ? "none" : "0 4px 14px rgba(0,0,0,0.05)",
    };
  } else if (variant === "ring") {
    style = { ...base, background: "transparent", border: chatOpen ? "1.5px solid #aaa" : "1.5px solid #d8d8d8" };
  }
  // "outlined" falls through to the base style — render as a chat-input pill.
  return <ChatInputTrigger onClick={onClick} ariaLabel={ariaLabel} chatOpen={chatOpen} />;
}

function ChatInputTrigger({
  onClick,
  ariaLabel,
  chatOpen,
}: {
  onClick: () => void;
  ariaLabel: string;
  chatOpen: boolean;
}) {
  const [hover, setHover] = useState(false);
  const expanded = hover || chatOpen;
  const inkColor = chatOpen ? "#555" : "#737373";
  const ease = "cubic-bezier(0.32, 0.72, 0, 1)";
  const dur = 620;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      className="fixed bottom-6 z-50 cursor-pointer"
      style={{
        height: 40,
        width: expanded ? 220 : 40,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: expanded ? "space-between" : "center",
        padding: expanded ? "0 12px 0 16px" : 0,
        background: hover ? "var(--c-surface-hover, #EBEBEB)" : "var(--c-surface)",
        border: "none",
        color: inkColor,
        textAlign: "left",
        overflow: "hidden",
        transition: `width ${dur}ms ${ease}, padding ${dur}ms ${ease}, background 280ms ease, color 280ms ease`,
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: inkColor,
          letterSpacing: "-0.005em",
          whiteSpace: "nowrap",
          maxWidth: expanded ? 180 : 0,
          opacity: expanded ? 1 : 0,
          transform: `translateX(${expanded ? 0 : -4}px)`,
          transition: expanded
            ? `max-width ${dur}ms ${ease}, opacity 360ms ease 220ms, transform 480ms ${ease} 180ms`
            : `max-width ${dur}ms ${ease}, opacity 220ms ease, transform 320ms ${ease}`,
        }}
      >
        {chatOpen ? "Close chat" : "Ask about humanoids…"}
      </span>
      {chatOpen ? (
        <span style={{ fontSize: 16, lineHeight: 1, color: inkColor, flexShrink: 0 }}>×</span>
      ) : (
        <span style={{ flexShrink: 0, display: "inline-flex" }}>
          <IconQuestion size={16} />
        </span>
      )}
    </button>
  );
}

function AppleTrigger({
  chatOpen,
  onClick,
  ariaLabel,
}: {
  chatOpen: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState(false);
  const fill = hover || chatOpen ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      className="fixed bottom-6 left-1/2 z-50 cursor-pointer flex flex-col items-center"
      style={{
        transform: "translateX(-50%)",
        background: "transparent",
        border: "none",
        padding: 0,
        gap: 9,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          background: fill,
          color: "rgba(0,0,0,0.78)",
          transition: "background 220ms ease",
        }}
      >
        {chatOpen ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <IconQuestion size={17} />
        )}
      </span>
      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", fontWeight: 400, letterSpacing: "-0.005em" }}>
        {chatOpen ? "Close" : "Help"}
      </span>
    </button>
  );
}

function PillTrigger({
  chatOpen,
  onClick,
  ariaLabel,
}: {
  chatOpen: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState(false);
  const expanded = hover && !chatOpen;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      className="fixed bottom-6 left-1/2 z-50 cursor-pointer"
      style={{
        height: 40,
        minWidth: 40,
        padding: expanded ? "0 16px 0 12px" : 0,
        borderRadius: 999,
        background: "transparent",
        color: chatOpen ? "#555" : "#b4b4b4",
        border: chatOpen ? "1px solid #bbb" : "1px solid #e0e0e0",
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        transition: "padding 220ms cubic-bezier(0.16,1,0.3,1), color 220ms ease, border-color 220ms ease",
        transform: "translateX(-50%)",
        overflow: "hidden",
      }}
    >
      {chatOpen ? <span style={{ fontSize: 16, fontWeight: 400 }}>×</span> : <IconQuestion />}
      <span
        style={{
          maxWidth: expanded ? 60 : 0,
          opacity: expanded ? 1 : 0,
          fontSize: 12,
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          transition: "max-width 220ms cubic-bezier(0.16,1,0.3,1), opacity 160ms",
        }}
      >
        Help
      </span>
    </button>
  );
}

