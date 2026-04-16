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
};

// ── Single bot card ──────────────────────────────────────────

function SingleCard({
  bot,
  imgSrc,
  logoSrc,
}: {
  bot: Humanoid;
  imgSrc: string | null;
  logoSrc: string | null;
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
          width: 480,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          background: "#fafafa",
        }}
      >
        {imgSrc ? (
          <img src={imgSrc} width={400} height={540} style={{ objectFit: "contain" }} />
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
          {logoSrc && <img src={logoSrc} width={28} height={28} style={{ borderRadius: 4 }} />}
          <span style={{ fontSize: 20, color: "#888", letterSpacing: 0.5 }}>
            {bot.manufacturer}{bot.year ? ` \u00b7 ${bot.year}` : ""}
          </span>
        </div>

        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginBottom: 36, letterSpacing: -1, color: "#111" }}>
          {bot.name}
        </div>

        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 36 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, color: "#aaa", letterSpacing: 1.5, textTransform: "uppercase" }}>{s.label}</span>
                <span style={{ fontSize: 28, fontWeight: 600, color: "#333" }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {badge && bot.status && (
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
}: {
  bot: Humanoid;
  imgSrc: string | null;
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
      {/* Image */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        {imgSrc ? (
          <img src={imgSrc} width={240} height={300} style={{ objectFit: "contain" }} />
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

      {/* Manufacturer + Year */}
      <span style={{ fontSize: 14, color: "#999", letterSpacing: 0.5 }}>
        {bot.manufacturer}{bot.year ? ` \u00b7 ${bot.year}` : ""}
      </span>

      {/* Name */}
      <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5, color: "#111", textAlign: "center" }}>
        {bot.name}
      </div>

      {/* Stats — compact 2×2 */}
      {stats.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 28px", marginTop: 4 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#bbb", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: "#333" }}>{s.value}</span>
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
}: {
  left: Humanoid;
  right: Humanoid;
  leftImg: string | null;
  rightImg: string | null;
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
      <CompareSide bot={left} imgSrc={leftImg} />

      {/* Center divider + "vs" */}
      <div
        style={{
          width: 1,
          height: 630,
          background: "#e8e8e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
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
      </div>

      <CompareSide bot={right} imgSrc={rightImg} />

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

  // Compare mode
  if (rightBot) {
    const [leftImg, rightImg] = await Promise.all([loadBotImage(bot), loadBotImage(rightBot)]);
    return new ImageResponse(<CompareCard left={bot} right={rightBot} leftImg={leftImg} rightImg={rightImg} />, { width: 1200, height: 630 });
  }

  // Single bot
  const [imgSrc, logoSrc] = await Promise.all([loadBotImage(bot), loadBotLogo(bot)]);
  return new ImageResponse(<SingleCard bot={bot} imgSrc={imgSrc} logoSrc={logoSrc} />, { width: 1200, height: 630 });
}
