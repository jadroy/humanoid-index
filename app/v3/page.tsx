import { humanoids } from "@/data/humanoids";
import Collection from "./Collection";
import { humanoidsToItems, humanoidConfig } from "./humanoidCollection";

// The robots collection = generic Collection + the humanoid adapter.
// A new collection (drones, headsets, …) is the same two lines with its own
// adapter + config.
export default function V3Page() {
  return <Collection items={humanoidsToItems(humanoids)} config={humanoidConfig} />;
}
