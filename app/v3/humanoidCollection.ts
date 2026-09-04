import type { Humanoid } from "@/data/humanoids";
import type { CollectionItem, CollectionConfig, HoverMedia } from "./Collection";
import type { DetailItem } from "./CollectionDetail";
import { CONTACT_EMAIL } from "@/lib/site";

/* ===========================================================================
   Humanoid adapter — maps the robot data onto the generic Collection shape.
   This is the ONLY robot-specific file; the layout lives in Collection.tsx.
   Copy this pattern for drones / headsets / etc.
   =========================================================================== */

// Robots with a turntable frame sequence in /public/spin/<name>.
// memo-v3 = the same frames with 45px of top padding cropped so Memo sits
// level with the other v3 cards; the ORIGINAL /spin/memo frames stay untouched
// for the scroll view's front card, which is framed for the uncropped aspect.
const SPIN: Record<string, { path: string; frames: number; scale?: number }> = {
  "3": { path: "/spin/memo-v3", frames: 30, scale: 1.05 }, // Memo
};

function displayCost(c?: string) {
  return !c || c === "N/A" || c === "—" ? undefined : c;
}

// Robots whose alt-angle render beats their generated scene as the hover.
const PREFER_ALT_HOVER = new Set(["20"]); // Ameca — her side angle > gen scene

// Image flashed on hover: own scene (generated or real), else own alt render.
function hoverFor(r: Humanoid): HoverMedia | undefined {
  const alt = (r.media ?? []).find((m) => m.type === "image" && m.url && m.url !== r.imageUrl);
  const altMedia: HoverMedia | undefined = alt
    ? { url: alt.url, fit: alt.fit ?? "contain", position: alt.position ?? r.imagePosition ?? "ground" }
    : undefined;
  if (altMedia && PREFER_ALT_HOVER.has(r.id)) return altMedia;
  if (r.sceneUrl) return { url: r.sceneUrl, fit: "cover", position: r.scenePosition ?? "center" };
  return altMedia;
}

// The fields a tile and its detail share — one mapping, two callers.
function baseItem(r: Humanoid) {
  return {
    id: r.id,
    title: r.name,
    subtitle: r.manufacturer,
    logo: r.logoUrl,
    year: r.year,
    image: r.imageUrl ?? "",
    imageFit: r.imageFit,
    imagePosition: r.imagePosition,
    imageScale: r.imageScale,
    price: displayCost(r.cost),
    badge: r.availability,
    size: r.height,
  };
}

export function humanoidsToItems(robots: Humanoid[]): CollectionItem[] {
  return robots
    .filter((r) => r.imageUrl)
    .map((r) => {
      const spin = SPIN[r.id];
      // No year here any more — it sits beside the name on the placard, the
      // way it does in the scroll view. Repeating it at the head of the specs
      // was the old label's way of finding it a home.
      const meta = [r.height ? `${r.height}cm` : null, r.dof ? `${r.dof} DOF` : null].filter(Boolean).join("  ·  ");
      return {
        ...baseItem(r),
        meta: meta || undefined,
        href: `/v3/${r.id}`,
        hover: spin ? undefined : hoverFor(r),
        spin,
      };
    });
}

export function humanoidToDetail(r: Humanoid): DetailItem {
  const spec = (label: string, value: unknown): { label: string; value: string } | null =>
    value == null || value === "" ? null : { label, value: String(value) };
  const specs = [
    spec("Year", r.year),
    spec("Height", r.height ? `${r.height} cm` : undefined),
    spec("Weight", r.weight ? `${r.weight} kg` : undefined),
    spec("Degrees of freedom", r.dof),
    spec("Max speed", r.maxSpeed ? `${r.maxSpeed} m/s` : undefined),
    spec("Country", r.country),
    spec("Use case", r.useCase),
    spec("Drive", r.drive),
    spec("Status", r.status),
    spec("Cost", displayCost(r.cost)),
  ].filter(Boolean) as { label: string; value: string }[];

  const links: { label: string; href: string }[] = [];
  if (r.purchaseUrl) links.push({ label: "Buy", href: r.purchaseUrl });
  if (r.infoUrl) links.push({ label: "Learn more", href: r.infoUrl });
  if (r.manufacturerUrl) links.push({ label: "Website", href: r.manufacturerUrl });

  return {
    ...baseItem(r),
    description: r.description,
    specs,
    links,
    gallery: (r.media ?? []).filter((m) => m.type === "image" && m.url).map((m) => m.url),
  };
}

export const humanoidConfig: CollectionConfig = {
  logo: "/HI-mark.svg",
  title: "Humanoid Index",
  href: "/v3",
  blurb: ["A visual index of humanoid robots", "Made by Jad", "2000 → today"],
  sizeLabel: "True to size",
  navLink: { label: "Scroll view", href: "/" },
  suggest: {
    label: "Suggest a robot",
    email: CONTACT_EMAIL,
    subject: "Humanoid Index — suggest a humanoid",
    placeholder: "Which humanoid are we missing?",
    blurb: "Know one that belongs in the index? Name and a link is plenty.",
  },
};
