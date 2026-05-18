"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { MaterialPreset } from "@/components/Robot3D";

const Robot3D = dynamic(() => import("@/components/Robot3D"), { ssr: false });

const MATERIALS: { id: MaterialPreset; label: string }[] = [
  { id: "clay", label: "Clay" },
  { id: "brushed", label: "Brushed" },
  { id: "chrome", label: "Chrome" },
];

const BACKGROUNDS = [
  { id: "light", label: "Light", style: "radial-gradient(120% 90% at 50% 30%, #ffffff 0%, #eef0f3 65%, #e4e7eb 100%)" },
  { id: "warm", label: "Warm", style: "radial-gradient(120% 90% at 50% 30%, #faf7f2 0%, #eee7dc 70%, #e0d6c7 100%)" },
  { id: "dark", label: "Dark", style: "radial-gradient(120% 90% at 50% 30%, #1a1c20 0%, #0d0e11 70%, #060708 100%)" },
] as const;

type BgId = (typeof BACKGROUNDS)[number]["id"];

export default function Robot3DTestPage() {
  const [material, setMaterial] = useState<MaterialPreset>("clay");
  const [bg, setBg] = useState<BgId>("light");

  const bgStyle = BACKGROUNDS.find((b) => b.id === bg)!.style;
  const dark = bg === "dark";

  return (
    <main
      className="min-h-screen w-full flex flex-col"
      style={{ background: bgStyle }}
    >
      <header
        className={`px-6 py-4 flex items-baseline justify-between border-b ${
          dark ? "border-white/10" : "border-neutral-200/70"
        }`}
      >
        <h1
          className={`text-sm font-medium tracking-tight ${
            dark ? "text-neutral-200" : "text-neutral-700"
          }`}
        >
          G1 · 3D prototype
        </h1>
        <span
          className={`text-[12px] tracking-tight ${
            dark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          Drag to orbit · scroll to zoom · right-drag to pan
        </span>
      </header>

      <div className="flex-1 min-h-0">
        <Robot3D
          urdfUrl="/3d/g1/g1_23dof.urdf"
          meshBase="/3d/g1"
          material={material}
          className="w-full h-full"
        />
      </div>

      {/* Floating control rail */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50">
        <Pills
          label="Material"
          dark={dark}
          options={MATERIALS}
          value={material}
          onChange={setMaterial}
        />
        <Pills
          label="Background"
          dark={dark}
          options={BACKGROUNDS.map((b) => ({ id: b.id, label: b.label }))}
          value={bg}
          onChange={setBg}
        />
      </div>
    </main>
  );
}

function Pills<T extends string>({
  label,
  options,
  value,
  onChange,
  dark,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  dark: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full px-1 py-1 backdrop-blur-md ${
        dark
          ? "bg-white/10 border border-white/15"
          : "bg-white/70 border border-neutral-200/70 shadow-sm"
      }`}
    >
      <span
        className={`text-[11px] tracking-tight px-2 ${
          dark ? "text-neutral-300" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`text-[12px] tracking-tight px-3 py-1 rounded-full transition-colors ${
              active
                ? dark
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-900 text-white"
                : dark
                  ? "text-neutral-200 hover:bg-white/10"
                  : "text-neutral-600 hover:bg-neutral-900/5"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
