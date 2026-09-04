"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { humanoids, type Humanoid } from "@/data/humanoids";

// ── Card wall ───────────────────────────────────────────────────────────────
// Every card on one plane. Zoom is the navigation: pull back and the index is
// a texture, push in and a card becomes an object with a name, then with specs.
// The other views stop being separate screens and start being zoom levels.

const CARD_W = 220;                 // world units — the plane scales, not the card
const CARD_H = Math.round((CARD_W * 4) / 3);
const LABEL_H = 44;
const COL_GAP = 34;
const ROW_GAP = 44;
const JITTER = 26;                  // ± world-unit wobble so the grid breathes

const MIN_Z = 0.16;
const MAX_Z = 2.2;
const FIT_PAD = 64;

// Detail thresholds — the whole idea of the view lives in these two numbers.
const Z_LABEL = 0.42;
const Z_SPECS = 0.95;

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

type SortKey = "index" | "year" | "height" | "manufacturer";

interface Placed { h: Humanoid; x: number; y: number; }

export default function CardWall({
  isDev = false,
  onSelect,
}: {
  isDev?: boolean;
  onSelect?: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);

  const [vw, setVw] = useState(1440);
  const [vh, setVh] = useState(900);
  const [colOverride, setColOverride] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("index");
  const [jitter, setJitter] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  // Only the *level* is React state — it changes a handful of times, unlike z.
  const [detail, setDetail] = useState<0 | 1 | 2>(1);

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

  // Columns default to whatever makes the plane the same shape as the window,
  // so "fit" fills the glass instead of leaving a column of white on each side.
  const cols = useMemo(() => {
    if (colOverride) return colOverride;
    const cellW = CARD_W + COL_GAP;
    const cellH = CARD_H + LABEL_H + ROW_GAP;
    const n = humanoids.length;
    const ideal = Math.sqrt((n * cellH * vw) / (cellW * vh));
    return Math.max(3, Math.min(12, Math.round(ideal)));
  }, [colOverride, vw, vh]);

  const layout = useMemo(() => {
    const list = humanoids.slice().sort((a, b) => {
      if (sort === "year") return (a.year ?? 9999) - (b.year ?? 9999);
      if (sort === "height") return (b.height ?? 0) - (a.height ?? 0);
      if (sort === "manufacturer") return a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name);
      return 0;
    });

    const cellW = CARD_W + COL_GAP;
    const cellH = CARD_H + LABEL_H + ROW_GAP;
    const placed: Placed[] = list.map((h, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jx = jitter ? (hash01(h.id + "x") * 2 - 1) * JITTER : 0;
      const jy = jitter ? (hash01(h.id + "y") * 2 - 1) * JITTER : 0;
      return { h, x: col * cellW + jx, y: row * cellH + jy };
    });

    const rows = Math.ceil(list.length / cols);
    return {
      placed,
      width: cols * cellW - COL_GAP + JITTER * 2,
      height: rows * cellH - ROW_GAP + JITTER * 2,
    };
  }, [cols, sort, jitter]);

  // ── Camera. z + pan live in refs; one transform paints the plane. ──────────
  const z = useRef(0.5);
  const px = useRef(0);
  const py = useRef(0);
  const zT = useRef(0.5);
  const pxT = useRef(0);
  const pyT = useRef(0);
  const raf = useRef(0);
  const detailRef = useRef<0 | 1 | 2>(1);

  const paint = useCallback(() => {
    const p = planeRef.current;
    if (p) p.style.transform = `translate3d(${px.current}px,${py.current}px,0) scale(${z.current})`;
    const level: 0 | 1 | 2 = z.current >= Z_SPECS ? 2 : z.current >= Z_LABEL ? 1 : 0;
    if (level !== detailRef.current) {
      detailRef.current = level;
      setDetail(level);
    }
  }, []);

  const tick = useCallback(() => {
    const dz = zT.current - z.current;
    const dx = pxT.current - px.current;
    const dy = pyT.current - py.current;
    if (Math.abs(dz) < 0.0005 && Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) {
      z.current = zT.current; px.current = pxT.current; py.current = pyT.current;
      paint();
      raf.current = 0;
      return;
    }
    z.current += dz * 0.2;
    px.current += dx * 0.2;
    py.current += dy * 0.2;
    paint();
    raf.current = requestAnimationFrame(tick);
  }, [paint]);

  const start = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  }, [tick]);

  // Zoom about a screen point, so the thing under the cursor stays put.
  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    const nz = Math.max(MIN_Z, Math.min(MAX_Z, zT.current * factor));
    const k = nz / zT.current;
    pxT.current = sx - (sx - pxT.current) * k;
    pyT.current = sy - (sy - pyT.current) * k;
    zT.current = nz;
    start();
  }, [start]);

  const fit = useCallback(() => {
    const nz = Math.max(MIN_Z, Math.min(MAX_Z, Math.min((vw - FIT_PAD * 2) / layout.width, (vh - FIT_PAD * 2) / layout.height)));
    zT.current = nz;
    pxT.current = (vw - layout.width * nz) / 2;
    pyT.current = (vh - layout.height * nz) / 2;
    start();
  }, [vw, vh, layout.width, layout.height, start]);

  // Fit once the viewport is measured, and again whenever the plane resizes.
  useEffect(() => { fit(); }, [fit]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      // Pinch on a trackpad arrives as ctrl+wheel; a plain wheel zooms too,
      // because this view has exactly one gesture and it's zoom. Scrolling up
      // pushes in, which is the direction every map does it.
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), sx, sy);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Drag to pan, 1:1 under the finger.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let dragging = false;
    let moved = 0;
    let lastX = 0, lastY = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      pxT.current += dx; pyT.current += dy;
      px.current = pxT.current; py.current = pyT.current;
      paint();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "grab";
      // A drag isn't a click — swallow the card tap if the plane actually moved.
      if (moved > 6) el.dataset.dragged = "1";
      else delete el.dataset.dragged;
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

  // Zoom the plane so one card fills the view — the "open a card" move.
  const focus = useCallback((p: Placed) => {
    if (viewportRef.current?.dataset.dragged) return;
    const nz = Math.min(MAX_Z, (vh - 160) / (CARD_H + LABEL_H));
    zT.current = nz;
    pxT.current = vw / 2 - (p.x + CARD_W / 2) * nz;
    pyT.current = vh / 2 - (p.y + (CARD_H + LABEL_H) / 2) * nz;
    start();
    onSelect?.(p.h.id);
  }, [vw, vh, start, onSelect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "0" || e.key === "f") fit();
      else if (e.key === "=" || e.key === "+") zoomAt(1.35, vw / 2, vh / 2);
      else if (e.key === "-") zoomAt(1 / 1.35, vw / 2, vh / 2);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fit, zoomAt, vw, vh]);

  return (
    <div
      ref={viewportRef}
      className="h-screen w-full overflow-hidden relative bg-white select-none"
      style={{ cursor: "grab", touchAction: "none" }}
    >
      <div
        ref={planeRef}
        className="absolute top-0 left-0"
        style={{ width: layout.width, height: layout.height, transformOrigin: "0 0", willChange: "transform" }}
      >
        {layout.placed.map((p) => (
          <div
            key={p.h.id}
            className="absolute"
            style={{ left: p.x, top: p.y, width: CARD_W, cursor: "pointer" }}
            onClick={() => focus(p)}
          >
            <div
              className="relative overflow-hidden"
              style={{ width: CARD_W, height: CARD_H, borderRadius: 6, background: "#FAFAFA" }}
            >
              {p.h.imageUrl && (
                <Image
                  src={p.h.imageUrl}
                  alt={p.h.name}
                  fill
                  className={p.h.imageFit === "cover" ? "object-cover" : "object-contain"}
                  style={{ objectPosition: p.h.imagePosition ?? "center", padding: p.h.imageFit === "cover" ? 0 : 14 }}
                  sizes={`${CARD_W * 2}px`}
                />
              )}
            </div>

            {/* Text fades in by zoom level — nothing is rendered you can't read */}
            <div style={{ height: LABEL_H, paddingTop: 8, opacity: detail >= 1 ? 1 : 0, transition: "opacity 200ms ease-out" }}>
              <p className="truncate" style={{ fontSize: 15, fontWeight: 500, color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {p.h.name}
              </p>
              <p
                className="truncate tabular-nums"
                style={{ fontSize: 13, color: "var(--c-ink)", opacity: detail >= 2 ? 0.45 : 0, letterSpacing: "-0.01em", lineHeight: 1.3, transition: "opacity 200ms ease-out" }}
              >
                {[p.h.manufacturer, p.h.year, p.h.height ? `${p.h.height}cm` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Title + zoom hint */}
      <div className="absolute pointer-events-none" style={{ left: 16, top: 20 }}>
        <p style={{ fontSize: 12, color: "var(--c-ink)", fontWeight: 500, letterSpacing: "-0.02em" }}>Wall</p>
        <p style={{ fontSize: 12, color: "var(--c-ink-muted)", letterSpacing: "-0.01em" }}>
          {layout.placed.length} cards · scroll to zoom, drag to pan
        </p>
      </div>

      <button
        onClick={fit}
        className="absolute cursor-pointer bg-transparent border-0"
        style={{ left: 16, bottom: 18, fontSize: 12, color: "var(--c-ink-muted)" }}
      >
        Fit ⌥ 0
      </button>

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
          <p className="text-[12px] tracking-widest uppercase text-neutral-400 font-medium">Card wall</p>
          <div>
            <label className="text-neutral-500 flex justify-between">Columns <span className="tabular-nums text-neutral-400">{cols}</span></label>
            <input type="range" min={3} max={12} value={cols} onChange={(e) => setColOverride(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["index", "year", "height", "manufacturer"] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2 py-1 rounded-full cursor-pointer ${sort === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button className="text-neutral-500 cursor-pointer block" onClick={() => setJitter((v) => !v)}>Jitter: {jitter ? "on" : "off"}</button>
          <p className="text-neutral-400">Detail level: {detail}</p>
        </div>
      )}
    </div>
  );
}
