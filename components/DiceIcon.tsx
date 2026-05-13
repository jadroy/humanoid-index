// Wireframe die — stroke-based to match the rest of the nav icons.
// Composes one die; LayoutSwitcher renders two for the compare state.

const V = {
  top: [12, 3] as [number, number],
  bl: [3, 7] as [number, number],
  br: [21, 7] as [number, number],
  ft: [12, 11] as [number, number],
  flb: [3, 18] as [number, number],
  frb: [21, 18] as [number, number],
  fb: [12, 22] as [number, number],
};

const FACE = {
  top: [V.top, V.br, V.ft, V.bl] as Array<[number, number]>,
  left: [V.bl, V.ft, V.fb, V.flb] as Array<[number, number]>,
  right: [V.ft, V.br, V.frb, V.fb] as Array<[number, number]>,
};

// Pip insets tuned for optical centering after isometric projection.
const UNIT_PIPS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.32, 0.32], [0.68, 0.68]],
  3: [[0.3, 0.7], [0.5, 0.5], [0.7, 0.3]],
  4: [[0.32, 0.32], [0.68, 0.32], [0.32, 0.68], [0.68, 0.68]],
  5: [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
  6: [[0.32, 0.24], [0.68, 0.24], [0.32, 0.5], [0.68, 0.5], [0.32, 0.76], [0.68, 0.76]],
};

export type DieFaces = { top: number; left: number; right: number };

export function DiceIcon({
  faces,
  size = 24,
}: {
  faces?: DieFaces;
  size?: number;
}) {
  const f: DieFaces = faces ?? { top: 1, left: 2, right: 3 };

  // Outline (hex silhouette of the cube) + inner Y (where 3 faces meet)
  const outline = `M${V.top[0]} ${V.top[1]} L${V.br[0]} ${V.br[1]} L${V.frb[0]} ${V.frb[1]} L${V.fb[0]} ${V.fb[1]} L${V.flb[0]} ${V.flb[1]} L${V.bl[0]} ${V.bl[1]} Z`;
  const innerY = `M${V.bl[0]} ${V.bl[1]} L${V.ft[0]} ${V.ft[1]} L${V.br[0]} ${V.br[1]} M${V.ft[0]} ${V.ft[1]} L${V.fb[0]} ${V.fb[1]}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
    >
      <path d={outline} strokeOpacity={0.45} />
      <path d={innerY} strokeOpacity={0.45} />
      {(["top", "left", "right"] as const).flatMap((name) => {
        const quad = FACE[name];
        return UNIT_PIPS[f[name]].map((uv, i) => {
          const x = quad[0][0] + uv[0] * (quad[1][0] - quad[0][0]) + uv[1] * (quad[3][0] - quad[0][0]);
          const y = quad[0][1] + uv[0] * (quad[1][1] - quad[0][1]) + uv[1] * (quad[3][1] - quad[0][1]);
          return <circle key={`${name}${i}`} cx={x} cy={y} r={1.5} fill="currentColor" stroke="none" />;
        });
      })}
    </svg>
  );
}
