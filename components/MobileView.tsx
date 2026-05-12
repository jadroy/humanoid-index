"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { humanoids } from "@/data/humanoids";
import type { Humanoid } from "@/data/humanoids";
import { SURFACE, SURFACE_HOVER } from "@/lib/design/tokens";

const PAGE_X = 20;

const CARD_RADIUS = 22;
const LABEL_LOGO_SIZE = 20;
const CARD_W = 200;
const CARD_GAP = 12;

// ── Use-case taxonomy ─────────────────────────────────────────
type UseCase = "home" | "industrial" | "research" | "companion";

// Hard-coded mapping by robot id. Keep in sync with `data/humanoids.ts`.
const USE_CASE_BY_ID: Record<string, UseCase> = {
  "1": "industrial", // Optimus Gen 2 (Tesla)
  "2": "industrial", // Electric Atlas
  "3": "home",       // Memo (Sunday)
  "4": "home",       // Neo (1X)
  "5": "research",   // ASIMO
  "7": "industrial", // Figure 02
  "8": "industrial", // Apollo (Apptronik)
  "9": "research",   // Atlas (original)
  "10": "industrial",// Digit (Agility)
  "11": "research",  // G1 (Unitree)
  "12": "research",  // H1 (Unitree)
  "13": "companion", // Ameca (Engineered Arts)
  "14": "industrial",// Oli (LimX) — service/research, leaning industrial
  "15": "research",  // (whatever 15 maps to — fallback handled below)
  "16": "industrial",// K2 (Kepler) — manufacturing
};

const TILE_BG = SURFACE; // unified neutral surface across all category tiles

const CATEGORIES: { key: "all" | UseCase; label: string; icon: React.ReactNode; tint: string }[] = [
  { key: "all",        label: "All",        tint: TILE_BG, icon: <IconAll /> },
  { key: "home",       label: "Home",       tint: TILE_BG, icon: <IconHome /> },
  { key: "industrial", label: "Industrial", tint: TILE_BG, icon: <IconIndustrial /> },
  { key: "research",   label: "Research",   tint: TILE_BG, icon: <IconResearch /> },
  { key: "companion",  label: "Companion",  tint: TILE_BG, icon: <IconCompanion /> },
];

function IconAll() {
  return (
    <Image
      src="/categories/all.png"
      alt=""
      width={52}
      height={52}
      style={{ objectFit: "contain" }}
    />
  );
}
function IconHome() {
  return (
    <Image
      src="/categories/home.png"
      alt=""
      width={52}
      height={52}
      style={{ objectFit: "contain" }}
    />
  );
}
function IconIndustrial() {
  return (
    <Image
      src="/categories/industrial.png"
      alt=""
      width={52}
      height={52}
      style={{ objectFit: "contain" }}
    />
  );
}
function IconResearch() {
  return (
    <Image
      src="/categories/research.png"
      alt=""
      width={52}
      height={52}
      style={{ objectFit: "contain" }}
    />
  );
}
function IconCompanion() {
  return (
    <Image
      src="/categories/companion.png"
      alt=""
      width={52}
      height={52}
      style={{ objectFit: "contain" }}
    />
  );
}

