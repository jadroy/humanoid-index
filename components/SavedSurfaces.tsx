"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { type Humanoid } from "@/data/humanoids";
import { parseCost, savedTotal } from "@/lib/wheelLanes";
import { EASE } from "@/lib/design/chrome";

// Two ways of showing the same saved set. Which one is live is a `savedSurface`
// switch in Browse's dev tuner — the state, the toggle on the card and the
// sidebar row are shared, and only the surface differs:
//
//   • Tray  — a standing total in the corner. The set as a purchase.
//   • Shelf — the set laid out as objects. The set as a collection.
//
// The third option, Lane, needs no component at all: it swaps the wheel's list
// for the saved one and the existing card renders it.

const INK = "#2e2e36";
const ink = (a: number) => `rgba(46, 46, 54, ${a})`;

/** $20,900 — no cents, no abbreviation. A total that rounds is a total you distrust. */
const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** The left-hand label a robot without a parseable price falls back to. */
function priceLabel(h: Humanoid): string {
  const n = parseCost(h.cost);
  if (n != null) return money(n);
  switch (h.availability) {
    case "enterprise": return "Enterprise";
    case "research": return "Research";
    case "prototype": return "Prototype";
    case "discontinued": return "Discontinued";
    default: return h.cost || "On request";
  }
}

