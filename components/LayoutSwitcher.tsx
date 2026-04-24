"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/LogoMark";

export const ALL_LAYOUTS = ["E", "Z"] as const;
export type Layout = (typeof ALL_LAYOUTS)[number];

export const layoutLabels: Record<Layout, string> = {
  E: "Scroll",
  Z: "Index",
};

export const INDEX_VIEWS = ["grid", "timeline"] as const;
export type IndexView = (typeof INDEX_VIEWS)[number];

export const NAV_STYLES = ["floating", "pill", "underline", "bordered", "minimal", "solid"] as const;
export type NavStyle = (typeof NAV_STYLES)[number];

export const SWITCHER_STYLES = ["drag", "single", "toggle", "pill", "slash", "dot", "dash", "brackets", "ghost", "divider"] as const;
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

  const scrollInk = active === "E" ? "rgba(38, 38, 38, 1)" : "rgba(38, 38, 38, 0.35)";
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
        className="relative px-3 py-1 text-[11px] tracking-wide cursor-pointer"
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
          className="text-[11px] tracking-wide cursor-pointer whitespace-nowrap"
          style={{
            color: active === "Z" ? "rgba(38, 38, 38, 0.3)" : "rgba(38, 38, 38, 0.35)",
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
            className="text-[11px]"
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
                className="text-[11px] tracking-wide capitalize whitespace-nowrap transition-colors duration-200 cursor-pointer"
                style={{
                  color: indexView === v ? "rgba(38,38,38,0.85)" : "rgba(38,38,38,0.35)",
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
      className="relative inline-flex items-center justify-center text-[11px] tracking-wide cursor-pointer"
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
}) {
  const handleClick = () => {
    if (active !== "E") onChange("E" as Layout);
    onRandomHumanoid?.();
  };

  const mark = <LogoMark onClick={handleClick} luckyNonce={luckyNonce} hintNonce={hintNonce} />;
  const solidMark = <LogoMark fill="#fff" opacity={0.4} onClick={handleClick} luckyNonce={luckyNonce} hintNonce={hintNonce} ringColor="#fff" />;

  const frost = { background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } as React.CSSProperties;

  const subInline = (activeColor: string, inactiveColor: string, separatorColor: string): React.ReactNode =>
    active === "Z" ? (
      <div className="flex items-center index-subnav-enter">
        <div style={{ width: 1, height: 12, background: separatorColor, marginLeft: 8, marginRight: 10 }} />
        <div className="flex items-center gap-3">
          {INDEX_VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => onIndexViewChange(v)}
              className="text-[10px] tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer"
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
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3">
          {mark}
          <div className="px-5 py-2.5 rounded-sm border border-neutral-200/60" style={frost}>
            <div className="flex items-center gap-0.5">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
                  style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  // ── Style: pill — rounded capsule, tinted active state ──
  else if (navStyle === "pill") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3">
          {mark}
          <div className="px-3 py-2 rounded-2xl" style={frost}>
            <div className="flex items-center gap-1">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-3 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer rounded-full"
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
      </div>
    </nav>
  );

  // ── Style: underline — 2-view switcher variants ──
  else if (navStyle === "underline") {
    const L0 = ALL_LAYOUTS[0];
    const L1 = ALL_LAYOUTS[1];
    const isRight = active === L1;
    const labelBase = "text-[11px] tracking-wide transition-colors duration-200 cursor-pointer";
    const labelStyle = (l: Layout): React.CSSProperties => ({
      color: active === l ? "var(--c-ink)" : "#c4c4c4",
      fontWeight: 500,
    });

    let switcherEl: React.ReactElement;

    if (switcherStyle === "drag") {
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
                className="relative px-3 py-1 text-[11px] tracking-wide cursor-pointer"
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
                    className="text-[10px] tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer"
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
          <span className="text-[11px]" style={{ color: "#d4d4d4" }}>/</span>
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
          className="text-[11px]"
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
              className="px-2.5 py-1 rounded-md text-[11px] tracking-wide cursor-pointer transition-all duration-200"
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
      <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 4px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
        <div className="flex justify-center">
          <div
            className="pointer-events-auto flex items-center gap-3"
            style={{
              padding: "6px 14px",
              border: "1px solid #e8e8e8",
              borderRadius: 999,
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {mark}
            <span style={{ fontSize: 12, letterSpacing: 0.2, color: "var(--c-ink)", fontWeight: 500 }}>
              Humanoid Index
            </span>
            <div className="flex items-center">
              {switcherEl}
              {switcherStyle !== "pill" && switcherStyle !== "drag" && subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ── Style: bordered — full-width top bar with bottom border ──
  else if (navStyle === "bordered") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/60 pointer-events-auto" style={{ ...frost, paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex justify-center pb-3">
        <div className="flex items-center gap-3">
          {mark}
          <div className="flex items-center gap-1">
            {ALL_LAYOUTS.map((l) => (
              <button key={l} onClick={() => onChange(l)}
                className="px-3 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
                style={{ color: active === l ? "var(--c-ink)" : "#c4c4c4", fontWeight: active === l ? 500 : 400 }}>
                {layoutLabels[l]}
              </button>
            ))}
            {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
          </div>
        </div>
      </div>
    </nav>
  );

  // ── Style: minimal — just text, no container, no border ──
  else if (navStyle === "minimal") navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3">
          {mark}
          <div className="px-4 py-2.5 rounded-sm" style={frost}>
            <div className="flex items-center gap-3">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-1 py-0.5 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
                  style={{ color: active === l ? "var(--c-ink)" : "#d4d4d4", fontWeight: active === l ? 600 : 400 }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("var(--c-ink)", "#c4c4c4", "rgba(0,0,0,0.08)")}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  // ── Style: solid — dark bar, inverted text ──
  else navEl = (
    <nav className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingTop: "var(--nav-top, 8px)", paddingLeft: "var(--arc-logo-x, 24px)", paddingRight: "var(--arc-logo-x, 24px)" }}>
      <div className="flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3">
          {solidMark}
          <div className="px-5 py-2.5 rounded-sm" style={{ background: "rgba(23,23,23,0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
            <div className="flex items-center gap-0.5">
              {ALL_LAYOUTS.map((l) => (
                <button key={l} onClick={() => onChange(l)}
                  className="px-2.5 py-1 text-[11px] tracking-wide transition-all duration-200 cursor-pointer"
                  style={{ color: active === l ? "#fff" : "#666", fontWeight: active === l ? 500 : 400 }}>
                  {layoutLabels[l]}
                </button>
              ))}
              {subInline("#fff", "#666", "rgba(255,255,255,0.15)")}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  return navEl;
}
