import { Metadata } from "next";
import { headers } from "next/headers";
import { humanoids } from "@/data/humanoids";
import { formOf } from "@/lib/wheelLanes";
import HomeClient from "./HomeClient";

function findHumanoid(id: string | undefined | null) {
  if (!id) return null;
  return humanoids.find((h) => h.id === id) ?? null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ h?: string; compare?: string }>;
}): Promise<Metadata> {
  let params = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

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
      const ogImage = `${baseUrl}/api/og/${left.id}?compare=${right.id}`;
      return {
        title,
        description,
        openGraph: { title, description, images: [ogImage], siteName: "Humanoid Index" },
        twitter: { card: "summary_large_image", title, description, images: [ogImage] },
      };
    }
    // Partial compare (one valid id) or a cross-lane pair — fall through to the
    // single-bot path on the left robot, which is what the client opens too.
    const solo = left || right;
    if (solo) {
      params = { ...params, h: solo.id, compare: undefined };
    }
  }

  // ?h=id — single bot
  if (params.h) {
    const bot = findHumanoid(params.h);
    if (bot) {
      const title = bot.name;
      const description = [
        bot.manufacturer,
        bot.year && `(${bot.year})`,
        bot.height && `${bot.height}cm`,
        bot.weight && `${bot.weight}kg`,
        bot.dof && `${bot.dof} DOF`,
      ].filter(Boolean).join(" \u00b7 ");
      const ogImage = `${baseUrl}/api/og/${bot.id}`;
      return {
        title,
        description,
        openGraph: { title, description, images: [ogImage], siteName: "Humanoid Index" },
        twitter: { card: "summary_large_image", title, description, images: [ogImage] },
      };
    }
  }

  // Default — no valid params or bare URL
  const title = "Humanoid Index";
  const description = "A comprehensive visual index of humanoid robots";
  const ogImage = `${baseUrl}/og-default.png`;
  return {
    title,
    description,
    openGraph: { title, description, images: [ogImage], siteName: "Humanoid Index" },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default function Page() {
  return <HomeClient />;
}
