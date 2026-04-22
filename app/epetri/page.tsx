import { humanoids } from "@/data/humanoids";
import Image from "next/image";

const epetri: React.CSSProperties = {
  fontFamily: "var(--font-epetri)",
  letterSpacing: "0.02em",
};

const epetriTite: React.CSSProperties = {
  fontFamily: "var(--font-epetri-tite)",
  letterSpacing: "0.02em",
};

const epetriNum: React.CSSProperties = {
  fontFamily: "var(--font-epetri-index)",
  letterSpacing: "0",
};

const epetriCf: React.CSSProperties = {
  fontFamily: "var(--font-epetri-cfindex)",
  letterSpacing: "0",
};

const epetriPixel: React.CSSProperties = {
  fontFamily: "var(--font-epetri-pixel)",
  letterSpacing: "0.04em",
};

function pad(n: string, len = 3) {
  return n.padStart(len, "0");
}

export default function EpetriPreview() {
  const bot = humanoids.find((h) => h.id === "11")!; // Unitree G1

  return (
    <div className="min-h-screen w-full bg-[#fafafa] text-neutral-800 px-10 py-14">
      <style>{`html, body { overflow: auto !important; overscroll-behavior: auto !important; }`}</style>
      <div className="max-w-[1180px] mx-auto">
        <header className="mb-14">
          <div style={epetri} className="text-[11px] uppercase text-neutral-400 mb-2">
            Typography Study // 001
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
            Epetri in the Humanoid Index
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl leading-relaxed">
            Three ways to scope the font. Same robot, same data — the font&apos;s job changes.
            Epetri ships with AIRY + TITE widths and a purpose-built &ldquo;index&rdquo; numeric cut — almost too on-the-nose for a site named Humanoid <em>Index</em>.
          </p>
        </header>

        {/* ── Type specimen — the cuts in the family ─────────────── */}
        <section className="mb-16">
          <div className="flex items-baseline gap-4 border-b border-neutral-200 pb-3">
            <span style={epetri} className="text-[11px] uppercase text-neutral-400">Fig. 0</span>
            <h2 className="text-lg font-medium text-neutral-900 tracking-tight">The family</h2>
            <span className="text-[12px] text-neutral-500 ml-auto">16 cuts. These are the ones we&apos;ll pull from.</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <SpecimenRow label="Epetri · AIRY · regular" sample="Humanoid Index 2026" fontFamily="var(--font-epetri)" weight={400} />
            <SpecimenRow label="Epetri · AIRY · bold" sample="Humanoid Index 2026" fontFamily="var(--font-epetri)" weight={700} />
            <SpecimenRow label="Epetri · AIRY · anorexic" sample="Humanoid Index 2026" fontFamily="var(--font-epetri)" weight={200} />
            <SpecimenRow label="Epetri · TITE · regular" sample="Humanoid Index 2026" fontFamily="var(--font-epetri-tite)" weight={400} />
            <SpecimenRow label="Epetri · bold1-index (numeric)" sample="0 1 2 3 4 5 6 7 8 9 · 011" fontFamily="var(--font-epetri-index)" weight={700} />
            <SpecimenRow label="Epetri · bold1-CFIndex" sample="0 1 2 3 4 5 6 7 8 9 · 011" fontFamily="var(--font-epetri-cfindex)" weight={700} />
            <SpecimenRow label="Epetri · AIRY · pixelcrack" sample="humanoid-index.com" fontFamily="var(--font-epetri-pixel)" weight={400} />
            <SpecimenRow label="Epetri · AIRY · regular · 40px" sample="H.127 M.35 DOF.23" fontFamily="var(--font-epetri)" weight={400} size={40} />
          </div>
        </section>

        {/* ── A. Specimen labels ───────────────────────────────────── */}
        <section className="mb-20">
          <SectionTag index="A" title="Specimen labels" note="Epetri only on catalogue metadata — the humanoid as a cultured specimen." />

          <div className="grid grid-cols-[1fr_1fr] gap-5 mt-5">
            {/* Variant A1 — card with corner tag */}
            <div className="bg-white rounded-xl border border-neutral-200 aspect-[4/5] relative overflow-hidden p-6 flex flex-col">
              <div className="flex items-start justify-between">
                <div style={epetri} className="text-[10px] uppercase text-neutral-500 leading-tight">
                  <div>Specimen // {pad(bot.id)}</div>
                  <div className="text-neutral-300">Bipedal · 23 DOF</div>
                </div>
                <div style={epetri} className="text-[10px] uppercase text-neutral-400 text-right">
                  <div>H. {bot.height}cm</div>
                  <div>M. {bot.weight}kg</div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center relative my-4">
                {bot.imageUrl && (
                  <Image src={bot.imageUrl} alt={bot.name} width={280} height={380} style={{ objectFit: "contain", height: "100%", width: "auto" }} unoptimized />
                )}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-0.5">{bot.manufacturer}</div>
                  <div className="text-xl font-semibold tracking-tight text-neutral-900">{bot.name}</div>
                </div>
                <div style={epetri} className="text-[10px] uppercase text-neutral-300">
                  Rec. {bot.year}
                </div>
              </div>
            </div>

            {/* Variant A2 — full catalogue-card framing with a front sticker */}
            <div className="bg-white rounded-xl border border-neutral-200 aspect-[4/5] relative overflow-hidden flex flex-col">
              {/* top strip */}
              <div className="px-6 py-3 border-b border-neutral-100 flex items-center justify-between">
                <div style={epetri} className="text-[10px] uppercase text-neutral-500">
                  humanoid-index / catalogue
                </div>
                <div style={epetri} className="text-[10px] uppercase text-neutral-400">
                  {pad(bot.id)} of {pad(String(humanoids.length))}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center relative">
                {bot.imageUrl && (
                  <Image src={bot.imageUrl} alt={bot.name} width={280} height={380} style={{ objectFit: "contain", height: "80%", width: "auto" }} unoptimized />
                )}

                {/* floating specimen sticker */}
                <div className="absolute left-6 bottom-6 bg-neutral-900 text-white rounded-md px-3 py-2.5 shadow-lg">
                  <div style={epetri} className="text-[9px] uppercase text-white/50 leading-tight mb-1">
                    Specimen
                  </div>
                  <div style={epetriNum} className="text-xl leading-none mb-1">
                    {pad(bot.id)}
                  </div>
                  <div style={epetri} className="text-[9px] uppercase text-white/50 leading-tight">
                    {bot.status}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-neutral-100 flex items-end justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-0.5">{bot.manufacturer}</div>
                  <div className="text-xl font-semibold tracking-tight text-neutral-900">{bot.name}</div>
                </div>
                <div style={epetri} className="text-[10px] uppercase text-neutral-300 text-right leading-tight">
                  <div>Lat. 22.5° N</div>
                  <div>Rec. {bot.year}</div>
                </div>
              </div>
            </div>
          </div>

          <Caption>
            Epetri is strictly a catalogue voice — labels, specimen ids, coordinates.
            The name &amp; manufacturer stay in your sans. Easy to ladder up: give any humanoid an unfussy ID and the whole site gains a scientific register.
          </Caption>
        </section>

        {/* ── B. Numerals only ─────────────────────────────────────── */}
        <section className="mb-20">
          <SectionTag index="B" title="Numerals only" note="Every figure on the site in Epetri. The font as texture, not voice." />

          <div className="mt-5 bg-white rounded-xl border border-neutral-200 p-8">
            <div className="grid grid-cols-[360px_1fr] gap-10 items-center">
              <div className="flex items-center justify-center">
                {bot.imageUrl && (
                  <Image src={bot.imageUrl} alt={bot.name} width={320} height={420} style={{ objectFit: "contain" }} unoptimized />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400">{bot.manufacturer}</span>
                  <span className="text-[11px] text-neutral-300">·</span>
                  <span style={epetriNum} className="text-[13px] text-neutral-500">{bot.year}</span>
                </div>
                <h2 className="text-4xl font-semibold tracking-tight text-neutral-900 mb-6">{bot.name}</h2>

                <div className="grid grid-cols-4 gap-6 max-w-[540px]">
                  <Stat label="Height" value={String(bot.height)} unit="cm" />
                  <Stat label="Weight" value={String(bot.weight)} unit="kg" />
                  <Stat label="DOF" value={String(bot.dof)} unit="" />
                  <Stat label="Speed" value={String(bot.maxSpeed)} unit="m/s" />
                </div>

                <div className="mt-8 flex items-center gap-6 text-[12px] text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Cost</span>
                    <span style={epetriNum} className="text-neutral-800">{bot.cost}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Released</span>
                    <span style={epetriNum} className="text-neutral-800">{bot.year}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Index</span>
                    <span style={epetriNum} className="text-neutral-800">#{pad(bot.id)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Caption>
            Only numbers switch; everything else stays neutral. Cheapest integration — one
            <code className="mx-1 px-1 py-0.5 bg-neutral-100 rounded text-[11px]">{`<Num>`}</code> component, swap anywhere a figure appears. Arc-dot counts, year ladder, stat blocks all pick it up for free.
          </Caption>
        </section>

        {/* ── C. Share / OG surface ────────────────────────────────── */}
        <section className="mb-16">
          <SectionTag index="C" title="Share &amp; embed only" note="Quiet in the app, loud on the artifact. Epetri is the off-site wordmark." />

          <div className="mt-5 space-y-6">
            {/* OG card mockup, 1200×630 scaled to fit 1000px width */}
            <div
              className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm mx-auto"
              style={{ width: 1000, height: 525, position: "relative" }}
            >
              <div
                style={{
                  width: 1200,
                  height: 630,
                  transform: "scale(0.8333)",
                  transformOrigin: "top left",
                  display: "flex",
                  background: "#ffffff",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                {/* image panel */}
                <div
                  style={{
                    width: 540,
                    height: 630,
                    background: "#FAFAFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    padding: 56,
                  }}
                >
                  {bot.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bot.imageUrl}
                      alt={bot.name}
                      style={{ height: "100%", width: "auto", maxWidth: "100%", objectFit: "contain", display: "block" }}
                    />
                  )}
                  {/* specimen sticker */}
                  <div style={{ position: "absolute", top: 32, left: 32, ...epetri, fontSize: 13, textTransform: "uppercase", color: "#999" }}>
                    Specimen // {pad(bot.id)}
                  </div>
                </div>

                {/* info panel */}
                <div style={{ flex: 1, padding: "64px 56px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <span style={{ fontSize: 18, color: "#888", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {bot.manufacturer} · <span style={epetriNum}>{bot.year}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 78, fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#111", marginBottom: 44 }}>
                    {bot.name}
                  </div>

                  <div style={{ display: "flex", gap: 44 }}>
                    <OgStat label="Height" value={String(bot.height)} unit="cm" />
                    <OgStat label="Weight" value={String(bot.weight)} unit="kg" />
                    <OgStat label="DOF" value={String(bot.dof)} unit="" />
                    <OgStat label="Speed" value={String(bot.maxSpeed)} unit="m/s" />
                  </div>
                </div>

                {/* wordmark bottom right in Epetri */}
                <div style={{ position: "absolute", bottom: 30, right: 44, ...epetri, fontSize: 18, color: "#bbb", textTransform: "lowercase" }}>
                  humanoid-index.com
                </div>
              </div>
            </div>

            {/* Embed widget mockup */}
            <div className="mx-auto" style={{ maxWidth: 680 }}>
              <div style={epetri} className="text-[10px] uppercase text-neutral-400 mb-2">
                Embed widget
              </div>
              <div className="rounded-lg border border-neutral-200 shadow-sm overflow-hidden bg-white" style={{ height: 200 }}>
                <div className="flex h-full">
                  <div className="w-[40%] bg-[#FAFAFA] flex items-center justify-center relative p-5">
                    {bot.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bot.imageUrl}
                        alt={bot.name}
                        style={{ height: "100%", width: "auto", maxWidth: "100%", objectFit: "contain", display: "block" }}
                      />
                    )}
                    <div style={epetri} className="absolute top-3 left-3 text-[9px] uppercase text-neutral-400">
                      //{pad(bot.id)}
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-5 relative">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                      {bot.manufacturer} · <span style={epetriNum}>{bot.year}</span>
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-neutral-900 mb-3">{bot.name}</div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                      <MiniStat label="Height" value={String(bot.height)} unit="cm" />
                      <MiniStat label="Weight" value={String(bot.weight)} unit="kg" />
                      <MiniStat label="DOF" value={String(bot.dof)} unit="" />
                      <MiniStat label="Speed" value={String(bot.maxSpeed)} unit="m/s" />
                    </div>
                    <div style={epetri} className="absolute bottom-3 right-4 text-[9px] uppercase text-neutral-300">
                      humanoid-index.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Caption>
            The app itself stays in Geist — quiet. Epetri lives on the surfaces that travel:
            OG image, embed widget, maybe the favicon wordmark. That&apos;s the brand&apos;s
            &ldquo;plumage&rdquo; — seen mostly by people who haven&apos;t yet visited the site.
          </Caption>
        </section>

        <footer className="mt-20 pt-8 border-t border-neutral-200 text-[11px] text-neutral-400 flex items-center justify-between">
          <span style={epetri} className="uppercase">Epetri · AIRY + TITE + index cuts loaded</span>
          <span style={epetriNum}>{new Date().toISOString().slice(0, 10)}</span>
        </footer>
      </div>
    </div>
  );
}

function SectionTag({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-neutral-200 pb-3">
      <span style={epetri} className="text-[11px] uppercase text-neutral-400">
        Fig. {index}
      </span>
      <h2 className="text-lg font-medium text-neutral-900 tracking-tight" dangerouslySetInnerHTML={{ __html: title }} />
      <span className="text-[12px] text-neutral-500 ml-auto text-right max-w-md">{note}</span>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[12px] text-neutral-500 leading-relaxed max-w-3xl">{children}</p>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span style={epetriNum} className="text-2xl text-neutral-900">{value}</span>
        {unit && <span className="text-[11px] text-neutral-400">{unit}</span>}
      </div>
    </div>
  );
}

function OgStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 14, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ ...epetriNum, fontSize: 36, color: "#1a1a1a" }}>{value}</span>
        {unit && <span style={{ fontSize: 14, color: "#999" }}>{unit}</span>}
      </div>
    </div>
  );
}

function SpecimenRow({
  label,
  sample,
  fontFamily,
  weight,
  size = 26,
}: {
  label: string;
  sample: string;
  fontFamily: string;
  weight: number;
  size?: number;
}) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 px-5 py-4">
      <div className="text-[9px] uppercase tracking-wider text-neutral-400 mb-2" style={{ fontFamily: "var(--font-epetri)" }}>
        {label}
      </div>
      <div
        className="text-neutral-900"
        style={{ fontFamily, fontWeight: weight, fontSize: size, lineHeight: 1.1, letterSpacing: "0.01em" }}
      >
        {sample}
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</span>
      <span style={epetriNum} className="text-neutral-900 text-[14px]">{value}</span>
      {unit && <span className="text-[10px] text-neutral-400">{unit}</span>}
    </div>
  );
}
