// ── The list ────────────────────────────────────────────────────────────────
// Everything known-but-not-done, in one place. It exists because the same
// pending work was living in three: CLAUDE.md's "in-flight" section, session
// memory, and whatever the last chat happened to say out loud. None of those
// are readable at a glance and none of them survive a new session cleanly.
//
// Adding an item is a line here. Finishing one is deleting that line — there
// is no `done: true`, because a list of finished things is just git log.

export type Area = "data" | "seo" | "perf" | "a11y" | "code" | "product";
export type Size = "quick" | "session" | "project";

export interface Item {
  // Plain language, for someone who doesn't know the codebase. The technical
  // version of the same thing lives in `note` — the list reads as a list of
  // outcomes, and you only open a row when you're the one doing it.
  title: string;
  // The engineering shape of it. Optional: some items are self-evident.
  detail?: string;
  // What's actually wrong, or what "done" looks like. One or two sentences —
  // enough to start without re-deriving the whole thing.
  note: string;
  area: Area;
  size: Size;
  // Where it lives, if it's one place. `file:line` or a route.
  where?: string;
  // Blocked on a decision, not on effort. Says which decision.
  blocked?: string;
}

export const AREA_LABEL: Record<Area, string> = {
  data: "Data",
  seo: "Discoverability",
  perf: "Performance",
  a11y: "Accessibility",
  code: "Codebase",
  product: "Product",
};

// One colour per area, tinted background and saturated text. Small enough to
// stay quiet on the page, distinct enough to sort the list by eye alone.
export const AREA_COLOR: Record<Area, { fg: string; bg: string; dot: string }> = {
  seo:     { fg: "#7C5CD6", bg: "#F1EDFB", dot: "#8B6FE0" },
  data:    { fg: "#2A6FD6", bg: "#EAF1FC", dot: "#3B82F6" },
  perf:    { fg: "#B5761A", bg: "#FBF2E4", dot: "#E0952A" },
  a11y:    { fg: "#1F8A63", bg: "#E8F5EF", dot: "#2BA97A" },
  code:    { fg: "#6B6B7B", bg: "#F0F0F4", dot: "#8A8A9C" },
  product: { fg: "#C0417F", bg: "#FBEBF3", dot: "#E05494" },
};

export const SIZE_LABEL: Record<Size, string> = {
  quick: "Quick",
  session: "Half a day",
  project: "Big",
};

