/**
 * Generates comparison blurbs (short + long) for every pair of humanoid robots.
 *
 * Usage:
 *   npx tsx scripts/generate-compare-blurbs.ts           → fill missing fields
 *   npx tsx scripts/generate-compare-blurbs.ts --preview → 8 sample pairs (writes to JSON)
 *   npx tsx scripts/generate-compare-blurbs.ts --force   → clear and regenerate everything
 *
 * Requires ANTHROPIC_API_KEY in your environment (or .env.local).
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

import { humanoids } from "../data/humanoids";

const OUT = path.join(process.cwd(), "data/compare-blurbs.json");
const CONCURRENCY = 5;
const args = process.argv.slice(2);
const PREVIEW = args.includes("--preview");
const FORCE = args.includes("--force");

const PREVIEW_PAIRS = [
  ["legend-1", "1"],       // ASIMO vs Optimus Gen 2
  ["26", "2"],             // Hydraulic Atlas vs Electric Atlas
  ["21", "7"],             // Pepper vs Figure 02
  ["25", "11"],            // Roboy vs G1
  ["20", "5"],             // Ameca vs Digit
  ["4", "17"],             // Neo vs Tiangong
  ["12", "legend-1"],      // H1 vs ASIMO
  ["legend-2", "8"],       // Sophia vs Phoenix
];

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

function robotSummary(h: (typeof humanoids)[0]) {
  const parts = [
    `${h.name} by ${h.manufacturer}`,
    h.year ? `(${h.year})` : null,
    h.status ? h.status : null,
    h.height ? `${h.height} cm` : null,
    h.weight ? `${h.weight} kg` : null,
    h.dof ? `${h.dof} DOF` : null,
    h.maxSpeed ? `${h.maxSpeed} m/s max speed` : null,
  ].filter(Boolean);
  const desc = h.description ? ` — "${h.description.slice(0, 120)}"` : "";
  return parts.join(", ") + desc;
}

// ─── EDIT THESE PROMPTS TO TUNE STYLE ──────────────────────────────────────
function buildShortPrompt(a: (typeof humanoids)[0], b: (typeof humanoids)[0]) {
  return `Write ONE sentence comparing these two robots for a design-forward robotics index. Tone: casual and informative — like a knowledgeable friend giving you the quick version. The sentence must directly contrast the two robots using a connector like "while", "but", "where", or "vs" — not two parallel facts side by side. Pick the single most interesting real difference (mechanism, purpose, era, capability — whatever stands out). No dramatic flourishes, no contrived endings, no jargon. Target 60–80 characters total.

Robot A: ${robotSummary(a)}
Robot B: ${robotSummary(b)}

Reply with the sentence only. No quotes, no explanation.`;
}

function buildLongPrompt(a: (typeof humanoids)[0], b: (typeof humanoids)[0], short: string) {
  return `Write a short paragraph (3 sentences, ~240–320 characters total) expanding on the comparison between these two robots for a design-forward robotics index. Tone: casual and informative — like a knowledgeable friend giving you the deeper take. Build on the short blurb without repeating its exact phrases. Add real context: why this difference matters, era, market position, technical lineage, who each robot is for. No dramatic flourishes, no jargon, no metaphors. Don't pile up stats — give context and intent.

Robot A: ${robotSummary(a)}
Robot B: ${robotSummary(b)}
Short blurb already shown above this paragraph: "${short}"

Output the paragraph only — no quotes, no preamble, no headings.`;
}
// ────────────────────────────────────────────────────────────────────────────

type Entry = { short: string; long: string };

async function callOpus(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return text.replace(/^["']|["']$/g, "");
}

async function generateShort(client: Anthropic, a: (typeof humanoids)[0], b: (typeof humanoids)[0]): Promise<string> {
  return callOpus(client, buildShortPrompt(a, b), 120);
}

async function generateLong(client: Anthropic, a: (typeof humanoids)[0], b: (typeof humanoids)[0], short: string): Promise<string> {
  return callOpus(client, buildLongPrompt(a, b, short), 220);
}

function normalizeEntry(raw: string | Entry | undefined): Entry {
  if (!raw) return { short: "", long: "" };
  if (typeof raw === "string") return { short: raw, long: "" };
  return { short: raw.short ?? "", long: raw.long ?? "" };
}

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  if (PREVIEW) {
    console.log("── PREVIEW MODE (8 sample pairs, writing to JSON) ──\n");
    const raw: Record<string, string | Entry> = fs.existsSync(OUT)
      ? JSON.parse(fs.readFileSync(OUT, "utf8"))
      : {};
    const existing: Record<string, Entry> = {};
    for (const k of Object.keys(raw)) existing[k] = normalizeEntry(raw[k]);

    for (const [idA, idB] of PREVIEW_PAIRS) {
      const a = humanoids.find(h => h.id === idA);
      const b = humanoids.find(h => h.id === idB);
      if (!a || !b) { console.log(`skipping unknown pair: ${idA} / ${idB}`); continue; }
      const short = await generateShort(client, a, b);
      const long = await generateLong(client, a, b, short);
      const key = pairKey(a.id, b.id);
      existing[key] = { short, long };
      console.log(`${a.name} × ${b.name}\n  short (${short.length}c): ${short}\n  long  (${long.length}c): ${long}\n`);
    }
    fs.writeFileSync(OUT, JSON.stringify(existing, null, 2));
    console.log("Written to data/compare-blurbs.json");
    return;
  }

  const raw: Record<string, string | Entry> = (!FORCE && fs.existsSync(OUT))
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {};

  const results: Record<string, Entry> = {};
  for (let i = 0; i < humanoids.length; i++) {
    for (let j = i + 1; j < humanoids.length; j++) {
      const key = pairKey(humanoids[i].id, humanoids[j].id);
      results[key] = normalizeEntry(raw[key]);
    }
  }

  const work: Array<{ a: typeof humanoids[0]; b: typeof humanoids[0]; field: "short" | "long" }> = [];
  for (let i = 0; i < humanoids.length; i++) {
    for (let j = i + 1; j < humanoids.length; j++) {
      const key = pairKey(humanoids[i].id, humanoids[j].id);
      if (!results[key].short) work.push({ a: humanoids[i], b: humanoids[j], field: "short" });
      if (!results[key].long) work.push({ a: humanoids[i], b: humanoids[j], field: "long" });
    }
  }

  if (work.length === 0) {
    console.log("All pairs already generated.");
    return;
  }

  console.log(`Generating ${work.length} fields (${work.filter(w => w.field === "short").length} short, ${work.filter(w => w.field === "long").length} long)…`);
  let done = 0;

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const batch = work.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ({ a, b, field }) => {
      const key = pairKey(a.id, b.id);
      try {
        if (field === "short") {
          results[key].short = await generateShort(client, a, b);
        } else {
          if (!results[key].short) {
            results[key].short = await generateShort(client, a, b);
          }
          results[key].long = await generateLong(client, a, b, results[key].short);
        }
        done++;
        console.log(`[${done}/${work.length}] ${a.name} × ${b.name} · ${field}: ${results[key][field]}`);
      } catch (err) {
        console.error(`  ✗ ${a.name} × ${b.name} · ${field}:`, err);
      }
    }));
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  }

  console.log(`\nDone. ${done} fields written to data/compare-blurbs.json`);
}

run().catch(console.error);
