import { Metadata } from "next";
import { formOf } from "@/lib/wheelLanes";
import { findHumanoid, requestBaseUrl, robotMetadata, siteMetadata, socialMetadata } from "@/lib/metadata";
import HomeClient from "./HomeClient";

/* Next hands back `string | string[]`: a repeated key (`?h=1&h=2`) arrives as
   an array. Both readers below take the first value, because a deeplink names
   one robot and the second copy is noise, not a second answer. */
type Params = { h?: string | string[]; compare?: string | string[] };
const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const raw = await searchParams;
  let params: { h?: string; compare?: string } = { h: first(raw.h), compare: first(raw.compare) };
  const baseUrl = await requestBaseUrl();

  // ?compare=leftId,rightId — both must resolve, and both must sit in the same
  // lane. Compare runs inside one body plan, so a cross-lane pair can't open as
  // a pair on the client; a "X vs Y" card in front of a single-robot page would
  // be a lie about what the link does.
  if (params.compare) {
    const ids = params.compare.split(",").map((s) => s.trim());
    const left = findHumanoid(ids[0]);
    const right = findHumanoid(ids[1]);
    if (left && right && formOf(left) === formOf(right)) {
      const title = `${left.name} vs ${right.name}`;
      const description = `Compare ${left.name} (${left.manufacturer}) and ${right.name} (${right.manufacturer}) side by side.`;
      return socialMetadata(title, description, `${baseUrl}/api/og/${left.id}?compare=${right.id}`);
    }
    // Partial compare (one valid id) or a cross-lane pair — fall through to the
    // single-bot path on the left robot, which is what the client opens too.
    const solo = left || right;
    if (solo) {
      params = { ...params, h: solo.id, compare: undefined };
    }
  }

  // ?h=id — single bot
  const bot = findHumanoid(params.h);
  if (bot) return robotMetadata(bot, baseUrl);

  // Default — no valid params or bare URL
  return siteMetadata(baseUrl, "A comprehensive visual index of humanoid robots");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  // The document's one real heading. The site's own name is drawn as a logo and
  // the robot's name lives inside a card, so nothing in the layout is an <h1> —
  // search engines and screen readers both start by looking for one. It reads
  // the deeplink so a shared robot URL announces that robot, not the index.
  const params = await searchParams;
  const pair = first(params.compare)?.split(",").map((id) => id.trim()) ?? [];
  const bot =
    findHumanoid(first(params.h)) || findHumanoid(pair[0]) || findHumanoid(pair[1]);
  const heading = bot
    ? `${bot.name} by ${bot.manufacturer} — Humanoid Index`
    : "Humanoid Index — a visual index of humanoid robots";

  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <HomeClient />
    </>
  );
}
