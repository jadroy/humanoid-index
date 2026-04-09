// Ellipse & layout constants
export const ELLIPSE_RX = 550;
export const ELLIPSE_RY = 100;
export const CARD_W = 160;
export const CARD_GAP = 10;
export const MAX_COLS = 4;

export interface CarouselItemPosition {
  x: number;
  y: number;
  z: number; // -1 back, 1 front
  scale: number;
  opacity: number;
  zIndex: number;
  visible: boolean;
  interactive: boolean;
}

export function normalizeAngle(theta: number): number {
  return ((theta % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
}

export function getItemPosition(theta: number): CarouselItemPosition {
  const norm = normalizeAngle(theta);
  const z = Math.cos(norm);
  const x = Math.sin(norm) * ELLIPSE_RX;
  const y = -z * ELLIPSE_RY;
  const zNorm = (z + 1) / 2; // 0..1
  const scale = 0.45 + 0.55 * zNorm;
  const opacity = Math.max(0, 0.1 + 0.9 * ((z + 0.3) / 1.3));
  const zIndex = Math.round(zNorm * 100);
  const visible = z >= -0.35;
  const interactive = z > 0.3;

  return { x, y, z, scale, opacity, zIndex, visible, interactive };
}

export function getGroupWidth(cardCount: number): number {
  const cols = Math.min(cardCount, MAX_COLS);
  return cols * CARD_W + (cols - 1) * CARD_GAP;
}
