import type { Metadata } from "next";
import { headers } from "next/headers";
import { humanoids, type Humanoid } from "@/data/humanoids";

/* The OG / social contract shared by every page that answers `?h=<id>`. One
   copy, so a card change lands on the home page and /v3 at the same time. */

export function findHumanoid(id: string | undefined | null): Humanoid | null {
  if (!id) return null;
  return humanoids.find((h) => h.id === id) ?? null;
}

export async function requestBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export function socialMetadata(title: string, description: string, ogImage: string): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, images: [ogImage], siteName: "Humanoid Index" },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

/** Single-bot card: name, and a dot-joined line of the headline stats. */
export function robotMetadata(bot: Humanoid, baseUrl: string): Metadata {
  const description = [
    bot.manufacturer,
    bot.year && `(${bot.year})`,
    bot.height && `${bot.height}cm`,
    bot.weight && `${bot.weight}kg`,
    bot.dof && `${bot.dof} DOF`,
  ].filter(Boolean).join(" \u00b7 ");
  // A hand-made card in /public beats the generated one; the generator stays
  // the floor for every robot that has not been given one.
  const ogImage = bot.ogImageUrl ? `${baseUrl}${bot.ogImageUrl}` : `${baseUrl}/api/og/${bot.id}`;
  return socialMetadata(bot.name, description, ogImage);
}

/** Bare URL: the site card. */
export function siteMetadata(baseUrl: string, description: string): Metadata {
  return socialMetadata("Humanoid Index", description, `${baseUrl}/og-default.png`);
}

/* The canonical origin, for the files a crawler reads before it has ever made
   a request we can inspect — robots.txt and the sitemap can't call headers().
   Preview deploys point at themselves so a preview's sitemap doesn't claim to
   be production; production falls through to the real domain. */
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === "production"
    ? "https://humanoid-index.com"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://humanoid-index.com");
