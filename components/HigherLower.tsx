"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { humanoids, type Humanoid } from "@/data/humanoids";
import CarouselCard from "@/components/carousel/CarouselCard";

// ── Higher / lower ──────────────────────────────────────────────────────────
// Two cards, one question, a streak. The card primitive already reads as an
// object you can hold — this is the cheapest thing that makes you *use* what
// you learned browsing. No content upkeep: every round is generated from the
// same data the index already ships.

type MetricKey = "height" | "weight" | "dof" | "maxSpeed";

const METRICS: {
  key: MetricKey;
  question: string;
  unit: string;
  format: (v: number) => string;
}[] = [
  { key: "height",   question: "Which is taller?",       unit: "cm",  format: (v) => `${v}` },
  { key: "weight",   question: "Which is heavier?",      unit: "kg",  format: (v) => `${v}` },
  { key: "dof",      question: "Which has more joints?", unit: "DOF", format: (v) => `${v}` },
  { key: "maxSpeed", question: "Which is faster?",       unit: "m/s", format: (v) => v.toFixed(1) },
];

interface Round {
  metric: (typeof METRICS)[number];
  left: Humanoid;
  right: Humanoid;
}

// A round is only fair if both robots have the value and the gap is readable —
// a 1cm difference is a coin flip, not a question.
function buildRound(prev?: Round): Round {
  for (let attempt = 0; attempt < 400; attempt++) {
    const metric = METRICS[Math.floor(Math.random() * METRICS.length)];
    const pool = humanoids.filter((h) => typeof h[metric.key] === "number" && h.imageUrl);
    if (pool.length < 2) continue;
    const a = pool[Math.floor(Math.random() * pool.length)];
    const b = pool[Math.floor(Math.random() * pool.length)];
    if (a.id === b.id) continue;
    if (prev && ((prev.left.id === a.id && prev.right.id === b.id) || (prev.left.id === b.id && prev.right.id === a.id))) continue;
    const va = a[metric.key] as number;
    const vb = b[metric.key] as number;
    const spread = Math.abs(va - vb) / Math.max(va, vb);
    if (spread < 0.06) continue;   // too close to call
    return { metric, left: a, right: b };
  }
  // Fallback: guaranteed-valid height pair.
  const withH = humanoids.filter((h) => h.height);
  return { metric: METRICS[0], left: withH[0], right: withH[withH.length - 1] };
}

