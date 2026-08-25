"use client";

import React from "react";
import { INK, FILL, SEAM, WEIGHT } from "@/lib/design/chrome";

/**
 * One key cap for every shortcut hint in the app.
 *
 * There were three before: `border-neutral-200` rectangles at body size in the
 * search modal, a `.shortcuts-kbd` class in the shortcuts sheet, and plain
 * white text in the tooltip. All three put a hard-edged box next to soft grey
 * text. This is the page's own fill and seam at a size that sits under the
 * label rather than beside it.
 */
export function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 5,
        background: FILL.rest,
        boxShadow: `inset 0 0 0 1px ${SEAM}`,
        fontFamily: "inherit",
        fontSize: 11,
        fontWeight: WEIGHT.body,
        color: INK.off,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </kbd>
  );
}
