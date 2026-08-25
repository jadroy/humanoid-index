"use client";

import type { FormFilter } from "@/lib/wheelLanes";

// Body-plan glyphs for the lane rail. Drawn on the same 20×20 grid as
// PlaceholderLogo rather than pulled from an icon set — a stock person/robot/
// shapes trio would read as borrowed chrome, and these three carry the actual
// distinction: legs, base, four legs.
//
// The first pass was literally the PlaceholderLogo primitive (circle head +
// rounded torso) with the bottom swapped per form, which is why it read as a
// placeholder. What was missing is the silhouette information a body plan is
// actually made of: arms on the two upright forms, and a head on the fourth-
// legged one so it reads as an animal rather than a table.
//
// Each glyph moves once when its lane opens, and again on hover — the part
// that distinguishes it is the part that moves, so the motion says the same
// thing the shape does. `fg-*` classes are the hooks; keyframes live in
// globals.css next to the site's other motion.
export function FormGlyph({ form, size = 16, active = false }: { form: FormFilter; size?: number; active?: boolean }) {
  return (
    <svg
      className="form-glyph"
      data-active={active || undefined}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {form === "humanoid" && (
        <>
          <circle cx="10" cy="3.7" r="2.5" fill="currentColor" />
          <rect x="7" y="7.5" width="6" height="5.1" rx="2.5" fill="currentColor" />
          {/* Arms are what turn the blob into a body — they widen the
              silhouette past the torso, which is the only cue that survives
              at 18px. */}
          <rect x="5.1" y="7.9" width="1.5" height="4.3" rx="0.75" fill="currentColor" />
          <rect x="13.4" y="7.9" width="1.5" height="4.3" rx="0.75" fill="currentColor" />
          <rect className="fg-step-a" x="7.6" y="13.1" width="1.9" height="4.7" rx="0.95" fill="currentColor" />
          <rect className="fg-step-b" x="10.5" y="13.1" width="1.9" height="4.7" rx="0.95" fill="currentColor" />
        </>
      )}
      {form === "semi" && (
        <>
          <circle cx="10" cy="3.7" r="2.5" fill="currentColor" />
          <rect x="7" y="7.5" width="6" height="5.1" rx="2.5" fill="currentColor" />
          <rect x="5.1" y="7.9" width="1.5" height="4.3" rx="0.75" fill="currentColor" />
          <rect x="13.4" y="7.9" width="1.5" height="4.3" rx="0.75" fill="currentColor" />
          {/* Same upper body as humanoid, on a base instead of legs — the lane
              is "human on top, something else underneath", so the two glyphs
              should differ in exactly one place. */}
          <path className="fg-glide" d="M7.9 13.3h4.2l3.4 4.5H4.5l3.4-4.5Z" fill="currentColor" />
        </>
      )}
      {form === "other" && (
        <>
          {/* Quadruped in profile: the lane is Spot, Go2 and aibo alongside the
              wheeled home robots, and a four-legged animal silhouette is the
              one shape none of the other two lanes could be mistaken for. */}
          <rect x="3.4" y="7.8" width="11.4" height="4.4" rx="2.2" fill="currentColor" />
          <rect x="13.9" y="5.4" width="3.5" height="3.6" rx="1.6" fill="currentColor" />
          <rect className="fg-trot-a" x="4.7" y="12.1" width="1.7" height="5" rx="0.85" fill="currentColor" />
          <rect className="fg-trot-b" x="7.2" y="12.1" width="1.7" height="5" rx="0.85" fill="currentColor" />
          <rect className="fg-trot-b" x="10.4" y="12.1" width="1.7" height="5" rx="0.85" fill="currentColor" />
          <rect className="fg-trot-a" x="12.9" y="12.1" width="1.7" height="5" rx="0.85" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
