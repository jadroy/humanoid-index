export type SingleKnobs = {
  showName: boolean;
  showManufacturer: boolean;
  showStats: boolean;
  showBadge: boolean;
  showLogo: boolean;
  showWatermark: boolean;
  imagePanelBg: string;
  imagePanelW: number;
  imagePadX: number;
  imagePadY: number;
  imageOffsetY: number;
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
  showName: true,
  showManufacturer: true,
  showStats: true,
  showBadge: true,
  showLogo: true,
  showWatermark: true,
  imagePanelBg: "#fafafa",
  imagePanelW: 480,
  imagePadX: 40,
  imagePadY: 40,
  imageOffsetY: 0,
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
