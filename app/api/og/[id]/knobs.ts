export type TextMode = "none" | "url" | "name";

export type SingleKnobs = {
  textMode: TextMode;
  basePadX: number;
  basePadBottom: number;
};

export type CompareKnobs = {
  textMode: TextMode;
  basePadX: number;
  basePadBottom: number;
  showDivider: boolean;
};

export const SINGLE_DEFAULTS: SingleKnobs = {
  textMode: "none",
  basePadX: 80,
  basePadBottom: 20,
};

export const COMPARE_DEFAULTS: CompareKnobs = {
  textMode: "none",
  basePadX: 40,
  basePadBottom: 20,
  showDivider: false,
};
