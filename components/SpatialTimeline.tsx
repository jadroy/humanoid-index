"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { humanoids } from "@/data/humanoids";
import CarouselCard from "@/components/carousel/CarouselCard";

// ── Spatial timeline ────────────────────────────────────────────────────────
// One long horizontal rail read left to right. Y is free — cards drop into
// lanes with a per-robot wobble so a year reads as a scatter, not a grid.
//
// X has two honesty settings. "true" gives every year the same width, which is
// literally accurate and costs you four blank screens across 2003–2012.
// "paced" (the default) gives each year the width its robots actually need and
// collapses dead stretches into a marked break — the axis says out loud that
// it skipped nine years instead of making you scroll through them.

type Pace = "paced" | "true";

const LABEL_H = 36;        // name + manufacturer under the card image
const CARD_GAP_X = 20;     // minimum horizontal breathing room inside a lane
const LANE_GAP = 20;
const JITTER_MAX = 64;     // ± vertical wobble, deterministic per robot
const AXIS_H = 92;         // reserved strip at the bottom for the year rule
const EDGE_PAD = 200;      // slack before the first year / after the last
const SKIP_W = 280;        // width of a collapsed run of empty years
const QUIET_W = 170;       // width of a single empty year
const YEAR_GUTTER = 110;   // empty air between one year's cluster and the next

// Deterministic 0..1 from an id, so the scatter never reshuffles between renders.
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

interface Placed {
  h: (typeof humanoids)[number];
  x: number;
  y: number;
}

// A year that holds robots, an empty year, or a collapsed run of empty years.
interface Segment {
  kind: "year" | "skip";
  x: number;
  w: number;
  year?: number;
  from?: number;
  to?: number;
  count: number;
}

