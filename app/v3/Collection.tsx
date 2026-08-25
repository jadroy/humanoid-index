"use client";

import { spinFrameUrl } from "@/components/SpinViewer";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./v3.css";
import DetailPanel from "./DetailPanel";
import SuggestPanel, { type SuggestConfig } from "./SuggestPanel";
import type { DetailItem } from "./CollectionDetail";

/* ===========================================================================
   Collection — a reusable "grey card collection" layout.

   Feed it any list of items (robots, drones, headsets, …) mapped to the generic
   CollectionItem shape, plus a small config, and you get the whole experience:
   calm grey rounded tiles, responsive grid, sticky grid-aligned nav, hover-swap
   media, optional 360° spin, true-to-size toggle, carousel view, and the
   c / C / a / 1–8 tuning shortcuts (d replays the entry intro, D cycles the
   start pose — bloom / rise / pop / soft — and o cycles the landing order —
   ripple / wave / sweep / shuffle; bloom×ripple is the default).

   To make a new collection: write an adapter (yourData -> CollectionItem[]) and
   a CollectionConfig, then <Collection items={...} config={...} />.
   =========================================================================== */

export type HoverMedia = { url: string; fit?: "contain" | "cover"; position?: string };

export type CollectionItem = {
  id: string;
  title: string;
  subtitle?: string;              // second line (maker, brand, …)
  image: string;                  // primary render
  imageFit?: "contain" | "cover"; // default "contain"
  imagePosition?: string;         // "ground" (default) | "center" | "bottom" | CSS object-position
  imageScale?: number;            // manual size nudge (default 1)
  price?: string;                 // top-right value; if absent, badge shows
  badge?: string;                 // small-caps label when there's no price
  meta?: string;                  // muted third line (specs)
  href?: string;                  // where the card links
  hover?: HoverMedia;             // image flashed on hover (alt render / scene)
  size?: number;                  // real-world size, drives "true to size"
  spin?: { path: string; frames: number; scale?: number }; // turntable frames
};

export type CollectionConfig = {
  logo?: string;        // logo image URL (left of nav)
  title?: string;       // text label if no logo / used for aria + link
  href?: string;        // logo link
  blurb?: string | string[]; // centered nav blurb — an array renders as stacked lines (first soft, rest faint)
  sizeLabel?: string;   // true-to-size button text; omit to hide the toggle
  suggest?: SuggestConfig; // ghost "+" card at the end of the grid; omit to hide
  navLink?: { label: string; href: string }; // always-visible nav pill (e.g. link back to the classic view)
};

/* The tuning surface (carousel / centered / true-to-size pills, c/C/a/d/D/o/1–8
   shortcuts, the indicator) is a dev tool, not part of the visitor experience —
   production ships the one calm non-configurable layout. */
const TUNING = process.env.NODE_ENV === "development";

/* ---- tuning pools (universal, cycled by keyboard) ------------------------ */

const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const TILE_OPTIONS: { name: string; bg: string }[] = (() => {
  const opts: { name: string; bg: string }[] = [];
  for (let l = 249; l >= 225; l -= 2) {
    for (const t of [1, 0, 3, -2, 5, -4, 7, 10]) {
      const hex = `#${hx(l - t * 0.5)}${hx(l)}${hx(l + t * 0.7)}`;
      opts.push({ name: hex, bg: hex });
    }
  }
  return opts; // ~104 greys, no shadow
})();
const ASPECT_OPTIONS = ["4 / 5", "1 / 1", "5 / 6", "3 / 4", "2 / 3", "5 / 7", "4 / 3", "3 / 2"];

// Selection sentinel for the ghost "+" card — never collides with item ids.
const SUGGEST_ID = "__suggest__";

/* ---- entry intros: variants of "cards find their formation" --------------
   FLIP-style: cards render in their final grid slots, each is measured, given
   a starting transform, then released into place via CSS transitions. Each
   variant only decides WHERE cards start and WHEN each one lands — the
   skeleton (measure → transform → flush → release) is shared, so every intro
   works at any column count / viewport.
   Keys: "d" replays, "D" cycles the start pose, "o" cycles the landing order. */

