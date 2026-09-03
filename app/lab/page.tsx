import type { Metadata } from "next";
import Link from "next/link";
import LabPreview from "./LabPreview";
import { experiments, KIND_LABEL, type State } from "./experiments";

// The lab is a private shelf, not a page of the site — findable if you know it,
// never crawled.
export const metadata: Metadata = {
  title: "Lab — Humanoid Index",
  robots: { index: false, follow: false },
};

const ORDER: State[] = ["play", "view", "study"];

export default function LabPage() {
  const grouped = ORDER.map((kind) => ({
    kind,
    items: experiments.filter((e) => e.kind === kind),
  })).filter((g) => g.items.length);

  return (
    <main className="min-h-screen w-full" style={{ background: "#FBFBFC", color: "var(--c-ink)" }}>
      {/* The site pins html/body to overflow:hidden for the single-screen
          experience. This page is a page — it has to be able to scroll. */}
      <style>{`
        html, body { overflow: auto !important; overscroll-behavior: auto !important; height: auto !important; }
      `}</style>

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "56px 28px 96px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            paddingBottom: 18,
            borderBottom: "1px solid #E7E7EE",
            marginBottom: 32,
          }}
        >
          <h1 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.03em" }}>Lab</h1>
          <p style={{ fontSize: 13, color: "var(--c-ink-body)", letterSpacing: "-0.01em" }}>
            Things built with the index that aren&apos;t in it. Pick one.
          </p>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--c-ink-muted)" }} className="tabular-nums">
            {experiments.length}
          </span>
        </header>

        {grouped.map(({ kind, items }) => (
          <section key={kind} style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-ink)" }}>
                {KIND_LABEL[kind]}
              </h2>
              <span className="tabular-nums" style={{ fontSize: 13, color: "var(--c-ink-muted)" }}>
                {items.length}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 18,
              }}
            >
              {items.map((e) => (
                <Link key={e.slug} href={e.slug} className="lab-card">
                  <div className="lab-card-art">
                    <LabPreview preview={e.preview} bots={e.bots} />
                  </div>

                  <div style={{ padding: "13px 15px 15px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.02em" }}>{e.title}</span>
                      {e.wip && <Chip>Rough</Chip>}
                      {e.devOnly && <Chip>Dev</Chip>}
                    </div>
                    <p
                      className="lab-card-blurb"
                      style={{ fontSize: 13, color: "var(--c-ink-body)", letterSpacing: "-0.01em", lineHeight: 1.45, marginTop: 3 }}
                    >
                      {e.blurb}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <footer style={{ marginTop: 8, paddingTop: 18, borderTop: "1px solid #E7E7EE", display: "flex", gap: 18 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--c-ink-body)", textDecoration: "none", letterSpacing: "-0.01em" }}>
            ← Back to the index
          </Link>
          <Link href="/admin" style={{ fontSize: 13, color: "var(--c-ink-body)", textDecoration: "none", letterSpacing: "-0.01em" }}>
            Admin
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        lineHeight: 1.5,
        padding: "0 6px",
        borderRadius: 999,
        background: "#EFEFF3",
        color: "var(--c-ink-body)",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </span>
  );
}
