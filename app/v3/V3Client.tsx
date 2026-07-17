"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Humanoid } from "@/data/humanoids";

/* Robots that have a turntable frame sequence in /public/spin/<name>.
   Keyed by humanoid id. Add entries here as you render more turntables. */
const SPIN: Record<string, { path: string; frames: number; scale?: number }> = {
  "3": { path: "/spin/memo", frames: 30, scale: 1.05 }, // Memo (frames padded → tuned to match others)
};

// Card tile options — flat greys, NO shadow. A big spread: near-white → light
// grey across warm→cool tints. Press "c" to step forward, "C" (shift) back.
const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const TILE_OPTIONS: { name: string; bg: string }[] = (() => {
  const opts: { name: string; bg: string }[] = [];
  for (let l = 249; l >= 225; l -= 2) {            // lightness: near-white → light grey
    for (const t of [1, 0, 3, -2, 5, -4, 7, 10]) { // tint: + cool/blue, - warm
      const hex = `#${hx(l - t * 0.5)}${hx(l)}${hx(l + t * 0.7)}`;
      opts.push({ name: hex, bg: hex });
    }
  }
  return opts; // ~104 greys
})();

// Tile aspect-ratio options — press "a" to cycle.
const ASPECT_OPTIONS = ["4 / 5", "1 / 1", "5 / 6", "3 / 4", "2 / 3", "5 / 7", "4 / 3", "3 / 2"];

/* Cost is only shown when it's a real, displayable number. */
function displayCost(c?: string) {
  if (!c || c === "N/A" || c === "—") return null;
  return c;
}

type Layer = { url: string; fit: "contain" | "cover"; position: string };

/* The image the card cross-fades to on hover, if any. Prefers an alternate
   render from media[], then falls back to a lifestyle scene shot. */
function secondaryLayer(r: Humanoid): Layer | null {
  const alt = (r.media ?? []).find(
    (m) => m.type === "image" && m.url && m.url !== r.imageUrl
  );
  if (alt) {
    return {
      url: alt.url,
      fit: alt.fit ?? "contain",
      position: alt.position ?? r.imagePosition ?? "ground",
    };
  }
  if (r.sceneUrl) {
    return { url: r.sceneUrl, fit: "cover", position: "center" };
  }
  return null;
}

/* Sizing + placement for a layer. Contain renders get a fixed height (v2's
   approach) so robots read at a consistent scale; imageScale nudges relative
   size. They CENTER by default, and only bottom-anchor when the robot's
   position flag says "bottom" (cropped renders that need grounding). Cover
   photos fill the tile. */
function layerStyle(
  fit: "contain" | "cover",
  position: string,
  scale = 1
): React.CSSProperties {
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
  // Crops flush to the floor; Memo (padded turntable frames) stays centered;
  // everything else grounds low with headroom above (Adidas/Nike-style).
  if (position.includes("bottom")) return { ...base, bottom: 0, transform: "translateX(-50%)" };
  if (position === "center") return { ...base, top: "50%", transform: "translate(-50%, -50%)" };
  return { ...base, bottom: "3%", transform: "translateX(-50%)" };
}

