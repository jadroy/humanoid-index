import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

/* Everything a visitor can reach in production is fair game, so this file has
   almost nothing to say. The behind-the-scenes routes — the admin list, the
   lab, the timeline, the harnesses — are 404s in production via `proxy.ts`,
   and naming them here would only publish the list of URLs worth trying.

   /api/og is deliberately left open: it serves the share card for every `?h=`
   URL in the sitemap, and Twitter's and Facebook's crawlers honour robots.txt,
   so closing /api/ wholesale would blank the cards on the exact links we're
   asking to be indexed. Only /api/chat, which costs money to answer, is shut. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/chat"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
