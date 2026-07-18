"use client";

import { useEffect } from "react";
import { layerStyle } from "./Collection";
import type { CollectionConfig } from "./Collection";
import type { DetailItem } from "./CollectionDetail";

/* Inline detail panel — a calm side column that opens beside the grid when a
   card is clicked, instead of navigating to the full /v3/[id] page. Same
   content as CollectionDetail, stacked vertically for a single narrow column.
   Esc closes; ← / → step through the collection. */
export default function DetailPanel({
  item,
  config,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  item: DetailItem;
  config: CollectionConfig;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const fit = item.imageFit ?? "contain";
  const pos = item.imagePosition ?? "ground";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <aside className="v3-panel" aria-label={`${item.title} details`}>
      {/* controls — close + step through the collection */}
      <div className="v3-panel-controls">
        <button className="v3-panel-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">✕</button>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span className="v3-label v3-label--faint" style={{ marginRight: 4 }}>{index + 1} / {total}</span>
          <button className="v3-panel-btn" onClick={onPrev} aria-label="Previous" title="Previous (←)" disabled={total <= 1}>←</button>
          <button className="v3-panel-btn" onClick={onNext} aria-label="Next" title="Next (→)" disabled={total <= 1}>→</button>
        </div>
      </div>

      {/* Content is keyed by item so stepping ←/→ crossfades it in place —
          the panel frame itself only slides in once, on open. */}
      <div className="v3-panel-content" key={item.id}>
      {/* enlarged render */}
      <div className="v3-grid-tile" style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="v3-media" src={item.image} alt={item.title} style={layerStyle(fit, pos, 1)} />
      </div>

      {/* info */}
      <div style={{ marginTop: 18 }}>
        <div className="flex items-baseline justify-between" style={{ gap: 12 }}>
          <span className="v3-display" style={{ fontSize: 20 }}>{item.title}</span>
          {(item.price || item.badge) && (
            <span className="v3-label v3-label--faint" style={{ whiteSpace: "nowrap" }}>{item.price ?? item.badge}</span>
          )}
        </div>
        {item.subtitle && <div className="v3-label v3-label--soft" style={{ marginTop: 4 }}>{item.subtitle}</div>}
        {item.description && (
          <p className="v3-label v3-label--soft" style={{ lineHeight: 1.6, marginTop: 14 }}>{item.description}</p>
        )}

        {item.specs?.length ? (
          <dl style={{ marginTop: 18, borderTop: "1px solid var(--hairline)" }}>
            {item.specs.map((s) => (
              <div key={s.label} className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: "1px solid var(--hairline)", gap: 16 }}>
                <dt className="v3-label v3-label--soft">{s.label}</dt>
                <dd className="v3-label" style={{ textAlign: "right" }}>{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {(item.links?.length || config.href) && (
          <div className="flex items-center" style={{ gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            {item.links?.map((l, i) => (
              <a key={`${l.label}-${i}`} href={l.href} target="_blank" rel="noreferrer" className="v3-label" style={{ border: "1px solid var(--ink)", borderRadius: 9999, padding: "7px 14px", whiteSpace: "nowrap" }}>
                {l.label} ↗
              </a>
            ))}
            <a href={`${config.href ?? ""}/${item.id}`} className="v3-label v3-nav-link" style={{ marginLeft: "auto" }}>Full page →</a>
          </div>
        )}
      </div>
      </div>
    </aside>
  );
}
