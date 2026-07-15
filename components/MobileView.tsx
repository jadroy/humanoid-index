"use client";

// Mobile experience — a Cover Flow deck.
//
// The desktop signature is a horizontal, spring-loaded ribbon of cards along an
// arc. On mobile we translate that into a Cover Flow: one robot centered and
// flat, neighbors fanned along a 3D arc — each tilting to face center as it
// recedes. Thumb-swipe tracks the finger, then settles with a flick; a scrub
// rail flies across the whole index.
//
// Motion is a critically-damped settle (SmoothDamp), not a spring: the finger's
// release velocity carries straight into it so a flick feels swift and
// effortless, it decelerates on a smooth curve, and it never overshoots — no
// bounce. Runs purely on refs + a subscribe loop, so scrolling never touches
// React state per frame.

import {
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

// ── Tuning ────────────────────────────────────────────────────
const SMOOTH_TIME = 0.24; // s — critically-damped settle: swift, effortless, never overshoots
const DT = 1 / 60; // s per frame, SmoothDamp's time step
// ── Cover Flow geometry ──
const CARD_W_FRAC = 0.62; // card width as a fraction of deck width
const CENTER_GAP_FRAC = 0.52; // center → first sibling (also the per-card drag stride)
const STACK_GAP_FRAC = 0.12; // each further sibling adds this much X (the fan stack)
const ROT = 52; // deg — how far side cards tilt to face center
const DEPTH = 120; // px — z push-back at the first sibling
const STACK_Z = 46; // px — extra z per further sibling
const REACH = 3.2; // cards visible each side before the hard cutoff
const SIDE_FADE = 0.62; // hero → edge opacity drop
const PERSPECTIVE = 1000; // px — 3D depth of field
const CARD_RADIUS = 20; // matches web card radius
const FLICK_PROJECT = 0.14; // s of release velocity folded into the landing card
const MAX_FLICK = 2; // most cards a single hard flick can cross
const TAP_SLOP = 8; // px of movement below which a pointer-up counts as a tap
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"; // the web's signature ease
const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";

const N = humanoids.length;
const clampIdx = (v: number) => Math.max(0, Math.min(N - 1, v));

// Material — the web's glass-chip language: a light fill with a hairline edge and
// a whisper of elevation. (Heavy backdrop blur is reserved for the sheets, which
// sit over dimmed content; footer chips sit on white, where blur reads as nothing.)
const CHIP = {
  background: "#FFFFFF",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

// One small type scale — keep text variance low, favor consistency.
const TYPE = {
  title: { fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" },
  value: { fontSize: 15, fontWeight: 500 },
  chip: { fontSize: 12.5, fontWeight: 450 },
} as const;

// ── Deck spring ───────────────────────────────────────────────
// A tiny spring over "card index" space. setPos() is instant (finger tracking,
// no state); settleTo() animates. onIndex fires only when the rounded index
// changes, so the footer re-renders a handful of times per drag, not per frame.
function useDeck(onIndex: (i: number) => void) {
  const pos = useRef(0);
  const vel = useRef(0);
  const target = useRef(0);
  const raf = useRef(0);
  const subs = useRef<Set<(p: number) => void>>(new Set());
  const lastIndex = useRef(0);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  const notify = useCallback((p: number) => {
    subs.current.forEach((cb) => cb(p));
    const idx = clampIdx(Math.round(p));
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      onIndexRef.current(idx);
    }
  }, []);

  // Critically-damped smoothing (Unity's SmoothDamp). Carries the current
  // velocity so a flick continues into the settle, decelerates on a smooth
  // curve, and — by construction — never overshoots. No spring, no bounce.
  const tick = useCallback(() => {
    const to = target.current;
    const current = pos.current;
    const omega = 2 / SMOOTH_TIME;
    const x = omega * DT;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = current - to;
    const temp = (vel.current + omega * change) * DT;
    let v = (vel.current - omega * temp) * exp;
    let p = to + (change + temp) * exp;
    // Clamp the exact frame it would cross the target — stops dead, never rebounds.
    if ((change < 0) === (p > to)) {
      p = to;
      v = 0;
    }
    vel.current = v;
    pos.current = p;
    if (Math.abs(p - to) < 0.0005 && Math.abs(v) < 0.0005) {
      pos.current = to;
      vel.current = 0;
      notify(to);
      raf.current = 0;
      navigator.vibrate?.(4); // a light tick as a card lands (Android / PWA; iOS no-ops)
      return;
    }
    notify(p);
    raf.current = requestAnimationFrame(tick);
  }, [notify]);

  const start = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  // Instant position — with rubber-band resistance past the ends.
  const setPos = useCallback(
    (p: number) => {
      stop();
      let next = p;
      if (next < 0) next = next * 0.35;
      else if (next > N - 1) next = N - 1 + (next - (N - 1)) * 0.35;
      pos.current = next;
      vel.current = 0;
      target.current = next;
      notify(next);
    },
    [notify, stop]
  );

  const settleTo = useCallback(
    (idx: number) => {
      target.current = clampIdx(idx);
      start();
    },
    [start]
  );

  // Instant jump — no animation. For deeplink hydration on mount.
  const snapTo = useCallback(
    (idx: number) => {
      stop();
      const c = clampIdx(idx);
      pos.current = c;
      vel.current = 0;
      target.current = c;
      notify(c);
    },
    [notify, stop]
  );

  // Release with the finger's velocity (index-units per ms, sign-correct: a
  // positive value advances the deck). The velocity is handed straight to the
  // SmoothDamp loop so the settle *continues* the flick instead of restarting
  // from zero — swift and effortless, and it eases to rest without a rebound.
  const release = useCallback(
    (vIdxPerMs: number) => {
      const vSec = vIdxPerMs * 1000; // index/sec — SmoothDamp's velocity unit
      const base = Math.round(pos.current);
      const landing = pos.current + vSec * FLICK_PROJECT;
      const idx = Math.max(
        base - MAX_FLICK,
        Math.min(base + MAX_FLICK, Math.round(landing))
      );
      target.current = clampIdx(idx);
      vel.current = vSec;
      start();
    },
    [start]
  );

  const subscribe = useCallback((cb: (p: number) => void) => {
    subs.current.add(cb);
    cb(pos.current);
    return () => {
      subs.current.delete(cb);
    };
  }, []);

  const getPos = useCallback(() => pos.current, []);

  useEffect(() => () => stop(), [stop]);

  return { subscribe, getPos, setPos, settleTo, snapTo, release };
}

// ── Helpers ───────────────────────────────────────────────────
// Status dot colors — matched to the web mapping exactly.
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
  if (h.purchaseUrl)
    return { href: withUtm(h.purchaseUrl, h.id), label: "Order" };
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

async function shareCompare(a: Humanoid, b: Humanoid) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("compare", `${a.id},${b.id}`);
  await doShare(`${a.name} vs ${b.name} — Humanoid Index`, url.toString());
}

// ── Card visual (stable; positioned imperatively by the deck) ──
function DeckCard({ h, width }: { h: Humanoid; width: number }) {
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{
        width,
        height: "100%",
        borderRadius: CARD_RADIUS,
        background: "#F9F9F9",
      }}
    >
      {h.imageUrl && (
        <Image
          src={h.imageUrl}
          alt={h.name}
          fill
          sizes={`${Math.round(width)}px`}
          priority={false}
          className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
          style={{
            objectPosition: h.imagePosition ?? "center",
            padding: h.imageFit === "cover" ? 0 : "9%",
            transform: h.imageScale ? `scale(${h.imageScale})` : undefined,
          }}
          draggable={false}
        />
      )}
    </div>
  );
}

