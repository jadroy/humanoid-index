import { humanoids, type Humanoid } from "@/data/humanoids";

// ═══════════════════════════════════════════════════════════════
// WHEEL LANES — the one place that owns "which list is the wheel on"
// ═══════════════════════════════════════════════════════════════
//
// The wheel's springs navigate by integer index, so an index is only meaningful
// against the list it came from. Before this module those two facts lived apart
// and a canonical index could silently reach a spring that was indexing a
// filtered list — the two happened to agree only while an unfiltered "All" view
// was the default.
//
// The rule, stated once:
//
//   • Single view  → the left spring indexes the CURRENT FORM'S list.
//   • Compare view → both springs index COMPARE_LIST (every robot).
//
// Everything that crosses between lists goes through `indexOfId` / `idAt` here.
// Ids are the only identifier that survives a list change, so any conversion is
// expressed as "find this id in that list" and never as arithmetic on indices.

export type FormFilter = "humanoid" | "semi" | "other";

const ALL_FORM_FILTERS: { key: FormFilter; label: string }[] = [
  { key: "humanoid", label: "Humanoid" },
  { key: "semi", label: "Semi" },
  { key: "other", label: "Other" },
];

/** A missing `form` means an ordinary bipedal humanoid — the default body plan. */
export const formOf = (h: Humanoid): FormFilter => h.form ?? "humanoid";

/**
 * Lists are memoised per filter so identity is stable across renders. The
 * lane-change effect in Browse compares list identity to decide whether to
 * re-seat the spring, so returning a fresh array each call would re-seat on
 * every render.
 */
const LISTS: Record<FormFilter, Humanoid[]> = {
  humanoid: humanoids.filter((h) => formOf(h) === "humanoid"),
  semi: humanoids.filter((h) => formOf(h) === "semi"),
  other: humanoids.filter((h) => formOf(h) === "other"),
};

export const listFor = (f: FormFilter): Humanoid[] => LISTS[f];

/**
 * INVARIANT: every selectable filter has at least one member, so a lane is never
 * empty and `lane[0]` always exists.
 *
 * This is what keeps the seat arithmetic in Browse safe — `seat()` collapses a
 * miss to 0, which is only meaningful if index 0 exists. Rather than guard the
 * empty case at each read site (where it reads as handled but isn't — `Math.max(0,
 * Math.min(0, -1))` is 0, which still indexes past the end of an empty array),
 * an empty category simply isn't offered. The only other ways a filter is
 * produced are `formOf(robot)` and `resolveDeeplink`, both derived from a robot
 * that exists, hence from a category with at least that member.
 */
export const FORM_FILTERS = ALL_FORM_FILTERS.filter((f) => LISTS[f.key].length > 0);

/** Compare deliberately spans every body plan — a humanoid beside a vacuum is
 *  the interesting comparison, and the chips are hidden in compare anyway. */
export const COMPARE_LIST: Humanoid[] = humanoids;

/** How many robots a chip should advertise. */
export const countFor = (f: FormFilter): number => LISTS[f].length;

/** -1 when absent — callers must handle it; never feed a raw -1 to a spring. */
export const indexOfId = (list: Humanoid[], id: string | null | undefined): number =>
  id ? list.findIndex((h) => h.id === id) : -1;

export const idAt = (list: Humanoid[], index: number): string | undefined => list[index]?.id;

/** Clamp a resolved index into a safe seat, collapsing the -1 miss to the top. */
export const seat = (index: number): number => (index >= 0 ? index : 0);

/**
 * Resolve a `?h=<id>` deeplink into the filter that contains it *and* that
 * filter's local index — so a link to a non-humanoid opens in its own lane
 * instead of resolving against a list it isn't in.
 */
export function resolveDeeplink(id: string | null | undefined): { filter: FormFilter; index: number } | null {
  if (!id) return null;
  const h = humanoids.find((x) => x.id === id);
  if (!h) return null;
  const filter = formOf(h);
  return { filter, index: seat(indexOfId(listFor(filter), id)) };
}