export default function HigherLower({ onSelect }: { onSelect?: (id: string) => void }) {
  // The first round is drawn after mount — a random pair picked during render
  // would differ between the server HTML and the client, and React would throw.
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<"left" | "right" | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [seen, setSeen] = useState(0);
  const [correct, setCorrect] = useState(0);
  const advanceRef = useRef<number | null>(null);

  useEffect(() => {
    setRound(buildRound());
    try {
      const b = Number(localStorage.getItem("hl-best") ?? 0);
      if (b > 0) setBest(b);
    } catch {}
  }, []);

  const values = useMemo(() => ({
    left: (round?.left[round.metric.key] as number) ?? 0,
    right: (round?.right[round.metric.key] as number) ?? 0,
  }), [round]);

  const winner: "left" | "right" = values.left >= values.right ? "left" : "right";

  const next = useCallback(() => {
    setPicked(null);
    setRound((r) => buildRound(r ?? undefined));
  }, []);

  const pick = useCallback((side: "left" | "right") => {
    if (!round) return;
    if (picked) { next(); return; }
    setPicked(side);
    setSeen((n) => n + 1);
    const right = side === winner;
    if (right) {
      setCorrect((n) => n + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBest((b) => {
          const nb = Math.max(b, ns);
          try { localStorage.setItem("hl-best", String(nb)); } catch {}
          return nb;
        });
        return ns;
      });
    } else {
      setStreak(0);
    }
    if (advanceRef.current) window.clearTimeout(advanceRef.current);
    advanceRef.current = window.setTimeout(next, right ? 1500 : 2400);
  }, [picked, winner, next, round]);

  useEffect(() => () => { if (advanceRef.current) window.clearTimeout(advanceRef.current); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") pick("left");
      else if (e.key === "ArrowRight") pick("right");
      else if (e.key === " " || e.key === "Enter") { if (picked) next(); }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick, next, picked]);

  const revealed = picked !== null;
  const wasRight = revealed && picked === winner;

  if (!round) return <div className="h-screen w-full bg-white" />;

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center relative select-none overflow-hidden">
      {/* Score rail */}
      <div className="absolute top-0 left-0 right-0 flex items-baseline justify-between" style={{ padding: "20px 24px" }}>
        <div className="flex items-baseline gap-5">
          <span style={{ fontSize: 12, color: "var(--c-ink)", fontWeight: 500, letterSpacing: "-0.02em" }}>Higher</span>
          <span className="tabular-nums" style={{ fontSize: 12, color: "var(--c-ink-muted)" }}>
            {seen ? `${correct}/${seen}` : "—"}
          </span>
        </div>
        <div className="flex items-baseline gap-5 tabular-nums" style={{ fontSize: 12, color: "var(--c-ink-muted)" }}>
          <span>
            Streak{" "}
            <span style={{ color: "var(--c-ink)", fontWeight: 500 }}>{streak}</span>
          </span>
          <span>
            Best{" "}
            <span style={{ color: "var(--c-ink)", fontWeight: 500 }}>{best}</span>
          </span>
        </div>
      </div>

      {/* Question */}
      <p
        style={{
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: revealed ? (wasRight ? "var(--c-ink)" : "var(--c-ink-muted)") : "var(--c-ink-muted)",
          marginBottom: 28,
          transition: "color 200ms ease-out",
        }}
      >
        {revealed ? (wasRight ? "Correct" : "Nope") : round.metric.question}
      </p>

      {/* The pair */}
      <div className="flex items-start" style={{ gap: 56 }}>
        {(["left", "right"] as const).map((side) => {
          const h = round[side];
          const v = values[side];
          const isWinner = side === winner;
          const isPicked = picked === side;
          return (
            <button
              key={side}
              onClick={() => pick(side)}
              className="flex flex-col items-center cursor-pointer bg-transparent border-0 p-0"
              style={{
                opacity: revealed && !isWinner && !isPicked ? 0.38 : 1,
                transform: revealed ? (isWinner ? "translateY(-6px)" : "translateY(0)") : "translateY(0)",
                transition: "opacity 260ms ease-out, transform 320ms cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  outline: revealed
                    ? `1px solid ${isPicked ? (wasRight ? "var(--c-ink)" : "var(--c-ink-subtle)") : "transparent"}`
                    : "1px solid transparent",
                  transition: "outline-color 200ms ease-out",
                }}
              >
                <CarouselCard humanoid={h} isNew={false} width={260} />
              </div>

              {/* Value — the reveal. Reserved height so nothing reflows. */}
              <div style={{ height: 44, marginTop: 12 }}>
                <p
                  className="tabular-nums"
                  style={{
                    fontSize: 28,
                    lineHeight: 1.1,
                    letterSpacing: "-0.03em",
                    color: "var(--c-ink)",
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "translateY(0)" : "translateY(6px)",
                    transition: "opacity 240ms ease-out, transform 320ms cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  {revealed ? round.metric.format(v) : "0"}
                  <span style={{ fontSize: 12, color: "var(--c-ink-muted)", marginLeft: 5 }}>{round.metric.unit}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint / next */}
      <div style={{ height: 24, marginTop: 26 }}>
        {revealed ? (
          <button
            onClick={next}
            className="cursor-pointer bg-transparent border-0"
            style={{ fontSize: 12, color: "var(--c-ink-muted)", letterSpacing: "-0.01em" }}
          >
            Next →
          </button>
        ) : (
          <p style={{ fontSize: 12, color: "var(--c-ink-subtle)", letterSpacing: "-0.01em" }}>
            Click a card, or use ← →
          </p>
        )}
      </div>

      {/* Open the winner in the index — keeps the game a door into the site */}
      {revealed && onSelect && (
        <button
          onClick={() => onSelect(round[winner].id)}
          className="absolute cursor-pointer bg-transparent border-0"
          style={{ bottom: 20, fontSize: 12, color: "var(--c-ink-subtle)" }}
        >
          See {round[winner].name} in the index
        </button>
      )}
    </div>
  );
}
