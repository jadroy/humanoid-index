"use client";

// Mobile — one card at a time, and nothing else.
//
// The web experience is a spring carousel: a single robot centred on grey,
// neighbours peeking at the edges. This is that, on a phone, with the
// smoothness bought the cheapest way possible — a native horizontal
// scroll-snap track. No rAF, no listeners, no React state during a swipe;
// the finger drives the compositor directly and iOS momentum does the rest.
//
// Everything past the card lives in one drag-up sheet: description, tags,
// stats, links. Compare, true-to-size and 360° stay on desktop — the sheet
// footer says so and hands you the link.
//
// `?h=<id>` lands directly on a robot (synchronous scrollLeft, no animation),
// so shared links and post links open on the right card.

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { getRobotDescription } from "@/lib/robotDescription";
import { withUtm } from "@/lib/outbound";
import { INK, INK_BODY, INK_MUTED } from "@/lib/design/tokens";

// ── Constants ─────────────────────────────────────────────────
const PEEK = 7; // vw of neighbour visible on each side
const SLIDE = 100 - PEEK * 2; // vw
const LIP_FALLBACK = 104; // pre-measurement estimate of the resting header

// Sheet geometry. Three detents: peek (the lip), half, full.
const SHEET_FULL = 0.92; // sheet height as a fraction of the viewport
const DETENT_HALF = 0.48; // half detent, same units
const SPRING_RESPONSE = 0.42; // s — perceptual period of the settle
const SPRING_DAMPING = 0.82; // <1 leaves a trace of overshoot
const FLICK = 420; // px/s past which a release is a flick, not a drop
const RUBBER = 150; // px asymptote when dragged past a limit

// Straight off the web version's palette: white page, #F9F9F9 card tiles at
// radius 20, 1px hairlines, no shadows. Here the drawer takes the tile value
// so it reads as a plinth under the robot, and its own chips go white.
const SHEET_BG = "#F9F9F9";
const SHEET_TILE = "#FFFFFF";
const SHEET_LINE = "rgba(0,0,0,0.06)";
const HAIRLINE = "rgba(0,0,0,0.07)";
const UNDERLINE = "rgba(46,46,54,0.3)";

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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Units — imperial, matching the site's default presentation.
function formatHeight(cm: number) {
  const inches = cm / 2.54;
  let ft = Math.floor(inches / 12);
  let rest = Math.round(inches % 12);
  if (rest === 12) { ft += 1; rest = 0; }
  return `${ft}'${rest}"`;
}
const formatWeight = (kg: number) => `${Math.round(kg * 2.20462)} lb`;
const formatSpeed = (ms: number) => `${(ms * 2.23694).toFixed(1)} mph`;

function statRowsFor(h: Humanoid) {
  const rows: { label: string; value: string }[] = [];
  if (h.country) rows.push({ label: "Country", value: h.country });
  if (h.useCase) rows.push({ label: "Use", value: h.useCase });
  if (h.drive) rows.push({ label: "Drive", value: h.drive });
  if (h.height) rows.push({ label: "Height", value: formatHeight(h.height) });
  if (h.weight) rows.push({ label: "Weight", value: formatWeight(h.weight) });
  if (h.maxSpeed) rows.push({ label: "Top speed", value: formatSpeed(h.maxSpeed) });
  if (h.dof) rows.push({ label: "Degrees of freedom", value: `${h.dof}` });
  if (h.cost && h.cost !== "N/A") rows.push({ label: "Price", value: h.cost });
  if (h.status) rows.push({ label: "Status", value: h.status });
  return rows;
}

function visitTarget(h: Humanoid): { href?: string; label: string } {
  if (h.purchaseUrl) return { href: withUtm(h.purchaseUrl, h.id), label: "Order" };
  return { href: withUtm(h.infoUrl || h.manufacturerUrl, h.id), label: "Visit site" };
}

function robotUrl(h: Humanoid) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("h", h.id);
  return url.toString();
}

async function shareRobot(h: Humanoid, onCopied: () => void) {
  const link = robotUrl(h);
  if (typeof navigator.share === "function") {
    try { await navigator.share({ title: `${h.name} — Humanoid Index`, url: link }); } catch { /* cancelled */ }
    return;
  }
  try { await navigator.clipboard.writeText(link); onCopied(); } catch { /* no-op */ }
}

