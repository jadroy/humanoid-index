import { useEffect, useRef } from "react";

interface Options {
  threshold?: number;
  decayMs?: number;
  onStep: (direction: 1 | -1) => void;
  onPartial?: (ratio: number) => void;
}

export function useWheelInput({
  threshold = 50,
  decayMs = 150,
  onStep,
  onPartial,
}: Options) {
  const acc = useRef(0);
  const decay = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc.current += e.deltaY;

      if (decay.current) clearTimeout(decay.current);
      decay.current = setTimeout(() => {
        acc.current = 0;
        onPartial?.(0);
      }, decayMs);

      if (Math.abs(acc.current) > threshold) {
        onStep(acc.current > 0 ? 1 : -1);
        acc.current = 0;
        onPartial?.(0);
      } else {
        onPartial?.(acc.current / threshold);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [threshold, decayMs, onStep, onPartial]);
}
