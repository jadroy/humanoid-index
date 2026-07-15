"use client";

// Mobile experience — the Apple Photos paradigm.
//
// One idea: overview and object are the same surface at different zooms.
//   • A clean grid of robot cards at three densities — 4-col (the whole index
//     at a glance), 2-col (default browse), 1-col (one robot per screen).
//     Density changes reflow with a transform-only FLIP, anchored to the
//     viewport center. Almost no chrome: the robots are the interface.
//   • THE moment: tap a card and its image morphs in place from its grid cell
//     into a full-screen hero (transform-only, spring-driven, interruptible).
//     Pull down past the top and the same morph runs in reverse, tracking the
//     finger back into its exact cell. If this transition is janky the whole
//     concept fails — everything here favors it.
//   • Expanded view: hero card + name / description / tags / stats / actions,
//     native scroll below the fold, horizontal swipe pages between robots.
//   • Compare = Photos' "Select" pattern: Select → tap cards → Compare bar →
//     the side-by-side sheet.
//
// Feel discipline: no per-frame React state. The morph spring, pull tracking,
// and FLIP all write transforms directly. Honors prefers-reduced-motion.
// `?tune` opens a knob panel for the motion constants.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { getCompareBlurb } from "@/lib/compareBlurb";
import { withUtm } from "@/lib/outbound";
import { getRobotDescription } from "@/lib/robotDescription";
import { INK, INK_BODY, INK_MUTED } from "@/lib/design/tokens";

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";
const TILE = "#F9F9F9"; // card bg — web parity
const CELL_ASPECT = 3 / 4; // width / height, shared by cells and the hero so the morph is exact
const IMG_PAD = "8%"; // inner padding of every image box (shared → morph is exact)

type Density = 1 | 2 | 4;
const DENSITIES: Density[] = [1, 2, 4];

// ── Tune ──────────────────────────────────────────────────────
// Live-mutable motion constants. The `?tune` panel writes straight into TUNE;
// imperative code reads it every frame, layout knobs bump a re-render.
const DEFAULT_TUNE = {
  response: 0.4, // spring response (s) — lower = snappier
  damping: 0.9, // 1 = no overshoot, <1 = slight iOS bounce
  heroH: 0.56, // hero height as a fraction of the viewport
  dismissAt: 90, // px of pull that commits a dismiss
  flickV: 0.55, // px/ms release velocity that commits a dismiss
  pullRange: 440, // px of pull that maps to a full morph-home
  gridDepth: 0.965, // grid scale when fully expanded (depth cue)
  infoShift: 16, // px the info block rises during the morph
  gap: 10, // grid gap
  radius: 18, // card radius at 2-col (scaled for other densities)
  flipMs: 420, // density-reflow duration
};
const TUNE: typeof DEFAULT_TUNE = { ...DEFAULT_TUNE };
const KNOBS: { k: keyof typeof DEFAULT_TUNE; min: number; max: number; step: number; layout?: boolean }[] = [
  { k: "response", min: 0.2, max: 0.75, step: 0.01 },
  { k: "damping", min: 0.6, max: 1.1, step: 0.01 },
  { k: "heroH", min: 0.4, max: 0.7, step: 0.01, layout: true },
  { k: "dismissAt", min: 40, max: 240, step: 5 },
  { k: "flickV", min: 0.2, max: 1.5, step: 0.05 },
  { k: "pullRange", min: 240, max: 800, step: 10 },
  { k: "gridDepth", min: 0.9, max: 1, step: 0.005 },
  { k: "infoShift", min: 0, max: 40, step: 1 },
  { k: "gap", min: 4, max: 20, step: 1, layout: true },
  { k: "radius", min: 8, max: 28, step: 1, layout: true },
  { k: "flipMs", min: 200, max: 700, step: 10 },
];

// ── Helpers ───────────────────────────────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function statusColor(status?: Humanoid["status"]) {
  switch (status) {
    case "In Production":
      return "#34c759";
    case "Prototype":
      return "#ff9500";
    case "Concept":
      return "#5e5ce6";
    case "Anticipated":
      return "#af52de";
    default:
      return "#8e8e93";
  }
}

function visitTarget(h: Humanoid): { href?: string; label: string } {
  if (h.purchaseUrl) return { href: withUtm(h.purchaseUrl, h.id), label: "Order" };
  const href = withUtm(h.infoUrl || h.manufacturerUrl, h.id);
  return { href, label: "Visit site" };
}

async function doShare(title: string, link: string) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: link });
      return;
    } catch {
      return; // cancelled
    }
  }
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    /* no-op */
  }
}

async function shareRobot(h: Humanoid) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("h", h.id);
  await doShare(`${h.name} — Humanoid Index`, url.toString());
}

async function shareCompare(list: Humanoid[]) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("compare", list.map((h) => h.id).join(","));
  await doShare(`${list.map((h) => h.name).join(" vs ")} — Humanoid Index`, url.toString());
}

