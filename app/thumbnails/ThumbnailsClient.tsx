"use client";

import { useMemo, useState } from "react";
import { humanoids } from "@/data/humanoids";
import {
  SINGLE_DEFAULTS,
  COMPARE_DEFAULTS,
  type SingleKnobs,
  type CompareKnobs,
  type TextMode,
} from "@/app/api/og/[id]/knobs";

const TEXT_MODES: TextMode[] = ["none", "url", "name"];

type Mode = "single" | "compare";

const sortedBots = [...humanoids].sort((a, b) =>
  `${a.manufacturer} ${a.name}`.localeCompare(`${b.manufacturer} ${b.name}`)
);

function encodeKnobs<T extends Record<string, unknown>>(obj: T, defaults: T) {
  const sp = new URLSearchParams();
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    const d = defaults[key];
    if (v === d) continue;
    if (typeof v === "boolean") sp.set(key, v ? "1" : "0");
    else sp.set(key, String(v));
  }
  return sp;
}

function diffKnobs<T extends Record<string, unknown>>(current: T, defaults: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) {
    if (current[key] !== defaults[key]) out[key] = current[key];
  }
  return out;
}

export default function ThumbnailsClient() {
  const [mode, setMode] = useState<Mode>("single");
  const [leftId, setLeftId] = useState<string>(sortedBots[0]?.id ?? "1");
  const [rightId, setRightId] = useState<string>(sortedBots[1]?.id ?? "2");
  const [single, setSingle] = useState<SingleKnobs>({ ...SINGLE_DEFAULTS });
  const [compare, setCompare] = useState<CompareKnobs>({ ...COMPARE_DEFAULTS });
  const [bust, setBust] = useState(0);

  const url = useMemo(() => {
    if (mode === "single") {
      const sp = encodeKnobs(single, SINGLE_DEFAULTS);
      sp.set("_", String(bust));
      const qs = sp.toString();
      return `/api/og/${leftId}${qs ? `?${qs}` : ""}`;
    } else {
      const sp = encodeKnobs(compare, COMPARE_DEFAULTS);
      sp.set("compare", rightId);
      sp.set("_", String(bust));
      return `/api/og/${leftId}?${sp.toString()}`;
    }
  }, [mode, leftId, rightId, single, compare, bust]);

  const copyConfig = async () => {
    const diff =
      mode === "single"
        ? diffKnobs(single, SINGLE_DEFAULTS)
        : diffKnobs(compare, COMPARE_DEFAULTS);
    const full = mode === "single" ? single : compare;
    const block = [
      `// ${mode === "single" ? "SingleCard" : "CompareCard"} — tuned config`,
      `// diff vs defaults:`,
      JSON.stringify(diff, null, 2),
      ``,
      `// full values:`,
      JSON.stringify(full, null, 2),
    ].join("\n");
    await navigator.clipboard.writeText(block);
  };

  const resetKnobs = () => {
    if (mode === "single") setSingle({ ...SINGLE_DEFAULTS });
    else setCompare({ ...COMPARE_DEFAULTS });
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 13 }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 320,
          padding: 20,
          borderRight: "1px solid #1f1f1f",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "#111",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Thumbnails sandbox</div>
          <div style={{ fontSize: 11, color: "#666" }}>dev-only · tune OG images live</div>
        </div>

        <section>
          <Label>Mode</Label>
          <div style={{ display: "flex", gap: 6 }}>
            <SegButton active={mode === "single"} onClick={() => setMode("single")}>Single</SegButton>
            <SegButton active={mode === "compare"} onClick={() => setMode("compare")}>Compare</SegButton>
          </div>
        </section>

        <section>
          <Label>Robot {mode === "compare" ? "(left)" : ""}</Label>
          <BotPicker value={leftId} onChange={setLeftId} />
        </section>

        {mode === "compare" && (
          <section>
            <Label>Robot (right)</Label>
            <BotPicker value={rightId} onChange={setRightId} />
          </section>
        )}

        <div style={{ height: 1, background: "#1f1f1f", margin: "4px 0" }} />

        {mode === "single" ? (
          <SingleKnobsPanel k={single} set={setSingle} />
        ) : (
          <CompareKnobsPanel k={compare} set={setCompare} />
        )}

        <div style={{ height: 1, background: "#1f1f1f", margin: "4px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={copyConfig} style={primaryBtn}>
            Copy config
          </button>
          <button onClick={resetKnobs} style={ghostBtn}>
            Reset to defaults
          </button>
          <button onClick={() => setBust((n) => n + 1)} style={ghostBtn}>
            Re-render
          </button>
        </div>
      </aside>

      {/* Preview */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          overflow: "auto",
        }}
      >
        <PreviewFrame url={url} />
      </main>
    </div>
  );
}

