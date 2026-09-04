import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PageMark from "@/components/PageMark";
import { humanoids } from "@/data/humanoids";
import { experiments, KIND_LABEL, shotName, type State } from "./experiments";

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
    items: experiments.filter((e) => e.kind === kind && !e.hidden),
  })).filter((g) => g.items.length);

  return (
    <main className="min-h-screen w-full" style={{ background: "#FBFBFC", color: "var(--c-ink)" }}>
      {/* The site pins html/body to overflow:hidden for the single-screen
          experience. This page is a page — it has to be able to scroll. */}
      <style>{`
        html, body { overflow: auto !important; overscroll-behavior: auto !important; height: auto !important; }
      `}</style>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "56px 28px 96px" }}>
        <header style={{ paddingBottom: 18, borderBottom: "1px solid #E7E7EE", marginBottom: 32 }}>
          <PageMark current="lab" />
        </header>

        {grouped.map(({ kind, items }) => (
          <section key={kind} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--c-ink)", marginBottom: 14 }}>
              {KIND_LABEL[kind]}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 18,
              }}
            >
              {items.map((e) => {
                const body = (
                  <>
                  <div className="lab-card-art">
                    {e.soon ? (
                      <SoonArt />
                    ) : (
                      <Image
                        src={`/lab/${shotName(e.slug)}`}
                        alt={e.title}
                        className="lab-shot"
                        width={1200}
                        height={800}
                        sizes="(max-width: 800px) 100vw, 460px"
                      />
                    )}
                  </div>

                  <div style={{ padding: "14px 17px 17px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{e.title}</span>
                      {e.soon && <Chip>Soon</Chip>}
                      {e.wip && <Chip>Rough</Chip>}
                      {e.devOnly && <Chip>Dev</Chip>}
                    </div>
                    <p
                      className="lab-card-blurb"
                      style={{ fontSize: 14.5, color: "var(--c-ink-body)", letterSpacing: "-0.01em", lineHeight: 1.45, marginTop: 4 }}
                    >
                      {e.blurb}
                    </p>
                  </div>
                  </>
                );
                return e.soon ? (
                  <div key={e.slug} className="lab-card lab-card-soon">{body}</div>
                ) : (
                  <Link key={e.slug} href={e.slug} className="lab-card">{body}</Link>
                );
              })}
            </div>
          </section>
        ))}

        <footer style={{ marginTop: 8, paddingTop: 18, borderTop: "1px solid #E7E7EE", display: "flex", gap: 18 }}>
          <Link href="/" style={{ fontSize: 14, color: "var(--c-ink-body)", textDecoration: "none", letterSpacing: "-0.01em" }}>
            ← Back to the index
          </Link>
          <Link href="/admin" style={{ fontSize: 14, color: "var(--c-ink-body)", textDecoration: "none", letterSpacing: "-0.01em" }}>
            Admin
          </Link>
        </footer>
      </div>
    </main>
  );
}

// The fight that doesn't exist yet: two robots squared up, greyed back so the
// tile reads as an announcement rather than a broken screenshot.
function SoonArt() {
  const left = humanoids.find((h) => h.id === "2");   // Electric Atlas
  const right = humanoids.find((h) => h.id === "1");  // Optimus Gen 2
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "9%",
        background: "#FAFAFB",
      }}
    >
      {[left, right].map((h, i) =>
        h?.imageUrl ? (
          <div key={h.id} style={{ position: "relative", width: "22%", height: "58%", opacity: 0.5 }}>
            <Image
              src={h.imageUrl}
              alt=""
              fill
              className="object-contain"
              sizes="200px"
              style={{ transform: i === 1 ? "scaleX(-1)" : undefined, filter: "grayscale(1)" }}
            />
          </div>
        ) : null
      )}
      <span
        style={{
          position: "absolute",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "var(--c-ink-muted)",
        }}
      >
        VS
      </span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 13,
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
