// Design tokens for the indexes series.
// JS mirror of the CSS variables in app/globals.css — keep in sync.
// Use the CSS vars in components when possible; reach for these constants
// from contexts that can't read CSS (e.g. Satori OG cards, JS measurement).

export const SURFACE = "#F1F1F6";
export const SURFACE_HOVER = "#E8E8EE";
export const SURFACE_ACTIVE = "#DEDEE5";
export const SURFACE_HOVER_SOFT = "rgba(95, 96, 110, 0.04)";

export const INK = "#2e2e36";
export const INK_BODY = "#747484";
export const INK_MUTED = "#a0a0ad";
export const INK_SUBTLE = "#c4c4d0";

export const TYPE_NAV = {
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: "-0.01em",
  lineHeight: 1,
} as const;
