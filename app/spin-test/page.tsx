"use client";

import SpinViewer from "@/components/SpinViewer";

export default function SpinTestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <SpinViewer
        frameCount={30}
        path="/spin/memo"
        style={{ width: 480, height: 600 }}
      />
    </main>
  );
}