type IntroCtx = {
  i: number; n: number;       // card index / total count
  dx: number; dy: number;     // vector from this tile's center to viewport center
  dist: number; maxDist: number; // maxDist = largest dist among on-screen cards
  r: DOMRect; vw: number; vh: number;
};
/* An intro = a START POSE × a LANDING ORDER — two independent axes.
   The pose family owns the feel (where cards come from, timing, easing);
   the order owns the choreography (which card lands when). Every combination
   works, so a "set" for a new pose is free: 4 poses × 4 orders = 16 intros. */
type IntroStart = {
  name: string;
  hold: number;   // beat before the first card moves
  ms: number;     // per-card flight time
  ease: string;
  start: (c: IntroCtx) => { transform: string; opacity?: number };
  stackZ?: boolean; // pile-style z ordering (first card on top)
};
type IntroOrder = {
  name: string;
  delay: (c: IntroCtx) => number; // per-card landing offset (added to hold)
};

const tiltOf = (i: number) => ((i * 137.5) % 14) - 7; // deterministic ±7°

/* Index 0 of each pool is the default — the page loads with bloom×ripple,
   the "everything emanates from the center" combo Roy picked. */
const INTRO_STARTS: IntroStart[] = [
  {
    // The default: cards pop up in place, drifting in from the center a touch.
    name: "bloom", hold: 80, ms: 600, ease: "cubic-bezier(0.34, 1.3, 0.5, 1)",
    start: ({ dx, dy }) => ({ transform: `translate(${dx * 0.14}px, ${dy * 0.14}px) scale(0.4)`, opacity: 0 }),
  },
  {
    // Round-two winner: cards float up from below the fold, slight tilt.
    name: "rise", hold: 120, ms: 640, ease: "cubic-bezier(0.3, 1.12, 0.36, 1)",
    start: ({ i, r, vh }) => ({
      transform: `translate(0px, ${Math.max(80, vh - r.top + 80)}px) rotate(${tiltOf(i) * 0.35}deg)`,
    }),
  },
  {
    // Bloom without the drift: a pure in-place scale pop.
    name: "pop", hold: 60, ms: 560, ease: "cubic-bezier(0.34, 1.3, 0.5, 1)",
    start: () => ({ transform: "scale(0.6)", opacity: 0 }),
  },
  {
    // Short faded lift, no tilt — the quietest possible entrance.
    name: "soft", hold: 40, ms: 560, ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    start: () => ({ transform: "translate(0px, 44px)", opacity: 0 }),
  },
];

const INTRO_ORDERS: IntroOrder[] = [
  { name: "ripple", delay: ({ dist, maxDist }) => Math.min(dist / maxDist, 1) * 480 }, // outward from center (default)
  { name: "wave", delay: ({ i, n }) => i * Math.min(35, 700 / n) },                    // grid order
  { name: "sweep", delay: ({ r, vw }) => ((r.left + r.width / 2) / vw) * 400 },        // columns, left → right
  { name: "shuffle", delay: ({ i, n }) => (((i * 137.5) % n) / n) * 520 },             // scrambled — a gentle boil
];

/* Sizing + placement for an image layer. Contain renders get a fixed height so
   items read at a consistent scale; they ground low with headroom, unless the
   position flag says "bottom" (flush) or "center". Cover photos fill the tile. */
export function layerStyle(fit: "contain" | "cover", position: string, scale = 1): React.CSSProperties {
  if (fit === "cover") {
    return { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position };
  }
  const base: React.CSSProperties = {
    position: "absolute",
    height: `${Math.round(82 * scale)}%`,
    width: "auto",
    maxWidth: "94%",
    objectFit: "contain",
    left: "50%",
  };
  if (position.includes("bottom")) return { ...base, bottom: 0, transform: "translateX(-50%)" };
  if (position === "center") return { ...base, top: "50%", transform: "translate(-50%, -50%)" };
  return { ...base, bottom: "3%", transform: "translateX(-50%)" };
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  fontFamily: "inherit",
  fontSize: "var(--fs)",
  fontWeight: "var(--fw)" as React.CSSProperties["fontWeight"],
  letterSpacing: "var(--tracking)",
  whiteSpace: "nowrap",
  color: active ? "var(--ink)" : "var(--ink-soft)",
  border: "1px solid var(--hairline)",
  borderRadius: 9999,
  padding: "4px 12px",
  background: active ? "var(--tile)" : "transparent",
  cursor: "pointer",
  transition: "color 0.15s ease, background 0.15s ease",
});

