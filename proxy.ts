import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ── Dev routes stop at the proxy ─────────────────────────────────────────────────────────────────────────────────────────
   The harnesses — the 3D bench, the spin viewer, the OG editor, the stats lab,
   the phone frames — are working tools, not pages. They were shipping to
   production and answering to anyone who guessed the URL.

   Gating here rather than in each page keeps the routes themselves untouched:
   they stay exactly as useful in `next dev`, and nothing about how they are
   written has to change to stay private. `/dev/*` is a prefix, so a harness
   added there later is covered without editing this list.

   `/epetri` and `/thumbnails` gate themselves in the page with the same
   NODE_ENV check — this is belt and braces for them, not their only lock.

   `/admin`, `/lab` and `/timeline` joined the list for the same reason the
   others are on it: the backlog, the experiments and the in-progress timeline
   are how the site gets made, not part of the site. Gating them here rather
   than naming them in robots.txt matters — robots.txt is public, so listing a
   live private route is a directory of the things you would rather nobody
   opened. A 404 needs no disallow line.

   `/v3` is the odd one: it isn't a harness, it's the grid view, and it works.
   It is gated because it hasn't been shown yet, not because it is broken.
   Only the *route* closes — `app/v3/Collection` is imported by the home page
   and keeps rendering there, so this list never decides what the site looks
   like, only which URLs answer. */
const DEV_ROUTES = [
  "/3d-test",
  "/admin",
  "/dev",
  "/editor",
  "/epetri",
  "/lab",
  "/spin-test",
  "/stats-lab",
  "/thumbnails",
  "/timeline",
  "/v3",
];

export default function proxy(req: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const path = req.nextUrl.pathname;
  const isDevRoute = DEV_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));

  // A flat 404, deliberately: the site's own not-found page is branded, and
  // confirming "this is humanoid-index, and nothing is here" is more than a
  // stranger poking at URLs needs to know.
  if (isDevRoute) return new NextResponse(null, { status: 404 });

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/3d-test/:path*",
    "/admin/:path*",
    "/dev/:path*",
    "/editor/:path*",
    "/epetri/:path*",
    "/lab/:path*",
    "/spin-test/:path*",
    "/stats-lab/:path*",
    "/thumbnails/:path*",
    "/timeline/:path*",
    "/v3/:path*",
  ],
};
