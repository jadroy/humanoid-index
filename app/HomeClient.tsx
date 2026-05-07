"use client";

import { Fragment, useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { Toaster, toast } from "sonner";
import { Box, Pause, Play } from "lucide-react";
import { humanoids } from "@/data/humanoids";
import Image from "next/image";
import EllipticalCarousel from "@/components/carousel/EllipticalCarousel";
import GridView from "@/components/GridView";
import MobileView from "@/components/MobileView";
import SpinViewer, { type SpinViewerHandle } from "@/components/SpinViewer";

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
    credit: { prefix: "via", name: "Sunday Robotics", href: "https://www.sundayrobotics.com" },
  },
};
import { WelcomeModal, WelcomeStyleSwitcher, type WelcomeStyle } from "@/components/WelcomeModal";
import { ShortcutsSheet } from "@/components/ShortcutsSheet";
import { LogoMark, PlaceholderLogo } from "@/components/LogoMark";
import { getCompareBlurb } from "@/lib/compareBlurb";
import { getRobotDescription } from "@/lib/robotDescription";
import { SURFACE } from "@/lib/surface";
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
import { FONTS, FAVORITE_FONTS } from "@/lib/fonts";
import { applyGive, GIVE_STYLES, giveStyleLabels, type GiveStyle, type GiveSettings } from "@/lib/cardPhysics";

const MOBILE_BREAKPOINT = 768;

