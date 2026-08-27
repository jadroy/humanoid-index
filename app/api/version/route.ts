// What commit is this deployment actually built from?
//
// "Did my change ship?" was unanswerable from the outside: a push is not a
// deploy, and grepping the served bundle reads the previous build while the new
// one is still going. Vercel injects the built commit at build time, so the
// deployment can just say. scripts/ship.sh polls this until it matches HEAD.
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    builtAt: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
  });
}
