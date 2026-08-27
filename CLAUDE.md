# humanoid-index.com

A visual index of humanoid robots. Next.js App Router, deployed on Vercel. Working branch: `v2`.

## Working agreements

### Shipping — read this before deploying anything

**`v2` is production.** `humanoid-index.com` is served by Vercel's git
integration from the `v2` branch. The `v3` branch is not shipped.

**Never run `vercel --prod`.** It uploads the working tree of whatever directory
it runs in — committed or not, whatever branch — and takes the production alias
from the git deployment. On 2026-08-27 that silently put a v3 build on the
domain: four verified data corrections stopped being live with zero commits on
`v2`, and two robots were live off an *uncommitted* file. Use `./scripts/ship.sh`,
which pushes to `v2` and waits until the domain actually serves it. For showing
someone something, plain `vercel` gives a preview URL that leaves the domain alone.

**A push is not a deploy.** Confirm with `npx vercel ls` (top Production row must
read `● Ready`), never by grepping the served bundle — a bundle grep reads the
*previous* build while the new one is still building, and will happily tell you a
change is live when the build has actually failed.

**Beware the directory names.** `~/CODE/humanoid-index` is the main worktree and
is on `v3`. `~/CODE/humanoid-index-v2` is on branch `sol`, *not* `v2`. Check
`git branch --show-current` before believing you're where you think you are.

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

### Descriptor tags
Each humanoid gets a `tags?: string[]` on its `Humanoid` entry in `data/humanoids.ts` — short chips rendered in the single-view stats column (Sunday-style stack). Hand-curated, not generated; tags are factual data labels where editorial judgment beats LLM output (e.g. "Amazon facilities", "BMW pilot", "DARPA pioneer").

Convention:
- **4–6 tags per robot.** Fewer if you genuinely can't fill the slots — empty trumps filler.
- **Order**: origin country → use case → drive/actuation → 1–2 distinguishing notes (reception, milestone, pricing hook).
- **Length**: 1–3 words. Title Case. Skip articles ("Best-selling", not "The best-selling").
- **Vocabulary to reuse so tags stay groupable**:
  - Country: "USA", "China", "Japan", "Germany", "UK", "Canada", "Israel", "Norway / USA", "Hong Kong", "Spain"
  - Use case: "Home", "Industrial", "Logistics", "Research", "Service", "Security", "Showcase"
  - Drive: "Electric", "Hydraulic", "Tendon-driven", plus form-factor when notable ("Wheeled base", "Dual-arm")
  - Distinguishing notes — free-form but factual: customer pilots ("BMW pilot"), deployment ("Amazon facilities"), pricing ("$16K affordable"), milestones ("DARPA pioneer", "Retired 2024", "First robot citizen"), reception ("Best-selling", "Viral on social", "Widely deployed"), availability ("Enterprise only", "Beta program", "Open-source")
- **Don't invent.** If you can't verify a customer pilot or sales claim, leave it out.
- Robots without tags render no Tags card — that's fine, never auto-fill from other fields.

### Blurb scripts
`scripts/generate-compare-blurbs.ts` and `scripts/generate-robot-descriptions.ts` use `claude-opus-4-7` (not Sonnet — Roy prefers Opus). Preview mode must write results into the live JSON (`data/compare-blurbs.json` or `data/robot-descriptions.json`), not only print to the terminal — Roy iterates by viewing rendered output, not terminal char counts. Both JSON files use `{ short, long }` entries.

### `addedAt` on new humanoids
When adding a new humanoid to `data/humanoids.ts`, set `addedAt: "<today's ISO date>"` (e.g. `"2026-05-15"`). The home-page "what's new" toast (`AnnouncementToast` in `HomeClient.tsx`) automatically surfaces any entry whose `addedAt` is within `NEW_WINDOW_DAYS` (currently 14) of today, then stops on its own — no cleanup, no flag flip. Missing `addedAt` means "not new, never toast." Always remind Roy if he adds an entry without it.

