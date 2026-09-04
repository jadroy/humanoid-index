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
import { INK, INK_BODY, INK_MUTED, SURFACE } from "@/lib/design/tokens";

// ── Constants ─────────────────────────────────────────────────
// The deck reads as a deck because the neighbours are visibly there. Slide,
// gap and side padding are one system: a centre-snapped slide sits at
// (100 - SLIDE)/2, so the next one shows `(100 - SLIDE)/2 - GAP` of itself.
// 84 / 2 leaves a 6vw sliver — about 25px on a 393pt phone, enough of a
// rounded tile edge to say "there is another one over there" without the
// hint animation having to carry the whole idea.
const SLIDE = 84; // vw
const GAP = 2; // vw between slides
const PAD = (100 - SLIDE) / 2; // vw — side padding, so slide 1 centres
const GUTTER = 22; // px — text inset inside the sheet, matching the web panel
const LIP_FALLBACK = 104; // pre-measurement estimate of the resting header

// Sheet geometry. Three detents: peek (the lip), half, full.
const SHEET_FULL = 0.92; // sheet height as a fraction of the viewport
const DETENT_HALF = 0.48; // half detent, same units
const SPRING_RESPONSE = 0.42; // s — perceptual period of the settle
const SPRING_DAMPING = 0.82; // <1 leaves a trace of overshoot
const FLICK = 420; // px/s past which a release is a flick, not a drop
const RUBBER = 150; // px asymptote when dragged past a limit

// Desktop is a grey card on a white page. Mobile inverts it — white card on
// a grey page — and that isn't a drift, it's the same idea at a different
// size. On desktop the card is one object among several on a white sheet of
// paper. On a phone the card is nearly the whole screen, so painting it grey
// paints the screen grey, and every robot ends up standing on a dull slab
// (the art is all shot on white, so it doesn't sit on grey, it fights it).
// Inverting keeps the robot on the white it was photographed against and
// spends the grey on the margin instead, where its whole job is to let the
// neighbouring cards' edges show.
const PAGE_BG = SURFACE; // #F1F1F6
const TILE_BG = "#FFFFFF";
const TILE_RADIUS = 20;
const SHEET_BG = "#FFFFFF"; // same surface as a card — the sheet is one, raised
const SHEET_TILE = "#F1F1F6";
const HAIRLINE = "rgba(46,46,54,0.10)";
const UNDERLINE = "rgba(46,46,54,0.3)";

// The web info panel's type, lifted value for value.
const LABEL_INK = "rgba(46,46,54,0.55)";
const VALUE_INK = "rgba(46,46,54,0.95)";

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

// Same rows, same order, same wording as the desktop info panel — "DOF" not
// "Degrees of freedom", "Use case" not "Use", and no Country row, because
// country is a chip on the web and is a chip here too.
function statRowsFor(h: Humanoid) {
  const rows: { label: string; value: string }[] = [];
  if (h.height) rows.push({ label: "Height", value: formatHeight(h.height) });
  if (h.weight) rows.push({ label: "Weight", value: formatWeight(h.weight) });
  if (h.dof) rows.push({ label: "DOF", value: `${h.dof}` });
  if (h.maxSpeed) rows.push({ label: "Top speed", value: formatSpeed(h.maxSpeed) });
  if (h.useCase) rows.push({ label: "Use case", value: h.useCase });
  if (h.drive) rows.push({ label: "Drive", value: h.drive });
  if (h.status) rows.push({ label: "Status", value: h.status });
  rows.push({ label: "Price", value: h.cost && h.cost !== "N/A" ? h.cost : "Not yet for sale" });
  return rows;
}

