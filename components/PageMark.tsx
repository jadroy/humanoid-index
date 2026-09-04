import Link from "next/link";

// The tool pages — the things built on the index that aren't the index. One
// entry per page; adding one is a line here, not a nav component.
const PAGES = [
  { key: "admin", href: "/admin", title: "Admin" },
  { key: "lab", href: "/lab", title: "Lab" },
] as const;

export type PageKey = (typeof PAGES)[number]["key"];

// Heads /admin and /lab. The nav *is* the title — the page you're on renders
// as the heading and its siblings sit quietly beside it, so switching pages
// costs no element the page didn't already have.
//
// The mark is inlined rather than pulled from /HI-mark.svg because that file
// hardcodes #C9CDCF, which is right on the site and too light here. It links
// home, so the way back doesn't need a separate control either.
export default function PageMark({
  current,
  size = 17,
  titleSize = 26,
}: {
  current: PageKey;
  size?: number;
  titleSize?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 13 }}>
      <Link
        href="/"
        aria-label="Back to the index"
        style={{ display: "inline-flex", flexShrink: 0, color: "#C0C4C7", alignSelf: "center" }}
      >
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

      {/* Active page first, always — otherwise the heading lands mid-row and
          /lab reads as "Admin Lab". The siblings keep their own order after it. */}
      {[...PAGES].sort((a, b) => Number(b.key === current) - Number(a.key === current)).map((p) =>
        p.key === current ? (
          <h1
            key={p.key}
            style={{ fontSize: titleSize, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--c-ink)" }}
          >
            {p.title}
          </h1>
        ) : (
          <Link
            key={p.key}
            href={p.href}
            className="page-nav-link"
            style={{
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--c-ink-muted)",
              textDecoration: "none",
            }}
          >
            {p.title}
          </Link>
        )
      )}

      <style>{`.page-nav-link:hover { color: var(--c-ink) !important; }`}</style>
    </div>
  );
}