const formatHeight = (cm: number) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - ft * 12);
  if (inches === 12) return `${ft + 1}'0"`;
  return `${ft}'${inches}"`;
};
const formatWeight = (kg: number) => `${Math.round(kg * 2.20462)} lb`;
const formatSpeed = (ms: number) => `${(ms * 2.23694).toFixed(1)} mph`;

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
        <div className="absolute bottom-2 left-3 z-[2] text-[11px] tracking-tight text-white/40 pointer-events-auto">
          {credit.prefix && <span>{credit.prefix} </span>}
          {credit.href ? (
            <a
              href={credit.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/55 hover:text-white/85 transition-colors"
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
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "left" ? "var(--c-ink)" : "#c4c4c4" }}>{lv ? `${lv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
            <span className="text-[12px] tracking-widest uppercase" style={{ color: "#b4b4b4" }}>{k.label}</span>
            <span className="text-[13px] font-medium tabular-nums" style={{ color: w === "right" ? "var(--c-ink)" : "#c4c4c4" }}>{rv ? `${rv}${k.unit ? ` ${k.unit}` : ""}` : "—"}</span>
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
              <span className="text-[12px] tabular-nums mx-1" style={{ color: "#a3a3a3" }}>
                {String(idx + 1).padStart(2, "0")}<span style={{ color: "#d4d4d4" }}>/</span>{String(humanoids.length).padStart(2, "0")}
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
              <p className="text-[12px] tracking-widest uppercase font-medium mb-3" style={{ color: "#a3a3a3", letterSpacing: "0.02em" }}>
                {h.manufacturer}
              </p>
              <h2 className="text-[32px] font-medium leading-none" style={{ color: "#171717", letterSpacing: "-0.04em" }}>
                {h.name}
              </h2>
              {h.year && (
                <p className="text-[13px] mt-2.5" style={{ color: "#a3a3a3" }}>{h.year}</p>
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
                  href={h.purchaseUrl}
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
                  <p className="text-[12px] tracking-widest uppercase" style={{ color: "#a3a3a3", letterSpacing: "0.1em" }}>
                    {s.label}
                  </p>
                  <p className="text-[13px] font-medium mt-1" style={{ color: "#262626" }}>
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

// ═══════════════════════════════════════════════════════════════
// BROWSE — Single + Compare
// ═══════════════════════════════════════════════════════════════
function Browse({ goToIndex, navStyle, onNavStyleChange, switcherStyle, onSwitcherStyleChange, luckyNonce = 0, addHintNonce = 0, onEnterCompare, onShareViewLabelChange, introDone = false, shareUrlRef, shareOgRef, onShareView, buttonVariant, onButtonVariantChange, allCaps = false, onAllCapsChange, showChatTuner = false, onToggleChatTuner, epetriMode = false, onEpetriModeChange, isDev = false, surfaceColor, onSurfaceColorChange, surfaceHover, onSurfaceHoverChange }: { goToIndex?: number | null; navStyle: NavStyle; onNavStyleChange: (s: NavStyle) => void; switcherStyle: SwitcherStyle; onSwitcherStyleChange: (s: SwitcherStyle) => void; luckyNonce?: number; addHintNonce?: number; onEnterCompare?: () => void; onShareViewLabelChange?: (s: string) => void; introDone?: boolean; shareUrlRef?: React.MutableRefObject<string>; shareOgRef?: React.MutableRefObject<string>; onShareView?: () => void; buttonVariant: ButtonVariant; onButtonVariantChange: (v: ButtonVariant) => void; allCaps?: boolean; onAllCapsChange?: (v: boolean) => void; showChatTuner?: boolean; onToggleChatTuner?: () => void; epetriMode?: boolean; onEpetriModeChange?: (v: boolean) => void; isDev?: boolean; surfaceColor: string; onSurfaceColorChange: (c: string) => void; surfaceHover: string; onSurfaceHoverChange: (c: string) => void }) {
  const [presetKey, setPresetKey] = useState<PresetKey>("smooth");
  const [customStiffness, setCustomStiffness] = useState(0.10);
  const [customDamping, setCustomDamping] = useState(0.42);
  const [customThreshold, setCustomThreshold] = useState(54);
  const [robotSquish, setRobotSquish] = useState(0.00);
  const [robotFade, setRobotFade] = useState(0.08);
  const [bottomFadeH, setBottomFadeH] = useState(40);
  const [bottomFadeOpacity, setBottomFadeOpacity] = useState(0.9);
  const [showTuner, setShowTuner] = useState(false);
  const [buyLayout, setBuyLayout] = useState<"card" | "chip">("card");
  const [buyCardStyle, setBuyCardStyle] = useState<"split" | "dark">("split");
  const [hideUnbuyable, setHideUnbuyable] = useState(false);
  const [isCustom, setIsCustom] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [spinActive, setSpinActive] = useState(false);
  const spinViewerRef = useRef<SpinViewerHandle>(null);
  const spinAnimatingRef = useRef(false);
  const [spinPlaying, setSpinPlaying] = useState(false);
  const [spinExiting, setSpinExiting] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [splitHover, setSplitHover] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const [addCtaMode, setAddCtaMode] = useState<"hover" | "always">("always");
  const [pillsLayout, setPillsLayout] = useState<"stack" | "grouped">("stack");
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
  const [arcInset, setArcInset] = useState(70);
  const [navTop, setNavTop] = useState(12);
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
  const [arcGhostDots, setArcGhostDots] = useState(true);
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
  const [galleryIdx, setGalleryIdx] = useState<Record<number, number>>({});
  const galleryScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});
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
  const [statsW, setStatsW] = useState(260);       // px
  const [cardGap, setCardGap] = useState(8);       // px
  const [statsGap, setStatsGap] = useState(8);     // px — gap between robot and stats
  const [cardRadius, setCardRadius] = useState(28);  // px
  // Stat-pill tuners
  const [statPillRadius, setStatPillRadius] = useState(12);  // px — softer than cardRadius (28); full-round felt too tic-tac on short pills
  const [statPillRadiusOpen, setStatPillRadiusOpen] = useState(14);  // px — tighter radius when a pill is expanded
  const [statPillGap, setStatPillGap] = useState(4);         // px — gap between pills
  const [statPillPadX, setStatPillPadX] = useState(16);      // px — horizontal padding inside pill
  const [statPillPadY, setStatPillPadY] = useState(11);      // px — vertical button padding (sets closed height)
  const [statPillBg, setStatPillBg] = useState("#F9F9F9");
  const [infoMode, setInfoMode] = useState<"pill" | "open" | "bare">("bare");
  const [blurbFontSize, setBlurbFontSize] = useState(12.7);
  const [blurbFloat, setBlurbFloat] = useState(false);
  const [splitBlurb, setSplitBlurb] = useState(false);
  const [expandedBlurbs, setExpandedBlurbs] = useState<Set<string>>(new Set());
  const [hoveredBlurbId, setHoveredBlurbId] = useState<string | null>(null);
  type BlurbExpandIndicator = "chevron" | "inline" | "edgebar" | "minimal" | "pill";
  const [blurbExpandIndicator, setBlurbExpandIndicator] = useState<BlurbExpandIndicator>("pill");
  const [bubbleVariant, setBubbleVariant] = useState(24);
  const bubbleVariants: { name: string; bg: string; shadow: string; shadowHover: string; backdropFilter?: string; ink?: string; inkDim?: string }[] = [
    { name: "Crisp white", bg: "#FFFFFF", shadow: "0 0 0 1px rgba(0,0,0,0.06)", shadowHover: "0 0 0 1px rgba(0,0,0,0.10)" },
    { name: "Soft float", bg: "#FFFFFF", shadow: "0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.035)", shadowHover: "0 2px 14px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)" },
    { name: "Lifted", bg: "#FFFFFF", shadow: "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)", shadowHover: "0 4px 16px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.06)" },
    { name: "Pillow", bg: "#FFFFFF", shadow: "0 4px 20px rgba(0,0,0,0.06)", shadowHover: "0 6px 28px rgba(0,0,0,0.10)" },
    { name: "Sheen", bg: "#FFFFFF", shadow: "inset 0 1px 0 rgba(255,255,255,1), 0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)", shadowHover: "inset 0 1px 0 rgba(255,255,255,1), 0 2px 10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)" },
    { name: "Embossed", bg: "#FFFFFF", shadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.05)", shadowHover: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08)" },
    { name: "Top-light gradient", bg: "linear-gradient(180deg, #FFFFFF 0%, #F7F7F7 100%)", shadow: "0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)", shadowHover: "0 2px 10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)" },
    { name: "Bottom-light gradient", bg: "linear-gradient(180deg, #F7F7F7 0%, #FFFFFF 100%)", shadow: "0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)", shadowHover: "0 2px 10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)" },
    { name: "Halo", bg: "#FFFFFF", shadow: "0 0 20px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.05)", shadowHover: "0 0 28px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.07)" },
    { name: "Tight pill", bg: "#FFFFFF", shadow: "0 0 0 1px rgba(0,0,0,0.10)", shadowHover: "0 0 0 1px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.05)" },
    { name: "Glassy", bg: "rgba(255,255,255,0.7)", shadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.6), inset 0 0 0 1px rgba(255,255,255,0.2)", shadowHover: "0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,255,255,0.8), inset 0 0 0 1px rgba(255,255,255,0.3)", backdropFilter: "blur(8px) saturate(180%)" },
    { name: "Cloud", bg: "#FFFFFF", shadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 8px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.03)", shadowHover: "0 2px 4px rgba(0,0,0,0.04), 0 6px 12px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.05)" },
    { name: "Inset card", bg: "#FAFAFA", shadow: "inset 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)", shadowHover: "inset 0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)" },
    { name: "Stacked depth", bg: "#FFFFFF", shadow: "0 1px 1px rgba(0,0,0,0.04), 0 3px 6px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)", shadowHover: "0 2px 2px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)" },
    { name: "Floating high", bg: "#FFFFFF", shadow: "0 6px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)", shadowHover: "0 10px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)" },
    { name: "Subtle outline", bg: "#FFFFFF", shadow: "inset 0 0 0 1px rgba(0,0,0,0.07)", shadowHover: "inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)" },
    { name: "Pale glow", bg: "#FFFFFF", shadow: "0 0 16px rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)", shadowHover: "0 0 24px rgba(255,255,255,0.9), 0 2px 10px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.06)" },
    { name: "Bubble radial", bg: "radial-gradient(ellipse at center, #FFFFFF 0%, #F4F4F4 100%)", shadow: "0 2px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)", shadowHover: "0 3px 14px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)" },
    { name: "Warm white", bg: "#FFFCF8", shadow: "0 1px 4px rgba(120,80,40,0.05), 0 0 0 1px rgba(120,80,40,0.04)", shadowHover: "0 2px 12px rgba(120,80,40,0.08), 0 0 0 1px rgba(120,80,40,0.06)" },
    { name: "Cool white", bg: "#F8FBFF", shadow: "0 1px 4px rgba(40,80,120,0.05), 0 0 0 1px rgba(40,80,120,0.04)", shadowHover: "0 2px 12px rgba(40,80,120,0.08), 0 0 0 1px rgba(40,80,120,0.06)" },
    { name: "iMessage stats", bg: "#FBFBFB", shadow: "0 1px 3px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.025)", shadowHover: "0 2px 8px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.04)" },
    { name: "Frosted glass", bg: "rgba(255,255,255,0.55)", shadow: "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(255,255,255,0.6), inset 0 1px 0 rgba(255,255,255,0.7)", shadowHover: "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.85)", backdropFilter: "blur(12px) saturate(180%)" },
    { name: "Lens", bg: "radial-gradient(ellipse 120% 100% at 50% -20%, #FFFFFF 0%, #F6F7F9 100%)", shadow: "0 2px 8px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)", shadowHover: "0 4px 16px rgba(0,0,0,0.09), 0 0 0 0.5px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)" },
    { name: "Layered glass", bg: "linear-gradient(180deg, #FFFFFF 0%, #F7F8FB 100%)", shadow: "0 4px 14px rgba(15,20,40,0.06), 0 1px 3px rgba(15,20,40,0.04), 0 0 0 0.5px rgba(15,20,40,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(15,20,40,0.04)", shadowHover: "0 6px 22px rgba(15,20,40,0.10), 0 2px 5px rgba(15,20,40,0.06), 0 0 0 0.5px rgba(15,20,40,0.07), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(15,20,40,0.06)" },
    { name: "Glass dome", bg: "radial-gradient(ellipse 140% 90% at 50% -30%, #FFFFFF 0%, #F2F4F8 70%, #ECEFF3 100%)", shadow: "0 6px 18px rgba(20,30,60,0.08), 0 2px 4px rgba(20,30,60,0.05), 0 0 0 0.5px rgba(20,30,60,0.06), inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -1.5px 0 rgba(20,30,60,0.05)", shadowHover: "0 10px 28px rgba(20,30,60,0.12), 0 3px 8px rgba(20,30,60,0.07), 0 0 0 0.5px rgba(20,30,60,0.08), inset 0 1.5px 0 rgba(255,255,255,1), inset 0 -1.5px 0 rgba(20,30,60,0.07)" },
    { name: "Convex bubble", bg: "radial-gradient(ellipse 110% 140% at 50% -40%, rgba(255,255,255,1) 0%, rgba(244,247,251,0.95) 55%, rgba(228,234,243,1) 100%)", shadow: "0 8px 24px rgba(15,25,50,0.09), 0 2px 6px rgba(15,25,50,0.05), 0 0 0 0.5px rgba(15,25,50,0.06), inset 0 2px 0 rgba(255,255,255,1), inset 0 -2px 4px rgba(15,25,50,0.04)", shadowHover: "0 14px 36px rgba(15,25,50,0.13), 0 4px 10px rgba(15,25,50,0.08), 0 0 0 0.5px rgba(15,25,50,0.09), inset 0 2px 0 rgba(255,255,255,1), inset 0 -2px 5px rgba(15,25,50,0.06)" },
    { name: "Soft pearl", bg: "linear-gradient(135deg, #FFFFFF 0%, #FAF7FF 45%, #F2F7FF 100%)", shadow: "0 4px 14px rgba(80,60,180,0.07), 0 1px 3px rgba(80,60,180,0.05), 0 0 0 0.5px rgba(80,60,180,0.06), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(80,60,180,0.04)", shadowHover: "0 6px 22px rgba(80,60,180,0.10), 0 2px 5px rgba(80,60,180,0.07), 0 0 0 0.5px rgba(80,60,180,0.09), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(80,60,180,0.06)" },
    { name: "Floating orb", bg: "radial-gradient(ellipse 80% 110% at 30% 15%, #FFFFFF 0%, #F4F7FB 70%, #EAEFF6 100%)", shadow: "0 14px 32px rgba(20,30,60,0.08), 0 6px 12px rgba(20,30,60,0.05), 0 1px 2px rgba(20,30,60,0.04), 0 0 0 0.5px rgba(20,30,60,0.05), inset 0 1.5px 0 rgba(255,255,255,1)", shadowHover: "0 22px 48px rgba(20,30,60,0.12), 0 10px 20px rgba(20,30,60,0.08), 0 2px 4px rgba(20,30,60,0.05), 0 0 0 0.5px rgba(20,30,60,0.07), inset 0 1.5px 0 rgba(255,255,255,1)" },
    { name: "Crystalline", bg: "linear-gradient(165deg, #FFFFFF 0%, #F4F6FA 50%, #FFFFFF 100%)", shadow: "0 5px 16px rgba(30,40,80,0.07), 0 1px 3px rgba(30,40,80,0.04), 0 0 0 0.5px rgba(30,40,80,0.07), inset 0 1.5px 0.5px rgba(255,255,255,1), inset 0 -1.5px 0.5px rgba(30,40,80,0.05), inset 1px 0 0 rgba(255,255,255,0.5), inset -1px 0 0 rgba(30,40,80,0.03)", shadowHover: "0 8px 26px rgba(30,40,80,0.10), 0 2px 5px rgba(30,40,80,0.06), 0 0 0 0.5px rgba(30,40,80,0.10), inset 0 1.5px 0.5px rgba(255,255,255,1), inset 0 -1.5px 0.5px rgba(30,40,80,0.07), inset 1px 0 0 rgba(255,255,255,0.6), inset -1px 0 0 rgba(30,40,80,0.04)" },
    { name: "Dark slate", bg: "linear-gradient(180deg, #1F2226 0%, #16191D 100%)", shadow: "0 4px 14px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)", shadowHover: "0 6px 22px rgba(0,0,0,0.36), 0 2px 5px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.07)", ink: "#C8C8CC", inkDim: "#9A9AA0" },
    { name: "Dark glass", bg: "rgba(78,80,86,0.62)", shadow: "0 6px 24px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.10)", shadowHover: "0 10px 32px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(255,255,255,0.22), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.12)", backdropFilter: "blur(24px) saturate(180%)", ink: "#F4F4F6", inkDim: "#DCDCE0" },
  ];
  const bubble = bubbleVariants[bubbleVariant - 1] ?? bubbleVariants[0];
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
  // Action-pill variant — "pill" matches the data rows; "text" reads as a footer text-link;
  // "accent" tints label + arrow with --c-accent and prepends ↗; "dark" inverts the pill
  // (black base, white text); "hairline" prepends a 1px seam above the row to demote it.
  const [actionVariant, setActionVariant] = useState<"pill" | "text" | "accent" | "dark" | "hairline" | "split">("pill");
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
  const [statsAlign, setStatsAlign] = useState<"top" | "center" | "bottom">("bottom");

  // Scene background tuner
  const [showSceneTuner, setShowSceneTuner] = useState(false);
  const [sceneShape, setSceneShape] = useState<"radial" | "horizontal" | "vertical" | "top" | "bottom">("bottom");
  const [sceneSize, setSceneSize] = useState(39);
  const [sceneSoftness, setSceneSoftness] = useState(35);
  const [scenePeakAlpha, setScenePeakAlpha] = useState(48);
  const [sceneOpacity, setSceneOpacity] = useState(79);
  const [sceneBlur, setSceneBlur] = useState(0);
  // Humanoid card fill tuner
  const [cardFillColor, setCardFillColor] = useState(SURFACE);
  const [cardFillAlpha, setCardFillAlpha] = useState(63);
  const [cardBlur, setCardBlur] = useState(28);

  // Adaptive arc positioning
  const [windowWidth, setWindowWidth] = useState(1920);
  const [autoArcInset, setAutoArcInset] = useState(true);

  // Arc text font: false = inherit (Geist Sans), true = Geist Mono
  const [arcFontMono, setArcFontMono] = useState(false);
  const arcFontFamily = arcFontMono ? "var(--font-geist-mono)" : undefined;

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    let raf: number;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWindowWidth(window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
  }, []);

  // When the blurb is broken out into its own column, the stats slot widens
  // to fit two side-by-side columns (blurb + pills). Used by layout math and
  // the slot wrapper so centering stays correct.
  const effectiveStatsW = splitBlurb && blurbFloat ? statsW * 2 + cardGap : statsW;

  const centerHalfWidth = (() => {
    const cardPx = comparing
      ? Math.min((robotW - 8) * windowWidth / 100, robotMaxW - 100)
      : Math.min(robotW * windowWidth / 100, robotMaxW);
    const statsPx = effectiveStatsW;
    const gap = statsGap;
    if (comparing) {
      return cardPx + gap + statsPx / 2;
    }
    return (cardPx + gap + statsPx) / 2;
  })();

  const availableSpace = (windowWidth / 2) - centerHalfWidth;
  const adaptiveArcInset = Math.round(Math.min(180, Math.max(48, availableSpace * 0.3)));
  const adaptiveDrumXOffset = Math.round(Math.min(300, Math.max(40, availableSpace * 0.5)));
  const effectiveArcInset = autoArcInset ? adaptiveArcInset : arcInset;
  const effectiveDrumXOffset = autoArcInset ? adaptiveDrumXOffset : drumXOffset;

  // Publish the arc's leftmost-label x so the arc text can align to it
  useEffect(() => {
    const x = Math.max(16, effectiveArcInset - arcTextGap);
    document.documentElement.style.setProperty("--arc-logo-x", `${x}px`);
  }, [effectiveArcInset, arcTextGap]);

  // Publish a stable nav inset that ignores `comparing` so the logo and
  // share button stay anchored when entering/leaving compare mode.
  useEffect(() => {
    if (!autoNavX) {
      document.documentElement.style.setProperty("--nav-x", `${navX}px`);
      return;
    }
    const cardPxStable = Math.min(robotW * windowWidth / 100, robotMaxW);
    const centerHalfStable = (cardPxStable + statsGap + statsW) / 2;
    const availableStable = (windowWidth / 2) - centerHalfStable;
    const adaptiveStable = Math.round(Math.min(180, Math.max(48, availableStable * 0.3)));
    const inset = autoArcInset ? adaptiveStable : arcInset;
    const x = Math.max(16, inset - arcTextGap);
    document.documentElement.style.setProperty("--nav-x", `${x}px`);
  }, [autoNavX, navX, windowWidth, robotW, robotMaxW, statsW, statsGap, autoArcInset, arcInset, arcTextGap]);

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
      if ((e.target as HTMLElement)?.closest?.("[data-tuner]")) return;
      if ((e.target as HTMLElement)?.closest?.("[data-gallery-scroll]") && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
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
  }, [springL.go, springL.nudge, springR.go, springR.nudge]);

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

  const [blurbReady, setBlurbReady] = useState(false);
  useEffect(() => {
    setBlurbReady(false);
    const t = setTimeout(() => setBlurbReady(true), 350);
    return () => clearTimeout(t);
  }, [springL.index, springR.index, comparing]);

  // Drop spin viewer when the active humanoid changes or compare mode toggles
  useEffect(() => {
    setSpinActive(false);
    setVideoPaused(false);
    setGalleryIdx({});
  }, [springL.index, springR.index, comparing]);

  // Auto-resume video when user changes slides — pause is per-current-view, not sticky
  useEffect(() => {
    setVideoPaused(false);
  }, [galleryIdx]);

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
  const sceneActive = !!focusedH?.sceneUrl;
  const sceneBackgroundImage = focusedH?.sceneUrl ? `url(${focusedH.sceneUrl})` : undefined;

  const sceneMask = (() => {
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
  })();

  const cardBg = (() => {
    const hex = cardFillColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${cardFillAlpha / 100})`;
  })();
  const cardBackdropFilter = cardBlur > 0 ? `blur(${cardBlur}px)` : undefined;

  return (
    <div className="h-screen overflow-hidden select-none relative bg-white" style={{ ["--action-hover-tint" as string]: actionHoverColor, ["--action-hover-pct" as string]: actionHoverPct, ["--action-active-pct" as string]: actionActivePct }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage: sceneActive ? sceneBackgroundImage : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: sceneActive ? sceneOpacity / 100 : 0,
          filter: sceneBlur > 0 ? `blur(${sceneBlur}px)` : undefined,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
          WebkitMaskImage: sceneMask,
          maskImage: sceneMask,
        }}
      />
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
          arcWheelR={arcWheelR}
          arcStepDeg={arcStepDeg}
          arcTextGap={arcTextGap}
          arcLineOp={arcLineOp}
          arcFsMax={arcFsMax}
          arcFsMin={arcFsMin}
          arcDiskGap={arcDiskGap}
          arcDiskColor={arcDiskColor}
          arcFontFamily={arcFontFamily}
          arcAllCaps={allCaps}
          arcMaskFade={arcMaskFade}
          arcMarkerVariant={arcMarkerVariant}
          arcMarkerColor={arcMarkerVariant === 22 ? arcMarkerColor : undefined}
          arcGhostDots={arcGhostDots}
          entered={introDone}
          tagFsMin={tagFsMin} tagFsMax={tagFsMax} tagOpMin={tagOpMin} tagOpMax={tagOpMax}
          tagGreyMin={tagGreyMin} tagGreyMax={tagGreyMax} tagPillOp={tagPillOp} tagFalloff={tagFalloff}
          tagPadX={tagPadX} tagPadY={tagPadY} tagRadius={tagRadius} tagMarkerSize={tagMarkerSize} tagMarkerOp={tagMarkerOp}
        />
      </div>
      {/* Right arc nav */}
      {comparing && (
        <div className="fixed top-0 bottom-0 right-0 z-[3] pointer-events-none overflow-visible" style={{ width: 0 }}>
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
            arcWheelR={arcWheelR}
            arcStepDeg={arcStepDeg}
            arcTextGap={arcTextGap}
            arcLineOp={arcLineOp}
            arcFsMax={arcFsMax}
            arcFsMin={arcFsMin}
            arcDiskGap={arcDiskGap}
            arcDiskColor={arcDiskColor}
            arcFontFamily={arcFontFamily}
            arcAllCaps={allCaps}
            arcMaskFade={arcMaskFade}
            arcMarkerVariant={arcMarkerVariant}
            arcMarkerColor={arcMarkerVariant === 22 ? arcMarkerColor : undefined}
            arcGhostDots={arcGhostDots}
            entered={introDone}
            tagFsMin={tagFsMin} tagFsMax={tagFsMax} tagOpMin={tagOpMin} tagOpMax={tagOpMax}
            tagGreyMin={tagGreyMin} tagGreyMax={tagGreyMax} tagPillOp={tagPillOp} tagFalloff={tagFalloff}
            tagPadX={tagPadX} tagPadY={tagPadY} tagRadius={tagRadius} tagMarkerSize={tagMarkerSize} tagMarkerOp={tagMarkerOp}
          />
        </div>
      )}

      {/* ── Add compare button — hover zone right of center ── */}
      {!comparing && (() => {
        const alwaysMode = addCtaMode === "always";
        const addShown = alwaysMode || addHover || addHintVisible;
        const scale = alwaysMode ? 1 : (addShown ? 1 : 0.75);
        return (
          <div
            className="absolute top-0 bottom-0 right-0 flex items-center justify-center cursor-pointer"
            style={{ width: "calc(38% - 24px)", zIndex: 10 }}
            onClick={() => { setAddHover(false); enterCompare(); }}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
          >
            <div
              className="flex flex-col items-center"
              style={{
                gap: 9,
                transform: `scale(${scale})`,
                transition: "transform 240ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  background: addHover ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)",
                  transition: "background 220ms ease",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="rgba(0,0,0,0.78)" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="10" y1="4" x2="10" y2="16" />
                  <line x1="4" y1="10" x2="16" y2="10" />
                </svg>
              </div>
              <span style={{
                fontSize: 11,
                color: "rgba(0,0,0,0.6)",
                fontWeight: 400,
                letterSpacing: "-0.005em",
                userSelect: "none",
              }}>
                Add
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── Humanoid groups: [stats | robot] per side ── */}
      {(() => {
        const bodyStyle = { color: "#999", lineHeight: 1.4 } as const;
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
                  color: "#999",
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
                  color: "#888",
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

        const barViz = (label: string, value: string, pct: number, delay: number) => (
          <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
            <p className="text-[12px] w-[32px] text-right flex-shrink-0" style={{ color: "#aaa" }}>{label}</p>
            <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "#EFEFEF" }}>
              <div className="h-full rounded-full" style={{
                width: openStat.has("stats") ? `${pct}%` : "0%",
                background: "#c4c4c4",
                transition: `width 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
              }} />
            </div>
            <p className="text-[12px] flex-shrink-0 tabular-nums" style={{ color: "var(--c-ink-body)", minWidth: 42 }}>{value}</p>
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
              <p key={h.id} className="text-[12px] mt-2 info-fade-in" style={{ color: "#999", fontWeight: 450 }}>{h.status === "In Production" ? "Commercially available and actively deployed." : h.status === "Prototype" ? "In active development — not yet commercially available." : h.status === "Concept" ? "Early-stage design, not yet built." : h.status === "Anticipated" ? "Teased for future release — details not yet revealed." : "No longer in active production."}</p>
            </div>
          ) },
          // Purchase — collapsed by default so price/buy info opts in like every
          // other pill, keeping the initial column quiet. Only added when buy
          // layout is "card" (the "chip" variant lives on the image itself).
          ...(buyLayout === "card" ? [(() => {
            // Sunday Memo isn't for sale — the founding-family beta is the only way in,
            // so the cost pill becomes a link to their beta program instead of a price.
            const isSundayBeta = h.manufacturer === "Sunday Robotics";
            const buyHref = isSundayBeta ? "https://www.sunday.ai/beta-program" : (h.purchaseUrl || undefined);
            const visitHref = !buyHref ? (h.infoUrl || h.manufacturerUrl) : undefined;
            const href = buyHref || visitHref;
            const hasCost = h.cost && h.cost !== "N/A";
            const hasUrl = !!href;
            const ctaKind: "buy" | "visit" = buyHref ? "buy" : "visit";
            const ctaText = isSundayBeta ? "Apply" : (ctaKind === "buy" ? "Buy" : "Visit");
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
            return {
              key: "purchase",
              show: true,
              href,
              text,
              price: leftLabel,
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
                <div className="flex items-center gap-3 pointer-events-auto" style={{ borderRadius: cardRadius, background: pillBg, backdropFilter: pillBackdrop, WebkitBackdropFilter: pillBackdrop, padding: "10px 12px", flexShrink: 0, position: "relative", zIndex: 11 }}>
                  <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: labelLogoSize, height: labelLogoSize, borderRadius: cardRadius * 0.6, background: h.logoUrl ? "transparent" : "#EFEFEF" }}>
                    {h.logoUrl ? (
                      <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes={`${labelLogoSize}px`} />
                    ) : (
                      <svg width={Math.round(labelLogoSize / 2)} height={Math.round(labelLogoSize / 2)} viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                        <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                        <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, textTransform: allCaps ? "uppercase" : undefined }}>{h.name}</p>
                    <p className="text-[13px] font-medium mt-0.5 truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, textTransform: allCaps ? "uppercase" : undefined, opacity: 0.42 }}>
                      {h.manufacturer}{h.year ? ` · ${h.year}` : ''}
                    </p>
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
                className={`flex flex-col pointer-events-auto${grouped ? " pills-grouped" : ""}`}
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
                  const interactive = !forcedOpen && !empty && !isLink && s.key !== "purchase";
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
                        style={{ gap: 4, padding: `8px ${statPillPadX}px`, color: "#999", fontSize: 12, fontWeight: 450, textDecoration: "none", alignSelf: "flex-start" }}
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
                    const fallbackText = (s as { text?: string }).text ?? "";
                    const cta = (s as { ctaText?: string }).ctaText ?? "Buy";
                    const ctaKind = (s as { ctaKind?: "buy" | "visit" }).ctaKind ?? "buy";
                    const ctaBg = ctaKind === "visit" ? "#E8E8ED" : SPLIT_BUTTON_COLORS[splitButtonColor];
                    const ctaColor = ctaKind === "visit" ? "#1d1d1f" : "#fff";
                    const Outer = (href ? "a" : "div") as React.ElementType;
                    const outerProps = href
                      ? { href, target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() }
                      : {};
                    const labelText = price ?? (href ? " " : fallbackText);
                    const labelColor = href ? pillLabelColor : "#c0c0c0";
                    return (
                      <Outer
                        key={s.key}
                        {...outerProps}
                        className={href ? "pill-button w-full" : "w-full"}
                        style={{
                          ["--pill-bg" as string]: pillBg,
                          background: pillBg,
                          borderRadius: pillRadiusFor(s.key, false),
                          padding: href
                            ? `0 ${Math.max(0, statPillPadY - 6)}px 0 ${statPillPadX}px`
                            : `0 ${statPillPadX}px`,
                          textDecoration: "none",
                          display: "block",
                          WebkitTapHighlightColor: "transparent",
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
                          {href && (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: ctaBg, color: ctaColor, borderRadius: Math.max(8, statPillRadius - 6), padding: "6px 14px", fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: 500, letterSpacing: `${pillLabelLetterSpacing}em`, lineHeight: 1.2 }}>
                              {cta}
                            </span>
                          )}
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
                          ) : s.key === "purchase" ? null : !forcedOpen && (empty ? <span className="text-[12px]" style={{ color: "#c4c4c4" }}>—</span> : ((s as { preview?: React.ReactNode }).preview && !isOpen ? (s as { preview?: React.ReactNode }).preview : plusMinus(isOpen)))}
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
          return (
            <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, gap: cardGap, justifyContent: alignJustify }}>
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
          const href = h.purchaseUrl;
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
                      <p className="text-[12px] tracking-widest uppercase font-medium" style={{ color: "#a3a3a3", letterSpacing: "0.02em" }}>
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
          const pillBg = statPillBg;
          const pillBackdrop: string | undefined = undefined;
          const heightL = hL.height ?? 0, heightR = hR.height ?? 0;
          const weightL = hL.weight ?? 0, weightR = hR.weight ?? 0;
          const dofL = hL.dof ?? 0, dofR = hR.dof ?? 0;
          const speedL = hL.maxSpeed ?? 0, speedR = hR.maxSpeed ?? 0;
          const statusColor = (status?: string) => status === "In Production" ? "#22c55e" : status === "Prototype" ? "#eab308" : status === "Concept" ? "#3b82f6" : status === "Anticipated" ? "#8b5cf6" : "#a3a3a3";

          const compareRow = (label: string, valL: string | null, valR: string | null) => (
            <div className="flex items-baseline justify-between gap-2" style={{ marginTop: 6 }}>
              <p className="text-[12px] tabular-nums flex-1 text-left" style={{ color: valL ? "var(--c-ink-body)" : "#c4c4c4" }}>{valL || "—"}</p>
              <p className="text-[12px] uppercase text-center" style={{ color: "#a3a3a3", letterSpacing: "0.02em", minWidth: 44 }}>{label}</p>
              <p className="text-[12px] tabular-nums flex-1 text-right" style={{ color: valR ? "var(--c-ink-body)" : "#c4c4c4" }}>{valR || "—"}</p>
            </div>
          );

          const compareBlurb = getCompareBlurb(hL, hR);
          const compareBlurbId = `${hL.id}|${hR.id}`;

          const sections = [
            {
              key: "desc",
              show: true,
              bubble: !!compareBlurb.long,
              label: null,
              detail: (() => {
                const isExpanded = expandedBlurbs.has(compareBlurbId);
                const canExpand = !!compareBlurb.long;
                const fullText = canExpand ? compareBlurb.long : compareBlurb.text;
                const collapsedH = blurbFontSize * 1.5 * 2;
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
                        style={{
                          fontSize: blurbFontSize,
                          color: bubble.ink || "var(--c-ink)",
                          opacity: compareBlurb.isGenerated ? 0.6 : 0.4,
                          fontWeight: 500,
                          letterSpacing: "0.015em",
                        }}
                      >
                        {fullText}
                      </p>
                    </div>
                    {canExpand && renderExpandIndicator({ isExpanded, isHovered })}
                  </Wrapper>
                );
              })(),
            },
            {
              key: "stats",
              show: !!(heightL || weightL || heightR || weightR || dofL || dofR || speedL || speedR),
              label: (
                <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>Stats</p>
              ),
              detail: (
                <div>
                  {(heightL || heightR) ? compareRow("Height", heightL ? formatHeight(heightL) : null, heightR ? formatHeight(heightR) : null) : null}
                  {(weightL || weightR) ? compareRow("Weight", weightL ? formatWeight(weightL) : null, weightR ? formatWeight(weightR) : null) : null}
                  {(dofL || dofR) ? compareRow("DOF", dofL ? `${dofL}` : null, dofR ? `${dofR}` : null) : null}
                  {(speedL || speedR) ? compareRow("Speed", speedL ? formatSpeed(speedL) : null, speedR ? formatSpeed(speedR) : null) : null}
                </div>
              ),
            },
            {
              key: "status",
              show: !!(hL.status || hR.status),
              label: (
                <p style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" as const : "none" as const }}>Status</p>
              ),
              preview: (
                <span className="inline-flex items-center" style={{ gap: 6 }}>
                  {hL.status && <span className="inline-block rounded-full h-2 w-2" style={{ background: statusColor(hL.status) }} />}
                  {hR.status && <span className="inline-block rounded-full h-2 w-2" style={{ background: statusColor(hR.status) }} />}
                </span>
              ),
              detail: (
                <div className="flex items-center gap-3" style={{ marginTop: 6 }}>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(hL.status) }} />
                    <p className="text-[12px] truncate" style={{ color: "var(--c-ink-body)" }}>{hL.status || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <p className="text-[12px] truncate" style={{ color: "var(--c-ink-body)" }}>{hR.status || "—"}</p>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(hR.status) }} />
                  </div>
                </div>
              ),
            },
          ];

          const headerCell = (h: typeof humanoids[0]) => (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: cardRadius * 0.6, background: h.logoUrl ? "transparent" : "#EFEFEF" }}>
                {h.logoUrl ? (
                  <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes="26px" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                    <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                    <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2 }}>{h.name}</p>
                <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, marginTop: 1, opacity: 0.42 }}>{h.manufacturer}</p>
              </div>
            </div>
          );

          const isPillVisible = (s: typeof sections[number]) => {
            if (blurbFloat && s.key === "desc") return false;
            const empty = !s.show;
            const hideLabel = s.key === "desc" && infoMode === "bare";
            if (empty && hideLabel) return false;
            return true;
          };
          const lastVisibleKey = [...sections].reverse().find(isPillVisible)?.key;
          const pillRadiusFor = (_isLast: boolean, isOpen: boolean) => {
            return isOpen ? statPillRadiusOpen : statPillRadius;
          };

          return (
            <div className="flex flex-col h-full" style={{ width: statsW, minWidth: statsW, gap: cardGap, justifyContent: alignJustify }}>
              {blurbFloat && (() => {
                const isExpanded = expandedBlurbs.has(compareBlurbId);
                const canExpand = !!compareBlurb.long;
                const fullText = canExpand ? compareBlurb.long : compareBlurb.text;
                const collapsedH = blurbFontSize * 1.5 * 2;
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
                        key={`blurb-float-${compareBlurbId}`}
                        className="leading-[1.5] info-fade-in"
                        style={{
                          fontSize: blurbFontSize,
                          color: bubble.ink || "var(--c-ink)",
                          opacity: compareBlurb.isGenerated ? 0.6 : 0.4,
                          fontWeight: 500,
                          letterSpacing: "0.015em",
                        }}
                      >
                        {fullText}
                      </p>
                    </div>
                    {canExpand && renderExpandIndicator({ isExpanded, isHovered })}
                  </Wrapper>
                );
              })()}
              {labelPosition === "stack" && (() => {
                const active = splitHover;
                const sDur = `${splitDur}ms`;
                const unifiedL = `${cardRadius}px 0 0 ${cardRadius}px`;
                const unifiedR = `0 ${cardRadius}px ${cardRadius}px 0`;
                const roundedAll: string | number = cardRadius;
                let containerGap = 0;
                let leftRadius: string | number = active ? roundedAll : unifiedL;
                let rightRadius: string | number = active ? roundedAll : unifiedR;
                let leftTransform = "translateX(0)";
                let rightTransform = "translateX(0)";
                let leftShadow = "none";
                let rightShadow = "none";
                let transformOrigin = "center center";

                if (splitVariant === "morph") {
                  containerGap = active ? splitAmount : 0;
                } else if (splitVariant === "push") {
                  leftTransform = active ? `translateX(-${splitAmount / 2}px)` : "translateX(0)";
                  rightTransform = active ? `translateX(${splitAmount / 2}px)` : "translateX(0)";
                } else if (splitVariant === "lift") {
                  containerGap = active ? splitAmount : 0;
                  leftTransform = active ? `translateY(-${splitLiftY}px)` : "translateY(0)";
                  rightTransform = active ? `translateY(-${splitLiftY}px)` : "translateY(0)";
                  const blur = Math.max(6, splitLiftY * 3);
                  leftShadow = active ? `0 ${splitLiftY + 2}px ${blur}px rgba(0,0,0,${splitShadowOp})` : "none";
                  rightShadow = leftShadow;
                } else if (splitVariant === "shrink") {
                  containerGap = active ? splitAmount : 0;
                  leftTransform = active ? `scale(${splitScale})` : "scale(1)";
                  rightTransform = active ? `scale(${splitScale})` : "scale(1)";
                  transformOrigin = "center center";
                } else if (splitVariant === "swap") {
                  containerGap = active ? splitAmount : 0;
                  leftTransform = active ? `translateX(${splitAmount / 2}px)` : "translateX(0)";
                  rightTransform = active ? `translateX(-${splitAmount / 2}px)` : "translateX(0)";
                }

                const pillTransition = `border-radius ${sDur} ${ease}, transform ${sDur} ${ease}, box-shadow ${sDur} ${ease}`;

                return (
                  <div className="flex items-center pointer-events-auto" style={{
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 11,
                    gap: containerGap,
                    transition: `gap ${sDur} ${ease}`,
                  }}>
                    <div className="flex-1 min-w-0 flex items-center" style={{
                      background: "var(--c-surface)",
                      padding: "10px 12px",
                      borderRadius: leftRadius,
                      transform: leftTransform,
                      boxShadow: leftShadow,
                      transformOrigin,
                      transition: pillTransition,
                    }}>
                      {headerCell(hL)}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center" style={{
                      background: "var(--c-surface)",
                      padding: "10px 12px",
                      borderRadius: rightRadius,
                      transform: rightTransform,
                      boxShadow: rightShadow,
                      transformOrigin,
                      transition: pillTransition,
                    }}>
                      {headerCell(hR)}
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-col pointer-events-auto" style={{ gap: statPillGap, position: "relative", zIndex: 11, marginTop: blurbFloat ? "auto" : undefined }}>
                {sections.map((s) => {
                  if (blurbFloat && s.key === "desc") return null;
                  const empty = !s.show;
                  const hideLabel = s.key === "desc" && infoMode === "bare";
                  if (empty && hideLabel) return null;
                  const isLast = s.key === lastVisibleKey;
                  const forcedOpen = s.key === "desc" && infoMode !== "pill" && !empty;
                  const isOpen = !empty && openStat.has(s.key);
                  const isLink = !!((s as { href?: string }).href);
                  const interactive = !forcedOpen && !empty && !isLink && s.key !== "purchase";
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
                        style={{ gap: 4, padding: `8px ${statPillPadX}px`, color: "#999", fontSize: 12, fontWeight: 450, textDecoration: "none", alignSelf: "flex-start" }}
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
                    const href = (s as any).href as string;
                    const price = (s as { price?: string }).price;
                    const cta = (s as { ctaText?: string }).ctaText ?? "Buy";
                    const ctaKind = (s as { ctaKind?: "buy" | "visit" }).ctaKind ?? "buy";
                    const ctaBg = ctaKind === "visit" ? "#E8E8ED" : SPLIT_BUTTON_COLORS[splitButtonColor];
                    const ctaColor = ctaKind === "visit" ? "#1d1d1f" : "#fff";
                    return (
                      <a
                        key={s.key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="pill-button w-full"
                        style={{
                          ["--pill-bg" as string]: pillBg,
                          background: pillBg,
                          borderRadius: pillRadiusFor(isLast, false),
                          padding: `0 ${Math.max(0, statPillPadY - 6)}px 0 ${statPillPadX}px`,
                          textDecoration: "none",
                          display: "block",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <div className="w-full flex items-center justify-between" style={{ padding: `${Math.max(0, statPillPadY - 6)}px 0`, gap: 8 }}>
                          <span style={{ fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: pillLabelColor, textTransform: pillLabelUppercase ? "uppercase" : "none" }}>
                            {price ?? " "}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: ctaBg, color: ctaColor, borderRadius: Math.max(8, statPillRadius - 6), padding: "6px 14px", fontSize: pillLabelFontSize, fontFamily: pillLabelFont, fontWeight: 500, letterSpacing: `${pillLabelLetterSpacing}em`, lineHeight: 1.2 }}>
                            {cta}
                          </span>
                        </div>
                      </a>
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
                        borderRadius: pillRadiusFor(isLast, isOpen),
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
                            borderRadius: pillRadiusFor(isLast, isOpen),
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      {!hideLabel && (
                        <div className="w-full flex items-center justify-between" style={{ padding: `${statPillPadY}px 0`, position: "relative", textTransform: pillLabelUppercase ? "uppercase" : "none", fontFamily: pillLabelFont, fontWeight: pillLabelWeight, letterSpacing: `${pillLabelLetterSpacing}em`, color: actionLabelColor }}>
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
                          ) : s.key === "purchase" ? null : !forcedOpen && (empty ? <span className="text-[12px]" style={{ color: "#c4c4c4" }}>—</span> : ((s as { preview?: React.ReactNode }).preview && !isOpen ? (s as { preview?: React.ReactNode }).preview : plusMinus(isOpen)))}
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
            </div>
          );
        };

        const renderMedia = (mh: typeof humanoids[0], mIdx: number, markPriority: boolean) => {
          const mGallery = mh.media || [];
          const mItems: { kind: "image" | "video"; src: string; position?: string; fit?: "contain" | "cover"; credit?: { prefix?: string; name: string; href?: string } }[] = [];
          if (mh.imageUrl) mItems.push({ kind: "image", src: mh.imageUrl, position: mh.imagePosition, fit: mh.imageFit });
          for (const m of mGallery) mItems.push({ kind: m.type, src: m.url, position: m.position ?? mh.imagePosition, fit: m.fit ?? mh.imageFit, credit: m.credit });
          const mHasGallery = mItems.length > 1;
          const mCurrent = galleryIdx[mIdx] || 0;
          const mCurrentIsVideo = mItems[mCurrent]?.kind === "video";

          const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            if (idx !== (galleryIdx[mIdx] || 0)) {
              setGalleryIdx((prev) => ({ ...prev, [mIdx]: idx }));
            }
          };

          return (
            <>
              {/* New badge — rides with the humanoid */}
              {mh.year === 2025 && (
                <div className="absolute top-3 left-3 z-20 px-2 py-0.5 text-[12px] font-semibold" style={{ borderRadius: Math.max(3, cardRadius - 1), background: "#8e8e93", color: "#ffffff" }}>New</div>
              )}
              <div
                ref={(el) => { galleryScrollRefs.current[mIdx] = el; }}
                data-gallery-scroll={mHasGallery ? "" : undefined}
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
                    <span className="text-[12px] tracking-[0.22em] uppercase" style={{ color: "#a3a3a3" }}>Coming Soon</span>
                  </div>
                ) : mItems.length > 0 ? mItems.map((item, i) => {
                  const isCover = item.fit === "cover";
                  const isBottom = !!item.position?.includes("bottom");
                  const isVideo = item.kind === "video";
                  return (
                    <div key={i} className="relative flex items-center justify-center pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", padding: isVideo || isCover ? 0 : isBottom ? "24px 24px 0 24px" : 24, background: isVideo ? "#000000" : undefined }}>
                      <div className="relative w-full h-full">
                        {isVideo ? (
                          <VideoSlide src={item.src} fit={isCover ? "cover" : "contain"} position={item.position} playing={i === mCurrent && !videoPaused} credit={item.credit} />
                        ) : (
                          /* key={src} forces remount on humanoid swap — without it, next/image's reused <img> can paint one frame without object-fit during fast scroll, flashing the image at natural size cropped to the box. */
                          <Image key={item.src} src={item.src} alt={`${mh.name} ${i + 1}`} fill className={isCover ? "object-cover" : "object-contain"} style={item.position ? { objectPosition: item.position } : undefined} sizes={comparing ? `${robotW - 8}vw` : `${robotW}vw`} priority={markPriority && i === 0} />
                        )}
                        {isBottom && !isVideo && (
                          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[2]" style={{ height: bottomFadeH, background: `linear-gradient(to bottom, transparent, rgba(250,250,250,${bottomFadeOpacity}))` }} />
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="relative flex items-center justify-center p-6 pointer-events-none" style={{ width: "100%", height: "100%", flexShrink: 0 }}>
                    <PlaceholderLogo />
                  </div>
                )}
              </div>
              {/* Dot strip — overlaid at bottom with fade, revealed on card hover */}
              {mHasGallery && (
                <div
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-[3] pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
                  style={{
                    height: 28,
                    background: mCurrentIsVideo
                      ? "linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))"
                      : "linear-gradient(to bottom, transparent, rgba(255,255,255,0.8))",
                  }}
                >
                  <div className="flex gap-1.5">
                    {mItems.map((_, i) => (
                      <div key={i} style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: mCurrentIsVideo
                          ? (i === mCurrent ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)")
                          : (i === mCurrent ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"),
                        transition: "background 0.2s ease",
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        };

        const renderBuyChip = (h: typeof humanoids[0]) => {
          if (!h.purchaseUrl) return null;
          return (
            <div className="absolute z-[6]" style={{ top: 14, right: 14 }}>
              <a
                href={h.purchaseUrl}
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
          const currentImg = galleryIdx[hIdx] || 0;
          const currentIsVideo = allKinds[currentImg] === "video";

          const scrollGallery = (idx: number) => {
            const el = galleryScrollRefs.current[hIdx];
            if (!el || !el.children[idx]) return;
            const child = el.children[idx] as HTMLElement;
            el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
          };

          const cardLabel = (
            <div key={h.id} className="flex items-center gap-2 px-0.5 info-fade-in">
              <div className="flex-shrink-0 relative overflow-hidden flex items-center justify-center" style={{ width: labelLogoSize, height: labelLogoSize, borderRadius: cardRadius * 0.6, background: h.logoUrl ? "transparent" : "#EFEFEF" }}>
                {h.logoUrl ? (
                  <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes={`${labelLogoSize}px`} />
                ) : (
                  <svg width={Math.round(labelLogoSize / 2)} height={Math.round(labelLogoSize / 2)} viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
                    <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
                    <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2 }}>{h.name}</p>
                <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, opacity: 0.42 }}>{h.manufacturer}</p>
              </div>
            </div>
          );

          return (
            <div className="relative flex-shrink-0 group/card" style={{ zIndex: 1 }}>
            {labelPosition === "above" && <div className="mb-2">{cardLabel}</div>}
            {/* Inner card */}
            <div
              ref={isFirst ? leftCardRef : rightCardRef}
              className="relative flex flex-col overflow-hidden"
              style={{
                width: comparing ? `${robotW - 8}vw` : `${robotW}vw`,
                height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
                maxWidth: comparing ? robotMaxW - 100 : robotMaxW,
                borderRadius: cardRadius,
                background: (!comparing && h.sceneUrl) ? cardBg : "#F9F9F9",
                backdropFilter: (!comparing && h.sceneUrl) ? cardBackdropFilter : undefined,
                WebkitBackdropFilter: (!comparing && h.sceneUrl) ? cardBackdropFilter : undefined,
                pointerEvents: "auto",
                transition: `width ${dur} ${ease}, height ${dur} ${ease}, max-width ${dur} ${ease}`,
                willChange: "transform",
                zIndex: 2,
              }}
            >
              {/* Media area */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                {/* Static — instant on entry, fades in on exit (mirrors SpinViewer's canvas fade-in) */}
                {(!spinActive || spinExiting) && (
                  <div
                    className="absolute inset-0"
                    style={spinExiting ? { animation: "spin-static-in 500ms ease-out forwards" } : undefined}
                  >
                    {renderMedia(h, hIdx, isFirst)}
                  </div>
                )}
                {/* Spin viewer — mounted only during active 3D; instant in/out at wrapper level */}
                {spinActive && !spinExiting && isFirst && SPIN_ROBOTS[h.id] && (
                  <div className="absolute inset-0">
                    <SpinViewer
                      ref={spinViewerRef}
                      frameCount={SPIN_ROBOTS[h.id]!.frameCount}
                      path={SPIN_ROBOTS[h.id]!.path}
                      credit={SPIN_ROBOTS[h.id]!.credit}
                      className="w-full h-full"
                    />
                  </div>
                )}
                {isFirst && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareView?.();
                    }}
                    aria-label="Copy link"
                    className={`absolute top-2 right-2 z-30 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer pointer-events-auto transition-all duration-200 opacity-0 group-hover/card:opacity-100 ${
                      currentIsVideo
                        ? "text-white/70 hover:text-white hover:bg-white/15"
                        : "text-neutral-500 hover:text-neutral-800 hover:bg-white/75 hover:backdrop-blur-md"
                    }`}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </button>
                )}
                {/* Auto-rotate (play/pause) — appears next to the 3D toggle while active */}
                {isFirst && !comparing && SPIN_ROBOTS[h.id] && spinActive && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (spinPlaying) {
                        spinViewerRef.current?.cancelPlay();
                        return;
                      }
                      if (spinAnimatingRef.current) return;
                      spinAnimatingRef.current = true;
                      setSpinPlaying(true);
                      try {
                        await spinViewerRef.current?.playRotation();
                      } finally {
                        spinAnimatingRef.current = false;
                        setSpinPlaying(false);
                      }
                    }}
                    aria-label={spinPlaying ? "Pause rotation" : "Auto-rotate"}
                    className="absolute bottom-2 right-[44px] z-30 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer pointer-events-auto text-neutral-500 transition-all duration-200 hover:text-neutral-800 hover:bg-white/75 hover:backdrop-blur-md"
                  >
                    {spinPlaying ? (
                      <Pause width={17} height={17} strokeWidth={1.75} />
                    ) : (
                      <Play width={17} height={17} strokeWidth={1.75} />
                    )}
                  </button>
                )}
                {/* 3D toggle — bottom-right, mirrors the share button */}
                {isFirst && !comparing && SPIN_ROBOTS[h.id] && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (spinAnimatingRef.current) return;
                      if (spinActive) {
                        spinAnimatingRef.current = true;
                        await spinViewerRef.current?.unwind();
                        // Fade the spin layer out, mirroring the entry fade-in
                        setSpinExiting(true);
                        await new Promise((r) => setTimeout(r, 500));
                        setSpinActive(false);
                        setSpinExiting(false);
                        spinAnimatingRef.current = false;
                      } else {
                        setSpinActive(true);
                      }
                    }}
                    aria-label={spinActive ? "Exit 3D view" : "View in 3D"}
                    className={`absolute bottom-2 right-2 z-30 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer pointer-events-auto transition-all duration-200 ${
                      spinActive
                        ? "bg-white/75 backdrop-blur-md text-neutral-800 opacity-100"
                        : "text-neutral-500 hover:text-neutral-800 hover:bg-white/75 hover:backdrop-blur-md opacity-0 group-hover/card:opacity-100"
                    }`}
                  >
                    <Box width={17} height={17} strokeWidth={1.75} />
                  </button>
                )}
                {/* Video play/pause — appears when on a video slide; lives in the bottom-right cluster */}
                {isFirst && !comparing && currentIsVideo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoPaused((p) => !p);
                    }}
                    aria-label={videoPaused ? "Play video" : "Pause video"}
                    className="absolute bottom-2 right-2 z-30 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer pointer-events-auto text-white/70 transition-all duration-200 hover:text-white hover:bg-white/15 opacity-0 group-hover/card:opacity-100"
                  >
                    {videoPaused ? (
                      <Play width={17} height={17} strokeWidth={1.75} />
                    ) : (
                      <Pause width={17} height={17} strokeWidth={1.75} />
                    )}
                  </button>
                )}
              </div>

              {/* Hover arrows — anchored to the active humanoid's gallery */}
              {hasGallery && currentImg > 0 && (
                <button
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-0 group-hover/card:opacity-60 hover:!opacity-100 transition-opacity duration-200 cursor-pointer z-[5]"
                  style={{ background: "rgba(255,255,255,0.8)", borderRadius: "50%", pointerEvents: "auto" }}
                  onClick={(e) => { e.stopPropagation(); scrollGallery(currentImg - 1); }}
                >
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,1.5 2,5 6,8.5" /></svg>
                </button>
              )}
              {hasGallery && currentImg < allImages.length - 1 && (
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center opacity-0 group-hover/card:opacity-60 hover:!opacity-100 transition-opacity duration-200 cursor-pointer z-[5]"
                  style={{ background: "rgba(255,255,255,0.8)", borderRadius: "50%", pointerEvents: "auto" }}
                  onClick={(e) => { e.stopPropagation(); scrollGallery(currentImg + 1); }}
                >
                  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,1.5 6,5 2,8.5" /></svg>
                </button>
              )}

              {buyLayout === "chip" && renderBuyChip(h)}

            </div>

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
                style={{
                  marginLeft: effectiveGap,
                  overflowX: "visible", overflowY: "visible",
                  width: comparing ? statsW : effectiveStatsW,
                  height: comparing ? `${robotH - 10}vh` : `${robotH}vh`,
                  transform: addHintVisible
                    ? undefined
                    : !comparing && addHover && addCtaMode !== "always" ? "translateX(-16px)" : "translateX(0)",
                  transition: addHintVisible
                    ? `width ${dur} ${ease}, height ${dur} ${ease}, opacity ${dur} ${ease}, margin-left ${dur} ${ease}`
                    : `width ${dur} ${ease}, height ${dur} ${ease}, opacity ${dur} ${ease}, margin-left ${dur} ${ease}, transform ${dur} ${ease}`,
                }}
              >
                <div className="absolute inset-0" style={{
                  opacity: comparing ? 0 : 1,
                  pointerEvents: comparing ? "none" : "auto",
                  transition: `opacity 0.2s ${ease}`,
                }}>
                  {renderStats(hL)}
                </div>
                <div className="absolute inset-0" style={{
                  opacity: comparing ? 1 : 0,
                  pointerEvents: comparing ? "auto" : "none",
                  transition: `opacity 0.2s ${ease} ${comparing ? "0.06s" : "0s"}`,
                }}>
                  {renderMergedStats()}
                </div>

                {/* Exit compare — wide hover zone above the bottom-aligned pills.
                    Minus sits pinned near the top so it reads as a top-of-column
                    affordance even while the zone extends well below it. */}
                {comparing && (
                  <div
                    className="absolute cursor-pointer pointer-events-auto flex items-start justify-center"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 120,
                      paddingTop: 14,
                      zIndex: 12,
                    }}
                    onClick={exitCompare}
                    onMouseEnter={() => setSplitHover(true)}
                    onMouseLeave={() => setSplitHover(false)}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: "#ebebeb",
                        opacity: splitHover ? 1 : 0,
                        transform: `scale(${splitHover ? 1 : 0.75})`,
                        transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}`,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="4" y1="8" x2="12" y2="8" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Right robot — compare only */}
              <div className="flex-shrink-0 relative" style={{
                opacity: comparing ? 1 : 0,
                transform: `translateX(${splitHover ? 12 : 0}px) scale(${comparing ? 1 : 0.95})`,
                width: comparing ? "auto" : 0,
                marginLeft: comparing ? effectiveGap : 0,
                overflow: comparing ? "visible" : "hidden",
                transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}, width ${dur} ${ease}, margin-left ${dur} ${ease}`,
              }}>
                {comparing && (
                  <button
                    onClick={exitCompare}
                    aria-label="Remove from compare"
                    className="absolute z-30 flex items-center justify-center cursor-pointer pointer-events-auto"
                    style={{
                      top: 8,
                      right: 8,
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                      opacity: 0.5,
                      transition: "opacity 180ms ease, transform 180ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#666" strokeWidth="1.6" strokeLinecap="round">
                      <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
                      <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
                    </svg>
                  </button>
                )}
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
            onClick={() => onToggleChatTuner?.()}
            className="cursor-pointer transition-colors duration-150"
            style={{ fontSize: 10, color: showChatTuner ? "#a0a0a0" : "#d4d4d4", letterSpacing: "0.02em" }}
          >
            C
          </button>
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
          <div className="flex items-center justify-between">
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Scene</p>
            <span className="text-[10px] text-neutral-400">{sceneActive ? focusedH?.name : "—"}</span>
          </div>
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
          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-neutral-500 flex justify-between">Size <span className="tabular-nums text-neutral-400">{sceneSize}%</span></label>
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
            <p className="text-[11px] tracking-widest uppercase text-neutral-500">Surface</p>
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
      {showTuner && (
        <div data-tuner className="absolute top-28 right-5 z-50 bg-white rounded-2xl border border-neutral-100 p-5 shadow-lg w-[240px] space-y-5 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide" style={{ overscrollBehavior: "contain" }}>
          <div>
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
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-[12px] tracking-widest uppercase text-neutral-400 mb-2">Buy</p>
            <div className="flex flex-wrap gap-1.5">
              {(["card", "chip"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setBuyLayout(v)}
                  className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${buyLayout === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}
                >
                  {v === "card" ? "Stats card" : "Image chip"}
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
          <div className="space-y-3 pt-2 border-t border-neutral-100"><p className="text-[12px] tracking-widest uppercase text-neutral-400">Nav</p>
            <div><p className="text-[12px] text-neutral-500 mb-1.5">Style</p><div className="flex flex-wrap gap-1.5">{NAV_STYLES.map((s) => (<button key={s} onClick={() => onNavStyleChange(s)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all capitalize ${navStyle === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{s}</button>))}</div></div>
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
              <label className="text-[12px] text-neutral-500 flex justify-between mt-2">Bubble variant <span className="tabular-nums text-neutral-400">{bubbleVariant}/{bubbleVariants.length} · {bubbleVariants[bubbleVariant - 1].name}</span></label>
              <input type="range" min={1} max={bubbleVariants.length} value={bubbleVariant} onChange={(e) => setBubbleVariant(Number(e.target.value))} className="w-full accent-neutral-900 h-1" />
              <div className="flex gap-1 mt-1">
                <button type="button" onClick={() => setBubbleVariant((v) => Math.max(1, v - 1))} className="text-[12px] px-2 py-1 rounded" style={{ background: "#f0f0f0", color: "#666", border: "none", cursor: "pointer" }}>← prev</button>
                <button type="button" onClick={() => setBubbleVariant((v) => Math.min(bubbleVariants.length, v + 1))} className="text-[12px] px-2 py-1 rounded" style={{ background: "#f0f0f0", color: "#666", border: "none", cursor: "pointer" }}>next →</button>
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
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">Geist Mono</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${arcFontMono ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => setArcFontMono(!arcFontMono)}>{arcFontMono ? "On" : "Off"}</button></div>
            <div className="flex items-center gap-2 mb-1"><label className="text-[12px] text-neutral-500 flex-1">All Caps</label><button className={`px-2 py-0.5 rounded text-[12px] cursor-pointer ${allCaps ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`} onClick={() => onAllCapsChange?.(!allCaps)}>{allCaps ? "On" : "Off"}</button></div>
            <div style={{ opacity: autoArcInset ? 0.3 : 1 }}><label className="text-[12px] text-neutral-500 flex justify-between">Arc inset <span className="tabular-nums text-neutral-400">{arcInset}px</span></label><input type="range" min={30} max={600} value={arcInset} onChange={(e) => { setArcInset(Number(e.target.value)); setAutoArcInset(false); }} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Arc radius <span className="tabular-nums text-neutral-400">{arcWheelR}px</span></label><input type="range" min={80} max={1500} value={arcWheelR} onChange={(e) => setArcWheelR(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Step angle <span className="tabular-nums text-neutral-400">{arcStepDeg.toFixed(1)}°</span></label><input type="range" min={10} max={80} value={Math.round(arcStepDeg * 10)} onChange={(e) => setArcStepDeg(Number(e.target.value) / 10)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Text gap <span className="tabular-nums text-neutral-400">{arcTextGap}px</span></label><input type="range" min={0} max={80} value={arcTextGap} onChange={(e) => setArcTextGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Line opacity <span className="tabular-nums text-neutral-400">{arcLineOp.toFixed(2)}</span></label><input type="range" min={0} max={100} value={Math.round(arcLineOp * 100)} onChange={(e) => setArcLineOp(Number(e.target.value) / 100)} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font max <span className="tabular-nums text-neutral-400">{arcFsMax}px</span></label><input type="range" min={12} max={40} value={arcFsMax} onChange={(e) => setArcFsMax(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Font min <span className="tabular-nums text-neutral-400">{arcFsMin}px</span></label><input type="range" min={6} max={20} value={arcFsMin} onChange={(e) => setArcFsMin(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Disk gap <span className="tabular-nums text-neutral-400">{arcDiskGap}px</span></label><input type="range" min={0} max={280} value={arcDiskGap} onChange={(e) => setArcDiskGap(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div><label className="text-[12px] text-neutral-500 flex justify-between">Edge fade <span className="tabular-nums text-neutral-400">{arcMaskFade}%</span></label><input type="range" min={0} max={45} value={arcMaskFade} onChange={(e) => setArcMaskFade(Number(e.target.value))} className="w-full accent-neutral-900 h-1" /></div>
            <div className="flex items-center justify-between"><label className="text-[12px] text-neutral-500">Ghost dots</label><button onClick={() => setArcGhostDots(v => !v)} className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-all ${arcGhostDots ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>{arcGhostDots ? "On" : "Off"}</button></div>
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
                          <p style={{ fontSize: config.fontSize - 3, color: "#a0a0a0" }}>{h.manufacturer}</p>
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

// ─── Fonts ─────────────────────────────────────────────────────
export default function HomeClient() {
  const isMobile = useIsMobile();
  const isDev = useIsDev();

  const [layout, setLayout] = useState<Layout>("E");
  const [indexView, setIndexView] = useState<IndexView>("timeline");

  const [navStyle, setNavStyle] = useState<NavStyle>("centered");
  const [surfaceColor, setSurfaceColor] = useState(SURFACE);
  const [surfaceHover, setSurfaceHover] = useState("#EBEBEB");
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
  const [shareViewLabel, setShareViewLabel] = useState("Share view");

  // Share URL — Browse writes to this ref, Home's share button reads it
  const shareUrlRef = useRef("");
  const shareOgRef = useRef("");
  const copyUrl = useCallback((url: string, label: string, ogUrl?: string) => {
    navigator.clipboard.writeText(url);
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
        {ogUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ogUrl}
            alt=""
            width={200}
            height={105}
            style={{
              display: "block",
              borderRadius: 10,
              objectFit: "cover",
              background: "rgba(0,0,0,0.03)",
            }}
          />
        )}
        <div style={{ fontSize: 12, color: "#737373", padding: "6px 8px 2px", letterSpacing: "-0.005em" }}>
          {label}
        </div>
      </div>
    ), { duration: 2600 });
  }, []);
  const [allCaps, setAllCaps] = useState(false);

  const [fontIdx, setFontIdx] = useState(0);
  const [favIdx, setFavIdx] = useState(0);
  const [fontMode, setFontMode] = useState<"all" | "fav">("all");
  const fontModeRef = useRef<"all" | "fav">("all");
  useEffect(() => { fontModeRef.current = fontMode; }, [fontMode]);
  const [showFontToast, setShowFontToast] = useState(false);
  const [epetriMode, setEpetriMode] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Intro animation state ──
  const [introPhase, setIntroPhase] = useState<"logo" | "exit" | "done">("logo");
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeStyle, setWelcomeStyle] = useState<WelcomeStyle>("minimal");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [buttonVariant, setButtonVariant] = useState<ButtonVariant>("outlined");

  useEffect(() => {
    // Phase 1: logo sits for a beat, then exits
    const t1 = setTimeout(() => setIntroPhase("exit"), 800);
    // Phase 2: overlay unmounts, content expands in
    const t2 = setTimeout(() => setIntroPhase("done"), 1150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Welcome modal — gated to dev mode for now (Ctrl+Shift+D to enable)
  useEffect(() => {
    if (!isDev) return;
    const t = setTimeout(() => {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem("hi:welcome-seen") === "1") return;
      setShowWelcome(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [isDev]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hi:welcome-seen", "1");
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isDev) {
        if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
          const wasAll = fontModeRef.current === "all";
          setFontMode("all");
          if (wasAll) setFontIdx((i) => (i + 1) % FONTS.length);
          setShowFontToast(true);
          if (toastTimeout.current) clearTimeout(toastTimeout.current);
          toastTimeout.current = setTimeout(() => setShowFontToast(false), 1800);
        }
        if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
          const wasFav = fontModeRef.current === "fav";
          setFontMode("fav");
          if (wasFav) setFavIdx((i) => (i + 1) % FAVORITE_FONTS.length);
          setShowFontToast(true);
          if (toastTimeout.current) clearTimeout(toastTimeout.current);
          toastTimeout.current = setTimeout(() => setShowFontToast(false), 1800);
        }
        if (e.key === "e" && !e.metaKey && !e.ctrlKey) {
          setEpetriMode((v) => !v);
        }
        if (e.key === "w" && !e.metaKey && !e.ctrlKey) {
          setShowWelcome((v) => !v);
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

  const onRandomHumanoid = useCallback(() => {
    if (layout !== "E") setLayout("E");
    setChatOpen(false);
    setLuckyNonce((n) => n + 1);
    setLuckyUsed(true);
  }, [layout]);

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
    return <MobileView />;
  }

  return (
    <main
      className="min-h-screen bg-white"
      style={{
        fontFamily: epetriMode
          ? "var(--font-epetri)"
          : (fontMode === "fav" ? FAVORITE_FONTS[favIdx].family : FONTS[fontIdx].family),
        ["--c-surface" as string]: surfaceColor,
        ["--c-surface-hover" as string]: surfaceHover,
        ...(epetriMode ? EPETRI_FONT_OVERRIDES : {}),
      } as React.CSSProperties}
    >
      {/* ── Intro overlay ── */}
      {introPhase !== "done" && (
        <div className="intro-overlay">
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
            />
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className={introDone ? "intro-content" : "opacity-0"}>
        {layout === "E" && <Browse goToIndex={goToIndex} navStyle={navStyle} onNavStyleChange={setNavStyle} switcherStyle={switcherStyle} onSwitcherStyleChange={setSwitcherStyle} luckyNonce={luckyNonce} addHintNonce={addHintNonce} onEnterCompare={() => setComparingUsed(true)} onShareViewLabelChange={setShareViewLabel} introDone={introDone} shareUrlRef={shareUrlRef} shareOgRef={shareOgRef} onShareView={() => copyUrl(shareUrlRef.current || (typeof window !== "undefined" ? window.location.origin : ""), "View link copied", shareOgRef.current)} buttonVariant={buttonVariant} onButtonVariantChange={setButtonVariant} allCaps={allCaps} onAllCapsChange={setAllCaps} showChatTuner={showChatTuner} onToggleChatTuner={() => setShowChatTuner((v) => !v)} epetriMode={epetriMode} onEpetriModeChange={setEpetriMode} isDev={isDev} surfaceColor={surfaceColor} onSurfaceColorChange={setSurfaceColor} surfaceHover={surfaceHover} onSurfaceHoverChange={setSurfaceHover} />}
        {layout === "Z" && indexView === "timeline" && <EllipticalCarousel allCaps={allCaps} isDev={isDev} />}
        {layout === "Z" && indexView === "grid" && <GridView humanoids={humanoids} />}
      </div>

      {/* Font toast */}
      {showFontToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg animate-blur-fade"
          style={{ background: "rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
        >
          <p className="text-[12px] tracking-wide" style={{ color: "#999" }}>
            <span style={{ color: "#737373", fontWeight: 500 }}>
              {fontMode === "fav" ? FAVORITE_FONTS[favIdx].name : FONTS[fontIdx].name}
            </span>
            <span className="ml-2 tabular-nums" style={{ color: "#c4c4c4" }}>
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

      <OptionsMenu
        variant={buttonVariant}
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        visible={introDone}
      />

      <Toaster
        position="bottom-center"
        offset={32}
        style={{ "--width": "600px" } as React.CSSProperties}
        toastOptions={{ unstyled: true, style: { display: "flex", justifyContent: "center", width: "100%" } }}
      />

      {chatOpen && <GuideChat onSelect={handleSelectHumanoid} config={chatConfig} />}

      {showWelcome && (
        <>
          <WelcomeModal style={welcomeStyle} onClose={dismissWelcome} />
          <WelcomeStyleSwitcher style={welcomeStyle} onChange={setWelcomeStyle} />
        </>
      )}

      {showShortcuts && <ShortcutsSheet onClose={() => setShowShortcuts(false)} />}
    </main>
  );
}
