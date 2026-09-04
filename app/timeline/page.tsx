"use client";

import { useState } from "react";
import SpatialTimeline from "@/components/SpatialTimeline";

// Scratch route for the spatial timeline — lets it be looked at full-screen
// without touching the Index switcher until we know where it lands.
// <main> because that's where globals.css hangs the ink ramp.
export default function TimelinePage() {
  const [startYear] = useState(() => {
    if (typeof window === "undefined") return undefined;
    const at = new URLSearchParams(window.location.search).get("at");
    return at ? Number(at) : undefined;
  });
  return (
    <main className="h-[100dvh] bg-white">
      <SpatialTimeline isDev startYear={startYear} />
    </main>
  );
}
