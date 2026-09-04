"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { humanoids, type Humanoid } from "@/data/humanoids";

// ── Scale field ─────────────────────────────────────────────────────────────
// Every robot standing on one ground line, drawn at its real height. The only
// view where the data is the geometry: a 29cm desk bot next to a 192cm Atlas,
// with a 175cm person in the line for reference. Sorted short → tall so the
// silhouette of the whole field reads as a ramp.

const HUMAN_CM = 175;
const GROUND_PAD = 96;    // ground line to bottom of viewport
const TOP_PAD = 88;       // headroom above the tallest robot
const GAP = 26;           // between figures
const EDGE_PAD = 120;
const LABEL_H = 34;

type Sort = "height" | "year" | "name";

interface Figure {
  h: Humanoid | null;      // null = the human reference
  cm: number;
  x: number;
  w: number;
  fh: number;              // drawn height in px
}

export default function ScaleField({
  isDev = false,
  onSelect,
}: {
  isDev?: boolean;
  onSelect?: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [vw, setVw] = useState(1440);
  const [vh, setVh] = useState(900);
  const [sort, setSort] = useState<Sort>("height");
  const [showHuman, setShowHuman] = useState(true);
  const [showRules, setShowRules] = useState(true);
  const [silhouette, setSilhouette] = useState(false);
  const [widthScale, setWidthScale] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = viewportRef.current;
      if (!el) return;
      setVw(el.clientWidth);
      setVh(el.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const layout = useMemo(() => {
    const list = humanoids.filter((h) => h.height);
    const sorted = list.slice().sort((a, b) => {
      if (sort === "height") return a.height! - b.height!;
      if (sort === "year") return (a.year ?? 9999) - (b.year ?? 9999) || a.height! - b.height!;
      return a.name.localeCompare(b.name);
    });

    const tallestCm = Math.max(HUMAN_CM, ...sorted.map((h) => h.height!));
    const groundY = vh - GROUND_PAD;
    // One px-per-cm for the whole field — the moment this varies per figure the
    // view is lying, so it's derived once from the tallest thing on the line.
    const pxPerCm = Math.max(0.6, (groundY - TOP_PAD) / tallestCm);

    // Each figure gets a box as wide as a 3:4 card at its own height, so short
    // robots take less floor than tall ones — the field itself becomes a chart.
    const widthFor = (cm: number) => Math.max(44, cm * pxPerCm * 0.62 * widthScale);

    const entries: { h: Humanoid | null; cm: number }[] = sorted.map((h) => ({ h, cm: h.height! }));
    if (showHuman) {
      // The human slots in where it belongs under the current sort.
      const at = sort === "height" ? entries.findIndex((e) => e.cm > HUMAN_CM) : entries.length;
      entries.splice(at < 0 ? entries.length : at, 0, { h: null, cm: HUMAN_CM });
    }

    let x = EDGE_PAD;
    const figures: Figure[] = entries.map(({ h, cm }) => {
      const w = widthFor(cm);
      const f: Figure = { h, cm, x, w, fh: cm * pxPerCm };
      x += w + GAP;
      return f;
    });

    const width = x - GAP + EDGE_PAD;
    // Rules every 50cm, plus one on the human.
    const rules: { cm: number; label: string }[] = [];
    for (let cm = 50; cm <= tallestCm; cm += 50) rules.push({ cm, label: `${cm}cm` });

    return { figures, width, groundY, pxPerCm, rules, tallestCm };
  }, [vh, sort, showHuman, widthScale]);

  const maxOffset = Math.max(0, layout.width - vw);

  // ── Scroll: offset in refs, track moves by transform (same rig as the rail) ─
  const offset = useRef(0);
  const target = useRef(0);
  const raf = useRef(0);
  const maxRef = useRef(maxOffset); maxRef.current = maxOffset;

  const paint = useCallback(() => {
    const t = trackRef.current;
    if (t) t.style.transform = `translate3d(${-offset.current}px,0,0)`;
  }, []);

  const tick = useCallback(() => {
    const d = target.current - offset.current;
    if (Math.abs(d) < 0.15) {
      offset.current = target.current;
      paint();
      raf.current = 0;
      return;
    }
    offset.current += d * 0.18;
    paint();
    raf.current = requestAnimationFrame(tick);
  }, [paint]);

  const start = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  }, [tick]);

  const scrubBy = useCallback((dx: number) => {
    target.current = Math.max(0, Math.min(maxRef.current, target.current + dx));
    start();
  }, [start]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      scrubBy(d * 2.2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrubBy]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true; lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      target.current = Math.max(0, Math.min(maxRef.current, target.current - dx));
      offset.current = target.current;
      paint();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [paint]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrubBy(320);
      else if (e.key === "ArrowLeft") scrubBy(-320);
      else if (e.key === "Home") { target.current = 0; start(); }
      else if (e.key === "End") { target.current = maxRef.current; start(); }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrubBy, start]);

  useEffect(() => {
    target.current = Math.max(0, Math.min(maxOffset, target.current));
    offset.current = target.current;
    paint();
  }, [maxOffset, layout.width, paint]);

  return (
    <div
      ref={viewportRef}
      className="h-screen w-full overflow-hidden relative bg-white select-none"
      style={{ cursor: "grab", touchAction: "pan-y" }}
    >
      {/* Height rules — static, they belong to the room, not to the rail */}
      {showRules && layout.rules.map(({ cm, label }) => (
        <div
          key={cm}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: layout.groundY - cm * layout.pxPerCm }}
        >
          <div style={{ height: 1, background: "var(--c-ink-subtle)", opacity: 0.35 }} />
          <span
            className="absolute tabular-nums"
            style={{ left: 16, top: -16, fontSize: 12, color: "var(--c-ink-subtle)", letterSpacing: "-0.01em" }}
          >
            {label}
          </span>
        </div>
      ))}

      {/* Moving field */}
      <div
        ref={trackRef}
        className="absolute top-0 left-0 h-full"
        style={{ width: layout.width, willChange: "transform" }}
      >
        {layout.figures.map((f) => {
          const key = f.h ? f.h.id : "__human";
          const isHuman = !f.h;
          const isHovered = hovered === key;
          const dim = hovered !== null && !isHovered;
          return (
            <div
              key={key}
              className="absolute"
              style={{
                left: f.x,
                top: layout.groundY - f.fh,
                width: f.w,
                height: f.fh,
                opacity: dim ? 0.32 : 1,
                transition: "opacity 180ms ease-out",
                cursor: isHuman ? "default" : "pointer",
              }}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
              onClick={() => f.h && onSelect?.(f.h.id)}
            >
              {isHuman ? (
                <HumanMark />
              ) : f.h!.imageUrl ? (
                <Image
                  src={f.h!.imageUrl!}
                  alt={f.h!.name}
                  fill
                  className="object-contain"
                  style={{
                    objectPosition: "bottom center",
                    filter: silhouette ? "grayscale(1) brightness(0) opacity(0.82)" : undefined,
                  }}
                  sizes={`${Math.round(f.w)}px`}
                />
              ) : null}

              {/* Label under the ground line — height first, it's the point */}
              <div
                className="absolute text-center"
                style={{ top: f.fh + 12, left: 0, width: f.w, height: LABEL_H }}
              >
                <p
                  className="tabular-nums"
                  style={{ fontSize: 12, color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2, fontWeight: 500 }}
                >
                  {f.cm}
                </p>
                <p
                  className="truncate"
                  style={{ fontSize: 12, color: "var(--c-ink)", opacity: isHovered ? 0.8 : 0.4, letterSpacing: "-0.02em", lineHeight: 1.3, transition: "opacity 180ms ease-out" }}
                >
                  {isHuman ? "Person" : f.h!.name}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ground line */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: layout.groundY, height: 1, background: "var(--c-ink-body)", opacity: 0.55 }}
      />

      {/* Title block */}
      <div className="absolute pointer-events-none" style={{ left: 16, top: 20 }}>
        <p style={{ fontSize: 12, color: "var(--c-ink)", fontWeight: 500, letterSpacing: "-0.02em" }}>Scale</p>
        <p style={{ fontSize: 12, color: "var(--c-ink-muted)", letterSpacing: "-0.01em" }}>
          {layout.figures.length} figures · one ground line · drawn to height
        </p>
      </div>

      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: 90, background: "linear-gradient(90deg,#fff,rgba(255,255,255,0))" }} />
      <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ width: 90, background: "linear-gradient(270deg,#fff,rgba(255,255,255,0))" }} />

      {isDev && (
        <button
          className="fixed bottom-4 right-4 z-50 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-400 text-[14px] cursor-pointer transition-colors"
          onClick={() => setShowPanel((v) => !v)}
        >
          ⚙
        </button>
      )}
      {isDev && showPanel && (
        <div className="fixed bottom-14 right-4 z-50 w-60 bg-white border border-neutral-200 rounded-lg p-4 shadow-lg space-y-3" style={{ fontSize: 12 }}>
          <p className="text-[12px] tracking-widest uppercase text-neutral-400 font-medium">Scale field</p>
          <div className="flex gap-1">
            {(["height", "year", "name"] as Sort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2 py-1 rounded-full cursor-pointer ${sort === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div>
            <label className="text-neutral-500 flex justify-between">Spacing <span className="tabular-nums text-neutral-400">{widthScale.toFixed(2)}×</span></label>
            <input type="range" min={60} max={160} value={Math.round(widthScale * 100)} onChange={(e) => setWidthScale(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
          </div>
          <button className="text-neutral-500 cursor-pointer block" onClick={() => setShowHuman((v) => !v)}>Human reference: {showHuman ? "on" : "off"}</button>
          <button className="text-neutral-500 cursor-pointer block" onClick={() => setShowRules((v) => !v)}>Height rules: {showRules ? "on" : "off"}</button>
          <button className="text-neutral-500 cursor-pointer block" onClick={() => setSilhouette((v) => !v)}>Silhouettes: {silhouette ? "on" : "off"}</button>
        </div>
      )}
    </div>
  );
}

// A plain person at 175cm — a flat mark, deliberately not a competing image.
function HumanMark() {
  return (
    <svg viewBox="0 0 46 175" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" style={{ opacity: 0.2 }}>
      <g fill="none" stroke="var(--c-ink)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="23" cy="14" r="10" />
        <path d="M23 25 V96" />
        <path d="M23 34 L8 62 M23 34 L38 62" />
        <path d="M23 96 L12 172 M23 96 L34 172" />
      </g>
    </svg>
  );
}