// Robot imagery. A dropped request leaves a permanent broken-image box on iOS
// Safari — it never retries a failed <img>. Remount on error with backoff;
// the final attempt bypasses the image optimizer entirely.
function RobotImage(props: ComponentProps<typeof Image>) {
  const [attempt, setAttempt] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <Image
      key={attempt}
      {...props}
      unoptimized={attempt >= 2}
      onError={() => {
        if (attempt < 2) timer.current = window.setTimeout(() => setAttempt(attempt + 1), 700 * (attempt + 1));
      }}
    />
  );
}

// ── Glyphs ────────────────────────────────────────────────────
function HIMark({ height = 13, color = "#C5CAD1" }: { height?: number; color?: string }) {
  return (
    <svg width={(17 / 11) * height} height={height} viewBox="0 0 17 11" fill={color} role="img" aria-label="Humanoid Index">
      <path d="M1.96698e-07 0.5C1.96698e-07 0.223858 0.223858 0 0.5 0H4.5C4.77614 0 5 0.223858 5 0.5V10.5C5 10.7761 4.77614 11 4.5 11H0.5C0.223858 11 1.96698e-07 10.7761 1.96698e-07 10.5V0.5Z" />
      <path d="M10.5 3C10.7761 3 11 3.22386 11 3.5V7.5C11 7.77614 10.7761 8 10.5 8L0.5 8C0.223858 8 -1.20706e-08 7.77614 0 7.5L1.74841e-07 3.5C1.86912e-07 3.22386 0.223858 3 0.5 3L10.5 3Z" />
      <path d="M6 0.5C6 0.223858 6.22386 0 6.5 0H10.5C10.7761 0 11 0.223858 11 0.5V10.5C11 10.7761 10.7761 11 10.5 11H6.5C6.22386 11 6 10.7761 6 10.5V0.5Z" />
      <path d="M12 0.5C12 0.223858 12.2239 0 12.5 0H16.5C16.7761 0 17 0.223858 17 0.5V10.5C17 10.7761 16.7761 11 16.5 11H12.5C12.2239 11 12 10.7761 12 10.5V0.5Z" />
    </svg>
  );
}
function ShareGlyph({ size = 18, color = INK_BODY }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3M12 3l-4 4M12 3l4 4" />
      <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    </svg>
  );
}
function ArrowGlyph({ size = 13, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  );
}

// ── Page dots ─────────────────────────────────────────────────
// iOS page-control: the rail holds every robot but only a window is at full
// size — the row slides so the active dot stays centred. Index-driven, so it
// repaints on settle, never during a swipe.
const DOT = 6;
const DOT_STEP = 12;
const DOT_WINDOW = 7;

