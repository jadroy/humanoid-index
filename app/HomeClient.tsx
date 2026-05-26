"use client";

import { Fragment, useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import * as React from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Toaster, toast } from "sonner";
import { Pause, Play, Ruler, House, Factory, FlaskConical, Package, Shield, MessageCircle, Sparkles, Box, ChevronsUpDown, PanelRight } from "lucide-react";
import { CircleFlag as CircleFlagSvg } from "react-circle-flags";
import { humanoids, type Humanoid } from "@/data/humanoids";
import Image from "next/image";
import EllipticalCarousel from "@/components/carousel/EllipticalCarousel";
import GridView from "@/components/GridView";
import MobileView from "@/components/MobileView";
import SpinViewer, { type SpinViewerHandle } from "@/components/SpinViewer";
import { Tooltip } from "@/components/Tooltip";

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
    credit: { prefix: "Via", name: "sunday.ai" },
  },
};

// Robots with a Draco-compressed URDF mesh set. Toggling the 3D pill swaps the
// static media for an articulated three.js viewer; assets only download on first activation.
const THREEDEE_ROBOTS: Record<
  string,
  { urdfUrl: string; meshBase: string; credit?: { prefix?: string; name: string; href?: string } }
> = {
  "11": {
    urdfUrl: "/3d/g1/g1_23dof.urdf",
    meshBase: "/3d/g1",
    credit: { prefix: "Model", name: "unitree_ros", href: "https://github.com/unitreerobotics/unitree_ros" },
  },
};
import { ShortcutsSheet } from "@/components/ShortcutsSheet";
import ContactSheet from "@/components/ContactSheet";

const FOOTER_CONTACT_EMAIL = "jadroy77@gmail.com";
import EnvironmentToggle from "@/components/EnvironmentToggle";
import { LogoMark, PlaceholderLogo } from "@/components/LogoMark";
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
type GlassChrome = React.CSSProperties & { ["--c-ink-body"]?: string; ["--c-ink-muted"]?: string };
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
  const inkColor = isLight ? "#ffffff" : "rgba(0,0,0,0.78)";
  const inkMuted = isLight ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
  const layers: string[] = [];
  if (sheen > 0) layers.push(`inset 0 1px 0 rgba(${sheenChan},${sheenChan},${sheenChan},${sheen})`);
  if (outline > 0) layers.push(`inset 0 0 0 1px rgba(${edgeChan},${edgeChan},${edgeChan},${outline})`);
  layers.push("0 1px 3px rgba(0,0,0,0.05)");
  return {
    background: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    backdropFilter: `blur(${blur}px) saturate(1.6)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(1.6)`,
    boxShadow: layers.join(", "),
    borderColor: "transparent",
    color: inkColor,
    ["--c-ink-body"]: inkColor,
    ["--c-ink-muted"]: inkMuted,
  };
}

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

