---
name: Fight mode feature idea
description: Pokemon-style fight feature for comparison mode — shelved for later, needs custom fighting-position images and more polish
type: project
---

Fight mode in comparison mode: dark overlay with robots facing off, stat-by-stat comparison bars (HT/WT/DOF/SPD) that reveal sequentially, score tally, and a typewriter Pokemon-style battle narrative. Left robot gets blue glow, right gets red.

**Why:** User liked the concept but felt the first iteration wasn't polished enough. Needs custom fighting-position images before revisiting.

**How to apply:** When the user asks to bring back fight mode, start from the design described above. Key pieces: `FightOverlay` component, `generateBattleNarrative` function, phased reveal (intro → stat bars → narrative), fight-specific CSS keyframes (fade-in, slide-up, blink cursor). Consider adding a `fightImageUrl` field to the Humanoid interface for dedicated fighting stance images.
