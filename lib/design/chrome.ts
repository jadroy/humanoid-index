import type React from "react";
/**
 * CHROME — the shared vocabulary for everything that floats above the page.
 *
 * The sidebar grew a consistent set of values (ink steps, glyph opacities, one
 * gap, one radius family) while the overlays kept the ones they were born with:
 * `#625D5D` and `bg-neutral-50` in search, `#1d1d1f` and `rgba(0,0,0,0.07)` in
 * chat, browser-default greys in the tooltip. None of those exist anywhere else
 * in the app, which is what made each overlay read as a component borrowed from
 * a different product.
 *
 * One source, imported by the sidebar and every overlay.
 */

/** The site's ink. Three steps for text, and that is the whole scale. */
export const INK = {
  on: "rgba(95, 96, 89, 0.95)",
  hover: "rgba(95, 96, 89, 0.75)",
  off: "rgba(95, 96, 89, 0.55)",
  faint: "rgba(95, 96, 89, 0.38)",
} as const;

/** Fills, in the same hue. Used for row highlights, chips and pressed states. */
export const FILL = {
  rest: "rgba(95, 96, 89, 0.05)",
  hover: "rgba(95, 96, 89, 0.09)",
  active: "rgba(95, 96, 89, 0.07)",
} as const;

/** Hairlines and dividers, where a surface genuinely needs one. */
export const SEAM = "rgba(95, 96, 89, 0.10)";

/**
 * The glass edge: an inset sheen over an inset hairline, then the drop. This is
 * the construction the card icon buttons and the compare minus already use — a
 * flat `1px solid` border is the tell that a surface came from elsewhere.
 */
export const GLASS_EDGE =
  "inset 0 1px 0 rgba(178,178,178,0.10), inset 0 0 0 1px rgba(140,140,140,0.18)";

export const PANEL_SHADOW = "0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.05)";

/**
 * Scrim behind a modal. Warm and light — `bg-black/20` reads blue-grey against
 * this page and turns the white card behind it muddy.
 */
export const SCRIM = "rgba(95, 96, 89, 0.14)";

/**
 * The one deliberate inversion. Tooltips are transient, sit directly under the
 * cursor, and have to be readable over a photo as easily as over the page —
 * inverting them is the convention, and light glass on light page made them
 * work harder than a tooltip should. Everything else that floats is white
 * glass; this is the documented exception, not a leftover.
 */
export const INVERSE = {
  surface: "rgba(28,28,30,0.82)",
  ink: "rgba(255,255,255,0.96)",
  inkFaint: "rgba(255,255,255,0.45)",
  shadow: "0 4px 12px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.12)",
} as const;

/** Two radii: the panel, and everything that sits inside one. */
export const RADIUS = { panel: 24, row: 18 } as const;

/** Geist goes wispy on white glass below 500; 450 is the floor for body text. */
export const WEIGHT = { body: 450, label: 500 } as const;

/** The site's motion. No overshoot — nothing on this page bounces. */
export const EASE = "cubic-bezier(0.33, 1, 0.68, 1)";
export const DUR = { fast: 200, base: 320 } as const;

/** A floating panel: glass fill, glass edge, panel shadow. */
export const panelStyle = (): React.CSSProperties => ({
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  borderRadius: RADIUS.panel,
  boxShadow: `${GLASS_EDGE}, ${PANEL_SHADOW}`,
});
