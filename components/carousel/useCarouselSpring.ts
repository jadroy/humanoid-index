import { useState, useRef, useCallback, useEffect } from "react";

interface Options {
  stiffness?: number;
  damping?: number;
  initialAngle?: number;
}

export function useCarouselSpring({
  stiffness = 0.08,
  damping = 0.78,
  initialAngle = 0,
}: Options = {}) {
  const [angle, setAngle] = useState(initialAngle);
  const pos = useRef(initialAngle);
  const vel = useRef(0);
  const target = useRef(initialAngle);
  const running = useRef(false);

  const tick = useCallback(() => {
    const force = (target.current - pos.current) * stiffness;
    vel.current = (vel.current + force) * damping;
    pos.current += vel.current;

    setAngle(pos.current);

    if (Math.abs(vel.current) > 0.0001 || Math.abs(target.current - pos.current) > 0.001) {
      requestAnimationFrame(tick);
    } else {
      pos.current = target.current;
      setAngle(target.current);
      running.current = false;
    }
  }, [stiffness, damping]);

  const start = useCallback(() => {
    if (!running.current) {
      running.current = true;
      requestAnimationFrame(tick);
    }
  }, [tick]);

  const advance = useCallback((steps: number, sliceAngle: number) => {
    target.current += steps * sliceAngle;
    start();
  }, [start]);

  const nudge = useCallback((amount: number) => {
    pos.current += amount;
    setAngle(pos.current);
    start();
  }, [start]);

  // Start initial render
  useEffect(() => { start(); }, [start]);

  return { angle, advance, nudge, target };
}
