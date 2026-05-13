"use client";

import React from "react";

const ACTIVE = "rgba(95, 96, 89, 0.75)";
const GHOST = "rgba(95, 96, 89, 0.18)";

const LINE_GAP = 4;
const LINE_H = 14;
const PAD_Y = 3;
const PAD_X = 8;
const TEXT_PAD = 10;

export default function CreditPetri({
  text = "Roy Jad © 2026",
  font = "'Epetri', monospace",
  fontSize = 12,
}: {
  text?: string;
  font?: string;
  fontSize?: number;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        padding: `${PAD_Y}px ${PAD_X}px`,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(to right, ${GHOST} 0, ${GHOST} 1px, transparent 1px, transparent ${LINE_GAP}px)`,
          backgroundPosition: "left center",
          backgroundSize: `100% ${LINE_H}px`,
          backgroundRepeat: "no-repeat",
          maskImage: `linear-gradient(to right, transparent 0, black ${TEXT_PAD}px, black calc(100% - ${TEXT_PAD}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, transparent 0, black ${TEXT_PAD}px, black calc(100% - ${TEXT_PAD}px), transparent 100%)`,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "relative",
          fontFamily: font,
          fontSize,
          fontWeight: 500,
          color: ACTIVE,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </span>
  );
}
