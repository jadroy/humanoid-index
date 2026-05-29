"use client";

import { useEffect, useMemo, useState } from "react";
import type { Humanoid } from "@/data/humanoids";

export type SparkMode = "off" | "inline" | "below" | "hero";

export type SparkStatKey = "height" | "weight" | "dof" | "maxSpeed";

// Stat-row labels that have a backing numeric stat the sparkbar can plot.
// Other labels (Year, Drive, Country, etc.) skip the sparkbar.
export const SPARK_KEY_BY_LABEL: Record<string, SparkStatKey> = {
  Height: "height",
  Weight: "weight",
  DOF: "dof",
  Speed: "maxSpeed",
};

export type SparkEntry = { id: string; v: number };
export type FleetSparkData = Record<SparkStatKey, SparkEntry[]>;

const SPARK_STORAGE_KEY = "spark-mode";
const VALID_MODES: SparkMode[] = ["off", "inline", "below", "hero"];

export function useSparkMode(): [SparkMode, (m: SparkMode) => void] {
  const [mode, setMode] = useState<SparkMode>("off");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SPARK_STORAGE_KEY);
      if (saved && (VALID_MODES as string[]).includes(saved)) {
        setMode(saved as SparkMode);
      }
    } catch {}
  }, []);
  const update = (m: SparkMode) => {
    setMode(m);
    try {
      localStorage.setItem(SPARK_STORAGE_KEY, m);
    } catch {}
  };
  return [mode, update];
}

export function useFleetSparkData(humanoids: Humanoid[]): FleetSparkData {
  return useMemo(() => {
    const keys: SparkStatKey[] = ["height", "weight", "dof", "maxSpeed"];
    const result = {} as FleetSparkData;
    for (const key of keys) {
      result[key] = humanoids
        .map((h) => ({ id: h.id, v: h[key] as number | undefined }))
        .filter((e): e is SparkEntry => typeof e.v === "number")
        .sort((a, b) => a.v - b.v);
    }
    return result;
  }, [humanoids]);
}

export type SparkHighlight = { id: string; color: string };

export function SparkBar({
  entries,
  highlights,
  width = 56,
  height = 12,
  gap = 1.2,
  baseColor = "rgba(0,0,0,0.14)",
}: {
  entries: SparkEntry[];
  highlights: SparkHighlight[];
  width?: number;
  height?: number;
  gap?: number;
  baseColor?: string;
}) {
  if (!entries.length) return null;
  const min = entries[0].v;
  const max = entries[entries.length - 1].v;
  const span = max - min || 1;
  const barW = Math.max(1.2, (width - gap * (entries.length - 1)) / entries.length);
  const colorById = new Map(highlights.map((h) => [h.id, h.color]));
  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      {entries.map((e, i) => {
        const h = 0.25 * height + ((e.v - min) / span) * 0.75 * height;
        const x = i * (barW + gap);
        const y = height - h;
        const fill = colorById.get(e.id) ?? baseColor;
        return (
          <rect
            key={e.id}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={0.5}
            fill={fill}
          />
        );
      })}
    </svg>
  );
}

// Site accent — used as the focal/single highlight.
export const SPARK_HIGHLIGHT = "#ff7a45";
