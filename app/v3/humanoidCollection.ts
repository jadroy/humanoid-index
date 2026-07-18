import type { Humanoid } from "@/data/humanoids";
import type { CollectionItem, CollectionConfig, HoverMedia } from "./Collection";
import type { DetailItem } from "./CollectionDetail";

/* ===========================================================================
   Humanoid adapter — maps the robot data onto the generic Collection shape.
   This is the ONLY robot-specific file; the layout lives in Collection.tsx.
   Copy this pattern for drones / headsets / etc.
   =========================================================================== */

// Robots with a turntable frame sequence in /public/spin/<name>.
const SPIN: Record<string, { path: string; frames: number; scale?: number }> = {
  "3": { path: "/spin/memo", frames: 30, scale: 1.05 }, // Memo
};

function displayCost(c?: string) {
  return !c || c === "N/A" || c === "—" ? undefined : c;
}

// Image flashed on hover: own scene (generated or real), else own alt render.
function hoverFor(r: Humanoid): HoverMedia | undefined {
  if (r.sceneUrl) return { url: r.sceneUrl, fit: "cover", position: r.scenePosition ?? "center" };
  const alt = (r.media ?? []).find((m) => m.type === "image" && m.url && m.url !== r.imageUrl);
  if (alt) return { url: alt.url, fit: alt.fit ?? "contain", position: alt.position ?? r.imagePosition ?? "ground" };
  return undefined;
}

export function humanoidsToItems(robots: Humanoid[]): CollectionItem[] {
  return robots
    .filter((r) => r.imageUrl)
    .map((r) => {
      const spin = SPIN[r.id];
      const meta = [r.year, r.height ? `${r.height}cm` : null, r.dof ? `${r.dof} DOF` : null].filter(Boolean).join("  ·  ");
      return {
        id: r.id,
        title: r.name,
        subtitle: r.manufacturer,
        image: r.imageUrl!,
        imageFit: r.imageFit,
        imagePosition: r.imagePosition,
        imageScale: r.imageScale,
        price: displayCost(r.cost),
        badge: r.availability,
        meta: meta || undefined,
        href: `/v3/${r.id}`,
        hover: spin ? undefined : hoverFor(r),
        size: r.height,
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
    id: r.id,
    title: r.name,
    subtitle: r.manufacturer,
    image: r.imageUrl ?? "",
    imageFit: r.imageFit,
    imagePosition: r.imagePosition,
    imageScale: r.imageScale,
    price: displayCost(r.cost),
    badge: r.availability,
    size: r.height,
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
  suggest: {
    label: "Suggest a robot",
    email: "jadroy77@gmail.com", // same address the main app's ContactSheet uses
    subject: "Humanoid Index — suggest a humanoid",
    placeholder: "Which humanoid are we missing?",
    blurb: "Know one that belongs in the index? Name and a link is plenty.",
  },
};