function PreviewFrame({ url }: { url: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ fontSize: 11, color: "#666" }}>Actual size — 1200 × 630</div>
      <div
        style={{
          width: 1200,
          height: 630,
          maxWidth: "calc(100vw - 400px)",
          aspectRatio: "1200 / 630",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px #222",
          borderRadius: 4,
          overflow: "hidden",
          background: "white",
        }}
      >
        {/* key forces a reload on url change */}
        <img
          key={url}
          src={url}
          alt="OG preview"
          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        />
      </div>
      <div style={{ fontSize: 11, color: "#444", userSelect: "all", fontFamily: "ui-monospace, monospace", maxWidth: "80vw", wordBreak: "break-all", textAlign: "center" }}>
        {url}
      </div>
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────

function SingleKnobsPanel({
  k,
  set,
}: {
  k: SingleKnobs;
  set: React.Dispatch<React.SetStateAction<SingleKnobs>>;
}) {
  const upd = <K extends keyof SingleKnobs>(key: K, v: SingleKnobs[K]) =>
    set((prev) => ({ ...prev, [key]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TextModeSelector value={k.textMode} onChange={(v) => upd("textMode", v)} />
      <Slider label="Padding X" value={k.basePadX} onChange={(v) => upd("basePadX", v)} min={0} max={200} />
      <Slider label="Bottom padding" value={k.basePadBottom} onChange={(v) => upd("basePadBottom", v)} min={0} max={100} />
    </div>
  );
}

function CompareKnobsPanel({
  k,
  set,
}: {
  k: CompareKnobs;
  set: React.Dispatch<React.SetStateAction<CompareKnobs>>;
}) {
  const upd = <K extends keyof CompareKnobs>(key: K, v: CompareKnobs[K]) =>
    set((prev) => ({ ...prev, [key]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TextModeSelector value={k.textMode} onChange={(v) => upd("textMode", v)} />
      <Toggle label="Show divider" value={k.showDivider} onChange={(v) => upd("showDivider", v)} />
      <Slider label="Padding X" value={k.basePadX} onChange={(v) => upd("basePadX", v)} min={0} max={150} />
      <Slider label="Bottom padding" value={k.basePadBottom} onChange={(v) => upd("basePadBottom", v)} min={0} max={100} />
    </div>
  );
}

function TextModeSelector({
  value,
  onChange,
}: {
  value: TextMode;
  onChange: (v: TextMode) => void;
}) {
  return (
    <div>
      <Label>Text mode</Label>
      <div style={{ display: "flex", gap: 6 }}>
        {TEXT_MODES.map((mode) => (
          <SegButton key={mode} active={value === mode} onClick={() => onChange(mode)}>
            {mode}
          </SegButton>
        ))}
      </div>
    </div>
  );
}

// ── Controls ─────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 10px",
        fontSize: 12,
        background: active ? "#2563eb" : "#1a1a1a",
        color: active ? "white" : "#aaa",
        border: "none",
        borderRadius: 5,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function BotPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "6px 8px",
        background: "#1a1a1a",
        color: "#e5e5e5",
        border: "1px solid #2a2a2a",
        borderRadius: 5,
        fontSize: 12,
        fontFamily: "inherit",
      }}
    >
      {sortedBots.map((b) => (
        <option key={b.id} value={b.id}>
          {b.manufacturer} — {b.name} {b.year ? `(${b.year})` : ""}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
      <span style={{ color: "#ccc" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 34,
          height: 20,
          borderRadius: 10,
          background: value ? "#2563eb" : "#2a2a2a",
          border: "none",
          position: "relative",
          cursor: "pointer",
          transition: "background 120ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: "white",
            transition: "left 120ms",
          }}
        />
      </button>
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#ccc", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: "#888", fontFamily: "ui-monospace, monospace" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#2563eb" }}
      />
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "#1a1a1a",
  color: "#aaa",
  border: "1px solid #2a2a2a",
  borderRadius: 5,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
