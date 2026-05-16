import { ImageResponse } from "next/og";
import { humanoids, type Humanoid } from "@/data/humanoids";
import { readFile } from "fs/promises";
import { join } from "path";

import {
  SINGLE_DEFAULTS,
  COMPARE_DEFAULTS,
  type SingleKnobs,
  type CompareKnobs,
  type TextMode,
} from "./knobs";

export const runtime = "nodejs";

const W = 1200;
const H = 630;

const isSvg = (p: string) => p.toLowerCase().endsWith(".svg");

async function loadImageAsDataUri(publicPath: string): Promise<string | null> {
  try {
    const abs = join(process.cwd(), "public", publicPath);
    const buf = await readFile(abs);
    const ext = publicPath.split(".").pop() || "png";
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function loadBotImage(bot: Humanoid) {
  return bot.imageUrl && !isSvg(bot.imageUrl) ? loadImageAsDataUri(bot.imageUrl) : null;
}

function isCutoff(bot: Humanoid): boolean {
  return bot.imagePosition?.includes("bottom") ?? false;
}

// ── Knob parsing (dev-only overrides) ────────────────────────

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v == null) return fallback;
  return v === "1" || v === "true";
}
function parseNum(v: string | null, fallback: number): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function parseTextMode(v: string | null, fallback: TextMode): TextMode {
  if (v === "none" || v === "url" || v === "name") return v;
  return fallback;
}

function readSingleKnobs(sp: URLSearchParams): SingleKnobs {
  if (process.env.NODE_ENV !== "development") return SINGLE_DEFAULTS;
  return {
    textMode: parseTextMode(sp.get("textMode"), SINGLE_DEFAULTS.textMode),
    basePadTop: parseNum(sp.get("basePadTop"), SINGLE_DEFAULTS.basePadTop),
    basePadX: parseNum(sp.get("basePadX"), SINGLE_DEFAULTS.basePadX),
    basePadBottom: parseNum(sp.get("basePadBottom"), SINGLE_DEFAULTS.basePadBottom),
    bottomFadeH: parseNum(sp.get("bottomFadeH"), SINGLE_DEFAULTS.bottomFadeH),
    bottomFadeOpacity: parseNum(sp.get("bottomFadeOpacity"), SINGLE_DEFAULTS.bottomFadeOpacity),
  };
}

function readCompareKnobs(sp: URLSearchParams): CompareKnobs {
  if (process.env.NODE_ENV !== "development") return COMPARE_DEFAULTS;
  return {
    textMode: parseTextMode(sp.get("textMode"), COMPARE_DEFAULTS.textMode),
    basePadTop: parseNum(sp.get("basePadTop"), COMPARE_DEFAULTS.basePadTop),
    basePadX: parseNum(sp.get("basePadX"), COMPARE_DEFAULTS.basePadX),
    basePadBottom: parseNum(sp.get("basePadBottom"), COMPARE_DEFAULTS.basePadBottom),
    bottomFadeH: parseNum(sp.get("bottomFadeH"), COMPARE_DEFAULTS.bottomFadeH),
    bottomFadeOpacity: parseNum(sp.get("bottomFadeOpacity"), COMPARE_DEFAULTS.bottomFadeOpacity),
    showDivider: parseBool(sp.get("showDivider"), COMPARE_DEFAULTS.showDivider),
  };
}

// ── Shared bits ──────────────────────────────────────────────

function RobotImage({
  src,
  boxW,
  boxH,
  cutoff,
}: {
  src: string | null;
  boxW: number;
  boxH: number;
  cutoff: boolean;
}) {
  if (!src) {
    return (
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          color: "#ccc",
        }}
      >
        ?
      </div>
    );
  }
  return (
    <img
      src={src}
      width={boxW}
      height={boxH}
      style={{
        objectFit: "contain",
        objectPosition: cutoff ? "center bottom" : "center",
      }}
    />
  );
}

function BottomFade({ height, opacity, left, right }: { height: number; opacity: number; left: number; right: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        right,
        bottom: 0,
        height,
        display: "flex",
        background: `linear-gradient(to bottom, rgba(250,250,250,0), rgba(250,250,250,${opacity}))`,
      }}
    />
  );
}

function Watermark() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 32,
        display: "flex",
        fontSize: 16,
        color: "#cccccc",
        letterSpacing: 0.5,
      }}
    >
      humanoid-index.com
    </div>
  );
}

function NameLabel({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: size,
        fontWeight: 600,
        color: "#111",
        letterSpacing: -0.2,
      }}
    >
      {name}
    </div>
  );
}

