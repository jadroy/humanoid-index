"use client";

import { useEffect, useState } from "react";

export function PlaceholderLogo({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className ?? ""}`}>
      <svg width="280" height="280" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.045 }}>
        <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
        <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
      </svg>
    </div>
  );
}

export function LogoMark({
  fill = "var(--c-ink)",
  opacity = 0.25,
  size = 20,
  onClick,
  luckyNonce = 0,
  ringColor = "var(--c-ink)",
  showLuckyHint = true,
}: {
  fill?: string;
  opacity?: number;
  size?: number;
  onClick?: () => void;
  luckyNonce?: number;
  ringColor?: string;
  showLuckyHint?: boolean;
}) {
  const pad = 6;
  const total = size + pad * 2;

  // Swift draw ring on each lucky click — keyed off the nonce so rapid
  // re-clicks restart the animation cleanly.
  const [ringKey, setRingKey] = useState(0);
  const [ringVisible, setRingVisible] = useState(false);
  useEffect(() => {
    if (!luckyNonce) return;
    setRingKey((k) => k + 1);
    setRingVisible(true);
    const t = setTimeout(() => setRingVisible(false), 720);
    return () => clearTimeout(t);
  }, [luckyNonce]);

  return (
    <div
      className="group relative inline-flex items-center justify-center cursor-pointer"
      style={{ width: total, height: total }}
      onClick={onClick}
    >
      {showLuckyHint && (
        <span
          className="absolute top-1/2 pointer-events-none whitespace-nowrap opacity-0 -translate-y-1/2 group-hover:opacity-[0.3]"
          style={{
            left: total + 4,
            fontSize: 12,
            color: ringColor,
            transition: "opacity 180ms ease",
          }}
        >
          I&rsquo;m feeling lucky
        </span>
      )}
      {ringVisible && (
        <svg
          key={`ring-${ringKey}`}
          width={total}
          height={total}
          viewBox={`0 0 ${total} ${total}`}
          fill="none"
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={total / 2}
            cy={total / 2}
            r={total / 2 - 2}
            fill="none"
            stroke={ringColor}
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="88"
            strokeDashoffset="88"
            style={{
              opacity: 0,
              animation: "lucky-ring-swipe 700ms cubic-bezier(0.33, 1, 0.68, 1) forwards",
            }}
          />
        </svg>
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        style={{ opacity }}
      >
        <circle cx="10" cy="5" r="3" fill={fill} />
        <rect x="7" y="9.5" width="6" height="8" rx="3" fill={fill} />
      </svg>
    </div>
  );
}

// The site wordmark glyph ("HI"). Lives in the footer capsule rather than the
// top edge — the filter row owns the top now, and two centred elements stacked
// there read as clutter.
// `size` is the mark's drawn WIDTH, not its box. The glyphs sit at x 7.7–37.3
// and y 12.9–32.1 of the original 45×45 artboard, so a square viewBox spent
// roughly half its height on padding — set beside 18px solid icons the mark
// came out around 13×8.5 and read as an afterthought. The viewBox is now the
// ink's own bounds and the height follows from its 1.546 aspect.
const SITE_MARK_BOX = { x: 7.72, y: 12.94, w: 29.56, h: 19.12 };
const SITE_MARK_ASPECT = SITE_MARK_BOX.w / SITE_MARK_BOX.h;

export function SiteMark({ size = 22, color = "currentColor", opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg
      width={size}
      height={size / SITE_MARK_ASPECT}
      viewBox={`${SITE_MARK_BOX.x} ${SITE_MARK_BOX.y} ${SITE_MARK_BOX.w} ${SITE_MARK_BOX.h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color, opacity, overflow: "visible" }}
    >
      <rect x="7.72656" y="12.9392" width="8.69168" height="19.1217" rx="0.5" fill="currentColor" />
      <rect x="26.8438" y="19.189" width="6.6221" height="19.1217" rx="0.5" transform="rotate(90 26.8438 19.189)" fill="currentColor" />
      <rect x="18.1562" y="12.9392" width="8.69168" height="19.1217" rx="0.5" fill="currentColor" />
      <rect x="28.5859" y="12.9392" width="8.69168" height="19.1217" rx="0.5" fill="currentColor" />
    </svg>
  );
}
