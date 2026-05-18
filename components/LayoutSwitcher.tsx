"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import { Chip } from "@/lib/design/primitives/Chip";
import { SURFACE_HOVER_SOFT } from "@/lib/design/tokens";

export const ALL_LAYOUTS = ["E", "Z"] as const;
export type Layout = (typeof ALL_LAYOUTS)[number];

export const layoutLabels: Record<Layout, string> = {
  E: "Scroll",
  Z: "Index",
};

export const INDEX_VIEWS = ["grid", "timeline"] as const;
export type IndexView = (typeof INDEX_VIEWS)[number];

export const NAV_STYLES = ["floating", "pill", "underline", "bordered", "minimal", "solid", "sunday", "apple", "chip", "chip2", "trio", "centered", "centered2", "wordmark", "wordmark2", "share", "share-center", "share-flip", "filters"] as const;
export type NavStyle = (typeof NAV_STYLES)[number];

export const SWITCHER_STYLES = ["text", "drag", "single", "toggle", "pill", "slash", "dot", "dash", "brackets", "ghost", "divider"] as const;
export type SwitcherStyle = (typeof SWITCHER_STYLES)[number];

// ─── Drag Switcher (click-only, morphs to contain Index sub-sections) ───
function DragSwitcher({
  active,
  onChange,
  indexView,
  onIndexViewChange,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  indexView: IndexView;
  onIndexViewChange: (v: IndexView) => void;
}) {
  const scrollSlotRef = useRef<HTMLButtonElement>(null);
  const indexSlotRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState({ sL: 0, sW: 0, iL: 0, iW: 0 });

  useLayoutEffect(() => {
    const s = scrollSlotRef.current;
    const i = indexSlotRef.current;
    if (!s || !i) return;
    const measure = () => {
      setSlots({
        sL: s.offsetLeft,
        sW: s.offsetWidth,
        iL: i.offsetLeft,
        iW: i.offsetWidth,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(s);
    ro.observe(i);
    return () => ro.disconnect();
  }, [active, indexView]);

  const isRight = active === "Z";
  const thumbLeft = isRight ? slots.iL : slots.sL;
  const thumbWidth = isRight ? slots.iW : slots.sW;

  const scrollInk = active === "E" ? "rgba(38, 38, 38, 1)" : "rgba(38, 38, 38, 0.55)";
  const transition = "max-width 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, padding 260ms ease";

  return (
    <div
      className="relative flex items-center p-0.5 rounded-full select-none"
      style={{ background: "rgba(0,0,0,0.04)" }}
    >
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full"
        style={{
          left: thumbLeft,
          width: thumbWidth,
          background: "#fff",
          pointerEvents: "none",
          transition:
            "left 380ms cubic-bezier(0.22, 1, 0.36, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <button
        ref={scrollSlotRef}
        onClick={() => { if (active !== "E") onChange("E"); }}
        className="relative px-3 py-1 text-[12px] tracking-wide cursor-pointer"
        style={{
          color: scrollInk,
          fontWeight: 500,
          transition: "color 200ms ease",
        }}
      >
        {layoutLabels["E"]}
      </button>

      <div ref={indexSlotRef} className="relative flex items-center">
        <button
          onClick={() => { if (active !== "Z") onChange("Z"); }}
          className="text-[12px] tracking-wide cursor-pointer whitespace-nowrap"
          style={{
            color: active === "Z" ? "rgba(38, 38, 38, 0.3)" : "rgba(38, 38, 38, 0.55)",
            fontWeight: 500,
            padding: active === "Z" ? "4px 4px 4px 12px" : "4px 12px",
            transition: "color 200ms ease, padding 260ms ease",
          }}
        >
          {layoutLabels["Z"]}
        </button>
        <div
          className="overflow-hidden flex items-center"
          style={{
            maxWidth: active === "Z" ? 280 : 0,
            opacity: active === "Z" ? 1 : 0,
            transition,
          }}
        >
          <span
            className="text-[12px]"
            style={{
              color: "rgba(38, 38, 38, 0.22)",
              fontWeight: 400,
              padding: "0 4px 0 0",
            }}
          >
            ›
          </span>
          <div className="flex items-center gap-1 pr-2">
            {INDEX_VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => onIndexViewChange(v)}
                className="text-[12px] tracking-wide capitalize whitespace-nowrap transition-colors duration-200 cursor-pointer"
                style={{
                  color: indexView === v ? "rgba(38, 38, 38,0.85)" : "rgba(38, 38, 38,0.55)",
                  fontWeight: 500,
                  padding: "0 6px",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Single Switcher — inactive label, accent dot slides between sides ─
function SingleSwitcher({ active, onChange }: { active: Layout; onChange: (l: Layout) => void }) {
  const [tick, setTick] = useState(0);
  const activeIdx = ALL_LAYOUTS.indexOf(active);
  const other = ALL_LAYOUTS[activeIdx === 0 ? 1 : 0];

  const handleClick = () => {
    setTick((t) => t + 1);
    onChange(other);
  };

  const dotSize = 5;
  const edgePad = 5;

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex items-center justify-center text-[12px] tracking-wide cursor-pointer"
      style={{ color: "#9a9a9a", fontWeight: 500, padding: "4px 16px", minWidth: 76 }}
    >
      <span
        className="absolute rounded-full pointer-events-none"
        style={{
          width: dotSize,
          height: dotSize,
          top: "50%",
          marginTop: -dotSize / 2,
          left: activeIdx === 0 ? edgePad : `calc(100% - ${dotSize + edgePad}px)`,
          background: "var(--c-accent, #ff7a45)",
          transition: "left 460ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <span
        key={tick}
        className="relative inline-block"
        style={{ animation: tick > 0 ? "single-label-swap 460ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined }}
      >
        {layoutLabels[other]}
      </span>
    </button>
  );
}

// ─── Filters Nav (brand left, filter chip row middle, share right) ─

const FILTER_PILLS = [
  { id: "production", label: "In production" },
  { id: "prototype", label: "Prototype" },
  { id: "discontinued", label: "Discontinued" },
  { id: "purchaseable", label: "Purchaseable" },
] as const;
type FilterId = (typeof FILTER_PILLS)[number]["id"];

function FiltersNav({ onShareSite, onLogoClick }: { onShareSite?: () => void; onLogoClick: () => void }) {
  const [active, setActive] = useState<Set<FilterId>>(new Set());
  const toggle = (id: FilterId) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  return (
    <nav
      className="fixed left-0 right-0 z-50 pointer-events-auto"
      style={{ top: 0, background: "transparent" }}
    >
      <div
        className="grid items-center"
        style={{
          height: 48,
          paddingLeft: "var(--nav-x, 24px)",
          paddingRight: "var(--nav-x, 24px)",
          gridTemplateColumns: "1fr auto 1fr",
        }}
      >
        <div className="flex justify-start">
          <Chip
            onClick={onLogoClick}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "normal",
              color: "rgba(95, 96, 89, 0.8)",
              background: "transparent",
            }}
          >
            Humanoid Index
          </Chip>
        </div>
        <div className="flex justify-center items-center" style={{ gap: 4 }}>
          {FILTER_PILLS.map((p) => {
            const on = active.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="filter-pill cursor-pointer"
                aria-pressed={on}
                style={{
                  background: on ? "rgba(29, 29, 31, 0.92)" : "rgba(95, 96, 89, 0.08)",
                  color: on ? "#ffffff" : "rgba(95, 96, 89, 0.85)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "normal",
                  padding: "5px 11px",
                  borderRadius: 999,
                  border: "none",
                  whiteSpace: "nowrap",
                  transition: "background 200ms ease, color 200ms ease",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Chip
            onClick={() => onShareSite?.()}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "normal",
              color: "rgba(95, 96, 89, 0.8)",
              background: "transparent",
            }}
          >
            Share
          </Chip>
        </div>
      </div>
    </nav>
  );
}

// ─── Flip Label (preview-only: swaps front → back via various transitions) ─

function FlipLabel({
  mode,
  hover,
  front,
  back,
}: {
  mode: "flip" | "slide-up" | "fade" | "slide-horiz" | "blur";
  hover: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}) {
  const dur = "360ms cubic-bezier(0.22, 1, 0.36, 1)";
  const backCenter: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (mode === "flip") {
    return (
      <span style={{ position: "relative", display: "inline-block", perspective: 600 }}>
        <span
          style={{
            display: "inline-block",
            transformStyle: "preserve-3d",
            transition: `transform ${dur}`,
            transform: hover ? "rotateX(180deg)" : "rotateX(0deg)",
          }}
        >
          <span style={{ display: "inline-block", backfaceVisibility: "hidden" }}>{front}</span>
          <span style={{ ...backCenter, backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}>{back}</span>
        </span>
      </span>
    );
  }
  if (mode === "slide-up") {
    return (
      <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
        <span
          style={{
            display: "inline-block",
            transition: `transform ${dur}, opacity ${dur}`,
            transform: hover ? "translateY(-110%)" : "translateY(0)",
            opacity: hover ? 0 : 1,
          }}
        >
          {front}
        </span>
        <span
          style={{
            ...backCenter,
            transition: `transform ${dur}, opacity ${dur}`,
            transform: hover ? "translateY(0)" : "translateY(110%)",
            opacity: hover ? 1 : 0,
          }}
        >
          {back}
        </span>
      </span>
    );
  }
  if (mode === "fade") {
    return (
      <span style={{ position: "relative", display: "inline-block" }}>
        <span style={{ display: "inline-block", transition: `opacity ${dur}`, opacity: hover ? 0 : 1 }}>{front}</span>
        <span style={{ ...backCenter, transition: `opacity ${dur}`, opacity: hover ? 1 : 0 }}>{back}</span>
      </span>
    );
  }
  if (mode === "slide-horiz") {
    return (
      <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}>
        <span
          style={{
            display: "inline-block",
            transition: `transform ${dur}, opacity ${dur}`,
            transform: hover ? "translateX(-110%)" : "translateX(0)",
            opacity: hover ? 0 : 1,
          }}
        >
          {front}
        </span>
        <span
          style={{
            ...backCenter,
            transition: `transform ${dur}, opacity ${dur}`,
            transform: hover ? "translateX(0)" : "translateX(110%)",
            opacity: hover ? 1 : 0,
          }}
        >
          {back}
        </span>
      </span>
    );
  }
  // blur
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          display: "inline-block",
          transition: `opacity ${dur}, filter ${dur}`,
          opacity: hover ? 0 : 1,
          filter: hover ? "blur(6px)" : "blur(0)",
        }}
      >
        {front}
      </span>
      <span
        style={{
          ...backCenter,
          transition: `opacity ${dur}, filter ${dur}`,
          opacity: hover ? 1 : 0,
          filter: hover ? "blur(0)" : "blur(6px)",
        }}
      >
        {back}
      </span>
    </span>
  );
}

// ─── Chip Nav (apple bar + sliding SURFACE thumb on active tab) ─

function ChipNav({
  active,
  indexView,
  onChange,
  onIndexViewChange,
  onLogoClick,
  chipStyle,
  wordmark,
}: {
  active: Layout;
  indexView: IndexView;
  onChange: (l: Layout) => void;
  onIndexViewChange: (v: IndexView) => void;
  onLogoClick: () => void;
  chipStyle?: React.CSSProperties;
  wordmark?: React.ReactNode;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [thumb, setThumb] = useState({ left: 0, width: 0, ready: false });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [wordmarkHover, setWordmarkHover] = useState(false);
  const FLIP_MODES = ["flip", "slide-up", "fade", "slide-horiz", "blur"] as const;
  type FlipMode = (typeof FLIP_MODES)[number];
  const [flipMode, setFlipMode] = useState<FlipMode>("flip");

  const isScroll = active === "E";
  const isGrid = active === "Z" && indexView === "grid";
  const isTimeline = active === "Z" && indexView === "timeline";
  const items = [
    { label: "Scroll", isActive: isScroll, onClick: () => { if (active !== "E") onChange("E"); } },
    { label: "Grid", isActive: isGrid, onClick: () => { if (active !== "Z") onChange("Z"); if (indexView !== "grid") onIndexViewChange("grid"); } },
    { label: "Timeline", isActive: isTimeline, onClick: () => { if (active !== "Z") onChange("Z"); if (indexView !== "timeline") onIndexViewChange("timeline"); } },
  ];
  const activeIdx = items.findIndex((it) => it.isActive);
  const displayIdx = hoverIdx ?? activeIdx;

  useLayoutEffect(() => {
    const target = tabRefs.current[displayIdx];
    const wrap = tabsRef.current;
    if (!target || !wrap) return;
    const measure = () => {
      const t = tabRefs.current[displayIdx];
      const w = tabsRef.current;
      if (!t || !w) return;
      setThumb({ left: t.offsetLeft, width: t.offsetWidth, ready: true });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    tabRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [displayIdx]);

  return (
    <nav
      className="fixed left-0 right-0 z-50 pointer-events-auto"
      style={{ top: 0, background: "transparent" }}
    >
      <div className="flex items-center" style={{ height: 48, paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
        <Chip
          active
          onClick={onLogoClick}
          onMouseEnter={() => setWordmarkHover(true)}
          onMouseLeave={() => setWordmarkHover(false)}
          style={{ flex: "0 0 auto", ...chipStyle }}
        >
          <FlipLabel mode={flipMode} hover={wordmarkHover} front={wordmark ?? "Humanoid Index"} back="Shuffle" />
        </Chip>
        <button
          onClick={() => {
            const i = FLIP_MODES.indexOf(flipMode);
            setFlipMode(FLIP_MODES[(i + 1) % FLIP_MODES.length]);
          }}
          style={{
            marginLeft: 8,
            fontSize: 11,
            color: "rgba(95, 96, 89, 0.6)",
            background: "rgba(95, 96, 89, 0.06)",
            border: "none",
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            fontVariantNumeric: "tabular-nums",
          }}
          title="Cycle flip transition"
        >
          {flipMode} ↻
        </button>
        <div className="flex-1 flex justify-center">
          <div
            ref={tabsRef}
            className="relative flex items-center"
            style={{ gap: 4 }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: thumb.left,
                width: thumb.width,
                background: "var(--c-surface)",
                borderRadius: 999,
                opacity: thumb.ready ? 1 : 0,
                transition: thumb.ready
                  ? "left 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease"
                  : "opacity 180ms ease",
                pointerEvents: "none",
              }}
            />
            {items.map((it, i) => (
              <Chip
                key={it.label}
                ref={(el) => { tabRefs.current[i] = el; }}
                onClick={it.onClick}
                style={{ position: "relative", ...chipStyle }}
                onMouseEnter={() => setHoverIdx(i)}
              >
                {it.label}
              </Chip>
            ))}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", width: 32 }} />
      </div>
    </nav>
  );
}

// ─── Layout Switcher ────────────────────────────────────────────

export function LayoutSwitcher({
  active,
  onChange,
  navStyle,
  switcherStyle = "toggle",
  onRandomHumanoid,
  luckyNonce = 0,
  hintNonce = 0,
  indexView,
  onIndexViewChange,
  onShareSite,
  onShareView,
  shareViewLabel,
  shareUrlRef,
  shareOgRef,
  comparing = false,
  joined = false,
  onGoHome,
}: {
  active: Layout;
  onChange: (l: Layout) => void;
  navStyle: NavStyle;
  onNavStyleChange: (s: NavStyle) => void;
  switcherStyle?: SwitcherStyle;
  onRandomHumanoid?: () => void;
  luckyNonce?: number;
  hintNonce?: number;
  indexView: IndexView;
  onIndexViewChange: (v: IndexView) => void;
  onShareSite?: () => void;
  onShareView?: () => void;
  shareViewLabel?: string;
  shareUrlRef?: React.MutableRefObject<string>;
  shareOgRef?: React.MutableRefObject<string>;
  comparing?: boolean;
  joined?: boolean;
  onGoHome?: () => void;
}) {
  const handleClick = () => {
    if (active !== "E") onChange("E" as Layout);
    onRandomHumanoid?.();
  };


  const mark = <LogoMark onClick={handleClick} luckyNonce={luckyNonce} hintNonce={hintNonce} />;
  const solidMark = <LogoMark fill="#fff" opacity={0.4} onClick={handleClick} luckyNonce={luckyNonce} hintNonce={hintNonce} ringColor="#fff" />;

  const [diceRollNonce, setDiceRollNonce] = useState(0);
  const [wordmarkHover, setWordmarkHover] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const frost = { background: "var(--c-surface)" } as React.CSSProperties;

  // Discoverable shuffle affordance — sits next to the wordmark in launch nav variants.
  // Wordmark click also still fires shuffle as a fallback.
  const shufflePill = onRandomHumanoid ? (
    <Chip
      onClick={() => onRandomHumanoid()}
      className="transition-colors"
      style={{
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "normal",
        color: "rgba(95, 96, 89, 0.85)",
        background: "rgba(95, 96, 89, 0.08)",
      }}
    >
      Shuffle
    </Chip>
  ) : null;

  const subInline = (activeColor: string, inactiveColor: string, separatorColor: string): React.ReactNode =>
    active === "Z" ? (
      <div className="flex items-center index-subnav-enter">
        <div style={{ width: 1, height: 12, background: separatorColor, marginLeft: 8, marginRight: 10 }} />
        <div className="flex items-center gap-3">
          {INDEX_VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => onIndexViewChange(v)}
              className="text-[12px] tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer"
              style={{ color: indexView === v ? activeColor : inactiveColor, fontWeight: 500 }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  let navEl: React.ReactElement;
  // ── Style: floating (original — island with border) ──
  if (navStyle === "floating") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-5 py-2.5 rounded-sm border border-neutral-200/60" style={frost}>
            <div className="flex items-center gap-0.5">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-2.5 py-1 text-[12px] tracking-wide transition-all duration-200 cursor-pointer"
                  style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
            </div>
          </div>
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: pill — rounded capsule, tinted active state ──
  else if (navStyle === "pill") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-3 py-2 rounded-2xl" style={frost}>
            <div className="flex items-center gap-1">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-3 py-1 text-[12px] tracking-wide transition-all duration-200 cursor-pointer rounded-full"
                  style={{
                    color: active === l ? "#fff" : "#999",
                    background: active === l ? "var(--c-ink)" : "transparent",
                    fontWeight: active === l ? 500 : 400,
                  }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
            </div>
          </div>
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: underline — 2-view switcher variants ──
  else if (navStyle === "underline") {
    const L0 = ALL_LAYOUTS[0];
    const L1 = ALL_LAYOUTS[1];
    const isRight = active === L1;
    const labelBase = "text-[12.7px] tracking-tight transition-colors duration-200 cursor-pointer";
    const labelStyle = (l: Layout): React.CSSProperties => ({
      color: active === l ? "var(--c-ink)" : "#c4c4c4",
      fontWeight: 500,
    });

    let switcherEl: React.ReactElement;

    if (switcherStyle === "text") {
      const isScroll = active === "E";
      const isIndex = active === "Z" && indexView === "grid";
      const isTimeline = active === "Z" && indexView === "timeline";
      const opacityFor = (on: boolean) => (on ? 1 : 0.35);
      const labelCls = "text-[12.7px] tracking-tight cursor-pointer select-none";
      const labelStyleText = (on: boolean): React.CSSProperties => ({
        color: "var(--c-ink)",
        opacity: opacityFor(on),
        fontWeight: 600,
        transition: "opacity 220ms ease",
      });
      switcherEl = (
        <div className="flex items-center gap-5">
          <button
            onClick={() => onChange("E")}
            className={labelCls}
            style={labelStyleText(isScroll)}
            onMouseEnter={(e) => { if (!isScroll) e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { if (!isScroll) e.currentTarget.style.opacity = String(opacityFor(false)); }}
          >
            Scroll
          </button>
          <button
            onClick={() => { if (active !== "Z") onChange("Z"); if (indexView !== "grid") onIndexViewChange("grid"); }}
            className={labelCls}
            style={labelStyleText(isIndex)}
            onMouseEnter={(e) => { if (!isIndex) e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { if (!isIndex) e.currentTarget.style.opacity = String(opacityFor(false)); }}
          >
            Grid
          </button>
          <button
            onClick={() => { if (active !== "Z") onChange("Z"); if (indexView !== "timeline") onIndexViewChange("timeline"); }}
            className={labelCls}
            style={labelStyleText(isTimeline)}
            onMouseEnter={(e) => { if (!isTimeline) e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { if (!isTimeline) e.currentTarget.style.opacity = String(opacityFor(false)); }}
          >
            Timeline
          </button>
        </div>
      );
    } else if (switcherStyle === "drag") {
      switcherEl = <DragSwitcher active={active} onChange={onChange} indexView={indexView} onIndexViewChange={onIndexViewChange} />;
    } else if (switcherStyle === "single") {
      switcherEl = <SingleSwitcher active={active} onChange={onChange} />;
    } else if (switcherStyle === "toggle") {
      switcherEl = (
        <div className="flex items-center gap-2.5">
          <button onClick={() => onChange(L0)} className={labelBase} style={labelStyle(L0)}>{layoutLabels[L0]}</button>
          <button
            onClick={() => onChange(isRight ? L0 : L1)}
            className="relative cursor-pointer"
            style={{ width: 22, height: 12, borderRadius: 999, background: "rgba(0,0,0,0.08)" }}
            aria-label="Toggle view"
          >
            <div
              className="absolute top-0.5"
              style={{
                width: 8, height: 8, borderRadius: 999,
                background: "var(--c-ink)",
                left: isRight ? 12 : 2,
                transition: "left 240ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </button>
          <button onClick={() => onChange(L1)} className={labelBase} style={labelStyle(L1)}>{layoutLabels[L1]}</button>
        </div>
      );
    } else if (switcherStyle === "pill") {
      switcherEl = (
        <div className="flex items-center p-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.04)" }}>
          <div className="relative flex items-center">
            <div
              className="absolute top-0 bottom-0 rounded-full"
              style={{
                width: "50%",
                left: isRight ? "50%" : "0",
                background: "#fff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04)",
                transition: "left 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            {ALL_LAYOUTS.map((l) => (
              <button key={l} onClick={() => onChange(l)}
                className="relative px-3 py-1 text-[12px] tracking-wide cursor-pointer"
                style={{ color: active === l ? "var(--c-ink)" : "#9a9a9a", fontWeight: 500 }}>
                {layoutLabels[l]}
              </button>
            ))}
          </div>
          {active === "Z" && (
            <div className="flex items-center index-subnav-enter">
              <div style={{ width: 1, height: 12, background: "rgba(0,0,0,0.08)", marginLeft: 8, marginRight: 10 }} />
              <div className="flex items-center gap-3 pr-2">
                {INDEX_VIEWS.map((v) => (
                  <button
                    key={v}
                    onClick={() => onIndexViewChange(v)}
                    className="text-[12px] tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer"
                    style={{ color: indexView === v ? "var(--c-ink)" : "#c4c4c4", fontWeight: 500 }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } else if (switcherStyle === "slash") {
      switcherEl = (
        <div className="flex items-center gap-1.5">
          <button onClick={() => onChange(L0)} className={labelBase} style={labelStyle(L0)}>{layoutLabels[L0]}</button>
          <span className="text-[12px]" style={{ color: "#d4d4d4" }}>/</span>
          <button onClick={() => onChange(L1)} className={labelBase} style={labelStyle(L1)}>{layoutLabels[L1]}</button>
        </div>
      );
    } else if (switcherStyle === "dot") {
      switcherEl = (
        <div className="flex items-center gap-5">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)} className={`relative ${labelBase}`} style={labelStyle(l)}>
              {layoutLabels[l]}
              <span
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  left: -10,
                  width: 4, height: 4, borderRadius: 999,
                  background: "var(--c-ink)",
                  opacity: active === l ? 1 : 0,
                  transition: "opacity 200ms ease",
                }}
              />
            </button>
          ))}
        </div>
      );
    } else if (switcherStyle === "dash") {
      switcherEl = (
        <div className="flex items-center gap-5">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)} className={`relative ${labelBase}`} style={labelStyle(l)}>
              {layoutLabels[l]}
              <span
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  left: -12,
                  width: 7, height: 1,
                  background: "var(--c-ink)",
                  opacity: active === l ? 1 : 0,
                  transition: "opacity 200ms ease",
                }}
              />
            </button>
          ))}
        </div>
      );
    } else if (switcherStyle === "brackets") {
      const bracket = (l: Layout, side: "l" | "r") => (
        <span
          className="text-[12px]"
          style={{
            color: "var(--c-ink)",
            opacity: active === l ? 0.6 : 0,
            transition: "opacity 200ms ease",
            display: "inline-block",
            width: 6,
            textAlign: side === "l" ? "right" : "left",
          }}
        >
          {side === "l" ? "[" : "]"}
        </span>
      );
      switcherEl = (
        <div className="flex items-center gap-3">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)} className={`flex items-center ${labelBase}`} style={labelStyle(l)}>
              {bracket(l, "l")}
              <span className="px-0.5">{layoutLabels[l]}</span>
              {bracket(l, "r")}
            </button>
          ))}
        </div>
      );
    } else if (switcherStyle === "ghost") {
      switcherEl = (
        <div className="flex items-center gap-1">
          {ALL_LAYOUTS.map((l) => (
            <button key={l} onClick={() => onChange(l)}
              className="px-2.5 py-1 rounded-md text-[12px] tracking-wide cursor-pointer transition-all duration-200"
              style={{
                color: active === l ? "var(--c-ink)" : "#b4b4b4",
                background: active === l ? "rgba(0,0,0,0.05)" : "transparent",
                fontWeight: 500,
              }}>
              {layoutLabels[l]}
            </button>
          ))}
        </div>
      );
    } else {
      // divider — vertical bar between them, active gets darker
      switcherEl = (
        <div className="flex items-center gap-3">
          <button onClick={() => onChange(L0)} className={labelBase} style={labelStyle(L0)}>{layoutLabels[L0]}</button>
          <div style={{ width: 1, height: 10, background: "#e5e5e5" }} />
          <button onClick={() => onChange(L1)} className={labelBase} style={labelStyle(L1)}>{layoutLabels[L1]}</button>
        </div>
      );
    }

    navEl = (
      <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 4px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
        <div className="flex items-center justify-center gap-4">
          <div className="pointer-events-auto">{mark}</div>
          <div className="pointer-events-auto flex items-center">
            {switcherEl}
            {switcherStyle !== "pill" && switcherStyle !== "drag" && switcherStyle !== "text" && subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
          </div>
        </div>
      </nav>
    );
  }

  // ── Style: bordered — full-width top bar with bottom border ──
  else if (navStyle === "bordered") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/60 pointer-events-auto" style={{ ...frost, paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
      <div className="flex items-center gap-4 pb-3">
        <div>{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1">
            {ALL_LAYOUTS.map((l) => (
              <button key={l} onClick={() => onChange(l)}
                className="px-3 py-1 text-[12px] tracking-wide transition-all duration-200 cursor-pointer"
                style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
                {layoutLabels[l]}
              </button>
            ))}
            {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
          </div>
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: minimal — just text, no container, no border ──
  else if (navStyle === "minimal") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{mark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-4 py-2.5 rounded-sm" style={frost}>
            <div className="flex items-center gap-3">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-1 py-0.5 text-[12px] tracking-wide transition-all duration-200 cursor-pointer"
                  style={{ color: active === l ? "var(--c-ink)" : "#d4d4d4", fontWeight: active === l ? 600 : 400 }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
            </div>
          </div>
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  // ── Style: sunday — single pill with logo + brand + hamburger; menu opens a panel ──
  else if (navStyle === "sunday") {
    const SUNDAY_INK = "#171717";
    const SUNDAY_WORDMARK = "#494440";
    const sundayMark = <LogoMark fill={SUNDAY_WORDMARK} ringColor={SUNDAY_WORDMARK} opacity={1} onClick={handleClick} luckyNonce={luckyNonce} hintNonce={hintNonce} showLuckyHint={false} />;
    const closeAndPick = (l: Layout, v?: IndexView) => {
      if (active !== l) onChange(l);
      if (v && indexView !== v) onIndexViewChange(v);
      setMenuOpen(false);
    };
    const items: Array<{ label: string; onClick: () => void; isActive: boolean; comingSoon?: boolean }> = [
      { label: "Scroll", onClick: () => closeAndPick("E"), isActive: active === "E" },
      { label: "Grid", onClick: () => closeAndPick("Z", "grid"), isActive: active === "Z" && indexView === "grid", comingSoon: true },
      { label: "Timeline", onClick: () => closeAndPick("Z", "timeline"), isActive: active === "Z" && indexView === "timeline", comingSoon: true },
    ];
    navEl = (
      <>
        {/* Backdrop dim */}
        <div
          className="fixed inset-0 z-[55]"
          style={{
            background: "rgba(0,0,0,0.35)",
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? "auto" : "none",
            transition: "opacity 280ms cubic-bezier(0.22,1,0.36,1)",
          }}
          onClick={() => setMenuOpen(false)}
        />

        {/* Morphing nav: pill ⇄ panel */}
        <nav
          className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
          style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}
        >
          <div className="flex justify-center">
            <div
              className="pointer-events-auto overflow-hidden"
              style={{
                width: menuOpen ? "min(760px, calc(100vw - 48px))" : "min(232px, 100%)",
                borderRadius: menuOpen ? 28 : 999,
                background: menuOpen ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.55)",
                backdropFilter: menuOpen ? "none" : "blur(12px) saturate(140%)",
                WebkitBackdropFilter: menuOpen ? "none" : "blur(12px) saturate(140%)",
                border: menuOpen ? "1px solid rgba(0,0,0,0.04)" : "1px solid rgba(0,0,0,0.03)",
                boxShadow: menuOpen ? "0 24px 60px -24px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.03)",
                color: SUNDAY_INK,
                transition: "width 420ms cubic-bezier(0.22,1,0.36,1), border-radius 360ms cubic-bezier(0.22,1,0.36,1), background 320ms ease, border-color 320ms ease, box-shadow 360ms ease",
              }}
            >
              {/* Header — always visible, padding morphs */}
              <div
                className="flex items-center justify-between"
                style={{
                  paddingLeft: menuOpen ? 24 : 12,
                  paddingRight: menuOpen ? 16 : 3,
                  paddingTop: menuOpen ? 14 : 3,
                  paddingBottom: menuOpen ? 10 : 3,
                  transition: "padding 360ms cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <button
                  onClick={handleClick}
                  className="text-[13px] select-none whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80"
                  style={{ color: "var(--c-ink-medium, #6b6560)", fontWeight: 500, letterSpacing: "-0.025em", background: "transparent", border: "none", padding: 0 }}
                >
                  Humanoid Index
                </button>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-full hover:bg-black/5 transition-colors"
                  style={{ color: "#6b6560" }}
                >
                  <span
                    className="relative w-[14px] h-[14px] flex items-center justify-center"
                    style={{ transition: "transform 320ms cubic-bezier(0.22,1,0.36,1)", transform: menuOpen ? "rotate(90deg)" : "rotate(0)" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", opacity: menuOpen ? 0 : 1, transition: "opacity 200ms ease" }}>
                      <path d="M4 9h16M4 15h16" />
                    </svg>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", opacity: menuOpen ? 1 : 0, transition: "opacity 200ms ease" }}>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </span>
                </button>
              </div>

              {/* Body — collapses via grid-rows 0fr ⇄ 1fr */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: menuOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 420ms cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                <div style={{ overflow: "hidden", minHeight: 0 }}>
                  <div
                    style={{
                      opacity: menuOpen ? 1 : 0,
                      transform: menuOpen ? "translateY(0)" : "translateY(-6px)",
                      transition: "opacity 280ms ease 80ms, transform 320ms cubic-bezier(0.22,1,0.36,1) 60ms",
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-8 pt-2 pb-4">
                      <ul className="flex flex-col gap-2">
                        {items.map((it) => {
                          const baseOpacity = it.comingSoon ? 0.3 : (it.isActive ? 1 : 0.55);
                          const hoverOpacity = it.comingSoon ? 0.3 : 0.85;
                          return (
                            <li key={it.label}>
                              <button
                                onClick={it.comingSoon ? undefined : it.onClick}
                                disabled={it.comingSoon}
                                className="text-left text-[22px] md:text-[24px] tracking-tight transition-opacity flex items-baseline gap-2"
                                style={{
                                  color: SUNDAY_INK,
                                  fontWeight: 600,
                                  opacity: baseOpacity,
                                  cursor: it.comingSoon ? "default" : "pointer",
                                }}
                                onMouseEnter={(e) => { if (!it.isActive) e.currentTarget.style.opacity = String(hoverOpacity); }}
                                onMouseLeave={(e) => { if (!it.isActive) e.currentTarget.style.opacity = String(baseOpacity); }}
                              >
                                <span>{it.label}</span>
                                {it.comingSoon && (
                                  <span
                                    className="text-[11px] tracking-normal uppercase"
                                    style={{ fontWeight: 500, opacity: 0.6, letterSpacing: "0.04em" }}
                                  >
                                    Coming soon
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        onClick={() => { onShareSite?.(); setMenuOpen(false); }}
                        aria-label="Share site"
                        className="group relative rounded-2xl overflow-hidden bg-neutral-100 cursor-pointer block w-full p-0 text-left"
                        style={{ minHeight: 150, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                      >
                        <img
                          src="/og-default.png"
                          alt="Humanoid Index"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          style={{ minHeight: 150 }}
                        />
                        <span
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                          style={{
                            background: "rgba(255,255,255,0.92)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            color: SUNDAY_INK,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                          </svg>
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 px-8 pb-4 text-[12px]" style={{ color: "#999" }}>
                      <span>A visual index of humanoid robots</span>
                      <a href="https://royjad.com/" target="_blank" rel="noopener noreferrer" className="text-right transition-opacity hover:opacity-70" style={{ color: "inherit" }}>Made by Roy Jad</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </>
    );
  }

  // ── Style: apple — thin full-width bar, no border, uniform full-opacity labels ──
  else if (navStyle === "apple") {
    const appleItems: Array<{ label: string; onClick: () => void }> = [
      { label: "Scroll", onClick: () => { if (active !== "E") onChange("E"); } },
      { label: "Grid", onClick: () => { if (active !== "Z") onChange("Z"); if (indexView !== "grid") onIndexViewChange("grid"); } },
      { label: "Timeline", onClick: () => { if (active !== "Z") onChange("Z"); if (indexView !== "timeline") onIndexViewChange("timeline"); } },
    ];
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{
          top: 0,
          background: "rgba(251, 251, 253, 0.92)",
          backdropFilter: "saturate(1.6) blur(12px)",
          WebkitBackdropFilter: "saturate(1.6) blur(12px)",
        }}
      >
        <div className="mx-auto flex items-center" style={{ maxWidth: 1024, height: 40, paddingLeft: 24, paddingRight: 24 }}>
          <button
            onClick={handleClick}
            className="cursor-pointer"
            style={{
              flex: "0 0 auto",
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: 13,
              fontWeight: 400,
              color: "var(--c-ink)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Humanoid Index
          </button>
          <div className="flex-1 flex items-center justify-center" style={{ gap: 36 }}>
            {appleItems.map((it) => (
              <button
                key={it.label}
                onClick={it.onClick}
                className="cursor-pointer"
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: "var(--c-ink)",
                  letterSpacing: "-0.01em",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
          <div style={{ flex: "0 0 auto", width: 32 }} />
        </div>
      </nav>
    );
  }

  // ── Style: chip — apple bar + sliding SURFACE thumb on active tab ──
  else if (navStyle === "chip") {
    navEl = (
      <ChipNav
        active={active}
        indexView={indexView}
        onChange={onChange}
        onIndexViewChange={onIndexViewChange}
        onLogoClick={handleClick}
      />
    );
  }

  // ── Style: trio — Humanoid Index left, Shuffle center (lighter chip), Share right.
  //    No tab switcher; shuffle is the only central action. ──
  else if (navStyle === "trio") {
    const trioLabelStyle: React.CSSProperties = {
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: "normal",
      color: wordmarkHover ? "rgba(95, 96, 89, 0.8)" : "rgba(95, 96, 89, 0.5)",
      background: "transparent",
      paddingLeft: 12,
      paddingRight: 12,
      marginLeft: -12,
      transition: "color 140ms ease",
    };
    navEl = joined ? <></> : (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: "var(--corner-y, 5px)", background: "transparent" }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            height: 36,
            paddingLeft: "var(--corner-x, 30px)",
            paddingRight: "var(--corner-x, 30px)",
          }}
        >
          <div className="flex justify-start items-center">
            <Chip
              onClick={() => onGoHome?.()}
              onMouseEnter={() => setWordmarkHover(true)}
              onMouseLeave={() => setWordmarkHover(false)}
              style={trioLabelStyle}
            >
              Humanoid Index
            </Chip>
          </div>
          <div className="flex justify-end items-center">
            <button
              onClick={() => {
                setDiceRollNonce((n) => n + 1);
                onRandomHumanoid?.();
              }}
              aria-label="Shuffle"
              className="trio-spin"
              style={{
                background: "transparent",
                border: "none",
                padding: 4,
                marginRight: -4,
                cursor: "pointer",
                fontSize: 22,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span
                key={`a-${diceRollNonce}`}
                role="img"
                aria-hidden
                className={diceRollNonce ? "dice-roll-a" : undefined}
              >🎲</span>
              {comparing && (
                <span
                  key={`b-${diceRollNonce}`}
                  role="img"
                  aria-hidden
                  className={diceRollNonce ? "dice-roll-b" : undefined}
                >🎲</span>
              )}
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // ── Style: centered — bare wordmark text, no chip background (launch candidate) ──
  // ── Style: centered2 — same wordmark text with SURFACE chip behind ──
  else if (navStyle === "centered" || navStyle === "centered2") {
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: 0, background: "transparent" }}
      >
        <div className="flex items-center justify-center" style={{ height: 48, paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)", gap: 4 }}>
          <Chip
            onClick={handleClick}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "normal",
              color: "rgba(95, 96, 89, 0.8)",
              background: navStyle === "centered2" ? "#F9F9F9" : "transparent",
            }}
          >
            Humanoid Index
          </Chip>
          {shufflePill}
        </div>
      </nav>
    );
  }

  // ── Style: share — Humanoid Index left, Share button right ──
  else if (navStyle === "share") {
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: 0, background: "transparent" }}
      >
        <div className="flex items-center justify-between" style={{ height: 48, paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
          <Chip
            onClick={handleClick}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "normal",
              color: "rgba(95, 96, 89, 0.8)",
              background: "transparent",
            }}
          >
            Humanoid Index
          </Chip>
          <Chip
            onClick={() => onShareSite?.()}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "normal",
              color: "rgba(95, 96, 89, 0.8)",
              background: "transparent",
            }}
          >
            Share
          </Chip>
        </div>
      </nav>
    );
  }

  // ── Style: share-flip — Humanoid Index centered; on hover, current rolls up
  // and out while Share rises up into place from below (3D reel/flap motion). ──
  else if (navStyle === "share-flip") {
    const flipFace: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: "normal",
      color: "rgba(95, 96, 89, 0.8)",
      whiteSpace: "nowrap",
      lineHeight: 1,
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
    };
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: 0, background: "transparent" }}
      >
        <div className="flex items-center justify-center" style={{ height: 48, paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
          <button
            onClick={() => onShareSite?.()}
            className="cursor-pointer flip-share-btn"
            style={{
              background: "transparent",
              border: "none",
              padding: "3px 8px",
              display: "inline-block",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-block",
                minWidth: 96,
                height: 12,
                perspective: "500px",
                transformStyle: "preserve-3d",
              }}
            >
              <span className="flip-share-cur" style={flipFace}>Humanoid Index</span>
              <span className="flip-share-next" style={flipFace}>Share</span>
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // ── Style: share-center — "Share" centered; reveals current humanoid(s) on hover ──
  else if (navStyle === "share-center") {
    const suffix = shareViewLabel && shareViewLabel.startsWith("Share ")
      ? shareViewLabel.slice(5).trim()
      : "";
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: 0, background: "transparent" }}
      >
        <div className="flex items-center justify-center" style={{ height: 48, paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
          <Chip
            onClick={() => onShareSite?.()}
            className="share-reveal"
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "normal",
              color: "rgba(95, 96, 89, 0.8)",
              background: "transparent",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span>Share</span>
            {suffix && <span className="share-reveal-extra">&nbsp;{suffix}</span>}
          </Chip>
        </div>
      </nav>
    );
  }

  // ── Style: filters — brand left, filter chip cluster middle, share right ──
  else if (navStyle === "filters") {
    navEl = <FiltersNav onShareSite={onShareSite} onLogoClick={handleClick} />;
  }

  // ── Style: wordmark — left logo, center shuffle, right share ──
  else if (navStyle === "wordmark") {
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: 0, background: "transparent" }}
      >
        <div
          className="grid items-center"
          style={{
            height: 48,
            paddingLeft: "var(--nav-x, 24px)",
            paddingRight: "var(--nav-x, 24px)",
            gridTemplateColumns: "1fr auto 1fr",
          }}
        >
          <div className="flex justify-start">
            <Chip
              onClick={handleClick}
              style={{
                background: "transparent",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <span
                role="img"
                aria-label="Humanoid Index"
                style={{
                  height: 11,
                  width: 117,
                  display: "block",
                  background: "rgba(95, 96, 89, 0.8)",
                  WebkitMaskImage: "url(/HI-logo.svg)",
                  maskImage: "url(/HI-logo.svg)",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
            </Chip>
          </div>
          <div className="flex justify-center">
            {shufflePill}
          </div>
          <div className="flex justify-end">
            <Chip
              onClick={() => onShareSite?.()}
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "normal",
                color: "rgba(95, 96, 89, 0.8)",
                background: "transparent",
              }}
            >
              Share
            </Chip>
          </div>
        </div>
      </nav>
    );
  }

  // ── Style: wordmark2 — centered SVG wordmark logo (older variant) ──
  else if (navStyle === "wordmark2") {
    navEl = (
      <nav
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{ top: 0, background: "transparent" }}
      >
        <div className="flex items-center justify-center" style={{ height: 48, paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
          <Chip
            onClick={handleClick}
            style={{
              background: "transparent",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span
              role="img"
              aria-label="Humanoid Index"
              style={{
                height: 11,
                width: 117,
                display: "block",
                background: "rgba(95, 96, 89, 0.8)",
                WebkitMaskImage: "url(/HI-logo.svg)",
                maskImage: "url(/HI-logo.svg)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </Chip>
        </div>
      </nav>
    );
  }

  // ── Style: chip2 — chip nav, Geist medium 12px, #5F6059, "Index" at 63% ──
  else if (navStyle === "chip2") {
    navEl = (
      <ChipNav
        active={active}
        indexView={indexView}
        onChange={onChange}
        onIndexViewChange={onIndexViewChange}
        onLogoClick={handleClick}
        chipStyle={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "normal",
          color: "rgba(95, 96, 89, 0.8)",
        }}
        wordmark="Humanoid Index"
      />
    );
  }

  // ── Style: solid — dark bar, inverted text ──
  else navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--nav-x, 24px)", paddingRight: "var(--nav-x, 24px)" }}>
      <div className="flex items-center gap-4">
        <div className="pointer-events-auto">{solidMark}</div>
        <div className="flex-1 flex justify-center">
          <div className="pointer-events-auto px-5 py-2.5 rounded-sm" style={{ background: "rgba(23,23,23,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-0.5">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-2.5 py-1 text-[12px] tracking-wide transition-all duration-200 cursor-pointer"
                  style={{ color: active === l ? "#fff" : "#666", fontWeight: active === l ? 500 : 400 }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("#fff", "#666", "rgba(255,255,255,0.15)")}
            </div>
          </div>
        </div>
        <div style={{ width: 20 }} />
      </div>
    </nav>
  );

  return navEl;
}
