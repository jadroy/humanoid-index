import blurbs from "@/data/compare-blurbs.json";
import type { Humanoid } from "@/data/humanoids";

type Entry = string | { short: string; long?: string };

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

function fallback(a: Humanoid, b: Humanoid): string {
  const yearA = a.year ?? 0;
  const yearB = b.year ?? 0;
  const gap = Math.abs(yearA - yearB);
  const older = yearA <= yearB ? a : b;
  const newer = older === a ? b : a;

  if (a.manufacturer === b.manufacturer) {
    return gap > 0
      ? `Two ${a.manufacturer} robots, ${gap} year${gap === 1 ? "" : "s"} apart.`
      : `Two robots from ${a.manufacturer}.`;
  }

  if (gap >= 15) {
    return `${older.name} was one of the early wave; ${newer.name} arrived ${gap} years later with a different era's ambitions.`;
  }

  const statusA = a.status ?? "";
  const statusB = b.status ?? "";
  if (statusA !== statusB && statusA && statusB) {
    return `${a.name} is ${statusA.toLowerCase()}, ${b.name} ${statusB.toLowerCase()} — different points on the same trajectory.`;
  }

  if (yearA && yearB) {
    return `${older.name} (${older.year}, ${older.manufacturer}) and ${newer.name} (${newer.year}, ${newer.manufacturer}), ${gap} year${gap === 1 ? "" : "s"} apart.`;
  }

  return `${a.name} by ${a.manufacturer} and ${b.name} by ${b.manufacturer}.`;
}

export function getCompareBlurb(a: Humanoid, b: Humanoid): { text: string; long: string; isGenerated: boolean } {
  const key = pairKey(a.id, b.id);
  const stored = (blurbs as Record<string, Entry>)[key];
  if (stored) {
    if (typeof stored === "string") return { text: stored, long: "", isGenerated: true };
    return { text: stored.short, long: stored.long ?? "", isGenerated: true };
  }
  return { text: fallback(a, b), long: "", isGenerated: false };
}

export { pairKey as comparePairKey };
