import { humanoids } from "@/data/humanoids";
import Collection from "./Collection";
import { humanoidsToItems, humanoidConfig, humanoidToDetail } from "./humanoidCollection";
import type { DetailItem } from "./CollectionDetail";

// The robots collection = generic Collection + the humanoid adapter.
// A new collection (drones, headsets, …) is the same two lines with its own
// adapter + config. `details` powers the inline click-to-open side panel;
// it's plain serializable data so it can cross the server→client boundary.
export default function V3Page() {
  const details: Record<string, DetailItem> = Object.fromEntries(
    humanoids.map((r) => [r.id, humanoidToDetail(r)])
  );
  return <Collection items={humanoidsToItems(humanoids)} config={humanoidConfig} details={details} />;
}