export default function V3Client({ robots }: { robots: Humanoid[] }) {
  const grid = useMemo(() => robots.filter((r) => r.imageUrl), [robots]);

  // Experiment shortcuts (reset on reload):
  //   1–8 → grid column count      c / C → next / prev card grey
  //   a   → cycle tile aspect ratio
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
      <header
        className="sticky top-0 z-30"
        style={{ background: "rgba(255,255,255,0.86)", backdropFilter: "blur(8px)" }}
      >
        <div
          className="flex items-center"
          style={{ position: "relative", paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)", height: 52 }}
        >
          <a href="/v3" aria-label="Humanoid Index" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/HI-logo.svg" alt="Humanoid Index" style={{ height: 12, width: "auto", opacity: 0.5 }} />
          </a>
          <span
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              color: "var(--ink-soft)",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            A visual index of humanoid robots
          </span>
        </div>
      </header>

      {/* ---------------------------------------------------------- Robot grid */}
      <section
        style={{
          paddingLeft: "var(--page-x)",
          paddingRight: "var(--page-x)",
          paddingTop: 44,
          paddingBottom: 96,
        }}
      >
        <div
          className="v3-grid"
          style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined}
        >
          {grid.map((r) => (
            <RobotCard key={r.id} r={r} />
          ))}
        </div>
      </section>

      {/* Experiment indicator — appears once you use a shortcut. */}
      {(cols !== null || tileIdx !== 0 || aspectIdx !== 0) && (
        <div
          className="v3-eyebrow"
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            textAlign: "center",
            lineHeight: 1.5,
            color: "var(--ink-soft)",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(6px)",
            border: "1px solid var(--hairline)",
            borderRadius: 14,
            padding: "6px 14px",
          }}
        >
          <div>{cols ?? 3} col · {aspect} · {tile.name}</div>
          <div style={{ opacity: 0.55, marginTop: 2 }}>
            grey {tileIdx + 1}/{TILE_OPTIONS.length} · 1–8, c/C, a
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- Robot card */

function RobotCard({ r }: { r: Humanoid }) {
  const cost = displayCost(r.cost);
  const spin = SPIN[r.id];
  const secondary = spin ? null : secondaryLayer(r);
  const meta = [r.year, r.height ? `${r.height}cm` : null, r.dof ? `${r.dof} DOF` : null]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <a
      href={`/?h=${r.id}`}
      className={`v3-card block group${secondary ? " v3-card--swap" : ""}`}
    >
      <div
        className="v3-grid-tile"
        style={{ position: "relative", aspectRatio: "var(--tile-aspect, 4 / 5)", overflow: "hidden" }}
      >
        {spin ? (
          <SpinTile path={spin.path} frames={spin.frames} name={r.name} scale={spin.scale} />
        ) : (
          <>
            {r.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="v3-media v3-media--primary"
                src={r.imageUrl}
                alt={r.name}
                loading="lazy"
                style={layerStyle(r.imageFit ?? "contain", r.imagePosition ?? "ground", r.imageScale)}
              />
            )}
            {secondary && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="v3-media v3-media--secondary"
                src={secondary.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                style={layerStyle(secondary.fit, secondary.position)}
              />
            )}
          </>
        )}
      </div>

      <div className="flex items-baseline justify-between" style={{ marginTop: 11, gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{r.name}</span>
        {cost ? (
          <span style={{ fontSize: 12, color: "var(--ink)", whiteSpace: "nowrap" }}>{cost}</span>
        ) : r.availability ? (
          <span className="v3-eyebrow" style={{ fontSize: 9, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
            {r.availability}
          </span>
        ) : null}
      </div>

      <div style={{ color: "var(--ink-soft)", fontSize: 11.5, marginTop: 2 }}>{r.manufacturer}</div>
      {meta && (
        <div style={{ color: "var(--ink-faint)", fontSize: 10.5, marginTop: 6, letterSpacing: "0.01em" }}>
          {meta}
        </div>
      )}
    </a>
  );
}

/* Turntable tile — shows the front frame at rest, auto-rotates through the
   frame sequence while hovered. Reuses Memo's /public/spin frames. */
function SpinTile({ path, frames, name, scale }: { path: string; frames: number; name: string; scale?: number }) {
  const [frame, setFrame] = useState(0);
  const hovered = useRef(false);
  const rafRef = useRef(0);

  const src = (i: number) => `${path}/frame_${String(i).padStart(4, "0")}.webp`;

  // Preload all frames once so the first spin is smooth.
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
          bottom: "-3%", // negative offset cancels the frames' bottom padding → base lands on the floor line
          transform: "translateX(-50%)",
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
