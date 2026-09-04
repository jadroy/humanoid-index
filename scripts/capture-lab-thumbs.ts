/**
 * Screenshots every visible experiment on /lab into public/lab/<slug>.jpg.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/capture-lab-thumbs.ts
 *
 * Drives the Chrome that's already installed (puppeteer-core, no bundled
 * browser). Re-run it whenever a view changes — the shelf's thumbnails are the
 * one thing here that can go stale, and this is the fix.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { experiments, shotName } from "../app/lab/experiments";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "public", "lab");

// 3:2 to match the tile, at 2× so the shot stays sharp on a retina screen.
const WIDTH = 1200;
const HEIGHT = 800;
const SETTLE = 3500; // ms — images and any intro animation

// A few views open on their emptiest frame — the timeline starts in the 2000s
// where two robots sit a decade apart. Drive them somewhere worth a thumbnail.
// Views that need longer than SETTLE before they've drawn anything.
const EXTRA_WAIT: Record<string, number> = {
  "/thumbnails": 4000,  // renders its own canvas preview after the images land
  "/3d-test": 3000,     // model load
};

const SETUP: Record<string, string[]> = {
  "/timeline": ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"],
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 },
    args: ["--hide-scrollbars", "--force-device-scale-factor=2"],
  });

  const targets = experiments.filter((e) => !e.hidden && !e.soon);
  console.log(`Capturing ${targets.length} experiments from ${ORIGIN}`);

  for (const e of targets) {
    const page = await browser.newPage();
    const file = path.join(OUT, shotName(e.slug));
    try {
      await page.goto(ORIGIN + e.slug, { waitUntil: "networkidle2", timeout: 60_000 });
      await new Promise((r) => setTimeout(r, SETTLE + (EXTRA_WAIT[e.slug] ?? 0)));
      for (const key of SETUP[e.slug] ?? []) {
        await page.keyboard.press(key as Parameters<typeof page.keyboard.press>[0]);
        await new Promise((r) => setTimeout(r, 220));
      }
      if (SETUP[e.slug]) await new Promise((r) => setTimeout(r, 1200));
      await page.screenshot({ path: file as `${string}.jpg`, type: "jpeg", quality: 82 });
      const kb = Math.round(fs.statSync(file).size / 1024);
      console.log(`  ✓ ${e.title.padEnd(18)} ${shotName(e.slug)}  ${kb}kb`);
    } catch (err) {
      console.log(`  ✗ ${e.title.padEnd(18)} ${(err as Error).message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

main();
