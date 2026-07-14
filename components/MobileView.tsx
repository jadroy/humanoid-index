"use client";

// Mobile experience — a horizontal spring deck.
//
// The desktop signature is the horizontal, spring-loaded ribbon of cards along
// an arc. On mobile we keep that DNA instead of flattening it into a vertical
// feed: one robot centered, neighbors peeking along a subtle arc, thumb-swipe
// left/right that tracks the finger 1:1 then spring-settles with a flick.
//
// Physics mirror hooks/useSpring (stiffness 0.22 / damping 0.72 — the "snappy"
// preset) but run purely on refs + a subscribe loop, so scrolling never touches
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
import { withUtm } from "@/lib/outbound";
import { getRobotDescription } from "@/lib/robotDescription";
import { INK, INK_BODY, INK_MUTED, SURFACE } from "@/lib/design/tokens";

// ── Tuning ────────────────────────────────────────────────────
const STIFFNESS = 0.22;
const DAMPING = 0.72;
const CARD_W_FRAC = 0.68; // card width as a fraction of the deck width
const STRIDE_FRAC = 0.74; // spacing between card centers (fraction of deck width)
const ARC_DEPTH = 26; // px a neighbor dips below the centered card
const SIDE_SCALE = 0.12; // how much a neighbor shrinks
const SIDE_FADE = 0.55; // how much a neighbor fades
const CARD_RADIUS = 26;
const FLICK = 90; // ms of velocity projected on release → flick distance
const TAP_SLOP = 8; // px of movement below which a pointer-up counts as a tap
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_SHEET = "cubic-bezier(0.32, 0.72, 0, 1)";

const N = humanoids.length;
const clampIdx = (v: number) => Math.max(0, Math.min(N - 1, v));

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

  const tick = useCallback(() => {
    const force = (target.current - pos.current) * STIFFNESS;
    vel.current = (vel.current + force) * DAMPING;
    pos.current += vel.current;
    const settled =
      Math.abs(pos.current - target.current) < 0.0005 &&
      Math.abs(vel.current) < 0.0005;
    if (settled) {
      pos.current = target.current;
      vel.current = 0;
      notify(pos.current);
      raf.current = 0;
      return;
    }
    notify(pos.current);
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

  const subscribe = useCallback((cb: (p: number) => void) => {
    subs.current.add(cb);
    cb(pos.current);
    return () => {
      subs.current.delete(cb);
    };
  }, []);

  const getPos = useCallback(() => pos.current, []);

  useEffect(() => () => stop(), [stop]);

  return { subscribe, getPos, setPos, settleTo };
}

// ── Helpers ───────────────────────────────────────────────────
function statusColor(status?: Humanoid["status"]) {
  switch (status) {
    case "In Production":
      return "#34C759";
    case "Prototype":
      return "#FF9F0A";
    case "Concept":
      return "#0A84FF";
    case "Anticipated":
      return "#BF5AF2";
    case "Discontinued":
      return INK_MUTED;
    default:
      return INK_MUTED;
  }
}

function visitTarget(h: Humanoid): { href?: string; label: string } {
  if (h.purchaseUrl)
    return { href: withUtm(h.purchaseUrl, h.id), label: "Order" };
  const href = withUtm(h.infoUrl || h.manufacturerUrl, h.id);
  return { href, label: "Visit site" };
}

async function shareRobot(h: Humanoid) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("h", h.id);
  const link = url.toString();
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `${h.name} — Humanoid Index`, url: link });
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

