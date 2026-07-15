"use client";

// Mobile experience — a vertical, visual-first index.
//
// The desktop signature is a horizontal, spring-loaded arc of cards. On mobile
// we translate its *character* — a focused robot front and center, with the
// index drifting past — into a vertical, thumb-native feed:
//   • Each humanoid gets a near-full screen: a big, clean visual first, then
//     name / company / a few headline stats / lightweight tags, and a peek of
//     the next robot to invite the next scroll.
//   • A slim curved index rail on the right edge echoes the desktop wheel —
//     nearby names drift along a gentle arc, the active one clearer. Peripheral,
//     never required; the plain vertical feed is always obvious and effortless.
//   • Tap a robot → a native bottom sheet with the full spec, thumb-reachable.
//   • Compare is a light multi-select: add with "Compare +", a persistent
//     "Compare · N" bar opens a clean side-by-side view.
//
// Native scroll + scroll-snap (no hijacking). Motion is restrained and honors
// prefers-reduced-motion. Nothing per-frame touches React state.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { getCompareBlurb } from "@/lib/compareBlurb";
import { withUtm } from "@/lib/outbound";
import { getRobotDescription } from "@/lib/robotDescription";
import { INK, INK_BODY, INK_MUTED, SURFACE } from "@/lib/design/tokens";

const N = humanoids.length;
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";

const ITEM_FRAC = 0.9; // feed item height as a fraction of the viewport (rest = next-item peek)
const RAIL_WINDOW = 4; // names shown each side of the active in the rail
const RAIL_ROW = 30; // px between rail names
const RAIL_ARC = 26; // px inward bow at the window edge

// Glass-chip material — light fill, hairline, whisper of elevation.
const CHIP = {
  background: "#FFFFFF",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

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

// ── Glyphs ────────────────────────────────────────────────────
function CloseGlyph({ size = 17, color = INK_BODY }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function ShareGlyph({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M12 3l-4 4M12 3l4 4" />
      <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    </svg>
  );
}
function PlusGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CheckGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// ── Detail sheet ──────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between" style={{ padding: "11px 0", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize: 13, color: INK_MUTED }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{value}</span>
    </div>
  );
}

