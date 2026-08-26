"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LaunchMedia } from "@/data/humanoids";

/**
 * Small launch poster that lives in a corner of the card. Sits still until you
 * point at it, then plays the clip in place; clicking opens the maker's launch
 * post. Drag it and it settles into whichever corner you let go nearest, the way
 * a picture-in-picture window does.
 *
 * The clip is mounted only on intent — the poster is a ~14KB still, so scrolling
 * past a card with launch media costs nothing extra until someone reaches for it.
 *
 * Position is driven entirely by `transform`, and during a drag the transform is
 * written straight to the node rather than through React, so a drag never
 * re-renders the card it sits on.
 */

type Corner = "tl" | "tr" | "bl" | "br";

/** Dismissals persist while the page lives, so scrolling a card out of view and
 *  back doesn't resurrect a chip someone just closed. The same robot can be on
 *  screen twice (left and right compare slots), so closing one has to tell the
 *  other — hence the listener set rather than plain component state. */
const dismissed = new Set<string>();
const dismissListeners = new Set<() => void>();
function dismiss(id: string) {
  dismissed.add(id);
  dismissListeners.forEach((l) => l());
}

const SETTLE = "transform 420ms cubic-bezier(0.34, 1.28, 0.5, 1)";
/** Past this much movement a pointer-up is a drop, not a click. */
const DRAG_SLOP = 4;

export default function LaunchChip({
  id,
  launch,
  name,
  corner = "tr",
  width = 54,
  inset = 14,
}: {
  id: string;
  launch: LaunchMedia;
  name: string;
  corner?: Corner;
  width?: number;
  inset?: number;
}) {
  const height = Math.round(width * (16 / 9));

  const frameRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [spot, setSpot] = useState<Corner>(corner);
  const [active, setActive] = useState(false);
  const [wantsVideo, setWantsVideo] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [gone, setGone] = useState(() => dismissed.has(id));
  const [coarse, setCoarse] = useState(false);

  // Live drag bookkeeping — deliberately outside React.
  const drag = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0, moved: 0, on: false });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onDismiss = () => setGone(dismissed.has(id));
    dismissListeners.add(onDismiss);
    return () => {
      dismissListeners.delete(onDismiss);
    };
  }, [id]);

  // Without hover there's nothing to reveal the close control, so show it outright.
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Corner coordinates depend on the card's size, so track it.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cornerXY = useCallback(
    (c: Corner) => {
      const right = Math.max(inset, box.w - width - inset);
      const bottom = Math.max(inset, box.h - height - inset);
      return {
        x: c === "tl" || c === "bl" ? inset : right,
        y: c === "tl" || c === "tr" ? inset : bottom,
      };
    },
    [box.w, box.h, width, height, inset],
  );

  // Park the chip on its corner whenever that corner (or the card) changes.
  useLayoutEffect(() => {
    const el = chipRef.current;
    if (!el || drag.current.on || !box.w) return;
    const { x, y } = cornerXY(spot);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, [spot, box.w, box.h, cornerXY]);

  const engage = useCallback(() => {
    setActive(true);
    if (!launch.video || reduceMotion) return;
    setWantsVideo(true);
    videoRef.current?.play().catch(() => {});
  }, [launch.video, reduceMotion]);

  const release = useCallback(() => {
    setActive(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (!wantsVideo || !active) return;
    videoRef.current?.play().catch(() => {});
  }, [wantsVideo, active]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = chipRef.current;
    if (!el || !box.w) return;
    // The card underneath runs its own pointer handling for scrub/compare.
    e.stopPropagation();
    const { x, y } = cornerXY(spot);
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: x, baseY: y, moved: 0, on: true };
    el.style.transition = "none";
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = chipRef.current;
    if (!d.on || !el) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    // Keep the chip inside the card while it's in hand.
    const x = Math.min(Math.max(d.baseX + dx, inset), Math.max(inset, box.w - width - inset));
    const y = Math.min(Math.max(d.baseY + dy, inset), Math.max(inset, box.h - height - inset));
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = chipRef.current;
    if (!d.on || !el) return;
    d.on = false;
    setDragging(false);
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }

    // Settle into whichever corner the chip's centre ended up closest to.
    const rect = el.getBoundingClientRect();
    const frame = frameRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - frame.left;
    const cy = rect.top + rect.height / 2 - frame.top;
    const next: Corner = `${cy < box.h / 2 ? "t" : "b"}${cx < box.w / 2 ? "l" : "r"}` as Corner;

    el.style.transition = reduceMotion ? "none" : SETTLE;
    const { x, y } = cornerXY(next);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    setSpot(next);
  };

  const label = launch.label ?? "Launch";
  const showClose = coarse || active || dragging;

  if (gone) return null;

  return (
    <div ref={frameRef} className="absolute inset-0 z-[7] pointer-events-none overflow-hidden">
      <div
        ref={chipRef}
        className="absolute top-0 left-0 pointer-events-auto"
        style={{ width, height, touchAction: "none", willChange: "transform" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <a
          href={launch.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch the ${name} launch`}
          draggable={false}
          onMouseEnter={engage}
          onMouseLeave={release}
          onFocus={engage}
          onBlur={release}
          onClick={(e) => {
            // A drag that happens to end on the chip isn't a click.
            if (drag.current.moved > DRAG_SLOP) e.preventDefault();
            drag.current.moved = 0;
          }}
          className="relative block w-full h-full overflow-hidden"
          style={{
            borderRadius: 10,
            background: "#f2f2f2",
            cursor: dragging ? "grabbing" : "pointer",
            boxShadow:
              active || dragging
                ? "0 2px 6px rgba(0,0,0,0.10), 0 10px 26px rgba(0,0,0,0.14)"
                : "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.08)",
            transform: dragging ? "scale(1.08)" : active ? "scale(1.04)" : "scale(1)",
            transition:
              "transform 220ms cubic-bezier(0.4,0,0.2,1), box-shadow 220ms cubic-bezier(0.4,0,0.2,1)",
            textDecoration: "none",
          }}
        >
          <button
            type="button"
            aria-label={`Dismiss the ${name} launch clip`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(id);
            }}
            className="absolute z-[2] flex items-center justify-center"
            style={{
              top: 4,
              right: 4,
              width: 16,
              height: 16,
              borderRadius: 999,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              opacity: showClose ? 1 : 0,
              pointerEvents: showClose ? "auto" : "none",
              transition: "opacity 180ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M1 1l6 6M7 1l-6 6" />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={launch.poster}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {wantsVideo && launch.video && (
            <video
              ref={videoRef}
              src={launch.video}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: active ? 1 : 0,
                transition: "opacity 260ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          )}

          {/* Keeps the label legible over whatever frame is underneath. */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "58%",
              background: "linear-gradient(to top, rgba(0,0,0,0.60), rgba(0,0,0,0))",
            }}
          />

          {/* Glyph rides with the label rather than over the subject — at this size
              a centred play button covers the very thing it's advertising. */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center"
            style={{
              gap: 3,
              paddingBottom: 6,
              fontSize: 9.5,
              fontWeight: 550,
              letterSpacing: "0.02em",
              lineHeight: 1,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            <svg
              width="6"
              height="6"
              viewBox="0 0 8 8"
              fill="currentColor"
              aria-hidden
              style={{
                opacity: active && wantsVideo ? 0 : 1,
                transition: "opacity 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <path d="M1.5 0.8 L7 4 L1.5 7.2 Z" />
            </svg>
            {label}
          </div>
        </a>
      </div>
    </div>
  );
}
