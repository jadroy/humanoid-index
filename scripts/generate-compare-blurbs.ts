/**
 * Generates one-sentence comparison blurbs for every pair of humanoid robots.
 * Run with:  npx tsx scripts/generate-compare-blurbs.ts
 *
 * Reads existing blurbs and only generates missing pairs, so it's safe to re-run
 * when new robots are added.
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

async function generateBlurb(
  client: Anthropic,
  a: (typeof humanoids)[0],
  b: (typeof humanoids)[0]
): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    messages: [
      {
        role: "user",
        content: `Write a single sentence (max 160 characters) comparing these two humanoid robots for a design-forward robotics index. Highlight what's genuinely interesting about this specific pairing — their relationship in history, technology, scale, or philosophy. Be precise and neutral. No fluff, no marketing. Don't start with either robot's name. Don't use the word "while".

Robot A: ${robotSummary(a)}
Robot B: ${robotSummary(b)}

Reply with only the sentence, no quotes.`,
      },
    ],
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

  const existing: Record<string, string> = fs.existsSync(OUT)
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {};

  // Build list of missing pairs
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
    // Write incrementally so progress isn't lost on interruption
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  }

  console.log(`\nDone. ${done} blurbs written to data/compare-blurbs.json`);
}

run().catch(console.error);