// ── Detail sheet ──────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ padding: "11px 0", borderTop: "1px solid rgba(0,0,0,0.05)" }}
    >
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
      sheetRef.current.style.transform = shouldClose
        ? "translateY(100%)"
        : "translateY(0)";
    }
    if (shouldClose) window.setTimeout(onClose, 260);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 200, animation: `mv-backdrop-in 260ms ${EASE_OUT} both` }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(20,20,24,0.28)", backdropFilter: "blur(2px)" }}
      />
      <div
        ref={sheetRef}
        className="relative bg-white overflow-hidden"
        style={{
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: "88dvh",
          animation: `mv-sheet-in 380ms ${EASE_SHEET} both`,
          boxShadow: "0 -20px 60px rgba(0,0,0,0.16)",
        }}
      >
        {/* grab handle */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ padding: "12px 0 4px", touchAction: "none", cursor: "grab" }}
          className="flex justify-center"
        >
          <div
            style={{
              width: 38,
              height: 5,
              borderRadius: 3,
              background: "rgba(0,0,0,0.14)",
            }}
          />
        </div>

        <div
          className="overflow-y-auto"
          style={{ padding: "8px 22px 34px", maxHeight: "calc(88dvh - 28px)" }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            {h.logoUrl && (
              <div
                className="relative overflow-hidden flex-shrink-0"
                style={{ width: 34, height: 34, borderRadius: 9 }}
              >
                <Image src={h.logoUrl} alt={h.manufacturer} fill sizes="34px" className="object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: INK, lineHeight: 1.1 }}>
                {h.name}
              </h2>
              <p style={{ fontSize: 13, color: INK_BODY, marginTop: 2 }}>
                {h.manufacturer}
                {h.year ? ` · ${h.year}` : ""}
              </p>
            </div>
          </div>

          {desc.text && (
            <p style={{ fontSize: 15, lineHeight: 1.5, color: INK_BODY, marginBottom: 18 }}>
              {desc.long || desc.text}
            </p>
          )}

          {h.tags && h.tags.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>
              {h.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 450,
                    color: INK_BODY,
                    padding: "5px 11px",
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.09)",
                  }}
                >
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
              <a
                href={visit.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mv-tap flex-1 flex items-center justify-center"
                style={{
                  height: 50,
                  borderRadius: 15,
                  background: INK,
                  color: "white",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {visit.label}
              </a>
            )}
            <button
              onClick={() => shareRobot(h)}
              className="mv-tap flex items-center justify-center"
              style={{
                width: visit.href ? 50 : undefined,
                flex: visit.href ? undefined : 1,
                height: 50,
                paddingInline: visit.href ? 0 : 20,
                borderRadius: 15,
                background: CHIP.background,
                boxShadow: CHIP.boxShadow,
                color: INK,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {visit.href ? <ShareGlyph /> : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compare sheet ─────────────────────────────────────────────
function CompareMini({ h }: { h: Humanoid }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center">
      <div
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{ aspectRatio: "3 / 4", borderRadius: 18, background: SURFACE }}
      >
        {h.imageUrl && (
          <Image
            src={h.imageUrl}
            alt={h.name}
            fill
            sizes="170px"
            className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
            style={{
              objectPosition: h.imagePosition ?? "center",
              padding: h.imageFit === "cover" ? 0 : "8%",
            }}
          />
        )}
      </div>
      <p
        className="truncate w-full text-center"
        style={{ fontSize: 15, fontWeight: 600, color: INK, marginTop: 9 }}
      >
        {h.name}
      </p>
      <p className="truncate w-full text-center" style={{ fontSize: 12, color: INK_MUTED }}>
        {h.manufacturer}
      </p>
    </div>
  );
}

function CompareRow({ label, a, b, win }: { label: string; a: string; b: string; win?: "a" | "b" }) {
  // The leading value reads bold/ink; the trailing one recedes to body ink —
  // the same "highlight the max" structure the web compare panel uses.
  return (
    <div
      className="flex items-center"
      style={{ padding: "10px 0", borderTop: "1px solid rgba(0,0,0,0.05)" }}
    >
      <span
        className="flex-1 text-right"
        style={{ fontSize: 14, fontWeight: win === "a" ? 600 : 500, color: win && win !== "a" ? INK_BODY : INK }}
      >
        {a}
      </span>
      <span style={{ width: 92, textAlign: "center", fontSize: 11.5, color: INK_MUTED }}>
        {label}
      </span>
      <span
        className="flex-1"
        style={{ fontSize: 14, fontWeight: win === "b" ? 600 : 500, color: win && win !== "b" ? INK_BODY : INK }}
      >
        {b}
      </span>
    </div>
  );
}

const priceOf = (h: Humanoid) => (h.cost && h.cost !== "N/A" ? h.cost : "—");

function CompareSheet({
  primary,
  initialSecondaryId,
  onClose,
}: {
  primary: Humanoid;
  initialSecondaryId?: string;
  onClose: () => void;
}) {
  const others = useMemo(() => humanoids.filter((h) => h.id !== primary.id), [primary.id]);
  const [secId, setSecId] = useState(
    initialSecondaryId && initialSecondaryId !== primary.id && humanoids.some((h) => h.id === initialSecondaryId)
      ? initialSecondaryId
      : others[0]?.id
  );
  const secondary = humanoids.find((h) => h.id === secId) ?? others[0];
  const blurb = useMemo(
    () => (secondary ? getCompareBlurb(primary, secondary) : null),
    [primary, secondary]
  );

  if (!secondary) return null;

  // Highlight the larger of two numbers (matches the web's "max value bold").
  const higher = (x?: number, y?: number): "a" | "b" | undefined =>
    x == null || y == null || x === y ? undefined : x > y ? "a" : "b";

  const rows: { label: string; a: string; b: string; win?: "a" | "b" }[] = [
    { label: "Height", a: primary.height ? `${primary.height} cm` : "—", b: secondary.height ? `${secondary.height} cm` : "—", win: higher(primary.height, secondary.height) },
    { label: "Weight", a: primary.weight ? `${primary.weight} kg` : "—", b: secondary.weight ? `${secondary.weight} kg` : "—", win: higher(primary.weight, secondary.weight) },
    { label: "Speed", a: primary.maxSpeed ? `${primary.maxSpeed} m/s` : "—", b: secondary.maxSpeed ? `${secondary.maxSpeed} m/s` : "—", win: higher(primary.maxSpeed, secondary.maxSpeed) },
    { label: "DOF", a: primary.dof ? `${primary.dof}` : "—", b: secondary.dof ? `${secondary.dof}` : "—", win: higher(primary.dof, secondary.dof) },
    { label: "Price", a: priceOf(primary), b: priceOf(secondary) },
    { label: "Status", a: primary.status ?? "—", b: secondary.status ?? "—" },
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 200, animation: `mv-backdrop-in 260ms ${EASE_OUT} both` }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(20,20,24,0.28)", backdropFilter: "blur(2px)" }}
      />
      <div
        className="relative bg-white overflow-hidden flex flex-col"
        style={{
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          maxHeight: "92dvh",
          animation: `mv-sheet-in 380ms ${EASE_SHEET} both`,
          boxShadow: "0 -20px 60px rgba(0,0,0,0.16)",
        }}
      >
        <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "18px 22px 12px" }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>Compare</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => shareCompare(primary, secondary)}
              aria-label="Share comparison"
              className="mv-tap flex items-center justify-center"
              style={{ ...CHIP, width: 32, height: 32, borderRadius: 999 }}
            >
              <ShareGlyph size={15} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="mv-tap flex items-center justify-center"
              style={{ ...CHIP, width: 32, height: 32, borderRadius: 999 }}
            >
              <CloseGlyph />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ padding: "0 22px calc(env(safe-area-inset-bottom) + 24px)" }}>
          <div className="flex gap-4" style={{ marginTop: 4 }}>
            <CompareMini h={primary} />
            <CompareMini h={secondary} />
          </div>

          <div style={{ marginTop: 20 }}>
            {rows.map((r) => (
              <CompareRow key={r.label} label={r.label} a={r.a} b={r.b} win={r.win} />
            ))}
          </div>

          {blurb?.text && (
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: INK_BODY, marginTop: 20 }}>
              {blurb.long || blurb.text}
            </p>
          )}

          <p style={{ fontSize: 12, color: INK_MUTED, margin: "22px 0 10px" }}>
            Compare with
          </p>
          <div
            className="flex gap-2 overflow-x-auto"
            style={{ paddingBottom: 4, WebkitOverflowScrolling: "touch" }}
          >
            {others.map((h) => {
              const sel = h.id === secId;
              return (
                <button
                  key={h.id}
                  onClick={() => setSecId(h.id)}
                  className="flex-shrink-0 flex flex-col items-center"
                  style={{ width: 58 }}
                >
                  <div
                    className="relative overflow-hidden flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      background: SURFACE,
                      boxShadow: sel ? `0 0 0 2px ${INK}` : "none",
                    }}
                  >
                    {h.imageUrl && (
                      <Image
                        src={h.imageUrl}
                        alt={h.name}
                        fill
                        sizes="52px"
                        className="object-contain"
                        style={{ padding: "12%" }}
                      />
                    )}
                  </div>
                  <span
                    className="truncate w-full text-center"
                    style={{ fontSize: 10.5, color: sel ? INK : INK_MUTED, marginTop: 5 }}
                  >
                    {h.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Glyphs ────────────────────────────────────────────────────
function CloseGlyph() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={INK_BODY} strokeWidth={2} strokeLinecap="round">
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
function ShuffleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={INK_BODY} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </svg>
  );
}
function GridGlyph() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={INK_BODY} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
  );
}

