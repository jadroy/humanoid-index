"use client";

import { useCallback, useState } from "react";

type Variant = {
  key: string;
  name: string;
  blurb: string;
  render: (props: { src: string; onLoad: () => void; loaded: boolean }) => React.ReactNode;
};

const W = 320;
const H = 168;

const SKELETON_BG =
  "linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.07))";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        background: SKELETON_BG,
      }}
    >
      {children}
    </div>
  );
}

const variants: Variant[] = [
  {
    key: "wipe-up",
    name: "Wipe up",
    blurb: "Bottom-to-top reveal via clip-path.",
    render: ({ src, onLoad, loaded }) => (
      <Frame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={W}
          height={H}
          onLoad={onLoad}
          style={{
            display: "block",
            objectFit: "cover",
            clipPath: loaded ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
            transition: "clip-path 520ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </Frame>
    ),
  },
  {
    key: "fade",
    name: "Fade",
    blurb: "Simple opacity fade-in.",
    render: ({ src, onLoad, loaded }) => (
      <Frame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={W}
          height={H}
          onLoad={onLoad}
          style={{
            display: "block",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 420ms ease-out",
          }}
        />
      </Frame>
    ),
  },
  {
    key: "blur-up",
    name: "Blur up",
    blurb: "Starts blurred and sharpens. Apple-y.",
    render: ({ src, onLoad, loaded }) => (
      <Frame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={W}
          height={H}
          onLoad={onLoad}
          style={{
            display: "block",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            filter: loaded ? "blur(0px)" : "blur(14px)",
            transform: loaded ? "scale(1)" : "scale(1.04)",
            transition:
              "opacity 360ms ease-out, filter 520ms ease-out, transform 520ms ease-out",
          }}
        />
      </Frame>
    ),
  },
  {
    key: "scale",
    name: "Scale settle",
    blurb: "Pops in from 0.96 → 1 with a fade.",
    render: ({ src, onLoad, loaded }) => (
      <Frame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={W}
          height={H}
          onLoad={onLoad}
          style={{
            display: "block",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transform: loaded ? "scale(1)" : "scale(0.96)",
            transformOrigin: "center",
            transition:
              "opacity 320ms ease-out, transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </Frame>
    ),
  },
  {
    key: "shimmer",
    name: "Shimmer → fade",
    blurb: "Skeleton shimmers until loaded, then fades.",
    render: ({ src, onLoad, loaded }) => (
      <Frame>
        {!loaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(110deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 80%)",
              backgroundSize: "200% 100%",
              animation: "ogShimmer 1.4s linear infinite",
            }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={W}
          height={H}
          onLoad={onLoad}
          style={{
            display: "block",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 360ms ease-out",
            position: "relative",
          }}
        />
        <style>{`@keyframes ogShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </Frame>
    ),
  },
  {
    key: "wipe-up-mask",
    name: "Wipe up + mask",
    blurb: "Bottom-up wipe with a soft gradient edge.",
    render: ({ src, onLoad, loaded }) => (
      <Frame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={W}
          height={H}
          onLoad={onLoad}
          style={{
            display: "block",
            objectFit: "cover",
            WebkitMaskImage: loaded
              ? "linear-gradient(to top, black 100%, black 100%)"
              : "linear-gradient(to top, black 0%, transparent 14%)",
            maskImage: loaded
              ? "linear-gradient(to top, black 100%, black 100%)"
              : "linear-gradient(to top, black 0%, transparent 14%)",
            transition: "mask-image 600ms ease-out, -webkit-mask-image 600ms ease-out",
          }}
        />
      </Frame>
    ),
  },
];

export default function Page() {
  const [nonce, setNonce] = useState(0);
  const replay = useCallback(() => setNonce((n) => n + 1), []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        padding: "48px 32px 96px",
        color: "#111",
        fontFamily:
          "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
              OG thumbnail loaders
            </div>
            <div style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>
              Real /api/og fetch with cache-bust on every replay.
            </div>
          </div>
          <button
            onClick={replay}
            style={{
              border: "1px solid #e5e5e5",
              background: "white",
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Replay all
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${W}px, 1fr))`,
            gap: 28,
          }}
        >
          {variants.map((v) => (
            <Card key={v.key} variant={v} nonce={nonce} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ variant, nonce }: { variant: Variant; nonce: number }) {
  const [loaded, setLoaded] = useState(false);
  const src = `/api/og/1?t=${nonce}`;

  // Reset loaded when nonce changes
  const [tracked, setTracked] = useState(nonce);
  if (tracked !== nonce) {
    setTracked(nonce);
    setLoaded(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {variant.render({ src, onLoad: () => setLoaded(true), loaded })}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{variant.name}</div>
        <div style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>{variant.blurb}</div>
      </div>
    </div>
  );
}
