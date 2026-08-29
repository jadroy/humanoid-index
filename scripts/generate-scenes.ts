/**
 * Generates marketing-style environment scenes for each humanoid using
 * Gemini image editing ("Nano Banana") — the robot's own cutout is passed as a
 * reference image so the actual robot appears in the scene.
 *
 * Usage:
 *   npx tsx scripts/generate-scenes.ts --preview        → 3 robots (Neo, G1, Digit), 3 variants each
 *   npx tsx scripts/generate-scenes.ts --id 4           → one robot, 3 variants
 *   npx tsx scripts/generate-scenes.ts                  → every robot missing a picked scene
 *
 * Candidates land in public/scenes/candidates/<id>-<n>.png — review in Finder,
 * copy the winner to public/scenes/<slug>.png and set sceneUrl on the robot.
 *
 * Requires GEMINI_API_KEY in your environment (or .env.local).
 */

import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

import { humanoids, type Humanoid } from "../data/humanoids";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY (get one at https://aistudio.google.com/apikey)");
  process.exit(1);
}

const MODEL = "gemini-3.1-flash-image"; // Nano Banana 2; upgrade winners with gemini-3-pro-image-preview
const OUT_DIR = path.join(process.cwd(), "public/scenes/candidates");
const VARIANTS = 3;

const args = process.argv.slice(2);
const PREVIEW = args.includes("--preview");
const idFlag = args.indexOf("--id");
const ONLY_ID = idFlag !== -1 ? args[idFlag + 1] : undefined;
const PREVIEW_IDS = ["4", "11", "5"]; // Neo, G1, Digit — one per role family

// Setting + action picked by useCase. The action is what kills the "staged
// mannequin" look — the robot is caught doing its job, not posing.
const SETTINGS: Record<string, string> = {
  Home: "walking through a real lived-in home — morning light through windows, a book left on the sofa, a plant slightly out of frame — caught mid-stride heading toward the kitchen",
  Industrial: "working on a real factory floor with worn concrete, cable trays and equipment in the background, caught mid-task at a workstation",
  Logistics: "carrying a rigid gray plastic storage bin held in front with both arms, walking through a working warehouse aisle, boxes imperfectly stacked, caught mid-stride",
  Research: "walking across a robotics lab with cables, monitors and tools visible on benches, a whiteboard with faint scribbles in the background, caught mid-stride",
  Service: "walking through an office lobby with people-scale furniture, coffee cups on a table, natural daylight from large windows, caught mid-stride",
  Security: "patrolling a building atrium at dusk, warm interior light spilling across the floor, caught mid-stride",
  Showcase: "walking across an outdoor plaza at golden hour, long soft shadows, architecture out of focus behind it, caught mid-stride",
};
const DEFAULT_SETTING = SETTINGS.Showcase;

// One shared art direction — photographic, not staged. Consistency across the
// grid is what reads as "designed".
function prompt(r: Humanoid) {
  const setting = SETTINGS[r.useCase ?? ""] ?? DEFAULT_SETTING;
  return (
    `Place this exact robot, unchanged, into a candid photograph: ${setting}. ` +
    `This must look like a real photo from a press kit, not a render: shot on a full-frame camera with a 35mm lens ` +
    `at eye level, natural available light only, true-to-life color, slight environmental haze and dust in the air, ` +
    `subtle motion blur on the background, realistic contact shadows and reflections grounding the robot. ` +
    `The environment is a quiet backdrop: low contrast, soft muted tones, gently faded as if slightly overexposed, ` +
    `no strong highlights or deep shadows in the background — the robot is the only crisp, full-contrast element in the frame. ` +
    `The robot occupies roughly 40% of the frame, off-center. ` +
    `Preserve the robot's exact proportions, colors, materials and joints — do not redesign it. ` +
    `Absolutely no text, lettering, logos or symbols anywhere in the image, including on the robot's body. ` +
    `No people's faces, no watermarks, no other robots. Landscape 3:2 composition.`
  );
}

function refImage(r: Humanoid): { data: string; mime: string } | null {
  if (!r.imageUrl?.startsWith("/")) return null;
  const p = path.join(process.cwd(), "public", r.imageUrl);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { data: fs.readFileSync(p).toString("base64"), mime };
}

async function generate(r: Humanoid, variant: number): Promise<boolean> {
  const ref = refImage(r);
  if (!ref) {
    console.warn(`  ${r.name}: no local cutout image, skipping`);
    return false;
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: ref.mime, data: ref.data } },
              { text: prompt(r) },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"], temperature: 1.0 },
      }),
    }
  );
  if (!res.ok) {
    console.error(`  ${r.name} v${variant}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
    return false;
  }
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
  if (!part) {
    console.error(`  ${r.name} v${variant}: no image in response`);
    return false;
  }
  const out = path.join(OUT_DIR, `${r.id}-${variant}.png`);
  fs.writeFileSync(out, Buffer.from(part.inlineData.data, "base64"));
  console.log(`  ✓ ${r.name} v${variant} → ${path.relative(process.cwd(), out)}`);
  return true;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let targets = humanoids.filter((r) => r.imageUrl);
  if (ONLY_ID) targets = targets.filter((r) => r.id === ONLY_ID);
  else if (PREVIEW) targets = targets.filter((r) => PREVIEW_IDS.includes(r.id));
  else targets = targets.filter((r) => !r.sceneUrl);

  console.log(`Generating ${VARIANTS} variants for ${targets.length} robot(s)…`);
  for (const r of targets) {
    console.log(`${r.name} (${r.useCase ?? "no role"})`);
    for (let v = 1; v <= VARIANTS; v++) await generate(r, v);
  }
  console.log(`\nDone. Review public/scenes/candidates/ and promote winners to sceneUrl.`);
}

main();