function GalleryArrows({ mIdx, count, scroll, subscribe, read }: {
  mIdx: number;
  count: number;
  scroll: (idx: number) => void;
  subscribe: GallerySubscribe;
  read: GalleryRead;
}) {
  const current = useGalleryIdx(mIdx, subscribe, read);
  return (
    <>
      {current > 0 && (
        <button
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-200 ease-out cursor-pointer z-[5]"
          style={{ background: "rgba(255,255,255,0.8)", borderRadius: "50%", pointerEvents: "auto" }}
          onClick={(e) => { e.stopPropagation(); scroll(current - 1); }}
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,1.5 2,5 6,8.5" /></svg>
        </button>
      )}
      {current < count - 1 && (
        <button
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-200 ease-out cursor-pointer z-[5]"
          style={{ background: "rgba(255,255,255,0.8)", borderRadius: "50%", pointerEvents: "auto" }}
          onClick={(e) => { e.stopPropagation(); scroll(current + 1); }}
        >
          <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,1.5 6,5 2,8.5" /></svg>
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
  const fadeClass = hoverFade ? "opacity-0 translate-y-0.5 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
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
  const fadeClass = hoverFade ? "opacity-0 group-hover/card:opacity-100" : "";
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
    </div>
  );
}

function parseShareParams(): { leftId: string | null; compareIds: string[] } {
  if (typeof window === "undefined") return { leftId: null, compareIds: [] };
  const p = new URLSearchParams(window.location.search);
  const compareRaw = p.get("compare");
  const compareIds = compareRaw ? compareRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return { leftId: p.get("h"), compareIds };
}

function findHumanoidIndex(id: string | null | undefined): number | null {
  if (!id) return null;
  const i = humanoids.findIndex((h) => h.id === id);
  return i >= 0 ? i : null;
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
function AnnouncementToast({
  humanoids: items,
  onView,
}: {
  humanoids: Humanoid[];
  onView: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      onClick={onView}
      role="button"
      tabIndex={0}
      style={{
        display: "inline-flex", alignItems: "center", gap: 10,
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
          width: 48, height: 32,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {items.map((h) => (
          h.imageUrl ? (
            <Image
              key={h.id}
              src={h.imageUrl}
              alt={h.name}
              width={22}
              height={28}
              style={{ objectFit: "contain", objectPosition: "center bottom", height: "100%", width: "auto" }}
            />
          ) : null
        ))}
      </div>
      <span style={{ fontSize: 12.5, color: "var(--c-ink-body)", letterSpacing: "-0.005em" }}>
        <span style={{ color: "var(--c-ink-subtle)" }}>New&nbsp;—&nbsp;</span>
        <span style={{ fontWeight: 600 }}>{items.map((h) => h.name).join(" + ")}</span>
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const top = el.scrollTop > 1;
      const bottom = el.scrollHeight - el.clientHeight - el.scrollTop > 1;
      setEdges((top ? 1 : 0) | (bottom ? 2 : 0));
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [children]);
  const fadeTop = (edges & 1) !== 0;
  const fadeBottom = (edges & 2) !== 0;
  const mask = fadeTop && fadeBottom
    ? "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, black 6%, black 94%, rgba(0,0,0,0.55) 100%)"
    : fadeBottom
    ? "linear-gradient(to bottom, black 0%, black 94%, rgba(0,0,0,0.55) 100%)"
    : fadeTop
    ? "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, black 6%, black 100%)"
    : undefined;
  return (
    <div
      ref={ref}
      data-stats-scroll
      className="scrollbar-hide"
      style={{
        flex,
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
  return (
    <span
      title={country}
      aria-label={country}
      style={{ ...valueStyle, display: "inline-flex", alignItems: "baseline", gap: 6 }}
    >
      {visualSide === "left" ? flags : null}
      <span>{country}</span>
      {visualSide === "right" ? flags : null}
    </span>
  );
}

const STATUS_LEGEND: Array<{ label: string; color: string }> = [
  { label: "In Production", color: "#22c55e" },
  { label: "Prototype", color: "#eab308" },
  { label: "Concept", color: "#3b82f6" },
  { label: "Anticipated", color: "#8b5cf6" },
  { label: "Discontinued", color: "#a3a3a3" },
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
function Browse({ goToIndex, homeNonce = 0, navStyle, onNavStyleChange, switcherStyle, onSwitcherStyleChange, luckyNonce = 0, addHintNonce = 0, onEnterCompare, onComparingChange, onShareViewLabelChange, introDone = false, shareUrlRef, shareOgRef, onShareView, buttonVariant, onButtonVariantChange, allCaps = false, onAllCapsChange, showChatTuner = false, onToggleChatTuner, epetriMode = false, onEpetriModeChange, isDev = false, surfaceColor, onSurfaceColorChange, surfaceHover, onSurfaceHoverChange, chromeVariant, onChromeVariantChange, toScale = false, onToScaleChange, useImperial = true, onUseImperialChange, palette = "cool", onPaletteChange }: { goToIndex?: number | null; homeNonce?: number; navStyle: NavStyle; onNavStyleChange: (s: NavStyle) => void; switcherStyle: SwitcherStyle; onSwitcherStyleChange: (s: SwitcherStyle) => void; luckyNonce?: number; addHintNonce?: number; onEnterCompare?: () => void; onComparingChange?: (v: boolean) => void; onShareViewLabelChange?: (s: string) => void; introDone?: boolean; shareUrlRef?: React.MutableRefObject<string>; shareOgRef?: React.MutableRefObject<string>; onShareView?: () => void; buttonVariant: ButtonVariant; onButtonVariantChange: (v: ButtonVariant) => void; allCaps?: boolean; onAllCapsChange?: (v: boolean) => void; showChatTuner?: boolean; onToggleChatTuner?: () => void; epetriMode?: boolean; onEpetriModeChange?: (v: boolean) => void; isDev?: boolean; surfaceColor: string; onSurfaceColorChange: (c: string) => void; surfaceHover: string; onSurfaceHoverChange: (c: string) => void; chromeVariant: "split" | "joined"; onChromeVariantChange: (v: "split" | "joined") => void; toScale?: boolean; onToScaleChange?: (v: boolean) => void; useImperial?: boolean; onUseImperialChange?: (v: boolean) => void; palette?: "cool" | "neutral"; onPaletteChange?: (p: "cool" | "neutral") => void }) {
  const [presetKey, setPresetKey] = useState<PresetKey>("smooth");
  const [customStiffness, setCustomStiffness] = useState(0.10);
  const [customDamping, setCustomDamping] = useState(0.42);
  const [customThreshold, setCustomThreshold] = useState(54);
  const [robotSquish, setRobotSquish] = useState(0.00);
  const [robotFade, setRobotFade] = useState(0.08);
  const [bottomFadeH, setBottomFadeH] = useState(40);
  const [bottomFadeOpacity, setBottomFadeOpacity] = useState(0.9);
  const [showTuner, setShowTuner] = useState(false);
  const [buyLayout, setBuyLayout] = useState<"card" | "chip" | "below">("card");
  const [statsCollapsed, setStatsCollapsed] = useState(true);
  const [statsHover, setStatsHover] = useState(false);
  // Engineer-mode toggle for the stats column — basic (default) reveals the
  // standard rows; engineer adds the extended `engineering` block of specs.
  // Persists site-wide in localStorage so the choice carries between robots.
  const [engineerMode, setEngineerMode] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("humanoid-index:engineerMode");
      if (stored === "true") setEngineerMode(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("humanoid-index:engineerMode", String(engineerMode)); } catch {}
  }, [engineerMode]);
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
  const [addCtaMode, setAddCtaMode] = useState<"hover" | "always">("always");
  const [pillsLayout, setPillsLayout] = useState<"stack" | "grouped">("stack");
  const [yearPlacement, setYearPlacement] = useState<"off" | "beside" | "below" | "after-name" | "pill" | "chip">("off");
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
  // Tracked via mouseenter/leave so the global wheel handler can pass
  // horizontal-dominant scroll through to the gallery without doing a
  // DOM walk on every wheel tick.
  const hoveringGalleryRef = useRef(false);

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
  const [robotMaxW, setRobotMaxW] = useState(400); // px
  // Compare-mode middle column width. Stats need ~150-180px; the rest is
  // breathing room (and blurb width when the AI overview is on).
  const [statsW, setStatsW] = useState(200);       // px
  // Compare mode needs more room to render long manufacturer names like
  // "Sunday Robotics" / "LimX Dynamics" without truncating.
  const compareStatsW = statsW + 200;
  // Side of the visual element (flag, status dot) relative to its text label
  // inside a value cell. "left" = visual-then-text (default), "right" = text-then-visual.
  const [valueVisualSide, setValueVisualSide] = useState<"left" | "right">("left");
  const [statsColScale, setStatsColScale] = useState(0.72); // single-view stats column width = baseCardPx * this
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
  const [denseDividers, setDenseDividers] = useState(true);
  const [denseFullWidth, setDenseFullWidth] = useState(true);
  const [denseRowGap, setDenseRowGap] = useState(9); // px gap between rows
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
  const [compareRowGap, setCompareRowGap] = useState(4);
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
  const [blurbFontSize, setBlurbFontSize] = useState(12.7);
  const [blurbFloat, setBlurbFloat] = useState(false);
  const [splitBlurb, setSplitBlurb] = useState(false);
  const [expandedBlurbs, setExpandedBlurbs] = useState<Set<string>>(new Set());
  const [hoveredBlurbId, setHoveredBlurbId] = useState<string | null>(null);
  type BlurbExpandIndicator = "chevron" | "inline" | "edgebar" | "minimal" | "pill";
  const [blurbExpandIndicator, setBlurbExpandIndicator] = useState<BlurbExpandIndicator>("pill");
  const [bubbleVariant, setBubbleVariant] = useState(7);
  const [outlineStyle, setOutlineStyle] = useState<"off" | "flat" | "sheen" | "light" | "halo" | "gloss">("off");
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
  const [cardIconSize, setCardIconSize] = useState(35);
  const [cardIconStroke, setCardIconStroke] = useState(1.5);
  const [cardIconInset, setCardIconInset] = useState(9);
  const [cardIconGap, setCardIconGap] = useState(4);
  const [cardIconActive, setCardIconActive] = useState<CardIconActive>("tint");
  const [cardIconHoverFade, setCardIconHoverFade] = useState(false);
  const [cardIcon3DLabel, setCardIcon3DLabel] = useState(false);
  // Liquid-glass chrome shared across stats-panel toolbar + in-card chips.
  // Tint/alpha/blur are tunable; sheen + edge derive from tint luminance.
  const [glassTint, setGlassTint] = useState("#6b6b6b");
  const [glassAlpha, setGlassAlpha] = useState(0);
  const [glassBlur, setGlassBlur] = useState(5);
  const [glassInk, setGlassInk] = useState<GlassInk>("auto");
  const [glassOutline, setGlassOutline] = useState(0.13);
  const [glassSheen, setGlassSheen] = useState(0.08);
  const glassChipChrome = useMemo(
    () => glassChromeFor({ tint: glassTint, alpha: glassAlpha, blur: glassBlur, ink: glassInk, outline: glassOutline, sheen: glassSheen }),
    [glassTint, glassAlpha, glassBlur, glassInk, glassOutline, glassSheen]
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
        transition: "background 180ms ease, border-color 180ms ease, color 180ms ease, opacity 180ms ease, transform 180ms ease",
        ["--ci-bg-hover" as string]: hoverBg,
        ["--ci-color-hover" as string]: palette.colorHover,
        ["--ci-border-hover" as string]: hoverBorder,
      },
      iconBoxPx: Math.round(cardIconSize * 0.65),
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
  const [showSplitTuner, setShowSplitTuner] = useState(false);
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
  const [showCollapseTuner, setShowCollapseTuner] = useState(false);
  const [collapseDurMs, setCollapseDurMs] = useState(360);
  const COLLAPSE_EASE_PRESETS = [
    { label: "Standard",  value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { label: "Snappy",    value: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    { label: "Out-expo",  value: "cubic-bezier(0.16, 1, 0.3, 1)" },
    { label: "Out-cubic", value: "cubic-bezier(0.33, 1, 0.68, 1)" },
    { label: "Linear",    value: "linear" },
  ] as const;
  const [collapseEase, setCollapseEase] = useState<string>(COLLAPSE_EASE_PRESETS[3].value);
  useEffect(() => {
    document.documentElement.style.setProperty("--collapse-dur", `${collapseDurMs}ms`);
    document.documentElement.style.setProperty("--collapse-ease", collapseEase);
  }, [collapseDurMs, collapseEase]);

  // Top/bottom inset (`--corner-y`) for chrome anchored to the viewport edges
  // (nav + footer credit row). The side inset shares state with `navX`/`--nav-x`
  // so the same slider can live in either the Corner Margins or Nav tuner.
  const [showMarginTuner, setShowMarginTuner] = useState(false);
  const [cornerY, setCornerY] = useState(18);
  useEffect(() => {
    document.documentElement.style.setProperty("--corner-y", `${cornerY}px`);
  }, [cornerY]);

  const [showSceneTuner, setShowSceneTuner] = useState(false);
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
  const [sceneVariant, setSceneVariant] = useState<"viewport" | "card">("card");
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
  const [autoArcInset, setAutoArcInset] = useState(true);

  // Arc text font: family / weight / letter-spacing / italic
  const [arcFontFamily, setArcFontFamily] = useState<string>("");
  const [arcFontWeight, setArcFontWeight] = useState<number>(400);
  const [arcLetterSpacing, setArcLetterSpacing] = useState<number>(-0.02); // em
  const [arcItalic, setArcItalic] = useState<boolean>(false);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    let raf: number;
    let resizeIdleTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWindowWidth(window.innerWidth));
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
  const baseCardPx = windowWidth ? Math.min(robotW * windowWidth / 100, robotMaxW) : robotMaxW;
  const singleStatsW = Math.round(baseCardPx * statsColScale);
  // When info is hidden, the stats slot fully collapses to 0 so the card lands
  // at viewport center. The "i" toggle lives inside the card label, so no rail
  // is needed in the info-icon variant (the active default).
  const collapsedRailW = 0;
  const expandedStatsW = splitBlurb && blurbFloat ? statsW * 2 + cardGap : singleStatsW;
  const effectiveStatsW = statsCollapsed ? collapsedRailW : expandedStatsW;

  const centerHalfWidth = (() => {
    const cardPx = comparing
      ? Math.min((robotW - 14) * windowWidth / 100, robotMaxW)
      : Math.min(robotW * windowWidth / 100, robotMaxW);
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
  const effectiveDrumXOffset = autoArcInset ? adaptiveDrumXOffset : drumXOffset;

  // Publish the arc's leftmost-label x so the arc text can align to it
  useEffect(() => {
    const x = Math.max(16, effectiveArcInset - arcTextGap);
    document.documentElement.style.setProperty("--arc-logo-x", `${x}px`);
  }, [effectiveArcInset, arcTextGap]);

  // Publish a stable nav inset that ignores `comparing` so the logo and
  // share button stay anchored when entering/leaving compare mode.
  // Aligns nav/footer with the inner content edges (card + gap + stats column),
  // not with the wheels — the wheels sit further outside and use their own inset.
  useEffect(() => {
    if (!autoNavX) {
      document.documentElement.style.setProperty("--nav-x", `${navX}px`);
      return;
    }
    const cardPxStable = windowWidth ? Math.min(robotW * windowWidth / 100, robotMaxW) : robotMaxW;
    // Use the expanded stats width regardless of `statsCollapsed` so the nav
    // and footer (driven off `--nav-x`) stay anchored when the i toggle fires.
    const statsColStable = stackedInfo ? Math.round(cardPxStable * statsColScale) : statsW;
    const contentW = cardPxStable + statsGap + statsColStable;
    const x = Math.max(16, Math.round((windowWidth - contentW) / 2));
    document.documentElement.style.setProperty("--nav-x", `${x}px`);
  }, [autoNavX, navX, windowWidth, robotW, robotMaxW, statsW, statsGap, stackedInfo, statsColScale]);

  // Publish nav top offset as a CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-top", `${navTop}px`);
  }, [navTop]);

  const stiffness = isCustom ? customStiffness : SCROLL_PRESETS[presetKey].stiffness;
  const damping = isCustom ? customDamping : SCROLL_PRESETS[presetKey].damping;
  const wheelThreshold = isCustom ? customThreshold : SCROLL_PRESETS[presetKey].wheelThreshold;
  const thresholdRef = useRef(wheelThreshold); thresholdRef.current = wheelThreshold;

  const springL = useSpring(stiffness, damping);
  const springR = useSpring(stiffness, damping);
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
  useEffect(() => {
    if (goToIndex != null) springL.jumpTo(goToIndex);
  }, [goToIndex, springL.jumpTo]);

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
      let t = Math.floor(Math.random() * humanoids.length);
      let guard = 0;
      while (exclude.includes(t) && guard++ < 20) {
        t = Math.floor(Math.random() * humanoids.length);
      }
      return t;
    };
    const targetL = pickDifferent([springL.index]);
    springL.jumpTo(targetL);
    if (comparing) {
      const targetR = pickDifferent([springR.index, targetL]);
      springR.jumpTo(targetR);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luckyNonce]);
  useEffect(() => {
    let acc = 0;
    let lastTime = 0;
    let velocity = 0;
    let decay: ReturnType<typeof setTimeout>;

    const route = (delta: number, nudgeAmt?: number) => {
      if (!comparingRef.current) {
        if (nudgeAmt !== undefined) springL.nudge(nudgeAmt);
        else springL.go(delta);
      } else {
        // handled per-side below
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Tuners only exist in dev; skip the DOM walk in production.
      if (isDev && (e.target as HTMLElement)?.closest?.("[data-tuner]")) return;
      // Hover ref replaces a closest() walk on every wheel tick.
      if (hoveringGalleryRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
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
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("wheel", onWheel); clearTimeout(decay); };
  }, [springL.go, springL.nudge, springR.go, springR.nudge, isDev]);

  // Keyboard — arrows control active side, tab switches, esc exits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab" && comparing) { e.preventDefault(); setActiveSide((s) => s === "left" ? "right" : "left"); return; }
      if (e.key === "Escape" && comparing) { setComparing(false); setActiveSide("left"); return; }
      if (isDev) {
        if (e.key === "s") { pickArcStyle(ARC_STYLES[(ARC_STYLES.indexOf(arcStyle) + 1) % ARC_STYLES.length]); return; }
        if (e.key === "t") { setShowTuner((v) => !v); return; }
        if (e.key === "\\") { setShowSplitTuner((v) => !v); return; }
        if (e.key === "b") { setShowSceneTuner((v) => !v); return; }
        if (e.key === "i") { setShowCollapseTuner((v) => !v); return; }
        if (e.key === "m") { setShowMarginTuner((v) => !v); return; }
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
        spring.jumpTo(isJumpStart ? 0 : humanoids.length - 1);
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
  }, [activeGo, comparing, activeSide, arcStyle, springL, springR, isDev]);

  // In-card icon shortcuts — mirror the buttons one-for-one. Plain single
  // keys (no modifier) so ⌘C/⌘R/⌘D etc. still trigger native browser actions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const currentId = humanoids[springL.index]?.id;
      switch (e.key) {
        case "d": case "D":
          if (!comparing) { setStatsCollapsed((v) => !v); }
          return;
        case "e": case "E":
          setEngineerMode((v) => { const next = !v; setDenseRowGap(next ? 4 : 9); return next; });
          return;
        case "u": case "U":
          onUseImperialChange?.(!useImperial);
          return;
        case "c": case "C":
          onShareView?.();
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
  }, [comparing, springL, useImperial, onUseImperialChange, onShareView, toggleSpin]);


  const applyPreset = (key: PresetKey) => { setPresetKey(key); setIsCustom(false); const p = SCROLL_PRESETS[key]; setCustomStiffness(p.stiffness); setCustomDamping(p.damping); setCustomThreshold(p.wheelThreshold); };
  const enterCompare = () => { springR.jumpTo(springL.index < humanoids.length - 1 ? springL.index + 1 : 0); setComparing(true); setActiveSide("right"); onEnterCompare?.(); };

  // Add-compare nudge — a quick double-tap leftward motion via CSS keyframe.
  // Bumps a key so the animation restarts on every nudge cycle.
  const [addNudgeKey, setAddNudgeKey] = useState(0);
  const [addHintVisible, setAddHintVisible] = useState(false);
  useEffect(() => {
    if (!addHintNonce) return;
    if (addCtaMode === "always") return;
    setAddNudgeKey((k) => k + 1);
    setAddHintVisible(true);
    const t = setTimeout(() => setAddHintVisible(false), 1400);
    return () => clearTimeout(t);
  }, [addHintNonce, addCtaMode]);
  const exitCompare = () => { setComparing(false); setActiveSide("left"); setSplitHover(false); };

  useEffect(() => {
    if (homeNonce === 0) return;
    exitCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeNonce]);

  // ── Hydrate spring positions from share URL on mount ──
  useEffect(() => {
    const { leftId, compareIds } = parseShareParams();
    if (compareIds.length >= 2) {
      const l = findHumanoidIndex(compareIds[0]);
      const r = findHumanoidIndex(compareIds[1]);
      if (l != null) springL.snapTo(l);
      if (r != null) {
        springR.snapTo(r);
        setComparing(true);
        setActiveSide("right");
      }
      return;
    }
    const leftIdx = findHumanoidIndex(leftId);
    if (leftIdx != null) springL.snapTo(leftIdx);
    // run only on mount; springs are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep share URL ref in sync for parent to read ──
  useEffect(() => {
    if (typeof window === "undefined" || !shareUrlRef) return;
    const origin = window.location.origin;
    const leftId = humanoids[springL.index]?.id;
    const rightId = humanoids[springR.index]?.id;
    if (comparing) {
      shareUrlRef.current = leftId && rightId ? `${origin}/?compare=${leftId},${rightId}` : origin;
    } else {
      shareUrlRef.current = leftId ? `${origin}/?h=${leftId}` : origin;
    }
    if (shareOgRef) {
      const og = comparing
        ? (leftId && rightId ? `${origin}/api/og/${leftId}?compare=${rightId}` : "")
        : (leftId ? `${origin}/api/og/${leftId}` : "");
      shareOgRef.current = og;
    }
  }, [springL.index, springR.index, comparing, shareUrlRef, shareOgRef]);

  useEffect(() => {
    if (!onShareViewLabelChange) return;
    const leftName = humanoids[springL.index]?.name;
    const rightName = humanoids[springR.index]?.name;
    if (comparing && leftName && rightName) {
      onShareViewLabelChange(`Share ${leftName} vs ${rightName}`);
    } else if (leftName) {
      onShareViewLabelChange(`Share ${leftName}`);
    }
  }, [comparing, springL.index, springR.index, onShareViewLabelChange]);

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
  }, [springL.index, springR.index, comparing, resetGalleryIdx]);

  // 3D viewer is per-robot — scrolling away should drop you back to the
  // photo rather than carrying the 3D mode into the next humanoid.
  useEffect(() => {
    setShow3D(false);
  }, [springL.index]);


  const hL = humanoids[springL.index];
  const hR = humanoids[springR.index];
  const distL = Math.abs(springL.getPos() - springL.targetRef.current);
  const distR = Math.abs(springR.getPos() - springR.targetRef.current);
  const getStats = (h: typeof humanoids[0]) => [
    h.height && { label: "Height", value: `${h.height} cm` }, h.weight && { label: "Weight", value: `${h.weight} kg` },
    h.dof && { label: "DOF", value: `${h.dof}` }, h.maxSpeed && { label: "Speed", value: `${h.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];
  const statsL = getStats(hL);

  // Transition easing — Material standard: smooth, clean, no overshoot
  const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
  const dur = "0.5s";

  // Image preloader. Starts tight (±2 around current) then widens during
  // idle time until every humanoid's image has been fetched via the same
  // Next/Image optimization pipeline — crossings always hit cache, even
  // on the first pass.
  const [preloadRadius, setPreloadRadius] = useState(2);
  useEffect(() => {
    if (preloadRadius >= humanoids.length) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const w = window as IdleWindow;
    const run = () => setPreloadRadius((r) => Math.min(humanoids.length, r + 4));
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
        if (n >= 0 && n < humanoids.length && k !== 0) s.add(n);
      }
    };
    add(springL.index);
    if (comparing) add(springR.index);
    return Array.from(s);
  })();
  const preloadSizes = `${Math.round(robotW)}vw`;

  const focusedH = !comparing ? humanoids[springL.index] : undefined;
  const sceneAvailable = !!focusedH?.sceneUrl;
  const sceneActive = sceneEnabled && sceneAvailable;
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

  return (
    <div className="h-screen overflow-hidden select-none relative" data-scene={sceneActive && sceneVariant === "viewport" ? "on" : "off"} style={{ background: pageBg, ["--action-hover-tint" as string]: actionHoverColor, ["--action-hover-pct" as string]: actionHoverPct, ["--action-active-pct" as string]: actionActivePct }}>
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
      {/* Scene is dev-only for now — hidden from production users while Roy
          iterates on a separate launch. Flip to an env-var-driven feature
          flag (LAUNCH_MODE) when ready to ship. */}
      {process.env.NODE_ENV === "development" && (
        <EnvironmentToggle
          available={sceneAvailable}
          enabled={sceneEnabled}
          onToggle={() => {
            setSceneInteracted(true);
            setSceneEnabled((v) => !v);
          }}
          visible={introDone}
        />
      )}

      {/* Neighbor-image preloader — off-screen Next/Image tags matching the
          card's sizes, so the optimized variants are cached before crossings. */}
      <div aria-hidden style={{ position: "absolute", left: -99999, top: 0, width: `${robotW}vw`, height: `${robotH}vh`, maxWidth: robotMaxW, pointerEvents: "none", opacity: 0 }}>
        {preloadIndices.map((i) => {
          const h = humanoids[i];
          if (!h?.imageUrl) return null;
          return (
            <div key={i} style={{ position: "absolute", inset: 0 }}>
              <Image src={h.imageUrl} alt="" fill sizes={preloadSizes} />
            </div>
          );
        })}
      </div>

      {/* Left arc nav */}
      <div className="fixed top-0 bottom-0 left-0 z-[3] pointer-events-none overflow-visible" style={{ width: 0 }}>
        <ArcDots
          index={springL.index}
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
        const addShown = alwaysMode || addHover || addHintVisible;
        const baseScale = alwaysMode ? 1 : (addShown ? 1 : 0.75);
        const hoverScale = addHover ? 1.015 : 1;
        const liftY = addHover ? -1 : 0;
        return (
          <div
            className="absolute flex items-center justify-center cursor-pointer"
            style={{ width: 110, height: 100, top: "50%", transform: "translateY(-50%)", right: "calc(19% - 67px)", zIndex: 12 }}
            onClick={() => { setAddHover(false); enterCompare(); }}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
          >
            <div
              className="flex flex-col items-center"
              style={{
                gap: 9,
                transform: `translateY(${liftY}px) scale(${baseScale * hoverScale})`,
                opacity: addHover ? 1 : (alwaysMode ? 0.7 : 1),
                transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease",
              }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  background: addHover ? "rgba(0,0,0,0.075)" : "rgba(0,0,0,0.06)",
                  transition: "background 220ms ease",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="rgba(0,0,0,0.78)" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="10" y1="4" x2="10" y2="16" />
                  <line x1="4" y1="10" x2="16" y2="10" />
                </svg>
              </div>
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
        const statusColor = h.status === "In Production" ? "#22c55e" : h.status === "Prototype" ? "#eab308" : h.status === "Concept" ? "#3b82f6" : h.status === "Anticipated" ? "#8b5cf6" : "#a3a3a3";

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
            const availabilityLabel: string | undefined = (
              h.availability === "enterprise" ? "Enterprise only" :
              h.availability === "research" ? "Research only" :
              h.availability === "discontinued" ? "Discontinued" :
              h.availability === "prototype" ? "Not yet for sale" :
              undefined
            );
            // Left-side text in split mode: price first, then availability label, then nothing.
            const leftLabel = hasCost ? h.cost! : availabilityLabel;
            const text = isSundayBeta ? "Apply to the 2026 Beta" : (hasCost ? h.cost! : (availabilityLabel ?? (hasUrl ? ctaText : "Not for sale")));
            // Separate cost vs state so the renderer can keep cost on the left
            // and put the availability label inside a non-link chip on the right
            // for URL-less entries — keeps the row rhythm consistent while scrolling.
            const stateLabel = availabilityLabel ?? (hasUrl ? undefined : "Not for sale");
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
          const statusColor = h.status === "In Production" ? "#22c55e" : h.status === "Prototype" ? "#eab308" : h.status === "Concept" ? "#3b82f6" : h.status === "Anticipated" ? "#8b5cf6" : "#a3a3a3";
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
            const cardFontSize = 14;
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
            const rowStyle: React.CSSProperties = {
              display: "grid",
              gridTemplateColumns: "78px minmax(0, 1fr)",
              alignItems: "baseline",
              columnGap: 14,
              fontFamily: "var(--font-geist-sans)",
              lineHeight: 1.55,
              whiteSpace: "nowrap",
              justifyItems: "end",
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
              color: "var(--c-ink)",
              opacity: 0.68,
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
            const hasDescriptorTags = !!(h.tags && h.tags.length > 0);
            const notesCard = hasDescriptorTags || showStatusChip || showYearChip ? (
              <div style={cardBase}>
                {showSectionEyebrows && hasDescriptorTags && <p style={headerStyle}>Notes</p>}
                <div className="flex flex-wrap" style={{ gap: 7, marginTop: showSectionEyebrows && hasDescriptorTags ? sectionContentMarginTop : 0 }}>
                  {showYearChip && <span className="ui-frost" style={chipStyle}>{h.year}</span>}
                  {h.tags?.map((tag) => (
                    <span key={tag} className="ui-frost" style={chipStyle}>{tag}</span>
                  ))}
                </div>
              </div>
            ) : null;

            // Always render the full universal stat set so cards line up across robots.
            // Missing metrics show as a dimmed em-dash rather than collapsing the row.
            const missingValueStyle: React.CSSProperties = { ...valueStyle, color: "var(--c-ink-subtle)" };
            const renderStatRow = (label: string, value: string | number | null | undefined, formatter: (v: number) => string) => {
              if (hideEmptyRows && value == null) return null;
              return (
                <div style={{ ...rowStyle, minWidth: 0 }}>
                  <span style={dimmed}>{label}</span>
                  <MarqueeValue align="right" style={value == null ? missingValueStyle : valueStyle}>
                    <span className="tabular-nums">
                      {value == null ? "—" : (typeof value === "number" ? formatter(value) : value)}
                    </span>
                  </MarqueeValue>
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
                    <span className="tabular-nums">{formatter(value)}</span>
                    <svg width="8" height="9" viewBox="0 0 8 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, transform: "translateY(-1px)" }} aria-hidden>
                      <path d="M2 3 4 1 6 3" />
                      <path d="M2 6 4 8 6 6" />
                    </svg>
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
                <CountryValue country={h.country} valueStyle={valueStyle} visualSide={valueVisualSide} />
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
            const denseRows: React.ReactNode[] = [
              renderStatRow("Company", h.manufacturer ?? null, (v) => `${v}`),
              renderStatRow("Year", h.year ?? null, (v) => `${v}`),
              countryRow,
              ...(unitToggleVariant === "row" ? [unitsRow] : []),
              heightRow,
              weightRow,
              renderStatRow("Use", h.useCase ?? null, (v) => `${v}`),
              ...technicalRows,
              ...engineerRows,
              renderStatRow("Price", priceChipText ?? null, (v) => `${v}`),
              statusRow,
              ...(purchaseRow ? [purchaseRow] : []),
            ];
            const denseScrollRows = denseDividers ? denseRows.slice(0, -1).filter(Boolean) : [];
            const denseActionRow = denseDividers ? denseRows[denseRows.length - 1] : null;
            const renderRowsAsCard = (rows: React.ReactNode[], opts?: { fill?: boolean; pinnedLast?: boolean; gap?: number; padding?: string }) => {
              const { fill = false, pinnedLast = false, gap, padding = "14px 18px" } = opts ?? {};
              const innerGap = gap ?? denseRowGap;
              const visible = rows.filter(Boolean);
              if (visible.length === 0) return null;
              const scrolling = pinnedLast ? visible.slice(0, -1) : visible;
              const pinned = pinnedLast ? visible[visible.length - 1] : null;
              return (
                <div style={{ ...cardBase, borderRadius: cardRadius, background: bubble.bg, boxShadow: bubbleShadow, backdropFilter: bubble.backdropFilter, WebkitBackdropFilter: bubble.backdropFilter, padding, display: "flex", flexDirection: "column", gap: innerGap, minHeight: fill ? "100%" : 0 }}>
                  <div className="flex flex-col" style={{ gap: innerGap }}>
                    {scrolling.map((row, i) => (
                      <Fragment key={i}>
                        {i > 0 ? rowHairline : null}
                        {row}
                      </Fragment>
                    ))}
                  </div>
                  {pinned && (
                    <>
                      {scrolling.length > 0 ? rowHairline : null}
                      {pinned}
                    </>
                  )}
                </div>
              );
            };
            // Specs card holds all data rows (Company..Drive + engineer + Price + Status).
            // Action card holds only the CTA/purchase row, anchored below.
            const specsRowsOnly = purchaseRow ? denseRows.slice(0, -1) : denseRows;
            // Toolbar chips float at top:cardIconInset; reserve enough top
            // padding so the first row clears them with breathing room.
            const glassTopPad = cardIconInset + cardIconSize + 10;
            // Action overlay floats at bottom of the column (pillRowHeight + inset);
            // reserve bottom padding so the last scroll row clears it.
            const glassBottomPad = pillRowHeight + cardIconInset * 2;
            const specsCard = renderRowsAsCard(specsRowsOnly, { fill: true, padding: `${glassTopPad}px 18px ${glassBottomPad}px 18px` });
            const statsCard = (
              <div className="ui-frost" style={{ ...cardBase, borderRadius: cardRadius, background: bubble.bg, boxShadow: bubbleShadow, backdropFilter: bubble.backdropFilter, WebkitBackdropFilter: bubble.backdropFilter, padding: `${glassTopPad}px 18px 18px 18px`, flex: denseDividers ? 1 : undefined, display: "flex", flexDirection: "column", gap: denseDividers ? denseRowGap : 0, minHeight: 0 }}>
                <StatsScrollArea flex={denseDividers ? 1 : undefined} style={{ marginLeft: -18, marginRight: -18 }}>
                  <div className="flex flex-col" style={{ gap: denseDividers ? denseRowGap : sectionContentGap, paddingLeft: 18, paddingRight: 18 }}>
                    {denseDividers ? (
                      denseScrollRows.map((row, i) => (
                        <Fragment key={i}>
                          {i > 0 ? rowHairline : null}
                          {row}
                        </Fragment>
                      ))
                    ) : (
                      <>
                        {renderStatRow("Company", h.manufacturer ?? null, (v) => `${v}`)}
                        {renderStatRow("Year", h.year ?? null, (v) => `${v}`)}
                        {renderStatRow("Country", h.country ?? null, (v) => `${v}`)}
                        {unitsDivider}
                        {renderStatRow("Height", h.height, fmt.height)}
                        {renderStatRow("Weight", h.weight, fmt.weight)}
                        {renderStatRow("DOF", h.dof, (v) => `${v}`)}
                        {renderStatRow("Speed", h.maxSpeed, fmt.speed)}
                        <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "6px 0" }} />
                        {renderStatRow("Use", h.useCase ?? null, (v) => `${v}`)}
                        {renderStatRow("Drive", h.drive ?? null, (v) => `${v}`)}
                        {renderStatRow("Price", priceChipText ?? null, (v) => `${v}`)}
                        {statusRow}
                      </>
                    )}
                  </div>
                </StatsScrollArea>
                {denseDividers && denseActionRow && (
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    {rowHairline}
                    {denseActionRow}
                  </div>
                )}
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
                {denseDividers && splitCards && purchaseRow && (
                  <div
                    className="pointer-events-auto"
                    style={{
                      ...glassChipChrome,
                      position: "absolute",
                      bottom: cardIconInset,
                      left: cardIconInset,
                      right: cardIconInset,
                      borderRadius: cardRadius,
                      padding: "10px 18px",
                      zIndex: 20,
                      opacity: collapseVariant === "hover-fade" ? (statsHover ? 1 : 0.22) : (statsCollapsed ? 0 : 1),
                      transform: statsCollapsed ? "translateX(8px)" : "translateX(0)",
                      pointerEvents: statsCollapsed ? "none" : "auto",
                      transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
                    }}
                  >
                    {purchaseRow}
                  </div>
                )}
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
          // Compare middle column. Mirrors the single-view stats aesthetic:
          // chromeless rows, ink-muted labels, ink-body values, a single hairline
          // separating quantitative specs from the status indicator. No accordion.
          const heightL = hL.height ?? 0, heightR = hR.height ?? 0;
          const weightL = hL.weight ?? 0, weightR = hR.weight ?? 0;
          const dofL = hL.dof ?? 0, dofR = hR.dof ?? 0;
          const speedL = hL.maxSpeed ?? 0, speedR = hR.maxSpeed ?? 0;
          const priceL = hL.cost && hL.cost !== "N/A" ? hL.cost : null;
          const priceR = hR.cost && hR.cost !== "N/A" ? hR.cost : null;
          const statusColor = (status?: string) => status === "In Production" ? "#22c55e" : status === "Prototype" ? "#eab308" : status === "Concept" ? "#3b82f6" : status === "Anticipated" ? "#8b5cf6" : "#a3a3a3";

          const fz = 14;
          const stackGap = 18;
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
            color: "var(--c-ink)",
            opacity: 0.68,
          };
          const missingValueStyle: React.CSSProperties = { ...valueStyle, color: "var(--c-ink-subtle)" };
          const hairlineRule = (
            <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.05)" }} />
          );

          const compareRow = (label: string, valL: string | null, valR: string | null) => {
            if (hideEmptyRows && !valL && !valR) return null;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "91px minmax(0, 1fr) minmax(0, 1fr)", alignItems: "baseline", columnGap: 14, lineHeight: 1.55, justifyItems: "end" }}>
                <span style={{ ...dimmed, whiteSpace: "nowrap" }}>{label}</span>
                <MarqueeValue align="right" style={{ ...(valL ? valueStyle : missingValueStyle), whiteSpace: "nowrap" }}>
                  <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>{valL || "—"}</span>
                </MarqueeValue>
                <MarqueeValue align="right" style={{ ...(valR ? valueStyle : missingValueStyle), whiteSpace: "nowrap" }}>
                  <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>{valR || "—"}</span>
                </MarqueeValue>
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

          const compareBlurb = getCompareBlurb(hL, hR);
          const compareBlurbId = `${hL.id}|${hR.id}`;
          const hasStatus = !!(hL.status || hR.status);
          const hasBlurb = showCompareBlurb && !!compareBlurb.text;

          const blurbBlock = hasBlurb ? (() => {
            const isExpanded = expandedBlurbs.has(compareBlurbId);
            const canExpand = !!compareBlurb.long;
            const fullText = canExpand ? compareBlurb.long : compareBlurb.text;
            const collapsedH = Math.round(fz * 1.55 * 3);
            const isHovered = canExpand && hoveredBlurbId === compareBlurbId;
            const Wrapper = (canExpand ? "button" : "div") as React.ElementType;
            const wrapperProps = canExpand
              ? {
                  type: "button" as const,
                  onClick: (e: React.MouseEvent) => { e.stopPropagation(); toggleBlurbExpand(compareBlurbId); },
                  onMouseEnter: () => setHoveredBlurbId(compareBlurbId),
                  onMouseLeave: () => setHoveredBlurbId(null),
                }
              : {};
            return (
              <Wrapper
                key={compareBlurbId}
                className="pointer-events-auto"
                {...wrapperProps}
                style={{
                  position: "relative",
                  ...(canExpand ? {
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left" as const,
                    width: "100%",
                    cursor: "pointer",
                    display: "block",
                    WebkitTapHighlightColor: "transparent",
                  } : {}),
                  opacity: blurbReady ? 1 : 0,
                  transform: blurbReady ? "translateY(0)" : "translateY(-3px)",
                  filter: blurbReady ? "blur(0)" : "blur(2px)",
                  transition: "opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <div
                  style={{
                    maxHeight: isExpanded ? 320 : collapsedH,
                    overflow: "hidden",
                    transition: "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), -webkit-mask-image 0.3s ease, mask-image 0.3s ease",
                    WebkitMaskImage: canExpand && !isExpanded ? "linear-gradient(to bottom, #000 75%, transparent 100%)" : "none",
                    maskImage: canExpand && !isExpanded ? "linear-gradient(to bottom, #000 75%, transparent 100%)" : "none",
                  }}
                >
                  <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: fz, lineHeight: 1.55, color: "var(--c-ink-body)", fontWeight: 400 }}>
                    {fullText}
                  </p>
                </div>
                {canExpand && renderExpandIndicator({ isExpanded, isHovered })}
              </Wrapper>
            );
          })() : null;


          const rowHairline = (
            <div aria-hidden style={{ height: 2, background: `rgba(0,0,0,${(denseOpacity / 100).toFixed(3)})`, marginLeft: denseFullWidth ? -18 : 64, marginRight: denseFullWidth ? -18 : 64 }} />
          );
          const statusRow = (
            <div style={{ display: "grid", gridTemplateColumns: "91px 1fr 1fr", alignItems: "center", columnGap: 14, lineHeight: 1.55, justifyItems: "end" }}>
              <span style={{ ...dimmed, whiteSpace: "nowrap" }}>Status</span>
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
              <span style={{ display: "inline-flex", justifyContent: "flex-start", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                {hR.status ? (
                  valueVisualSide === "left" ? (
                    <>
                      <StatusDot color={statusColor(hR.status)} size={9} />
                      <span style={valueStyle}>{hR.status}</span>
                    </>
                  ) : (
                    <>
                      <span style={valueStyle}>{hR.status}</span>
                      <StatusDot color={statusColor(hR.status)} size={9} />
                    </>
                  )
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
                      ...valueStyle,
                      display: "inline-flex", alignItems: "baseline", gap: 5,
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span className="tabular-nums" style={{ whiteSpace: "nowrap" }}>{val}</span>
                    <svg width="8" height="9" viewBox="0 0 8 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35, transform: "translateY(-1px)" }} aria-hidden>
                      <path d="M2 3 4 1 6 3" />
                      <path d="M2 6 4 8 6 6" />
                    </svg>
                  </button>
                </MarqueeValue>
              )
            );
            return (
              <div style={{ display: "grid", gridTemplateColumns: "91px minmax(0, 1fr) minmax(0, 1fr)", alignItems: "baseline", columnGap: 14, lineHeight: 1.55, justifyItems: "end" }}>
                <span style={{ ...dimmed, whiteSpace: "nowrap" }}>{label}</span>
                {valueCell(valL)}
                {valueCell(valR)}
              </div>
            );
          };
          const compareUnitsRow = (
            <div style={{ display: "grid", gridTemplateColumns: "91px minmax(0, 1fr) minmax(0, 1fr)", alignItems: "baseline", columnGap: 14, lineHeight: 1.55, justifyItems: "end" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "91px minmax(0, 1fr) minmax(0, 1fr)", alignItems: "baseline", columnGap: 14, lineHeight: 1.55, justifyItems: "end" }}>
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
          const denseRows: React.ReactNode[] = [
            compareRow("Company", hL.manufacturer ?? null, hR.manufacturer ?? null),
            compareRow("Year", hL.year ? `${hL.year}` : null, hR.year ? `${hR.year}` : null),
            compareCountryRow,
            ...(unitToggleVariant === "row" ? [compareUnitsRow] : []),
            heightCompareRow,
            weightCompareRow,
            compareRow("Use", hL.useCase ?? null, hR.useCase ?? null),
            ...technicalCompareRows,
            ...engineerCompareRows,
            compareRow("Price", priceL, priceR),
            statusRow,
          ];

          return (
            <div className="flex flex-col h-full pointer-events-auto" style={{ width: compareStatsW, minWidth: compareStatsW, position: "relative", zIndex: 11 }}>
              <div className="flex flex-col" style={{ flex: 1, justifyContent: denseDividers ? "stretch" : "center", minHeight: 0 }}>
                {blurbBlock}
                <div className="ui-frost" style={{ marginTop: blurbBlock ? stackGap : 0, borderRadius: cardRadius, background: bubble.bg, boxShadow: bubbleShadow, backdropFilter: bubble.backdropFilter, WebkitBackdropFilter: bubble.backdropFilter, padding: `${cardIconInset + cardIconSize + 10}px 18px 18px 18px`, flex: denseDividers ? 1 : undefined, display: "flex", flexDirection: "column", gap: denseDividers ? denseRowGap : 0, minHeight: 0 }}>
                  <StatsScrollArea flex={denseDividers ? 1 : undefined} style={{ marginLeft: -18, marginRight: -18 }}>
                    <div className="flex flex-col" style={{ gap: denseDividers ? denseRowGap : compareRowGap, paddingLeft: 18, paddingRight: 18 }}>
                      {denseDividers ? (
                        denseRows.slice(0, -1).filter(Boolean).map((row, i) => (
                          <Fragment key={i}>
                            {i > 0 ? rowHairline : null}
                            {row}
                          </Fragment>
                        ))
                      ) : (
                        <>
                          {compareRow("Company", hL.manufacturer ?? null, hR.manufacturer ?? null)}
                          {compareRow("Year", hL.year ? `${hL.year}` : null, hR.year ? `${hR.year}` : null)}
                          {compareRow("Country", hL.country ?? null, hR.country ?? null)}
                          {unitsDivider}
                          {compareRow("Height", heightL ? fmt.height(heightL) : null, heightR ? fmt.height(heightR) : null)}
                          {compareRow("Weight", weightL ? fmt.weight(weightL) : null, weightR ? fmt.weight(weightR) : null)}
                          {compareRow("DOF", dofL ? `${dofL}` : null, dofR ? `${dofR}` : null)}
                          {compareRow("Speed", speedL ? fmt.speed(speedL) : null, speedR ? fmt.speed(speedR) : null)}
                          <div aria-hidden style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "6px 0" }} />
                          {compareRow("Use", hL.useCase ?? null, hR.useCase ?? null)}
                          {compareRow("Drive", hL.drive ?? null, hR.drive ?? null)}
                          {compareRow("Price", priceL, priceR)}
                          {statusRow}
                        </>
                      )}
                    </div>
                  </StatsScrollArea>
                  {denseDividers && denseRows.length > 0 && (
                    <div className="flex flex-col" style={{ gap: 2 }}>
                      {rowHairline}
                      {denseRows[denseRows.length - 1]}
                    </div>
                  )}
                </div>
              </div>
              {/* "Copy comparison" pill removed — header row now owns the action. */}
            </div>
          );
        };

        const renderMedia = (mh: typeof humanoids[0], mIdx: number, markPriority: boolean) => {
          const mGallery = mh.media || [];
          const mItems: { kind: "image" | "video"; src: string; position?: string; fit?: "contain" | "cover"; credit?: { prefix?: string; name: string; href?: string } }[] = [];
          if (mh.imageUrl) mItems.push({ kind: "image", src: mh.imageUrl, position: mh.imagePosition, fit: mh.imageFit });
          for (const m of mGallery) mItems.push({ kind: m.type, src: m.url, position: m.position ?? mh.imagePosition, fit: m.fit ?? mh.imageFit, credit: m.credit });
          const mHasGallery = mItems.length > 1;

          const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const el = e.currentTarget;
            writeGalleryIdx(mIdx, Math.round(el.scrollLeft / el.clientWidth));
          };

          return (
            <>
              {/* New badge — rides with the humanoid */}
              {mh.year === 2025 && (
                <div className="absolute top-3 left-3 z-20 px-2 py-0.5 font-semibold" style={{ fontSize: newBadgeFontSize, borderRadius: Math.max(3, cardRadius - 1), background: "rgba(60,60,67,0.55)", color: "#ffffff", backdropFilter: "blur(18px) saturate(1.6)", WebkitBackdropFilter: "blur(18px) saturate(1.6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.06)" }}>New</div>
              )}
              <div
                ref={(el) => { galleryScrollRefs.current[mIdx] = el; }}
                className="scrollbar-hide"
                style={{
                  display: "flex",
                  width: "100%", height: "100%",
                  overflowX: mHasGallery ? "auto" : "hidden",
                  overflowY: "hidden",
                  scrollSnapType: "x mandatory",
                }}
                onScroll={mHasGallery ? onScroll : undefined}
                onMouseEnter={mHasGallery ? () => { hoveringGalleryRef.current = true; } : undefined}
                onMouseLeave={mHasGallery ? () => { hoveringGalleryRef.current = false; } : undefined}
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
                      sizes={comparing ? `${robotW - 14}vw` : `${robotW}vw`}
                      priority={markPriority && i === 0}
                      bottomFadeH={bottomFadeH}
                      bottomFadeOpacity={bottomFadeOpacity}
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
                    const labelDotColor = h.status === "In Production" ? "#22c55e" : h.status === "Prototype" ? "#eab308" : h.status === "Concept" ? "#3b82f6" : h.status === "Anticipated" ? "#8b5cf6" : "#a3a3a3";
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
                  far right of the label row. Active (info showing) = outline.
                  Non-active (info hidden) = very low-opacity fill, no border. */}
              {collapseVariant === "info-icon" && !comparing && isFirst && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStatsCollapsed((v) => !v); }}
                  aria-label={statsCollapsed ? "Show details" : "Hide details"}
                  className="flex-shrink-0 cursor-pointer flex items-center justify-center"
                  style={{
                    width: labelLogoSize,
                    height: labelLogoSize,
                    borderRadius: 999,
                    background: statsCollapsed ? "rgba(0,0,0,0.05)" : "transparent",
                    color: "rgba(0,0,0,0.45)",
                    border: statsCollapsed ? "1px solid transparent" : "1px solid rgba(0,0,0,0.18)",
                    padding: 0,
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: Math.round(labelLogoSize * 0.55),
                    fontWeight: 500,
                    lineHeight: 1,
                    pointerEvents: "auto",
                    transition: `background ${dur} ${ease}, border-color ${dur} ${ease}, color ${dur} ${ease}`,
                  }}
                >
                  i
                </button>
              )}
            </div>
          );

          return (
            <div className="relative flex-shrink-0 group/card" style={{ zIndex: 1 }}>
            {/* Inner card */}
            <div
              ref={isFirst ? leftCardRef : rightCardRef}
              className="relative flex flex-col overflow-hidden"
              style={{
                width: comparing ? `${robotW - 14}vw` : `${robotW}vw`,
                height: comparing ? `${robotH - 4}vh` : `${robotH}vh`,
                maxWidth: robotMaxW,
                borderRadius: cardRadius,
                background: "#F9F9F9",
                pointerEvents: "auto",
                transition: "width var(--collapse-dur) var(--collapse-ease), height var(--collapse-dur) var(--collapse-ease), max-width var(--collapse-dur) var(--collapse-ease)",
                willChange: "transform",
                zIndex: 2,
              }}
            >
              {stackedInfo && statusPlacement === "corner" && h.status && !comparing && (() => {
                const cornerColor = h.status === "In Production" ? "#22c55e" : h.status === "Prototype" ? "#eab308" : h.status === "Concept" ? "#3b82f6" : h.status === "Anticipated" ? "#8b5cf6" : "#a3a3a3";
                return (
                  <span className="absolute" style={{ top: 14, right: 14, zIndex: 5 }} title={h.status} aria-label={h.status}>
                    <span className="relative flex h-2.5 w-2.5">
                      {h.status === "In Production" && <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: cornerColor, opacity: 0.4 }} />}
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: cornerColor, boxShadow: "0 0 0 2px rgba(255,255,255,0.6)" }} />
                    </span>
                  </span>
                );
              })()}
              {/* Card-local scene — fades in inside the card's rounded rectangle
                  when scene mode is on, so the environment reads as a portal
                  rather than a full-viewport wash. */}
              {sceneVariant === "card" && h.sceneUrl && (() => {
                const filterParts: string[] = [];
                if (sceneBlur > 0) filterParts.push(`blur(${sceneBlur}px)`);
                if (sceneCardSaturation !== 100) filterParts.push(`saturate(${sceneCardSaturation}%)`);
                const cardVignetteMask = sceneCardVignette > 0
                  ? `radial-gradient(ellipse at center, #000 ${Math.max(0, 100 - sceneCardVignette)}%, transparent 100%)`
                  : undefined;
                return (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 0,
                      backgroundImage: `url(${h.sceneUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: sceneEnabled ? sceneOpacity / 100 : 0,
                      filter: filterParts.length ? filterParts.join(" ") : undefined,
                      transform: sceneCardScale !== 100 ? `scale(${sceneCardScale / 100})` : undefined,
                      transformOrigin: "center center",
                      transition: "opacity 700ms cubic-bezier(0.32, 0.72, 0, 1), transform 400ms cubic-bezier(0.32, 0.72, 0, 1)",
                      pointerEvents: "none",
                      WebkitMaskImage: cardVignetteMask,
                      maskImage: cardVignetteMask,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                    }}
                  />
                );
              })()}
              {/* Media area */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
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
                    {h.year === 2025 && (
                      <div
                        className="absolute top-3 left-3 z-20 px-2 py-0.5 font-semibold pointer-events-none"
                        style={{ fontSize: newBadgeFontSize, borderRadius: Math.max(3, cardRadius - 1), background: "rgba(60,60,67,0.55)", color: "#ffffff", backdropFilter: "blur(18px) saturate(1.6)", WebkitBackdropFilter: "blur(18px) saturate(1.6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.06)" }}
                      >
                        New
                      </div>
                    )}
                  </div>
                )}
                {/* GalleryShareButton removed — Copy lives in the stats-column header row. */}
                {/* Info-icon collapse affordance — top-right corner of the card,
                    always visible since it's the primary show/hide-details toggle.
                    Carries a permanent light fill regardless of state. */}
                {collapseVariant === "info-icon" && !comparing && isFirst && (() => {
                  const ico = cardIconRender({ active: !statsCollapsed });
                  return (
                    <Tooltip label={statsCollapsed ? "Show details" : "Hide details"} shortcut="D">
                      <button
                        onClick={(e) => { e.stopPropagation(); setStatsCollapsed((v) => !v); }}
                        aria-label={statsCollapsed ? "Show details" : "Hide details"}
                        className={`${ico.className} absolute z-30`}
                        style={{
                          ...ico.style,
                          ...glassChipChrome,
                          top: cardIconInset,
                          right: cardIconInset,
                        }}
                      >
                        <PanelRight size={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                      </button>
                    </Tooltip>
                  );
                })()}
                {/* Density toggle moved into the new stats-column header
                    (see the stats slot below). */}
                {/* 3D toggle — bottom-right, only for robots with a URDF mesh set */}
                {isFirst && !comparing && THREEDEE_ROBOTS[h.id] && (() => {
                  const ico = cardIconRender({ active: show3D });
                  const fadeClass = cardIconHoverFade && !show3D ? "opacity-0 translate-y-0.5 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
                  // When "3D" text is shown, widen into a pill but reuse all chrome tokens.
                  const pillStyle: React.CSSProperties = cardIcon3DLabel
                    ? { ...ico.style, width: "auto", paddingLeft: 10, paddingRight: 12, gap: 6 }
                    : ico.style;
                  return (
                    <Tooltip label={show3D ? "Show photo" : "View in 3D"} shortcut="3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShow3D((v) => !v);
                        }}
                        aria-label={show3D ? "Show photo" : "View in 3D"}
                        className={`${ico.className} absolute z-30 ${fadeClass}`}
                        style={{ ...pillStyle, ...glassChipChrome, bottom: cardIconInset, right: cardIconInset }}
                      >
                        <Box width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        {cardIcon3DLabel && <span className="text-[12px] tracking-tight font-medium">3D</span>}
                      </button>
                    </Tooltip>
                  );
                })()}
                {/* Auto-rotate (play/pause) — bottom-right, only for spin-enabled robots */}
                {isFirst && !comparing && SPIN_ROBOTS[h.id] && (() => {
                  const ico = cardIconRender({ active: spinPlaying });
                  const fadeClass = cardIconHoverFade && !spinPlaying ? "opacity-0 translate-y-0.5 group-hover/card:opacity-100 group-hover/card:translate-y-0" : "";
                  return (
                    <Tooltip label={spinPlaying ? "Pause rotation" : "Auto-rotate"} shortcut="R">
                      <button
                        onClick={(e) => { e.stopPropagation(); void toggleSpin(); }}
                        aria-label={spinPlaying ? "Pause rotation" : "Auto-rotate"}
                        className={`${ico.className} absolute z-30 ${fadeClass}`}
                        style={{ ...ico.style, ...glassChipChrome, bottom: cardIconInset, right: cardIconInset }}
                      >
                        {spinPlaying ? (
                          <Pause width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        ) : (
                          <Play width={ico.iconBoxPx} height={ico.iconBoxPx} strokeWidth={ico.iconStrokeWidth} />
                        )}
                      </button>
                    </Tooltip>
                  );
                })()}
                {/* Video play/pause — appears when on a video slide; lives in the bottom-right cluster */}
                {isFirst && !comparing && (
                  <GalleryVideoPauseButton
                    mIdx={hIdx}
                    allKinds={allKinds}
                    subscribe={subscribeGalleryIdx}
                    read={readGalleryIdx}
                    videoPaused={videoPaused}
                    onToggle={() => setVideoPaused((p) => !p)}
                    getIconStyle={(opts) => cardIconRender(opts)}
                    position={{ bottom: cardIconInset, right: cardIconInset }}
                    hoverFade={cardIconHoverFade}
                    glassChipChrome={glassChipChrome}
                  />
                )}
              </div>

              {/* Hover arrows — anchored to the active humanoid's gallery */}
              {hasGallery && (
                <GalleryArrows
                  mIdx={hIdx}
                  count={allImages.length}
                  scroll={scrollGallery}
                  subscribe={subscribeGalleryIdx}
                  read={readGalleryIdx}
                />
              )}

              {buyLayout === "chip" && renderBuyChip(h)}

            </div>

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
              const availabilityLabel: string | undefined = (
                h.availability === "enterprise" ? "Enterprise only" :
                h.availability === "research" ? "Research only" :
                h.availability === "discontinued" ? "Discontinued" :
                h.availability === "prototype" ? "Not yet for sale" :
                undefined
              );
              const leftLabel = hasCost ? h.cost! : availabilityLabel;
              const fallbackText = isSundayBeta ? "Apply to the 2026 Beta" : (hasCost ? h.cost! : (availabilityLabel ?? (href ? ctaText : "Not for sale")));
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
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 11 }}>
            <div className={`flex ${labelPosition === "above" ? "items-end" : "items-start"}`}>
              {/* Left robot */}
              <div
                key={addHintVisible ? `nudge-${addNudgeKey}` : "idle-l"}
                className={addHintVisible ? "animate-add-nudge-double" : ""}
                style={{
                  transform: addHintVisible
                    ? undefined
                    : splitHover ? "translateX(-12px)" : (addHover && addCtaMode !== "always") ? "translateX(-16px)" : "translateX(0)",
                  transition: addHintVisible ? undefined : `transform ${dur} ${ease}`,
                }}
              >
                {renderRobot(hL, distL, springL.index, true)}
              </div>

              {/* Stats slot — crossfade single ↔ merged */}
              <div
                key={addHintVisible ? `nudge-${addNudgeKey}-s` : "idle-s"}
                className={`flex-shrink-0 relative${addHintVisible ? " animate-add-nudge-double" : ""}`}
                onMouseEnter={() => setStatsHover(true)}
                onMouseLeave={() => setStatsHover(false)}
                style={{
                  marginLeft: statsCollapsed && !comparing ? 0 : effectiveGap,
                  overflowX: "visible", overflowY: "visible",
                  width: comparing ? compareStatsW : effectiveStatsW,
                  height: comparing ? `${robotH - 4}vh` : `${robotH}vh`,
                  transform: addHintVisible
                    ? undefined
                    : !comparing && addHover && addCtaMode !== "always" ? "translateX(-16px)" : "translateX(0)",
                  transition: addHintVisible
                    ? "width var(--collapse-dur) var(--collapse-ease), height var(--collapse-dur) var(--collapse-ease), opacity var(--collapse-dur) var(--collapse-ease), margin-left var(--collapse-dur) var(--collapse-ease)"
                    : "width var(--collapse-dur) var(--collapse-ease), height var(--collapse-dur) var(--collapse-ease), opacity var(--collapse-dur) var(--collapse-ease), margin-left var(--collapse-dur) var(--collapse-ease), transform var(--collapse-dur) var(--collapse-ease)",
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
                {/* Stats column header — row of icon toggles styled to match the
                    card's "i" button (via cardIconRender). Vertically aligned with
                    that button so the centers line up. Shown in both single and
                    compare modes; fades only when collapsed. */}
                {(() => {
                  const engineerIco = cardIconRender({ active: engineerMode });
                  const iconBox = engineerIco.iconBoxPx;
                  // Buttons float over the stats container at the top corners
                  // using the state-driven glassChipChrome so the row beneath reads
                  // through softly.
                  const glassBtnStyle = (ico: ReturnType<typeof cardIconRender>): React.CSSProperties => ({
                    ...ico.style,
                    ...glassChipChrome,
                    WebkitTapHighlightColor: "transparent",
                  });
                  return (
                    <div
                      className="absolute z-20 flex items-center justify-between pointer-events-none"
                      style={{
                        top: cardIconInset,
                        left: cardIconInset,
                        right: cardIconInset,
                        height: cardIconSize,
                        opacity: statsCollapsed ? 0 : 1,
                        transition: `opacity ${dur} ${ease}`,
                      }}
                    >
                      <div className="flex items-center pointer-events-auto" style={{ gap: cardIconGap, height: "100%" }}>
                        {/* Engineer — toggles both the engineer rows AND tighter
                            spacing in one move (engineer = denser specs view). */}
                        <Tooltip label={engineerMode ? "Hide engineer specs" : "Show engineer specs"} shortcut="E">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEngineerMode((v) => {
                                const next = !v;
                                setDenseRowGap(next ? 4 : 9);
                                return next;
                              });
                            }}
                            aria-pressed={engineerMode}
                            aria-label={engineerMode ? "Hide engineer specs" : "Show engineer specs"}
                            className={engineerIco.className}
                            style={glassBtnStyle(engineerIco)}
                          >
                            <ChevronsUpDown size={iconBox} strokeWidth={engineerIco.iconStrokeWidth} />
                          </button>
                        </Tooltip>
                        {/* Units — metric / imperial. Shows the current unit
                            as the icon label so the state is self-evident. */}
                        {(() => {
                          const ico = cardIconRender({ active: !useImperial });
                          return (
                            <Tooltip label={`Switch to ${useImperial ? "metric" : "imperial"}`} shortcut="U">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onUseImperialChange?.(!useImperial); }}
                                aria-label={`Switch to ${useImperial ? "metric" : "imperial"}`}
                                className={ico.className}
                                style={glassBtnStyle(ico)}
                              >
                                <span style={{
                                  fontSize: Math.round(cardIconSize * 0.36),
                                  fontFamily: "var(--font-geist-sans)",
                                  fontWeight: 500,
                                  letterSpacing: "0.01em",
                                  lineHeight: 1,
                                }}>
                                  {useImperial ? "in" : "cm"}
                                </span>
                              </button>
                            </Tooltip>
                          );
                        })()}
                      </div>
                      {/* Right side — share link for the current view. */}
                      <div className="flex items-center pointer-events-auto" style={{ gap: cardIconGap, height: "100%" }}>
                        {(() => {
                          const ico = cardIconRender();
                          return (
                            <Tooltip label="Share this view" shortcut="C">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onShareView?.(); }}
                                aria-label="Share this view"
                                className={ico.className}
                                style={{
                                  ...glassBtnStyle(ico),
                                  width: "auto",
                                  padding: `0 ${Math.round(cardIconSize * 0.42)}px`,
                                  fontFamily: "var(--font-geist-sans)",
                                  fontSize: Math.round(cardIconSize * 0.36),
                                  fontWeight: 500,
                                  letterSpacing: "0.01em",
                                  lineHeight: 1,
                                }}
                              >
                                Share
                              </button>
                            </Tooltip>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
                <div className="absolute" style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: comparing ? 0 : 1,
                  pointerEvents: comparing ? "none" : "auto",
                  transition: `opacity 0.2s ${ease}`,
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

                {/* Middle exit-compare hover zone removed — the X on the right
                    card is the sole way out. */}
              </div>

              {/* Right robot — compare only. Slides in from screen-right (translateX)
                  alongside the wheel and the 2nd-humanoid stat column, all riding the
                  shared collapse clock so the right side enters as one piece. */}
              <div className="flex-shrink-0 relative compare-rcard" style={{
                opacity: comparing ? 1 : 0,
                pointerEvents: comparing ? "auto" : "none",
                // Card stays at full visual size (overflow visible) and
                // slides a short distance from the right while fading in.
                // Short translate keeps the motion readable without feeling
                // violent; the fade carries most of the entrance weight.
                transform: `translateX(${comparing ? 0 : (splitHover ? 60 : 80)}px) scale(${comparing ? 1 : 0.98})`,
                transformOrigin: "left center",
                width: comparing ? `${robotW - 14}vw` : 0,
                maxWidth: robotMaxW,
                marginLeft: comparing ? effectiveGap : 0,
                overflow: "visible",
                transition: "opacity var(--collapse-dur) var(--collapse-ease), transform var(--collapse-dur) cubic-bezier(0.22, 1, 0.36, 1), width var(--collapse-dur) var(--collapse-ease), margin-left var(--collapse-dur) var(--collapse-ease)",
              }}>
                {/* Minus appears AFTER the card has landed so it rises out of
                    the card vertically — no horizontal drift from the card's
                    translateX(56) slide-in. On exit it fades quickly before
                    the card starts sliding out. */}
                <button
                  onClick={exitCompare}
                  aria-label="Remove from compare"
                  className="absolute z-30 flex items-center justify-center cursor-pointer"
                  style={{
                    top: -34,
                    right: 0,
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.08)",
                    opacity: comparing ? 1 : 0,
                    transform: comparing ? "translateY(0)" : "translateY(10px)",
                    pointerEvents: comparing ? "auto" : "none",
                    transition: comparing
                      ? "opacity 220ms ease 280ms, transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1) 280ms"
                      : "opacity 140ms ease 0ms, transform 140ms ease 0ms",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="rgba(0,0,0,0.78)" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="4" y1="10" x2="16" y2="10" />
                  </svg>
                </button>
                {renderRobot(hR, distR, springR.index, false)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Dev toggle (bottom-right, subtle) ── */}
      {isDev && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5">
          <button
            onClick={() => setShowTuner(!showTuner)}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            T
          </button>
          <span style={{ fontSize: 10, color: "#e0e0e0" }}>·</span>
          <button
            onClick={() => setShowSplitTuner(!showSplitTuner)}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showSplitTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            S
          </button>
          <span style={{ fontSize: 10, color: "#e0e0e0" }}>·</span>
          <button
            onClick={() => setShowSceneTuner(!showSceneTuner)}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showSceneTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            B
          </button>
          <span style={{ fontSize: 10, color: "#e0e0e0" }}>·</span>
          <button
            onClick={() => setShowCollapseTuner(!showCollapseTuner)}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showCollapseTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            I
          </button>
          <span style={{ fontSize: 10, color: "#e0e0e0" }}>·</span>
          <button
            onClick={() => onToggleChatTuner?.()}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showChatTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            C
          </button>
          <span style={{ fontSize: 10, color: "#e0e0e0" }}>·</span>
          <button
            onClick={() => setShowMarginTuner(!showMarginTuner)}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showMarginTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            M
          </button>
        </div>
      )}
      {showMarginTuner && (
        <div data-tuner className="absolute top-40 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-4">
          <p className="text-[11px] tracking-widest uppercase text-neutral-500">Corner Margins</p>
          <div>
            <label className="text-[12px] text-neutral-500 flex justify-between">Top / Bottom <span className="tabular-nums text-neutral-400">{cornerY}px</span></label>
            <input type="range" min={0} max={600} value={cornerY} onChange={(e) => setCornerY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
          </div>
          <div style={{ opacity: autoNavX ? 0.55 : 1 }}>
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
      )}
      {showSplitTuner && (
        <div data-tuner className="absolute top-40 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide">
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
        </div>
      )}
      {showSceneTuner && (
        <div data-tuner className="absolute top-40 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[260px] space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide">
          <div className="space-y-3">
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
              <div className="flex gap-1.5 mt-1.5 items-center">
                {["#ffffff", "#f7f7f7", "#f2f2f2", "#ececec", "#e5e5e5"].map((c) => (
                  <button
                    key={c}
                    onClick={() => onSurfaceColorChange(c)}
                    className="w-6 h-6 rounded cursor-pointer"
                    style={{ background: c, border: surfaceColor.toLowerCase() === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5" }}
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
                    style={{ background: c, border: surfaceHover.toLowerCase() === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5" }}
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
              {(["card", "viewport"] as const).map((v) => (
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
            {sceneVariant === "card" && (
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
                    style={{ background: c, border: cardFillColor === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5" }}
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
        </div>
      )}
      {showCollapseTuner && (
        <div data-tuner className="absolute top-40 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[260px] space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Collapse</p>
            <span className="text-[10px] text-neutral-400">i-toggle · compare</span>
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
        </div>
      )}
      {showTuner && (
        <div data-tuner className="absolute top-28 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-5 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide" style={{ overscrollBehavior: "contain" }}>
          <div className="space-y-3">
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
          <div className="pt-2 border-t border-neutral-100">
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
          <div className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Arc Style</p><div className="flex flex-wrap gap-1.5">{ARC_STYLES.map((s) => (<button key={s} onClick={() => pickArcStyle(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${arcStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{arcStyleLabels[s]}</button>))}</div></div>
          {arcStyle === "arc-names" && (
            <div className="pt-2 border-t border-neutral-100">
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
          <div className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Add CTA</p><div className="flex flex-wrap gap-1.5">{(["hover", "always"] as const).map((v) => (<button key={v} onClick={() => setAddCtaMode(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${addCtaMode === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v === "hover" ? "Hover + hint" : "Always dim"}</button>))}</div></div>
          <div className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Year placement</p><div className="flex flex-wrap gap-1.5">{(["off", "beside", "below", "after-name", "pill", "chip"] as const).map((v) => (<button key={v} onClick={() => setYearPlacement(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${yearPlacement === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{v === "after-name" ? "After name" : v.charAt(0).toUpperCase() + v.slice(1)}</button>))}</div></div>
          <div className="pt-2 border-t border-neutral-100 space-y-2">
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
                      <button key={c} onClick={() => setGroupedFill(c)} className="w-6 h-6 rounded cursor-pointer" style={{ background: c, border: groupedFill.toLowerCase() === c.toLowerCase() ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5" }} />
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
          <div className="pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Share Button</p><div className="flex flex-wrap gap-1.5">{BUTTON_VARIANTS.map((v) => (<button key={v} onClick={() => onButtonVariantChange(v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${buttonVariant === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{BUTTON_LABELS[v]}</button>))}</div></div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400">Card Icons</p>
              <button
                className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer"
                onClick={() => {
                  setCardIconChrome("ghost");
                  setCardIconShape("circle");
                  setCardIconSize(35);
                  setCardIconStroke(1.5);
                  setCardIconInset(9);
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
            <div className="flex items-center gap-2"><label className="text-[12px] text-neutral-500 flex-1">Show &ldquo;3D&rdquo; label</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${cardIcon3DLabel ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setCardIcon3DLabel(!cardIcon3DLabel)}>{cardIcon3DLabel ? "On" : "Off"}</button></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <p className="text-[12px] tracking-widest uppercase text-neutral-400">Glass chip</p>
              <button
                className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer"
                onClick={() => { setGlassTint("#6b6b6b"); setGlassAlpha(0); setGlassBlur(5); setGlassInk("auto"); setGlassOutline(0.13); setGlassSheen(0.08); }}
              >
                Reset
              </button>
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
                    style={{ background: c, border: glassTint.toLowerCase() === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5" }}
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
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Nav</p>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Style</p><div className="flex flex-wrap gap-1.5">{NAV_STYLES.map((s) => (<button key={s} onClick={() => onNavStyleChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${navStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Chrome</p><div className="flex flex-wrap gap-1.5">{(["split", "joined"] as const).map((s) => (<button key={s} onClick={() => onChromeVariantChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${chromeVariant === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            {navStyle === "underline" && (
              <div><p className="text-[12px] text-neutral-500 mb-1.5">Switcher</p><div className="flex flex-wrap gap-1.5">{SWITCHER_STYLES.map((s) => (<button key={s} onClick={() => onSwitcherStyleChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${switcherStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
            )}
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Top offset <span className="tabular-nums text-neutral-400">{navTop}px</span></label><input type="range" min={0} max={48} value={navTop} onChange={(e) => setNavTop(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">Auto side inset</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${autoNavX ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setAutoNavX(!autoNavX)}>{autoNavX ? "On" : "Off"}</button></div>
            <div style={{ opacity: autoNavX ? 0.3 : 1 }}><label className="text-[12px] text-neutral-500 flex justify-between">Side inset <span className="tabular-nums text-neutral-400">{navX}px</span></label><input type="range" min={0} max={200} value={navX} onChange={(e) => { setNavX(Number(e.target.value)); setAutoNavX(false); }} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Card Give</p><button className="text-[12px] text-neutral-300 hover:text-neutral-500 cursor-pointer" onClick={() => { setGiveVelScale(3); setGivePushAmt(5); setGiveLeanAmt(0.9); setGiveTiltAmt(4); setGiveTiltDepth(800); }}>Reset</button></div>
            <div className="flex flex-wrap gap-1.5">{GIVE_STYLES.map((s) => (<button key={s} onClick={() => setGiveStyle(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${giveStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{giveStyleLabels[s]}</button>))}</div>
            <div style={{ opacity: (giveStyle === "push" || giveStyle === "lean" || giveStyle === "tilt" || giveStyle === "drag") ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Velocity scale <span className="tabular-nums text-neutral-400">{giveVelScale.toFixed(1)}</span></label><input type="range" min={5} max={80} value={Math.round(giveVelScale * 10)} onChange={(e) => setGiveVelScale(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: (giveStyle === "push" || giveStyle === "drag") ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Push amount <span className="tabular-nums text-neutral-400">{givePushAmt}px</span></label><input type="range" min={0} max={30} value={givePushAmt} onChange={(e) => setGivePushAmt(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "lean" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Lean amount <span className="tabular-nums text-neutral-400">{giveLeanAmt.toFixed(1)}°</span></label><input type="range" min={0} max={50} value={Math.round(giveLeanAmt * 10)} onChange={(e) => setGiveLeanAmt(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "tilt" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Tilt amount <span className="tabular-nums text-neutral-400">{giveTiltAmt.toFixed(1)}°</span></label><input type="range" min={0} max={200} value={Math.round(giveTiltAmt * 10)} onChange={(e) => setGiveTiltAmt(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: giveStyle === "tilt" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Tilt depth <span className="tabular-nums text-neutral-400">{giveTiltDepth}px</span></label><input type="range" min={200} max={2000} step={50} value={giveTiltDepth} onChange={(e) => setGiveTiltDepth(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
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
            <div style={{ opacity: luckyTapStyle === "tilt" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Peak angle <span className="tabular-nums text-neutral-400">{luckyTapAngle.toFixed(1)}°</span></label><input type="range" min={0} max={300} value={Math.round(luckyTapAngle * 10)} onChange={(e) => setLuckyTapAngle(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "tilt" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Depth <span className="tabular-nums text-neutral-400">{luckyTapDepth}px</span></label><input type="range" min={200} max={2000} step={50} value={luckyTapDepth} onChange={(e) => setLuckyTapDepth(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "tilt" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Pivot Y <span className="tabular-nums text-neutral-400">{luckyTapOriginY}%</span></label><input type="range" min={0} max={100} value={luckyTapOriginY} onChange={(e) => setLuckyTapOriginY(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "shake" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Shake amount <span className="tabular-nums text-neutral-400">{luckyShakePx}px</span></label><input type="range" min={0} max={14} value={luckyShakePx} onChange={(e) => setLuckyShakePx(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div style={{ opacity: luckyTapStyle === "shake" ? 1 : 0.3 }}><label className="text-[12px] text-neutral-500 flex justify-between">Shake cycles <span className="tabular-nums text-neutral-400">{luckyShakeCycles}</span></label><input type="range" min={1} max={8} value={luckyShakeCycles} onChange={(e) => setLuckyShakeCycles(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          <div className="space-y-3 pt-2 border-t border-neutral-100">
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
                    style={{ background: isLegacy ? "#1a1a1a" : "#f0f0f0", color: isLegacy ? "#fff" : "#666", border: "none", cursor: "pointer" }}
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
                    style={{ background: pillLabelFont === value ? "#1a1a1a" : "#f0f0f0", color: pillLabelFont === value ? "#fff" : "#666", border: "none", cursor: "pointer", fontSize: pillLabelFontSize, fontFamily: value, letterSpacing: "0.06em" }}
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
                    style={{ background: pillLabelWeight === w ? "#1a1a1a" : "#f0f0f0", color: pillLabelWeight === w ? "#fff" : "#666", border: "none", cursor: "pointer", fontWeight: w }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-neutral-500">Uppercase</label>
              <button type="button" onClick={() => setPillLabelUppercase((v) => !v)}
                className="text-[12px] px-2 py-1 rounded transition-colors"
                style={{ background: pillLabelUppercase ? "#1a1a1a" : "#f0f0f0", color: pillLabelUppercase ? "#fff" : "#666", border: "none", cursor: "pointer" }}>
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
                    style={{ background: outlineStyle === s ? "#1a1a1a" : "#f0f0f0", color: outlineStyle === s ? "#fff" : "#666", border: "none" }}
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
                          ? `${b.shadow}, 0 0 0 2px #1a1a1a`
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
                          ? `${b.shadow}, 0 0 0 2px #1a1a1a`
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
                  style={{ background: blurbFloat ? "#1a1a1a" : "#f0f0f0", color: blurbFloat ? "#fff" : "#666", border: "none", cursor: "pointer" }}
                >
                  Float to top
                </button>
                <button
                  type="button"
                  onClick={() => setSplitBlurb((v) => !v)}
                  className="text-[12px] px-2 py-1 rounded transition-colors ml-1"
                  style={{ background: splitBlurb ? "#1a1a1a" : "#f0f0f0", color: splitBlurb ? "#fff" : "#666", border: "none", cursor: "pointer" }}
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
                      background: blurbExpandIndicator === opt.key ? "#1a1a1a" : "#f0f0f0",
                      color: blurbExpandIndicator === opt.key ? "#fff" : "#666",
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
                      border: statPillBg === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5",
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
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400">New Badge</p>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font size <span className="tabular-nums text-neutral-400">{newBadgeFontSize}px</span></label><input type="range" min={8} max={16} value={newBadgeFontSize} onChange={(e) => setNewBadgeFontSize(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
          </div>
          {(arcStyle === "crown" || arcStyle === "arc-timeline" || arcStyle === "arc-names" || arcStyle === "arc-tag") && (
          <div className="space-y-3 pt-2 border-t border-neutral-100">
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
            <div style={{ opacity: autoArcInset ? 0.3 : 1 }}><label className="text-[12px] text-neutral-500 flex justify-between">Arc inset <span className="tabular-nums text-neutral-400">{arcInset}px</span></label><input type="range" min={30} max={600} value={arcInset} onChange={(e) => { setArcInset(Number(e.target.value)); setAutoArcInset(false); }} className="w-full accent-neutral-900 h-1" /></div>
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
                      border: arcDiskColor === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5",
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
          <div className="space-y-3 pt-2 border-t border-neutral-100">
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
          <div className="pt-2 border-t border-neutral-100">
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
        </div>
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

function GuideChat({ onSelect, config }: { onSelect: (idx: number) => void; config: ChatConfig }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "guide"; text: string; suggestions?: typeof humanoids }[]>([
    { role: "guide", text: "What kind of humanoid are you looking for? I can help you narrow it down." },
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
    const base: React.CSSProperties = { fontSize: config.fontSize, maxWidth: "80%", lineHeight: 1.5 };
    if (config.userStyle === "dark") return { ...base, background: "var(--c-ink)", color: "white" };
    if (config.userStyle === "outline") return { ...base, background: "transparent", border: "1px solid rgba(0,0,0,0.14)", color: "#1d1d1f" };
    return { ...base, background: "rgba(0,0,0,0.07)", color: "#1d1d1f" };
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div
        className="overflow-hidden pointer-events-auto"
        style={{
          width: `min(${config.width}px, calc(100vw - 48px))`,
          borderRadius: config.radius,
          background: `rgba(255,255,255,${config.bgOpacity / 100})`,
          backdropFilter: `blur(${config.blur}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${config.blur}px) saturate(1.4)`,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: `0 24px 64px rgba(0,0,0,${config.shadowOp / 100}), 0 4px 16px rgba(0,0,0,${config.shadowOp / 200})`,
          animation: "chat-rise 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* Messages */}
        <div ref={scrollRef} className="max-h-[280px] overflow-y-auto px-5 pt-5 pb-3 space-y-4 scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === "guide" ? (
                config.guideStyle === "bubble" ? (
                  <div style={{ display: "inline-block", background: "rgba(0,0,0,0.05)", borderRadius: 14, padding: "8px 12px", fontSize: config.fontSize, color: "#555", lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                ) : (
                  <p style={{ fontSize: config.fontSize, color: "#737373", lineHeight: 1.6 }}>{m.text}</p>
                )
              ) : (
                <div className="flex justify-end">
                  <p className="px-3.5 py-2 rounded-2xl" style={userBubbleStyle()}>{m.text}</p>
                </div>
              )}
              {m.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {m.suggestions.map((h) => {
                    const idx = humanoids.findIndex((x) => x.id === h.id);
                    return (
                      <button
                        key={h.id}
                        onClick={() => onSelect(idx)}
                        className="flex items-center gap-2 px-3 py-2 rounded-2xl cursor-pointer transition-all hover:scale-[1.03]"
                        style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
                      >
                        <div className="relative w-5 h-7 flex-shrink-0">
                          {h.imageUrl ? <Image src={h.imageUrl} alt={h.name} fill className="object-contain" sizes="20px" /> : <PlaceholderLogo />}
                        </div>
                        <div className="text-left">
                          <p style={{ fontSize: config.fontSize - 2, fontWeight: 500, color: "#1d1d1f" }}>{h.name}</p>
                          <p style={{ fontSize: config.fontSize - 3, color: "var(--c-ink-muted)" }}>{h.manufacturer}</p>
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
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="fastest, cheapest, for home…"
            className="flex-1 outline-none bg-transparent"
            style={{ fontSize: config.fontSize, color: "#1d1d1f" }}
          />
          <button
            onClick={handleSubmit}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 cursor-pointer"
            style={{
              borderRadius: config.inputRadius,
              background: query.trim() ? "rgba(0,0,0,0.08)" : "transparent",
              color: query.trim() ? "#555" : "#c8c8c8",
              transition: "background 200ms, color 200ms",
            }}
            aria-label="Send"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
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
  const [showChatTuner, setShowChatTuner] = useState(false);
  const [chatConfig, setChatConfig] = useState({
    bgOpacity: 92,
    blur: 24,
    radius: 24,
    width: 400,
    shadowOp: 10,
    guideStyle: "plain" as "plain" | "bubble",
    userStyle: "tint" as "dark" | "tint" | "outline",
    fontSize: 13,
    inputRadius: 99,
  });
  const [goToIndex, setGoToIndex] = useState<number | null>(null);
  const [luckyNonce, setLuckyNonce] = useState(0);
  const [luckyUsed, setLuckyUsed] = useState(false);
  const [hintNonce, setHintNonce] = useState(0);
  const [addHintNonce, setAddHintNonce] = useState(0);
  const [comparingUsed, setComparingUsed] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [shareViewLabel, setShareViewLabel] = useState("Share view");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [diceRollNonce, setDiceRollNonce] = useState(0);
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
      if ((e.key === "?" || e.key === "/") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (e.key === "R" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const idx = Math.floor(Math.random() * humanoids.length);
        setLayout("E");
        setGoToIndex(idx);
        setChatOpen(false);
        setTimeout(() => setGoToIndex(null), 100);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDev]);

  const handleSelectHumanoid = useCallback((idx: number) => {
    setLayout("E");
    setGoToIndex(idx);
    setChatOpen(false);
    setTimeout(() => setGoToIndex(null), 100);
  }, []);

  // "What's new" toast — fires once on mount, after the intro overlay clears.
  const newHumanoids = useMemo(() => {
    const cutoff = Date.now() - NEW_WINDOW_DAYS * 86_400_000;
    return humanoids.filter(
      (h) => h.addedAt && new Date(h.addedAt).getTime() >= cutoff,
    );
  }, []);
  const firstNewIdx = useMemo(
    () => (newHumanoids.length === 0 ? -1 : humanoids.findIndex((h) => h.id === newHumanoids[0].id)),
    [newHumanoids],
  );
  useEffect(() => {
    if (introPhase !== "done" || newHumanoids.length === 0 || firstNewIdx < 0) return;
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
            handleSelectHumanoid(firstNewIdx);
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
  }, [introPhase, newHumanoids, firstNewIdx, handleSelectHumanoid]);

  const onRandomHumanoid = useCallback(() => {
    if (layout !== "E") setLayout("E");
    setChatOpen(false);
    setLuckyNonce((n) => n + 1);
    setLuckyUsed(true);
  }, [layout]);

  const [homeNonce, setHomeNonce] = useState(0);
  const goHome = useCallback(() => {
    setLayout("E");
    setChatOpen(false);
    setGoToIndex(0);
    setHomeNonce((n) => n + 1);
    setTimeout(() => setGoToIndex(null), 100);
  }, []);

  const introDone = introPhase === "done";

  // Subtle affordance: the add-compare nudge fires first (primary action),
  // then the logo pulse a bit later (secondary, lower priority). Repeats
  // until each one is used.
  useEffect(() => {
    if (!introDone) return;
    if (luckyUsed && comparingUsed) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fireCycle = () => {
      if (!comparingUsed) setAddHintNonce((n) => n + 1);
      if (!luckyUsed) {
        timers.push(setTimeout(() => setHintNonce((n) => n + 1), 5500));
      }
    };
    const schedule = (delay: number) => {
      const t = setTimeout(() => {
        fireCycle();
        schedule(20000);
      }, delay);
      timers.push(t);
    };
    schedule(5500);
    return () => { timers.forEach(clearTimeout); };
  }, [introDone, luckyUsed, comparingUsed]);

  // Avoid desktop-layout flash on first paint while we measure viewport
  if (isMobile === null) {
    return <main className="min-h-[100dvh] bg-white" />;
  }
  if (isMobile) {
    return <MobileComingSoon />;
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
              hintNonce={hintNonce}
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
        {layout === "E" && <Browse goToIndex={goToIndex} homeNonce={homeNonce} navStyle={navStyle} onNavStyleChange={setNavStyle} switcherStyle={switcherStyle} onSwitcherStyleChange={setSwitcherStyle} luckyNonce={luckyNonce} addHintNonce={addHintNonce} onEnterCompare={() => setComparingUsed(true)} onComparingChange={setComparing} onShareViewLabelChange={setShareViewLabel} introDone={introDone} shareUrlRef={shareUrlRef} shareOgRef={shareOgRef} onShareView={() => copyUrl(shareUrlRef.current || (typeof window !== "undefined" ? window.location.origin : ""), "View link copied", shareOgRef.current)} buttonVariant={buttonVariant} onButtonVariantChange={setButtonVariant} allCaps={allCaps} onAllCapsChange={setAllCaps} showChatTuner={showChatTuner} onToggleChatTuner={() => setShowChatTuner((v) => !v)} epetriMode={epetriMode} onEpetriModeChange={setEpetriMode} isDev={isDev} surfaceColor={surfaceColor} onSurfaceColorChange={setSurfaceColor} surfaceHover={surfaceHover} onSurfaceHoverChange={setSurfaceHover} chromeVariant={chromeVariant} onChromeVariantChange={setChromeVariant} toScale={toScale} onToScaleChange={setToScale} useImperial={useImperial} onUseImperialChange={setUseImperial} palette={palette} onPaletteChange={setPalette} />}
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
        <div data-tuner className="fixed bottom-14 right-6 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div>
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
        </div>
      )}

      {/* Launch: chat trigger hidden, replaced with credit link.
          To bring chat back, swap this for the <OptionsMenu .../> block. */}
      {introDone && (() => {
        const creditStyle: React.CSSProperties = {
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "normal",
          lineHeight: 1,
          color: "oklch(65% 0.011 222.2)",
          whiteSpace: "nowrap",
        };
        return (
          <div
            className="intro-credit fixed left-0 right-0 z-[48] pointer-events-none"
            style={{ bottom: "max(4px, calc(var(--corner-y, 8px) - 6px))" }}
          >
            <div
              className="flex flex-col items-center"
              style={{
                paddingLeft: "var(--nav-edge, 24px)",
                paddingRight: "var(--nav-edge, 24px)",
                gap: 36,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setDiceRollNonce((n) => n + 1);
                  onRandomHumanoid();
                }}
                aria-label="Shuffle"
                className="pointer-events-auto"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
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
              <div className="flex items-end" style={{ gap: 12 }}>
                <span className="pointer-events-auto" style={{ ...creditStyle, padding: "0 4px" }}>Roy Jad © 2026</span>
                <Chip
                  className="pointer-events-auto hover:underline underline-offset-2"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    copyUrl(origin, "Site link copied", `${origin}/og-default.png`);
                  }}
                  style={{ ...creditStyle, padding: "0 4px" }}
                >
                  Share site
                </Chip>
                <Chip
                  className="pointer-events-auto hover:underline underline-offset-2"
                  onClick={() => setFeedbackOpen(true)}
                  style={{ ...creditStyle, padding: "0 4px" }}
                >
                  Submit feedback
                </Chip>
              </div>
            </div>
          </div>
        );
      })()}

      <Toaster
        position="bottom-center"
        offset={32}
        style={{ "--width": "600px" } as React.CSSProperties}
        toastOptions={{ unstyled: true, style: { display: "flex", justifyContent: "center", width: "100%" } }}
      />

      {chatOpen && <GuideChat onSelect={handleSelectHumanoid} config={chatConfig} />}

      {showShortcuts && <ShortcutsSheet onClose={() => setShowShortcuts(false)} />}

      {feedbackOpen && (
        <ContactSheet variant="feedback" email={FOOTER_CONTACT_EMAIL} onClose={() => setFeedbackOpen(false)} />
      )}
    </main>
  );
}