export const items: Item[] = [
  // ── Discoverability ──
  {
    title: "Google can't find the site",
    note: "Nothing tells a search engine this site exists, so it barely shows up. Two small config files fix it.",
    detail: "robots.txt and sitemap.xml both 404. Add app/robots.ts and app/sitemap.ts; the sitemap can enumerate the ?h= deeplinks so the per-robot share cards get indexed.",
    area: "seo",
    size: "quick",
  },
  {
    title: "The page has no headline",
    note: "There's a browser-tab title and nothing else. Search engines and screen readers both look for a real heading first and don't find one.",
    detail: "No <h1> in the document. Same fix serves SEO and gives assistive tech a landmark to start from.",
    area: "seo",
    size: "quick",
  },

  // ── Data ──
  {
    title: "Three robots have no link to their maker",
    note: "Figure 02, Astribot S1 and Roboy have a Visit button with nowhere to go.",
    detail: "Neither infoUrl nor manufacturerUrl is set, so the Visit button falls through to nothing.",
    area: "data",
    size: "quick",
  },
  {
    title: "106 invisible robots are still being downloaded",
    note: "An old experiment left a pile of placeholder entries in the data file. Nobody can see them, but every visitor still downloads them.",
    detail: "The 2026-05-08 density experiment left ids 30-135 behind SHOW_EXPERIMENT_STUBS = false. Delete the block and the flag with it.",
    area: "data",
    size: "quick",
    where: "data/humanoids.ts:90",
  },
  {
    title: "Battery capacity has nowhere to go",
    note: "We know some robots' battery size but there's no field to put it in, so it gets thrown away.",
    detail: "Nori documents the A3 at 24 V / 18 Ah. Voltage has a field, amp-hours doesn't. One line on the engineering type.",
    area: "data",
    size: "quick",
    where: "data/humanoids.ts:51",
  },
  {
    title: "Decide how to show a spec that's a range",
    note: "The A3 runs 6-8 hours, but the site can only show one number. Whichever we pick, every robot should follow the same rule.",
    detail: "Currently carries 6. If the rest of the index quotes headline figures, 6 makes the A3 look worse than its peers for no reason.",
    area: "data",
    size: "quick",
    blocked: "quote the floor, or the headline number",
  },
  {
    title: "Detailed specs are missing for most robots",
    note: "The deep-specs view has 26 rows and only 10 of 41 robots have anything to put in them. It looks fine when empty — this is just filling in.",
    detail: "Drill past the manufacturer landing page to the dedicated /tech or /specs page; aggregators are often right.",
    area: "data",
    size: "project",
  },
  {
    title: "Domo has no written description",
    note: "One robot is missing its blurb. Deliberately skipped before launch and it reads as sparse, not broken.",
    area: "data",
    size: "quick",
  },

  // ── Performance ──
  {
    title: "The second compare card is always running",
    note: "Even when you're looking at one robot, the site keeps drawing the hidden second one behind it. Wasted work on every frame.",
    detail: "It stays mounted at opacity 0 so the compare transition has something to animate. `inert` already took it out of the accessibility tree; the render cost is separate.",
    area: "perf",
    size: "session",
    where: "app/HomeClient.tsx — .compare-rcard",
  },
  {
    title: "Parts of the UI redraw when they didn't change",
    note: "A few components re-render along with everything else even though nothing about them moved.",
    detail: "LayoutSwitcher, Toaster and Chip. Pass 1 and the image-key removal already landed; memoizing these is the next data-led win rather than a guess.",
    area: "perf",
    size: "session",
  },
  {
    title: "The frosted-glass chips are expensive",
    note: "Six or seven blurred chips per card. Left on because it looks good — worth a decision before a big traffic push, not during one.",
    detail: "backdrop-filter on every chip.",
    area: "perf",
    size: "session",
  },

  // ── Codebase ──
  {
    title: "Every UI fix has to be made twice",
    note: "The single-robot view and the compare view are separate copies of the same code. Forgetting the second copy is the most common way a change half-lands.",
    area: "code",
    size: "session",
  },
  {
    title: "The main file is too big to work in comfortably",
    note: "One 3,500-line file holds most of the site. Splitting it up makes everything after it faster and safer.",
    detail: "Carve order: useLuckyTap first (self-contained), then compare state, then card physics, spring wiring last. Behaviour-preserving only, typecheck between each.",
    area: "code",
    size: "project",
  },

  // ── Product ──
  {
    title: "Write compare blurbs live instead of shipping them",
    note: "Right now every comparison sentence is pre-written and stored. Generating them on demand means any pair works, not just the ones we thought of.",
    detail: "app/api/compare-blurb/route.ts on Haiku — validate ids against the humanoid list, stream tokens, session ref cache keyed by the sorted pair, fall back to the JSON on error.",
    area: "product",
    size: "session",
  },
  {
    title: "Robot of the day",
    note: "A daily pick gives people a reason to come back. The share card it would use already exists.",
    detail: "A cron picks one. Last piece of the sharing stack that isn't built.",
    area: "product",
    size: "session",
  },
  {
    title: "Readable links instead of numbers",
    note: "Sharing a robot gives you ?h=3 rather than ?h=atlas-2013. Works fine, just reads badly.",
    area: "product",
    size: "session",
  },
  {
    title: "Decide whether robots are shown at true relative size",
    note: "The to-scale toggle got shelved mid-way. The question of whether cards should reflect real height is still open.",
    detail: "Domo's imageScale was dropped with it. The lab's Scale Field is where this is being worked out.",
    area: "product",
    size: "project",
  },
];
