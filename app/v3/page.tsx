import { Metadata } from "next";
import { humanoids } from "@/data/humanoids";
import { findHumanoid, requestBaseUrl, robotMetadata, siteMetadata } from "@/lib/metadata";
import Collection from "./Collection";
import { humanoidsToItems, humanoidConfig, humanoidToDetail } from "./humanoidCollection";
import type { DetailItem } from "./CollectionDetail";

// ?h=<id> — same deeplink contract as the main page, so shared URLs keep
// working if/when this view becomes the landing. OG cards are reused as-is.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ h?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const baseUrl = await requestBaseUrl();
  const bot = findHumanoid(params.h);
  return bot ? robotMetadata(bot, baseUrl) : siteMetadata(baseUrl, "A visual index of humanoid robots.");
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
