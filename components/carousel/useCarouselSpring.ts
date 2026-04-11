import { useState, useRef, useCallback, useEffect } from "react";

interface Options {
  freq?: number;         // natural frequency in Hz
  zeta?: number;         // damping ratio; 1.0 = critical (no overshoot)
  initialAngle?: number;
  minAngle?: number;
  maxAngle?: number;
  sliceAngle?: number;   // distance between snap points
}

// Continuous spring scrubber. Target is a free float; scrubBy nudges it
// with exponential rubber-band past [minAngle, maxAngle]; release() snaps
// back into bounds and rounds to the nearest slice.
export function useCarouselSpring({
  freq = 2.2,
  zeta = 1.0,
  initialAngle = 0,
  minAngle = -Infinity,
  maxAngle = Infinity,
  sliceAngle = 1,
}: Options = {}) {
  const [angle, setAngle] = useState(initialAngle);
  const pos = useRef(initialAngle);
  const vel = useRef(0);
  const target = useRef(initialAngle);
  const raf = useRef<number>(0);
  const lastTime = useRef(0);

  const fRef = useRef(freq); fRef.current = freq;
  const zRef = useRef(zeta); zRef.current = zeta;
  const minRef = useRef(minAngle); minRef.current = minAngle;
  const maxRef = useRef(maxAngle); maxRef.current = maxAngle;
  const sliceRef = useRef(sliceAngle); sliceRef.current = sliceAngle;

  const tick = useCallback((now: number) => {
    const last = lastTime.current || now;
    // clamp dt so a blurred tab / long frame can't explode the integration
    const dt = Math.min(0.05, (now - last) / 1000);
    lastTime.current = now;

    const omega = 2 * Math.PI * fRef.current;
    const k = omega * omega;
    const c = 2 * zRef.current * omega;

    // sub-step at high stiffness or long dt for numerical stability
    const steps = dt > 1 / 120 ? 2 : 1;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const accel = (target.current - pos.current) * k - vel.current * c;
      vel.current += accel * h;
      pos.current += vel.current * h;
    }

    const settled =
      Math.abs(pos.current - target.current) < 0.0001 &&
      Math.abs(vel.current) < 0.0001;

    if (settled) {
      pos.current = target.current;
      vel.current = 0;
      setAngle(target.current);
      raf.current = 0;
      lastTime.current = 0;
      return;
    }
    setAngle(pos.current);
    raf.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (raf.current) return;
    lastTime.current = 0;
    raf.current = requestAnimationFrame(tick);
  }, [tick]);

  // exponential rubber-band past [minAngle, maxAngle], measured in slices
  const rubberClamp = (raw: number) => {
    const min = minRef.current;
    const max = maxRef.current;
    const slice = sliceRef.current || 1;
    if (raw < min) {
      const excess = (min - raw) / slice;
      return min - Math.pow(excess, 0.55) * slice * 0.6;
    }
    if (raw > max) {
      const excess = (raw - max) / slice;
      return max + Math.pow(excess, 0.55) * slice * 0.6;
    }
    return raw;
  };

  // discrete step (keyboard/click)
  const advance = useCallback((steps: number, slice: number) => {
    const next = target.current + steps * slice;
    target.current = Math.max(minRef.current, Math.min(maxRef.current, next));
    start();
  }, [start]);

  // continuous scrub (wheel)
  const scrubBy = useCallback((delta: number) => {
    target.current = rubberClamp(target.current + delta);
    start();
  }, [start]);

  // end-of-gesture: snap to nearest slice inside bounds
  const release = useCallback(() => {
    const slice = sliceRef.current || 1;
    const clamped = Math.max(minRef.current, Math.min(maxRef.current, target.current));
    target.current = Math.round(clamped / slice) * slice;
    start();
  }, [start]);

  const jumpTo = useCallback((a: number) => {
    target.current = Math.max(minRef.current, Math.min(maxRef.current, a));
    start();
  }, [start]);

  useEffect(() => { start(); }, [start]);

  return { angle, advance, scrubBy, release, jumpTo, target };
}
