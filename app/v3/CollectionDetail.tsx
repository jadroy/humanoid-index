"use client";

import { useState } from "react";
import { layerStyle } from "./Collection";
import type { CollectionItem, CollectionConfig } from "./Collection";

/* Detail (product) page for one collection item — Thuma-style: big image
   gallery on the left, title / price / description / specs / links on the
   right. Generic: any collection's adapter can produce a DetailItem. */
export type DetailItem = CollectionItem & {
  description?: string;
  specs?: { label: string; value: string }[];
  links?: { label: string; href: string }[];
  gallery?: string[]; // extra render URLs shown as thumbnails
};

export default function CollectionDetail({ item, config }: { item: DetailItem; config: CollectionConfig }) {
  const images = [item.image, ...(item.gallery ?? [])].filter(Boolean);
  const [sel, setSel] = useState(0);
  const fit = item.imageFit ?? "contain";
  const pos = item.imagePosition ?? "ground";

  return (
    <main className="v3-root">
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-30" style={{ background: "rgba(255,255,255,0.86)", backdropFilter: "blur(8px)" }}>
        <div
          className="flex items-center justify-between"
          style={{ position: "relative", paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)", height: 52 }}
        >
          <a href={config.href ?? "#"} aria-label={config.title ?? "Home"} className="flex items-center">
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt={config.title ?? ""} style={{ height: 15, width: "auto" }} />
            ) : (
              <span className="v3-eyebrow" style={{ color: "var(--ink-soft)" }}>{config.title}</span>
            )}
          </a>
          {config.blurb && (
            <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", color: "var(--ink-soft)", fontSize: 12, whiteSpace: "nowrap" }}>
              {config.blurb}
            </span>
          )}
          <a href={config.href ?? "#"} className="v3-nav-link" style={{ fontSize: 12 }}>← All</a>
        </div>
      </header>

      {/* ------------------------------------------------------------- Detail */}
      <section style={{ paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)", paddingTop: 40, paddingBottom: 120 }}>
        <div className="flex flex-col md:flex-row" style={{ gap: 56 }}>
          {/* LEFT — image + thumbnails */}
          <div style={{ flex: "1 1 56%", minWidth: 0 }}>
            <div className="v3-grid-tile" style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="v3-media" src={images[sel] ?? item.image} alt={item.title} style={layerStyle(fit, pos, 1)} />
            </div>
            {images.length > 1 && (
              <div className="flex" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                {images.map((im, i) => (
                  <button
                    key={i}
                    onClick={() => setSel(i)}
                    aria-label={`View ${i + 1}`}
                    className="v3-grid-tile"
                    style={{
                      position: "relative",
                      width: 64,
                      height: 64,
                      overflow: "hidden",
                      cursor: "pointer",
                      outline: i === sel ? "1px solid var(--ink)" : "1px solid transparent",
                      outlineOffset: -1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im} alt="" style={{ position: "absolute", inset: 0, margin: "auto", maxWidth: "78%", maxHeight: "78%", objectFit: "contain" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — info */}
          <div style={{ flex: "1 1 40%", minWidth: 0, maxWidth: 460 }}>
            <h1 className="v3-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {item.title}
            </h1>
            {item.subtitle && <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>{item.subtitle}</div>}
            {(item.price || item.badge) && (
              <div style={{ fontSize: 15, marginTop: 16, color: "var(--ink)" }}>{item.price ?? item.badge}</div>
            )}
            {item.description && (
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.65, marginTop: 20 }}>{item.description}</p>
            )}

            {item.specs?.length ? (
              <dl style={{ marginTop: 28, borderTop: "1px solid var(--hairline)" }}>
                {item.specs.map((s) => (
                  <div key={s.label} className="flex items-center justify-between" style={{ padding: "11px 0", borderBottom: "1px solid var(--hairline)" }}>
                    <dt style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>{s.label}</dt>
                    <dd style={{ color: "var(--ink)", fontSize: 12.5 }}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {item.links?.length ? (
              <div className="flex" style={{ gap: 10, marginTop: 26, flexWrap: "wrap" }}>
                {item.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12.5, border: "1px solid var(--ink)", borderRadius: 9999, padding: "8px 16px", color: "var(--ink)", whiteSpace: "nowrap" }}
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