// ── Chip ──────────────────────────────────────────────────────
// One consistent label pill — hairline outline, muted ink, optional status dot.
function Chip({ children, dot, pulse }: { children: string; dot?: string; pulse?: boolean }) {
  return (
    <span
      className="inline-flex items-center"
      style={{ ...TYPE.chip, color: INK_BODY, gap: 6, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.09)" }}
    >
      {dot && (
        <span className="relative inline-flex" style={{ width: 6, height: 6 }}>
          {pulse && (
            <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: dot, animation: "mv-ping 1.9s ease-out infinite" }} />
          )}
          <span style={{ position: "relative", width: 6, height: 6, borderRadius: 999, background: dot }} />
        </span>
      )}
      {children}
    </span>
  );
}

// ── Grid overlay ──────────────────────────────────────────────
// Browse-all: a scannable grid of every humanoid. Tap one to drop straight into
// the Cover Flow at that robot. The "see many" complement to the "focus one" deck
// (Cosmos.so / Apple Photos, in the site's own language).
function GridOverlay({
  activeId,
  onPick,
  onClose,
}: {
  activeId: string;
  onPick: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 210, background: "#fff", animation: `mv-grid-in 300ms ${EASE_OUT} both` }}
    >
      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "16px 20px 10px" }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>All humanoids</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="mv-tap flex items-center justify-center"
          style={{ ...CHIP, width: 34, height: 34, borderRadius: 999 }}
        >
          <CloseGlyph />
        </button>
      </div>
      <div
        className="overflow-y-auto"
        style={{ padding: "4px 16px calc(env(safe-area-inset-bottom) + 20px)", WebkitOverflowScrolling: "touch" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {humanoids.map((h, i) => (
            <button key={h.id} onClick={() => onPick(i)} className="mv-tap flex flex-col" style={{ textAlign: "left", minWidth: 0 }}>
              <div
                className="relative overflow-hidden w-full"
                style={{
                  aspectRatio: "3 / 4",
                  borderRadius: 14,
                  background: "#F9F9F9",
                  boxShadow: h.id === activeId ? `inset 0 0 0 2px ${INK}` : "inset 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                {h.imageUrl && (
                  <Image
                    src={h.imageUrl}
                    alt={h.name}
                    fill
                    sizes="130px"
                    className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
                    style={{ objectPosition: h.imagePosition ?? "center", padding: h.imageFit === "cover" ? 0 : "8%" }}
                  />
                )}
              </div>
              <span className="truncate w-full" style={{ ...TYPE.value, color: INK, marginTop: 7 }}>{h.name}</span>
              <span className="truncate w-full" style={{ fontSize: 12, color: INK_MUTED }}>{h.manufacturer}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Intro ─────────────────────────────────────────────────────
// A brief branded moment on first paint — the logo mark with a drawing ring —
// that dissolves to reveal the deck. Mirrors the web intro, tuned shorter for the
// phone. Tap to skip; skipped entirely under reduced-motion.
function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1150);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div
      onClick={onDone}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 300, background: "#fff", animation: `mv-intro-out 300ms ${EASE_OUT} 850ms both` }}
    >
      <div className="flex flex-col items-center" style={{ animation: `mv-intro-mark 700ms ${EASE_OUT} both` }}>
        <svg width={54} height={54} viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke={INK}
            strokeWidth="1"
            strokeOpacity="0.16"
            style={{ strokeDasharray: 69.1, strokeDashoffset: 69.1, animation: `mv-ring 820ms ${EASE_OUT} 150ms forwards` }}
          />
          <circle cx="12" cy="8.6" r="2.3" fill={INK} />
          <rect x="9.5" y="12" width="5" height="6.4" rx="1.4" fill={INK} />
        </svg>
        <span
          style={{ marginTop: 14, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: INK, animation: `mv-intro-word 600ms ${EASE_OUT} 250ms both` }}
        >
          Humanoid Index
        </span>
      </div>
    </div>
  );
}

