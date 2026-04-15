// Card "give" — subtle physical reactions to the spring, applied
// imperatively on each subscription tick.

export const GIVE_STYLES = [
  "none", "squish-y", "squish-x", "breath", "sag", "float",
  "push", "lean", "tilt", "blur", "dim", "drag",
] as const;
export type GiveStyle = (typeof GIVE_STYLES)[number];

export const giveStyleLabels: Record<GiveStyle, string> = {
  none: "None",
  "squish-y": "Squish Y",
  "squish-x": "Squish X",
  breath: "Breath",
  sag: "Sag",
  float: "Float",
  push: "Push",
  lean: "Lean",
  tilt: "Tilt",
  blur: "Blur",
  dim: "Dim",
  drag: "Drag",
};

export type GiveSettings = {
  velScale: number;   // multiplier applied to raw spring velocity
  pushAmt: number;    // px of translateY per unit velocity
  leanAmt: number;    // degrees of rotateZ per unit velocity
  tiltAmt: number;    // degrees of rotateX per unit velocity
  tiltDepth: number;  // perspective depth for tilt (px)
};

export function applyGive(
  el: HTMLDivElement,
  variant: GiveStyle,
  pos: number,
  vel: number,
  s: GiveSettings,
) {
  const dist = Math.abs(pos - Math.round(pos)); // 0..0.5
  // Normalize velocity into roughly [-1, 1] for the reactive variants.
  const v = Math.max(-1, Math.min(1, vel * s.velScale));
  switch (variant) {
    case "none":
      el.style.transform = "";
      el.style.filter = "";
      return;
    case "squish-y":
      el.style.transform = `scaleY(${1 - dist * 0.04})`;
      el.style.filter = "";
      return;
    case "squish-x":
      el.style.transform = `scaleX(${1 - dist * 0.04})`;
      el.style.filter = "";
      return;
    case "breath":
      el.style.transform = `scale(${1 - dist * 0.025})`;
      el.style.filter = "";
      return;
    case "sag":
      el.style.transform = `translateY(${dist * 5}px)`;
      el.style.filter = "";
      return;
    case "float":
      el.style.transform = `translateY(${-dist * 5}px)`;
      el.style.filter = "";
      return;
    case "push":
      el.style.transform = `translateY(${v * s.pushAmt}px)`;
      el.style.filter = "";
      return;
    case "lean":
      el.style.transform = `rotate(${v * s.leanAmt}deg)`;
      el.style.filter = "";
      return;
    case "tilt":
      el.style.transform = `perspective(${s.tiltDepth}px) rotateX(${-v * s.tiltAmt}deg)`;
      el.style.filter = "";
      return;
    case "blur":
      el.style.transform = "";
      el.style.filter = `blur(${dist * 2.2}px)`;
      return;
    case "dim":
      el.style.transform = "";
      el.style.filter = `brightness(${1 - dist * 0.14})`;
      return;
    case "drag":
      el.style.transform = `scaleY(${1 - dist * 0.025}) translateY(${v * s.pushAmt * 0.6}px)`;
      el.style.filter = "";
      return;
  }
}