function DetailSheet({ h, onClose }: { h: Humanoid; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startY: 0, dy: 0 });
  const desc = useMemo(() => getRobotDescription(h), [h]);
  const visit = visitTarget(h);

  const rows: { label: string; value: string }[] = [];
  if (h.height) rows.push({ label: "Height", value: `${h.height} cm` });
  if (h.weight) rows.push({ label: "Weight", value: `${h.weight} kg` });
  if (h.maxSpeed) rows.push({ label: "Top speed", value: `${h.maxSpeed} m/s` });
  if (h.dof) rows.push({ label: "Degrees of freedom", value: `${h.dof}` });
  if (h.cost && h.cost !== "N/A") rows.push({ label: "Cost", value: h.cost });
  if (h.status) rows.push({ label: "Status", value: h.status });

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { active: true, startY: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    const shouldClose = drag.current.dy > 120;
    drag.current.active = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = `transform 320ms ${EASE_SHEET}`;
      sheetRef.current.style.transform = shouldClose ? "translateY(100%)" : "translateY(0)";
    }
    if (shouldClose) window.setTimeout(onClose, 260);
  };

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 200, animation: `mv-backdrop-in 260ms ${EASE_OUT} both` }}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(20,20,24,0.28)", backdropFilter: "blur(2px)" }} />
      <div
        ref={sheetRef}
        className="relative bg-white overflow-hidden"
        style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "88dvh", animation: `mv-sheet-in 380ms ${EASE_SHEET} both`, boxShadow: "0 -20px 60px rgba(0,0,0,0.16)" }}
      >
        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ padding: "12px 0 4px", touchAction: "none", cursor: "grab" }} className="flex justify-center">
          <div style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.14)" }} />
        </div>
        <div className="overflow-y-auto" style={{ padding: "8px 22px 34px", maxHeight: "calc(88dvh - 28px)" }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            {h.logoUrl && (
              <div className="relative overflow-hidden flex-shrink-0" style={{ width: 34, height: 34, borderRadius: 9 }}>
                <Image src={h.logoUrl} alt={h.manufacturer} fill sizes="34px" className="object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: INK, lineHeight: 1.1 }}>{h.name}</h2>
              <p style={{ fontSize: 13, color: INK_BODY, marginTop: 2 }}>
                {h.manufacturer}
                {h.year ? ` · ${h.year}` : ""}
              </p>
            </div>
          </div>

          {desc.text && (
            <p style={{ fontSize: 15, lineHeight: 1.5, color: INK_BODY, marginBottom: 18 }}>{desc.long || desc.text}</p>
          )}

          {h.tags && h.tags.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>
              {h.tags.map((t) => (
                <span key={t} style={{ fontSize: 12.5, fontWeight: 450, color: INK_BODY, padding: "5px 11px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.09)" }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 22 }}>
            {rows.map((r) => (
              <StatRow key={r.label} label={r.label} value={r.value} />
            ))}
          </div>

          <div className="flex gap-3">
            {visit.href && (
              <a href={visit.href} target="_blank" rel="noopener noreferrer" className="mv-tap flex-1 flex items-center justify-center" style={{ height: 50, borderRadius: 15, background: INK, color: "white", fontSize: 15, fontWeight: 500 }}>
                {visit.label}
              </a>
            )}
            <button
              onClick={() => shareRobot(h)}
              className="mv-tap flex items-center justify-center"
              style={{ width: visit.href ? 50 : undefined, flex: visit.href ? undefined : 1, height: 50, paddingInline: visit.href ? 0 : 20, borderRadius: 15, background: CHIP.background, boxShadow: CHIP.boxShadow, color: INK, fontSize: 15, fontWeight: 500 }}
            >
              {visit.href ? <ShareGlyph /> : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compare view (multi-select, 2..N) ─────────────────────────
const priceOf = (h: Humanoid) => (h.cost && h.cost !== "N/A" ? h.cost : "—");

function CompareView({ list, onRemove, onClose }: { list: Humanoid[]; onRemove: (id: string) => void; onClose: () => void }) {
  const blurb = list.length === 2 ? getCompareBlurb(list[0], list[1]) : null;
  const rows: { label: string; get: (h: Humanoid) => string }[] = [
    { label: "Height", get: (h) => (h.height ? `${h.height} cm` : "—") },
    { label: "Weight", get: (h) => (h.weight ? `${h.weight} kg` : "—") },
    { label: "Speed", get: (h) => (h.maxSpeed ? `${h.maxSpeed} m/s` : "—") },
    { label: "DOF", get: (h) => (h.dof ? `${h.dof}` : "—") },
    { label: "Price", get: priceOf },
    { label: "Status", get: (h) => h.status ?? "—" },
    { label: "Year", get: (h) => (h.year ? `${h.year}` : "—") },
  ];

  const cell = { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500 as const, color: INK, padding: "12px 6px", borderTop: "1px solid rgba(0,0,0,0.05)" };
  const labelCell = { position: "sticky" as const, left: 0, background: "#fff", display: "flex", alignItems: "center", fontSize: 12, color: INK_MUTED, padding: "12px 14px 12px 22px", borderTop: "1px solid rgba(0,0,0,0.05)" };

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 200, animation: `mv-backdrop-in 260ms ${EASE_OUT} both` }}>
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
              {/* header row — robot minis (kept visible so orientation never lost) */}
              <div style={{ position: "sticky", left: 0, background: "#fff" }} />
              {list.map((h) => (
                <div key={h.id} className="flex flex-col items-center" style={{ padding: "4px 8px 0" }}>
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4", borderRadius: 14, background: SURFACE }}>
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

              {/* stat rows */}
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
        {ready ? `Compare · ${count}` : "Compare · 1 · add one more"}
      </button>
      <button onClick={onClear} aria-label="Clear compare" className="mv-tap flex items-center justify-center" style={{ ...CHIP, marginLeft: 10, width: 50, height: 50, borderRadius: 16 }}>
        <CloseGlyph />
      </button>
    </div>
  );
}

// ── Curved index rail ─────────────────────────────────────────
// The desktop wheel, distilled: names drift along a gentle arc on the right
// edge; the active one is clearer/larger. Peripheral and visual — the vertical
// feed never depends on it.
function CurvedRail({ subscribe, reduced }: { subscribe: (cb: (p: number) => void) => () => void; reduced: boolean }) {
  const nameRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    return subscribe((p) => {
      for (let i = 0; i < N; i++) {
        const node = nameRefs.current[i];
        if (!node) continue;
        const o = i - p;
        const d = Math.abs(o);
        if (d > RAIL_WINDOW + 0.5) {
          node.style.opacity = "0";
          continue;
        }
        const t = Math.min(d / RAIL_WINDOW, 1);
        const y = o * RAIL_ROW;
        const x = -Math.pow(t, 1.35) * RAIL_ARC;
        const active = d < 0.5;
        node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        node.style.opacity = (active ? 1 : Math.max(0.14, 0.5 - t * 0.4)).toFixed(3);
        node.style.color = active ? INK : INK_MUTED;
        node.style.fontSize = active ? "13.5px" : "11px";
        node.style.fontWeight = active ? "600" : "400";
      }
    });
  }, [subscribe]);

  return (
    <div className="absolute" style={{ right: 0, top: 0, bottom: 0, width: 84, zIndex: 20, pointerEvents: "none" }} aria-hidden>
      <div className="absolute" style={{ right: 14, top: "50%" }}>
        {humanoids.map((h, i) => (
          <div
            key={h.id}
            ref={(el) => {
              nameRefs.current[i] = el;
            }}
            className="absolute whitespace-nowrap"
            style={{ right: 0, top: 0, opacity: 0, transformOrigin: "right center", transition: reduced ? undefined : "font-size 140ms ease, color 140ms ease" }}
          >
            {h.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feed item ─────────────────────────────────────────────────
function FeedItem({
  h,
  index,
  height,
  reduced,
  selected,
  onOpen,
  onToggleCompare,
  subscribe,
}: {
  h: Humanoid;
  index: number;
  height: number;
  reduced: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleCompare: () => void;
  subscribe: (cb: (p: number) => void) => () => void;
}) {
  const imgWrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced) return;
    // Subtle focus: the centered item is full, neighbors ease back slightly.
    return subscribe((p) => {
      const d = Math.min(Math.abs(index - p), 1.4);
      const el = imgWrap.current;
      if (el) {
        el.style.transform = `scale(${(1 - d * 0.05).toFixed(3)})`;
        el.style.opacity = (1 - d * 0.42).toFixed(3);
      }
    });
  }, [subscribe, index, reduced]);

  const attrs: { label: string; value: string }[] = [];
  if (h.height) attrs.push({ label: "Height", value: `${h.height} cm` });
  if (h.weight) attrs.push({ label: "Weight", value: `${h.weight} kg` });
  if (h.maxSpeed) attrs.push({ label: "Speed", value: `${h.maxSpeed} m/s` });
  else if (h.dof) attrs.push({ label: "DOF", value: `${h.dof}` });

  return (
    <div style={{ height, scrollSnapAlign: "start" }} className="relative flex flex-col">
      {/* Visual — dominant, tap to open */}
      <button onClick={onOpen} aria-label={`${h.name} details`} className="relative flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
        <div ref={imgWrap} className="absolute inset-0 flex items-center justify-center" style={{ willChange: reduced ? undefined : "transform, opacity" }}>
          {h.imageUrl && (
            <Image
              src={h.imageUrl}
              alt={h.name}
              fill
              sizes="100vw"
              priority={index < 2}
              className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
              style={{ objectPosition: h.imagePosition ?? "center", padding: h.imageFit === "cover" ? 0 : "6%", transform: h.imageScale ? `scale(${h.imageScale})` : undefined }}
              draggable={false}
            />
          )}
        </div>
      </button>

      {/* Info */}
      <div className="flex-shrink-0" style={{ padding: "10px 24px 0" }}>
        <div className="flex items-baseline" style={{ gap: 8, paddingRight: 70 }}>
          <h2 className="truncate" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: INK, minWidth: 0 }}>{h.name}</h2>
          {h.year && <span style={{ fontSize: 14, color: INK_MUTED, flexShrink: 0 }}>{h.year}</span>}
        </div>
        <div className="flex items-center" style={{ gap: 7, marginTop: 5, height: 18, paddingRight: 70 }}>
          <span className="flex-shrink-0" style={{ width: 7, height: 7, borderRadius: 999, background: statusColor(h.status) }} />
          <span className="truncate" style={{ fontSize: 13.5, color: INK_BODY, minWidth: 0 }}>
            {h.manufacturer}
            {h.useCase ? ` · ${h.useCase}` : ""}
          </span>
        </div>
        <div className="flex" style={{ gap: 22, marginTop: 12 }}>
          {attrs.slice(0, 3).map((a) => (
            <div key={a.label} className="flex flex-col">
              <span style={{ fontSize: 11.5, color: INK_MUTED }}>{a.label}</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: INK, marginTop: 1 }}>{a.value}</span>
            </div>
          ))}
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 14 }}>
          <button onClick={onOpen} className="mv-tap flex-1 flex items-center justify-center" style={{ height: 44, borderRadius: 13, background: INK, color: "#fff", fontSize: 14.5, fontWeight: 500 }}>
            Details
          </button>
          <button
            onClick={onToggleCompare}
            aria-pressed={selected}
            className="mv-tap flex items-center justify-center"
            style={{ height: 44, paddingInline: 16, borderRadius: 13, background: selected ? INK : CHIP.background, boxShadow: selected ? undefined : CHIP.boxShadow, color: selected ? "#fff" : INK, fontSize: 14.5, fontWeight: 500, gap: 6 }}
          >
            {selected ? <CheckGlyph /> : <PlusGlyph />}
            <span>{selected ? "Added" : "Compare"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function MobileView() {
  const feedRef = useRef<HTMLDivElement>(null);
  const [feedH, setFeedH] = useState(0);
  const itemH = Math.round(feedH * ITEM_FRAC);
  const itemHRef = useRef(itemH);
  itemHRef.current = itemH;

  const [detail, setDetail] = useState<Humanoid | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Scroll position broadcast — one native scroll listener, rAF-throttled, drives
  // the rail + the per-item focus imperatively (no React state per frame).
  const subs = useRef<Set<(p: number) => void>>(new Set());
  const pRef = useRef(0);
  const subscribe = useCallback((cb: (p: number) => void) => {
    subs.current.add(cb);
    cb(pRef.current);
    return () => {
      subs.current.delete(cb);
    };
  }, []);

  useLayoutEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const measure = () => setFeedH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = feedRef.current;
    if (!el || !itemH) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = el.scrollTop / itemHRef.current;
      pRef.current = p;
      subs.current.forEach((cb) => cb(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [itemH]);

  // Deeplink hydration — ?h= scrolls to a robot; ?compare= opens the comparison.
  const pendingScroll = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cmp = params.get("compare");
    if (cmp) {
      const ids = cmp.split(",").filter((id) => humanoids.some((h) => h.id === id));
      if (ids.length) {
        setCompareIds(ids);
        if (ids.length >= 2) setShowCompare(true);
      }
    }
    const hId = params.get("h");
    if (hId) pendingScroll.current = hId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!itemH || !pendingScroll.current) return;
    const i = humanoids.findIndex((h) => h.id === pendingScroll.current);
    pendingScroll.current = null;
    if (i >= 0) feedRef.current?.scrollTo({ top: i * itemH, behavior: "auto" });
  }, [itemH]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const compareList = useMemo(
    () => compareIds.map((id) => humanoids.find((h) => h.id === id)).filter(Boolean) as Humanoid[],
    [compareIds]
  );

  return (
    <main className="relative flex flex-col bg-white overflow-hidden" style={{ height: "100dvh", fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: INK, overscrollBehavior: "none" }}>
      {/* Header — minimal chrome */}
      <header className="flex items-center flex-shrink-0" style={{ padding: "14px 22px 8px" }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Humanoid Index</span>
      </header>

      {/* Feed + rail */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <div ref={feedRef} className="mv-feed absolute inset-0 overflow-y-auto" style={{ scrollSnapType: "y mandatory", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {itemH > 0 &&
            humanoids.map((h, i) => (
              <FeedItem
                key={h.id}
                h={h}
                index={i}
                height={itemH}
                reduced={reduced}
                selected={compareIds.includes(h.id)}
                onOpen={() => setDetail(h)}
                onToggleCompare={() => toggleCompare(h.id)}
                subscribe={subscribe}
              />
            ))}
          {/* spacer so the last item can snap to the top with a peek above it */}
          {itemH > 0 && <div style={{ height: feedH - itemH }} aria-hidden />}
        </div>

        {itemH > 0 && <CurvedRail subscribe={subscribe} reduced={reduced} />}
      </div>

      {compareIds.length > 0 && (
        <CompareBar count={compareIds.length} onOpen={() => setShowCompare(true)} onClear={() => setCompareIds([])} />
      )}

      {detail && <DetailSheet h={detail} onClose={() => setDetail(null)} />}
      {showCompare && compareList.length >= 2 && (
        <CompareView list={compareList} onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))} onClose={() => setShowCompare(false)} />
      )}

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
        .mv-tap { transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1); }
        .mv-tap:active { transform: scale(0.96); }
        .mv-feed::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  );
}
