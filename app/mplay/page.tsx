"use client";

// TEMPORARY preview harness — renders MobileView inside a fixed phone frame so
// the mobile layout can be reviewed at true phone width on a desktop viewport.
// Delete this route once mobile is dialed in.

import MobileView from "@/components/MobileView";

export default function MobilePreview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e9e9ef",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        gap: 40,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: 390,
          height: 800,
          borderRadius: 44,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          border: "10px solid #111",
          background: "#fff",
          // Establish a containing block so the app's `position: fixed` sheets
          // (detail/compare/intro) stay inside the phone frame in this preview.
          // On a real device they fill the viewport, which is correct.
          transform: "translateZ(0)",
        }}
      >
        <MobileView />
      </div>
    </div>
  );
}
