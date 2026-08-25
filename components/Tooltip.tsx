"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INVERSE, WEIGHT } from "@/lib/design/chrome";

type TooltipProps = {
  label: string;
  shortcut?: string;
  delay?: number;
  disabled?: boolean;
  children: React.ReactElement;
};

export function Tooltip({ label, shortcut, delay = 350, disabled, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const cancel = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const compute = () => {
    const anchor = anchorRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.left + r.width / 2 - tw / 2;
    let top = r.bottom + margin;
    if (top + th > vh - 8) top = Math.max(8, r.top - th - margin);
    left = Math.max(8, Math.min(vw - tw - 8, left));
    setCoords({ left, top });
  };

  useLayoutEffect(() => {
    if (!open) return;
    compute();
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => () => cancel(), []);
  useEffect(() => {
    if (disabled) { cancel(); setOpen(false); setCoords(null); }
  }, [disabled]);

  const handleEnter = () => {
    if (disabled) return;
    cancel();
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  };
  const handleLeave = () => { cancel(); setOpen(false); setCoords(null); };

  const childProps = (children.props ?? {}) as Record<string, unknown>;
  const cloned = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => { anchorRef.current = node; },
    onMouseEnter: (e: React.MouseEvent) => {
      handleEnter();
      (childProps.onMouseEnter as ((e: React.MouseEvent) => void) | undefined)?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleLeave();
      (childProps.onMouseLeave as ((e: React.MouseEvent) => void) | undefined)?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      handleEnter();
      (childProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleLeave();
      (childProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e);
    },
  } as Record<string, unknown>);

  return (
    <>
      {cloned}
      {mounted && open && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          className="pointer-events-none fixed select-none"
          style={{
            left: coords?.left ?? 0,
            top: coords?.top ?? 0,
            opacity: coords ? 1 : 0,
            transition: "opacity 120ms ease",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 8,
              // Inverted on purpose — see INVERSE in lib/design/chrome. A
              // tooltip has to read over a robot photo as easily as over the
              // page, and it is gone in a moment; the dark chip does both jobs
              // better than white glass does.
              background: INVERSE.surface,
              color: INVERSE.ink,
              fontFamily: "var(--font-geist-sans)",
              fontSize: 13,
              fontWeight: WEIGHT.label,
              lineHeight: 1,
              letterSpacing: "-0.005em",
              boxShadow: INVERSE.shadow,
              whiteSpace: "nowrap",
            }}
          >
            <span>{label}</span>
            {shortcut && (
              <span style={{ color: INVERSE.inkFaint, fontWeight: WEIGHT.body, fontSize: 12, marginLeft: 2 }}>
                {shortcut}
              </span>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
