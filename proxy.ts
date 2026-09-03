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
   NODE_ENV check — this is belt and braces for them, not their only lock. */
const DEV_ROUTES = [
  "/3d-test",
  "/dev",
  "/editor",
  "/epetri",
  "/spin-test",
  "/stats-lab",
  "/thumbnails",
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
  matcher: ["/3d-test/:path*", "/dev/:path*", "/editor/:path*", "/epetri/:path*", "/spin-test/:path*", "/stats-lab/:path*", "/thumbnails/:path*"],
};
