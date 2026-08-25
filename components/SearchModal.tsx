"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { humanoids } from "@/data/humanoids";
import { INK, FILL, SEAM, SCRIM, RADIUS, WEIGHT, EASE, DUR, panelStyle } from "@/lib/design/chrome";
import { Key } from "@/components/Key";

// This component lives in `layout.tsx`, a different tree from HomeClient, so
// there is no prop path between the sidebar's Search row and this modal, or
// between a result and the wheel. Two window events bridge them instead of
// lifting state across the layout/page boundary.
export const SEARCH_OPEN_EVENT = "humanoid-index:search-open";
export const SEARCH_SELECT_EVENT = "humanoid-index:search-select";

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  // Picking a result drives the wheel; it does not navigate. This used to
  // `router.push("/robot/<id>")` — a route that does not exist in this app, so
  // every result 404'd. The site addresses robots by `?h=<id>` on one page, and
  // the in-app path is HomeClient's `goToId`, which animates the wheel there
  // instead of reloading.
  const select = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent(SEARCH_SELECT_EVENT, { detail: { id } }));
    close();
  }, [close]);

  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener(SEARCH_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, onOpen);
  }, []);

  // Memoised on the query: the keydown effect below keys on this array, and a
  // fresh identity per render (e.g. every row hover) would re-bind it.
  const filteredResults = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return humanoids.filter((h) => h.name.toLowerCase().includes(q) || h.manufacturer.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Esc
      if (e.key === "Escape") close();

      // Navigate with arrow keys
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : prev
          );
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        if (e.key === "Enter" && filteredResults[selectedIndex]) {
          e.preventDefault();
          select(filteredResults[selectedIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, select, close]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      // Warm scrim. `bg-black/20` reads blue-grey over this page and turned the
      // card behind it muddy.
      className="fixed inset-0 flex items-start justify-center pt-32 z-50"
      style={{ background: SCRIM, animation: `share-modal-fade ${DUR.fast}ms ${EASE} both` }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ ...panelStyle(), animation: `chat-rise 320ms ${EASE} both` }}
      >
        {/* Search input */}
        <div style={{ borderBottom: `1px solid ${SEAM}` }}>
          <input
            type="text"
            placeholder="Search humanoids"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="search-input w-full px-5 py-4 focus:outline-none bg-transparent"
            style={{ fontSize: 14, fontWeight: WEIGHT.body, color: INK.on }}
          />
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto scrollbar-hide">
          {query && filteredResults.length === 0 && (
            <div className="px-5 py-8 text-center" style={{ fontSize: 14, fontWeight: WEIGHT.body, color: INK.off }}>
              No results
            </div>
          )}

          {filteredResults.map((humanoid, index) => (
            <button
              key={humanoid.id}
              onClick={() => select(humanoid.id)}
              onMouseEnter={() => setSelectedIndex(index)}
              className="w-full px-3 py-2 flex items-center gap-3 text-left cursor-pointer"
              style={{
                // The selected row is a rounded fill inset from the panel edge,
                // the same shape the lane indicator uses — not a full-bleed
                // `bg-neutral-50` band running wall to wall.
                background: index === selectedIndex ? FILL.active : "transparent",
                borderRadius: RADIUS.row,
                border: "none",
                margin: "2px 8px",
                width: "calc(100% - 16px)",
                transition: `background ${DUR.fast}ms ${EASE}`,
              }}
            >
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 12, background: FILL.rest }}>
                <img
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  className="w-full h-full object-contain p-1.5"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: WEIGHT.label, color: INK.on, lineHeight: 1.3 }}>
                  {humanoid.name}
                </div>
                <div style={{ fontSize: 12, fontWeight: WEIGHT.body, color: INK.off, lineHeight: 1.3 }}>
                  {humanoid.manufacturer}
                </div>
              </div>

              {index === selectedIndex && <Key>&#8629;</Key>}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {query && filteredResults.length > 0 && (
          <div
            className="px-5 py-3 flex items-center gap-4"
            style={{ borderTop: `1px solid ${SEAM}`, fontSize: 12, fontWeight: WEIGHT.body, color: INK.faint }}
          >
            <span className="flex items-center gap-1.5"><Key>&#8593;</Key><Key>&#8595;</Key>navigate</span>
            <span className="flex items-center gap-1.5"><Key>&#8629;</Key>select</span>
            <span className="flex items-center gap-1.5"><Key>esc</Key>close</span>
          </div>
        )}
      </div>
    </div>
  );
}
