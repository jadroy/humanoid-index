"use client";

import { useEffect, useState } from "react";

export const WELCOME_STYLES = ["minimal", "hero", "tour", "terminal", "strip"] as const;
export type WelcomeStyle = (typeof WELCOME_STYLES)[number];

const WELCOME_LABELS: Record<WelcomeStyle, string> = {
  minimal: "Minimal",
  hero: "Hero",
  tour: "Tour",
  terminal: "Terminal",
  strip: "Strip",
};

const HINTS = [
  { kbd: "Scroll", body: "Browse robots one at a time — use the arrow keys or wheel." },
  { kbd: "Index", body: "See every entry as a grid or timeline." },
  { kbd: "logo", body: "Click the mark in the corner for a random pick." },
  { kbd: "?", body: "Ask the guide for a recommendation anytime." },
] as const;

function LogoMark({ size = 22, opacity = 0.55 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ opacity }}>
      <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
      <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
    </svg>
  );
}

function Minimal({ onClose }: { onClose: () => void }) {
  return (
    <div className="welcome-card">
      <div className="flex items-center justify-center mb-5"><LogoMark /></div>
      <h2 className="text-center text-[16px] font-medium mb-2" style={{ color: "#1a1a1a", letterSpacing: "-0.005em" }}>
        Humanoid Index
      </h2>
      <p className="text-center text-[12px] leading-relaxed mb-6" style={{ color: "#9a9a9a" }}>
        A living catalog of humanoid robots —<br />
        their makers, timelines, and traits.
      </p>
      <ul className="space-y-3 mb-6">
        {HINTS.map((h) => (
          <li key={h.kbd} className="flex items-start gap-3 text-[11.5px] leading-snug" style={{ color: "#666" }}>
            <span className="welcome-kbd">{h.kbd}</span>
            <span className="flex-1 pt-[2px]">{h.body}</span>
          </li>
        ))}
      </ul>
      <button className="welcome-cta" onClick={onClose} autoFocus>Got it</button>
    </div>
  );
}

function Hero({ onClose }: { onClose: () => void }) {
  return (
    <div className="welcome-card welcome-card--hero">
      <div className="flex items-center justify-center mb-6"><LogoMark size={44} opacity={0.7} /></div>
      <h2
        className="text-center text-[26px] font-medium mb-3"
        style={{ color: "#1a1a1a", letterSpacing: "-0.02em" }}
      >
        Humanoid Index
      </h2>
      <p
        className="text-center text-[13px] leading-relaxed mb-8 mx-auto"
        style={{ color: "#888", maxWidth: 320 }}
      >
        A living catalog of humanoid robots — their makers, timelines, and traits.
        Scroll through them one at a time, browse the full index as grid or timeline,
        click the logo for a random pick, or ask the guide.
      </p>
      <button className="welcome-cta" onClick={onClose} autoFocus>Start exploring</button>
    </div>
  );
}

function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const total = HINTS.length;
  const last = step === total - 1;
  const h = HINTS[step];
  return (
    <div className="welcome-card welcome-card--tour">
      <div className="flex items-center justify-between mb-6">
        <LogoMark size={18} opacity={0.4} />
        <div className="flex items-center gap-1.5">
          {HINTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="welcome-tour-dot"
              data-active={i === step ? "true" : "false"}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "#bbb" }}>{step + 1}/{total}</span>
      </div>
      <div className="welcome-tour-body" key={step}>
        <span className="welcome-kbd mb-3" style={{ minWidth: 0, padding: "4px 10px", fontSize: 11 }}>
          {h.kbd}
        </span>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "#3a3a3a" }}>
          {h.body}
        </p>
      </div>
      <div className="flex items-center justify-between mt-7">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="welcome-tour-nav"
          disabled={step === 0}
        >
          ← Back
        </button>
        {last ? (
          <button className="welcome-cta welcome-cta--inline" onClick={onClose} autoFocus>
            Got it
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            className="welcome-cta welcome-cta--inline"
            autoFocus
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function Terminal({ onClose }: { onClose: () => void }) {
  return (
    <div className="welcome-card welcome-card--terminal">
      <div className="welcome-term-header">
        <span className="welcome-term-prompt">$</span>
        <span className="welcome-term-cmd">humanoid-index --help</span>
      </div>
      <pre className="welcome-term-body">{`A living catalog of humanoid robots —
their makers, timelines, and traits.

USAGE
  scroll      browse one at a time (↑↓ / wheel)
  index       see all entries as grid or timeline
  logo        click for a random pick
  ?           ask the guide for a recommendation

KEYS
  w           toggle this welcome
  Shift+R     jump to a random robot
  f / d       cycle font / dim text`}</pre>
      <div className="welcome-term-footer">
        <span style={{ color: "#aaa" }}>press </span>
        <span className="welcome-term-key">esc</span>
        <span style={{ color: "#aaa" }}> to close</span>
        <button className="welcome-term-close" onClick={onClose} autoFocus>close ›</button>
      </div>
    </div>
  );
}

function Strip({ onClose }: { onClose: () => void }) {
  return (
    <div className="welcome-strip" role="dialog" aria-modal="false">
      <div className="welcome-strip-inner">
        <LogoMark size={18} opacity={0.55} />
        <span className="text-[12px] font-medium" style={{ color: "#1a1a1a" }}>Humanoid Index</span>
        <span className="welcome-strip-sep">·</span>
        <span className="text-[11.5px]" style={{ color: "#888" }}>
          <b style={{ fontWeight: 500, color: "#555" }}>Scroll</b> for one at a time.
          {" "}<b style={{ fontWeight: 500, color: "#555" }}>Index</b> for the full grid or timeline.
          {" "}<b style={{ fontWeight: 500, color: "#555" }}>Logo</b> for random.
          {" "}<b style={{ fontWeight: 500, color: "#555" }}>?</b> for the guide.
        </span>
      </div>
      <button className="welcome-strip-close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}

export function WelcomeModal({
  style,
  onClose,
}: {
  style: WelcomeStyle;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (style === "strip") {
    return <Strip onClose={onClose} />;
  }

  return (
    <div className="welcome-backdrop" onClick={onClose} role="presentation">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {style === "minimal" && <Minimal onClose={onClose} />}
        {style === "hero" && <Hero onClose={onClose} />}
        {style === "tour" && <Tour onClose={onClose} />}
        {style === "terminal" && <Terminal onClose={onClose} />}
      </div>
    </div>
  );
}

export function WelcomeStyleSwitcher({
  style,
  onChange,
}: {
  style: WelcomeStyle;
  onChange: (s: WelcomeStyle) => void;
}) {
  return (
    <div className="welcome-switcher">
      {WELCOME_STYLES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className="welcome-switcher-chip"
          data-active={s === style ? "true" : "false"}
        >
          {WELCOME_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
