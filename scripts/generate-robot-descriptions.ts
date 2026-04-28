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

// ─── EDIT THESE PROMPTS TO TUNE STYLE ──────────────────────────────────────
function statsLine(h: (typeof humanoids)[0]) {
  return [
    h.height ? `${h.height} cm` : null,
    h.weight ? `${h.weight} kg` : null,
    h.dof ? `${h.dof} DOF` : null,
    h.maxSpeed ? `${h.maxSpeed} m/s` : null,
  ].filter(Boolean).join(", ");
}

function buildShortPrompt(h: (typeof humanoids)[0]) {
  const stats = statsLine(h);
  return `Write exactly 2 sentences about this robot for a design-forward robotics index. Apple copy style — confident and direct, not dramatic or poetic. Each sentence max 40 characters. Each sentence must be a complete, specific thought. Don't use brand names the reader won't recognise. No jargon, no metaphors.

Robot: ${h.name} by ${h.manufacturer}${h.year ? `, ${h.year}` : ""}${h.status ? `, ${h.status}` : ""}.
${stats ? `Stats: ${stats}.` : ""}
${h.description ? `Context: ${h.description}` : ""}

Exactly 2 sentences only. No quotes, no explanation.`;
}

function buildLongPrompt(h: (typeof humanoids)[0], short: string) {
  const stats = statsLine(h);
  return `Write a short paragraph (3–4 sentences, ~280–360 characters total) about this robot for a design-forward robotics index. Apple copy style — confident, direct, never dramatic or poetic. Each sentence is a complete, specific thought. Avoid jargon, avoid metaphors, avoid brand names the reader won't recognise. Don't pile up stats — give context, intent, what makes the robot distinct, what stage it's at, who it's for.

Robot: ${h.name} by ${h.manufacturer}${h.year ? `, ${h.year}` : ""}${h.status ? `, ${h.status}` : ""}.
${stats ? `Stats: ${stats}.` : ""}
${h.description ? `Context: ${h.description}` : ""}
Short blurb already shown above this paragraph: "${short}"

The paragraph should expand on the short blurb without repeating its exact phrases. Output the paragraph only — no quotes, no preamble, no headings.`;
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

async function generateShort(client: Anthropic, h: (typeof humanoids)[0]): Promise<string> {
  return callOpus(client, buildShortPrompt(h), 70);
}

async function generateLong(client: Anthropic, h: (typeof humanoids)[0], short: string): Promise<string> {
  return callOpus(client, buildLongPrompt(h, short), 220);
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
    console.log("── PREVIEW MODE ──\n");
    const samples = PREVIEW_IDS.map(id => humanoids.find(h => h.id === id)).filter(Boolean) as typeof humanoids;
    for (const h of samples) {
      const short = await generateShort(client, h);
      const long = await generateLong(client, h, short);
      console.log(`${h.name}\n  short (${short.length}c): ${short}\n  long  (${long.length}c): ${long}\n`);
    }
    return;
  }

  const raw: Record<string, string | Entry> = (!FORCE && fs.existsSync(OUT))
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {};

  const results: Record<string, Entry> = {};
  for (const h of humanoids) {
    results[h.id] = normalizeEntry(raw[h.id]);
  }

  const work = humanoids.flatMap(h => {
    const tasks: Array<{ h: typeof humanoids[0]; field: "short" | "long" }> = [];
    if (!results[h.id].short) tasks.push({ h, field: "short" });
    if (!results[h.id].long) tasks.push({ h, field: "long" });
    return tasks;
  });

  if (work.length === 0) {
    console.log("All descriptions already generated.");
    return;
  }

  console.log(`Generating ${work.length} fields (${work.filter(w => w.field === "short").length} short, ${work.filter(w => w.field === "long").length} long)…`);
  let done = 0;

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const batch = work.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ({ h, field }) => {
      try {
        if (field === "short") {
          const text = await generateShort(client, h);
          results[h.id].short = text;
        } else {
          // Long depends on short — make sure short exists first.
          if (!results[h.id].short) {
            results[h.id].short = await generateShort(client, h);
          }
          const text = await generateLong(client, h, results[h.id].short);
          results[h.id].long = text;
        }
        done++;
        console.log(`[${done}/${work.length}] ${h.name} · ${field}: ${results[h.id][field]}`);
      } catch (err) {
        console.error(`  ✗ ${h.name} · ${field}:`, err);
      }
    }));
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  }

  console.log(`\nDone. ${done} fields written to data/robot-descriptions.json`);
}

run().catch(console.error);
