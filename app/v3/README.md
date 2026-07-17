# Collection template

A reusable "grey card collection" layout. `Collection.tsx` owns everything —
calm grey rounded tiles, responsive 5-col grid, sticky grid-aligned nav,
hover-swap media, optional 360° spin, true-to-size toggle, carousel view, and
the `c` / `C` / `a` / `1–8` tuning shortcuts. Styling lives in `v3.css`
(tokens: `--tile-radius`, `--page-x`, `--ink*`, greys).

You never touch the layout. To add a collection you write **an adapter + a
config**, then render `<Collection>`. That's it.

## Make a new collection (e.g. drones)

**1. Adapter — map your data to `CollectionItem[]`** (`droneCollection.ts`):

```ts
import type { CollectionItem, CollectionConfig } from "./Collection";

export function dronesToItems(drones: Drone[]): CollectionItem[] {
  return drones.map((d) => ({
    id: d.id,
    title: d.name,
    subtitle: d.maker,
    image: d.image,                 // transparent PNG render on the tile
    price: d.price,                 // top-right; omit to show `badge` instead
    badge: d.status,                // small-caps label when no price
    meta: `${d.year} · ${d.rangeKm}km · ${d.weightG}g`,
    href: `/drones/${d.id}`,
    hover: d.actionShot ? { url: d.actionShot, fit: "cover" } : undefined,
    size: d.wingspanCm,             // drives "true to size" (optional)
  }));
}

export const droneConfig: CollectionConfig = {
  title: "Drone Index",             // or `logo: "/drone-logo.svg"`
  href: "/drones",
  blurb: "A visual index of drones",
  sizeLabel: "To scale",            // omit to hide the size toggle
};
```

**2. Page — two lines** (`app/drones/page.tsx`):

```tsx
import Collection from "../v3/Collection";
import { dronesToItems, droneConfig } from "../v3/droneCollection";
import { drones } from "@/data/drones";

export default function Page() {
  return <Collection items={dronesToItems(drones)} config={droneConfig} />;
}
```

Done — full experience, same as `/v3`.

## `CollectionItem` fields

| field | notes |
|---|---|
| `id`, `title`, `image` | required |
| `subtitle` | second line (maker/brand) |
| `price` / `badge` | top-right value; badge shows only when no price |
| `meta` | muted third line (specs) |
| `href` | card link |
| `hover` | `{ url, fit?, position? }` — image flashed on hover |
| `size` | real-world size → "true to size" scaling |
| `spin` | `{ path, frames, scale? }` — turntable frames in `/public/...` |
| `imageFit` / `imagePosition` / `imageScale` | per-item framing overrides. `imagePosition`: `"ground"` (default) · `"center"` · `"bottom"` (flush) |

See `humanoidCollection.ts` for a full worked adapter (role-based hover scenes,
spin, spec formatting).