// ── Scrub bar ─────────────────────────────────────────────────
// Fast navigation across the whole index — drag to fly through the deck with a
// live name label. The web's arc-dots, distilled to a thumb on a hairline rail.
// Fully imperative (refs only) so it never re-renders while you scrub.
function ScrubBar({ deck }: { deck: ReturnType<typeof useDeck> }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const place = useCallback((frac: number) => {
    const pct = `${frac * 100}%`;
    if (thumbRef.current) thumbRef.current.style.left = pct;
    if (fillRef.current) fillRef.current.style.width = pct;
    if (labelRef.current) labelRef.current.style.left = pct;
  }, []);

  // Follow the deck position continuously (also while flicking / tapping).
  useEffect(() => {
    return deck.subscribe((p) => {
      place(N > 1 ? Math.max(0, Math.min(1, p / (N - 1))) : 0);
    });
  }, [deck, place]);

  const active = useCallback((on: boolean) => {
    if (thumbRef.current) {
      thumbRef.current.style.width = on ? "16px" : "12px";
      thumbRef.current.style.height = on ? "16px" : "12px";
    }
    if (labelRef.current) labelRef.current.style.opacity = on ? "1" : "0";
  }, []);

  const scrubToX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    deck.setPos(frac * (N - 1)); // continuous — the ribbon slides under the finger
    if (labelRef.current) labelRef.current.textContent = humanoids[Math.round(frac * (N - 1))]?.name ?? "";
  }, [deck]);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    active(true);
    scrubToX(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragging.current) scrubToX(e.clientX);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    deck.settleTo(Math.round(deck.getPos())); // ease to the nearest card
    active(false);
  };

  return (
    <div
      ref={trackRef}
      className="relative"
      style={{ height: 22, touchAction: "none", cursor: "pointer" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="absolute" style={{ left: 0, right: 0, top: "50%", height: 3, marginTop: -1.5, borderRadius: 999, background: "rgba(0,0,0,0.07)" }} />
      <div ref={fillRef} className="absolute" style={{ left: 0, top: "50%", height: 3, marginTop: -1.5, borderRadius: 999, background: "rgba(0,0,0,0.22)", width: "0%" }} />
      <div
        ref={thumbRef}
        className="absolute"
        style={{ left: "0%", top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: 999, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(0,0,0,0.1)", transition: "width 140ms ease, height 140ms ease" }}
      />
      <div
        ref={labelRef}
        className="absolute"
        style={{ bottom: "100%", left: "0%", transform: "translate(-50%,-8px)", padding: "4px 10px", borderRadius: 9, background: INK, color: "#fff", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, transition: "opacity 140ms ease" }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function MobileView() {
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Humanoid | null>(null);
  const [compare, setCompare] = useState<{ primary: Humanoid; secondaryId?: string } | null>(null);
  const [spin, setSpin] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [grid, setGrid] = useState(false);

  const deck = useDeck(setActive);

  // Deeplink hydration — land on the shared robot/comparison instantly on mount,
  // mirroring the web's snapTo (no animation, correct from the first frame).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setIntroDone(true);
    const params = new URLSearchParams(window.location.search);
    const cmp = params.get("compare");
    if (cmp) {
      const [aId, bId] = cmp.split(",");
      const ai = humanoids.findIndex((h) => h.id === aId);
      if (ai >= 0) {
        deck.snapTo(ai);
        setActive(ai);
        setCompare({ primary: humanoids[ai], secondaryId: bId });
      }
      return;
    }
    const hId = params.get("h");
    if (hId) {
      const hi = humanoids.findIndex((h) => h.id === hId);
      if (hi >= 0) {
        deck.snapTo(hi);
        setActive(hi);
      }
    }
    // deck identity is stable; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Measure the deck area.
  useLayoutEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cardW = Math.min(300, dims.w * CARD_W_FRAC);
  const centerGap = dims.w * CENTER_GAP_FRAC; // finger px per card at center
  const stackGap = dims.w * STACK_GAP_FRAC;
  const stride = centerGap;

  // Position every card from the current spring position — Cover Flow.
  useEffect(() => {
    if (!dims.w) return;
    // Cards fan out along a 3D arc: the centered one is flat and forward, siblings
    // tilt to face center and recede in Z, stacking as they go (the web arc, in 3D).
    const layout = (p: number) => {
      for (let i = 0; i < N; i++) {
        const node = cardRefs.current[i];
        if (!node) continue;
        const o = i - p;
        const d = Math.abs(o);
        if (d > REACH + 0.05) {
          node.style.opacity = "0";
          node.style.pointerEvents = "none";
          continue;
        }
        const sign = o < 0 ? -1 : 1;
        const near = Math.min(d, 1); // 0..1 as the card slides out of center
        const far = Math.max(0, d - 1); // stacked distance beyond the first sibling
        const x = sign * (centerGap * near + far * stackGap);
        const z = -(near * DEPTH + far * STACK_Z);
        const rotY = -sign * ROT * near; // face center; full tilt once a card out
        const opacity = 1 - (Math.min(d, REACH) / REACH) * SIDE_FADE;
        node.style.transform = `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg)`;
        node.style.opacity = Math.max(0, opacity).toFixed(3);
        node.style.zIndex = String(100 - Math.round(d * 10));
        // Only the near cards take taps, so fanned neighbors don't swallow a press.
        node.style.pointerEvents = d < 1.6 ? "auto" : "none";
      }
    };
    return deck.subscribe(layout);
  }, [deck, dims.w, centerGap, stackGap]);

  // Drag / flick.
  const gesture = useRef({
    active: false,
    startX: 0,
    startPos: 0,
    moved: false,
    lastX: 0,
    lastT: 0,
    vx: 0,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    gesture.current = {
      active: true,
      startX: e.clientX,
      startPos: deck.getPos(),
      moved: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vx: 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active) return;
    const dx = e.clientX - g.startX;
    if (Math.abs(dx) > TAP_SLOP) g.moved = true;
    const dt = e.timeStamp - g.lastT;
    if (dt > 0) {
      const inst = (e.clientX - g.lastX) / dt; // px/ms, this sample
      g.vx = g.vx * 0.65 + inst * 0.35; // smoothed — one noisy sample can't kill the flick
    }
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    deck.setPos(g.startPos - dx / stride);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    if (!g.moved) return; // tap handled by the card's onClick
    // Drop momentum if the finger rested before lifting — a pause means "place
    // it here", not "fling". Otherwise hand the smoothed velocity to the spring.
    const vx = e.timeStamp - g.lastT > 60 ? 0 : g.vx; // px/ms, + = finger moving right
    deck.release(-vx / stride); // finger-right → deck moves toward a lower index
  };

  const onCardTap = (i: number) => {
    if (gesture.current.moved) return;
    if (i === active) setDetail(humanoids[i]);
    else deck.settleTo(i);
  };

  const shuffle = useCallback(() => {
    let next = active;
    while (next === active && N > 1) next = Math.floor(Math.random() * N);
    setSpin((s) => s + 1); // tumble the glyph
    deck.settleTo(next);
  }, [active, deck]);

  const current = humanoids[active];

  return (
    <main
      className="relative flex flex-col bg-white overflow-hidden"
      style={{
        height: "100dvh",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        color: INK,
        overscrollBehavior: "none",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "16px 20px 6px" }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Humanoid Index
        </span>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            onClick={() => setGrid(true)}
            aria-label="Browse all"
            className="mv-tap flex items-center justify-center"
            style={{ ...CHIP, width: 38, height: 38, borderRadius: 999 }}
          >
            <GridGlyph />
          </button>
          <button
            onClick={shuffle}
            aria-label="Shuffle"
            className="mv-tap flex items-center justify-center"
            style={{ ...CHIP, width: 38, height: 38, borderRadius: 999 }}
          >
            <span key={spin} style={{ display: "inline-flex", animation: spin ? `mv-tumble 520ms ${EASE_OUT}` : undefined }}>
              <ShuffleGlyph />
            </span>
          </button>
        </div>
      </header>

      {/* Deck */}
      <div
        ref={deckRef}
        className="relative flex-1 overflow-hidden select-none"
        style={{ touchAction: "none", minHeight: 0, isolation: "isolate", perspective: PERSPECTIVE, perspectiveOrigin: "50% 50%" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {dims.w > 0 &&
          humanoids.map((h, i) => (
            <div
              key={h.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                width: cardW,
                height: "82%",
                willChange: "transform, opacity",
              }}
              onClick={() => onCardTap(i)}
            >
              <DeckCard h={h} width={cardW} />
            </div>
          ))}
      </div>

      {/* Scrub bar — drag to fly across the whole index */}
      {dims.w > 0 && (
        <div className="flex-shrink-0" style={{ padding: "10px 26px 0" }}>
          <ScrubBar deck={deck} />
        </div>
      )}

      {/* Footer — the centered robot */}
      <footer
        className="flex-shrink-0"
        style={{ padding: "14px 24px calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        {current && (
          <div>
            <h1 style={{ ...TYPE.title, color: INK }}>{current.name}</h1>

            {/* Label chips — one consistent text style for all metadata */}
            <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
              <Chip>{current.manufacturer}</Chip>
              {current.useCase && <Chip>{current.useCase}</Chip>}
              {current.status && (
                <Chip dot={statusColor(current.status)} pulse={current.status === "In Production"}>
                  {current.status}
                </Chip>
              )}
              {current.year && <Chip>{String(current.year)}</Chip>}
            </div>

            {/* Stat strip */}
            <div className="flex gap-6" style={{ marginTop: 16 }}>
              <Stat label="Height" value={current.height ? `${current.height} cm` : "—"} />
              <Stat label="Weight" value={current.weight ? `${current.weight} kg` : "—"} />
              <Stat
                label={current.maxSpeed ? "Speed" : "DOF"}
                value={current.maxSpeed ? `${current.maxSpeed} m/s` : current.dof ? `${current.dof}` : "—"}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5" style={{ marginTop: 18 }}>
              <button
                onClick={() => setDetail(current)}
                className="mv-tap flex-1 flex items-center justify-center"
                style={{ height: 48, borderRadius: 14, background: INK, color: "white", fontSize: 15, fontWeight: 500 }}
              >
                Details
              </button>
              <button
                onClick={() => setCompare({ primary: current })}
                className="mv-tap flex-1 flex items-center justify-center"
                style={{ ...CHIP, height: 48, borderRadius: 14, color: INK, fontSize: 15, fontWeight: 500 }}
              >
                Compare
              </button>
              <button
                onClick={() => shareRobot(current)}
                aria-label="Share"
                className="mv-tap flex items-center justify-center"
                style={{ ...CHIP, width: 48, height: 48, borderRadius: 14 }}
              >
                <ShareGlyph />
              </button>
            </div>
          </div>
        )}
      </footer>

      {detail && <DetailSheet h={detail} onClose={() => setDetail(null)} />}
      {compare && (
        <CompareSheet
          primary={compare.primary}
          initialSecondaryId={compare.secondaryId}
          onClose={() => setCompare(null)}
        />
      )}
      {grid && (
        <GridOverlay
          activeId={current?.id ?? ""}
          onPick={(i) => {
            deck.snapTo(i);
            setActive(i);
            setGrid(false);
          }}
          onClose={() => setGrid(false)}
        />
      )}
      {!introDone && <Intro onDone={() => setIntroDone(true)} />}

      <style jsx global>{`
        @keyframes mv-sheet-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes mv-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mv-ping {
          0% { transform: scale(1); opacity: 0.5; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes mv-tumble {
          0% { transform: rotate(0deg) scale(1); }
          35% { transform: rotate(-150deg) scale(1.08); }
          70% { transform: rotate(-330deg) scale(1); }
          100% { transform: rotate(-360deg) scale(1); }
        }
        @keyframes mv-ring { to { stroke-dashoffset: 0; } }
        @keyframes mv-intro-mark {
          from { opacity: 0; transform: scale(0.82); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes mv-intro-word {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mv-intro-out { to { opacity: 0; } }
        @keyframes mv-grid-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mv-tap { transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1); }
        .mv-tap:active { transform: scale(0.96); }
      `}</style>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span style={{ fontSize: 12, color: INK_MUTED }}>{label}</span>
      <span style={{ ...TYPE.value, color: INK, marginTop: 2 }}>{value}</span>
    </div>
  );
}
