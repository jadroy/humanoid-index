export type SingleKnobs = {
  showStats: boolean;
  showBadge: boolean;
  showLogo: boolean;
  imagePanelBg: string;
  imagePanelW: number;
  imageW: number;
  imageH: number;
  nameSize: number;
  manufacturerSize: number;
  statLabelSize: number;
  statValueSize: number;
};

export type CompareKnobs = {
  showStats: boolean;
  imageW: number;
  imageH: number;
  nameSize: number;
  manufacturerSize: number;
  statLabelSize: number;
  statValueSize: number;
  showVsBubble: boolean;
  showDivider: boolean;
};

export const SINGLE_DEFAULTS: SingleKnobs = {
  showStats: true,
  showBadge: true,
  showLogo: true,
  imagePanelBg: "#fafafa",
  imagePanelW: 480,
  imageW: 400,
  imageH: 540,
  nameSize: 64,
  manufacturerSize: 20,
  statLabelSize: 13,
  statValueSize: 28,
};

export const COMPARE_DEFAULTS: CompareKnobs = {
  showStats: true,
  imageW: 240,
  imageH: 300,
  nameSize: 36,
  manufacturerSize: 14,
  statLabelSize: 11,
  statValueSize: 20,
  showVsBubble: true,
  showDivider: true,
};