function PageDots({ index }: { index: number }) {
  const railW = DOT_WINDOW * DOT_STEP;
  return (
    <div style={{ width: railW, height: DOT, overflow: "hidden", margin: "0 auto", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: railW / 2 - DOT_STEP / 2,
          display: "flex",
          transform: `translate3d(${-index * DOT_STEP}px,0,0)`,
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
        }}
      >
        {humanoids.map((h, i) => {
          const d = Math.abs(i - index);
          const scale = d === 0 ? 1 : d === 1 || d === 2 ? 0.72 : d === 3 ? 0.5 : 0.34;
          return (
            <span
              key={h.id}
              style={{
                width: DOT,
                height: DOT,
                marginRight: DOT_STEP - DOT,
                borderRadius: 999,
                flexShrink: 0,
                background: d === 0 ? INK : INK_MUTED,
                opacity: d === 0 ? 1 : d > 3 ? 0.3 : 0.5,
                transform: `scale(${scale})`,
                transition: "transform 320ms cubic-bezier(0.32,0.72,0,1), opacity 320ms linear, background 320ms linear",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
// One slide, one robot, nothing else. Identity lives in the sheet header
// below, which stays put while these move — so the deck is pure image and
// there is no floating text cluster competing with it.
function Card({ h, priority }: { h: Humanoid; priority: boolean }) {
  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
      {h.imageUrl && (
        <RobotImage
          src={h.imageUrl}
          alt={h.name}
          fill
          sizes={`${SLIDE}vw`}
          priority={priority}
          style={{
            objectFit: h.imageFit ?? "contain",
            objectPosition: h.imagePosition ?? "center",
            padding: "9%",
            transform: h.imageScale && h.imageScale !== 1 ? `scale(${h.imageScale})` : undefined,
          }}
        />
      )}
    </div>
  );
}

// ── Detail sheet ──────────────────────────────────────────────
// Three detents — peek, half, full — driven by a spring integrated per frame
// straight onto `transform`. Nothing here touches React state during a
// gesture; `restDetent` moves only when the sheet comes to rest.
//
// The gesture is continuous in the ways that matter:
//   • A new touch grabs the sheet mid-flight — the spring is cancelled and the
//     drag picks up from wherever the sheet currently is.
//   • Release velocity is seeded into the spring, so a flick overshoots a
//     little and a slow drag eases in.
//   • Body scroll and sheet drag are one system: at the full detent the
//     content scrolls, and a downward drag at scrollTop 0 hands straight over
//     to the sheet with no dead zone in between.
//   • Past a limit the sheet rubber-bands instead of stopping dead.
// Radius and scrim track the drag position, so the sheet reads as attached to
// the finger rather than switching between states.

const nearest = (xs: number[], v: number) =>
  xs.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

function DetailSheet({
  h,
  onCopied,
  onLipHeight,
}: {
  h: Humanoid;
  onCopied: () => void;
  onLipHeight: (px: number) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const anim = useRef({ value: 0, vel: 0, target: 0, raf: 0, last: 0 });
  const [restDetent, setRestDetent] = useState<"peek" | "half" | "full">("peek");
  const reduced = usePrefersReducedMotion();

  const { text, long } = getRobotDescription(h);
  const rows = statRowsFor(h);
  const visit = visitTarget(h);

  // [full, half, peek] in translateY px. Measured, never assumed — the URL bar
  // collapsing changes the viewport under us.
  const detents = useCallback((): [number, number, number] => {
    const el = sheetRef.current;
    if (!el) return [0, 0, 0];
    const H = el.offsetHeight;
    const lip = headRef.current?.offsetHeight || LIP_FALLBACK;
    return [0, H - DETENT_HALF * window.innerHeight, H - lip];
  }, []);

  const paint = useCallback((y: number) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transform = `translate3d(0,${y}px,0)`;
    const [full, , peek] = detents();
    const p = peek > full ? clamp((peek - y) / (peek - full), 0, 1) : 0;
    // Corners tighten as it docks; the scrim comes up with the travel.
    el.style.borderTopLeftRadius = el.style.borderTopRightRadius = `${20 - 6 * p}px`;
    const scrim = scrimRef.current;
    if (scrim) {
      scrim.style.opacity = String(p);
      scrim.style.pointerEvents = p > 0.02 ? "auto" : "none";
    }
    const sc = scrollRef.current;
    if (sc) {
      const scrollable = p > 0.98 ? "auto" : "hidden";
      if (sc.style.overflowY !== scrollable) sc.style.overflowY = scrollable;
    }
  }, [detents]);

  const springTo = useCallback((target: number, vel?: number) => {
    const st = anim.current;
    st.target = target;
    if (vel !== undefined) st.vel = vel;
    const [full, half] = detents();
    setRestDetent(target === full ? "full" : target === half ? "half" : "peek");
    if (reduced) {
      st.value = target;
      st.vel = 0;
      paint(target);
      return;
    }
    if (st.raf) return;
    st.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - st.last) / 1000, 1 / 30);
      st.last = now;
      const w = (2 * Math.PI) / SPRING_RESPONSE;
      st.vel += (w * w * (st.target - st.value) - 2 * SPRING_DAMPING * w * st.vel) * dt;
      st.value += st.vel * dt;
      if (Math.abs(st.target - st.value) < 0.3 && Math.abs(st.vel) < 8) {
        st.value = st.target;
        st.vel = 0;
        st.raf = 0;
        paint(st.value);
        return;
      }
      paint(st.value);
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }, [detents, paint, reduced]);

  // Park at peek once measurable, and stay parked across viewport changes.
  useLayoutEffect(() => {
    const st = anim.current;
    const [, , peek] = detents();
    st.value = peek;
    st.target = peek;
    paint(peek);
    const onResize = () => {
      if (st.raf) return;
      const [full, half, pk] = detents();
      const to = st.target === full ? full : st.target === half ? half : pk;
      st.value = to;
      st.target = to;
      paint(to);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (st.raf) cancelAnimationFrame(st.raf);
    };
  }, [detents, paint]);

  // A different robot under the sheet — reset the inner scroll.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [h.id]);

  // The header sizes itself around the safe area, so its height is the one
  // true lip measurement. The deck lays out against it.
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const report = () => onLipHeight(el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onLipHeight]);

  // ── The gesture ──
  // Native listeners so touchmove can be non-passive: taking over from a
  // native scroll means calling preventDefault mid-stream.
  useEffect(() => {
    const sheet = sheetRef.current;
    const scroller = scrollRef.current;
    if (!sheet || !scroller) return;

    let mode: "idle" | "deciding" | "dragging" | "scrolling" = "idle";
    let startY = 0;
    let baseY = 0;
    let lastY = 0;
    let lastT = 0;
    let vel = 0;
    let moved = 0;

    const onStart = (e: TouchEvent) => {
      const st = anim.current;
      if (st.raf) {
        cancelAnimationFrame(st.raf); // grab it mid-flight
        st.raf = 0;
      }
      const t = e.touches[0];
      mode = "deciding";
      startY = lastY = t.clientY;
      lastT = e.timeStamp;
      baseY = st.value;
      vel = 0;
      moved = 0;
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dy = t.clientY - startY;
      moved = Math.max(moved, Math.abs(dy));
      const dt = e.timeStamp - lastT;
      if (dt > 0) vel = ((t.clientY - lastY) / dt) * 1000;
      lastY = t.clientY;
      lastT = e.timeStamp;

      const [full, , peek] = detents();
      const atFull = Math.abs(baseY - full) < 1;

      if (mode === "deciding") {
        if (Math.abs(dy) < 3) return;
        const scrollable = scroller.scrollHeight > scroller.clientHeight + 1;
        mode =
          atFull && scrollable && (scroller.scrollTop > 0 || dy < 0) ? "scrolling" : "dragging";
      }
      if (mode === "scrolling") {
        // Pulled past the top of the content — the sheet takes the gesture.
        if (scroller.scrollTop <= 0 && dy > 0) {
          mode = "dragging";
          startY = t.clientY;
          baseY = full;
        } else return;
      }

      e.preventDefault();
      let y = baseY + (t.clientY - startY);
      if (y < full) {
        const o = full - y;
        y = full - o / (1 + o / RUBBER);
      } else if (y > peek) {
        const o = y - peek;
        y = peek + o / (1 + o / RUBBER);
      }
      anim.current.value = y;
      paint(y);
    };

    const onEnd = () => {
      if (mode !== "dragging") {
        mode = "idle";
        return;
      }
      mode = "idle";
      const ds = detents();
      const y = anim.current.value;
      let target: number;
      if (Math.abs(vel) > FLICK) {
        // Resolve to the next detent in the direction of travel.
        const dir = vel > 0 ? 1 : -1;
        const ahead = ds.filter((d) => (dir > 0 ? d > y + 1 : d < y - 1));
        target = ahead.length
          ? dir > 0
            ? Math.min(...ahead)
            : Math.max(...ahead)
          : nearest(ds, y);
      } else {
        target = nearest(ds, y);
      }
      springTo(target, vel);
    };

    // A drag ending on the grabber shouldn't also read as a tap.
    const onClick = () => {
      if (moved > 6) return;
      const [full, half, peek] = detents();
      const st = anim.current;
      springTo(Math.abs(st.value - peek) < 1 ? half : Math.abs(st.value - half) < 1 ? full : peek, 0);
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    const grab = sheet.querySelector("[data-grabber]");
    grab?.addEventListener("click", onClick);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
      grab?.removeEventListener("click", onClick);
    };
  }, [detents, paint, springTo]);

  const toPeek = useCallback(() => springTo(detents()[2], 0), [detents, springTo]);

  return (
    <>
      <div
        ref={scrimRef}
        onClick={toPeek}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(46,46,54,0.16)",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 20,
        }}
      />
      <div
        ref={sheetRef}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${SHEET_FULL * 100}dvh`,
          background: SHEET_BG,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: `1px solid ${HAIRLINE}`,
          zIndex: 21,
          display: "flex",
          flexDirection: "column",
          touchAction: "none",
          willChange: "transform",
          // Parked before hydration; the layout effect only re-measures.
          transform: `translate3d(0,calc(100% - ${LIP_FALLBACK}px),0)`,
        }}
      >
        <div
          ref={headRef}
          data-grabber
          role="button"
          aria-expanded={restDetent !== "peek"}
          tabIndex={0}
          style={{
            flexShrink: 0,
            padding: "0 22px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 36, height: 4, borderRadius: 999, background: "#D8D8D8" }} />
          </div>
          {/* Keyed so a swipe swaps the identity with a soft fade rather than a cut. */}
          <div key={h.id} style={{ animation: "deck-swap 240ms cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: INK, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              {h.name}
            </div>
            <div style={{ fontSize: 13, color: INK_MUTED, marginTop: 4, lineHeight: 1.3 }}>
              {[h.manufacturer, h.year].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            touchAction: "pan-y",
            padding: "0 22px calc(34px + env(safe-area-inset-bottom))",
          }}
        >
          {text && <p style={{ fontSize: 15, lineHeight: 1.55, color: INK_BODY, marginTop: 4 }}>{text}</p>}
          {long && <p style={{ fontSize: 15, lineHeight: 1.55, color: INK_BODY, marginTop: 12 }}>{long}</p>}

          {h.tags && h.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 20 }}>
              {h.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    color: INK_BODY,
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: SHEET_TILE,
                    lineHeight: 1,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div style={{ marginTop: 26 }}>
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-baseline justify-between"
                  style={{ padding: "12px 0", borderTop: `1px solid ${SHEET_LINE}` }}
                >
                  <span style={{ fontSize: 13, color: INK_MUTED }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: INK }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {visit.href && (
              <a
                href={visit.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 48,
                  borderRadius: 999,
                  background: INK,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {visit.label}
                <ArrowGlyph />
              </a>
            )}
            <button
              type="button"
              onClick={() => shareRobot(h, onCopied)}
              style={{
                flex: visit.href ? "0 0 48px" : 1,
                height: 48,
                borderRadius: 999,
                background: SHEET_TILE,
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label={`Share ${h.name}`}
            >
              <ShareGlyph size={18} color={INK} />
            </button>
          </div>

          {/* The honest handoff — the rest of the index is a desktop thing. */}
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${SHEET_LINE}` }}>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: INK_MUTED }}>
              Compare robots side by side, scale them against each other, and spin the
              360° renders on the full index — built for a bigger screen.
            </div>
            <button
              type="button"
              onClick={async () => {
                const link = new URL(window.location.href).origin;
                if (typeof navigator.share === "function") {
                  try {
                    await navigator.share({ title: "Humanoid Index", url: link });
                  } catch {
                    /* cancelled */
                  }
                  return;
                }
                try {
                  await navigator.clipboard.writeText(link);
                  onCopied();
                } catch {
                  /* no-op */
                }
              }}
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: 500,
                color: INK,
                background: "none",
                border: "none",
                padding: 0,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                textDecorationColor: UNDERLINE,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Send the link to my computer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function MobileDeck() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState(false);
  const [lipH, setLipH] = useState(LIP_FALLBACK);

  const initial = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const p = new URLSearchParams(window.location.search);
    // `?compare=a,b` has no mobile equivalent — land on the first of the pair.
    const id = p.get("h") ?? p.get("compare")?.split(",")[0];
    const i = id ? humanoids.findIndex((h) => h.id === id) : -1;
    return i >= 0 ? i : 0;
  }, []);

  // Land on the deeplinked robot before first paint — assignment, not
  // scrollIntoView, so there's no animation to watch on arrival.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || initial === 0) return;
    const slide = el.children[initial] as HTMLElement | undefined;
    if (slide) el.scrollLeft = slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2;
    setIndex(initial);
  }, [initial]);

  // Active card via IntersectionObserver — no scroll listener, so the swipe
  // stays entirely off the main thread.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i);
            if (!Number.isNaN(i)) setIndex(i);
          }
        }
      },
      { root: el, threshold: 0.62 }
    );
    Array.from(el.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(false), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const current = humanoids[index] ?? humanoids[0];

  return (
    <main
      style={{
        height: "100dvh",
        overflow: "hidden",
        overscrollBehavior: "none",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 50,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${PEEK}vw`,
        }}
      >
        <HIMark height={12} />
        <button
          type="button"
          onClick={() => shareRobot(current, () => setToast(true))}
          aria-label={`Share ${current.name}`}
          style={{
            width: 34,
            height: 34,
            marginRight: -8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <ShareGlyph />
        </button>
      </div>

      {/* The deck */}
      <div
        ref={trackRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: `${PEEK}vw`,
          padding: `2px ${PEEK}vw ${lipH + 40}px`,
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
        }}
        className="no-scrollbar"
      >
        {humanoids.map((h, i) => (
          <div
            key={h.id}
            data-i={i}
            style={{
              flex: `0 0 ${SLIDE}vw`,
              scrollSnapAlign: "center",
              scrollSnapStop: "always",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Card h={h} priority={i < 3} />
          </div>
        ))}
      </div>

      {/* Dots — sit just above the sheet lip */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: `${lipH + 18}px`, zIndex: 10, pointerEvents: "none" }}>
        <PageDots index={index} />
      </div>

      <DetailSheet h={current} onCopied={() => setToast(true)} onLipHeight={setLipH} />

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "calc(24px + env(safe-area-inset-bottom))",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: "#1a1a1a",
            color: "#fff",
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        >
          Link copied
        </div>
      )}
    </main>
  );
}
