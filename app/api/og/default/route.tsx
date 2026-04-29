import { ImageResponse } from "next/og";

export const runtime = "nodejs";

function DefaultCard() {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        color: "#111",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <svg width="160" height="160" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.85 }}>
        <circle cx="10" cy="5" r="3" fill="#111" />
        <rect x="7" y="9.5" width="6" height="8" rx="3" fill="#111" />
      </svg>

      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: -2,
          marginTop: 36,
          color: "#111",
        }}
      >
        Humanoid Index
      </div>

      <div
        style={{
          fontSize: 28,
          color: "#888",
          marginTop: 14,
          letterSpacing: 0.3,
        }}
      >
        A visual index of humanoid robots
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 28,
          right: 40,
          display: "flex",
          fontSize: 16,
          color: "#ccc",
          letterSpacing: 0.5,
        }}
      >
        humanoid-index.com
      </div>
    </div>
  );
}

export async function GET() {
  return new ImageResponse(<DefaultCard />, { width: 1200, height: 630 });
}
