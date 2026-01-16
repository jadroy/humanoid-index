"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { humanoids } from "@/data/humanoids";

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

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
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }

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
          router.push(`/robot/${filteredResults[selectedIndex].id}`);
          setIsOpen(false);
          setQuery("");
          setSelectedIndex(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, router]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-20 flex items-start justify-center pt-32 z-50"
      onClick={() => {
        setIsOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }}
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
              className="px-5 py-8 text-center text-[12px]"
              style={{ color: "rgba(98, 93, 93, 0.6)" }}
            >
              No results found
            </div>
          )}

          {filteredResults.map((humanoid, index) => (
            <button
              key={humanoid.id}
              onClick={() => {
                router.push(`/robot/${humanoid.id}`);
                setIsOpen(false);
                setQuery("");
                setSelectedIndex(0);
              }}
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
                <div className="text-[12px]" style={{ color: "#625D5D" }}>
                  {humanoid.name}
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "rgba(98, 93, 93, 0.6)" }}
                >
                  {humanoid.manufacturer}
                </div>
              </div>

              {/* Enter hint for selected */}
              {index === selectedIndex && (
                <kbd
                  className="px-2 py-1 rounded border border-neutral-200 text-[10px]"
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
            className="px-5 py-2.5 border-t border-neutral-200 flex items-center gap-3 text-[10px]"
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
