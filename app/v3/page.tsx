import { Metadata } from "next";
import { headers } from "next/headers";
import { humanoids } from "@/data/humanoids";
import Collection from "./Collection";
import { humanoidsToItems, humanoidConfig, humanoidToDetail } from "./humanoidCollection";
import type { DetailItem } from "./CollectionDetail";

function findHumanoid(id: string | undefined | null) {
  if (!id) return null;
  return humanoids.find((h) => h.id === id) ?? null;
}

// ?h=<id> — same deeplink contract as the main page, so shared URLs keep
// working if/when this view becomes the landing. OG cards are reused as-is.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ h?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  const bot = findHumanoid(params.h);
  if (bot) {
    const title = bot.name;
    const description = [
      bot.manufacturer,
      bot.year && `(${bot.year})`,
      bot.height && `${bot.height}cm`,
      bot.weight && `${bot.weight}kg`,
      bot.dof && `${bot.dof} DOF`,
    ].filter(Boolean).join(" · ");
    const ogImage = `${baseUrl}/api/og/${bot.id}`;
    return {
      title,
      description,
      openGraph: { title, description, images: [ogImage], siteName: "Humanoid Index" },
      twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    };
  }

  const title = "Humanoid Index";
  const description = "A visual index of humanoid robots.";
  const ogImage = `${baseUrl}/og-default.png`;
  return {
    title,
    description,
    openGraph: { title, description, images: [ogImage], siteName: "Humanoid Index" },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

// The robots collection = generic Collection + the humanoid adapter.
// A new collection (drones, headsets, …) is the same two lines with its own
// adapter + config. `details` powers the inline click-to-open side panel;
// it's plain serializable data so it can cross the server→client boundary.
export default async function V3Page({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const params = await searchParams;
  const details: Record<string, DetailItem> = Object.fromEntries(
    humanoids.map((r) => [r.id, humanoidToDetail(r)])
  );
  return (
    <Collection
      items={humanoidsToItems(humanoids)}
      config={humanoidConfig}
      details={details}
      initialSel={findHumanoid(params.h)?.id}
    />
  );
}