function Thumb({ h, size }: { h: Humanoid; size: number }) {
  return (
    <div
      className="flex-shrink-0 relative overflow-hidden"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: "rgba(46, 46, 54, 0.05)" }}
    >
      {h.imageUrl && (
        <Image
          src={h.imageUrl}
          alt=""
          fill
          sizes={`${size}px`}
          style={{ objectFit: "contain", objectPosition: h.imagePosition || "center", padding: Math.round(size * 0.1) }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRAY
// ═══════════════════════════════════════════════════════════════

export function SavedTray({
  items,
  open,
  onOpenChange,
  onSelect,
  onRemove,
}: {
  items: Humanoid[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { total, unpriced } = savedTotal(items);
  // The tray is its own affordance when closed — a count, not a button that
  // says "cart". Nothing is being sold here, so the noun stays off the chrome.
  const collapsed = !open || items.length === 0;

  if (items.length === 0) return null;

  return (
    <div
      className="fixed z-[6]"
      style={{ right: "var(--nav-edge, 24px)", bottom: "var(--nav-edge, 24px)", fontFamily: "var(--font-geist-sans)" }}
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <div
        style={{
          width: 268,
          borderRadius: 18,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)",
          overflow: "hidden",
          transition: `box-shadow 320ms ${EASE}`,
        }}
      >
        {/* Header doubles as the collapsed state: count on the left, total on
            the right, and the list opens underneath it. */}
        <div className="flex items-center justify-between" style={{ padding: "12px 14px" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>
            {items.length} saved
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: total > 0 ? INK : ink(0.45) }}>
            {total > 0 ? money(total) : "—"}
          </span>
        </div>

        <div
          style={{
            maxHeight: collapsed ? 0 : 320,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden auto",
            transition: `max-height 320ms ${EASE}, opacity 200ms ease`,
          }}
        >
          {items.map((h) => (
            <div
              key={h.id}
              className="group/row flex items-center"
              style={{ gap: 10, padding: "8px 14px" }}
            >
              <button
                type="button"
                onClick={() => onSelect(h.id)}
                className="flex items-center flex-1 min-w-0 cursor-pointer text-left"
                style={{ gap: 10, background: "none", border: "none", padding: 0 }}
              >
                <Thumb h={h} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate" style={{ fontSize: 13, fontWeight: 450, color: INK, lineHeight: 1.25 }}>{h.name}</span>
                  <span className="block truncate" style={{ fontSize: 12, color: ink(0.45), lineHeight: 1.25 }}>{priceLabel(h)}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(h.id)}
                aria-label={`Remove ${h.name}`}
                className="flex-shrink-0 cursor-pointer flex items-center justify-center opacity-0 group-hover/row:opacity-100"
                style={{ width: 22, height: 22, borderRadius: 999, background: "none", border: "none", padding: 0, color: ink(0.45), transition: "opacity 160ms ease" }}
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}

          <div style={{ padding: "10px 14px 14px" }}>
            {unpriced > 0 && (
              <p style={{ fontSize: 12, color: ink(0.45), lineHeight: 1.35, marginBottom: 10 }}>
                {unpriced} {unpriced === 1 ? "isn't" : "aren't"} sold with a public price.
              </p>
            )}
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {items.filter((h) => h.purchaseUrl).map((h) => (
                <a
                  key={h.id}
                  href={h.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, fontWeight: 450, color: INK, padding: "4px 9px", borderRadius: 999, background: "rgba(46, 46, 54, 0.07)", textDecoration: "none" }}
                >
                  {h.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHELF
// ═══════════════════════════════════════════════════════════════

export function SavedShelf({
  items,
  open,
  onClose,
  onSelect,
  onRemove,
  onShare,
}: {
  items: Humanoid[];
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onShare?: () => void;
}) {
  // Portalled to the body. Inside Browse's tree the card sits in its own
  // stacking context and painted straight through a sibling overlay however
  // high its z-index — the shelf covers the page or it isn't a shelf.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  return createPortal((
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 100,
        // Opaque, not frosted. At 0.97 with a blur behind it the card still
        // ghosted through the middle of the shelf, which read as a rendering
        // fault rather than as depth.
        background: "#FAFAF9",
        fontFamily: "var(--font-geist-sans)",
        animation: `shelf-in 320ms ${EASE}`,
      }}
      onClick={onClose}
    >
      <style>{`@keyframes shelf-in { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="flex items-center justify-between" style={{ padding: "22px 28px" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: INK }}>
          Saved
          <span style={{ marginLeft: 8, color: ink(0.45), fontWeight: 450 }}>{items.length}</span>
        </span>
        <div className="flex items-center" style={{ gap: 6 }}>
          {onShare && items.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="cursor-pointer"
              style={{ fontSize: 13, fontWeight: 450, color: INK, padding: "5px 11px", borderRadius: 999, background: "rgba(46, 46, 54, 0.07)", border: "none" }}
            >
              Share
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 999, background: "none", border: "none", color: ink(0.5), padding: 0 }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* The shelf itself. Objects on a surface, not rows in a table — so the
          grid is generous, the ground is a hairline under each item, and the
          name sits beneath its object rather than beside it. */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: "0 28px 28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.length === 0 ? (
          <p style={{ fontSize: 13, color: ink(0.45), padding: "40px 0" }}>
            Nothing saved yet. Tap the bookmark on a card.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(184px, 1fr))",
              gap: 26,
              alignItems: "end",
            }}
          >
            {items.map((h) => (
              <div key={h.id} className="group/item">
                <button
                  type="button"
                  onClick={() => onSelect(h.id)}
                  className="w-full cursor-pointer"
                  style={{ background: "none", border: "none", padding: 0, display: "block" }}
                >
                  <div style={{ position: "relative", width: "100%", aspectRatio: "0.88", borderBottom: `1px solid ${ink(0.12)}` }}>
                    {h.imageUrl && (
                      <Image
                        src={h.imageUrl}
                        alt={h.name}
                        fill
                        sizes="184px"
                        style={{ objectFit: "contain", objectPosition: h.imagePosition || "bottom" }}
                      />
                    )}
                  </div>
                  <div className="flex items-baseline justify-between" style={{ marginTop: 10, gap: 8 }}>
                    <span className="min-w-0">
                      <span className="block truncate text-left" style={{ fontSize: 13, fontWeight: 500, color: INK, lineHeight: 1.25 }}>{h.name}</span>
                      <span className="block truncate text-left" style={{ fontSize: 12, color: ink(0.45), lineHeight: 1.3 }}>{h.manufacturer}</span>
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); onRemove(h.id); }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRemove(h.id); } }}
                      aria-label={`Remove ${h.name}`}
                      className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 cursor-pointer"
                      style={{ fontSize: 12, color: ink(0.45), transition: "opacity 160ms ease" }}
                    >
                      Remove
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
