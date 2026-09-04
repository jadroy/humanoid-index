import type { Metadata } from "next";
import PageMark from "@/components/PageMark";
import { items, AREA_LABEL, AREA_COLOR } from "./todo";

// Same posture as the lab — findable if you know it, never crawled.
export const metadata: Metadata = {
  title: "Admin — Humanoid Index",
  robots: { index: false, follow: false },
};

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

export default function AdminPage() {
  return (
    <main className="min-h-screen w-full" style={{ background: "#FBFBFC", color: INK }}>
      {/* The site pins html/body to overflow:hidden for the single-screen
          experience. This page is a page — it has to be able to scroll.
          The row styling lives here too: a summary row is a hit target, and
          hover/open feedback is what makes a list feel clickable. */}
      <style>{`
        html, body { overflow: auto !important; overscroll-behavior: auto !important; height: auto !important; }
        .row { border-top: 1px solid #F0F0F4; }
        .row:first-child { border-top: none; }
        .row > summary {
          list-style: none; cursor: pointer; user-select: none;
          display: flex; align-items: center; gap: 16px;
          padding: 19px 22px; transition: background 120ms ease;
        }
        .row > summary::-webkit-details-marker { display: none; }
        .row > summary:hover { background: #FAFAFC; }
        .row[open] > summary { background: #FAFAFC; }
        .row[open] .caret { transform: rotate(90deg); }
        .caret { transition: transform 160ms cubic-bezier(0.2,0.8,0.2,1); flex-shrink: 0; }
      `}</style>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "56px 28px 96px" }}>
        <div style={{ marginBottom: 48 }}>
          <PageMark current="admin" />
        </div>

        {/* Flat and ordered by effort rather than grouped by area, because
            "what can I knock out now" is the question this page gets asked.
            The area rides along as a colour chip on each row. */}
        {SIZE_ORDER.map((size) => {
          const list = items.filter((i) => i.size === size);
          if (!list.length) return null;
          return (
            <section key={size} style={{ marginBottom: 46 }}>
              <h2 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: INK, marginBottom: 16 }}>
                {SIZE_HEADING[size]}
              </h2>

              <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", background: "#FFF" }}>
                {list.map((i) => {
                  const c = AREA_COLOR[i.area];
                  return (
                    <details key={i.title} className="row">
                      <summary>
                        <svg className="caret" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#B8B8C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M6 3 L11 8 L6 13" />
                        </svg>

                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 13.5,
                            fontWeight: 500,
                            letterSpacing: "-0.005em",
                            padding: "5px 11px",
                            borderRadius: 7,
                            background: c.bg,
                            color: c.fg,
                            width: 124,
                            textAlign: "center",
                          }}
                        >
                          {AREA_LABEL[i.area]}
                        </span>

                        <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em", flex: 1, minWidth: 0 }}>
                          {i.title}
                        </span>

                        {i.blocked && (
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 13.5,
                              fontWeight: 500,
                              padding: "5px 11px",
                              borderRadius: 7,
                              background: "#FBF2E4",
                              color: "#B5761A",
                            }}
                          >
                            Needs a call
                          </span>
                        )}
                      </summary>

                      <div style={{ padding: "2px 26px 24px 170px" }}>
                        <p style={{ fontSize: 15.5, color: BODY, letterSpacing: "-0.01em", lineHeight: 1.6 }}>
                          {i.note}
                        </p>
                        {i.detail && (
                          <p style={{ fontSize: 15, color: MUTED, letterSpacing: "-0.01em", lineHeight: 1.6, marginTop: 10 }}>
                            {i.detail}
                          </p>
                        )}
                        {(i.where || i.blocked) && (
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
                            {i.where && <code style={{ fontSize: 13.5, color: MUTED }}>{i.where}</code>}
                            {i.blocked && (
                              <span style={{ fontSize: 13.5, color: "#8A7420", letterSpacing: "-0.01em" }}>
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

      </div>
    </main>
  );
}
