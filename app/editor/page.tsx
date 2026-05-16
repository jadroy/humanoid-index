"use client";

import { useMemo, useState } from "react";
import { humanoids } from "@/data/humanoids";
import { SINGLE_DEFAULTS, type SingleKnobs, type TextMode } from "@/app/api/og/[id]/knobs";

const TEXT_MODES: TextMode[] = ["none", "url", "name"];

function buildQuery(k: SingleKnobs): string {
  const params = new URLSearchParams();
  (Object.keys(k) as (keyof SingleKnobs)[]).forEach((key) => {
    const v = k[key];
    const def = SINGLE_DEFAULTS[key];
    if (v === def) return;
    params.set(key, String(v));
  });
  return params.toString();
}

export default function EditorPage() {
  const [botId, setBotId] = useState(humanoids[0]?.id ?? "");
  const [k, setK] = useState<SingleKnobs>(SINGLE_DEFAULTS);

  const query = useMemo(() => buildQuery(k), [k]);
  const previewUrl = `/api/og/${botId}${query ? `?${query}` : ""}`;
  const previewSrc = `${previewUrl}${query ? "&" : "?"}t=${encodeURIComponent(query)}`;

  const setKnob = <K extends keyof SingleKnobs>(key: K, v: SingleKnobs[K]) =>
    setK((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="flex h-screen w-full bg-neutral-50 text-neutral-900">
      <aside className="w-[320px] flex-shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          <div>
            <h1 className="text-[13px] font-semibold tracking-tight">OG Editor</h1>
            <p className="text-[11px] text-neutral-500 mt-0.5">Single · 1200×630</p>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Humanoid</label>
            <select
              value={botId}
              onChange={(e) => setBotId(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px]"
            >
              {humanoids.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} · {h.manufacturer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Text mode</label>
            <div className="flex gap-1">
              {TEXT_MODES.map((mode) => {
                const on = k.textMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setKnob("textMode", mode)}
                    className="text-[11px] px-2.5 py-1 rounded-md transition-colors flex-1"
                    style={{
                      background: on ? "#1a1a1a" : "#f0f0f0",
                      color: on ? "#fff" : "#666",
                    }}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex justify-between text-[10px] text-neutral-500">
              <span>Padding top</span>
              <span className="tabular-nums text-neutral-400">{k.basePadTop}</span>
            </label>
            <input
              type="range"
              min={0}
              max={160}
              value={k.basePadTop}
              onChange={(e) => setKnob("basePadTop", Number(e.target.value))}
              className="w-full accent-neutral-900 h-1"
            />
          </div>

          <div>
            <label className="flex justify-between text-[10px] text-neutral-500">
              <span>Padding X</span>
              <span className="tabular-nums text-neutral-400">{k.basePadX}</span>
            </label>
            <input
              type="range"
              min={0}
              max={200}
              value={k.basePadX}
              onChange={(e) => setKnob("basePadX", Number(e.target.value))}
              className="w-full accent-neutral-900 h-1"
            />
          </div>

          <div>
            <label className="flex justify-between text-[10px] text-neutral-500">
              <span>Padding bottom (non-cutoff)</span>
              <span className="tabular-nums text-neutral-400">{k.basePadBottom}</span>
            </label>
            <input
              type="range"
              min={0}
              max={160}
              value={k.basePadBottom}
              onChange={(e) => setKnob("basePadBottom", Number(e.target.value))}
              className="w-full accent-neutral-900 h-1"
            />
          </div>

          <div>
            <label className="flex justify-between text-[10px] text-neutral-500">
              <span>Bottom fade height (cutoff)</span>
              <span className="tabular-nums text-neutral-400">{k.bottomFadeH}</span>
            </label>
            <input
              type="range"
              min={0}
              max={180}
              value={k.bottomFadeH}
              onChange={(e) => setKnob("bottomFadeH", Number(e.target.value))}
              className="w-full accent-neutral-900 h-1"
            />
          </div>

          <div>
            <label className="flex justify-between text-[10px] text-neutral-500">
              <span>Bottom fade opacity</span>
              <span className="tabular-nums text-neutral-400">{k.bottomFadeOpacity.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={k.bottomFadeOpacity}
              onChange={(e) => setKnob("bottomFadeOpacity", Number(e.target.value))}
              className="w-full accent-neutral-900 h-1"
            />
          </div>

          <button
            type="button"
            onClick={() => setK(SINGLE_DEFAULTS)}
            className="w-full text-[11px] px-3 py-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            Reset
          </button>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[11px] text-neutral-400 tabular-nums">1200 × 630</div>
          <div
            className="rounded-lg overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            style={{ width: 900, height: 472.5 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt="OG preview"
              width={900}
              height={472.5}
              style={{ display: "block", width: "100%", height: "100%" }}
            />
          </div>
          <div className="text-[10px] text-neutral-400 font-mono break-all max-w-[900px] text-center">
            {previewUrl}
          </div>
        </div>
      </main>
    </div>
  );
}
