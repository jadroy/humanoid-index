import Link from "next/link";

// The tool pages — the things built on the index that aren't the index. One
// entry per page; adding one is a line here, not a nav component.
const PAGES = [
  { key: "admin", href: "/admin", title: "Admin" },
  { key: "lab", href: "/lab", title: "Lab" },
] as const;

export type PageKey = (typeof PAGES)[number]["key"];

// One size for active and inactive alike — the difference is weight and ink,
// never metrics, so nothing shifts when you move between them.
const navType = { fontSize: 24, letterSpacing: "-0.03em" } as const;

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
}: {
  current: PageKey;
  size?: number;
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

      {/* Stable order and one type size across both entries. Sorting the
          active page to the front, or giving it its own size, meant the
          header reflowed on every navigation — the mark moved 78px across
          and 21px down between /admin and /lab. Only the emphasis moves now. */}
      {PAGES.map((p) =>
        p.key === current ? (
          <h1 key={p.key} style={{ ...navType, fontWeight: 600, color: "var(--c-ink)" }}>
            {p.title}
          </h1>
        ) : (
          <Link
            key={p.key}
            href={p.href}
            className="page-nav-link"
            style={{ ...navType, fontWeight: 500, color: "var(--c-ink-muted)", textDecoration: "none" }}
          >
            {p.title}
          </Link>
        )
      )}

      <style>{`.page-nav-link:hover { color: var(--c-ink) !important; }
        .page-nav-link { transition: color 140ms ease; }`}</style>
    </div>
  );
}
