"use client";

import { useMemo, useState } from "react";
import { humanoids } from "@/data/humanoids";
import { SINGLE_DEFAULTS, type SingleKnobs } from "@/app/api/og/[id]/knobs";

const PRESETS: { name: string; overrides: Partial<SingleKnobs> }[] = [
  { name: "Full", overrides: {} },
  {
    name: "Image + name",
    overrides: {
      showManufacturer: false,
      showStats: false,
      showBadge: false,
      showLogo: false,
    },
  },
  {
    name: "Pure image",
    overrides: {
      showName: false,
      showManufacturer: false,
      showStats: false,
      showBadge: false,
      showLogo: false,
      showWatermark: false,
      imagePanelBg: "#ffffff",
    },
  },
];

const TOGGLE_KEYS: (keyof SingleKnobs)[] = [
  "showName",
  "showManufacturer",
  "showStats",
  "showBadge",
  "showLogo",
  "showWatermark",
];

const SLIDERS: { key: keyof SingleKnobs; label: string; min: number; max: number; step?: number }[] = [
  { key: "imagePanelW", label: "Image panel W", min: 200, max: 1200, step: 10 },
  { key: "imagePadX", label: "Pad X", min: 0, max: 200 },
  { key: "imagePadY", label: "Pad Y", min: 0, max: 200 },
  { key: "imageOffsetY", label: "Image offset Y", min: -200, max: 200 },
  { key: "imageW", label: "Image W", min: 100, max: 1100, step: 10 },
  { key: "imageH", label: "Image H", min: 100, max: 620, step: 10 },
  { key: "nameSize", label: "Name size", min: 16, max: 140 },
  { key: "manufacturerSize", label: "Manufacturer size", min: 10, max: 60 },
  { key: "statLabelSize", label: "Stat label size", min: 8, max: 32 },
  { key: "statValueSize", label: "Stat value size", min: 10, max: 60 },
];

function buildQuery(k: SingleKnobs): string {
  const params = new URLSearchParams();
  (Object.keys(k) as (keyof SingleKnobs)[]).forEach((key) => {
    const v = k[key];
    const def = SINGLE_DEFAULTS[key];
    if (v === def) return;
    if (typeof v === "boolean") params.set(key, v ? "1" : "0");
    else params.set(key, String(v));
  });
  return params.toString();
}

export default function EditorPage() {
  const [botId, setBotId] = useState(humanoids[0]?.id ?? "");
  const [k, setK] = useState<SingleKnobs>(SINGLE_DEFAULTS);
  const [copied, setCopied] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);

  const query = useMemo(() => buildQuery(k), [k]);
  const previewUrl = `/api/og/${botId}${query ? `?${query}` : ""}`;
  // Cache-bust on each knob change so the preview <img> refetches.
  const previewSrc = `${previewUrl}${query ? "&" : "?"}t=${query}`;

  const setKnob = <K extends keyof SingleKnobs>(key: K, v: SingleKnobs[K]) =>
    setK((prev) => ({ ...prev, [key]: v }));

  const applyPreset = (overrides: Partial<SingleKnobs>) =>
    setK({ ...SINGLE_DEFAULTS, ...overrides });

  const copyUrl = async () => {
    const abs = `${window.location.origin}${previewUrl}`;
    await navigator.clipboard.writeText(abs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const defaultsSnippet = useMemo(() => {
    const lines = (Object.keys(k) as (keyof SingleKnobs)[]).map((key) => {
      const v = k[key];
      const printed = typeof v === "string" ? `"${v}"` : v;
      return `  ${key}: ${printed},`;
    });
    return `export const SINGLE_DEFAULTS: SingleKnobs = {\n${lines.join("\n")}\n};`;
  }, [k]);

  return (
    <div className="flex h-screen w-full bg-neutral-50 text-neutral-900">
      <aside className="w-[340px] flex-shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          <div>
            <h1 className="text-[13px] font-semibold tracking-tight">OG Editor</h1>
            <p className="text-[11px] text-neutral-500 mt-0.5">Single-bot share image · 1200×630</p>
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
            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Presets</label>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p.overrides)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Show</label>
            <div className="flex flex-wrap gap-1">
              {TOGGLE_KEYS.map((key) => {
                const on = k[key] as boolean;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKnob(key, !on)}
                    className="text-[11px] px-2.5 py-1 rounded-md transition-colors"
                    style={{
                      background: on ? "#1a1a1a" : "#f0f0f0",
                      color: on ? "#fff" : "#666",
                    }}
                  >
                    {key.replace(/^show/, "")}
                  </button>
                );
              })}
            </div>
          </div>

          {SLIDERS.map((s) => {
            const v = k[s.key] as number;
            return (
              <div key={s.key}>
                <label className="flex justify-between text-[10px] text-neutral-500">
                  <span>{s.label}</span>
                  <span className="tabular-nums text-neutral-400">{v}</span>
                </label>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step ?? 1}
                  value={v}
                  onChange={(e) => setKnob(s.key, Number(e.target.value) as never)}
                  className="w-full accent-neutral-900 h-1"
                />
              </div>
            );
          })}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">Panel background</label>
            <div className="flex items-center gap-1.5">
              {["#ffffff", "#fafafa", "#f5f5f5", "#efefef", "#f4f1eb"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setKnob("imagePanelBg", c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    border: k.imagePanelBg === c ? "1.5px solid #1a1a1a" : "1px solid #e5e5e5",
                  }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={k.imagePanelBg}
                onChange={(e) => setKnob("imagePanelBg", e.target.value)}
                className="w-6 h-6 rounded-full ml-1 cursor-pointer border border-neutral-200"
                style={{ padding: 0 }}
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={copyUrl}
              className="w-full text-[11px] px-3 py-1.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              {copied ? "Copied URL" : "Copy preview URL"}
            </button>
            <button
              type="button"
              onClick={() => setShowSnippet((v) => !v)}
              className="w-full text-[11px] px-3 py-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              {showSnippet ? "Hide" : "Show"} defaults snippet
            </button>
            {showSnippet && (
              <textarea
                readOnly
                value={defaultsSnippet}
                className="w-full h-[220px] mt-1 text-[10px] font-mono rounded-md border border-neutral-200 bg-neutral-50 p-2"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            )}
            <button
              type="button"
              onClick={() => setK(SINGLE_DEFAULTS)}
              className="w-full text-[11px] px-3 py-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              Reset to defaults
            </button>
          </div>
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