// Critically-damped-ish spring on a scalar. Drives the morph progress; writes
// nothing to React — callers apply the value in onFrame.
function createSpring(onFrame: (v: number) => void, onSettle: (target: number) => void) {
  let value = 0;
  let velocity = 0;
  let target = 0;
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const omega = (2 * Math.PI) / TUNE.response;
    velocity += (omega * omega * (target - value) - 2 * TUNE.damping * omega * velocity) * dt;
    value += velocity * dt;
    if (Math.abs(target - value) < 0.001 && Math.abs(velocity) < 0.01) {
      value = target;
      velocity = 0;
      raf = 0;
      onFrame(value);
      onSettle(target);
      return;
    }
    onFrame(value);
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  return {
    setTarget(t: number, v?: number) {
      target = t;
      if (v !== undefined) velocity = v;
      start();
    },
    snap(v: number) {
      // Direct set while a finger owns the value — spring paused.
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      value = v;
      velocity = 0;
      onFrame(value);
    },
    get value() {
      return value;
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ── Glyphs ────────────────────────────────────────────────────
function CloseGlyph({ size = 17, color = INK_BODY }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function ChevronDownGlyph({ size = 20, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10l6 6 6-6" />
    </svg>
  );
}
function ShareGlyph({ size = 19, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M12 3l-4 4M12 3l4 4" />
      <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    </svg>
  );
}
function CheckGlyph({ size = 13, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
// Density glyphs — 1 / 2×2 / 4×4 squares, Photos zoom levels.
function DensityGlyph({ d, color }: { d: Density; color: string }) {
  const cells = d === 1 ? [[3, 3, 10, 10]] : d === 2 ? [[3, 3, 4.4, 4.4], [8.6, 3, 4.4, 4.4], [3, 8.6, 4.4, 4.4], [8.6, 8.6, 4.4, 4.4]] : [];
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill={color}>
      {d === 4
        ? [0, 1, 2, 3].flatMap((r) =>
            [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={2.4 + c * 3} y={2.4 + r * 3} width={2.1} height={2.1} rx={0.6} />)
          )
        : cells.map((c, i) => <rect key={i} x={c[0]} y={c[1]} width={c[2]} height={c[3]} rx={1.6} />)}
    </svg>
  );
}

// ── Small shared pieces ───────────────────────────────────────
const CHIP = {
  background: "#FFFFFF",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between" style={{ padding: "11px 0", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: 13, color: INK_MUTED }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{value}</span>
    </div>
  );
}

function statRowsFor(h: Humanoid) {
  const rows: { label: string; value: string }[] = [];
  if (h.height) rows.push({ label: "Height", value: `${h.height} cm` });
  if (h.weight) rows.push({ label: "Weight", value: `${h.weight} kg` });
  if (h.maxSpeed) rows.push({ label: "Top speed", value: `${h.maxSpeed} m/s` });
  if (h.dof) rows.push({ label: "Degrees of freedom", value: `${h.dof}` });
  if (h.cost && h.cost !== "N/A") rows.push({ label: "Cost", value: h.cost });
  if (h.status) rows.push({ label: "Status", value: h.status });
  return rows;
}

// ── Compare view (unchanged organ from the feed era) ──────────
function CompareView({ list, onRemove, onClose }: { list: Humanoid[]; onRemove: (id: string) => void; onClose: () => void }) {
  const blurb = list.length === 2 ? getCompareBlurb(list[0], list[1]) : null;
  const rows: { label: string; get: (h: Humanoid) => string }[] = [
    { label: "Height", get: (h) => (h.height ? `${h.height} cm` : "—") },
    { label: "Weight", get: (h) => (h.weight ? `${h.weight} kg` : "—") },
    { label: "Speed", get: (h) => (h.maxSpeed ? `${h.maxSpeed} m/s` : "—") },
    { label: "DOF", get: (h) => (h.dof ? `${h.dof}` : "—") },
    { label: "Price", get: (h) => (h.cost && h.cost !== "N/A" ? h.cost : "—") },
    { label: "Status", get: (h) => h.status ?? "—" },
    { label: "Year", get: (h) => (h.year ? `${h.year}` : "—") },
  ];

  const cell = { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500 as const, color: INK, padding: "12px 6px", borderTop: "1px solid rgba(0,0,0,0.05)" };
  const labelCell = { position: "sticky" as const, left: 0, background: "#fff", display: "flex", alignItems: "center", fontSize: 12, color: INK_MUTED, padding: "12px 14px 12px 22px", borderTop: "1px solid rgba(0,0,0,0.05)" };

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 400, animation: `mv-backdrop-in 260ms ${EASE_OUT} both` }}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(20,20,24,0.28)", backdropFilter: "blur(2px)" }} />
      <div className="relative bg-white overflow-hidden flex flex-col" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92dvh", animation: `mv-sheet-in 380ms ${EASE_SHEET} both`, boxShadow: "0 -20px 60px rgba(0,0,0,0.16)" }}>
        <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "18px 22px 12px" }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>Compare</h2>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button onClick={() => shareCompare(list)} aria-label="Share comparison" className="mv-tap flex items-center justify-center" style={{ ...CHIP, width: 32, height: 32, borderRadius: 999 }}>
              <ShareGlyph size={15} />
            </button>
            <button onClick={onClose} aria-label="Close" className="mv-tap flex items-center justify-center" style={{ ...CHIP, width: 32, height: 32, borderRadius: 999 }}>
              <CloseGlyph />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div style={{ display: "grid", gridTemplateColumns: `104px repeat(${list.length}, 132px)`, width: "max-content", minWidth: "100%" }}>
              <div style={{ position: "sticky", left: 0, background: "#fff" }} />
              {list.map((h) => (
                <div key={h.id} className="flex flex-col items-center" style={{ padding: "4px 8px 0" }}>
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4", borderRadius: 14, background: TILE }}>
                    {h.imageUrl && (
                      <Image src={h.imageUrl} alt={h.name} fill sizes="132px" className={h.imageFit === "cover" ? "object-cover" : "object-contain"} style={{ objectPosition: h.imagePosition ?? "center", padding: h.imageFit === "cover" ? 0 : "8%" }} />
                    )}
                    <button onClick={() => onRemove(h.id)} aria-label={`Remove ${h.name}`} className="mv-tap absolute flex items-center justify-center" style={{ top: 6, right: 6, width: 22, height: 22, borderRadius: 999, background: "rgba(255,255,255,0.92)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
                      <CloseGlyph size={12} color={INK} />
                    </button>
                  </div>
                  <span className="truncate w-full text-center" style={{ fontSize: 13, fontWeight: 600, color: INK, marginTop: 8 }}>{h.name}</span>
                  <span className="truncate w-full text-center" style={{ fontSize: 11.5, color: INK_MUTED }}>{h.manufacturer}</span>
                </div>
              ))}
              {rows.map((r) => (
                <Fragment key={r.label}>
                  <div style={labelCell}>{r.label}</div>
                  {list.map((h) => (
                    <div key={h.id} style={cell}>{r.get(h)}</div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          {blurb?.text && (
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: INK_BODY, padding: "18px 22px 0" }}>{blurb.long || blurb.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compare bar ───────────────────────────────────────────────
function CompareBar({ count, onOpen, onClear }: { count: number; onOpen: () => void; onClear: () => void }) {
  const ready = count >= 2;
  return (
    <div className="fixed flex items-center" style={{ left: 16, right: 16, bottom: "calc(env(safe-area-inset-bottom) + 14px)", zIndex: 120, animation: `mv-bar-in 300ms ${EASE_OUT} both` }}>
      <button
        onClick={() => ready && onOpen()}
        className="mv-tap flex-1 flex items-center justify-center"
        style={{ height: 50, borderRadius: 16, background: INK, color: "#fff", fontSize: 15, fontWeight: 500, opacity: ready ? 1 : 0.5 }}
      >
        {ready ? `Compare · ${count}` : count === 1 ? "Compare · pick one more" : "Tap robots to compare"}
      </button>
      <button onClick={onClear} aria-label="Clear compare" className="mv-tap flex items-center justify-center" style={{ ...CHIP, marginLeft: 10, width: 50, height: 50, borderRadius: 16 }}>
        <CloseGlyph />
      </button>
    </div>
  );
}

// ── Grid cell ─────────────────────────────────────────────────
function GridCell({
  h,
  index,
  density,
  radius,
  hidden,
  selectMode,
  selected,
  onTap,
  registerImg,
}: {
  h: Humanoid;
  index: number;
  density: Density;
  radius: number;
  hidden: boolean;
  selectMode: boolean;
  selected: boolean;
  onTap: () => void;
  registerImg: (id: string, el: HTMLDivElement | null) => void;
}) {
  const sizes = density === 1 ? "100vw" : density === 2 ? "50vw" : "25vw";
  return (
    <button onClick={onTap} className="mv-cell flex flex-col text-left" style={{ minWidth: 0 }} aria-label={h.name}>
      <div
        ref={(el) => registerImg(h.id, el)}
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: `${CELL_ASPECT}`,
          borderRadius: radius,
          background: TILE,
          visibility: hidden ? "hidden" : undefined,
          transform: selectMode && selected ? "scale(0.955)" : undefined,
          transition: `transform 240ms ${EASE_OUT}`,
        }}
      >
        {h.imageUrl && (
          <Image
            src={h.imageUrl}
            alt={h.name}
            fill
            sizes={sizes}
            priority={index < 4}
            className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
            style={{ objectPosition: h.imagePosition ?? "center", padding: h.imageFit === "cover" ? 0 : IMG_PAD }}
            draggable={false}
          />
        )}
        {selectMode && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              right: 8,
              bottom: 8,
              width: 22,
              height: 22,
              borderRadius: 999,
              background: selected ? INK : "rgba(255,255,255,0.85)",
              boxShadow: selected ? "0 1px 4px rgba(0,0,0,0.25)" : "inset 0 0 0 1.5px rgba(0,0,0,0.22)",
              transition: `background 160ms ease`,
            }}
          >
            {selected && <CheckGlyph />}
          </span>
        )}
      </div>
      {density < 4 && (
        <div key={density} style={{ padding: density === 1 ? "10px 4px 2px" : "7px 2px 2px", animation: `mv-fade 300ms ${EASE_OUT} both`, minWidth: 0, width: "100%" }}>
          <div className="flex items-baseline" style={{ gap: 6 }}>
            <span className="truncate" style={{ fontSize: density === 1 ? 19 : 13, fontWeight: 600, letterSpacing: "-0.015em", color: INK, minWidth: 0 }}>{h.name}</span>
            {h.year && <span style={{ fontSize: density === 1 ? 13 : 11, color: INK_MUTED, flexShrink: 0 }}>{h.year}</span>}
          </div>
          {density === 1 && (
            <div className="flex items-center" style={{ gap: 6, marginTop: 3 }}>
              <span className="flex-shrink-0" style={{ width: 6, height: 6, borderRadius: 999, background: statusColor(h.status) }} />
              <span className="truncate" style={{ fontSize: 12.5, color: INK_BODY, minWidth: 0 }}>
                {h.manufacturer}
                {h.useCase ? ` · ${h.useCase}` : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ── Expanded view — the moment ────────────────────────────────
// Rendered as a full-screen overlay. The hero card lives at its final layout
// position inside a scroller; during the morph it wears a transform mapping it
// onto the origin grid cell, spring-driven to identity. Pull-down past the
// scroll top hands the progress value to the finger; release decides.
function ExpandedView({
  h,
  index,
  instant,
  reduced,
  getCellRect,
  ensureCellVisible,
  onProgress,
  onPage,
  onClose,
}: {
  h: Humanoid;
  index: number;
  instant: boolean;
  reduced: boolean;
  getCellRect: (id: string) => DOMRect | null;
  ensureCellVisible: (id: string) => DOMRect | null;
  onProgress: (p: number) => void;
  onPage: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(instant || reduced);
  const settledRef = useRef(settled);
  settledRef.current = settled;
  const closingRef = useRef(false);
  const morph = useRef<{ tx: number; ty: number; s: number; cellR: number } | null>(null);
  const pageDir = useRef<0 | 1 | -1>(0);

  const desc = useMemo(() => getRobotDescription(h), [h]);
  const visit = visitTarget(h);
  const rows = statRowsFor(h);
  const prev = index > 0 ? humanoids[index - 1] : null;
  const next = index < humanoids.length - 1 ? humanoids[index + 1] : null;

  // Apply morph progress p (0 = in the cell, 1 = expanded) — pure style writes.
  const apply = useCallback(
    (p: number) => {
      const m = morph.current;
      if (backdropRef.current) backdropRef.current.style.opacity = p.toFixed(4);
      if (chromeRef.current) chromeRef.current.style.opacity = clamp01((p - 0.55) / 0.45).toFixed(4);
      if (infoRef.current) {
        infoRef.current.style.opacity = clamp01((p - 0.3) / 0.7).toFixed(4);
        infoRef.current.style.transform = `translateY(${((1 - p) * TUNE.infoShift).toFixed(2)}px)`;
      }
      if (heroRef.current && m) {
        const t = 1 - p;
        const k = 1 - (1 - m.s) * t;
        heroRef.current.style.transform = `translate(${(m.tx * t).toFixed(2)}px, ${(m.ty * t).toFixed(2)}px) scale(${k.toFixed(4)})`;
        // Visual radius eases cell-radius → hero-radius despite the scale.
        const want = m.cellR + (22 - m.cellR) * p;
        heroRef.current.style.borderRadius = `${(want / k).toFixed(2)}px`;
      }
      onProgress(p);
    },
    [onProgress]
  );

  const spring = useRef<ReturnType<typeof createSpring> | null>(null);
  if (!spring.current) {
    spring.current = createSpring(
      (v) => apply(v),
      (target) => {
        if (target === 0) {
          onClose();
        } else {
          if (heroRef.current) heroRef.current.style.transform = "";
          if (!settledRef.current) setSettled(true);
        }
      }
    );
  }

  // Recompute the morph geometry against the CURRENT cell (id can change via paging).
  const measure = useCallback(
    (id: string, viaEnsure: boolean) => {
      const hero = heroRef.current;
      if (!hero) return false;
      const cell = viaEnsure ? ensureCellVisible(id) : getCellRect(id);
      if (!cell) return false;
      const prevTransform = hero.style.transform;
      hero.style.transform = "";
      const hr = hero.getBoundingClientRect();
      hero.style.transform = prevTransform;
      morph.current = {
        tx: cell.left - hr.left,
        ty: cell.top - hr.top,
        s: cell.width / hr.width,
        cellR: parseFloat(getComputedStyle(document.body).getPropertyValue("--mv-radius")) || 18,
      };
      return true;
    },
    [ensureCellVisible, getCellRect]
  );

  // Mount: present. Either morph from the cell or (deeplink / reduced motion) appear.
  useLayoutEffect(() => {
    const ok = measure(h.id, false);
    if (instant || reduced || !ok) {
      spring.current!.snap(1);
      apply(1);
      setSettled(true);
      return;
    }
    spring.current!.snap(0);
    apply(0);
    spring.current!.setTarget(1);
    return () => spring.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paging entrance: when the robot changes mid-expanded, slide new content in.
  useLayoutEffect(() => {
    const dir = pageDir.current;
    if (!dir) return;
    pageDir.current = 0;
    const el = pageRef.current;
    const sc = scrollerRef.current;
    if (sc) sc.scrollTop = 0;
    if (el && !reduced) {
      el.style.transition = "none";
      el.style.transform = `translateX(${dir * 60}px)`;
      el.style.opacity = "0";
      requestAnimationFrame(() => {
        el.style.transition = `transform 300ms ${EASE_OUT}, opacity 300ms ${EASE_OUT}`;
        el.style.transform = "translateX(0)";
        el.style.opacity = "1";
      });
    }
  }, [h.id, reduced]);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduced || !measure(h.id, true)) {
      onClose();
      return;
    }
    setSettled(false);
    settledRef.current = false;
    spring.current!.setTarget(0);
  }, [h.id, measure, onClose, reduced]);

  // Gestures — native touch (real device) + mouse drag (desktop preview).
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    let mode: null | "pull" | "page" = null;
    let sx = 0;
    let sy = 0;
    let lastY = 0;
    let lastX = 0;
    let lastT = 0;
    let vy = 0;
    let vx = 0;

    const begin = (x: number, y: number) => {
      mode = null;
      sx = x;
      sy = y;
      lastY = y;
      lastX = x;
      lastT = performance.now();
      vy = 0;
      vx = 0;
    };
    const move = (x: number, y: number, prevent: () => void): boolean => {
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      vy = vy * 0.7 + ((y - lastY) / dt) * 0.3;
      vx = vx * 0.7 + ((x - lastX) / dt) * 0.3;
      lastY = y;
      lastX = x;
      lastT = now;
      const dx = x - sx;
      const dy = y - sy;
      if (!mode) {
        if (Math.abs(dy) < 7 && Math.abs(dx) < 7) return false;
        if (Math.abs(dy) >= Math.abs(dx)) {
          if (dy > 0 && sc.scrollTop <= 0 && !closingRef.current) mode = "pull";
          else return false; // native scroll owns it
        } else {
          mode = "page";
        }
      }
      if (mode === "pull") {
        prevent();
        const pull = Math.max(0, y - sy);
        spring.current!.snap(1 - clamp01(pull / TUNE.pullRange) * 0.92);
        if (!measureOnceRef.current) {
          measureOnceRef.current = true;
          measure(h.id, true);
        }
      } else if (mode === "page") {
        prevent();
        const el = pageRef.current;
        if (el) {
          const noNeighbor = (dx < 0 && !next) || (dx > 0 && !prev);
          el.style.transition = "none";
          el.style.transform = `translateX(${(noNeighbor ? dx * 0.3 : dx).toFixed(1)}px)`;
        }
      }
      return true;
    };
    const end = () => {
      if (mode === "pull") {
        const pull = Math.max(0, lastY - sy);
        const commit = pull > TUNE.dismissAt || vy > TUNE.flickV;
        if (commit) {
          closingRef.current = true;
          setSettled(false);
          settledRef.current = false;
          spring.current!.setTarget(0, (-Math.max(vy, 0) * 1000) / TUNE.pullRange);
        } else {
          spring.current!.setTarget(1);
        }
      } else if (mode === "page") {
        const dx = lastX - sx;
        const el = pageRef.current;
        const w = sc.clientWidth;
        const goNext = (dx < -w * 0.28 || vx < -0.5) && next;
        const goPrev = (dx > w * 0.28 || vx > 0.5) && prev;
        if (el && (goNext || goPrev)) {
          const dir: 1 | -1 = goNext ? 1 : -1;
          el.style.transition = `transform 220ms ${EASE_OUT}, opacity 220ms ${EASE_OUT}`;
          el.style.transform = `translateX(${-dir * 90}px)`;
          el.style.opacity = "0";
          window.setTimeout(() => {
            pageDir.current = dir;
            onPage(dir);
          }, 170);
        } else if (el) {
          el.style.transition = `transform 320ms ${EASE_OUT}`;
          el.style.transform = "translateX(0)";
          el.style.opacity = "1";
        }
      }
      mode = null;
      measureOnceRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      move(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault());
    };
    const onTouchEnd = () => end();
    // Mouse fallback so the interaction is testable in the desktop preview.
    let mouseDown = false;
    const onMouseDown = (e: MouseEvent) => {
      mouseDown = true;
      begin(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (mouseDown) move(e.clientX, e.clientY, () => e.preventDefault());
    };
    const onMouseUp = () => {
      if (mouseDown) {
        mouseDown = false;
        end();
      }
    };

    sc.addEventListener("touchstart", onTouchStart, { passive: true });
    sc.addEventListener("touchmove", onTouchMove, { passive: false });
    sc.addEventListener("touchend", onTouchEnd);
    sc.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      sc.removeEventListener("touchstart", onTouchStart);
      sc.removeEventListener("touchmove", onTouchMove);
      sc.removeEventListener("touchend", onTouchEnd);
      sc.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [h.id, measure, next, prev, onPage]);
  const measureOnceRef = useRef(false);

  return (
    <div className="fixed inset-0" style={{ zIndex: 300 }}>
      <div ref={backdropRef} className="absolute inset-0" style={{ background: "#fff", opacity: 0 }} />

      <div
        ref={scrollerRef}
        className="mv-noscrollbar absolute inset-0 overflow-y-auto"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <div ref={pageRef}>
          {/* Hero — same aspect + inner padding as the cell, so the morph is exact. */}
          <div className="flex items-end justify-center" style={{ height: `calc(${TUNE.heroH} * 100dvh)`, paddingTop: "calc(env(safe-area-inset-top) + 54px)" }}>
            <div
              ref={heroRef}
              className="relative overflow-hidden"
              style={{
                height: "100%",
                aspectRatio: `${CELL_ASPECT}`,
                maxWidth: "calc(100vw - 24px)",
                background: TILE,
                borderRadius: 22,
                transformOrigin: "top left",
                willChange: "transform",
              }}
            >
              {h.imageUrl && (
                <Image
                  src={h.imageUrl}
                  alt={h.name}
                  fill
                  sizes={settled ? "100vw" : "50vw"}
                  priority
                  className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
                  style={{ objectPosition: h.imagePosition ?? "center", padding: h.imageFit === "cover" ? 0 : IMG_PAD }}
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* Info */}
          <div ref={infoRef} style={{ padding: "20px 24px calc(env(safe-area-inset-bottom) + 40px)" }}>
            <div className="flex items-baseline" style={{ gap: 9 }}>
              <h2 className="truncate" style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-0.022em", color: INK, lineHeight: 1.08, minWidth: 0 }}>{h.name}</h2>
              {h.year && <span style={{ fontSize: 15, color: INK_MUTED, flexShrink: 0 }}>{h.year}</span>}
            </div>
            <div className="flex items-center" style={{ gap: 7, marginTop: 6 }}>
              <span className="flex-shrink-0" style={{ width: 7, height: 7, borderRadius: 999, background: statusColor(h.status) }} />
              <span className="truncate" style={{ fontSize: 14, color: INK_BODY, minWidth: 0 }}>
                {h.manufacturer}
                {h.useCase ? ` · ${h.useCase}` : ""}
              </span>
            </div>

            {(desc.long || desc.text) && (
              <p style={{ fontSize: 15, lineHeight: 1.55, color: INK_BODY, marginTop: 16 }}>{desc.long || desc.text}</p>
            )}

            {h.tags && h.tags.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
                {h.tags.map((t) => (
                  <span key={t} style={{ fontSize: 12.5, fontWeight: 450, color: INK_BODY, padding: "5px 11px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.09)" }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              <div style={{ marginTop: 20 }}>
                {rows.map((r) => (
                  <StatRow key={r.label} label={r.label} value={r.value} />
                ))}
              </div>
            )}

            <div className="flex" style={{ gap: 10, marginTop: 22 }}>
              {visit.href && (
                <a href={visit.href} target="_blank" rel="noopener noreferrer" className="mv-tap flex-1 flex items-center justify-center" style={{ height: 50, borderRadius: 15, background: INK, color: "#fff", fontSize: 15, fontWeight: 500 }}>
                  {visit.label}
                </a>
              )}
              <button
                onClick={() => shareRobot(h)}
                className="mv-tap flex items-center justify-center"
                style={{ ...CHIP, width: visit.href ? 50 : undefined, flex: visit.href ? undefined : 1, height: 50, borderRadius: 15, color: INK, fontSize: 15, fontWeight: 500 }}
              >
                {visit.href ? <ShareGlyph /> : "Share"}
              </button>
            </div>

            {(prev || next) && (
              <p style={{ fontSize: 12.5, color: INK_MUTED, textAlign: "center", marginTop: 26 }}>
                Swipe for {next ? next.name : prev!.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chrome — dismiss chevron; fades in late so the morph stays clean. */}
      <div ref={chromeRef} className="absolute" style={{ top: "calc(env(safe-area-inset-top) + 10px)", left: 14, opacity: 0 }}>
        <button onClick={dismiss} aria-label="Back to grid" className="mv-tap flex items-center justify-center" style={{ ...CHIP, width: 36, height: 36, borderRadius: 999 }}>
          <ChevronDownGlyph />
        </button>
      </div>

      {/* Neighbor image warm-up so paging never pops. */}
      <div aria-hidden style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
        {prev?.imageUrl && <Image src={prev.imageUrl} alt="" width={800} height={1067} sizes="100vw" />}
        {next?.imageUrl && <Image src={next.imageUrl} alt="" width={800} height={1067} sizes="100vw" />}
      </div>
    </div>
  );
}

// ── Tuner (?tune) ─────────────────────────────────────────────
function TunerPanel({ bump }: { bump: () => void }) {
  const [open, setOpen] = useState(true);
  const [, localBump] = useReducer((x: number) => x + 1, 0);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed mv-tap" style={{ right: 14, bottom: "calc(env(safe-area-inset-bottom) + 14px)", zIndex: 500, ...CHIP, padding: "9px 15px", borderRadius: 999, fontSize: 13, fontWeight: 500, color: INK }}>
        Tune
      </button>
    );
  }
  return (
    <div className="fixed" style={{ left: 10, right: 10, bottom: "calc(env(safe-area-inset-bottom) + 10px)", zIndex: 500, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(14px)", borderRadius: 20, boxShadow: "0 12px 40px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.06)", padding: "14px 16px 10px", maxHeight: "46dvh", overflowY: "auto" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>Motion</span>
        <div className="flex" style={{ gap: 14 }}>
          <button style={{ fontSize: 12.5, color: INK_BODY }} onClick={() => navigator.clipboard.writeText(JSON.stringify(TUNE, null, 2))}>Copy</button>
          <button style={{ fontSize: 12.5, color: INK_BODY }} onClick={() => { Object.assign(TUNE, DEFAULT_TUNE); localBump(); bump(); }}>Reset</button>
          <button style={{ fontSize: 12.5, color: INK_BODY }} onClick={() => setOpen(false)}>Hide</button>
        </div>
      </div>
      {KNOBS.map(({ k, min, max, step, layout }) => (
        <div key={k} style={{ padding: "5px 0" }}>
          <div className="flex justify-between" style={{ fontSize: 12, color: INK_BODY, marginBottom: 2 }}>
            <span>{k}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{TUNE[k]}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            defaultValue={TUNE[k]}
            style={{ width: "100%" }}
            onInput={(e) => {
              TUNE[k] = parseFloat((e.target as HTMLInputElement).value);
              localBump();
              if (layout) bump();
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function MobileView() {
  const [density, setDensity] = useState<Density>(2);
  const [expanded, setExpanded] = useState<{ id: string; instant?: boolean } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [tune, setTune] = useState(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const reduced = usePrefersReducedMotion();

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const gridDepthRef = useRef<HTMLDivElement>(null);
  const imgEls = useRef(new Map<string, HTMLDivElement>());
  const registerImg = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) imgEls.current.set(id, el);
    else imgEls.current.delete(id);
  }, []);

  const radius = density === 1 ? TUNE.radius + 4 : density === 2 ? TUNE.radius : Math.max(8, TUNE.radius - 8);

  // Deeplinks — ?h= presents a robot, ?compare= opens the comparison.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("tune")) setTune(true);
    const cmp = params.get("compare");
    if (cmp) {
      const ids = cmp.split(",").filter((id) => humanoids.some((x) => x.id === id));
      if (ids.length) {
        setCompareIds(ids);
        setSelectMode(true);
        if (ids.length >= 2) setShowCompare(true);
      }
    }
    const hId = params.get("h");
    if (hId && humanoids.some((x) => x.id === hId)) setExpanded({ id: hId, instant: true });
  }, []);

  const getCellRect = useCallback((id: string) => {
    const el = imgEls.current.get(id);
    return el ? el.getBoundingClientRect() : null;
  }, []);

  // Make sure a cell is on-screen (instant scroll) before a morph home.
  const ensureCellVisible = useCallback((id: string) => {
    const el = imgEls.current.get(id);
    const sc = gridScrollRef.current;
    if (!el || !sc) return null;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.top < 70 || r.bottom > vh - 20) {
      sc.scrollTop += r.top + r.height / 2 - vh / 2;
      return el.getBoundingClientRect();
    }
    return r;
  }, []);

  // Depth cue while a robot is expanded.
  const onExpandProgress = useCallback((p: number) => {
    const el = gridDepthRef.current;
    if (el) el.style.transform = `scale(${(1 - (1 - TUNE.gridDepth) * p).toFixed(4)})`;
  }, []);

  // Density change → transform-only FLIP on visible image boxes, anchored to
  // the viewport center; labels fade via their keyed CSS animation.
  const pendingFlip = useRef<{ rects: Map<string, DOMRect>; anchorId: string | null; anchorY: number } | null>(null);
  const changeDensity = useCallback(
    (next: Density) => {
      setDensity((cur) => {
        if (next === cur) return cur;
        if (!reduced) {
          const vh = window.innerHeight;
          const rects = new Map<string, DOMRect>();
          let anchorId: string | null = null;
          let anchorY = 0;
          let best = Infinity;
          imgEls.current.forEach((el, id) => {
            const r = el.getBoundingClientRect();
            if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
            rects.set(id, r);
            const d = Math.abs(r.top + r.height / 2 - vh / 2);
            if (d < best) {
              best = d;
              anchorId = id;
              anchorY = r.top;
            }
          });
          pendingFlip.current = { rects, anchorId, anchorY };
        }
        return next;
      });
    },
    [reduced]
  );

  useLayoutEffect(() => {
    const flip = pendingFlip.current;
    if (!flip) return;
    pendingFlip.current = null;
    const sc = gridScrollRef.current;
    // Keep the anchor cell at its screen position.
    if (flip.anchorId && sc) {
      const el = imgEls.current.get(flip.anchorId);
      if (el) {
        const r = el.getBoundingClientRect();
        sc.scrollTop += r.top - flip.anchorY;
      }
    }
    const played: HTMLDivElement[] = [];
    flip.rects.forEach((before, id) => {
      const el = imgEls.current.get(id);
      if (!el) return;
      const after = el.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      const s = before.width / after.width;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < 0.01) return;
      el.style.transition = "none";
      el.style.transformOrigin = "top left";
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
      played.push(el);
    });
    if (!played.length) return;
    // Force the inverted frame, then play everything to identity together.
    void played[0].getBoundingClientRect();
    requestAnimationFrame(() => {
      played.forEach((el) => {
        el.style.transition = `transform ${TUNE.flipMs}ms ${EASE_OUT}`;
        el.style.transform = "";
      });
    });
    const clear = window.setTimeout(() => {
      played.forEach((el) => {
        el.style.transition = "";
        el.style.transformOrigin = "";
      });
    }, TUNE.flipMs + 60);
    return () => window.clearTimeout(clear);
  }, [density]);

  const expandedIndex = expanded ? humanoids.findIndex((x) => x.id === expanded.id) : -1;
  const expandedH = expandedIndex >= 0 ? humanoids[expandedIndex] : null;

  const onPage = useCallback(
    (dir: 1 | -1) => {
      setExpanded((cur) => {
        if (!cur) return cur;
        const i = humanoids.findIndex((x) => x.id === cur.id);
        const n = humanoids[i + dir];
        return n ? { id: n.id, instant: true } : cur;
      });
    },
    []
  );

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const compareList = useMemo(
    () => compareIds.map((id) => humanoids.find((x) => x.id === id)).filter(Boolean) as Humanoid[],
    [compareIds]
  );

  const onCellTap = useCallback(
    (h: Humanoid) => {
      if (selectMode) toggleCompare(h.id);
      else setExpanded({ id: h.id });
    },
    [selectMode, toggleCompare]
  );

  return (
    <main
      className="relative overflow-hidden"
      style={{ height: "100dvh", background: "#fff", color: INK, fontFamily: "var(--font-geist-sans), system-ui, sans-serif", ["--mv-radius" as string]: `${radius}px` }}
    >
      <div ref={gridDepthRef} className="absolute inset-0 flex flex-col" style={{ willChange: "transform" }}>
        {/* Header — wordmark, density, Select. Nothing else. */}
        <header className="flex items-center justify-between flex-shrink-0" style={{ padding: "calc(env(safe-area-inset-top) + 14px) 18px 10px 22px" }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Humanoid Index</span>
          <div className="flex items-center" style={{ gap: 10 }}>
            <div className="relative flex items-center" style={{ background: "rgba(127,127,135,0.13)", borderRadius: 999, padding: 3 }}>
              <span
                aria-hidden
                className="absolute"
                style={{
                  width: 30,
                  height: 26,
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                  transform: `translateX(${DENSITIES.indexOf(density) * 30}px)`,
                  transition: `transform 260ms ${EASE_OUT}`,
                  left: 3,
                }}
              />
              {DENSITIES.map((d) => (
                <button key={d} onClick={() => changeDensity(d)} aria-label={`${d} per row`} className="relative flex items-center justify-center" style={{ width: 30, height: 26 }}>
                  <DensityGlyph d={d} color={d === density ? INK : INK_MUTED} />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setSelectMode((s) => {
                  if (s) setCompareIds([]);
                  return !s;
                });
              }}
              className="mv-tap"
              style={{ fontSize: 13.5, fontWeight: 500, color: INK, padding: "6px 13px", borderRadius: 999, background: selectMode ? "rgba(127,127,135,0.16)" : "transparent", boxShadow: selectMode ? undefined : "inset 0 0 0 1px rgba(0,0,0,0.1)" }}
            >
              {selectMode ? "Done" : "Select"}
            </button>
          </div>
        </header>

        {/* Grid */}
        <div ref={gridScrollRef} className="mv-noscrollbar flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))`,
              gap: density === 4 ? Math.max(3, TUNE.gap - 6) : TUNE.gap,
              padding: `4px ${density === 4 ? 6 : 14}px calc(env(safe-area-inset-bottom) + ${selectMode ? 92 : 28}px)`,
            }}
          >
            {humanoids.map((h, i) => (
              <GridCell
                key={h.id}
                h={h}
                index={i}
                density={density}
                radius={radius}
                hidden={expanded?.id === h.id}
                selectMode={selectMode}
                selected={compareIds.includes(h.id)}
                onTap={() => onCellTap(h)}
                registerImg={registerImg}
              />
            ))}
          </div>
        </div>
      </div>

      {selectMode && compareIds.length > 0 && (
        <CompareBar count={compareIds.length} onOpen={() => setShowCompare(true)} onClear={() => setCompareIds([])} />
      )}

      {expandedH && (
        <ExpandedView
          key="expanded"
          h={expandedH}
          index={expandedIndex}
          instant={!!expanded?.instant}
          reduced={reduced}
          getCellRect={getCellRect}
          ensureCellVisible={ensureCellVisible}
          onProgress={onExpandProgress}
          onPage={onPage}
          onClose={() => {
            setExpanded(null);
            onExpandProgress(0);
          }}
        />
      )}

      {showCompare && compareList.length >= 2 && (
        <CompareView list={compareList} onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))} onClose={() => setShowCompare(false)} />
      )}

      {tune && <TunerPanel bump={bump} />}

      <style jsx global>{`
        @keyframes mv-sheet-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes mv-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mv-bar-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mv-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .mv-tap { transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1); }
        .mv-tap:active { transform: scale(0.96); }
        .mv-cell:active .relative { }
        .mv-noscrollbar { scrollbar-width: none; }
        .mv-noscrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
