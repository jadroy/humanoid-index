"use client";

import { Fragment, useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import * as React from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import { ArrowUp, Search, Pause, Play, Ruler, House, Factory, FlaskConical, Package, Shield, MessageCircle, Sparkles, Box, ChevronsUpDown, PanelRight, Info, Share, Minus, Plus, Dices, Bookmark, LayoutGrid } from "lucide-react";
import { CircleFlag as CircleFlagSvg } from "react-circle-flags";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { FORM_FILTERS, listFor, listForSaved, formOfLane, countFor, indexOfId, idAt, seat, globalIndexOf, resolveComparePair, resolveDeeplink, type FormFilter } from "@/lib/wheelLanes";
import { SavedTray, SavedShelf } from "@/components/SavedSurfaces";
import Image from "next/image";
import EllipticalCarousel from "@/components/carousel/EllipticalCarousel";
import GridView from "@/components/GridView";
import Collection from "@/app/v3/Collection";
import { humanoidsToItems, humanoidConfig } from "@/app/v3/humanoidCollection";
import MobileDeck from "@/components/MobileDeck";
import SpinViewer, { type SpinViewerHandle } from "@/components/SpinViewer";
import { Tooltip } from "@/components/Tooltip";
import { INK, FILL, WEIGHT, SEAM, GLASS_EDGE } from "@/lib/design/chrome";
import { TunerShell } from "@/components/Tuner";
import { CONTACT_EMAIL } from "@/lib/site";

// Lazy-loaded so three.js + URDFLoader stay out of the main bundle.
const Robot3D = dynamic(() => import("@/components/Robot3D"), { ssr: false });

const SPIN_ROBOTS: Record<
  string,
  {
    frameCount: number;
    path: string;
    credit?: { prefix?: string; name: string; href?: string };
  }
> = {
  "3": {
    frameCount: 30,
    path: "/spin/memo",
  },
};

// ── Hidden for v1 launch ──────────────────────────────────────────────────
// Things wired up in the codebase but intentionally not user-reachable at
// launch. Restore by reversing the gate noted next to each item.
//   • 3D viewer (G1)         — emptied THREEDEE_ROBOTS below. Restore by
//                              re-adding the G1 entry.
//   • Scene backdrop         — chip gated on NODE_ENV==="development" (~5027);
//                              scene tuner gated on isDev (~2473). Flip both
//                              gates to expose.
//   • Engineer/basic toggle  — toggle buttons removed from cluster (~6043)
//                              and unified bar (~6301); engineerMode forced
//                              to true, no localStorage hydration (~1471).
//                              "E" keypress still flips state for power use.
//   • Shortcuts sheet        — "?"/"/" key now triggers shuffle instead of
//                              opening ShortcutsSheet. Sheet component + state
//                              still imported, no entry point.
// ───────────────────────────────────────────────────────────────────────────

// Robots with a Draco-compressed URDF mesh set. Toggling the 3D pill swaps the
// static media for an articulated three.js viewer; assets only download on first activation.
const THREEDEE_ROBOTS: Record<
  string,
  { urdfUrl: string; meshBase: string; credit?: { prefix?: string; name: string; href?: string } }
> = {};
import { ShortcutsSheet } from "@/components/ShortcutsSheet";
import ContactSheet from "@/components/ContactSheet";
import Overlay from "@/components/Overlay";

const FOOTER_CONTACT_EMAIL = CONTACT_EMAIL;
import { LogoMark, PlaceholderLogo, SiteMark } from "@/components/LogoMark";
import { SEARCH_OPEN_EVENT, SEARCH_SELECT_EVENT } from "@/components/SearchModal";
import { FormGlyph } from "@/components/FormGlyph";
import { getCompareBlurb } from "@/lib/compareBlurb";
import { getRobotDescription } from "@/lib/robotDescription";
import { SURFACE } from "@/lib/surface";
import { withUtm } from "@/lib/outbound";
import {
  LayoutSwitcher,
  NAV_STYLES,
  SWITCHER_STYLES,
  type Layout,
  type IndexView,
  type NavStyle,
  type SwitcherStyle,
} from "@/components/LayoutSwitcher";
import { useSpring, SCROLL_PRESETS, type PresetKey } from "@/hooks/useSpring";
import { useIsDev } from "@/hooks/useIsDev";
import { ArcDots, ARC_STYLES, ARC_PRESETS, arcStyleLabels, MARKER_VARIANTS, type ArcStyle } from "@/components/ArcDots";
import OptionsMenu, { BUTTON_VARIANTS, BUTTON_LABELS, type ButtonVariant } from "@/components/OptionsMenu";
import { Chip } from "@/lib/design/primitives/Chip";
import { FONTS, FAVORITE_FONTS } from "@/lib/fonts";
import { applyGive, GIVE_STYLES, giveStyleLabels, type GiveStyle, type GiveSettings } from "@/lib/cardPhysics";
import {
  SparkBar,
  useSparkMode,
  useFleetSparkData,
  SPARK_KEY_BY_LABEL,
  SPARK_HIGHLIGHT,
  type SparkMode,
} from "@/components/StatSparkbar";

const MOBILE_BREAKPOINT = 768;

// "What's new" toast surfaces any humanoid whose `addedAt` (ISO date in
// data/humanoids.ts) falls within this rolling window. Set `addedAt` when you
// add a new entry; once the window expires the entry stops surfacing — no
// manual cleanup needed.
const NEW_WINDOW_DAYS = 14;

// Tallest documented robot height in the index — used as the reference for
// the "to scale" toggle so every other robot renders at height/MAX_HEIGHT.
const MAX_HEIGHT = humanoids.reduce((m, h) => (h.height && h.height > m ? h.height : m), 0);

const formatHeight = (cm: number) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - ft * 12);
  if (inches === 12) return `${ft + 1}'0"`;
  return `${ft}'${inches}"`;
};
const formatWeight = (kg: number) => `${Math.round(kg * 2.20462)} lb`;
const formatSpeed = (ms: number) => `${(ms * 2.23694).toFixed(1)} mph`;
const formatHeightCm = (cm: number) => `${Math.round(cm)} cm`;
const formatWeightKg = (kg: number) => `${Math.round(kg)} kg`;
const formatSpeedMs = (ms: number) => `${ms.toFixed(1)} m/s`;

const IMPERIAL_FMT = { height: formatHeight, weight: formatWeight, speed: formatSpeed } as const;
const METRIC_FMT = { height: formatHeightCm, weight: formatWeightKg, speed: formatSpeedMs } as const;

// Engineer-mode rows. Each entry maps an `engineering` field on a Humanoid to
// a stat row. Missing values render as a dimmed em-dash via `renderStatRow`,
// so adding a field here doesn't require populating it for every robot.
type EngineeringField = NonNullable<typeof humanoids[number]["engineering"]>;
const ENGINEER_FIELDS: ReadonlyArray<{
  key: keyof EngineeringField;
  label: string;
  format: (v: never) => string;
}> = [
  { key: "payload",          label: "Payload",     format: ((v: number)  => `${v} kg`)   as (v: never) => string },
  { key: "reach",            label: "Reach",       format: ((v: number)  => `${v} cm`)   as (v: never) => string },
  { key: "liftPerArm",       label: "Lift/arm",    format: ((v: number)  => `${v} kg`)   as (v: never) => string },
  { key: "peakTorque",       label: "Peak torque", format: ((v: number)  => `${v} Nm`)   as (v: never) => string },
  { key: "walkSpeed",        label: "Walk speed",  format: ((v: number)  => `${v} m/s`)  as (v: never) => string },
  { key: "runtime",          label: "Runtime",     format: ((v: number)  => `${v} h`)    as (v: never) => string },
  { key: "batteryCapacity",  label: "Battery",     format: ((v: number)  => `${v} kWh`)  as (v: never) => string },
  { key: "batteryVoltage",   label: "Voltage",     format: ((v: number)  => `${v} V`)    as (v: never) => string },
  { key: "chargeTime",       label: "Charge time", format: ((v: number)  => `${v} min`)  as (v: never) => string },
  { key: "swappableBattery", label: "Battery swap",format: ((v: boolean) => v ? "Yes" : "No") as (v: never) => string },
  { key: "handDof",          label: "Hand DOF",    format: ((v: number)  => `${v}`)      as (v: never) => string },
  { key: "armDof",           label: "Arm DOF",     format: ((v: number)  => `${v}`)      as (v: never) => string },
  { key: "legDof",           label: "Leg DOF",     format: ((v: number)  => `${v}`)      as (v: never) => string },
  { key: "actuators",        label: "Actuators",   format: ((v: string)  => v)           as (v: never) => string },
  { key: "cameras",          label: "Cameras",     format: ((v: string)  => v)           as (v: never) => string },
  { key: "lidar",            label: "LIDAR",       format: ((v: string)  => v)           as (v: never) => string },
  { key: "imu",              label: "IMU",         format: ((v: string)  => v)           as (v: never) => string },
  { key: "microphones",      label: "Mics",        format: ((v: number)  => `${v}`)      as (v: never) => string },
  { key: "forceSensors",     label: "Force sense", format: ((v: boolean) => v ? "Yes" : "No") as (v: never) => string },
  { key: "compute",          label: "Compute",     format: ((v: string)  => v)           as (v: never) => string },
  { key: "software",         label: "Software",    format: ((v: string)  => v)           as (v: never) => string },
  { key: "teleop",           label: "Teleop",      format: ((v: boolean) => v ? "Yes" : "No") as (v: never) => string },
  { key: "ipRating",         label: "IP rating",   format: ((v: string)  => v)           as (v: never) => string },
  { key: "operatingTemp",    label: "Op. temp",    format: ((v: string)  => v)           as (v: never) => string },
  { key: "noiseLevel",       label: "Noise",       format: ((v: number)  => `${v} dB`)   as (v: never) => string },
  { key: "connectivity",     label: "Network",     format: ((v: string)  => v)           as (v: never) => string },
];

const formatEngineerValue = (h: typeof humanoids[number], key: keyof EngineeringField): string | null => {
  const v = h.engineering?.[key];
  if (v === undefined || v === null || v === "") return null;
  const def = ENGINEER_FIELDS.find((f) => f.key === key);
  if (!def) return null;
  return (def.format as (x: unknown) => string)(v);
};

// Press 'e' (or use the Epetri toggle) to remap every font CSS variable on
// <main> to Epetri. Inline styles like `fontFamily: "var(--font-jetbrains-mono)"`
// resolve against the closest ancestor, so every nested element follows.
const EPETRI_FONT_OVERRIDES: React.CSSProperties = {
  "--font-geist-sans": "var(--font-epetri)",
  "--font-geist-mono": "var(--font-epetri)",
  "--font-geist-pixel-square": "var(--font-epetri)",
  "--font-geist-pixel-grid": "var(--font-epetri)",
  "--font-geist-pixel-circle": "var(--font-epetri)",
  "--font-geist-pixel-triangle": "var(--font-epetri)",
  "--font-geist-pixel-line": "var(--font-epetri)",
  "--font-inter": "var(--font-epetri)",
  "--font-b612": "var(--font-epetri)",
  "--font-b612-mono": "var(--font-epetri)",
  "--font-space-mono": "var(--font-epetri)",
  "--font-jetbrains-mono": "var(--font-epetri)",
  "--font-ibm-plex-sans": "var(--font-epetri)",
  "--font-ibm-plex-mono": "var(--font-epetri)",
  "--font-azeret-mono": "var(--font-epetri)",
  "--font-chivo-mono": "var(--font-epetri)",
  "--font-fira-code": "var(--font-epetri)",
  "--font-orbitron": "var(--font-epetri)",
  "--font-chakra-petch": "var(--font-epetri)",
  "--font-oxanium": "var(--font-epetri)",
  "--font-rajdhani": "var(--font-epetri)",
  "--font-exo-2": "var(--font-epetri)",
  "--font-michroma": "var(--font-epetri)",
  "--font-major-mono": "var(--font-epetri)",
  "--font-tektur": "var(--font-epetri)",
  "--font-anta": "var(--font-epetri)",
  "--font-syne": "var(--font-epetri)",
  "--font-epetri-tite": "var(--font-epetri)",
  "--font-epetri-index": "var(--font-epetri)",
  "--font-epetri-cfindex": "var(--font-epetri)",
  "--font-epetri-pixel": "var(--font-epetri)",
} as React.CSSProperties;

// Helper that builds the iOS-26 liquid-glass chrome at a given tint/alpha/blur.
// State for these lives in Browse() so they can be tuned live; the helper is
// shared so the shape stays consistent across stats-panel + in-card chips.
//
// `ink` controls foreground color: "auto" derives from effective luminance
// (tint composited over the assumed light surface), "dark"/"light" force.
// Returned object includes `color` so spreading it onto a button overrides
// the icon color; for the action overlay we also expose `--c-ink-body` /
// `--c-ink-muted` so descendant text that reads those vars flips too.
type GlassInk = "auto" | "dark" | "light";

// Named glass-chip presets. Each one is a complete snapshot of the six
// tunable values — applying a preset overwrites all of them at once. First
// preset is also the Reset target.
type GlassPreset = { name: string; tint: string; alpha: number; blur: number; ink: GlassInk; outline: number; sheen: number };
const GLASS_PRESETS: readonly GlassPreset[] = [
  { name: "Solid",    tint: "#f5f5f5", alpha: 1,    blur: 0,  ink: "auto",  outline: 0.15, sheen: 0.10 },
  { name: "Liquid",   tint: "#ffffff", alpha: 0.38, blur: 20, ink: "auto",  outline: 0.13, sheen: 0.08 },
  { name: "Flat",     tint: "#f5f5f5", alpha: 1,    blur: 0,  ink: "auto",  outline: 0,    sheen: 0.10 },
  { name: "Outlined", tint: "#ffffff", alpha: 1,    blur: 0,  ink: "auto",  outline: 0.18, sheen: 0.10 },
  { name: "Tinted",   tint: "#cccccc", alpha: 1,    blur: 0,  ink: "light", outline: 0.18, sheen: 0.10 },
];
type GlassChrome = React.CSSProperties & {
  ["--c-ink"]?: string;
  ["--c-ink-body"]?: string;
  ["--c-ink-muted"]?: string;
  ["--ci-bg-hover"]?: string;
  ["--ci-border-hover"]?: string;
  ["--ci-color-hover"]?: string;
};
function glassChromeFor({ tint, alpha, blur, ink, outline, sheen }: { tint: string; alpha: number; blur: number; ink: GlassInk; outline: number; sheen: number }): GlassChrome {
  const hex = tint.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  // Effective luminance composited over a light surface (~0.95 lum).
  const eff = lum * alpha + 0.95 * (1 - alpha);
  const isLight = ink === "light" || (ink === "auto" && eff < 0.55);
  // Sheen + edge channel scale with tint luminance so dark tints don't get
  // a bright top highlight that fights the fill. When ink is light, push
  // them up so the chip still reads as "glass" instead of flat dark paint.
  const sheenChan = Math.round((isLight ? 0.8 : lum * 0.7) * 255);
  const edgeChan = Math.round((isLight ? 0.55 : 0.25 + lum * 0.15) * 255);
  const inkColor = isLight ? "#ffffff" : "rgba(0,0,0,0.6)";
  const inkMuted = isLight ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)";
  const layers: string[] = [];
  if (sheen > 0) layers.push(`inset 0 1px 0 rgba(${sheenChan},${sheenChan},${sheenChan},${sheen})`);
  if (outline > 0) layers.push(`inset 0 0 0 1px rgba(${edgeChan},${edgeChan},${edgeChan},${outline})`);
  layers.push("0 1px 3px rgba(0,0,0,0.05)");
  const filter = blur > 0 ? `blur(${blur}px) saturate(1.6)` : undefined;
  const fill = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  return {
    background: fill,
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    boxShadow: layers.join(", "),
    borderColor: "transparent",
    color: inkColor,
    // Pre-promote the layer when blur is active so backdrop-filter is
    // composited from frame one (otherwise the blur "pops" late during
    // hover-fade). No layer hint when blur is off — nothing to optimize.
    willChange: filter ? "opacity" : undefined,
    // Match the `.card-icon-btn:hover` CSS vars to the rest state so the
    // global hover override (which uses !important) doesn't darken or
    // recolor the chip on hover. Tooltip + cursor still signal hoverability.
    ["--ci-bg-hover"]: fill,
    ["--ci-border-hover"]: "transparent",
    ["--ci-color-hover"]: inkColor,
    // Override the broader ink vars too — the action-overlay CTA uses
    // `var(--c-ink)` via valueStyle, not just `--c-ink-body`, so cascading
    // all three keeps every text token inside the overlay on the same scheme.
    ["--c-ink"]: inkColor,
    ["--c-ink-body"]: inkColor,
    ["--c-ink-muted"]: inkMuted,
  };
}

// Every row in the floating sidebar is the same object: a 40px borderless
// segment, glyph left, collapsing label right. Mark, lanes and actions all use
// it, which is what lets three unrelated things read as one control column.
const SIDEBAR_ROW: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans)",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "normal",
  height: 40,
  padding: "0 10px",
  borderRadius: 20,
  border: "none",
  background: "transparent",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
};

// The label column is the widest label — "Humanoid" at 14/500 (62.9) with a
// subpixel of slack. The counts keep their own column beside it rather than
// sharing the box: it collapses to zero at rest and opens on hover, so the
// width change is a real one (the sidebar grows by the counts) while the
// labels stay put and 26 / 7 / 6 still line up on their last digit.
const SIDEBAR_LABEL_W = 64;
const SIDEBAR_COUNT_W = 26;

const sidebarLabel = (comparing: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "baseline",
  overflow: "hidden",
  width: comparing ? 0 : SIDEBAR_LABEL_W,
  marginLeft: comparing ? 0 : 10,
  opacity: comparing ? 0 : 1,
  transition: "width 320ms cubic-bezier(0.33, 1, 0.68, 1), margin-left 320ms cubic-bezier(0.33, 1, 0.68, 1), opacity 200ms ease",
});

// Right-aligned in its own column so 26 / 7 / 6 stack on their last digit.
const sidebarCount = (open: boolean): React.CSSProperties => ({
  display: "flex",
  justifyContent: "flex-end",
  overflow: "hidden",
  width: open ? SIDEBAR_COUNT_W : 0,
  opacity: open ? 0.45 : 0,
  fontVariantNumeric: "tabular-nums",
  transition: "width 320ms cubic-bezier(0.33, 1, 0.68, 1), opacity 200ms cubic-bezier(0.33, 1, 0.68, 1)",
});

const SIDEBAR_GROUP_GAP = 16;

/* The wheel / grid view switch. Two cells in one track, so it reads as a
   control with two states rather than as two more things you could go to —
   which is the whole reason Grid stopped being a row. The left cell is a card
   (the wheel view is one card at a time); the right is the grid itself. */
function ViewSwitch({ grid, onChange, compact = false }: { grid: boolean; onChange: (g: boolean) => void; compact?: boolean }) {
  const cell = (on: boolean): React.CSSProperties => ({
    width: compact ? 26 : 28,
    height: compact ? 26 : 28,
    borderRadius: 999,
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    // The lanes' own indicator fill, so the rail has one "this is selected".
    background: on ? "rgba(95, 96, 89, 0.07)" : "transparent",
    color: on ? INK.on : INK.off,
    transition: "background 200ms cubic-bezier(0.33, 1, 0.68, 1), color 200ms cubic-bezier(0.33, 1, 0.68, 1)",
  });
  return (
    <div role="group" aria-label="View" style={{ display: "inline-flex", gap: 2 }}>
      <button type="button" aria-label="Wheel" aria-pressed={!grid} onClick={() => onChange(false)} style={cell(!grid)}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="4.25" y="2.75" width="7.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      <button type="button" aria-label="Grid" aria-pressed={grid} onClick={() => onChange(true)} style={cell(grid)}>
        <LayoutGrid size={15} strokeWidth={1.6} />
      </button>
    </div>
  );
}
// How far past its radius a ring-shaped rail reaches when fully open: half a
// seat, the label gutter, the label column, the count column, and 24 of air.
const RING_OPEN_REACH = 14 + 10 + SIDEBAR_LABEL_W + SIDEBAR_COUNT_W + 24;
// ── Live rail ──────────────────────────────────────────────────────────────
// The collapsed rail's second form. Instead of switching between two states it
// reads one continuous number — how near/engaged the cursor is — and every
// dimension in the column is a function of it. `--rail-p` is the column's own
// openness; `--rail-q` is the trailing column (counts, shortcuts), which rides
// a later, steeper ramp so it arrives *after* the labels rather than with them.
// Both are written by one RAF; nothing here transitions, because the easing is
// in the number, not in CSS.
const RAIL_LABEL_GROW = 0.06; // glyphs sit 6% under size at rest and grow in
const RAIL_GLYPH_FLOOR = 0.5; // how much of a glyph's ink survives at rest

// The label box opens as a width, which means that at mid-travel it is a box
// narrower than the word inside it. Left to `overflow: hidden` that reads as
// "Hu", "Se", "Oth" — type sliced down the middle, which is the one thing the
// iOS control never does. Two corrections: the right edge is feathered so the
// cut is a fade rather than a blade, and opacity runs quadratic so the word is
// still faint while it is still short. By the time a label is legible enough
// to read, its box is wide enough to hold it.
// The feather has to get out of the way once the box is wide enough to hold
// the word. A fixed 55%/96% gradient was still eating the tail of "Humanoid"
// at full open — the label column is sized to exactly that word, so anything
// fading before 100% clips the longest label permanently. The stops ride the
// same ramp: a feather while the box is short, fully opaque by the time it is
// open.
const RAIL_LABEL_MASK =
  "linear-gradient(to right, #000 calc(55% + var(--rail-p, 0) * 45%), transparent calc(96% + var(--rail-p, 0) * 4%))";

const sidebarLabelLive: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  overflow: "hidden",
  width: `calc(var(--rail-p, 0) * ${SIDEBAR_LABEL_W}px)`,
  marginLeft: "calc(var(--rail-p, 0) * 10px)",
  opacity: "calc(var(--rail-p, 0) * var(--rail-p, 0))",
  maskImage: RAIL_LABEL_MASK,
  WebkitMaskImage: RAIL_LABEL_MASK,
  // The word sits still and the box uncovers it, rather than the word sliding
  // in behind a moving edge — one motion instead of two racing each other.
  whiteSpace: "nowrap",
};

const sidebarCountLive: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  overflow: "hidden",
  width: `calc(var(--rail-q, 0) * ${SIDEBAR_COUNT_W}px)`,
  opacity: "calc(var(--rail-q, 0) * 0.45)",
  fontVariantNumeric: "tabular-nums",
};

// Glyphs are the only thing on screen at rest, so they carry the response the
// labels can't: they lift out of a dimmed floor and grow the last few percent
// into place. This is the "coming alive" half — without it the column just
// unfolds text, which reads as a menu opening rather than as one object
// responding.
const glyphLive = (base: number): React.CSSProperties => ({
  opacity: `calc(${base} * (${RAIL_GLYPH_FLOOR} + var(--rail-p, 0) * ${1 - RAIL_GLYPH_FLOOR}))`,
  transform: `scale(calc(${1 - RAIL_LABEL_GROW} + var(--rail-p, 0) * ${RAIL_LABEL_GROW}))`,
});


// On-state for the card's icon toggles (info, details, scene). Save can fill
// its bookmark; these three have no fillable interior — filling `Info` turns
// it into a solid disc and swallows the "i" — so "on" has to be carried by
// something outside the glyph. Three marks, switchable from the Card tuner:
// "ink" lets the off state recede and the on state sit at full weight, "pill"
// borrows the rounded ground the rail's active row uses, "dot" hangs a tab-
// style indicator under the icon.
type ToggleOnState = "ink" | "pill" | "dot";
const TOGGLE_OFF_INK = 0.55;
const TOGGLE_ON_TRANSITION = "opacity 200ms ease, background-color 200ms ease, box-shadow 200ms ease";
const toggleOnStyle = (mode: ToggleOnState, active: boolean, box: number): React.CSSProperties => {
  const base: React.CSSProperties = { transition: TOGGLE_ON_TRANSITION };
  if (mode === "ink") return { ...base, opacity: active ? 1 : TOGGLE_OFF_INK };
  if (!active) return base;
  if (mode === "pill") return { ...base, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.06)" };
  // The dot rides on box-shadow rather than an extra element so every call
  // site stays a bare <button>; the button's own radius rounds it.
  return { ...base, borderRadius: 999, boxShadow: `0 ${Math.round(box / 2) + 3}px 0 -${Math.round(box / 2) - 2}px currentColor` };
};


// One glyph column for every row — mark, lanes, actions. It was three
// different measurements before (a fixed 18 on two of them, intrinsic width on
// the lanes), which is exactly the kind of drift that puts icons a fraction of
// a pixel out of line down a column.
const SIDEBAR_GLYPH_SLOT: React.CSSProperties = {
  display: "flex",
  width: 18,
  justifyContent: "center",
};

// Two ink steps for glyphs and three for text, used by every piece of chrome
// on the page — the sidebar column and the chat panel. Anything that needs a
// fourth step is a sign it does not belong in the chrome layer.
const SIDEBAR_GLYPH_OP = { on: 1, off: 0.62 };
// The two pieces of prose in the column — the blurb and the credit. One size,
// one leading. 11px was small enough to be unreadable against a white page at
// these ink levels, which is the wrong kind of quiet: it should recede, not
// disappear.
const SIDEBAR_SMALL: React.CSSProperties = { fontSize: 12, lineHeight: 1.35 };

// One width for both. 92 was the row content (18 glyph + 10 gutter + 64 label),
// which fit the prose at 11px and clipped "Roy Jad © 2026" to "© 202" at 12.
// The credit sets the floor here, so the blurb follows it rather than the rows.
const SIDEBAR_PROSE_W = 104;

// Footer chips reuse the same liquid-glass chrome as the in-card icon
// buttons + the compare minus button. Static because the footer lives
// outside Browse() (where the live glass tuner state sits) — defaults
// match the "Outlined" GLASS_PRESET.
const FOOTER_GLASS_CHROME = glassChromeFor({
  tint: "#ffffff",
  alpha: 1,
  blur: 0,
  ink: "auto",
  outline: 0.18,
  sheen: 0.10,
});

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function VideoSlide({ src, fit, position, playing, credit }: { src: string; fit: "contain" | "cover"; position?: string; playing: boolean; credit?: { prefix?: string; name: string; href?: string } }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing]);
  return (
    <>
      <video
        ref={ref}
        key={src}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        className={fit === "cover" ? "w-full h-full object-cover" : "w-full h-full object-contain"}
        style={position ? { objectPosition: position } : undefined}
      />
      {credit && (
        <div
          className="absolute bottom-2 left-3 z-[4] pointer-events-auto"
          style={{ fontSize: 12, fontWeight: 500, letterSpacing: "normal", lineHeight: 1, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}
        >
          {credit.prefix && <span>{credit.prefix} </span>}
          {credit.href ? (
            <a
              href={credit.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline underline-offset-2 transition-colors"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {credit.name}
            </a>
          ) : (
            <span>{credit.name}</span>
          )}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Gallery pubsub — per-card image-index updates stay local so
// swiping inside a gallery doesn't repaint Browse.
// ═══════════════════════════════════════════════════════════════
type GallerySubscribe = (mIdx: number, cb: (idx: number) => void) => () => void;
type GalleryRead = (mIdx: number) => number;

function useGalleryIdx(mIdx: number, subscribe: GallerySubscribe, read: GalleryRead) {
  const [idx, setIdx] = useState(() => read(mIdx));
  useEffect(() => {
    setIdx(read(mIdx));
    return subscribe(mIdx, setIdx);
  }, [mIdx, subscribe, read]);
  return idx;
}

function GalleryDots({ mIdx, count, isVideoOn, subscribe, read }: {
  mIdx: number;
  count: number;
  isVideoOn: (i: number) => boolean;
  subscribe: GallerySubscribe;
  read: GalleryRead;
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  const currentIsVideo = isVideoOn(current);
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-[3] pointer-events-none"
      style={{
        height: 28,
        background: currentIsVideo
          ? "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))"
          : "linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))",
      }}
    >
      <div className="flex gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: currentIsVideo
              ? (i === current ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)")
              : (i === current ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"),
            transition: "background 0.2s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

function GalleryArrows({ mIdx, count, scroll, subscribe, read, size, inset, iconBoxPx, iconStrokeWidth, glassChipChrome }: {
  mIdx: number;
  count: number;
  scroll: (idx: number) => void;
  subscribe: GallerySubscribe;
  read: GalleryRead;
  size: number;
  inset: number;
  iconBoxPx: number;
  iconStrokeWidth: number;
  glassChipChrome: React.CSSProperties;
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  const baseStyle: React.CSSProperties = {
    ...glassChipChrome,
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: size,
    height: size,
    borderRadius: size / 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    cursor: "pointer",
    zIndex: 5,
    transition: "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1)",
  };
  return (
    <>
      {current > 0 && (
        <button
          className="opacity-0 group-hover/card:opacity-100"
          style={{ ...baseStyle, left: inset }}
          onClick={(e) => { e.stopPropagation(); scroll(current - 1); }}
          aria-label="Previous"
        >
          <svg width={iconBoxPx} height={iconBoxPx} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={iconStrokeWidth} strokeLinecap="round" strokeLinejoin="round"><polyline points="10,3 5,8 10,13" /></svg>
        </button>
      )}
      {current < count - 1 && (
        <button
          className="opacity-0 group-hover/card:opacity-100"
          style={{ ...baseStyle, right: inset }}
          onClick={(e) => { e.stopPropagation(); scroll(current + 1); }}
          aria-label="Next"
        >
          <svg width={iconBoxPx} height={iconBoxPx} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={iconStrokeWidth} strokeLinecap="round" strokeLinejoin="round"><polyline points="6,3 11,8 6,13" /></svg>
        </button>
      )}
    </>
  );
}

function GalleryVideoSlide({ mIdx, slideIdx, videoPaused, subscribe, read, src, fit, position, credit }: {
  mIdx: number;
  slideIdx: number;
  videoPaused: boolean;
  subscribe: GallerySubscribe;
  read: GalleryRead;
  src: string;
  fit: "contain" | "cover";
  position?: string;
  credit?: { prefix?: string; name: string; href?: string };
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  return <VideoSlide src={src} fit={fit} position={position} playing={slideIdx === current && !videoPaused} credit={credit} />;
}

type CardIconStyleProps = {
  className: string;
  style: React.CSSProperties;
  iconBoxPx: number;
  iconStrokeWidth: number;
};

function GalleryShareButton({ mIdx, allKinds, subscribe, read, onClick, getIconStyle, position, hoverFade }: {
  mIdx: number;
  allKinds: ("image" | "video")[];
  subscribe: GallerySubscribe;
  read: GalleryRead;
  onClick: () => void;
  getIconStyle: (opts: { dark: boolean }) => CardIconStyleProps;
  position: { bottom: number; right: number };
  hoverFade: boolean;
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  const currentIsVideo = allKinds[current] === "video";
  const ico = getIconStyle({ dark: currentIsVideo });
  const fadeClass = hoverFade ? "opacity-0 translate-y-3 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label="Copy link"
      className={`${ico.className} absolute z-30 ${fadeClass}`}
      style={{ ...ico.style, bottom: position.bottom, right: position.right }}
    >
      <svg width={ico.iconBoxPx} height={ico.iconBoxPx} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ico.iconStrokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </button>
  );
}

// Inner-button variant: returns just the icon button (no chrome, no
// absolute positioning) when the current slide is a video. Used inside
// the combined bottom-right chip alongside info / 3D / Play.
function VideoPauseInnerButton({ mIdx, allKinds, subscribe, read, videoPaused, onToggle, iconBoxPx, iconStrokeWidth, size }: {
  mIdx: number;
  allKinds: ("image" | "video")[];
  subscribe: GallerySubscribe;
  read: GalleryRead;
  videoPaused: boolean;
  onToggle: () => void;
  iconBoxPx: number;
  iconStrokeWidth: number;
  size: number;
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  const currentIsVideo = allKinds[current] === "video";
  if (!currentIsVideo) return null;
  const inner: React.CSSProperties = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    padding: 0,
    color: "inherit",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };
  return (
    <Tooltip label={videoPaused ? "Play video" : "Pause video"} shortcut="Space">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={videoPaused ? "Play video" : "Pause video"}
        style={inner}
      >
        {videoPaused ? (
          <Play width={iconBoxPx} height={iconBoxPx} strokeWidth={iconStrokeWidth} />
        ) : (
          <Pause width={iconBoxPx} height={iconBoxPx} strokeWidth={iconStrokeWidth} />
        )}
      </button>
    </Tooltip>
  );
}

function GalleryVideoPauseButton({ mIdx, allKinds, subscribe, read, videoPaused, onToggle, getIconStyle, position, hoverFade, glassChipChrome }: {
  mIdx: number;
  allKinds: ("image" | "video")[];
  subscribe: GallerySubscribe;
  read: GalleryRead;
  videoPaused: boolean;
  onToggle: () => void;
  getIconStyle: (opts: { dark: boolean }) => CardIconStyleProps;
  position: { bottom: number; right: number };
  hoverFade: boolean;
  glassChipChrome: React.CSSProperties;
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  const currentIsVideo = allKinds[current] === "video";
  if (!currentIsVideo) return null;
  const ico = getIconStyle({ dark: true });
  const fadeClass = hoverFade ? "opacity-0 translate-y-3 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
  return (
    <Tooltip label={videoPaused ? "Play video" : "Pause video"} shortcut="Space">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={videoPaused ? "Play video" : "Pause video"}
        className={`${ico.className} absolute z-30 ${fadeClass}`}
        style={{ ...ico.style, ...glassChipChrome, bottom: position.bottom, right: position.right }}
      >
        {videoPaused ? (
          <Play width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
        ) : (
          <Pause width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
        )}
      </button>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════
// Stat comparison
// ═══════════════════════════════════════════════════════════════
function StatCompare({ left, right }: { left: typeof humanoids[0]; right: typeof humanoids[0] }) {
  const keys: { key: keyof typeof left; label: string; unit: string }[] = [
    { key: "height", label: "Height", unit: "cm" }, { key: "weight", label: "Weight", unit: "kg" },
    { key: "dof", label: "DOF", unit: "" }, { key: "maxSpeed", label: "Speed", unit: "m/s" },
  ];
  const rows = keys.filter((k) => left[k.key] || right[k.key]);
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      {rows.map((k) => {
        const lv = (left[k.key] as number) || 0, rv = (right[k.key] as number) || 0;
        const w = lv > rv ? "left" : rv > lv ? "right" : "tie";
        return (
          <div key={k.key} className="flex items-baseline justify-between gap-6" style={{ minWidth: 200 }}>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "left" ? "var(--c-ink)" : "var(--c-ink-subtle)" }}>{lv ? `${lv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
            <span className="text-[12px] tracking-widest uppercase" style={{ color: "var(--c-ink-muted)" }}>{k.label}</span>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "right" ? "var(--c-ink)" : "var(--c-ink-subtle)" }}>{rv ? `${rv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPANDED VIEW — Editorial detail popover
// ═══════════════════════════════════════════════════════════════
function ExpandedView({ humanoid, onClose, onPrev, onNext }: {
  humanoid: typeof humanoids[0];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const h = humanoid;
  const idx = humanoids.findIndex((x) => x.id === h.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const specs = [
    h.status && { label: "Status", value: h.status },
    h.height && { label: "Height", value: `${h.height} cm` },
    h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` },
    h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(23,23,23,0.5)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-expand-in flex relative overflow-hidden"
        style={{
          width: "calc(100vw - 96px)",
          height: "calc(100vh - 96px)",
          maxWidth: 1200,
          maxHeight: 760,
          borderRadius: 10,
          background: "#f5f5f4",
          boxShadow: "0 40px 100px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        {/* Left — text content */}
        <div className="flex flex-col justify-between py-10 px-10" style={{ width: "42%", minWidth: 360 }}>
          <div className="flex items-center justify-between mb-10">
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-200"
              style={{ borderRadius: 6, background: "#ebebeb" }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#525252" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
                <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-200"
                style={{ borderRadius: 6, background: "#ebebeb" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7.5,2 3.5,6 7.5,10" />
                </svg>
              </button>
              <span className="text-[12px] tabular-nums mx-1" style={{ color: "var(--c-ink-muted)" }}>
                {String(idx + 1).padStart(2, "0")}<span style={{ color: "var(--c-ink-subtle)" }}>/</span>{String(humanoids.length).padStart(2, "0")}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                className="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:bg-neutral-200"
                style={{ borderRadius: 6, background: "#ebebeb" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4.5,2 8.5,6 4.5,10" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="animate-expand-content" style={{ animationDelay: "0.1s" }}>
              <p className="text-[12px] tracking-widest uppercase font-medium mb-3" style={{ color: "var(--c-ink-muted)", letterSpacing: "0.02em" }}>
                {h.manufacturer}
              </p>
              <h2 className="text-[32px] font-medium leading-none" style={{ color: "var(--c-ink)", letterSpacing: "-0.04em" }}>
                {h.name}
              </h2>
              {h.year && (
                <p className="text-[13px] mt-2.5" style={{ color: "var(--c-ink-muted)" }}>{h.year}</p>
              )}
            </div>

            <div className="animate-expand-content" style={{ animationDelay: "0.18s" }}>
              {h.description && (
                <p className="text-[13px] leading-relaxed mt-6" style={{ color: "#737373", maxWidth: 340 }}>
                  {h.description}
                </p>
              )}
            </div>

            <div className="animate-expand-content" style={{ animationDelay: "0.25s" }}>
              {h.cost && h.cost !== "N/A" && (
                <p className="text-[18px] font-medium mt-8" style={{ color: "#171717", letterSpacing: "-0.03em" }}>
                  {h.cost}
                </p>
              )}
              {h.purchaseUrl && (
                <a
                  href={withUtm(h.purchaseUrl, h.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center mt-4 px-5 py-2 text-[12px] font-medium tracking-wide transition-colors hover:bg-neutral-800"
                  style={{ background: "#171717", color: "#fff", borderRadius: 6 }}
                >
                  Buy
                </a>
              )}
            </div>
          </div>

          <div className="animate-expand-content" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-start gap-8 pt-6" style={{ borderTop: "1px solid #e5e5e5" }}>
              {specs.map((s) => (
                <div key={s.label}>
                  <p className="text-[12px] tracking-widest uppercase" style={{ color: "var(--c-ink-muted)", letterSpacing: "0.1em" }}>
                    {s.label}
                  </p>
                  <p className="text-[13px] font-medium mt-1" style={{ color: "var(--c-ink)" }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — robot image on slate surface */}
        <div
          className="flex-1 flex items-center justify-center relative"
          style={{ background: "#ececea", borderLeft: "1px solid #e5e5e5" }}
        >
          <div className="animate-expand-content relative" style={{ width: "75%", height: "75%", animationDelay: "0.08s" }}>
            {h.imageUrl ? <Image src={h.imageUrl} alt={h.name} fill className="object-contain" sizes="50vw" priority /> : <PlaceholderLogo />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Share URL params ──────────────────────────────────────────
// Single bot:  ?h=<id>
// Compare:     ?compare=<leftId>,<rightId>
// IDs come straight from humanoids.ts; compare takes precedence on hydration.
function OgPreview({ src, onReady }: { src: string; onReady?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      style={{
        width: 200,
        height: 105,
        borderRadius: 10,
        overflow: "hidden",
        background: "rgba(0,0,0,0.04)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={200}
        height={105}
        onLoad={() => { setLoaded(true); onReady?.(); }}
        onError={() => onReady?.()}
        style={{
          display: "block",
          objectFit: "cover",
          clipPath: loaded ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
          transition: "clip-path 520ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

// Session-level memory: once a logo src has loaded once in this tab, future
// LogoImage mounts for that src start "loaded" and skip the swipe entirely.
// Survives cardLabel remounts on scroll-swap (key={h.id}).
const loadedLogoSrcs = new Set<string>();

function LogoImage({ src, alt }: { src: string; alt: string; sizes?: string }) {
  // Plain <img> instead of next/image: logos are 22–26px so optimization buys
  // nothing, and the load event behaves more reliably than next/image's
  // wrapped element in Next 16 (OgPreview uses the same pattern).
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(() => loadedLogoSrcs.has(src));
  useLayoutEffect(() => {
    // Reset to "not loaded" on src change so the clip-path closes back over
    // the stale paint from the previous logo; the swipe-reveal then plays
    // when the new src decodes. Cached srcs stay open (no animation flash).
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      loadedLogoSrcs.add(src);
      setLoaded(true);
    } else {
      setLoaded(loadedLogoSrcs.has(src));
    }
  }, [src]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onLoad={() => { loadedLogoSrcs.add(src); setLoaded(true); }}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        clipPath: loaded ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
        transition: "clip-path 520ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    />
  );
}

// Gates display until the *current* src has actually loaded. Without this,
// fast scroll past the preloader window leaves the previously-decoded image
// painted on the recycled <Image> element while the new src is still loading
// — so one robot appears to "stick" across several swaps.
function RobotImage({
  src,
  alt,
  sizes,
  priority,
  className,
  style,
  onReadyChange,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onReadyChange?: (ready: boolean) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const ready = loadedSrc === src;
  // Cached images (warmed by the neighbor preloader) often complete before
  // React attaches onLoad, so the event never fires and the silhouette sticks.
  // Sync from the underlying <img>'s complete flag on mount/src change.
  useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoadedSrc(src);
    }
  }, [src]);
  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);
  return (
    <Image
      ref={imgRef}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onLoad={() => setLoadedSrc(src)}
      style={{ ...style, opacity: ready ? 1 : 0 }}
    />
  );
}

// Per-slide wrapper: anchors the placeholder silhouette to the full slide cell
// rather than the inner padded box, so its position stays constant across cards
// regardless of bottom-aligned vs centered padding. Without this lift, the
// placeholder jumped ~12px between cards as you scrolled.
function MediaImageSlide({
  src,
  alt,
  isCover,
  isBottom,
  imageStyle,
  sizes,
  priority,
  bottomFadeH,
  bottomFadeOpacity,
  credit,
}: {
  src: string;
  alt: string;
  isCover: boolean;
  isBottom: boolean;
  imageStyle: React.CSSProperties;
  sizes: string;
  priority: boolean;
  bottomFadeH: number;
  bottomFadeOpacity: number;
  credit?: { prefix?: string; name: string; href?: string };
}) {
  const [ready, setReady] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center pointer-events-none"
      style={{
        width: "100%",
        height: "100%",
        flexShrink: 0,
        scrollSnapAlign: "start",
        padding: isCover ? 0 : isBottom ? "24px 24px 0 24px" : 24,
      }}
    >
      {!ready && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="280" height="280" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.045 }}>
            <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
            <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
          </svg>
        </div>
      )}
      <div className="relative w-full h-full">
        <RobotImage
          src={src}
          alt={alt}
          className={isCover ? "object-cover" : "object-contain"}
          style={imageStyle}
          sizes={sizes}
          priority={priority}
          onReadyChange={setReady}
        />
        {isBottom && (
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-[2]"
            style={{
              height: bottomFadeH,
              background: `linear-gradient(to bottom, transparent, rgba(250,250,250,${bottomFadeOpacity}))`,
            }}
          />
        )}
      </div>
      {/* Photo credit. Its twin on VideoSlide sits on video, so it's white;
          this one sits on the card's own paper and reads as ink instead.
          Anchored to the slide's padding gutter rather than the image box, so a
          bottom-aligned robot's feet never land on top of it. Deliberately
          quiet at rest — it's a licence obligation, not a feature — and comes
          up to legible on card hover. */}
      {credit && (
        <div
          className="absolute z-[3] pointer-events-auto opacity-25 group-hover/card:opacity-55"
          style={{
            bottom: 9,
            left: 12,
            fontSize: 10.5,
            fontWeight: 500,
            lineHeight: 1,
            color: "var(--c-ink)",
            whiteSpace: "nowrap",
            transition: "opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {credit.prefix && <span>{credit.prefix} </span>}
          {credit.href ? (
            <a
              href={credit.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:underline underline-offset-2"
            >
              {credit.name}
            </a>
          ) : (
            <span>{credit.name}</span>
          )}
        </div>
      )}
    </div>
  );
}

function parseShareParams(): { leftId: string | null; compareIds: string[]; pickIds: string[] } {
  if (typeof window === "undefined") return { leftId: null, compareIds: [], pickIds: [] };
  const p = new URLSearchParams(window.location.search);
  const compareRaw = p.get("compare");
  const compareIds = compareRaw ? compareRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  // `?picks=` is a shared shelf. It seeds the visitor's own saved set rather
  // than opening a read-only view of someone else's — a collection you can
  // take away and edit is worth more than one you can only look at.
  const picksRaw = p.get("picks");
  const pickIds = picksRaw ? picksRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return { leftId: p.get("h"), compareIds, pickIds };
}

// Shelved — pending relative-size revisit. ScaleToggle is not currently
// rendered; the `toScale` Browse prop is plumbed so the consumer at
// `effectiveScale` below stays live when this is re-enabled.
function ScaleToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMounted(true); }, []);
  const updatePos = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.top });
  };
  return (
    <span className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onMouseEnter={() => { updatePos(); setHover(true); }}
        onMouseMove={updatePos}
        onMouseLeave={() => setHover(false)}
        aria-pressed={active}
        aria-label={active ? "Show robots at card scale" : "Show robots to scale"}
        className="cursor-pointer pointer-events-auto"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 5,
          border: "none",
          padding: 0,
          background: active ? "rgba(0,0,0,0.07)" : "transparent",
          color: active ? "var(--c-ink-body)" : "var(--c-ink-subtle)",
          transition: "background 180ms ease, color 180ms ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Ruler size={12} strokeWidth={1.6} aria-hidden />
      </button>
      {mounted && pos && createPortal(
        <span
          role="tooltip"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, calc(-100% - 8px))",
            background: "rgba(38, 38, 38, 0.92)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "-0.005em",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            opacity: hover ? 1 : 0,
            pointerEvents: "none",
            transition: "opacity 140ms ease",
            zIndex: 9999,
          }}
        >
          {active ? "Showing to scale" : "Show robots to scale"}
        </span>,
        document.body,
      )}
    </span>
  );
}

// Plain colored dot used inside the status pill.
function StatusDot({ color, size = 10 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: color, flexShrink: 0 }} />;
}

// "What's new" toast card — minimal: hairline frame, tiny shared image, single line.
// Caps at three thumbnails and three names so a big drop still reads as one line.
const TOAST_MAX_NAMES = 3;
function AnnouncementToast({
  humanoids: items,
  onView,
}: {
  humanoids: Humanoid[];
  onView: () => void;
  onDismiss: () => void;
}) {
  const thumbs = items.filter((h) => h.imageUrl).slice(0, TOAST_MAX_NAMES);
  const shown = items.slice(0, TOAST_MAX_NAMES);
  const extra = items.length - shown.length;
  const names = shown.map((h) => h.name).join(", ") + (extra > 0 ? ` +${extra} more` : "");
  return (
    <div
      onClick={onView}
      role="button"
      tabIndex={0}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        maxWidth: "min(440px, 90vw)",
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 10,
        padding: "6px 14px 6px 6px",
        cursor: "pointer",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          gap: 2,
          height: 32,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {thumbs.map((h) => (
          <Image
            key={h.id}
            src={h.imageUrl!}
            alt={h.name}
            width={22}
            height={28}
            style={{ objectFit: "contain", objectPosition: "center bottom", height: "100%", width: "auto", maxWidth: 22 }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 12.5, color: "var(--c-ink-body)", letterSpacing: "-0.005em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
        }}
      >
        <span style={{ color: "var(--c-ink-subtle)" }}>New&nbsp;—&nbsp;</span>
        <span style={{ fontWeight: 600 }}>{names}</span>
      </span>
    </div>
  );
}

// ISO 3166-1 alpha-2 codes for the country names used in data/humanoids.ts.
// Compound origins like "Norway / USA" split on slash and yield two flags.
const COUNTRY_ISO: Record<string, string> = {
  USA: "US",
  China: "CN",
  Japan: "JP",
  Germany: "DE",
  UK: "GB",
  Canada: "CA",
  Israel: "IL",
  Norway: "NO",
  "Hong Kong": "HK",
  Spain: "ES",
  Switzerland: "CH",
};
function countryToIsoCodes(country: string): string[] {
  return country.split(/\s*\/\s*/).map((part) => COUNTRY_ISO[part]).filter(Boolean);
}
function CircleFlag({ iso, size = 11 }: { iso: string; size?: number }) {
  if (!iso) return null;
  // react-circle-flags uses lowercase ISO codes and renders SVGs designed for
  // circular display (no awkward edge cropping). Sized to ~cap-height of the
  // surrounding text so the row keeps its label-height rhythm.
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block", verticalAlign: "-1px",
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
      }}
    >
      <CircleFlagSvg countryCode={iso.toLowerCase()} height={size} width={size} style={{ display: "block" }} />
    </span>
  );
}
const USE_CASE_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Home: House,
  Industrial: Factory,
  Research: FlaskConical,
  Logistics: Package,
  Security: Shield,
  Service: MessageCircle,
  Showcase: Sparkles,
};
function UseValue({ useCase, valueStyle }: { useCase: string; valueStyle: React.CSSProperties }) {
  const Icon = USE_CASE_ICONS[useCase];
  return (
    <span style={{ ...valueStyle, display: "inline-flex", alignItems: "center", gap: 7 }}>
      {Icon && (
        <Icon
          size={13}
          strokeWidth={1.6}
          style={{ display: "inline-block", verticalAlign: "-2px", color: "var(--c-ink-muted)", flexShrink: 0 }}
        />
      )}
      <span>{useCase}</span>
    </span>
  );
}
// Scrollable stats area that auto-fades its bottom edge when content
// overflows — signals "more rows above the pinned action row". No-op when
// content fits.
function StatsScrollArea({ children, style, flex }: { children: React.ReactNode; style?: React.CSSProperties; flex?: number | string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Bitmask: 1 = content above (scrolled down), 2 = content below (room to scroll)
  const [edges, setEdges] = useState(0);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      // Sub-pixel-friendly thresholds: trackpads can leave scrollTop at
      // fractional values for several frames, so `> 1` was missing early
      // top-fade activations. `> 0.5` is still tolerant of layout jitter.
      const top = el.scrollTop > 0.5;
      const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > 0.5;
      setEdges((top ? 1 : 0) | (bottom ? 2 : 0));
    };
    check();
    // Re-check on the next frame to catch the initial layout — the mount
    // pass can run before flex/min-height has settled the scroll height.
    const raf = requestAnimationFrame(check);
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [children]);
  const fadeTop = (edges & 1) !== 0;
  const fadeBottom = (edges & 2) !== 0;
  const mask = fadeTop && fadeBottom
    ? "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, black 9%, black 91%, rgba(0,0,0,0.3) 100%)"
    : fadeBottom
    ? "linear-gradient(to bottom, black 0%, black 91%, rgba(0,0,0,0.3) 100%)"
    : fadeTop
    ? "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, black 9%, black 100%)"
    : undefined;
  const showChevron = hover && fadeBottom;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ flex, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}
    >
      <div
        ref={ref}
        data-stats-scroll
        className="scrollbar-hide"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          WebkitMaskImage: mask,
          maskImage: mask,
          transition: "mask-image 200ms ease, -webkit-mask-image 200ms ease",
          ...style,
        }}
      >
        {children}
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: 2,
          transform: `translateX(-50%) translateY(${showChevron ? 0 : 3}px)`,
          pointerEvents: "none",
          opacity: showChevron ? 0.35 : 0,
          transition: "opacity 240ms ease, transform 240ms ease",
          color: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </div>
  );
}
// Truncated value with an Apple-style edge fade + hover marquee. The
// content reveals over ~1.4s on hover (after a small wait), then
// settles back when the cursor leaves. No-op when content already fits.
function MarqueeValue({ children, align, style }: { children: React.ReactNode; align: "left" | "right"; style?: React.CSSProperties }) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    const measure = () => {
      const o = outerRef.current, i = innerRef.current;
      if (!o || !i) return;
      setOverflow(Math.max(0, i.scrollWidth - o.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, [children]);
  const isOverflow = overflow > 0;
  // Right-anchored text would truncate the START of a word, which reads
  // confusingly ("Research" → "search"). When the value overflows, fall
  // back to left-anchored regardless of the requested align — start of
  // the word stays visible, the end truncates and the marquee reveals it.
  const effectiveAlign = isOverflow ? "left" : align;
  const shiftPx = hover && isOverflow ? -overflow : 0;
  const maskDir = effectiveAlign === "left" ? "right" : "left";
  return (
    <span
      ref={outerRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...style,
        display: "flex",
        justifyContent: effectiveAlign === "left" ? "flex-start" : "flex-end",
        overflow: "hidden",
        maxWidth: "100%",
        width: "100%",
        WebkitMaskImage: isOverflow && !hover ? `linear-gradient(to ${maskDir}, #000 88%, transparent 100%)` : undefined,
        maskImage: isOverflow && !hover ? `linear-gradient(to ${maskDir}, #000 88%, transparent 100%)` : undefined,
        transition: "mask-image 300ms ease, -webkit-mask-image 300ms ease",
      }}
    >
      <span
        ref={innerRef}
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transform: `translateX(${shiftPx}px)`,
          transition: "transform 1.4s cubic-bezier(0.32, 0.72, 0, 1) 0.3s",
        }}
      >
        {children}
      </span>
    </span>
  );
}
function CountryValue({ country, valueStyle, visualSide = "left" }: { country: string; valueStyle: React.CSSProperties; visualSide?: "left" | "right" }) {
  const isos = countryToIsoCodes(country);
  if (isos.length === 0) return <span style={valueStyle}>{country}</span>;
  const flags = (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
      {isos.map((iso) => (
        <CircleFlag key={iso} iso={iso} />
      ))}
    </span>
  );
  // Spread valueStyle minus the opacity. Callers may already wrap us in a
  // parent (e.g. MarqueeValue) that applies the opacity, and compounding
  // it dims the row vs its peers. We still need the font props so country
  // text matches the other values' size — otherwise it inherits a larger
  // default fontSize and the row's baseline shifts when scrolling between
  // robots with/without a country.
  const { opacity: _opacity, ...fontStyle } = valueStyle;
  void _opacity;
  return (
    <span
      title={country}
      aria-label={country}
      style={{ ...fontStyle, display: "inline-flex", alignItems: "baseline", gap: 6 }}
    >
      {visualSide === "left" ? flags : null}
      <span>{country}</span>
      {visualSide === "right" ? flags : null}
    </span>
  );
}

const STATUS_LEGEND: Array<{ label: string; color: string }> = [
  { label: "In Production", color: "#34c759" },
  { label: "Prototype", color: "#ff9500" },
  { label: "Concept", color: "#5e5ce6" },
  { label: "Anticipated", color: "#af52de" },
  { label: "Discontinued", color: "#8e8e93" },
];

// Clickable wrapper used in compare view: renders the dot pill as a
// button; on click, opens a centered legend modal with a soft white
// overlay behind it.
function StatusLegendModal({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label="Status legend"
        aria-haspopup="dialog"
        className="ui-frost cursor-pointer pointer-events-auto"
        style={{
          ...style,
          border: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {children}
      </button>
      {open && mounted && createPortal(
        (<>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(255,255,255,0.45)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              zIndex: 9998,
              animation: "legend-fade-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Status legend"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              minWidth: 320,
              background: "#fff",
              borderRadius: 28,
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.10)",
              padding: "28px 32px",
              zIndex: 9999,
              animation: "legend-fade-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="cursor-pointer"
              style={{
                position: "absolute", top: 14, right: 14,
                width: 28, height: 28, borderRadius: 999,
                border: "none", background: "transparent",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "var(--c-ink-muted)",
                transition: "background 160ms ease, color 160ms ease",
                WebkitTapHighlightColor: "transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; e.currentTarget.style.color = "var(--c-ink-body)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--c-ink-muted)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 4 L12 12 M12 4 L4 12" />
              </svg>
            </button>
            <p style={{
              fontFamily: "var(--font-geist-sans)", fontSize: 11, fontWeight: 500,
              color: "var(--c-ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
              margin: 0, marginBottom: 16,
            }}>Status</p>
            <div className="flex flex-col" style={{ gap: 14 }}>
              {STATUS_LEGEND.map((entry) => (
                <div
                  key={entry.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    fontFamily: "var(--font-geist-sans)", fontSize: 15, fontWeight: 450,
                    color: "var(--c-ink-body)",
                    letterSpacing: "-0.005em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: entry.color, flexShrink: 0 }} />
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>),
        document.body,
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// BROWSE — Single + Compare
// ═══════════════════════════════════════════════════════════════
// Rail order in the dev panel; groups it does not name follow in order of appearance.
const TUNER_GROUPS = ["Stats", "Card", "Compare", "Arc", "Scene", "Layout", "Motion", "Saved"];
// The old per-panel hotkeys, landing on a group of the one panel.
const TUNER_HOTKEYS: Record<string, string> = { "\\": "Stats", b: "Scene", m: "Layout" };

// What a robot without a price says in the price slot.
const availabilityLabel = (h: Humanoid): string | undefined =>
  h.availability === "enterprise" ? "Enterprise only" :
  h.availability === "research" ? "Research only" :
  h.availability === "discontinued" ? "Discontinued" :
  h.availability === "prototype" ? "Not yet for sale" :
  undefined;

// Page-bg wash rather than a grey scrim — the card is #F9F9F9 on white, so
// washing toward white is what "emptying" actually looks like here. Stops
// short of opaque: the robot stays legible underneath. Shared by the compare
// veil and the stats-over-card wash.
const VEIL_WASH = "rgba(255,255,255,0.66)";

// Stats strip over the card: the vertical padding around its rows. The shelf's
// height is measured, not derived, so there is no per-row constant here.
// Blurb with a line cap and its own More/Less control. The drawer is a fixed
// share of card height, so a 400-character description doesn't make the panel
// taller — it pushes the stat rows off the bottom, and opening "info" shows you
// nothing but prose. Capping the lede keeps the rows in the first screenful and
// leaves the full text one word away.
//
// Whether the control is needed is measured, not guessed: `scrollHeight >
// clientHeight` on the clamped element. Estimating from character count breaks
// the moment the card is resized, and this box is sized off `cardW`.
//
// Expansion resets when the text changes — the drawer's own open/shut state
// persists across robots because it's a reading mode, but "show me all of this
// one" is about a specific blurb and shouldn't set the next robot's layout.
function ClampedBlurb({ text, lines, style, linkColor }: {
  text: string;
  lines: number;
  style: React.CSSProperties;
  linkColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setExpanded(false); }, [text]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || lines <= 0) { setOverflows(false); return; }
    // Measured against the clamped box, so this has to run while it is still
    // clamped — hence the early bail once expanded, which leaves the last
    // measurement (true, or we wouldn't have a control to press) standing.
    if (expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, lines, expanded, style.fontSize, style.width]);
  const clamped = lines > 0 && !expanded;
  return (
    <>
      <div
        ref={ref}
        style={{
          ...style,
          ...(clamped ? {
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: lines,
            overflow: "hidden",
          } : null),
        }}
      >
        {text}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="cursor-pointer"
          style={{
            marginTop: 6,
            padding: 0,
            border: "none",
            background: "transparent",
            font: "inherit",
            fontSize: style.fontSize,
            fontWeight: 500,
            color: linkColor,
            lineHeight: 1.35,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </>
  );
}

const STRIP_PAD_TOP = 14, STRIP_PAD_BOTTOM = 16;

/* The drawer's foot chips. Hairline outline on nothing, like the pills in the
   nav — the drawer already carries the glass, so a filled chip inside it would
   be a third surface. Sized a step under the rows so the foot reads as a
   caption to the figures rather than as more of them. */
const drawerChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${SEAM}`,
  color: INK.off,
  fontSize: 12,
  fontWeight: WEIGHT.body,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
};
const DRAWER_FADE = `linear-gradient(to bottom, transparent 0, #000 ${STRIP_PAD_TOP}px, #000 calc(100% - ${STRIP_PAD_BOTTOM}px), transparent 100%)`;
// The drawer gets its own, shorter clock. The card's 0.5s is tuned for things
// that happen once on arrival; this one is a control someone will hit again and
// again, and at half a second a slide that long starts reading as a flourish.
// Slide only, no cross-fade: the card clips its overflow, so a drawer parked
// below the edge is already invisible and fading it too just adds mush.
const DRAWER_DUR = "200ms";
const DRAWER_EASE = "cubic-bezier(0.2, 0, 0, 1)";
// Genie. The sheet is scaled about a point up at the placard's "i" rather than
// slid up from the card's bottom edge, so it reads as being pulled out of the
// button that summoned it — the Dock's un-minimise, not a drawer.
//
// Longer and softer than the slide it replaces: the travel is the length of
// the card instead of the height of the sheet, and at 200ms that distance
// reads as a jump-cut. The ease has no overshoot — a sheet full of text that
// bounces looks like a notification, not a panel.
const GENIE_DUR = 520;
const GENIE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
// Springs, not curves. This is the whole difference between motion that feels
// like a website and motion that feels like iOS: a cubic-bezier is a shape
// someone drew, a spring is a physical system settling. Ease-outs decelerate
// on a schedule; a spring decelerates because it ran out of energy, and the
// eye knows the difference even when it can't name it.
//
// Sampled into CSS `linear()`, which takes an arbitrary list of stops — so the
// browser interpolates a real second-order response with no JS on the frame
// path. Damping is the only knob that matters: 1.0 is critically damped (fast,
// no overshoot), below ~0.8 it visibly passes the mark and comes back.
function springLinear(damping: number, steps = 44): string {
  const z = Math.max(0.3, Math.min(1, damping));
  // Pick the frequency so the spring has all but settled by the end of the
  // transition's own duration — that way the duration slider means what it
  // says, and damping changes the character without changing the length.
  const w = 6 / z;
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let v: number;
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z);
      v = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
    } else {
      v = 1 - Math.exp(-w * t) * (1 + w * t);
    }
    pts.push(v);
  }
  // Land exactly on 1: a spring that stops at 0.9997 leaves a sub-pixel seam
  // where the sheet meets the card edge.
  pts[pts.length - 1] = 1;
  return `linear(${pts.map((v) => v.toFixed(4)).join(",")})`;
}

function genieAxes(open: boolean, dur: number, close: number, stagger: number) {
  const D = open ? dur : close;
  const a = Math.min(0.9, Math.abs(stagger));
  const lead = D * (1 - a / 2);
  const followDelay = (D * a) / 2;
  const follow = D - followDelay;
  const yLeads = open ? stagger >= 0 : stagger < 0;
  return yLeads
    ? { y: { dur: lead, delay: 0 }, x: { dur: follow, delay: followDelay } }
    : { x: { dur: lead, delay: 0 }, y: { dur: follow, delay: followDelay } };
}
// Shut isn't scale(0): a hair of width left in the shape keeps the browser
// interpolating a real box, and the tail of the motion stays legible as the
// sheet narrowing into the button rather than blinking out.
const GENIE_SHUT = "scale(0.05, 0.02)";

// How the blurb and the stats strip share the card's bottom edge.
//   drawer — they stop being two things: one pull-up panel holds the blurb and
//            the rows, scrolls if its contents outrun its cap, and hides on the
//            card's own "i". Per card, so each side of a compare has its own.
//   shelf  — the blurb is the strip's top row, one glass panel, one type scale
//   chip   — the blurb keeps its own chip, resting on the strip's top edge
//   swap   — the edge holds one at a time; showing info slides the rows out
//   free   — pre-shelf behaviour, blurb floating loose inside the media area
type BlurbDock = "drawer" | "shelf" | "chip" | "swap" | "free";

// The shelf's own height, written back to the card as `--shelf-k`: the scale
// the media area shrinks by so the robot stands on the shelf's top edge rather
// than behind it. Measured rather than computed because the blurb row wraps to
// an unknown number of lines — the arithmetic version could only ever count
// fixed-height stat rows. Writes a CSS var on the card instead of lifting the
// height into state: this runs on every resize and must not re-render the deck.
// The genie's second axis. A single `transform` carries one timing, so a
// staggered genie has to be nested: the outer box runs Y, this one runs X, and
// the painted surface rides down here so both scales act on the same box.
// Off, it renders nothing of its own — every other dock keeps its old markup.
function GenieAxisX({ enabled, style, children }: { enabled: boolean; style: React.CSSProperties; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <div style={style}>{children}</div>;
}

function ShelfMeasure({ cardH, active, open, children, ...rest }: { cardH: number; active: boolean; open: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const card = el?.parentElement;
    if (!el || !card) return;
    // `--shelf-h` also goes on the compare wrapper. The card sets its own
    // z-index, so it is a stacking context and nothing inside it can paint
    // over the compare veil, which lives outside it — the veil has to shorten
    // itself instead, and it can only read a var it inherits. `closest` rather
    // than a fixed number of hops: the card sits a couple of wrappers deep and
    // that nesting is not this component's business.
    const targets = [card, card.closest(".compare-rcard")].filter(Boolean) as HTMLElement[];
    const write = () => {
      const h = open ? el.offsetHeight : 0;
      const k = active && cardH ? Math.max(0.4, 1 - h / cardH) : 1;
      card.style.setProperty("--shelf-k", k.toFixed(4));
      for (const t of targets) {
        t.style.setProperty("--shelf-h", `${h}px`);
        t.style.setProperty("--shelf-open", open ? "1" : "0");
      }
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => {
      ro.disconnect();
      card.style.removeProperty("--shelf-k");
      for (const t of targets) { t.style.removeProperty("--shelf-h"); t.style.removeProperty("--shelf-open"); }
    };
  }, [cardH, active, open]);
  return <div ref={ref} {...rest}>{children}</div>;
}

function Browse({ goToId, homeNonce = 0, navStyle, onNavStyleChange, switcherStyle, onSwitcherStyleChange, luckyNonce = 0, onRandomHumanoid, onComparingChange, onShareViewLabelChange, introDone = false, shareUrlRef, shareOgRef, onShareView, onHome, onShareSite, onFeedback, onToggleChat, chatActive = false, buttonVariant, onButtonVariantChange, allCaps = false, onAllCapsChange, showChatTuner = false, onToggleChatTuner, epetriMode = false, onEpetriModeChange, isDev = false, surfaceColor, onSurfaceColorChange, surfaceHover, onSurfaceHoverChange, chromeVariant, onChromeVariantChange, toScale = false, onToScaleChange, useImperial = true, onUseImperialChange, palette = "cool", onPaletteChange }: { goToId?: string | null; homeNonce?: number; navStyle: NavStyle; onNavStyleChange: (s: NavStyle) => void; switcherStyle: SwitcherStyle; onSwitcherStyleChange: (s: SwitcherStyle) => void; luckyNonce?: number; onRandomHumanoid?: () => void; onComparingChange?: (v: boolean) => void; onShareViewLabelChange?: (s: string) => void; introDone?: boolean; shareUrlRef?: React.MutableRefObject<string>; shareOgRef?: React.MutableRefObject<string>; onShareView?: () => void; onHome?: () => void; onShareSite?: () => void; onFeedback?: () => void; onToggleChat?: () => void; chatActive?: boolean; buttonVariant: ButtonVariant; onButtonVariantChange: (v: ButtonVariant) => void; allCaps?: boolean; onAllCapsChange?: (v: boolean) => void; showChatTuner?: boolean; onToggleChatTuner?: () => void; epetriMode?: boolean; onEpetriModeChange?: (v: boolean) => void; isDev?: boolean; surfaceColor: string; onSurfaceColorChange: (c: string) => void; surfaceHover: string; onSurfaceHoverChange: (c: string) => void; chromeVariant: "split" | "joined"; onChromeVariantChange: (v: "split" | "joined") => void; toScale?: boolean; onToScaleChange?: (v: boolean) => void; useImperial?: boolean; onUseImperialChange?: (v: boolean) => void; palette?: "cool" | "neutral"; onPaletteChange?: (p: "cool" | "neutral") => void }) {
  const [presetKey, setPresetKey] = useState<PresetKey>("smooth");

  const [customStiffness, setCustomStiffness] = useState(0.10);
  const [customDamping, setCustomDamping] = useState(0.42);
  const [customThreshold, setCustomThreshold] = useState(54);
  const [robotSquish, setRobotSquish] = useState(0.00);
  const [robotFade, setRobotFade] = useState(0.08);
  const [bottomFadeH, setBottomFadeH] = useState(40);
  const [bottomFadeOpacity, setBottomFadeOpacity] = useState(0.9);
  const [showTuner, setShowTuner] = useState(false);
  // Which rail group the panel opens on; the old per-panel hotkeys land here.
  const [tunerGroup, setTunerGroup] = useState<string | null>(null);
  // Sparkbar — distribution-of-fleet visualization tucked into stat rows.
  // Picker lives in the Split tuner (\\). Modes: off / inline / below / hero.
  const [sparkMode, setSparkMode] = useSparkMode();
  const sparkData = useFleetSparkData(humanoids);
  const [buyLayout, setBuyLayout] = useState<"card" | "chip" | "below">("card");
  // Recording mode — append `?record` to the URL to enter. Tightens the
  // first-frame composition (detail panel closed) and trims a few robots from
  // the shuffle pool that don't film well. Invisible to regular users.
  const [recordingMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("record");
  });
  const RECORDING_SHUFFLE_EXCLUDE_IDS = ["23", "25"]; // Armar-6, Roboy
  // Default to collapsed — the detail/stats column opens on demand, not on load.
  // (recordingMode also wants it closed for the first frame, so `true` covers both.)
  // Stats over the card. "off" is the column. "strip" raises a glass band
  // inside the card's bottom edge; "wash" veils the whole image (the compare
  // veil's wash) and lays the rows on it. Either way the column stays shut and
  // the D toggle / details button drive the overlay instead.
  const [statsOverlay, setStatsOverlay] = useState<"off" | "strip" | "wash">("strip");
  const [statsCollapsedRaw, setStatsCollapsed] = useState(false);
  // Strip only: shrink the image from its top edge so the robot stands on the
  // strip instead of disappearing behind it. Only consulted outside drawer
  // mode — the sheet has its own `drawerLift`, because a drawer this tall
  // would shrink the robot to a thumbnail where a thin band costs nothing.
  const [stripFit, setStripFit] = useState(true);
  // Where the info blurb goes once the strip owns the card's bottom edge.
  // "free" is the old behaviour: the blurb floats inside the media area, which
  // means `stripFit`'s scale shrinks its type below the strip's and nothing
  // reserves room for it, so it lands on the robot's shins. The other three
  // dock it into the shelf that the strip and the blurb now share.
  const [blurbDock, setBlurbDock] = useState<BlurbDock>("drawer");
  // Drawer mode only. Shut is the default — the robot is the reason anyone is
  // here, so it gets the whole card on arrival and the drawer comes up on the
  // card's i. Consolidating the strip into the drawer is what made this safe:
  // there's now one affordance to find, not a strip that was always up.
  // Overrides are keyed by side, not by humanoid: opening the drawer says how
  // you want to read the deck, so it stays open as you scroll from robot to
  // robot rather than resetting on every crossing. Two keys because compare
  // has two cards, and closing one must leave the other alone.
  const [drawerOverrides, setDrawerOverrides] = useState<Record<string, boolean>>({});
  const [drawerDefaultOpen, setDrawerDefaultOpen] = useState(false);
  // A fixed share of card height, not a cap: the drawer is this tall whether
  // the robot has four lines of description or one, and its contents scroll
  // inside. Sizing to content meant the sheet jumped to a new height on every
  // robot as you scrolled the deck, which read as instability rather than as
  // information. It rides high — there is a lot in it now — which is only
  // affordable because it sits over the robot instead of displacing it.
  const [drawerMaxPct, setDrawerMaxPct] = useState(100);
  // Off by default, unlike the strip's `stripFit`. The strip was a thin band
  // and shrinking the robot by its height cost nothing; a drawer this tall
  // would shrink the robot to a thumbnail. Letting it pass over the glass with
  // the robot legible behind it is the whole reason the panel is glass.
  const [drawerLift, setDrawerLift] = useState(false);
  // Rounded on top only, square where it meets the card's own bottom corners —
  // the shape that reads as a sheet pulled up rather than a band pinned on.
  const [drawerRadius, setDrawerRadius] = useState(20);
  // Lines of description shown before the More control. 0 turns the cap off and
  // lets the blurb run to full length inside the drawer's scroll.
  const [blurbClampLines, setBlurbClampLines] = useState(3);
  // How the sheet arrives. "slide" is the plain translateY from the card's
  // bottom edge; "genie" scales it out of the placard's "i".
  // The drawer's handle lives in the dock under the card now, so the sheet
  // comes up from the card's bottom edge to meet it. The genie pulled it out
  // of the placard's top-right "i", which is the corner that no longer has a
  // button in it.
  const [drawerMotion, setDrawerMotion] = useState<"slide" | "genie">("slide");
  // Opaque rather than glass. Glass is right for a band that shares the card
  // with the robot; once the sheet takes the whole face there is nothing to
  // share it with, and a solid surface is what makes the genie read as the
  // card turning into its own detail page instead of a panel laid over it.
  const [drawerOpaque, setDrawerOpaque] = useState(true);
  // The genie bench. One motion, tuned — not a menu of motions. Every knob here
  // shapes the same gesture: the sheet being pulled out of the "i".
  const [genieDur, setGenieDur] = useState<number>(520);
  const [genieCloseDur, setGenieCloseDur] = useState<number>(340);
  // Damping is the character knob. 1.0 is critically damped — quick and dead
  // flat. Around 0.8 the sheet just barely passes its mark and comes back,
  // which is where iOS lives.
  const [genieDamping, setGenieDamping] = useState<number>(0.82);
  // Which axis leads. Positive is the Dock's tall-first; the sheet needs some
  // of it or it is only a box growing.
  const [genieStagger, setGenieStagger] = useState<number>(0.4);
  const [genieShutX, setGenieShutX] = useState<number>(0.07);
  const [genieShutY, setGenieShutY] = useState<number>(0.03);
  const [genieContent, setGenieContent] = useState<number>(0.45);
  // How far the robot behind the sheet pulls back as it arrives. Small numbers
  // only: this is depth, not a second animation competing with the first.
  const [genieRecede, setGenieRecede] = useState<number>(4);
  // How much the "i" gives way as the sheet takes over. The button is the
  // thing the sheet comes out of, so it should look spent while the sheet is
  // up and recover as it leaves — otherwise the origin story stops the moment
  // the motion starts.
  const [genieHandoff, setGenieHandoff] = useState<number>(0.55);
  // Rebuilt only when damping moves. The string is ~45 stops; regenerating it
  // per render would put string-building on the same frames as the animation.
  const genieSpring = useMemo(() => springLinear(genieDamping), [genieDamping]);
  // The card row's "i" is the drawer's handle. It used to be off in drawer
  // mode, because the placard carried a second "i" in its top-right corner and
  // two controls for one panel is one too many. The dock is the better of the
  // two homes: everything else you can do to the robot in front of you — save
  // it, compare it, share it — is already there, and info is one of those, not
  // a property of the placard. The placard's copy is off (`collapseVariant`).
  const [showInfoChip, setShowInfoChip] = useState(true);
  const drawerOpenFor = (id: string) => drawerOverrides[id] ?? drawerDefaultOpen;
  // True wherever the card's own "i" chip should still be drawn. In drawer
  // mode the placard handle already opens the same panel, so the chip is off
  // unless the tuner asks for it back.
  const infoChipOn = showInfoChip || !(statsOverlay === "strip" && blurbDock === "drawer");
  const toggleDrawer = (id: string) =>
    setDrawerOverrides((m) => ({ ...m, [id]: !(m[id] ?? drawerDefaultOpen) }));
  const statsCollapsed = statsOverlay !== "off" || statsCollapsedRaw;
  const statsOverCard = statsOverlay !== "off" && !statsCollapsedRaw;
  const [statsHover, setStatsHover] = useState(false);
  // Engineer-mode is the only mode while the basic/engineer toggle is hidden.
  // localStorage hydration intentionally skipped so returning users who'd
  // previously flipped to basic still land in engineer.
  const [engineerMode, setEngineerMode] = useState(true);
  // Hide rows whose value is null/missing — useful when engineer mode reveals
  // a lot of rows and only ~5 robots have full data.
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("humanoid-index:hideEmptyRows");
      if (stored === "true") setHideEmptyRows(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("humanoid-index:hideEmptyRows", String(hideEmptyRows)); } catch {}
  }, [hideEmptyRows]);
  // Per-robot favorites — kept in localStorage as a JSON array of ids.
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      const stored = localStorage.getItem("humanoid-index:favorites");
      if (!stored) return;
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) setFavoriteIds(new Set(arr.filter((s) => typeof s === "string")));
    } catch {}
  }, []);
  // A shared shelf merges into what's already saved instead of replacing it.
  // Opening a link should never cost the visitor their own collection.
  useEffect(() => {
    const { pickIds } = parseShareParams();
    const valid = pickIds.filter((id) => humanoids.some((h) => h.id === id));
    if (valid.length === 0) return;
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      valid.forEach((id) => next.add(id));
      try { localStorage.setItem("humanoid-index:favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("humanoid-index:favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  type CollapseVariant = "pull-tab" | "gap-zone" | "hover-fade" | "info-icon" | "none";
  const [collapseVariant, setCollapseVariant] = useState<CollapseVariant>("info-icon");
  useEffect(() => {
    if (collapseVariant === "hover-fade" || collapseVariant === "none") {
      setStatsCollapsed(false);
    }
  }, [collapseVariant]);
  const [buyCardStyle, setBuyCardStyle] = useState<"split" | "dark">("split");
  const [hideUnbuyable, setHideUnbuyable] = useState(false);
  const [isCustom, setIsCustom] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [railHover, setRailHover] = useState<FormFilter | null>(null);
  /* How the rail draws itself.
     "lanes-type"  — lanes are words + counts, tools keep their glyphs. The
                     rail's two jobs stop competing: what you are looking AT is
                     type, what you do WITH it is a glyph. It also settles the
                     column's oldest inconsistency — the three form glyphs are
                     custom pictographs and everything under them is lucide line
                     work, two drawing systems in one column, which is the first
                     thing the eye catches.
     "all-icons"   — every row icon + label, one family, one rank.
     "no-icons"    — nothing but words.
     The empty glyph gutter stays in every mode: it is what keeps one left edge
     down the whole column. */
  const [railIcons, setRailIcons] = useState<"lanes-type" | "all-icons" | "no-icons">("lanes-type");
  // Compare narrows the column to glyphs — the labels collapse to zero width —
  // so type-led lanes have nothing left to read by. The glyphs come back for
  // the duration; a lane you can't see isn't a quieter rail, it's a missing one.
  const laneGlyphOn = railIcons === "all-icons" || comparing;
  const toolGlyphOn = railIcons !== "no-icons";
  /* Where the grid lives. It is a view of the open lane, not a place you go, so
     by default it is a toggle rather than a row among the destinations. */
  const [gridPlacement, setGridPlacement] = useState<"toggle" | "lane-trailing" | "float" | "row">("toggle");
  // Whole-capsule hover, separate from per-segment hover: the counts belong to
  // the rail, not to the row under the cursor, so they arrive together.
  const [railOpen, setRailOpen] = useState(false);
  // A swipe-driven lane change happens with the cursor nowhere near the rail,
  // so the only readout would be a small grey pill sliding in the periphery.
  // The flash opens the labels and counts for a beat — the same open state
  // hover produces, arrived at from across the page. OR'd with hover rather
  // than sharing one flag, so an expiring flash can't close a rail the cursor
  // is still resting on.
  const [railFlash, setRailFlash] = useState(false);
  const railFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRail = useCallback(() => {
    if (railFlashTimer.current) clearTimeout(railFlashTimer.current);
    setRailFlash(true);
    railFlashTimer.current = setTimeout(() => setRailFlash(false), 900);
  }, []);
  useEffect(() => () => { if (railFlashTimer.current) clearTimeout(railFlashTimer.current); }, []);
  // Hover reveals the counts. They are the secondary half of each lane row —
  // useful when you are choosing, noise when you are reading a robot — so they
  // arrive with the cursor and leave with it. `railFlash` reaches the same
  // state from a swipe, where the cursor is nowhere near the column and the
  // sliding indicator alone is easy to miss.
  // Live rail: the column rests as a dimmed glyph strip and grows continuously
  // with how near the cursor is, rather than switching between two states. Off
  // by default — the column rests with its labels always on; the tuner switch
  // brings the proximity response back.
  const [railLabelsOnHover, setRailLabelsOnHover] = useState(false);
  // The band the response happens over. Not a hover target: the column sits
  // 24px off the left edge, so waiting for the cursor to land on it means the
  // rail only reacts once you have already committed to the reach — which is
  // the moment the feedback stops being useful.
  const [railNearPx, setRailNearPx] = useState(280);
  const [railGrowMs, setRailGrowMs] = useState(120);
  // Ring rail: the same rows bent into a small wheel around the mark, so the
  // column is the same kind of object as the name arc beside it — a rail —
  // rather than the one rectilinear thing on the page. The mark is the hub at
  // the left edge; the rows sit on an arc to its right. Labels run radially,
  // like the names on the big wheel, because a horizontal label on a row near
  // the top of the ring lands on top of its neighbour's.
  // "concentric" is the ring's second form: instead of a wheel of its own it
  // borrows the name arc's centre (off-screen left) and steps by the same
  // angle, so every menu row sits on the same ray as a name — the column bent
  // onto the wheel's curvature, with the mark on the focused name's ray and
  // the rows wrapped above and below it.
  const [toggleOnMode, setToggleOnMode] = useState<ToggleOnState>("ink");
  const [railShape, setRailShape] = useState<"column" | "ring" | "concentric" | "gear">("gear");
  // The gear's hover is per-ENTRY, not per-lane: every seat on the ring can
  // show its label, and `railHover` only ever names a form lane.
  const [railHoverKey, setRailHoverKey] = useState<string | null>(null);
  // Wide-screen rail: the column is pinned 24px off the left edge while the
  // card stays centered, so past ~1900px the two drift apart and the rail ends
  // up alone in the corner of a very large screen. On, it walks inward as the
  // viewport grows so the chrome stays part of the same composition. Inert
  // below 1600px — every laptop keeps the 24px edge it has now.
  const [railPullIn, setRailPullIn] = useState(true);
  const [railPull, setRailPull] = useState(0.6); // px of inset per px of viewport past 1600
  // Tuned for the gear: at 84/170 the seven seats sprawled over most of the
  // viewport's height, which is the opposite of "shorter". 100/150 keeps the
  // in-group chord clear of the 28px seats while the crescent still reads as
  // part of a circle rather than as a bent line.
  const [ringR, setRingR] = useState(100);
  const [ringSweep, setRingSweep] = useState(150);
  // How far inside the names' circle the concentric ring sits.
  const [ringInset, setRingInset] = useState(72);
  const [autoRingInset, setAutoRingInset] = useState(true);
  const railRef = useRef<HTMLDivElement | null>(null);
  // Ring hub, read by the pointer listener so a shape or radius change doesn't
  // re-bind it. Measured here rather than per pointermove: the hub is a fixed,
  // zero-size point, so its rect only moves on resize.
  const ringGeomRef = useRef<{ r: number; cx: number; cy: number } | null>(null);
  useLayoutEffect(() => {
    if (railShape !== "ring") { ringGeomRef.current = null; return; }
    const measure = () => {
      const rect = railRef.current?.getBoundingClientRect();
      ringGeomRef.current = { r: ringR, cx: rect?.left ?? 0, cy: rect?.top ?? window.innerHeight / 2 };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [railShape, ringR]);
  // Openness lives in a ref and reaches the DOM as a CSS variable. It changes
  // every frame while the cursor moves, so it must never be React state — see
  // the same rule the spring follows.
  const railPRef = useRef(0);
  const railTargetRef = useRef(0);
  const railRafRef = useRef<number | null>(null);

  // What the mode pins openness to, or null when the cursor decides: compare
  // owns the column outright; hover and the swipe flash pin it fully open.
  const railPin = comparing ? 0 : (railOpen || railFlash) ? 1 : null;
  // Read through a ref by the pointer listener so a mode flip doesn't tear
  // the listener (and the in-flight ease) down and re-bind it.
  const railPinRef = useRef<number | null>(railPin);
  railPinRef.current = railPin;
  const railKickRef = useRef<(() => void) | null>(null);
  // One place decides which of the two systems a row is wearing, so no call
  // site has to know the mode. Legacy = today's boolean widths with their CSS
  // transitions; live = the --rail-p functions above.
  const railLive = railLabelsOnHover;
  const railLabelStyle = railLive ? sidebarLabelLive : sidebarLabel(comparing);
  const railCountStyle = railLive ? sidebarCountLive : sidebarCount(railPin === 1);
  const railGlyphStyle = (base: number): React.CSSProperties =>
    railLive ? glyphLive(base) : { opacity: base, transition: "opacity 200ms ease" };

  // One writer for the whole column. `target` is where openness wants to be;
  // the frame loop eases toward it and stops the moment it arrives, so a rail
  // sitting still costs nothing.
  useEffect(() => {
    if (!railLabelsOnHover) {
      // Off: pin fully open (or shut, in compare) and let the existing CSS
      // transitions own the change, exactly as before.
      const el = railRef.current;
      if (el) { el.style.removeProperty("--rail-p"); el.style.removeProperty("--rail-q"); }
      if (railRafRef.current) { cancelAnimationFrame(railRafRef.current); railRafRef.current = null; }
      return;
    }
    // Per-frame ease toward the target. The rate is framed as a time constant
    // so the slider reads in milliseconds rather than in lerp coefficients.
    const step = () => {
      railRafRef.current = null;
      const el = railRef.current;
      if (!el) return;
      const target = railTargetRef.current;
      const cur = railPRef.current;
      const next = cur + (target - cur) * Math.min(1, 16.7 / Math.max(16.7, railGrowMs));
      const done = Math.abs(target - next) < 0.002;
      railPRef.current = done ? target : next;
      const pv = railPRef.current;
      el.style.setProperty("--rail-p", pv.toFixed(3));
      // The trailing column rides the top 45% of the ramp, so counts and
      // shortcuts land after the labels have finished opening instead of
      // sliding out alongside them.
      el.style.setProperty("--rail-q", Math.max(0, (pv - 0.55) / 0.45).toFixed(3));
      if (!done) railRafRef.current = requestAnimationFrame(step);
    };
    const kick = () => { if (railRafRef.current == null) railRafRef.current = requestAnimationFrame(step); };
    railKickRef.current = kick;

    const retarget = (t: number) => {
      if (Math.abs(t - railTargetRef.current) < 0.002) return;
      railTargetRef.current = t;
      kick();
    };
    // Unless the mode pins it, openness is just how far into the band you are.
    const onMove = (e: PointerEvent) => {
      if (railPinRef.current != null) { retarget(railPinRef.current); return; }
      const ring = ringGeomRef.current;
      if (ring) {
        // Ring: openness is distance from the hub, not from the left edge —
        // fully open anywhere on the wheel (plus a margin), easing off over
        // the band beyond it. Self-contained, so it needs no enter/leave.
        const d = Math.hypot(e.clientX - ring.cx, e.clientY - ring.cy) - (ring.r + 40);
        retarget(Math.max(0, Math.min(1, 1 - d / railNearPx)));
        return;
      }
      retarget(Math.max(0, 1 - e.clientX / railNearPx));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    kick();
    return () => {
      window.removeEventListener("pointermove", onMove);
      railKickRef.current = null;
      if (railRafRef.current) { cancelAnimationFrame(railRafRef.current); railRafRef.current = null; }
    };
  }, [railLabelsOnHover, railNearPx, railGrowMs]);
  // Mode changes happen with no pointer moving — entering compare has to shut
  // the column even if the cursor never leaves the rail — so they retarget on
  // their own, without re-binding the listener above.
  useEffect(() => {
    if (!railLabelsOnHover || railPin == null) return;
    railTargetRef.current = railPin;
    railKickRef.current?.();
  }, [railLabelsOnHover, railPin]);
  // ── Form filter ────────────────────────────────────────────────────────────
  // See lib/wheelLanes.ts for the index model. `lane` is the list BOTH springs
  // index — compare stays inside the open category, so opening it no longer
  // swaps the list. The lane swaps only when the filter changes, and the
  // lane-change effect below re-seats both springs by id.
  const [formFilter, setFormFilter] = useState<FormFilter>("humanoid");
  // ── Saved ──────────────────────────────────────────────────────────────────
  // Three surfaces over one set (see components/SavedSurfaces.tsx). The toggle
  // on the card, the sidebar row and the localStorage set are shared; only
  // where the set is *shown* changes.
  //   lane  — the wheel switches to the saved list. The collection is a place.
  //   tray  — a standing total in the corner. The collection is a purchase.
  //   shelf — a full-screen layout of the objects. The collection is on show.
  const [savedSurface, setSavedSurface] = useState<"lane" | "tray" | "shelf">("lane");
  const [savedLaneOn, setSavedLaneOn] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const savedLane = listForSaved(favoriteIds);
  // The saved lane is only ever the live list while it has members. Everything
  // downstream — seat clamps, arc, compare — assumes `lane[0]` exists, which is
  // why wheelLanes keeps saved out of FORM_FILTERS: the guard belongs here, at
  // the one place that decides which list is live, rather than at every read.
  const savedLaneLive = savedSurface === "lane" && savedLaneOn && savedLane.length > 0;
  const lane = savedLaneLive ? savedLane : listFor(formFilter);
  // Unsaving the last robot while standing in the saved lane drops you back
  // into the form lane you came from, rather than onto an empty wheel.
  useEffect(() => {
    if (savedLaneOn && savedLane.length === 0) setSavedLaneOn(false);
  }, [savedLaneOn, savedLane.length]);
  // Switching surfaces closes whatever the previous one had open, so the dev
  // tuner never leaves two of them on screen at once.
  useEffect(() => {
    setSavedLaneOn(false);
    setTrayOpen(false);
    setShelfOpen(false);
  }, [savedSurface]);
  const savedItems = savedLane;
  // "The saved surface is showing" — whichever surface that is. Drives the
  // sidebar row's lit state, so the row reports one thing across all three.
  const savedSurfaceOn = savedSurface === "lane" ? savedLaneLive : savedSurface === "shelf" ? shelfOpen : trayOpen;
  // ── Grid ───────────────────────────────────────────────────────────────────
  // The grid is a second way of looking at the SAME lane, not a second page —
  // so it opens over the scroll view with the column still standing, and the
  // lane rows keep filtering it. Leaving it lands you back on the wheel where
  // you left it, unless you left by picking a robot, which seats the wheel on
  // that robot instead.
  const [gridOpen, setGridOpen] = useState(false);
  // Derived from the lane, memoised on it: a fresh array every render would
  // hand the grid new items on frames where nothing changed.
  const gridItems = useMemo(() => humanoidsToItems(lane), [lane]);
  /* ── Input lock ────────────────────────────────────────────────────────────
     The wheel's three input listeners are on `window`, and the vertical one
     calls preventDefault on every scroll it accepts — that is how the page can
     scroll a spring instead of a document. So anything that opens ON TOP of the
     wheel and scrolls for itself has to take that input away first, or the two
     fight: the grid gets a scroll that was cancelled out from under it while
     the wheel spins behind it.

     One ref, read by all three handlers. A ref and not state because the wheel
     effect is bound once per spring identity — putting a boolean in its
     dependencies would tear down and rebind the listener (and drop its
     accumulator) every time an overlay opened. Today the grid is the only
     thing that raises it; the next full-page overlay joins this line rather
     than adding a second mechanism. */
  const inputLockedRef = useRef(false);
  inputLockedRef.current = gridOpen;
  const spinViewerRef = useRef<SpinViewerHandle>(null);
  const spinViewerRightRef = useRef<SpinViewerHandle>(null);
  const spinLoopRef = useRef(false);
  const [spinPlaying, setSpinPlaying] = useState(false);
  const toggleSpin = useCallback(async () => {
    if (spinLoopRef.current) {
      spinLoopRef.current = false;
      spinViewerRef.current?.cancelPlay();
      return;
    }
    spinLoopRef.current = true;
    setSpinPlaying(true);
    try {
      while (spinLoopRef.current) {
        const viewer = spinViewerRef.current;
        if (!viewer) break;
        await viewer.playRotation();
      }
    } finally {
      spinLoopRef.current = false;
      setSpinPlaying(false);
    }
  }, []);
  const [show3D, setShow3D] = useState(false);
  const [material3D, setMaterial3D] = useState<"clay" | "brushed" | "chrome">("clay");
  const [videoPaused, setVideoPaused] = useState(false);
  const [splitHover, setSplitHover] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const [addCtaMode, setAddCtaMode] = useState<"hover" | "always">("hover");
  const [compareSlotStyle, setCompareSlotStyle] = useState<"silhouette" | "plus">("silhouette");
  // Where the "−" that leaves compare lives. "card-corner" pins it to the top
  // right of the second card — the far right edge of the stage, the edge the
  // hover mode above exists to keep quiet. "seam" floats it in the gap between
  // the stats column and the second card, so it reads as unjoining the pair
  // rather than as a control belonging to one card.
  const [minusPlacement, setMinusPlacement] = useState<"card-corner" | "veil">("veil");
  const [pillsLayout, setPillsLayout] = useState<"stack" | "grouped">("stack");
  const [yearPlacement, setYearPlacement] = useState<"off" | "beside" | "below" | "after-name" | "pill" | "chip">("after-name");
  const [groupedFill, setGroupedFill] = useState<string>("#F9F9F9");
  const [groupedDivider, setGroupedDivider] = useState<"full" | "inset" | "none">("full");
  const [groupedRing, setGroupedRing] = useState<boolean>(true);
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [arcStyle, setArcStyle] = useState<ArcStyle>("arc-names");
  const [arcMarkerVariant, setArcMarkerVariant] = useState(0);
  const [arcMarkerColor, setArcMarkerColor] = useState("#FF6B35");
  // Apply the variant's canonical arc-tuner values when picking a style.
  const pickArcStyle = (next: ArcStyle) => {
    setArcStyle(next);
    const preset = ARC_PRESETS[next];
    if (!preset) return;
    setArcWheelR(preset.wheelR);
    setArcStepDeg(preset.stepDeg);
    setArcTextGap(preset.textGap);
    if (preset.diskGap !== undefined) setArcDiskGap(preset.diskGap);
    if (preset.lineOp !== undefined) setArcLineOp(preset.lineOp);
  };

  // Crown drum config
  const [drumAngle, setDrumAngle] = useState(14);
  const [drumRadius, setDrumRadius] = useState(90);
  const [drumFsMax, setDrumFsMax] = useState(16);
  const [drumFsMin, setDrumFsMin] = useState(8);
  const [drumFwMax, setDrumFwMax] = useState(500);
  const [drumCompression, setDrumCompression] = useState(0.62);
  const [drumOpPower, setDrumOpPower] = useState(3.5);
  const [drumXOffset, setDrumXOffset] = useState(120);
  const [drumMaskFade, setDrumMaskFade] = useState(30);
  const [drumRange, setDrumRange] = useState(1);
  const [drumTracking, setDrumTracking] = useState(0.04);
  const [miniCrownRadius, setMiniCrownRadius] = useState(70);
  const [arcInset, setArcInset] = useState(150);
  const [arcRightAlign, setArcRightAlign] = useState(true);
  const [arcHugBuffer, setArcHugBuffer] = useState(28);
  const [navTop, setNavTop] = useState(22);
  const [autoNavX, setAutoNavX] = useState(true);
  const [navX, setNavX] = useState(24);
  const [giveStyle, setGiveStyle] = useState<GiveStyle>("none");
  const [giveVelScale, setGiveVelScale] = useState(3);
  const [givePushAmt, setGivePushAmt] = useState(5);
  const [giveLeanAmt, setGiveLeanAmt] = useState(0.9);
  const [giveTiltAmt, setGiveTiltAmt] = useState(4);
  const [giveTiltDepth, setGiveTiltDepth] = useState(800);
  // Lucky tap — dedicated params so it doesn't share the give sliders
  const [luckyTapStyle, setLuckyTapStyle] = useState<"tilt" | "shake">("shake");
  const [luckyTapDur, setLuckyTapDur] = useState(500);
  const [luckyTapAngle, setLuckyTapAngle] = useState(2.7);
  const [luckyTapDepth, setLuckyTapDepth] = useState(1400);
  const [luckyTapOriginY, setLuckyTapOriginY] = useState(100);
  const [luckyShakePx, setLuckyShakePx] = useState(5);
  const [luckyShakeCycles, setLuckyShakeCycles] = useState(2);
  const luckyTapSettingsRef = useRef({ style: luckyTapStyle, dur: luckyTapDur, angle: luckyTapAngle, depth: luckyTapDepth, originY: luckyTapOriginY, shakePx: luckyShakePx, shakeCycles: luckyShakeCycles });
  luckyTapSettingsRef.current = { style: luckyTapStyle, dur: luckyTapDur, angle: luckyTapAngle, depth: luckyTapDepth, originY: luckyTapOriginY, shakePx: luckyShakePx, shakeCycles: luckyShakeCycles };
  const [arcWheelR, setArcWheelR] = useState(700);
  const [arcStepDeg, setArcStepDeg] = useState(3.5);
  const [arcTextGap, setArcTextGap] = useState(15);
  const [arcLineOp, setArcLineOp] = useState(0);
  const [arcFsMax, setArcFsMax] = useState(22);
  const [arcFsMin, setArcFsMin] = useState(10);
  const [arcDiskGap, setArcDiskGap] = useState(26);
  const [arcDiskColor, setArcDiskColor] = useState("#f5f5f5");
  const [arcMaskFade, setArcMaskFade] = useState(22);
  const [arcBoundary, setArcBoundary] = useState<"off" | "dots" | "arc" | "wedge">("off");
  const [arcInactiveOp, setArcInactiveOp] = useState(0.59);
  // Rail rest / proximity boost. Both start at 1 = current shipped behavior;
  // nothing changes until these are moved in the tuner.
  const [arcRestOp, setArcRestOp] = useState(1);
  const [arcHoverBoost, setArcHoverBoost] = useState(1);
  const [arcHoverRadius, setArcHoverRadius] = useState(200);
  // Arc-tag tuning
  const [tagFsMin, setTagFsMin] = useState(11);
  const [tagFsMax, setTagFsMax] = useState(14);
  const [tagOpMin, setTagOpMin] = useState(0.58);
  const [tagOpMax, setTagOpMax] = useState(1);
  const [tagGreyMin, setTagGreyMin] = useState(64);
  const [tagGreyMax, setTagGreyMax] = useState(213);
  const [tagPillOp, setTagPillOp] = useState(0.03);
  const [tagFalloff, setTagFalloff] = useState(2);
  const [tagPadX, setTagPadX] = useState(0);
  const [tagPadY, setTagPadY] = useState(0);
  const [tagRadius, setTagRadius] = useState(20);
  const [tagMarkerSize, setTagMarkerSize] = useState(4);
  const [tagMarkerOp, setTagMarkerOp] = useState(0.32);
  // Per-card gallery index: keyed by humanoid index
  // Per-card image-index lives in a ref + pubsub so swiping inside one
  // gallery doesn't re-render the whole Browse subtree. Subscribers
  // (dots, arrows, video slides, share/pause buttons) update locally.
  const galleryIdxRef = useRef<Record<number, number>>({});
  const galleryListenersRef = useRef<Map<number, Set<(idx: number) => void>>>(new Map());
  const galleryScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const readGalleryIdx = useCallback<GalleryRead>((mIdx) => galleryIdxRef.current[mIdx] ?? 0, []);
  const subscribeGalleryIdx = useCallback<GallerySubscribe>((mIdx, cb) => {
    let set = galleryListenersRef.current.get(mIdx);
    if (!set) { set = new Set(); galleryListenersRef.current.set(mIdx, set); }
    set.add(cb);
    return () => { set!.delete(cb); };
  }, []);
  const writeGalleryIdx = useCallback((mIdx: number, idx: number) => {
    if ((galleryIdxRef.current[mIdx] ?? 0) === idx) return;
    galleryIdxRef.current[mIdx] = idx;
    galleryListenersRef.current.get(mIdx)?.forEach((cb) => cb(idx));
    setVideoPaused(false);
  }, []);
  const resetGalleryIdx = useCallback(() => {
    const all = galleryIdxRef.current;
    for (const k of Object.keys(all)) all[Number(k)] = 0;
    galleryListenersRef.current.forEach((set) => set.forEach((cb) => cb(0)));
  }, []);
  // Inner-card refs — spring subscriptions drive a subtle "give" transform
  const leftCardRef = useRef<HTMLDivElement | null>(null);
  const rightCardRef = useRef<HTMLDivElement | null>(null);
  // Below-label refs — trailing spin driven by spring velocity
  const leftLabelRef = useRef<HTMLDivElement | null>(null);
  const rightLabelRef = useRef<HTMLDivElement | null>(null);
  const [openStat, setOpenStat] = useState<Set<string>>(new Set());
  // Flash overlay — increments on every pill tap so the keyed overlay remounts
  // and replays its animation. statKey scopes the flash to a single pill.
  const [pillFlash, setPillFlash] = useState<{ statKey: string; id: number }>({ statKey: "", id: 0 });
  // Layout dimensions
  const [robotW, setRobotW] = useState(30);       // vw
  const [robotH, setRobotH] = useState(60);       // vh
  const [robotMaxW, setRobotMaxW] = useState(400); // px — floor for the cap
  // How fast the card's px cap grows with viewport width. 0.22 keeps every
  // laptop exactly where it was (the vh budget binds there anyway) and lands
  // at 563 on a 2560 display; 0.28 is the "hero" end, ~714.
  const [cardGrowth, setCardGrowth] = useState(0.22);
  // Compare-mode middle column width. Stats need ~150-180px; the rest is
  // breathing room (and blurb width when the AI overview is on).
  const [statsW, setStatsW] = useState(180);       // px
  // Side of the visual element (flag, status dot) relative to its text label
  // inside a value cell. "left" = visual-then-text (default), "right" = text-then-visual.
  const [valueVisualSide, setValueVisualSide] = useState<"left" | "right">("left");
  const [statsColScale, setStatsColScale] = useState(0.65); // single-view stats column width = baseCardPx * this
  const [cardGap, setCardGap] = useState(8);       // px
  const [statsGap, setStatsGap] = useState(12);    // px — gap between robot and stats
  const [cardRadius, setCardRadius] = useState(20);  // px
  // Stat-pill tuners
  const [statPillRadius, setStatPillRadius] = useState(9999);  // px — fully rounded (capsule)
  const [statPillRadiusOpen, setStatPillRadiusOpen] = useState(20);  // px — tighter radius when expanded so content isn't clipped at corners
  const [statPillGap, setStatPillGap] = useState(4);         // px — gap between pills
  const [statPillPadX, setStatPillPadX] = useState(16);      // px — horizontal padding inside pill
  const [statPillPadY, setStatPillPadY] = useState(12);      // px — vertical button padding (sets closed height)
  const [statPillBg, setStatPillBg] = useState("transparent");
  const [newBadgeFontSize, setNewBadgeFontSize] = useState(12); // px — "New" badge label size
  const [infoMode, setInfoMode] = useState<"pill" | "open" | "bare">("pill");
  // Sunday-style: render the stats column as visible stacked cards (Overview/Stats/Status)
  // that fill the available height, with the action pill pinned at the bottom. Single view
  // only — compare and split-blurb modes keep their existing layouts.
  const [stackedInfo, setStackedInfo] = useState(true);
  // Apple-style stats card variant: hairline between every row, no group break,
  // no inline cm/in toggle (it would break the rhythm).
  const [denseDividers, setDenseDividers] = useState(false);
  const [denseFullWidth, setDenseFullWidth] = useState(true);
  const [denseRowGap, setDenseRowGap] = useState(11); // px gap between rows
  const [statsTopOffset, setStatsTopOffset] = useState(0); // px leading space above the stats column
  const [denseOpacity, setDenseOpacity] = useState(2.5); // percent (0-20)
  // Split the dense stats card into 3 stacked containers (Specs / Context / Action)
  // so visual grouping comes from card gaps instead of internal dividers.
  const [splitCards, setSplitCards] = useState(true);
  // How to expose the cm/in switcher inside the dense card.
  // "tap": Height/Weight values are tap targets that cycle units (no chrome).
  // "row": A dedicated "Units" row at the top with an inline cm/in pill.
  const [unitToggleVariant, setUnitToggleVariant] = useState<"tap" | "row">("tap");
  // When on, render uppercase eyebrows ("Specs"/"Notes") above each section in
  // the stacked stats column. When off, sections are split by a single hairline.
  const [showSectionEyebrows, setShowSectionEyebrows] = useState(false);
  // When on, the AI compare blurb sits at the top of the compare middle column.
  // When off, the column starts straight at the spec rows.
  const [showCompareBlurb, setShowCompareBlurb] = useState(false);
  // Vertical gap (px) between stat rows in the compare middle column. The full
  // 5-row set always renders (Height/Weight/DOF/Speed/Price) so the column
  // doesn't reflow while paging between robots.
  const [compareRowGap, setCompareRowGap] = useState(7);
  // Where the status indicator (dot + word) lives when stackedInfo is on:
  //   "card"        — dedicated Status card pinned at the bottom of the stack (current)
  //   "chip"        — first chip in the tags row, colored dot + status word
  //   "label"       — colored dot beside the manufacturer line in the name pill
  //   "consolidate" — dot prepended to the price/CTA pill at the bottom
  //   "corner"      — small floating dot on the robot card itself
  //   "hidden"      — no status indicator anywhere
  type StatusPlacement = "card" | "chip" | "label" | "consolidate" | "corner" | "hidden";
  const [statusPlacement, setStatusPlacement] = useState<StatusPlacement>("chip");
  // Action row variants for the bottom CTA in single view (stackedInfo on).
  // The "split-X" variants share a layout: CTA text on the left, arrow chip on the right
  // (space-between). They differ only in the surrounding container treatment.
  //   "split-hairline" — thin 1px hairline border, no fill
  //   "split-rule"     — single top hairline rule, otherwise transparent
  //   "split-soft"     — very subtle filled background
  //   "split-bare"     — no container chrome at all
  //   "full"           — full-width soft button, centered CTA
  //   "dark"           — soft container with a solid dark button right-aligned
  type ActionRowVariant = "split-hairline" | "split-rule" | "split-soft" | "split-bare" | "full" | "dark";
  const [actionRowVariant, setActionRowVariant] = useState<ActionRowVariant>("split-hairline");
  // Visual treatment for the pinned cluster (Price / Status) at the bottom of
  // the stats column. "hairline" = current 1px rule; "tinted" = full-bleed
  // footer slab with faint bg; "shadow" = inset top shadow; "subcard" = lifted
  // sub-card with gap.
  type PinnedTreatment = "hairline" | "tinted" | "shadow" | "subcard";
  const [pinnedTreatment, setPinnedTreatment] = useState<PinnedTreatment>("hairline");
  const renderPinnedBlock = (rows: React.ReactNode[], paddingX: number, gap: number) => {
    const filtered = rows.filter(Boolean);
    if (filtered.length === 0) return null;
    const innerHairline = (
      <div aria-hidden style={{ height: 2, background: `rgba(0,0,0,${(denseOpacity / 100).toFixed(3)})`, marginLeft: denseFullWidth ? -paddingX : 64, marginRight: denseFullWidth ? -paddingX : 0 }} />
    );
    const rowList = filtered.map((row, i) => (
      <Fragment key={i}>
        {engineerMode && i > 0 ? innerHairline : null}
        {row}
      </Fragment>
    ));
    if (pinnedTreatment === "hairline") {
      return (
        <>
          <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.06)", marginLeft: -paddingX, marginRight: -paddingX }} />
          <div className="flex flex-col" style={{ gap }}>{rowList}</div>
        </>
      );
    }
    if (pinnedTreatment === "tinted") {
      return (
        <div className="flex flex-col" style={{
          gap,
          marginLeft: -paddingX,
          marginRight: -paddingX,
          marginBottom: -paddingX,
          padding: `12px ${paddingX}px ${paddingX}px`,
          background: "rgba(0,0,0,0.025)",
          borderTop: "1px solid rgba(0,0,0,0.05)",
          borderBottomLeftRadius: cardRadius,
          borderBottomRightRadius: cardRadius,
        }}>{rowList}</div>
      );
    }
    if (pinnedTreatment === "shadow") {
      return (
        <div className="flex flex-col" style={{
          gap,
          marginLeft: -paddingX,
          marginRight: -paddingX,
          marginBottom: -paddingX,
          padding: `14px ${paddingX}px ${paddingX}px`,
          boxShadow: "inset 0 10px 12px -10px rgba(0,0,0,0.18)",
          borderBottomLeftRadius: cardRadius,
          borderBottomRightRadius: cardRadius,
        }}>{rowList}</div>
      );
    }
    // subcard — inset, own bg, slight gap above
    return (
      <div className="flex flex-col" style={{
        gap,
        marginTop: 4,
        padding: "12px 14px",
        background: "rgba(0,0,0,0.04)",
        borderRadius: Math.max(10, cardRadius - 8),
      }}>{rowList}</div>
    );
  };
  const [blurbFontSize, setBlurbFontSize] = useState(12.7);
  const [blurbFloat, setBlurbFloat] = useState(false);
  const [splitBlurb, setSplitBlurb] = useState(false);
  const [expandedBlurbs, setExpandedBlurbs] = useState<Set<string>>(new Set());
  const [hoveredBlurbId, setHoveredBlurbId] = useState<string | null>(null);
  type BlurbExpandIndicator = "chevron" | "inline" | "edgebar" | "minimal" | "pill";
  const [blurbExpandIndicator, setBlurbExpandIndicator] = useState<BlurbExpandIndicator>("pill");
  const [bubbleVariant, setBubbleVariant] = useState(4);
  const [outlineStyle, setOutlineStyle] = useState<"off" | "flat" | "sheen" | "light" | "halo" | "gloss">("flat");
  const toggleBlurbExpand = (id: string) => {
    setExpandedBlurbs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [pillLabelFontSize, setPillLabelFontSize] = useState(12.7);
  const [pillLabelFont, setPillLabelFont] = useState<string>("var(--font-geist-sans)");
  const [pillLabelLetterSpacing, setPillLabelLetterSpacing] = useState(-0.01);
  const [pillLabelWeight, setPillLabelWeight] = useState(500);
  const [pillLabelUppercase, setPillLabelUppercase] = useState(false);
  const [pillLabelColor, setPillLabelColor] = useState("var(--c-ink-body)");
  const [labelLogoSize, setLabelLogoSize] = useState(22);

  // ── In-card icon system ─────────────────────────────────────────
  // One source of truth for all icon buttons that sit on a card:
  // info "i" toggle, engineer +/− toggle, share, 3D toggle, spin
  // auto-rotate, and video pause. Each button reads its visual
  // treatment from `cardIconRender(...)` so they stay coherent when
  // a variant knob changes.
  type CardIconChrome = "ghost" | "outline" | "filled" | "glass";
  type CardIconShape = "circle" | "rounded" | "square";
  type CardIconActive = "tint" | "ink" | "outline";
  const [cardIconChrome, setCardIconChrome] = useState<CardIconChrome>("ghost");
  const [cardIconShape, setCardIconShape] = useState<CardIconShape>("circle");
  const [cardIconSize, setCardIconSize] = useState(40);
  const [cardIconStroke, setCardIconStroke] = useState(1.5);
  const [cardIconInset, setCardIconInset] = useState(2);
  const [cardIconGap, setCardIconGap] = useState(4);
  const [cardIconActive, setCardIconActive] = useState<CardIconActive>("tint");
  const [cardIconHoverFade, setCardIconHoverFade] = useState(false);
  const [cardIcon3DLabel, setCardIcon3DLabel] = useState(false);
  const [chipLayout, setChipLayout] = useState<"floating" | "panel" | "below" | "below-left" | "corners" | "unified" | "right-rail">("below");
  // Morph style for the chip-row slots (animates each button's enter/exit
  // as the active robot's capability set changes during scroll).
  const [morphStyle, setMorphStyle] = useState<"shrink" | "scale" | "pop" | "slide-up" | "slide-down" | "blur" | "fade-fixed" | "none">("shrink");
  const [morphDuration, setMorphDuration] = useState(260);
  // Chip grouping — how variable buttons (3D/spin/scene) are placed.
  // "single": all in one pill (current default).
  // "split": stable buttons in main pill, media in a secondary pill that
  // morphs in/out as a unit.
  // "top-corners": the bottom pill keeps only the dice; save and copy move to
  // the card's own top corners, so every card (both sides of a compare) carries
  // its own actions.
  const [chipGrouping, setChipGrouping] = useState<"single" | "split" | "image-corner" | "top-corners">("single");
  // Horizontal alignment for the below chip row.
  const [bottomAlignment, setBottomAlignment] = useState<"left" | "center" | "right">("center");
  const [compareBtnStyle, setCompareBtnStyle] = useState<"glass" | "flat">("flat");
  const [cornersCloseMode, setCornersCloseMode] = useState<"slim-minus" | "click-card" | "hover-x" | "edge-chevron" | "card-edge-tab">("slim-minus");
  const [cornerRowHover, setCornerRowHover] = useState(false);
  // Blurb visibility — toggled by the bottom-left info icon on the card.
  // Only one blurb renders at a time (single view + isFirst), so a single
  // boolean is enough.
  const [blurbVisible, setBlurbVisible] = useState(false);
  // Liquid-glass chrome shared across stats-panel toolbar + in-card chips.
  // Tint/alpha/blur are tunable; sheen + edge derive from tint luminance.
  const [glassTint, setGlassTint] = useState("#ffffff");
  const [glassAlpha, setGlassAlpha] = useState(1);
  const [glassBlur, setGlassBlur] = useState(0);
  const [glassInk, setGlassInk] = useState<GlassInk>("auto");
  const [glassOutline, setGlassOutline] = useState(0.18);
  const [glassSheen, setGlassSheen] = useState(0.10);
  const glassChipChrome = useMemo(
    () => glassChromeFor({ tint: glassTint, alpha: glassAlpha, blur: glassBlur, ink: glassInk, outline: glassOutline, sheen: glassSheen }),
    [glassTint, glassAlpha, glassBlur, glassInk, glassOutline, glassSheen]
  );
  // In portal/bleed mode the in-card chips stop being opaque paint and become
  // real glass — there is finally a busy backdrop for them to refract. Higher
  // saturate than the Liquid preset so the chip picks up the room's colour
  // instead of staying neutral grey.
  const scenePortalChipChrome = useMemo(
    () => glassChromeFor({ tint: "#ffffff", alpha: 0.34, blur: 24, ink: "auto", outline: 0.24, sheen: 0.38 }),
    []
  );
  const applyGlassPreset = (p: GlassPreset) => {
    setGlassTint(p.tint);
    setGlassAlpha(p.alpha);
    setGlassBlur(p.blur);
    setGlassInk(p.ink);
    setGlassOutline(p.outline);
    setGlassSheen(p.sheen);
  };
  const activeGlassPreset = GLASS_PRESETS.find(
    (p) => p.tint.toLowerCase() === glassTint.toLowerCase()
      && Math.abs(p.alpha - glassAlpha) < 0.005
      && p.blur === glassBlur
      && p.ink === glassInk
      && Math.abs(p.outline - glassOutline) < 0.005
      && Math.abs(p.sheen - glassSheen) < 0.005,
  );
  const cardIconRender = (opts: { active?: boolean; dark?: boolean } = {}): {
    className: string;
    style: React.CSSProperties;
    iconBoxPx: number;
    iconStrokeWidth: number;
  } => {
    const { active = false, dark = false } = opts;
    const radius = cardIconShape === "circle"
      ? 999
      : cardIconShape === "rounded"
        ? Math.round(cardIconSize * 0.34)
        : Math.round(cardIconSize * 0.2);
    const palette = dark ? {
      bgFilled: "rgba(255,255,255,0.10)",
      bgGlass: "rgba(0,0,0,0.32)",
      bgHover: "rgba(255,255,255,0.18)",
      bgActive: "rgba(255,255,255,0.22)",
      borderRest: "rgba(255,255,255,0.30)",
      borderHover: "rgba(255,255,255,0.55)",
      borderActive: "rgba(255,255,255,0.65)",
      colorRest: "rgba(255,255,255,0.72)",
      colorHover: "rgba(255,255,255,1)",
      colorActive: "rgba(255,255,255,1)",
      glassBorder: "rgba(255,255,255,0.16)",
      glassBorderHover: "rgba(255,255,255,0.28)",
    } : {
      bgFilled: "rgba(0,0,0,0.025)",
      bgGlass: "rgba(255,255,255,0.72)",
      bgHover: "rgba(0,0,0,0.05)",
      bgActive: "rgba(0,0,0,0.06)",
      borderRest: "rgba(0,0,0,0.18)",
      borderHover: "rgba(0,0,0,0.42)",
      borderActive: "rgba(0,0,0,0.56)",
      colorRest: "rgba(0,0,0,0.38)",
      colorHover: "rgba(0,0,0,0.7)",
      colorActive: "rgba(0,0,0,0.65)",
      glassBorder: "rgba(0,0,0,0.08)",
      glassBorderHover: "rgba(0,0,0,0.14)",
    };
    let bg: string = "transparent";
    let borderColor: string = "transparent";
    let hoverBg: string = palette.bgHover;
    let hoverBorder: string = "transparent";
    let activeBg: string = palette.bgActive;
    let activeBorder: string = "transparent";
    if (cardIconChrome === "outline") {
      borderColor = palette.borderRest;
      hoverBorder = palette.borderHover;
      activeBorder = palette.borderActive;
    } else if (cardIconChrome === "filled") {
      bg = palette.bgFilled;
    } else if (cardIconChrome === "glass") {
      bg = palette.bgGlass;
      borderColor = palette.glassBorder;
      hoverBorder = palette.glassBorderHover;
      activeBorder = palette.glassBorderHover;
    }
    // Active state intentionally mirrors rest — only hover should change
    // the visual treatment. `active` is still threaded through for callers
    // that need it (e.g. functional state), but it doesn't alter appearance.
    void active;
    void activeBg;
    void activeBorder;
    const color: string = palette.colorRest;
    const finalBg = bg;
    const finalBorder = borderColor;
    return {
      className: "card-icon-btn cursor-pointer flex items-center justify-center pointer-events-auto",
      style: {
        width: cardIconSize,
        height: cardIconSize,
        borderRadius: radius,
        border: "1px solid",
        borderColor: finalBorder,
        background: finalBg,
        color,
        padding: 0,
        backdropFilter: cardIconChrome === "glass" ? "blur(10px)" : undefined,
        WebkitBackdropFilter: cardIconChrome === "glass" ? "blur(10px)" : undefined,
        transition: "background 180ms ease, border-color 180ms ease, color 180ms ease, opacity 325ms cubic-bezier(0.4, 0, 0.2, 1), transform 325ms cubic-bezier(0.4, 0, 0.2, 1)",
        ["--ci-bg-hover" as string]: hoverBg,
        ["--ci-color-hover" as string]: palette.colorHover,
        ["--ci-border-hover" as string]: hoverBorder,
      },
      iconBoxPx: Math.round(cardIconSize * 0.5),
      iconStrokeWidth: cardIconStroke,
    };
  };

  // Action-pill variant — "pill" matches the data rows; "text" reads as a footer text-link;
  // "accent" tints label + arrow with --c-accent and prepends ↗; "dark" inverts the pill
  // (black base, white text); "hairline" prepends a 1px seam above the row to demote it.
  const [actionVariant, setActionVariant] = useState<"pill" | "text" | "accent" | "dark" | "hairline" | "split">("split");
  const SPLIT_BUTTON_COLORS = {
    accent: "var(--c-accent)",
    "apple-blue": "#0071e3",
    black: "#1d1d1f",
    green: "#34c759",
    orange: "#ff6a00",
    plum: "#7c5cff",
  } as const;
  type SplitButtonColor = keyof typeof SPLIT_BUTTON_COLORS;
  const [splitButtonColor, setSplitButtonColor] = useState<SplitButtonColor>("accent");
  const [splitConsolidate, setSplitConsolidate] = useState(true); // Drop the standalone Status pill in single view and prepend its dot to the Buy pill's left side.
  const [actionHoverTint, setActionHoverTint] = useState<"none" | "charcoal" | "slate" | "stone">("none");
  const actionHoverColor = actionHoverTint === "slate" ? "#6B7280" : actionHoverTint === "stone" ? "#78716C" : "#52525B";
  const actionHoverPct = actionHoverTint === "none" ? "0%" : "10%";
  const actionActivePct = actionHoverTint === "none" ? "0%" : "18%";

  // Compare-header split tuner
  const [splitVariant, setSplitVariant] = useState<"morph" | "push" | "lift" | "shrink" | "swap">("shrink");
  const [splitAmount, setSplitAmount] = useState(44);
  const [splitScale, setSplitScale] = useState(0.97);
  const [splitLiftY, setSplitLiftY] = useState(4);
  const [splitShadowOp, setSplitShadowOp] = useState(0.12);
  const [splitDur, setSplitDur] = useState(320); // ms
  const [labelPosition, setLabelPosition] = useState<"stack" | "below" | "above">("above");
  const [labelFadeOnScroll, setLabelFadeOnScroll] = useState(false);
  const [statsAlign, setStatsAlign] = useState<"top" | "center" | "bottom">("bottom");

  // Scene background tuner
  // Collapse / layout-shift tuner — drives the stats column width transition
  // and the arc inset transitions via CSS vars (`--collapse-dur`,
  // `--collapse-ease`) so the i-toggle and compare add/subtract glide on one
  // shared clock without prop drilling.
  const [collapseDurMs, setCollapseDurMs] = useState(260);
  const COLLAPSE_EASE_PRESETS = [
    { label: "Standard",  value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { label: "Snappy",    value: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    { label: "Out-expo",  value: "cubic-bezier(0.16, 1, 0.3, 1)" },
    { label: "Out-cubic", value: "cubic-bezier(0.33, 1, 0.68, 1)" },
    { label: "Linear",    value: "linear" },
  ] as const;
  const [collapseEase, setCollapseEase] = useState<string>(COLLAPSE_EASE_PRESETS[3].value);
  // Bundled motion presets — pair a duration + ease so a single tap drops the
  // panel toggle, compare add/subtract, and arc inset slide onto one feel.
  const MOTION_PRESETS = [
    { label: "Crisp",  dur: 180, ease: COLLAPSE_EASE_PRESETS[1].value }, // Snappy
    { label: "Apple",  dur: 260, ease: COLLAPSE_EASE_PRESETS[3].value }, // Out-cubic
    { label: "Smooth", dur: 360, ease: COLLAPSE_EASE_PRESETS[0].value }, // Standard
    { label: "Bouncy", dur: 320, ease: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    { label: "Slow",   dur: 480, ease: COLLAPSE_EASE_PRESETS[2].value }, // Out-expo
  ] as const;
  useEffect(() => {
    document.documentElement.style.setProperty("--collapse-dur", `${collapseDurMs}ms`);
    document.documentElement.style.setProperty("--collapse-ease", collapseEase);
  }, [collapseDurMs, collapseEase]);

  // Top/bottom inset (`--corner-y`) for chrome anchored to the viewport edges
  // (nav + footer credit row). The side inset shares state with `navX`/`--nav-x`
  // so the same slider can live in either the Corner Margins or Nav tuner.
  const [cornerY, setCornerY] = useState(18);
  useEffect(() => {
    document.documentElement.style.setProperty("--corner-y", `${cornerY}px`);
  }, [cornerY]);

  const [sceneShape, setSceneShape] = useState<"radial" | "horizontal" | "vertical" | "top" | "bottom">("radial");
  const [sceneSize, setSceneSize] = useState(72);
  const [sceneSoftness, setSceneSoftness] = useState(62);
  const [scenePeakAlpha, setScenePeakAlpha] = useState(75);
  const [sceneOpacity, setSceneOpacity] = useState(27);
  const [sceneBlur, setSceneBlur] = useState(0);
  const [sceneEnabled, setSceneEnabled] = useState(false);
  const [sceneInteracted, setSceneInteracted] = useState(false);
  // Scene variant — "viewport" paints the bloom across the whole page;
  // "card" contains it inside the focused robot card as a portal.
  const [sceneVariant, setSceneVariant] = useState<"viewport" | "card" | "portal" | "bleed">("card");
  // Portal / bleed knobs. "portal" fills the card with the scene at full
  // strength behind the cutout robot and turns every chip over it into real
  // glass; "bleed" does that and also washes the viewport so the page chrome
  // frosts over the same environment.
  const [scenePortalDim, setScenePortalDim] = useState(22);      // % of a top/bottom scrim over the scene
  const [scenePortalGlass, setScenePortalGlass] = useState(true); // swap in-card chips to liquid glass
  const [sceneBleedWash, setSceneBleedWash] = useState(10);      // % viewport wash in bleed mode
  const [sceneGlow, setSceneGlow] = useState(0);    // % — scene light spilling onto the page around the card. Off by default: the halo competes with the card, and a flat page reads cleaner.
  const [sceneParallax, setSceneParallax] = useState(true);
  const [sceneParallaxAmt, setSceneParallaxAmt] = useState(56);  // px of counter-drift per index of spring travel
  const [sceneCardScale, setSceneCardScale] = useState(100);
  const [sceneCardVignette, setSceneCardVignette] = useState(80);
  const [sceneCardSaturation, setSceneCardSaturation] = useState(100);
  // Humanoid card fill tuner
  const [cardFillColor, setCardFillColor] = useState(SURFACE);
  const [cardFillAlpha, setCardFillAlpha] = useState(63);
  const [cardBlur, setCardBlur] = useState(28);
  const bubbleVariants = useMemo<{ name: string; bg: string; shadow: string; shadowHover: string; backdropFilter?: string; ink?: string; inkDim?: string; fromCard?: boolean }[]>(() => {
    const hex = cardFillColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const mix = (factor: number) => {
      const m = (c: number) => Math.round(c + (255 - c) * factor);
      const toHex = (c: number) => m(c).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };
    const derived = [
      { name: "Match", bg: cardFillColor.toUpperCase(), shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)", fromCard: true },
      { name: "Soft", bg: mix(0.35), shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)", fromCard: true },
      { name: "Softer", bg: mix(0.6), shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)", fromCard: true },
      { name: "Lightest", bg: mix(0.85), shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)", fromCard: true },
    ];
    const neutrals = [
      { name: "White", bg: "#FFFFFF", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Snow", bg: "#FCFCFC", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Pearl", bg: "#F9F9F9", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Bone", bg: "#F5F5F4", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Paper", bg: "#F2F2F0", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Mist", bg: "#F4F5F7", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Ash", bg: "#EEEEEE", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Stone", bg: "#E8E8E6", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Linen", bg: "#FAF8F4", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Frost", bg: "#F6F8FB", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Greige", bg: "#EEEDEA", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.10)" },
      { name: "Silver", bg: "#E2E2E2", shadow: "inset 0 0 0 1px rgba(0,0,0,0.08)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.11)" },
      { name: "Slate", bg: "#2A2D33", shadow: "inset 0 0 0 1px rgba(255,255,255,0.07)", shadowHover: "inset 0 0 0 1px rgba(255,255,255,0.10)", ink: "#D8D8DC", inkDim: "#9A9AA0" },
      { name: "Graphite", bg: "#1A1C1F", shadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", shadowHover: "inset 0 0 0 1px rgba(255,255,255,0.11)", ink: "#D0D0D4", inkDim: "#90909A" },
    ];
    return [...derived, ...neutrals];
  }, [cardFillColor]);
  const bubble = bubbleVariants[bubbleVariant - 1] ?? bubbleVariants[0];
  const bubbleShadow = (() => {
    const base = bubble.shadow;
    switch (outlineStyle) {
      case "off":   return undefined;
      case "flat":  return base;
      case "sheen": return `inset 0 1px 0 rgba(255,255,255,0.95), ${base}`;
      case "light": return `inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.04), ${base}`;
      case "halo":  return `${base}, 0 1px 12px rgba(0,0,0,0.04)`;
      case "gloss": return `inset 0 1px 0 rgba(255,255,255,1), inset 0 10px 22px -10px rgba(255,255,255,0.55), ${base}`;
    }
  })();
  // Page background tint — 0 = pure white, higher = more grey
  const [pageBgLevel, setPageBgLevel] = useState(0);
  const pageBg = `rgb(${255 - pageBgLevel}, ${255 - pageBgLevel}, ${255 - pageBgLevel})`;
  const pageBgHex = `#${(255 - pageBgLevel).toString(16).padStart(2, "0").repeat(3).toUpperCase()}`;

  // Adaptive arc positioning
  const [windowWidth, setWindowWidth] = useState(1920);
  const [windowHeight, setWindowHeight] = useState(1080);
  const [autoArcInset, setAutoArcInset] = useState(true);

  // Arc text font: family / weight / letter-spacing / italic
  const [arcFontFamily, setArcFontFamily] = useState<string>("");
  const [arcFontWeight, setArcFontWeight] = useState<number>(400);
  const [arcLetterSpacing, setArcLetterSpacing] = useState<number>(-0.02); // em
  const [arcItalic, setArcItalic] = useState<boolean>(false);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);
    let raf: number;
    let resizeIdleTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setWindowWidth(window.innerWidth);
        setWindowHeight(window.innerHeight);
      });
      // Suppress the SVG container's collapse-transition while the user is
      // actively resizing — otherwise wheelR / inset updates chain a stack of
      // 0.5s slides and the wheel feels like it has momentum.
      document.documentElement.classList.add("window-resizing");
      if (resizeIdleTimer) clearTimeout(resizeIdleTimer);
      resizeIdleTimer = setTimeout(() => {
        document.documentElement.classList.remove("window-resizing");
      }, 160);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      if (resizeIdleTimer) clearTimeout(resizeIdleTimer);
      document.documentElement.classList.remove("window-resizing");
    };
  }, []);

  // When the blurb is broken out into its own column, the stats slot widens
  // to fit two side-by-side columns (blurb + pills). Used by layout math and
  // the slot wrapper so centering stays correct.
  // Default single-view stats column tracks the card width but with an inset,
  // since the card's robot image is letterboxed inside its 400px frame — matching
  // the frame exactly makes the pill column read as visually wider than the robot.
  // Card geometry is driven by ONE ratio, not by independent vw/vh budgets.
  // Width was capped in px (robotMaxW) while height stayed a raw vh, so the two
  // axes drifted apart on tall viewports and at browser zoom — the card kept
  // growing vertically against a pinned width. Now width is the min of its vw
  // budget, its px cap, and what the vh budget allows at CARD_ASPECT; height is
  // always derived from that width, so the frame is identical at any size.
  const CARD_ASPECT = 0.75; // width / height — the May-13 compare proportion
  // Single view is the hero shot rather than one of a matched pair, so it gets
  // a squarer frame; compare stays tighter since the eye is measuring two
  // cards against each other there.
  // ...and each lane gets its own single-view proportion. A full biped wants a
  // tall frame; a wheeled appliance like Matic reads as an object rather than a
  // figure, so the "other" lane goes square and stops letterboxing a landscape
  // product shot inside a portrait frame.
  //
  // Per LANE, never per robot. Card width feeds `--nav-x` and the arc inset, so
  // a per-robot aspect would slide the nav, footer and arcs every time you
  // scrolled between two body plans. A lane change already animates, and the
  // chips make it an explicit move, so resizing there reads as intent.
  // Compare carries the lane's proportion too, tightened by the same step
  // single→compare takes on the humanoid lane (0.88 → 0.75). It used to be
  // pinned at one shared 0.75 because compare spanned every body plan and a
  // biped could land beside a vacuum. Compare stays inside a lane now, so both
  // cards are always the same body plan and the pair can keep the frame that
  // suits it — the Other lane no longer letterboxes a landscape product shot
  // the moment you open compare.
  const SINGLE_ASPECT_BY_FORM: Record<FormFilter, number> = {
    humanoid: 0.88,
    semi: 0.88,
    other: 1.0,
  };
  const COMPARE_ASPECT_BY_FORM: Record<FormFilter, number> = {
    humanoid: CARD_ASPECT,
    semi: CARD_ASPECT,
    other: 0.85,
  };
  // Which lane's proportion is in force. Normally the open form lane — but the
  // saved lane is a list the VISITOR composed, so it is not described by
  // whichever form row was lit when they switched it on. Reading `formFilter`
  // here meant walking Other → Saved rendered a saved biped in the square frame
  // the vacuums use. It answers for itself instead: one body plan in there, use
  // that plan's frame; mixed, fall back to the square, which is the frame that
  // letterboxes nothing. Membership-derived, so it changes only when the saved
  // set does — already a re-seat moment — and never mid-scroll, which is the
  // whole reason aspect is per-lane and not per-robot.
  const aspectLane: FormFilter = savedLaneLive ? (formOfLane(savedLane) ?? "other") : formFilter;
  const SINGLE_ASPECT = SINGLE_ASPECT_BY_FORM[aspectLane];
  const COMPARE_ASPECT = COMPARE_ASPECT_BY_FORM[aspectLane];
  // The px cap grows on large displays. At 400 flat, a Studio Display (2560
  // wide) rendered the same 400px card a laptop does — the whole composition
  // sat in a ~670px band with 944px of white on either side, and the card
  // stopped reading as the hero. The cap now tracks viewport width, floored at
  // the tuner's value so laptops are untouched (at 1440 the vh budget binds
  // first anyway) and ceilinged at 560 so it never outgrows the frame.
  // Width-derived is safe: cardPxFor still applies the vw and vh budgets on
  // top, so a wide-but-short viewport is still capped by its height.
  // `cardGrowth` is the rate, and on a Studio Display it — not the 780 ceiling
  // — is what sets the size: 0.22 × 2560 = 563. The ceiling only binds on an
  // ultrawide, where the vh budget in cardPxFor usually gets there first.
  const effectiveMaxW = Math.min(780, Math.max(robotMaxW, Math.round(windowWidth * cardGrowth)));
  // Chrome nudge for large displays. The card grows with the viewport now, but
  // the rail's type is inline px and doesn't, so on a Studio Display a 560px
  // card sits beside 14px labels — legible (a CSS px is physically larger on a
  // 27" 5K than on a laptop) but proportionally thin. This walks the column up
  // by a notch over the same range the card grows, and is exactly 1 below
  // 1900px, so no laptop moves. Carried as `zoom` rather than a font-size pass:
  // the rail's sizes live in ~8 inline declarations plus glyph and row-height
  // px, and scaling the subtree keeps type, glyphs and the lane pill in step
  // instead of drifting apart one constant at a time.
  const uiScale = Math.min(1.15, Math.max(1, 1 + (windowWidth - 1900) / 4400));
  const cardPxFor = (wVw: number, hVh: number, maxPx: number, aspect: number) =>
    Math.min(
      wVw * windowWidth / 100,
      maxPx,
      (hVh * windowHeight / 100) * aspect,
    );
  // The size the second card will actually be. Single view is 0.88 aspect and
  // wider; entering compare shrinks BOTH cards to COMPARE_ASPECT. So the empty
  // slot has to be drawn at the compare size or it promises a card bigger than
  // the one that arrives.
  const compareCardW = cardPxFor(robotW - 8, robotH - 10, effectiveMaxW - 100, COMPARE_ASPECT);
  const compareCardH = compareCardW / COMPARE_ASPECT;
  const cardAspect = comparing ? COMPARE_ASPECT : SINGLE_ASPECT;
  const cardW = comparing ? compareCardW : cardPxFor(robotW, robotH, effectiveMaxW, SINGLE_ASPECT);
  const cardH = cardW / cardAspect;
  // Compare middle column tracks the card rather than sitting at a fixed px
  // width — it used to carry +200px to fit long manufacturer names in the
  // Company row, which now lives in the placard above the card instead.
  // With stats over the card, compare has no middle: each card carries its
  // own rows, and the pair closes up to a gap.
  const compareStatsW = statsOverlay !== "off" ? 0 : Math.round(cardW * 0.75);
  const baseCardPx = windowWidth ? cardPxFor(robotW, robotH, effectiveMaxW, SINGLE_ASPECT) : effectiveMaxW;
  const singleStatsW = Math.round(baseCardPx * statsColScale);
  // When info is hidden, the stats slot fully collapses to 0 so the card lands
  // at viewport center. The "i" toggle lives inside the card label, so no rail
  // is needed in the info-icon variant (the active default).
  // Corners chip layout renders the collapsed state as a slim panel (same
  // height as the card, "+" centered) instead of an invisible rail, so the
  // affordance to expand stays in-context with the card. card-edge-tab mode
  // moves the affordance onto the card itself, so the rail collapses to 0.
  const collapsedRailW = (chipLayout === "corners" && cornersCloseMode !== "card-edge-tab") ? Math.round(singleStatsW * 0.1) : 0;
  const expandedStatsW = splitBlurb && blurbFloat ? statsW * 2 + cardGap : singleStatsW;
  const effectiveStatsW = statsCollapsed ? collapsedRailW : expandedStatsW;

  const centerHalfWidth = (() => {
    const cardPx = cardW;
    const gap = statsGap;
    if (comparing) {
      // Compare-mode middle column is a fixed statsW (see line ~3705) and is
      // unaffected by the single-view collapsed/expanded toggle. Using
      // effectiveStatsW here would shrink the half-width when stats are
      // collapsed and leave the arcs sitting behind the cards.
      return cardPx + gap + compareStatsW / 2;
    }
    // Collapsed: drop the gap too so the arc rebalances around the card alone.
    return (cardPx + (statsCollapsed ? 0 : gap + effectiveStatsW)) / 2;
  })();

  // Distance from the right edge of the content block (card + gap + stats) to
  // the compare slot. Wider than `statsGap`, deliberately — the stats column is
  // part of the card, the compare slot is a separate object and needs to read
  // as one.
  const COMPARE_SLOT_GAP = 44;
  const compareSlotLeft = Math.round(windowWidth / 2 + centerHalfWidth + COMPARE_SLOT_GAP);

  const availableSpace = (windowWidth / 2) - centerHalfWidth;
  const adaptiveDrumXOffset = Math.round(Math.min(300, Math.max(40, availableSpace * 0.5)));

  // Width of the widest humanoid name at the current arc font settings. The
  // active label sits on the disk's inner rim (text-anchor "start") and
  // extends toward the card, so the inset can hug the card up to the limit
  // imposed by this width plus a small breathing gap.
  const longestNamePx = useMemo(() => {
    if (typeof document === "undefined") return 0;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return 0;
    const family = arcFontFamily || getComputedStyle(document.body).fontFamily || "sans-serif";
    const style = arcItalic ? "italic " : "";
    ctx.font = `${style}${arcFontWeight} ${arcFsMax}px ${family}`;
    const letterSpacingPx = arcFsMax * arcLetterSpacing;
    let max = 0;
    for (const h of humanoids) {
      const text = allCaps ? h.name.toUpperCase() : h.name;
      const w = ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacingPx;
      if (w > max) max = w;
    }
    return max;
  }, [arcFsMax, arcFontFamily, arcFontWeight, arcLetterSpacing, arcItalic, allCaps]);

  // If the longest name wouldn't fit beside the card at full size, scale the
  // active font down just enough to make it fit (clamped to arcFsMin). In
  // single view there's enough room so this is a no-op; in compare view the
  // shorter side budget makes longer names like "Domo Developer" shrink.
  const usableNameWidth = Math.max(20, availableSpace - 48 - arcHugBuffer + arcTextGap);
  const effectiveArcFsMax = longestNamePx > usableNameWidth
    ? Math.max(arcFsMin, Math.min(arcFsMax, Math.round(arcFsMax * usableNameWidth / longestNamePx)))
    : arcFsMax;
  const arcShrinkRatio = effectiveArcFsMax / arcFsMax;
  const effectiveLongestNamePx = longestNamePx * arcShrinkRatio;
  // Compound the step shrink with the radius growth so the resulting vertical
  // rhythm (r·sin(step)) ends up scaled by `ratio` once — keeps the item
  // spacing tied to the font while the radius grows can flatten the arc.
  const effectiveArcStepDeg = arcStepDeg * arcShrinkRatio * arcShrinkRatio;
  // When the wheel auto-shrinks, also tighten the breathing room between the
  // arc text and the card edge — and expand the wheel radius so the arc
  // straightens out and the names use more of the available vertical space.
  const effectiveArcHugBuffer = arcHugBuffer * arcShrinkRatio;
  const effectiveArcWheelR = Math.round(arcWheelR / arcShrinkRatio);
  const adaptiveArcInset = Math.max(48, Math.round(availableSpace - effectiveLongestNamePx - effectiveArcHugBuffer + arcTextGap));
  const effectiveArcInset = autoArcInset ? adaptiveArcInset : arcInset;
  // The concentric ring sits inside the name arc, so its inset decides how
  // close the open labels come to the names. Auto: back off by the rail's
  // full open reach, as far as the left edge allows (the seat on the 0° ray
  // never goes left of the column's own x). A fixed 72 looked fine at rest
  // and put "Grid" a word-space from the focused name once open.
  const effectiveRingInset = autoRingInset
    ? Math.max(24, Math.min(RING_OPEN_REACH, effectiveArcInset - arcTextGap - 42))
    : ringInset;
  const effectiveDrumXOffset = autoArcInset ? adaptiveDrumXOffset : drumXOffset;

  // Publish the arc's leftmost-label x so the arc text can align to it
  useEffect(() => {
    const x = Math.max(16, effectiveArcInset - arcTextGap);
    document.documentElement.style.setProperty("--arc-logo-x", `${x}px`);
  }, [effectiveArcInset, arcTextGap]);

  // How far off the left edge the rail (and the nav paddings that share
  // `--nav-edge`) sit. Nothing ever defined this var, so every consumer has
  // been taking its 24px fallback. Growth starts at 1600 — below that the
  // result is exactly 24 and no existing viewport moves.
  //
  // The ceiling is the arc, not the card: the names hug the card's left side,
  // so the column has to stop short of the leftmost label or it walks into the
  // wheel. 190 clears the widest rail row (~127 at full uiScale) plus a gap.
  const navEdge = useMemo(() => {
    if (!railPullIn) return 24;
    const grown = 24 + Math.max(0, windowWidth - 1600) * railPull;
    const arcLimit = Math.max(16, effectiveArcInset - arcTextGap) - 190;
    return Math.round(Math.max(24, Math.min(grown, arcLimit)));
  }, [railPullIn, railPull, windowWidth, effectiveArcInset, arcTextGap]);

  useEffect(() => {
    document.documentElement.style.setProperty("--nav-edge", `${navEdge}px`);
  }, [navEdge]);

  // Publish a stable nav inset that ignores `comparing` so the logo and
  // share button stay anchored when entering/leaving compare mode.
  // Aligns nav/footer with the inner content edges (card + gap + stats column),
  // not with the wheels — the wheels sit further outside and use their own inset.
  useEffect(() => {
    if (!autoNavX) {
      document.documentElement.style.setProperty("--nav-x", `${navX}px`);
      return;
    }
    const cardPxStable = windowWidth ? cardPxFor(robotW, robotH, effectiveMaxW, SINGLE_ASPECT) : effectiveMaxW;
    // Use the expanded stats width regardless of `statsCollapsed` so the nav
    // and footer (driven off `--nav-x`) stay anchored when the i toggle fires.
    const statsColStable = stackedInfo ? Math.round(cardPxStable * statsColScale) : statsW;
    const contentW = cardPxStable + statsGap + statsColStable;
    const x = Math.max(16, Math.round((windowWidth - contentW) / 2));
    document.documentElement.style.setProperty("--nav-x", `${x}px`);
  }, [autoNavX, navX, windowWidth, windowHeight, robotW, robotH, robotMaxW, statsW, statsGap, stackedInfo, statsColScale, SINGLE_ASPECT]);

  // Publish nav top offset as a CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-top", `${navTop}px`);
  }, [navTop]);

  const stiffness = isCustom ? customStiffness : SCROLL_PRESETS[presetKey].stiffness;
  const damping = isCustom ? customDamping : SCROLL_PRESETS[presetKey].damping;
  const wheelThreshold = isCustom ? customThreshold : SCROLL_PRESETS[presetKey].wheelThreshold;
  const thresholdRef = useRef(wheelThreshold); thresholdRef.current = wheelThreshold;

  // `laneRef` is the single representation of "which list the left spring is on".
  // The spring's bound reads from the SAME ref rather than a parallel one: the
  // handlers below claim the new lane before they snap, and a bound that lagged
  // behind that claim would silently truncate a legitimate index — with the
  // claim already made, the re-seat effect would then early-return and never
  // correct it. One ref, so claim and clamp cannot disagree.
  const laneRef = useRef(lane);
  const springL = useSpring(stiffness, damping, useCallback(() => laneRef.current.length, []));
  const springR = useSpring(stiffness, damping, useCallback(() => laneRef.current.length, []));
  // The ONLY place an index crosses from one list to another. Whenever the lane
  // swaps (the filter changed) the springs' integer indices stop meaning what
  // they meant, so re-seat each on the same robot by id. Falls to the top of the
  // new lane when that robot isn't in it. Both springs, because compare rides
  // the same lane and a stale right index would point into the old list.
  useEffect(() => {
    const prev = laneRef.current;
    if (prev === lane) return;
    const keepL = idAt(prev, springL.index);
    const keepR = idAt(prev, springR.index);
    laneRef.current = lane;
    springL.snapTo(seat(indexOfId(lane, keepL)));
    springR.snapTo(seat(indexOfId(lane, keepR)));
  }, [lane]); // eslint-disable-line react-hooks/exhaustive-deps

  // Picking a robot in the grid is the same gesture as picking one in the arc:
  // it seats the left spring and hands you back the wheel. `jumpTo`, not
  // `snapTo` — the wheel is already on screen behind the grid, so it should be
  // caught mid-travel rather than found already arrived.
  const openFromGrid = useCallback((id: string) => {
    const i = indexOfId(lane, id);
    if (i >= 0) springL.jumpTo(i);
    setGridOpen(false);
  }, [lane, springL]);

  // Escape closes the grid before anything else on the page sees it — the grid
  // is the topmost thing open whenever it is open.
  useEffect(() => {
    if (!gridOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setGridOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [gridOpen]);

  // The lane can change during a render that still holds the previous index
  // (chip click), so clamp here rather than trusting the re-seat effect to have
  // run — it cannot, it is an effect. Everything downstream reads `seatL`, not
  // the raw spring index, so the card, the scene and the arc can't disagree
  // about which robot is selected on that frame.
  const seatL = Math.max(0, Math.min(springL.index, lane.length - 1));
  const hL = lane[seatL];
  // Same clamp for the right spring: it indexes the same lane, so a lane change
  // can leave its raw index past the end for a frame.
  const seatR = Math.max(0, Math.min(springR.index, lane.length - 1));
  const hR = lane[seatR];

  const activeGo = comparing ? (activeSide === "left" ? springL.go : springR.go) : springL.go;

  // Lucky tap — short RAF-driven animation, independent of spring duration.
  // Dispatches on style: "tilt" = sin(πt) bell-curve backward lean,
  // "shake" = damped sine oscillation along X. The give dispatcher skips
  // writes while the tap is active (gated by tiltTapRef).
  const tiltTapRef = useRef(false);
  useEffect(() => {
    if (!luckyNonce) return;
    const cards = [leftCardRef.current, rightCardRef.current].filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;
    tiltTapRef.current = true;
    const s = luckyTapSettingsRef.current;
    const start = performance.now();
    let rafId = 0;
    if (s.style === "tilt") {
      for (const el of cards) el.style.transformOrigin = `50% ${s.originY}%`;
    }
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / s.dur);
      for (const el of cards) {
        if (s.style === "tilt") {
          const intensity = Math.sin(Math.PI * t); // 0 → 1 → 0
          el.style.transform = `perspective(${s.depth}px) rotateX(${intensity * s.angle}deg)`;
        } else {
          // damped sine: oscillates, amplitude decays to 0 by t=1
          const damp = 1 - t;
          const y = Math.sin(Math.PI * 2 * s.shakeCycles * t) * damp * s.shakePx;
          el.style.transform = `translateY(${y}px)`;
        }
      }
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        for (const el of cards) {
          el.style.transform = "";
          el.style.transformOrigin = "";
        }
        tiltTapRef.current = false;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      tiltTapRef.current = false;
      for (const el of cards) {
        el.style.transform = "";
        el.style.transformOrigin = "";
      }
    };
  }, [luckyNonce]);

  // Continuous card "give" — dispatches to the active variant on each
  // spring tick. Variant + settings changes hot-swap the callback.
  const effectiveGive: GiveStyle = giveStyle;
  const giveSettings: GiveSettings = {
    velScale: giveVelScale,
    pushAmt: givePushAmt,
    leanAmt: giveLeanAmt,
    tiltAmt: giveTiltAmt,
    tiltDepth: giveTiltDepth,
  };
  const sceneParallaxRef = useRef(0);
  sceneParallaxRef.current = sceneParallax && sceneEnabled && sceneVariant !== "viewport" ? sceneParallaxAmt : 0;
  const giveSettingsRef = useRef(giveSettings);
  giveSettingsRef.current = giveSettings;
  const giveStyleRef = useRef(effectiveGive);
  giveStyleRef.current = effectiveGive;
  useLayoutEffect(() => {
    const make = (
      ref: React.MutableRefObject<HTMLDivElement | null>,
      getVel: () => number,
    ) => (pos: number) => {
      if (tiltTapRef.current) return; // lucky tap owns the transform
      const el = ref.current;
      if (!el) return;
      applyGive(el, giveStyleRef.current, pos, getVel(), giveSettingsRef.current);
      // Scene parallax — the fractional part of the spring position is how far
      // the wheel is between two seats, so the room drifts counter to the
      // travel and lands back at zero when the card settles.
      const amt = sceneParallaxRef.current;
      if (amt) {
        const frac = pos - Math.round(pos);
        el.style.setProperty("--scene-x", `${(-frac * amt).toFixed(2)}px`);
      } else if (el.style.getPropertyValue("--scene-x")) {
        el.style.removeProperty("--scene-x");
      }
    };
    const unsubL = springL.subscribe(make(leftCardRef, springL.getVel));
    const unsubR = springR.subscribe(make(rightCardRef, springR.getVel));
    return () => { unsubL(); unsubR(); };
  }, [springL.subscribe, springR.subscribe, springL.getVel, springR.getVel]);


  // Re-apply immediately when variant or slider values change so the preview
  // reflects the new settings even while the spring is at rest.
  useLayoutEffect(() => {
    if (tiltTapRef.current) return;
    const apply = (ref: React.MutableRefObject<HTMLDivElement | null>, getPos: () => number, getVel: () => number) => {
      const el = ref.current;
      if (!el) return;
      applyGive(el, effectiveGive, getPos(), getVel(), giveSettingsRef.current);
    };
    apply(leftCardRef, springL.getPos, springL.getVel);
    apply(rightCardRef, springR.getPos, springR.getVel);
  }, [effectiveGive, giveVelScale, givePushAmt, giveLeanAmt, giveTiltAmt, giveTiltDepth, springL.getPos, springR.getPos, springL.getVel, springR.getVel]);

  // External navigation from chat
  // External jumps (chat suggestions, the "what's new" toast) address a robot by
  // id, not position — the caller has no idea which lane is open. Resolve the id
  // to its own lane and seat there, same contract as a ?h= deeplink.
   // Landing on one robot from outside the wheel — a deeplink, the tray, the
  // shelf. It always lands in the robot's own form lane (staying in the saved
  // lane would mean seating on an index that list doesn't have), and it
  // dismisses the grid: landing on a robot is a request to look at it, and
  // the grid is what's in front of the wheel — otherwise the wheel re-seats
  // silently behind a page that never changed.
  const landOn = useCallback((target: NonNullable<ReturnType<typeof resolveDeeplink>>) => {
    setSavedLaneOn(false);
    setGridOpen(false);
    setFormFilter(target.filter);
    laneRef.current = listFor(target.filter);
    springL.snapTo(target.index);
  }, [springL]);

 useEffect(() => {
    const target = resolveDeeplink(goToId);
    // Ignored while comparing: moving the lane out from under an open pair would
    // strand the right card on a robot from another category.
    if (!target || comparing) return;
    landOn(target);
  }, [goToId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Picking a robot out of the tray or the shelf. Inside the saved lane it is
  // ordinary movement — the robot is already in the list under the spring, so
  // it animates there. From anywhere else it is a lane change, which snaps.
  const seatOnId = useCallback((id: string) => {
    const local = indexOfId(laneRef.current, id);
    if (savedLaneLive && local >= 0) { springL.jumpTo(local); return; }
    const target = resolveDeeplink(id);
    if (target) landOn(target);
  }, [savedLaneLive, springL, landOn]);

  // Wheel accumulators for each side
  const accL = useRef(0);
  const accR = useRef(0);
  const decayL = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decayR = useRef<ReturnType<typeof setTimeout> | null>(null);

  const makeWheelHandler = useCallback((go: (d: number) => void, acc: React.MutableRefObject<number>, decay: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    return (e: React.WheelEvent) => {
      e.preventDefault();
      acc.current += e.deltaY;
      if (decay.current) clearTimeout(decay.current);
      decay.current = setTimeout(() => { acc.current = 0; }, 150);
      if (Math.abs(acc.current) > thresholdRef.current) {
        go(acc.current > 0 ? 1 : -1);
        acc.current = 0;
      }
    };
  }, []);

  const onWheelLeft = makeWheelHandler(springL.go, accL, decayL);
  const onWheelRight = makeWheelHandler(springR.go, accR, decayR);

  // Global wheel — velocity-aware stepping + elastic pre-threshold feedback
  const activeSideRef = useRef(activeSide); activeSideRef.current = activeSide;
  const comparingRef = useRef(comparing); comparingRef.current = comparing;
  // Filled in below, once `compareInLane` exists. The wheel effect is
  // subscribed once and must not re-subscribe when the lane changes, so it
  // reaches the stepper through a ref rather than closing over it.
  const stepLaneRef = useRef<(dir: 1 | -1) => void>(() => {});
  const mouseXRef = useRef<number | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => { mouseXRef.current = e.clientX; };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // "I'm feeling lucky" — react to Home bumping the nonce. Skip the initial 0.
  useEffect(() => {
    if (!luckyNonce) return;
    const pickDifferent = (exclude: number[]) => {
      let t = Math.floor(Math.random() * lane.length);
      let guard = 0;
      while (exclude.includes(t) && guard++ < 20) {
        t = Math.floor(Math.random() * lane.length);
      }
      return t;
    };
    const recordingExcludes = recordingMode
      ? lane.reduce<number[]>((acc, h, i) => (RECORDING_SHUFFLE_EXCLUDE_IDS.includes(h.id) ? [...acc, i] : acc), [])
      : [];
    const targetL = pickDifferent([springL.index, ...recordingExcludes]);
    springL.jumpTo(targetL);
    if (comparing) {
      const targetR = pickDifferent([springR.index, targetL, ...recordingExcludes]);
      springR.jumpTo(targetR);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luckyNonce]);
  useEffect(() => {
    let acc = 0;
    let lastTime = 0;
    let velocity = 0;
    let decay: ReturnType<typeof setTimeout>;

    // Gesture-direction via a rolling 100ms window of |dx|/|dy| sums.
    // Trackpads emit noisy per-frame ratios — a single mis-typed frame
    // mid-swipe would otherwise capture the wheel away from the native
    // gallery scroll. The window outvotes any single noisy frame.
    let lastWheelTime = 0;
    const recent: { dx: number; dy: number; t: number }[] = [];
    const AGG_WINDOW_MS = 100;
    // Horizontal accumulator, and a latch so one continuous swipe steps one
    // lane. A lane change swaps the entire list under the cursor, so
    // repeat-firing mid-gesture would take you from 26 robots to 6 in a flick.
    let accX = 0;
    let laneLatched = false;
    // Which surface owns the current vertical gesture. Latched once at the
    // start and held until the idle gap ends the gesture, so a flick never
    // hands off mid-scroll — reaching the drawer's end stops, it does not
    // spill into the deck, and a scroll begun on the deck keeps moving the
    // deck even as cards animate under a stationary cursor.
    let vTarget: "lane" | "drawer" | null = null;
    // Still above the vertical threshold (10–40 across the presets) — changing
    // lane is less reversible than moving within one — but only about double,
    // not the wall 120 turned out to be. A trackpad flick clears this.
    const LANE_THRESHOLD = 80;

    const route = (delta: number, nudgeAmt?: number) => {
      if (!comparingRef.current) {
        if (nudgeAmt !== undefined) springL.nudge(nudgeAmt);
        else springL.go(delta);
      } else {
        // handled per-side below
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Locked: return before any preventDefault so the overlay on top scrolls
      // natively, exactly as it would if this listener weren't here.
      if (inputLockedRef.current) return;
      // Tuners only exist in dev; skip the DOM walk in production.
      if (isDev && (e.target as HTMLElement)?.closest?.("[data-tuner]")) return;
      const wheelNow = performance.now();
      if (wheelNow - lastWheelTime > 150) {
        recent.length = 0;
        // Same idle gap that ends a vertical gesture ends a horizontal one:
        // the latch releases and the next swipe starts from zero.
        accX = 0;
        laneLatched = false;
        vTarget = null;
      }
      lastWheelTime = wheelNow;

      recent.push({ dx: Math.abs(e.deltaX), dy: Math.abs(e.deltaY), t: wheelNow });
      while (recent.length && wheelNow - recent[0].t > AGG_WINDOW_MS) recent.shift();
      let sx = 0, sy = 0;
      for (const r of recent) { sx += r.dx; sy += r.dy; }
      // Use the wheel event's own target, not a tracked hover ref —
      // mouseenter/leave is unreliable when cards animate under a stationary
      // cursor (the cursor never "moves" so events don't fire).
      const overGallery = !!(e.target as Element | null)?.closest?.("[data-gallery]");
      if (overGallery && sx > sy) return;
      // Card drawer, on the other axis. Intent is read once per gesture from
      // the same rolling window the lane uses: a vertical scroll that starts
      // over a drawer with room in it belongs to the drawer for its whole
      // life; one that starts anywhere else belongs to the deck for its whole
      // life. Deciding per event instead made the two trade the gesture back
      // and forth mid-flick. A horizontal gesture is never latched, so lanes
      // still switch with the cursor over an open drawer.
      if (vTarget === null && sy > sx) {
        const drawerEl = (e.target as Element | null)?.closest?.("[data-drawer]") as HTMLElement | null;
        vTarget = drawerEl && drawerEl.scrollHeight - drawerEl.clientHeight > 1 ? "drawer" : "lane";
      }
      // No preventDefault: the drawer scrolls natively, and its
      // `overscroll-behavior: contain` keeps the end of it from moving the page.
      if (vTarget === "drawer") return;
      // ── Horizontal steps the lane rail ──────────────────────────────────
      // Vertical moves within the open lane; horizontal moves between lanes.
      // The gallery keeps its own horizontal scroll (bailed out just above),
      // so the axis is free everywhere else on the page.
      //
      // `sx > sy * 1.6`, not the gallery's plain `sx > sy`: a diagonal flick
      // down the wheel is a common gesture and must never cross a lane. The
      // margin only has to outvote drift, and the 100ms window has already
      // smoothed the per-frame noise it is guarding against.
      if (sx > sy * 1.6) {
        e.preventDefault();
        // Whatever vertical had accumulated belongs to the gesture that just
        // resolved as horizontal. Drop it so it can't leak into the next step.
        acc = 0;
        velocity = 0;
        if (laneLatched) return;
        accX += e.deltaX;
        if (Math.abs(accX) < LANE_THRESHOLD) return;
        laneLatched = true;
        stepLaneRef.current(accX > 0 ? 1 : -1);
        accX = 0;
        return;
      }
      // Scroll zones are rectangles bounded by the card edges. Single view:
      // anything past the card's right edge (stats column) is dead. Compare:
      // the gutter between the two cards (middle stats column) is dead.
      const lCard = leftCardRef.current;
      if (lCard) {
        const lr = lCard.getBoundingClientRect();
        const rCard = rightCardRef.current;
        if (comparingRef.current && rCard) {
          const rr = rCard.getBoundingClientRect();
          if (e.clientX > lr.right && e.clientX < rr.left) return;
        } else if (e.clientX > lr.right) {
          return;
        }
      }
      e.preventDefault();
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      acc += e.deltaY;
      // Track velocity (pixels per ms, smoothed)
      if (dt > 0 && dt < 200) {
        velocity = velocity * 0.6 + (Math.abs(e.deltaY) / dt) * 0.4;
      }

      clearTimeout(decay);
      decay = setTimeout(() => { acc = 0; velocity = 0; }, 150);

      const thresh = thresholdRef.current;
      const ratio = Math.abs(acc) / thresh;

      if (ratio < 1) {
        // Pre-threshold: elastic nudge proportional to accumulation
        const nudgeAmt = (acc > 0 ? 1 : -1) * ratio * 0.02;
        if (!comparingRef.current) {
          springL.nudge(nudgeAmt);
        } else {
          const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
          if (side === "left") springL.nudge(nudgeAmt); else springR.nudge(nudgeAmt);
        }
        return;
      }

      // Threshold crossed — velocity determines step size
      const dir = acc > 0 ? 1 : -1;
      const steps = velocity > 3 ? 3 : velocity > 1.5 ? 2 : 1;
      if (!comparingRef.current) {
        springL.go(dir * steps);
      } else {
        const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
        if (side === "left") springL.go(dir * steps); else springR.go(dir * steps);
      }
      acc = 0;
      velocity = 0;
      // The card-flip intent is "spent" — clear the axis window so the next
      // gesture (often a horizontal gallery swipe right after) classifies
      // from fresh frames, not the lingering vertical momentum of this one.
      recent.length = 0;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("wheel", onWheel); clearTimeout(decay); };
  }, [springL.go, springL.nudge, springR.go, springR.nudge, isDev]);

  // Keyboard — arrows control active side, tab switches, esc exits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inputLockedRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab" && comparing) { e.preventDefault(); setActiveSide((s) => s === "left" ? "right" : "left"); return; }
      if (e.key === "Escape" && comparing) { setComparing(false); setActiveSide("left"); return; }
      if (isDev) {
        if (e.key === "s") { pickArcStyle(ARC_STYLES[(ARC_STYLES.indexOf(arcStyle) + 1) % ARC_STYLES.length]); return; }
        // preventDefault, or the keystroke that opened the panel lands in the
        // panel: the shell autofocuses its search field on mount, and focus
        // moving mid-keydown sends this key's own text insertion to the newly
        // focused input — so `T` opened the tuner with "t" already typed in.
        if (e.key === "t") { e.preventDefault(); setShowTuner((v) => !v); return; }
        if (e.key in TUNER_HOTKEYS) { e.preventDefault(); setShowTuner(true); setTunerGroup(TUNER_HOTKEYS[e.key]); return; }
      }
      const mod = e.metaKey || e.ctrlKey;
      const isJumpStart =
        (mod && (e.key === "ArrowLeft" || e.key === "ArrowUp")) ||
        e.key === "Home" || e.key === "PageUp";
      const isJumpEnd =
        (mod && (e.key === "ArrowRight" || e.key === "ArrowDown")) ||
        e.key === "End" || e.key === "PageDown";
      if (isJumpStart || isJumpEnd) {
        e.preventDefault();
        const x = mouseXRef.current;
        const spring = comparing && x != null
          ? (x < window.innerWidth / 2 ? springL : springR)
          : (comparing && activeSide === "right" ? springR : springL);
        spring.jumpTo(isJumpStart ? 0 : lane.length - 1);
        return;
      }
      const isDown = e.key === "ArrowDown" || e.key === "ArrowRight";
      const isUp = e.key === "ArrowUp" || e.key === "ArrowLeft";
      if (isDown || isUp) {
        e.preventDefault();
        const x = mouseXRef.current;
        const go = comparing && x != null
          ? (x < window.innerWidth / 2 ? springL.go : springR.go)
          : activeGo;
        go(isDown ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeGo, comparing, activeSide, arcStyle, springL, springR, isDev, lane]);

  // In-card icon shortcuts — mirror the buttons one-for-one. Plain single
  // keys (no modifier) so ⌘C/⌘R/⌘D etc. still trigger native browser actions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inputLockedRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const currentId = idAt(lane, springL.index);
      switch (e.key) {
        case "d": case "D":
          // Compare has no column to collapse — but with stats over the card
          // the toggle still means something: show or hide both cards' rows.
          if (!comparing || statsOverlay !== "off") { setStatsCollapsed((v) => !v); }
          return;
        case "i": case "I":
          // Drawer mode: the key drives the focused card's drawer. In compare
          // that is the left card; the right card has its own handle.
          if (statsOverlay === "strip" && blurbDock === "drawer") {
            toggleDrawer("left");
          } else {
            setBlurbVisible((v) => !v);
          }
          return;
        case "e": case "E":
          setEngineerMode((v) => { const next = !v; setDenseRowGap(next ? 9 : 9); return next; });
          return;
        case "u": case "U":
          onUseImperialChange?.(!useImperial);
          return;
        case "c": case "C":
          onShareView?.();
          return;
        // Shift+S, following Shift+R for Random. Plain "s" and "f" are both
        // taken by dev cyclers (arc style, font), and those listeners are
        // separate from this one — a shared key would fire both on one press.
        case "S":
          if (currentId) toggleFavorite(currentId);
          return;
        case "3":
          if (!comparing && currentId && THREEDEE_ROBOTS[currentId]) setShow3D((v) => !v);
          return;
        case "r": case "R":
          if (!comparing && currentId && SPIN_ROBOTS[currentId]) void toggleSpin();
          return;
        case " ":
          if (!comparing) { e.preventDefault(); setVideoPaused((p) => !p); }
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [comparing, springL, useImperial, onUseImperialChange, onShareView, toggleSpin, lane]); // eslint-disable-line react-hooks/exhaustive-deps


  const applyPreset = (key: PresetKey) => { setPresetKey(key); setIsCustom(false); const p = SCROLL_PRESETS[key]; setCustomStiffness(p.stiffness); setCustomDamping(p.damping); setCustomThreshold(p.wheelThreshold); };
  // Compare runs inside the open lane, so entering it doesn't move the list at
  // all — the left card stays exactly where it was and the right one opens on
  // its neighbour. A one-robot lane wraps to the same robot rather than seating
  // out of range.
  const enterCompare = () => {
    springR.jumpTo(seatL < lane.length - 1 ? seatL + 1 : 0);
    setComparing(true);
    setActiveSide("right");
  };
  // Leaving compare keeps the lane and the left seat — there is nothing to
  // restore, since compare never left the category you were browsing.
  const exitCompare = () => {
    setComparing(false);
    setActiveSide("left");
    setSplitHover(false);
  };

  // Picking a lane from the rail while comparing switches which category the
  // pair is drawn from instead of closing compare. Seat by id where the robots
  // carry over (they usually don't — a lane change means a new body plan), and
  // keep the two sides off the same seat.
  const compareInLane = (f: FormFilter) => {
    if (f === formFilter) return;
    setFormFilter(f);
    const next = listFor(f);
    laneRef.current = next;
    const l = seat(indexOfId(next, hL?.id));
    const r = seat(indexOfId(next, hR?.id));
    springL.snapTo(l);
    springR.snapTo(r === l ? (l < next.length - 1 ? l + 1 : 0) : r);
  };

  // Horizontal swipe → one lane along the rail. Clamped, not wrapped: the rail
  // is a visible finite list of three, and a swipe that jumped from the bottom
  // back to the top would read as a glitch rather than as a cycle.
  stepLaneRef.current = (dir) => {
    const i = Math.max(0, FORM_FILTERS.findIndex((f) => f.key === formFilter));
    const next = FORM_FILTERS[Math.min(FORM_FILTERS.length - 1, Math.max(0, i + dir))];
    if (!next || next.key === formFilter) return;
    if (comparing) compareInLane(next.key);
    else setFormFilter(next.key);
    flashRail();
  };

  useEffect(() => {
    if (homeNonce === 0) return;
    // Leave compare without adopting the compared robot's body plan — Home
    // should return you to the top of the lane you already had open.
    if (comparing) { setComparing(false); setActiveSide("left"); setSplitHover(false); }
    setGridOpen(false);
    springL.jumpTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeNonce]);

  // ── Hydrate spring positions from share URL on mount ──
  // A compare link only opens as a pair when both robots share a lane — that is
  // the only pair compare can seat now. A single ?h= link resolves to the lane
  // that actually contains that robot, so a link to a non-humanoid opens in its
  // own lane instead of missing.
  useEffect(() => {
    const { leftId, compareIds } = parseShareParams();
    if (compareIds.length >= 2) {
      const pair = resolveComparePair(compareIds[0], compareIds[1]);
      if (pair) {
        setFormFilter(pair.filter);
        laneRef.current = listFor(pair.filter);
        springL.snapTo(pair.left);
        springR.snapTo(pair.right);
        setComparing(true);
        setActiveSide("right");
        return;
      }
      // Mismatched lanes, or only the left id resolved — open on the left robot
      // rather than dropping the link on the floor. app/page.tsx already renders
      // a solo title/OG for the partial case.
      const solo = resolveDeeplink(compareIds[0]);
      if (solo) {
        setFormFilter(solo.filter);
        laneRef.current = listFor(solo.filter);
        springL.snapTo(solo.index);
        return;
      }
    }
    const target = resolveDeeplink(leftId);
    if (target) {
      setFormFilter(target.filter);
      laneRef.current = listFor(target.filter);
      springL.snapTo(target.index);
    }
    // run only on mount; springs are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep share URL ref in sync for parent to read ──
  useEffect(() => {
    if (typeof window === "undefined" || !shareUrlRef) return;
    const origin = window.location.origin;
    const leftId = hL?.id;
    const rightId = hR?.id;
    if (comparing) {
      shareUrlRef.current = leftId && rightId ? `${origin}/?compare=${leftId},${rightId}` : origin;
    } else {
      shareUrlRef.current = leftId ? `${origin}/?h=${leftId}` : origin;
    }
    if (shareOgRef) {
      const og = comparing
        ? (leftId && rightId ? `${origin}/api/og/${leftId}?compare=${rightId}` : "")
        : (leftId ? (humanoids[springL.index]?.ogImageUrl ? `${origin}${humanoids[springL.index].ogImageUrl}` : `${origin}/api/og/${leftId}`) : "");
      shareOgRef.current = og;
    }
  }, [hL?.id, hR?.id, comparing, shareUrlRef, shareOgRef]);

  useEffect(() => {
    if (!onShareViewLabelChange) return;
    const leftName = hL?.name;
    const rightName = hR?.name;
    if (comparing && leftName && rightName) {
      onShareViewLabelChange(`Share ${leftName} vs ${rightName}`);
    } else if (leftName) {
      onShareViewLabelChange(`Share ${leftName}`);
    }
  }, [comparing, hL?.id, hR?.id, onShareViewLabelChange]);

  // Initial fade-in only — re-running on every index/compare change made the blurb
  // re-flash whenever you landed on a card (most obvious on Memo, the home card).
  const [blurbReady, setBlurbReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBlurbReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    onComparingChange?.(comparing);
  }, [comparing, onComparingChange]);

  // Stop auto-rotate when the active humanoid changes or compare mode toggles
  useEffect(() => {
    spinLoopRef.current = false;
    spinViewerRef.current?.cancelPlay();
    setSpinPlaying(false);
    setVideoPaused(false);
    resetGalleryIdx();
  }, [hL?.id, hR?.id, comparing, resetGalleryIdx]);

  // 3D viewer is per-robot — scrolling away should drop you back to the
  // photo rather than carrying the 3D mode into the next humanoid. Keyed on the
  // robot, not the seat: a filter change can land on the same index.
  useEffect(() => {
    setShow3D(false);
  }, [hL?.id]);


  const distL = Math.abs(springL.getPos() - springL.targetRef.current);
  const distR = Math.abs(springR.getPos() - springR.targetRef.current);
  const getStats = (h: typeof humanoids[0]) => [
    h.height && { label: "Height", value: `${h.height} cm` }, h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` }, h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];
  const statsL = getStats(hL);
  // Rows for the stats-over-card overlay. Single view drops rows it can't
  // fill. Compare keeps every row and dashes the gaps: the two strips have to
  // be the same height with each row opposite its twin, or there is nothing
  // to compare.
  /**
   * The figures in the stats surface.
   *
   * Two audiences, so two sets. The compare strip runs the five SPEC rows
   * always, nulls included, because two columns only read as a comparison when
   * their labels line up — that's what the `—` is for and it stays.
   *
   * The drawer is the other case. It covers the whole card and holds one
   * height whatever it contains (so scrolling the wheel with it open doesn't
   * make it breathe), and the spec five are patchy — the lane runs anywhere
   * from one populated row to five, which turned a constant box into a tail
   * that was a different size on every robot. Exactly the raggedness you feel
   * while scrolling.
   *
   * So the drawer also carries the facts every robot actually has — year, use
   * case, drive, status (35/35, 35/35, 34/35, 35/35). Six to ten rows instead
   * of one to five: the box fills, and what varies is a much smaller share of
   * it. Filtered, never `—` — a placeholder is honest in a comparison and just
   * an empty row on its own.
   */
  const overlayRowsFor = (h: typeof humanoids[0], deep = false): { label: string; value: string | null }[] => {
    if (statsOverlay === "off") return [];
    const f = useImperial ? IMPERIAL_FMT : METRIC_FMT;
    const price = h.cost && h.cost !== "N/A" ? h.cost : availabilityLabel(h) ?? null;
    const specs = [
      { label: "Height", value: h.height ? f.height(h.height) : null },
      { label: "Weight", value: h.weight ? f.weight(h.weight) : null },
      { label: "DOF", value: h.dof ? String(h.dof) : null },
      { label: "Speed", value: h.maxSpeed ? f.speed(h.maxSpeed) : null },
      { label: "Price", value: price },
    ];
    if (comparing) return specs;
    // Specs first, then the descriptive facts, then price last — it's the line
    // you read to decide. No Year row: the placard above the card already says
    // "A3 2026", and a drawer that repeats the header is padding, not depth.
    const all = deep
      ? [
          ...specs.slice(0, 4),
          { label: "Use case", value: h.useCase ?? null },
          { label: "Drive", value: h.drive ?? null },
          { label: "Status", value: h.status ?? null },
          specs[4],
        ]
      : specs;
    return all.filter((r) => r.value);
  };

  // Transition easing — Material standard: smooth, clean, no overshoot
  const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
  const dur = "0.5s";

  // Image preloader. Starts tight (±2 around current) then widens during
  // idle time until every humanoid's image has been fetched via the same
  // Next/Image optimization pipeline — crossings always hit cache, even
  // on the first pass.
  const [preloadRadius, setPreloadRadius] = useState(2);
  useEffect(() => {
    if (preloadRadius >= lane.length) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const w = window as IdleWindow;
    const run = () => setPreloadRadius((r) => Math.min(lane.length, r + 4));
    let handle: number;
    if (w.requestIdleCallback) {
      handle = w.requestIdleCallback(run, { timeout: 1500 });
      return () => { w.cancelIdleCallback?.(handle); };
    }
    handle = window.setTimeout(run, 400);
    return () => { window.clearTimeout(handle); };
  }, [preloadRadius]);

  const preloadIndices = (() => {
    const s = new Set<number>();
    const add = (idx: number) => {
      for (let k = -preloadRadius; k <= preloadRadius; k++) {
        const n = idx + k;
        if (n >= 0 && n < lane.length && k !== 0) s.add(n);
      }
    };
    add(springL.index);
    if (comparing) add(springR.index);
    return Array.from(s);
  })();
  const preloadSizes = `${Math.round(robotW)}vw`;

  const focusedH = !comparing ? lane[seatL] : undefined;
  const sceneAvailable = !!focusedH?.sceneUrl;
  const sceneActive = sceneEnabled && sceneAvailable;
  // Variants that paint inside the card. "card" is the original low-opacity
  // wash; "portal" and "bleed" run the scene at full strength so the glass
  // above it has something to refract.
  const sceneInCard = sceneVariant === "card" || sceneVariant === "portal" || sceneVariant === "bleed";
  const scenePortalMode = sceneVariant === "portal" || sceneVariant === "bleed";
  const scenePortalOn = sceneEnabled && scenePortalMode;
  // Chips over a live scene switch to the glass chrome; everywhere else they
  // keep whatever the glass tuner is set to.
  const cardChipChrome = scenePortalOn && scenePortalGlass ? scenePortalChipChrome : glassChipChrome;
  // Which card edges have chrome sitting on the scene — see the scrim below.
  const scrimTop = labelPosition === "stack" || statusPlacement === "corner";
  const scrimBottom = chipLayout === "floating" || chipLayout === "corners" || chipLayout === "unified";
  const sceneBackgroundImage = focusedH?.sceneUrl ? `url(${focusedH.sceneUrl})` : undefined;

  const sceneMask = useMemo(() => {
    const peak = scenePeakAlpha / 100;
    switch (sceneShape) {
      case "radial": {
        const inner = Math.max(0, sceneSize - sceneSoftness);
        return `radial-gradient(ellipse ${sceneSize}% ${Math.round(sceneSize * 0.85)}% at 50% 50%, rgba(0,0,0,${peak}) ${inner}%, transparent ${sceneSize}%)`;
      }
      case "horizontal": {
        const half = sceneSize / 2;
        return `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,${peak}) ${50 - half}%, rgba(0,0,0,${peak}) ${50 + half}%, transparent 100%)`;
      }
      case "vertical": {
        const half = sceneSize / 2;
        return `linear-gradient(to right, transparent 0%, rgba(0,0,0,${peak}) ${50 - half}%, rgba(0,0,0,${peak}) ${50 + half}%, transparent 100%)`;
      }
      case "top": return `linear-gradient(to bottom, rgba(0,0,0,${peak}) 0%, transparent ${sceneSize}%)`;
      case "bottom": return `linear-gradient(to top, rgba(0,0,0,${peak}) 0%, transparent ${sceneSize}%)`;
    }
  }, [sceneShape, sceneSize, sceneSoftness, scenePeakAlpha]);

  const cardBg = useMemo(() => {
    const hex = cardFillColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${cardFillAlpha / 100})`;
  }, [cardFillColor, cardFillAlpha]);
  const cardBackdropFilter = useMemo(
    () => cardBlur > 0 ? `blur(${cardBlur}px)` : undefined,
    [cardBlur],
  );

  // One row of the rail, whichever shape it takes. The column and the ring
  // both render from these, so a row is added or rewired in one place.
  type RailRow = { key: string; label: string; icon: React.ReactNode; onClick?: () => void; active: boolean; lane?: FormFilter; hint?: string };
  // The action rows. Saved leads the group: it is the only row that reads the
  // visitor's own state back to them, and its count is the one number in the
  // column that they put there. Hidden until there is something in it — an
  // empty row here would be chrome advertising a feature.
  const railActions: RailRow[] = [
    ...(savedItems.length > 0 ? [{
      key: "saved",
      label: "Saved",
      icon: <Bookmark size={16} strokeWidth={1.75} fill={savedSurfaceOn ? "currentColor" : "none"} />,
      onClick: () => {
        if (savedSurface === "lane") { if (comparing) return; setSavedLaneOn((v) => !v); return; }
        if (savedSurface === "shelf") { setShelfOpen((v) => !v); return; }
        setTrayOpen((v) => !v);
      },
      active: savedSurfaceOn,
      hint: String(savedItems.length),
    }] : []),
    { key: "search", label: "Search", icon: <Search size={16} strokeWidth={1.75} />, onClick: () => window.dispatchEvent(new Event(SEARCH_OPEN_EVENT)), active: false, hint: "\u2318K" },
    { key: "ask", label: "Ask", icon: <Sparkles size={16} strokeWidth={1.75} />, onClick: onToggleChat, active: chatActive },
    // No Share row. The dock under the card already carries one, with the same
    // icon and the same word, and two controls a few hundred pixels apart that
    // look identical and do slightly different things is worse than one that
    // does the obvious thing. Feedback is on the credit line — it is a footer
    // utility, and it was sitting at the same rank as Search.
  ];

  return (
    <div className="h-screen overflow-hidden select-none relative" data-scene={sceneActive && (sceneVariant === "viewport" || sceneVariant === "bleed") ? "on" : "off"} style={{ background: pageBg, ["--action-hover-tint" as string]: actionHoverColor, ["--action-hover-pct" as string]: actionHoverPct, ["--action-active-pct" as string]: actionActivePct }}>
      {sceneVariant === "viewport" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: sceneAvailable ? sceneBackgroundImage : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: sceneAvailable ? sceneOpacity / 100 : 0,
            filter: sceneBlur > 0 ? `blur(${sceneBlur}px)` : undefined,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskSize: sceneInteracted ? undefined : (sceneActive ? "135% 135%" : "0% 0%"),
            WebkitMaskSize: sceneInteracted ? undefined : (sceneActive ? "135% 135%" : "0% 0%"),
            animation: sceneInteracted
              ? `${sceneActive ? "scene-bloom" : "scene-collapse"} ${sceneActive ? 1800 : 800}ms cubic-bezier(0.32, 0.72, 0, 1) forwards`
              : undefined,
            transition: "opacity 500ms ease",
            pointerEvents: "none",
            WebkitMaskImage: sceneMask,
            maskImage: sceneMask,
          }}
        />
      )}
      {/* Bleed wash — the same scene behind the whole page at low strength and
          heavy blur, so nav, pills, arc and footer frost over the robot's own
          environment instead of over flat white. The card still runs the scene
          at full strength, and the card edge is where the two meet. */}
      {sceneVariant === "bleed" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -60,
            zIndex: 0,
            backgroundImage: sceneAvailable ? sceneBackgroundImage : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: sceneActive ? sceneBleedWash / 100 : 0,
            filter: "blur(60px) saturate(150%)",
            transition: "opacity 900ms cubic-bezier(0.32, 0.72, 0, 1)",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Neighbor-image preloader — off-screen Next/Image tags matching the
          card's sizes, so the optimized variants are cached before crossings. */}
      <div aria-hidden style={{ position: "absolute", left: -99999, top: 0, width: `${robotW}vw`, height: `${robotH}vh`, maxWidth: robotMaxW, pointerEvents: "none", opacity: 0 }}>
        {preloadIndices.map((i) => {
          const h = lane[i];
          if (!h?.imageUrl) return null;
          return (
            <div key={i} style={{ position: "absolute", inset: 0 }}>
              <Image src={h.imageUrl} alt="" fill sizes={preloadSizes} />
            </div>
          );
        })}
      </div>

      {/* Grid — the whole open lane at once, over the wheel rather than instead
          of it. Same stage, so the column, the toasts and the search modal all
          keep working; the wheel is still seated behind it, and picking a robot
          here is what hands it back. Padded clear of the column on the left so
          the first tile never starts under the rail. */}
      {gridOpen && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 20,
            background: pageBg,
            // Sized for the rail fully open — the cursor is over the tiles
            // nearest the rail exactly when it is opening, so padding for the
            // resting glyphs ran the labels and counts under the first column.
            paddingLeft: railShape === "concentric"
              ? effectiveArcInset - arcTextGap - effectiveRingInset + RING_OPEN_REACH
              : `calc(var(--nav-edge, 24px) + ${railShape === "ring" ? 18 + ringR + RING_OPEN_REACH : 112}px)`,
          }}
        >
          {/* The v3 Collection, embedded: no header of its own (the column is
              the chrome), no detail panel, no ?h= writing. Clicks come back
              through onPick. `items` is derived per lane, so switching lanes
              re-runs the entry intro — the grid re-deals into the new set. */}
          <Collection
            items={gridItems}
            config={humanoidConfig}
            embedded
            onPick={openFromGrid}
          />
        </div>
      )}

      {/* Floating sidebar — the site's entire chrome as one object.
          It used to be three: a mark alone in the top-left corner, this rail in
          the middle, and a credit capsule with a plus at the foot. Three glass
          pills on one edge, identical chrome, so a wordmark and a copyright
          line ranked equal to the only control on the page. Folding them into
          one column makes rank a matter of position instead — identity at the
          top, navigation in the middle, actions at the bottom — and the plus,
          which existed only to open a pill that no longer exists, is gone.

          Still vertically centred on the focused name and sharing a side with
          the name arc on purpose: the column stays anchored while the names
          sweep past it. In compare it narrows to glyphs — two cards leave no
          room for labels — but the lane indicator stays lit, because compare
          runs inside the open lane and that lane is still the filter in force. */}
      {/* ── Gear ────────────────────────────────────────────────────────────
          The small wheel. Its glyphs ride a tight circle whose hub sits on the
          page's left edge, so the ring is half off-screen and reads as coming
          out of the side — a second, smaller mechanism beside the big wheel of
          names, rather than a list that happens to be bent.

          The thing that makes it usable is what does NOT rotate. In the `ring`
          shape the label rode its own ray, so "Humanoid" read bottom-to-top and
          "Search" ran diagonally downhill: a nice drawing you had to tilt your
          head to use. Here only the glyphs are on the arc. Labels are a flat
          layer on top, horizontal, each anchored beside its own glyph, and only
          one is ever up — the one you're pointing at. The open lane keeps its
          label always, so at rest the ring still says what it is instead of
          asking you to learn seven unlabelled marks.
          ──────────────────────────────────────────────────────────────────── */}
      {railShape === "gear" ? (() => {
        const entries: RailRow[] = [
          ...FORM_FILTERS.map(({ key, label }) => {
            const on = formFilter === key && !savedLaneLive;
            return {
              key, label, lane: key, active: on,
              icon: <FormGlyph key={on ? "on" : "off"} form={key} size={18} active={on} />,
              onClick: () => { if (comparing) { compareInLane(key); return; } setFormFilter(key); },
              hint: String(countFor(key)),
            };
          }),
          { key: "grid", label: "Grid", icon: <LayoutGrid size={16} strokeWidth={1.75} />, onClick: () => setGridOpen((v) => !v), active: gridOpen },
          ...railActions,
        ];
        const SEAT = 28;
        const R = ringR;
        /* Seats are spaced by SLOT, not by index, so the column's grouping
           survives the bend: the three lanes sit together, the grid stands
           apart, the tools sit together. Evenly spaced, the seven marks read as
           one undifferentiated string of beads and the rail loses the one thing
           the column got right. A gap of 0.6 of a step is the arc's version of
           SIDEBAR_GROUP_GAP. */
        const GROUP_GAP = 0.6;
        const slots = entries.map((e, i) => {
          const kind = e.lane ? 0 : e.key === "grid" ? 1 : 2;
          const prevKind = i === 0 ? kind : (entries[i - 1].lane ? 0 : entries[i - 1].key === "grid" ? 1 : 2);
          return { kind, breaks: i > 0 && kind !== prevKind ? GROUP_GAP : 0 };
        });
        const slotAt: number[] = [];
        slots.reduce((acc, sl, i) => {
          const v = i === 0 ? 0 : acc + 1 + sl.breaks;
          slotAt.push(v);
          return v;
        }, 0);
        const span = Math.max(1, slotAt[slotAt.length - 1]);
        // Centred on 0° (due right of the hub) so the visible half of the
        // circle carries every seat — the other half runs off the page, which
        // is the point.
        const angleAt = (i: number) => (-ringSweep / 2 + ringSweep * (slotAt[i] / span)) * (Math.PI / 180);
        const activeLane = savedLaneLive ? -1 : FORM_FILTERS.findIndex((f) => f.key === formFilter);
        return (
          <div
            ref={railRef}
            className="fixed top-1/2"
            style={{
              zIndex: gridOpen ? 21 : 4,
              // The hub, not the ring's left edge: the circle is meant to run
              // off the side of the page.
              left: "calc(var(--nav-edge, 24px) + 18px)",
              width: 0, height: 0,
            }}
            onMouseEnter={() => setRailOpen(true)}
            onMouseLeave={() => { setRailOpen(false); setRailHoverKey(null); }}
          >
            {/* Hover halo — margin enough that the cursor can travel between
                seats, and out to where the labels appear, without the ring
                deciding you left. */}
            <div aria-hidden style={{ position: "absolute", left: -40, top: -(R + 40), width: R + 40 + 210, height: (R + 40) * 2, borderRadius: 999 }} />
            {/* The rim. Drawn faintly at rest — it is what tells you the marks
                are on one object instead of scattered, which is also why it
                does NOT fade in compare the way the column collapses: take the
                rim away and seven glyphs are left floating unmoored. The gear
                is ~150px wide either way, so it never needed the room the
                column was giving back. */}
            <div
              aria-hidden
              style={{
                position: "absolute", left: -R, top: -R, width: R * 2, height: R * 2,
                borderRadius: "50%", border: `1px solid ${SEAM}`,
                pointerEvents: "none",
              }}
            />
            {/* The mark is the hub. On a wheel that is the one position that
                isn't a choice, which is exactly the site's own name. */}
            <button
              type="button"
              onClick={onHome}
              aria-label="Humanoid Index"
              className="site-mark-btn cursor-pointer"
              style={{ position: "absolute", left: -20, top: -20, width: 40, height: 40, borderRadius: 20, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: INK.off, zIndex: 1 }}
            >
              <SiteMark size={20} color="#5F6059" opacity={SIDEBAR_GLYPH_OP.off} />
            </button>
            {/* The open lane's indicator, riding the rim between seats. A
                rotation carries it along the arc rather than across the chord. */}
            <div
              aria-hidden
              style={{
                position: "absolute", left: 0, top: 0, width: SEAT, height: SEAT, borderRadius: SEAT / 2,
                background: FILL.rest,
                transformOrigin: "0 50%",
                transform: `translateY(-50%) rotate(${angleAt(Math.max(0, activeLane)) * (180 / Math.PI)}deg) translateX(${R - SEAT / 2}px)`,
                opacity: activeLane < 0 ? 0 : 1,
                transition: "transform 320ms cubic-bezier(0.33, 1, 0.68, 1), opacity 200ms ease",
                pointerEvents: "none",
              }}
            />
            {entries.map((item, i) => {
              const a = angleAt(i);
              // Cartesian, so the label can be placed in flat page space while
              // the glyph is placed on the ring.
              const gx = Math.cos(a) * R;
              const gy = Math.sin(a) * R;
              const hovered = railHoverKey === item.key;
              const labelUp = hovered || (!!item.lane && item.active);
              return (
                <Fragment key={item.key}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    aria-label={item.label}
                    aria-pressed={item.active || undefined}
                    onMouseEnter={() => setRailHoverKey(item.key)}
                    onMouseLeave={() => setRailHoverKey((k) => (k === item.key ? null : k))}
                    className={`${item.lane ? "lane-row" : "sidebar-action"} cursor-pointer`}
                    style={{
                      position: "absolute",
                      left: gx - SEAT / 2, top: gy - SEAT / 2, width: SEAT, height: SEAT,
                      padding: 0, border: "none", background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: item.active ? INK.on : hovered ? INK.hover : INK.off,
                      zIndex: 1,
                    }}
                  >
                    {/* No counter-rotation to undo, because nothing rotated. */}
                    <span style={{ ...SIDEBAR_GLYPH_SLOT, ...railGlyphStyle(item.active ? SIDEBAR_GLYPH_OP.on : SIDEBAR_GLYPH_OP.off) }}>
                      {item.icon}
                    </span>
                  </button>
                  {/* The label, flat and beside its own glyph. Pointer-events
                      off: it is a readout, and a label that could swallow the
                      cursor would flicker itself away at its own edge. */}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: gx + SEAT / 2 + 6,
                      top: gy,
                      transform: `translateY(-50%) translateX(${labelUp ? 0 : -4}px)`,
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: "nowrap",
                      color: item.active ? INK.on : INK.hover,
                      opacity: labelUp ? 1 : 0,
                      transition: "opacity 200ms ease, transform 200ms cubic-bezier(0.33, 1, 0.68, 1)",
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    {item.label}
                    {item.hint && (
                      <span style={{ marginLeft: 8, color: INK.faint, fontVariantNumeric: "tabular-nums" }}>{item.hint}</span>
                    )}
                  </span>
                </Fragment>
              );
            })}
            {/* Small print, under the wheel rather than on it. */}
            <div
              style={{
                position: "absolute", left: -18, top: R + 26,
                fontFamily: "var(--font-geist-sans)", fontSize: 13, lineHeight: 1.35, fontWeight: 450,
                color: INK.off, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span>Roy Jad © 2026</span>
              {onFeedback && (
                <>
                  <span aria-hidden style={{ opacity: 0.5 }}>·</span>
                  <button type="button" onClick={onFeedback} className="rail-credit-link cursor-pointer" style={{ font: "inherit", color: "inherit", background: "none", border: "none", padding: 0 }}>Feedback</button>
                </>
              )}
            </div>
          </div>
        );
      })() : railShape !== "column" ? (() => {
        const concentric = railShape === "concentric";
        // Every row the column has, in the column's order, as points on an arc.
        const entries: RailRow[] = [
          ...FORM_FILTERS.map(({ key, label }) => {
            const on = formFilter === key && !savedLaneLive;
            return {
              key, label, lane: key, active: on,
              icon: <FormGlyph key={on ? "on" : "off"} form={key} size={18} active={on} />,
              onClick: () => { if (comparing) { compareInLane(key); return; } setFormFilter(key); },
              hint: String(countFor(key)),
            };
          }),
          { key: "grid", label: "Grid", icon: <LayoutGrid size={16} strokeWidth={1.75} />, onClick: () => setGridOpen((v) => !v), active: gridOpen },
          ...railActions,
        ];
        // Concentric: the mark is a row on the ring, on top, in the column's
        // order. The stack keeps the same rays either way — four rows above
        // the focused name's ray, the rest below.
        const PIVOT = FORM_FILTERS.length + 1;
        if (concentric) entries.unshift({ key: "mark", label: "", icon: <SiteMark size={18} color="#5F6059" opacity={SIDEBAR_GLYPH_OP.off} />, onClick: onHome, active: false });
        const SEAT = 28;
        const n = entries.length;
        // The names hang off the rim at wheelR - textGap (right-aligned, they
        // extend outward from it); the menu ring sits `ringInset` inside the rim.
        const R = concentric ? effectiveArcWheelR - arcTextGap - effectiveRingInset : ringR;
        // 0° is due right of the centre. Ring: the sweep is centred on it so
        // the wheel is symmetric about the focused name's height. Concentric:
        // one name-step per row, the mark on 0°.
        const angleAt = (i: number) => concentric
          ? (i - PIVOT) * effectiveArcStepDeg
          : -ringSweep / 2 + ringSweep * (i / (n - 1));
        const activeLane = savedLaneLive ? -1 : FORM_FILTERS.findIndex((f) => f.key === formFilter);
        // A row on the ring: a seat rotated onto the arc. The glyph is
        // counter-rotated so it stays upright; the label keeps the rotation and
        // reads along the ray, the way the names read along the big wheel.
        const seat = (a: number): React.CSSProperties => ({
          position: "absolute", left: 0, top: 0, height: SEAT,
          transformOrigin: "0 50%",
          transform: `translateY(-50%) rotate(${a}deg) translateX(${R - SEAT / 2}px)`,
          display: "flex", alignItems: "center",
        });
        return (
          <div
            ref={railRef}
            className="fixed top-1/2"
            style={{
              zIndex: gridOpen ? 21 : 4,
              // Ring: the mark's centre is the hub; 18 keeps its left edge on
              // the same vertical the column's glyphs sit on. Concentric: the
              // name arc's own centre, off-screen left.
              left: concentric ? effectiveArcInset - effectiveArcWheelR : "calc(var(--nav-edge, 24px) + 18px)",
              width: 0, height: 0,
              transition: concentric ? "left var(--collapse-dur, 0.5s) var(--collapse-ease, cubic-bezier(0.4, 0, 0.2, 1))" : undefined,
            }}
            onMouseEnter={() => setRailOpen(true)}
            onMouseLeave={() => { setRailOpen(false); setRailHover(null); }}
          >
            {/* Hover halo: the ring plus enough margin that the cursor can
                travel between seats without the whole thing closing. */}
            {!concentric && <div aria-hidden style={{ position: "absolute", left: -32, top: -(ringR + 32), width: ringR + 32 + 120, height: (ringR + 32) * 2, borderRadius: 999 }} />}
            {/* The wheel itself, drawn only as much as the rail is open — at
                rest the seats alone imply it. */}
            <div
              aria-hidden
              style={{
                position: "absolute", left: -R, top: -R, width: R * 2, height: R * 2,
                borderRadius: "50%", border: "1px solid rgba(95, 96, 89, 0.10)",
                opacity: railLive ? "calc(var(--rail-p, 0) * 0.8)" : comparing ? 0 : 0.8,
                transition: "opacity 200ms ease",
                pointerEvents: "none",
              }}
            />
            {!concentric && (
              <button
                type="button"
                onClick={onHome}
                aria-label="Humanoid Index"
                className="site-mark-btn cursor-pointer"
                style={{ position: "absolute", left: -20, top: -20, width: 40, height: 40, borderRadius: 20, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: INK.off, zIndex: 1 }}
              >
                <SiteMark size={20} color="#5F6059" opacity={SIDEBAR_GLYPH_OP.off} />
              </button>
            )}
            {/* One indicator that travels along the arc between lanes: a
                rotation transition interpolates the angle, so it rides the
                ring instead of cutting the chord. */}
            <div
              aria-hidden
              style={{
                position: "absolute", left: 0, top: 0, width: SEAT, height: SEAT, borderRadius: SEAT / 2,
                background: "rgba(95, 96, 89, 0.07)",
                transformOrigin: "0 50%",
                transform: `translateY(-50%) rotate(${angleAt(Math.max(0, activeLane) + (concentric ? 1 : 0))}deg) translateX(${R - SEAT / 2}px)`,
                opacity: activeLane < 0 ? 0 : 1,
                transition: "transform 320ms cubic-bezier(0.33, 1, 0.68, 1), opacity 200ms ease",
                pointerEvents: "none",
              }}
            />
            {entries.map((item, i) => {
              const a = angleAt(i);
              const hovered = item.lane != null && railHover === item.lane;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.key === "mark" ? "Humanoid Index" : item.label}
                  aria-pressed={item.active || undefined}
                  onMouseEnter={() => setRailHover(item.lane ?? null)}
                  onMouseLeave={() => { if (item.lane) setRailHover((h) => (h === item.lane ? null : h)); }}
                  className={`${item.lane ? "lane-row" : item.key === "mark" ? "site-mark-btn" : "sidebar-action"} cursor-pointer`}
                  style={{
                    ...seat(a),
                    padding: 0, border: "none", background: "transparent",
                    fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 500, lineHeight: 1,
                    whiteSpace: "nowrap",
                    color: item.active ? INK.on : hovered ? INK.hover : INK.off,
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      width: SEAT, height: SEAT, display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
                      transform: `rotate(${-a}deg)`,
                    }}
                  >
                    <span style={{ ...SIDEBAR_GLYPH_SLOT, ...railGlyphStyle(item.active ? SIDEBAR_GLYPH_OP.on : SIDEBAR_GLYPH_OP.off) }}>
                      {item.icon}
                    </span>
                  </span>
                  <span aria-hidden={comparing} style={{ ...railLabelStyle, marginLeft: railLive ? "calc(var(--rail-p, 0) * 6px)" : comparing ? 0 : 6 }}>
                    <span>{item.label}</span>
                  </span>
                  <span aria-hidden style={{ ...railCountStyle, fontSize: 12 }}>
                    {item.hint}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })() : (
      <div
        ref={railRef}
        className="fixed top-1/2 -translate-y-1/2 flex flex-col"
        style={{
          // Normally z-4, above the stage and below nothing. The grid opens at
          // 20 to clear the card layer (which reaches 12 inside this same
          // stacking context), so the column steps over it rather than being
          // buried by the view its own row opened.
          zIndex: gridOpen ? 21 : 4,
          // `zoom` scales the inset along with everything else, so the edge
          // distance is divided back out — the column steps up in size without
          // walking away from the edge it's anchored to.
          zoom: uiScale,
          left: `calc(var(--nav-edge, 24px) / ${uiScale})`,
          // No capsule, in either state. Nothing else on this page sits in a
          // container — not the card, not the arc — and glass that faded in and
          // out under the cursor was the fussiest of the three options. The
          // column is page furniture; the sliding indicator is the only fill it
          // needs, and it says the one thing containment would have said.
          // The rows carry their own 10px inset, so this only has to keep the
          // lane indicator's fill off the column's edge.
          padding: 4,
        }}
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => { setRailOpen(false); setRailHover(null); }}
      >
        {/* Identity. Glyph only — the mark is the label. It still uses the
            shared row and glyph slot, so it lines up with everything under it
            without spelling the site's name out beside itself. */}
        <button
          type="button"
          onClick={onHome}
          aria-label="Humanoid Index"
          className="site-mark-btn cursor-pointer"
          style={{ ...SIDEBAR_ROW, color: INK.off }}
        >
          <span style={SIDEBAR_GLYPH_SLOT}>
            {/* Sized to the glyph column rather than overhanging it. The mark
                is 1.55:1, so 18 wide lands it at the same optical weight as the
                18px form glyphs beneath it. */}
            <SiteMark size={18} color="#5F6059" opacity={SIDEBAR_GLYPH_OP.off} />
          </span>
        </button>

        {/* The blurb that used to sit here read "A visual index of humanoid
            robots." — which, one line under a row now labelled "Humanoid
            Index", was the same sentence twice. The name is the clue. */}
        <div aria-hidden style={{ height: SIDEBAR_GROUP_GAP }} />

        {/* How you are looking, before which lane you are looking at. It sits
            directly under the mark because it is the outermost of the two
            choices, and it is a switch rather than a row so it never competes
            with the destinations under it. Hidden in compare, where the column
            narrows to glyphs and the grid isn't reachable anyway. */}
        {gridPlacement === "toggle" && !comparing && (
          <>
            {/* 5px, not the rows' 10: the cell is 28 wide around a 15px glyph,
                so its own 6.5 of padding does the rest. What has to line up is
                the GLYPH with the mark above it and the lane pills below, not
                the box around it. */}
            <div style={{ paddingLeft: 5 }}>
              <ViewSwitch grid={gridOpen} onChange={setGridOpen} />
            </div>
            <div aria-hidden style={{ height: SIDEBAR_GROUP_GAP - 4 }} />
          </>
        )}

        {/* Lanes. Their own positioning context so the sliding indicator keeps
            indexing from 0 — putting it in the outer column would have made its
            offset depend on the height of everything stacked above it. */}
        <div style={{ position: "relative" }}>
          {/* One shared indicator that slides between segments. The selection
              travels down the rail instead of blinking off one row and on at
              another — same trick the footer capsule used to play horizontally. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 40,
              borderRadius: 20,
              background: "rgba(95, 96, 89, 0.07)",
              transform: `translateY(${Math.max(0, FORM_FILTERS.findIndex((f) => f.key === formFilter)) * 40}px)`,
              // The saved lane is not a form lane, so while it holds the wheel
              // no form row is the filter in force. The indicator fades rather
              // than sliding away: it stays where it will return to.
              opacity: savedLaneLive ? 0 : 1,
              // 320ms / cubic-bezier(0.33, 1, 0.68, 1) is the site's motion. No
              // overshoot: nothing else on the page bounces, and a sidebar that
              // did would read as the one decorated control.
              transition: "transform 320ms cubic-bezier(0.33, 1, 0.68, 1), opacity 200ms ease",
              pointerEvents: "none",
            }}
          />
          {FORM_FILTERS.map(({ key, label }) => {
            const active = formFilter === key && !savedLaneLive;
            const hovered = railHover === key;
            const count = countFor(key);
            return (
              <button
                key={key}
                onClick={() => {
                  if (comparing) { compareInLane(key); return; }
                  setFormFilter(key);
                }}
                onMouseEnter={() => setRailHover(key)}
                onMouseLeave={() => setRailHover((h) => (h === key ? null : h))}
                aria-pressed={active}
                aria-label={label}
                className="lane-row cursor-pointer"
                style={{
                  ...SIDEBAR_ROW,
                  color: active ? INK.on : hovered ? INK.hover : INK.off,
                  transition: "color 200ms cubic-bezier(0.33, 1, 0.68, 1)",
                }}
              >
                {/* The slot is always here, glyph or not: it is what holds one
                    left edge for every label down the column. In the default
                    mode the lanes go type-led and it stands empty — the form
                    glyphs are custom pictographs and every tool under them is
                    lucide line work, and putting the two families in one column
                    was the loudest thing in the rail. FormGlyph is untouched;
                    it still draws the compare header and the grid. */}
                {/* Type-led, the slot goes with the glyph rather than standing
                    empty. Holding it open to keep one left edge with the tools
                    below left a hole in front of every category and pushed the
                    pill off its own text — the alignment was right on paper and
                    read as a missing icon on screen. Flush is the better trade:
                    the pill hugs its word, and the tools' indent reads as the
                    group it is. */}
                {laneGlyphOn && (
                  <span
                    style={{
                      ...SIDEBAR_GLYPH_SLOT,
                      ...railGlyphStyle(active ? SIDEBAR_GLYPH_OP.on : SIDEBAR_GLYPH_OP.off),
                    }}
                  >
                    {/* Remount on activation so the glyph's one-shot replays;
                        hover is handled in CSS off `.lane-row`. */}
                    <FormGlyph key={active ? "on" : "off"} form={key} size={18} active={active} />
                  </span>
                )}
                {/* Label and count are separate columns now — the label is
                    fixed, the count is what opens. */}
                <span aria-hidden={comparing} style={{ ...railLabelStyle, ...(laneGlyphOn ? null : { marginLeft: 0 }) }}>
                  <span>{label}</span>
                </span>
                <span aria-hidden={comparing} style={railCountStyle}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div aria-hidden style={{ height: SIDEBAR_GROUP_GAP }} />

        {/* View. Not a filter (it doesn't change which robots you are looking
            at) and not an action (nothing leaves the page) — it is the same
            lane, seen another way. As a labelled row between the lanes and the
            actions it read as a third destination, which is the rank it does
            not have. `gridPlacement` is where it goes instead; the row is kept
            as one of the options. */}
        {gridPlacement === "row" && (
          <button
            type="button"
            onClick={() => setGridOpen((v) => !v)}
            aria-label="Grid"
            aria-pressed={gridOpen}
            onMouseEnter={() => setRailHover(null)}
            className="sidebar-action cursor-pointer"
            style={{ ...SIDEBAR_ROW, color: gridOpen ? INK.on : INK.off }}
          >
            <span style={{ ...SIDEBAR_GLYPH_SLOT, ...railGlyphStyle(gridOpen ? SIDEBAR_GLYPH_OP.on : SIDEBAR_GLYPH_OP.off) }}>
              {toolGlyphOn && <LayoutGrid size={16} strokeWidth={1.75} />}
            </span>
            <span aria-hidden={comparing} style={railLabelStyle}>
              <span>Grid</span>
            </span>
            {/* Keeps the trailing column so the row's width tracks the lanes and
                the actions as the counts open — an empty slot, not a missing one. */}
            <span aria-hidden style={{ ...railCountStyle, fontSize: 12 }} />
          </button>
        )}
        {gridPlacement === "lane-trailing" && (
          <button
            type="button"
            onClick={() => setGridOpen((v) => !v)}
            aria-label="Grid"
            aria-pressed={gridOpen}
            onMouseEnter={() => setRailHover(null)}
            className="sidebar-action cursor-pointer"
            style={{ ...SIDEBAR_ROW, height: 32, color: gridOpen ? INK.on : INK.off }}
          >
            {/* No label. Unlabelled is the point — it hangs off the lanes as
                "this lane, seen this way" rather than naming a fourth one. */}
            <span style={{ ...SIDEBAR_GLYPH_SLOT, ...railGlyphStyle(gridOpen ? SIDEBAR_GLYPH_OP.on : SIDEBAR_GLYPH_OP.off) }}>
              <LayoutGrid size={16} strokeWidth={1.75} />
            </span>
          </button>
        )}

        <div aria-hidden style={{ height: SIDEBAR_GROUP_GAP }} />

        {/* Actions. Same row, so they read as more of the column rather than as
            a menu that opened inside it — which is what the plus was for. */}
        {railActions.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            onMouseEnter={() => setRailHover(null)}
            aria-pressed={item.active || undefined}
            className="sidebar-action cursor-pointer"
            style={{
              ...SIDEBAR_ROW,
              // Open chat reads like an open lane — same ink step — but without
              // the sliding pill, which belongs to the lanes and would imply
              // Ask is a fourth category.
              color: item.active ? INK.on : INK.off,
            }}
          >
            <span style={{ ...SIDEBAR_GLYPH_SLOT, ...railGlyphStyle(item.active ? SIDEBAR_GLYPH_OP.on : SIDEBAR_GLYPH_OP.off) }}>
              {toolGlyphOn && item.icon}
            </span>
            <span aria-hidden={comparing} style={railLabelStyle}>
              <span>{item.label}</span>
            </span>
            {/* Same trailing column the lane counts open into — a shortcut is
                the action row's equivalent of a count, so it reveals with the
                same gesture instead of inventing a second one. */}
            <span aria-hidden style={{ ...railCountStyle, fontSize: 12 }}>
              {item.hint}
            </span>
          </button>
        ))}


        {/* Always on. Revealing it with the counts meant a copyright line
            animated every time the cursor crossed the column — motion on the
            one element in here that never changes, which reads as a twitch
            rather than as information arriving. Static, at the column's lowest
            ink, it costs nothing and stops moving. Still collapses in compare,
            where the whole column narrows to glyphs.
            Not aria-hidden any more: Feedback lives on this line now, and a
            hidden subtree would take the only way to reach it away from anyone
            using a screen reader. */}
        <div
          style={{
            // Out of flow. In flow, its height was part of the column's height,
            // and the column is centred on the viewport — so a credit line
            // opening from 0 to 24px moved the centre, and every row above it
            // slid up half that on approach. The one element here that never
            // changes was making everything else travel. Anchored under the
            // column instead, it can appear and disappear without the rows
            // knowing, and it no longer sets the column's width either — which
            // is what the height/width collapse dance below used to be for.
            position: "absolute",
            top: `calc(100% + ${SIDEBAR_GROUP_GAP - 8}px)`,
            left: 0,
            height: 24,
            // max-content, not the old fixed 104: the line carries Feedback now
            // and a fixed width just let it hang off the end. Out of flow, so
            // it still doesn't set the column's width.
            width: "max-content",
            opacity: railLive ? "var(--rail-p, 0)" : comparing ? 0 : 1,
            transition: "opacity 200ms ease",
            display: "flex",
            alignItems: "center",
            // 10 is the rows' own horizontal inset, so the credit starts on the
            // same vertical as the glyph column above it. 12 was off by two
            // against every other thing in the sidebar.
            paddingLeft: 10 + 4,
            fontFamily: "var(--font-geist-sans)",
            // On the same ink step as the row labels rather than a fainter one
            // of its own — 0.45 at 12px was legible in theory and invisible in
            // practice against white.
            fontSize: 13,
            lineHeight: 1.35,
            fontWeight: 450,
            color: INK.off,
            whiteSpace: "nowrap",
            gap: 6,
          }}
        >
          <span>Roy Jad © 2026</span>
          {onFeedback && (
            <>
              <span aria-hidden style={{ opacity: 0.5 }}>·</span>
              {/* Down here rather than at Search's rank. It is the one row in
                  the column nobody is looking for, and the credit line is
                  where a site's small print already lives. */}
              <button
                type="button"
                onClick={onFeedback}
                className="rail-credit-link cursor-pointer"
                style={{ font: "inherit", color: "inherit", background: "none", border: "none", padding: 0 }}
              >
                Feedback
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* Off the rail entirely — opposite corner, so the column is nothing but
          destinations. One more floating surface on the page, which is the
          trade. */}
      {gridPlacement === "float" && !comparing && (
        <div className="fixed z-[5]" style={{ top: 20, right: 20 }}>
          <ViewSwitch grid={gridOpen} onChange={setGridOpen} compact />
        </div>
      )}

      {/* Left arc nav */}
      <div className="fixed top-0 bottom-0 left-0 z-[3] pointer-events-none overflow-visible" style={{ width: 0 }}>
        <ArcDots
          list={lane}
          index={seatL}
          subscribe={springL.subscribe}
          onClickItem={(idx) => springL.jumpTo(idx)}
          variant={arcStyle}
          drumAngle={drumAngle}
          drumRadius={drumRadius}
          drumFsMax={drumFsMax}
          drumFsMin={drumFsMin}
          drumFwMax={drumFwMax}
          drumCompression={drumCompression}
          drumOpPower={drumOpPower}
          drumXOffset={effectiveDrumXOffset}
          drumTracking={drumTracking}
          drumRange={drumRange}
          drumMaskFade={drumMaskFade}
          arcInset={effectiveArcInset}
          arcWheelR={effectiveArcWheelR}
          arcStepDeg={effectiveArcStepDeg}
          arcTextGap={arcTextGap}
          arcLineOp={arcLineOp}
          arcFsMax={effectiveArcFsMax}
          arcFsMin={arcFsMin}
          arcDiskGap={arcDiskGap}
          arcDiskColor={arcDiskColor}
          arcFontFamily={arcFontFamily || undefined} arcFontWeight={arcFontWeight} arcLetterSpacing={`${arcLetterSpacing}em`} arcItalic={arcItalic}
          arcAllCaps={allCaps}
          arcMaskFade={arcMaskFade}
          arcMarkerVariant={arcMarkerVariant}
          arcMarkerColor={arcMarkerVariant === 22 ? arcMarkerColor : undefined}
          arcBoundary={arcBoundary}
          arcInactiveOp={arcInactiveOp}
          arcRestOp={arcRestOp} arcHoverBoost={arcHoverBoost} arcHoverRadius={arcHoverRadius}
          arcNameOuterOffset={arcRightAlign ? effectiveLongestNamePx : 0}
          entered={introDone}
          tagFsMin={tagFsMin} tagFsMax={tagFsMax} tagOpMin={tagOpMin} tagOpMax={tagOpMax}
          tagGreyMin={tagGreyMin} tagGreyMax={tagGreyMax} tagPillOp={tagPillOp} tagFalloff={tagFalloff}
          tagPadX={tagPadX} tagPadY={tagPadY} tagRadius={tagRadius} tagMarkerSize={tagMarkerSize} tagMarkerOp={tagMarkerOp}
        />
      </div>
      {/* Right arc nav — always mounted; opacity rides the same clock as the
          right card, slide-in/out comes from the inner SVG's `right` transition
          on arcInset (mirrors the left arc). Visibility flips after the fade so
          interior click targets don't catch events when the arc is hidden. */}
      <div
        className="fixed top-0 bottom-0 right-0 z-[3] overflow-visible"
        style={{
          width: 0,
          opacity: comparing ? 1 : 0,
          visibility: comparing ? "visible" : "hidden",
          transition: comparing
            ? "opacity var(--collapse-dur) var(--collapse-ease), visibility 0s linear 0s"
            : "opacity var(--collapse-dur) var(--collapse-ease), visibility 0s linear var(--collapse-dur)",
        }}
      >
        <ArcDots
            list={lane}
            index={springR.index}
            subscribe={springR.subscribe}
            mirrored
            onClickItem={(idx) => springR.jumpTo(idx)}
            variant={arcStyle}
            drumAngle={drumAngle}
            drumRadius={drumRadius}
            drumFsMax={drumFsMax}
            drumFsMin={drumFsMin}
            drumFwMax={drumFwMax}
            drumCompression={drumCompression}
            drumOpPower={drumOpPower}
            drumXOffset={effectiveDrumXOffset}
            drumTracking={drumTracking}
            drumRange={drumRange}
            drumMaskFade={drumMaskFade}
            arcInset={effectiveArcInset}
            arcWheelR={effectiveArcWheelR}
            arcStepDeg={effectiveArcStepDeg}
            arcTextGap={arcTextGap}
            arcLineOp={arcLineOp}
            arcFsMax={effectiveArcFsMax}
            arcFsMin={arcFsMin}
            arcDiskGap={arcDiskGap}
            arcDiskColor={arcDiskColor}
            arcFontFamily={arcFontFamily || undefined} arcFontWeight={arcFontWeight} arcLetterSpacing={`${arcLetterSpacing}em`} arcItalic={arcItalic}
            arcAllCaps={allCaps}
            arcMaskFade={arcMaskFade}
            arcMarkerVariant={arcMarkerVariant}
            arcMarkerColor={arcMarkerVariant === 22 ? arcMarkerColor : undefined}
            arcBoundary={arcBoundary}
            arcInactiveOp={arcInactiveOp}
            arcRestOp={arcRestOp} arcHoverBoost={arcHoverBoost} arcHoverRadius={arcHoverRadius}
            arcNameOuterOffset={arcRightAlign ? effectiveLongestNamePx : 0}
            entered={introDone}
            tagFsMin={tagFsMin} tagFsMax={tagFsMax} tagOpMin={tagOpMin} tagOpMax={tagOpMax}
            tagGreyMin={tagGreyMin} tagGreyMax={tagGreyMax} tagPillOp={tagPillOp} tagFalloff={tagFalloff}
            tagPadX={tagPadX} tagPadY={tagPadY} tagRadius={tagRadius} tagMarkerSize={tagMarkerSize} tagMarkerOp={tagMarkerOp}
          />
        </div>

      {/* ── Add compare button — hover zone right of center ── */}
      {!comparing && (() => {
        const alwaysMode = addCtaMode === "always";
        const addShown = alwaysMode || addHover;
        const baseScale = alwaysMode ? 1 : (addShown ? 1 : 0.75);
        const hoverScale = addHover ? 1.015 : 1;
        const liftY = addHover ? -1 : 0;
        return (
          <div
            className="absolute flex items-center justify-start cursor-pointer"
            // Anchored to the content block, not to the viewport. This used to
            // be `right: calc(19% - 67px)` — a percentage of window width set
            // against a card whose right edge comes from `centerHalfWidth`, so
            // the gap between the two drifted every time the window changed
            // size (72px at 1494 wide, growing from there). Now it sits a fixed
            // COMPARE_SLOT_GAP right of where the card + stats actually end.
            // The hit zone runs from the slot to the right edge of the window
            // and the full height of the card. It used to be 110x100 — a target
            // you had to already know about to land on, which is a poor way to
            // reveal something on hover. The glyph still sits at the slot
            // (justify-start + a fixed-width inner), only the region that wakes
            // it up got bigger.
            style={{ width: Math.max(110, windowWidth - compareSlotLeft), height: Math.max(100, compareCardH), top: "50%", transform: "translateY(-50%)", left: compareSlotLeft, zIndex: 12 }}
            onClick={() => { setAddHover(false); enterCompare(); }}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
          >
            {/* The empty slot, drawn. A bare "+" floating in white asks you to
                already know what it does; a vacant card-shaped surface at the
                exact size and radius of the card that will land there shows
                you. It reads as a pedestal with nothing on it — which is what
                it is — and it gives the composition a right-hand edge instead
                of trailing off. Fill sits well under the card's own #F9F9F9, so
                an occupied card never reads as an empty one. */}
            {compareSlotStyle === "silhouette" && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  width: compareCardW,
                  height: compareCardH,
                  marginTop: -compareCardH / 2,
                  borderRadius: cardRadius,
                  background: addHover ? "rgba(0,0,0,0.032)" : "rgba(0,0,0,0.018)",
                  transition: "background 200ms ease",
                  pointerEvents: "none",
                }}
              />
            )}
            <div
              className="flex flex-col items-center"
              style={{
                gap: 9,
                // Fixed width so items-center still centres the glyph on the
                // slot now that the outer box stretches to the window edge.
                width: compareSlotStyle === "silhouette" ? compareCardW : 110,
                position: "relative",
                transform: `translateY(${liftY}px) scale(${baseScale * hoverScale})`,
                // Hover mode leaves a ghost rather than nothing. Fully hidden
                // makes compare undiscoverable — the whole interaction lives on
                // someone finding this slot. With the silhouette drawn, the
                // shape carries that job and the glyph can sit higher; without
                // it, 0.16 is the most that can be left without giving the
                // composition a tail.
                opacity: addHover ? 1 : (alwaysMode ? 0.7 : (compareSlotStyle === "silhouette" ? 0.55 : 0.16)),
                transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease, width var(--collapse-dur) var(--collapse-ease)",
              }}
            >
              {(() => {
                const ico = cardIconRender();
                // Both variants are built from scratch — DO NOT spread
                // ico.style. ico.style emits a `border` shorthand alongside a
                // `borderColor` longhand, and the longhand wins the cascade
                // no matter where the override sits. Only iconBoxPx is reused.
                const baseStyle: React.CSSProperties = {
                  width: cardIconSize,
                  height: cardIconSize,
                  borderRadius: 999,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 180ms ease, border-color 180ms ease, color 180ms ease, opacity 325ms cubic-bezier(0.4, 0, 0.2, 1), transform 325ms cubic-bezier(0.4, 0, 0.2, 1)",
                };
                const flatStyle: React.CSSProperties = {
                  ...baseStyle,
                  border: "none",
                  background: "rgba(0,0,0,0.06)",
                  color: "rgba(0,0,0,0.62)",
                  ["--ci-bg-hover" as string]: "rgba(0,0,0,0.09)",
                  ["--ci-border-hover" as string]: "transparent",
                  ["--ci-color-hover" as string]: "rgba(0,0,0,0.78)",
                };
                const glassStyle: React.CSSProperties = {
                  ...baseStyle,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "transparent",
                  color: "rgba(0,0,0,0.4)",
                  ["--ci-bg-hover" as string]: "rgba(0,0,0,0.03)",
                  ["--ci-border-hover" as string]: "rgba(0,0,0,0.2)",
                  ["--ci-color-hover" as string]: "rgba(0,0,0,0.55)",
                };
                return (
                  <div
                    className={ico.className}
                    style={compareBtnStyle === "flat" ? flatStyle : glassStyle}
                  >
                    <Plus size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                  </div>
                );
              })()}
              <span style={{
                fontSize: 12,
                color: "rgba(95, 96, 89, 0.8)",
                fontWeight: 500,
                letterSpacing: "normal",
                userSelect: "none",
              }}>
                Compare
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── Humanoid groups: [stats | robot] per side ── */}
      {(() => {
        const bodyStyle = { color: "var(--c-ink-muted)", lineHeight: 1.4 } as const;
        const ico = (d: string) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.45 }}><path d={d} /></svg>;
        const icoInfo = ico("M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v2m0 4h.01");
        const icoRuler = ico("M6 3v18 M6 9h4 M6 15h4 M18 3v18 M18 9h-4 M18 15h-4");
        const icoDof = ico("M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83");
        const icoSpeed = ico("M12 12l4-8M19.07 4.93A10 10 0 1 0 20.45 13");
        const icoStatus = ico("M22 12h-4l-3 9L9 3l-3 9H2");

        const plusMinus = (open: boolean) => (
          <svg width="14" height="14" viewBox="0 0 10 10" style={{ flexShrink: 0, overflow: "visible" }}>
            <line x1="1.5" y1="5" x2="8.5" y2="5" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="5" y1="1.5" x2="5" y2="8.5" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round"
              style={{ transformOrigin: "5px 5px", transition: `transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)`, transform: open ? "rotate(90deg)" : "rotate(0deg)" }} />
          </svg>
        );

        const toggleStat = (key: string) => {
          setOpenStat((prev) => prev.has(key) ? new Set() : new Set([key]));
          setPillFlash((f) => ({ statKey: key, id: f.id + 1 }));
        };

        const renderExpandIndicator = ({ isExpanded, isHovered }: { isExpanded: boolean; isHovered: boolean }) => {
          const variant = blurbExpandIndicator;
          if (variant === "pill") {
            return (
              <span
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: Math.max(11, blurbFontSize - 1),
                  color: "var(--c-ink-muted)",
                  fontWeight: 450,
                  background: "rgba(255,255,255,0.92)",
                  padding: "2px 7px",
                  borderRadius: 999,
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "none",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  {isExpanded ? (
                    <>
                      <polyline points="2 4.5 4.5 4.5 4.5 2" />
                      <polyline points="10 7.5 7.5 7.5 7.5 10" />
                      <line x1="4.5" y1="4.5" x2="2" y2="2" />
                      <line x1="7.5" y1="7.5" x2="10" y2="10" />
                    </>
                  ) : (
                    <>
                      <polyline points="7.5 2 10 2 10 4.5" />
                      <polyline points="4.5 10 2 10 2 7.5" />
                      <line x1="10" y1="2" x2="6.8" y2="5.2" />
                      <line x1="2" y1="10" x2="5.2" y2="6.8" />
                    </>
                  )}
                </svg>
                {isExpanded ? "Collapse" : "Expand"}
              </span>
            );
          }
          if (variant === "chevron" || variant === "minimal") {
            const baseOp = variant === "chevron" ? 0.4 : 0;
            const hoverOp = 0.75;
            return (
              <span
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 8,
                  width: 14,
                  height: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--c-ink-body)",
                  opacity: isHovered ? hoverOp : (isExpanded ? hoverOp : baseOp),
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "opacity 0.2s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  pointerEvents: "none",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 5 6 8 9 5" />
                </svg>
              </span>
            );
          }
          if (variant === "edgebar") {
            return (
              <span
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: 0,
                  right: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  pointerEvents: "none",
                }}
              >
                <svg
                  width="10" height="6" viewBox="0 0 12 7"
                  fill="none" stroke="#888" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "opacity 0.2s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <polyline points="2 1.5 6 5 10 1.5" />
                </svg>
                <span
                  style={{
                    height: 2,
                    width: isHovered ? 36 : 22,
                    borderRadius: 999,
                    background: isHovered ? "#888" : "#d4d4d4",
                    transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease",
                  }}
                />
              </span>
            );
          }
          if (variant === "inline") {
            return (
              <span
                style={{
                  position: "absolute",
                  bottom: statPillPadY,
                  right: statPillPadX,
                  paddingLeft: 28,
                  fontSize: Math.max(11, blurbFontSize - 1),
                  color: isHovered ? "#666" : "#a8a8a8",
                  fontWeight: 450,
                  fontStyle: "italic",
                  letterSpacing: "0.01em",
                  background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.98) 100%)",
                  transition: "color 0.2s ease",
                  pointerEvents: "none",
                }}
              >
                {isExpanded ? "less" : "more"}
              </span>
            );
          }
          return null;
        };


        const statSections = (h: typeof humanoids[0]) => {
        const heightPct = Math.min(((h.height ?? 0) / 200) * 100, 100);
        const weightPct = Math.min(((h.weight ?? 0) / 120) * 100, 100);
        const dofPct = Math.min(((h.dof ?? 0) / 50) * 100, 100);
        const speedPct = Math.min(((h.maxSpeed ?? 0) / 5) * 100, 100);
        const statusColor = h.status === "In Production" ? "#34c759" : h.status === "Prototype" ? "#ff9500" : h.status === "Concept" ? "#5e5ce6" : h.status === "Anticipated" ? "#af52de" : "#8e8e93";

        const barViz = (label: string, value: string, _pct: number, delay: number) => (
          <div
            className="flex items-baseline"
            style={{
              paddingTop: 5,
              paddingBottom: 5,
              gap: 14,
              opacity: openStat.has("stats") ? 1 : 0,
              transform: openStat.has("stats") ? "translateY(0)" : "translateY(-2px)",
              transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
            }}
          >
            <span className="text-[12px]" style={{ color: "var(--c-ink-muted)", width: 52, flexShrink: 0 }}>{label}</span>
            <span className="text-[12px] tabular-nums" style={{ color: "var(--c-ink-body)" }}>{value}</span>
          </div>
        );

        const robotDesc = getRobotDescription(h);
        return [
          { key: "desc", show: !!robotDesc.text, bubble: !!robotDesc.long, label: (
            <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>Info</p>
          ), detail: (() => {
            const isExpanded = expandedBlurbs.has(h.id);
            const canExpand = !!robotDesc.long;
            const fullText = canExpand ? robotDesc.long : robotDesc.text;
            const collapsedH = blurbFontSize * 1.5 * 2;
            const isHovered = canExpand && hoveredBlurbId === h.id;
            const Wrapper = (canExpand ? "button" : "div") as React.ElementType;
            const wrapperProps = canExpand
              ? {
                  type: "button" as const,
                  onClick: (e: React.MouseEvent) => { e.stopPropagation(); toggleBlurbExpand(h.id); },
                  onMouseEnter: () => setHoveredBlurbId(h.id),
                  onMouseLeave: () => setHoveredBlurbId(null),
                }
              : {};
            return (
              <Wrapper
                key={h.id}
                {...wrapperProps}
                style={{
                  ...(canExpand ? {
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    padding: `${statPillPadY}px ${statPillPadX}px`,
                    marginLeft: -statPillPadX,
                    marginRight: -statPillPadX,
                    textAlign: "left" as const,
                    width: `calc(100% + ${statPillPadX * 2}px)`,
                    cursor: "pointer",
                    display: "block",
                    position: "relative",
                    zIndex: 12,
                    WebkitTapHighlightColor: "transparent",
                  } : {}),
                  opacity: blurbReady ? 1 : 0,
                  transform: blurbReady ? "translateY(0) scale(1)" : "translateY(-3px) scale(0.985)",
                  filter: blurbReady ? "blur(0)" : "blur(2px)",
                  transition: canExpand
                    ? "box-shadow 0.2s ease, opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s cubic-bezier(0.22, 1, 0.36, 1)"
                    : "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div
                  style={{
                    maxHeight: isExpanded ? 320 : collapsedH,
                    overflow: "hidden",
                    transition: "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), -webkit-mask-image 0.3s ease, mask-image 0.3s ease",
                    WebkitMaskImage: canExpand && !isExpanded ? "linear-gradient(to bottom, #000 78%, transparent 100%)" : "none",
                    maskImage: canExpand && !isExpanded ? "linear-gradient(to bottom, #000 78%, transparent 100%)" : "none",
                  }}
                >
                  <p
                    className="leading-[1.5]"
                    style={{ fontSize: blurbFontSize, color: bubble.ink || "var(--c-ink)", opacity: 0.6, fontWeight: 500, letterSpacing: "0.015em" }}
                  >
                    {fullText}
                  </p>
                </div>
                {canExpand && renderExpandIndicator({ isExpanded, isHovered })}
              </Wrapper>
            );
          })() },
          { key: "stats", show: !!(h.height || h.weight || h.dof || h.maxSpeed), label: (
            <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>Stats</p>
          ), detail: (
            <div>
              {h.height ? barViz("Height", formatHeight(h.height), heightPct, 0.05) : null}
              {h.weight ? barViz("Weight", formatWeight(h.weight), weightPct, 0.12) : null}
              {h.dof ? barViz("DOF", `${h.dof}`, dofPct, 0.19) : null}
              {h.maxSpeed ? barViz("Speed", formatSpeed(h.maxSpeed), speedPct, 0.26) : null}
            </div>
          ) },
          ...(yearPlacement === "pill" ? [{
            key: "year",
            show: !!h.year,
            label: (
              <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>Year</p>
            ),
            preview: h.year ? (
              <span className="text-[12px]" style={{ color: "var(--c-ink-body)", fontWeight: 500 }}>{h.year}</span>
            ) : null,
            detail: null as React.ReactNode,
          }] : []),
          { key: "status", show: !!h.status, label: (
            <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>Status</p>
          ), preview: h.status ? (
            <span className="inline-flex items-center" style={{ gap: 6 }}>
              <span className="relative flex h-2 w-2">
                {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: statusColor, opacity: 0.4 }} />}
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: statusColor }} />
              </span>
              <span className="text-[12px]" style={{ color: "var(--c-ink-body)", fontWeight: 500 }}>{h.status}</span>
            </span>
          ) : null, detail: (
            <div>
              <div className="flex items-center gap-2.5" style={{ marginTop: 4 }}>
                <span className="relative flex h-2.5 w-2.5">
                  {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: statusColor, opacity: 0.4 }} />}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: statusColor }} />
                </span>
                <p className="text-[12px] font-medium" style={{ color: "var(--c-ink-body)" }}>{h.status}</p>
              </div>
              <p key={h.id} className="text-[12px] mt-2 info-fade-in" style={{ color: "var(--c-ink-muted)", fontWeight: 450 }}>{h.status === "In Production" ? "Commercially available and actively deployed." : h.status === "Prototype" ? "In active development — not yet commercially available." : h.status === "Concept" ? "Early-stage design, not yet built." : h.status === "Anticipated" ? "Teased for future release — details not yet revealed." : "No longer in active production."}</p>
            </div>
          ) },
          // Purchase — collapsed by default so price/buy info opts in like every
          // other pill, keeping the initial column quiet. Only added when buy
          // layout is "card" (the "chip" variant lives on the image itself).
          ...(buyLayout === "card" ? [(() => {
            // Sunday Memo isn't for sale — the founding-family beta is the only way in,
            // so the cost pill becomes a link to their beta program instead of a price.
            const isSundayBeta = h.manufacturer === "Sunday Robotics";
            const buyHref = withUtm(isSundayBeta ? "https://www.sunday.ai/beta-program" : (h.purchaseUrl || undefined), h.id);
            const visitHref = !buyHref ? withUtm(h.infoUrl || h.manufacturerUrl, h.id) : undefined;
            const href = buyHref || visitHref;
            const hasCost = h.cost && h.cost !== "N/A";
            const hasUrl = !!href;
            const ctaKind: "buy" | "visit" = buyHref ? "buy" : "visit";
            const isRotaku = h.manufacturer === "Rotaku";
            const ctaText =
              isSundayBeta ? "Apply for Beta" :
              ctaKind === "visit" ? "Visit" :
              isRotaku ? "Reserve" : "Buy";
            const avail = availabilityLabel(h);
            // Left-side text in split mode: price first, then availability label, then nothing.
            const leftLabel = hasCost ? h.cost! : avail;
            const text = isSundayBeta ? "Apply to the 2026 Beta" : (hasCost ? h.cost! : (avail ?? (hasUrl ? ctaText : "Not for sale")));
            // Separate cost vs state so the renderer can keep cost on the left
            // and put the availability label inside a non-link chip on the right
            // for URL-less entries — keeps the row rhythm consistent while scrolling.
            const stateLabel = avail ?? (hasUrl ? undefined : "Not for sale");
            return {
              key: "purchase",
              show: true,
              href,
              text,
              price: leftLabel,
              cost: hasCost ? h.cost! : undefined,
              state: stateLabel,
              ctaText,
              ctaKind,
              label: (
                <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: hasUrl ? pillLabelColor : "#c0c0c0", textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>{text}</p>
              ),
              detail: null as React.ReactNode,
            };
          })()] : []),
        ];
        };

        const cardMorph = "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), padding 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin-bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

        const alignJustify = statsAlign === "center" ? "center" : statsAlign === "bottom" ? "flex-end" : "flex-start";

        const renderStats = (h: typeof humanoids[0]) => {
          const sections = statSections(h);
          const robotDesc = getRobotDescription(h);
          const pillBg = statPillBg;
          const pillBackdrop: string | undefined = undefined;
          const statusColor = h.status === "In Production" ? "#34c759" : h.status === "Prototype" ? "#ff9500" : h.status === "Concept" ? "#5e5ce6" : h.status === "Anticipated" ? "#af52de" : "#8e8e93";
          const useSplit = splitBlurb && blurbFloat && !!robotDesc.text;
          const blurbNode = blurbFloat && robotDesc.text && (() => {
                const isExpanded = expandedBlurbs.has(h.id);
                const canExpand = !!robotDesc.long;
                const fullText = canExpand ? robotDesc.long : robotDesc.text;
                const collapsedH = blurbFontSize * 1.5 * 2;
                const isHovered = canExpand && hoveredBlurbId === h.id;
                const Wrapper = (canExpand ? "button" : "div") as React.ElementType;
                const wrapperProps = canExpand
                  ? {
                      type: "button" as const,
                      onClick: (e: React.MouseEvent) => { e.stopPropagation(); toggleBlurbExpand(h.id); },
                      onMouseEnter: () => setHoveredBlurbId(h.id),
                      onMouseLeave: () => setHoveredBlurbId(null),
                    }
                  : {};
                return (
                  <Wrapper
                    className="pointer-events-auto"
                    {...wrapperProps}
                    style={{
                      position: "relative",
                      zIndex: 11,
                      padding: `${statPillPadY}px ${statPillPadX}px`,
                      ...(canExpand ? {
                        background: "transparent",
                        boxShadow: "none",
                        border: "none",
                        textAlign: "left" as const,
                        width: "100%",
                        cursor: "pointer",
                        display: "block",
                        WebkitTapHighlightColor: "transparent",
                      } : {}),
                      opacity: blurbReady ? 1 : 0,
                      transform: blurbReady ? "translateY(0) scale(1)" : "translateY(-3px) scale(0.985)",
                      filter: blurbReady ? "blur(0)" : "blur(2px)",
                      transition: canExpand
                        ? "box-shadow 0.2s ease, opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s cubic-bezier(0.22, 1, 0.36, 1)"
                        : "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <div
                      style={{
                        maxHeight: isExpanded ? 320 : collapsedH,
                        overflow: "hidden",
                        transition: "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), -webkit-mask-image 0.3s ease, mask-image 0.3s ease",
                        WebkitMaskImage: canExpand && !isExpanded ? "linear-gradient(to bottom, #000 78%, transparent 100%)" : "none",
                        maskImage: canExpand && !isExpanded ? "linear-gradient(to bottom, #000 78%, transparent 100%)" : "none",
                      }}
                    >
                      <p
                        key={`blurb-float-${h.id}`}
                        className="leading-[1.5] info-fade-in"
                        style={{ fontSize: blurbFontSize, color: bubble.ink || "var(--c-ink)", opacity: 0.6, fontWeight: 500, letterSpacing: "0.015em" }}
                      >
                        {fullText}
                      </p>
                    </div>
                    {canExpand && renderExpandIndicator({ isExpanded, isHovered })}
                  </Wrapper>
                );
              })();
          const labelNode = labelPosition === "stack" && (
                <div className="ui-frost flex items-center gap-3 pointer-events-auto" style={{ borderRadius: cardRadius, background: pillBg, backdropFilter: pillBackdrop, WebkitBackdropFilter: pillBackdrop, padding: "10px 12px", flexShrink: 0, position: "relative", zIndex: 11 }}>
                  <div className="logo-placeholder flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: labelLogoSize, height: labelLogoSize, borderRadius: cardRadius * 0.6 }}>
                    {h.logoUrl ? (
                      <LogoImage src={h.logoUrl} alt={h.manufacturer} sizes={`${labelLogoSize}px`} />
                    ) : (
                      <svg width={Math.round(labelLogoSize / 2)} height={Math.round(labelLogoSize / 2)} viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                        <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                        <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, textTransform: allCaps ? "uppercase" : undefined }}>
                      {h.name}
                      {yearPlacement === "after-name" && h.year ? <span style={{ marginLeft: 6, opacity: 0.42, fontWeight: 400 }}>{h.year}</span> : null}
                    </p>
                    <p className="text-[13px] font-medium mt-0.5 truncate flex items-center" style={{ color: "var(--c-ink)", lineHeight: 1.2, textTransform: allCaps ? "uppercase" : undefined, opacity: 0.42, gap: 6 }}>
                      <span className="truncate">{h.manufacturer}{yearPlacement === "beside" && h.year ? ` · ${h.year}` : ''}</span>
                      {stackedInfo && statusPlacement === "label" && h.status && (
                        <span className="relative flex h-2 w-2 flex-shrink-0" title={h.status}>
                          {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: statusColor, opacity: 0.4 }} />}
                          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: statusColor }} />
                        </span>
                      )}
                    </p>
                    {yearPlacement === "below" && h.year ? (
                      <p className="text-[12px] font-medium mt-0.5 truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, opacity: 0.32 }}>{h.year}</p>
                    ) : null}
                  </div>
                  {h.id.startsWith("legend") && <span className="flex-shrink-0 text-[12px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: "#b08d57", background: "rgba(176,141,87,0.1)", letterSpacing: "0.06em" }}>Legend</span>}
                </div>
              );
          // The last visible pill in the column should anchor to the card's bottom corners
          // (cardRadius), keeping its top corners on the smaller statPillRadius rhythm.
          // Computed once so every variant (pill/split/etc.) can share the formula.
          const isPillVisible = (s: typeof sections[number]) => {
            if (blurbFloat && s.key === "desc") return false;
            const empty = !s.show;
            const hideLabel = s.key === "desc" && infoMode === "bare";
            if (empty && hideLabel) return false;
            return true;
          };
          // Split variant consolidates the Status pill's dot/info into the Buy pill, so we
          // also drop "status" from the layout calculations to keep fusion + last-pill
          // anchoring correct.
          const splitConsolidatesStatus = splitConsolidate && actionVariant === "split" && sections.some((s) => s.key === "purchase" && s.show);
          const visibleKeys = sections.filter(isPillVisible).map((s) => s.key).filter((k) => !(splitConsolidatesStatus && k === "status"));
          const lastVisibleKey = visibleKeys[visibleKeys.length - 1];
          const pillRadiusFor = (_key: string, isOpen: boolean) => {
            return isOpen ? statPillRadiusOpen : statPillRadius;
          };
          // Single source of truth for pill row height. Action pills (with a button) used
          // to be ~4px shorter than the standard pills; we match them on a tighter target
          // close to the previous action-pill feel.
          const pillRowHeight = statPillPadY * 2 + Math.round(pillLabelFontSize * 1.2);
          const grouped = pillsLayout === "grouped";
          const pillsNode = (
              <div
                className={`ui-frost flex flex-col pointer-events-auto${grouped ? " pills-grouped" : ""}`}
                data-divider={grouped ? groupedDivider : undefined}
                data-ring={grouped ? String(groupedRing) : undefined}
                style={{
                  gap: grouped ? 0 : statPillGap,
                  position: "relative",
                  zIndex: 11,
                  marginTop: blurbFloat && !useSplit ? "auto" : undefined,
                  ...(grouped ? ({ ["--grouped-fill" as string]: groupedFill } as React.CSSProperties) : {}),
                }}
              >
                {sections.map((s) => {
                  if (blurbFloat && s.key === "desc") return null;
                  const empty = !s.show;
                  const hideLabel = s.key === "desc" && infoMode === "bare";
                  if (empty && hideLabel) return null;
                  // Split variant consolidates Status into the Buy pill (colored dot prepended
                  // to the price/label), so drop the standalone Status row in single view.
                  if (splitConsolidatesStatus && s.key === "status") return null;
                  const isLast = s.key === lastVisibleKey;
                  const forcedOpen = s.key === "desc" && infoMode !== "pill" && !empty;
                  const isOpen = !empty && openStat.has(s.key);
                  const isLink = !!((s as { href?: string }).href);
                  const interactive = !forcedOpen && !empty && !isLink && s.key !== "purchase" && s.key !== "year";
                  const isAction = s.key === "purchase" && isLink;
                  const actionAccent = isAction && actionVariant === "accent";
                  const actionDark = isAction && actionVariant === "dark";
                  const actionHairline = isAction && actionVariant === "hairline";
                  // In split mode, always render the purchase pill via the split branch — even
                  // with no URL — so the row math matches the URL'd version (otherwise the
                  // fall-through to the standard pillEl produces a slightly taller row).
                  const actionSplit = s.key === "purchase" && actionVariant === "split";
                  const actionLabelColor = actionAccent ? "var(--c-accent)" : pillLabelColor;
                  const actionPillBg = actionDark ? "#ECECEC" : pillBg;
                  const actionText = isAction ? ((s as { text?: string }).text ?? "") : "";
                  // Text-link variant: render the action as plain inline text + arrow,
                  // sitting at the bottom of the column where the pill would otherwise live.
                  if (isAction && actionVariant === "text") {
                    const href = (s as any).href as string;
                    const text = (s as { text?: string }).text ?? "";
                    return (
                      <a
                        key={s.key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center"
                        style={{ gap: 4, padding: `8px ${statPillPadX}px`, color: "var(--c-ink-muted)", fontSize: 12, fontWeight: 450, textDecoration: "none", alignSelf: "flex-start" }}
                      >
                        {text}
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                          <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
                        </svg>
                      </a>
                    );
                  }
                  // Split variant: Apple-style price text + accent "Buy" button inside one pill.
                  if (actionSplit) {
                    const href = (s as any).href as string | undefined;
                    const price = (s as { price?: string }).price;
                    const cost = (s as { cost?: string }).cost;
                    const state = (s as { state?: string }).state;
                    const fallbackText = (s as { text?: string }).text ?? "";
                    const cta = (s as { ctaText?: string }).ctaText ?? "Buy";
                    const ctaBg = "rgba(0,0,0,0.06)";
                    const ctaColor = "rgba(95, 96, 89, 0.8)";
                    const Outer = "div" as React.ElementType;
                    const outerProps = href
                      ? { href, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
                      : {};
                    const labelText = href ? (price ?? " ") : (cost ?? " ");
                    const staticChipText = !href ? (state ?? fallbackText) : undefined;
                    const labelColor = (href || cost) ? pillLabelColor : "#c0c0c0";
                    return (
                      <Outer
                        key={s.key}
                        className="w-full"
                        style={{
                          background: pillBg,
                          borderRadius: pillRadiusFor(s.key, false),
                          padding: (href || staticChipText)
                            ? `0 ${Math.max(0, statPillPadY - 6)}px 0 ${statPillPadX}px`
                            : `0 ${statPillPadX}px`,
                          display: "block",
                        }}
                      >
                        <div className="w-full flex items-center justify-between" style={{ minHeight: pillRowHeight, gap: 8 }}>
                          <span className="inline-flex items-center" style={{ gap: 8, fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: labelColor, textTransform: pillLabelUppercase ? "uppercase" : "none" }}>
                            {splitConsolidatesStatus && h.status && (
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: statusColor, opacity: 0.4 }} />}
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: statusColor }} />
                              </span>
                            )}
                            <span>{labelText}</span>
                          </span>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="cta-link cursor-pointer"
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, color: ctaColor, padding: "6px 4px", fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: 500, letterSpacing: `${pillLabelLetterSpacing}em`, lineHeight: 1.2, textDecoration: "none", WebkitTapHighlightColor: "transparent" }}
                            >
                              <span>{cta}</span>
                              <span className="cta-chip" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: ctaBg, flexShrink: 0 }}>
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                                  <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                                </svg>
                              </span>
                            </a>
                          ) : staticChipText ? (
                            <span
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: ctaColor, padding: "6px 10px", fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: 500, letterSpacing: `${pillLabelLetterSpacing}em`, lineHeight: 1.2, borderRadius: 999, background: ctaBg }}
                            >
                              {staticChipText}
                            </span>
                          ) : null}
                        </div>
                      </Outer>
                    );
                  }
                  const Tag = (isLink ? "a" : interactive ? "button" : "div") as React.ElementType;
                  const pillEl = (
                    <Tag
                      key={s.key}
                      {...(isLink
                        ? { href: (s as any).href, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
                        : interactive ? { type: "button" as const, onClick: () => toggleStat(s.key) } : {})}
                      className={(isLink || interactive) ? `pill-button${isAction ? " pill-action" : ""} w-full text-left` : "w-full text-left"}
                      style={{
                        ["--pill-bg" as string]: s.key === "desc" ? "transparent" : actionPillBg,
                        background: s.key === "desc" ? "transparent" : ((isLink || interactive) ? undefined : pillBg),
                        backdropFilter: s.key === "desc" ? undefined : pillBackdrop,
                        WebkitBackdropFilter: s.key === "desc" ? undefined : pillBackdrop,
                        border: "none",
                        borderRadius: pillRadiusFor(s.key, isOpen),
                        padding: `0 ${statPillPadX}px`,
                        overflow: s.key === "desc" ? "visible" : "hidden",
                        cursor: (isLink || interactive) ? "pointer" : "default",
                        textDecoration: "none",
                        position: "relative",
                        display: "block",
                        transition: "background 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {interactive && pillFlash.statKey === s.key && (
                        <span
                          key={`flash-${pillFlash.id}`}
                          aria-hidden
                          className="pill-flash"
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: pillRadiusFor(s.key, isOpen),
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      {!hideLabel && (
                        <div className="w-full flex items-center justify-between" style={{ minHeight: pillRowHeight, position: "relative", textTransform: pillLabelUppercase ? "uppercase" : "none", fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: actionLabelColor }}>
                          {actionAccent ? (
                            <span className="inline-flex items-center" style={{ gap: 6, color: actionLabelColor, fontSize: pillLabelFontSize, lineHeight: 1.2 }}>
                              <span aria-hidden style={{ fontSize: pillLabelFontSize, opacity: 0.85 }}>↗</span>
                              {actionText}
                            </span>
                          ) : s.label}
                          {isLink ? (
                            <svg className={isAction ? "pill-arrow" : undefined} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.55 }}>
                              <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
                            </svg>
                          ) : s.key === "purchase" ? null : !forcedOpen && (empty ? <span className="text-[12px]" style={{ color: "var(--c-ink-subtle)" }}>—</span> : ((s as { preview?: React.ReactNode }).preview && !isOpen ? (s as { preview?: React.ReactNode }).preview : plusMinus(isOpen)))}
                        </div>
                      )}
                      {forcedOpen ? (
                        <div style={{ padding: s.key === "desc" ? ((s as { bubble?: boolean }).bubble ? 0 : `${statPillPadY}px 0`) : (hideLabel ? `${statPillPadY}px 0` : "0 0 12px 0"), position: "relative" }}>{s.detail}</div>
                      ) : (
                        <div style={{
                          display: "grid",
                          gridTemplateRows: isOpen ? "1fr" : "0fr",
                          transition: "grid-template-rows 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
                          position: "relative",
                        }}>
                          <div style={{ overflow: "hidden", minHeight: 0 }}>
                            <div
                              className="pb-3"
                              style={{
                                opacity: isOpen ? 1 : 0,
                                transform: isOpen ? "translateY(0)" : "translateY(-4px)",
                                transition: "opacity 0.22s cubic-bezier(0.32, 0.72, 0, 1), transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                              }}
                            >
                              {s.detail}
                            </div>
                          </div>
                        </div>
                      )}
                    </Tag>
                  );
                  return actionHairline ? (
                    <Fragment key={s.key}>
                      <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "6px 2px 2px" }} />
                      {pillEl}
                    </Fragment>
                  ) : pillEl;
                })}
              </div>
          );
          if (useSplit) {
            return (
              <div className="flex flex-row h-full" style={{ width: effectiveStatsW, minWidth: effectiveStatsW, gap: cardGap }}>
                <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, justifyContent: alignJustify }}>
                  {blurbNode}
                </div>
                <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, gap: cardGap, justifyContent: alignJustify }}>
                  {labelNode}
                  {pillsNode}
                </div>
              </div>
            );
          }

          // Sunday-style stacked layout: chromeless column anchored to the card's
          // top/bottom edges. Eyebrow labels + hairline rules carry the structure
          // that the gray cards used to.
          if (stackedInfo) {
            const cardBase: React.CSSProperties = {
              padding: 0,
              background: "transparent",
            };
            const stackGap = 16;
            const sectionContentGap = 2;
            const sectionContentMarginTop = 10;
            const cardFontSize = engineerMode ? 14 : 15;
            const headerStyle: React.CSSProperties = {
              fontFamily: "var(--font-geist-sans)",
              fontSize: 10.5,
              fontWeight: 500,
              color: "var(--c-ink-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            };
            const hairlineRule = (
              <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />
            );
            const rowHeight = Math.round(cardFontSize * 1.55);
            const rowStyle: React.CSSProperties = {
              display: "grid",
              gridTemplateColumns: "78px minmax(0, 1fr)",
              alignItems: "baseline",
              columnGap: 14,
              fontFamily: "var(--font-geist-sans)",
              lineHeight: 1.55,
              whiteSpace: "nowrap",
              justifyItems: "end",
              // Fixed row height keeps the column from jutting when scrolling
              // between humanoids where some values (flags, em-dashes) sit at
              // slightly different intrinsic heights.
              minHeight: rowHeight,
              height: rowHeight,
            };
            const dimmed: React.CSSProperties = {
              fontFamily: "var(--font-geist-sans)",
              fontSize: cardFontSize,
              fontWeight: 500,
              color: "var(--c-ink-body)",
              opacity: 0.7,
              minWidth: 64,
              flexShrink: 0,
              justifySelf: "start",
            };
            const valueStyle: React.CSSProperties = {
              fontFamily: "var(--font-geist-sans)",
              fontSize: cardFontSize,
              fontWeight: 500,
              // Use color-mix with transparent instead of `opacity` so the
              // dimming only applies to text + currentColor SVGs — leaves
              // flags and other explicit-color assets at full opacity.
              color: "color-mix(in srgb, var(--c-ink) 68%, transparent)",
            };
            const purchaseSection = sections.find((s) => s.key === "purchase") as
              | { key: "purchase"; href?: string; text?: string; price?: string; cost?: string; state?: string; ctaText?: string }
              | undefined;

            // Reusable status dot — used by chip / label / consolidate placements.
            const statusDot = h.status ? (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: statusColor, opacity: 0.4 }} />}
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: statusColor }} />
              </span>
            ) : null;

            // Overview blurb is intentionally hidden here — robotDesc.text/.long stay
            // available via getRobotDescription / robot-descriptions.json so we can
            // bring it back later or expose it elsewhere.
            const showStatusChip = h.status && statusPlacement === "chip";
            const showYearChip = !!h.year && yearPlacement === "chip";
            const chipStyle: React.CSSProperties = {
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.09)",
              color: "var(--c-ink-body)",
              fontFamily: "var(--font-geist-sans)",
              fontSize: 12.5,
              fontWeight: 450,
              letterSpacing: "-0.005em",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            };
            // Meta chips (year/status/price) live elsewhere now: year + status dot in the
            // label, price/availability in the below-card CTA. Notes is purely descriptors.
            const priceChipText = purchaseSection?.price;
            const showPriceChip = !!priceChipText;
            const descriptorChips = Array.from(
              new Set([h.country, h.useCase, h.drive, ...(h.tags ?? [])].filter(Boolean) as string[])
            );
            const hasDescriptorTags = descriptorChips.length > 0;
            const notesCard = hasDescriptorTags || showStatusChip || showYearChip ? (
              <div style={cardBase}>
                {showSectionEyebrows && hasDescriptorTags && <p style={headerStyle}>Notes</p>}
                <div className="flex flex-wrap" style={{ gap: 7, marginTop: showSectionEyebrows && hasDescriptorTags ? sectionContentMarginTop : 0 }}>
                  {showYearChip && <span style={chipStyle}>{h.year}</span>}
                  {descriptorChips.map((tag) => (
                    <span key={tag} style={chipStyle}>{tag}</span>
                  ))}
                </div>
              </div>
            ) : null;

            // Always render the full universal stat set so cards line up across robots.
            // Missing metrics show as a dimmed em-dash rather than collapsing the row.
            const missingValueStyle: React.CSSProperties = { ...valueStyle, color: "var(--c-ink-subtle)" };
            const renderStatRow = (label: string, value: string | number | null | undefined, formatter: (v: number) => string) => {
              if (hideEmptyRows && value == null) return null;
              const sparkKey = SPARK_KEY_BY_LABEL[label];
              const showSpark =
                sparkMode !== "off" && sparkMode !== "hero" && !!sparkKey && typeof value === "number";
              const valueNode = (
                <MarqueeValue align="right" style={value == null ? missingValueStyle : valueStyle}>
                  <span className="tabular-nums">
                    {value == null ? "—" : (typeof value === "number" ? formatter(value) : value)}
                  </span>
                </MarqueeValue>
              );
              if (!showSpark) {
                return (
                  <div style={{ ...rowStyle, minWidth: 0 }}>
                    <span style={dimmed}>{label}</span>
                    {valueNode}
                  </div>
                );
              }
              const isBelow = sparkMode === "below";
              const bar = (
                <SparkBar
                  entries={sparkData[sparkKey!]}
                  highlights={[{ id: h.id, color: SPARK_HIGHLIGHT }]}
                  width={isBelow ? 96 : 54}
                  height={isBelow ? 9 : 11}
                  gap={1.2}
                  baseColor="rgba(0,0,0,0.13)"
                />
              );
              return (
                <div style={{ ...rowStyle, minWidth: 0 }}>
                  <span style={dimmed}>{label}</span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isBelow ? "column" : "row",
                      alignItems: isBelow ? "flex-end" : "center",
                      gap: isBelow ? 3 : 8,
                      justifySelf: "end",
                      minWidth: 0,
                    }}
                  >
                    {valueNode}
                    {bar}
                  </div>
                </div>
              );
            };
            const fmt = useImperial ? IMPERIAL_FMT : METRIC_FMT;
            const unitsPillFont: React.CSSProperties = {
              fontFamily: "var(--font-geist-sans)",
              fontSize: 10.5, fontWeight: 500, letterSpacing: "0.02em",
              lineHeight: 1, textTransform: "uppercase" as const,
            };
            const unitsDivider = (
              <div className="flex items-center" style={{ gap: 10, margin: "6px 0" }}>
                <div aria-hidden style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.05)" }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {(["cm", "in"] as const).map((u, i) => {
                    const active = (u === "in") === useImperial;
                    return (
                      <Fragment key={u}>
                        {i === 1 && <span aria-hidden style={{ ...unitsPillFont, color: "var(--c-ink-subtle)", opacity: 0.35 }}>/</span>}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onUseImperialChange?.(u === "in"); }}
                          aria-label={`Switch to ${u}`}
                          className="cursor-pointer pointer-events-auto"
                          style={{
                            ...unitsPillFont,
                            border: "none", background: "transparent", padding: 0, margin: 0,
                            color: active ? "var(--c-ink-body)" : "var(--c-ink-subtle)",
                            opacity: active ? 1 : 0.55,
                            transition: "color 160ms ease, opacity 160ms ease",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >{u}</button>
                      </Fragment>
                    );
                  })}
                </span>
                <div aria-hidden style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.05)" }} />
              </div>
            );
            const rowHairline = (
              <div aria-hidden style={{ height: 2, background: `rgba(0,0,0,${(denseOpacity / 100).toFixed(3)})`, marginLeft: denseFullWidth ? -18 : 64, marginRight: denseFullWidth ? -18 : 0 }} />
            );
            const statusRow = (
              <div style={{ ...rowStyle, alignItems: "center" }}>
                <span style={dimmed}>Status</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, ...(h.status ? valueStyle : missingValueStyle) }}>
                  {h.status && valueVisualSide === "left" && <StatusDot color={statusColor} size={9} />}
                  <span>{h.status ?? "—"}</span>
                  {h.status && valueVisualSide === "right" && <StatusDot color={statusColor} size={9} />}
                </span>
              </div>
            );
            const purchaseRow = purchaseSection ? (
              purchaseSection.href ? (
                <a
                  href={purchaseSection.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer"
                  style={{
                    ...rowStyle,
                    alignItems: "center",
                    textDecoration: "none",
                    color: "var(--c-ink-body)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span style={{ ...valueStyle, fontWeight: 500, justifySelf: "start" }}>{purchaseSection.ctaText ?? "Buy"}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", color: "var(--c-ink-muted)" }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                    </svg>
                  </span>
                </a>
              ) : (
                <div style={{ ...rowStyle, alignItems: "center" }}>
                  <span style={dimmed}>Buy</span>
                  <span style={missingValueStyle}>{purchaseSection.state ?? purchaseSection.text ?? "Not for sale"}</span>
                </div>
              )
            ) : null;
            const cycleUnits = (e: React.MouseEvent) => { e.stopPropagation(); onUseImperialChange?.(!useImperial); };
            const renderUnitTapRow = (label: string, value: number | null | undefined, formatter: (v: number) => string) => (
              <div style={rowStyle}>
                <span style={dimmed}>{label}</span>
                {value == null ? (
                  <span className="tabular-nums" style={missingValueStyle}>—</span>
                ) : (
                  <button
                    type="button"
                    onClick={cycleUnits}
                    aria-label={`Switch to ${useImperial ? "metric" : "imperial"}`}
                    className="cursor-pointer pointer-events-auto"
                    style={{
                      background: "transparent", border: "none", padding: 0, margin: 0,
                      ...valueStyle,
                      display: "inline-flex", alignItems: "baseline", gap: 5,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <svg width="8" height="9" viewBox="0 0 8 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, transform: "translateY(-1px)" }} aria-hidden>
                      <path d="M2 3 4 1 6 3" />
                      <path d="M2 6 4 8 6 6" />
                    </svg>
                    <span className="tabular-nums">{formatter(value)}</span>
                  </button>
                )}
              </div>
            );
            const unitsRow = (
              <div style={rowStyle}>
                <span style={dimmed}>Units</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {(["cm", "in"] as const).map((u, i) => {
                    const active = (u === "in") === useImperial;
                    return (
                      <Fragment key={u}>
                        {i === 1 && <span aria-hidden style={{ ...unitsPillFont, color: "var(--c-ink-subtle)", opacity: 0.35 }}>/</span>}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onUseImperialChange?.(u === "in"); }}
                          aria-label={`Switch to ${u}`}
                          className="cursor-pointer pointer-events-auto"
                          style={{
                            ...unitsPillFont,
                            border: "none", background: "transparent", padding: 0, margin: 0,
                            color: active ? "var(--c-ink-body)" : "var(--c-ink-subtle)",
                            opacity: active ? 1 : 0.55,
                            transition: "color 160ms ease, opacity 160ms ease",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >{u}</button>
                      </Fragment>
                    );
                  })}
                </span>
              </div>
            );
            const heightRow = unitToggleVariant === "tap"
              ? renderUnitTapRow("Height", h.height, fmt.height)
              : renderStatRow("Height", h.height, fmt.height);
            const weightRow = unitToggleVariant === "tap"
              ? renderUnitTapRow("Weight", h.weight, fmt.weight)
              : renderStatRow("Weight", h.weight, fmt.weight);
            const speedRow = unitToggleVariant === "tap"
              ? renderUnitTapRow("Speed", h.maxSpeed, fmt.speed)
              : renderStatRow("Speed", h.maxSpeed, fmt.speed);
            const countryRow = h.country ? (
              <div style={rowStyle}>
                <span style={dimmed}>Country</span>
                <MarqueeValue align="right" style={valueStyle}>
                  <CountryValue country={h.country} valueStyle={valueStyle} visualSide={valueVisualSide} />
                </MarqueeValue>
              </div>
            ) : renderStatRow("Country", null, (v) => `${v}`);
            // Engineer-mode rows expand the specs block with the optional
            // `engineering` block on each Humanoid. Missing values render as a
            // dimmed em-dash so the column stays vertically consistent.
            const engineerRows = engineerMode
              ? ENGINEER_FIELDS.map((f) => renderStatRow(f.label, formatEngineerValue(h, f.key), (v) => `${v}`))
              : [];
            // Basic view stays lean: Company, Year, Country, Height, Weight, Use.
            // The more technical rows (DOF, Speed, Drive) only appear in engineer
            // mode alongside the extended `engineering` block.
            const technicalRows = engineerMode ? [
              renderStatRow("DOF", h.dof, (v) => `${v}`),
              speedRow,
              renderStatRow("Drive", h.drive ?? null, (v) => `${v}`),
            ] : [];
            const headerRowCount = 6
              + (unitToggleVariant === "row" ? 1 : 0)
              + technicalRows.length;
            const specsEndIdx = headerRowCount + engineerRows.length;
            // Scrollable rows = basic stats + engineer specs. Pinned rows
            // = Price + Status only — anchored at the bottom of the column
            // so essential info lives in one fixed spot no matter how far
            // you scroll the engineer specs. Purchase CTA is rendered
            // externally (action pill below the card), so it no longer
            // appears as a row inside the stats column.
            const denseScrollableRows: React.ReactNode[] = [
              renderStatRow("Company", h.manufacturer ?? null, (v) => `${v}`),
              renderStatRow("Year", h.year ?? null, (v) => `${v}`),
              countryRow,
              ...(unitToggleVariant === "row" ? [unitsRow] : []),
              heightRow,
              weightRow,
              renderStatRow("Use", h.useCase ?? null, (v) => `${v}`),
              ...technicalRows,
              ...engineerRows,
            ];
            const densePinnedRows: React.ReactNode[] = [
              renderStatRow("Price", priceChipText ?? null, (v) => `${v}`),
              statusRow,
            ];
            const denseRows: React.ReactNode[] = [...denseScrollableRows, ...densePinnedRows];
            const renderRowsAsCard = (rows: React.ReactNode[], opts?: { fill?: boolean; pinned?: React.ReactNode[]; gap?: number; padding?: string }) => {
              const { fill = false, pinned: pinnedInput, gap, padding = "14px 18px" } = opts ?? {};
              const innerGap = gap ?? denseRowGap;
              const scrolling = rows.filter(Boolean);
              const pinned = (pinnedInput ?? []).filter(Boolean);
              if (scrolling.length === 0 && pinned.length === 0) return null;
              // Parse padding string to extract horizontal value so the scroll
              // area can bleed full-width while the rows themselves keep their
              // inset (matches compare-card pattern).
              const paddingX = (() => {
                const parts = padding.split(/\s+/);
                const px = parts.length >= 2 ? parts[1] : parts[0];
                return parseInt(px, 10) || 18;
              })();
              // Simple mode (engineer off) drops the hairline separators —
              // rows just sit with `innerGap` between them for a cleaner look.
              const showHairlines = engineerMode;
              return (
                <div style={{ ...cardBase, borderRadius: cardRadius, background: bubble.bg, boxShadow: bubbleShadow, backdropFilter: bubble.backdropFilter, WebkitBackdropFilter: bubble.backdropFilter, padding, display: "flex", flexDirection: "column", gap: innerGap, flex: fill ? 1 : undefined, minHeight: 0 }}>
                  <StatsScrollArea flex={fill ? 1 : undefined} style={{ marginLeft: -paddingX, marginRight: -paddingX }}>
                    <div className="flex flex-col" style={{ gap: innerGap, paddingLeft: paddingX, paddingRight: paddingX }}>
                      {scrolling.map((row, i) => (
                        <Fragment key={i}>
                          {showHairlines && i > 0 ? rowHairline : null}
                          {row}
                        </Fragment>
                      ))}
                    </div>
                  </StatsScrollArea>
                  {renderPinnedBlock(pinned, paddingX, innerGap)}
                </div>
              );
            };
            // Scrollable rows above, pinned Price/Status/Purchase below
            // the scroll mask so essential info lives in a fixed slot.
            const specsCard = renderRowsAsCard(denseScrollableRows, { fill: true, padding: "18px 18px", pinned: densePinnedRows });
            const statsCard = (
              <div className={denseDividers ? "ui-frost" : undefined} style={denseDividers ? { ...cardBase, borderRadius: cardRadius, background: bubble.bg, boxShadow: bubbleShadow, backdropFilter: bubble.backdropFilter, WebkitBackdropFilter: bubble.backdropFilter, padding: "18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: denseRowGap, minHeight: 0 } : { ...cardBase, display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
                <StatsScrollArea flex={denseDividers ? 1 : undefined} style={denseDividers ? { marginLeft: -18, marginRight: -18 } : undefined}>
                  <div className="flex flex-col" style={{ gap: denseDividers ? denseRowGap : sectionContentGap, paddingLeft: denseDividers ? 18 : 0, paddingRight: denseDividers ? 18 : 0 }}>
                    {denseDividers ? (
                      denseScrollableRows.filter(Boolean).map((row, i) => (
                        <Fragment key={i}>
                          {i > 0 ? rowHairline : null}
                          {row}
                        </Fragment>
                      ))
                    ) : (
                      <>
                        {renderStatRow("Height", h.height, fmt.height)}
                        {renderStatRow("Weight", h.weight, fmt.weight)}
                        {renderStatRow("DOF", h.dof, (v) => `${v}`)}
                        {renderStatRow("Speed", h.maxSpeed, fmt.speed)}
                        {priceChipText ? renderStatRow("Price", priceChipText, (v) => `${v}`) : null}
                      </>
                    )}
                  </div>
                </StatsScrollArea>
                {denseDividers && renderPinnedBlock(densePinnedRows, 18, denseRowGap)}
              </div>
            );

            const statusCard = h.status && statusPlacement === "card" ? (
              <div style={{ ...cardBase, marginTop: "auto" }}>
                {showSectionEyebrows && <p style={headerStyle}>Status</p>}
                <div className="flex items-center" style={{ gap: 8, marginTop: showSectionEyebrows ? sectionContentMarginTop : 0 }}>
                  {statusDot}
                  <span style={valueStyle}>{h.status}</span>
                </div>
              </div>
            ) : null;

            // Action row — price/availability is now a chip above, so this row is purely the CTA.
            // Split variants put the CTA text on the left and the arrow chip on the right; the
            // container treatment is the only thing that varies.
            const purchasePill = purchaseSection?.href ? (() => {
              const href = purchaseSection.href!;
              const cta = purchaseSection.ctaText ?? "Buy";
              const ctaBg = "rgba(0,0,0,0.06)";
              const ctaColor = "rgba(95, 96, 89, 0.8)";

              const arrowChip = (
                <span className="cta-chip" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: ctaBg, flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                  </svg>
                </span>
              );

              const splitContainerByVariant: Record<"split-hairline" | "split-rule" | "split-soft" | "split-bare", React.CSSProperties> = {
                "split-hairline": {
                  borderRadius: cardRadius,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.07)",
                  background: "transparent",
                },
                "split-rule": {
                  borderTop: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 0,
                  background: "transparent",
                },
                "split-soft": {
                  borderRadius: cardRadius,
                  background: "rgba(0,0,0,0.022)",
                },
                "split-bare": {
                  background: "transparent",
                },
              };

              if (actionRowVariant === "split-hairline" || actionRowVariant === "split-rule" || actionRowVariant === "split-soft" || actionRowVariant === "split-bare") {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-auto w-full flex items-center justify-between cursor-pointer"
                    style={{
                      ...splitContainerByVariant[actionRowVariant],
                      padding: `0 ${statPillPadX}px`,
                      minHeight: pillRowHeight,
                      gap: 8,
                      color: pillLabelColor,
                      fontSize: pillLabelFontSize,
                      fontFamily: pillLabelFont,
                      fontWeight: pillLabelWeight,
                      letterSpacing: `${pillLabelLetterSpacing}em`,
                      textTransform: pillLabelUppercase ? "uppercase" : "none",
                      textDecoration: "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span>{cta}</span>
                    {arrowChip}
                  </a>
                );
              }

              if (actionRowVariant === "full") {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-auto w-full flex items-center justify-center cursor-pointer"
                    style={{
                      background: "rgba(0,0,0,0.022)",
                      borderRadius: cardRadius,
                      padding: `0 ${statPillPadX}px`,
                      minHeight: pillRowHeight,
                      gap: 8,
                      color: ctaColor,
                      fontSize: pillLabelFontSize,
                      fontFamily: pillLabelFont,
                      fontWeight: 500,
                      letterSpacing: `${pillLabelLetterSpacing}em`,
                      lineHeight: 1.2,
                      textDecoration: "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span>{cta}</span>
                    {arrowChip}
                  </a>
                );
              }

              // "dark"
              return (
                <div
                  className="w-full pointer-events-auto flex items-center justify-end"
                  style={{ background: "transparent", padding: `0 ${statPillPadX}px`, minHeight: pillRowHeight }}
                >
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-pointer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "#1a1a1a", color: "#fff", fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: 500, letterSpacing: `${pillLabelLetterSpacing}em`, lineHeight: 1.2, textDecoration: "none", WebkitTapHighlightColor: "transparent" }}
                  >
                    <span>{cta}</span>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                      <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                    </svg>
                  </a>
                </div>
              );
            })() : (purchaseSection ? (() => {
              // No URL — render the same pill shape with a static state label
              // (no arrow, not a link) so the row rhythm stays consistent while
              // scrolling instead of flashing in/out.
              const label = purchaseSection.state ?? purchaseSection.text ?? "Not for sale";
              const staticContainerByVariant: Record<"split-hairline" | "split-rule" | "split-soft" | "split-bare", React.CSSProperties> = {
                "split-hairline": {
                  borderRadius: cardRadius,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.07)",
                  background: "transparent",
                },
                "split-rule": {
                  borderTop: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 0,
                  background: "transparent",
                },
                "split-soft": {
                  borderRadius: cardRadius,
                  background: "rgba(0,0,0,0.022)",
                },
                "split-bare": {
                  background: "transparent",
                },
              };
              const isSplitVariant = actionRowVariant === "split-hairline" || actionRowVariant === "split-rule" || actionRowVariant === "split-soft" || actionRowVariant === "split-bare";
              const containerStyle: React.CSSProperties = isSplitVariant
                ? staticContainerByVariant[actionRowVariant as keyof typeof staticContainerByVariant]
                : actionRowVariant === "full"
                  ? { background: "rgba(0,0,0,0.022)", borderRadius: cardRadius }
                  : { background: "transparent" };
              return (
                <div
                  className="pointer-events-auto w-full flex items-center justify-between"
                  style={{
                    ...containerStyle,
                    padding: `0 ${statPillPadX}px`,
                    minHeight: pillRowHeight,
                    gap: 8,
                    color: "var(--c-ink-muted)",
                    fontSize: pillLabelFontSize,
                    fontFamily: pillLabelFont,
                    fontWeight: pillLabelWeight,
                    letterSpacing: `${pillLabelLetterSpacing}em`,
                    textTransform: pillLabelUppercase ? "uppercase" : "none",
                  }}
                >
                  <span>{label}</span>
                </div>
              );
            })() : null);

            // Cards float as distinct frosted cards in the column with visible gaps
            // between them. Inner column holds its expanded width during collapse so
            // content doesn't reflow as the slot shrinks; opacity + translate handle
            // the visual fade.
            return (
              <div className="flex flex-col pointer-events-auto" style={{ width: "100%", height: "100%", maxHeight: "100%", gap: statsGap, position: "relative", zIndex: 11, overflow: "hidden" }}>
                <div
                  className="flex flex-col"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    gap: stackGap,
                    overflowY: "auto",
                    overflowX: "hidden",
                    width: expandedStatsW,
                    paddingTop: statsTopOffset,
                    opacity: collapseVariant === "hover-fade" ? (statsHover ? 1 : 0.22) : (statsCollapsed ? 0 : 1),
                    transform: statsCollapsed ? "translateX(8px)" : "translateX(0)",
                    pointerEvents: statsCollapsed ? "none" : "auto",
                    transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
                  }}
                >
                  <div className="flex flex-col" style={{ gap: stackGap, flex: denseDividers ? 1 : undefined, minHeight: 0 }}>
                    {labelNode}
                    <div style={{ display: "flex", flexDirection: "column", flex: denseDividers ? 1 : undefined, minHeight: 0 }}>
                      {denseDividers && splitCards ? specsCard : statsCard}
                    </div>
                    {denseDividers ? null : notesCard}
                    {denseDividers ? null : statusCard}
                  </div>
                </div>
                {/* Action overlay — iOS-26 glass chip floating at the bottom
                    of the stats container, mirroring the toolbar chips on top.
                    Stats rows scroll behind it (glassBottomPad keeps the last
                    row from sitting under the glass). */}
                {/* Bottom-left cluster moved to the parent stats slot so it
                    persists across single + compare modes. See below. */}
                {!denseDividers && (
                  <div
                    style={{
                      width: expandedStatsW,
                      opacity: collapseVariant === "hover-fade" ? (statsHover ? 1 : 0.22) : (statsCollapsed ? 0 : 1),
                      transform: statsCollapsed ? "translateX(8px)" : "translateX(0)",
                      pointerEvents: statsCollapsed ? "none" : "auto",
                      transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
                    }}
                  >
                    {purchasePill}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col h-full" style={{ width: "100%", gap: cardGap, justifyContent: alignJustify }}>
              {blurbNode}
              {labelNode}
              {pillsNode}
            </div>
          );
        };

        const renderBuyCard = (h: typeof humanoids[0]) => {
          if (hideUnbuyable && !h.purchaseUrl) return null;
          const priceLabel = h.cost && h.cost !== "N/A" ? h.cost : null;
          const leadIn = h.status === "In Production" ? "From" : "Est.";
          const href = withUtm(h.purchaseUrl, h.id);
          const pillBg = statPillBg;
          const pillBackdrop: string | undefined = undefined;

          if (buyCardStyle === "split") {
            const disabled = !href;
            const priceContainer = (
              <div className="flex items-center pointer-events-auto" style={{
                flex: 1,
                minWidth: 0,
                borderRadius: cardRadius,
                background: pillBg,
                backdropFilter: pillBackdrop,
                WebkitBackdropFilter: pillBackdrop,
                padding: "10px 16px",
                minHeight: 52,
                opacity: disabled ? 0.4 : 1,
              }}>
                {(() => {
                  const label = priceLabel ? leadIn : "Price";
                  const value = disabled
                    ? (priceLabel || "Not listed")
                    : (priceLabel || "Inquire");
                  return (
                    <div className="min-w-0">
                      <p className="text-[12px] tracking-widest uppercase font-medium" style={{ color: "var(--c-ink-muted)", letterSpacing: "0.02em" }}>
                        {label}
                      </p>
                      <p className="text-[15px] font-medium tabular-nums mt-0.5 truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                        {value}
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
            const circleStyle: React.CSSProperties = {
              width: 52,
              height: 52,
              borderRadius: 999,
              background: pillBg,
              backdropFilter: pillBackdrop,
              WebkitBackdropFilter: pillBackdrop,
              flexShrink: 0,
            };
            const circleIcon = (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
              </svg>
            );
            const linkCircle = href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buy ${h.name}`}
                className="flex items-center justify-center pointer-events-auto transition-colors hover:bg-neutral-100"
                style={{ ...circleStyle, textDecoration: "none" }}
              >
                {circleIcon}
              </a>
            ) : (
              <div className="flex items-center justify-center pointer-events-auto" style={{ ...circleStyle, opacity: 0.4 }}>
                {circleIcon}
              </div>
            );
            return (
              <div className="flex items-center" style={{ flexShrink: 0, gap: cardGap }}>
                {priceContainer}
                {linkCircle}
              </div>
            );
          }

          // "dark" — slim sleek premium CTA
          if (!href && !priceLabel) return null;
          const darkBody = (
            <>
              <span className="text-[12px] tracking-[0.14em] uppercase font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {href ? "Purchase" : "Price"}
              </span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="text-[12px] font-medium tabular-nums truncate" style={{ color: "#fff", letterSpacing: "-0.01em" }}>
                  {priceLabel || "Inquire"}
                </span>
                {href && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                    <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
                  </svg>
                )}
              </span>
            </>
          );
          const darkStyle: React.CSSProperties = {
            background: "#0f0f10",
            borderRadius: 999,
            padding: "7px 14px",
            flexShrink: 0,
            height: 32,
          };
          const darkClass = "flex items-center justify-between gap-3 pointer-events-auto transition-[filter] hover:brightness-125";
          return href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={darkClass} style={{ ...darkStyle, textDecoration: "none" }}>
              {darkBody}
            </a>
          ) : (
            <div className={darkClass} style={darkStyle}>{darkBody}</div>
          );
        };

        const renderMergedStats = () => {

          if (statsOverlay !== "off") return null;
          // Compare middle column. Mirrors the single-view stats aesthetic:
          // chromeless rows, ink-muted labels, ink-body values, a single hairline
          // separating quantitative specs from the status indicator. No accordion.
          const heightL = hL.height ?? 0, heightR = hR.height ?? 0;
          const weightL = hL.weight ?? 0, weightR = hR.weight ?? 0;
          const dofL = hL.dof ?? 0, dofR = hR.dof ?? 0;
          const speedL = hL.maxSpeed ?? 0, speedR = hR.maxSpeed ?? 0;
          const priceL = hL.cost && hL.cost !== "N/A" ? hL.cost : null;
          const priceR = hR.cost && hR.cost !== "N/A" ? hR.cost : null;
          const statusColor = (status?: string) => status === "In Production" ? "#34c759" : status === "Prototype" ? "#ff9500" : status === "Concept" ? "#5e5ce6" : status === "Anticipated" ? "#af52de" : "#8e8e93";

          const fz = engineerMode ? 14 : 15;
          const dimmed: React.CSSProperties = {
            fontFamily: "var(--font-geist-sans)",
            fontSize: fz,
            fontWeight: 500,
            color: "var(--c-ink-body)",
            opacity: 0.7,
            justifySelf: "start",
          };
          const valueStyle: React.CSSProperties = {
            fontFamily: "var(--font-geist-sans)",
            fontSize: fz,
            fontWeight: 500,
            // Color-mix with transparent so the dimming only affects text +
            // currentColor SVGs — flags and explicit-color assets stay full.
            color: "color-mix(in srgb, var(--c-ink) 68%, transparent)",
          };
          const missingValueStyle: React.CSSProperties = { ...valueStyle, color: "var(--c-ink-subtle)" };
          const hairlineRule = (
            <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />
          );
          const compareRowHeight = Math.round(fz * 1.55);
          // May-13 layout: values flank a centered label column, so the two
          // robots read as a mirrored pair rather than two columns of a table.
          const compareRowGridStyle: React.CSSProperties = {
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            alignItems: "baseline",
            columnGap: 14,
            lineHeight: 1.55,
            minHeight: compareRowHeight,
            height: compareRowHeight,
          };

          const compareRow = (label: string, valL: string | null, valR: string | null) => {
            if (hideEmptyRows && !valL && !valR) return null;
            const sparkKey = SPARK_KEY_BY_LABEL[label];
            const showSpark =
              sparkMode !== "off" && sparkMode !== "hero" && !!sparkKey && (!!valL || !!valR);
            const wrapValue = (val: string | null, robotId: string | undefined, align: "left" | "right" = "right") => {
              const node = (
                <MarqueeValue align={align} style={{ ...(val ? valueStyle : missingValueStyle), whiteSpace: "nowrap", textAlign: align }}>
                  <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>{val || "—"}</span>
                </MarqueeValue>
              );
              if (!showSpark || !sparkKey || !robotId) return node;
              const isBelow = sparkMode === "below";
              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: isBelow ? "column" : "row",
                    alignItems: isBelow ? "flex-end" : "center",
                    gap: isBelow ? 3 : 8,
                    justifySelf: "end",
                    minWidth: 0,
                  }}
                >
                  {node}
                  <SparkBar
                    entries={sparkData[sparkKey]}
                    highlights={[{ id: robotId, color: SPARK_HIGHLIGHT }]}
                    width={isBelow ? 92 : 50}
                    height={isBelow ? 9 : 11}
                    gap={1.2}
                    baseColor="rgba(0,0,0,0.13)"
                  />
                </div>
              );
            };
            return (
              <div style={compareRowGridStyle}>
                {wrapValue(valL, hL?.id, "left")}
                <span style={{ ...dimmed, whiteSpace: "nowrap", textAlign: "center" }}>{label}</span>
                {wrapValue(valR, hR?.id, "right")}
              </div>
            );
          };
          const fmt = useImperial ? IMPERIAL_FMT : METRIC_FMT;
          const unitsPillFont: React.CSSProperties = {
            fontFamily: "var(--font-geist-sans)",
            fontSize: 10.5, fontWeight: 500, letterSpacing: "0.02em",
            lineHeight: 1, textTransform: "uppercase" as const,
          };
          const unitsDivider = (
            <div className="flex items-center" style={{ gap: 10, margin: "6px 0" }}>
              <div aria-hidden style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.05)" }} />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {(["cm", "in"] as const).map((u, i) => {
                  const active = (u === "in") === useImperial;
                  return (
                    <Fragment key={u}>
                      {i === 1 && <span aria-hidden style={{ ...unitsPillFont, color: "var(--c-ink-subtle)", opacity: 0.35 }}>/</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onUseImperialChange?.(u === "in"); }}
                        aria-label={`Switch to ${u}`}
                        className="cursor-pointer pointer-events-auto"
                        style={{
                          ...unitsPillFont,
                          border: "none", background: "transparent", padding: 0, margin: 0,
                          color: active ? "var(--c-ink-body)" : "var(--c-ink-subtle)",
                          opacity: active ? 1 : 0.55,
                          transition: "color 160ms ease, opacity 160ms ease",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >{u}</button>
                    </Fragment>
                  );
                })}
              </span>
              <div aria-hidden style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.05)" }} />
            </div>
          );

          const hasStatus = !!(hL.status || hR.status);
          // Compare blurb is rendered as a glass-chip overlay on the left
          // robot card (see renderRobot), matching single-mode placement.


          const rowHairline = (
            <div aria-hidden style={{ height: 2, background: `rgba(0,0,0,${(denseOpacity / 100).toFixed(3)})`, marginLeft: denseFullWidth ? -18 : 64, marginRight: denseFullWidth ? -18 : 64 }} />
          );
          const statusRow = (
            <div style={{ ...compareRowGridStyle, alignItems: "center" }}>
              <span style={{ display: "inline-flex", justifyContent: "flex-start", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                {hL.status ? (
                  valueVisualSide === "left" ? (
                    <>
                      <StatusDot color={statusColor(hL.status)} size={9} />
                      <span style={valueStyle}>{hL.status}</span>
                    </>
                  ) : (
                    <>
                      <span style={valueStyle}>{hL.status}</span>
                      <StatusDot color={statusColor(hL.status)} size={9} />
                    </>
                  )
                ) : <span style={missingValueStyle}>—</span>}
              </span>
              <span aria-hidden />
              <span style={{ display: "inline-flex", justifyContent: "flex-end", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                {hR.status ? (
                    <>
                      <span style={valueStyle}>{hR.status}</span>
                      <StatusDot color={statusColor(hR.status)} size={9} />
                    </>
                ) : <span style={missingValueStyle}>—</span>}
              </span>
            </div>
          );
          // copyRow removed — Copy now lives in the stats-column header row.
          const cycleUnits = (e: React.MouseEvent) => { e.stopPropagation(); onUseImperialChange?.(!useImperial); };
          const compareUnitTapRow = (label: string, valL: string | null, valR: string | null) => {
            const valueCell = (val: string | null) => (
              val == null ? (
                <MarqueeValue align="right" style={{ ...missingValueStyle, whiteSpace: "nowrap" }}>
                  <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>—</span>
                </MarqueeValue>
              ) : (
                <MarqueeValue align="right" style={{ ...valueStyle, whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    onClick={cycleUnits}
                    aria-label={`Switch to ${useImperial ? "metric" : "imperial"}`}
                    className="cursor-pointer pointer-events-auto"
                    style={{
                      background: "transparent", border: "none", padding: 0, margin: 0,
                      // Inherit text styling from the parent MarqueeValue (which
                      // already has valueStyle) — re-applying valueStyle here
                      // would compound the 0.68 opacity and dim the row.
                      font: "inherit",
                      color: "inherit",
                      display: "inline-flex", alignItems: "baseline", gap: 5,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <svg width="8" height="9" viewBox="0 0 8 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, transform: "translateY(-1px)" }} aria-hidden>
                      <path d="M2 3 4 1 6 3" />
                      <path d="M2 6 4 8 6 6" />
                    </svg>
                    <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>{val}</span>
                  </button>
                </MarqueeValue>
              )
            );
            return (
              <div style={compareRowGridStyle}>
                <span style={{ ...dimmed, whiteSpace: "nowrap" }}>{label}</span>
                {valueCell(valL)}
                {valueCell(valR)}
              </div>
            );
          };
          const compareUnitsRow = (
            <div style={compareRowGridStyle}>
              <span style={{ ...dimmed, whiteSpace: "nowrap" }}>Units</span>
              <span />
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                {(["cm", "in"] as const).map((u, i) => {
                  const active = (u === "in") === useImperial;
                  return (
                    <Fragment key={u}>
                      {i === 1 && <span aria-hidden style={{ ...unitsPillFont, color: "var(--c-ink-subtle)", opacity: 0.35 }}>/</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onUseImperialChange?.(u === "in"); }}
                        aria-label={`Switch to ${u}`}
                        className="cursor-pointer pointer-events-auto"
                        style={{
                          ...unitsPillFont,
                          border: "none", background: "transparent", padding: 0, margin: 0,
                          color: active ? "var(--c-ink-body)" : "var(--c-ink-subtle)",
                          opacity: active ? 1 : 0.55,
                          transition: "color 160ms ease, opacity 160ms ease",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >{u}</button>
                    </Fragment>
                  );
                })}
              </span>
            </div>
          );
          const heightCompareRow = unitToggleVariant === "tap"
            ? compareUnitTapRow("Height", heightL ? fmt.height(heightL) : null, heightR ? fmt.height(heightR) : null)
            : compareRow("Height", heightL ? fmt.height(heightL) : null, heightR ? fmt.height(heightR) : null);
          const weightCompareRow = unitToggleVariant === "tap"
            ? compareUnitTapRow("Weight", weightL ? fmt.weight(weightL) : null, weightR ? fmt.weight(weightR) : null)
            : compareRow("Weight", weightL ? fmt.weight(weightL) : null, weightR ? fmt.weight(weightR) : null);
          const speedCompareRow = unitToggleVariant === "tap"
            ? compareUnitTapRow("Speed", speedL ? fmt.speed(speedL) : null, speedR ? fmt.speed(speedR) : null)
            : compareRow("Speed", speedL ? fmt.speed(speedL) : null, speedR ? fmt.speed(speedR) : null);
          const compareCountryRow = (
            <div style={compareRowGridStyle}>
              <span style={{ ...dimmed, whiteSpace: "nowrap" }}>Country</span>
              <MarqueeValue align="right" style={{ ...(hL.country ? valueStyle : missingValueStyle), whiteSpace: "nowrap" }}>
                {hL.country ? <CountryValue country={hL.country} valueStyle={valueStyle} visualSide={valueVisualSide} /> : <span style={missingValueStyle}>—</span>}
              </MarqueeValue>
              <MarqueeValue align="right" style={{ ...(hR.country ? valueStyle : missingValueStyle), whiteSpace: "nowrap" }}>
                {hR.country ? <CountryValue country={hR.country} valueStyle={valueStyle} visualSide={valueVisualSide} /> : <span style={missingValueStyle}>—</span>}
              </MarqueeValue>
            </div>
          );
          const engineerCompareRows = engineerMode
            ? ENGINEER_FIELDS.map((f) => compareRow(f.label, formatEngineerValue(hL, f.key), formatEngineerValue(hR, f.key)))
            : [];
          const technicalCompareRows = engineerMode ? [
            compareRow("DOF", dofL ? `${dofL}` : null, dofR ? `${dofR}` : null),
            speedCompareRow,
            compareRow("Drive", hL.drive ?? null, hR.drive ?? null),
          ] : [];
          // Mirrors the single view: scrollable basic + engineer rows
          // above, Price + Status pinned below the scroll mask.
          const denseScrollableCompareRows: React.ReactNode[] = [
            compareRow("Company", hL.manufacturer ?? null, hR.manufacturer ?? null),
            compareRow("Year", hL.year ? `${hL.year}` : null, hR.year ? `${hR.year}` : null),
            compareCountryRow,
            ...(unitToggleVariant === "row" ? [compareUnitsRow] : []),
            heightCompareRow,
            weightCompareRow,
            compareRow("Use", hL.useCase ?? null, hR.useCase ?? null),
            ...technicalCompareRows,
            ...engineerCompareRows,
          ];
          const densePinnedCompareRows: React.ReactNode[] = [
            compareRow("Price", priceL, priceR),
            statusRow,
          ];
          const denseRows: React.ReactNode[] = [...denseScrollableCompareRows, ...densePinnedCompareRows];

          return (
            <div className="flex flex-col h-full pointer-events-auto" style={{ width: compareStatsW, minWidth: compareStatsW, position: "relative", zIndex: 11 }}>
              <div className="flex flex-col" style={{ flex: 1, justifyContent: denseDividers ? "stretch" : "center", minHeight: 0 }}>
                <div className={denseDividers ? "ui-frost" : undefined} style={denseDividers ? { borderRadius: cardRadius, background: bubble.bg, boxShadow: bubbleShadow, backdropFilter: bubble.backdropFilter, WebkitBackdropFilter: bubble.backdropFilter, padding: "18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: denseRowGap, minHeight: 0 } : { display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
                  <StatsScrollArea flex={denseDividers ? 1 : undefined} style={denseDividers ? { marginLeft: -18, marginRight: -18 } : undefined}>
                    <div className="flex flex-col" style={{ gap: denseDividers ? denseRowGap : compareRowGap, paddingLeft: denseDividers ? 18 : 0, paddingRight: denseDividers ? 18 : 0 }}>
                      {denseDividers ? (
                        denseScrollableCompareRows.filter(Boolean).map((row, i) => (
                          <Fragment key={i}>
                            {engineerMode && i > 0 ? rowHairline : null}
                            {row}
                          </Fragment>
                        ))
                      ) : (
                        <>
                          {compareRow("Height", heightL ? fmt.height(heightL) : null, heightR ? fmt.height(heightR) : null)}
                          {compareRow("Weight", weightL ? fmt.weight(weightL) : null, weightR ? fmt.weight(weightR) : null)}
                          {compareRow("DOF", dofL ? `${dofL}` : null, dofR ? `${dofR}` : null)}
                          {compareRow("Speed", speedL ? fmt.speed(speedL) : null, speedR ? fmt.speed(speedR) : null)}
                          {compareRow("Price", priceL, priceR)}
                          <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "10px 0" }} />
                          {statusRow}
                        </>
                      )}
                    </div>
                  </StatsScrollArea>
                  {denseDividers && renderPinnedBlock(densePinnedCompareRows, 18, denseRowGap)}
                </div>
              </div>
              {/* Compare blurb — glass-chip overlay on the middle column,
                  positioned the same way the single-mode description chip
                  rides the robot card. Toggled by Info in the bottom cluster. */}
              {(() => {
                const cb = getCompareBlurb(hL, hR);
                const fullText = cb.long || cb.text;
                if (!fullText) return null;
                const isClusterBelow = chipLayout === "below" || chipLayout === "below-left";
                const bottomPx = isClusterBelow ? cardIconInset : cardIconInset + cardIconSize + 8;
                return (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                      ...cardChipChrome,
                      bottom: bottomPx,
                      left: "50%",
                      transform: blurbVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(6px)",
                      maxWidth: `calc(100% - ${cardIconInset * 2}px)`,
                      width: "max-content",
                      minHeight: cardIconSize,
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 14px",
                      // Concentric rounding — see twin in renderRobot.
                      borderRadius: Math.max(8, cardRadius - cardIconInset),
                      fontSize: Math.round(cardIconSize * 0.36),
                      fontFamily: "var(--font-geist-sans)",
                      fontWeight: 500,
                      letterSpacing: "0.01em",
                      lineHeight: 1.35,
                      opacity: blurbVisible ? 1 : 0,
                      transition: "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1), transform 325ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    {fullText}
                  </div>
                );
              })()}
              {/* "Copy comparison" pill removed — header row now owns the action. */}
            </div>
          );
        };

        const renderMedia = (mh: typeof humanoids[0], mIdx: number, markPriority: boolean) => {
          const mGallery = mh.media || [];
          const mItems: { kind: "image" | "video"; src: string; position?: string; fit?: "contain" | "cover"; credit?: { prefix?: string; name: string; href?: string } }[] = [];
          if (mh.imageUrl) mItems.push({ kind: "image", src: mh.imageUrl, position: mh.imagePosition, fit: mh.imageFit, credit: mh.imageCredit });
          for (const m of mGallery) mItems.push({ kind: m.type, src: m.url, position: m.position ?? mh.imagePosition, fit: m.fit ?? mh.imageFit, credit: m.credit });
          const mHasGallery = mItems.length > 1;

          const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const el = e.currentTarget;
            writeGalleryIdx(mIdx, Math.round(el.scrollLeft / el.clientWidth));
          };

          return (
            <>
              {/* New badge — rides with the humanoid */}
              {false && mh.year === 2025 && (
                <div className="absolute z-20 inline-flex items-center justify-center font-semibold" style={{ top: cardIconInset, left: cardIconInset, height: Math.round(cardIconSize * 0.65), padding: `0 ${Math.round(cardIconSize * 0.32)}px`, fontSize: Math.round(cardIconSize * 0.28), lineHeight: 1, letterSpacing: "0.01em", borderRadius: cardIconSize / 2, background: "rgba(60,60,67,0.55)", color: "#ffffff", backdropFilter: "blur(18px) saturate(1.6)", WebkitBackdropFilter: "blur(18px) saturate(1.6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.06)" }}>New</div>
              )}
              <div
                ref={(el) => { galleryScrollRefs.current[mIdx] = el; }}
                data-gallery={mHasGallery ? "true" : undefined}
                className="scrollbar-hide"
                style={{
                  display: "flex",
                  width: "100%", height: "100%",
                  overflowX: mHasGallery ? "auto" : "hidden",
                  overflowY: "hidden",
                  scrollSnapType: "x mandatory",
                }}
                onScroll={mHasGallery ? onScroll : undefined}
              >
                {mh.status === "Anticipated" ? (
                  <div className="relative flex items-center justify-center pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0 }}>
                    <span className="text-[12px] tracking-[0.22em] uppercase" style={{ color: "var(--c-ink-muted)" }}>Coming Soon</span>
                  </div>
                ) : mItems.length > 0 ? mItems.map((item, i) => {
                  const isCover = item.fit === "cover";
                  const isBottom = !!item.position?.includes("bottom");
                  const isVideo = item.kind === "video";
                  const effectiveScale = toScale && mh.height && MAX_HEIGHT > 0
                    ? mh.height / MAX_HEIGHT
                    : (mh.imageScale ?? 1);
                  const imageStyle: React.CSSProperties = {
                    ...(item.position ? { objectPosition: item.position } : null),
                    ...(effectiveScale !== 1 ? {
                      transform: `scale(${effectiveScale})`,
                      transformOrigin: "center bottom",
                      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                    } : null),
                  };
                  if (isVideo) {
                    return (
                      <div key={i} className="relative flex items-center justify-center pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", padding: 0, background: "#000000" }}>
                        <div className="relative w-full h-full">
                          <GalleryVideoSlide mIdx={mIdx} slideIdx={i} videoPaused={videoPaused} subscribe={subscribeGalleryIdx} read={readGalleryIdx} src={item.src} fit={isCover ? "cover" : "contain"} position={item.position} credit={item.credit} />
                        </div>
                      </div>
                    );
                  }
                  return (
                    /* MediaImageSlide owns ready-state + placeholder rendering at the slide-cell level so the silhouette sits at the same spot across cards. */
                    <MediaImageSlide
                      key={i}
                      src={item.src}
                      alt={`${mh.name} ${i + 1}`}
                      isCover={isCover}
                      isBottom={isBottom}
                      imageStyle={imageStyle}
                      sizes={comparing ? `${robotW - 8}vw` : `${robotW}vw`}
                      priority={markPriority && i === 0}
                      bottomFadeH={bottomFadeH}
                      bottomFadeOpacity={bottomFadeOpacity}
                      credit={item.credit}
                    />
                  );
                }) : (
                  <div className="relative flex items-center justify-center p-6 pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0 }}>
                    <PlaceholderLogo />
                  </div>
                )}
              </div>
              {/* Dot strip — overlaid at bottom with fade, revealed on card hover */}
              {mHasGallery && (
                <GalleryDots
                  mIdx={mIdx}
                  count={mItems.length}
                  isVideoOn={(i) => mItems[i]?.kind === "video"}
                  subscribe={subscribeGalleryIdx}
                  read={readGalleryIdx}
                />
              )}
            </>
          );
        };

        const renderBuyChip = (h: typeof humanoids[0]) => {
          if (!h.purchaseUrl) return null;
          return (
            <div className="absolute z-[6]" style={{ top: 14, right: 14 }}>
              <a
                href={withUtm(h.purchaseUrl, h.id)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buy ${h.name}`}
                className="flex items-center justify-center pointer-events-auto transition-transform hover:scale-[1.06]"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.08)",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#1d1d1f" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M7 2.5v9M2.5 7h9" />
                </svg>
              </a>
            </div>
          );
        };

        const renderRobot = (h: typeof humanoids[0], _dist: number, hIdx: number, isFirst: boolean) => {
          // One consolidated pull-up panel per card. See `BlurbDock`.
          const cardDrawer = statsOverlay === "strip" && blurbDock === "drawer";
          // The drawer gets the deep set; the bare strip keeps the spec five,
          // which is all it has room for.
          const overlayRows = overlayRowsFor(h, cardDrawer);
          // The drawer's foot. Country plus the hand-curated tags — use case
          // and drive are rows now, so they'd say the same thing twice.
          // Deduped against the values already standing in the rows above:
          // several robots carry their price as a tag ("$1,688"), and a chip
          // repeating the Price row is the kind of small doubling that makes a
          // panel look assembled rather than composed.
          const shown = new Set(overlayRows.map((r) => r.value?.toLowerCase()).filter(Boolean));
          // Budgeted by width, not by count: "USA · Home · Electric" and
          // "USA · Skills marketplace · 3D-printable parts · Assembled in SF"
          // are both four chips and one of them is three lines. Characters are
          // a good enough proxy for a row of pills, and a foot that stays one
          // line is the whole point — a chip clipped in half by the drawer's
          // bottom edge reads as a bug, not as "there is more".
          //
          // The tags are curated in index order (country → use case → notes),
          // so what survives the budget is what places the robot; the rest is
          // colour, and the drawer isn't the place for all of it.
          const CHIP_BUDGET = 40;
          const drawerChips = cardDrawer
            ? Array.from(new Set([h.country, ...(h.tags ?? [])].filter(Boolean) as string[]))
                .filter((t) => !shown.has(t.toLowerCase()))
                .reduce<string[]>((acc, t) => {
                  const used = acc.reduce((n, x) => n + x.length, 0);
                  // Always take the first, however long — an empty foot is
                  // worse than a wide one.
                  if (acc.length === 0 || used + t.length <= CHIP_BUDGET) acc.push(t);
                  return acc;
                }, [])
            : [];
          // The robot behind the sheet. Pulling it back a little as the sheet
          // arrives is what puts the two on different planes — without it the
          // sheet is a rectangle that appeared, with it the sheet is in front.
          const genieOn = cardDrawer && drawerMotion === "genie";
          const drawerKey = isFirst ? "left" : "right";
          const gallery = h.media || [];
          const allImages = [h.imageUrl, ...gallery.map((m) => m.url)].filter(Boolean) as string[];
          const allKinds: ("image" | "video")[] = [
            ...(h.imageUrl ? ["image" as const] : []),
            ...gallery.map((m) => m.type),
          ];
          const hasGallery = allImages.length > 1;

          const scrollGallery = (idx: number) => {
            const el = galleryScrollRefs.current[hIdx];
            if (!el || !el.children[idx]) return;
            const child = el.children[idx] as HTMLElement;
            el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
          };

          const cardLabel = (
            <div key={h.id} className={`flex items-center gap-2 px-0.5${labelFadeOnScroll ? " info-fade-in" : ""}`}>
              <div className="logo-placeholder flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: labelLogoSize, height: labelLogoSize, borderRadius: cardRadius * 0.6 }}>
                {h.logoUrl ? (
                  <LogoImage src={h.logoUrl} alt={h.manufacturer} sizes={`${labelLogoSize}px`} />
                ) : (
                  <svg width={Math.round(labelLogoSize / 2)} height={Math.round(labelLogoSize / 2)} viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                    <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                    <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2 }}>
                  {h.name}
                  {yearPlacement === "after-name" && h.year ? <span style={{ marginLeft: 6, opacity: 0.42, fontWeight: 400 }}>{h.year}</span> : null}
                </p>
                <p className="text-[12.7px] font-medium truncate flex items-center" style={{ color: "var(--c-ink)", lineHeight: 1.2, opacity: 0.42, gap: 6 }}>
                  <span className="truncate">{h.manufacturer}{yearPlacement === "beside" && h.year ? ` · ${h.year}` : ''}</span>
                  {stackedInfo && statusPlacement === "label" && h.status && (() => {
                    const labelDotColor = h.status === "In Production" ? "#34c759" : h.status === "Prototype" ? "#ff9500" : h.status === "Concept" ? "#5e5ce6" : h.status === "Anticipated" ? "#af52de" : "#8e8e93";
                    return (
                      <span className="relative flex h-2 w-2 flex-shrink-0" title={h.status}>
                        {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: labelDotColor, opacity: 0.4 }} />}
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: labelDotColor }} />
                      </span>
                    );
                  })()}
                </p>
                {yearPlacement === "below" && h.year ? (
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, opacity: 0.32 }}>{h.year}</p>
                ) : null}
              </div>
              {/* Info-icon collapse affordance — sits opposite the label, on the
                  far right of the label row. Hollow ring when shut, solid fill
                  when open. This used to run the other way — filled when shut,
                  a ring when open — which made the one control that was doing
                  something look like the one that wasn't, and put it out of
                  step with every other toggle on the card. */}
              {/* The placard's corner handle. There is exactly one "i" per card:
                  in drawer mode the dock under the card carries it (see
                  `showInfoChip`), so the placard stands down rather than
                  offering a second button for the same panel. Not the "none"
                  collapse variant — that one also forces the stats permanently
                  over the card, which paints the robot out. */}
              {collapseVariant === "info-icon" && !(cardDrawer && showInfoChip) && (cardDrawer || (!comparing && isFirst)) && (() => {
                // Hit target runs a touch larger than the manufacturer logo it
                // sits opposite — at logo size the circle read as decoration
                // rather than a button.
                const infoBtnSize = Math.round(labelLogoSize * 1.2);
                // In drawer mode this is the card's own handle, so it reads the
                // per-card drawer rather than the global stats collapse — which
                // is also why it renders on both sides of a compare.
                const shut = cardDrawer ? !drawerOpenFor(drawerKey) : statsCollapsed;
                return (
                <button
                  onClick={(e) => { e.stopPropagation(); if (cardDrawer) { toggleDrawer(drawerKey); } else { setStatsCollapsed((v) => !v); } }}
                  aria-label={shut ? "Show details" : "Hide details"}
                  aria-pressed={!shut}
                  className="flex-shrink-0 cursor-pointer flex items-center justify-center"
                  style={{
                    width: infoBtnSize,
                    height: infoBtnSize,
                    borderRadius: 999,
                    // Hollow when shut, solid when open — the circle is empty
                    // or it is full, which is the drawer's own state. Both
                    // states keep a circle: a bare `i` at this size reads as a
                    // stray character rather than a control. Weight still runs
                    // the right way (open is the heavier of the two), so the
                    // ring is carrying the metaphor, not the hierarchy.
                    background: shut ? "transparent" : "rgba(0,0,0,0.10)",
                    color: shut ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.85)",
                    border: shut ? "1px solid rgba(0,0,0,0.14)" : "1px solid transparent",
                    padding: 0,
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: Math.round(infoBtnSize * 0.55),
                    fontWeight: 500,
                    lineHeight: 1,
                    pointerEvents: "auto",
                    transition: `background ${dur} ${ease}, border-color ${dur} ${ease}, color ${dur} ${ease}, transform ${cardDrawer && drawerMotion === "genie" ? `${shut ? genieCloseDur : genieDur}ms ${genieSpring}` : `${dur} ${ease}`}, opacity ${dur} ${ease}`,
                    // Handoff. The sheet is supposed to have come out of this
                    // button, so the button gives way while it is out — pressed
                    // down and dimmed — and recovers as the sheet retreats.
                    // Without it the origin story stops the instant the motion
                    // starts, and the button just sits there looking untouched
                    // next to the thing it supposedly produced.
                    ...(cardDrawer && drawerMotion === "genie" && genieHandoff > 0 && !shut ? {
                      transform: `scale(${(1 - genieHandoff * 0.22).toFixed(3)})`,
                      opacity: 1 - genieHandoff * 0.45,
                    } : { transform: "scale(1)", opacity: 1 }),
                  }}
                >
                  i
                </button>
                );
              })()}
            </div>
          );

          // Chip cluster — shared button fragment used by both the floating
          // (absolute over image) and panel (flex row below image) layouts.
          const chipCtx = (!comparing && isFirst) ? (() => {
            const desc = getRobotDescription(h);
            const hasInfo = !!desc.text;
            const hasThreeD = !!THREEDEE_ROBOTS[h.id];
            const hasSpin = !!SPIN_ROBOTS[h.id];
            const hasShare = !!onShareView;
            const hasPanel = collapseVariant === "info-icon";
            const hasScene = process.env.NODE_ENV === "development" && !!h.sceneUrl;
            // No early return on an otherwise featureless robot: every entry can
            // be saved, so the cluster always has at least one button in it.
            const ico = cardIconRender();
            const innerBtnStyle: React.CSSProperties = {
              width: cardIconSize,
              height: cardIconSize,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              color: "inherit",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            };
            const shareButton = hasShare ? (
              <Tooltip label="Share this view" shortcut="C">
                <button type="button" onClick={(e) => { e.stopPropagation(); onShareView?.(); }} aria-label="Share this view" style={innerBtnStyle}>
                  <Share size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                </button>
              </Tooltip>
            ) : null;
            // Save. Filled when saved, outline when not — the same read as a
            // bookmark anywhere else, so it needs no label. Sits with the other
            // card actions rather than on the image: saving is something you do
            // to the entry, not to the photograph.
            const saved = favoriteIds.has(h.id);
            const saveButton = (
              <Tooltip label={saved ? "Remove from saved" : "Save"} shortcut="⇧S">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(h.id); }}
                  aria-pressed={saved}
                  aria-label={saved ? "Remove from saved" : "Save"}
                  style={innerBtnStyle}
                >
                  <Bookmark
                    size={ico.iconBoxPx}
                    strokeWidth={ico.iconStrokeWidth}
                    fill={saved ? "currentColor" : "none"}
                    style={{ transition: `fill ${dur} ${ease}` }}
                  />
                </button>
              </Tooltip>
            );
            const shuffleButton = onRandomHumanoid ? (
              <Tooltip label="Shuffle" shortcut="?">
                <button type="button" onClick={(e) => { e.stopPropagation(); onRandomHumanoid(); }} aria-label="Shuffle to a random humanoid" style={innerBtnStyle}>
                  <Dices size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                </button>
              </Tooltip>
            ) : null;
            // In drawer mode the blurb has no independent visibility — it is
            // part of the drawer — so this drives the same panel the placard's
            // handle does rather than a second, conflicting toggle.
            const infoOn = cardDrawer ? drawerOpenFor(drawerKey) : blurbVisible;
            const infoButton = hasInfo && infoChipOn ? (
              <Tooltip label={infoOn ? "Hide info" : "Show info"} shortcut="I">
                <button type="button" onClick={(e) => { e.stopPropagation(); if (cardDrawer) { toggleDrawer(drawerKey); } else { setBlurbVisible((v) => !v); } }} aria-pressed={infoOn} aria-label={infoOn ? "Hide info" : "Show info"} style={{ ...innerBtnStyle, ...toggleOnStyle(toggleOnMode, infoOn, cardIconSize) }}>
                  <Info size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                </button>
              </Tooltip>
            ) : null;
            const mediaButtons = (
              <>
                {hasThreeD && (
                  <Tooltip label={show3D ? "Show photo" : "View in 3D"} shortcut="3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShow3D((v) => !v); }} aria-pressed={show3D} aria-label={show3D ? "Show photo" : "View in 3D"} style={innerBtnStyle}>
                      <Box width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                    </button>
                  </Tooltip>
                )}
                {hasSpin && (
                  <Tooltip label={spinPlaying ? "Pause rotation" : "Auto-rotate"} shortcut="R">
                    <button type="button" onClick={(e) => { e.stopPropagation(); void toggleSpin(); }} aria-pressed={spinPlaying} aria-label={spinPlaying ? "Pause rotation" : "Auto-rotate"} style={innerBtnStyle}>
                      {spinPlaying ? <Pause width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} /> : <Play width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />}
                    </button>
                  </Tooltip>
                )}
                <VideoPauseInnerButton mIdx={hIdx} allKinds={allKinds} subscribe={subscribeGalleryIdx} read={readGalleryIdx} videoPaused={videoPaused} onToggle={() => setVideoPaused((p) => !p)} iconBoxPx={ico.iconBoxPx} iconStrokeWidth={ico.iconStrokeWidth} size={cardIconSize} />
              </>
            );
            const hasMedia = hasThreeD || hasSpin;
            const panelButton = hasPanel ? (
              <Tooltip label={statsCollapsed ? "Show details" : "Hide details"} shortcut="D">
                <button type="button" onClick={(e) => { e.stopPropagation(); setStatsCollapsed((v) => !v); }} aria-label={statsCollapsed ? "Show details" : "Hide details"} aria-pressed={!statsCollapsed} style={{ ...innerBtnStyle, ...toggleOnStyle(toggleOnMode, !statsCollapsed, cardIconSize) }}>
                  <PanelRight size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                </button>
              </Tooltip>
            ) : null;
            // Morph slot — keeps the button mounted so its enter/exit can
            // animate as the active robot's capability set shifts on scroll.
            // Outer collapses layout (width); inner runs the visual effect
            // (transform/filter/opacity). The pairing is data-driven so the
            // dev tuner can swap styles without touching markup.
            const popEase = "cubic-bezier(0.5, 1.6, 0.5, 1)";
            const slotLayoutFixed = morphStyle === "fade-fixed";
            const slotInstant = morphStyle === "none";
            const innerFor = (present: boolean): React.CSSProperties => {
              const t = `transform ${morphDuration}ms ${ease}, opacity ${morphDuration}ms ${ease}, filter ${morphDuration}ms ${ease}`;
              const baseOpacity = present ? 1 : 0;
              switch (morphStyle) {
                case "scale":      return { transition: t, transform: present ? "scale(1)" : "scale(0.4)", opacity: baseOpacity };
                case "pop":        return { transition: `transform ${morphDuration}ms ${popEase}, opacity ${morphDuration}ms ${ease}`, transform: present ? "scale(1)" : "scale(0)", opacity: baseOpacity };
                case "slide-up":   return { transition: t, transform: present ? "translateY(0)" : "translateY(10px)", opacity: baseOpacity };
                case "slide-down": return { transition: t, transform: present ? "translateY(0)" : "translateY(-10px)", opacity: baseOpacity };
                case "blur":       return { transition: t, filter: present ? "blur(0)" : "blur(6px)", opacity: baseOpacity };
                case "fade-fixed": return { transition: t, opacity: baseOpacity };
                case "none":       return { opacity: baseOpacity };
                case "shrink":
                default:           return { transition: t, opacity: baseOpacity };
              }
            };
            const slot = (present: boolean, key: string, child: React.ReactNode) => (
              <div
                key={key}
                style={{
                  width: slotLayoutFixed ? cardIconSize : (present ? cardIconSize : 0),
                  pointerEvents: present ? "auto" : "none",
                  overflow: "hidden",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: slotInstant || slotLayoutFixed ? "none" : `width ${morphDuration}ms ${ease}`,
                }}
                aria-hidden={!present}
              >
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: cardIconSize, height: cardIconSize, ...innerFor(present) }}>
                  {child}
                </div>
              </div>
            );
            const infoSlot = slot(hasInfo && infoChipOn, "info", (
              <Tooltip label={infoOn ? "Hide info" : "Show info"} shortcut="I">
                <button type="button" onClick={(e) => { e.stopPropagation(); if (cardDrawer) { toggleDrawer(drawerKey); } else { setBlurbVisible((v) => !v); } }} aria-pressed={infoOn} aria-label={infoOn ? "Hide info" : "Show info"} style={{ ...innerBtnStyle, ...toggleOnStyle(toggleOnMode, infoOn, cardIconSize) }} tabIndex={hasInfo && infoChipOn ? 0 : -1}>
                  <Info size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                </button>
              </Tooltip>
            ));
            const mediaSlots = (
              <>
                {slot(hasScene, "scene", (
                  <Tooltip label={sceneEnabled ? "Hide scene" : "Show scene"} shortcut="E">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSceneInteracted(true); setSceneEnabled((v) => !v); }} aria-pressed={sceneEnabled} aria-label={sceneEnabled ? "Hide scene" : "Show scene"} style={{ ...innerBtnStyle, ...toggleOnStyle(toggleOnMode, sceneEnabled, cardIconSize) }} tabIndex={hasScene ? 0 : -1}>
                      <svg width={ico.iconBoxPx} height={ico.iconBoxPx} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ico.iconStrokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 18l5-6 4 5 3-4 6 7" />
                        <circle cx="17" cy="6" r="2" />
                      </svg>
                    </button>
                  </Tooltip>
                ))}
                {slot(hasThreeD, "3d", (
                  <Tooltip label={show3D ? "Show photo" : "View in 3D"} shortcut="3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShow3D((v) => !v); }} aria-pressed={show3D} aria-label={show3D ? "Show photo" : "View in 3D"} style={innerBtnStyle} tabIndex={hasThreeD ? 0 : -1}>
                      <Box width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                    </button>
                  </Tooltip>
                ))}
                {slot(hasSpin, "spin", (
                  <Tooltip label={spinPlaying ? "Pause rotation" : "Auto-rotate"} shortcut="R">
                    <button type="button" onClick={(e) => { e.stopPropagation(); void toggleSpin(); }} aria-pressed={spinPlaying} aria-label={spinPlaying ? "Pause rotation" : "Auto-rotate"} style={innerBtnStyle} tabIndex={hasSpin ? 0 : -1}>
                      {spinPlaying ? <Pause width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} /> : <Play width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />}
                    </button>
                  </Tooltip>
                ))}
                <VideoPauseInnerButton mIdx={hIdx} allKinds={allKinds} subscribe={subscribeGalleryIdx} read={readGalleryIdx} videoPaused={videoPaused} onToggle={() => setVideoPaused((p) => !p)} iconBoxPx={ico.iconBoxPx} iconStrokeWidth={ico.iconStrokeWidth} size={cardIconSize} />
              </>
            );
            const hasMediaPill = hasThreeD || hasSpin || hasScene;
            const otherButtons = (<>{infoSlot}{mediaSlots}</>);
            // panelButton is deliberately NOT in the default row — the "i"
            // circle in the label row already toggles the stats column, and two
            // controls for one action made the bottom bar read as clutter. It
            // stays exported for the split / image-corner groupings.
            const buttons = (<>{saveButton}{shuffleButton}{shareButton}{otherButtons}</>);
            const hasInfoPill = hasInfo && infoChipOn;
            return { buttons, saveButton, shareButton, shuffleButton, otherButtons, infoSlot, mediaSlots, hasMediaPill, hasInfoPill, panelButton, infoButton, mediaButtons, hasMedia };
          })() : null;

          return (
            <div className="relative flex-shrink-0 group/card" style={{ zIndex: 1 }}>
            {/* Light spill — the scene again, blurred past recognition and bled
                past the card edge, so the room throws colour onto the white
                page instead of stopping dead at the corner radius. This is what
                ties the stats column to the card without putting anything
                behind the text. Sits under the card (which is zIndex 2). */}
            {scenePortalMode && h.sceneUrl && sceneGlow > 0 && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -72,
                  zIndex: 0,
                  backgroundImage: `url(${h.sceneUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(64px) saturate(200%)",
                  opacity: sceneEnabled ? sceneGlow / 100 : 0,
                  transition: "opacity 900ms cubic-bezier(0.32, 0.72, 0, 1)",
                  pointerEvents: "none",
                  // Without this the blur still ends on a rectangle — a soft
                  // rectangle, but a visible one. The radial fade is what makes
                  // it read as light instead of a second card.
                  WebkitMaskImage: "radial-gradient(ellipse 62% 58% at 50% 50%, #000 0%, rgba(0,0,0,0.55) 55%, transparent 88%)",
                  maskImage: "radial-gradient(ellipse 62% 58% at 50% 50%, #000 0%, rgba(0,0,0,0.55) 55%, transparent 88%)",
                }}
              />
            )}
            {/* Card-edge toggle — sticks out the right edge of the LEFT card
                when chipLayout=corners + cornersCloseMode=card-edge-tab.
                Acts as both expand and collapse. */}
            {isFirst && !comparing && chipLayout === "corners" && cornersCloseMode === "card-edge-tab" && (() => {
              const tabW = 22;
              const tabH = 56;
              return (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setStatsCollapsed((v) => !v); }}
                  aria-label={statsCollapsed ? "Expand stats" : "Collapse stats"}
                  className="absolute cursor-pointer flex items-center justify-center"
                  style={{
                    top: "50%",
                    right: -Math.round(tabW / 2),
                    transform: "translateY(-50%)",
                    width: tabW,
                    height: tabH,
                    borderRadius: 999,
                    background: "#F4F4F4",
                    color: "rgba(60,60,67,0.55)",
                    zIndex: 5,
                    border: "none",
                    padding: 0,
                    pointerEvents: "auto",
                    WebkitTapHighlightColor: "transparent",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: statsCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: `transform ${dur} ${ease}` }}>
                    <path d="M6 4 L10 8 L6 12" />
                  </svg>
                </button>
              );
            })()}
            {labelPosition === "above" && <div className="mb-2">{cardLabel}</div>}
            {/* Inner card */}
            <div
              ref={isFirst ? leftCardRef : rightCardRef}
              data-scene-portal={scenePortalOn && h.sceneUrl ? "on" : "off"}
              className="relative flex flex-col overflow-hidden"
              onClick={isFirst && !comparing && chipLayout === "corners" && cornersCloseMode === "click-card" && !statsCollapsed ? () => setStatsCollapsed(true) : undefined}
              style={{
                width: cardW,
                height: cardH,
                borderRadius: cardRadius,
                background: "#F9F9F9",
                pointerEvents: "auto",
                cursor: isFirst && !comparing && chipLayout === "corners" && cornersCloseMode === "click-card" && !statsCollapsed ? "pointer" : undefined,
                transition: "width var(--collapse-dur) var(--collapse-ease), height var(--collapse-dur) var(--collapse-ease), max-width var(--collapse-dur) var(--collapse-ease)",
                willChange: "transform",
                zIndex: 2,
              }}
            >
              {stackedInfo && statusPlacement === "corner" && h.status && !comparing && (() => {
                const cornerColor = h.status === "In Production" ? "#34c759" : h.status === "Prototype" ? "#ff9500" : h.status === "Concept" ? "#5e5ce6" : h.status === "Anticipated" ? "#af52de" : "#8e8e93";
                return (
                  <span className="absolute" style={{ top: 14, right: 14, zIndex: 5 }} title={h.status} aria-label={h.status}>
                    <span className="relative flex h-2.5 w-2.5">
                      {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: cornerColor, opacity: 0.4 }} />}
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: cornerColor, boxShadow: "0 0 0 2px rgba(255,255,255,0.6)" }} />
                    </span>
                  </span>
                );
              })()}
              {/* Top corners — save at top-left, copy-link at top-right, on
                  every card. Rendered outside chipCtx (which only exists for
                  the single view's left card) so both sides of a compare carry
                  their own bookmark. The bottom pill is dice-only in this
                  grouping; these two are the card's own actions. */}
              {chipGrouping === "top-corners" && (chipLayout === "below" || chipLayout === "below-left") && (() => {
                const ico = cardIconRender();
                const saved = favoriteIds.has(h.id);
                // Deliberately NOT the dock's glass pill. Inside the card these
                // read like the placard's "i" and the `corners` layout: a bare
                // ink glyph on the card's own surface, tinting only on hover.
                // A second floating pill on top of the image would make the
                // card look like it was wearing the dock.
                const chip: React.CSSProperties = {
                  ...ico.style,
                  position: "absolute",
                  top: cardIconInset,
                  background: "transparent",
                  borderColor: "transparent",
                  backdropFilter: undefined,
                  WebkitBackdropFilter: undefined,
                  color: "rgba(60,60,67,0.62)",
                  zIndex: 30,
                  ["--ci-bg-hover" as string]: "rgba(0,0,0,0.05)",
                  ["--ci-color-hover" as string]: "rgba(0,0,0,0.72)",
                  ["--ci-border-hover" as string]: "transparent",
                };
                return (
                  <>
                    <Tooltip label={saved ? "Remove from saved" : "Save"} shortcut="⇧S">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(h.id); }}
                        aria-pressed={saved}
                        aria-label={saved ? "Remove from saved" : "Save"}
                        className={ico.className}
                        style={{ ...chip, left: cardIconInset, color: saved ? "rgba(0,0,0,0.78)" : chip.color }}
                      >
                        <Bookmark
                          size={ico.iconBoxPx}
                          strokeWidth={ico.iconStrokeWidth}
                          fill={saved ? "currentColor" : "none"}
                          style={{ transition: `fill ${dur} ${ease}` }}
                        />
                      </button>
                    </Tooltip>
                    {onShareView && (
                      <Tooltip label="Copy link to this view" shortcut="C">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onShareView?.(); }}
                          aria-label="Copy link to this view"
                          className={ico.className}
                          style={{ ...chip, right: cardIconInset }}
                        >
                          <Share size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        </button>
                      </Tooltip>
                    )}
                  </>
                );
              })()}
              {/* Stats over the card — see `statsOverlay`. Rows only; the
                  placard above already carries the name. Missing values are
                  left out rather than dashed: on a hero shot an em-dash is
                  just a smudge. */}
              {(() => {
                const strip = statsOverlay === "strip";
                const drawer = strip && blurbDock === "drawer";
                // The drawer is per card and carries its own open state, so it
                // works on both sides of a compare. Every other dock still
                // rides the global strip/blurb toggles.
                const on = drawer ? drawerOpenFor(drawerKey) : statsOverCard;
                // Outside drawer mode the blurb only docks in the single view,
                // and only once the strip exists to dock into — "wash" lays rows
                // over the whole image, so there is no bottom edge to share.
                const docked = strip && blurbDock !== "free" && (drawer || (isFirst && !comparing));
                const desc = docked ? getRobotDescription(h) : null;
                const blurbText = desc ? (desc.long || desc.text) : "";
                const showBlurb = docked && !!blurbText && (drawer ? on : blurbVisible);
                // "swap" gives the edge to one occupant at a time: the rows
                // stand down while the blurb is up.
                const rowsUp = on && !(blurbDock === "swap" && showBlurb);
                if (!overlayRows.length && !(drawer ? blurbText : showBlurb)) return null;
                const blurbType = {
                  fontSize: Math.round(cardIconSize * 0.36),
                  fontFamily: "var(--font-geist-sans)",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  lineHeight: 1.35,
                  color: INK.on,
                } as const;
                const glass = (drawer && drawerOpaque) ? {
                  // The card's own surface, so the face reads as having been
                  // turned over rather than covered. No blur and no inner
                  // highlight: both are glass tells, and there is nothing
                  // behind this to see through to.
                  background: "#F9F9F9",
                } as const : {
                  background: "rgba(255,255,255,0.74)",
                  backdropFilter: "blur(20px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                } as const;
                // "chip" keeps two surfaces — a floating chip above a
                // strip. The other docks read as one shelf, so the glass
                // moves up to the container that holds both parts.
                const onePanel = strip && blurbDock !== "chip";
                const rows = (
                  <div
                    aria-hidden={!rowsUp}
                    style={{
                      // Only "swap" pulls the rows out of the flow — everywhere
                      // else they stay mounted so the panel has something to
                      // slide with when it closes.
                      display: strip && blurbDock === "swap" && !rowsUp ? "none" : "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      flexShrink: 0,
                      padding: strip
                        ? `${showBlurb && blurbDock !== "chip" ? 10 : STRIP_PAD_TOP}px 22px ${STRIP_PAD_BOTTOM}px`
                        : "0 26px 24px",
                      // In one-panel modes the container carries the glass
                      // for the whole shelf; a second layer here would double
                      // the wash where the two overlap.
                      ...(strip && !onePanel ? glass : null),
                      ...(strip ? null : { background: VEIL_WASH, flex: 1 }),
                    }}
                  >
                    {overlayRows.map((r, i) => (
                      <div
                        key={r.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          // A point tighter in the drawer. It carries eight
                          // rows at full data where the strip carries five, and
                          // at 6px the tallest robot overflowed the box by
                          // 18px — enough to push the foot chips into the
                          // bottom fade. The strip keeps its own rhythm.
                          padding: drawer ? "5px 0" : "6px 0",
                          fontSize: 14,
                          fontWeight: WEIGHT.body,
                          borderTop: !strip && i > 0 ? `1px solid ${SEAM}` : undefined,
                        }}
                      >
                        <span style={{ color: INK.off }}>{r.label}</span>
                        <span className="tabular-nums" style={{ color: r.value ? INK.on : INK.faint }}>{r.value ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                );
                // Distance from the sheet's own top edge up to the point it is
                // pulled out of. Derived rather than fixed, so the origin
                // tracks the drawer-height slider instead of drifting every
                // time it moves.
                //
                // Just inside the card's top edge, not at the "i" itself: the
                // card clips its own contents, so a shut sheet parked at the
                // button — which lives above the card, in the placard — would
                // be clipped away and the motion would begin from nothing. Ten
                // pixels in is the closest it can sit to the button and still
                // be drawn, and directly under it reads as out of it.
                const genie = drawer && drawerMotion === "genie";
                const ax = genieAxes(!!on, genieDur, genieCloseDur, genieStagger);
                const gEase = genieSpring;
                const gDur = on ? genieDur : genieCloseDur;
                const genieOriginY = -(cardH - Math.round(cardH * drawerMaxPct / 100) - 10);
                // A sheet that covers the whole face has to round to the card's
                // own corners, not the drawer's. At anything less than full
                // height the two radii sit far apart and never meet, but at
                // 100% a smaller top radius cuts two notches out of the corners
                // and lets the image show through them.
                const sheetRadius = drawerMaxPct >= 100 ? cardRadius : drawerRadius;
                const genieOrigin = `calc(100% - 14px) ${genieOriginY}px`;
                return (
                  <ShelfMeasure
                    cardH={cardH}
                    active={on && strip && (drawer ? drawerLift : stripFit)}
                    open={!!on && drawer}
                    aria-hidden={!on}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      top: strip ? undefined : 0,
                      zIndex: 6,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      opacity: genie ? (on ? 1 : 0) : (drawer || on ? 1 : 0),
                      transform: !strip
                        ? "none"
                        // Y only. X is on the inner box so the two axes can run
                        // on different clocks — the whole point of the stagger.
                        : genie
                          ? (on ? "scaleY(1)" : `scaleY(${genieShutY})`)
                          : (on ? "translateY(0)" : "translateY(100%)"),
                      // The point the sheet is pulled out of: just under the
                      // placard's "i". Y is negative because the panel is
                      // bottom-anchored, so the button sits above its own top
                      // edge by however much of the card the sheet doesn't take.
                      ...(genie ? { transformOrigin: genieOrigin } : null),
                      pointerEvents: "none",
                      transition: drawer
                        ? (genie
                            ? `transform ${Math.round(ax.y.dur)}ms ${gEase} ${Math.round(ax.y.delay)}ms, opacity ${Math.round(gDur * 0.45)}ms ${gEase}`
                            : `transform ${DRAWER_DUR} ${DRAWER_EASE}`)
                        : `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
                      // Genie paints on the inner box instead; everything else
                      // keeps its surface here.
                      ...(genie ? null : {
                        ...(onePanel ? glass : null),
                        ...(drawer ? {
                          borderTopLeftRadius: sheetRadius,
                          borderTopRightRadius: sheetRadius,
                          // The glass has to clip to the new corners, and the
                          // scroller inside it with them.
                          overflow: "hidden",
                        } : null),
                      }),
                    }}
                  >
                    <GenieAxisX
                      enabled={genie}
                      style={{
                        ...(onePanel ? glass : null),
                        // Shut, the sheet is the size and shape of the button it
                        // collapses into; open, it is a sheet. Rounding the
                        // corners on the way is most of what sells the shape
                        // change as one object rather than two.
                        borderTopLeftRadius: on ? sheetRadius : 999,
                        borderTopRightRadius: on ? sheetRadius : 999,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        transform: on ? "scaleX(1)" : `scaleX(${genieShutX})`,
                        transformOrigin: genieOrigin,
                        transition: `transform ${Math.round(ax.x.dur)}ms ${gEase} ${Math.round(ax.x.delay)}ms, border-radius ${Math.round(gDur)}ms ${gEase}`,
                      }}
                    >
                    {drawer && (
                      // The drawer proper: blurb and rows in one scroll region,
                      // capped so it can never grow past its share of the card.
                      // `pointerEvents` comes back on here only — the panel
                      // around it stays transparent to clicks so the card still
                      // takes a tap anywhere the drawer isn't.
                      <div
                        data-drawer
                        style={{
                          height: Math.round(cardH * drawerMaxPct / 100),
                          overflowY: "auto",
                          overscrollBehavior: "contain",
                          // Softens both cuts where the contents run past the
                          // cap. Each fade is sized to the padding behind it,
                          // so at rest they land on blank space and the first
                          // and last lines read at full strength.
                          WebkitMaskImage: DRAWER_FADE,
                          maskImage: DRAWER_FADE,
                          pointerEvents: on ? "auto" : "none",
                          WebkitOverflowScrolling: "touch",
                          // The panel's scale squashes whatever is inside it,
                          // and squashed body copy reads as a rendering fault.
                          // So the contents hold back until the shape has most
                          // of the way arrived, then come up on their own —
                          // and on the way out they leave first, which is what
                          // makes the sheet look emptied rather than crushed.
                          ...(genie ? {
                            opacity: on ? 1 : 0,
                            transition: on
                              ? `opacity ${Math.round(genieDur * 0.4)}ms ${gEase} ${Math.round(genieDur * genieContent)}ms`
                              : `opacity ${Math.round(genieCloseDur * 0.25)}ms ${gEase}`,
                          } : null),
                        }}
                      >
                        {/* Head, body, foot. The drawer holds one height on
                            every robot — that's what keeps it from breathing
                            as you scroll the wheel with it open — so the
                            content has to be composed for a box it will rarely
                            fill exactly. Prose at the top, figures under it,
                            chips pinned to the bottom: the slack collects in
                            the middle as breathing room instead of trailing
                            off the end as a void. `minHeight: 100%` so the
                            foot reaches the bottom on a short robot, and the
                            block grows past it on a long one. */}
                        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
                          {!!blurbText && (
                            <div
                              style={{
                                padding: `${STRIP_PAD_TOP}px 22px 10px`,
                                borderBottom: overlayRows.length ? `1px solid ${SEAM}` : undefined,
                              }}
                            >
                              <ClampedBlurb
                                text={blurbText}
                                lines={blurbClampLines}
                                style={blurbType}
                                linkColor="rgba(0,0,0,0.42)"
                              />
                            </div>
                          )}
                          {rows}
                          {drawerChips.length > 0 && (
                            <div
                              style={{
                                marginTop: "auto",
                                padding: `10px 22px ${STRIP_PAD_BOTTOM}px`,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {drawerChips.map((t) => (
                                <span key={t} style={drawerChipStyle}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {!drawer && showBlurb && blurbDock === "chip" && (
                      // Its own chip, but a sibling of the media area rather
                      // than a child of it — outside the `--shelf-k` scale, so
                      // its type matches the rows' instead of riding ~0.9x.
                      <div
                        style={{
                          ...cardChipChrome,
                          ...blurbType,
                          alignSelf: "center",
                          maxWidth: `calc(100% - ${cardIconInset * 2}px)`,
                          padding: "10px 14px",
                          marginBottom: 10,
                          borderRadius: Math.max(8, cardRadius - cardIconInset),
                        }}
                      >
                        {blurbText}
                      </div>
                    )}
                    {!drawer && showBlurb && blurbDock !== "chip" && (
                      // One shelf: the blurb is the strip's top row, sharing
                      // its glass. A hairline separates prose from figures in
                      // "shelf"; in "swap" there are no figures to separate.
                      <div
                        style={{
                          ...blurbType,
                          padding: `${STRIP_PAD_TOP}px 22px ${blurbDock === "swap" ? STRIP_PAD_BOTTOM : 12}px`,
                          borderBottom: blurbDock === "shelf" && rowsUp ? `1px solid ${SEAM}` : undefined,
                        }}
                      >
                        {blurbText}
                      </div>
                    )}
                    {!drawer && rows}
                    </GenieAxisX>
                  </ShelfMeasure>
                );
              })()}
              {/* Card-local scene — fades in inside the card's rounded rectangle
                  when scene mode is on, so the environment reads as a portal
                  rather than a full-viewport wash. */}
              {sceneInCard && h.sceneUrl && (() => {
                const filterParts: string[] = [];
                if (sceneBlur > 0) filterParts.push(`blur(${sceneBlur}px)`);
                if (sceneCardSaturation !== 100) filterParts.push(`saturate(${sceneCardSaturation}%)`);
                // Portal/bleed run the scene at full strength — the whole point
                // is that the glass above it has a real backdrop. "card" keeps
                // the original low-opacity wash.
                const layerOpacity = scenePortalMode ? 1 : sceneOpacity / 100;
                const cardVignetteMask = sceneCardVignette > 0
                  ? `radial-gradient(ellipse at center, #000 ${Math.max(0, 100 - sceneCardVignette)}%, transparent 100%)`
                  : undefined;
                // Parallax rides a CSS var the spring writes each frame (see the
                // give subscription), so the room drifts behind the fixed glass
                // without a single React re-render.
                const shift = sceneParallax ? "translate3d(var(--scene-x, 0px), 0, 0)" : "";
                const zoom = sceneCardScale !== 100 ? ` scale(${sceneCardScale / 100})` : "";
                const transform = (shift + zoom).trim() || undefined;
                return (
                  <>
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 0,
                        backgroundImage: `url(${h.sceneUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        opacity: sceneEnabled ? layerOpacity : 0,
                        filter: filterParts.length ? filterParts.join(" ") : undefined,
                        transform,
                        transformOrigin: "center center",
                        transition: "opacity 700ms cubic-bezier(0.32, 0.72, 0, 1)",
                        pointerEvents: "none",
                        WebkitMaskImage: cardVignetteMask,
                        maskImage: cardVignetteMask,
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                      }}
                    />
                    {/* Scrim — only where chrome actually sits on top of the
                        scene. In the default layout the placard is above the
                        card and the pill row is below it, so nothing overlaps
                        and the scrim would be pure dimming; it renders no bands
                        at all. Turn on a floating/corners chip layout or a
                        stacked placard and the matching band appears. */}
                    {scenePortalMode && scenePortalDim > 0 && (scrimTop || scrimBottom) && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 0,
                          pointerEvents: "none",
                          opacity: sceneEnabled ? 1 : 0,
                          transition: "opacity 700ms cubic-bezier(0.32, 0.72, 0, 1)",
                          background: [
                            scrimTop ? `linear-gradient(to bottom, rgba(0,0,0,${scenePortalDim / 100}) 0%, rgba(0,0,0,0) 30%)` : null,
                            scrimBottom ? `linear-gradient(to top, rgba(0,0,0,${scenePortalDim / 100}) 0%, rgba(0,0,0,0) 30%)` : null,
                          ].filter(Boolean).join(", "),
                        }}
                      />
                    )}
                  </>
                );
              })()}
              {/* Media area. With the strip up and `stripFit` on, it shrinks
                  from its top edge by exactly the strip's share of the card,
                  so the robot's feet land on the strip's top edge. */}
              <div
                className="relative flex-1 min-h-0 overflow-hidden"
                // Untouched unless the strip knob is on, so the default card
                // carries no extra transform.
                // `--shelf-k` is written by ShelfMeasure from the shelf's
                // real height, so the image also clears the blurb once the
                // blurb docks into the shelf — not just the stat rows.
                style={statsOverlay === "strip" ? {
                  transform: genieOn && genieRecede > 0
                    ? `scale(calc(var(--shelf-k, 1) * ${drawerOpenFor(drawerKey) ? (1 - genieRecede / 100).toFixed(4) : 1}))`
                    : "scale(var(--shelf-k, 1))",
                  transformOrigin: "50% 0%",
                  transition: genieOn
                    ? `transform ${drawerOpenFor(drawerKey) ? genieDur : genieCloseDur}ms ${genieSpring}`
                    : cardDrawer
                      ? `transform ${DRAWER_DUR} ${DRAWER_EASE}`
                      : `transform ${dur} ${ease}`,
                } : undefined}
              >
                {/* Static — hidden when SpinViewer or Robot3D takes over. */}
                {!SPIN_ROBOTS[h.id] && !(isFirst && show3D && THREEDEE_ROBOTS[h.id]) && (
                  <div className="absolute inset-0">
                    {renderMedia(h, hIdx, isFirst)}
                  </div>
                )}
                {/* Articulated 3D viewer — opt-in via the Box pill, single-view only. */}
                {isFirst && show3D && THREEDEE_ROBOTS[h.id] && (
                  <div className="absolute inset-0">
                    <Robot3D
                      urdfUrl={THREEDEE_ROBOTS[h.id]!.urdfUrl}
                      meshBase={THREEDEE_ROBOTS[h.id]!.meshBase}
                      material={material3D}
                      className="w-full h-full"
                    />
                    {/* Material chips — bottom-center, low-key */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full px-1 py-1 bg-white/75 backdrop-blur-md border border-neutral-200/70 shadow-sm">
                      {(["clay", "brushed", "chrome"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMaterial3D(m);
                          }}
                          className={`text-[11px] tracking-tight px-2.5 py-1 rounded-full transition-colors capitalize ${
                            material3D === m
                              ? "bg-neutral-900 text-white"
                              : "text-neutral-600 hover:bg-neutral-900/5"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Spin viewer — auto-mounted for spin-enabled robots on either side.
                    In compare we suppress the pill hint so it stays a hidden-delight drag. */}
                {SPIN_ROBOTS[h.id] && (
                  <div className="absolute inset-0">
                    <SpinViewer
                      ref={isFirst ? spinViewerRef : spinViewerRightRef}
                      frameCount={SPIN_ROBOTS[h.id]!.frameCount}
                      path={SPIN_ROBOTS[h.id]!.path}
                      credit={SPIN_ROBOTS[h.id]!.credit}
                      showHint={isFirst && !comparing && !spinPlaying}
                      className="w-full h-full"
                    />
                    {false && h.year === 2025 && (
                      <div
                        className="absolute z-20 inline-flex items-center justify-center font-semibold pointer-events-none"
                        style={{ top: cardIconInset, left: cardIconInset, height: Math.round(cardIconSize * 0.65), padding: `0 ${Math.round(cardIconSize * 0.32)}px`, fontSize: Math.round(cardIconSize * 0.28), lineHeight: 1, letterSpacing: "0.01em", borderRadius: cardIconSize / 2, background: "rgba(60,60,67,0.55)", color: "#ffffff", backdropFilter: "blur(18px) saturate(1.6)", WebkitBackdropFilter: "blur(18px) saturate(1.6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.06)" }}
                      >
                        New
                      </div>
                    )}
                  </div>
                )}
                {/* GalleryShareButton removed — Copy lives in the stats-column header row. */}
                {/* Floating options menu — single glass chip at the bottom-
                    center of the card, housing every in-card action (Share,
                    PanelRight, Info, 3D, Play, Video pause). One iOS-26 style
                    multi-action pill. */}
                {chipCtx && chipLayout === "floating" && (() => {
                  const fadeClass = cardIconHoverFade ? "opacity-0 translate-y-3 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
                  return (
                    <div
                      className={`absolute z-30 pointer-events-auto ${fadeClass}`}
                      style={{
                        ...cardChipChrome,
                        bottom: cardIconInset,
                        left: "50%",
                        transform: "translateX(-50%)",
                        height: cardIconSize,
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: cardIconSize / 2,
                        transition: "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1), transform 325ms cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      {chipCtx.buttons}
                    </div>
                  );
                })()}
                {/* Image-corner media pill — 3D/spin/scene/video sit in the
                    card's bottom-right, near the image they control. Stable
                    buttons live in the below row. Fades + scales in as a unit
                    on scroll using the same morph clock as split mode. */}
                {chipCtx && (chipGrouping === "image-corner" || chipGrouping === "top-corners") && (chipLayout === "below" || chipLayout === "below-left") && (() => {
                  // Under top-corners the bottom pill is dice-only, so info
                  // rides along with the media buttons in this corner.
                  const withInfo = chipGrouping === "top-corners";
                  const present = chipCtx.hasMediaPill || (withInfo && chipCtx.hasInfoPill);
                  return (
                  <div
                    aria-hidden={!present}
                    className="absolute z-30 pointer-events-auto"
                    style={{
                      bottom: cardIconInset,
                      right: cardIconInset,
                      display: "inline-flex",
                      pointerEvents: present ? "auto" : "none",
                    }}
                  >
                    <div
                      className="inline-flex items-center"
                      style={{
                        ...cardChipChrome,
                        height: cardIconSize,
                        borderRadius: cardIconSize / 2,
                        opacity: present ? 1 : 0,
                        transform: present ? "scale(1)" : "scale(0.85)",
                        transformOrigin: "right center",
                        transition: `opacity ${morphDuration}ms ${ease}, transform ${morphDuration}ms ${ease}`,
                      }}
                    >
                      {withInfo ? <>{chipCtx.infoSlot}{chipCtx.mediaSlots}</> : chipCtx.mediaSlots}
                    </div>
                  </div>
                  );
                })()}
                {/* Corners — Share anchors bottom-left, every other chip
                    clusters bottom-right. Bare icons (no glass chrome) so the
                    affordance reads as a quiet system control, not a pill. */}
                {chipCtx && chipLayout === "corners" && (() => {
                  const fadeClass = cardIconHoverFade ? "opacity-0 translate-y-3 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
                  const transitionStyle = "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1), transform 325ms cubic-bezier(0.4, 0, 0.2, 1)";
                  const bareStyle: React.CSSProperties = {
                    height: cardIconSize,
                    display: "inline-flex",
                    alignItems: "center",
                    color: "rgba(60,60,67,0.75)",
                    transition: transitionStyle,
                  };
                  return (
                    <>
                      {(chipCtx.shareButton || chipCtx.hasMedia) && (() => {
                        // Tighter inter-icon spacing in the bottom-left
                        // cluster: render share + media in a single flex row
                        // and pull each subsequent child left so the icons
                        // sit closer than the default cardIconSize stride.
                        const tighten = 3;
                        return (
                          <div
                            className={`absolute z-30 pointer-events-auto ${fadeClass}`}
                            style={{ ...bareStyle, bottom: cardIconInset, left: cardIconInset }}
                          >
                            {chipCtx.shareButton}
                            {chipCtx.hasMedia && (
                              <div style={{ display: "inline-flex", alignItems: "center", marginLeft: -tighten }}>
                                {React.Children.map(chipCtx.mediaButtons.props.children, (child, idx) => {
                                  if (!child) return child;
                                  return idx === 0 ? child : <span style={{ marginLeft: -tighten, display: "inline-flex" }}>{child}</span>;
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {chipCtx.infoButton && (
                        <div
                          className={`absolute z-30 pointer-events-auto ${fadeClass}`}
                          style={{ ...bareStyle, bottom: cardIconInset, right: cardIconInset }}
                        >
                          {chipCtx.infoButton}
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* Blurb strip — glass chip beside the info icon, fades in
                    when toggled on. Multi-line, auto-height: grows upward as
                    content gets longer. Bottom-aligned with the info icon so
                    short blurbs sit flush, longer blurbs rise above it. */}
                {isFirst && !comparing && (() => {
                  // Docked blurbs render in the shelf beside the stat rows;
                  // this loose chip is only the "free"/no-strip case.
                  if (statsOverlay === "strip" && blurbDock !== "free") return null;
                  const desc = getRobotDescription(h);
                  const fullText = desc.long || desc.text;
                  if (!fullText) return null;
                  return (
                    <div
                      className="absolute z-20 pointer-events-none"
                      style={{
                        ...cardChipChrome,
                        // Sits above the bottom cluster only when chips float
                        // over the image (floating/corners). Panel/below modes
                        // move the chip row out of the media area entirely, so
                        // the blurb can sit flush with the bottom inset.
                        bottom: (chipLayout === "floating" || chipLayout === "corners") ? cardIconInset + cardIconSize + 8 : cardIconInset,
                        left: "50%",
                        transform: blurbVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(6px)",
                        maxWidth: `calc(100% - ${cardIconInset * 2}px)`,
                        width: "max-content",
                        minHeight: cardIconSize,
                        display: "flex",
                        alignItems: "center",
                        padding: "10px 14px",
                        // Concentric rounding: blurb radius = card radius
                        // minus the inset between blurb and card edge, so
                        // the blurb's corners feel like the card's interior.
                        borderRadius: Math.max(8, cardRadius - cardIconInset),
                        fontSize: Math.round(cardIconSize * 0.36),
                        fontFamily: "var(--font-geist-sans)",
                        fontWeight: 500,
                        letterSpacing: "0.01em",
                        lineHeight: 1.35,
                        opacity: blurbVisible ? 1 : 0,
                        transition: "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1), transform 325ms cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      {fullText}
                    </div>
                  );
                })()}
              </div>

              {/* Panel chip row — fixed-height flex sibling below the media
                  area. Reserves its own slot so the image never sits behind
                  the chips, and drops the glass chrome (no backdrop-blur). */}
              {chipCtx && chipLayout === "panel" && (
                <div
                  className="flex-shrink-0 flex items-center justify-center pointer-events-auto"
                  style={{
                    height: cardIconSize + cardIconInset * 2,
                    padding: `${cardIconInset}px`,
                    gap: cardIconGap,
                    background: "#F9F9F9",
                  }}
                >
                  {chipCtx.buttons}
                </div>
              )}

              {/* Hover arrows — anchored to the active humanoid's gallery */}
              {hasGallery && (() => {
                const ico = cardIconRender();
                return (
                  <GalleryArrows
                    mIdx={hIdx}
                    count={allImages.length}
                    scroll={scrollGallery}
                    subscribe={subscribeGalleryIdx}
                    read={readGalleryIdx}
                    size={cardIconSize}
                    inset={cardIconInset}
                    iconBoxPx={ico.iconBoxPx}
                    iconStrokeWidth={ico.iconStrokeWidth}
                    glassChipChrome={cardChipChrome}
                  />
                );
              })()}

              {buyLayout === "chip" && renderBuyChip(h)}

            </div>

            {/* Below-card chip row — absolutely positioned below the card so
                it floats over the page without inflating the card wrapper's
                bounding box. Keeps the card's vertical center aligned with
                the arc names instead of getting pushed up by the chip row. */}
            {chipCtx && (chipLayout === "below" || chipLayout === "below-left") && (
              <div
                className="pointer-events-auto absolute"
                style={{
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: chipLayout === "below-left"
                    ? "flex-start"
                    : (bottomAlignment === "left" ? "flex-start" : bottomAlignment === "right" ? "flex-end" : "center"),
                }}
              >
                {/* Main pill stays centered. In split mode, the secondary pill
                    floats off its right edge via absolute positioning so it can
                    appear/disappear without shifting the main pill. */}
                <div className="relative inline-flex items-center">
                  <div
                    className="inline-flex items-center"
                    style={{
                      ...cardChipChrome,
                      height: cardIconSize,
                      borderRadius: cardIconSize / 2,
                    }}
                  >
                    {chipGrouping === "top-corners"
                      ? chipCtx.shuffleButton
                      : chipGrouping === "split" || chipGrouping === "image-corner"
                        ? (<>{chipCtx.shuffleButton}{chipCtx.shareButton}{chipCtx.infoSlot}{chipCtx.panelButton}</>)
                        : chipCtx.buttons}
                  </div>
                  {chipGrouping === "split" && (
                    <div
                      aria-hidden={!chipCtx.hasMediaPill}
                      className="absolute top-1/2"
                      style={{
                        left: "100%",
                        marginLeft: cardIconGap + 2,
                        transform: "translateY(-50%)",
                        display: "inline-flex",
                        pointerEvents: chipCtx.hasMediaPill ? "auto" : "none",
                      }}
                    >
                      <div
                        className="inline-flex items-center"
                        style={{
                          ...cardChipChrome,
                          height: cardIconSize,
                          borderRadius: cardIconSize / 2,
                          opacity: chipCtx.hasMediaPill ? 1 : 0,
                          transform: chipCtx.hasMediaPill ? "scale(1)" : "scale(0.85)",
                          transformOrigin: "left center",
                          transition: `opacity ${morphDuration}ms ${ease}, transform ${morphDuration}ms ${ease}`,
                        }}
                      >
                        {chipCtx.mediaSlots}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {buyLayout === "below" && !comparing && (() => {
              const isSundayBeta = h.manufacturer === "Sunday Robotics";
              const buyHref = withUtm(isSundayBeta ? "https://www.sunday.ai/beta-program" : (h.purchaseUrl || undefined), h.id);
              const visitHref = !buyHref ? withUtm(h.infoUrl || h.manufacturerUrl, h.id) : undefined;
              const href = buyHref || visitHref;
              const hasCost = h.cost && h.cost !== "N/A";
              const isRotaku = h.manufacturer === "Rotaku";
              const ctaText =
                isSundayBeta ? "Apply for Beta" :
                !buyHref ? "Visit" :
                isRotaku ? "Reserve" : "Buy";
              const avail = availabilityLabel(h);
              const leftLabel = hasCost ? h.cost! : avail;
              const fallbackText = isSundayBeta ? "Apply to the 2026 Beta" : (hasCost ? h.cost! : (avail ?? (href ? ctaText : "Not for sale")));
              const ctaBg = "rgba(0,0,0,0.06)";
              const ctaColor = "rgba(95, 96, 89, 0.8)";
              const labelText = leftLabel ?? (href ? " " : fallbackText);
              const labelColor = href ? pillLabelColor : "#c0c0c0";
              const pillRowHeightLocal = statPillPadY * 2 + Math.round(pillLabelFontSize * 1.2);
              return (
                <div
                  style={{
                    marginTop: 3,
                    background: statPillBg,
                    borderRadius: cardRadius * 0.6,
                    padding: href ? `0 ${Math.max(0, statPillPadY - 6)}px 0 ${statPillPadX}px` : `0 ${statPillPadX}px`,
                  }}
                >
                  <div className="w-full flex items-center justify-between" style={{ minHeight: pillRowHeightLocal, gap: 8 }}>
                    <span className="inline-flex items-center" style={{ gap: 8, fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: labelColor, textTransform: pillLabelUppercase ? "uppercase" : "none" }}>
                      <span>{labelText}</span>
                    </span>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="cta-link cursor-pointer pointer-events-auto"
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, color: ctaColor, padding: "6px 4px", fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: 500, letterSpacing: `${pillLabelLetterSpacing}em`, lineHeight: 1.2, textDecoration: "none", WebkitTapHighlightColor: "transparent" }}
                      >
                        <span>{ctaText}</span>
                        <span className="cta-chip" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: ctaBg, flexShrink: 0 }}>
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                            <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                          </svg>
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {labelPosition === "below" && (
              <div
                ref={isFirst ? leftLabelRef : rightLabelRef}
                className="mt-2 relative"
                style={{
                  willChange: "transform, opacity",
                  zIndex: 0,
                }}
              >
                {cardLabel}
              </div>
            )}

            </div>
          );
        };

        const effectiveGap = statsGap;
        // Corners chip layout: keep the card centered ONLY when the stats
        // column is collapsed to the slim panel. On expand the stats column
        // would otherwise push past the Compare button (anchored at
        // right:19vw), so we let the natural centering take over and the card
        // drifts left as the panel opens. Shift uses the actual collapsed gap
        // (4px) so the math matches the rendered marginLeft.
        const cornersCollapsedGap = 6;
        const cornerCenterShift = (!comparing && chipLayout === "corners" && statsCollapsed)
          ? (cornersCollapsedGap + effectiveStatsW) / 2
          : 0;
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 11 }}>
            <div
              className={`flex ${labelPosition === "above" ? "items-end" : "items-start"}`}
              style={cornerCenterShift ? { transform: `translateX(${cornerCenterShift}px)`, transition: `transform ${dur} ${ease}` } : undefined}
              onMouseEnter={chipLayout === "corners" ? () => setCornerRowHover(true) : undefined}
              onMouseLeave={chipLayout === "corners" ? () => setCornerRowHover(false) : undefined}
            >
              {/* Left robot */}
              <div
                style={{
                  transform: splitHover ? "translateX(-12px)" : (addHover && addCtaMode !== "always") ? "translateX(-16px)" : "translateX(0)",
                  transition: `transform ${dur} ${ease}`,
                }}
              >
                {renderRobot(hL, distL, globalIndexOf(hL?.id), true)}
              </div>

              {/* Stats slot — crossfade single ↔ merged */}
              <div
                className="flex-shrink-0 relative"
                onMouseEnter={() => setStatsHover(true)}
                onMouseLeave={() => setStatsHover(false)}
                style={{
                  marginLeft: statsCollapsed && !comparing && chipLayout !== "corners"
                    ? 0
                    : (statsCollapsed && !comparing && chipLayout === "corners" ? 6 : effectiveGap),
                  // Single view + below mode: humanoid wrapper grows by chip
                  // row height. With items-end on the row, the slot would sit
                  // taller than the humanoid wrapper, dropping the cluster
                  // below the humanoid chips. Reserve matching bottom margin
                  // so the slot bottom moves up the same amount, aligning
                  // both rows. In compare mode the humanoid cards have no
                  // chip row, so no margin needed.
                  // Below-mode chip row is absolutely positioned so the card
                  // wrapper no longer grows by the chip row height — stats
                  // slot height matches the card naturally, no margin needed.
                  marginBottom: 0,
                  overflowX: "visible", overflowY: "visible",
                  width: comparing ? compareStatsW : effectiveStatsW,
                  // Single view: match the grey card exactly, not a raw vh and
                  // not the card *wrapper*. Card height derives from
                  // `cardPxFor` (width- or height-capped, per-lane aspect), so
                  // a vh slot ran taller than the card whenever the card was
                  // width-capped — the "other" lane at aspect 1.0 left the
                  // stats floating ~32px above everything. Aligning to the
                  // wrapper was still wrong: the wrapper includes the placard,
                  // which floats *above* the card, so the first stat row lined
                  // up with the "i" instead of the card's top edge. The row is
                  // items-end and the wrapper bottom is the card bottom, so a
                  // height of exactly cardH lands both edges on the card.
                  // Compare needs the same treatment: the vh slot ran ~8px
                  // taller than the card wrapper, so it — not the cards — set
                  // the row height, and the centred row pushed both cards
                  // further below the focused arc name than single view does.
                  height: cardH,
                  transform: !comparing && addHover && addCtaMode !== "always" ? "translateX(-16px)" : "translateX(0)",
                  transition: "width var(--collapse-dur) var(--collapse-ease), height var(--collapse-dur) var(--collapse-ease), opacity var(--collapse-dur) var(--collapse-ease), margin-left var(--collapse-dur) var(--collapse-ease), transform var(--collapse-dur) var(--collapse-ease)",
                }}
              >
                {/* Collapse affordance — variants swap the chrome but all toggle
                    statsCollapsed. See `collapseVariant` for the active treatment. */}
                {!comparing && (() => {
                  const toggle = () => setStatsCollapsed((v) => !v);
                  const chevron = (
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="rgba(0,0,0,0.72)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: statsCollapsed ? "rotate(180deg)" : "none", transition: `transform ${dur} ${ease}` }}>
                      <path d="M10 4 L6 8 L10 12" />
                    </svg>
                  );

                  // Corners chip layout — collapsed always shows the slim
                  // "+" panel (open affordance). Expanded close affordance is
                  // selectable via cornersCloseMode so we can compare in the
                  // browser without committing.
                  if (chipLayout === "corners") {
                    const s = Math.round(cardIconSize * 0.48);
                    const t = 0.95;
                    const plusPath = `M ${12 - t} 5 H ${12 + t} V ${12 - t} H 19 V ${12 + t} H ${12 + t} V 19 H ${12 - t} V ${12 + t} H 5 V ${12 - t} H ${12 - t} Z`;
                    const minusPath = `M 5 ${12 - t} H 19 V ${12 + t} H 5 Z`;

                    // card-edge-tab handles BOTH open and close from a tab
                    // attached to the card itself, so the stats slot renders
                    // no separate affordance.
                    if (cornersCloseMode === "card-edge-tab") return null;

                    // Collapsed state: slim "+" panel.
                    if (statsCollapsed) {
                      return (
                        <button
                          onClick={toggle}
                          aria-label="Expand stats"
                          className="absolute cursor-pointer flex items-center justify-center"
                          style={{
                            top: 0,
                            left: 0,
                            width: collapsedRailW,
                            height: "100%",
                            background: "#F9F9F9",
                            color: "rgba(0,0,0,0.52)",
                            borderRadius: 10,
                            zIndex: 50,
                            border: "none",
                            padding: 0,
                            pointerEvents: "auto",
                            WebkitTapHighlightColor: "transparent",
                            transition: `background ${dur} ${ease}`,
                          }}
                        >
                          <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d={plusPath} />
                          </svg>
                        </button>
                      );
                    }

                    // Expanded state: pick the close affordance.
                    if (cornersCloseMode === "click-card") {
                      // No visible close affordance. The card itself is wired
                      // to collapse via onClick further down (see card wrapper).
                      return null;
                    }
                    if (cornersCloseMode === "hover-x") {
                      // Small bare "×" at the top-right of the stats slot,
                      // visible only when the stats container is hovered.
                      return (
                        <button
                          onClick={toggle}
                          aria-label="Collapse stats"
                          className="absolute cursor-pointer flex items-center justify-center"
                          style={{
                            top: cardIconInset,
                            right: cardIconInset,
                            width: cardIconSize,
                            height: cardIconSize,
                            background: "transparent",
                            color: "rgba(60,60,67,0.6)",
                            zIndex: 50,
                            border: "none",
                            padding: 0,
                            pointerEvents: "auto",
                            opacity: statsHover ? 1 : 0,
                            transition: `opacity 200ms ${ease}`,
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <svg width={Math.round(cardIconSize * 0.42)} height={Math.round(cardIconSize * 0.42)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                            <path d="M6 6 L18 18 M18 6 L6 18" />
                          </svg>
                        </button>
                      );
                    }
                    if (cornersCloseMode === "edge-chevron") {
                      // Tiny chevron-right pip on the LEFT edge of the
                      // expanded column, sitting in the gap between card and
                      // stats. "Push the column away" mental model.
                      return (
                        <button
                          onClick={toggle}
                          aria-label="Collapse stats"
                          className="absolute cursor-pointer flex items-center justify-center"
                          style={{
                            top: "50%",
                            left: -10,
                            transform: "translate(-50%, -50%)",
                            width: 18,
                            height: 28,
                            background: "transparent",
                            color: "rgba(60,60,67,0.55)",
                            zIndex: 50,
                            border: "none",
                            padding: 0,
                            pointerEvents: "auto",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M6 4 L10 8 L6 12" />
                          </svg>
                        </button>
                      );
                    }
                    // Default — slim "−" panel mirroring the "+" affordance.
                    return (
                      <button
                        onClick={toggle}
                        aria-label="Collapse stats"
                        className="absolute cursor-pointer flex items-center justify-center"
                        style={{
                          top: 0,
                          left: 0,
                          width: collapsedRailW,
                          height: "100%",
                          background: "#F9F9F9",
                          color: "rgba(0,0,0,0.52)",
                          borderRadius: 10,
                          zIndex: 50,
                          border: "none",
                          padding: 0,
                          pointerEvents: "auto",
                          WebkitTapHighlightColor: "transparent",
                          transition: `background ${dur} ${ease}`,
                        }}
                      >
                        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d={minusPath} />
                        </svg>
                      </button>
                    );
                  }

                  if (collapseVariant === "pull-tab") {
                    const hot = statsHover || statsCollapsed;
                    return (
                      <button
                        onClick={toggle}
                        aria-label={statsCollapsed ? "Expand stats" : "Collapse stats"}
                        className="absolute cursor-pointer flex items-center justify-center"
                        style={{
                          top: "50%",
                          left: -(effectiveGap - 1),
                          transform: `translateY(-50%) translateX(-100%)`,
                          width: hot ? 14 : 2,
                          height: hot ? 28 : 36,
                          borderTopLeftRadius: 4,
                          borderBottomLeftRadius: 4,
                          borderTopRightRadius: hot ? 4 : 0,
                          borderBottomRightRadius: hot ? 4 : 0,
                          background: hot ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.08)",
                          transition: `width ${dur} ${ease}, height ${dur} ${ease}, background ${dur} ${ease}, border-radius ${dur} ${ease}`,
                          zIndex: 50,
                          border: "none",
                          padding: 0,
                          pointerEvents: "auto",
                        }}
                      >
                        {hot ? chevron : null}
                      </button>
                    );
                  }

                  if (collapseVariant === "gap-zone") {
                    const hot = statsHover || statsCollapsed;
                    return (
                      <button
                        onClick={toggle}
                        aria-label={statsCollapsed ? "Expand stats" : "Collapse stats"}
                        className="absolute flex items-center justify-center"
                        style={{
                          top: 0,
                          left: -effectiveGap,
                          width: effectiveGap,
                          height: "100%",
                          background: "transparent",
                          cursor: "col-resize",
                          zIndex: 50,
                          border: "none",
                          padding: 0,
                          pointerEvents: "auto",
                        }}
                      >
                        <div className="flex flex-col items-center justify-center" style={{ gap: 4, opacity: hot ? 1 : 0, transition: `opacity ${dur} ${ease}` }}>
                          <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.12)" }} />
                          <div className="flex items-center justify-center" style={{ width: 16, height: 16, borderRadius: 999, background: "rgba(0,0,0,0.05)" }}>
                            {chevron}
                          </div>
                          <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.12)" }} />
                        </div>
                      </button>
                    );
                  }

                  // info-icon — rendered inside the card itself (see renderRobot).
                  // hover-fade / none — no button; behavior handled in renderStats.
                  return null;
                })()}
                {/* Top toolbar removed — engineer/condense moved into the
                    bottom-center cluster alongside the action chip. */}
                <div className="absolute" style={{
                  top: 0,
                  // Slim-minus close mode keeps a persistent panel anchored
                  // at left:0 of the stats slot, so renderStats content gets
                  // pushed right by the panel width + small inner gap when
                  // expanded. Other close modes don't reserve that real
                  // estate so content stays at 0.
                  left: (chipLayout === "corners" && cornersCloseMode === "slim-minus" && !statsCollapsed && !comparing) ? collapsedRailW + 8 : 0,
                  right: 0,
                  bottom: 0,
                  opacity: comparing ? 0 : 1,
                  pointerEvents: comparing ? "none" : "auto",
                  transition: "opacity var(--collapse-dur) var(--collapse-ease), left var(--collapse-dur) var(--collapse-ease)",
                }}>
                  {renderStats(hL)}
                </div>
                {/* Compare stats layer rides the same right-side entrance as the
                    2nd card and wheel — translateX from a small positive offset
                    so the 2nd humanoid's values read as flowing in alongside the
                    rest of the right side. */}
                <div className="absolute" style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: comparing ? 1 : 0,
                  transform: comparing ? "translateX(0)" : "translateX(40px)",
                  pointerEvents: comparing ? "auto" : "none",
                  transition: "opacity var(--collapse-dur) var(--collapse-ease), transform var(--collapse-dur) var(--collapse-ease)",
                }}>
                  {renderMergedStats()}
                </div>

                {/* Persistent bottom-left cluster — engineer/condense chip
                    plus a contextual pill: the robot's CTA in single mode,
                    Copy-view in compare (where a single CTA is ambiguous).
                    Lives at the stats-slot level so it shows over both
                    single and compare stats; always visible when the column
                    is open (compare always counts as open). */}
                {(() => {
                  if (!denseDividers || !splitCards) return null;
                  if (chipLayout === "unified") return null;
                  const showCluster = comparing || !statsCollapsed;
                  if (!showCluster) return null;
                  const actionIco = cardIconRender();
                  // Compute action CTA inline from hL (active/left robot).
                  const ctaInfo = (() => {
                    const isSundayBeta = hL.manufacturer === "Sunday Robotics";
                    const buyHref = withUtm(isSundayBeta ? "https://www.sunday.ai/beta-program" : (hL.purchaseUrl || undefined), hL.id);
                    const visitHref = !buyHref ? withUtm(hL.infoUrl || hL.manufacturerUrl, hL.id) : undefined;
                    const href = buyHref || visitHref;
                    const isRotaku = hL.manufacturer === "Rotaku";
                    const ctaText = isSundayBeta
                      ? "Apply for Beta"
                      : (buyHref ? (isRotaku ? "Reserve" : "Buy") : "Visit");
                    const stateLabel = availabilityLabel(hL) ?? (href ? undefined : "Not for sale");
                    return { href, ctaText, stateLabel };
                  })();
                  const arrowSize = Math.round(actionIco.iconBoxPx * 0.7);
                  const isBelow = chipLayout === "below" || chipLayout === "below-left";
                  const belowWrapperStyle: React.CSSProperties = {
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 6,
                    zIndex: 25,
                    display: "flex",
                    // Single view: always left-align the stats-col cluster so
                    // the chevron + CTA hug the slot's left edge regardless of
                    // the humanoid card's below/below-left choice.
                    justifyContent: !comparing ? "flex-start" : (chipLayout === "below-left" ? "flex-start" : "center"),
                    alignItems: "center",
                    gap: cardIconGap,
                    opacity: 1,
                    transition: "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1)",
                  };
                  const insideWrapperStyle: React.CSSProperties = {
                    bottom: cardIconInset,
                    left: cardIconInset,
                    zIndex: 25,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: cardIconGap,
                    maxWidth: `calc(100% - ${cardIconInset * 2}px)`,
                    opacity: 1,
                    transition: "opacity 325ms cubic-bezier(0.4, 0, 0.2, 1)",
                  };
                  return (
                    <div
                      className="absolute pointer-events-auto"
                      style={isBelow ? belowWrapperStyle : insideWrapperStyle}
                    >
                      {comparing && onRandomHumanoid && (
                        <Tooltip label="Shuffle" shortcut="?">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRandomHumanoid(); }}
                            aria-label="Shuffle to a random humanoid"
                            className={actionIco.className}
                            style={{ ...actionIco.style, ...cardChipChrome, flexShrink: 0 }}
                          >
                            <Dices size={actionIco.iconBoxPx} strokeWidth={actionIco.iconStrokeWidth} />
                          </button>
                        </Tooltip>
                      )}
                      {comparing && !!getCompareBlurb(hL, hR).text && (
                        <Tooltip label={blurbVisible ? "Hide overview" : "Show overview"} shortcut="I">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setBlurbVisible((v) => !v); }}
                            aria-pressed={blurbVisible}
                            aria-label={blurbVisible ? "Hide overview" : "Show overview"}
                            className={actionIco.className}
                            style={{ ...actionIco.style, ...cardChipChrome, flexShrink: 0 }}
                          >
                            <Info size={actionIco.iconBoxPx} strokeWidth={actionIco.iconStrokeWidth} />
                          </button>
                        </Tooltip>
                      )}
                      {(() => {
                        // Compare view: a single CTA is ambiguous across two
                        // robots, so the slot becomes a Copy-view pill instead.
                        if (comparing) {
                          if (!onShareView) return null;
                          return (
                            <Tooltip label="Copy view link" shortcut="C">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onShareView?.(); }}
                                aria-label="Copy view link"
                                className="pointer-events-auto cursor-pointer"
                                style={{
                                  ...cardChipChrome,
                                  border: "1px solid transparent",
                                  maxWidth: "100%",
                                  height: cardIconSize,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  borderRadius: cardIconSize / 2,
                                  padding: `0 ${Math.round(cardIconSize * 0.42)}px`,
                                  flexShrink: 1,
                                  minWidth: 0,
                                }}
                              >
                                <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: Math.round(cardIconSize * 0.36), fontWeight: 500, letterSpacing: "0.01em", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comparing ? "Copy comparison" : "Copy view"}</span>
                                <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, opacity: 0.85 }}>
                                  <Share size={arrowSize} strokeWidth={1.6} />
                                </span>
                              </button>
                            </Tooltip>
                          );
                        }
                        const href = ctaInfo.href;
                        const label = href ? ctaInfo.ctaText : (ctaInfo.stateLabel ?? "Not for sale");
                        const Tag = (href ? "a" : "div") as React.ElementType;
                        const tagProps = href
                          ? { href, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
                          : {};
                        return (
                          <Tag
                            {...tagProps}
                            className="pointer-events-auto cursor-pointer"
                            style={{
                              ...cardChipChrome,
                              border: "1px solid transparent",
                              maxWidth: "100%",
                              height: cardIconSize,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 10,
                              borderRadius: cardIconSize / 2,
                              padding: `0 ${Math.round(cardIconSize * 0.42)}px`,
                              textDecoration: "none",
                              flexShrink: 1,
                              minWidth: 0,
                            }}
                          >
                            <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: Math.round(cardIconSize * 0.36), fontWeight: 500, letterSpacing: "0.01em", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                            {href && (
                              <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, opacity: 0.85 }}>
                                <svg width={arrowSize} height={arrowSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                                </svg>
                              </span>
                            )}
                          </Tag>
                        );
                      })()}
                    </div>
                  );
                })()}
                {/* Middle exit-compare hover zone removed — the X on the right
                    card is the sole way out. */}
              </div>

              {/* Right robot — compare only. Slides in from screen-right (translateX)
                  alongside the wheel and the 2nd-humanoid stat column, all riding the
                  shared collapse clock so the right side enters as one piece. */}
              <div
                className="flex-shrink-0 relative compare-rcard"
                style={{
                opacity: comparing ? 1 : 0,
                pointerEvents: comparing ? "auto" : "none",
                // Card stays at full visual size (overflow visible) and
                // slides a short distance from the right while fading in.
                // Short translate keeps the motion readable without feeling
                // violent; the fade carries most of the entrance weight.
                transform: `translateX(${comparing ? 0 : (splitHover ? 60 : 80)}px) scale(${comparing ? 1 : 0.98})`,
                transformOrigin: "left center",
                width: comparing ? cardW : 0,
                marginLeft: comparing ? effectiveGap : 0,
                overflow: "visible",
                transition: "opacity var(--collapse-dur) var(--collapse-ease), transform var(--collapse-dur) var(--collapse-ease), width var(--collapse-dur) var(--collapse-ease), margin-left var(--collapse-dur) var(--collapse-ease)",
              }}>
                {/* Minus appears AFTER the card has landed so it rises out of
                    the card vertically — no horizontal drift from the card's
                    translateX(56) slide-in. On exit it fades quickly before
                    the card starts sliding out. */}
                {(() => {
                  const ico = cardIconRender();
                  // Match the Compare button styling — flat = filled grey
                  // circle, glass = existing chrome. Keeps the open-compare
                  // (Compare "+") and close-compare ("−") buttons paired.
                  const flatStyle: React.CSSProperties = {
                    background: "rgba(0,0,0,0.06)",
                    color: "rgba(0,0,0,0.62)",
                    border: "none",
                  };
                  // Sized to fit INSIDE the label row so it never overlaps the
                  // card image below. `top: 0` is the wrapper top, which is the
                  // label row — NOT the image — so at full cardIconSize the
                  // button is taller than the row and spills onto the card.
                  // Still reads larger than the "i" on the left card, which is
                  // right: it's the counterpart to the Compare "+".
                  const closeSize = Math.round(cardIconSize * 0.72);

                  // "veil" — the inverse of the plus. The plus sits in an empty
                  // card-shaped slot and fills it; hovering the filled card
                  // washes it back toward that same empty slot and offers the
                  // "−" to finish the job. Nothing is drawn at rest, which is
                  // the point: the second card is the subject, not a thing
                  // wearing a close button. The whole veil is the hit target,
                  // so it is far easier to land on than the 26px corner it
                  // replaces, despite being invisible until you go there.
                  // Hover state is CSS (`.compare-rcard:hover .compare-veil`
                  // in globals.css) — a re-render of Browse per card
                  // enter/leave is a high price for an opacity flip.
                  if (minusPlacement === "veil") {
                    return (
                      <div
                        onClick={exitCompare}
                        role="button"
                        aria-label="Remove from compare"
                        className="absolute z-30 compare-veil"
                        style={{
                          // Anchored to the card, not the wrapper: the wrapper
                          // also holds the label row above the card, and a veil
                          // that covered the placard would read as removing the
                          // name too.
                          left: 0,
                          // Stops at the open drawer's top edge rather than
                          // running under it — see `--shelf-h`. Reaching for
                          // the drawer to read or scroll it used to wash the
                          // whole card out and offer to remove it, which made
                          // the drawer unusable on this side.
                          bottom: "var(--shelf-h, 0px)",
                          width: cardW,
                          height: `calc(${cardH}px - var(--shelf-h, 0px))`,
                          borderRadius: cardRadius,
                          // Square where it meets the drawer, so the two edges
                          // meet flush instead of leaving lens-shaped gaps.
                          borderBottomLeftRadius: `calc(${cardRadius}px * (1 - var(--shelf-open, 0)))`,
                          borderBottomRightRadius: `calc(${cardRadius}px * (1 - var(--shelf-open, 0)))`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          // Washed toward the page, not scrimmed — see VEIL_WASH.
                          // It reads as about-to-leave, not already gone.
                          background: VEIL_WASH,
                          pointerEvents: comparing ? "auto" : "none",
                          cursor: "pointer",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <div
                          className="compare-veil-btn"
                          style={{
                            // Always the flat circle here, whatever
                            // compareBtnStyle says. The glass chrome is a
                            // translucent fill over a backdrop blur — put it on
                            // top of a white wash and it vanishes, leaving a
                            // bare dash floating on the card. This one has to
                            // read as a button.
                            ...flatStyle,
                            width: cardIconSize,
                            height: cardIconSize,
                            borderRadius: cardIconSize / 2,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={exitCompare}
                      aria-label="Remove from compare"
                      className="absolute z-30 cursor-pointer"
                      style={{
                        ...(compareBtnStyle === "flat" ? flatStyle : { ...cardChipChrome, border: "none" }),
                        width: closeSize,
                        height: closeSize,
                        borderRadius: closeSize / 2,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        top: 0,
                        right: 0,
                        opacity: comparing ? 1 : 0,
                        transform: comparing ? "translateY(0)" : "translateY(10px)",
                        pointerEvents: comparing ? "auto" : "none",
                        transition: comparing
                          ? "opacity 220ms ease 280ms, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1) 280ms"
                          : "opacity 140ms ease 0ms, transform 140ms ease 0ms",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <Minus size={Math.round(ico.iconBoxPx * 0.72)} strokeWidth={ico.iconStrokeWidth} />
                    </button>
                  );
                })()}
                {renderRobot(hR, distR, globalIndexOf(hR?.id), false)}
              </div>
            </div>
            {/* Unified chip bar — one centered row that morphs between
                single + compare views. Includes both under-card buttons
                (share/info/panel/media) and stats-col buttons (engineer/CTA). */}
            {chipLayout === "unified" && (() => {
              const ico = cardIconRender();
              const activeH = hL;
              const desc = getRobotDescription(activeH);
              const hasInfo = !!desc.text || (comparing && !!getCompareBlurb(hL, hR).text);
              const hasThreeD = !comparing && !!THREEDEE_ROBOTS[activeH.id];
              const hasSpin = !comparing && !!SPIN_ROBOTS[activeH.id];
              const hasShare = !!onShareView;
              const hasPanel = !comparing && collapseVariant === "info-icon";
              const innerBtnStyle: React.CSSProperties = {
                width: cardIconSize,
                height: cardIconSize,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                padding: 0,
                color: "inherit",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              };
              const arrowSize = Math.round(ico.iconBoxPx * 0.7);
              const ctaInfo = (() => {
                const isSundayBeta = activeH.manufacturer === "Sunday Robotics";
                const buyHref = withUtm(isSundayBeta ? "https://www.sunday.ai/beta-program" : (activeH.purchaseUrl || undefined), activeH.id);
                const visitHref = !buyHref ? withUtm(activeH.infoUrl || activeH.manufacturerUrl, activeH.id) : undefined;
                const href = buyHref || visitHref;
                const isRotaku = activeH.manufacturer === "Rotaku";
                const ctaText = isSundayBeta
                  ? "Apply for Beta"
                  : (buyHref ? (isRotaku ? "Reserve" : "Buy") : "Visit");
                const stateLabel = availabilityLabel(activeH) ?? (href ? undefined : "Not for sale");
                return { href, ctaText, stateLabel };
              })();
              return (
                <div className="pointer-events-auto" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: cardIconGap }}>
                  <div className="inline-flex items-center" style={{ ...cardChipChrome, height: cardIconSize, borderRadius: cardIconSize / 2, gap: cardIconGap, padding: `0 ${Math.round(cardIconSize * 0.15)}px` }}>
                    {hasShare && (
                      <Tooltip label="Share this view" shortcut="S">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onShareView?.(); }} aria-label="Share this view" style={innerBtnStyle}>
                          <Share size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        </button>
                      </Tooltip>
                    )}
                    {hasInfo && infoChipOn && (
                      <Tooltip label={blurbVisible ? "Hide info" : "Show info"} shortcut="I">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setBlurbVisible((v) => !v); }} aria-pressed={blurbVisible} aria-label={blurbVisible ? "Hide info" : "Show info"} style={{ ...innerBtnStyle, ...toggleOnStyle(toggleOnMode, blurbVisible, cardIconSize) }}>
                          <Info size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        </button>
                      </Tooltip>
                    )}
                    {hasThreeD && (
                      <Tooltip label={show3D ? "Show photo" : "View in 3D"} shortcut="3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setShow3D((v) => !v); }} aria-pressed={show3D} aria-label={show3D ? "Show photo" : "View in 3D"} style={innerBtnStyle}>
                          <Box width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        </button>
                      </Tooltip>
                    )}
                    {hasSpin && (
                      <Tooltip label={spinPlaying ? "Pause rotation" : "Auto-rotate"} shortcut="R">
                        <button type="button" onClick={(e) => { e.stopPropagation(); void toggleSpin(); }} aria-pressed={spinPlaying} aria-label={spinPlaying ? "Pause rotation" : "Auto-rotate"} style={innerBtnStyle}>
                          {spinPlaying ? <Pause width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} /> : <Play width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />}
                        </button>
                      </Tooltip>
                    )}
                    {hasPanel && (
                      <Tooltip label={statsCollapsed ? "Show details" : "Hide details"} shortcut="D">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setStatsCollapsed((v) => !v); }} aria-label={statsCollapsed ? "Show details" : "Hide details"} aria-pressed={!statsCollapsed} style={{ ...innerBtnStyle, ...toggleOnStyle(toggleOnMode, !statsCollapsed, cardIconSize) }}>
                          <PanelRight size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  {(() => {
                    if (comparing) {
                      if (!onShareView) return null;
                      return (
                        <Tooltip label="Copy view link" shortcut="C">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onShareView?.(); }}
                            aria-label="Copy view link"
                            className="pointer-events-auto cursor-pointer"
                            style={{
                              ...cardChipChrome,
                              border: "1px solid transparent",
                              height: cardIconSize,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              borderRadius: cardIconSize / 2,
                              padding: `0 ${Math.round(cardIconSize * 0.42)}px`,
                            }}
                          >
                            <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: Math.round(cardIconSize * 0.36), fontWeight: 500, letterSpacing: "0.01em", lineHeight: 1 }}>{comparing ? "Copy comparison" : "Copy view"}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", opacity: 0.85 }}>
                              <Share size={arrowSize} strokeWidth={1.6} />
                            </span>
                          </button>
                        </Tooltip>
                      );
                    }
                    const href = ctaInfo.href;
                    const label = href ? ctaInfo.ctaText : (ctaInfo.stateLabel ?? "Not for sale");
                    const Tag = (href ? "a" : "div") as React.ElementType;
                    const tagProps = href
                      ? { href, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
                      : {};
                    return (
                      <Tag
                        {...tagProps}
                        className="pointer-events-auto cursor-pointer"
                        style={{
                          ...cardChipChrome,
                          border: "1px solid transparent",
                          height: cardIconSize,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: cardIconSize / 2,
                          padding: `0 ${Math.round(cardIconSize * 0.42)}px`,
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: Math.round(cardIconSize * 0.36), fontWeight: 500, letterSpacing: "0.01em", lineHeight: 1 }}>{label}</span>
                        {href && (
                          <span style={{ display: "inline-flex", alignItems: "center", opacity: 0.85 }}>
                            <svg width={arrowSize} height={arrowSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 11.5 11.5 5M6 5h5.5v5.5" />
                            </svg>
                          </span>
                        )}
                      </Tag>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ── Dev toggle (bottom-right, subtle) ── */}
      {isDev && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5">
          <button onClick={() => setShowTuner((v) => !v)} className="cursor-pointer transition-colors duration-150" style={{ fontSize: 10, color: showTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}>T</button>
          <span style={{ fontSize: 10, color: "#e0e0e0" }}>·</span>
          <button onClick={() => onToggleChatTuner?.()} className="cursor-pointer transition-colors duration-150" style={{ fontSize: 10, color: showChatTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}>C</button>
        </div>
      )}
      {showTuner && (
        <TunerShell onClose={() => setShowTuner(false)} group={tunerGroup} onGroupChange={setTunerGroup} order={TUNER_GROUPS}>
          <div data-tuner-group="Layout" className="space-y-4">
          <p className="text-[11px] tracking-widest uppercase text-neutral-500">Corner Margins</p>
          <div>
            <label className="text-[12px] text-neutral-500 flex justify-between">Top / Bottom <span className="tabular-nums text-neutral-400">{cornerY}px</span></label>
            <input type="range" min={0} max={600} value={cornerY} onChange={(e) => setCornerY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
          </div>
          <div style={{ opacity: autoNavX ? 0.5 : 1 }}>
            <label className="text-[12px] text-neutral-500 flex items-center justify-between">
              <span className="flex items-center gap-2">
                Left / Right
                <button
                  type="button"
                  onClick={() => setAutoNavX((v) => !v)}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${autoNavX ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                >
                  {autoNavX ? "Auto" : "Manual"}
                </button>
              </span>
              <span className="tabular-nums text-neutral-400">{navX}px</span>
            </label>
            <input type="range" min={0} max={600} value={navX} onChange={(e) => { setNavX(Number(e.target.value)); setAutoNavX(false); }} className="w-full accent-neutral-900 h-1 mt-1.5" />
          </div>
          <div className="pt-2 border-t border-neutral-100">
            <button
              onClick={() => { setCornerY(18); setNavX(24); setAutoNavX(true); }}
              className="text-[12px] text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              Reset
            </button>
          </div>
          </div>
          <div data-tuner-group="Stats">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Sparkbar</p>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["off", "Off"],
                ["inline", "A inline"],
                ["below", "B below"],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setSparkMode(v as SparkMode)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${sparkMode === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed">
              Distribution-of-fleet next to the value. Renders on Height/Weight/DOF/Speed only.
            </p>
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Label Position</p>
            <div className="flex gap-1.5">
              {(["stack", "above", "below"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLabelPosition(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${labelPosition === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Label Fade On Scroll</p>
            <div className="flex gap-1.5">
              {([["off", false], ["on", true]] as const).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setLabelFadeOnScroll(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${labelFadeOnScroll === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Stats Align</p>
            <div className="flex gap-1.5">
              {(["top", "center", "bottom"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setStatsAlign(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${statsAlign === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Header Split</p>
            <div className="flex flex-wrap gap-1.5">
              {(["morph", "push", "lift", "shrink", "swap"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSplitVariant(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${splitVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">Fine Tune</p>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Split amount <span className="tabular-nums text-neutral-400">{splitAmount}px</span></label>
              <input type="range" min={0} max={120} value={splitAmount} onChange={(e) => setSplitAmount(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            {splitVariant === "shrink" && (
              <div>
                <label className="text-[12px] text-neutral-500 flex justify-between">Scale <span className="tabular-nums text-neutral-400">{splitScale.toFixed(2)}</span></label>
                <input type="range" min={70} max={100} value={Math.round(splitScale * 100)} onChange={(e) => setSplitScale(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
              </div>
            )}
            {splitVariant === "lift" && (
              <>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Lift Y <span className="tabular-nums text-neutral-400">{splitLiftY}px</span></label>
                  <input type="range" min={0} max={24} value={splitLiftY} onChange={(e) => setSplitLiftY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Shadow <span className="tabular-nums text-neutral-400">{splitShadowOp.toFixed(2)}</span></label>
                  <input type="range" min={0} max={40} value={Math.round(splitShadowOp * 100)} onChange={(e) => setSplitShadowOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" />
                </div>
              </>
            )}
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Duration <span className="tabular-nums text-neutral-400">{splitDur}ms</span></label>
              <input type="range" min={150} max={1200} step={10} value={splitDur} onChange={(e) => setSplitDur(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <div className="pt-2 border-t border-neutral-100">
            <button
              onClick={() => { setSplitVariant("shrink"); setSplitAmount(44); setSplitScale(0.97); setSplitLiftY(4); setSplitShadowOp(0.12); setSplitDur(320); }}
              className="text-[12px] text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              Reset
            </button>
          </div>
          <div data-tuner-group="Scene" className="space-y-3">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Surface</p>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Palette</label>
              <div className="flex flex-wrap gap-1.5">
                {(["cool", "neutral"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPaletteChange?.(p)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${palette === p ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Base <span className="tabular-nums text-neutral-400">{surfaceColor}</span></label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                {[
                  { c: "#ffffff", title: "Pure white" },
                  { c: "#f7f7f7", title: "Neutral 50" },
                  { c: "#f2f2f2", title: "Neutral 100" },
                  { c: "#ececec", title: "Neutral 200" },
                  { c: "#e5e5e5", title: "Neutral 300" },
                  { c: "#F2F2F7", title: "Apple system gray" },
                  { c: "#F1F1F6", title: "Cool tint (current default)" },
                  { c: "#FAF7F1", title: "Warm cream" },
                  { c: "#ECEAE3", title: "Deeper cream" },
                  { c: "#E8E8E8", title: "Deeper neutral" },
                  { c: "#1A1A1A", title: "Dark" },
                ].map(({ c, title }) => (
                  <button
                    key={c}
                    onClick={() => onSurfaceColorChange(c)}
                    title={title}
                    className="w-6 h-6 rounded cursor-pointer"
                    style={{ background: c, border: surfaceColor.toLowerCase() === c.toLowerCase() ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)" }}
                  />
                ))}
                <input
                  type="color"
                  value={surfaceColor}
                  onChange={(e) => onSurfaceColorChange(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-neutral-200"
                  style={{ padding: 0 }}
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Hover <span className="tabular-nums text-neutral-400">{surfaceHover}</span></label>
              <div className="flex gap-1.5 mt-1.5 items-center">
                {["#f2f2f2", "#ebebeb", "#e5e5e5", "#dcdcdc", "#d4d4d4"].map((c) => (
                  <button
                    key={c}
                    onClick={() => onSurfaceHoverChange(c)}
                    className="w-6 h-6 rounded cursor-pointer"
                    style={{ background: c, border: surfaceHover.toLowerCase() === c ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)" }}
                  />
                ))}
                <input
                  type="color"
                  value={surfaceHover}
                  onChange={(e) => onSurfaceHoverChange(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-neutral-200"
                  style={{ padding: 0 }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Scene</p>
            <span className="text-[10px] text-neutral-400">{sceneActive ? focusedH?.name : "—"}</span>
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Variant</p>
            <div className="flex gap-1.5">
              {(["portal", "bleed", "card", "viewport"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSceneVariant(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${sceneVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {sceneVariant === "viewport" && (
            <div>
              <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Shape</p>
              <div className="flex flex-wrap gap-1.5">
                {(["radial", "horizontal", "vertical", "top", "bottom"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSceneShape(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${sceneShape === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {sceneVariant === "viewport" && (
              <>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Bloom size <span className="tabular-nums text-neutral-400">{sceneSize}%</span></label>
                  <input type="range" min={10} max={150} value={sceneSize} onChange={(e) => setSceneSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                {sceneShape === "radial" && (
                  <div>
                    <label className="text-[12px] text-neutral-500 flex justify-between">Softness <span className="tabular-nums text-neutral-400">{sceneSoftness}%</span></label>
                    <input type="range" min={0} max={100} value={sceneSoftness} onChange={(e) => setSceneSoftness(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                  </div>
                )}
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Peak alpha <span className="tabular-nums text-neutral-400">{scenePeakAlpha}%</span></label>
                  <input type="range" min={0} max={100} value={scenePeakAlpha} onChange={(e) => setScenePeakAlpha(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
              </>
            )}
            {scenePortalMode && (
              <>
                <div className="space-y-1">
                  <label className="text-[12px] text-neutral-500 flex justify-between">Scrim <span className="tabular-nums text-neutral-400">{scenePortalDim}%</span></label>
                  <input type="range" min={0} max={70} value={scenePortalDim} onChange={(e) => setScenePortalDim(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                {sceneVariant === "bleed" && (
                  <div className="space-y-1">
                    <label className="text-[12px] text-neutral-500 flex justify-between">Page wash <span className="tabular-nums text-neutral-400">{sceneBleedWash}%</span></label>
                    <input type="range" min={0} max={40} value={sceneBleedWash} onChange={(e) => setSceneBleedWash(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[12px] text-neutral-500 flex justify-between">Spill <span className="tabular-nums text-neutral-400">{sceneGlow}%</span></label>
                  <input type="range" min={0} max={80} value={sceneGlow} onChange={(e) => setSceneGlow(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                <label className="flex items-center justify-between text-[12px] text-neutral-500 cursor-pointer">
                  Glass chips
                  <input type="checkbox" checked={scenePortalGlass} onChange={(e) => setScenePortalGlass(e.target.checked)} className="accent-neutral-900" />
                </label>
              </>
            )}
            {sceneVariant !== "viewport" && (
              <>
                <label className="flex items-center justify-between text-[12px] text-neutral-500 cursor-pointer">
                  Parallax
                  <input type="checkbox" checked={sceneParallax} onChange={(e) => setSceneParallax(e.target.checked)} className="accent-neutral-900" />
                </label>
                {sceneParallax && (
                  <div className="space-y-1">
                    <label className="text-[12px] text-neutral-500 flex justify-between">Drift <span className="tabular-nums text-neutral-400">{sceneParallaxAmt}px</span></label>
                    <input type="range" min={0} max={160} value={sceneParallaxAmt} onChange={(e) => setSceneParallaxAmt(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                  </div>
                )}
              </>
            )}
            {sceneVariant !== "viewport" && (
              <>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Scale <span className="tabular-nums text-neutral-400">{sceneCardScale}%</span></label>
                  <input type="range" min={100} max={220} value={sceneCardScale} onChange={(e) => setSceneCardScale(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Vignette <span className="tabular-nums text-neutral-400">{sceneCardVignette}%</span></label>
                  <input type="range" min={0} max={80} value={sceneCardVignette} onChange={(e) => setSceneCardVignette(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Saturation <span className="tabular-nums text-neutral-400">{sceneCardSaturation}%</span></label>
                  <input type="range" min={0} max={200} value={sceneCardSaturation} onChange={(e) => setSceneCardSaturation(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
                </div>
              </>
            )}
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Layer opacity <span className="tabular-nums text-neutral-400">{sceneOpacity}%</span></label>
              <input type="range" min={0} max={100} value={sceneOpacity} onChange={(e) => setSceneOpacity(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Image blur <span className="tabular-nums text-neutral-400">{sceneBlur}px</span></label>
              <input type="range" min={0} max={30} value={sceneBlur} onChange={(e) => setSceneBlur(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <div className="space-y-3 pt-3 border-t border-neutral-100">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Page</p>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Tint <span className="tabular-nums text-neutral-400">{pageBgHex}</span></label>
              <input type="range" min={0} max={30} value={pageBgLevel} onChange={(e) => setPageBgLevel(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <div className="space-y-3 pt-3 border-t border-neutral-100">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Card fill</p>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Color <span className="tabular-nums text-neutral-400">{cardFillColor}</span></label>
              <div className="flex gap-1.5 mt-1.5 items-center">
                {["#ffffff", "#fafafa", "#f5f5f5", "#efefef", "#e5e5e5"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCardFillColor(c)}
                    className="w-6 h-6 rounded cursor-pointer"
                    style={{ background: c, border: cardFillColor === c ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)" }}
                  />
                ))}
                <input
                  type="color"
                  value={cardFillColor}
                  onChange={(e) => setCardFillColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-neutral-200"
                  style={{ padding: 0 }}
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Fill alpha <span className="tabular-nums text-neutral-400">{cardFillAlpha}%</span></label>
              <input type="range" min={0} max={100} value={cardFillAlpha} onChange={(e) => setCardFillAlpha(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Backdrop blur <span className="tabular-nums text-neutral-400">{cardBlur}px</span></label>
              <input type="range" min={0} max={40} value={cardBlur} onChange={(e) => setCardBlur(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <div className="pt-3 border-t border-neutral-100 space-y-2">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Presets</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  setSceneShape("bottom"); setSceneSize(39); setSceneSoftness(35); setScenePeakAlpha(48); setSceneOpacity(79); setSceneBlur(0);
                  setCardFillColor("#FAFAFA"); setCardFillAlpha(63); setCardBlur(28);
                }}
                className="px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              >
                Default
              </button>
              <button
                onClick={() => {
                  setSceneShape("radial"); setSceneSize(55); setSceneSoftness(43); setScenePeakAlpha(41); setSceneOpacity(56); setSceneBlur(0);
                  setCardFillColor("#ffffff"); setCardFillAlpha(11); setCardBlur(4);
                }}
                className="px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              >
                Halo
              </button>
            </div>
          </div>
          <p data-tuner-group="Motion" className="text-[11px] tracking-widest uppercase text-neutral-500">Motion</p>
          <div className="space-y-2">
            <p className="text-[10px] tracking-widest uppercase text-neutral-400">Starter</p>
            <div className="flex flex-wrap gap-1.5">
              {MOTION_PRESETS.map((p) => {
                const active = collapseDurMs === p.dur && collapseEase === p.ease;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setCollapseDurMs(p.dur); setCollapseEase(p.ease); }}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[12px] text-neutral-500 flex justify-between">
              Duration <span className="tabular-nums text-neutral-400">{collapseDurMs}ms</span>
            </label>
            <input
              type="range"
              min={50}
              max={800}
              step={10}
              value={collapseDurMs}
              onChange={(e) => setCollapseDurMs(Number(e.target.value))}
              className="w-full accent-neutral-900 h-1"
            />
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Easing</p>
            <div className="flex flex-wrap gap-1.5">
              {COLLAPSE_EASE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setCollapseEase(p.value)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${collapseEase === p.value ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            Drives the stats column width transition and the arc inset slide.
            Test by toggling the i icon or entering/exiting compare.
          </p>
          <div data-tuner-group="Stats" className="space-y-2">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">Chip grouping</p>
            <div className="flex gap-1.5">
              {([["single", "Single"], ["split", "Split"], ["image-corner", "On card"], ["top-corners", "Top corners"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setChipGrouping(m)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${chipGrouping === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div data-tuner-group="Stats" className="space-y-2">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">Bottom alignment</p>
            <div className="flex gap-1.5">
              {([["left", "Left"], ["center", "Center"], ["right", "Right"]] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setBottomAlignment(m)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${bottomAlignment === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div data-tuner-group="Stats" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400">Dense dividers</p>
              <button
                type="button"
                onClick={() => setDenseDividers((v) => !v)}
                aria-pressed={denseDividers}
                className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${denseDividers ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
              >
                {denseDividers ? "On" : "Off"}
              </button>
            </div>
            {denseDividers && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-neutral-500">Full width</label>
                  <button
                    type="button"
                    onClick={() => setDenseFullWidth((v) => !v)}
                    aria-pressed={denseFullWidth}
                    className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${denseFullWidth ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                  >
                    {denseFullWidth ? "On" : "Off"}
                  </button>
                </div>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">
                    Row spacing <span className="tabular-nums text-neutral-400">{denseRowGap}px</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={1}
                    value={denseRowGap}
                    onChange={(e) => setDenseRowGap(Number(e.target.value))}
                    className="w-full mt-1.5 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">
                    Top offset <span className="tabular-nums text-neutral-400">{statsTopOffset}px</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={4}
                    value={statsTopOffset}
                    onChange={(e) => setStatsTopOffset(Number(e.target.value))}
                    className="w-full mt-1.5 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">
                    Hairline opacity <span className="tabular-nums text-neutral-400">{denseOpacity}%</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={denseOpacity}
                    onChange={(e) => setDenseOpacity(Number(e.target.value))}
                    className="w-full mt-1.5 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-neutral-500">Split into 3 cards</label>
                  <button
                    type="button"
                    onClick={() => setSplitCards((v) => !v)}
                    aria-pressed={splitCards}
                    className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${splitCards ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                  >
                    {splitCards ? "On" : "Off"}
                  </button>
                </div>
                <div>
                  <p className="text-[12px] text-neutral-500 mb-1.5">Units toggle</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["tap", "row"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setUnitToggleVariant(v)}
                        className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${unitToggleVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                      >
                        {v === "tap" ? "Tap value" : "Units row"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Apple-style hairline between every stat row. Hides the inline cm/in toggle.
            </p>
          </div>
          <div data-tuner-group="Saved" className="pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Saved</p>
            <div className="flex flex-wrap gap-1.5">
              {(["lane", "tray", "shelf"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSavedSurface(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${savedSurface === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed mt-1.5">
              Bookmark on the card saves (⇧S). Lane puts the saved list on the wheel,
              Tray totals it in the corner, Shelf lays it out full-screen.
              {savedItems.length > 0 ? ` ${savedItems.length} saved.` : " Nothing saved yet."}
            </p>
            {savedItems.length > 0 && (
              <button
                onClick={() => setFavoriteIds(() => { try { localStorage.removeItem("humanoid-index:favorites"); } catch {} return new Set(); })}
                className="mt-1.5 text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer"
              >
                Clear saved
              </button>
            )}
          </div>
          <div data-tuner-group="Card" className="pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Buy</p>
            <div className="flex flex-wrap gap-1.5">
              {(["card", "chip", "below"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setBuyLayout(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${buyLayout === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v === "card" ? "Stats card" : v === "chip" ? "Image chip" : "Below card"}
                </button>
              ))}
            </div>
            {buyLayout === "card" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["split", "dark"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setBuyCardStyle(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${buyCardStyle === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
            {buyLayout === "card" && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[12px] text-neutral-500 flex-1">Hide when unbuyable</label>
                <button
                  className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${hideUnbuyable ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                  onClick={() => setHideUnbuyable(!hideUnbuyable)}
                >
                  {hideUnbuyable ? "On" : "Off"}
                </button>
              </div>
            )}
          </div>
          <div data-tuner-group="Arc" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Arc Style</p><div className="flex flex-wrap gap-1.5">{ARC_STYLES.map((s) => (<button key={s} onClick={() => pickArcStyle(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${arcStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{arcStyleLabels[s]}</button>))}</div></div>
          {arcStyle === "arc-names" && (
            <div data-tuner-group="Arc" className="pt-2 border-t border-neutral-100">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Arc Marker</p>
              <div className="flex flex-wrap gap-1.5"><button onClick={() => setArcMarkerVariant(0)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${arcMarkerVariant === 0 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>None</button>{MARKER_VARIANTS.map((m) => (<button key={m.id} onClick={() => setArcMarkerVariant(m.id)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${arcMarkerVariant === m.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{m.label}</button>))}</div>
              {arcMarkerVariant === 22 && (
                <div className="flex items-center gap-2.5 mt-2.5">
                  <label className="cursor-pointer flex-shrink-0" style={{ width: 22, height: 22, borderRadius: 6, background: arcMarkerColor, border: "1.5px solid rgba(0,0,0,0.08)", display: "block" }}>
                    <input type="color" value={arcMarkerColor} onChange={e => setArcMarkerColor(e.target.value)} className="sr-only" />
                  </label>
                  <span className="text-[12px] text-neutral-400 tabular-nums uppercase tracking-wider">{arcMarkerColor}</span>
                </div>
              )}
            </div>
          )}
          <div data-tuner-group="Compare" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Add CTA</p><div className="flex flex-wrap gap-1.5">{(["hover", "always"] as const).map((v) => (<button key={v} onClick={() => setAddCtaMode(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${addCtaMode === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v === "hover" ? "Hover + hint" : "Always dim"}</button>))}</div></div>
          <div data-tuner-group="Compare" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Compare slot</p><div className="flex flex-wrap gap-1.5">{(["silhouette", "plus"] as const).map((v) => (<button key={v} onClick={() => setCompareSlotStyle(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${compareSlotStyle === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v}</button>))}</div></div>
          <div data-tuner-group="Stats" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Stats over card</p><div className="flex flex-wrap gap-1.5">{(["off", "strip", "wash"] as const).map((v) => (<button key={v} onClick={() => setStatsOverlay(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${statsOverlay === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v === "off" ? "Column" : v}</button>))}</div>{blurbDock === "drawer" ? (<p className="text-[11px] text-neutral-400 mt-3">Image fit is the drawer&rsquo;s own &ldquo;Lift robot above it&rdquo; below — the sheet reads `drawerLift`, not `stripFit`.</p>) : (<div className="flex items-center justify-between mt-3"><label className="text-[12px] text-neutral-500">Fit image above strip</label><button type="button" onClick={() => setStripFit((v) => !v)} className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${stripFit ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>{stripFit ? "On" : "Off"}</button></div>)}</div><div className="mt-3"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Info blurb</p><div className="flex flex-wrap gap-1.5">{([["drawer", "Drawer"], ["shelf", "Shelf"], ["chip", "Chip"], ["swap", "Swap"], ["free", "Free"]] as const).map(([v, label]) => (<button key={v} onClick={() => setBlurbDock(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${blurbDock === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{label}</button>))}</div><p className="text-[11px] text-neutral-400 mt-1.5">{blurbDock === "drawer" ? "One pull-up panel per card — blurb + rows, scrolls, hides on the card's i." : blurbDock === "shelf" ? "Top row of the stats strip — one glass panel." : blurbDock === "chip" ? "Own chip, resting on the strip's top edge." : blurbDock === "swap" ? "Replaces the rows while info is on." : "Floats loose in the image (pre-shelf)."}</p>{blurbDock === "drawer" && (<><div className="flex items-center justify-between mt-3"><label className="text-[12px] text-neutral-500">Open by default</label><button type="button" onClick={() => { setDrawerDefaultOpen((v) => !v); setDrawerOverrides({}); }} className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${drawerDefaultOpen ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>{drawerDefaultOpen ? "On" : "Off"}</button></div><div className="flex items-center justify-between mt-2"><label className="text-[12px] text-neutral-500">Keep card-row &ldquo;i&rdquo;</label><button type="button" onClick={() => setShowInfoChip((v) => !v)} className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${showInfoChip ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>{showInfoChip ? "On" : "Off"}</button></div><div className="flex items-center justify-between mt-2"><label className="text-[12px] text-neutral-500">Lift robot above it</label><button type="button" onClick={() => setDrawerLift((v) => !v)} className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${drawerLift ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>{drawerLift ? "On" : "Off"}</button></div><label className="flex items-center justify-between text-[12px] text-neutral-500 mt-2">Height<span className="tabular-nums text-neutral-400">{drawerMaxPct}%</span></label><input type="range" min={25} max={100} step={1} value={drawerMaxPct} onChange={(e) => setDrawerMaxPct(+e.target.value)} className="w-full" /><div className="flex items-center justify-between mt-2"><label className="text-[12px] text-neutral-500">Opaque</label><button type="button" onClick={() => setDrawerOpaque((v) => !v)} className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${drawerOpaque ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>{drawerOpaque ? "On" : "Off"}</button></div><label className="flex items-center justify-between text-[12px] text-neutral-500 mt-2">Top radius<span className="tabular-nums text-neutral-400">{drawerRadius}px</span></label><input type="range" min={0} max={36} step={1} value={drawerRadius} onChange={(e) => setDrawerRadius(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500 mt-2">Blurb lines<span className="tabular-nums text-neutral-400">{blurbClampLines === 0 ? "Off" : blurbClampLines}</span></label><input type="range" min={0} max={12} step={1} value={blurbClampLines} onChange={(e) => setBlurbClampLines(+e.target.value)} className="w-full" /><p className="text-[11px] text-neutral-400 mt-1">Lines of description before &ldquo;More&rdquo;. 0 = no cap. Keeps the stat rows in the drawer&rsquo;s first screenful.</p><p className="text-[12px] tracking-widest uppercase text-neutral-400 mt-3 mb-2">Motion</p><div className="flex gap-1.5">{([["slide", "Slide"], ["genie", "Genie"]] as const).map(([m, label]) => (<button key={m} onClick={() => setDrawerMotion(m)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${drawerMotion === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{label}</button>))}</div><p className="text-[11px] text-neutral-400 mt-1.5">{drawerMotion === "genie" ? "Scales out of the placard\u2019s i \u2014 Dock un-minimise, inverted." : "Slides up from the card\u2019s bottom edge."}</p>{drawerMotion === "genie" && (<div className="mt-3 rounded-lg bg-neutral-50 p-2.5 space-y-2"><p className="text-[11px] text-neutral-400">Spring, not a curve — damping is the character. 1.00 is dead flat; below ~0.85 the sheet passes its mark and comes back.</p><label className="flex items-center justify-between text-[12px] text-neutral-500">Damping<span className="tabular-nums text-neutral-400">{genieDamping.toFixed(2)}</span></label><input type="range" min={0.55} max={1} step={0.01} value={genieDamping} onChange={(e) => setGenieDamping(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Open<span className="tabular-nums text-neutral-400">{genieDur + "ms"}</span></label><input type="range" min={160} max={900} step={10} value={genieDur} onChange={(e) => setGenieDur(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Close<span className="tabular-nums text-neutral-400">{genieCloseDur + "ms"}</span></label><input type="range" min={120} max={700} step={10} value={genieCloseDur} onChange={(e) => setGenieCloseDur(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Stagger<span className="tabular-nums text-neutral-400">{genieStagger === 0 ? "none" : `${genieStagger > 0 ? "tall" : "wide"} first ${Math.abs(genieStagger).toFixed(2)}`}</span></label><input type="range" min={-0.9} max={0.9} step={0.05} value={genieStagger} onChange={(e) => setGenieStagger(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Shut width<span className="tabular-nums text-neutral-400">{genieShutX.toFixed(2)}</span></label><input type="range" min={0.02} max={1} step={0.01} value={genieShutX} onChange={(e) => setGenieShutX(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Shut height<span className="tabular-nums text-neutral-400">{genieShutY.toFixed(2)}</span></label><input type="range" min={0.02} max={1} step={0.01} value={genieShutY} onChange={(e) => setGenieShutY(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Contents in at<span className="tabular-nums text-neutral-400">{Math.round(genieContent * 100) + "%"}</span></label><input type="range" min={0} max={0.9} step={0.05} value={genieContent} onChange={(e) => setGenieContent(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">Robot recedes<span className="tabular-nums text-neutral-400">{genieRecede === 0 ? "Off" : genieRecede + "%"}</span></label><input type="range" min={0} max={14} step={1} value={genieRecede} onChange={(e) => setGenieRecede(+e.target.value)} className="w-full" /><label className="flex items-center justify-between text-[12px] text-neutral-500">i hands off<span className="tabular-nums text-neutral-400">{genieHandoff === 0 ? "Off" : Math.round(genieHandoff * 100) + "%"}</span></label><input type="range" min={0} max={1} step={0.05} value={genieHandoff} onChange={(e) => setGenieHandoff(+e.target.value)} className="w-full" /><p className="text-[11px] text-neutral-400">Stagger is which axis leads — tall-first is the Dock. Close runs the axes in reverse so the sheet retreats the way it came.</p></div>)}</>)}</div>
          <div data-tuner-group="Compare" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Minus</p><div className="flex flex-wrap gap-1.5">{(["veil", "card-corner"] as const).map((v) => (<button key={v} onClick={() => setMinusPlacement(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${minusPlacement === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v === "veil" ? "Hover veil" : "Card corner"}</button>))}</div></div>
          <div data-tuner-group="Stats" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Year placement</p><div className="flex flex-wrap gap-1.5">{(["off", "beside", "below", "after-name", "pill", "chip"] as const).map((v) => (<button key={v} onClick={() => setYearPlacement(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${yearPlacement === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v === "after-name" ? "After name" : v.charAt(0).toUpperCase() + v.slice(1)}</button>))}</div></div>
          <div data-tuner-group="Stats" className="pt-2 border-t border-neutral-100 space-y-2">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">Pills layout</p>
            <div className="flex flex-wrap gap-1.5">
              {(["stack", "grouped"] as const).map((v) => (
                <button key={v} onClick={() => setPillsLayout(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${pillsLayout === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
                  {v === "stack" ? "Separate pills" : "Grouped (iOS)"}
                </button>
              ))}
            </div>
            {pillsLayout === "grouped" && (
              <>
                <div>
                  <label className="text-[12px] text-neutral-500 flex justify-between">Fill <span className="tabular-nums text-neutral-400">{groupedFill}</span></label>
                  <div className="flex gap-1.5 mt-1.5 items-center">
                    {["#F9F9F9", "#F4F4F4", "#FFFFFF", "#FAFAFA"].map((c) => (
                      <button key={c} onClick={() => setGroupedFill(c)} className="w-6 h-6 rounded cursor-pointer" style={{ background: c, border: groupedFill.toLowerCase() === c.toLowerCase() ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)" }} />
                    ))}
                    <input type="color" value={groupedFill} onChange={(e) => setGroupedFill(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-neutral-200" style={{ padding: 0 }} />
                  </div>
                </div>
                <div>
                  <p className="text-[12px] text-neutral-500 mb-1.5">Divider</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["full", "inset", "none"] as const).map((v) => (
                      <button key={v} onClick={() => setGroupedDivider(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${groupedDivider === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-neutral-500 flex-1">Outer ring</label>
                  <button onClick={() => setGroupedRing(!groupedRing)} className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${groupedRing ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>{groupedRing ? "On" : "Off"}</button>
                </div>
              </>
            )}
          </div>
          <div data-tuner-group="Card" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Share Button</p><div className="flex flex-wrap gap-1.5">{BUTTON_VARIANTS.map((v) => (<button key={v} onClick={() => onButtonVariantChange(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${buttonVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{BUTTON_LABELS[v]}</button>))}</div></div>
          <div data-tuner-group="Card" className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Toggle on-state</p><div className="flex flex-wrap gap-1.5">{(["ink", "pill", "dot"] as const).map((v) => (<button key={v} onClick={() => setToggleOnMode(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${toggleOnMode === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v}</button>))}</div></div>
          <div data-tuner-group="Card" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400">Card Icons</p>
              <button
                className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer"
                onClick={() => {
                  setCardIconChrome("ghost");
                  setCardIconShape("circle");
                  setCardIconSize(40);
                  setCardIconStroke(1.5);
                  setCardIconInset(7);
                  setCardIconGap(4);
                  setCardIconActive("tint");
                  setCardIconHoverFade(false);
                  setCardIcon3DLabel(false);
                }}
              >
                Reset
              </button>
            </div>
            <div>
              <p className="text-[12px] text-neutral-500 mb-1.5">Chrome</p>
              <div className="flex flex-wrap gap-1.5">
                {(["ghost", "outline", "filled", "glass"] as const).map((v) => (
                  <button key={v} onClick={() => setCardIconChrome(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${cardIconChrome === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] text-neutral-500 mb-1.5">Shape</p>
              <div className="flex flex-wrap gap-1.5">
                {(["circle", "rounded", "square"] as const).map((v) => (
                  <button key={v} onClick={() => setCardIconShape(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${cardIconShape === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] text-neutral-500 mb-1.5">Active state</p>
              <div className="flex flex-wrap gap-1.5">
                {(["tint", "ink", "outline"] as const).map((v) => (
                  <button key={v} onClick={() => setCardIconActive(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${cardIconActive === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v}</button>
                ))}
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Size <span className="tabular-nums text-neutral-400">{cardIconSize}px</span></label><input type="range" min={20} max={44} value={cardIconSize} onChange={(e) => setCardIconSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Stroke <span className="tabular-nums text-neutral-400">{cardIconStroke.toFixed(2)}</span></label><input type="range" min={100} max={250} value={Math.round(cardIconStroke * 100)} onChange={(e) => setCardIconStroke(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Corner inset <span className="tabular-nums text-neutral-400">{cardIconInset}px</span></label><input type="range" min={4} max={20} value={cardIconInset} onChange={(e) => setCardIconInset(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Gap between icons <span className="tabular-nums text-neutral-400">{cardIconGap}px</span></label><input type="range" min={0} max={16} value={cardIconGap} onChange={(e) => setCardIconGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2"><label className="text-[12px] text-neutral-500 flex-1">Hover-fade secondary</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${cardIconHoverFade ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setCardIconHoverFade(!cardIconHoverFade)}>{cardIconHoverFade ? "On" : "Off"}</button></div>
            <div><label className="text-[12px] text-neutral-500 block mb-1">Chip layout</label><div className="flex flex-wrap gap-1 rounded border border-neutral-200 p-0.5">{([["floating", "Float"], ["panel", "Panel"], ["below", "Below"], ["below-left", "Below L"], ["corners", "Corners"], ["unified", "Unified"]] as const).map(([m, label]) => (<button key={m} className={`px-2 py-0.5 text-[12px] rounded cursor-pointer ${chipLayout === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setChipLayout(m)}>{label}</button>))}</div></div>
            <div><label className="text-[12px] text-neutral-500 block mb-1">Morph style</label><div className="flex flex-wrap gap-1 rounded border border-neutral-200 p-0.5">{([["shrink", "Shrink"], ["scale", "Scale"], ["pop", "Pop"], ["slide-up", "Slide ↑"], ["slide-down", "Slide ↓"], ["blur", "Blur"], ["fade-fixed", "Fade"], ["none", "None"]] as const).map(([m, label]) => (<button key={m} className={`px-2 py-0.5 text-[12px] rounded cursor-pointer ${morphStyle === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setMorphStyle(m)}>{label}</button>))}</div></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Morph duration <span className="tabular-nums text-neutral-400">{morphDuration}ms</span></label><input type="range" min={80} max={700} step={20} value={morphDuration} onChange={(e) => setMorphDuration(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 block mb-1">Compare button</label><div className="flex flex-wrap gap-1 rounded border border-neutral-200 p-0.5">{([["glass", "Glass"], ["flat", "Flat"]] as const).map(([m, label]) => (<button key={m} className={`px-2 py-0.5 text-[12px] rounded cursor-pointer ${compareBtnStyle === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setCompareBtnStyle(m)}>{label}</button>))}</div></div>
            <div><label className="text-[12px] text-neutral-500 block mb-1">Corners close</label><div className="flex flex-wrap gap-1 rounded border border-neutral-200 p-0.5">{([["slim-minus", "Slim −"], ["click-card", "Click card"], ["hover-x", "Hover ×"], ["edge-chevron", "Edge ›"], ["card-edge-tab", "Card tab"]] as const).map(([m, label]) => (<button key={m} className={`px-2 py-0.5 text-[12px] rounded cursor-pointer ${cornersCloseMode === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setCornersCloseMode(m)}>{label}</button>))}</div></div>
            <div className="flex items-center gap-2"><label className="text-[12px] text-neutral-500 flex-1">Show &ldquo;3D&rdquo; label</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${cardIcon3DLabel ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setCardIcon3DLabel(!cardIcon3DLabel)}>{cardIcon3DLabel ? "On" : "Off"}</button></div>
          </div>
          <div data-tuner-group="Stats" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400">Glass chip</p>
              <button
                className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer"
                onClick={() => applyGlassPreset(GLASS_PRESETS[0])}
              >
                Reset
              </button>
            </div>
            <div>
              <p className="text-[12px] text-neutral-500 mb-1.5">Preset</p>
              <div className="flex flex-wrap gap-1.5">
                {GLASS_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyGlassPreset(p)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${activeGlassPreset?.name === p.name ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] text-neutral-500 mb-1.5">Ink</p>
              <div className="flex flex-wrap gap-1.5">
                {(["auto", "dark", "light"] as const).map((v) => (
                  <button key={v} onClick={() => setGlassInk(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${glassInk === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Tint <span className="tabular-nums text-neutral-400">{glassTint}</span></label>
              <div className="flex gap-1.5 mt-1.5 items-center">
                {["#ffffff", "#cccccc", "#9a9a9a", "#6b6b6b", "#3a3a3a", "#000000"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setGlassTint(c)}
                    className="w-6 h-6 rounded cursor-pointer"
                    style={{ background: c, border: glassTint.toLowerCase() === c ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)" }}
                  />
                ))}
                <input
                  type="color"
                  value={glassTint}
                  onChange={(e) => setGlassTint(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-neutral-200"
                  style={{ padding: 0 }}
                />
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Alpha <span className="tabular-nums text-neutral-400">{glassAlpha.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(glassAlpha * 100)} onChange={(e) => setGlassAlpha(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Blur <span className="tabular-nums text-neutral-400">{glassBlur}px</span></label><input type="range" min={0} max={40} value={glassBlur} onChange={(e) => setGlassBlur(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Outline <span className="tabular-nums text-neutral-400">{glassOutline.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(glassOutline * 100)} onChange={(e) => setGlassOutline(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Sheen <span className="tabular-nums text-neutral-400">{glassSheen.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(glassSheen * 100)} onChange={(e) => setGlassSheen(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div
              className="rounded-lg p-3 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)", minHeight: 56 }}
            >
              <div style={{ ...glassChipChrome, width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                Aa
              </div>
            </div>
          </div>
          <div data-tuner-group="Layout" className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Rail</p>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Icons</p><div className="flex flex-wrap gap-1.5">{([["lanes-type", "Lanes as type"], ["all-icons", "All icons"], ["no-icons", "No icons"]] as const).map(([v, label]) => (<button key={v} onClick={() => setRailIcons(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${railIcons === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{label}</button>))}</div><p className="text-[11px] text-neutral-400 mt-1.5">{railIcons === "lanes-type" ? "Lanes are words + counts, tools keep glyphs — the form pictographs and the lucide line icons stop sharing a column." : railIcons === "all-icons" ? "Every row icon + label. One family, but one rank too." : "Nothing but words. Loses the filled/empty read on Saved."}</p></div>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Grid lives</p><div className="flex flex-wrap gap-1.5">{([["toggle", "Switch under mark"], ["lane-trailing", "After lanes"], ["float", "Top-right"], ["row", "Own row"]] as const).map(([v, label]) => (<button key={v} onClick={() => setGridPlacement(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${gridPlacement === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{label}</button>))}</div><p className="text-[11px] text-neutral-400 mt-1.5">{gridPlacement === "toggle" ? "Wheel | grid switch under the mark — how you're looking, before which lane." : gridPlacement === "lane-trailing" ? "Unlabelled glyph hanging off the lanes: this lane, seen this way." : gridPlacement === "float" ? "Opposite corner. Rail becomes purely destinations, page gains a floating surface." : "A labelled row, the way it was — reads as a third destination."}</p></div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 pt-2">Nav</p>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Style</p><div className="flex flex-wrap gap-1.5">{NAV_STYLES.map((s) => (<button key={s} onClick={() => onNavStyleChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${navStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Chrome</p><div className="flex flex-wrap gap-1.5">{(["split", "joined"] as const).map((s) => (<button key={s} onClick={() => onChromeVariantChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${chromeVariant === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            {navStyle === "underline" && (
              <div><p className="text-[12px] text-neutral-500 mb-1.5">Switcher</p><div className="flex flex-wrap gap-1.5">{SWITCHER_STYLES.map((s) => (<button key={s} onClick={() => onSwitcherStyleChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${switcherStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            )}
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Top offset <span className="tabular-nums text-neutral-400">{navTop}px</span></label><input type="range" min={0} max={48} value={navTop} onChange={(e) => setNavTop(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Card growth <span className="tabular-nums text-neutral-400">{cardGrowth.toFixed(2)} → {effectiveMaxW}px cap</span></label><input type="range" min={18} max={32} value={Math.round(cardGrowth * 100)} onChange={(e) => setCardGrowth(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">Rail pull-in <span className="text-neutral-300">(wide screens)</span></label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${railPullIn ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setRailPullIn(!railPullIn)}>{railPullIn ? "On" : "Off"}</button></div>
            <div style={{ opacity: railPullIn ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Pull rate <span className="tabular-nums text-neutral-400">{railPull.toFixed(2)} → {navEdge}px</span></label><input type="range" min={0} max={100} value={Math.round(railPull * 100)} onChange={(e) => { setRailPull(Number(e.target.value) / 100); setRailPullIn(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">Auto side inset</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${autoNavX ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setAutoNavX(!autoNavX)}>{autoNavX ? "On" : "Off"}</button></div>
            <div style={{ opacity: autoNavX ? 0.5 : 1 }}><label className="text-[12px] text-neutral-500 flex justify-between">Side inset <span className="tabular-nums text-neutral-400">{navX}px</span></label><input type="range" min={0} max={200} value={navX} onChange={(e) => { setNavX(Number(e.target.value)); setAutoNavX(false); }} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div data-tuner-group="Card" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Card Give</p><button className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setGiveVelScale(3); setGivePushAmt(5); setGiveLeanAmt(0.9); setGiveTiltAmt(4); setGiveTiltDepth(800); }}>Reset</button></div>
            <div className="flex flex-wrap gap-1.5">{GIVE_STYLES.map((s) => (<button key={s} onClick={() => setGiveStyle(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${giveStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{giveStyleLabels[s]}</button>))}</div>
            <div style={{ opacity: (giveStyle === "push" || giveStyle === "lean" || giveStyle === "tilt" || giveStyle === "drag") ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Velocity scale <span className="tabular-nums text-neutral-400">{giveVelScale.toFixed(1)}</span></label><input type="range" min={5} max={80} value={Math.round(giveVelScale * 10)} onChange={(e) => setGiveVelScale(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: (giveStyle === "push" || giveStyle === "drag") ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Push amount <span className="tabular-nums text-neutral-400">{givePushAmt}px</span></label><input type="range" min={0} max={30} value={givePushAmt} onChange={(e) => setGivePushAmt(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "lean" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Lean amount <span className="tabular-nums text-neutral-400">{giveLeanAmt.toFixed(1)}°</span></label><input type="range" min={0} max={50} value={Math.round(giveLeanAmt * 10)} onChange={(e) => setGiveLeanAmt(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "tilt" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Tilt amount <span className="tabular-nums text-neutral-400">{giveTiltAmt.toFixed(1)}°</span></label><input type="range" min={0} max={200} value={Math.round(giveTiltAmt * 10)} onChange={(e) => setGiveTiltAmt(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "tilt" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Tilt depth <span className="tabular-nums text-neutral-400">{giveTiltDepth}px</span></label><input type="range" min={200} max={2000} step={50} value={giveTiltDepth} onChange={(e) => setGiveTiltDepth(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div data-tuner-group="Card" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400">Lucky Tap</p>
              <button className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setLuckyTapStyle("shake"); setLuckyTapDur(500); setLuckyTapAngle(2.7); setLuckyTapDepth(1400); setLuckyTapOriginY(100); setLuckyShakePx(8); setLuckyShakeCycles(2); }}>Reset</button>
            </div>
            <div className="flex gap-1.5">
              {(["tilt", "shake"] as const).map((s) => (
                <button key={s} onClick={() => setLuckyTapStyle(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${luckyTapStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>
              ))}
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Duration <span className="tabular-nums text-neutral-400">{luckyTapDur}ms</span></label><input type="range" min={120} max={900} step={10} value={luckyTapDur} onChange={(e) => setLuckyTapDur(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "tilt" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Peak angle <span className="tabular-nums text-neutral-400">{luckyTapAngle.toFixed(1)}°</span></label><input type="range" min={0} max={300} value={Math.round(luckyTapAngle * 10)} onChange={(e) => setLuckyTapAngle(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "tilt" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Depth <span className="tabular-nums text-neutral-400">{luckyTapDepth}px</span></label><input type="range" min={200} max={2000} step={50} value={luckyTapDepth} onChange={(e) => setLuckyTapDepth(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "tilt" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Pivot Y <span className="tabular-nums text-neutral-400">{luckyTapOriginY}%</span></label><input type="range" min={0} max={100} value={luckyTapOriginY} onChange={(e) => setLuckyTapOriginY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "shake" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Shake amount <span className="tabular-nums text-neutral-400">{luckyShakePx}px</span></label><input type="range" min={0} max={14} value={luckyShakePx} onChange={(e) => setLuckyShakePx(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "shake" ? 1 : 0.5 }}><label className="text-[12px] text-neutral-500 flex justify-between">Shake cycles <span className="tabular-nums text-neutral-400">{luckyShakeCycles}</span></label><input type="range" min={1} max={8} value={luckyShakeCycles} onChange={(e) => setLuckyShakeCycles(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div data-tuner-group="Stats" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Stat Pills</p><button className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setStatPillRadius(40); setStatPillGap(4); setStatPillPadX(16); setStatPillPadY(11); setStatPillBg("#FCFCFC"); setInfoMode("bare"); }}>Reset</button></div>
            <div>
              <p className="text-[12px] text-neutral-500 mb-1.5">Info</p>
              <div className="flex flex-wrap gap-1.5">
                {(["pill", "open", "bare"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setInfoMode(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${infoMode === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-neutral-500">Legacy labels</label>
              {(() => {
                // Pre-mono-uppercase look: Geist Sans, weight 500, tight negative tracking, mixed case.
                // Strict check across every value so dragging any slider/control flips this back to OFF —
                // otherwise the toggle would lie about being in the preset state.
                const isLegacy =
                  pillLabelFont === "var(--font-geist-sans)" &&
                  pillLabelFontSize === 13 &&
                  Math.abs(pillLabelLetterSpacing - (-0.01)) < 0.0005 &&
                  pillLabelWeight === 500 &&
                  !pillLabelUppercase &&
                  pillLabelColor === "var(--c-ink-body)";
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isLegacy) {
                        setPillLabelFont("var(--font-geist-mono)");
                        setPillLabelFontSize(13);
                        setPillLabelLetterSpacing(0.06);
                        setPillLabelWeight(700);
                        setPillLabelUppercase(true);
                        setPillLabelColor("#888");
                      } else {
                        setPillLabelFont("var(--font-geist-sans)");
                        setPillLabelFontSize(13);
                        setPillLabelLetterSpacing(-0.01);
                        setPillLabelWeight(500);
                        setPillLabelUppercase(false);
                        setPillLabelColor("var(--c-ink-body)");
                      }
                    }}
                    className="text-[12px] px-2 py-1 rounded transition-colors"
                    style={{ background: isLegacy ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: isLegacy ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none", cursor: "pointer" }}
                  >
                    {isLegacy ? "ON" : "OFF"}
                  </button>
                );
              })()}
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Action variant</label>
              <div className="flex flex-wrap gap-1.5">
                {(["pill", "text", "accent", "dark", "hairline", "split"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setActionVariant(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${actionVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Status placement</label>
              <div className="flex flex-wrap gap-1.5">
                {(["card", "chip", "label", "consolidate", "corner", "hidden"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStatusPlacement(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${statusPlacement === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Action row</label>
              <div className="flex flex-wrap gap-1.5">
                {(["split-hairline", "split-rule", "split-soft", "split-bare", "full", "dark"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setActionRowVariant(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${actionRowVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Pinned section</label>
              <div className="flex flex-wrap gap-1.5">
                {(["hairline", "tinted", "shadow", "subcard"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPinnedTreatment(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${pinnedTreatment === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-neutral-500 flex-1">Section eyebrows (Specs / Notes)</label>
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${showSectionEyebrows ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                onClick={() => setShowSectionEyebrows(!showSectionEyebrows)}
              >
                {showSectionEyebrows ? "On" : "Off"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-neutral-500 flex-1">Compare blurb (AI overview)</label>
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${showCompareBlurb ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                onClick={() => setShowCompareBlurb(!showCompareBlurb)}
              >
                {showCompareBlurb ? "On" : "Off"}
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-neutral-500">Compare row gap</label>
                <span className="text-[12px] text-neutral-400 tabular-nums">{compareRowGap}px</span>
              </div>
              <input type="range" min={-4} max={12} value={compareRowGap} onChange={(e) => setCompareRowGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-neutral-500">Compare column width</label>
                <span className="text-[12px] text-neutral-400 tabular-nums">{statsW}px</span>
              </div>
              <input type="range" min={140} max={320} step={2} value={statsW} onChange={(e) => setStatsW(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-neutral-500">Card radius</label>
                <span className="text-[12px] text-neutral-400 tabular-nums">{cardRadius}px</span>
              </div>
              <input type="range" min={0} max={40} step={1} value={cardRadius} onChange={(e) => setCardRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-neutral-500 flex-1">Flag/dot side</label>
              <div className="flex items-center gap-1">
                {(["left", "right"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setValueVisualSide(side)}
                    className={`px-2 py-0.5 rounded text-[12px] cursor-pointer transition-all capitalize ${valueVisualSide === side ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
            {actionVariant === "split" && (
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-neutral-500 flex-1">Consolidate Status into Buy pill</label>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${splitConsolidate ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
                  onClick={() => setSplitConsolidate(!splitConsolidate)}
                >
                  {splitConsolidate ? "On" : "Off"}
                </button>
              </div>
            )}
            {actionVariant === "split" && (
              <div>
                <label className="text-[12px] text-neutral-500 mb-1.5 block">Buy button color</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(SPLIT_BUTTON_COLORS) as SplitButtonColor[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSplitButtonColor(v)}
                      className={`px-2 py-1 rounded-full text-[12px] cursor-pointer transition-all flex items-center gap-1.5 ${splitButtonColor === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                    >
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: SPLIT_BUTTON_COLORS[v], display: "inline-block" }} />
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Action hover tint</label>
              <div className="flex flex-wrap gap-1.5">
                {(["none", "charcoal", "slate", "stone"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setActionHoverTint(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${actionHoverTint === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Pill label size <span className="tabular-nums text-neutral-400">{pillLabelFontSize}px</span></label><input type="range" min={9} max={18} value={pillLabelFontSize} onChange={(e) => setPillLabelFontSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div>
              <label className="text-[12px] text-neutral-500">Pill label font</label>
              <div className="flex flex-col gap-1 mt-1.5">
                {([
                  { label: "Geist Mono", value: "var(--font-geist-mono)" },
                  { label: "Square", value: "var(--font-geist-pixel-square)" },
                  { label: "Grid", value: "var(--font-geist-pixel-grid)" },
                  { label: "Circle", value: "var(--font-geist-pixel-circle)" },
                  { label: "Triangle", value: "var(--font-geist-pixel-triangle)" },
                  { label: "Line", value: "var(--font-geist-pixel-line)" },
                ] as const).map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPillLabelFont(value)}
                    className="text-left px-2 py-1 rounded transition-colors"
                    style={{ background: pillLabelFont === value ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: pillLabelFont === value ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none", cursor: "pointer", fontSize: pillLabelFontSize, fontFamily: value, letterSpacing: "0.06em" }}
                  >
                    INFO · OVERVIEW · STATUS
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Letter spacing <span className="tabular-nums text-neutral-400">{pillLabelLetterSpacing.toFixed(2)}em</span></label><input type="range" min={-0.05} max={0.3} step={0.01} value={pillLabelLetterSpacing} onChange={(e) => setPillLabelLetterSpacing(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Weight</label>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {[300, 400, 500, 600, 700, 800].map((w) => (
                  <button key={w} type="button" onClick={() => setPillLabelWeight(w)}
                    className="text-[12px] px-2 py-1 rounded transition-colors tabular-nums"
                    style={{ background: pillLabelWeight === w ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: pillLabelWeight === w ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none", cursor: "pointer", fontWeight: w }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-neutral-500">Uppercase</label>
              <button type="button" onClick={() => setPillLabelUppercase((v) => !v)}
                className="text-[12px] px-2 py-1 rounded transition-colors"
                style={{ background: pillLabelUppercase ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: pillLabelUppercase ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none", cursor: "pointer" }}>
                {pillLabelUppercase ? "ON" : "OFF"}
              </button>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Label logo <span className="tabular-nums text-neutral-400">{labelLogoSize}px</span></label>
              <input type="range" min={16} max={56} value={labelLogoSize} onChange={(e) => setLabelLogoSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Blurb size <span className="tabular-nums text-neutral-400">{blurbFontSize}px</span></label>
              <input type="range" min={9} max={16} value={blurbFontSize} onChange={(e) => setBlurbFontSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
              <label className="text-[12px] text-neutral-500 flex justify-between mt-2">
                <span>Stat-col fill <span className="text-neutral-400">· {bubbleVariants[bubbleVariant - 1].name}</span></span>
                <span className="text-[11px] text-neutral-400 capitalize">{outlineStyle}</span>
              </label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(["off","flat","sheen","light","halo","gloss"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setOutlineStyle(s)}
                    className="text-[11px] px-1.5 py-0.5 rounded capitalize cursor-pointer transition-colors"
                    style={{ background: outlineStyle === s ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: outlineStyle === s ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-1.5 mb-1">From card</div>
              <div className="grid grid-cols-6 gap-1.5">
                {bubbleVariants.filter((b) => b.fromCard).map((b) => {
                  const i = bubbleVariants.indexOf(b);
                  const selected = bubbleVariant === i + 1;
                  return (
                    <button
                      key={b.name}
                      type="button"
                      title={`${b.name} · ${b.bg}`}
                      onClick={() => setBubbleVariant(i + 1)}
                      className="relative h-7 rounded-md cursor-pointer transition-transform hover:scale-[1.06]"
                      style={{
                        background: b.bg,
                        boxShadow: selected
                          ? `${b.shadow}, 0 0 0 2px rgba(95, 96, 89, 0.95)`
                          : b.shadow,
                        backdropFilter: b.backdropFilter,
                        WebkitBackdropFilter: b.backdropFilter,
                      }}
                    />
                  );
                })}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-2 mb-1">Neutrals</div>
              <div className="grid grid-cols-6 gap-1.5">
                {bubbleVariants.filter((b) => !b.fromCard).map((b) => {
                  const i = bubbleVariants.indexOf(b);
                  const selected = bubbleVariant === i + 1;
                  return (
                    <button
                      key={b.name}
                      type="button"
                      title={b.name}
                      onClick={() => setBubbleVariant(i + 1)}
                      className="relative h-7 rounded-md cursor-pointer transition-transform hover:scale-[1.06]"
                      style={{
                        background: b.bg,
                        boxShadow: selected
                          ? `${b.shadow}, 0 0 0 2px rgba(95, 96, 89, 0.95)`
                          : b.shadow,
                        backdropFilter: b.backdropFilter,
                        WebkitBackdropFilter: b.backdropFilter,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setBlurbFloat((v) => !v)}
                  className="text-[12px] px-2 py-1 rounded transition-colors"
                  style={{ background: blurbFloat ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: blurbFloat ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none", cursor: "pointer" }}
                >
                  Float to top
                </button>
                <button
                  type="button"
                  onClick={() => setSplitBlurb((v) => !v)}
                  className="text-[12px] px-2 py-1 rounded transition-colors ml-1"
                  style={{ background: splitBlurb ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)", color: splitBlurb ? "#fff" : "rgba(95, 96, 89, 0.85)", border: "none", cursor: "pointer" }}
                >
                  Split columns
                </button>
              </div>
              <label className="text-[12px] text-neutral-500 flex justify-between mt-3">Expand indicator</label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {([
                  { key: "chevron", label: "Chevron" },
                  { key: "minimal", label: "Minimal" },
                  { key: "edgebar", label: "Edge bar" },
                  { key: "inline", label: "Inline" },
                  { key: "pill", label: "Pill" },
                ] as { key: BlurbExpandIndicator; label: string }[]).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setBlurbExpandIndicator(opt.key)}
                    className="text-[12px] px-2 py-1 rounded transition-colors"
                    style={{
                      background: blurbExpandIndicator === opt.key ? "rgba(95, 96, 89, 0.95)" : "rgba(95, 96, 89, 0.07)",
                      color: blurbExpandIndicator === opt.key ? "#fff" : "rgba(95, 96, 89, 0.85)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Card↔Stats gap <span className="tabular-nums text-neutral-400">{statsGap}px</span></label><input type="range" min={0} max={80} value={statsGap} onChange={(e) => setStatsGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Collapse affordance</label>
              <div className="flex flex-wrap gap-1.5">
                {(["pull-tab", "gap-zone", "hover-fade", "info-icon", "none"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCollapseVariant(v)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${collapseVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Column width <span className="tabular-nums text-neutral-400">{Math.round(statsColScale * 100)}%</span></label><input type="range" min={30} max={120} value={Math.round(statsColScale * 100)} onChange={(e) => setStatsColScale(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Radius <span className="tabular-nums text-neutral-400">{statPillRadius}px</span></label><input type="range" min={0} max={40} value={statPillRadius} onChange={(e) => setStatPillRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Gap <span className="tabular-nums text-neutral-400">{statPillGap}px</span></label><input type="range" min={0} max={16} value={statPillGap} onChange={(e) => setStatPillGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Padding X <span className="tabular-nums text-neutral-400">{statPillPadX}px</span></label><input type="range" min={6} max={28} value={statPillPadX} onChange={(e) => setStatPillPadX(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Padding Y <span className="tabular-nums text-neutral-400">{statPillPadY}px</span></label><input type="range" min={4} max={18} value={statPillPadY} onChange={(e) => setStatPillPadY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Background <span className="tabular-nums text-neutral-400">{statPillBg}</span></label>
              <div className="flex items-center gap-1.5 mt-1.5">
                {["#ffffff", "#fcfcfc", "#fafafa", "#f5f5f5", "#efefef", "#f4f1eb", "transparent"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setStatPillBg(c)}
                    className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{
                      background: c === "transparent" ? "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 8px 8px" : c,
                      border: statPillBg === c ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)",
                    }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={statPillBg === "transparent" ? "#fcfcfc" : statPillBg}
                  onChange={(e) => setStatPillBg(e.target.value)}
                  className="w-5 h-5 rounded-full cursor-pointer border border-neutral-200 ml-1"
                  style={{ padding: 0 }}
                  aria-label="Custom color"
                />
              </div>
            </div>
          </div>
          <div data-tuner-group="Card" className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">New Badge</p>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font size <span className="tabular-nums text-neutral-400">{newBadgeFontSize}px</span></label><input type="range" min={8} max={16} value={newBadgeFontSize} onChange={(e) => setNewBadgeFontSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          {(arcStyle === "crown" || arcStyle === "arc-timeline" || arcStyle === "arc-names" || arcStyle === "arc-tag") && (
          <div data-tuner-group="Arc" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Crown</p><button className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setDrumAngle(18); setDrumRadius(90); setDrumFsMax(16); setDrumFsMin(8); setDrumFwMax(500); setDrumCompression(0.59); setDrumOpPower(4.0); setDrumXOffset(120); setDrumMaskFade(35); setDrumRange(1); setDrumTracking(0.04); setMiniCrownRadius(70); }}>Reset</button></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Angle <span className="tabular-nums text-neutral-400">{drumAngle}°</span></label><input type="range" min={8} max={45} value={drumAngle} onChange={(e) => setDrumAngle(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Radius <span className="tabular-nums text-neutral-400">{drumRadius}px</span></label><input type="range" min={60} max={300} value={drumRadius} onChange={(e) => setDrumRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Size max <span className="tabular-nums text-neutral-400">{drumFsMax}px</span></label><input type="range" min={20} max={80} value={drumFsMax} onChange={(e) => setDrumFsMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Size min <span className="tabular-nums text-neutral-400">{drumFsMin}px</span></label><input type="range" min={6} max={32} value={drumFsMin} onChange={(e) => setDrumFsMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Weight <span className="tabular-nums text-neutral-400">{drumFwMax}</span></label><input type="range" min={300} max={900} step={100} value={drumFwMax} onChange={(e) => setDrumFwMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Compression <span className="tabular-nums text-neutral-400">{drumCompression.toFixed(2)}</span></label><input type="range" min={40} max={100} value={Math.round(drumCompression * 100)} onChange={(e) => setDrumCompression(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Fade power <span className="tabular-nums text-neutral-400">{drumOpPower.toFixed(1)}</span></label><input type="range" min={3} max={40} value={Math.round(drumOpPower * 10)} onChange={(e) => setDrumOpPower(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">X offset <span className="tabular-nums text-neutral-400">{drumXOffset}px</span></label><input type="range" min={10} max={120} value={drumXOffset} onChange={(e) => setDrumXOffset(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Mask fade <span className="tabular-nums text-neutral-400">{drumMaskFade}%</span></label><input type="range" min={0} max={35} value={drumMaskFade} onChange={(e) => setDrumMaskFade(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Visible items <span className="tabular-nums text-neutral-400">{drumRange}</span></label><input type="range" min={2} max={8} value={drumRange} onChange={(e) => setDrumRange(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Tracking <span className="tabular-nums text-neutral-400">{drumTracking.toFixed(2)}em</span></label><input type="range" min={-10} max={10} value={Math.round(drumTracking * 100)} onChange={(e) => setDrumTracking(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Mini radius <span className="tabular-nums text-neutral-400">{miniCrownRadius}px</span></label><input type="range" min={20} max={100} value={miniCrownRadius} onChange={(e) => setMiniCrownRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Scroll threshold <span className="tabular-nums text-neutral-400">{wheelThreshold}</span></label><input type="range" min={5} max={100} value={wheelThreshold} onChange={(e) => { setCustomThreshold(Number(e.target.value)); setIsCustom(true); }} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">Auto position</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${autoArcInset ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setAutoArcInset(!autoArcInset)}>{autoArcInset ? "On" : "Off"}</button><span className="text-[12px] tabular-nums text-neutral-300">{effectiveArcInset}px</span></div>
            <div className="space-y-2 pt-1 pb-1">
              <p className="text-[11px] tracking-widest uppercase text-neutral-400">Arc font</p>
              <select
                value={arcFontFamily}
                onChange={(e) => setArcFontFamily(e.target.value)}
                className="w-full text-[12px] border border-neutral-200 rounded px-1.5 py-1 cursor-pointer bg-white"
                style={{ fontFamily: arcFontFamily || undefined }}
              >
                <option value="">Inherit (Geist Sans)</option>
                {FONTS.map((f) => (
                  <option key={f.name} value={f.family} style={{ fontFamily: f.family }}>{f.name}</option>
                ))}
              </select>
              <div><label className="text-[12px] text-neutral-500 flex justify-between">Weight <span className="tabular-nums text-neutral-400">{arcFontWeight}</span></label><input type="range" min={100} max={900} step={100} value={arcFontWeight} onChange={(e) => setArcFontWeight(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
              <div><label className="text-[12px] text-neutral-500 flex justify-between">Letter spacing <span className="tabular-nums text-neutral-400">{arcLetterSpacing.toFixed(3)}em</span></label><input type="range" min={-80} max={150} value={Math.round(arcLetterSpacing * 1000)} onChange={(e) => setArcLetterSpacing(Number(e.target.value) / 1000)} className="w-full accent-neutral-900 h-1" /></div>
              <div className="flex items-center gap-2"><label className="text-[12px] text-neutral-500 flex-1">Italic</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${arcItalic ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setArcItalic(!arcItalic)}>{arcItalic ? "On" : "Off"}</button></div>
            </div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">All Caps</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${allCaps ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => onAllCapsChange?.(!allCaps)}>{allCaps ? "On" : "Off"}</button></div>
            <div style={{ opacity: autoArcInset ? 0.5 : 1 }}><label className="text-[12px] text-neutral-500 flex justify-between">Arc inset <span className="tabular-nums text-neutral-400">{arcInset}px</span></label><input type="range" min={30} max={600} value={arcInset} onChange={(e) => { setArcInset(Number(e.target.value)); setAutoArcInset(false); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Arc radius <span className="tabular-nums text-neutral-400">{arcWheelR}px</span></label><input type="range" min={80} max={1500} value={arcWheelR} onChange={(e) => setArcWheelR(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Step angle <span className="tabular-nums text-neutral-400">{arcStepDeg.toFixed(1)}°</span></label><input type="range" min={10} max={80} value={Math.round(arcStepDeg * 10)} onChange={(e) => setArcStepDeg(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Text gap <span className="tabular-nums text-neutral-400">{arcTextGap}px</span></label><input type="range" min={0} max={80} value={arcTextGap} onChange={(e) => setArcTextGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2"><label className="text-[12px] text-neutral-500 flex-1">Right-align names</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${arcRightAlign ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setArcRightAlign(!arcRightAlign)}>{arcRightAlign ? "On" : "Off"}</button></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Hug gap <span className="tabular-nums text-neutral-400">{arcHugBuffer}px</span></label><input type="range" min={0} max={200} value={arcHugBuffer} onChange={(e) => setArcHugBuffer(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Line opacity <span className="tabular-nums text-neutral-400">{arcLineOp.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(arcLineOp * 100)} onChange={(e) => setArcLineOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font max <span className="tabular-nums text-neutral-400">{arcFsMax}px</span></label><input type="range" min={12} max={40} value={arcFsMax} onChange={(e) => setArcFsMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font min <span className="tabular-nums text-neutral-400">{arcFsMin}px</span></label><input type="range" min={6} max={20} value={arcFsMin} onChange={(e) => setArcFsMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Disk gap <span className="tabular-nums text-neutral-400">{arcDiskGap}px</span></label><input type="range" min={0} max={280} value={arcDiskGap} onChange={(e) => setArcDiskGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Edge fade <span className="tabular-nums text-neutral-400">{arcMaskFade}%</span></label><input type="range" min={0} max={45} value={arcMaskFade} onChange={(e) => setArcMaskFade(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Inactive fade <span className="tabular-nums text-neutral-400">{arcInactiveOp.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(arcInactiveOp * 100)} onChange={(e) => setArcInactiveOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Rail at rest <span className="tabular-nums text-neutral-400">{arcRestOp.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(arcRestOp * 100)} onChange={(e) => setArcRestOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Rail on approach <span className="tabular-nums text-neutral-400">{arcHoverBoost.toFixed(2)}</span></label><input type="range" min={0} max={200} value={Math.round(arcHoverBoost * 100)} onChange={(e) => setArcHoverBoost(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Approach radius <span className="tabular-nums text-neutral-400">{arcHoverRadius}px</span></label><input type="range" min={40} max={600} value={arcHoverRadius} onChange={(e) => setArcHoverRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div className="pt-2 mt-1 border-t border-neutral-200/70">
              <label className="text-[12px] text-neutral-500 flex items-center justify-between cursor-pointer">
                <span>Live rail (grows on approach)</span>
                <input type="checkbox" checked={railLabelsOnHover} onChange={(e) => setRailLabelsOnHover(e.target.checked)} className="accent-neutral-900" />
              </label>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Rail shape</label>
              <div className="flex flex-wrap gap-1.5">
                {(["column", "gear", "ring", "concentric"] as const).map((b) => (
                  <button key={b} onClick={() => setRailShape(b)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${railShape === b ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{b}</button>
                ))}
              </div>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Ring radius <span className="tabular-nums text-neutral-400">{ringR}px</span></label><input type="range" min={56} max={160} value={ringR} onChange={(e) => setRingR(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div>
              <label className="text-[12px] text-neutral-500 flex items-center justify-between cursor-pointer">
                <span>Concentric inset auto <span className="tabular-nums text-neutral-400">{effectiveRingInset}px</span></span>
                <input type="checkbox" checked={autoRingInset} onChange={(e) => setAutoRingInset(e.target.checked)} className="accent-neutral-900" />
              </label>
            </div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Concentric inset <span className="tabular-nums text-neutral-400">{ringInset}px</span></label><input type="range" min={24} max={200} value={ringInset} onChange={(e) => { setAutoRingInset(false); setRingInset(Number(e.target.value)); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Ring sweep <span className="tabular-nums text-neutral-400">{ringSweep}°</span></label><input type="range" min={90} max={180} value={ringSweep} onChange={(e) => setRingSweep(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Rail approach band <span className="tabular-nums text-neutral-400">{railNearPx}px</span></label><input type="range" min={60} max={600} value={railNearPx} onChange={(e) => setRailNearPx(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Rail follow <span className="tabular-nums text-neutral-400">{railGrowMs}ms</span></label><input type="range" min={17} max={400} value={railGrowMs} onChange={(e) => setRailGrowMs(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div>
              <label className="text-[12px] text-neutral-500 mb-1.5 block">Boundary fill</label>
              <div className="flex flex-wrap gap-1.5">
                {(["off", "dots", "arc", "wedge"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setArcBoundary(b)}
                    className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${arcBoundary === b ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                  >
                    {b === "off" ? "Off" : b === "dots" ? "Dots" : b === "arc" ? "Arc" : "Wedge"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Disk color <span className="tabular-nums text-neutral-400">{arcDiskColor}</span></label>
              <div className="flex items-center gap-1.5 mt-1.5">
                {["#ffffff", "#fafafa", "#f5f5f5", "#ececec", "#f4f1eb", "#e8e4dc", "transparent"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setArcDiskColor(c)}
                    className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110"
                    style={{
                      background: c === "transparent" ? "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 8px 8px" : c,
                      border: arcDiskColor === c ? "1.5px solid rgba(95, 96, 89, 0.95)" : "1px solid rgba(95, 96, 89, 0.18)",
                    }}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={arcDiskColor === "transparent" ? "#f5f5f5" : arcDiskColor}
                  onChange={(e) => setArcDiskColor(e.target.value)}
                  className="w-5 h-5 rounded-full cursor-pointer border border-neutral-200 ml-1"
                  style={{ padding: 0 }}
                  aria-label="Custom color"
                />
              </div>
            </div>
          </div>
          )}
          {arcStyle === "arc-tag" && (
          <div data-tuner-group="Arc" className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Tag</p><button className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setTagFsMin(11); setTagFsMax(14); setTagOpMin(0.58); setTagOpMax(1); setTagGreyMin(64); setTagGreyMax(213); setTagPillOp(0.03); setTagFalloff(2); setTagPadX(0); setTagPadY(0); setTagRadius(20); setTagMarkerSize(4); setTagMarkerOp(0.32); }}>Reset</button></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font min <span className="tabular-nums text-neutral-400">{tagFsMin}px</span></label><input type="range" min={8} max={20} value={tagFsMin} onChange={(e) => setTagFsMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font max <span className="tabular-nums text-neutral-400">{tagFsMax}px</span></label><input type="range" min={12} max={32} value={tagFsMax} onChange={(e) => setTagFsMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Opacity min <span className="tabular-nums text-neutral-400">{tagOpMin.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(tagOpMin * 100)} onChange={(e) => setTagOpMin(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Opacity max <span className="tabular-nums text-neutral-400">{tagOpMax.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(tagOpMax * 100)} onChange={(e) => setTagOpMax(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Color dark <span className="tabular-nums text-neutral-400">{tagGreyMin}</span></label><input type="range" min={0} max={120} value={tagGreyMin} onChange={(e) => setTagGreyMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Color light <span className="tabular-nums text-neutral-400">{tagGreyMax}</span></label><input type="range" min={120} max={240} value={tagGreyMax} onChange={(e) => setTagGreyMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Falloff <span className="tabular-nums text-neutral-400">{tagFalloff}</span></label><input type="range" min={2} max={20} value={tagFalloff} onChange={(e) => setTagFalloff(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Pill opacity <span className="tabular-nums text-neutral-400">{tagPillOp.toFixed(2)}</span></label><input type="range" min={0} max={50} value={Math.round(tagPillOp * 100)} onChange={(e) => setTagPillOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Pad X <span className="tabular-nums text-neutral-400">{tagPadX}px</span></label><input type="range" min={0} max={20} value={tagPadX} onChange={(e) => setTagPadX(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Pad Y <span className="tabular-nums text-neutral-400">{tagPadY}px</span></label><input type="range" min={0} max={15} value={tagPadY} onChange={(e) => setTagPadY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Pill radius <span className="tabular-nums text-neutral-400">{tagRadius}px</span></label><input type="range" min={0} max={20} value={tagRadius} onChange={(e) => setTagRadius(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Marker size <span className="tabular-nums text-neutral-400">{tagMarkerSize}px</span></label><input type="range" min={0} max={16} value={tagMarkerSize} onChange={(e) => setTagMarkerSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Marker opacity <span className="tabular-nums text-neutral-400">{tagMarkerOp.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(tagMarkerOp * 100)} onChange={(e) => setTagMarkerOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          )}
          <div data-tuner-group="Arc" className="pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400" style={{ fontFamily: "var(--font-epetri)", letterSpacing: "0.18em" }}>Epetri Font</p>
              <button
                type="button"
                onClick={() => onEpetriModeChange?.(!epetriMode)}
                aria-pressed={epetriMode}
                className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${epetriMode ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}
              >
                {epetriMode ? "On" : "Off"}
              </button>
            </div>
          </div>
        </TunerShell>
      )}

      {/* Saved surfaces. Both read the same set the wheel's saved lane does —
          the surface is the only thing the switch changes. */}
      {savedSurface === "tray" && !comparing && (
        <SavedTray
          items={savedItems}
          open={trayOpen}
          onOpenChange={setTrayOpen}
          onSelect={seatOnId}
          onRemove={toggleFavorite}
        />
      )}
      {savedSurface === "shelf" && (
        <SavedShelf
          items={savedItems}
          open={shelfOpen}
          onClose={() => setShelfOpen(false)}
          onSelect={(id) => { setShelfOpen(false); seatOnId(id); }}
          onRemove={toggleFavorite}
          onShare={() => {
            const url = `${window.location.origin}${window.location.pathname}?picks=${savedItems.map((h) => h.id).join(",")}`;
            navigator.clipboard?.writeText(url);
            toast("Shelf link copied");
          }}
        />
      )}

    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// Guide chat — keyword matching to help find the right humanoid
// ═══════════════════════════════════════════════════════════════
type ChatConfig = { bgOpacity: number; blur: number; radius: number; width: number; shadowOp: number; guideStyle: "plain" | "bubble"; userStyle: "dark" | "tint" | "outline"; fontSize: number; inputRadius: number; };

// ── Intent parser ────────────────────────────────────────────
type SortKey = "maxSpeed" | "cost" | "height" | "weight" | "dof";
const WORD_COUNTS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, a: 1, couple: 2, few: 3, some: 3 };

const SORTS: { terms: string[]; field: SortKey; dir: "asc" | "desc"; label: string }[] = [
  { terms: ["fast", "speed", "quick", "mph", "m/s"], field: "maxSpeed", dir: "desc", label: "fastest" },
  { terms: ["cheap", "affordable", "budget", "inexpensive", "price", "cost"], field: "cost", dir: "asc", label: "cheapest" },
  { terms: ["expensive", "premium", "pricey"], field: "cost", dir: "desc", label: "most expensive" },
  { terms: ["tall", "height", "big", "large"], field: "height", dir: "desc", label: "tallest" },
  { terms: ["short", "small", "compact"], field: "height", dir: "asc", label: "shortest" },
  { terms: ["light", "lightweight"], field: "weight", dir: "asc", label: "lightest" },
  { terms: ["heavy", "heavier", "heaviest"], field: "weight", dir: "desc", label: "heaviest" },
  { terms: ["dexterous", "dof", "flexible", "finger", "hand"], field: "dof", dir: "desc", label: "most dexterous" },
];

const FILTERS: { terms: string[]; fn: (h: typeof humanoids[0]) => boolean; label: string }[] = [
  { terms: ["available", "production", "buy", "ship", "order"], fn: (h) => h.status === "In Production", label: "available to buy" },
  { terms: ["home", "domestic", "household", "consumer"], fn: (h) => !!h.description?.toLowerCase().match(/home|household|domestic|consumer/), label: "home use" },
  { terms: ["warehouse", "logistics", "industrial", "factory", "commercial"], fn: (h) => !!h.description?.toLowerCase().match(/warehouse|logistics|industrial|factory|commercial/), label: "industrial" },
  { terms: ["research", "lab", "academic"], fn: (h) => !!h.description?.toLowerCase().match(/research|lab|academ/), label: "research" },
];

function parseChat(raw: string): { reply: string; results: typeof humanoids; compare: boolean } {
  const q = raw.toLowerCase().trim();

  // Count — digit or word ("2", "two", "top 3", "a few")
  let count = 3;
  const digitMatch = q.match(/\b(top\s*)?(\d+)\b/);
  if (digitMatch) count = Math.min(parseInt(digitMatch[2]), 8);
  else {
    for (const [word, n] of Object.entries(WORD_COUNTS)) {
      if (new RegExp(`\\b${word}\\b`).test(q)) { count = n; break; }
    }
  }

  // Compare intent — "compare", "vs", "versus", "against"
  const wantsCompare = /\bcompare\b|\bvs\b|\bversus\b|\bagainst\b/.test(q);
  if (wantsCompare) count = Math.max(count, 2);

  // Direct name / manufacturer match
  const nameHits = humanoids.filter((h) =>
    h.name.toLowerCase().split(/\s+/).some((w) => q.includes(w) && w.length > 2) ||
    h.manufacturer.toLowerCase().split(/\s+/).some((w) => q.includes(w) && w.length > 3)
  );

  // Sort attribute
  const sort = SORTS.find((s) => s.terms.some((t) => q.includes(t)));

  // Use-case / status filter
  const filter = FILTERS.find((f) => f.terms.some((t) => q.includes(t)));

  // Build result set
  let pool = nameHits.length > 0 && !sort && !filter ? nameHits : [...humanoids];
  if (filter) pool = pool.filter(filter.fn);
  if (sort) {
    pool = pool
      .filter((h) => h[sort.field] != null)
      .sort((a, b) => {
        const av = sort.field === "cost" ? parseFloat(String(a.cost ?? "").replace(/[^0-9.]/g, "")) || 9999 : (a[sort.field] as number) ?? 0;
        const bv = sort.field === "cost" ? parseFloat(String(b.cost ?? "").replace(/[^0-9.]/g, "")) || 9999 : (b[sort.field] as number) ?? 0;
        return sort.dir === "asc" ? av - bv : bv - av;
      });
  }

  const results = pool.slice(0, count);

  // Build reply text
  let reply = "";
  if (results.length === 0) {
    reply = "No matches — try asking about speed, price, height, availability, or a robot name.";
  } else if (wantsCompare && results.length >= 2) {
    const names = results.slice(0, 2).map((h) => h.name).join(" and ");
    reply = `Here's ${names}${sort ? ` (${sort.label})` : ""}. Tap one to navigate, then hit Compare to put them side by side.`;
  } else if (sort && filter) {
    reply = `${results.length === 1 ? "Top pick" : `Top ${results.length}`} that ${filter.label}, sorted by ${sort.label}:`;
  } else if (sort) {
    reply = `${results.length === 1 ? "Top pick" : `Top ${results.length}`} by ${sort.label}:`;
  } else if (filter) {
    reply = `${results.length} humanoid${results.length > 1 ? "s" : ""} for ${filter.label}:`;
  } else if (nameHits.length > 0) {
    reply = results.length === 1 ? `Found ${results[0].name}:` : `Found ${results.length} match${results.length > 1 ? "es" : ""}:`;
  } else {
    reply = `Here are ${results.length} humanoid${results.length > 1 ? "s" : ""}:`;
  }

  return { reply, results, compare: wantsCompare && results.length >= 2 };
}

// Geist at 400 goes wispy on a white glass panel at these sizes — the panel
// was the only place on the site running default body weight, which is what
// made it look like a different product's component. 450 sits between the
// site's body text and its 500 labels.

function GuideChat({ onSelect, onClose, config }: { onSelect: (id: string) => void; onClose: () => void; config: ChatConfig }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "guide"; text: string; suggestions?: typeof humanoids }[]>([
    // The placeholder already shows what a query looks like, so the greeting
    // does not need to teach it. One question, no preamble.
    { role: "guide", text: "What are you looking for?" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    const text = query;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setQuery("");
    const { reply, results } = parseChat(text);
    setMessages((prev) => [...prev, { role: "guide", text: reply, suggestions: results.length > 0 ? results : undefined }]);
  };

  const userBubbleStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { fontSize: config.fontSize, fontWeight: WEIGHT.body, maxWidth: "80%", lineHeight: 1.5 };
    if (config.userStyle === "dark") return { ...base, background: "var(--c-ink)", color: "white" };
    if (config.userStyle === "outline") return { ...base, background: "transparent", boxShadow: "inset 0 0 0 1px rgba(95, 96, 89, 0.18)", color: INK.on };
    return { ...base, background: "rgba(95, 96, 89, 0.08)", color: INK.on };
  };

  return (
    <Overlay onClose={onClose} label="Ask">
      {/* The panel used to build its own glass at the bottom of the screen with
          no scrim and no way out but the rail row it came from. It sits in the
          shared frame now, in the same place Search opens — the two are the
          same gesture, so they are the same object. The dev tuner still drives
          what is INSIDE (type size, bubble treatment); the frame is the
          system's and is not tunable. */}
      <>
        {/* Messages */}
        <div ref={scrollRef} className="max-h-[280px] overflow-y-auto px-5 pt-5 pb-3 space-y-4 scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === "guide" ? (
                config.guideStyle === "bubble" ? (
                  <div style={{ display: "inline-block", background: "rgba(95, 96, 89, 0.06)", borderRadius: 18, padding: "8px 12px", fontSize: config.fontSize, fontWeight: WEIGHT.body, color: INK.on, lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                ) : (
                  <p style={{ fontSize: config.fontSize, fontWeight: WEIGHT.body, color: INK.on, lineHeight: 1.6 }}>{m.text}</p>
                )
              ) : (
                <div className="flex justify-end">
                  <p className="px-3.5 py-2" style={{ ...userBubbleStyle(), borderRadius: 18 }}>{m.text}</p>
                </div>
              )}
              {m.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {m.suggestions.map((h) => {
                    return (
                      <button
                        key={h.id}
                        onClick={() => onSelect(h.id)}
                        // No hover scale. Nothing else on this site grows under
                        // the cursor — the rail, the chips and the card buttons
                        // all answer with ink and fill, so a chip that jumped
                        // 3% read as an imported component.
                        className="chat-suggestion flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                        style={{
                          borderRadius: 18,
                          background: "rgba(95, 96, 89, 0.05)",
                          border: "none",
                          transition: "background 200ms cubic-bezier(0.33, 1, 0.68, 1)",
                        }}
                      >
                        <div className="relative w-5 h-7 flex-shrink-0">
                          {h.imageUrl ? <Image src={h.imageUrl} alt={h.name} fill className="object-contain" sizes="20px" /> : <PlaceholderLogo />}
                        </div>
                        <div className="text-left">
                          {/* Explicit steps, not arithmetic off config.fontSize.
                              `fontSize - 3` put the manufacturer at 10px when
                              the tuner went low, which is below the size the
                              rest of the page will render. */}
                          <p style={{ fontSize: 14, fontWeight: 500, color: INK.on, lineHeight: 1.3 }}>{h.name}</p>
                          <p style={{ fontSize: 12, fontWeight: WEIGHT.body, color: INK.off, lineHeight: 1.3 }}>{h.manufacturer}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(95, 96, 89, 0.08)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="fastest, cheapest, for home…"
            className="chat-input flex-1 outline-none bg-transparent"
            style={{ fontSize: config.fontSize, fontWeight: WEIGHT.body, color: INK.on }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="flex-shrink-0 flex items-center justify-center cursor-pointer"
            style={{
              // 28px to match the card's icon buttons, and the same fill the
              // lane indicator uses when it is armed. Disabled rather than
              // merely faded, so an empty Enter and an empty click agree.
              width: 28,
              height: 28,
              borderRadius: config.inputRadius,
              border: "none",
              background: query.trim() ? "rgba(95, 96, 89, 0.09)" : "transparent",
              color: query.trim() ? INK.on : "rgba(95, 96, 89, 0.3)",
              cursor: query.trim() ? "pointer" : "default",
              transition: "background 200ms cubic-bezier(0.33, 1, 0.68, 1), color 200ms cubic-bezier(0.33, 1, 0.68, 1)",
            }}
            aria-label="Send"
          >
            <ArrowUp size={15} strokeWidth={1.75} />
          </button>
        </div>
      </>
    </Overlay>
  );
}

function MobileComingSoon() {
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "normal",
    lineHeight: 1,
    color: "rgba(95, 96, 89, 0.75)",
    padding: "10px 16px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.05)",
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };

  const onShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://humanoid-index.com";
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Humanoid Index", url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn't copy link");
    }
  };

  const onCopy = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://humanoid-index.com";
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn't copy link");
    }
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <main className="min-h-[100dvh] bg-white flex flex-col items-center justify-center" style={{ padding: 24, gap: 20 }}>
      <p
        style={{
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "normal",
          lineHeight: 1.4,
          color: "rgba(95, 96, 89, 0.5)",
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        Mobile experience coming soon. Open on desktop for the full thing.
      </p>
      <div className="flex items-center" style={{ gap: 10 }}>
        {canShare && (
          <button type="button" onClick={onShare} style={labelStyle}>
            Send to my computer
          </button>
        )}
        <button type="button" onClick={onCopy} style={labelStyle}>
          Copy link
        </button>
      </div>
      <Toaster position="bottom-center" offset={32} />
    </main>
  );
}

// ─── Fonts ─────────────────────────────────────────────────────
export default function HomeClient() {
  const isMobile = useIsMobile();
  const isDev = useIsDev();

  const [layout, setLayout] = useState<Layout>("E");
  const [indexView, setIndexView] = useState<IndexView>("timeline");

  const [navStyle, setNavStyle] = useState<NavStyle>("trio");
  const [chromeVariant, setChromeVariant] = useState<"split" | "joined">("split");
  const [surfaceColor, setSurfaceColor] = useState(SURFACE);
  const [surfaceHover, setSurfaceHover] = useState("#E8E8EE");
  const [palette, setPalette] = useState<"cool" | "neutral">("cool");
  useEffect(() => {
    if (palette === "neutral") {
      setSurfaceColor("#F4F4F4");
      setSurfaceHover("#EBEBEB");
    } else {
      setSurfaceColor("#F1F1F6");
      setSurfaceHover("#E8E8EE");
    }
  }, [palette]);
  const [switcherStyle, setSwitcherStyle] = useState<SwitcherStyle>("text");
  const [chatOpen, setChatOpen] = useState(false);
  // The panel has no close control of its own — it was only ever opened from a
  // trigger that has since been removed, so nothing needed to dismiss it. The
  // Ask row toggles, and Escape closes, which is what every other overlay here
  // does. Bound only while open so it can't swallow Escape from compare.
  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setChatOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatOpen]);
  const [showChatTuner, setShowChatTuner] = useState(false);
  const [chatConfig, setChatConfig] = useState({
    bgOpacity: 92,
    blur: 24,
    radius: 24,
    width: 400,
    shadowOp: 10,
    guideStyle: "plain" as "plain" | "bubble",
    userStyle: "tint" as "dark" | "tint" | "outline",
    fontSize: 14,
    inputRadius: 99,
  });
  const [goToId, setGoToId] = useState<string | null>(null);
  const [luckyNonce, setLuckyNonce] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [shareViewLabel, setShareViewLabel] = useState("Share view");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Footer capsule menu — "Share site" and "Feedback" used to be two visible
  // segments; they collapse into one trigger so the capsule reads as credit
  // plus one affordance rather than a row of links.
  const [toScale, setToScale] = useState(false);
  const [useImperial, setUseImperial] = useState(true);
  // Default to metric for non-US locales. Runs post-hydration so SSR + first
  // client render agree on `true` and avoid a hydration mismatch.
  useEffect(() => {
    try {
      const region = new Intl.Locale(navigator.language).maximize().region;
      if (region && region !== "US" && region !== "LR" && region !== "MM") {
        setUseImperial(false);
      }
    } catch {
      // Older browser without Intl.Locale.maximize — leave default.
    }
  }, []);

  // Share URL — Browse writes to this ref, Home's share button reads it
  const shareUrlRef = useRef("");
  const shareOgRef = useRef("");
  const copyUrl = useCallback((url: string, label: string, ogUrl?: string) => {
    navigator.clipboard.writeText(url);
    // With an ogUrl, hold the toast open until the image loads (gen can take
    // longer than a fixed duration on cold cache), then linger so the swipe
    // reveal is actually visible. Safety timer dismisses if the image never
    // resolves. Without ogUrl, keep the old fixed duration.
    if (!ogUrl) {
      toast.custom((id) => (
        <div
          onClick={() => toast.dismiss(id)}
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "1px solid #ececec",
            boxShadow: "0 10px 30px -8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)",
            borderRadius: 16,
            padding: 6,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 12, color: "#737373", padding: "6px 8px 2px", letterSpacing: "-0.005em" }}>
            {label}
          </div>
        </div>
      ), { duration: 2600 });
      return;
    }
    toast.custom((id) => {
      let dismissed = false;
      const dismiss = () => { if (!dismissed) { dismissed = true; toast.dismiss(id); } };
      const safety = setTimeout(dismiss, 8000);
      const onReady = () => {
        // 520ms swipe + ~980ms dwell on the revealed image before dismiss.
        setTimeout(() => { clearTimeout(safety); dismiss(); }, 1500);
      };
      return (
        <div
          onClick={() => { clearTimeout(safety); dismiss(); }}
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "1px solid #ececec",
            boxShadow: "0 10px 30px -8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)",
            borderRadius: 16,
            padding: 6,
            cursor: "pointer",
          }}
        >
          <OgPreview src={ogUrl} onReady={onReady} />
          <div style={{ fontSize: 12, color: "#737373", padding: "6px 8px 2px", letterSpacing: "-0.005em" }}>
            {label}
          </div>
        </div>
      );
    }, { duration: Infinity });
  }, []);
  const [allCaps, setAllCaps] = useState(false);

  const [fontState, setFontState] = useState<{ mode: "all" | "fav"; allIdx: number; favIdx: number }>({ mode: "all", allIdx: 0, favIdx: 0 });
  const { mode: fontMode, allIdx: fontIdx, favIdx } = fontState;
  const [showFontToast, setShowFontToast] = useState(false);
  const [epetriMode, setEpetriMode] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Intro animation state ──
  const [introPhase, setIntroPhase] = useState<"logo" | "exit" | "done">("logo");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [buttonVariant, setButtonVariant] = useState<ButtonVariant>("outlined");
  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase("exit"), 1400);
    const t2 = setTimeout(() => setIntroPhase("done"), 1750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const onRandomHumanoid = useCallback(() => {
    if (layout !== "E") setLayout("E");
    setChatOpen(false);
    setLuckyNonce((n) => n + 1);
  }, [layout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isDev) {
        if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
          setFontState((s) => ({
            mode: "all",
            allIdx: s.mode === "all" ? (s.allIdx + 1) % FONTS.length : s.allIdx,
            favIdx: s.favIdx,
          }));
          setShowFontToast(true);
          if (toastTimeout.current) clearTimeout(toastTimeout.current);
          toastTimeout.current = setTimeout(() => setShowFontToast(false), 1800);
        }
        if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
          setFontState((s) => ({
            mode: "fav",
            allIdx: s.allIdx,
            favIdx: s.mode === "fav" ? (s.favIdx + 1) % FAVORITE_FONTS.length : s.favIdx,
          }));
          setShowFontToast(true);
          if (toastTimeout.current) clearTimeout(toastTimeout.current);
          toastTimeout.current = setTimeout(() => setShowFontToast(false), 1800);
        }
        if (e.key === "e" && !e.metaKey && !e.ctrlKey) {
          setEpetriMode((v) => !v);
        }
      }
      if ((e.key === "?" || e.key === "/" || (e.key === "R" && e.shiftKey)) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onRandomHumanoid();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDev, onRandomHumanoid]);

  const handleSelectHumanoid = useCallback((id: string) => {
    setLayout("E");
    setGoToId(id);
    setChatOpen(false);
    setTimeout(() => setGoToId(null), 100);
  }, []);

  // The search modal renders from `layout.tsx`, outside this tree, so a picked
  // result arrives as an event rather than a callback. It lands on the same
  // handler the chat and the what's-new toast use, so all three navigate the
  // wheel the same way.
  useEffect(() => {
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) handleSelectHumanoid(id);
    };
    window.addEventListener(SEARCH_SELECT_EVENT, onPick);
    return () => window.removeEventListener(SEARCH_SELECT_EVENT, onPick);
  }, [handleSelectHumanoid]);

  // "What's new" toast — fires once on mount, after the intro overlay clears.
  const newHumanoids = useMemo(() => {
    const cutoff = Date.now() - NEW_WINDOW_DAYS * 86_400_000;
    return humanoids.filter(
      (h) => h.addedAt && new Date(h.addedAt).getTime() >= cutoff,
    );
  }, []);
  const firstNewId = newHumanoids.length > 0 ? newHumanoids[0].id : null;
  useEffect(() => {
    if (introPhase !== "done" || newHumanoids.length === 0 || !firstNewId) return;
    const seenKey = `hi:new-toast-seen:${newHumanoids.map((h) => h.id).sort().join(",")}`;
    try {
      if (localStorage.getItem(seenKey)) return;
    } catch {}
    const t = setTimeout(() => {
      toast.custom((id) => (
        <AnnouncementToast
          humanoids={newHumanoids}
          onView={() => {
            try { localStorage.setItem(seenKey, "1"); } catch {}
            handleSelectHumanoid(firstNewId);
            toast.dismiss(id);
          }}
          onDismiss={() => {
            try { localStorage.setItem(seenKey, "1"); } catch {}
            toast.dismiss(id);
          }}
        />
      ), { duration: 12000 });
      try { localStorage.setItem(seenKey, "1"); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [introPhase, newHumanoids, firstNewId, handleSelectHumanoid]);

  const [homeNonce, setHomeNonce] = useState(0);
  const goHome = useCallback(() => {
    setLayout("E");
    setChatOpen(false);
    setHomeNonce((n) => n + 1);
  }, []);

  const introDone = introPhase === "done";

  // Avoid desktop-layout flash on first paint while we measure viewport
  if (isMobile === null) {
    return <main className="min-h-[100dvh] bg-white" />;
  }
  if (isMobile) {
    return <MobileDeck />;
  }

  return (
    <main
      data-palette={palette}
      className="min-h-screen bg-white"
      style={{
        fontFamily: epetriMode
          ? "var(--font-epetri)"
          : (fontMode === "fav" ? FAVORITE_FONTS[favIdx].family : FONTS[fontIdx].family),
        ["--c-surface" as string]: surfaceColor,
        ["--c-surface-hover" as string]: surfaceHover,
        ...(palette === "neutral" ? {
          ["--c-ink" as string]: "#343433",
          ["--c-ink-body" as string]: "#6b6b6b",
          ["--c-ink-muted" as string]: "#a3a3a3",
          ["--c-ink-subtle" as string]: "#c4c4c4",
        } : {}),
        ...(epetriMode ? EPETRI_FONT_OVERRIDES : {}),
      } as React.CSSProperties}
    >
      {/* ── Intro overlay ── */}
      {introPhase !== "done" && (
        <div className="intro-overlay">
          <div className="flex flex-col items-center" style={{ gap: 22 }}>
            <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
              {/* Ring */}
              <svg
                width="56" height="56" viewBox="0 0 56 56" fill="none"
                className="absolute inset-0"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="28" cy="28" r="18"
                  stroke="var(--c-ink)" strokeWidth="1" fill="none"
                  strokeDasharray="113" strokeDashoffset="113"
                  strokeLinecap="round"
                  style={{
                    opacity: 0.1,
                    animation: introPhase === "logo"
                      ? "intro-ring-draw 0.7s cubic-bezier(0.33, 1, 0.68, 1) 0.35s forwards"
                      : "intro-ring-fade 0.3s ease forwards",
                  }}
                />
              </svg>
              {/* Logo */}
              <svg
                width="24" height="24" viewBox="0 0 20 20" fill="none"
                className={introPhase === "logo" ? "intro-logo-enter" : "intro-logo-exit"}
              >
                <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      {introDone && (
        <div className="intro-nav fixed inset-0 z-[999] pointer-events-none select-none">
          <div className="nav-slide w-full h-full">
            <LayoutSwitcher
              active={layout}
              onChange={setLayout}
              navStyle={navStyle}
              onNavStyleChange={setNavStyle}
              switcherStyle={switcherStyle}
              onRandomHumanoid={onRandomHumanoid}
              luckyNonce={luckyNonce}
              indexView={indexView}
              onIndexViewChange={setIndexView}
              onShareSite={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                copyUrl(origin, "Site link copied", `${origin}/og-default.png`);
              }}
              onShareView={() => copyUrl(shareUrlRef.current || (typeof window !== "undefined" ? window.location.origin : ""), "View link copied", shareOgRef.current)}
              shareViewLabel={shareViewLabel}
              shareUrlRef={shareUrlRef}
              shareOgRef={shareOgRef}
              comparing={comparing}
              joined={chromeVariant === "joined"}
              onGoHome={goHome}
            />
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className={introDone ? "intro-content" : "opacity-0"}>
        {layout === "E" && <Browse goToId={goToId} homeNonce={homeNonce} navStyle={navStyle} onNavStyleChange={setNavStyle} switcherStyle={switcherStyle} onSwitcherStyleChange={setSwitcherStyle} luckyNonce={luckyNonce} onRandomHumanoid={onRandomHumanoid} onComparingChange={setComparing} onShareViewLabelChange={setShareViewLabel} introDone={introDone} shareUrlRef={shareUrlRef} shareOgRef={shareOgRef} onShareView={() => copyUrl(shareUrlRef.current || (typeof window !== "undefined" ? window.location.origin : ""), "View link copied", shareOgRef.current)} onHome={goHome} onShareSite={() => { const origin = typeof window !== "undefined" ? window.location.origin : ""; copyUrl(origin, "Site link copied", `${origin}/og-default.png`); }} onFeedback={() => setFeedbackOpen(true)} onToggleChat={() => setChatOpen((v) => !v)} chatActive={chatOpen} buttonVariant={buttonVariant} onButtonVariantChange={setButtonVariant} allCaps={allCaps} onAllCapsChange={setAllCaps} showChatTuner={showChatTuner} onToggleChatTuner={() => setShowChatTuner((v) => !v)} epetriMode={epetriMode} onEpetriModeChange={setEpetriMode} isDev={isDev} surfaceColor={surfaceColor} onSurfaceColorChange={setSurfaceColor} surfaceHover={surfaceHover} onSurfaceHoverChange={setSurfaceHover} chromeVariant={chromeVariant} onChromeVariantChange={setChromeVariant} toScale={toScale} onToScaleChange={setToScale} useImperial={useImperial} onUseImperialChange={setUseImperial} palette={palette} onPaletteChange={setPalette} />}
        {layout === "Z" && indexView === "timeline" && <EllipticalCarousel allCaps={allCaps} isDev={isDev} />}
        {layout === "Z" && indexView === "grid" && <GridView humanoids={humanoids} />}
      </div>

      {/* Font toast */}
      {showFontToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg animate-blur-fade"
          style={{ background: "rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
        >
          <p className="text-[12px] tracking-wide" style={{ color: "var(--c-ink-muted)" }}>
            <span style={{ color: "var(--c-ink-body)", fontWeight: 500 }}>
              {fontMode === "fav" ? FAVORITE_FONTS[favIdx].name : FONTS[fontIdx].name}
            </span>
            <span className="ml-2 tabular-nums" style={{ color: "var(--c-ink-subtle)" }}>
              {fontMode === "fav"
                ? `${favIdx + 1}/${FAVORITE_FONTS.length}`
                : `${fontIdx + 1}/${FONTS.length}`}
            </span>
          </p>
        </div>
      )}

      {/* Chat tuner panel */}
      {isDev && showChatTuner && (
        <TunerShell title="Chat" hint="C" onClose={() => setShowChatTuner(false)}>
          <div data-tuner-group="Chat">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Guide Style</p>
            <div className="flex gap-1.5">
              {(["plain", "bubble"] as const).map((v) => (
                <button key={v} onClick={() => setChatConfig((c) => ({ ...c, guideStyle: v }))}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${chatConfig.guideStyle === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">User Bubble</p>
            <div className="flex gap-1.5">
              {(["tint", "dark", "outline"] as const).map((v) => (
                <button key={v} onClick={() => setChatConfig((c) => ({ ...c, userStyle: v }))}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${chatConfig.userStyle === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">Container</p>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Background <span className="tabular-nums text-neutral-400">{chatConfig.bgOpacity}%</span></label>
              <input type="range" min={0} max={100} value={chatConfig.bgOpacity} onChange={(e) => setChatConfig((c) => ({ ...c, bgOpacity: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Blur <span className="tabular-nums text-neutral-400">{chatConfig.blur}px</span></label>
              <input type="range" min={0} max={40} value={chatConfig.blur} onChange={(e) => setChatConfig((c) => ({ ...c, blur: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Radius <span className="tabular-nums text-neutral-400">{chatConfig.radius}px</span></label>
              <input type="range" min={0} max={40} value={chatConfig.radius} onChange={(e) => setChatConfig((c) => ({ ...c, radius: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Width <span className="tabular-nums text-neutral-400">{chatConfig.width}px</span></label>
              <input type="range" min={280} max={520} value={chatConfig.width} onChange={(e) => setChatConfig((c) => ({ ...c, width: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Shadow <span className="tabular-nums text-neutral-400">{chatConfig.shadowOp}%</span></label>
              <input type="range" min={0} max={30} value={chatConfig.shadowOp} onChange={(e) => setChatConfig((c) => ({ ...c, shadowOp: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">Typography</p>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Font size <span className="tabular-nums text-neutral-400">{chatConfig.fontSize}px</span></label>
              <input type="range" min={11} max={16} value={chatConfig.fontSize} onChange={(e) => setChatConfig((c) => ({ ...c, fontSize: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Input radius <span className="tabular-nums text-neutral-400">{chatConfig.inputRadius}px</span></label>
              <input type="range" min={0} max={99} value={chatConfig.inputRadius} onChange={(e) => setChatConfig((c) => ({ ...c, inputRadius: Number(e.target.value) }))} className="w-full accent-neutral-900 h-1" />
            </div>
          </div>
          <button onClick={() => setChatConfig({ bgOpacity: 92, blur: 24, radius: 24, width: 400, shadowOp: 10, guideStyle: "plain", userStyle: "tint", fontSize: 13, inputRadius: 99 })}
            className="text-[12px] text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors">
            Reset
          </button>
        </TunerShell>
      )}

      {/* The top edge is deliberately empty. The mark used to sit up here on
          its own, which meant the page opened on a small abstract glyph in a
          corner with nothing to relate it to. It now lives in the footer
          capsule beside the credit — identity and authorship read as one line,
          and the eye enters on the robot instead of on chrome. */}

      {/* The credit capsule that used to live here — mark, "Roy Jad © 2026",
          and a plus that opened Share / Feedback — is now the bottom of the
          floating sidebar in Browse. The bottom edge is deliberately empty. */}

      <Toaster
        position="bottom-center"
        offset={32}
        style={{ "--width": "600px" } as React.CSSProperties}
        toastOptions={{ unstyled: true, style: { display: "flex", justifyContent: "center", width: "100%" } }}
      />

      {chatOpen && <GuideChat onSelect={handleSelectHumanoid} onClose={() => setChatOpen(false)} config={chatConfig} />}

      {showShortcuts && <ShortcutsSheet onClose={() => setShowShortcuts(false)} />}

      {feedbackOpen && (
        <ContactSheet variant="feedback" email={FOOTER_CONTACT_EMAIL} onClose={() => setFeedbackOpen(false)} />
      )}
    </main>
  );
}
