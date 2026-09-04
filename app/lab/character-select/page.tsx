"use client";

import { humanoids } from "@/data/humanoids";
import CharacterSelect from "@/components/CharacterSelect";

// The component sizes itself off its parent (`w-full h-full`), so the route has
// to supply the screen — on its own it rendered a single hairline.
export default function CharacterSelectPage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <CharacterSelect humanoids={humanoids} />
    </div>
  );
}