// ── Card ─────────────────────────────────────────────────────
function Card({ h }: { h: Humanoid }) {
  return (
    <article className="flex flex-col gap-2 shrink-0" style={{ width: CARD_W, scrollSnapAlign: "start" }}>
      <div
        className="relative w-full overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: "1 / 1",
          borderRadius: CARD_RADIUS,
          background: SURFACE,
        }}
      >
        {h.imageUrl && (
          <Image
            src={h.imageUrl}
            alt={h.name}
            fill
            sizes={`${CARD_W}px`}
            className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
            style={{
              objectPosition: h.imagePosition ?? "center",
              padding: h.imageFit === "cover" ? 0 : "10%",
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2 px-0.5">
        <div
          className="flex-shrink-0 relative overflow-hidden flex items-center justify-center"
          style={{
            width: LABEL_LOGO_SIZE,
            height: LABEL_LOGO_SIZE,
            borderRadius: CARD_RADIUS * 0.55,
            background: h.logoUrl ? "transparent" : "#EFEFEF",
          }}
        >
          {h.logoUrl ? (
            <Image src={h.logoUrl} alt={h.manufacturer} fill className="object-cover" sizes={`${LABEL_LOGO_SIZE}px`} />
          ) : (
            <svg width={10} height={10} viewBox="0 0 20 20" fill="none" style={{ opacity: 0.18 }}>
              <circle cx="10" cy="5" r="3" fill="var(--c-ink)" />
              <rect x="7" y="9.5" width="6" height="8" rx="3" fill="var(--c-ink)" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.7px] font-medium truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2 }}>
            {h.name}
            {h.year ? <span style={{ marginLeft: 6, opacity: 0.42, fontWeight: 400 }}>{h.year}</span> : null}
          </p>
          <p className="text-[12px] font-medium mt-0.5 truncate" style={{ color: "var(--c-ink)", lineHeight: 1.2, opacity: 0.42 }}>
            {h.manufacturer}
          </p>
        </div>
      </div>
    </article>
  );
}

function Row({ title, subtitle, items }: { title: string; subtitle?: string; items: Humanoid[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3" style={{ paddingLeft: PAGE_X, paddingRight: PAGE_X }}>
        <div className="min-w-0 flex items-baseline gap-2">
          <h2 className="text-[13px] font-medium truncate" style={{ color: "var(--c-ink)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {title}
          </h2>
          {subtitle && (
            <span className="text-[12px] truncate" style={{ color: "var(--c-ink)", opacity: 0.42, lineHeight: 1.2 }}>
              {subtitle}
            </span>
          )}
        </div>
        <span className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--c-ink-muted)" }}>
          {items.length}
        </span>
      </div>
      <div
        className="flex overflow-x-auto pb-1 scrollbar-hide"
        style={{
          gap: CARD_GAP,
          paddingLeft: PAGE_X,
          paddingRight: PAGE_X,
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: PAGE_X,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((h) => (
          <Card key={h.id} h={h} />
        ))}
      </div>
    </section>
  );
}

// ── Category icon row ─────────────────────────────────────────
function CategoryRow({
  active,
  onChange,
  counts,
}: {
  active: "all" | UseCase;
  onChange: (k: "all" | UseCase) => void;
  counts: Record<"all" | UseCase, number>;
}) {
  return (
    <div
      className="flex overflow-x-auto pb-1 scrollbar-hide"
      style={{
        gap: 12,
        paddingLeft: PAGE_X,
        paddingRight: PAGE_X,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CATEGORIES.map((c) => {
        const isActive = active === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className="flex flex-col items-center shrink-0"
            style={{ width: 64 }}
          >
            <div
              className="flex items-center justify-center transition-all"
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: isActive ? SURFACE_HOVER : c.tint,
                boxSizing: "border-box",
              }}
            >
              {c.icon}
            </div>
            <span
              className="text-[11px] font-medium mt-1.5 truncate w-full text-center"
              style={{
                color: "var(--c-ink)",
                opacity: isActive ? 1 : 0.7,
                letterSpacing: "-0.01em",
              }}
            >
              {c.label}
            </span>
            <span className="text-[10px] tabular-nums" style={{ color: "var(--c-ink-muted)" }}>
              {counts[c.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Quick filter pills ────────────────────────────────────────
type PillKey = "buy" | "cheap" | "new" | "legends";

const PILLS: { key: PillKey; label: string; icon: React.ReactNode; match: (h: Humanoid) => boolean }[] = [
  {
    key: "buy",
    label: "For sale",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 5h10l-1 7.5a1 1 0 01-1 .9H5a1 1 0 01-1-.9L3 5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M6 5V3.8a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    match: (h) => Boolean(h.purchaseUrl) || (Boolean(h.cost) && h.cost !== "N/A"),
  },
  {
    key: "cheap",
    label: "Under $25K",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9.6 6.4a1.7 1.7 0 00-1.6-.9c-1 0-1.6.5-1.6 1.2 0 1.7 3.4.6 3.4 2.2 0 .8-.7 1.3-1.7 1.3-1 0-1.7-.5-1.9-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    match: (h) => {
      if (!h.cost || h.cost === "N/A") return false;
      const m = h.cost.match(/\$?([\d.]+)\s*([Kk]|[Mm])?/);
      if (!m) return false;
      const n = parseFloat(m[1]);
      const unit = m[2]?.toLowerCase();
      const inK = unit === "m" ? n * 1000 : unit === "k" ? n : n / 1000;
      return inK > 0 && inK < 25;
    },
  },
  {
    key: "new",
    label: "New",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 2l1.4 3.4L13 6.6l-2.6 2.4.8 3.5L8 10.9 4.8 12.5l.8-3.5L3 6.6l3.6-1.2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
      </svg>
    ),
    match: (h) => h.year === 2025,
  },
  {
    key: "legends",
    label: "Legends",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 5h10v1.5a3 3 0 01-3 3H6a3 3 0 01-3-3V5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M3 5l-1 1.5a1.5 1.5 0 001.5 1.5M13 5l1 1.5a1.5 1.5 0 01-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6.5 9.5v2M9.5 9.5v2M5 12.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    match: (h) => (h.year ?? 9999) < 2020,
  },
];

function PillRow({ active, onChange }: { active: PillKey | null; onChange: (k: PillKey | null) => void }) {
  return (
    <div
      className="flex overflow-x-auto pb-1 scrollbar-hide"
      style={{
        gap: 8,
        paddingLeft: PAGE_X,
        paddingRight: PAGE_X,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {PILLS.map((p) => {
        const isActive = active === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(isActive ? null : p.key)}
            className="inline-flex items-center gap-1.5 shrink-0 transition-all"
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              background: isActive ? "var(--c-ink)" : "#fff",
              color: isActive ? "#fff" : "var(--c-ink)",
              border: `1px solid ${isActive ? "var(--c-ink)" : "rgba(0,0,0,0.12)"}`,
            }}
          >
            <span aria-hidden style={{ display: "inline-flex", color: isActive ? "#fff" : "var(--c-ink)" }}>
              {p.icon}
            </span>
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function MobileView() {
  const list = useMemo(() => humanoids.filter((h) => h.imageUrl), []);
  const [active, setActive] = useState<"all" | UseCase>("all");
  const [pill, setPill] = useState<PillKey | null>(null);

  const counts = useMemo(() => {
    const c: Record<"all" | UseCase, number> = { all: list.length, home: 0, industrial: 0, research: 0, companion: 0 };
    list.forEach((h) => {
      const u = USE_CASE_BY_ID[h.id];
      if (u) c[u] += 1;
    });
    return c;
  }, [list]);

  const pillDef = pill ? PILLS.find((p) => p.key === pill) : null;
  const filtered = list
    .filter((h) => active === "all" || USE_CASE_BY_ID[h.id] === active)
    .filter((h) => (pillDef ? pillDef.match(h) : true));

  // For "all", show the curated multi-rail layout. For a category, show a single rail.
  const newest = filtered.filter((h) => h.year === 2025);
  const inProduction = filtered.filter((h) => h.status === "In Production");
  const legends = filtered
    .filter((h) => (h.year ?? 9999) < 2020)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const featuredIds = new Set([...newest, ...inProduction, ...legends].map((h) => h.id));
  const everythingElse = filtered.filter((h) => !featuredIds.has(h.id));

  const activeLabel = CATEGORIES.find((c) => c.key === active)?.label ?? "All";

  return (
    <main
      className="w-full min-h-[100dvh]"
      style={{
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        background: "#fff",
        color: "var(--c-ink)",
      }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between"
        style={{
          paddingLeft: PAGE_X,
          paddingRight: PAGE_X,
          height: 48,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <span
          role="img"
          aria-label="Humanoid Index"
          style={{
            height: 11,
            width: 117,
            display: "block",
            background: "rgba(95, 96, 89, 0.9)",
            WebkitMaskImage: "url(/HI-logo.svg)",
            maskImage: "url(/HI-logo.svg)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskPosition: "left center",
            maskPosition: "left center",
          }}
        />
        <span className="text-[11px] tabular-nums" style={{ color: "var(--c-ink-muted)" }}>
          {list.length}
        </span>
      </header>

      <div className="pt-3 pb-2">
        <CategoryRow active={active} onChange={setActive} counts={counts} />
      </div>

      <div className="pb-2">
        <PillRow active={pill} onChange={setPill} />
      </div>

      <div className="flex flex-col gap-7 pt-2 pb-6">
        {active === "all" && pill === null ? (
          <>
            <Row title="New in 2025" subtitle="The freshest humanoids." items={newest} />
            <Row title="In production" subtitle="Available to buy or deploy." items={inProduction} />
            <Row title="Legends" subtitle="The robots that got us here." items={legends} />
            {everythingElse.length > 0 && <Row title="Everything else" items={everythingElse} />}
          </>
        ) : (
          <Row
            title={pillDef?.label ?? activeLabel}
            subtitle={`${filtered.length} robots`}
            items={filtered}
          />
        )}
      </div>

      {/* Browse all — 2-column grid (DoorDash Browse style) */}
      <BrowseGrid items={list} />
    </main>
  );
}

function BrowseGrid({ items }: { items: Humanoid[] }) {
  return (
    <section className="flex flex-col gap-3 pt-4 pb-12">
      <div style={{ paddingLeft: PAGE_X, paddingRight: PAGE_X }}>
        <h2
          className="text-[20px] font-semibold tracking-tight"
          style={{ color: "var(--c-ink)", letterSpacing: "-0.02em" }}
        >
          Browse all
        </h2>
      </div>
      <div
        className="grid gap-2.5"
        style={{
          paddingLeft: PAGE_X,
          paddingRight: PAGE_X,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        {items.map((h) => (
          <BrowseTile key={h.id} h={h} />
        ))}
      </div>
    </section>
  );
}

function BrowseTile({ h }: { h: Humanoid }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        aspectRatio: "1.32 / 1",
        borderRadius: 16,
        background: SURFACE,
      }}
    >
      <div className="absolute top-0 left-0 right-0 z-10" style={{ padding: "12px 14px" }}>
        <p
          className="text-[15px] font-semibold truncate"
          style={{ color: "var(--c-ink)", letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          {h.name}
        </p>
        <p
          className="text-[11px] font-medium truncate mt-0.5"
          style={{ color: "var(--c-ink)", opacity: 0.42, lineHeight: 1.15 }}
        >
          {h.manufacturer}
        </p>
      </div>
      {h.imageUrl && (
        <Image
          src={h.imageUrl}
          alt={h.name}
          fill
          sizes="50vw"
          className={h.imageFit === "cover" ? "object-cover" : "object-contain"}
          style={{
            objectPosition: "bottom right",
            // Push the image into the bottom-right with a slight bleed off the edges
            padding: h.imageFit === "cover" ? 0 : "32% 0 0 30%",
          }}
        />
      )}
    </div>
  );
}
