import { useCallback, useEffect, useRef, useState } from "react";

export const SCROLL_PRESETS = {
  snappy:    { stiffness: 0.22, damping: 0.72, wheelThreshold: 20, label: "Snappy" },
  smooth:    { stiffness: 0.10, damping: 0.82, wheelThreshold: 35, label: "Smooth" },
  bouncy:    { stiffness: 0.18, damping: 0.65, wheelThreshold: 25, label: "Bouncy" },
  heavy:     { stiffness: 0.06, damping: 0.88, wheelThreshold: 40, label: "Heavy" },
  tight:     { stiffness: 0.25, damping: 0.80, wheelThreshold: 15, label: "Tight" },
  elastic:   { stiffness: 0.14, damping: 0.58, wheelThreshold: 30, label: "Elastic" },
  silk:      { stiffness: 0.08, damping: 0.90, wheelThreshold: 30, label: "Silk" },
  mechanical:{ stiffness: 0.30, damping: 0.85, wheelThreshold: 10, label: "Mechanical" },
} as const;
export type PresetKey = keyof typeof SCROLL_PRESETS;

export type SpringSubscribe = (cb: (p: number) => void) => () => void;

/**
 * `getLength` reports how many items the spring is currently navigating. It is a
 * getter rather than a number because the wheel's list changes at runtime (see
 * lib/wheelLanes.ts) and every clamp below must use the length as of *now* —
 * a captured number would let the spring walk off the end of a shorter lane.
 * Defaults to an unbounded-above spring only for callers that never filter.
 */
export function useSpring(s: number, d: number, getLength?: () => number) {
  const lenRef = useRef(getLength);
  lenRef.current = getLength;
  /** Highest seat that exists right now; never negative, so an empty list clamps to 0. */
  const maxIndex = useCallback(() => Math.max(0, (lenRef.current?.() ?? Infinity) - 1), []);

  const sRef = useRef(s); sRef.current = s;
  const dRef = useRef(d); dRef.current = d;
  const targetRef = useRef(0);
  const posRef = useRef(0);
  const velRef = useRef(0);
  const nudgeRef = useRef(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const subscribersRef = useRef<Set<(p: number) => void>>(new Set());

  const notify = useCallback((p: number) => {
    subscribersRef.current.forEach((cb) => cb(p));
  }, []);

  const commitIndex = useCallback(() => {
    const next = Math.max(0, Math.min(maxIndex(), Math.round(posRef.current)));
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  }, [maxIndex]);

  const tick = useCallback(() => {
    const force = (targetRef.current - posRef.current) * sRef.current;
    velRef.current = (velRef.current + force) * dRef.current;
    posRef.current += velRef.current;

    // Decay elastic nudge
    nudgeRef.current *= 0.85;
    if (Math.abs(nudgeRef.current) < 0.001) nudgeRef.current = 0;

    const settled = Math.abs(posRef.current - targetRef.current) < 0.001 && Math.abs(velRef.current) < 0.001;
    if (settled && nudgeRef.current === 0) {
      posRef.current = targetRef.current; velRef.current = 0;
      notify(targetRef.current);
      commitIndex();
      rafRef.current = 0;
      return;
    }
    notify(posRef.current + nudgeRef.current);
    commitIndex();
    rafRef.current = requestAnimationFrame(tick);
  }, [notify, commitIndex]);

  const start = useCallback(() => { if (rafRef.current) return; rafRef.current = requestAnimationFrame(tick); }, [tick]);

  const go = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(maxIndex(), targetRef.current + delta));
    if (next === targetRef.current) return;
    targetRef.current = next; start();
  }, [start, maxIndex]);

  const nudge = useCallback((amount: number) => {
    nudgeRef.current = Math.max(-0.15, Math.min(0.15, nudgeRef.current + amount));
    start();
  }, [start]);

  const jumpTo = useCallback((idx: number) => { targetRef.current = Math.max(0, Math.min(maxIndex(), idx)); start(); }, [start, maxIndex]);

  // Synchronous snap — no RAF, no animation. Use for URL hydration so React
  // state is consistent from the very first render cycle.
  const snapTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(maxIndex(), idx));
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    targetRef.current = clamped;
    posRef.current = clamped;
    velRef.current = 0;
    nudgeRef.current = 0;
    indexRef.current = clamped;
    setIndex(clamped);
    notify(clamped);
  }, [notify, maxIndex]);

  const subscribe = useCallback((cb: (p: number) => void) => {
    subscribersRef.current.add(cb);
    cb(posRef.current + nudgeRef.current);
    return () => { subscribersRef.current.delete(cb); };
  }, []);

  const getPos = useCallback(() => posRef.current + nudgeRef.current, []);
  const getVel = useCallback(() => velRef.current, []);

  useEffect(() => {
    posRef.current = targetRef.current; velRef.current = 0; nudgeRef.current = 0;
    indexRef.current = Math.round(targetRef.current);
    setIndex(indexRef.current);
    notify(targetRef.current);
    rafRef.current = 0;
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } };
  }, [notify]);

  return { index, subscribe, getPos, getVel, go, nudge, jumpTo, snapTo, targetRef };
}
