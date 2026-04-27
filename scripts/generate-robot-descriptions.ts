/**
 * Generates display descriptions for every humanoid robot.
 *
 * Usage:
 *   npx tsx scripts/generate-robot-descriptions.ts           → generate missing
 *   npx tsx scripts/generate-robot-descriptions.ts --preview → print samples without saving
 *   npx tsx scripts/generate-robot-descriptions.ts --force   → clear and regenerate all
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

const OUT = path.join(process.cwd(), "data/robot-descriptions.json");
const CONCURRENCY = 5;
const args = process.argv.slice(2);
const PREVIEW = args.includes("--preview");
const FORCE = args.includes("--force");

const PREVIEW_IDS = ["legend-1", "26", "21", "1", "20", "25", "11", "8"];

// ─── EDIT THIS PROMPT TO TUNE STYLE ────────────────────────────────────────
function buildPrompt(h: (typeof humanoids)[0]) {
  const stats = [
    h.height ? `${h.height} cm` : null,
    h.weight ? `${h.weight} kg` : null,
    h.dof ? `${h.dof} DOF` : null,
    h.maxSpeed ? `${h.maxSpeed} m/s` : null,
  ].filter(Boolean).join(", ");

  return `Write exactly 2 punchy sentences about this humanoid robot. Each sentence max 8 words — short, sharp, like a caption. Plain language, no jargon (no: bipedal, articulation, locomotion, dexterity, paradigm). Lead with what's interesting or unusual about it.

Robot: ${h.name} by ${h.manufacturer}${h.year ? `, ${h.year}` : ""}${h.status ? `, ${h.status}` : ""}.
${stats ? `Stats: ${stats}.` : ""}
${h.description ? `Context: ${h.description}` : ""}

Reply with the 2 sentences only. No quotes, no explanation.`;
}
// ────────────────────────────────────────────────────────────────────────────

async function generateDescription(
  client: Anthropic,
  h: (typeof humanoids)[0]
): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 70,
    messages: [{ role: "user", content: buildPrompt(h) }],
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
    console.log("── PREVIEW MODE ──\n");
    const samples = PREVIEW_IDS.map(id => humanoids.find(h => h.id === id)).filter(Boolean) as typeof humanoids;
    for (const h of samples) {
      const text = await generateDescription(client, h);
      console.log(`${h.name} (${text.length}c):\n  ${text}\n`);
    }
    return;
  }

  const existing: Record<string, string> = (!FORCE && fs.existsSync(OUT))
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {};

  const missing = humanoids.filter(h => !existing[h.id]);

  if (missing.length === 0) {
    console.log("All descriptions already generated.");
    return;
  }

  console.log(`Generating ${missing.length} descriptions…`);
  const results = { ...existing };
  let done = 0;

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (h) => {
      try {
        const text = await generateDescription(client, h);
        results[h.id] = text;
        done++;
        console.log(`[${done}/${missing.length}] ${h.name}: ${text}`);
      } catch (err) {
        console.error(`  ✗ ${h.name}:`, err);
      }
    }));
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  }

  console.log(`\nDone. ${done} descriptions written to data/robot-descriptions.json`);
}

run().catch(console.error);
