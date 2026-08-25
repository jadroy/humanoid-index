"use client";

import { useState, useEffect, useCallback } from "react";
import { humanoids } from "@/data/humanoids";

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

  const filteredResults = query
    ? humanoids.filter(
        (h) =>
          h.name.toLowerCase().includes(query.toLowerCase()) ||
          h.manufacturer.toLowerCase().includes(query.toLowerCase())
      )
    : [];

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
      className="fixed inset-0 bg-black bg-opacity-20 flex items-start justify-center pt-32 z-50"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="border-b border-neutral-200">
          <input
            type="text"
            placeholder="Search humanoids..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full px-5 py-4 text-[13px] focus:outline-none"
            style={{ color: "#625D5D" }}
          />
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query && filteredResults.length === 0 && (
            <div
              className="px-5 py-8 text-center text-[13px]"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              No results found
            </div>
          )}

          {filteredResults.map((humanoid, index) => (
            <button
              key={humanoid.id}
              onClick={() => select(humanoid.id)}
              className={`w-full px-5 py-3 flex items-center gap-4 text-left transition-colors ${
                index === selectedIndex ? "bg-neutral-50" : ""
              }`}
            >
              {/* Small thumbnail */}
              <div className="w-12 h-12 rounded-lg bg-neutral-50 flex items-center justify-center flex-shrink-0">
                <img
                  src={humanoid.imageUrl || "/robots/placeholder.png"}
                  alt={humanoid.name}
                  className="w-full h-full object-contain p-1.5"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="text-[13px]" style={{ color: "#625D5D" }}>
                  {humanoid.name}
                </div>
                <div
                  className="text-[13px]"
                  style={{ color: "rgba(98, 93, 93, 0.6)" }}
                >
                  {humanoid.manufacturer}
                </div>
              </div>

              {/* Enter hint for selected */}
              {index === selectedIndex && (
                <kbd
                  className="px-2 py-1 rounded border border-neutral-200 text-[13px]"
                  style={{ color: "rgba(98, 93, 93, 0.6)" }}
                >
                  ↵
                </kbd>
              )}
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {query && filteredResults.length > 0 && (
          <div
            className="px-5 py-2.5 border-t border-neutral-200 flex items-center gap-3 text-[13px]"
            style={{ color: "rgba(98, 93, 93, 0.5)" }}
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-neutral-200">↑</kbd>
              <kbd className="px-1 py-0.5 rounded border border-neutral-200">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-neutral-200">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border border-neutral-200">esc</kbd>
              close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
