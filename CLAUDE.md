# humanoid-index.com

A visual index of humanoid robots. Next.js App Router, deployed on Vercel.

## Working agreements

### Commits
Roy commits broadly (often `git commit -a`) across parallel chats. When committing an isolated fix into a file Roy has unstaged changes in, his next broad commit can silently clobber it. To protect isolated fixes:

1. `cp <file> /tmp/<file>.full` — back up working tree
2. `git checkout HEAD -- <file>` — reset to HEAD
3. Apply only the targeted change via Edit
4. Typecheck + commit
5. `cp /tmp/<file>.full <file>` — restore working tree
6. Re-apply the change to the restored working tree, otherwise the next `git commit -a` regresses it

After committing into a file with unstaged changes, warn Roy explicitly. If his in-progress changes are large, mention `git stash` (or him committing first) as a lever — clean tree skips the dance entirely.

### Robot description voice
Apple copy — confident, direct, not dramatic or poetic. Each sentence a complete specific thought. Not just stats. Audience: a 20-year-old casually interested, not a robotics nerd.

Gold standard examples:
- Neo: "A bipedal humanoid built for the home. Light, quick, and safe around people." (living benchmark)
- ASIMO: "ASIMO made walking look effortless. It showed the world robots could belong."
- G1: "The G1 made humanoid robots finally affordable. At $16K, it moves without compromise."
- Atlas: "Atlas was the first robot that actually moved. Boston Dynamics built it to show what's possible."

Avoid: pure stats sentences, metaphors, brand names readers won't know, dramatic em-dash flourishes.

Use `claude-opus-4-7` for blurb generation, not Sonnet.

### Preview blurbs write to JSON
When running blurb generation in preview mode (e.g. `scripts/generate-compare-blurbs.ts --preview`), write results into the live JSON data file, not only the console. Roy iterates by viewing rendered output on the site — terminal char counts are a proxy, rendered layout is the truth. Applies to any AI-generated copy that ends up rendered.

## Principles

- Cool web experience first, casually informative second.
- Zero-upkeep features beat reference-site completeness — no citations, no "last verified" stamps.
- Components feel native to the site, not imported UI patterns.
- See it in the browser, don't theorize.

## Current focus

### app/page.tsx refactor (pass 2, pending)
Pass 1 (2026-04-14) extracted LogoMark, LayoutSwitcher cluster, ArcDots cluster, useSpring, FONTS, applyGive. Remaining bulk: `Browse()` (~1,400 lines, ~50 state vars).

Carve order when resuming:
1. Lucky-tap RAF effect → `hooks/useLuckyTap.ts` (self-contained, start here)
2. Compare state machine
3. Card physics dispatch
4. Spring wiring (most entangled, last)

Typecheck + verify in dev server after each carve. No batching. Behavior-preserving carves, not a rewrite. Skip a central `lib/types.ts` — colocate types with the component that owns them.

### Sharing stack

Shipped 2026-04-15:
- Deeplinks `?h=<id>` and `?compare=<id>,<id>` hydrate via `snapTo` on mount. URL is NOT auto-synced while browsing — share button is the intentional path to generate deeplinks.
- `/api/og/[id]` generates 1200×630 light cards; `?compare=<rightId>` for side-by-side. SVG logos skipped (Satori limitation).
- `app/page.tsx` is a thin server component (`generateMetadata` reads `?h` and `?compare`); `app/HomeClient.tsx` holds the client UI.
- Share button (bottom-center): "Share site" + "Share current view". Browse writes URL to `shareUrlRef`; Home reads on click — no state lifting.
- `/embed/[id]` standalone iframe page.
- Removed `output: "export"` from `next.config.ts`.

TODO:
1. Robot-of-the-day cron — pick a bot, post to X/Bluesky with the OG image.
2. HN launch — after robot-of-the-day + mobile + 60+ bots.
3. Pretty URL slugs (`?h=atlas-2013`). Low priority.
4. Embed polish — sizes, theme-aware, rate limiting if adoption grows.
5. Mobile — deferred. Biggest sharing blocker long-term.

### Streaming compare blurb (deferred)
Plan: replace static `compare-blurbs.json` with a live streaming API route so "LLM analyzing this pairing" feels intentional and alive.

- `/app/api/compare-blurb/route.ts` — Next.js route, key in `.env.local`, validate robot IDs against humanoids list, stream tokens.
- Client reads stream, types in token-by-token.
- In-session `useRef` cache keyed by sorted pair ID for instant revisits.
- Keep `compare-blurbs.json` as silent fallback.
- Rate limit: validate IDs are real humanoids; optionally cap req/min per IP.

Cost ~$0.0005/comparison on Haiku. Key never leaves server.
