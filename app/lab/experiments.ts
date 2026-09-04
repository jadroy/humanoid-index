// ── The lab shelf ───────────────────────────────────────────────────────────
// Every experiment that runs but isn't in the site yet. One entry per route;
// adding one is a line here, not a component. `state` is honest on purpose —
// half of these are studies that will never ship, and that's the point of a
// shelf: things stay findable without having to be finished.

export type State = "play" | "view" | "study";


export interface Experiment {
  slug: string;        // route
  title: string;
  blurb: string;       // one line, what it actually does
  kind: State;
  tags?: string[];
  wip?: boolean;       // rough edges you'd notice in the first ten seconds
  hidden?: boolean;    // built, kept, but not good enough to put on the shelf
  soon?: boolean;      // announced, not built — no route behind it yet
  devOnly?: boolean;   // renders 404 in production
}

export const KIND_LABEL: Record<State, string> = {
  play: "Play",
  view: "Views",
  study: "Studies",
};

// The thumbnail for a route, captured by scripts/capture-lab-thumbs.ts.
export function shotName(slug: string) {
  return slug.replace(/^\//, "").replace(/\//g, "-") + ".jpg";
}

export const experiments: Experiment[] = [
  // ── Play ──
  {
    slug: "/lab/higher-lower",
    title: "Higher",
    blurb: "Guess which is taller, heavier, faster.",
    kind: "play",
    tags: ["Game"],
  },
  {
    slug: "/lab/fighting",
    title: "Fighting",
    blurb: "Pick two, watch them go. The most-asked-for thing on the site.",
    kind: "play",
    soon: true,
  },
  {
    slug: "/lab/smash",
    title: "Smash Picker",
    blurb: "Choose-a-fighter roster, 1P through 4P.",
    kind: "play",
    hidden: true,
    tags: ["Roster"],
  },
  {
    slug: "/lab/character-select",
    title: "Character Select",
    blurb: "Roster rail and a spec sheet.",
    kind: "play",
    hidden: true,
    tags: ["Spec sheet"],
  },

  // ── Views ──
  {
    slug: "/lab/wall",
    title: "Card Wall",
    blurb: "Every card on one plane. Zoom to read.",
    kind: "view",
    tags: ["Zoom"],
  },
  {
    slug: "/lab/scale",
    title: "Scale Field",
    blurb: "Every robot at true height, one line.",
    kind: "view",
    tags: ["Honest scale"],
    wip: true,
  },
  {
    slug: "/timeline",
    title: "Spatial Timeline",
    blurb: "A rail where x is the year.",
    kind: "view",
    tags: ["Rail"],
  },
  {
    slug: "/lab/catalog",
    title: "Catalog Index",
    blurb: "The index as a printed reference.",
    kind: "view",
    hidden: true,
    tags: ["Reference"],
  },
  {
    slug: "/v3",
    title: "v3 Grid",
    blurb: "The current grid, on its own route.",
    kind: "view",
  },

  // ── Studies ──
  {
    slug: "/stats-lab",
    title: "Stats Lab",
    blurb: "Stat column layouts, side by side.",
    kind: "study",
  },
  {
    slug: "/spin-test",
    title: "Spin Viewer",
    blurb: "Drag to rotate.",
    kind: "study",
    tags: ["Drag"],
  },
  {
    slug: "/3d-test",
    title: "3D Test",
    blurb: "A real model in the card slot.",
    kind: "study",
    wip: true,
  },
  {
    slug: "/thumbnails",
    title: "Thumbnails",
    blurb: "Every cover image at once.",
    kind: "study",
    tags: ["Utility"],
  },
  {
    slug: "/editor",
    title: "Data Editor",
    blurb: "Edit entries against the live render.",
    kind: "study",
    tags: ["Utility"],
  },
  {
    slug: "/dev/og-loaders",
    title: "OG Loaders",
    blurb: "Share-card loading states.",
    kind: "study",
  },
  {
    slug: "/dev/mobile",
    title: "Mobile Frame",
    blurb: "The mobile deck in a phone frame.",
    kind: "study",
  },
  {
    slug: "/epetri",
    title: "Epetri Study",
    blurb: "A catalogue typeface, three ways.",
    kind: "study",
    tags: ["Type"],
    devOnly: true,
  },
];
