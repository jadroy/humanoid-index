import descriptions from "@/data/robot-descriptions.json";
import type { Humanoid } from "@/data/humanoids";

export function getRobotDescription(h: Humanoid): { text: string; isGenerated: boolean } {
  const stored = (descriptions as Record<string, string>)[h.id];
  if (stored) return { text: stored, isGenerated: true };
  if (h.description) return { text: h.description, isGenerated: false };
  return { text: "", isGenerated: false };
}
