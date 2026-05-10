"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { humanoids } from "@/data/humanoids";
import type { Humanoid } from "@/data/humanoids";
import { SURFACE } from "@/lib/design/tokens";

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

const CATEGORIES: { key: "all" | UseCase; label: string; icon: React.ReactNode; tint: string }[] = [
  { key: "all",        label: "All",        tint: "#F4F2EE", icon: <IconAll /> },
  { key: "home",       label: "Home",       tint: "#FBE9D8", icon: <IconHome /> },
  { key: "industrial", label: "Industrial", tint: "#E6E9F2", icon: <IconIndustrial /> },
  { key: "research",   label: "Research",   tint: "#E5F0E8", icon: <IconResearch /> },
  { key: "companion",  label: "Companion",  tint: "#F4E5EE", icon: <IconCompanion /> },
];

function IconAll() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="7" r="2.2" fill="#9b8c6a" />
      <circle cx="17" cy="7" r="2.2" fill="#9b8c6a" />
      <circle cx="7" cy="17" r="2.2" fill="#9b8c6a" />
      <circle cx="17" cy="17" r="2.2" fill="#9b8c6a" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 19v-8z" stroke="#c47d3a" strokeWidth="1.6" strokeLinejoin="round" fill="#fff5ea" />
      <rect x="10" y="13" width="4" height="6" rx="0.6" fill="#c47d3a" />
    </svg>
  );
}
function IconIndustrial() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 20V11l5 3V11l5 3V8l5 3v9H4z" fill="#eef0f8" stroke="#5b6794" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="10" y="16" width="2" height="4" fill="#5b6794" />
      <rect x="14" y="16" width="2" height="4" fill="#5b6794" />
    </svg>
  );
}
function IconResearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M10 4v6L5 19a1.5 1.5 0 001.3 2.2h11.4A1.5 1.5 0 0019 19l-5-9V4" stroke="#3f7a52" strokeWidth="1.6" strokeLinejoin="round" fill="#eef7f0" />
      <path d="M9 4h6" stroke="#3f7a52" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11" cy="16" r="1.2" fill="#3f7a52" />
      <circle cx="14.5" cy="14" r="0.9" fill="#3f7a52" />
    </svg>
  );
}
function IconCompanion() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" fill="#fbeaf3" stroke="#a3537a" strokeWidth="1.6" />
      <circle cx="9.5" cy="11" r="1.1" fill="#a3537a" />
      <circle cx="14.5" cy="11" r="1.1" fill="#a3537a" />
      <path d="M9 14.5c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5" stroke="#a3537a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
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
                background: c.tint,
                outline: isActive ? "2px solid var(--c-ink)" : "2px solid transparent",
                outlineOffset: 2,
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

// ── Page ──────────────────────────────────────────────────────
export default function MobileView() {
  const list = useMemo(() => humanoids.filter((h) => h.imageUrl), []);
  const [active, setActive] = useState<"all" | UseCase>("all");

  const counts = useMemo(() => {
    const c: Record<"all" | UseCase, number> = { all: list.length, home: 0, industrial: 0, research: 0, companion: 0 };
    list.forEach((h) => {
      const u = USE_CASE_BY_ID[h.id];
      if (u) c[u] += 1;
    });
    return c;
  }, [list]);

  const filtered = active === "all" ? list : list.filter((h) => USE_CASE_BY_ID[h.id] === active);

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

      <div className="flex flex-col gap-7 pt-2 pb-12">
        {active === "all" ? (
          <>
            <Row title="New in 2025" subtitle="The freshest humanoids." items={newest} />
            <Row title="In production" subtitle="Available to buy or deploy." items={inProduction} />
            <Row title="Legends" subtitle="The robots that got us here." items={legends} />
            {everythingElse.length > 0 && <Row title="Everything else" items={everythingElse} />}
          </>
        ) : (
          <Row title={activeLabel} subtitle={`${filtered.length} robots`} items={filtered} />
        )}
      </div>
    </main>
  );
}
