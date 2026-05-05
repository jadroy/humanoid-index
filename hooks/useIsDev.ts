"use client";

import { useEffect, useState } from "react";

const KEY = "humanoid-dev";

// Press Ctrl+Shift+D to toggle dev mode (tuners + dev hotkeys). Persists via
// localStorage. SSR-safe: returns false on server, resolves on mount.
export function useIsDev(): boolean {
  const [isDev, setIsDev] = useState(false);
  useEffect(() => {
    try {
      setIsDev(localStorage.getItem(KEY) === "1");
    } catch {}
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        try {
          const next = localStorage.getItem(KEY) !== "1";
          if (next) localStorage.setItem(KEY, "1");
          else localStorage.removeItem(KEY);
          setIsDev(next);
        } catch {}
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return isDev;
}
