// Design tokens for the indexes series.
// JS mirror of the CSS variables in app/globals.css — keep in sync.
// Use the CSS vars in components when possible; reach for these constants
// from contexts that can't read CSS (e.g. Satori OG cards, JS measurement).

export const SURFACE = "#F4F4F4";
export const SURFACE_HOVER = "#EBEBEB";
export const SURFACE_ACTIVE = "#E0E0E0";

export const INK = "#343433";
export const INK_MEDIUM = "#494440";
export const INK_MUTED = "#a3a3a3";
export const INK_SUBTLE = "#c4c4c4";

export const TYPE_NAV = {
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: "-0.01em",
  lineHeight: 1,
} as const;
