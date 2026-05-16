export function withUtm(url: string | undefined, robotId?: string | number): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "humanoid-index");
    u.searchParams.set("utm_medium", "referral");
    if (robotId !== undefined) u.searchParams.set("utm_content", String(robotId));
    return u.toString();
  } catch {
    return url;
  }
}
