import type { MetadataRoute } from "next";
import { humanoids } from "@/data/humanoids";
import { SITE_URL } from "@/lib/metadata";

/* One entry per robot, as the `?h=<id>` deeplink rather than a path, because
   that's the URL the share button hands out and the URL `generateMetadata`
   already gives a card and a description to. `humanoids` is the filtered
   export, so hidden stubs never reach the sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const home = {
    url: `${SITE_URL}/`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1,
  };
  const robots = humanoids.map((h) => ({
    url: `${SITE_URL}/?h=${encodeURIComponent(h.id)}`,
    lastModified: h.addedAt ? new Date(h.addedAt) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [home, ...robots];
}