/* `embedded` is the collection branch's mode: the grid dropped inside another
   page that already has its own chrome (the floating sidebar). It drops the
   sticky header, scrolls inside its own box instead of the document, and hands
   clicks to `onPick` rather than opening a detail panel or following the href.
   The suggest card goes too — asking for a robot is the host's Feedback row's
   job. Everything else below the header is untouched — same tiles, same intro, same
   hover swap. */
export default function Collection({ items, config, details, initialSel, embedded = false, onPick }: { items: CollectionItem[]; config: CollectionConfig; details?: Record<string, DetailItem>; initialSel?: string; embedded?: boolean; onPick?: (id: string) => void }) {
  // The tuning surface is dev-only anyway, and embedded it would be a second
  // set of single-key shortcuts fighting the host page's own.
  const tuning = TUNING && !embedded;
  const suggest = embedded ? undefined : config.suggest;
  const refSize = useMemo(() => Math.max(1, ...items.map((i) => i.size ?? 0)), [items]);
  const canSize = !!config.sizeLabel && items.some((i) => i.size != null);

  const [trueToSize, setTrueToSize] = useState(false);
  const [carousel, setCarousel] = useState(false);
  const [centered, setCentered] = useState(false);
  const [cols, setCols] = useState<number | null>(null);
  const [tileIdx, setTileIdx] = useState(0);
  const [aspectIdx, setAspectIdx] = useState(0);

  /* Inline detail panel — clicking a card opens a sticky side column instead of
     navigating away. Grid drops one column to make room; the grid stays alive. */
  const [sel, setSel] = useState<string | null>(initialSel ?? null);
  const [baseCols, setBaseCols] = useState(5);
  const canPanel = !!details && !carousel;
  // Only the open panel reads baseCols; without details there is no panel.
  useEffect(() => {
    if (!details) return;
    const compute = () => {
      const w = window.innerWidth;
      setBaseCols(w >= 1280 ? 5 : w >= 960 ? 4 : w >= 640 ? 3 : 2);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [!!details]); // eslint-disable-line react-hooks/exhaustive-deps
  const selIdx = sel != null ? items.findIndex((i) => i.id === sel) : -1;
  const selDetail = sel && selIdx >= 0 ? details?.[sel] : undefined;
  // The ghost "+" card selects a sentinel id and opens the suggest form in the
  // same side column — one interaction, two kinds of content.
  const suggestOpen = canPanel && sel === SUGGEST_ID && !!suggest;
  const panelOpen = (canPanel && !!selDetail) || suggestOpen;
  /* Every selection change goes through changeSel, which snapshots card
     positions first — the FLIP effect below then glides the grid between
     column counts instead of letting it snap.
     Measured via offsetLeft/Top/Width (LAYOUT positions), not
     getBoundingClientRect: client rects include any in-flight transform
     (entry intro, a previous FLIP release), so a snapshot taken mid-animation
     would invent deltas for cards that hadn't moved.
     Keyed by child INDEX, never by item id — children order is stable across
     a selection change, and an id-based map once collided with the suggest
     card's index fallback (String(28) === Domo's id "28"), teleporting Domo's
     snapshot to the suggest card's slot on every step. */
  const flipRects = useRef<{ arr: { l: number; t: number; w: number }[]; sx: number; sy: number } | null>(null);
  const changeSel = (next: string | null) => {
    const grid = gridRef.current;
    if (grid) {
      flipRects.current = {
        arr: (Array.from(grid.children) as HTMLElement[]).map((el) => ({ l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth })),
        sx: window.scrollX,
        sy: window.scrollY,
      };
    }
    setSel(next);
  };
  const stepSel = (d: number) => {
    if (selIdx < 0) return;
    changeSel(items[(selIdx + d + items.length) % items.length].id);
  };
  // Close the panel if we switch into a view that can't host it (carousel).
  useEffect(() => { if (carousel) setSel(null); }, [carousel]);
  /* Deeplink sync — ?h=<id> mirrors the open panel so the current view is
     shareable straight from the address bar; closing the panel cleans the URL,
     so "share the site" stays possible (the lesson from the main page). */
  useEffect(() => {
    // Embedded, the address bar belongs to the host page — which deliberately
    // keeps it clean while you browse. Writing ?h= from in here would undo that.
    if (embedded) return;
    const url = new URL(window.location.href);
    if (sel && sel !== SUGGEST_ID) url.searchParams.set("h", sel);
    else url.searchParams.delete("h");
    window.history.replaceState(null, "", url);
  }, [sel]);
  // Columns while the panel is open: one fewer than the current base, so tiles
  // keep roughly their size and the freed slot becomes the panel's column.
  const gridColsStyle = panelOpen
    ? { gridTemplateColumns: `repeat(${Math.max(2, (cols ?? baseCols) - 1)}, minmax(0, 1fr))` }
    : cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;
  useEffect(() => {
    if (!tuning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Never hijack typing (e.g. the suggest form's field).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "c") { setTileIdx((i) => (i + 1) % TILE_OPTIONS.length); return; }
      if (e.key === "C") { setTileIdx((i) => (i - 1 + TILE_OPTIONS.length) % TILE_OPTIONS.length); return; }
      if (e.key === "a" || e.key === "A") { setAspectIdx((i) => (i + 1) % ASPECT_OPTIONS.length); return; }
      if (e.key === "d") { setDealKey((k) => k + 1); return; }
      if (e.key === "D") { setStartIdx((i) => (i + 1) % INTRO_STARTS.length); return; }
      if (e.key === "o" || e.key === "O") { setOrderIdx((i) => (i + 1) % INTRO_ORDERS.length); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 8) setCols(n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const tile = TILE_OPTIONS[tileIdx];
  const aspect = ASPECT_OPTIONS[aspectIdx];
  const blurbLines = config.blurb ? (Array.isArray(config.blurb) ? config.blurb : [config.blurb]) : [];

  /* Entry intro. useLayoutEffect so the starting transforms land before first
     paint — the grid never flashes in its final formation. The grid ships with
     .v3-deal-pending (cards hidden) so pre-hydration HTML doesn't flash either. */
  const gridRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [dealKey, setDealKey] = useState(0);
  const [startIdx, setStartIdx] = useState(0);
  const [orderIdx, setOrderIdx] = useState(0);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return; // carousel view — no grid mounted
    const cards = Array.from(grid.children) as HTMLElement[];
    const header = headerRef.current;
    const reveal = () => {
      grid.classList.remove("v3-deal-pending");
      header?.classList.remove("v3-nav-pending");
    };
    if (!cards.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }
    const intro = INTRO_STARTS[startIdx];
    const order = INTRO_ORDERS[orderIdx];
    // No scrolling — the intro plays around whatever viewport you're looking at.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const n = cards.length;

    // Measure every tile first — dist-ordered intros need the full set.
    const ctxs: IntroCtx[] = cards.map((el, i) => {
      const tileEl = el.querySelector<HTMLElement>(".v3-grid-tile");
      const r = (tileEl ?? el).getBoundingClientRect();
      const dx = vw / 2 - (r.left + r.width / 2);
      const dy = vh / 2 - (r.top + r.height / 2);
      return { i, n, dx, dy, dist: Math.hypot(dx, dy), maxDist: 1, r, vw, vh };
    });
    // Normalize distance against ON-SCREEN cards only. Otherwise far below-fold
    // cards dominate the scale and the visible choreography compresses into the
    // first fraction of the timeline — the intro seems to "land down the page".
    // Offscreen cards clamp to the max delay and settle together, unseen.
    const visible = ctxs.filter((c) => c.r.bottom > 0 && c.r.top < vh);
    const maxDist = Math.max(1, ...(visible.length ? visible : ctxs).map((c) => c.dist));
    ctxs.forEach((c) => (c.maxDist = maxDist));

    cards.forEach((el, i) => {
      const s = intro.start(ctxs[i]);
      el.style.transition = "none";
      el.style.transform = s.transform;
      el.style.opacity = s.opacity != null ? String(s.opacity) : "";
      el.style.zIndex = intro.stackZ ? String(n - i) : "";
      el.style.willChange = "transform";
    });
    // Nav settles alongside: logo → blurb → pills fade down in a small stagger
    // while the cards hold, so the frame is in place as the content arrives.
    const navEls = header
      ? (Array.from(header.querySelectorAll(":scope > div > *")) as HTMLElement[])
      : [];
    navEls.forEach((el) => {
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
    });
    grid.classList.add("v3-dealing"); // hides labels during the intro
    reveal();
    void grid.offsetHeight; // flush: commits the start pose as the transitions' "from" state (no rAF — fires even in occluded tabs)

    grid.classList.remove("v3-dealing"); // labels fade back in (CSS delay)
    navEls.forEach((el, i) => {
      el.style.transition = `opacity 450ms ease ${i * 70}ms, transform 450ms ${intro.ease} ${i * 70}ms`;
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    let lastLanding = 0;
    cards.forEach((el, i) => {
      const delay = Math.round(intro.hold + order.delay(ctxs[i]));
      lastLanding = Math.max(lastLanding, delay + intro.ms);
      el.style.transition =
        `transform ${intro.ms}ms ${intro.ease} ${delay}ms, ` +
        `opacity ${Math.round(intro.ms * 0.55)}ms ease ${delay}ms`;
      el.style.transform = "none";
      el.style.opacity = "1";
    });
    const done = window.setTimeout(() => {
      [...cards, ...navEls].forEach((el) => {
        el.style.transition = "";
        el.style.transform = "";
        el.style.opacity = "";
        el.style.zIndex = "";
        el.style.willChange = "";
      });
    }, lastLanding + 100);
    return () => {
      clearTimeout(done);
      grid.classList.remove("v3-dealing");
    };
  }, [dealKey, startIdx, orderIdx, carousel]);

  /* Panel reflow — measure→invert→play. When the panel opens/closes the column
     count changes; each card starts at its old slot (snapshotted in changeSel)
     and glides to the new one. Stepping ←/→ doesn't reflow, so every delta is
     zero and nothing plays.
     Uses the Web Animations API rather than the intro's inline-style/transition
     dance: animate() owns the whole lifecycle (no forced flush, no cleanup
     timer, nothing for a later style write to clobber) and leaves no inline
     styles behind. */
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const snap = flipRects.current;
    flipRects.current = null;
    if (!grid || !snap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Scroll can shift between snapshot and release (scroll anchoring follows
    // the clicked card through the reflow) — compensate so deltas stay
    // viewport-true and cards glide from where you actually saw them.
    const dsx = snap.sx - window.scrollX;
    const dsy = snap.sy - window.scrollY;
    const children = Array.from(grid.children) as HTMLElement[];
    if (children.length !== snap.arr.length) return; // children changed — indexes don't line up, skip
    children.forEach((el, i) => {
      const old = snap.arr[i];
      if (!old) return;
      const dx = old.l - el.offsetLeft + dsx;
      const dy = old.t - el.offsetTop + dsy;
      const s = old.w / (el.offsetWidth || 1);
      // 1.5px floor swallows offsetLeft/Top integer rounding noise.
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5 && Math.abs(s - 1) < 0.005) return;
      el.getAnimations().forEach((a) => { if (a.id === "v3-flip") a.cancel(); }); // rapid re-toggle: restart cleanly
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: "top left" },
          { transform: "none", transformOrigin: "top left" },
        ],
        { id: "v3-flip", duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  return (
    <main
      className={`v3-root${embedded ? " v3-embedded scrollbar-hide" : ""}`}
      style={{
        ["--grid-tile"]: tile.bg,
        ["--tile-aspect"]: aspect,
        // Embedded the grid is its own scroll container: the host page locks
        // document scrolling for its spring wheel, and v3.css only unlocks it
        // for a standalone .v3-root.
        ...(embedded ? { height: "100%", minHeight: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", background: "transparent" } : null),
      } as React.CSSProperties}
    >
      {/* ---------------------------------------------------------------- Nav */}
      {!embedded && (
      <header ref={headerRef} className="sticky top-0 z-30 v3-nav-pending" style={{ background: "rgba(255,255,255,0.86)", backdropFilter: "blur(8px)" }}>
        <div
          className="v3-cols items-start"
          style={{
            paddingLeft: "var(--page-x)",
            paddingRight: "var(--page-x)",
            // Top-aligned: logo, blurb block, and pills all hang from the same
            // top line; extra blurb lines grow the bar downward past min-height.
            minHeight: 52,
            paddingTop: 12,
            paddingBottom: 12,
            // Mirror the card grid's column override so nav stays aligned at any count.
            ...(cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : null),
          }}
        >
          <a href={config.href ?? "#"} aria-label={config.title ?? "Home"} className="flex items-center" style={{ gridColumn: "1", gridRow: "1", justifySelf: "start" }}>
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt={config.title ?? ""} style={{ height: 15, width: "auto" }} />
            ) : (
              <span className="v3-eyebrow" style={{ color: "var(--ink-soft)" }}>{config.title}</span>
            )}
          </a>
          {blurbLines.length > 0 && (
            <div className="v3-label" style={{ gridColumn: "2", gridRow: "1", justifySelf: "start", whiteSpace: "nowrap" }}>
              {blurbLines.map((line, i) => (
                <div key={i} className={i === 0 ? "v3-label--soft" : "v3-label--faint"}>{line}</div>
              ))}
            </div>
          )}
          <div className="flex items-center" style={{ gap: 8, gridColumn: "1 / -1", gridRow: "1", justifySelf: "end" }}>
            {tuning && (
              <>
                <button onClick={() => setCarousel((v) => !v)} title="Horizontal swipe carousel" style={pillStyle(carousel)}>
                  Carousel
                </button>
                <button onClick={() => setCentered((v) => !v)} title="Center items in the tile instead of grounding them" style={pillStyle(centered)}>
                  Centered
                </button>
                {canSize && (
                  <button onClick={() => setTrueToSize((v) => !v)} title="Scale each item to its real relative size" style={pillStyle(trueToSize)}>
                    {config.sizeLabel}
                  </button>
                )}
              </>
            )}
            {config.navLink && (
              <a href={config.navLink.href} style={pillStyle(false)}>{config.navLink.label}</a>
            )}
          </div>
        </div>
      </header>
      )}

      {/* --------------------------------------------------------------- Grid */}
      <section style={{ paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)", paddingTop: embedded ? 56 : 44, paddingBottom: 96 }}>
        {carousel ? (
          <div
            className="v3-scroller"
            style={{
              marginLeft: "calc(var(--page-x) * -1)",
              marginRight: "calc(var(--page-x) * -1)",
              paddingLeft: "var(--page-x)",
              paddingRight: "var(--page-x)",
              scrollPaddingLeft: "var(--page-x)", // snap respects the page margin (keeps 1st card aligned with logo)
              paddingBottom: 12,
            }}
          >
            {items.map((it) => (
              <div key={it.id} className="v3-snap" style={{ width: "min(400px, 74vw)" }}>
                <Card item={it} trueToSize={trueToSize} refSize={refSize} centered={centered} />
              </div>
            ))}
            {suggest && (
              <div className="v3-snap" style={{ width: "min(400px, 74vw)" }}>
                {/* No panel in carousel view — the card falls back to its mailto href. */}
                <SuggestCard cfg={suggest} />
              </div>
            )}
          </div>
        ) : (
          <div className={`v3-stage${panelOpen ? " v3-stage--open" : ""}`}>
            {panelOpen && (
              <div className="v3-panel-wrap">
                {suggestOpen && suggest ? (
                  <SuggestPanel cfg={suggest} onClose={() => changeSel(null)} />
                ) : selDetail ? (
                  <DetailPanel
                    item={selDetail}
                    config={config}
                    index={selIdx}
                    total={items.length}
                    onClose={() => changeSel(null)}
                    onPrev={() => stepSel(-1)}
                    onNext={() => stepSel(1)}
                  />
                ) : null}
              </div>
            )}
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div ref={gridRef} className="v3-grid v3-cols v3-deal-pending" style={gridColsStyle}>
                {items.map((it) => (
                  <Card
                    key={it.id}
                    item={it}
                    trueToSize={trueToSize}
                    refSize={refSize}
                    centered={centered}
                    selected={panelOpen && sel === it.id}
                    onOpen={canPanel ? () => changeSel(it.id) : onPick ? () => onPick(it.id) : undefined}
                    openHint={!canPanel && onPick ? "Open" : undefined}
                  />
                ))}
                {suggest && (
                  <SuggestCard
                    cfg={suggest}
                    selected={suggestOpen}
                    onOpen={canPanel ? () => changeSel(SUGGEST_ID) : undefined}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tuning indicator — appears once you use a shortcut. */}
      {tuning && (cols !== null || tileIdx !== 0 || aspectIdx !== 0 || startIdx !== 0 || orderIdx !== 0) && (
        <div
          className="v3-eyebrow"
          style={{
            position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 40,
            textAlign: "center", lineHeight: 1.5, color: "var(--ink-soft)", background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)", border: "1px solid var(--hairline)", borderRadius: 14, padding: "6px 14px",
          }}
        >
          <div>{cols ?? "auto"} col · {aspect} · {tile.name} · {INTRO_STARTS[startIdx].name}×{INTRO_ORDERS[orderIdx].name}</div>
          <div style={{ opacity: 0.55, marginTop: 2 }}>grey {tileIdx + 1}/{TILE_OPTIONS.length} · 1–8, c/C, a · d replay, D pose {startIdx + 1}/{INTRO_STARTS.length}, o order {orderIdx + 1}/{INTRO_ORDERS.length}</div>
        </div>
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- Suggest -- */

/* Plain click runs `fn` in place of the link; modifier / middle click keeps
   the href so a card still opens its full page in a new tab. */
const plainClick = (fn?: () => void) =>
  fn &&
  ((e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    fn();
  });

/* Ghost "+" card at the end of the grid — an empty slot inviting a suggestion.
   Plain click opens the suggest panel; modifier-click / carousel view fall
   back to the mailto href, same interception pattern as Card. */
function SuggestCard({ cfg, selected, onOpen }: { cfg: SuggestConfig; selected?: boolean; onOpen?: () => void }) {
  const href = `mailto:${cfg.email}?subject=${encodeURIComponent(cfg.subject ?? cfg.label)}`;

  return (
    <a
      href={href}
      onClick={plainClick(onOpen)}
      aria-current={selected ? "true" : undefined}
      className={`v3-card v3-suggest block${selected ? " v3-card--selected" : ""}`}
    >
      <div className="v3-grid-tile v3-suggest-tile" style={{ aspectRatio: "var(--tile-aspect, 4 / 5)" }}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex items-baseline justify-between" style={{ marginTop: 12, gap: 12 }}>
        <span className="v3-label v3-label--soft">{cfg.label}</span>
      </div>
    </a>
  );
}

/* ------------------------------------------------------------------- Card -- */

function Card({ item, trueToSize, refSize, centered, selected, onOpen, openHint }: { item: CollectionItem; trueToSize: boolean; refSize: number; centered: boolean; selected?: boolean; onOpen?: () => void; openHint?: string }) {
  const spin = item.spin;
  const hover = spin ? null : item.hover;
  const scale = trueToSize && item.size ? item.size / refSize : item.imageScale ?? 1;
  const spinScale = trueToSize && item.size ? (item.size / refSize) * (spin?.scale ?? 1) : spin?.scale;
  // Ground by default; center when toggled — but respect explicit positions (e.g. "bottom" crops).
  const pos = item.imagePosition ?? (centered ? "center" : "ground");

  return (
    <a
      href={item.href ?? "#"}
      onClick={plainClick(onOpen)}
      aria-current={selected ? "true" : undefined}
      className={`v3-card block group${hover ? " v3-card--swap" : ""}${selected ? " v3-card--selected" : ""}`}
    >
      <div className="v3-grid-tile" style={{ position: "relative", aspectRatio: "var(--tile-aspect, 4 / 5)", overflow: "hidden" }}>
        {spin ? (
          <SpinTile path={spin.path} frames={spin.frames} name={item.title} scale={spinScale} centered={centered} />
        ) : (
          <>
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="v3-media v3-media--primary"
                src={item.image}
                alt={item.title}
                loading="lazy"
                style={layerStyle(item.imageFit ?? "contain", pos, scale)}
              />
            )}
            {hover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="v3-media v3-media--secondary"
                src={hover.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                style={layerStyle(hover.fit ?? "cover", hover.position ?? "center")}
              />
            )}
          </>
        )}
        {onOpen && <span className="v3-detail-hint">{openHint ?? "Details"}</span>}
      </div>

      <div className="flex items-baseline justify-between" style={{ marginTop: 12, gap: 12 }}>
        <span className="v3-label">{item.title}</span>
        {item.price ? (
          <span className="v3-label v3-label--faint" style={{ whiteSpace: "nowrap" }}>{item.price}</span>
        ) : item.badge ? (
          <span className="v3-label v3-label--faint" style={{ whiteSpace: "nowrap" }}>{item.badge}</span>
        ) : null}
      </div>

      {item.subtitle && <div className="v3-label v3-label--soft" style={{ marginTop: 3 }}>{item.subtitle}</div>}
      {item.meta && (
        <div className="v3-label v3-label--faint" style={{ marginTop: 4 }}>{item.meta}</div>
      )}
    </a>
  );
}

/* Turntable tile — front frame at rest, auto-rotates through frames on hover. */
// Frame sets already warmed this session. Embedded, the grid remounts every
// time it opens, and re-issuing 30 requests per open is pure churn.
const spinPreloaded = new Set<string>();

function SpinTile({ path, frames, name, scale, centered }: { path: string; frames: number; name: string; scale?: number; centered?: boolean }) {
  // The frame index changes 24× a second while hovered, so it goes straight
  // to the <img> through a ref — never through React state.
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hovered = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!spinPreloaded.has(path)) {
      spinPreloaded.add(path);
      for (let i = 0; i < frames; i++) new Image().src = spinFrameUrl(path, i);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [path, frames]);

  const show = (i: number) => { if (imgRef.current) imgRef.current.src = spinFrameUrl(path, i); };
  const start = () => {
    hovered.current = true;
    let i = 0;
    let last = performance.now();
    const fps = 24;
    const tick = (now: number) => {
      if (!hovered.current) return;
      if (now - last >= 1000 / fps) {
        i = (i + 1) % frames;
        show(i);
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    hovered.current = false;
    cancelAnimationFrame(rafRef.current);
    show(0);
  };

  return (
    <div onMouseEnter={start} onMouseLeave={stop} style={{ position: "absolute", inset: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        className="v3-media"
        src={spinFrameUrl(path, 0)}
        alt={name}
        style={{
          ...layerStyle("contain", centered ? "center" : "ground", scale ?? 1),
          // The turntable frames carry their own floor; sit a touch below the
          // ground line so the feet don't float above the other tiles'.
          ...(centered ? null : { bottom: "-3%" }),
        }}
      />
      <span className="v3-spin-badge">360°</span>
    </div>
  );
}
