import { ImageResponse } from "next/og";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const isSvg = (p: string) => p.toLowerCase().endsWith(".svg");

async function loadImageAsDataUri(publicPath: string): Promise<string | null> {
  try {
    const abs = join(process.cwd(), "public", publicPath);
    const buf = await readFile(abs);
    const ext = publicPath.split(".").pop() || "png";
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadBotImage(bot: Humanoid) {
  return bot.imageUrl && !isSvg(bot.imageUrl) ? loadImageAsDataUri(bot.imageUrl) : null;
}

async function loadBotLogo(bot: Humanoid) {
  return bot.logoUrl && !isSvg(bot.logoUrl) ? loadImageAsDataUri(bot.logoUrl) : null;
}

function getStats(bot: Humanoid) {
  return [
    bot.height && { label: "Height", value: `${bot.height} cm` },
    bot.weight && { label: "Weight", value: `${bot.weight} kg` },
    bot.dof && { label: "DOF", value: `${bot.dof}` },
    bot.maxSpeed && { label: "Speed", value: `${bot.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  "In Production": { bg: "#e8f5e9", fg: "#2e7d32" },
  Prototype: { bg: "#f3f4f6", fg: "#6b7280" },
  Concept: { bg: "#fef3c7", fg: "#92400e" },
  Discontinued: { bg: "#f3f4f6", fg: "#9ca3af" },
  Anticipated: { bg: "#f3e8ff", fg: "#6d28d9" },
};

// ── Knobs (dev-only overrides) ───────────────────────────────

import {
  SINGLE_DEFAULTS,
  COMPARE_DEFAULTS,
  type SingleKnobs,
  type CompareKnobs,
} from "./knobs";

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v == null) return fallback;
  return v === "1" || v === "true";
}
function parseNum(v: string | null, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function readSingleKnobs(sp: URLSearchParams): SingleKnobs {
  if (process.env.NODE_ENV !== "development") return SINGLE_DEFAULTS;
  return {
    showStats: parseBool(sp.get("showStats"), SINGLE_DEFAULTS.showStats),
    showBadge: parseBool(sp.get("showBadge"), SINGLE_DEFAULTS.showBadge),
    showLogo: parseBool(sp.get("showLogo"), SINGLE_DEFAULTS.showLogo),
    imagePanelBg: sp.get("imagePanelBg") ?? SINGLE_DEFAULTS.imagePanelBg,
    imagePanelW: parseNum(sp.get("imagePanelW"), SINGLE_DEFAULTS.imagePanelW),
    imageW: parseNum(sp.get("imageW"), SINGLE_DEFAULTS.imageW),
    imageH: parseNum(sp.get("imageH"), SINGLE_DEFAULTS.imageH),
    nameSize: parseNum(sp.get("nameSize"), SINGLE_DEFAULTS.nameSize),
    manufacturerSize: parseNum(sp.get("manufacturerSize"), SINGLE_DEFAULTS.manufacturerSize),
    statLabelSize: parseNum(sp.get("statLabelSize"), SINGLE_DEFAULTS.statLabelSize),
    statValueSize: parseNum(sp.get("statValueSize"), SINGLE_DEFAULTS.statValueSize),
  };
}

function readCompareKnobs(sp: URLSearchParams): CompareKnobs {
  if (process.env.NODE_ENV !== "development") return COMPARE_DEFAULTS;
  return {
    showStats: parseBool(sp.get("showStats"), COMPARE_DEFAULTS.showStats),
    imageW: parseNum(sp.get("imageW"), COMPARE_DEFAULTS.imageW),
    imageH: parseNum(sp.get("imageH"), COMPARE_DEFAULTS.imageH),
    nameSize: parseNum(sp.get("nameSize"), COMPARE_DEFAULTS.nameSize),
    manufacturerSize: parseNum(sp.get("manufacturerSize"), COMPARE_DEFAULTS.manufacturerSize),
    statLabelSize: parseNum(sp.get("statLabelSize"), COMPARE_DEFAULTS.statLabelSize),
    statValueSize: parseNum(sp.get("statValueSize"), COMPARE_DEFAULTS.statValueSize),
    showVsBubble: parseBool(sp.get("showVsBubble"), COMPARE_DEFAULTS.showVsBubble),
    showDivider: parseBool(sp.get("showDivider"), COMPARE_DEFAULTS.showDivider),
  };
}

// ── Single bot card ──────────────────────────────────────────

function SingleCard({
  bot,
  imgSrc,
  logoSrc,
  k,
}: {
  bot: Humanoid;
  imgSrc: string | null;
  logoSrc: string | null;
  k: SingleKnobs;
}) {
  const stats = getStats(bot);
  const badge = bot.status ? STATUS_COLORS[bot.status] ?? { bg: "#f3f4f6", fg: "#6b7280" } : null;

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        background: "#ffffff",
        color: "#111",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          width: k.imagePanelW,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          background: k.imagePanelBg,
        }}
      >
        {imgSrc ? (
          <img src={imgSrc} width={k.imageW} height={k.imageH} style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 90,
              background: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              color: "#ccc",
            }}
          >
            ?
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 48px 60px 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          {k.showLogo && logoSrc && <img src={logoSrc} width={28} height={28} style={{ borderRadius: 4 }} />}
          <span style={{ fontSize: k.manufacturerSize, color: "#888", letterSpacing: 0.5 }}>
            {bot.manufacturer}{bot.year ? ` · ${bot.year}` : ""}
          </span>
        </div>

        <div style={{ fontSize: k.nameSize, fontWeight: 700, lineHeight: 1.1, marginBottom: 36, letterSpacing: -1, color: "#111" }}>
          {bot.name}
        </div>

        {k.showStats && stats.length > 0 && (
          <div style={{ display: "flex", gap: 36 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: k.statLabelSize, color: "#aaa", letterSpacing: 1.5, textTransform: "uppercase" }}>{s.label}</span>
                <span style={{ fontSize: k.statValueSize, fontWeight: 600, color: "#333" }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {k.showBadge && badge && bot.status && (
          <div style={{ marginTop: 32, display: "flex" }}>
            <span style={{ fontSize: 14, padding: "6px 18px", borderRadius: 999, background: badge.bg, color: badge.fg, letterSpacing: 0.5 }}>
              {bot.status}
            </span>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 28, right: 40, display: "flex", fontSize: 16, color: "#ccc", letterSpacing: 0.5 }}>
        humanoid-index.com
      </div>
    </div>
  );
}

// ── Compare card ─────────────────────────────────────────────

function CompareSide({
  bot,
  imgSrc,
  k,
}: {
  bot: Humanoid;
  imgSrc: string | null;
  k: CompareKnobs;
}) {
  const stats = getStats(bot);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 24px",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        {imgSrc ? (
          <img src={imgSrc} width={k.imageW} height={k.imageH} style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              color: "#ccc",
            }}
          >
            ?
          </div>
        )}
      </div>

      <span style={{ fontSize: k.manufacturerSize, color: "#999", letterSpacing: 0.5 }}>
        {bot.manufacturer}{bot.year ? ` · ${bot.year}` : ""}
      </span>

      <div style={{ fontSize: k.nameSize, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5, color: "#111", textAlign: "center" }}>
        {bot.name}
      </div>

      {k.showStats && stats.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 28px", marginTop: 4 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: k.statLabelSize, color: "#bbb", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</span>
              <span style={{ fontSize: k.statValueSize, fontWeight: 600, color: "#333" }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  left,
  right,
  leftImg,
  rightImg,
  k,
}: {
  left: Humanoid;
  right: Humanoid;
  leftImg: string | null;
  rightImg: string | null;
  k: CompareKnobs;
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        background: "#ffffff",
        color: "#111",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <CompareSide bot={left} imgSrc={leftImg} k={k} />

      <div
        style={{
          width: k.showDivider ? 1 : 0,
          height: 630,
          background: k.showDivider ? "#e8e8e8" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {k.showVsBubble && (
          <div
            style={{
              position: "absolute",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 24,
              background: "#fff",
              border: "1px solid #e8e8e8",
              fontSize: 16,
              fontWeight: 600,
              color: "#bbb",
              letterSpacing: 1,
            }}
          >
            vs
          </div>
        )}
      </div>

      <CompareSide bot={right} imgSrc={rightImg} k={k} />

      <div style={{ position: "absolute", bottom: 28, right: 40, display: "flex", fontSize: 16, color: "#ccc", letterSpacing: 0.5 }}>
        humanoid-index.com
      </div>
    </div>
  );
}

// ── Route handler ────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bot = humanoids.find((h) => h.id === id);
  if (!bot) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const compareId = url.searchParams.get("compare");
  const rightBot = compareId ? humanoids.find((h) => h.id === compareId) : null;

  if (rightBot) {
    const k = readCompareKnobs(url.searchParams);
    const [leftImg, rightImg] = await Promise.all([loadBotImage(bot), loadBotImage(rightBot)]);
    return new ImageResponse(
      <CompareCard left={bot} right={rightBot} leftImg={leftImg} rightImg={rightImg} k={k} />,
      { width: 1200, height: 630 }
    );
  }

  const k = readSingleKnobs(url.searchParams);
  const [imgSrc, logoSrc] = await Promise.all([loadBotImage(bot), loadBotLogo(bot)]);
  return new ImageResponse(<SingleCard bot={bot} imgSrc={imgSrc} logoSrc={logoSrc} k={k} />, {
    width: 1200,
    height: 630,
  });
}