// ── Card visual (stable; positioned imperatively by the deck) ──
function DeckCard({ h, width }: { h: Humanoid; width: number }) {
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{
        width,
        height: "100%",
        borderRadius: CARD_RADIUS,
        background: SURFACE,
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
              <h2 style={{ fontSize: 22, fontWeight: 600, color: INK, lineHeight: 1.1 }}>
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
                    color: INK_BODY,
                    padding: "5px 11px",
                    borderRadius: 999,
                    background: SURFACE,
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
                className="flex-1 flex items-center justify-center"
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
              className="flex items-center justify-center"
              style={{
                width: visit.href ? 50 : undefined,
                flex: visit.href ? undefined : 1,
                height: 50,
                paddingInline: visit.href ? 0 : 20,
                borderRadius: 15,
                background: SURFACE,
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

// ── Glyphs ────────────────────────────────────────────────────
function ShareGlyph() {
  return (
    <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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

// ── Main ──────────────────────────────────────────────────────
export default function MobileView() {
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<Humanoid | null>(null);

  const deck = useDeck(setActive);

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

  const cardW = Math.min(320, dims.w * CARD_W_FRAC);
  const stride = dims.w * STRIDE_FRAC;

  // Position every card from the current spring position.
  useEffect(() => {
    if (!dims.w) return;
    const layout = (p: number) => {
      for (let i = 0; i < N; i++) {
        const node = cardRefs.current[i];
        if (!node) continue;
        const offset = i - p;
        const abs = Math.abs(offset);
        if (abs > 2.6) {
          node.style.opacity = "0";
          node.style.pointerEvents = "none";
          continue;
        }
        const clamped = Math.min(abs, 1);
        const scale = 1 - clamped * SIDE_SCALE;
        const dip = ARC_DEPTH * Math.min(abs, 2);
        const opacity = 1 - Math.min(abs, 1.5) * (SIDE_FADE / 1.5);
        node.style.transform = `translate(-50%, -50%) translateX(${offset * stride}px) translateY(${dip}px) scale(${scale})`;
        node.style.opacity = String(Math.max(0, opacity));
        node.style.zIndex = String(100 - Math.round(abs * 10));
        node.style.pointerEvents = "auto";
      }
    };
    return deck.subscribe(layout);
  }, [deck, dims.w, stride]);

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
    if (dt > 0) g.vx = (e.clientX - g.lastX) / dt; // px per ms
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    deck.setPos(g.startPos - dx / stride);
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    if (!g.moved) return; // tap handled by the card's onClick
    const projected = deck.getPos() - (g.vx * FLICK) / stride;
    deck.settleTo(Math.round(projected));
  };

  const onCardTap = (i: number) => {
    if (gesture.current.moved) return;
    if (i === active) setDetail(humanoids[i]);
    else deck.settleTo(i);
  };

  const shuffle = useCallback(() => {
    let next = active;
    while (next === active && N > 1) next = Math.floor(Math.random() * N);
    deck.settleTo(next);
  }, [active, deck]);

  const current = humanoids[active];

  return (
    <main
      className="relative flex flex-col bg-white overflow-hidden"
      style={{
        height: "100dvh",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        color: INK,
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
        <button
          onClick={shuffle}
          aria-label="Shuffle"
          className="flex items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 999, background: SURFACE }}
        >
          <ShuffleGlyph />
        </button>
      </header>

      {/* Deck */}
      <div
        ref={deckRef}
        className="relative flex-1 overflow-hidden select-none"
        style={{ touchAction: "pan-y", minHeight: 0, isolation: "isolate" }}
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

      {/* Footer — the centered robot */}
      <footer
        className="flex-shrink-0"
        style={{ padding: "14px 24px calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        {current && (
          <div key={current.id} style={{ animation: `mv-copy-in 260ms ${EASE_OUT} both` }}>
            <div className="flex items-baseline gap-2">
              <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: INK }}>
                {current.name}
              </h1>
              {current.year && (
                <span style={{ fontSize: 15, color: INK_MUTED, fontWeight: 400 }}>
                  {current.year}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: statusColor(current.status),
                }}
              />
              <span style={{ fontSize: 14, color: INK_BODY }}>{current.manufacturer}</span>
              {current.useCase && (
                <>
                  <span style={{ color: INK_MUTED }}>·</span>
                  <span style={{ fontSize: 14, color: INK_BODY }}>{current.useCase}</span>
                </>
              )}
            </div>

            {/* Compact stat strip */}
            <div className="flex gap-5" style={{ marginTop: 14 }}>
              <Stat label="Height" value={current.height ? `${current.height} cm` : "—"} />
              <Stat label="Weight" value={current.weight ? `${current.weight} kg` : "—"} />
              <Stat
                label={current.maxSpeed ? "Speed" : "DOF"}
                value={current.maxSpeed ? `${current.maxSpeed} m/s` : current.dof ? `${current.dof}` : "—"}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3" style={{ marginTop: 18 }}>
              <button
                onClick={() => setDetail(current)}
                className="flex-1 flex items-center justify-center"
                style={{ height: 48, borderRadius: 14, background: INK, color: "white", fontSize: 15, fontWeight: 500 }}
              >
                Details
              </button>
              <button
                onClick={() => shareRobot(current)}
                aria-label="Share"
                className="flex items-center justify-center"
                style={{ width: 48, height: 48, borderRadius: 14, background: SURFACE }}
              >
                <ShareGlyph />
              </button>
            </div>
          </div>
        )}
      </footer>

      {detail && <DetailSheet h={detail} onClose={() => setDetail(null)} />}

      <style jsx global>{`
        @keyframes mv-copy-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mv-sheet-in {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes mv-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span style={{ fontSize: 11, color: INK_MUTED, letterSpacing: "0.01em" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 500, color: INK, marginTop: 2 }}>{value}</span>
    </div>
  );
}
