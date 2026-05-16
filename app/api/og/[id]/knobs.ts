export type TextMode = "none" | "url" | "name";

export type SingleKnobs = {
  textMode: TextMode;
  basePadTop: number;
  basePadX: number;
  basePadBottom: number;
  bottomFadeH: number;
  bottomFadeOpacity: number;
};

export type CompareKnobs = {
  textMode: TextMode;
  basePadTop: number;
  basePadX: number;
  basePadBottom: number;
  bottomFadeH: number;
  bottomFadeOpacity: number;
  showDivider: boolean;
};

export const SINGLE_DEFAULTS: SingleKnobs = {
  textMode: "none",
  basePadTop: 48,
  basePadX: 64,
  basePadBottom: 48,
  bottomFadeH: 60,
  bottomFadeOpacity: 0.9,
};

export const COMPARE_DEFAULTS: CompareKnobs = {
  textMode: "none",
  basePadTop: 40,
  basePadX: 36,
  basePadBottom: 40,
  bottomFadeH: 54,
  bottomFadeOpacity: 0.9,
  showDivider: false,
};
