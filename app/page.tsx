import { Metadata } from "next";
import { formOf } from "@/lib/wheelLanes";
import { findHumanoid, requestBaseUrl, robotMetadata, siteMetadata, socialMetadata } from "@/lib/metadata";
import HomeClient from "./HomeClient";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ h?: string; compare?: string }>;
}): Promise<Metadata> {
  let params = await searchParams;
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

export default function Page() {
  return <HomeClient />;
}
