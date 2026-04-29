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

## Principles

- Cool web experience first, casually informative second.
- Zero-upkeep features beat reference-site completeness — no citations, no "last verified" stamps.
- Components feel native to the site, not imported UI patterns.
- See it in the browser, don't theorize.