## Principles

- Cool web experience first, casually informative second.
- Zero-upkeep features beat reference-site completeness — no citations, no "last verified" stamps.
- Components feel native to the site, not imported UI patterns.
- See it in the browser, don't theorize.

## Code map

- `app/page.tsx` — thin server component. `generateMetadata` reads `?h` and `?compare`, falls through partial-compare → single-bot, defaults to `/og-default.png`. Renders `<HomeClient />`.
- `app/HomeClient.tsx` — ~3.5k lines. `Browse()` (line ~287) owns spring/scroll/compare/cards/lucky-tap/dev tuners. Default export `HomeClient()` (line ~3100) owns layout switching, share button, intro, chat tuner.
- `hooks/useSpring.ts` — `snapTo` (synchronous, no RAF) for URL hydration; `jumpTo` (animates) for user navigation.
- `components/` — extracted clusters: `ArcDots`, `LayoutSwitcher`, `LogoMark`, `ComparePanel`, `CompareStrip`, `GridView`, `Sidebar`, `BottomBar`, `OptionsMenu`, `SearchModal`, `WelcomeModal`, `ChatBot`, `SpinViewer`, `MobileView` (placeholder), and a self-contained `carousel/` (its own spring + wheel input).
- `lib/` — `cardPhysics`, `compareBlurb` (getter w/ fallback), `robotDescription` (getter), `fonts`.
- `data/` — `humanoids.ts` (source of truth, numeric ids), `compare-blurbs.json`, `robot-descriptions.json`.
- `app/api/og/[id]/route.ts` — 1200×630 light cards via Satori. SVG logos skipped (Satori limit). Supports `?compare=<rightId>`.
- `app/api/og/route.ts` — default OG fallback.
- `app/api/chat/route.ts` — Anthropic SDK, in-memory IP rate limit (20/hr). Robot list built once for prompt caching.
- `app/embed/[id]/page.tsx` — iframe-friendly card (`<iframe src=".../embed/1" width=480 height=260>`).
- `public/og-default.png` — used for bare URLs.
- `next.config.ts` — no `output: "export"` (we're on Vercel, need server features).

## Sharing stack (shipped)

- **Deeplinks** `?h=<id>` and `?compare=<a>,<b>` hydrate on mount via `snapTo` (instant, no animation).
- **No auto URL sync.** Address bar stays clean while browsing — the share button is the intentional path. We tried auto-sync and reversed it (made "share the site" impossible).
- **`shareUrlRef` / `shareOgRef` pattern.** Browse writes the current URL + OG image to refs that HomeClient reads on share-button click. No state lifting, no re-renders.
- **Server/client split.** `app/page.tsx` stays a server component for `generateMetadata`; everything `"use client"` lives in `HomeClient`.

When adding sharing features, keep zero-upkeep — no maintenance burden.

## In-flight / pending

- **Browse() decomposition.** `HomeClient.tsx` is still one big file; lucky-tap RAF, compare state machine, and per-card physics dispatch are all inline. Carve order when returning: `useLuckyTap` first (self-contained, zero coupling) → compare state → card physics → spring wiring last. Behavior-preserving carves only. Typecheck + dev-server check after each. Don't create a `lib/types.ts` dumping ground — colocate types with their owner.
- **Streaming compare blurb.** Plan to replace static `compare-blurbs.json` with `app/api/compare-blurb/route.ts` (Haiku, ~$0.0005/req, validates IDs against humanoids list, streams tokens). React side types in progressively, keeps an in-session `useRef` cache keyed by sorted pair, falls back to JSON on error. Not built yet.
- **Mobile.** `MobileView.tsx` is a "coming soon" placeholder. Deferred — codebase doesn't transfer cleanly to mobile yet.
- **Distribution.** Robot-of-the-day cron + HN launch pending. Pretty URL slugs (`?h=atlas-2013` vs `?h=3`) low priority.