export default function SpatialTimeline({
  allCaps,
  isDev = false,
  startYear,
  onSelect,
}: {
  allCaps?: boolean;
  isDev?: boolean;
  startYear?: number;      // open the rail centred on this year
  onSelect?: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [vw, setVw] = useState(1440);
  const [vh, setVh] = useState(900);
  const [pace, setPace] = useState<Pace>("paced");
  const [laneOverride, setLaneOverride] = useState<number | null>(null);
  const [air, setAir] = useState(1);        // multiplies every year's width
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
    const dated = humanoids.filter((h) => h.year).slice().sort((a, b) => (a.year! - b.year!) || a.name.localeCompare(b.name));
    const minYear = dated[0]?.year ?? 2000;
    const maxYear = dated[dated.length - 1]?.year ?? 2026;

    // Lane count and card width fall out of the height budget together: three
    // lanes only earn their keep if the cards stay big enough to read.
    const bandTop = 60;
    const availH = Math.max(240, vh - bandTop - AXIS_H);
    const widthFor = (n: number) => ((availH - (n - 1) * LANE_GAP) / n - LABEL_H - JITTER_MAX) * 0.75;
    // Lanes are chosen by what keeps the cards big, not the other way round:
    // a short window gets one lane of large cards that wander vertically,
    // a tall one stacks two or three. Small cards were the whole complaint.
    const lanes = laneOverride ?? (widthFor(3) >= 180 ? 3 : widthFor(2) >= 150 ? 2 : 1);
    const cardW = Math.round(Math.max(120, Math.min(240, widthFor(lanes))));
    const cardH = Math.round((cardW * 4) / 3) + LABEL_H;
    const laneH = (availH - (lanes - 1) * LANE_GAP) / lanes;
    // Whatever height the lane doesn't spend on the card becomes wander room.
    const jitter = Math.min(JITTER_MAX, Math.max(0, (laneH - cardH) / 2));
    const slot = cardW + CARD_GAP_X;

    const byYear = new Map<number, typeof dated>();
    for (const h of dated) {
      const list = byYear.get(h.year!) ?? [];
      list.push(h);
      byYear.set(h.year!, list);
    }
    const countFor = (y: number) => byYear.get(y)?.length ?? 0;

    // A populated year is exactly as wide as its robots need — that's what
    // stops the dense end from stacking on itself.
    const yearWidth = (y: number) => {
      const k = countFor(y);
      if (!k) return QUIET_W * air;
      return Math.ceil(k / lanes) * slot * air + YEAR_GUTTER;
    };
    const maxCount = Math.max(...Array.from(byYear.values(), (l) => l.length));
    const evenWidth = Math.ceil(maxCount / lanes) * slot * air + YEAR_GUTTER;

    // Walk the years once, laying down segments left to right.
    const segments: Segment[] = [];
    let cursor = EDGE_PAD;
    for (let y = minYear; y <= maxYear; ) {
      if (pace === "true") {
        segments.push({ kind: "year", x: cursor, w: evenWidth, year: y, count: countFor(y) });
        cursor += evenWidth;
        y++;
        continue;
      }
      if (countFor(y)) {
        const w = yearWidth(y);
        segments.push({ kind: "year", x: cursor, w, year: y, count: countFor(y) });
        cursor += w;
        y++;
        continue;
      }
      // Run of empty years — two or more collapse into a marked break.
      let end = y;
      while (end <= maxYear && !countFor(end)) end++;
      const run = end - y;
      if (run >= 2) {
        segments.push({ kind: "skip", x: cursor, w: SKIP_W, from: y, to: end - 1, count: 0 });
        cursor += SKIP_W;
      } else {
        const w = QUIET_W * air;
        segments.push({ kind: "year", x: cursor, w, year: y, count: 0 });
        cursor += w;
      }
      y = end;
    }

    const segFor = new Map<number, Segment>();
    for (const s of segments) if (s.kind === "year" && s.year != null) segFor.set(s.year, s);
    const xForYear = (y: number) => {
      const s = segFor.get(y);
      return s ? s.x + s.w / 2 : EDGE_PAD;
    };

    // Lane skyline. A card takes a lane at random from the ones already clear
    // at its x — that randomness is what keeps sparse years from marching
    // along a single top row. If nothing is clear the card slides right rather
    // than landing on top of a neighbour: cards never overlap, full stop.
    const skyline = new Array(lanes).fill(-Infinity);
    const placed: Placed[] = [];

    for (const s of segments) {
      if (s.kind !== "year" || !s.count) continue;
      const list = byYear.get(s.year!)!;
      const k = list.length;
      const inner = s.w - YEAR_GUTTER;
      list.forEach((h, i) => {
        const cx = k === 1 ? s.x + s.w / 2 : s.x + YEAR_GUTTER / 2 + ((i + 0.5) / k) * inner;
        let x = Math.round(cx - cardW / 2);
        const free: number[] = [];
        for (let l = 0; l < lanes; l++) if (skyline[l] + CARD_GAP_X <= x) free.push(l);
        let lane: number;
        if (free.length) {
          lane = free[Math.floor(hash01(h.id + "lane") * free.length) % free.length];
        } else {
          lane = 0;
          for (let l = 1; l < lanes; l++) if (skyline[l] < skyline[lane]) lane = l;
          x = Math.round(skyline[lane] + CARD_GAP_X);
        }
        skyline[lane] = x + cardW;
        const wobble = Math.round((hash01(h.id) * 2 - 1) * jitter);
        const y = Math.round(bandTop + lane * (laneH + LANE_GAP) + (laneH - cardH) / 2 + wobble);
        placed.push({ h, x, y });
      });
    }

    const width = Math.max(cursor + EDGE_PAD, ...placed.map((p) => p.x + cardW + EDGE_PAD));

    return { placed, segments, width, minYear, maxYear, cardW, cardH, lanes, xForYear, axisY: vh - AXIS_H, newestYear: maxYear, step: evenWidth };
  }, [vh, laneOverride, pace, air]);

  const maxOffset = Math.max(0, layout.width - vw);

  // ── Scrolling: offset lives in refs, the track moves by transform. Nothing
  // per-frame goes through React. ────────────────────────────────────────────
  const offset = useRef(0);
  const target = useRef(0);
  const raf = useRef(0);
  const maxRef = useRef(maxOffset); maxRef.current = maxOffset;

  // A single year can be wider than the screen, so its own label scrolls away
  // while you're still inside it. This pins the year to the left of the axis
  // whenever that happens — written straight to the DOM, never through state.
  const stickyRef = useRef<HTMLDivElement>(null);
  const segsRef = useRef(layout.segments); segsRef.current = layout.segments;
  const vwRef = useRef(vw); vwRef.current = vw;

  const paint = useCallback(() => {
    const t = trackRef.current;
    if (t) t.style.transform = `translate3d(${-offset.current}px,0,0)`;
    const el = stickyRef.current;
    if (!el) return;
    const probe = offset.current + 100;
    const seg = segsRef.current.find((s) => probe >= s.x && probe < s.x + s.w);
    // Hide it while the cluster's own centred label is on screen.
    const ownLabelX = seg ? seg.x + seg.w / 2 - offset.current : 0;
    const show = !!seg && seg.kind === "year" && !!seg.count && (ownLabelX < 90 || ownLabelX > vwRef.current - 90);
    el.style.opacity = show ? "1" : "0";
    if (show && seg?.year != null) el.textContent = String(seg.year);
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

  // Set the moment the reader takes over, so a resize stops re-centring on
  // startYear and just holds where they are.
  const userMoved = useRef(false);

  const scrubBy = useCallback((dx: number) => {
    userMoved.current = true;
    target.current = Math.max(0, Math.min(maxRef.current, target.current + dx));
    start();
  }, [start]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Either axis drives the rail — trackpads swipe sideways, mice don't.
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      scrubBy(d * 2.2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrubBy]);

  // Drag to pull the rail along.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true; lastX = e.clientX;
      userMoved.current = true;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      target.current = Math.max(0, Math.min(maxRef.current, target.current - dx));
      offset.current = target.current;  // 1:1 under the finger
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
      if (e.key === "ArrowRight") scrubBy(layout.step);
      else if (e.key === "ArrowLeft") scrubBy(-layout.step);
      else if (e.key === "Home") { userMoved.current = true; target.current = 0; start(); }
      else if (e.key === "End") { userMoved.current = true; target.current = maxRef.current; start(); }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrubBy, start, layout.step]);

  // Re-clamp and repaint when the geometry changes under us. Geometry settles a
  // frame or two after mount, so startYear has to re-land rather than latch on
  // the first, pre-measure pass.
  useEffect(() => {
    if (!userMoved.current && startYear) {
      target.current = layout.xForYear(startYear) - vw / 2;
    }
    target.current = Math.max(0, Math.min(maxOffset, target.current));
    offset.current = target.current;
    paint();
  }, [maxOffset, layout, vw, startYear, paint]);

  const axisTop = layout.axisY - 10;

  return (
    <div
      ref={viewportRef}
      className="h-full w-full overflow-hidden relative bg-white select-none"
      style={{ cursor: "grab", touchAction: "pan-y" }}
    >
      {/* Moving rail — cards, plumb lines and the axis all ride one transform */}
      <div
        ref={trackRef}
        className="absolute top-0 left-0 h-full"
        style={{ width: layout.width, willChange: "transform" }}
      >
        {/* Axis: solid under years, dashed across a collapsed break */}
        {layout.segments.map((s) => (
          <div
            key={`rule-${s.kind}-${s.year ?? s.from}`}
            className="absolute pointer-events-none"
            style={{
              left: s.x,
              width: s.w,
              top: axisTop,
              height: 1,
              background: s.kind === "skip"
                ? "repeating-linear-gradient(90deg, var(--c-ink-subtle) 0 3px, transparent 3px 9px)"
                : "var(--c-ink-subtle)",
            }}
          />
        ))}

        {/* Year ticks and break labels */}
        {layout.segments.map((s) => {
          const cx = s.x + s.w / 2;
          if (s.kind === "skip") {
            return (
              <div
                key={`skip-${s.from}`}
                className="absolute text-center"
                style={{ left: cx, top: axisTop + 16, transform: "translateX(-50%)", whiteSpace: "nowrap" }}
              >
                <div style={{ fontSize: 12, color: "var(--c-ink-subtle)", letterSpacing: "-0.01em" }}>
                  {s.to! - s.from! + 1} quiet years
                </div>
                <div className="tabular-nums" style={{ fontSize: 12, color: "var(--c-ink-subtle)", opacity: 0.7, marginTop: 2 }}>
                  {s.from}–{s.to}
                </div>
              </div>
            );
          }
          return (
            <div key={`y-${s.year}`} className="absolute" style={{ left: cx, top: axisTop, transform: "translateX(-50%)" }}>
              <div
                style={{
                  width: 1,
                  height: s.count ? 10 : 5,
                  margin: "0 auto",
                  background: s.count ? "var(--c-ink-muted)" : "var(--c-ink-subtle)",
                }}
              />
              <div
                className="tabular-nums text-center"
                style={{
                  marginTop: 10,
                  fontSize: s.count ? 15 : 12,
                  letterSpacing: "-0.02em",
                  color: s.count ? "var(--c-ink)" : "var(--c-ink-subtle)",
                  fontWeight: s.count ? 500 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {s.year}
              </div>
            </div>
          );
        })}

        {/* Cards */}
        {layout.placed.map(({ h, x, y }) => (
          <div
            key={h.id}
            className="absolute group"
            style={{ left: x, top: y, width: layout.cardW }}
            onClick={() => onSelect?.(h.id)}
          >
            {/* Plumb line down to the axis — the thing that makes the x legible */}
            <div
              className="absolute pointer-events-none transition-opacity duration-200 opacity-[0.13] group-hover:opacity-50"
              style={{
                left: "50%",
                top: layout.cardH,
                height: Math.max(0, axisTop - (y + layout.cardH)),
                width: 1,
                background: "var(--c-ink-muted)",
              }}
            />
            <CarouselCard humanoid={h} isNew={h.year === layout.newestYear} width={layout.cardW} allCaps={allCaps} />
          </div>
        ))}
      </div>

      {/* Year pinned to the axis while you're inside a wide cluster */}
      <div
        ref={stickyRef}
        className="absolute tabular-nums pointer-events-none"
        style={{
          left: 40,
          top: axisTop + 20,   // clears the tick mark, so it sits on the same baseline as the year labels
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--c-ink-subtle)",
          opacity: 0,
          transition: "opacity 220ms ease",
        }}
      />

      {/* Edge fades so cards dissolve rather than clip */}
      <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: 120, background: "linear-gradient(90deg,#fff,rgba(255,255,255,0))" }} />
      <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ width: 120, background: "linear-gradient(270deg,#fff,rgba(255,255,255,0))" }} />

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
          <p className="text-[12px] tracking-widest uppercase text-neutral-400 font-medium">Timeline</p>
          <div className="flex gap-1.5">
            {(["paced", "true"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPace(p)}
                className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${pace === p ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
              >
                {p === "paced" ? "Paced" : "True scale"}
              </button>
            ))}
          </div>
          <div>
            <label className="text-neutral-500 flex justify-between">Lanes <span className="tabular-nums text-neutral-400">{layout.lanes}</span></label>
            <input type="range" min={2} max={5} value={layout.lanes} onChange={(e) => setLaneOverride(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
          </div>
          <div>
            <label className="text-neutral-500 flex justify-between">Air <span className="tabular-nums text-neutral-400">{air.toFixed(2)}×</span></label>
            <input type="range" min={80} max={200} value={Math.round(air * 100)} onChange={(e) => setAir(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
          </div>
          <p className="text-neutral-400" style={{ fontSize: 11 }}>Rail: {Math.round(layout.width / 1000)}k px</p>
        </div>
      )}
    </div>
  );
}
