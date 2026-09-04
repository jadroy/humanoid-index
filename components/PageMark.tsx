import Link from "next/link";

// The index's mark, inlined rather than loaded from /HI-mark.svg so it can
// take `currentColor` — the file hardcodes #C9CDCF, which is right on the site
// and too light on a tool page.
//
// Used to head the pages that aren't the site: /admin, /lab, anything else
// built on top of the index. It doubles as the way back to the index, so the
// branding isn't costing a separate nav element.
export default function PageMark({
  title,
  size = 17,
  titleSize = 26,
}: {
  title: string;
  size?: number;
  titleSize?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
      <Link href="/" aria-label="Back to the index" style={{ display: "inline-flex", flexShrink: 0, color: "#C0C4C7" }}>
        <svg
          height={size}
          viewBox="7.72656 12.9392 29.551 19.1217"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          style={{ display: "block" }}
        >
          <rect x="7.72656" y="12.9392" width="8.69168" height="19.1217" rx="0.5" />
          <rect x="26.8438" y="19.189" width="6.6221" height="19.1217" rx="0.5" transform="rotate(90 26.8438 19.189)" />
          <rect x="18.1562" y="12.9392" width="8.69168" height="19.1217" rx="0.5" />
          <rect x="28.5859" y="12.9392" width="8.69168" height="19.1217" rx="0.5" />
        </svg>
      </Link>

      <h1 style={{ fontSize: titleSize, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--c-ink)" }}>
        {title}
      </h1>
    </div>
  );
}
