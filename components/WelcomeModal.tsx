"use client";

import { useCallback, useEffect, useState } from "react";

type Slide = {
  key: string;
  title: string;
  body: string;
  visual: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    key: "intro",
    title: "A visual index of humanoid robots",
    body: "Every humanoid from ASIMO to Atlas — past, present, and incoming. Casually informative, made for browsing.",
    visual: <IntroVisual />,
  },
  {
    key: "scroll",
    title: "Scroll to browse",
    body: "Spin through the index with your trackpad or wheel. Cards drift past with the focused robot front and center.",
    visual: <ScrollVisual />,
  },
  {
    key: "compare",
    title: "Compare two robots",
    body: "Add any robot to compare and see them side by side — stats, generation, and a short read on how they stack up.",
    visual: <CompareVisual />,
  },
  {
    key: "share",
    title: "Share what you find",
    body: "Every view has its own link. Hit share to copy a deeplink with a custom preview card for whatever's on screen.",
    visual: <ShareVisual />,
  },
];

export function WelcomeModal({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;
  const isLast = index === total - 1;

  const next = useCallback(() => {
    setIndex((i) => (i >= total - 1 ? i : i + 1));
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? 0 : i - 1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") {
        if (isLast) onClose();
        else next();
      } else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, prev, isLast]);

  return (
    <div className="welcome-backdrop" onClick={onClose} role="presentation">
      <div
        className="welcome-card welcome-tour"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <button
          type="button"
          className="welcome-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <div className="tour-visual" aria-hidden="true">
          <div
            className="tour-visual-track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((s) => (
              <div key={s.key} className="tour-visual-slide">
                {s.visual}
              </div>
            ))}
          </div>
        </div>

        <div className="tour-dots" role="tablist" aria-label="Tour progress">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Step ${i + 1} of ${total}`}
              className={`tour-dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <div className="tour-text">
          <h2 id="welcome-title" className="tour-title">
            {SLIDES[index].title}
          </h2>
          <p className="tour-body">{SLIDES[index].body}</p>
        </div>

        <div className="tour-footer">
          <button
            type="button"
            className="tour-skip"
            onClick={onClose}
          >
            {isLast ? "Close" : "Skip"}
          </button>
          <button
            type="button"
            className="tour-next"
            onClick={isLast ? onClose : next}
            autoFocus
          >
            {isLast ? "Start exploring" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Visual mocks ─────────────────────────────────────────── */

function IntroVisual() {
  return (
    <div className="mock mock-intro">
      <span className="mock-wordmark" aria-hidden="true" />
      <div className="mock-arc">
        <span className="mock-arc-dot" />
        <span className="mock-arc-dot" />
        <span className="mock-arc-dot is-focus" />
        <span className="mock-arc-dot" />
        <span className="mock-arc-dot" />
      </div>
    </div>
  );
}

function ScrollVisual() {
  return (
    <div className="mock mock-scroll">
      <div className="mock-row">
        <span className="mock-card s-1" />
        <span className="mock-card s-2" />
        <span className="mock-card s-focus" />
        <span className="mock-card s-2" />
        <span className="mock-card s-1" />
      </div>
      <span className="mock-scroll-hint">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
          <path d="M2 4L5 1.5L8 4M2 10L5 12.5L8 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        scroll
      </span>
    </div>
  );
}

function CompareVisual() {
  return (
    <div className="mock mock-compare">
      <span className="mock-card cmp-a" />
      <span className="mock-vs">vs</span>
      <span className="mock-card cmp-b" />
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="mock mock-share">
      <div className="mock-og">
        <span className="mock-og-card" />
        <span className="mock-og-vs">vs</span>
        <span className="mock-og-card" />
      </div>
      <div className="mock-url">
        <span className="mock-url-dot" />
        <span className="mock-url-text">humanoid-index.com/?compare=…</span>
      </div>
    </div>
  );
}
