"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ===========================================================================
   Collection — a reusable "grey card collection" layout.

   Feed it any list of items (robots, drones, headsets, …) mapped to the generic
   CollectionItem shape, plus a small config, and you get the whole experience:
   calm grey rounded tiles, responsive grid, sticky grid-aligned nav, hover-swap
   media, optional 360° spin, true-to-size toggle, carousel view, and the
   c / C / a / 1–8 tuning shortcuts.

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
  blurb?: string;       // centered nav blurb
  sizeLabel?: string;   // true-to-size button text; omit to hide the toggle
};

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
  fontSize: 12,
  whiteSpace: "nowrap",
  color: active ? "var(--ink)" : "var(--ink-soft)",
  border: "1px solid var(--hairline)",
  borderRadius: 9999,
  padding: "4px 12px",
  background: active ? "var(--tile)" : "transparent",
  cursor: "pointer",
  transition: "color 0.15s ease, background 0.15s ease",
});

export default function Collection({ items, config }: { items: CollectionItem[]; config: CollectionConfig }) {
  const refSize = useMemo(() => Math.max(1, ...items.map((i) => i.size ?? 0)), [items]);
  const canSize = !!config.sizeLabel && items.some((i) => i.size != null);

  const [trueToSize, setTrueToSize] = useState(false);
  const [carousel, setCarousel] = useState(false);
  const [centered, setCentered] = useState(false);
  const [cols, setCols] = useState<number | null>(null);
  const [tileIdx, setTileIdx] = useState(0);
  const [aspectIdx, setAspectIdx] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c") { setTileIdx((i) => (i + 1) % TILE_OPTIONS.length); return; }
      if (e.key === "C") { setTileIdx((i) => (i - 1 + TILE_OPTIONS.length) % TILE_OPTIONS.length); return; }
      if (e.key === "a" || e.key === "A") { setAspectIdx((i) => (i + 1) % ASPECT_OPTIONS.length); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 8) setCols(n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const tile = TILE_OPTIONS[tileIdx];
  const aspect = ASPECT_OPTIONS[aspectIdx];

  return (
    <main className="v3-root" style={{ ["--grid-tile"]: tile.bg, ["--tile-aspect"]: aspect } as React.CSSProperties}>
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-30" style={{ background: "rgba(255,255,255,0.86)", backdropFilter: "blur(8px)" }}>
        <div
          className="flex items-center justify-between"
          style={{ position: "relative", paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)", height: 52 }}
        >
          <a href={config.href ?? "#"} aria-label={config.title ?? "Home"} className="flex items-center">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt={config.title ?? ""} style={{ height: 12, width: "auto", opacity: 0.5 }} />
            ) : (
              <span className="v3-eyebrow" style={{ color: "var(--ink-soft)" }}>{config.title}</span>
            )}
          </a>
          {config.blurb && (
            <span
              style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", color: "var(--ink-soft)", fontSize: 12, whiteSpace: "nowrap" }}
            >
              {config.blurb}
            </span>
          )}
          <div className="flex items-center" style={{ gap: 8 }}>
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
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------- Grid */}
      <section style={{ paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)", paddingTop: 44, paddingBottom: 96 }}>
        {carousel ? (
          <div
            className="v3-scroller"
            style={{
              marginLeft: "calc(var(--page-x) * -1)",
              marginRight: "calc(var(--page-x) * -1)",
              paddingLeft: "var(--page-x)",
              paddingRight: "var(--page-x)",
              paddingBottom: 12,
            }}
          >
            {items.map((it) => (
              <div key={it.id} className="v3-snap" style={{ width: "min(400px, 74vw)" }}>
                <Card item={it} trueToSize={trueToSize} refSize={refSize} centered={centered} />
              </div>
            ))}
          </div>
        ) : (
          <div className="v3-grid" style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}>
            {items.map((it) => (
              <Card key={it.id} item={it} trueToSize={trueToSize} refSize={refSize} centered={centered} />
            ))}
          </div>
        )}
      </section>

      {/* Tuning indicator — appears once you use a shortcut. */}
      {(cols !== null || tileIdx !== 0 || aspectIdx !== 0) && (
        <div
          className="v3-eyebrow"
          style={{
            position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 40,
            textAlign: "center", lineHeight: 1.5, color: "var(--ink-soft)", background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)", border: "1px solid var(--hairline)", borderRadius: 14, padding: "6px 14px",
          }}
        >
          <div>{cols ?? "auto"} col · {aspect} · {tile.name}</div>
          <div style={{ opacity: 0.55, marginTop: 2 }}>grey {tileIdx + 1}/{TILE_OPTIONS.length} · 1–8, c/C, a</div>
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------- Card -- */

function Card({ item, trueToSize, refSize, centered }: { item: CollectionItem; trueToSize: boolean; refSize: number; centered: boolean }) {
  const spin = item.spin;
  const hover = spin ? null : item.hover;
  const scale = trueToSize && item.size ? item.size / refSize : item.imageScale ?? 1;
  const spinScale = trueToSize && item.size ? (item.size / refSize) * (spin?.scale ?? 1) : spin?.scale;
  // Ground by default; center when toggled — but respect explicit positions (e.g. "bottom" crops).
  const pos = item.imagePosition ?? (centered ? "center" : "ground");

  return (
    <a href={item.href ?? "#"} className={`v3-card block group${hover ? " v3-card--swap" : ""}`}>
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
      </div>

      <div className="flex items-baseline justify-between" style={{ marginTop: 11, gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{item.title}</span>
        {item.price ? (
          <span style={{ fontSize: 12, color: "var(--ink)", whiteSpace: "nowrap" }}>{item.price}</span>
        ) : item.badge ? (
          <span className="v3-eyebrow" style={{ fontSize: 9, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{item.badge}</span>
        ) : null}
      </div>

      {item.subtitle && <div style={{ color: "var(--ink-soft)", fontSize: 11.5, marginTop: 2 }}>{item.subtitle}</div>}
      {item.meta && (
        <div style={{ color: "var(--ink-faint)", fontSize: 10.5, marginTop: 6, letterSpacing: "0.01em" }}>{item.meta}</div>
      )}
    </a>
  );
}

/* Turntable tile — front frame at rest, auto-rotates through frames on hover. */
function SpinTile({ path, frames, name, scale, centered }: { path: string; frames: number; name: string; scale?: number; centered?: boolean }) {
  const [frame, setFrame] = useState(0);
  const hovered = useRef(false);
  const rafRef = useRef(0);
  const src = (i: number) => `${path}/frame_${String(i).padStart(4, "0")}.webp`;

  useEffect(() => {
    for (let i = 0; i < frames; i++) {
      const img = new Image();
      img.src = src(i);
    }
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, frames]);

  const start = () => {
    hovered.current = true;
    let i = 0;
    let last = performance.now();
    const fps = 24;
    const tick = (now: number) => {
      if (!hovered.current) return;
      if (now - last >= 1000 / fps) {
        i = (i + 1) % frames;
        setFrame(i);
        last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    hovered.current = false;
    cancelAnimationFrame(rafRef.current);
    setFrame(0);
  };

  return (
    <div onMouseEnter={start} onMouseLeave={stop} style={{ position: "absolute", inset: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="v3-media"
        src={src(frame)}
        alt={name}
        style={{
          position: "absolute",
          left: "50%",
          ...(centered
            ? { top: "50%", transform: "translate(-50%, -50%)" }
            : { bottom: "-3%", transform: "translateX(-50%)" }),
          height: `${Math.round(82 * (scale ?? 1))}%`,
          width: "auto",
          maxWidth: "94%",
          objectFit: "contain",
        }}
      />
      <span className="v3-spin-badge">360°</span>
    </div>
  );
}