// Chips, built the way the web panel builds them: country first, then the
// hand-curated tags, deduped.
function chipsFor(h: Humanoid) {
  return Array.from(new Set([h.country, ...(h.tags ?? [])].filter(Boolean) as string[]));
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

// ── Card ──────────────────────────────────────────────────────
// One slide, one robot, nothing else. Identity lives in the sheet header
// below, which stays put while these move — so the deck is pure image and
// there is no floating text cluster competing with it.
//
// Apparent size is set by an explicitly sized box, not by padding. Percentage
// padding resolves against the element's *width*, so a "16% top" on a tall
// stage was never 16% of the height and the vertical framing drifted with
// every source aspect — robots ranged from 37% to 88% of the stage.
//
// A fixed box plus object-fit: contain caps both axes honestly: tall sources
// hit the height limit and land at a consistent size, and the few genuinely
// wide ones (Armar-6 is a 4:3 photograph) stay width-limited, which is the
// truth about them rather than a bug to paper over.
// The stage measures 370x726 on a 430pt phone, so a 94%-wide box caps a
// source at 348px across. Height 72% (523px) is where that cap crosses: every
// source up to ~0.67 aspect lands at exactly 72%, which is 27 of the 29
// robots. Picked deliberately — a taller target only stretches the tall ones
// away from the wide ones it can't lift.
const BOX_W = "88%";
const BOX_H = "70%";
const BOX_H_GROUNDED = "78%"; // bottom-anchored sources are cropped, so allow more

function Card({ h, priority }: { h: Humanoid; priority: boolean }) {
  const position = h.imagePosition ?? "center";
  // Sources cut off at their own bottom edge (ameca.png ends mid-thigh) are
  // anchored bottom in the data. Stand those on the drawer so the crop reads
  // as a waist-up portrait rather than a mistake.
  const grounded = position.includes("bottom");
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: grounded ? "flex-end" : "center",
        justifyContent: "center",
        // The tile. Desktop puts the robot on #F9F9F9 at radius 20 and leaves
        // the page white; doing the same here is what turns a page into a
        // deck — the neighbour's rounded edge is now visible at both margins.
        background: TILE_BG,
        borderRadius: TILE_RADIUS,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: BOX_W, height: grounded ? BOX_H_GROUNDED : BOX_H }}>
        {h.imageUrl && (
          <RobotImage
            src={h.imageUrl}
            alt={h.name}
            fill
            sizes={`${SLIDE}vw`}
            priority={priority}
            style={{
              // `imageFit: "cover"` is a desktop decision — those cards are
              // wide, so a crop reads as framing. Here it eats limbs.
              objectFit: "contain",
              objectPosition: grounded ? "bottom" : "center",
              transform: h.imageScale && h.imageScale !== 1 ? `scale(${h.imageScale})` : undefined,
            }}
          />
        )}
      </div>
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
  index,
  total,
  onCopied,
  onLipHeight,
}: {
  h: Humanoid;
  index: number;
  total: number;
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
  const chips = chipsFor(h);
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
          // The sheet is another white surface on the grey page, so the page
          // separates it and all that's left to do is lift it a little.
          boxShadow: "0 -10px 30px rgba(46,46,54,0.06)",
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
            padding: `0 ${GUTTER}px`,
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 34, height: 4, borderRadius: 999, background: "rgba(46,46,54,0.16)" }} />
          </div>
          {/* The placard, built the way the web one is: logo, name with the
              year set quiet beside it, manufacturer underneath. Mobile used to
              run "Manufacturer · Year" as one grey line, which is a caption;
              this is a label on an object. */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
            {/* Keyed so a swipe swaps the identity with a soft fade, not a cut. */}
            <div key={h.id} style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10, animation: "deck-swap 240ms cubic-bezier(0.22,1,0.36,1)" }}>
              {h.logoUrl && (
                <span
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: SHEET_TILE,
                  }}
                >
                  <RobotImage src={h.logoUrl} alt="" fill sizes="26px" style={{ objectFit: "cover" }} />
                </span>
              )}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: INK,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {h.name}
                  </span>
                  {h.year && (
                    <span style={{ fontSize: 13, fontWeight: 400, color: INK_MUTED, letterSpacing: "-0.03em", flexShrink: 0 }}>
                      {h.year}
                    </span>
                  )}
                </span>
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: INK_BODY, letterSpacing: "-0.03em", lineHeight: 1.3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {h.manufacturer}
                </span>
              </span>
            </div>
            {/* Position, on the same alignment as the name — the dots used to
                float centred between the robot and the drawer with nothing to
                anchor them. */}
            <div
              style={{
                fontSize: 12,
                color: INK_MUTED,
                lineHeight: 1.3,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
                paddingBottom: 3,
              }}
            >
              {index + 1} / {total}
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
            padding: `0 ${GUTTER}px calc(34px + env(safe-area-inset-bottom))`,
          }}
        >
          {/* Description, stats, chips — the web panel's order exactly. It
              used to run description, chips, stats, which put the loosest
              content in the middle and broke the rhythm the desktop has. */}
          {text && <p style={{ fontSize: 15, lineHeight: 1.55, color: INK_BODY, letterSpacing: "-0.01em", marginTop: 2 }}>{text}</p>}
          {long && <p style={{ fontSize: 15, lineHeight: 1.55, color: INK_BODY, letterSpacing: "-0.01em", marginTop: 12 }}>{long}</p>}

          {rows.length > 0 && (
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${HAIRLINE}` }}>
              {/* One hairline above the block and none between the rows — the
                  desktop panel spaces these, it doesn't rule them. Ruled rows
                  are what made each robot read as a database record. */}
              {rows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between" style={{ padding: "6px 0", gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 450, color: LABEL_INK, letterSpacing: "-0.03em" }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 450, color: VALUE_INK, letterSpacing: "-0.03em", textAlign: "right" }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}

          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 20 }}>
              {chips.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    fontWeight: 450,
                    color: LABEL_INK,
                    letterSpacing: "-0.03em",
                    padding: "5px 11px",
                    borderRadius: 999,
                    border: `1px solid ${HAIRLINE}`,
                    lineHeight: 1.35,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
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
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${HAIRLINE}` }}>
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

  // ── Swipe hint ──
  // With the robots contained on white there's little of the neighbour showing
  // to imply a deck, so show the motion instead: once per session, after the
  // first images settle, the track eases out and springs back.
  //
  // Snap is suspended for the duration or the browser corrects the small
  // offset away. Restoring it is the whole risk here — a deck stuck without
  // snap is far worse than a missing hint — so every exit restores, and a
  // timer that owes nothing to rAF restores regardless of what happens to the
  // animation (interrupted, unmounted, backgrounded tab, frozen frame).
  useEffect(() => {
    const el = trackRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem("deck-hinted")) return;
    } catch {
      /* private mode — just show it */
    }

    const DUR = 1100;
    let raf = 0;
    let safety = 0;
    let done = false;
    const restore = () => {
      done = true;
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      el.style.scrollSnapType = "x mandatory";
    };
    el.addEventListener("touchstart", restore, { passive: true, once: true });

    const timer = window.setTimeout(() => {
      if (done) return;
      try {
        sessionStorage.setItem("deck-hinted", "1");
      } catch {
        /* no-op */
      }
      const from = el.scrollLeft;
      el.style.scrollSnapType = "none";
      safety = window.setTimeout(restore, DUR + 600);
      const t0 = performance.now();
      const step = (now: number) => {
        if (done) return;
        const p = Math.min(1, (now - t0) / DUR);
        // Out and back on a single sine bump — no settle for snap to argue with.
        el.scrollLeft = from + 46 * Math.sin(p * Math.PI);
        if (p < 1) {
          raf = requestAnimationFrame(step);
        } else {
          el.scrollLeft = from;
          restore();
        }
      };
      raf = requestAnimationFrame(step);
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("touchstart", restore);
      restore();
    };
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
        background: PAGE_BG,
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${PAD}vw`,
        }}
      >
        <HIMark height={13} />
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
          gap: `${GAP}vw`,
          padding: `0 ${PAD}vw ${lipH + 14}px`,
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

      <DetailSheet
        h={current}
        index={index}
        total={humanoids.length}
        onCopied={() => setToast(true)}
        onLipHeight={setLipH}
      />

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
