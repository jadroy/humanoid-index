import type { Metadata } from "next";
import Link from "next/link";
import { humanoids } from "@/data/humanoids";
import { items, AREA_LABEL, AREA_COLOR, SIZE_LABEL, type Area } from "./todo";

// Same posture as the lab — findable if you know it, never crawled.
export const metadata: Metadata = {
  title: "Admin — Humanoid Index",
  robots: { index: false, follow: false },
};

const ORDER: Area[] = ["seo", "data", "perf", "a11y", "code", "product"];

const SIZE_ORDER = ["quick", "session", "project"] as const;

// Headed by how much of your day it costs, not by a size label — the list is
// read by someone deciding what to pick up, not filing it.
const SIZE_HEADING: Record<(typeof SIZE_ORDER)[number], string> = {
  quick: "Quick wins",
  session: "Half a day each",
  project: "Bigger pieces",
};

const INK = "var(--c-ink)";
const BODY = "var(--c-ink-body)";
const MUTED = "var(--c-ink-muted)";
const LINE = "#E7E7EE";

// Coverage is counted, never hand-maintained, so the numbers can't drift from
// the data the way a written-down count would. Full rows are deliberately
// muted and only the gaps carry ink — a wall of equal-weight numbers is a wall
// you stop reading.
function coverage() {
  const n = humanoids.length;
  const have = (test: (h: (typeof humanoids)[number]) => boolean) => humanoids.filter(test).length;

  return [
    { label: "Cover image", value: have((h) => !!h.imageUrl), of: n },
    { label: "Description", value: have((h) => !!h.description), of: n },
    { label: "Outbound link", value: have((h) => !!(h.infoUrl || h.manufacturerUrl)), of: n },
    { label: "Tags", value: have((h) => !!h.tags?.length), of: n },
    { label: "Engineer stats", value: have((h) => !!h.engineering), of: n },
  ];
}

