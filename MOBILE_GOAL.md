# Mobile Parity Goal — Humanoid Index

**North star:** the mobile experience should feel like the same product as the web
one — same craft, same motion vocabulary, same "depth through focus" idea —
translated natively to the thumb, not ported or flattened. Premium, seamless, and
obviously made by the same hand.

Mount point: `components/MobileView.tsx` → rendered by `app/HomeClient.tsx:8433` on
mobile. Preview harness: `/mplay` (390×800 phone frame on desktop).

---

## The core idea to carry

The web's premium feel comes from five signature moves. Each must have a mobile
equivalent — the *idea* survives even if the pixels adapt.

1. **Depth through focus.** Cards sit on an invisible arc; the centered one is
   sharp and full, neighbors continuously shrink/fade/dip by distance (Hermite
   smoothstep, no jump at center). This is the signature. Mobile keeps the deck.
2. **One motion vocabulary.** The signature ease `cubic-bezier(0.22, 1, 0.36, 1)`
   drives nearly everything (22× across the web app). Durations cluster at
   260 / 380 / 520 ms. Mobile should speak the same grammar.
3. **Liquid-glass material.** Interactive surfaces (chips, blurb, actions) are
   frosted glass — `backdrop-filter: blur(20px) saturate(1.6)`, a top sheen, a
   1px hairline. Mobile is currently flat gray fills.
4. **Continuous, physical scroll.** Web default preset is `smooth` (0.10/0.82),
   always velocity-continuous. Mobile now uses a critically-damped SmoothDamp
   settle — swift, effortless, no bounce. ✅ (done this pass)
5. **Signature moments.** Intro logo ring-draw, dice-tumble shuffle, status-dot
   pulse, deeplink+OG share. These small flourishes ARE the brand personality.

---

## Gap analysis (web live defaults → mobile today)

| Dimension | Web | Mobile now | Action |
|---|---|---|---|
| Scroll physics | `smooth` spring, velocity-continuous | SmoothDamp, no bounce | ✅ matched/bettered |
| Font | `var(--font-geist-sans)` | `var(--font-inter)` | **switch to Geist** |
| Ink/surface tokens | shared `lib/design/tokens` | same tokens ✅ | keep |
| Status colors | `#34c759/#ff9500/#5e5ce6/#af52de/#8e8e93` | `#34C759/#FF9F0A/#0A84FF/#BF5AF2` | **align to web hexes** |
| Card bg | `#F9F9F9` | `SURFACE` `#F1F1F6` | **align to `#F9F9F9`** |
| Card radius | 20 | 26 | align to 20 (or intentional) |
| Signature ease | `cubic-bezier(0.22, 1, 0.36, 1)` | `0.23, 1, 0.32, 1` | **align** |
| Arc falloff | continuous smoothstep scale/opacity/dip | linear-ish, clamped | **port smoothstep depth** |
| Material | liquid glass (blur+sheen+hairline) | flat fills | **port a tasteful glass subset** |
| Intro | logo ring-draw sequence | none | add fast mobile intro |
| Shuffle | dice-tumble flourish | plain settle | add tumble flourish |
| Status dot | pulses on "In Production" | static | add pulse |
| Deeplinks | `?h=` / `?compare=` hydrate on mount | not read on mount | **hydrate initial card** |
| Share | `?h=` + `?compare=` + OG preview | `?h=` only | add compare-share |
| Tags | hairline-outline pills (transparent) | surface-filled pills | align style |
| First-run tour | 4-slide Welcome | none | optional lightweight coach |

---

## Workstreams (phased)

### Phase 0 — Feel ✅ (this pass)
SmoothDamp settle, momentum carry, velocity smoothing. Swift, effortless, no
bounce. Knobs: `SMOOTH_TIME` 0.24, `FLICK_PROJECT` 0.14.

### Phase 1 — Foundation: tokens + motion vocabulary
Behavior-preserving substrate everything else builds on.
- Font → `var(--font-geist-sans)`.
- Card bg `#F9F9F9`, radius 20.
- Status colors → web hexes.
- Replace `EASE_OUT` with the signature `cubic-bezier(0.22, 1, 0.36, 1)`; align
  durations to the 260/380/520 cluster.
- **Accept:** side-by-side, colors/type/card read identical to a web card.

### Phase 2 — Depth through focus (the deck)
- Port the continuous smoothstep falloff: scale/opacity/vertical-dip as a smooth
  function of |distance|, no clamp discontinuity at center.
- Tune peek width + arc dip so a centered card is hero and neighbors read as
  "next," matching the web's radial hierarchy.
- **Accept:** dragging feels like the web arc — focus visibly deepens toward center.

### Phase 3 — Liquid-glass material
- Port a tasteful subset of `glassChromeFor`: footer actions, blurb, tags as
  frosted glass (blur+saturate, sheen, hairline). Respect the "keep it simple"
  guardrail — no stacked filters, mind chip count for perf.
- **Accept:** action row + tags read as the same material as web chips.

### Phase 4 — Signature moments + chrome parity
- Fast mobile intro (logo ring-draw, ~900ms, skippable).
- Dice-tumble on shuffle.
- Status-dot pulse on "In Production."
- Deeplink hydration: read `?h=` / `?compare=` on mount, land on the right card
  instantly (mirror web `snapTo`).
- Share parity: `?compare=` share from the compare sheet.
- **Accept:** cold-load a `?h=` link lands correctly; shuffle + intro feel branded.

### Phase 5 — Detail & compare polish
- Detail sheet + compare sheet: match type scale, glass, tag style, motion.
- Compare carries the "why these two" blurb as the heart (web's core idea).
- **Accept:** sheets feel like first-class web surfaces, not mobile afterthoughts.

---

## Definition of done
A web user handed the phone recognizes it instantly as the same product. No screen
reads as a downgraded port. Colors, type, material, and motion pass a literal
side-by-side. The deck's "depth through focus" is intact.

## Verify
`/mplay` at 390×800 for desktop review; a real device for true touch feel.
