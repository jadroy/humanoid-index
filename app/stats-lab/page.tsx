"use client";

import { useMemo, useState } from "react";
import { humanoids, type Humanoid } from "@/data/humanoids";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseCost(s: string | undefined): number | undefined {
  if (!s || s === "N/A") return undefined;
  const cleaned = s.replace(/[$,\s]/g, "");
  const m = cleaned.match(/^([\d.]+)([KM]?)$/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (m[2].toUpperCase() === "K") return n * 1_000;
  if (m[2].toUpperCase() === "M") return n * 1_000_000;
  return n;
}

function fmtCost(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

type StatKey = "height" | "weight" | "dof" | "maxSpeed" | "cost" | "year";
type StatDef = {
  key: StatKey;
  label: string;
  unit: string;
  get: (h: Humanoid) => number | undefined;
  fmt: (n: number) => string;
  lowerIsBetter?: boolean;
};

const STATS: StatDef[] = [
  { key: "height", label: "Height", unit: "cm", get: (h) => h.height, fmt: (n) => `${n} cm` },
  { key: "weight", label: "Weight", unit: "kg", get: (h) => h.weight, fmt: (n) => `${n} kg` },
  { key: "dof", label: "DOF", unit: "joints", get: (h) => h.dof, fmt: (n) => `${n}` },
  { key: "maxSpeed", label: "Top speed", unit: "m/s", get: (h) => h.maxSpeed, fmt: (n) => `${n.toFixed(1)} m/s` },
  { key: "cost", label: "Price", unit: "USD", get: (h) => parseCost(h.cost), fmt: fmtCost, lowerIsBetter: true },
  { key: "year", label: "Released", unit: "", get: (h) => h.year, fmt: (n) => `${n}` },
];

// Palette (matches site)
const INK = "var(--c-ink)";        // #2e2e36
const INK_BODY = "var(--c-ink-body)";    // #747484
const INK_MUTED = "var(--c-ink-muted)";  // #a0a0ad
const INK_SUBTLE = "var(--c-ink-subtle)"; // #c4c4d0
const ACCENT = "#ff7a45";  // orange (focal)
const COMPARE = "#3a8fb7"; // muted teal-blue (second robot)

// ─────────────────────────────────────────────────────────────────────────────
// Card chrome
// ─────────────────────────────────────────────────────────────────────────────

function Card({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[20px] bg-white p-7"
      style={{
        boxShadow:
          "0 1px 0 rgba(0, 0, 0, 0.02) inset, 0 8px 28px rgba(20, 20, 20, 0.045), 0 2px 8px rgba(20, 20, 20, 0.025)",
      }}
    >
      <div
        className="mb-2 text-[12px] tracking-widest uppercase font-medium"
        style={{ color: INK_MUTED, letterSpacing: "0.02em" }}
      >
        {title}
      </div>
      <div
        className="mb-6 text-[13px] leading-relaxed"
        style={{ color: INK_BODY }}
      >
        {blurb}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Percentile strip
// ─────────────────────────────────────────────────────────────────────────────

function PercentileStrip({
  focal,
  fleet,
  stat,
}: {
  focal: Humanoid;
  fleet: Humanoid[];
  stat: StatDef;
}) {
  const fv = stat.get(focal);
  const values = fleet
    .map(stat.get)
    .filter((v): v is number => typeof v === "number");
  if (fv === undefined || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const norm = (v: number) => ((v - min) / span) * 100;
  const sorted = [...values].sort((a, b) => a - b);
  const rank =
    sorted.filter((v) => (stat.lowerIsBetter ? v < fv : v > fv)).length + 1;

  return (
    <div className="py-3">
      <div className="mb-2.5 flex items-baseline justify-between">
        <div
          className="text-[12px] tracking-widest uppercase font-medium"
          style={{ color: INK_MUTED, letterSpacing: "0.02em" }}
        >
          {stat.label}
        </div>
        <div className="flex items-baseline gap-3">
          <div
            className="text-[13px] font-medium tabular-nums"
            style={{ color: INK }}
          >
            {stat.fmt(fv)}
          </div>
          <div
            className="text-[10px] uppercase tabular-nums"
            style={{ color: INK_SUBTLE, letterSpacing: "0.04em" }}
          >
            #{rank} / {values.length}
          </div>
        </div>
      </div>
      <div className="relative h-[18px]">
        <div
          className="absolute inset-x-0 top-[8px] h-px"
          style={{ background: "rgba(0,0,0,0.08)" }}
        />
        {values.map((v, i) => (
          <div
            key={i}
            className="absolute top-[6px] h-[5px] w-[5px] -translate-x-1/2 rounded-full"
            style={{ left: `${norm(v)}%`, background: INK_SUBTLE }}
          />
        ))}
        <div
          className="absolute top-[3px] h-[11px] w-[11px] -translate-x-1/2 rotate-45 rounded-[2px]"
          style={{
            left: `${norm(fv)}%`,
            background: ACCENT,
            boxShadow: `0 0 0 4px ${ACCENT}1f`,
          }}
        />
      </div>
      <div
        className="mt-1.5 flex justify-between text-[10px] tabular-nums"
        style={{ color: INK_MUTED }}
      >
        <span>{stat.fmt(min)}</span>
        <span>{stat.fmt(max)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Rank chips
// ─────────────────────────────────────────────────────────────────────────────

function RankChips({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  const chips: { label: string; tone: "accent" | "neutral" }[] = [];
  for (const stat of STATS) {
    const fv = stat.get(focal);
    if (fv === undefined) continue;
    const values = fleet
      .map(stat.get)
      .filter((v): v is number => typeof v === "number");
    if (values.length < 3) continue;
    const sorted = [...values].sort((a, b) =>
      stat.lowerIsBetter ? a - b : b - a
    );
    const rank = sorted.indexOf(fv) + 1;
    const pct = rank / values.length;
    if (rank === 1) chips.push({ label: `#1 ${stat.label.toLowerCase()}`, tone: "accent" });
    else if (pct <= 0.2)
      chips.push({ label: `Top ${Math.ceil(pct * 100)}% ${stat.label.toLowerCase()}`, tone: "accent" });
    else chips.push({ label: `#${rank} ${stat.label.toLowerCase()}`, tone: "neutral" });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span
          key={i}
          className="rounded-full px-3 py-1 text-[11.5px] tabular-nums"
          style={
            c.tone === "accent"
              ? {
                  background: `${ACCENT}14`,
                  color: ACCENT,
                  boxShadow: `inset 0 0 0 1px ${ACCENT}33`,
                }
              : {
                  background: "#f6f6f4",
                  color: INK_BODY,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                }
          }
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sparkbar — placements in the stats column
// ─────────────────────────────────────────────────────────────────────────────

type SparkEntry = { h: Humanoid; v: number };

function sparkData(fleet: Humanoid[], stat: StatDef): SparkEntry[] {
  return fleet
    .map((h) => ({ h, v: stat.get(h) }))
    .filter((e): e is SparkEntry => typeof e.v === "number")
    .sort((a, b) => a.v - b.v);
}

function SparkInline({
  entries,
  focalId,
  width = 72,
  height = 14,
  gap = 1.5,
  baseColor = "#dcdcd6",
  focalColor = ACCENT,
}: {
  entries: SparkEntry[];
  focalId: string;
  width?: number;
  height?: number;
  gap?: number;
  baseColor?: string;
  focalColor?: string;
}) {
  if (!entries.length) return null;
  const max = entries[entries.length - 1].v;
  const min = entries[0].v;
  const span = max - min || 1;
  const focalIdx = entries.findIndex((e) => e.h.id === focalId);
  const barW = Math.max(1.5, (width - gap * (entries.length - 1)) / entries.length);
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {entries.map((e, i) => {
        // Normalize so the shortest bar is still ~25% tall (avoids 0-height for the min)
        const h = 0.25 * height + ((e.v - min) / span) * 0.75 * height;
        const x = i * (barW + gap);
        const y = height - h;
        return (
          <rect
            key={e.h.id}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={0.5}
            fill={i === focalIdx ? focalColor : baseColor}
          />
        );
      })}
    </svg>
  );
}

// Mini stats column that mirrors the real card's row layout.
function MockRow({
  label,
  value,
  trailing,
  belowValue,
}: {
  label: string;
  value: string;
  trailing?: React.ReactNode;
  belowValue?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "62px minmax(0, 1fr)",
        alignItems: "baseline",
        columnGap: 12,
        minHeight: 22,
      }}
    >
      <span
        className="text-[11.5px]"
        style={{ color: INK_BODY, opacity: 0.7, fontWeight: 500, justifySelf: "start" }}
      >
        {label}
      </span>
      <div className="flex w-full items-baseline justify-end gap-2">
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[11.5px] font-medium tabular-nums"
            style={{ color: "color-mix(in srgb, var(--c-ink) 68%, transparent)" }}
          >
            {value}
          </span>
          {belowValue}
        </div>
        {trailing}
      </div>
    </div>
  );
}

const COLUMN_STATS: StatDef[] = [STATS[0], STATS[1], STATS[2], STATS[3]];

function VariantFrame({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div
          className="text-[11px] uppercase font-medium"
          style={{ color: INK, letterSpacing: "0.04em" }}
        >
          {title}
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: INK_MUTED }}>
          {note}
        </div>
      </div>
      <div
        className="rounded-[10px] px-4 py-3.5"
        style={{
          background: "#fbfbf9",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// A — Sparkbar inline to the right of the value
function VariantInline({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  return (
    <VariantFrame
      title="A — Inline right"
      note="Sits after the value. Bar reads as a sibling of the number."
    >
      <div className="flex flex-col gap-2">
        {COLUMN_STATS.map((stat) => {
          const fv = stat.get(focal);
          if (fv === undefined) return null;
          const entries = sparkData(fleet, stat);
          return (
            <MockRow
              key={stat.key}
              label={stat.label}
              value={stat.fmt(fv)}
              trailing={
                <SparkInline entries={entries} focalId={focal.id} width={68} height={14} />
              }
            />
          );
        })}
      </div>
    </VariantFrame>
  );
}

// B — Sparkbar below the value, full value-column width
function VariantBelow({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  return (
    <VariantFrame
      title="B — Below value"
      note="Value reads first, distribution as a quieter second line."
    >
      <div className="flex flex-col gap-3.5">
        {COLUMN_STATS.map((stat) => {
          const fv = stat.get(focal);
          if (fv === undefined) return null;
          const entries = sparkData(fleet, stat);
          return (
            <MockRow
              key={stat.key}
              label={stat.label}
              value={stat.fmt(fv)}
              belowValue={
                <SparkInline entries={entries} focalId={focal.id} width={130} height={10} gap={1.2} />
              }
            />
          );
        })}
      </div>
    </VariantFrame>
  );
}

// C — Sparkbar replaces the hairline divider between rows
function VariantHairline({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  return (
    <VariantFrame
      title="C — As the divider"
      note="The row separator becomes a sparkbar — info hiding inside chrome."
    >
      <div>
        {COLUMN_STATS.map((stat, i) => {
          const fv = stat.get(focal);
          if (fv === undefined) return null;
          const entries = sparkData(fleet, stat);
          return (
            <div key={stat.key}>
              {i > 0 && (
                <div className="my-2 flex justify-end">
                  <SparkInline
                    entries={entries}
                    focalId={focal.id}
                    width={200}
                    height={3}
                    gap={1}
                    baseColor="rgba(0,0,0,0.08)"
                  />
                </div>
              )}
              <MockRow label={stat.label} value={stat.fmt(fv)} />
            </div>
          );
        })}
      </div>
    </VariantFrame>
  );
}

// D — Hero sparkbar at the top, plain rows below
function VariantHero({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  const hero = STATS[0]; // Height as the showcased stat
  const fv = hero.get(focal);
  const entries = sparkData(fleet, hero);
  const focalRankPct = fv === undefined ? 0 : entries.filter((e) => e.v <= fv).length / entries.length;
  return (
    <VariantFrame
      title="D — Hero, plain rows"
      note="One stat earns the spotlight; the rest stay clean."
    >
      <div className="flex flex-col gap-3">
        {fv !== undefined && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span
                className="text-[10px] uppercase font-medium"
                style={{ color: INK_MUTED, letterSpacing: "0.06em" }}
              >
                {hero.label} — top {Math.max(1, Math.round((1 - focalRankPct) * 100))}%
              </span>
              <span
                className="text-[12px] font-medium tabular-nums"
                style={{ color: INK }}
              >
                {hero.fmt(fv)}
              </span>
            </div>
            <SparkInline
              entries={entries}
              focalId={focal.id}
              width={228}
              height={22}
              gap={1.5}
            />
          </div>
        )}
        <div
          className="mt-1 flex flex-col gap-1.5 pt-3"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          {COLUMN_STATS.slice(1).map((stat) => {
            const v = stat.get(focal);
            if (v === undefined) return null;
            return <MockRow key={stat.key} label={stat.label} value={stat.fmt(v)} />;
          })}
        </div>
      </div>
    </VariantFrame>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Percentile rings
// ─────────────────────────────────────────────────────────────────────────────

function Ring({
  pct,
  size,
  stroke,
  color,
  label,
  value,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  label: string;
  value: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[18px] font-medium tabular-nums" style={{ color: INK }}>{value}</div>
          <div
            className="text-[10px] uppercase font-medium"
            style={{ color: INK_MUTED, letterSpacing: "0.04em" }}
          >
            {label}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] tabular-nums" style={{ color: INK_BODY }}>
        {Math.round(pct * 100)}th pct
      </div>
    </div>
  );
}

function RingTrio({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  const stats: { stat: StatDef; color: string }[] = [
    { stat: STATS[0], color: ACCENT },
    { stat: STATS[2], color: "#5b8def" },
    { stat: STATS[3], color: "#3aa57b" },
  ];
  return (
    <div className="flex justify-around">
      {stats.map(({ stat, color }) => {
        const fv = stat.get(focal);
        if (fv === undefined) return null;
        const values = fleet.map(stat.get).filter((v): v is number => typeof v === "number");
        const sorted = [...values].sort((a, b) => a - b);
        const pct = sorted.filter((v) => v <= fv).length / sorted.length;
        return (
          <Ring
            key={stat.key}
            pct={pct}
            size={108}
            stroke={9}
            color={color}
            label={stat.label}
            value={stat.fmt(fv)}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Silhouette overlay
// ─────────────────────────────────────────────────────────────────────────────

function Silhouette({ heightCm, color }: { heightCm: number; color: string }) {
  const h = heightCm;
  const headR = h * 0.07;
  const bodyW = h * 0.22;
  const bodyH = h * 0.4;
  const legW = h * 0.09;
  const legH = h * 0.4;
  const armW = h * 0.07;
  const armH = h * 0.35;
  const cx = bodyW * 1.7;
  const headY = headR;
  const bodyY = headR * 2 + 4;
  const legY = bodyY + bodyH + 2;
  const totalH = legY + legH;
  const totalW = cx * 2;
  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      style={{ overflow: "visible" }}
    >
      <g fill={color}>
        <circle cx={cx} cy={headY} r={headR} />
        <rect x={cx - bodyW / 2} y={bodyY} width={bodyW} height={bodyH} rx={bodyW * 0.18} />
        <rect x={cx - bodyW / 2 - armW - 2} y={bodyY + 4} width={armW} height={armH} rx={armW * 0.4} />
        <rect x={cx + bodyW / 2 + 2} y={bodyY + 4} width={armW} height={armH} rx={armW * 0.4} />
        <rect x={cx - legW - 2} y={legY} width={legW} height={legH} rx={legW * 0.3} />
        <rect x={cx + 2} y={legY} width={legW} height={legH} rx={legW * 0.3} />
      </g>
    </svg>
  );
}

function SilhouetteOverlay({ a, b }: { a: Humanoid; b: Humanoid }) {
  if (!a.height || !b.height) return null;
  const maxH = Math.max(a.height, b.height);
  return (
    <div className="flex items-end justify-around gap-8 pb-4">
      <div className="flex flex-col items-center gap-3">
        <div style={{ height: `${maxH}px` }} className="flex items-end">
          <Silhouette heightCm={a.height} color={`${ACCENT}cc`} />
        </div>
        <div className="text-center">
          <div className="text-[13px] font-medium" style={{ color: INK }}>{a.name}</div>
          <div className="text-[11px] tabular-nums" style={{ color: INK_MUTED }}>
            {a.height} cm · {a.weight ?? "—"} kg
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div style={{ height: `${maxH}px` }} className="flex items-end">
          <Silhouette heightCm={b.height} color={`${COMPARE}cc`} />
        </div>
        <div className="text-center">
          <div className="text-[13px] font-medium" style={{ color: INK }}>{b.name}</div>
          <div className="text-[11px] tabular-nums" style={{ color: INK_MUTED }}>
            {b.height} cm · {b.weight ?? "—"} kg
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Diverging bullets
// ─────────────────────────────────────────────────────────────────────────────

function DivergingBullets({ a, b }: { a: Humanoid; b: Humanoid }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[11px] uppercase font-medium"
        style={{ color: INK_MUTED, letterSpacing: "0.04em" }}
      >
        <div className="text-right normal-case" style={{ color: ACCENT, letterSpacing: "-0.01em" }}>{a.name}</div>
        <div className="w-28 text-center">stat</div>
        <div className="normal-case" style={{ color: COMPARE, letterSpacing: "-0.01em" }}>{b.name}</div>
      </div>
      {STATS.filter((s) => s.key !== "year").map((stat) => {
        const av = stat.get(a);
        const bv = stat.get(b);
        if (av === undefined || bv === undefined) return null;
        const max = Math.max(av, bv);
        const aPct = (av / max) * 100;
        const bPct = (bv / max) * 100;
        return (
          <div
            key={stat.key}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
          >
            <div className="flex items-center justify-end gap-3">
              <span className="text-[13px] font-medium tabular-nums" style={{ color: INK }}>
                {stat.fmt(av)}
              </span>
              <div
                className="relative h-[6px] w-full overflow-hidden rounded-full"
                style={{ background: "rgba(0,0,0,0.04)" }}
              >
                <div
                  className="absolute right-0 top-0 h-full rounded-full"
                  style={{ width: `${aPct}%`, background: ACCENT }}
                />
              </div>
            </div>
            <div
              className="w-28 text-center text-[12px] uppercase font-medium"
              style={{ color: INK_MUTED, letterSpacing: "0.02em" }}
            >
              {stat.label}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="relative h-[6px] w-full overflow-hidden rounded-full"
                style={{ background: "rgba(0,0,0,0.04)" }}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${bPct}%`, background: COMPARE }}
                />
              </div>
              <span className="text-[13px] font-medium tabular-nums" style={{ color: INK }}>
                {stat.fmt(bv)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Lollipop pair
// ─────────────────────────────────────────────────────────────────────────────

function LollipopPair({ a, b }: { a: Humanoid; b: Humanoid }) {
  return (
    <div className="flex flex-col gap-5">
      {STATS.filter((s) => s.key !== "year" && s.key !== "cost").map((stat) => {
        const av = stat.get(a);
        const bv = stat.get(b);
        if (av === undefined || bv === undefined) return null;
        const min = Math.min(av, bv) * 0.9;
        const max = Math.max(av, bv) * 1.1;
        const span = max - min || 1;
        const aPct = ((av - min) / span) * 100;
        const bPct = ((bv - min) / span) * 100;
        const lo = Math.min(aPct, bPct);
        const hi = Math.max(aPct, bPct);
        return (
          <div key={stat.key}>
            <div className="mb-2 flex items-baseline justify-between">
              <div
                className="text-[12px] uppercase font-medium"
                style={{ color: INK_MUTED, letterSpacing: "0.02em" }}
              >
                {stat.label}
              </div>
              <div className="text-[11px] tabular-nums" style={{ color: INK_MUTED }}>
                Δ {stat.fmt(Math.abs(av - bv))}
              </div>
            </div>
            <div className="relative h-4">
              <div
                className="absolute inset-x-0 top-[7px] h-px"
                style={{ background: "rgba(0,0,0,0.08)" }}
              />
              <div
                className="absolute top-[6px] h-[3px]"
                style={{
                  left: `${lo}%`,
                  width: `${hi - lo}%`,
                  background: "rgba(0,0,0,0.12)",
                }}
              />
              <div
                className="absolute top-[3px] h-[10px] w-[10px] -translate-x-1/2 rounded-full"
                style={{
                  left: `${aPct}%`,
                  background: ACCENT,
                  boxShadow: `0 0 0 3px ${ACCENT}26`,
                }}
                title={`${a.name}: ${stat.fmt(av)}`}
              />
              <div
                className="absolute top-[3px] h-[10px] w-[10px] -translate-x-1/2 rounded-full"
                style={{
                  left: `${bPct}%`,
                  background: COMPARE,
                  boxShadow: `0 0 0 3px ${COMPARE}26`,
                }}
                title={`${b.name}: ${stat.fmt(bv)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Big numeric deltas
// ─────────────────────────────────────────────────────────────────────────────

function BigDeltas({ a, b }: { a: Humanoid; b: Humanoid }) {
  const rows = STATS.filter((s) => s.key !== "year")
    .map((stat) => {
      const av = stat.get(a);
      const bv = stat.get(b);
      if (av === undefined || bv === undefined) return null;
      const d = av - bv;
      return { label: stat.label, delta: d, fmt: stat.fmt };
    })
    .filter((r): r is { label: string; delta: number; fmt: (n: number) => string } => r !== null)
    .slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
      {rows.map((r) => (
        <div key={r.label}>
          <div
            className="text-[12px] uppercase font-medium"
            style={{ color: INK_MUTED, letterSpacing: "0.02em" }}
          >
            {r.label}
          </div>
          <div
            className="mt-1.5 text-[30px] font-medium tabular-nums leading-none"
            style={{
              color: r.delta === 0 ? INK_BODY : r.delta > 0 ? ACCENT : COMPARE,
              letterSpacing: "-0.04em",
            }}
          >
            {r.delta > 0 ? "+" : r.delta < 0 ? "−" : ""}
            {r.fmt(Math.abs(r.delta))}
          </div>
          <div className="mt-2 text-[11px]" style={{ color: INK_MUTED }}>
            {a.name} vs {b.name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Scatter — price × height
// ─────────────────────────────────────────────────────────────────────────────

function Scatter({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  const points = fleet
    .map((h) => ({ h, x: h.height, y: parseCost(h.cost) }))
    .filter((p): p is { h: Humanoid; x: number; y: number } => typeof p.x === "number" && typeof p.y === "number");
  if (points.length < 2) return null;
  const W = 520;
  const H = 260;
  const PAD = 40;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xN = (x: number) => PAD + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * PAD);
  const yN = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * PAD);
  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(0,0,0,0.1)" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(0,0,0,0.1)" />
        {points.map((p) => {
          const isFocal = p.h.id === focal.id;
          return (
            <g key={p.h.id}>
              <circle
                cx={xN(p.x)}
                cy={yN(p.y)}
                r={isFocal ? 7 : 4}
                fill={isFocal ? ACCENT : "rgba(0,0,0,0.18)"}
                stroke={isFocal ? `${ACCENT}33` : "none"}
                strokeWidth={isFocal ? 6 : 0}
              />
              {isFocal && (
                <text
                  x={xN(p.x)}
                  y={yN(p.y) - 14}
                  textAnchor="middle"
                  fill="#2e2e36"
                  fontSize="11"
                  fontWeight={500}
                >
                  {p.h.name}
                </text>
              )}
            </g>
          );
        })}
        <text x={W / 2} y={H - 10} textAnchor="middle" fill="#a0a0ad" fontSize="10">
          Height (cm) →
        </text>
        <text
          x={-H / 2}
          y={14}
          transform="rotate(-90)"
          textAnchor="middle"
          fill="#a0a0ad"
          fontSize="10"
        >
          ↑ Price (USD)
        </text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Fleet timeline
// ─────────────────────────────────────────────────────────────────────────────

function FleetTimeline({ focal, fleet }: { focal: Humanoid; fleet: Humanoid[] }) {
  const entries = fleet
    .map((h) => ({ h, y: h.year }))
    .filter((e): e is { h: Humanoid; y: number } => typeof e.y === "number");
  const yMin = Math.min(...entries.map((e) => e.y));
  const yMax = Math.max(...entries.map((e) => e.y));
  return (
    <div>
      <div className="relative h-24">
        <div
          className="absolute inset-x-0 bottom-6 h-px"
          style={{ background: "rgba(0,0,0,0.1)" }}
        />
        {entries.map((e, i) => {
          const x = ((e.y - yMin) / (yMax - yMin || 1)) * 100;
          const isFocal = e.h.id === focal.id;
          return (
            <div
              key={i}
              className="absolute h-[7px] w-[7px] -translate-x-1/2 rounded-full"
              style={{
                left: `${x}%`,
                bottom: `${24 - 3}px`,
                background: isFocal ? ACCENT : "rgba(0,0,0,0.22)",
                boxShadow: isFocal ? `0 0 0 5px ${ACCENT}1f` : undefined,
              }}
              title={`${e.h.name} (${e.y})`}
            />
          );
        })}
      </div>
      <div
        className="relative -mt-4 flex justify-between text-[10px] tabular-nums"
        style={{ color: INK_MUTED }}
      >
        {[yMin, Math.round((yMin + yMax) / 2), yMax].map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Lineage spark
// ─────────────────────────────────────────────────────────────────────────────

function LineageSpark({ fleet }: { fleet: Humanoid[] }) {
  const groups = new Map<string, Humanoid[]>();
  for (const h of fleet) {
    if (!h.year || !h.height) continue;
    const arr = groups.get(h.manufacturer) ?? [];
    arr.push(h);
    groups.set(h.manufacturer, arr);
  }
  const [maker, items] =
    [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (!maker || !items || items.length < 2) {
    return (
      <div className="text-[12px]" style={{ color: INK_BODY }}>
        No multi-entry lineage with year+height.
      </div>
    );
  }
  const sorted = [...items].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const W = 480;
  const H = 130;
  const PAD = 28;
  const xs = sorted.map((h) => h.year!);
  const ys = sorted.map((h) => h.height!);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xN = (x: number) => PAD + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * PAD);
  const yN = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * PAD);
  const path = sorted
    .map((h, i) => `${i === 0 ? "M" : "L"} ${xN(h.year!)} ${yN(h.height!)}`)
    .join(" ");
  return (
    <div>
      <div className="mb-3 text-[12px]" style={{ color: INK_BODY }}>
        <span style={{ color: INK }}>{maker}</span> — height across {sorted.length} entries
      </div>
      <svg width={W} height={H}>
        <path d={path} fill="none" stroke={ACCENT} strokeOpacity={0.7} strokeWidth={2} strokeLinejoin="round" />
        {sorted.map((h) => (
          <g key={h.id}>
            <circle cx={xN(h.year!)} cy={yN(h.height!)} r={4} fill={ACCENT} />
            <text
              x={xN(h.year!)}
              y={yN(h.height!) - 10}
              textAnchor="middle"
              fill="#2e2e36"
              fontSize="10"
            >
              {h.name}
            </text>
            <text
              x={xN(h.year!)}
              y={H - 6}
              textAnchor="middle"
              fill="#a0a0ad"
              fontSize="10"
            >
              {h.year}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StatsLabPage() {
  const fleet = useMemo(() => humanoids, []);
  const focalOptions = useMemo(
    () =>
      fleet
        .filter((h) => h.height && h.weight && h.dof)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [fleet]
  );

  const [focalId, setFocalId] = useState<string>(
    fleet.find((h) => h.name === "K2")?.id ?? focalOptions[0]?.id ?? ""
  );
  const [compareId, setCompareId] = useState<string>(
    fleet.find((h) => h.name === "Optimus Gen 2")?.id ?? focalOptions[1]?.id ?? ""
  );

  const focal = fleet.find((h) => h.id === focalId) ?? focalOptions[0];
  const compare = fleet.find((h) => h.id === compareId) ?? focalOptions[1];

  return (
    <main
      className="h-screen overflow-y-auto"
      style={{ background: "#fafaf8", color: INK }}
    >
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header className="mb-10">
          <div
            className="text-[12px] tracking-widest uppercase font-medium"
            style={{ color: INK_MUTED, letterSpacing: "0.02em" }}
          >
            Stats Lab
          </div>
          <h1
            className="mt-3 text-[32px] font-medium leading-none"
            style={{ color: INK, letterSpacing: "-0.04em" }}
          >
            Ways to display & compare stats
          </h1>
          <p
            className="mt-4 max-w-xl text-[14px] leading-relaxed"
            style={{ color: INK_BODY }}
          >
            Each card is one visualization, rendered with real fleet data. Pick a focal
            robot (used for the population-rank views) and a compare partner (used for
            the two-robot views).
          </p>
        </header>

        <div className="mb-10 grid grid-cols-2 gap-3">
          <PickerSelect
            label="Focal"
            value={focalId}
            onChange={setFocalId}
            options={focalOptions}
            dot={ACCENT}
          />
          <PickerSelect
            label="Compare with"
            value={compareId}
            onChange={setCompareId}
            options={focalOptions}
            dot={COMPARE}
          />
        </div>

        <div className="flex flex-col gap-5">
          <Card
            title="01 · Percentile strip"
            blurb="Every stat row gets a hairline showing the fleet min→max with the focal robot as a diamond. Reads as a number first, infographic second."
          >
            <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              {STATS.filter((s) => s.key !== "year").map((stat) => (
                <PercentileStrip key={stat.key} focal={focal} fleet={fleet} stat={stat} />
              ))}
            </div>
          </Card>

          <Card
            title="02 · Rank chips"
            blurb="Inline pills that surface where this robot sits in the fleet. Cheap to compute, plays well with the existing chip vocabulary."
          >
            <RankChips focal={focal} fleet={fleet} />
          </Card>

          <Card
            title="03 · Sparkbar — placements in the stats column"
            blurb="Four ways to land the sparkbar inside the existing stat-row layout. Each mock is a faithful mini stats column so you can feel the density tradeoff."
          >
            <div className="grid grid-cols-2 gap-5">
              <VariantInline focal={focal} fleet={fleet} />
              <VariantBelow focal={focal} fleet={fleet} />
              <VariantHairline focal={focal} fleet={fleet} />
              <VariantHero focal={focal} fleet={fleet} />
            </div>
          </Card>

          <Card
            title="04 · Percentile rings"
            blurb="Activity-ring style — fills proportional to where the focal robot ranks in the fleet for that stat."
          >
            <RingTrio focal={focal} fleet={fleet} />
          </Card>

          <Card
            title="05 · Silhouette overlay"
            blurb="True-to-scale silhouettes side by side. Literal and visual at once — the size delta is the message."
          >
            <SilhouetteOverlay a={focal} b={compare} />
          </Card>

          <Card
            title="06 · Diverging bullets"
            blurb="One row per stat. Bars push outward from a central axis. Fast scan of who-wins-what."
          >
            <DivergingBullets a={focal} b={compare} />
          </Card>

          <Card
            title="07 · Lollipop pair"
            blurb="Two dots on a shared axis per stat, line between them. Clean, no axis labels needed."
          >
            <LollipopPair a={focal} b={compare} />
          </Card>

          <Card
            title="08 · Big numeric deltas"
            blurb="Headline-size deltas. Direct, punchy. Works as the top of a compare view, with the smaller charts below."
          >
            <BigDeltas a={focal} b={compare} />
          </Card>

          <Card
            title="09 · Scatter — price × height"
            blurb="Two dimensions at once. Every robot is a dot, focal robot is labeled. Surfaces tradeoffs the stat rows can't."
          >
            <Scatter focal={focal} fleet={fleet} />
          </Card>

          <Card
            title="10 · Fleet timeline"
            blurb="Every robot as a dot on a year axis. Doubles as a navigation surface — tap a dot to jump."
          >
            <FleetTimeline focal={focal} fleet={fleet} />
          </Card>

          <Card
            title="11 · Lineage spark"
            blurb="For a single manufacturer, a tiny line across their releases. Shows how a maker's robots evolved."
          >
            <LineageSpark fleet={fleet} />
          </Card>
        </div>

        <footer className="mt-12 mb-6 text-[11px]" style={{ color: INK_MUTED }}>
          Tell me which ones to ship into the stats column / compare view.
        </footer>
      </div>
    </main>
  );
}

function PickerSelect({
  label,
  value,
  onChange,
  options,
  dot,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Humanoid[];
  dot: string;
}) {
  return (
    <label
      className="flex flex-col gap-1.5 rounded-[14px] bg-white p-3"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(0,0,0,0.04)" }}
    >
      <span
        className="flex items-center gap-2 text-[11px] uppercase font-medium"
        style={{ color: INK_MUTED, letterSpacing: "0.04em" }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[13px] font-medium focus:outline-none"
        style={{ color: INK }}
      >
        {options.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} — {h.manufacturer}
          </option>
        ))}
      </select>
    </label>
  );
}
