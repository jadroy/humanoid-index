import { humanoids } from "@/data/humanoids";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";

export async function generateStaticParams() {
  return humanoids.map((h) => ({ id: h.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bot = humanoids.find((h) => h.id === id);
  if (!bot) return {};
  return { title: `${bot.name} | Humanoid Index`, robots: "noindex" };
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bot = humanoids.find((h) => h.id === id);
  if (!bot) notFound();

  const stats = [
    bot.height && { label: "Height", value: `${bot.height} cm` },
    bot.weight && { label: "Weight", value: `${bot.weight} kg` },
    bot.dof && { label: "DOF", value: `${bot.dof}` },
    bot.maxSpeed && { label: "Speed", value: `${bot.maxSpeed} m/s` },
  ].filter(Boolean) as { label: string; value: string }[];

  const statusColor: Record<string, string> = {
    "In Production": "#2e7d32",
    Prototype: "#6b7280",
    Concept: "#92400e",
    Discontinued: "#9ca3af",
    Anticipated: "#6d28d9",
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        background: "#fff",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <div
        style={{
          width: "40%",
          minWidth: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          padding: 20,
          position: "relative",
        }}
      >
        {bot.imageUrl ? (
          <Image
            src={bot.imageUrl}
            alt={bot.name}
            fill
            style={{
              objectFit: bot.imageFit || "contain",
              objectPosition: bot.imagePosition || "center",
              padding: 20,
            }}
            sizes="40vw"
            unoptimized
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "#ccc",
            }}
          >
            ?
          </div>
        )}
      </div>

      {/* Info */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "24px 28px",
          minWidth: 0,
          position: "relative",
        }}
      >
        {/* Manufacturer + Year */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {bot.logoUrl && (
            <div style={{ width: 18, height: 18, position: "relative", flexShrink: 0, borderRadius: 4, overflow: "hidden" }}>
              <Image src={bot.logoUrl} alt={bot.manufacturer} fill style={{ objectFit: "cover" }} sizes="18px" unoptimized />
            </div>
          )}
          <span style={{ fontSize: 11, color: "#999", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {bot.manufacturer}
            {bot.year ? ` · ${bot.year}` : ""}
          </span>
        </div>

        {/* Name */}
        <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#1d1d1f", margin: "0 0 14px" }}>
          {bot.name}
        </h1>

        {/* Stats */}
        {stats.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", marginBottom: 14 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 10, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#333" }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        {bot.status && (
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: statusColor[bot.status] || "#999",
              marginBottom: 8,
            }}
          >
            {bot.status}
          </span>
        )}

        {/* Branding */}
        <a
          href={`https://humanoid-index.com/?h=${bot.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "absolute",
            bottom: 12,
            right: 16,
            fontSize: 10,
            color: "#ccc",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          humanoid-index.com
        </a>
      </div>
    </div>
  );
}
