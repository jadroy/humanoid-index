"use client";

import { useLayoutEffect, useRef } from "react";
import { humanoids } from "@/data/humanoids";
import type { SpringSubscribe } from "@/hooks/useSpring";

interface LabelWheelProps {
  index: number;
  subscribe: SpringSubscribe;
  onClickItem: (idx: number) => void;
  direction: "above" | "below";
  mirrored?: boolean;
  count?: number;
  stepY?: number;
  curveX?: number;
  fontSize?: number;
  fade?: number;
}

export default function LabelWheel({
  index,
  subscribe,
  onClickItem,
  direction,
  mirrored = false,
  count = 3,
  stepY = 26,
  curveX = 12,
  fontSize = 13,
  fade = 1.3,
}: LabelWheelProps) {
  const isAbove = direction === "above";

  const items: { i: number }[] = [];
  if (isAbove) {
    for (let n = Math.max(0, index - count); n < index; n++) items.push({ i: n });
  } else {
    for (let n = index + 1; n <= Math.min(humanoids.length - 1, index + count); n++) items.push({ i: n });
  }

  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const dir = mirrored ? 1 : -1;
    const lastTf: string[] = new Array(items.length).fill("");
    const lastOp: number[] = new Array(items.length).fill(-1);

    const update = (pos: number) => {
      for (let idx = 0; idx < items.length; idx++) {
        const el = refs.current[idx];
        if (!el) continue;
        const o = items[idx].i - pos;
        const ao = o < 0 ? -o : o;
        const t = ao / count > 1 ? 1 : ao / count;

        const ty = o * stepY;
        const tx = dir * t * t * curveX;
        const scale = 1 - t * 0.18;

        const tf = `translate(${tx}px, ${ty}px) scale(${scale})`;
        if (tf !== lastTf[idx]) {
          el.style.transform = tf;
          lastTf[idx] = tf;
        }

        const op = Math.pow(1 - t, fade);
        if (op !== lastOp[idx]) {
          el.style.opacity = String(op);
          lastOp[idx] = op;
        }
      }
    };
    return subscribe(update);
  }, [items, subscribe, mirrored, stepY, curveX, count, fade]);

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none overflow-visible"
      style={{
        left: mirrored ? "auto" : 0,
        right: mirrored ? 0 : "auto",
        top: isAbove ? 0 : "100%",
        width: 0,
        height: 0,
        zIndex: 3,
      }}
    >
      {items.map(({ i }, idx) => {
        const h = humanoids[i];
        if (!h) return null;
        return (
          <div
            key={i}
            ref={(el) => { refs.current[idx] = el; }}
            className="absolute whitespace-nowrap pointer-events-auto cursor-pointer select-none"
            style={{
              top: 0,
              left: mirrored ? "auto" : 0,
              right: mirrored ? 0 : "auto",
              transformOrigin: mirrored ? "100% 50%" : "0 50%",
              willChange: "transform, opacity",
              fontSize,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--c-ink)",
              lineHeight: 1.2,
              transition: "opacity 0.12s ease",
            }}
            onClick={() => onClickItem(i)}
          >
            {h.name}
          </div>
        );
      })}
    </div>
  );
}
