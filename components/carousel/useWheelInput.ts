import { useEffect, useRef } from "react";

interface Options {
  decayMs?: number;
  onScrub: (deltaY: number) => void;
  onRelease?: () => void;
}

// Continuous wheel input. Every event forwards its raw deltaY to onScrub,
// and onRelease fires after `decayMs` of silence so the consumer can snap.
export function useWheelInput({
  decayMs = 140,
  onScrub,
  onRelease,
}: Options) {
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      onScrub(e.deltaY);
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => {
        onRelease?.();
      }, decayMs);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
    };
  }, [decayMs, onScrub, onRelease]);
}
