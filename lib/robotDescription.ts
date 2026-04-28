import descriptions from "@/data/robot-descriptions.json";
import type { Humanoid } from "@/data/humanoids";

type Entry = string | { short: string; long?: string };

export function getRobotDescription(h: Humanoid): { text: string; long: string; isGenerated: boolean } {
  const stored = (descriptions as Record<string, Entry>)[h.id];
  if (stored) {
    if (typeof stored === "string") return { text: stored, long: "", isGenerated: true };
    return { text: stored.short, long: stored.long ?? "", isGenerated: true };
  }
  if (h.description) return { text: h.description, long: "", isGenerated: false };
  return { text: "", long: "", isGenerated: false };
}
