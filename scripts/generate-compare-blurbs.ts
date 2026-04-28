/**
 * Generates comparison blurbs for every pair of humanoid robots.
 *
 * Usage:
 *   npx tsx scripts/generate-compare-blurbs.ts           → generate all missing pairs
 *   npx tsx scripts/generate-compare-blurbs.ts --preview → generate 8 sample pairs to check style
 *   npx tsx scripts/generate-compare-blurbs.ts --force   → clear and regenerate everything
 *
 * Requires ANTHROPIC_API_KEY in your environment (or .env.local).
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// Load .env.local if present
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

// Hand-pick varied preview pairs to stress-test the prompt style
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

// ─── EDIT THIS PROMPT TO TUNE STYLE ────────────────────────────────────────
function buildPrompt(a: (typeof humanoids)[0], b: (typeof humanoids)[0]) {
  return `Write 2 sentences comparing these two robots for a design-forward robotics index. Tone: casual and informative — like a knowledgeable friend giving you the quick version, not a narrator trying to land a punchline. Each sentence should say something real and specific about the comparison. No dramatic endings, no contrived contrasts, no poetic flourishes. Each sentence max 55 characters. No jargon.

Robot A: ${robotSummary(a)}
Robot B: ${robotSummary(b)}

Reply with the 2 sentences only. No quotes, no explanation.`;
}
// ────────────────────────────────────────────────────────────────────────────

async function generateBlurb(
  client: Anthropic,
  a: (typeof humanoids)[0],
  b: (typeof humanoids)[0]
): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 120,
    messages: [{ role: "user", content: buildPrompt(a, b) }],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  return text.replace(/^["']|["']$/g, "");
}

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  if (PREVIEW) {
    console.log("── PREVIEW MODE (8 sample pairs) ──\n");
    for (const [idA, idB] of PREVIEW_PAIRS) {
      const a = humanoids.find(h => h.id === idA);
      const b = humanoids.find(h => h.id === idB);
      if (!a || !b) { console.log(`skipping unknown pair: ${idA} / ${idB}`); continue; }
      const blurb = await generateBlurb(client, a, b);
      console.log(`${a.name} × ${b.name} (${blurb.length}c):\n  ${blurb}\n`);
    }
    return;
  }

  const existing: Record<string, string> = (!FORCE && fs.existsSync(OUT))
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {};

  const missing: [typeof humanoids[0], typeof humanoids[0]][] = [];
  for (let i = 0; i < humanoids.length; i++) {
    for (let j = i + 1; j < humanoids.length; j++) {
      const key = pairKey(humanoids[i].id, humanoids[j].id);
      if (!existing[key]) missing.push([humanoids[i], humanoids[j]]);
    }
  }

  if (missing.length === 0) {
    console.log("All pairs already generated.");
    return;
  }

  console.log(`Generating ${missing.length} blurbs (${CONCURRENCY} at a time)…`);

  const results = { ...existing };
  let done = 0;

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ([a, b]) => {
        const key = pairKey(a.id, b.id);
        try {
          const blurb = await generateBlurb(client, a, b);
          results[key] = blurb;
          done++;
          console.log(`[${done}/${missing.length}] ${a.name} × ${b.name}: ${blurb}`);
        } catch (err) {
          console.error(`  ✗ ${a.name} × ${b.name}:`, err);
        }
      })
    );
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  }

  console.log(`\nDone. ${done} blurbs written to data/compare-blurbs.json`);
}

run().catch(console.error);