export default function AdminPage() {
  const rows = coverage();
  const quick = items.filter((i) => i.size === "quick").length;

  return (
    <main className="min-h-screen w-full" style={{ background: "#FBFBFC", color: INK }}>
      {/* The site pins html/body to overflow:hidden for the single-screen
          experience. This page is a page — it has to be able to scroll.
          The row styling lives here too: a summary row is a hit target, and
          hover/open feedback is the thing that makes a list feel clickable. */}
      <style>{`
        html, body { overflow: auto !important; overscroll-behavior: auto !important; height: auto !important; }
        .row { border-top: 1px solid #EFEFF3; }
        .row:first-child { border-top: none; }
        .row > summary {
          list-style: none; cursor: pointer; user-select: none;
          display: flex; align-items: center; gap: 10px;
          padding: 11px 15px; transition: background 120ms ease;
        }
        .row > summary::-webkit-details-marker { display: none; }
        .row > summary:hover { background: #FAFAFC; }
        .row[open] > summary { background: #FAFAFC; }
        .row[open] .caret { transform: rotate(90deg); }
        .caret { transition: transform 160ms cubic-bezier(0.2,0.8,0.2,1); flex-shrink: 0; }
      `}</style>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "56px 28px 96px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            paddingBottom: 18,
            borderBottom: `1px solid ${LINE}`,
            marginBottom: 34,
          }}
        >
          <h1 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.03em" }}>Admin</h1>
          <p style={{ fontSize: 13, color: BODY, letterSpacing: "-0.01em" }}>
            What the index knows, and what&apos;s still owed.
          </p>
          <span className="tabular-nums" style={{ marginLeft: "auto", fontSize: 13, color: MUTED }}>
            {items.length} open · {quick} quick
          </span>
        </header>

        {/* Coverage — bars, so a gap is a shape you catch without reading. */}
        <SectionLabel>Coverage</SectionLabel>
        <div style={{ display: "grid", gap: 9, marginBottom: 42 }}>
          {rows.map((r) => {
            const full = r.value === r.of;
            return (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 108,
                    flexShrink: 0,
                    fontSize: 13,
                    letterSpacing: "-0.01em",
                    color: full ? MUTED : INK,
                  }}
                >
                  {r.label}
                </span>
                <span style={{ flex: 1, height: 4, borderRadius: 999, background: "#ECECF1", overflow: "hidden" }}>
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${(r.value / r.of) * 100}%`,
                      borderRadius: 999,
                      background: full ? "#D6D6DE" : "var(--c-ink)",
                    }}
                  />
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    width: 52,
                    textAlign: "right",
                    flexShrink: 0,
                    fontSize: 12.5,
                    color: full ? MUTED : INK,
                  }}
                >
                  {r.value}/{r.of}
                </span>
              </div>
            );
          })}
        </div>

        {/* The list. Flat and ordered by effort rather than grouped by area,
            because "what can I knock out now" is the question this page gets
            asked. The area is a colour chip on the row, so the grouping is
            still readable at a glance without splitting the list up. */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 11 }}>
          <SectionLabel>Tasks</SectionLabel>
          <span style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ORDER.filter((a) => items.some((i) => i.area === a)).map((a) => (
              <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: MUTED }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: AREA_COLOR[a].dot }} />
                {AREA_LABEL[a]}
              </span>
            ))}
          </span>
        </div>

        {SIZE_ORDER.map((size) => {
          const list = items.filter((i) => i.size === size);
          if (!list.length) return null;
          return (
            <section key={size} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 8 }}>
                <h3 style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.01em", color: INK }}>
                  {SIZE_HEADING[size]}
                </h3>
                <span className="tabular-nums" style={{ fontSize: 11.5, color: "#B8B8C2" }}>{list.length}</span>
              </div>

              <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden", background: "#FFF" }}>
                {list.map((i) => {
                  const c = AREA_COLOR[i.area];
                  return (
                    <details key={i.title} className="row">
                      <summary>
                        <svg className="caret" width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="#B8B8C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M6 3 L11 8 L6 13" />
                        </svg>

                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 500,
                            letterSpacing: "-0.005em",
                            padding: "2px 7px",
                            borderRadius: 5,
                            background: c.bg,
                            color: c.fg,
                            width: 96,
                            textAlign: "center",
                          }}
                        >
                          {AREA_LABEL[i.area]}
                        </span>

                        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em", flex: 1, minWidth: 0 }}>
                          {i.title}
                        </span>

                        {i.blocked && (
                          <span
                            title="Needs a decision"
                            style={{
                              flexShrink: 0, fontSize: 11, fontWeight: 500,
                              padding: "2px 7px", borderRadius: 5,
                              background: "#FBF2E4", color: "#B5761A",
                            }}
                          >
                            Needs a call
                          </span>
                        )}
                      </summary>

                      <div style={{ padding: "0 15px 14px 121px" }}>
                        <p style={{ fontSize: 13, color: BODY, letterSpacing: "-0.01em", lineHeight: 1.5 }}>
                          {i.note}
                        </p>
                        {i.detail && (
                          <p style={{ fontSize: 12.5, color: MUTED, letterSpacing: "-0.01em", lineHeight: 1.5, marginTop: 6 }}>
                            {i.detail}
                          </p>
                        )}
                        {(i.where || i.blocked) && (
                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 7 }}>
                            {i.where && <code style={{ fontSize: 12, color: MUTED }}>{i.where}</code>}
                            {i.blocked && (
                              <span style={{ fontSize: 12, color: "#8A7420", letterSpacing: "-0.01em" }}>
                                Decide: {i.blocked}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })}

        <footer style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${LINE}`, display: "flex", gap: 18 }}>
          <Link href="/" style={{ fontSize: 13, color: BODY, textDecoration: "none", letterSpacing: "-0.01em" }}>
            ← Back to the index
          </Link>
          <Link href="/lab" style={{ fontSize: 13, color: BODY, textDecoration: "none", letterSpacing: "-0.01em" }}>
            Lab
          </Link>
        </footer>
      </div>
    </main>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 11 }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        {children}
      </h2>
      {count !== undefined && (
        <span className="tabular-nums" style={{ fontSize: 11, color: "#B8B8C2" }}>
          {count}
        </span>
      )}
    </div>
  );
}
