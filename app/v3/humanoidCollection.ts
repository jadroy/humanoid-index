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

// Environment photos (Unsplash, free license) flashed on hover, keyed by role.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=1100&q=80&auto=format&fit=crop`;
const ROLE_SCENES: Record<string, string[]> = {
  Research: ["1532186773960-85649e5cb70b", "1778546978267-b93e8c6ea099", "1784203572351-1a1125b874a6"].map(u),
  Industrial: ["1717386255773-1e3037c81788", "1647427060118-4911c9821b82", "1610891015188-5369212db097"].map(u),
  Logistics: ["1587293852726-70cdb56c2866", "1586528116311-ad8dd3c8310d"].map(u),
  Home: ["1583847268964-b28dc8f51f92", "1631679706909-1844bbd07221"].map(u),
  Showcase: ["1592758080692-b6a5dbe9c725", "1762968274962-20c12e6e8ecd"].map(u),
  Service: ["1497366811353-6870744d04b2", "1497366754035-f200968a6e72"].map(u),
  Security: ["1587702068694-a909ef4aa346", "1623177623442-979c1e42c255"].map(u),
};

function displayCost(c?: string) {
  return !c || c === "N/A" || c === "—" ? undefined : c;
}

// Image flashed on hover: own alt render, then own scene, then a role scene.
function hoverFor(r: Humanoid): HoverMedia | undefined {
  const alt = (r.media ?? []).find((m) => m.type === "image" && m.url && m.url !== r.imageUrl);
  if (alt) return { url: alt.url, fit: alt.fit ?? "contain", position: alt.position ?? r.imagePosition ?? "ground" };
  if (r.sceneUrl) return { url: r.sceneUrl, fit: "cover", position: "center" };
  const pool = r.useCase ? ROLE_SCENES[r.useCase] : undefined;
  if (pool?.length) return { url: pool[Math.abs(parseInt(r.id, 10) || 0) % pool.length], fit: "cover", position: "center" };
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
  logo: "/HI-logo.svg",
  title: "Humanoid Index",
  href: "/v3",
  blurb: "A visual index of humanoid robots",
  sizeLabel: "True to size",
};
