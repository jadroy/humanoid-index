import { ImageResponse } from "next/og";
import { humanoids } from "@/data/humanoids";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bot = humanoids.find((h) => h.id === id);
  if (!bot) return new Response("Not found", { status: 404 });

  const [imgSrc, logoSrc] = await Promise.all([
    bot.imageUrl ? loadImageAsDataUri(bot.imageUrl) : null,
    bot.logoUrl ? loadImageAsDataUri(bot.logoUrl) : null,
  ]);

  const stats = [
    bot.height && { label: "Height", value: `${bot.height} cm` },
    bot.weight && { label: "Weight", value: `${bot.weight} kg` },
    bot.dof && { label: "DOF", value: `${bot.dof}` },
    bot.maxSpeed && { label: "Speed", value: `${bot.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#0a0a0a",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Left: Robot image */}
        <div
          style={{
            width: 480,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              width={400}
              height={540}
              style={{ objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                background: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
                color: "#444",
              }}
            >
              ?
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 48px 60px 0",
          }}
        >
          {/* Manufacturer + Year */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {logoSrc && (
              <img
                src={logoSrc}
                width={28}
                height={28}
                style={{ borderRadius: 4 }}
              />
            )}
            <span style={{ fontSize: 20, color: "#777", letterSpacing: 0.5 }}>
              {bot.manufacturer}
              {bot.year ? ` \u00b7 ${bot.year}` : ""}
            </span>
          </div>

          {/* Name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: 36,
              letterSpacing: -1,
            }}
          >
            {bot.name}
          </div>

          {/* Stats row */}
          {stats.length > 0 && (
            <div style={{ display: "flex", gap: 36 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "#555",
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 600 }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Status badge */}
          {bot.status && (
            <div style={{ marginTop: 32, display: "flex" }}>
              <span
                style={{
                  fontSize: 14,
                  padding: "6px 18px",
                  borderRadius: 999,
                  background:
                    bot.status === "In Production" ? "#0f2a0f" : "#1a1a1a",
                  color:
                    bot.status === "In Production" ? "#4ade80" : "#777",
                  letterSpacing: 0.5,
                }}
              >
                {bot.status}
              </span>
            </div>
          )}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            color: "#444",
            letterSpacing: 0.5,
          }}
        >
          humanoidindex.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