// ── Single bot card ──────────────────────────────────────────

function SingleCard({
  bot,
  imgSrc,
  k,
}: {
  bot: Humanoid;
  imgSrc: string | null;
  k: SingleKnobs;
}) {
  const cutoff = isCutoff(bot);
  const padBottom = cutoff ? 0 : k.basePadBottom;
  const boxW = W - k.basePadX * 2;
  const boxH = H - k.basePadTop - padBottom;

  return (
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        background: "#ffffff",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          alignItems: cutoff ? "flex-end" : "center",
          justifyContent: "center",
          paddingTop: k.basePadTop,
          paddingBottom: padBottom,
          paddingLeft: k.basePadX,
          paddingRight: k.basePadX,
        }}
      >
        <RobotImage src={imgSrc} boxW={boxW} boxH={boxH} cutoff={cutoff} />
      </div>

      {cutoff && <BottomFade height={k.bottomFadeH} opacity={k.bottomFadeOpacity} left={0} right={0} />}

      {k.textMode === "name" && (
        <div style={{ position: "absolute", bottom: 28, left: 40, display: "flex" }}>
          <NameLabel name={bot.name} size={24} />
        </div>
      )}
      {k.textMode === "url" && <Watermark />}
    </div>
  );
}

// ── Compare card ─────────────────────────────────────────────

function CompareSide({
  bot,
  imgSrc,
  k,
  side,
  showName,
}: {
  bot: Humanoid;
  imgSrc: string | null;
  k: CompareKnobs;
  side: "left" | "right";
  showName: boolean;
}) {
  const sideW = W / 2;
  const cutoff = isCutoff(bot);
  const padBottom = cutoff ? 0 : k.basePadBottom;
  const boxW = sideW - k.basePadX * 2;
  const boxH = H - k.basePadTop - padBottom;

  return (
    <div
      style={{
        width: sideW,
        height: H,
        display: "flex",
        alignItems: cutoff ? "flex-end" : "center",
        justifyContent: "center",
        paddingTop: k.basePadTop,
        paddingBottom: padBottom,
        paddingLeft: k.basePadX,
        paddingRight: k.basePadX,
        position: "relative",
      }}
    >
      <RobotImage src={imgSrc} boxW={boxW} boxH={boxH} cutoff={cutoff} />
      {cutoff && <BottomFade height={k.bottomFadeH} opacity={k.bottomFadeOpacity} left={0} right={0} />}
      {showName && (
        <div style={{ position: "absolute", bottom: 28, left: side === "left" ? 32 : undefined, right: side === "right" ? 32 : undefined, display: "flex" }}>
          <NameLabel name={bot.name} size={22} />
        </div>
      )}
    </div>
  );
}

function CompareCard({
  left,
  right,
  leftImg,
  rightImg,
  k,
}: {
  left: Humanoid;
  right: Humanoid;
  leftImg: string | null;
  rightImg: string | null;
  k: CompareKnobs;
}) {
  return (
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        background: "#ffffff",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <CompareSide bot={left} imgSrc={leftImg} k={k} side="left" showName={k.textMode === "name"} />

      {k.showDivider && (
        <div
          style={{
            position: "absolute",
            left: W / 2,
            top: 80,
            bottom: 80,
            width: 1,
            background: "#eeeeee",
            display: "flex",
          }}
        />
      )}

      <CompareSide bot={right} imgSrc={rightImg} k={k} side="right" showName={k.textMode === "name"} />

      {k.textMode === "url" && <Watermark />}
    </div>
  );
}

// ── Route handler ────────────────────────────────────────────

const OG_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bot = humanoids.find((h) => h.id === id);
  if (!bot) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const compareId = url.searchParams.get("compare");
  const rightBot = compareId ? humanoids.find((h) => h.id === compareId) : null;

  if (rightBot) {
    const k = readCompareKnobs(url.searchParams);
    const [leftImg, rightImg] = await Promise.all([loadBotImage(bot), loadBotImage(rightBot)]);
    return new ImageResponse(
      <CompareCard left={bot} right={rightBot} leftImg={leftImg} rightImg={rightImg} k={k} />,
      { width: W, height: H, headers: OG_HEADERS }
    );
  }

  const k = readSingleKnobs(url.searchParams);
  const imgSrc = await loadBotImage(bot);
  return new ImageResponse(<SingleCard bot={bot} imgSrc={imgSrc} k={k} />, {
    width: W,
    height: H,
    headers: OG_HEADERS,
  });
}
